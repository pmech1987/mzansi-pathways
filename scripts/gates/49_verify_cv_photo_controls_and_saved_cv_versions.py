#!/usr/bin/env python3
"""Gate 49: Verify auth-modal is in real HTML DOM before <script>, CV photo rotate/contrast, saved CV versions, and qualifications extraction."""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))
import cv_importer as cvi


def main() -> int:
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    errors = []

    auth_pos = html.find('id="auth-modal"')
    script_pos = html.find("<script>")
    if auth_pos == -1 or script_pos == -1 or auth_pos > script_pos:
        errors.append("CRITICAL: #auth-modal must live in HTML DOM before <script> (never inside JS template string)")

    for token in [
        'id="cv-rotate-btn"',
        'id="cv-contrast-btn"',
        'id="save-cv-snapshot-btn"',
        "savedCvs",
        "data-load-cv",
        "contactBits",
    ]:
        if token not in html:
            errors.append(f"index.html missing v29 CV feature: {token}")

    res = cvi.parse_previous_cv_text("National Senior Certificate (Matric) 2025\nHigher Certificate in IT (NQF 5)")
    if len(res.get("qualifications") or []) < 2:
        errors.append("cv_importer.py failed to extract South African qualifications")

    print(json.dumps({"gate": "49_verify_cv_photo_controls_and_saved_cv_versions", "passed": len(errors) == 0, "errors": errors}))
    return 0 if not errors else 1


if __name__ == "__main__":
    raise SystemExit(main())
