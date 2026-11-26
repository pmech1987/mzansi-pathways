#!/usr/bin/env python3
"""Gate 63: Verify anti-bypass static AST gate auditing, independent Stage 4 attestation verifier in CI, and Career sector filter."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def main() -> int:
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    vr = (ROOT / "scripts" / "verify_release.py").read_text(encoding="utf-8")
    dp = (ROOT / ".github" / "workflows" / "deploy-pages.yml").read_text(encoding="utf-8")
    errors = []

    if 'id="career-sector-filter"' not in html:
        errors.append("index.html missing #career-sector-filter in Careers tab")
    if "FORBIDDEN_GATE_PATTERNS" not in vr:
        errors.append("verify_release.py missing anti-bypass FORBIDDEN_GATE_PATTERNS static audit")
    if not (ROOT / "scripts" / "verify_attestation_seal.py").exists():
        errors.append("Missing scripts/verify_attestation_seal.py")
    if "verify_attestation_seal.py" not in dp:
        errors.append("deploy-pages.yml must run scripts/verify_attestation_seal.py before publishing")

    print(json.dumps({"gate": "63_verify_anti_bypass_gate_audit_and_career_filter", "passed": len(errors) == 0, "errors": errors}))
    return 0 if not errors else 1


if __name__ == "__main__":
    raise SystemExit(main())
