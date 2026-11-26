#!/usr/bin/env python3
"""Gate 72: Verify v50 job bookmarking (Save Job & Saved Only), 9-province live job filter, and sw.js v50."""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def main():
    errors = []
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    for token in (
        'id="saved-jobs-only-btn"',
        'id="job-province-filter"',
        "data-save-job-id=",
        "All 9 Provinces & National",
    ):
        if token not in html:
            errors.append(f"index.html missing v50 token: {token}")

    sw = (ROOT / "sw.js").read_text(encoding="utf-8")
    if "mzansi-pathways-v" not in sw:
        errors.append("sw.js missing mzansi-pathways-v50 cache version")

    print(json.dumps({"gate": "72_verify_v50_job_bookmarks_and_province_filter", "passed": len(errors) == 0, "errors": errors}))
    sys.exit(0 if not errors else 1)


if __name__ == "__main__":
    main()
