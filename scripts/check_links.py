#!/usr/bin/env python3
"""Link health: checks every official link in the data files and records the result in data/link_health.json.

    python scripts/check_links.py              # check and write
    python scripts/check_links.py --dry-run    # check, print, write nothing
    python scripts/check_links.py --strict     # exit 1 if any link is confirmed failing (for CI that should go red)

What it checks (https only): institutions, event sources, bursary links, government portals, and the official link of every programme row.
Status per link:
  ok       reachable
  moved    reachable, but ends on a different website than the one we store (domain change or takeover: a person should look)
  suspect  failed this time (not found, DNS, TLS, timeout) after 3 tries; one more failed run makes it "failing"
  failing  failed on 2 runs in a row
  unknown  the site answered but refused a robot (401/403/429/5xx). This is NOT treated as broken.
It never edits a fact and never removes a link. It only reports, so a person decides (see reports/attention.md).
"""
import os, sys, time, socket, ssl, urllib.request, urllib.error
from concurrent.futures import ThreadPoolExecutor
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import mz_common as C

UA = 'MzansiPathways-LinkCheck/1.0 (weekly check that official links still work)'
FAIL_STREAK = 2          # consecutive failed runs before a link is called "failing"
TRIES = 3
BLOCKED_CODES = {401, 403, 406, 429, 451, 999}
HEAD_NOT_ALLOWED = {400, 403, 405, 501}


def host_of(u):
    h = u.split('://', 1)[-1].split('/')[0].split('?')[0].split('#')[0].lower().split(':')[0]
    return h[4:] if h.startswith('www.') else h


def collect():
    """{url: [who uses it]} from every data file that carries official links."""
    out = {}

    def add(u, who):
        if isinstance(u, str) and u.strip():
            u = u.strip().split('#')[0]
            out.setdefault(u, [])
            if who not in out[u] and len(out[u]) < 5:
                out[u].append(who)

    def load(name, default=None):
        p = C.path(name)
        return C.load(p) if os.path.exists(p) else (default if default is not None else {})

    for i in load('institutions.json').get('institutions', []):
        add(i.get('officialUrl'), 'institution:' + str(i.get('id')))
    for e in load('events.json').get('events', []):
        add(e.get('sourceUrl'), 'event:' + str(e.get('id')))
    for b in load('bursaries.json').get('bursaries', []):
        add(b.get('officialUrl'), 'bursary:' + str(b.get('id')))
    for p in load('sa_gov_portals.json').get('portals', []):
        add(p.get('url'), 'portal:' + str(p.get('id')))
    idx = load('index.json')
    for f in idx.get('files', []):
        for r in load(f).get('programmes', []):
            add(r.get('officialUrl'), 'programme:' + str(r.get('id')))
    ext = load('sa_extended_pathways.json')
    def walk_ext(obj, prefix='extended'):
        if isinstance(obj, dict):
            for k, v in obj.items():
                if isinstance(v, str) and v.startswith('https://'):
                    add(v, prefix + ':' + str(k))
                elif isinstance(v, (dict, list)):
                    walk_ext(v, prefix + ':' + str(k))
        elif isinstance(obj, list):
            for idx_i, item in enumerate(obj):
                walk_ext(item, prefix)
    if ext:
        walk_ext(ext)
    return out


def probe(url, timeout=20):
    """Return (http_status, final_url). Raises on network errors. HEAD first, then a 1-byte GET for servers that dislike HEAD."""
    def go(method):
        req = urllib.request.Request(url, method=method, headers={'User-Agent': UA, 'Accept': '*/*'})
        if method == 'GET':
            req.add_header('Range', 'bytes=0-0')
        with C.safe_open(req, timeout=timeout) as r:
            return r.status, r.geturl()
    try:
        return go('HEAD')
    except urllib.error.HTTPError as e:
        if e.code in HEAD_NOT_ALLOWED:
            try:
                return go('GET')
            except urllib.error.HTTPError as e2:
                return e2.code, url
        return e.code, url


def classify(http, err):
    """-> 'ok' | 'down' | 'blocked'. A refused robot or a busy server is never counted as a dead link."""
    if err is not None:
        return 'down'
    if http is None:
        return 'down'
    if 200 <= http < 400 or http == 416:
        return 'ok'
    if http in (404, 410):
        return 'down'
    if http in BLOCKED_CODES or http >= 500:
        return 'blocked'
    return 'down'


