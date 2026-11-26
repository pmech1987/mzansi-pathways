#!/usr/bin/env python3
"""Gate 66: Verify CV readiness score indicator, 1-tap official register share button, and run_full_audit.py."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def main() -> int:
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    errors = []
    for token in ["function getCvReadinessScore(", 'id="copy-registers-btn"']:
        if token not in html:
            errors.append(f"index.html missing v46 feature: {token}")
    if not (ROOT / "scripts" / "run_full_audit.py").exists():
        errors.append("Missing scripts/run_full_audit.py")
    print(json.dumps({"gate": "66_verify_cv_readiness_register_share_and_full_audit", "passed": len(errors) == 0, "errors": errors}))
    return 0 if not errors else 1


if __name__ == "__main__":
    raise SystemExit(main())
