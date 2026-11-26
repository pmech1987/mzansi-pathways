#!/usr/bin/env python3
"""Validates data/sa_gov_portals.json to guarantee official HTTPS South African public domains and cadence notes."""
import json
from pathlib import Path

ALLOWED_SUFFIXES = (".gov.za", ".org.za", ".ac.za", ".edu.za", "sayouth.mobi")


def verify_gov_portals(json_path: Path) -> dict:
    data = json.loads(json_path.read_text(encoding="utf-8"))
    portals = data.get("portals") or []
    errors = []
    for p in portals:
        url = str(p.get("url") or "")
        if not url.startswith("https://"):
            errors.append(f"{p.get('id')}: non-HTTPS URL {url}")
            continue
        host = url.lower().split("://", 1)[1].split("/", 1)[0]
        if not any(host == s or host.endswith(s) for s in ALLOWED_SUFFIXES):
            errors.append(f"{p.get('id')}: host {host} is not an official SA public domain")
        if not p.get("cadence"):
            errors.append(f"{p.get('id')}: missing posting cadence note")
    if len(portals) < 4:
        errors.append("Expected at least 4 official SA government/public portals")
    return {"passed": len(errors) == 0, "count": len(portals), "errors": errors}


if __name__ == "__main__":
    root = Path(__file__).resolve().parent.parent
    print(json.dumps(verify_gov_portals(root / "data" / "sa_gov_portals.json"), indent=2))
