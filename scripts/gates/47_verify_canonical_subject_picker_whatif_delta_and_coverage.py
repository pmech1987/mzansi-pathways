#!/usr/bin/env python3
"""Gate 47: Verify canonical NSC subject quick-add picker, What-If impact delta, Settings health status, and programme coverage."""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))
import audit_programme_coverage as apc


def main() -> int:
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    errors = []
    for token in [
        'id="quick-add-subject-select"',
        "function getWhatIfDelta(",
        'id="whatif-impact-badge"',
        "function getClientHealthStatus(",
        'id="settings-integrity-status"',
    ]:
        if token not in html:
            errors.append(f"index.html missing v27 feature: {token}")

    cov = apc.audit_coverage(ROOT / "data" / "programmes_2027.json")
    errors.extend(cov.get("errors") or [])

    print(json.dumps({"gate": "47_verify_canonical_subject_picker_whatif_delta_and_coverage", "passed": len(errors) == 0, "errors": errors}))
    return 0 if not errors else 1


if __name__ == "__main__":
    raise SystemExit(main())
