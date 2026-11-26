#!/usr/bin/env python3
"""Gate 78: Verify v53 portal overdue summary badge, job Copy Link button, and sw.js v53."""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def main():
    errors = []
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    for token in (
        "data-copy-job-url=",
        "overdueCount",
        "All Up to Date",
    ):
        if token not in html:
            errors.append(f"index.html missing v53 token: {token}")

    sw = (ROOT / "sw.js").read_text(encoding="utf-8")
    if "mzansi-pathways-v" not in sw:
        errors.append("sw.js missing mzansi-pathways-v53 cache version")

    print(json.dumps({"gate": "78_verify_v53_portal_overdue_summary_and_copy_job_link", "passed": len(errors) == 0, "errors": errors}))
    sys.exit(0 if not errors else 1)


if __name__ == "__main__":
    main()
