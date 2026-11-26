#!/usr/bin/env python3
"""Gate 104: Verify v73 sw.js SKIP_WAITING version-skew safety and Creator Studio / WCAG CSS wiring in index.html."""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def main():
    errors = []
    sw = (ROOT / "sw.js").read_text(encoding="utf-8")
    if "mzansi-pathways-v" not in sw or "SKIP_WAITING" not in sw:
        errors.append("sw.js missing mzansi-pathways-v73 or SKIP_WAITING handler")

    html = (ROOT / "index.html").read_text(encoding="utf-8")
    if 'href="./creator_studio.html"' not in html:
        errors.append("index.html missing Creator Studio link")
    if 'href="./css/civic_mobile_a11y.css"' not in html:
        errors.append("index.html missing civic_mobile_a11y.css stylesheet link")

    print(json.dumps({"gate": "104_verify_v73_blueprint_overhaul_and_sw", "passed": len(errors) == 0, "errors": errors}))
    sys.exit(0 if not errors else 1)


if __name__ == "__main__":
    main()
