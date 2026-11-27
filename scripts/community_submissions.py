#!/usr/bin/env python3
"""Validate and stage prospectus readings that people send in (the file the app's "Check a prospectus yourself" tool makes).

    python scripts/community_submissions.py inbox/community/*.json

Nothing a stranger sends is ever published. Accepted rows are staged in data/community/<institution>_<year>.json,
compared with the pipeline by scripts/compare_sources.py, and progression quotes go to data/progression.json as
'pending_review' evidence. Only two enrolled reviewers can make anything verified.
Hardening: size cap, strict schema, no links/emails/phone numbers/SA ID numbers in any text, the quote must contain the APS it claims,
submitters are anonymous random ids (a counting aid, not identity)."""
import json, os, re, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import mz_common as C
import progression_ledger as PL

SCHEMA = 'mz-community-v1'
MAX_BYTES = 512 * 1024
ISSUES = {'aps_wrong', 'subject_wrong', 'course_missing', 'course_closed', 'link_broken', 'bridge_wrong', 'other'}
BAD_TEXT = re.compile(r'https?://|www\.|@|\b(?:wa\.me|t\.me|bit\.ly|tinyurl\.com|cutt\.ly|shorturl\.at)\b|<\s*/?\s*script\b|javascript:|\b\d{13}\b|(?<!\d)0\d{2}[\s-]?\d{3}[\s-]?\d{4}(?!\d)|\+27[\s-]?\d{9}', re.I)


def _txt(v, n):
    clean = C.normalize_for_security(v if v is not None else '')
    return re.sub(r'[\x00-\x1f\x7f]+', ' ', re.sub(r'\s+', ' ', clean)).strip()[:n]


def _num_in(quote, n):
    return re.search(r'(?<![\d.])%s(?![\d])' % re.escape('%g' % n), quote) is not None


def validate(doc, institutions):
    """Returns (clean_submission_or_None, problems[])."""
    prob = []
    if not isinstance(doc, dict) or doc.get('schema') != SCHEMA:
        return None, ['not a %s file' % SCHEMA]
    sub = str(doc.get('submitter', ''))
    if not re.fullmatch(r'[a-f0-9]{16,32}', sub):
        return None, ['submitter must be a random 16-32 character hex id']
    iid = str(doc.get('institutionId', ''))
    if iid not in institutions:
        return None, ['unknown institutionId "%s"' % iid[:30]]
    try:
        year = int(doc.get('year'))
    except (TypeError, ValueError):
        return None, ['year is not a number']
    if not 2024 <= year <= 2040:
        return None, ['year %s looks wrong' % year]
    d = doc.get('doc') if isinstance(doc.get('doc'), dict) else {}
    sha = str(d.get('sha256', '')).lower()
    if not re.fullmatch(r'[a-f0-9]{64}', sha):
        return None, ['doc.sha256 must be the 64-character SHA-256 of the file that was read']
    if BAD_TEXT.search(C.normalize_for_security(d.get('name', ''))):
        return None, ['doc.name contains a link, email, phone or ID number']
    out = {'submitter': sub, 'institutionId': iid, 'year': year, 'docSha256': sha, 'docName': _txt(d.get('name'), 120),
           'readVia': _txt(d.get('via'), 20), 'rows': [], 'progression': [], 'feedback': [], 'receivedAt': C.today().isoformat()}
    for i, r in enumerate((doc.get('rows') or [])[:400]):
        try:
            name = _txt(r.get('name'), 120)
            if len(name) < 3: raise ValueError('name missing')
            aps = r.get('minAps')
            aps = None if aps is None else float(aps)
            if aps is not None and not 0 <= aps <= 600: raise ValueError('minAps out of range')
            quote = _txt(r.get('quote'), 300)
            if BAD_TEXT.search(quote + ' ' + name): raise ValueError('text contains a link, email, phone or ID number')
            if aps is not None and not _num_in(quote, aps): raise ValueError('the quote does not contain the APS it claims')
            subj = []
            for q in (r.get('subjects') or [])[:12]:
                any_of = [_txt(x, 60) for x in (q.get('anyOf') or [])[:4] if _txt(x, 60)]
                mm = float(q.get('minMark'))
                if not any_of or not 0 <= mm <= 100: raise ValueError('bad subject entry')
                subj.append({'anyOf': any_of, 'minMark': mm})
            page = r.get('page') if isinstance(r.get('page'), int) and 1 <= r.get('page') <= 5000 else None
            out['rows'].append({'name': name, 'minAps': aps, 'subjects': subj, 'page': page, 'quote': quote})
        except (ValueError, TypeError, AttributeError) as e:
            prob.append('row %d dropped: %s' % (i + 1, e))
    for i, pr in enumerate((doc.get('progression') or [])[:100]):
        try:
            out['progression'].append(PL.clean_entry(dict(pr, institutionId=iid, year=year)))
        except (ValueError, TypeError, AttributeError, KeyError) as ex:
            prob.append('progression %d dropped: %s' % (i + 1, ex))
    for i, f in enumerate((doc.get('feedback') or [])[:50]):
        try:
            iss, pid, note = str(f.get('issue')), _txt(f.get('programmeId'), 80), _txt(f.get('note'), 140)
            if iss not in ISSUES or not re.fullmatch(r'[A-Za-z0-9_\-.]{3,80}', pid) or BAD_TEXT.search(note):
                raise ValueError('bad feedback entry')
            out['feedback'].append({'programmeId': pid, 'issue': iss, 'note': note})
        except (ValueError, TypeError, AttributeError) as ex:
            prob.append('feedback %d dropped: %s' % (i + 1, ex))
    if not (out['rows'] or out['progression'] or out['feedback']):
        return None, prob + ['nothing usable in this file']
    return out, prob


