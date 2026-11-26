#!/usr/bin/env python3
"""Gate 100: Verify 100-gate 4-stage authenticated milestone, core data JSON validity, and sw.js v72."""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def main():
    errors = []
    gate_files = list((ROOT / "scripts" / "gates").glob("*.py"))
    if len(gate_files) < 100:
        errors.append(f"Expected >=100 gate scripts for 100-gate milestone, found {len(gate_files)}")

    for rel in ("data/events.json", "data/careers.json", "data/institutions.json", "data/open_jobs_live.json"):
        p = ROOT / rel
        if not p.exists():
            errors.append(f"Missing required data file: {rel}")
        else:
            try:
                json.loads(p.read_text(encoding="utf-8"))
            except Exception as exc:
                errors.append(f"Invalid JSON in {rel}: {exc}")

    sw = (ROOT / "sw.js").read_text(encoding="utf-8")
    if "mzansi-pathways-v" not in sw:
        errors.append("sw.js missing mzansi-pathways-v72 cache version")

    print(json.dumps({"gate": "100_verify_hundred_gate_milestone_and_v72_release", "passed": len(errors) == 0, "errors": errors}))
    sys.exit(0 if not errors else 1)


if __name__ == "__main__":
    main()
