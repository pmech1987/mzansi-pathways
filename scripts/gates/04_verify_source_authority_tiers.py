#!/usr/bin/env python3
"""Gate 04: Validates 5-tier source authority metadata on all versioned programme records."""
import json
from pathlib import Path

def run(root: Path = Path(".")) -> dict:
    errors = []
    dp = root / "data" / "programmes_2027.json"
    if not dp.exists():
        return {"gate": "04_source_authority_tiers", "passed": False, "errors": ["Missing data/programmes_2027.json"]}
    data = json.loads(dp.read_text(encoding="utf-8"))
    for p in data.get("programmes") or []:
        t = p.get("sourceTier")
        if not isinstance(t, int) or t < 1 or t > 5:
            errors.append(f"{p.get('id')}: invalid sourceTier {t!r}")
        if not str(p.get("sourceDoc") or "").strip():
            errors.append(f"{p.get('id')}: missing sourceDoc")
    return {"gate": "04_source_authority_tiers", "passed": not errors, "errors": errors}

if __name__ == "__main__":
    r = run(); print(json.dumps(r)); raise SystemExit(0 if r["passed"] else 1)
