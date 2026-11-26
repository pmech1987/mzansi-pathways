#!/usr/bin/env python3
"""Gate 88: the maintenance tools keep their failsafes: atomic writes, backups before changes, a run lock,
no seal refresh over real gate failures, automatic restore, verified zip output."""
import json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]

def main() -> int:
    errors = []
    def txt(rel):
        p = ROOT / rel
        if not p.exists(): errors.append("missing " + rel); return ""
        return p.read_text(encoding="utf-8")
    sio = txt("scripts/safe_io.py")
    for tok in ("os.replace", "os.fsync", "json.loads(text)", "def snapshot", "def restore", "def lock", "testzip"):
        if tok not in sio: errors.append("safe_io.py missing " + tok)
    mt = txt("scripts/maintain.py")
    for tok in ("safe_io.lock", "safe_io.snapshot", "only_hash_failures", "safe_io.restore", "testzip", ".sha256", "--restore", "--dry-run"):
        if tok not in mt: errors.append("maintain.py missing " + tok)
    if "never marks anything verified" not in mt: errors.append("maintain.py must state it never marks anything verified")
    if '"verified"' in mt.replace("verificationStatus", "") .replace('== "verified"', ""): errors.append("maintain.py must not write the verified status")
    for rel in ("scripts/new_year.py", "scripts/csv_to_programmes_json.py"):
        t = txt(rel)
        if ("safe_io.atomic_write" not in t and "safe_io.write_json" not in t) or "safe_io.snapshot" not in t: errors.append(rel + " must write atomically and take a backup first")
        if ".write_text(" in t: errors.append(rel + " has a non-atomic write_text")
    for rel in ("tests/test_safe_io.py", "tests/test_years.py"):
        if not (ROOT / rel).exists(): errors.append("missing " + rel)
    gi = txt(".gitignore")
    for tok in ("backups/", "dist/", ".maintain.lock"):
        if tok not in gi: errors.append(".gitignore missing " + tok)
    print(json.dumps({"gate": "88_verify_maintenance_failsafes", "passed": not errors, "errors": errors}))
    return 0 if not errors else 1

if __name__ == "__main__":
    raise SystemExit(main())