def stage(sub, ledger=None):
    """Write one accepted submission into data/community/<inst>_<year>.json (one per submitter+document; a resend replaces it)."""
    fp = C.path('community', '%s_%s.json' % (sub['institutionId'], sub['year']))
    cur = C.load(fp) if os.path.exists(fp) else {'schemaVersion': 1, 'institutionId': sub['institutionId'], 'year': sub['year'], 'submissions': []}
    cur['submissions'] = ([x for x in cur['submissions'] if (x['submitter'], x['docSha256']) != (sub['submitter'], sub['docSha256'])] + [sub])[-60:]
    C.save(fp, cur)
    added = 0
    if ledger is not None:
        for pr in sub['progression']:
            if PL.add(ledger, pr, {'type': 'community', 'ref': 'community:' + sub['submitter'][:8], 'ocr': sub['readVia'] == 'ocr'}) != 'seen': added += 1
    return added


def main(argv):
    paths = [a for a in argv if not a.startswith('-')]
    insts = {i['id'] for i in C.load(C.path('institutions.json'))['institutions']}
    ledger, ok, bad = PL.load(), 0, 0
    for p in paths:
        try:
            if os.path.getsize(p) > MAX_BYTES: raise ValueError('file is over %d KB' % (MAX_BYTES // 1024))
            with open(p, encoding='utf-8') as f: doc = json.load(f)
        except Exception as e:
            C.log('REJECTED %s: %s' % (os.path.basename(p), e)); bad += 1; continue
        sub, prob = validate(doc, insts)
        for x in prob: C.log('  %s: %s' % (os.path.basename(p), x))
        if not sub:
            C.log('REJECTED %s' % os.path.basename(p)); bad += 1; continue
        stage(sub, ledger); ok += 1
        C.log('accepted %s: %d row(s), %d progression quote(s), %d feedback note(s)' % (os.path.basename(p), len(sub['rows']), len(sub['progression']), len(sub['feedback'])))
        done = os.path.join(os.path.dirname(p), 'done')
        if os.path.isdir(done): os.replace(p, os.path.join(done, os.path.basename(p)))
    if ok: PL.save(ledger)
    C.log('submissions accepted %d | rejected %d' % (ok, bad))
    return 1 if bad and not ok else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
