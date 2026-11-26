#!/usr/bin/env python3
"""Gate 84: Verify v56 Closing <=7d filter pill, Copy Plain-Text CV clipboard action, and sw.js v56."""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def main():
    errors = []
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    for token in (
        'id="closing-soon-jobs-btn"',
        'id="copy-cv-txt-btn"',
        "function copyPlainTextCv()",
    ):
        if token not in html:
            errors.append(f"index.html missing v56 token: {token}")

    sw = (ROOT / "sw.js").read_text(encoding="utf-8")
    if "mzansi-pathways-v56" not in sw:
        errors.append("sw.js missing mzansi-pathways-v56 cache version")

    print(json.dumps({"gate": "84_verify_v56_closing_soon_pill_and_copy_cv", "passed": len(errors) == 0, "errors": errors}))
    sys.exit(0 if not errors else 1)


if __name__ == "__main__":
    main()
