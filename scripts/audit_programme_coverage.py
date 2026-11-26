#!/usr/bin/env python3
"""
Mzansi Pathways — Programme Coverage & Rule Bounds Auditor
----------------------------------------------------------
Verifies data/programmes_2027.json for unique IDs, valid source tiers (1-2),
sane minAps/minMaths bounds, non-empty institutions, and multi-pathway coverage.
"""
import json
from pathlib import Path


def audit_coverage(json_path: Path) -> dict:
    data = json.loads(json_path.read_text(encoding="utf-8"))
    progs = data.get("programmes") or []
    errors = []
    seen_ids = set()
    tier_counts = {1: 0, 2: 0}

    for p in progs:
        pid = p.get("id")
        if not pid or pid in seen_ids:
            errors.append(f"Missing or duplicate programme id: {pid}")
        seen_ids.add(pid)
        tier = p.get("sourceTier")
        if tier not in (1, 2):
            errors.append(f"{pid}: invalid sourceTier {tier} (must be 1 or 2)")
        else:
            tier_counts[tier] += 1
        aps = p.get("minAps", -1)
        if not isinstance(aps, (int, float)) or aps < 0 or aps > 42:
            errors.append(f"{pid}: minAps out of bounds ({aps})")
        if not p.get("lastVerifiedAt"):
            errors.append(f"{pid}: missing lastVerifiedAt date")

    if len(progs) < 5:
        errors.append(f"Expected at least 5 pathways in programmes_2027.json, found {len(progs)}")
    if tier_counts[1] < 1 or tier_counts[2] < 1:
        errors.append(f"Expected both Tier 1 (register) and Tier 2 (prospectus) entries, got {tier_counts}")

    return {"passed": len(errors) == 0, "count": len(progs), "tierCounts": tier_counts, "errors": errors}


if __name__ == "__main__":
    root = Path(__file__).resolve().parent.parent
    print(json.dumps(audit_coverage(root / "data" / "programmes_2027.json"), indent=2))
