#!/usr/bin/env python3
"""Drop a sheet in inbox/ to add or correct bursaries, key dates, or institution website links. Same trust rules as programmes.

    python scripts/import_sheet.py inbox/bursaries_2027.csv          # import (kind is read from the file name)
    python scripts/import_sheet.py inbox/x.csv --kind events --dry-run
    python scripts/import_sheet.py --template bursaries              # print the header for a kind

File names decide the kind:   bursaries*.csv|json   events*.csv|json   institutions*.csv|json   (anything else = programmes, see csv_to_programmes_json.py)

Rules (never relaxed by a file):
  * every link must be https and not a social/short-link/job-board domain;
  * a bursary or event that carries a date, an amount or a link needs lastVerifiedAt / checkedAt (the day a person looked at the official page);
  * "verified" is never accepted from a file: bursaries are stored as pending_review; a person's already-verified row is never overwritten;
  * institution links only change officialUrl (and listStatus when the sheet says checkedAgainstDhet=yes). Names, types and APS methods are never touched here;
  * a bad row is reported and skipped, it never stops the good ones. Exit code 1 when any row was rejected (CI shows red).
"""
import argparse, csv, os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import mz_common as C

BURSARY_TYPES = {'Government', 'SETA', 'Employer', 'Institution', 'Municipal', 'Private', 'Other'}
CONFIDENCE = {'official', 'secondary_verify'}
COLUMNS = {
    'bursaries': ['id', 'name', 'type', 'summary', 'note', 'officialUrl', 'opens', 'closes', 'amountNote', 'lastVerifiedAt'],
    'events': ['id', 'title', 'date', 'scope', 'confidence', 'source', 'sourceUrl', 'checkedAt'],
    'institutions': ['id', 'officialUrl', 'lastVerifiedAt', 'checkedAgainstDhet'],
}
ID_RE = re.compile(r'^[a-z0-9][a-z0-9_]{2,80}$')


def kind_of(path):
    n = os.path.basename(path).lower()
    for k in COLUMNS:
        if n.startswith(k):
            return k
    return None


def _date(v, label, required=False, future_ok=False):
    v = str(v or '').strip()
    if not v:
        if required:
            raise ValueError('%s is required (YYYY-MM-DD)' % label)
        return ''
    if not C.ISO.match(v):
        raise ValueError('%s must be an ISO date YYYY-MM-DD (got "%s")' % (label, v))
    try:
        d = C.date.fromisoformat(v)
    except ValueError:
        raise ValueError('%s is not a real date' % label)
    if not future_ok and d > C.today():
        raise ValueError('%s is in the future' % label)
    return v


def _text(r, k, lo=0, hi=400):
    v = re.sub(r'\s+', ' ', str(r.get(k) if r.get(k) is not None else '')).strip()
    if len(v) < lo:
        raise ValueError('%s is missing' % k)
    if len(v) > hi:
        raise ValueError('%s is too long (%d > %d characters)' % (k, len(v), hi))
    return v


def clean_bursary(r, existing):
    rid = _text(r, 'id')
    if not ID_RE.match(rid):
        raise ValueError('id must be 3-80 chars of a-z 0-9 _ (got "%s")' % rid)
    old = existing.get(rid)
    if old and old.get('verificationStatus') == 'verified':
        raise ValueError('"%s" is already verified by people; change it by hand with two reviewers, not by file' % rid)
    t = _text(r, 'type', 1, 40)
    if t not in BURSARY_TYPES:
        raise ValueError('type must be one of: ' + ' | '.join(sorted(BURSARY_TYPES)))
    rec = {'id': rid, 'name': _text(r, 'name', 3, 120), 'type': t, 'summary': _text(r, 'summary', 10, 300), 'note': _text(r, 'note', 0, 300)}
    url = _text(r, 'officialUrl', 0, 300)
    opens, closes, amount = _date(r.get('opens'), 'opens', future_ok=True), _date(r.get('closes'), 'closes', future_ok=True), _text(r, 'amountNote', 0, 160)
    if url and not C.https_ok(url):
        raise ValueError('officialUrl must be an https link to the funder\'s own site')
    if (opens or closes or amount) and not url:
        raise ValueError('dates and amounts need the funder\'s official https link (officialUrl)')
    if opens and closes and opens > closes:
        raise ValueError('opens is after closes')
    if url:
        rec['officialUrl'] = url
        rec['lastVerifiedAt'] = _date(r.get('lastVerifiedAt'), 'lastVerifiedAt', required=True)
    for k, v in (('opens', opens), ('closes', closes), ('amountNote', amount)):
        if v:
            rec[k] = v
    rec['verificationStatus'] = 'pending_review'
    return rec


