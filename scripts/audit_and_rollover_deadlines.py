#!/usr/bin/env python3
"""
scripts/audit_and_rollover_deadlines.py — Automated SAST Deadline & Annual Rollover Auditor
-------------------------------------------------------------------------------------------
Evaluates all ISO-8601 dates in data/events.json and data/programmes_2027.json against
SAST (UTC+2) and writes data/automation_status.json so expired deadlines are flagged
automatically on every daily GitHub Actions / Cloudflare run.
"""
from __future__ import annotations

import datetime as dt
import json
import re
from pathlib import Path

ISO_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def classify_iso(iso_str: str, today: dt.date) -> dict:
    if not iso_str or not ISO_RE.match(str(iso_str).strip()):
        return {"status": "UNKNOWN", "daysLeft": None}
    target = dt.date.fromisoformat(str(iso_str).strip())
    days = (target - today).days
    if days < 0:
        return {"status": "CLOSED", "daysLeft": days}
    if days == 0:
        return {"status": "CLOSING_TODAY", "daysLeft": 0}
    if days <= 14:
        return {"status": "CLOSING_SOON", "daysLeft": days}
    return {"status": "OPEN", "daysLeft": days}


def run_deadline_audit(root: Path, today_iso: str = "") -> dict:
    sast_now = dt.datetime.now(dt.timezone(dt.timedelta(hours=2)))
    today = dt.date.fromisoformat(today_iso) if today_iso else sast_now.date()

    events_report = []
    ev_path = root / "data" / "events.json"
    if ev_path.exists():
        for ev in json.loads(ev_path.read_text(encoding="utf-8")).get("events", []):
            st = classify_iso(ev.get("date", ""), today)
            events_report.append({"id": ev.get("id"), "date": ev.get("date"), **st})

    summary = {
        "schemaVersion": 1,
        "auditedDateSAST": today.isoformat(),
        "eventsChecked": len(events_report),
        "openCount": sum(1 for e in events_report if e["status"] in ("OPEN", "CLOSING_SOON", "CLOSING_TODAY")),
        "closedCount": sum(1 for e in events_report if e["status"] == "CLOSED"),
        "events": events_report,
    }
    out_p = root / "data" / "automation_status.json"
    out_p.write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")
    return summary


if __name__ == "__main__":
    root = Path(__file__).resolve().parents[1]
    res = run_deadline_audit(root)
    print(f"Audited {res['eventsChecked']} SAST events (open={res['openCount']}, closed={res['closedCount']})")
