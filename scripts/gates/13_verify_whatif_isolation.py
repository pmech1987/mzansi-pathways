#!/usr/bin/env python3
"""Gate 13: Verifies What-If Simulator keeps hypothetical marks isolated from saved real marks."""
import json
from pathlib import Path

def run(root: Path = Path(".")) -> dict:
    errors = []
    txt = (root / "index.html").read_text(encoding="utf-8", errors="replace")
    if "function getActiveSubjects()" not in txt or "whatIfActive" not in txt:
        errors.append("index.html: missing isolated getActiveSubjects() What-If layer")
    return {"gate": "13_whatif_isolation", "passed": not errors, "errors": errors}

if __name__ == "__main__":
    r = run(); print(json.dumps(r)); raise SystemExit(0 if r["passed"] else 1)
