#!/usr/bin/env python3
"""Stages incoming prospectus rule candidates into pending_programme_reviews.json with automatic conflict detection."""
import json
import sys
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import List

sys.path.insert(0, str(Path(__file__).resolve().parent))
import data_health_audit as dha

SAST = timezone(timedelta(hours=2))


def stage_candidates(existing_path: Path, incoming_programmes: List[dict], out_path: Path) -> dict:
    existing_data = json.loads(existing_path.read_text(encoding="utf-8")) if existing_path.exists() else {"programmes": []}
    by_id = {p.get("id"): p for p in (existing_data.get("programmes") or [])}
    staged = []
    conflicts = 0

    for inc in incoming_programmes:
        pid = inc.get("id")
        ex = by_id.get(pid)
        if ex:
            chk = dha.detect_rule_conflicts(ex, inc)
            if chk["hasConflict"]:
                conflicts += 1
            staged.append({"programme": inc, "reviewStatus": "pending_qa", "conflictCheck": chk})
        else:
            staged.append({"programme": inc, "reviewStatus": "pending_new", "conflictCheck": {"hasConflict": False, "action": "new_record", "diffs": []}})

    report = {
        "generatedAt": datetime.now(SAST).isoformat(),
        "totalStaged": len(staged),
        "conflictsDetected": conflicts,
        "items": staged,
    }
    tmp = out_path.with_suffix(".tmp")
    tmp.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
    tmp.replace(out_path)
    return report
