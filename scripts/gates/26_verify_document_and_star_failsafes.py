#!/usr/bin/env python3
"""Gate 26: Verifies Document Readiness Checklist, Debounced Route Search & Honest STAR Interview Grader."""
import json
from pathlib import Path


def run(root: Path = Path(".")) -> dict:
    errors = []
    txt = (root / "index.html").read_text(encoding="utf-8", errors="replace")
    for label, marker in [
        ("Document Readiness Checklist", "docChecklist"),
        ("Debounced All-Routes Search", 'id="route-search"'),
        ("Honest STAR Interview Grader", "function evaluateStarAnswer("),
        ("Home Language / LO subject flags", "data-toggle-hl="),
    ]:
        if marker not in txt:
            errors.append(f"index.html: missing {label} ({marker})")
    return {"gate": "26_document_and_star_failsafes", "passed": not errors, "errors": errors}


if __name__ == "__main__":
    r = run(); print(json.dumps(r)); raise SystemExit(0 if r["passed"] else 1)
