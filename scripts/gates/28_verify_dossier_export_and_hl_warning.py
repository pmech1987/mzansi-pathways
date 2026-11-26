#!/usr/bin/env python3
"""Gate 28: Verifies Home Language <40% inline warning, Next Best Action Coach, and keyboard shortcuts."""
import json
from pathlib import Path


def run(root: Path = Path(".")) -> dict:
    errors = []
    txt = (root / "index.html").read_text(encoding="utf-8", errors="replace")
    for label, marker in [
        ("Home Language <40% warning", "HL &lt; 40%"),
        ("Next Best Action Coach", "function getNextBestAction("),
        ("Alt+1..6 keyboard navigation", "e.altKey"),
    ]:
        if marker not in txt:
            errors.append(f"index.html: missing {label} ({marker})")
    return {"gate": "28_dossier_export_and_hl_warning", "passed": not errors, "errors": errors}


if __name__ == "__main__":
    r = run(); print(json.dumps(r)); raise SystemExit(0 if r["passed"] else 1)
