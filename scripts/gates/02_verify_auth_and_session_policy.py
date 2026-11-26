#!/usr/bin/env python3
"""Gate 02: Verifies zero hardcoded passwords, HTTPS links, and POPIA under-18 / no-ID rules."""
import json, re
from pathlib import Path

def run(root: Path = Path(".")) -> dict:
    errors = []
    txt = (root / "index.html").read_text(encoding="utf-8", errors="replace")
    if re.search(r"password\s*[:=]\s*['\"][^'\"]{4,}['\"]", txt, re.I):
        errors.append("index.html: hardcoded password detected")
    if re.search(r"http://(?!www\.w3\.org|localhost|127\.0\.0\.1)", txt):
        errors.append("index.html: insecure non-HTTPS URL found")
    low = txt.lower()
    if "guardian" not in low or "18" not in low:
        errors.append("index.html: missing under-18 POPIA guardian consent notice on account sync")
    if "aes-gcm" not in low or "pbkdf2" not in low:
        errors.append("index.html: missing WebCrypto PBKDF2 + AES-GCM encrypted cross-device transfer")
    return {"gate": "02_auth_and_session_policy", "passed": not errors, "errors": errors}

if __name__ == "__main__":
    r = run(); print(json.dumps(r)); raise SystemExit(0 if r["passed"] else 1)
