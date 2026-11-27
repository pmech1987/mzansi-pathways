#!/usr/bin/env python3
"""Last line of defence before anything is published. Checks every file in data/ and exits 1 if anything is wrong.

    python scripts/validate_data.py                  # check the data files
    python scripts/validate_data.py --against HEAD   # also refuse a sudden shrink compared with what is already published (circuit breaker)

What it catches:
  * a file that is not valid JSON, empty, or unreasonably large
  * a link that is not https, or that points at a private/internal address, or at a social/short-link/job-board domain
  * script or HTML injection in any text (<script, javascript:, onerror=, control characters), because the app shows this text to learners
  * duplicate ids inside one list
  * (with --against) a list that suddenly lost more than 30% of its items: usually a broken parser, not a real change. MZ_ALLOW_SHRINK=1 overrides it once.
It changes nothing.
"""
import ipaddress, json, os, re, subprocess, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import mz_common as C

MAX_BYTES = 12 * 1024 * 1024
BAD_TEXT = re.compile(r'<\s*/?\s*(script|iframe|object|embed|svg|style)\b|javascript:|data:text/html|\bon[a-z]{3,12}\s*=\s*["\']?[^\s"\']|[\x00-\x08\x0b\x0c\x0e-\x1f]', re.I)
URL_KEYS = re.compile(r'(url|link|href|website|source)$', re.I)
# Fields that are allowed to hold a non-https value on purpose (none today). Add a key here only with a reason.
URL_EXEMPT = set()
SHRINK_LIMIT, SHRINK_MIN_ITEMS = 0.30, 8


def json_files(data_dir):
    for root, _, files in os.walk(data_dir):
        for f in sorted(files):
            if f.endswith('.json'):
                yield os.path.join(root, f)


def walk(obj, where, problems):
    if isinstance(obj, dict):
        for k, v in obj.items():
            if isinstance(v, str) and URL_KEYS.search(k) and k not in URL_EXEMPT and v.strip():
                if v.startswith(('http://', 'ftp://', 'javascript:', 'data:')) or (v.startswith('https://') and not C.https_ok(v)):
                    problems.append('%s.%s: link is not an allowed https link (%s)' % (where, k, v[:70]))
                elif v.startswith('https://'):
                    try:
                        host = v[8:].split('/')[0].split('?')[0].split(':')[0].strip('[]')
                        ip = ipaddress.ip_address(host)
                        if not ip.is_global:
                            problems.append('%s.%s: link points at a private address' % (where, k))
                    except ValueError:
                        pass
            walk(v, '%s.%s' % (where, k), problems)
    elif isinstance(obj, list):
        ids = [x.get('id') for x in obj if isinstance(x, dict) and isinstance(x.get('id'), str)]
        dup = sorted({i for i in ids if ids.count(i) > 1})
        if dup:
            problems.append('%s: duplicate id(s) %s' % (where, ', '.join(dup[:5])))
        for n, v in enumerate(obj):
            walk(v, '%s[%d]' % (where, n), problems)
    elif isinstance(obj, str):
        if BAD_TEXT.search(obj):
            problems.append('%s: suspicious text (script/HTML/control characters): %s' % (where, obj[:60].replace('\n', ' ')))


def measure(obj):
    """How many items a data file holds: the list itself, or the sum of its top-level lists."""
    if isinstance(obj, list):
        return len(obj)
    if isinstance(obj, dict):
        return sum(len(v) for v in obj.values() if isinstance(v, list))
    return 0


def check_files(data_dir):
    problems = []
    for p in json_files(data_dir):
        rel = os.path.relpath(p, data_dir)
        size = os.path.getsize(p)
        if size == 0 or size > MAX_BYTES:
            problems.append('%s: size %d bytes is not plausible' % (rel, size)); continue
        try:
            with open(p, encoding='utf-8') as f:
                obj = json.load(f)
        except Exception as e:
            problems.append('%s: not valid JSON (%s)' % (rel, e.__class__.__name__)); continue
        walk(obj, rel, problems)
        if rel == 'progression.json':
            problems += check_progression(obj, data_dir)
        elif rel.startswith('community' + os.sep):
            problems += check_community(rel, obj)
    return problems


