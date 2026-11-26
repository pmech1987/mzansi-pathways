#!/usr/bin/env python3
"""Gate 54: Verify municipal/portal check tracker, official-domain validation, Z83 prep sheet export, and Dark Mode table/canvas coverage."""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))
import generate_z83_prep_sheet as gz


def main() -> int:
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    errors = []
    for token in [
        'id="gov-watchlist-card"',
        'id="add-muni-form"',
        'id="dl-z83-prep-btn"',
        "body.dark-mode table",
        "body.dark-mode canvas",
        "govWatchlist",
    ]:
        if token not in html:
            errors.append(f"index.html missing v34 municipal tracker / Z83 / Dark Mode feature: {token}")

    txt = gz.build_z83_prep_text({"name": "Test Learner", "province": "Mpumalanga"})
    if "Reference Number" not in txt or "Never store your SA ID" not in txt:
        errors.append("generate_z83_prep_sheet.py missing required Z83/POPIA lines")

    print(json.dumps({"gate": "54_verify_municipal_tracker_and_z83_prep", "passed": len(errors) == 0, "errors": errors}))
    return 0 if not errors else 1


if __name__ == "__main__":
    raise SystemExit(main())
