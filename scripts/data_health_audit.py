#!/usr/bin/env python3
"""Mzansi Pathways — Data Health, 5-Tier Source Authority & Rule Conflict Detection Engine."""
import json
import sys
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import List

SAST = timezone(timedelta(hours=2))


def detect_rule_conflicts(existing_prog: dict, incoming_prog: dict) -> dict:
    """
    Compares an incoming programme update against an existing verified record.
    Enforces 5-Tier Source Authority (Tier 1 = Official Regulator/Institution > Tier 5 = Community Report):
    Lower-authority sources NEVER silently overwrite higher-authority records.
    """
    ex_tier = int(existing_prog.get("sourceTier") or 5)
    in_tier = int(incoming_prog.get("sourceTier") or 5)
    diffs = []
    for field in ("minAps", "minMaths", "intakeYear", "verificationStatus"):
        if field in incoming_prog and existing_prog.get(field) != incoming_prog.get(field):
            diffs.append({"field": field, "existing": existing_prog.get(field), "incoming": incoming_prog.get(field)})

    if not diffs:
        return {"hasConflict": False, "action": "no_change", "diffs": []}
    if in_tier > ex_tier:
        return {
            "hasConflict": True,
            "action": "hold_for_admin_review",
            "reason": f"Tier {in_tier} source cannot silently override Tier {ex_tier} official record",
            "diffs": diffs,
        }
    return {
        "hasConflict": True,
        "action": "version_and_review",
        "reason": f"Authoritative Tier {in_tier} change detected — preserve prior intake version and review",
        "diffs": diffs,
    }


def audit_data_health(data_path: Path = Path("data/programmes_2027.json")) -> dict:
    if not data_path.exists():
        return {"gate": "data_health", "passed": False, "errors": [f"Missing {data_path}"]}
    payload = json.loads(data_path.read_text(encoding="utf-8"))
    progs = payload.get("programmes") or []
    now = datetime.now(SAST).date()
    fresh, due, outdated, pending = 0, 0, 0, 0
    errors = []

    for p in progs:
        status = str(p.get("verificationStatus") or "pending_review")
        if status == "pending_review":
            pending += 1
        lv = str(p.get("lastVerifiedAt") or "")
        if not lv:
            outdated += 1
            continue
        try:
            age = (now - datetime.strptime(lv[:10], "%Y-%m-%d").date()).days
            if age > 180:
                outdated += 1
            elif age > 90:
                due += 1
            else:
                fresh += 1
        except Exception:
            errors.append(f"{p.get('id')}: invalid lastVerifiedAt '{lv}'")

    return {
        "gate": "data_health",
        "passed": len(errors) == 0,
        "totalProgrammes": len(progs),
        "fresh": fresh,
        "dueForReview": due,
        "outdated": outdated,
        "pendingVerification": pending,
        "errors": errors,
    }


if __name__ == "__main__":
    res = audit_data_health(Path(sys.argv[1]) if len(sys.argv) > 1 else Path("data/programmes_2027.json"))
    print(json.dumps(res, indent=2))
    raise SystemExit(0 if res["passed"] else 1)
