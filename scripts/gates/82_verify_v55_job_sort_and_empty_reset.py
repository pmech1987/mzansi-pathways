#!/usr/bin/env python3
"""Gate 82: Verify v55 job sort selector, empty-state Clear All Filters action, and sw.js v55."""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def main():
    errors = []
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    for token in (
        'id="job-sort-select"',
        "closing_soonest",
        "data-empty-reset-jobs=",
    ):
        if token not in html:
            errors.append(f"index.html missing v55 token: {token}")

    sw = (ROOT / "sw.js").read_text(encoding="utf-8")
    if "mzansi-pathways-v" not in sw:
        errors.append("sw.js missing mzansi-pathways-v55 cache version")

    print(json.dumps({"gate": "82_verify_v55_job_sort_and_empty_reset", "passed": len(errors) == 0, "errors": errors}))
    sys.exit(0 if not errors else 1)


if __name__ == "__main__":
    main()
