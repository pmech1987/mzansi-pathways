#!/usr/bin/env python3
"""Gate 30: Verifies High Contrast mode, Career-to-Evidence Skills Bridge & Route Sorting."""
import json
from pathlib import Path


def run(root: Path = Path(".")) -> dict:
    errors = []
    txt = (root / "index.html").read_text(encoding="utf-8", errors="replace")
    for label, marker in [
        ("High Contrast accessibility mode", "high-contrast"),
        ("High Contrast button", 'id="hc-btn"'),
        ("Route sort selector", 'id="route-sort"'),
        ("Career-to-Evidence live gap bridge", "Your Evidence vs. Career Skills"),
    ]:
        if marker not in txt:
            errors.append(f"index.html: missing {label} ({marker})")
    return {"gate": "30_career_gap_and_high_contrast", "passed": not errors, "errors": errors}


if __name__ == "__main__":
    r = run(); print(json.dumps(r)); raise SystemExit(0 if r["passed"] else 1)
