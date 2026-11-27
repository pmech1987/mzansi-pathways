#!/usr/bin/env python3
"""Mzansi Pathways v100 One-Command Production Release Verifier.

Run before publishing any release:
    python3 scripts/verify_release.py

1. Rebuilds data/sri_manifest.json & runs SAST expiry archiver (autonomous_ops.py).
2. Runs every Python test suite, health auditor, data validator, and Node.js suite (run_all_checks.py).
3. Confirms zero stray .tmp/.part files and prints a concise release readiness certificate.
"""
import json, os, subprocess, sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))


def main():
    steps = [
        ('autonomous ops (SAST expiry + SRI manifest)', [sys.executable, 'scripts/autonomous_ops.py']),
        ('full verification suite (run_all_checks.py)', [sys.executable, 'scripts/run_all_checks.py']),
    ]
    for label, cmd in steps:
        r = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True)
        if r.returncode != 0:
            print('RELEASE VERIFICATION FAILED at:', label, file=sys.stderr)
            print((r.stdout + r.stderr)[-2000:], file=sys.stderr)
            return 1

    # Check for stray temp files
    stray = []
    for root, dirs, files in os.walk(ROOT):
        dirs[:] = [d for d in dirs if d not in ('.git', '__pycache__', '.cache', 'backups')]
        for f in files:
            if f.endswith(('.tmp', '.part', '.orig')):
                stray.append(os.path.relpath(os.path.join(root, f), ROOT))
    if stray:
        print('RELEASE VERIFICATION FAILED: stray temp files:', ', '.join(stray), file=sys.stderr)
        return 1

    sri = json.load(open(os.path.join(ROOT, 'data', 'sri_manifest.json'), encoding='utf-8'))
    mf = json.load(open(os.path.join(ROOT, 'manifest.json'), encoding='utf-8'))
    print('RELEASE READY: buildTag=%s assets=%d shortcuts=%d' % (
        sri.get('buildTag', 'unknown'),
        len(sri.get('assets', {})),
        len(mf.get('shortcuts', [])),
    ))
    return 0


if __name__ == '__main__':
    sys.exit(main())
