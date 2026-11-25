#!/usr/bin/env python3
"""Gate 03: Blocks eval(), document.write(), blocking dialogs, and verifies HTML escaping helper."""
import json, re
from pathlib import Path

UNSAFE = [
    ("alert()", re.compile(r"\b(?:window\.)?alert\s*\(")),
    ("confirm()", re.compile(r"\b(?:window\.)?confirm\s*\(")),
    ("prompt()", re.compile(r"(?:\bwindow\.prompt|(?<![.\w])prompt)\s*\(")),
    ("eval()", re.compile(r"\beval\s*\(")),
    ("document.write()", re.compile(r"\bdocument\.write\s*\(")),
]

def run(root: Path = Path(".")) -> dict:
    errors = []
    txt = (root / "index.html").read_text(encoding="utf-8", errors="replace")
    for label, rx in UNSAFE:
        if rx.search(txt):
            errors.append(f"index.html: forbidden {label}")
    if "function escapeHtml(" not in txt:
        errors.append("index.html: missing escapeHtml() sanitizer")
    return {"gate": "03_xss_and_unsafe_js", "passed": not errors, "errors": errors}

if __name__ == "__main__":
    r = run(); print(json.dumps(r)); raise SystemExit(0 if r["passed"] else 1)
