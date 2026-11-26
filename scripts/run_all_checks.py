#!/usr/bin/env python3
"""One command to check everything before you publish or after you change a script:   python scripts/run_all_checks.py
Runs every test suite, the data validator and the site tests. Prints a single PASS/FAIL line per step and exits 1 if any step fails."""
import os, shutil, subprocess, sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
STEPS = [('data files are valid and safe', ['scripts/validate_data.py']),
         ('data scripts', ['scripts/test_scripts.py']),
         ('prospectus pipeline', ['scripts/test_pipeline.py']),
         ('automation', ['scripts/test_automation.py']),
         ('safety layer', ['scripts/test_hardening.py']),
         ('v93 autonomous ops & pathways', ['scripts/test_v93_ops.py']),
         ('v94 UI, CSP, SRI & workflow overhaul', ['scripts/test_v94_overhaul.py']),
         ('v95 screenshot visual & UX regression fixes', ['scripts/test_v95_visual_and_ux_fixes.py'])]


def main():
    bad = 0
    for name, cmd in STEPS:
        r = subprocess.run([sys.executable] + cmd, cwd=ROOT, capture_output=True, text=True)
        print('%-4s %s' % ('PASS' if r.returncode == 0 else 'FAIL', name))
        if r.returncode:
            bad += 1; print((r.stdout + r.stderr)[-1500:])
    if shutil.which('node'):
        r = subprocess.run(['node', 'tests/run.mjs'], cwd=ROOT, capture_output=True, text=True)
        print('%-4s %s' % ('PASS' if r.returncode == 0 else 'FAIL', 'site tests (' + (r.stdout.strip().split('\n') or [''])[-1].strip() + ')'))
        bad += bool(r.returncode)
        r2 = subprocess.run(['node', '--test', 'tests/test_v93_evolved.mjs'], cwd=ROOT, capture_output=True, text=True)
        print('%-4s %s' % ('PASS' if r2.returncode == 0 else 'FAIL', 'v93 evolved JS engines (NCV L4, Reverse-APS, BM25, Trusted Types)'))
        bad += bool(r2.returncode)
    else:
        print('SKIP site tests (node is not installed)')
    print('\nALL CHECKS PASSED' if not bad else '\n%d STEP(S) FAILED' % bad)
    return 1 if bad else 0


if __name__ == '__main__':
    sys.exit(main())
