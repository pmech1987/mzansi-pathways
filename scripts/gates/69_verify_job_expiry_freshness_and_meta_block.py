#!/usr/bin/env python3
"""Gate 69: Verify job expiry/freshness metadata, stillOpenAfterWeek support, and Meta/WhatsApp scrape blocking."""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))
from ingest_free_open_jobs import filter_legal_open_jobs, BLOCKED_SCRAPE_DOMAINS


def main():
    errors = []
    for dom in ("facebook.com", "fb.com", "whatsapp.com", "chat.whatsapp.com"):
        if dom not in BLOCKED_SCRAPE_DOMAINS:
            errors.append(f"Missing Meta/WhatsApp blocked domain: {dom}")

    sample = [
        {"title": "Still Open Technician", "employer": "Mpumalanga Dept", "officialUrl": "https://www.gov.za/jobs/1", "postedDate": "2026-11-10", "closingDate": "2026-12-10"},
        {"title": "Closing Soon Clerk", "employer": "Local Co", "officialUrl": "https://example.co.za/jobs/2", "closingDate": "2026-11-28"},
        {"title": "Expired Role", "employer": "Old Co", "officialUrl": "https://example.co.za/jobs/3", "closingDate": "2026-11-01"},
        {"title": "FB Scraped Role", "employer": "Page", "officialUrl": "https://www.facebook.com/jobs/1", "closingDate": "2026-12-20"},
        {"title": "WA Scraped Role", "employer": "Channel", "officialUrl": "https://whatsapp.com/channel/abc", "closingDate": "2026-12-20"},
    ]
    res = filter_legal_open_jobs(sample, today_iso="2026-11-26")
    if res["openCount"] != 2:
        errors.append(f"Expected 2 accepted open jobs, got {res['openCount']}")
    else:
        by_title = {j["title"]: j for j in res["accepted"]}
        first = by_title.get("Still Open Technician", {})
        if not first.get("stillOpenAfterWeek"):
            errors.append("Expected stillOpenAfterWeek=True for 16-day-old still-open job")
        if first.get("freshnessStatus") != "open" or first.get("daysRemaining") != 14:
            errors.append(f"Unexpected freshness metadata: {first}")
        second = by_title.get("Closing Soon Clerk", {})
        if second.get("freshnessStatus") != "closing_soon" or second.get("daysRemaining") != 2:
            errors.append(f"Unexpected closing_soon metadata: {second}")
    if len(res["rejected"]) != 3:
        errors.append(f"Expected 3 rejected jobs (expired + FB + WA), got {len(res['rejected'])}")

    print(json.dumps({"gate": "69_verify_job_expiry_freshness_and_meta_block", "passed": len(errors) == 0, "errors": errors}))
    sys.exit(0 if not errors else 1)


if __name__ == "__main__":
    main()
