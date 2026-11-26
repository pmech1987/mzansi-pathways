#!/usr/bin/env python3
"""scripts/autonomous_ops.py — SAST Expiry Rollover & Cryptographic SHA-384 SRI Manifest"""
from __future__ import annotations

import base64
import datetime as dt
import hashlib
import json
import re
from pathlib import Path
from zoneinfo import ZoneInfo

SAST = ZoneInfo("Africa/Johannesburg")


def sha384_sri(file_path: Path) -> str:
    digest = hashlib.sha384(file_path.read_bytes()).digest()
    return f"sha384-{base64.b64encode(digest).decode('ascii')}"


def archive_expired_records(feed_path: Path, archive_path: Path, date_field: str = "closes", today_sast: str = "") -> dict:
    if not feed_path.exists():
        return {"active": 0, "archivedNow": 0}
    today = today_sast or dt.datetime.now(SAST).date().isoformat()
    data = json.loads(feed_path.read_text(encoding="utf-8"))
    items = data.get("items", [])
    active, expired = [], []
    for item in items:
        close_iso = str(item.get(date_field) or "")
        if re.fullmatch(r"\d{4}-\d{2}-\d{2}", close_iso) and close_iso < today:
            item["archivedAtSast"] = today
            expired.append(item)
        else:
            active.append(item)
    if expired:
        existing = json.loads(archive_path.read_text(encoding="utf-8")).get("items", []) if archive_path.exists() else []
        merged = {r.get("id", json.dumps(r, sort_keys=True)): r for r in existing + expired}
        archive_path.write_text(json.dumps({"updatedAtSast": today, "items": list(merged.values())}, indent=2) + "\n", encoding="utf-8")
        data["items"] = active
        data["count"] = len(active)
        feed_path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return {"active": len(active), "archivedNow": len(expired)}


def build_sri_manifest(root: Path) -> dict:
    tracked = sorted(
        list((root / "js").rglob("*.js"))
        + list((root / "css").rglob("*.css"))
    )
    assets = {}
    combined = hashlib.sha256()
    for path in tracked:
        rel = path.relative_to(root).as_posix()
        sri = sha384_sri(path)
        assets[rel] = {"sri": sri, "bytes": path.stat().st_size}
        combined.update(f"{rel}:{sri}\n".encode("utf-8"))
    manifest = {
        "schemaVersion": 1,
        "generatedAtSAST": dt.datetime.now(SAST).isoformat(),
        "buildTag": combined.hexdigest()[:12],
        "assetCount": len(assets),
        "assets": assets,
    }
    (root / "data" / "sri_manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    return manifest


if __name__ == "__main__":
    repo = Path(__file__).resolve().parents[1]
    res = build_sri_manifest(repo)
    print(f"Built data/sri_manifest.json (assets={res['assetCount']}, tag={res['buildTag']})")
