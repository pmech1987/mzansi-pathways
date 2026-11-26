#!/usr/bin/env python3
"""Gate 56: Verify official SA company & recruitment agency verification registers, CIPC format checker, and V17 docs."""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))
import verify_company_and_agency_registers as vcar


def main() -> int:
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    errors = []
    res = vcar.verify_registers_present(ROOT)
    errors.extend(res.get("errors") or [])

    for token in ['id="company-legit-card"', 'id="cipc-check-input"', "validateCipcFormat("]:
        if token not in html:
            errors.append(f"index.html missing v36 company legitimacy feature: {token}")

    fmt_ok = vcar.validate_cipc_format("2018/123456/07")
    fmt_bad = vcar.validate_cipc_format("FAKE-123")
    if not fmt_ok.get("validFormat") or fmt_bad.get("validFormat"):
        errors.append("verify_company_and_agency_registers.validate_cipc_format failed check")

    doc = ROOT / "docs" / "COMPANY_AND_AGENCY_VERIFICATION_V17.md"
    if not doc.exists() or len(doc.read_text(encoding="utf-8").strip()) < 250:
        errors.append("Missing or incomplete docs/COMPANY_AND_AGENCY_VERIFICATION_V17.md")

    print(json.dumps({"gate": "56_verify_company_and_agency_registers", "passed": len(errors) == 0, "errors": errors}))
    return 0 if not errors else 1


if __name__ == "__main__":
    raise SystemExit(main())
