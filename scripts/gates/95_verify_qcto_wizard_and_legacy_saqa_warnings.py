#!/usr/bin/env python3
"""Gate 95: Verify QCTO provider verification wizard, legacy SAQA 24293/78964 warnings, and current occupational SAQA IDs."""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def main():
    errors = []
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    for token in (
        'id="qcto-verify-wizard"',
        "SAQA 24293",
        "SAQA 78964",
        "SAQA 101408",
        "SAQA 119438",
        "SAQA 122661",
        "https://allqs.saqa.org.za/",
    ):
        if token not in html:
            errors.append(f"index.html missing QCTO/SAQA verification token: {token}")

    print(json.dumps({"gate": "95_verify_qcto_wizard_and_legacy_saqa_warnings", "passed": len(errors) == 0, "errors": errors}))
    sys.exit(0 if not errors else 1)


if __name__ == "__main__":
    main()
