#!/usr/bin/env python3
"""Add or update programme rows from a CSV (or a Creator Studio JSON export).

    python scripts/csv_to_programmes_json.py data/inbox/*.csv            # import
    python scripts/csv_to_programmes_json.py data/inbox/x.csv --dry-run  # check only, write nothing
    python scripts/csv_to_programmes_json.py --template                  # print an empty CSV header

Rules (the same trust rules the app enforces):
  * a row needs an https official URL (not a social/short-link/job-board domain), a source document, and a verification date;
  * a row that fails is skipped and reported, and never stops the others;
  * 'verified' is never accepted from a file: real verification needs 5 checks and 2 reviewers (see js/data.js). It is stored as 'pending_review';
  * rows are matched by id + intakeYear and replaced, so re-importing a corrected sheet is safe;
  * data/index.json is updated so the app and the offline cache pick up a new intake year automatically.
Exit code 1 when nothing could be imported or any row was rejected (so CI shows red), 0 otherwise.
"""
import argparse, csv, json, os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import mz_common as C

COLUMNS = ['id', 'institutionId', 'intakeYear', 'name', 'route', 'nqf', 'duration', 'campus', 'province', 'careerFamily',
           'minAps', 'minPassLevel', 'requiresSelection', 'subjectRequirements', 'closes', 'feesNote', 'funding',
           'officialUrl', 'sourceDoc', 'sourcePage', 'lastVerifiedAt', 'verificationStatus']
ROUTES = {'University', 'Diploma / UoT (Extended)', 'Public TVET College', 'QCTO Occupational', 'Workplace Learning'}
STATUSES = {'pending_review', 'conflict', 'unverified_existence', 'verified', 'auto_verified'}
ENGLISH = ['English Home Language', 'English First Additional Language']
SUBJECT_ALIASES = {'english': ENGLISH, 'maths': ['Mathematics'], 'mathematics': ['Mathematics'], 'maths lit': ['Mathematical Literacy'],
                   'mathematical literacy': ['Mathematical Literacy'], 'maths or maths lit': ['Mathematics', 'Mathematical Literacy'],
                   'physical sciences': ['Physical Sciences'], 'life sciences': ['Life Sciences'], 'accounting': ['Accounting'],
                   'business studies': ['Business Studies'], 'economics': ['Economics'], 'geography': ['Geography'], 'history': ['History'],
                   'information technology': ['Information Technology'], 'cat': ['Computer Applications Technology'],
                   'egd': ['Engineering Graphics and Design'], 'tourism': ['Tourism'], 'agricultural sciences': ['Agricultural Sciences']}


def parse_subjects(text):
    """'English>=60; Mathematics>=70; Maths or Maths Lit>=50' -> [{anyOf:[...], minMark:n}]. Raises ValueError on anything unclear."""
    out = []
    for part in [x.strip() for x in str(text or '').split(';') if x.strip()]:
        m = re.match(r'^(.+?)\s*(?:>=|:|\s)\s*(\d{1,3})\s*%?$', part)
        if not m:
            raise ValueError('cannot read subject rule "%s" (use Name>=60)' % part)
        key, mark = m.group(1).strip().lower(), int(m.group(2))
        if key not in SUBJECT_ALIASES:
            raise ValueError('unknown subject "%s"' % m.group(1))
        if not 0 <= mark <= 100:
            raise ValueError('subject mark %d out of range' % mark)
        out.append({'anyOf': list(SUBJECT_ALIASES[key]), 'minMark': mark})
    return out


def from_creator_studio(r):
    """Creator Studio exports use older field names. Map them to the loader's names."""
    r = dict(r)
    if 'requiredSubjects' in r and 'subjectRequirements' not in r:
        r['subjectRequirements'] = r.pop('requiredSubjects')
    if 'sourceUrl' in r and 'officialUrl' not in r:
        r['officialUrl'] = r.pop('sourceUrl')
    if 'checkedAt' in r and 'lastVerifiedAt' not in r:
        r['lastVerifiedAt'] = r.pop('checkedAt')
    return r


