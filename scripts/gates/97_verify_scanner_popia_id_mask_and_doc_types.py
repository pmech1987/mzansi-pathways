#!/usr/bin/env python3
"""Gate 97: Behaviour verification for POPIA 13-digit SA ID scrubbing in statement_parser.py and scanner doc-type/confirm controls."""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))
from statement_parser import parse_statement_text


def main():
    errors = []
    parsed = parse_statement_text("ID Number: 0501015800084\nMathematics 68%\nEnglish Home Language 64%")
    blob = json.dumps(parsed)
    if "0501015800084" in blob:
        errors.append("POPIA violation: 13-digit SA ID number leaked into parsed statement output")
    if len(parsed.get("subjects", [])) < 2:
        errors.append(f"Expected 2 valid subjects parsed after ID scrub, got {len(parsed.get('subjects', []))}")

    html = (ROOT / "index.html").read_text(encoding="utf-8")
    for token in (
        'id="scan-doc-type-select"',
        'value="provisional_g11"',
        'id="scan-confirm-check"',
        "I checked these marks against my report card",
    ):
        if token not in html:
            errors.append(f"index.html missing v71 scanner control: {token}")

    print(json.dumps({"gate": "97_verify_scanner_popia_id_mask_and_doc_types", "passed": len(errors) == 0, "errors": errors}))
    sys.exit(0 if not errors else 1)


if __name__ == "__main__":
    main()
