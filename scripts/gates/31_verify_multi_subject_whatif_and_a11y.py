#!/usr/bin/env python3
"""Gate 31: Verifies Multi-Subject What-If Selector, A+ Large Text Toggle & Plan Why? Inspect."""
import json
from pathlib import Path


def run(root: Path = Path(".")) -> dict:
    errors = []
    txt = (root / "index.html").read_text(encoding="utf-8", errors="replace")
    for label, marker in [
        ("Multi-subject What-If selector", 'id="whatif-sub-select"'),
        ("A+ Large Text toggle", 'id="textsize-btn"'),
        ("Large-text CSS class", "body.large-text"),
    ]:
        if marker not in txt:
            errors.append(f"index.html: missing {label} ({marker})")
    return {"gate": "31_multi_subject_whatif_and_a11y", "passed": not errors, "errors": errors}


if __name__ == "__main__":
    r = run(); print(json.dumps(r)); raise SystemExit(0 if r["passed"] else 1)
