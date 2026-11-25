#!/usr/bin/env python3
"""Gate 01: Scans repository for leaked API keys, tokens, or private keys."""
import json, re
from pathlib import Path

PATTERNS = [
    ("Google/Gemini API Key", re.compile(r"AIza[0-9A-Za-z_-]{35}")),
    ("Secret Token", re.compile(r"(?:sk-[0-9A-Za-z]{20,}|ghp_[0-9A-Za-z]{30,})")),
    ("Private Key Header", re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----")),
]

def run(root: Path = Path(".")) -> dict:
    errors = []
    for p in list(root.glob("*.html")) + list(root.glob("*.js")) + list(root.glob("*.json")) + list((root / "data").glob("*.json")):
        txt = p.read_text(encoding="utf-8", errors="replace")
        for label, rx in PATTERNS:
            if rx.search(txt):
                errors.append(f"{p.name}: possible leaked {label}")
    return {"gate": "01_secrets_and_keys", "passed": not errors, "errors": errors}

if __name__ == "__main__":
    r = run(); print(json.dumps(r)); raise SystemExit(0 if r["passed"] else 1)
