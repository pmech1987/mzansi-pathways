#!/usr/bin/env python3
"""Mzansi Pathways v97 System-Wide Security, Integrity, Accessibility & Failsafe Auditor.

Run standalone (`python3 scripts/health_audit.py`) or automatically via `scripts/run_all_checks.py`
and `scripts/push_data.sh` before any automated commit is allowed to publish.
"""
import base64, hashlib, json, os, re, sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
ERRORS = []


def err(msg):
    ERRORS.append(msg)


def read_text(rel):
    with open(os.path.join(ROOT, rel), 'r', encoding='utf-8') as f:
        return f.read()


def sha384_sri(abs_path):
    h = hashlib.sha384()
    with open(abs_path, 'rb') as f:
        for chunk in iter(lambda: f.read(65536), b''):
            h.update(chunk)
    return 'sha384-' + base64.b64encode(h.digest()).decode('ascii')


def audit_sri_manifest():
    p = os.path.join(ROOT, 'data', 'sri_manifest.json')
    if not os.path.isfile(p):
        err('Missing data/sri_manifest.json')
        return
    try:
        doc = json.loads(read_text('data/sri_manifest.json'))
    except Exception as e:
        err('Corrupt data/sri_manifest.json: %s' % e)
        return
    assets = doc.get('assets', {})
    if not isinstance(assets, dict) or len(assets) < 10:
        err('data/sri_manifest.json has too few assets (%d)' % len(assets))
        return
    for rel, expected in assets.items():
        if '..' in rel or rel.startswith('/'):
            err('Unsafe path in sri_manifest.json: %r' % rel)
            continue
        target = os.path.join(ROOT, rel)
        if not os.path.isfile(target):
            err('SRI manifest references missing file: %s' % rel)
            continue
        exp_hash = (expected.get('sri') or expected.get('integrity')) if isinstance(expected, dict) else expected
        actual = sha384_sri(target)
        if actual != exp_hash:
            err('SRI hash mismatch for %s (manifest=%s actual=%s)' % (rel, exp_hash, actual))


def audit_service_worker_assets():
    sw = read_text('sw.js')
    for arr_name in ('CORE', 'NICE'):
        m = re.search(r'const\s+' + arr_name + r'\s*=\s*\[([^\]]+)\]', sw)
        if not m:
            err('sw.js missing %s array' % arr_name)
            continue
        urls = re.findall(r"['\"]([^'\"]+)['\"]", m.group(1))
        for u in urls:
            if u in ('./', '/'):
                continue
            rel = u[2:] if u.startswith('./') else u.lstrip('/')
            if not os.path.isfile(os.path.join(ROOT, rel)):
                err('sw.js %s references missing file: %s' % (arr_name, u))
    if 'fetchWithTimeout' not in sw:
        err('sw.js missing fetchWithTimeout network failsafe')


def audit_icons_and_manifest():
    try:
        mf = json.loads(read_text('manifest.json'))
    except Exception as e:
        err('Invalid manifest.json: %s' % e)
        return
    for icon in mf.get('icons', []):
        src = icon.get('src', '')
        rel = src[2:] if src.startswith('./') else src.lstrip('/')
        full = os.path.join(ROOT, rel)
        if not os.path.isfile(full):
            err('manifest.json icon missing: %s' % src)
            continue
        with open(full, 'rb') as f:
            head = f.read(8)
        if rel.endswith('.png') and head != b'\x89PNG\r\n\x1a\n':
            err('Invalid PNG magic header for %s' % rel)
    svg_path = os.path.join(ROOT, 'favicon.svg')
    if not os.path.isfile(svg_path) or '<svg' not in read_text('favicon.svg'):
        err('favicon.svg missing or invalid SVG')


def audit_hardened_scripts_csp():
    strict_files = [
        'guard.js',
        'js/a11y.js',
        'js/toolkit.js',
        'js/backup.js',
        'js/comfort_and_jump.js',
        'js/clean_layout.js',
        'js/pwa_health.js',
        'js/calendar.js',
        'js/checklist.js',
        'js/modules/storage.js',
        'js/modules/funding.js',
        'js/modules/ui.js',
        'js/modules/results.js',
        'js/modules/study.js',
        'js/modules/work.js',
    ]
    core_dir = os.path.join(ROOT, 'js', 'core')
    if os.path.isdir(core_dir):
        for f in sorted(os.listdir(core_dir)):
            if f.endswith('.js'):
                strict_files.append('js/core/' + f)
    forbidden = [
        (r'\.innerHTML\s*=', 'innerHTML assignment'),
        (r'\beval\s*\(', 'eval() call'),
        (r'\bnew\s+Function\s*\(', 'new Function() call'),
        (r'document\.write\s*\(', 'document.write() call'),
    ]
    for rel in strict_files:
        if not os.path.isfile(os.path.join(ROOT, rel)):
            err('Missing hardened script: %s' % rel)
            continue
        txt = read_text(rel)
        for pat, label in forbidden:
            if re.search(pat, txt):
                if label == 'innerHTML assignment' and rel in ('js/core/trusted_dom.js', 'js/core/pathways_v2_engines.js') and 'createHTML' in txt:
                    continue
                err('Forbidden %s found in %s' % (label, rel))


def audit_data_json_safety():
    data_dir = os.path.join(ROOT, 'data')
    for root, _, files in os.walk(data_dir):
        for fname in sorted(files):
            if not fname.endswith('.json'):
                continue
            full = os.path.join(root, fname)
            rel = os.path.relpath(full, ROOT)
            try:
                raw = open(full, 'r', encoding='utf-8').read()
                json.loads(raw)
            except Exception as e:
                err('Invalid JSON in %s: %s' % (rel, e))
                continue
            if re.search(r'<script\b|javascript:', raw, re.I):
                err('Suspicious script/XSS token in %s' % rel)


def audit_workflows():
    wf_dir = os.path.join(ROOT, '.github', 'workflows')
    if not os.path.isdir(wf_dir):
        err('Missing .github/workflows directory')
        return
    for name in ('data-refresh.yml', 'prospectus-pipeline.yml', 'link-health.yml'):
        rel = '.github/workflows/' + name
        if not os.path.isfile(os.path.join(ROOT, rel)):
            err('Missing workflow: %s' % rel)
            continue
        txt = read_text(rel)
        # Detect classic YAML folded run: bug (single-line run: followed by indented command without |)
        if re.search(r'^\s+run:\s+[^\s|>].*\n\s{10,}python', txt, re.M):
            err('Broken multiline run: folding detected in %s' % rel)
        if 'scripts/run_all_checks.py' not in txt:
            err('Workflow %s does not gate commits on scripts/run_all_checks.py' % rel)


def main():
    audit_sri_manifest()
    audit_service_worker_assets()
    audit_icons_and_manifest()
    audit_hardened_scripts_csp()
    audit_data_json_safety()
    audit_workflows()
    if ERRORS:
        for e in ERRORS:
            print('AUDIT FAIL:', e, file=sys.stderr)
        return 1
    print('HEALTH AUDIT PASSED (SRI, SW, Icons, Strict-CSP, Data XSS, CI Workflows)')
    return 0


if __name__ == '__main__':
    sys.exit(main())
