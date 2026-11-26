#!/usr/bin/env python3
"""Gate 64: Verify All Routes type filter pills, Plan A/B/C submission progress tracker, and adversarial tamper-detection unit tests."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def main() -> int:
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    tests = (ROOT / "tests" / "test_pathways_engine.py").read_text(encoding="utf-8")
    errors = []

    for token in ['id="route-type-pills"', "data-route-filter=", "function getPlanSubmissionProgress("]:
        if token not in html:
            errors.append(f"index.html missing v44 feature: {token}")

    if "test_attestation_seal_rejects_tampered_file" not in tests:
        errors.append("tests/test_pathways_engine.py missing adversarial tamper-detection unit test")

    print(json.dumps({"gate": "64_verify_route_type_pills_plan_progress_and_tamper_tests", "passed": len(errors) == 0, "errors": errors}))
    return 0 if not errors else 1


if __name__ == "__main__":
    raise SystemExit(main())
