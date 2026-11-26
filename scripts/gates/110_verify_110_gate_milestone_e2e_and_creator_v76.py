#!/usr/bin/env python3
"""Gate 110: Verify 110-gate milestone, Playwright WCAG 2.2 AA E2E suite, Creator Studio v76 DPSA/SVG upgrades, and sw.js v76."""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def main():
    errors = []
    gates = list((ROOT / "scripts" / "gates").glob("*_verify_*.py"))
    if len(gates) < 110:
        errors.append(f"Expected >=110 gate scripts, found {len(gates)}")

    e2e = ROOT / "tests" / "e2e_behavioral_suite.spec.ts"
    if not e2e.exists() or "wcag22aa" not in e2e.read_text(encoding="utf-8"):
        errors.append("Missing Playwright WCAG 2.2 AA behavioral E2E suite")

    cs = (ROOT / "creator_studio.html").read_text(encoding="utf-8")
    for tok in ('id="dpsa-extract-btn"', 'id="p-civic-badge"', "Creator Studio (v76)"):
        if tok not in cs:
            errors.append(f"creator_studio.html missing v76 upgrade: {tok}")

    sw = (ROOT / "sw.js").read_text(encoding="utf-8")
    if "mzansi-pathways-v76" not in sw:
        errors.append("sw.js missing mzansi-pathways-v76 cache version")

    print(json.dumps({"gate": "110_verify_110_gate_milestone_e2e_and_creator_v76", "passed": len(errors) == 0, "errors": errors}))
    sys.exit(0 if not errors else 1)


if __name__ == "__main__":
    main()
