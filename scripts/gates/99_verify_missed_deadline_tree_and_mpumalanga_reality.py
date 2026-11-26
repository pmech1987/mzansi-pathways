#!/usr/bin/env python3
"""Gate 99: Verify Missed-a-Deadline 5-step decision tree, DHET LMI 2024 Mpumalanga reality banner, and GitHub issue reporting link."""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def main():
    errors = []
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    for token in (
        'id="missed-deadline-tree"',
        'id="mpumalanga-reality-banner"',
        'id="report-data-issue-link"',
        "DHET LMI 2024",
        "https://github.com/pmech1987/mzansi-pathways/issues/new",
    ):
        if token not in html:
            errors.append(f"index.html missing v72 token: {token}")

    print(json.dumps({"gate": "99_verify_missed_deadline_tree_and_mpumalanga_reality", "passed": len(errors) == 0, "errors": errors}))
    sys.exit(0 if not errors else 1)


if __name__ == "__main__":
    main()
