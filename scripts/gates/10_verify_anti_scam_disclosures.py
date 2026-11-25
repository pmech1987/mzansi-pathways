#!/usr/bin/env python3
"""Gate 10: Confirms anti-scam fee warnings and scam risk-indicator scanner exist."""
import json
from pathlib import Path

def run(root: Path = Path(".")) -> dict:
    errors = []
    low = (root / "index.html").read_text(encoding="utf-8", errors="replace").lower()
    if "never pay" not in low:
        errors.append("index.html: missing 'never pay' anti-scam notice")
    if "scam-form" not in low:
        errors.append("index.html: missing interactive scam scanner form")
    return {"gate": "10_anti_scam_disclosures", "passed": not errors, "errors": errors}

if __name__ == "__main__":
    r = run(); print(json.dumps(r)); raise SystemExit(0 if r["passed"] else 1)
