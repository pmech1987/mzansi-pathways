#!/usr/bin/env python3
"""Gate 57: Verify interactive sample scam tester, missing-CV-details Matric guide, and repo-wide strict JSON lint."""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))
import check_json_formatting as cjf


def main() -> int:
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    errors = []
    for token in ['id="scam-sample-btn"', 'id="cv-missing-guide"']:
        if token not in html:
            errors.append(f"index.html missing v37 feature: {token}")

    jres = cjf.lint_all_json(ROOT)
    errors.extend(jres.get("errors") or [])

    print(json.dumps({"gate": "57_verify_scam_demo_missing_cv_guide_and_json_lint", "passed": len(errors) == 0, "errors": errors}))
    return 0 if not errors else 1


if __name__ == "__main__":
    raise SystemExit(main())
