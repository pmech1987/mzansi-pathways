#!/usr/bin/env python3
"""
scripts/fetch_sa_municipalities.py — Automated Official National Treasury Open API Fetcher
------------------------------------------------------------------------------------------
Fetches South Africa's 257 active municipalities (8 Metros, 44 Districts, 205 Local
Municipalities) legally from National Treasury's open Municipal Money JSON API
(https://municipaldata.treasury.gov.za/api/cubes/municipalities/members/municipality).
Falls back cleanly in offline mode without overwriting existing verified snapshots.
"""
from __future__ import annotations

import datetime as dt
import json
import os
import tempfile
import urllib.request
from pathlib import Path

TREASURY_API = "https://municipaldata.treasury.gov.za/api/cubes/municipalities/members/municipality"
USER_AGENT = "MzansiPathways-OpenCivicBot/74.0 (+https://mzansi-pathways.pages.dev)"


def fetch_municipalities(output_path: Path, offline: bool = False) -> dict:
    if offline:
        return {"status": "offline_skipped", "count": 0, "source": TREASURY_API}
    req = urllib.request.Request(TREASURY_API, headers={"User-Agent": USER_AGENT, "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=15) as resp:
        raw = json.loads(resp.read().decode("utf-8", errors="replace"))
    rows = raw.get("data") or []
    cleaned = [
        {
            "code": str(r.get("municipality.demarcation_code") or "").strip(),
            "name": str(r.get("municipality.name") or "").strip(),
            "province": str(r.get("municipality.province_name") or "").strip(),
            "category": str(r.get("municipality.category") or "").strip(),
        }
        for r in rows
        if r.get("municipality.name")
    ]
    if len(cleaned) < 200:
        raise RuntimeError(f"Circuit breaker: expected ~257 SA municipalities, received {len(cleaned)}")
    payload = {
        "schemaVersion": 1,
        "generatedAt": dt.datetime.now(dt.timezone.utc).isoformat(),
        "source": "National Treasury Municipal Money Open API (municipaldata.treasury.gov.za)",
        "count": len(cleaned),
        "municipalities": sorted(cleaned, key=lambda x: (x["province"], x["name"])),
    }
    output_path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=output_path.parent, suffix=".tmp")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as fh:
            json.dump(payload, fh, indent=2, ensure_ascii=False)
        os.replace(tmp, output_path)
    finally:
        if os.path.exists(tmp):
            os.unlink(tmp)
    return {"status": "updated", "count": len(cleaned), "source": TREASURY_API}


if __name__ == "__main__":
    root = Path(__file__).resolve().parents[1]
    offline = os.environ.get("MZANSI_OFFLINE", "0") == "1"
    res = fetch_municipalities(root / "data" / "sa_municipalities_live.json", offline=offline)
    print(json.dumps(res))
