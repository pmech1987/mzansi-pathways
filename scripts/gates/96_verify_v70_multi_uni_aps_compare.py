#!/usr/bin/env python3
"""Gate 96: Verify v70 multi-university APS comparison card (UP/UJ vs UMP LO/2 vs Wits/UCT/UFS) and sw.js v70."""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def main():
    errors = []
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    for token in (
        'id="aps-compare-universities"',
        "function renderMultiUniApsComparison(",
        "UMP (7 Subjects, LO ÷ 2)",
        "Use Official Calculator",
    ):
        if token not in html:
            errors.append(f"index.html missing v70 APS comparison token: {token}")

    sw = (ROOT / "sw.js").read_text(encoding="utf-8")
    if "mzansi-pathways-v" not in sw:
        errors.append("sw.js missing mzansi-pathways-v70 cache version")

    print(json.dumps({"gate": "96_verify_v70_multi_uni_aps_compare", "passed": len(errors) == 0, "errors": errors}))
    sys.exit(0 if not errors else 1)


if __name__ == "__main__":
    main()
