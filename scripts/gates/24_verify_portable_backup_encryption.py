#!/usr/bin/env python3
"""Gate 24: Verifies WebCrypto PBKDF2 (>=100,000 iterations) + AES-GCM-256 cross-device backup."""
import json, re
from pathlib import Path

def run(root: Path = Path(".")) -> dict:
    errors = []
    txt = (root / "index.html").read_text(encoding="utf-8", errors="replace")
    m = re.search(r"iterations\s*:\s*(\d+)", txt)
    if not m or int(m.group(1)) < 100000:
        errors.append("index.html: PBKDF2 iterations must be >= 100000")
    if "crypto.getRandomValues" not in txt:
        errors.append("index.html: missing crypto.getRandomValues() for random salt/IV")
    if "AES-GCM" not in txt:
        errors.append("index.html: missing AES-GCM encryption")
    return {"gate": "24_portable_backup_encryption", "passed": not errors, "errors": errors}

if __name__ == "__main__":
    r = run(); print(json.dumps(r)); raise SystemExit(0 if r["passed"] else 1)
