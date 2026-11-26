#!/usr/bin/env python3
"""Gate 37: Verify skippable 4-step interactive onboarding tutorial and replay trigger."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def main() -> int:
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    errors = []
    for token in [
        'id="tutorial-modal"',
        'id="tut-skip-btn"',
        'id="tut-next-btn"',
        'id="tut-prev-btn"',
        'id="tut-try-btn"',
        "TUTORIAL_STEPS",
        "tutorialSeen",
        "openTutorial(",
        "closeTutorial(",
    ]:
        if token not in html:
            errors.append(f"Missing skippable tutorial element: {token}")

    print(json.dumps({"gate": "37_verify_skippable_onboarding_tutorial", "passed": len(errors) == 0, "errors": errors}))
    return 0 if not errors else 1


if __name__ == "__main__":
    raise SystemExit(main())
