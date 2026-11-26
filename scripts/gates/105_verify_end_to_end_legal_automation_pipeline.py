#!/usr/bin/env python3
"""Gate 105: Behavioral verification of master legal automation orchestrator and SAST deadline rollover auditor."""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))
import run_legal_automation_pipeline as rlap
import audit_and_rollover_deadlines as ard


def main():
    errors = []
    res = rlap.run_all(ROOT, offline=True)
    if res.get("deadlinesChecked", 0) < 5:
        errors.append(f"Expected >=5 deadlines checked by automation pipeline, got {res}")

    st_file = ROOT / "data" / "automation_status.json"
    if not st_file.exists():
        errors.append("Missing data/automation_status.json output")
    else:
        data = json.loads(st_file.read_text(encoding="utf-8"))
        if data.get("eventsChecked", 0) < 5:
            errors.append(f"automation_status.json incomplete: {data}")

    # Verify deterministic date classification
    c_closed = ard.classify_iso("2026-06-30", ard.dt.date(2026, 11, 26))
    c_soon = ard.classify_iso("2026-11-30", ard.dt.date(2026, 11, 26))
    if c_closed["status"] != "CLOSED" or c_soon["status"] != "CLOSING_SOON" or c_soon["daysLeft"] != 4:
        errors.append(f"Unexpected SAST deadline classification: {c_closed} / {c_soon}")

    print(json.dumps({"gate": "105_verify_end_to_end_legal_automation_pipeline", "passed": len(errors) == 0, "errors": errors}))
    sys.exit(0 if not errors else 1)


if __name__ == "__main__":
    main()
