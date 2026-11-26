#!/usr/bin/env python3
"""
Mzansi Pathways v9 — Failsafe-Hardened Deterministic SA Opportunity Decision Engine
-----------------------------------------------------------------------------------
Includes strict NaN/Inf/negative clamping, malformed-input guards, and fail-closed
verification semantics across NSC pass evaluation, 5-state eligibility, bottlenecks,
closest alternatives, and prospectus snippet extraction.
"""
import math
import re
from typing import Dict, List


def _safe_mark(val) -> float:
    try:
        m = float(val)
        if not math.isfinite(m):
            return 0.0
        return max(0.0, min(100.0, m))
    except Exception:
        return 0.0


def mark_to_nsc_level(mark) -> int:
    m = _safe_mark(mark)
    if m >= 80: return 7
    if m >= 70: return 6
    if m >= 60: return 5
    if m >= 50: return 4
    if m >= 40: return 3
    if m >= 30: return 2
    return 1


def evaluate_nsc_pass(subjects: List[dict]) -> dict:
    if not isinstance(subjects, list) or not subjects:
        return {"passLevel": "Did Not Meet Minimum NSC Pass", "apsExclLO": 0}
    clean = [s for s in subjects if isinstance(s, dict)]
    hl = [s for s in clean if s.get("isHomeLanguage")]
    non_lo = [s for s in clean if not s.get("isLifeOrientation")]
    aps_excl_lo = sum(mark_to_nsc_level(s.get("mark", 0)) for s in non_lo[:6])
    hl_mark = max((_safe_mark(s.get("mark", 0)) for s in hl), default=0.0)
    over_50 = sum(1 for s in non_lo if _safe_mark(s.get("mark", 0)) >= 50)
    over_40 = sum(1 for s in non_lo if _safe_mark(s.get("mark", 0)) >= 40)
    over_30 = sum(1 for s in non_lo if _safe_mark(s.get("mark", 0)) >= 30)

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
    if not isinstance(programme, dict) or not programme.get("verifiedRules"):
        return {"status": "Needs Verification", "reasons": ["Published admission rules not yet verified for this intake."], "missing": []}

    nsc = evaluate_nsc_pass(subjects)
    clean_subs = [s for s in (subjects or []) if isinstance(s, dict)]
    by_name: Dict[str, float] = {str(s.get("name") or "").strip().lower(): _safe_mark(s.get("mark", 0)) for s in clean_subs}
    missing, reasons = [], []
    near_gap = True

    req_pass = programme.get("minPassLevel") or "Higher Certificate Pass"
    if PASS_RANK.get(nsc["passLevel"], 0) < PASS_RANK.get(req_pass, 0):
        missing.append(f"Requires {req_pass} (currently {nsc['passLevel']})")
        if PASS_RANK.get(req_pass, 0) - PASS_RANK.get(nsc["passLevel"], 0) > 1:
            near_gap = False

    min_aps = max(0, int(programme.get("minAps") or 0))
    if min_aps > 0:
        if nsc["apsExclLO"] >= min_aps:
            reasons.append(f"APS {nsc['apsExclLO']} meets minimum {min_aps}")
        else:
            gap = min_aps - nsc["apsExclLO"]
            missing.append(f"APS {nsc['apsExclLO']} is {gap} point(s) below minimum {min_aps}")
            if gap > 4:
                near_gap = False

    for req in programme.get("subjectRequirements") or []:
        if not isinstance(req, dict):
            continue
        opts = [str(o).lower() for o in (req.get("anyOf") or [])]
        min_m = _safe_mark(req.get("minMark") or 0)
        best_found = None
        for o in opts:
            if o in by_name:
                best_found = max(best_found, by_name[o]) if best_found is not None else by_name[o]
        label = " or ".join(str(x) for x in (req.get("anyOf") or []))
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
    qualifying = {"Strong Match", "Conditional"}
    base_ok = sum(1 for p in programmes if evaluate_programme(subjects, p)["status"] in qualifying)
    results = []
    for idx, sub in enumerate(subjects or []):
        if not isinstance(sub, dict) or sub.get("isLifeOrientation"):
            continue
        cur = _safe_mark(sub.get("mark", 0))
        if cur >= 95:
            continue
        sim_mark = min(100.0, cur + max(1, int(delta)))
        sim_subs = [dict(s) for s in subjects]
        sim_subs[idx]["mark"] = sim_mark
        new_ok = sum(1 for p in programmes if evaluate_programme(sim_subs, p)["status"] in qualifying)
        if new_ok > base_ok:
            results.append({"subject": sub.get("name", "Subject"), "fromMark": int(cur), "toMark": int(sim_mark), "unlockedCount": new_ok - base_ok})
    results.sort(key=lambda x: -x["unlockedCount"])
    return results