def check_one(url, fetch=probe, sleep=time.sleep):
    """Try up to TRIES times. Returns dict(kind, http, final, error)."""
    last = {'kind': 'down', 'http': None, 'final': url, 'error': 'no attempt'}
    for n in range(TRIES):
        try:
            http, final = fetch(url)
            kind = classify(http, None)
            last = {'kind': kind, 'http': http, 'final': final or url, 'error': None}
        except (urllib.error.URLError, socket.timeout, ssl.SSLError, ConnectionError, OSError) as e:
            last = {'kind': 'down', 'http': None, 'final': url, 'error': (getattr(e, 'reason', None) or e).__class__.__name__}
        except Exception as e:  # never let one odd link stop the run
            last = {'kind': 'down', 'http': None, 'final': url, 'error': e.__class__.__name__}
        if last['kind'] in ('ok', 'blocked'):
            return last
        if n < TRIES - 1:
            sleep(2 * (n + 1))
    return last


def merge(prev, res, today):
    """Combine the previous record with this run's result into the new record.
    "since" is the day the link's current state began. It only changes when the state changes, so a quiet week writes nothing."""
    prev = prev or {}
    streak = int(prev.get('failStreak', 0))
    rec = {'failStreak': streak}
    if res['kind'] == 'ok':
        rec.update(status='ok', http=res['http'], failStreak=0)
        if host_of(res['final']) != host_of(res['url']):
            rec.update(status='moved', finalUrl=res['final'])
    elif res['kind'] == 'blocked':
        rec.update(status='unknown', http=res['http'])
    else:
        streak += 1
        rec.update(status='failing' if streak >= FAIL_STREAK else 'suspect', http=res['http'], failStreak=streak)
        if res.get('error'):
            rec['error'] = res['error']
    same = {'suspect': 'bad', 'failing': 'bad'}
    grp = lambda st: same.get(st, st)
    rec['since'] = prev['since'] if prev.get('since') and grp(prev.get('status')) == grp(rec['status']) else today
    rec['usedBy'] = res['usedBy']
    return rec


def build(urls, prev_doc, today, fetch=probe, sleep=time.sleep, workers=8):
    keys = sorted(urls)
    prev_links = (prev_doc or {}).get('links', {})
    results = {}

    def job(u):
        if not C.https_ok(u):
            return u, {'kind': 'skip'}
        return u, check_one(u, fetch, sleep)

    with ThreadPoolExecutor(max_workers=workers) as ex:
        for u, r in ex.map(job, keys):
            results[u] = r
    links = {}
    for u in keys:
        r = results[u]
        if r['kind'] == 'skip':
            links[u] = {'status': 'skipped', 'reason': 'not an allowed https link', 'usedBy': urls[u]}
            continue
        r = dict(r, url=u, usedBy=urls[u])
        links[u] = merge(prev_links.get(u), r, today)
    counts = {}
    for v in links.values():
        counts[v['status']] = counts.get(v['status'], 0) + 1
    return {'schemaVersion': 1, 'checkedAt': today, 'summary': dict(total=len(links), **counts), 'links': links}


def main(argv, fetch=probe, sleep=time.sleep):
    today = C.today().isoformat()
    urls = collect()
    p = C.path('link_health.json')
    prev = C.load(p) if os.path.exists(p) else {}
    doc = build(urls, prev, today, fetch, sleep)
    s = doc['summary']
    C.log('links: %s' % ', '.join('%s %d' % (k, v) for k, v in s.items()))
    for u, v in doc['links'].items():
        if v['status'] in ('failing', 'suspect', 'moved'):
            C.log('  %-8s %s %s' % (v['status'], u, ('-> ' + v['finalUrl']) if v.get('finalUrl') else ''))
    if '--dry-run' not in argv:
        # Only write when something other than the date changed, so a quiet week makes no commit noise.
        old = dict(prev, checkedAt=None) if prev else None
        new = dict(doc, checkedAt=None)
        if old != new or not prev:
            C.save(p, doc)
            C.log('link_health.json written')
        else:
            C.log('no change in link health')
    return 1 if '--strict' in argv and s.get('failing') else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
