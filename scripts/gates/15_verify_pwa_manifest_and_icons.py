#!/usr/bin/env python3
"""Gate 15: Validates manifest.json and verifies 192px & 512px PNG binary signatures."""
import json
from pathlib import Path

def run(root: Path = Path(".")) -> dict:
    errors = []
    mp = root / "manifest.json"
    if not mp.exists():
        return {"gate": "15_pwa_manifest_and_icons", "passed": False, "errors": ["Missing manifest.json"]}
    m = json.loads(mp.read_text(encoding="utf-8"))
    for k in ("name", "short_name", "start_url", "display", "icons"):
        if not m.get(k):
            errors.append(f"manifest.json missing {k}")
    for ic in ("icon-192.png", "icon-512.png"):
        p = root / ic
        if not p.exists() or p.read_bytes()[:8] != b"\x89PNG\r\n\x1a\n":
            errors.append(f"Missing or invalid PNG: {ic}")
    return {"gate": "15_pwa_manifest_and_icons", "passed": not errors, "errors": errors}

if __name__ == "__main__":
    r = run(); print(json.dumps(r)); raise SystemExit(0 if r["passed"] else 1)
