#!/usr/bin/env python3
"""Gate 14: Checks Easy View, Parent Mode, Dark Mode, ARIA roles, and print stylesheet."""
import json
from pathlib import Path

MARKERS = ['id="easy-btn"', 'id="parent-btn"', 'id="theme-btn"', 'role="dialog"', 'aria-modal="true"', '@media print']

def run(root: Path = Path(".")) -> dict:
    errors = []
    txt = (root / "index.html").read_text(encoding="utf-8", errors="replace")
    for m in MARKERS:
        if m not in txt:
            errors.append(f"index.html: missing accessibility/mode marker {m}")
    return {"gate": "14_accessibility_and_parent_mode", "passed": not errors, "errors": errors}

if __name__ == "__main__":
    r = run(); print(json.dumps(r)); raise SystemExit(0 if r["passed"] else 1)
