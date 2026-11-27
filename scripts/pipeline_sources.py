"""Find and download each institution's official prospectus PDF. Only the institution's own website is ever used."""
import hashlib, os, re, sys, time, urllib.request
from html.parser import HTMLParser
import mz_common as C
from pipeline_verify import same_site

UA = 'MzansiPathways-ProspectusBot/1.0 (reads public prospectus PDFs from official institution sites only)'
CACHE = os.path.join(C.ROOT, '.cache', 'prospectus')


class _Links(HTMLParser):
    def __init__(self):
        super().__init__(); self.links = []; self._href = None; self._txt = []
    def handle_starttag(self, tag, attrs):
        if tag == 'a':
            self._href = dict(attrs).get('href'); self._txt = []
    def handle_data(self, d):
        if self._href is not None:
            self._txt.append(d)
    def handle_endtag(self, tag):
        if tag == 'a' and self._href:
            self.links.append((self._href, ' '.join(self._txt).strip())); self._href = None


def http_get(url, limit=140 * 1024 * 1024, timeout=60):
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    with C.safe_open(req, timeout=timeout) as r:
        return r.read(limit + 1), r.headers.get('Content-Type', '')


def abs_url(base, href):
    from urllib.parse import urljoin
    return urljoin(base, href.split('#')[0])


def score(url, text, year):
    s, low = 0, (url + ' ' + text).lower()
    if 'prospectus' not in low: return -99
    if str(year) in low: s += 4
    if str(year - 1) in low: s -= 2
    for w, v in (('undergrad', 3), ('faculty', 1), ('general', 1), ('postgrad', -4), ('honours', -3), ('masters', -4), ('summer', -3), ('international', -2)):
        if w in low: s += v
    return s


def discover(official_url, year, fetch=http_get, max_pages=25):
    """Look through the institution's own site for prospectus PDFs. Returns [(score, url)] best first."""
    seen, queue, pdfs = set(), [(official_url, 0)], {}
    while queue and len(seen) < max_pages:
        url, depth = queue.pop(0)
        if url in seen or not same_site(url, official_url): continue
        seen.add(url)
        try:
            body, ctype = fetch(url, limit=2 * 1024 * 1024, timeout=25)
        except Exception:
            continue
        if b'%PDF' in body[:8]:
            pdfs[url] = max(pdfs.get(url, -99), score(url, '', year)); continue
        p = _Links()
        try: p.feed(body.decode('utf-8', 'replace'))
        except Exception: continue
        for href, text in p.links:
            u = abs_url(url, href)
            if not u.startswith('https://') or not same_site(u, official_url): continue
            if re.search(r'\.pdf(\?|$)', u, re.I):
                sc = score(u, text, year)
                if sc > -99: pdfs[u] = max(pdfs.get(u, -99), sc)
            elif depth < 2 and re.search(r'prospectus|admission|undergrad|apply|study|programme', (u + text).lower()):
                queue.append((u, depth + 1))
    return sorted(((s, u) for u, s in pdfs.items()), reverse=True)


def sha256_file(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for chunk in iter(lambda: f.read(1 << 20), b''):
            h.update(chunk)
    return h.hexdigest()


def download(url, key, fetch=http_get):
    """Download to the cache. Returns (path, sha256, bytes). Refuses anything that is not a PDF."""
    os.makedirs(CACHE, exist_ok=True)
    path = os.path.join(CACHE, key + '.pdf')
    meta = path + '.url'
    max_age = float(os.environ.get('MZ_PDF_MAX_AGE_HOURS', 144)) * 3600   # be polite: re-download a prospectus at most every 6 days
    if os.path.exists(path) and os.path.exists(meta) and C.read_text(meta) == url and time.time() - os.path.getmtime(path) < max_age:
        return path, sha256_file(path), os.path.getsize(path)
    body, _ = fetch(url)
    if not body.startswith(b'%PDF'):
        raise ValueError('not a PDF')
    if len(body) > 140 * 1024 * 1024:
        raise ValueError('file too large')
    os.makedirs(CACHE, exist_ok=True)
    path = os.path.join(CACHE, key + '.pdf')
    C.write_atomic(path, body)
    C.write_atomic(meta, url)
    return path, hashlib.sha256(body).hexdigest(), len(body)
