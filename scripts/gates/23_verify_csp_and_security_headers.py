#!/usr/bin/env python3
"""Gate 23: Verifies production security headers (_headers) against clickjacking & MIME sniffing."""
import json
from pathlib import Path

REQUIRED = ("X-Frame-Options: DENY", "X-Content-Type-Options: nosniff", "Referrer-Policy:", "Strict-Transport-Security:")

def run(root: Path = Path(".")) -> dict:
    errors = []
    hp = root / "_headers"
    if not hp.exists():
        return {"gate": "23_csp_and_security_headers", "passed": False, "errors": ["Missing _headers security config"]}
    txt = hp.read_text(encoding="utf-8")
    for req in REQUIRED:
        if req not in txt:
            errors.append(f"_headers missing {req}")
    return {"gate": "23_csp_and_security_headers", "passed": not errors, "errors": errors}

if __name__ == "__main__":
    r = run(); print(json.dumps(r)); raise SystemExit(0 if r["passed"] else 1)
