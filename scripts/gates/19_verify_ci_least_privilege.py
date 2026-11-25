#!/usr/bin/env python3
"""Gate 19: Audits GitHub Actions workflows for least-privilege permissions (contents: read)."""
import json
from pathlib import Path

def run(root: Path = Path(".")) -> dict:
    errors = []
    wfs = list((root / ".github" / "workflows").glob("*.yml"))
    if not wfs:
        errors.append("No GitHub Actions workflow found")
    for wf in wfs:
        txt = wf.read_text(encoding="utf-8")
        if "contents: read" not in txt:
            errors.append(f"{wf.name}: missing least-privilege 'contents: read'")
    return {"gate": "19_ci_least_privilege", "passed": not errors, "errors": errors}

if __name__ == "__main__":
    r = run(); print(json.dumps(r)); raise SystemExit(0 if r["passed"] else 1)
