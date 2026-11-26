#!/usr/bin/env python3
"""Gate 45: Verify subject Undo stack, live scanner APS span, print-only institutional header, Escape tutorial persistence, and link hygiene."""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))
import check_links_and_domains as cld


def main() -> int:
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    errors = []
    for token in [
        'id="undo-subjects-btn"',
        "function pushSubjectUndo(",
        "function undoLastSubjects(",
        'id="scan-live-preview"',
        "print-only",
        "closeTutorial();",
    ]:
        if token not in html:
            errors.append(f"index.html missing v25 feature or failsafe: {token}")

    link_res = cld.audit_links(ROOT)
    errors.extend(link_res.get("errors") or [])

    print(json.dumps({"gate": "45_verify_undo_print_header_and_link_hygiene", "passed": len(errors) == 0, "errors": errors}))
    return 0 if not errors else 1


if __name__ == "__main__":
    raise SystemExit(main())
