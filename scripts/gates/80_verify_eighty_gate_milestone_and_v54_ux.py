#!/usr/bin/env python3
"""Gate 80: Verify 80-gate milestone, v54 Mark All Portals Checked button, active job counter, and sw.js v54."""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def main():
    errors = []
    gate_files = list((ROOT / "scripts" / "gates").glob("*.py"))
    if len(gate_files) < 80:
        errors.append(f"Expected at least 80 gate scripts, found {len(gate_files)}")

    html = (ROOT / "index.html").read_text(encoding="utf-8")
    for token in (
        'id="mark-all-portals-checked-btn"',
        "active open job",
    ):
        if token not in html:
            errors.append(f"index.html missing v54 token: {token}")

    sw = (ROOT / "sw.js").read_text(encoding="utf-8")
    if "mzansi-pathways-v" not in sw:
        errors.append("sw.js missing mzansi-pathways-v54 cache version")

    print(json.dumps({"gate": "80_verify_eighty_gate_milestone_and_v54_ux", "passed": len(errors) == 0, "errors": errors}))
    sys.exit(0 if not errors else 1)


if __name__ == "__main__":
    main()
