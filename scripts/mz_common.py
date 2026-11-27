"""Shared helpers for the Mzansi Pathways data scripts. Standard library only (Python 3.9+)."""
import ipaddress, json, os, re, socket, sys, tempfile, urllib.parse, urllib.request
from datetime import date, datetime, timedelta, timezone

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
DATA = os.path.join(ROOT, 'data')
SAST = timezone(timedelta(hours=2))
ISO = re.compile(r'^\d{4}-\d{2}-\d{2}$')
# Never accepted as an "official" source (same list as Creator Studio).
BLOCKED_DOMAINS = ['facebook.com', 'fb.com', 'whatsapp.com', 'chat.whatsapp.com', 'bit.ly', 'tinyurl.com', 't.co', 'rb.gy',
                   'graduates24.com', 'pnet.co.za', 'indeed.com', 'linkedin.com',
                   'wa.me', 't.me', 'cutt.ly', 'shorturl.at', 'goo.gl', 'ow.ly', 'is.gd', 'tiktok.com', 'instagram.com', 'x.com']


def today():
    """Today's date in South Africa. MZ_TODAY=YYYY-MM-DD overrides it (used by tests)."""
    o = os.environ.get('MZ_TODAY')
    return date.fromisoformat(o) if o else datetime.now(SAST).date()


def path(*p):
    return os.path.join(DATA, *p)


def load(p):
    with open(p, encoding='utf-8') as f:
        return json.load(f)


def read_text(p):
    with open(p, encoding='utf-8') as f:
        return f.read()


def save(p, obj):
    """Atomic write (temp file then rename) so a crash can never leave a half-written data file."""
    text = json.dumps(obj, indent=1, ensure_ascii=False) + '\n'
    d = os.path.dirname(p)
    fd, tmp = tempfile.mkstemp(dir=d, suffix='.tmp')
    try:
        with os.fdopen(fd, 'w', encoding='utf-8', newline='\n') as f:
            f.write(text)
        os.replace(tmp, p)
    except Exception:
        if os.path.exists(tmp):
            os.unlink(tmp)
        raise


def write_atomic(p, data):
    """Atomic write for text (str) or bytes: temp file in the same folder, fsync, then rename."""
    d = os.path.dirname(os.path.abspath(p)) or '.'
    os.makedirs(d, exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=d, suffix='.tmp')
    try:
        if isinstance(data, bytes):
            with os.fdopen(fd, 'wb') as f:
                f.write(data); f.flush(); os.fsync(f.fileno())
        else:
            with os.fdopen(fd, 'w', encoding='utf-8', newline='\n') as f:
                f.write(data); f.flush(); os.fsync(f.fileno())
        os.replace(tmp, p)
    except Exception:
        if os.path.exists(tmp):
            os.unlink(tmp)
        raise


def write_if_changed(p, obj):
    """Save only when the content really differs. Returns True if written."""
    try:
        if load(p) == obj:
            return False
    except Exception:
        pass
    save(p, obj)
    return True


def https_ok(u):
    if not isinstance(u, str) or not u.startswith('https://'):
        return False
    host = u[8:].split('/')[0].split('?')[0].lower()
    return bool(host) and '.' in host and not any(host == d or host.endswith('.' + d) for d in BLOCKED_DOMAINS)


def log(*a):
    print(*a, file=sys.stdout, flush=True)


# ---- network safety: every script that fetches a URL goes through here -------------------------------------------------
class UnsafeUrl(ValueError):
    """The URL is not safe to fetch (not https, has a password in it, points at a private/internal address, or is not on the allow-list)."""


def _resolve(host, port=443):
    return [ai[4][0] for ai in socket.getaddrinfo(host, port, type=socket.SOCK_STREAM)]


def check_public_https(url, allow_hosts=None):
    """Raise UnsafeUrl unless `url` is https, has no embedded credentials, and every address it resolves to is a public internet address.
    This stops a bad link (or a redirect) from making the bot call internal services such as the cloud metadata address."""
    p = urllib.parse.urlsplit(str(url))
    host = (p.hostname or '').lower()
    if p.scheme != 'https':
        raise UnsafeUrl('not https')
    if not host or p.username or p.password:
        raise UnsafeUrl('missing host or credentials in URL')
    if allow_hosts is not None and host not in allow_hosts:
        raise UnsafeUrl('host not on the allow-list')
    try:
        addrs = [ipaddress.ip_address(host)]
    except ValueError:
        addrs = [ipaddress.ip_address(a.split('%')[0]) for a in _resolve(host, p.port or 443)]
    if not addrs or any(not a.is_global for a in addrs):
        raise UnsafeUrl('address is not a public internet address')
    return url


class _SafeRedirect(urllib.request.HTTPRedirectHandler):
    max_redirections = 5

    def redirect_request(self, req, fp, code, msg, headers, newurl):
        check_public_https(urllib.parse.urljoin(req.full_url, newurl))
        return super().redirect_request(req, fp, code, msg, headers, newurl)


def safe_open(req, timeout=30, allow_hosts=None):
    """urlopen that refuses non-https and private addresses, also on every redirect, and follows at most 5 redirects.
    Redirects are not allowed to leave an allow-list when one is given (used for the AI providers)."""
    if isinstance(req, str):
        req = urllib.request.Request(req)
    check_public_https(req.full_url, allow_hosts)
    handlers = [] if allow_hosts is not None else [_SafeRedirect()]
    opener = urllib.request.build_opener(*handlers) if handlers else urllib.request.build_opener(_NoRedirect())
    return opener.open(req, timeout=timeout)


class _NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None   # an API call must never be bounced somewhere else (it carries a secret key)


def paused():
    """True when a person has switched the bots off by setting data/automation_pause.json to {"paused": true}."""
    try:
        return bool(load(path('automation_pause.json')).get('paused'))
    except Exception:
        return False
