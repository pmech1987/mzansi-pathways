#!/usr/bin/env python3
"""Gate 41: Verify 7-step interactive tutorial covers Settings, Modes, What-If, worked examples, and live demos."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def main() -> int:
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    errors = []
    for token in [
        'id="tut-progress-bar"',
        'id="tut-example"',
        'id="tut-demo-btn"',
        "function runTutorialDemo(",
        "6. Settings, Modes & Accessibility",
        "7. Cross-Device Sync & Shared-Device Privacy",
        "Worked Example:",
        "scan_demo",
        "whatif_demo",
        "settings_demo",
    ]:
        if token not in html:
            errors.append(f"Missing interactive tutorial feature: {token}")

    print(json.dumps({"gate": "41_verify_interactive_tutorial_demos_and_settings_guide", "passed": len(errors) == 0, "errors": errors}))
    return 0 if not errors else 1


if __name__ == "__main__":
    raise SystemExit(main())
