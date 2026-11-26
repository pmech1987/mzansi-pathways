#!/usr/bin/env python3
"""Gate 39: Verify civic trust bar, 2-way Results entry switcher, Settings data controls, and V14 docs."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def main() -> int:
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    errors = []
    for token in [
        'id="civic-trust-bar"',
        'id="mode-manual-btn"',
        'id="scan-results-btn"',
        'id="settings-open-sync"',
        'id="settings-open-tour"',
    ]:
        if token not in html:
            errors.append(f"Missing v20 civic UI element: {token}")

    s_start = html.find('id="settings-modal"')
    s_end = html.find('id="tutorial-modal"')
    if s_start == -1 or s_end == -1 or 'id="import-rules-file"' not in html[s_start:s_end]:
        errors.append("Custom rules importer (#import-rules-file) should live inside #settings-modal")

    doc = ROOT / "docs" / "CIVIC_DESIGN_AND_TRUST_STANDARD_V14.md"
    if not doc.exists() or len(doc.read_text(encoding="utf-8").strip()) < 200:
        errors.append("Missing or incomplete docs/CIVIC_DESIGN_AND_TRUST_STANDARD_V14.md")

    print(json.dumps({"gate": "39_verify_civic_ui_and_two_way_entry", "passed": len(errors) == 0, "errors": errors}))
    return 0 if not errors else 1


if __name__ == "__main__":
    raise SystemExit(main())