def clean(raw, institutions, default_year, allow_auto=False, require_closes=True):
    """Return (record, warnings). Raises ValueError(reason) when the row must be rejected."""
    r = from_creator_studio(raw)
    g = lambda k: (r.get(k) if r.get(k) is not None else '')
    s = lambda k: str(g(k)).strip()
    warns = []
    pid = s('id')
    if not re.match(r'^[a-z0-9][a-z0-9_]{2,80}$', pid):
        raise ValueError('id must be 3-80 chars of a-z 0-9 _ (got "%s")' % pid)
    inst = s('institutionId')
    if inst not in institutions:
        raise ValueError('unknown institutionId "%s" (must exist in data/institutions.json)' % inst)
    try:
        year = int(s('intakeYear') or default_year or 0)
    except ValueError:
        raise ValueError('intakeYear is not a number')
    if not 2024 <= year <= 2040:
        raise ValueError('intakeYear %s looks wrong' % year)
    name = s('name')
    if len(name) < 3:
        raise ValueError('name is missing')
    route = s('route')
    if route not in ROUTES:
        raise ValueError('route must be one of: ' + ' | '.join(sorted(ROUTES)))
    try:
        aps = int(float(s('minAps') or 0))
    except ValueError:
        raise ValueError('minAps is not a number')
    if not 0 <= aps <= 600:
        raise ValueError('minAps %d must be 0-600 (institution scale)' % aps)
    nqf = s('nqf')
    if nqf and not (nqf.isdigit() and 1 <= int(nqf) <= 10):
        raise ValueError('nqf must be 1-10')
    closes = s('closes')
    closes_d = None
    if closes or require_closes:
        if not C.ISO.match(closes):
            raise ValueError('closes must be an ISO date YYYY-MM-DD (got "%s")' % closes)
        try:
            closes_d = C.date.fromisoformat(closes)
        except ValueError:
            raise ValueError('closes is not a real date')
    url = s('officialUrl')
    if not C.https_ok(url):
        raise ValueError('officialUrl must be an https link to the official site (not social media, a short link or a job board)')
    doc = s('sourceDoc')
    if len(doc) < 4:
        raise ValueError('sourceDoc is missing (name the prospectus or page the row was read from)')
    ver = s('lastVerifiedAt')
    if not C.ISO.match(ver):
        raise ValueError('lastVerifiedAt must be an ISO date')
    try:
        ver_d = C.date.fromisoformat(ver)
    except ValueError:
        raise ValueError('lastVerifiedAt is not a real date')
    if ver_d > C.today():
        raise ValueError('lastVerifiedAt is in the future')
    status = s('verificationStatus') or 'pending_review'
    if status not in STATUSES:
        raise ValueError('verificationStatus must be one of ' + ', '.join(sorted(STATUSES)))
    if status == 'auto_verified' and not allow_auto:
        warns.append('auto_verified is only set by the prospectus pipeline; stored as pending_review')
        status = 'pending_review'
    if status == 'verified':
        warns.append('stored as pending_review (verified needs 5 checks + 2 reviewers, which a file cannot carry)')
        status = 'pending_review'
    subj = g('subjectRequirements')
    if isinstance(subj, str):
        subj = parse_subjects(subj)
    elif isinstance(subj, list):
        for q in subj:
            if not (isinstance(q, dict) and isinstance(q.get('anyOf'), list) and q['anyOf'] and isinstance(q.get('minMark'), (int, float)) and 0 <= q['minMark'] <= 100):
                raise ValueError('subjectRequirements entries need anyOf[] and minMark 0-100')
    else:
        raise ValueError('subjectRequirements is not readable')
    funding = g('funding')
    if isinstance(funding, str):
        funding = [x.strip() for x in funding.split(';') if x.strip()]
    sel = g('requiresSelection')
    sel = sel if isinstance(sel, bool) else str(sel).strip().lower() in ('1', 'true', 'yes', 'y')
    rec = {'id': pid, 'institutionId': inst, 'intakeYear': year, 'name': name, 'route': route}
    if nqf:
        rec['nqf'] = int(nqf)
    for k in ('duration', 'campus', 'province', 'careerFamily', 'minPassLevel', 'feesNote'):
        if s(k):
            rec[k] = s(k)
    rec.update({'minAps': aps, 'requiresSelection': sel, 'subjectRequirements': subj, 'funding': funding,
                'officialUrl': url, 'sourceDoc': doc, 'lastVerifiedAt': ver, 'verificationStatus': status})
    if closes:
        rec['closes'] = closes
    if s('sourcePage'):
        rec['sourcePage'] = s('sourcePage')
    if closes_d and closes_d < C.today():
        warns.append('closing date %s has already passed' % closes)
    return rec, warns


