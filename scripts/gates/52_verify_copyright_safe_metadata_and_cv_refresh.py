#!/usr/bin/env python3
"""Gate 52: Verify copyright-safe metadata-only job ingestion, downloadable employer JSON template, and 1-tap CV freshness refresh."""
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
        'id="dl-jobs-template-btn"',
        'id="cv-mark-current-btn"',
        "careers24.com",
        "indeed.com",
        "mzansi_open_jobs_template.json",
    ]:
        if token not in html:
            errors.append(f"index.html missing v32 copyright-safe/CV-refresh feature: {token}")

    res = ifoj.filter_legal_open_jobs([
        {"title": "Legal Clerk", "employer": "DPSA", "sourceType": "dpsa_circular", "officialUrl": "https://www.gov.za/about-government/government-jobs", "closingDate": "2026-12-20", "description": "Long text should not be republished"},
        {"title": "Blocked Board", "employer": "Agg", "officialUrl": "https://www.careers24.com/jobs/1", "closingDate": "2026-12-20"},
    ], today_iso="2026-11-26")
    if res["openCount"] != 1 or "description" in res["accepted"][0]:
        errors.append(f"ingest_free_open_jobs must strip copied description prose and block careers24.com: {res}")

    print(json.dumps({"gate": "52_verify_copyright_safe_metadata_and_cv_refresh", "passed": len(errors) == 0, "errors": errors}))
    return 0 if not errors else 1


if __name__ == "__main__":
    raise SystemExit(main())
