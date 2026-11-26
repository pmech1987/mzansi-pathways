#!/usr/bin/env python3
"""Gate 35: Verify human check-in, readiness ring, family talk script, and V13 documentation."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def main() -> int:
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    errors = []
    for token in [
        "getHumanCheckIn(",
        "getReadinessRing(",
        "buildFamilyTalkScript(",
        "data-mood=",
        'id="copy-family-talk-btn"',
        'id="speak-plan-btn"',
    ]:
        if token not in html:
            errors.append(f"Missing v17 human-first feature: {token}")

    doc = ROOT / "docs" / "HUMAN_EXPERIENCE_AND_ACCESSIBILITY_V13.md"
    if not doc.exists() or len(doc.read_text(encoding="utf-8").strip()) < 200:
        errors.append("Missing or incomplete docs/HUMAN_EXPERIENCE_AND_ACCESSIBILITY_V13.md")

    print(json.dumps({"gate": "35_verify_human_checkin_and_family_script", "passed": len(errors) == 0, "errors": errors}))
    return 0 if not errors else 1


if __name__ == "__main__":
    raise SystemExit(main())
