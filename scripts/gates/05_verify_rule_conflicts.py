#!/usr/bin/env python3
"""Gate 05: Verifies Tier-5 reports cannot silently override Tier-1/2 official programme rules."""
import json, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import data_health_audit as dha

def run(root: Path = Path(".")) -> dict:
    errors = []
    chk = dha.detect_rule_conflicts({"sourceTier": 2, "minMaths": 60}, {"sourceTier": 5, "minMaths": 45})
    if not chk["hasConflict"] or chk["action"] != "hold_for_admin_review":
        errors.append("Conflict guard failed to hold Tier-5 override for admin review")
    return {"gate": "05_rule_conflicts", "passed": not errors, "errors": errors}

if __name__ == "__main__":
    r = run(); print(json.dumps(r)); raise SystemExit(0 if r["passed"] else 1)
