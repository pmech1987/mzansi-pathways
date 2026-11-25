#!/usr/bin/env python3
"""Gate 08: Ensures UI never falsely promises guaranteed university/college admission."""
import json
from pathlib import Path

def run(root: Path = Path(".")) -> dict:
    errors = []
    low = (root / "index.html").read_text(encoding="utf-8", errors="replace").lower()
    if "guaranteed admission" in low or "100% accepted" in low:
        errors.append("index.html: prohibited 'guaranteed admission' claim detected")
    return {"gate": "08_no_guaranteed_admission", "passed": not errors, "errors": errors}

if __name__ == "__main__":
    r = run(); print(json.dumps(r)); raise SystemExit(0 if r["passed"] else 1)
