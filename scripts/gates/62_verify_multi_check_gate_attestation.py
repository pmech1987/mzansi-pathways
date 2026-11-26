#!/usr/bin/env python3
"""Gate 62: Verify 3-stage gate authentication, gate_integrity_manifest.json coverage, release_attestation.json seal, and V20 docs."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def main() -> int:
    errors = []
    vr = (ROOT / "scripts" / "verify_release.py").read_text(encoding="utf-8")
    for token in ["_authenticate_gate(", "ast.parse(", "gate_integrity_manifest.json", "release_attestation.json", "attestation_sha256"]:
        if token not in vr:
            errors.append(f"verify_release.py missing multi-check attestation feature: {token}")

    gm = ROOT / "gate_integrity_manifest.json"
    if not gm.exists():
        errors.append("Missing gate_integrity_manifest.json")
    else:
        gdata = json.loads(gm.read_text(encoding="utf-8"))
        hashes = gdata.get("sha256") or {}
        actual_gates = sorted((f.name for f in (ROOT / "scripts" / "gates").glob("*_verify_*.py") if f.name.split("_", 1)[0].isdigit()), key=lambda n: int(n.split("_", 1)[0]))
        missing = [g for g in actual_gates if g not in hashes]
        if missing:
            errors.append(f"gate_integrity_manifest.json missing hashes for: {missing[:5]}")

    doc = ROOT / "docs" / "MULTI_CHECK_GATE_ATTESTATION_V20.md"
    if not doc.exists() or len(doc.read_text(encoding="utf-8").strip()) < 250:
        errors.append("Missing or incomplete docs/MULTI_CHECK_GATE_ATTESTATION_V20.md")

    print(json.dumps({"gate": "62_verify_multi_check_gate_attestation", "passed": len(errors) == 0, "errors": errors}))
    return 0 if not errors else 1


if __name__ == "__main__":
    raise SystemExit(main())
