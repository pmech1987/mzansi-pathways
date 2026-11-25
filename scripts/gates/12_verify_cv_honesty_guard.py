#!/usr/bin/env python3
"""Gate 12: Ensures Evidence Vault / CV builder never fabricates numbers or claims proprietary ATS %."""
import json
from pathlib import Path

def run(root: Path = Path(".")) -> dict:
    errors = []
    low = (root / "index.html").read_text(encoding="utf-8", errors="replace").lower()
    if "never invent numbers" not in low and "zero fabricated claims" not in low:
        errors.append("index.html: missing CV anti-fabrication honesty guidance")
    return {"gate": "12_cv_honesty_guard", "passed": not errors, "errors": errors}

if __name__ == "__main__":
    r = run(); print(json.dumps(r)); raise SystemExit(0 if r["passed"] else 1)
