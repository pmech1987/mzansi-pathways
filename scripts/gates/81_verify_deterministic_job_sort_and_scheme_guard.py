#!/usr/bin/env python3
"""Gate 81: Verify deterministic closing-date sorting and non-HTTPS/javascript scheme blocking in ingest_free_open_jobs.py."""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))
from ingest_free_open_jobs import filter_legal_open_jobs


def main():
    errors = []
    sample = [
        {"title": "Rolling Role", "employer": "Civic A", "officialUrl": "https://www.gov.za/jobs/r1", "closingDate": "Open / Rolling"},
        {"title": "Later Role", "employer": "Civic B", "officialUrl": "https://www.gov.za/jobs/l1", "closingDate": "2026-12-25"},
        {"title": "Urgent Role", "employer": "Civic C", "officialUrl": "https://www.gov.za/jobs/u1", "closingDate": "2026-11-28"},
        {"title": "Insecure HTTP", "employer": "Bad", "officialUrl": "http://example.co.za/job", "closingDate": "2026-12-20"},
        {"title": "XSS Scheme", "employer": "Bad2", "officialUrl": "javascript:alert(1)", "closingDate": "2026-12-20"},
    ]
    res = filter_legal_open_jobs(sample, today_iso="2026-11-26")
    titles = [j["title"] for j in res["accepted"]]
    if titles != ["Urgent Role", "Later Role", "Rolling Role"]:
        errors.append(f"Unexpected deterministic job sort order: {titles}")
    if len(res["rejected"]) != 2:
        errors.append(f"Expected 2 unsafe-scheme rejections, got {len(res['rejected'])}")

    print(json.dumps({"gate": "81_verify_deterministic_job_sort_and_scheme_guard", "passed": len(errors) == 0, "errors": errors}))
    sys.exit(0 if not errors else 1)


if __name__ == "__main__":
    main()
