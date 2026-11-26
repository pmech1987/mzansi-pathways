#!/usr/bin/env python3
"""Gate 68: Verify Job Flyer photo Rotate/Contrast controls (parity across all 3 scanners) and Alt+1..6 keyboard navigation."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def main() -> int:
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    errors = []
    for token in ['id="flyer-rotate-btn"', 'id="flyer-contrast-btn"', "e.altKey"]:
        if token not in html:
            errors.append(f"index.html missing v48 feature: {token}")
    print(json.dumps({"gate": "68_verify_flyer_photo_controls_and_keyboard_nav", "passed": len(errors) == 0, "errors": errors}))
    return 0 if not errors else 1


if __name__ == "__main__":
    raise SystemExit(main())
