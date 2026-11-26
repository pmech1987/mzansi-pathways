#!/usr/bin/env python3
"""Gate 58: Verify on-device Job Flyer Photo Scanner, Local Town Finder, automated legal job fetcher, and refresh-open-jobs.yml."""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))
import fetch_legal_public_jobs as flpj


def main() -> int:
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    errors = []
    for token in [
        'id="job-flyer-scanner"',
        'id="flyer-image-input"',
        'id="flyer-canvas"',
        "function parseJobFlyerText(",
        'id="local-job-finder"',
        "savedOpenJobs",
    ]:
        if token not in html:
            errors.append(f"index.html missing v38 job flyer / local finder feature: {token}")

    wf = ROOT / ".github" / "workflows" / "refresh-open-jobs.yml"
    if not wf.exists() or "fetch_legal_public_jobs.py" not in wf.read_text(encoding="utf-8"):
        errors.append("Missing or invalid .github/workflows/refresh-open-jobs.yml")

    res = flpj.refresh_open_jobs(ROOT, offline=True)
    if res.get("openCount", 0) < 1:
        errors.append("fetch_legal_public_jobs.py failed offline community submission refresh")

    doc = ROOT / "docs" / "JOB_FLYER_SCANNER_AND_AUTO_FEEDS_V18.md"
    if not doc.exists() or len(doc.read_text(encoding="utf-8").strip()) < 200:
        errors.append("Missing or incomplete docs/JOB_FLYER_SCANNER_AND_AUTO_FEEDS_V18.md")

    print(json.dumps({"gate": "58_verify_job_flyer_scanner_and_auto_job_workflow", "passed": len(errors) == 0, "errors": errors}))
    return 0 if not errors else 1


if __name__ == "__main__":
    raise SystemExit(main())