def read_rows(path):
    if path.lower().endswith('.json'):
        d = C.load(path)
        rows = d if isinstance(d, list) else d.get('programmes', [])
        return [r for r in rows if isinstance(r, dict)]
    with open(path, encoding='utf-8-sig', newline='') as f:  # utf-8-sig: Excel adds a BOM
        return [r for r in csv.DictReader(f)]


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('files', nargs='*')
    ap.add_argument('--dry-run', action='store_true')
    ap.add_argument('--year', type=int, help='intake year for rows that leave it blank')
    ap.add_argument('--template', action='store_true')
    a = ap.parse_args(argv)
    if a.template:
        print(','.join(COLUMNS))
        return 0
    if not a.files:
        ap.error('give at least one .csv or .json file')
    institutions = {i['id'] for i in C.load(C.path('institutions.json'))['institutions']}
    by_year, rejected, seen = {}, 0, set()
    for fp in a.files:
        try:
            rows = read_rows(fp)
        except Exception as e:
            C.log('REJECT FILE %s: %s' % (fp, e)); rejected += 1; continue
        for n, raw in enumerate(rows, 2 if fp.lower().endswith('.csv') else 1):
            try:
                rec, warns = clean(raw, institutions, a.year)
            except ValueError as e:
                C.log('REJECT %s row %d: %s' % (os.path.basename(fp), n, e)); rejected += 1; continue
            key = (rec['id'], rec['intakeYear'])
            if key in seen:
                C.log('REJECT %s row %d: duplicate of %s %s in this import' % (os.path.basename(fp), n, *key)); rejected += 1; continue
            seen.add(key)
            for w in warns:
                C.log('note   %s row %d: %s' % (os.path.basename(fp), n, w))
            by_year.setdefault(rec['intakeYear'], []).append(rec)
    added = updated = 0
    idx_p = C.path('index.json')
    idx = C.load(idx_p)
    for year, recs in sorted(by_year.items()):
        fp = C.path('programmes', '%d.json' % year)
        doc = C.load(fp) if os.path.exists(fp) else {'schemaVersion': 3, 'intakeYear': year, 'notice': '', 'programmes': []}
        have = {p.get('id'): i for i, p in enumerate(doc['programmes'])}
        for rec in recs:
            if rec['id'] in have:
                doc['programmes'][have[rec['id']]] = rec; updated += 1
            else:
                doc['programmes'].append(rec); added += 1
        doc['programmes'].sort(key=lambda p: (p['institutionId'], p['name'], p['id']))
        doc['notice'] = 'Rows imported by scripts/csv_to_programmes_json.py. Each was read from the cited official source; "pending_review" means a second person has not yet confirmed it.'
        rel = 'programmes/%d.json' % year
        if not a.dry_run:
            C.save(fp, doc)
            if rel not in idx['files']:
                idx['files'].append(rel); idx['files'].sort()
    if not a.dry_run:
        C.save(idx_p, idx)
    C.log('%s: %d added, %d updated, %d rejected' % ('DRY RUN' if a.dry_run else 'DONE', added, updated, rejected))
    return 1 if (rejected or (added + updated) == 0) else 0


if __name__ == '__main__':
    sys.exit(main())
