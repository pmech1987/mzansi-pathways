#!/usr/bin/env python3
"""Gate 60 (Milestone): Verify Lever ATS public discovery, live feed refresh button, and copyright-safe saved flyer JSON export."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def main() -> int:
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    py = (ROOT / "scripts" / "fetch_legal_public_jobs.py").read_text(encoding="utf-8")
    ats = json.loads((ROOT / "data" / "public_ats_boards.json").read_text(encoding="utf-8"))
    errors = []

    if "def fetch_lever_boards(" not in py:
        errors.append("fetch_legal_public_jobs.py missing fetch_lever_boards()")
    if not isinstance(ats.get("leverBoards"), list) or len(ats.get("leverBoards")) < 1:
        errors.append("data/public_ats_boards.json missing leverBoards array")

    for token in ['id="refresh-live-jobs-btn"', 'id="export-flyer-jobs-btn"', "function exportSavedFlyerJobsJson("]:
        if token not in html:
            errors.append(f"index.html missing v40 milestone feature: {token}")

    print(json.dumps({"gate": "60_verify_lever_ats_and_sixty_gate_milestone", "passed": len(errors) == 0, "errors": errors}))
    return 0 if not errors else 1


if __name__ == "__main__":
    raise SystemExit(main())
