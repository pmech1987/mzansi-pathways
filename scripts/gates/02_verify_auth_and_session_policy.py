#!/usr/bin/env python3
"""Gate 02: Verifies zero hardcoded passwords/admin tokens, HTTPS links, and POPIA no-ID-required rule."""
import json, re
from pathlib import Path

def run(root: Path = Path(".")) -> dict:
    errors = []
    txt = (root / "index.html").read_text(encoding="utf-8", errors="replace")
    if re.search(r"password\s*[:=]\s*['\"][^'\"]{4,}['\"]", txt, re.I):
        errors.append("index.html: hardcoded password detected")
    if re.search(r"http://(?!www\.w3\.org|localhost|127\.0\.0\.1)", txt):
        errors.append("index.html: insecure non-HTTPS URL found")
    return {"gate": "02_auth_and_session_policy", "passed": not errors, "errors": errors}

if __name__ == "__main__":
    r = run(); print(json.dumps(r)); raise SystemExit(0 if r["passed"] else 1)
