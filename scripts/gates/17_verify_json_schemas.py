#!/usr/bin/env python3
"""Gate 17: Parses every JSON file in the repository to prevent broken configs/data."""
import json
from pathlib import Path

def run(root: Path = Path(".")) -> dict:
    errors = []
    for jf in list(root.glob("*.json")) + list((root / "data").glob("*.json")):
        try:
            json.loads(jf.read_text(encoding="utf-8"))
        except Exception as exc:
            errors.append(f"{jf.name}: invalid JSON ({exc})")
    return {"gate": "17_json_schemas", "passed": not errors, "errors": errors}

if __name__ == "__main__":
    r = run(); print(json.dumps(r)); raise SystemExit(0 if r["passed"] else 1)
