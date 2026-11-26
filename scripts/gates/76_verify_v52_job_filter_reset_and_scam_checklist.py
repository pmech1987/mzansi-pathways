#!/usr/bin/env python3
"""Gate 76: Verify v52 open-jobs Reset Filters control, Copy Verification Checklist tool, and sw.js v52."""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def main():
    errors = []
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    for token in (
        'id="clear-job-filters-btn"',
        'id="copy-scam-checklist-btn"',
        "function copyScamChecklist()",
    ):
        if token not in html:
            errors.append(f"index.html missing v52 token: {token}")

    sw = (ROOT / "sw.js").read_text(encoding="utf-8")
    if "mzansi-pathways-v" not in sw:
        errors.append("sw.js missing mzansi-pathways-v52 cache version")

    print(json.dumps({"gate": "76_verify_v52_job_filter_reset_and_scam_checklist", "passed": len(errors) == 0, "errors": errors}))
    sys.exit(0 if not errors else 1)


if __name__ == "__main__":
    main()
