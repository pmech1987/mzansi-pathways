#!/usr/bin/env python3
"""Gate 107: Verify exact statutory SA PSET counts in data/pset_national_registry.json (26 unis, 50 TVETs, 9 CETs, 21 SETAs)."""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def main():
    errors = []
    p = ROOT / "data" / "pset_national_registry.json"
    if not p.exists():
        errors.append("Missing data/pset_national_registry.json")
    else:
        d = json.loads(p.read_text(encoding="utf-8"))
        if len(d.get("universities", [])) != 26:
            errors.append(f"Expected 26 public universities, got {len(d.get('universities', []))}")
        if len(d.get("tvetColleges", [])) != 50:
            errors.append(f"Expected 50 public TVET colleges, got {len(d.get('tvetColleges', []))}")
        if len(d.get("cetColleges", [])) != 9:
            errors.append(f"Expected 9 provincial CET colleges, got {len(d.get('cetColleges', []))}")
        if len(d.get("setas", [])) != 21:
            errors.append(f"Expected 21 official SETAs, got {len(d.get('setas', []))}")
        provs = {t.get("province") for t in d.get("tvetColleges", [])}
        if len(provs) != 9:
            errors.append(f"Expected TVET coverage across all 9 provinces, got {len(provs)}")

    print(json.dumps({"gate": "107_verify_national_pset_registry_counts", "passed": len(errors) == 0, "errors": errors}))
    sys.exit(0 if not errors else 1)


if __name__ == "__main__":
    main()
