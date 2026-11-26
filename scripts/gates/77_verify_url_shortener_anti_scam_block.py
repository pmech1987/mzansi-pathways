#!/usr/bin/env python3
"""Gate 77: Verify URL shortener anti-scam blocking in ingest_free_open_jobs.py."""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))
from ingest_free_open_jobs import filter_legal_open_jobs, BLOCKED_URL_SHORTENERS


def main():
    errors = []
    for sd in ("bit.ly", "tinyurl.com", "t.co", "rb.gy", "shorturl.at"):
        if sd not in BLOCKED_URL_SHORTENERS:
            errors.append(f"Missing blocked URL shortener: {sd}")

    sample = [
        {"title": "Hidden Redirect Job", "employer": "Unknown", "officialUrl": "https://bit.ly/fakejob123", "closingDate": "2026-12-20"},
        {"title": "Verified Gov Post", "employer": "DPSA", "officialUrl": "https://www.gov.za/jobs/77", "closingDate": "2026-12-20"},
    ]
    res = filter_legal_open_jobs(sample, today_iso="2026-11-26")
    if res["openCount"] != 1 or len(res["rejected"]) != 1:
        errors.append(f"Expected 1 accepted & 1 rejected shortener, got openCount={res['openCount']} rejected={len(res['rejected'])}")

    print(json.dumps({"gate": "77_verify_url_shortener_anti_scam_block", "passed": len(errors) == 0, "errors": errors}))
    sys.exit(0 if not errors else 1)


if __name__ == "__main__":
    main()
