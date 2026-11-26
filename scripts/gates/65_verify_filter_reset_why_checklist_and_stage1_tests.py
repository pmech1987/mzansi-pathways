#!/usr/bin/env python3
"""Gate 65: Verify All Routes Clear-Filters failsafe, Pre-Application Verification Checklist in Why? modal, and Stage 1 adversarial tests."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def main() -> int:
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    tests = (ROOT / "tests" / "test_pathways_engine.py").read_text(encoding="utf-8")
    errors = []

    for token in ['id="clear-route-filters-btn"', "Pre-Application Verification Checklist"]:
        if token not in html:
            errors.append(f"index.html missing v45 feature: {token}")

    if "test_stage1_authenticate_gate_blocks_eval_and_tamper" not in tests:
        errors.append("tests/test_pathways_engine.py missing Stage 1 adversarial gate test")

    print(json.dumps({"gate": "65_verify_filter_reset_why_checklist_and_stage1_tests", "passed": len(errors) == 0, "errors": errors}))
    return 0 if not errors else 1


if __name__ == "__main__":
    raise SystemExit(main())
