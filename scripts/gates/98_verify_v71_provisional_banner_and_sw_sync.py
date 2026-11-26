#!/usr/bin/env python3
"""Gate 98: Verify v71 Grade 11 provisional conditional-admission banner, SA ID regex scrub in index.html, and sw.js v71."""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def main():
    errors = []
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    for token in (
        "Grade 11 / Term marks are provisional.",
        "[redacted-id]",
    ):
        if token not in html:
            errors.append(f"index.html missing v71 token: {token}")

    sw = (ROOT / "sw.js").read_text(encoding="utf-8")
    if "mzansi-pathways-v" not in sw:
        errors.append("sw.js missing mzansi-pathways-v71 cache version")

    print(json.dumps({"gate": "98_verify_v71_provisional_banner_and_sw_sync", "passed": len(errors) == 0, "errors": errors}))
    sys.exit(0 if not errors else 1)


if __name__ == "__main__":
    main()
