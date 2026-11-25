#!/usr/bin/env python3
"""Gate 09: Verifies official CAS WhatsApp (081 308 4196) and independent government attribution."""
import json
from pathlib import Path

def run(root: Path = Path(".")) -> dict:
    errors = []
    txt = (root / "index.html").read_text(encoding="utf-8", errors="replace")
    if "081 308 4196" not in txt:
        errors.append("index.html: missing official CAS WhatsApp number 081 308 4196")
    if "government service" not in txt.lower():
        errors.append("index.html: missing independent government-service attribution for CAS")
    return {"gate": "09_cas_government_attribution", "passed": not errors, "errors": errors}

if __name__ == "__main__":
    r = run(); print(json.dumps(r)); raise SystemExit(0 if r["passed"] else 1)
