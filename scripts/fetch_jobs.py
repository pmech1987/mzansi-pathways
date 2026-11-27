#!/usr/bin/env python3
"""Refresh data/open_jobs_live.json from the public job-board APIs listed in data/public_ats_boards.json.

Only official employer boards (Greenhouse / Lever public JSON APIs). No scraping, no job-board sites.
v98 Security & Compliance Upgrades:
  - Maps all 9 South African provinces (including Northern Cape & North West).
  - Blocks recruitment-scam fee phrases across title, location, and URL.
  - Blocks URL shorteners & messaging-app redirect traps (bit.ly, tinyurl, wa.me, t.me, etc.).
  - Scrubs POPIA PII (SA 13-digit IDs, personal emails, mobile numbers) before writing.
  - Deduplicates normalized (employer, title, officialUrl) entries.
Failsafe: if a board cannot be reached, its previous rows are kept. If nothing can be reached, the file is left untouched.
Run:  python scripts/fetch_jobs.py [--dry-run]
"""
import json, os, re, sys, time, urllib.parse, urllib.request
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import mz_common as C

FEE_RE = re.compile(
    r'\b(?:registration|application|admin|uniform|processing|interview)\s+fee\b|\b(?:ewallet|cashsend|pay\s*r\d+)\b',
    re.I,
)
SHORTENER_HOSTS = {
    'bit.ly', 'tinyurl.com', 't.co', 'rb.gy', 'cutt.ly', 'shorturl.at',
    'goo.gl', 'ow.ly', 'is.gd', 'wa.me', 'chat.whatsapp.com', 't.me',
}
SA_ID_RE = re.compile(r'\b\d{13}\b')
EMAIL_RE = re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b')
PHONE_RE = re.compile(r'(?:\+27|0)[6-8]\d[\s-]?\d{3}[\s-]?\d{4}\b')

PROVINCE_HINTS = [
    ('western cape', 'Western Cape'), ('cape town', 'Western Cape'), ('stellenbosch', 'Western Cape'), ('paarl', 'Western Cape'),
    ('gauteng', 'Gauteng'), ('johannesburg', 'Gauteng'), ('sandton', 'Gauteng'), ('pretoria', 'Gauteng'), ('centurion', 'Gauteng'), ('midrand', 'Gauteng'),
    ('kwazulu', 'KwaZulu-Natal'), ('durban', 'KwaZulu-Natal'), ('pietermaritzburg', 'KwaZulu-Natal'), ('umhlanga', 'KwaZulu-Natal'),
    ('mpumalanga', 'Mpumalanga'), ('mbombela', 'Mpumalanga'), ('nelspruit', 'Mpumalanga'), ('emalahleni', 'Mpumalanga'), ('witbank', 'Mpumalanga'), ('secunda', 'Mpumalanga'),
    ('limpopo', 'Limpopo'), ('polokwane', 'Limpopo'), ('tzaneen', 'Limpopo'), ('thohoyandou', 'Limpopo'),
    ('free state', 'Free State'), ('bloemfontein', 'Free State'), ('welkom', 'Free State'),
    ('eastern cape', 'Eastern Cape'), ('gqeberha', 'Eastern Cape'), ('port elizabeth', 'Eastern Cape'), ('east london', 'Eastern Cape'), ('mthatha', 'Eastern Cape'),
    ('northern cape', 'Northern Cape'), ('kimberley', 'Northern Cape'), ('upington', 'Northern Cape'),
    ('north west', 'North West'), ('mahikeng', 'North West'), ('mafikeng', 'North West'), ('rustenburg', 'North West'), ('potchefstroom', 'North West'), ('klerksdorp', 'North West'),
]


def is_shortener_url(url):
    try:
        host = (urllib.parse.urlparse(url).hostname or '').lower()
        if host.startswith('www.'): host = host[4:]
    except Exception:
        return True
    return host in SHORTENER_HOSTS


def scrub_popia_pii(text):
    s = str(text or '')
    s = SA_ID_RE.sub('[redacted-id]', s)
    s = EMAIL_RE.sub('[redacted-email]', s)
    s = PHONE_RE.sub('[redacted-phone]', s)
    return re.sub(r'\s+', ' ', s).strip()


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
    title = scrub_popia_pii(raw.get('title'))
    loc = scrub_popia_pii(raw.get('location'))
    url = str(raw.get('url') or '').strip()
    if not title or not C.https_ok(url) or is_shortener_url(url):
        return None
    if FEE_RE.search(title) or FEE_RE.search(loc) or FEE_RE.search(url):
        return None
    low = loc.lower()
    if not any(k in low for k in keywords):
        return None
    prov = next((p for h, p in PROVINCE_HINTS if h in low), board.get('defaultProvince', ''))
    return {'title': title, 'employer': board['employer'], 'town': loc or 'South Africa', 'province': prov, 'closingDate': 'Open / Rolling',
            'daysRemaining': None, 'freshnessStatus': 'rolling', 'stillOpenAfterWeek': False, 'sourceType': kind, 'officialUrl': url}


def deduplicate_jobs(jobs):
    seen, out = set(), []
    for j in jobs:
        key = (
            str(j.get('employer') or '').strip().lower(),
            str(j.get('title') or '').strip().lower(),
            str(j.get('officialUrl') or '').strip().lower(),
        )
        if key in seen:
            continue
        seen.add(key)
        out.append(j)
    return out


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
            rows = deduplicate_jobs([r for r in (to_row(x, b, kind, keywords) for x in fetchers[kind](b)) if r])
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
    jobs = deduplicate_jobs(kept + sorted(new, key=lambda j: (j['employer'], j['title'])))
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
