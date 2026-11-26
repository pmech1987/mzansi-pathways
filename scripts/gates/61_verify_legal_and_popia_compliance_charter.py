#!/usr/bin/env python3
"""Gate 61: Verify zero scraping libraries, in-app Legal & POPIA Compliance card, and V19 Legal Charter."""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))
import verify_legal_compliance as vlc


def main() -> int:
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    errors = []
    res = vlc.audit_legal_compliance(ROOT)
    errors.extend(res.get("errors") or [])

    if 'id="legal-compliance-card"' not in html:
        errors.append("index.html missing #legal-compliance-card inside Settings")

    doc = ROOT / "docs" / "LEGAL_AND_COMPLIANCE_CHARTER_V19.md"
    if not doc.exists() or len(doc.read_text(encoding="utf-8").strip()) < 300:
        errors.append("Missing or incomplete docs/LEGAL_AND_COMPLIANCE_CHARTER_V19.md")

    print(json.dumps({"gate": "61_verify_legal_and_popia_compliance_charter", "passed": len(errors) == 0, "errors": errors}))
    return 0 if not errors else 1


if __name__ == "__main__":
    raise SystemExit(main())
