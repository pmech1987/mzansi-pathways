#!/usr/bin/env python3
"""Gate 79: Verify POPIA PII scrubbing of personal SA cell numbers and personal webmail in public open-job feeds."""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))
from ingest_free_open_jobs import filter_legal_open_jobs


def main():
    errors = []
    sample = [
        {
            "title": "Junior Technician call 082 555 1234 or hr.person@gmail.com",
            "employer": "Civic Tech +27 72 123 4567",
            "officialUrl": "https://example.co.za/jobs/79",
            "closingDate": "2026-12-20",
        }
    ]
    res = filter_legal_open_jobs(sample, today_iso="2026-11-26")
    if res["openCount"] != 1:
        errors.append(f"Expected 1 scrubbed job, got {res['openCount']}")
    else:
        job = res["accepted"][0]
        if "082 555 1234" in job["title"] or "gmail.com" in job["title"]:
            errors.append(f"PII leaked in job title: {job['title']}")
        if "72 123 4567" in job["employer"]:
            errors.append(f"PII leaked in employer: {job['employer']}")

    print(json.dumps({"gate": "79_verify_popia_pii_scrub_in_job_feed", "passed": len(errors) == 0, "errors": errors}))
    sys.exit(0 if not errors else 1)


if __name__ == "__main__":
    main()
