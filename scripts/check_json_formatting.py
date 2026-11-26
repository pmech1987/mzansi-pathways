#!/usr/bin/env python3
"""Validates every JSON file in the Mzansi Pathways repository for strict UTF-8 syntax integrity."""
import json
from pathlib import Path


def lint_all_json(root: Path) -> dict:
    errors = []
    checked = 0
    for jf in sorted(root.rglob("*.json")):
        if "__pycache__" in jf.parts:
            continue
        checked += 1
        try:
            json.loads(jf.read_text(encoding="utf-8"))
        except Exception as exc:
            errors.append(f"{jf.relative_to(root)}: invalid JSON ({exc})")
    return {"passed": len(errors) == 0, "checkedFiles": checked, "errors": errors}


if __name__ == "__main__":
    print(json.dumps(lint_all_json(Path(".")), indent=2))
