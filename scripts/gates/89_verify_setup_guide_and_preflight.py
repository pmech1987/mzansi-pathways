#!/usr/bin/env python3
"""Gate 89: the setup guide stays accurate: every path it names exists, and the preflight and off-site backup tools are present."""
import json, re
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]

def main() -> int:
    errors = []
    g = ROOT / "SETUP.md"
    if not g.exists(): errors.append("SETUP.md missing")
    else:
        t = g.read_text(encoding="utf-8")
        for h in ("First time", "Where everything goes", "routine", "Backups and recovery", "If something goes wrong"):
            if h not in t: errors.append("SETUP.md missing section: " + h)
        generated = ("backups/", "dist/", "vendor/", "mzansi_pathways_vNN")
        for m in set(re.findall(r"`((?:scripts|data|docs|js|tests|\.github)/[A-Za-z0-9_./<>-]+?)`", t)):
            if any(c in m for c in "<>") or m.endswith("/") or m.startswith(generated): continue
            if not (ROOT / m).exists(): errors.append("SETUP.md names a path that does not exist: " + m)
        for cmd in ("--restore", "--offsite", "--list-backups", "doctor.py", "new_year.py", "mz_verify.py"):
            if cmd not in t: errors.append("SETUP.md does not explain " + cmd)
    for rel in ("scripts/doctor.py", "maintain.bat"):
        if not (ROOT / rel).exists(): errors.append("missing " + rel)
    mt = (ROOT / "scripts/maintain.py").read_text(encoding="utf-8")
    for tok in ("offsite_copy", "doctor.checks", "--doctor"):
        if tok not in mt: errors.append("maintain.py missing " + tok)
    print(json.dumps({"gate": "89_verify_setup_guide_and_preflight", "passed": not errors, "errors": errors}))
    return 0 if not errors else 1

if __name__ == "__main__":
    raise SystemExit(main())
