#!/usr/bin/env python3
"""Atomic Data Snapshot & Rollback Helper for data/programmes_2027.json."""
import hashlib
import json
from pathlib import Path


def create_verified_snapshot(data_path: Path, backup_path: Path) -> dict:
    if not data_path.exists():
        raise FileNotFoundError(f"Missing {data_path}")
    raw = data_path.read_bytes()
    parsed = json.loads(raw.decode("utf-8"))
    if not isinstance(parsed.get("programmes"), list):
        raise ValueError("programmes must be a list")
    tmp = backup_path.with_suffix(".tmp")
    tmp.write_bytes(raw)
    tmp.replace(backup_path)
    return {"snapshot": str(backup_path), "sha256": hashlib.sha256(raw).hexdigest(), "count": len(parsed["programmes"])}


if __name__ == "__main__":
    print(json.dumps(create_verified_snapshot(Path("data/programmes_2027.json"), Path("data/programmes_2027.bak.json")), indent=2))
