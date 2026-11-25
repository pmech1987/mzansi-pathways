#!/usr/bin/env python3
"""Gate 11: Verifies links to official SA registers (DHET, QCTO, SAQA, NSFAS, SA Youth)."""
import json
from pathlib import Path

REQUIRED = ["https://www.dhet.gov.za/", "https://www.qcto.org.za/", "https://www.saqa.org.za/", "https://www.nsfas.org.za/", "https://sayouth.mobi/"]

def run(root: Path = Path(".")) -> dict:
    errors = []
    txt = (root / "index.html").read_text(encoding="utf-8", errors="replace")
    for u in REQUIRED:
        if u not in txt:
            errors.append(f"index.html: missing official register link {u}")
    return {"gate": "11_legitimacy_registers", "passed": not errors, "errors": errors}

if __name__ == "__main__":
    r = run(); print(json.dumps(r)); raise SystemExit(0 if r["passed"] else 1)
