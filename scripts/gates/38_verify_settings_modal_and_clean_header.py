#!/usr/bin/env python3
"""Gate 38: Verify Settings modal houses display/region/accessibility controls and keeps header uncluttered."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def main() -> int:
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    errors = []
    for token in ['id="settings-btn"', 'id="settings-modal"', 'id="close-settings"', 'id="settings-done-btn"']:
        if token not in html:
            errors.append(f"Missing Settings modal element: {token}")

    start = html.find('id="settings-modal"')
    end = html.find('id="tutorial-modal"')
    if start == -1 or end == -1 or start >= end:
        errors.append("Settings modal placement check failed")
    else:
        seg = html[start:end]
        for cid in ['id="prov-select"', 'id="lang-select"', 'id="parent-btn"', 'id="easy-btn"', 'id="textsize-btn"', 'id="hc-btn"', 'id="theme-btn"']:
            if cid not in seg:
                errors.append(f"Control {cid} should be inside #settings-modal")

    print(json.dumps({"gate": "38_verify_settings_modal_and_clean_header", "passed": len(errors) == 0, "errors": errors}))
    return 0 if not errors else 1


if __name__ == "__main__":
    raise SystemExit(main())
