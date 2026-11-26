#!/usr/bin/env python3
"""Gate 50: Verify printed CV zoom, inline editable CV import fields, JS qualifications extraction, Word CV qualifications section, and savedCvs state guard."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def main() -> int:
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    errors = []
    for token in [
        'id="cv-zoom-btn"',
        'id="cv-imp-name"',
        'id="cv-imp-phone"',
        'id="cv-imp-email"',
        "cvQualifications",
        "qualifications",
        "Array.isArray(s.savedCvs)",
    ]:
        if token not in html:
            errors.append(f"index.html missing v30 milestone feature: {token}")

    print(json.dumps({"gate": "50_verify_cv_qualifications_zoom_and_milestone_integrity", "passed": len(errors) == 0, "errors": errors}))
    return 0 if not errors else 1


if __name__ == "__main__":
    raise SystemExit(main())
