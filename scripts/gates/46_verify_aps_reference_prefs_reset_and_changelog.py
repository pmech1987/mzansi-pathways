#!/usr/bin/env python3
"""Gate 46: Verify NSC APS scale drawer, Settings Reset Preferences, and generated CHANGELOG.md."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def main() -> int:
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    errors = []
    for token in ['id="aps-scale-details"', 'id="reset-prefs-btn"', "resetDisplayPreferences("]:
        if token not in html:
            errors.append(f"index.html missing v26 feature: {token}")

    cl = ROOT / "CHANGELOG.md"
    if not cl.exists() or len(cl.read_text(encoding="utf-8").strip()) < 150:
        errors.append("Missing or incomplete CHANGELOG.md")
    if not (ROOT / "scripts" / "generate_changelog.py").exists():
        errors.append("Missing scripts/generate_changelog.py")

    print(json.dumps({"gate": "46_verify_aps_reference_prefs_reset_and_changelog", "passed": len(errors) == 0, "errors": errors}))
    return 0 if not errors else 1


if __name__ == "__main__":
    raise SystemExit(main())
