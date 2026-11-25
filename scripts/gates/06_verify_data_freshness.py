#!/usr/bin/env python3
"""Gate 06: Audits programme verification dates in SAST and flags stale records."""
import json, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import data_health_audit as dha

def run(root: Path = Path(".")) -> dict:
    res = dha.audit_data_health(root / "data" / "programmes_2027.json")
    return {"gate": "06_data_freshness", "passed": res["passed"], "errors": res.get("errors", [])}

if __name__ == "__main__":
    r = run(); print(json.dumps(r)); raise SystemExit(0 if r["passed"] else 1)
