#!/usr/bin/env python3
"""Gate 34: Verify custom rules validator failsafe, deadline badges, Grade 9 reverse planner, and V12 docs."""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def main() -> int:
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    errors = []
    for token in [
        "getDeadlineBadge(",
        "validateImportedProgrammes(",
        'id="import-rules-file"',
        "data-g9-goal=",
    ]:
        if token not in html:
            errors.append(f"Missing v16 planner/failsafe feature in index.html: {token}")

    doc = ROOT / "docs" / "IMAGE_TO_RESULT_AND_FAILSAFES_V12.md"
    if not doc.exists() or len(doc.read_text(encoding="utf-8").strip()) < 200:
        errors.append("Missing or incomplete docs/IMAGE_TO_RESULT_AND_FAILSAFES_V12.md")

    out = {"gate": "34_verify_custom_rules_validator_and_deadlines", "passed": len(errors) == 0, "errors": errors}
    print(json.dumps(out))
    return 0 if not errors else 1


if __name__ == "__main__":
    raise SystemExit(main())
