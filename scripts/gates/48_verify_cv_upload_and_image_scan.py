#!/usr/bin/env python3
"""Gate 48: Verify on-device previous CV file upload, printed CV photo scan, parser, and V15 docs."""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))
import cv_importer as cvi


def main() -> int:
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    errors = []
    for token in [
        'id="cv-import-toggle-btn"',
        'id="cv-import-panel"',
        'id="cv-file-input"',
        'id="cv-image-input"',
        'id="cv-canvas"',
        'id="cv-raw-text"',
        'id="cv-import-apply-btn"',
        "function parsePreviousCvText(",
    ]:
        if token not in html:
            errors.append(f"index.html missing previous CV import/scan feature: {token}")

    sample = cvi.parse_previous_cv_text("Sipho Ndlovu\n082 555 0194\nsipho@example.co.za\nSkills: Excel, Windows\n- Repaired Windows printers for school office.")
    if sample.get("email") != "sipho@example.co.za" or not sample.get("needsConfirmation"):
        errors.append("cv_importer.py failed deterministic extraction check")

    doc = ROOT / "docs" / "CV_IMPORT_AND_SCANNER_V15.md"
    if not doc.exists() or len(doc.read_text(encoding="utf-8").strip()) < 200:
        errors.append("Missing or incomplete docs/CV_IMPORT_AND_SCANNER_V15.md")

    print(json.dumps({"gate": "48_verify_cv_upload_and_image_scan", "passed": len(errors) == 0, "errors": errors}))
    return 0 if not errors else 1


if __name__ == "__main__":
    raise SystemExit(main())
