#!/usr/bin/env python3
"""Gate 18: Verifies SHA-256 checksums of critical app & data files against integrity_manifest.json."""
import hashlib, json, sys
from pathlib import Path

TRACKED = ["index.html", "manifest.json", "sw.js", "data/programmes_2027.json", "scripts/match_engine.py"]

def write_manifest(root: Path = Path(".")) -> dict:
    digests = {}
    for rel in TRACKED:
        p = root / rel
        if p.exists():
            digests[rel] = hashlib.sha256(p.read_bytes()).hexdigest()
    (root / "integrity_manifest.json").write_text(json.dumps({"schemaVersion": 1, "sha256": digests}, indent=2), encoding="utf-8")
    return digests

def run(root: Path = Path(".")) -> dict:
    mp = root / "integrity_manifest.json"
    if not mp.exists():
        return {"gate": "18_sha256_integrity_manifest", "passed": False, "errors": ["Missing integrity_manifest.json"]}
    expected = json.loads(mp.read_text(encoding="utf-8")).get("sha256") or {}
    errors = []
    for rel, sha in expected.items():
        p = root / rel
        if not p.exists():
            errors.append(f"Tracked file missing: {rel}")
        else:
            actual = hashlib.sha256(p.read_bytes()).hexdigest()
            if actual != sha:
                errors.append(f"SHA-256 MISMATCH on {rel}: expected {sha[:12]}, got {actual[:12]}")
    return {"gate": "18_sha256_integrity_manifest", "passed": not errors, "errors": errors}

if __name__ == "__main__":
    if "--write" in sys.argv:
        print(json.dumps(write_manifest(), indent=2)); raise SystemExit(0)
    r = run(); print(json.dumps(r)); raise SystemExit(0 if r["passed"] else 1)
