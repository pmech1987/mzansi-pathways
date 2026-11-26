#!/usr/bin/env python3
"""Gate 51: Verify first-time Matric CV starter, CV freshness tracker, legal free open-jobs directory/importer, and V16 docs."""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))
import ingest_free_open_jobs as ifoj


def main() -> int:
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    errors = []
    for token in [
        'id="matric-starter-btn"',
        "function getCvFreshnessStatus(",
        'id="import-jobs-json-input"',
        'id="legal-free-jobs-card"',
        "filterLegalOpenJobs(",
    ]:
        if token not in html:
            errors.append(f"index.html missing v31 feature: {token}")

    res = ifoj.filter_legal_open_jobs([
        {"title": "Open Clerk", "employer": "DPSA", "officialUrl": "https://www.gov.za/about-government/government-jobs", "closingDate": "2026-12-20"},
        {"title": "Expired Clerk", "employer": "Old", "officialUrl": "https://example.co.za/x", "closingDate": "2025-01-01"},
        {"title": "Scraped", "employer": "Agg", "officialUrl": "https://www.graduates24.com/x", "closingDate": "2026-12-20"},
    ], today_iso="2026-11-26")
    if res["openCount"] != 1 or len(res["rejected"]) != 2:
        errors.append(f"ingest_free_open_jobs failed filtering check: {res}")

    doc = ROOT / "docs" / "FREE_LEGAL_JOBS_AND_MATRIC_CV_GUIDE_V16.md"
    if not doc.exists() or len(doc.read_text(encoding="utf-8").strip()) < 250:
        errors.append("Missing or incomplete docs/FREE_LEGAL_JOBS_AND_MATRIC_CV_GUIDE_V16.md")

    print(json.dumps({"gate": "51_verify_matric_cv_starter_and_legal_job_ingestor", "passed": len(errors) == 0, "errors": errors}))
    return 0 if not errors else 1


if __name__ == "__main__":
    raise SystemExit(main())
