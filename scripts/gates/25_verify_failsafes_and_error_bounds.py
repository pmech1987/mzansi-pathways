#!/usr/bin/env python3
"""Gate 25: Verifies hidden UI crash recovery, state auto-repair, and Python NaN/bounds failsafes."""
import json, sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import match_engine as me


def run(root: Path = Path(".")) -> dict:
    errors = []
    # 1. Backend edge-case failsafe checks
    if me.evaluate_nsc_pass([])["apsExclLO"] != 0:
        errors.append("Empty subject list did not return 0 APS safely")
    if me.mark_to_nsc_level(float("nan")) != 1 or me.mark_to_nsc_level(-50) != 1:
        errors.append("NaN or negative mark failed clamping")
    bad_ext = me.extract_prospectus_snippet_facts("APS 999, Mathematics 150%")
    if bad_ext["apsFound"] is not None or bad_ext["mathsPercentFound"] is not None:
        errors.append("Out-of-bounds prospectus numbers were not rejected")

    # 2. Frontend hidden failsafe markers
    txt = (root / "index.html").read_text(encoding="utf-8", errors="replace")
    for marker in ("window.addEventListener('error'", "function repairState(", "function safeRender(", ":focus-visible"):
        if marker not in txt:
            errors.append(f"index.html: missing hidden failsafe/a11y marker ({marker})")

    return {"gate": "25_failsafes_and_error_bounds", "passed": not errors, "errors": errors}


if __name__ == "__main__":
    r = run(); print(json.dumps(r)); raise SystemExit(0 if r["passed"] else 1)
