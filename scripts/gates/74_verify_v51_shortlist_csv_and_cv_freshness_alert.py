#!/usr/bin/env python3
"""Gate 74: Verify v51 shortlist CSV button, CV freshness helper, and sw.js v51."""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def main():
    errors = []
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    for token in (
        'id="export-saved-jobs-csv-btn"',
        "function getCvFreshnessInfo(",
        "function exportOpenJobsCsv()",
    ):
        if token not in html:
            errors.append(f"index.html missing v51 token: {token}")

    sw = (ROOT / "sw.js").read_text(encoding="utf-8")
    if "mzansi-pathways-v" not in sw:
        errors.append("sw.js missing mzansi-pathways-v51 cache version")

    print(json.dumps({"gate": "74_verify_v51_shortlist_csv_and_cv_freshness_alert", "passed": len(errors) == 0, "errors": errors}))
    sys.exit(0 if not errors else 1)


if __name__ == "__main__":
    main()
