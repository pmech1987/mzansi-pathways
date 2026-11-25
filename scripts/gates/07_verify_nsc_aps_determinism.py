#!/usr/bin/env python3
"""Gate 07: Verifies deterministic NSC pass-level and APS calculation against canonical test vectors."""
import json, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import match_engine as me

def run(root: Path = Path(".")) -> dict:
    errors = []
    subs = [
        {"name": "English Home Language", "mark": 64, "isHomeLanguage": True},
        {"name": "isiZulu FAL", "mark": 70},
        {"name": "Mathematics", "mark": 48},
        {"name": "Physical Sciences", "mark": 51},
        {"name": "IT", "mark": 68},
        {"name": "Geography", "mark": 59},
        {"name": "Life Orientation", "mark": 80, "isLifeOrientation": True},
    ]
    out = me.evaluate_nsc_pass(subs)
    if out["passLevel"] != "Bachelor's Pass" or out["apsExclLO"] != 27:
        errors.append(f"Unexpected NSC vector output: {out}")
    return {"gate": "07_nsc_aps_determinism", "passed": not errors, "errors": errors}

if __name__ == "__main__":
    r = run(); print(json.dumps(r)); raise SystemExit(0 if r["passed"] else 1)
