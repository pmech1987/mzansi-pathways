#!/usr/bin/env python3
"""
Mzansi Pathways v2 — Deterministic SA Opportunity Decision Engine
-----------------------------------------------------------------
1. NSC Pass-Level & Standard APS (excl. LO)
2. 5-State Explainable Programme Eligibility
3. Bottleneck Analyser ("Improve My Options" — exact unlock counts)
4. Closest Alternatives Finder (for Near Match / Not Currently Eligible targets)
"""
from typing import Dict, List


def mark_to_nsc_level(mark: float) -> int:
    m = float(mark or 0)
    if m >= 80: return 7
    if m >= 70: return 6
    if m >= 60: return 5
    if m >= 50: return 4
    if m >= 40: return 3
    if m >= 30: return 2
    return 1


def evaluate_nsc_pass(subjects: List[dict]) -> dict:
    hl = [s for s in subjects if s.get("isHomeLanguage")]
    non_lo = [s for s in subjects if not s.get("isLifeOrientation")]
    aps_excl_lo = sum(mark_to_nsc_level(s.get("mark", 0)) for s in non_lo[:6])
    hl_mark = max((float(s.get("mark", 0)) for s in hl), default=0.0)
    over_50 = sum(1 for s in non_lo if float(s.get("mark", 0)) >= 50)
    over_40 = sum(1 for s in non_lo if float(s.get("mark", 0)) >= 40)
    over_30 = sum(1 for s in non_lo if float(s.get("mark", 0)) >= 30)

    if hl_mark >= 40 and over_50 >= 4 and over_30 >= 6:
        pass_level = "Bachelor's Pass"
    elif hl_mark >= 40 and over_40 >= 4 and over_30 >= 6:
        pass_level = "Diploma Pass"
    elif hl_mark >= 40 and over_40 >= 3 and over_30 >= 6:
        pass_level = "Higher Certificate Pass"
    else:
        pass_level = "Did Not Meet Minimum NSC Pass"
    return {"passLevel": pass_level, "apsExclLO": aps_excl_lo}


PASS_RANK = {
    "Did Not Meet Minimum NSC Pass": 0,
    "Higher Certificate Pass": 1,
    "Diploma Pass": 2,
    "Bachelor's Pass": 3,
}


def evaluate_programme(subjects: List[dict], programme: dict) -> dict:
    if not programme.get("verifiedRules"):
        return {"status": "Needs Verification", "reasons": ["Published admission rules not yet verified for this intake."], "missing": []}

    nsc = evaluate_nsc_pass(subjects)
    by_name: Dict[str, float] = {str(s.get("name") or "").strip().lower(): float(s.get("mark", 0)) for s in subjects}
    missing, reasons = [], []
    near_gap = True

    req_pass = programme.get("minPassLevel") or "Higher Certificate Pass"
    if PASS_RANK.get(nsc["passLevel"], 0) < PASS_RANK.get(req_pass, 0):
        missing.append(f"Requires {req_pass} (currently {nsc['passLevel']})")
        if PASS_RANK.get(req_pass, 0) - PASS_RANK.get(nsc["passLevel"], 0) > 1:
            near_gap = False

    min_aps = int(programme.get("minAps") or 0)
    if min_aps > 0:
        if nsc["apsExclLO"] >= min_aps:
            reasons.append(f"APS {nsc['apsExclLO']} meets minimum {min_aps}")
        else:
            gap = min_aps - nsc["apsExclLO"]
            missing.append(f"APS {nsc['apsExclLO']} is {gap} point(s) below minimum {min_aps}")
            if gap > 4:
                near_gap = False

    for req in programme.get("subjectRequirements") or []:
        opts = [o.lower() for o in (req.get("anyOf") or [])]
        min_m = float(req.get("minMark") or 0)
        best_found = None
        for o in opts:
            if o in by_name:
                best_found = max(best_found, by_name[o]) if best_found is not None else by_name[o]
        label = " or ".join(req.get("anyOf") or [])
        if best_found is None:
            missing.append(f"Missing required subject: {label} ({int(min_m)}%+)")
            near_gap = False
        elif best_found < min_m:
            diff = int(round(min_m - best_found))
            missing.append(f"{label}: {int(best_found)}% (need {int(min_m)}%, short by {diff}%)")
            if diff > 15:
                near_gap = False
        else:
            reasons.append(f"{label} {int(best_found)}% meets {int(min_m)}%+")

    if not missing:
        if programme.get("requiresSelection"):
            return {"status": "Conditional", "reasons": reasons + ["Additional selection/capacity limits apply"], "missing": []}
        return {"status": "Strong Match", "reasons": reasons, "missing": []}
    if near_gap and len(missing) <= 2:
        return {"status": "Near Match", "reasons": reasons, "missing": missing}
    return {"status": "Not Currently Eligible", "reasons": reasons, "missing": missing}


def find_bottlenecks(subjects: List[dict], programmes: List[dict], delta: int = 10) -> List[dict]:
    """Deterministically identifies which single subject improvement unlocks the most additional programmes."""
    qualifying = {"Strong Match", "Conditional"}
    base_ok = sum(1 for p in programmes if evaluate_programme(subjects, p)["status"] in qualifying)
    results = []
    for idx, sub in enumerate(subjects):
        if sub.get("isLifeOrientation"):
            continue
        cur = float(sub.get("mark", 0))
        if cur >= 95:
            continue
        sim_mark = min(100.0, cur + delta)
        sim_subs = [dict(s) for s in subjects]
        sim_subs[idx]["mark"] = sim_mark
        new_ok = sum(1 for p in programmes if evaluate_programme(sim_subs, p)["status"] in qualifying)
        if new_ok > base_ok:
            results.append({
                "subject": sub["name"],
                "fromMark": int(cur),
                "toMark": int(sim_mark),
                "unlockedCount": new_ok - base_ok,
            })
    results.sort(key=lambda x: -x["unlockedCount"])
    return results


def find_closest_alternatives(subjects: List[dict], target_programme: dict, all_programmes: List[dict]) -> List[dict]:
    """Finds accessible alternative routes sharing the same career family when a target programme is out of reach."""
    target_id = target_programme.get("id")
    target_family = target_programme.get("careerFamily")
    alts = []
    for p in all_programmes:
        if p.get("id") == target_id:
            continue
        if target_family and p.get("careerFamily") != target_family:
            continue
        ev = evaluate_programme(subjects, p)
        if ev["status"] in ("Strong Match", "Conditional", "Near Match"):
            alts.append({"id": p.get("id"), "name": p.get("name"), "route": p.get("route"), "status": ev["status"], "missing": ev["missing"]})
    rank = {"Strong Match": 0, "Conditional": 1, "Near Match": 2}
    alts.sort(key=lambda x: rank.get(x["status"], 9))
    return alts