def find_closest_alternatives(subjects: List[dict], target_programme: dict, all_programmes: List[dict]) -> List[dict]:
    target_id = (target_programme or {}).get("id")
    target_family = (target_programme or {}).get("careerFamily")
    alts = []
    for p in all_programmes or []:
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


def extract_prospectus_snippet_facts(snippet_text: str) -> dict:
    """Extracts candidate APS, Maths %, English %, and closing date hints with strict range failsafes."""
    txt = str(snippet_text or "")
    aps_m = re.search(r"\bAPS\s*(?:of|:|>=|at least)?\s*(\d{1,3})\b", txt, re.I)
    math_m = re.search(r"\bMathematics\s*(?:at least|>=|:)?\s*(\d{1,3})\s*%", txt, re.I)
    eng_m = re.search(r"\bEnglish\s*(?:HL|FAL|Home Language|First Additional)?\s*(?:at least|>=|:)?\s*(\d{1,3})\s*%", txt, re.I)
    date_m = re.search(r"\b(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+20\d{2}|20\d{2}-\d{2}-\d{2})\b", txt, re.I)

    aps_val = int(aps_m.group(1)) if aps_m else None
    if aps_val is not None and not (1 <= aps_val <= 42):
        aps_val = None
    math_val = int(math_m.group(1)) if math_m else None
    if math_val is not None and not (0 <= math_val <= 100):
        math_val = None
    eng_val = int(eng_m.group(1)) if eng_m else None
    if eng_val is not None and not (0 <= eng_val <= 100):
        eng_val = None

    return {
        "apsFound": aps_val,
        "mathsPercentFound": math_val,
        "englishPercentFound": eng_val,
        "closingDateHint": date_m.group(1) if date_m else None,
        "reviewRequired": True,
    }


def audit_profile_integrity(subjects: List[dict]) -> dict:
    """Deterministic structural audit for NSC subject profiles (HL, LO, duplicates, bounds)."""
    warnings = []
    if not isinstance(subjects, list) or not subjects:
        return {"valid": False, "warnings": ["Profile contains no subjects."], "subjectCount": 0}
    seen = set()
    hl_count = 0
    lo_count = 0
    for s in subjects:
        if not isinstance(s, dict):
            warnings.append("Ignored non-object subject entry.")
            continue
        name = str(s.get("name", "")).strip()
        if not name:
            warnings.append("Subject entry missing name.")
            continue
        key = name.lower()
        if key in seen:
            warnings.append(f"Duplicate subject detected: {name}")
        seen.add(key)
        if s.get("isHomeLanguage"):
            hl_count += 1
        if s.get("isLifeOrientation"):
            lo_count += 1
        raw_mark = s.get("mark", 0)
        try:
            mv = float(raw_mark)
            if mv < 0 or mv > 100 or not math.isfinite(mv):
                warnings.append(f"Mark out of 0-100 range for {name}; will be clamped.")
        except Exception:
            warnings.append(f"Non-numeric mark for {name}; will default to 0.")
    if hl_count == 0:
        warnings.append("No Home Language flagged (required for NSC pass evaluation).")
    if lo_count == 0:
        warnings.append("No Life Orientation flagged (excluded from standard APS).")
    return {"valid": len(warnings) == 0, "warnings": warnings, "subjectCount": len(seen)}
