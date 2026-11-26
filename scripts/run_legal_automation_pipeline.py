#!/usr/bin/env python3
"""
scripts/run_legal_automation_pipeline.py — Master Legal Daily Automation Orchestrator
-------------------------------------------------------------------------------------
Runs automatically on GitHub Actions every morning (06:00 UTC / 08:00 SAST) with ZERO
illegal HTML scraping:
  1. Refreshes legal open jobs (Greenhouse, Lever, SmartRecruiters, Workday CXS,
     optional Adzuna SA API, and direct opt-in community submissions).
  2. Refreshes official 257 SA municipalities from National Treasury's open API
     (when online, with circuit-breaker protection).
  3. Runs automated SAST deadline & academic-cycle rollover audit (data/automation_status.json).
"""
from __future__ import annotations

import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from fetch_legal_public_jobs import refresh_open_jobs
from fetch_sa_municipalities import fetch_municipalities
from audit_and_rollover_deadlines import run_deadline_audit


def run_all(root: Path, offline: bool = False) -> dict:
    jobs_res = refresh_open_jobs(root, offline=offline)
    muni_res = {"status": "offline_skipped", "count": 0}
    if not offline:
        try:
            muni_res = fetch_municipalities(root / "data" / "sa_municipalities_live.json", offline=False)
        except Exception as exc:
            muni_res = {"status": "error_preserved_cache", "error": str(exc)}
    deadline_res = run_deadline_audit(root)
    return {
        "offline": offline,
        "openJobsCount": jobs_res.get("openCount", 0),
        "municipalities": muni_res,
        "deadlinesChecked": deadline_res.get("eventsChecked", 0),
    }


if __name__ == "__main__":
    offline = os.environ.get("MZANSI_OFFLINE", "0") == "1"
    report = run_all(ROOT, offline=offline)
    print(json.dumps(report, indent=2))
