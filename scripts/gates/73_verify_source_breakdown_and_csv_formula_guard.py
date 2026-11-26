#!/usr/bin/env python3
"""Gate 73: Verify legal feed bySourceType breakdown and formula-safe open-jobs CSV export."""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))
from ingest_free_open_jobs import filter_legal_open_jobs


def main():
    errors = []
    sample = [
        {"title": "Admin Clerk", "employer": "Provincial Dept", "sourceType": "dpsa_circular", "officialUrl": "https://www.gov.za/jobs/11", "closingDate": "2026-12-20"},
        {"title": "Support Tech", "employer": "Local ISP", "sourceType": "direct_employer", "officialUrl": "https://example.co.za/jobs/22", "closingDate": "2026-12-20"},
    ]
    res = filter_legal_open_jobs(sample, today_iso="2026-11-26")
    bs = res.get("bySourceType") or {}
    if bs.get("dpsa_circular") != 1 or bs.get("direct_employer") != 1:
        errors.append(f"Unexpected bySourceType breakdown: {bs}")

    html = (ROOT / "index.html").read_text(encoding="utf-8")
    if "function exportOpenJobsCsv()" not in html or ".map(csvSafeCell).join(',')" not in html:
        errors.append("index.html missing formula-safe exportOpenJobsCsv()")

    print(json.dumps({"gate": "73_verify_source_breakdown_and_csv_formula_guard", "passed": len(errors) == 0, "errors": errors}))
    sys.exit(0 if not errors else 1)


if __name__ == "__main__":
    main()
