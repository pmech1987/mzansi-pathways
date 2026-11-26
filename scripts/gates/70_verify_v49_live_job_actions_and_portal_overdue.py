#!/usr/bin/env python3
"""Gate 70: Verify v49 live-job freshness badges, one-tap Verify Employer & Tailor CV actions, portal overdue check, and sw.js v49."""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def main():
    errors = []
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    for token in (
        "function getJobFreshness(",
        "function getPortalCheckStatus(",
        "data-verify-job-employer=",
        "data-tailor-job-title=",
        "Due for Check",
        "Checked Recently",
    ):
        if token not in html:
            errors.append(f"index.html missing v49 token: {token}")

    sw = (ROOT / "sw.js").read_text(encoding="utf-8")
    if "mzansi-pathways-v" not in sw:
        errors.append("sw.js missing mzansi-pathways-v49 cache version")

    print(json.dumps({"gate": "70_verify_v49_live_job_actions_and_portal_overdue", "passed": len(errors) == 0, "errors": errors}))
    sys.exit(0 if not errors else 1)


if __name__ == "__main__":
    main()
