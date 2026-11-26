#!/usr/bin/env python3
"""
Mzansi Pathways v43 — Independent Cryptographic Release Attestation Verifier (Stage 4)
--------------------------------------------------------------------------------------
Independently re-verifies every tracked file in integrity_manifest.json, every gate
file in gate_integrity_manifest.json, and the combined SHA-256 seal in
release_attestation.json without relying on verify_release.py.
"""
import hashlib
import json
import sys
from pathlib import Path


def _sha256(p: Path) -> str:
    return hashlib.sha256(p.read_bytes()).hexdigest()


def verify_seal(root: Path) -> dict:
    errors = []
    im_p = root / "integrity_manifest.json"
    gm_p = root / "gate_integrity_manifest.json"
    att_p = root / "release_attestation.json"

    for fp in (im_p, gm_p, att_p):
        if not fp.exists():
            errors.append(f"Missing required attestation file: {fp.name}")
    if errors:
        return {"passed": False, "errors": errors}

    im = json.loads(im_p.read_text(encoding="utf-8"))
    gm = json.loads(gm_p.read_text(encoding="utf-8"))
    att = json.loads(att_p.read_text(encoding="utf-8"))

    for rel, exp in (im.get("sha256") or {}).items():
        fp = root / rel
        if not fp.exists() or _sha256(fp) != exp:
            errors.append(f"Tracked file digest mismatch: {rel}")

    for gname, exp in (gm.get("sha256") or {}).items():
        fp = root / "scripts" / "gates" / gname
        if not fp.exists() or _sha256(fp) != exp:
            errors.append(f"Gate file digest mismatch: {gname}")

    im_hash = _sha256(im_p)
    gm_hash = _sha256(gm_p)
    total_n = att.get("gate_count", 0)
    all_ok = bool(att.get("all_passed"))
    expected_seal = hashlib.sha256(f"{total_n}|{total_n}|{all_ok}|{im_hash}|{gm_hash}".encode("utf-8")).hexdigest()

    if not all_ok:
        errors.append("release_attestation.json reports all_passed=False")
    if att.get("integrity_manifest_sha256") != im_hash:
        errors.append("integrity_manifest_sha256 mismatch in release_attestation.json")
    if att.get("gate_integrity_manifest_sha256") != gm_hash:
        errors.append("gate_integrity_manifest_sha256 mismatch in release_attestation.json")
    if att.get("attestation_sha256") != expected_seal:
        errors.append("attestation_sha256 cryptographic seal mismatch")

    return {"passed": len(errors) == 0, "seal": expected_seal[:16], "errors": errors}


if __name__ == "__main__":
    res = verify_seal(Path("."))
    print(json.dumps(res, indent=2))
    raise SystemExit(0 if res["passed"] else 1)