def check_progression(obj, data_dir):
    """Evidence ledger rules: every entry is a short quote with a source; 'verified' needs two enrolled reviewers (scripts never set it)."""
    out, rp = [], os.path.join(data_dir, 'reviewers.json')
    try:
        with open(rp, encoding='utf-8') as f:
            revs = {r.get('id') for r in json.load(f).get('reviewers', []) if isinstance(r, dict)}
    except Exception:
        revs = set()
    for n, e in enumerate(obj.get('entries', []) if isinstance(obj, dict) else []):
        w = 'progression.json entries[%d]' % n
        if not isinstance(e, dict): out.append(w + ': not an object'); continue
        if e.get('kind') not in ('credit', 'access', 'bridging'): out.append(w + ': bad kind')
        if not 20 <= len(str(e.get('text', ''))) <= 300: out.append(w + ': quote must be 20-300 characters')
        if re.search(r'https?://|www\.|@', str(e.get('text', ''))): out.append(w + ': quote contains a link or email')
        if not e.get('sources'): out.append(w + ': no source recorded')
        if e.get('status') not in ('pending_review', 'corroborated', 'verified'): out.append(w + ': bad status')
        if e.get('status') == 'verified' and len({r for r in e.get('reviewedBy', []) if r in revs}) < 2:
            out.append(w + ': verified without two enrolled reviewers')
    return out


def check_community(rel, obj):
    out = []
    if not isinstance(obj, dict) or not isinstance(obj.get('submissions'), list): return [rel + ': submissions list missing']
    if len(obj['submissions']) > 60: out.append(rel + ': more than 60 staged submissions')
    for n, sub in enumerate(obj['submissions']):
        if not re.fullmatch(r'[a-f0-9]{16,32}', str(sub.get('submitter', ''))): out.append('%s[%d]: submitter id is not a random hex id' % (rel, n))
        if not re.fullmatch(r'[a-f0-9]{64}', str(sub.get('docSha256', ''))): out.append('%s[%d]: docSha256 missing' % (rel, n))
    return out


def check_shrink(data_dir, ref):
    """Compare item counts with the same files at git `ref`. Returns problems."""
    problems = []
    root = os.path.abspath(os.path.join(data_dir, '..'))
    for p in json_files(data_dir):
        rel = os.path.relpath(p, root).replace(os.sep, '/')
        try:
            old = subprocess.run(['git', 'show', '%s:%s' % (ref, rel)], cwd=root, capture_output=True, timeout=60)
            if old.returncode != 0:
                continue
            before = measure(json.loads(old.stdout.decode('utf-8')))
            with open(p, encoding='utf-8') as f:
                after = measure(json.load(f))
        except Exception:
            continue
        if before >= SHRINK_MIN_ITEMS and after < before * (1 - SHRINK_LIMIT):
            problems.append('%s: shrank from %d to %d items (more than %d%%); refusing to publish. Set MZ_ALLOW_SHRINK=1 if this is really intended.' % (rel, before, after, SHRINK_LIMIT * 100))
    return problems


def main(argv=None):
    argv = list(sys.argv[1:] if argv is None else argv)
    problems = check_files(C.DATA)
    if '--against' in argv and os.environ.get('MZ_ALLOW_SHRINK') != '1':
        problems += check_shrink(C.DATA, argv[argv.index('--against') + 1])
    for pr in problems:
        C.log('PROBLEM', pr)
    n = sum(1 for _ in json_files(C.DATA))
    C.log('%d data file(s) checked, %d problem(s)' % (n, len(problems)))
    return 1 if problems else 0


if __name__ == '__main__':
    sys.exit(main())
