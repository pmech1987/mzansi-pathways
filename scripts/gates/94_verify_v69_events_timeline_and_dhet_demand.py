#!/usr/bin/env python3
"""Gate 94: Verify v69 Next 90 Days events.json timeline, DHET LMI 2024 career demand/oversupply metadata, and sw.js v69."""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def main():
    errors = []
    ev_p = ROOT / "data" / "events.json"
    if not ev_p.exists():
        errors.append("Missing data/events.json")
    else:
        ev = json.loads(ev_p.read_text(encoding="utf-8"))
        events = ev.get("events") or []
        if len(events) < 5:
            errors.append(f"Expected >=5 dated events in data/events.json, got {len(events)}")
        for e in events:
            if not re.match(r"^\d{4}-\d{2}-\d{2}$", str(e.get("date", ""))):
                errors.append(f"Non-ISO date in events.json: {e.get('id')} -> {e.get('date')}")

    careers = json.loads((ROOT / "data" / "careers.json").read_text(encoding="utf-8")).get("careers", [])
    enriched = [c for c in careers if c.get("ofo") and isinstance(c.get("demand"), dict)]
    if len(enriched) < 10:
        errors.append(f"Expected >=10 careers enriched with DHET LMI 2024 OFO/demand metadata, got {len(enriched)}")

    html = (ROOT / "index.html").read_text(encoding="utf-8")
    if 'id="next-90-days-card"' not in html:
        errors.append("index.html missing #next-90-days-card widget")

    sw = (ROOT / "sw.js").read_text(encoding="utf-8")
    if "mzansi-pathways-v" not in sw or "./data/events.json" not in sw:
        errors.append("sw.js missing mzansi-pathways-v69 or ./data/events.json cache entry")

    print(json.dumps({"gate": "94_verify_v69_events_timeline_and_dhet_demand", "passed": len(errors) == 0, "errors": errors}))
    sys.exit(0 if not errors else 1)


if __name__ == "__main__":
    main()
