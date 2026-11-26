#!/usr/bin/env python3
"""Gate 71: Verify deterministic job deduplication in ingest_free_open_jobs.py and official SA gov portals schema."""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))
from ingest_free_open_jobs import filter_legal_open_jobs


def main():
    errors = []
    dup_sample = [
        {"title": "Junior Technician", "employer": "Civic Dept", "officialUrl": "https://www.gov.za/jobs/100", "closingDate": "2026-12-20"},
        {"title": "Junior Technician", "employer": "Civic Dept", "officialUrl": "https://www.gov.za/jobs/100/", "closingDate": "2026-12-20"},
    ]
    res = filter_legal_open_jobs(dup_sample, today_iso="2026-11-26")
    if res["openCount"] != 1 or len(res["rejected"]) != 1:
        errors.append(f"Expected deduplication to keep 1 and reject 1, got openCount={res['openCount']} rejected={len(res['rejected'])}")

    portals_file = ROOT / "data" / "sa_gov_portals.json"
    if not portals_file.exists():
        errors.append("Missing data/sa_gov_portals.json")
    else:
        pdata = json.loads(portals_file.read_text(encoding="utf-8"))
        if not pdata.get("portals"):
            errors.append("data/sa_gov_portals.json has no portals")

    print(json.dumps({"gate": "71_verify_job_deduplication_and_gov_portals", "passed": len(errors) == 0, "errors": errors}))
    sys.exit(0 if not errors else 1)


if __name__ == "__main__":
    main()