def clean_event(r, existing):
    rid = _text(r, 'id')
    if not ID_RE.match(rid):
        raise ValueError('id must be 3-80 chars of a-z 0-9 _ (got "%s")' % rid)
    conf = _text(r, 'confidence', 1, 30)
    if conf not in CONFIDENCE:
        raise ValueError('confidence must be one of: ' + ' | '.join(sorted(CONFIDENCE)))
    url = _text(r, 'sourceUrl', 1, 300)
    if not C.https_ok(url):
        raise ValueError('sourceUrl must be an https link to the official site')
    return {'id': rid, 'title': _text(r, 'title', 5, 160), 'date': _date(r.get('date'), 'date', required=True, future_ok=True),
            'scope': _text(r, 'scope', 2, 160), 'confidence': conf, 'source': _text(r, 'source', 3, 160), 'sourceUrl': url,
            'checkedAt': _date(r.get('checkedAt'), 'checkedAt', required=True)}


def clean_institution(r, insts):
    rid = _text(r, 'id')
    if rid not in insts:
        raise ValueError('unknown institution id "%s" (must exist in data/institutions.json)' % rid)
    url = _text(r, 'officialUrl', 1, 300)
    if not C.https_ok(url):
        raise ValueError('officialUrl must be an https link to the institution\'s own site')
    return {'id': rid, 'officialUrl': url, 'lastVerifiedAt': _date(r.get('lastVerifiedAt'), 'lastVerifiedAt', required=True),
            'dhet': str(r.get('checkedAgainstDhet') or '').strip().lower() in ('yes', 'y', 'true', '1')}


def read_rows(path):
    if path.lower().endswith('.json'):
        d = C.load(path)
        rows = d if isinstance(d, list) else next((v for v in d.values() if isinstance(v, list)), [])
        return [x for x in rows if isinstance(x, dict)]
    with open(path, encoding='utf-8-sig', newline='') as f:
        return list(csv.DictReader(f))


def apply(kind, recs):
    """Merge cleaned records into the data file. Returns (added, updated)."""
    added = updated = 0
    if kind == 'institutions':
        p = C.path('institutions.json'); doc = C.load(p); by = {i['id']: i for i in doc['institutions']}
        for r in recs:
            i = by[r['id']]
            if i.get('officialUrl') != r['officialUrl']:
                i['officialUrl'] = r['officialUrl']; updated += 1
            if r['dhet'] and i.get('type') == 'TVET' and i.get('listStatus') != 'checked':
                i['listStatus'] = 'checked'; updated += 1
        C.write_if_changed(p, doc)
        return added, updated
    name, key = ('bursaries.json', 'bursaries') if kind == 'bursaries' else ('events.json', 'events')
    p = C.path(name); doc = C.load(p); rows = doc[key]; pos = {r['id']: n for n, r in enumerate(rows)}
    for r in recs:
        if r['id'] in pos:
            if rows[pos[r['id']]] != r:
                rows[pos[r['id']]] = r; updated += 1
        else:
            rows.append(r); pos[r['id']] = len(rows) - 1; added += 1
    if kind == 'events':
        rows.sort(key=lambda e: (e['date'], e['id']))
        doc['generatedAt'] = C.today().isoformat()
    C.write_if_changed(p, doc)
    return added, updated


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('files', nargs='*'); ap.add_argument('--kind', choices=sorted(COLUMNS)); ap.add_argument('--dry-run', action='store_true')
    ap.add_argument('--template', choices=sorted(COLUMNS))
    a = ap.parse_args(argv)
    if a.template:
        print(','.join(COLUMNS[a.template])); return 0
    if not a.files:
        ap.error('give at least one .csv or .json file')
    rejected = 0; total_add = total_upd = 0
    for fp in a.files:
        kind = a.kind or kind_of(fp)
        if not kind:
            C.log('REJECT FILE %s: name must start with bursaries, events or institutions (or pass --kind)' % fp); rejected += 1; continue
        try:
            rows = read_rows(fp)
        except Exception as e:
            C.log('REJECT FILE %s: %s' % (fp, e)); rejected += 1; continue
        existing = {}
        if kind == 'bursaries': existing = {b['id']: b for b in C.load(C.path('bursaries.json'))['bursaries']}
        insts = {i['id'] for i in C.load(C.path('institutions.json'))['institutions']}
        good, seen = [], set()
        for n, raw in enumerate(rows, 2 if fp.lower().endswith('.csv') else 1):
            try:
                rec = clean_bursary(raw, existing) if kind == 'bursaries' else clean_event(raw, existing) if kind == 'events' else clean_institution(raw, insts)
                if rec['id'] in seen: raise ValueError('duplicate id "%s" in this file' % rec['id'])
                seen.add(rec['id']); good.append(rec)
            except ValueError as e:
                C.log('REJECT %s row %d: %s' % (os.path.basename(fp), n, e)); rejected += 1
        if good and not a.dry_run:
            ad, up = apply(kind, good); total_add += ad; total_upd += up
        C.log('%s: %d ok, %d rejected%s' % (os.path.basename(fp), len(good), len(rows) - len(good), ' (dry run)' if a.dry_run else ''))
    C.log('added %d, updated %d' % (total_add, total_upd))
    return 1 if rejected else 0


if __name__ == '__main__':
    sys.exit(main())
