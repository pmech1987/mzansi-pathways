#!/usr/bin/env python3
"""Refresh data/open_jobs_live.json from the public job-board APIs listed in data/public_ats_boards.json.

Only official employer boards (Greenhouse / Lever public JSON APIs). No scraping, no job-board sites.
Failsafe: if a board cannot be reached, its previous rows are kept. If nothing can be reached, the file is left untouched.
Run:  python scripts/fetch_jobs.py [--dry-run]
"""
import json, os, re, sys, time, urllib.request
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import mz_common as C

FEE_RE = re.compile(r'\b(?:registration|application|admin|uniform|processing)\s+fee\b|\b(?:ewallet|cashsend|pay\s*r\d+)\b', re.I)
PROVINCE_HINTS = [('western cape', 'Western Cape'), ('cape town', 'Western Cape'), ('stellenbosch', 'Western Cape'), ('gauteng', 'Gauteng'),
                  ('johannesburg', 'Gauteng'), ('sandton', 'Gauteng'), ('pretoria', 'Gauteng'), ('centurion', 'Gauteng'),
                  ('kwazulu', 'KwaZulu-Natal'), ('durban', 'KwaZulu-Natal'), ('mpumalanga', 'Mpumalanga'), ('mbombela', 'Mpumalanga'),
                  ('emalahleni', 'Mpumalanga'), ('limpopo', 'Limpopo'), ('polokwane', 'Limpopo'), ('free state', 'Free State'),
                  ('bloemfontein', 'Free State'), ('eastern cape', 'Eastern Cape'), ('gqeberha', 'Eastern Cape'), ('port elizabeth', 'Eastern Cape')]


def get_json(url, tries=2, timeout=20):
    last = None
    for n in range(tries):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'MzansiPathways-JobIndex/1.0 (+public ATS API)', 'Accept': 'application/json'})
            with C.safe_open(req, timeout=timeout) as r:
                return json.loads(r.read(5000000).decode('utf-8'))
        except Exception as e:
            last = e
            time.sleep(2 * (n + 1))
    raise last


def fetch_greenhouse(b):
    d = get_json('https://boards-api.greenhouse.io/v1/boards/%s/jobs' % b['slug'])
    return [{'title': j.get('title'), 'location': (j.get('location') or {}).get('name', ''), 'url': j.get('absolute_url')} for j in d.get('jobs', [])]


def fetch_lever(b):
    d = get_json('https://api.lever.co/v0/postings/%s?mode=json' % b['slug'])
    return [{'title': j.get('text'), 'location': (j.get('categories') or {}).get('location', '') or '', 'url': j.get('hostedUrl')} for j in d if isinstance(j, dict)]


def to_row(raw, board, kind, keywords):
    title, loc, url = str(raw.get('title') or '').strip(), str(raw.get('location') or '').strip(), str(raw.get('url') or '').strip()
    if not title or not C.https_ok(url) or FEE_RE.search(title):
        return None
    low = loc.lower()
    if not any(k in low for k in keywords):
        return None
    prov = next((p for h, p in PROVINCE_HINTS if h in low), board.get('defaultProvince', ''))
    return {'title': title, 'employer': board['employer'], 'town': loc or 'South Africa', 'province': prov, 'closingDate': 'Open / Rolling',
            'daysRemaining': None, 'freshnessStatus': 'rolling', 'stillOpenAfterWeek': False, 'sourceType': kind, 'officialUrl': url}


def main(argv, fetchers=None):
    fetchers = fetchers or {'greenhouse': fetch_greenhouse, 'lever': fetch_lever}
    cfg = C.load(C.path('public_ats_boards.json'))
    keywords = [k.lower() for k in cfg.get('saLocationKeywords', [])]
    cur_p = C.path('open_jobs_live.json')
    cur = C.load(cur_p) if os.path.exists(cur_p) else {'schemaVersion': 1, 'jobs': []}
    old = cur.get('jobs', [])
    boards = [(b, 'greenhouse') for b in cfg.get('greenhouseBoards', [])] + [(b, 'lever') for b in cfg.get('leverBoards', [])]
    new, ok_boards = [], 0
    for b, kind in boards:
        try:
            rows = [r for r in (to_row(x, b, kind, keywords) for x in fetchers[kind](b)) if r]
            new += rows[:50]  # cap per employer so one big board cannot bury the rest
            ok_boards += 1
            C.log('%s %s: %d South African roles' % (kind, b['slug'], min(len(rows), 50)))
        except Exception as e:
            C.log('WARN %s %s unreachable (%s): keeping its previous rows' % (kind, b['slug'], e))
            new += [j for j in old if j.get('sourceType') == kind and j.get('employer') == b['employer']]
    if boards and ok_boards == 0:
        C.log('No board reachable: leaving open_jobs_live.json untouched.')
        return 0
    kept = [j for j in old if j.get('sourceType') not in ('greenhouse', 'lever')]  # hand-kept rows (DPSA circular, gov portal) are never removed
    jobs = kept + sorted(new, key=lambda j: (j['employer'], j['title']))
    by = {}
    for j in jobs:
        by[j['sourceType']] = by.get(j['sourceType'], 0) + 1
    out = dict(cur, generatedAt=C.today().isoformat(), jobs=jobs, openCount=len(jobs), bySourceType=by, fetchStatus='ok')
    if '--dry-run' in argv:
        C.log('DRY RUN: would write %d jobs' % len(jobs))
        return 0
    C.write_if_changed(cur_p, out)
    C.log('open_jobs_live.json: %d jobs' % len(jobs))
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
