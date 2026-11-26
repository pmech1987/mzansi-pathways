#!/usr/bin/env python3
"""Gate 59: Verify automatic live open-jobs loader, keyword/skill auto-match search, and public Greenhouse ATS board config."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def main() -> int:
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    py = (ROOT / "scripts" / "fetch_legal_public_jobs.py").read_text(encoding="utf-8")
    errors = []

    for token in [
        "async function loadLiveOpenJobs(",
        "function scoreJobMatch(",
        'id="auto-job-search-input"',
        'id="auto-job-match-btn"',
        "data/open_jobs_live.json",
    ]:
        if token not in html:
            errors.append(f"index.html missing v39 automatic job search feature: {token}")

    if "def fetch_greenhouse_boards(" not in py:
        errors.append("fetch_legal_public_jobs.py missing fetch_greenhouse_boards()")

    ats = ROOT / "data" / "public_ats_boards.json"
    if not ats.exists() or len((json.loads(ats.read_text(encoding="utf-8")).get("greenhouseBoards") or [])) < 1:
        errors.append("Missing or empty data/public_ats_boards.json")

    print(json.dumps({"gate": "59_verify_auto_job_search_and_live_feed_loader", "passed": len(errors) == 0, "errors": errors}))
    return 0 if not errors else 1


if __name__ == "__main__":
    raise SystemExit(main())
