#!/usr/bin/env python3
"""Mzansi Pathways v11 — Failsafe Data Health, 5-Tier Source Authority & Rule Conflict Detection."""
import json
import sys
from datetime import datetime, timezone, timedelta
from pathlib import Path

SAST = timezone(timedelta(hours=2))
VALID_STATUSES = {"verified", "pending_review", "outdated", "warning", "unavailable"}


def detect_rule_conflicts(existing_prog: dict, incoming_prog: dict) -> dict:
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
    try:
        payload = json.loads(data_path.read_text(encoding="utf-8"))
    except Exception as exc:
        return {"gate": "data_health", "passed": False, "errors": [f"Malformed JSON in {data_path.name}: {exc}"]}

    progs = payload.get("programmes")
    if not isinstance(progs, list):
        return {"gate": "data_health", "passed": False, "errors": ["programmes must be a list"]}

    now = datetime.now(SAST).date()
    fresh, due, outdated, pending = 0, 0, 0, 0
    errors = []

    for p in progs:
        if not isinstance(p, dict):
            errors.append("Non-object programme entry detected")
            continue
        pid = p.get("id") or "(missing id)"
        status = str(p.get("verificationStatus") or "pending_review")
        if status not in VALID_STATUSES:
            errors.append(f"{pid}: invalid verificationStatus '{status}'")
        if status == "pending_review":
            pending += 1
        tier = p.get("sourceTier")
        if not isinstance(tier, int) or not (1 <= tier <= 5):
            errors.append(f"{pid}: invalid sourceTier {tier!r}")
        iy = p.get("intakeYear")
        if iy is not None and (not isinstance(iy, int) or iy < 2026):
            errors.append(f"{pid}: invalid intakeYear {iy!r}")

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
            errors.append(f"{pid}: invalid lastVerifiedAt '{lv}'")

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
