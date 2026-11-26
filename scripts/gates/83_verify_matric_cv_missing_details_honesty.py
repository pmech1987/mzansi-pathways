#!/usr/bin/env python3
"""Gate 83: Verify matriculant/minimal CV honesty (zero fabricated fields) in cv_importer.py and matric starter UI."""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))
from cv_importer import parse_previous_cv_text


def main():
    errors = []
    res = parse_previous_cv_text("Thabo Mokoena\nCompleted Grade 12 NSC Matric 2026\nNo formal work experience yet.")
    if res.get("email"):
        errors.append(f"Fabricated email on bare matric CV: {res.get('email')}")
    if res.get("phone"):
        errors.append(f"Fabricated phone on bare matric CV: {res.get('phone')}")

    html = (ROOT / "index.html").read_text(encoding="utf-8")
    if 'id="matric-starter-btn"' not in html:
        errors.append("index.html missing #matric-starter-btn for recent matriculants")

    print(json.dumps({"gate": "83_verify_matric_cv_missing_details_honesty", "passed": len(errors) == 0, "errors": errors}))
    sys.exit(0 if not errors else 1)


if __name__ == "__main__":
    main()
