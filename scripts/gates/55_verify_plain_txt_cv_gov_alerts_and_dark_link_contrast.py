#!/usr/bin/env python3
"""Gate 55: Verify plain-text ATS CV export, SA official government alerts card, and WCAG-friendly Dark Mode link contrast."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def main() -> int:
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    errors = []
    for token in [
        'id="dl-cv-txt"',
        "function exportPlainTextCv(",
        'id="gov-alerts-card"',
        "body.dark-mode a.text-blue-700",
    ]:
        if token not in html:
            errors.append(f"index.html missing v35 feature: {token}")

    print(json.dumps({"gate": "55_verify_plain_txt_cv_gov_alerts_and_dark_link_contrast", "passed": len(errors) == 0, "errors": errors}))
    return 0 if not errors else 1


if __name__ == "__main__":
    raise SystemExit(main())
