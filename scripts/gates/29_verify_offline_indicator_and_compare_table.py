#!/usr/bin/env python3
"""Gate 29: Verifies Offline Status Indicator, Side-by-Side Route Compare & Family Dossier Export."""
import json
from pathlib import Path


def run(root: Path = Path(".")) -> dict:
    errors = []
    txt = (root / "index.html").read_text(encoding="utf-8", errors="replace")
    for label, marker in [
        ("Offline connection pill", 'id="net-pill"'),
        ("Side-by-side route comparator", "compareRouteIds"),
        ("Family Dossier exporter", "function buildFamilyDossier("),
    ]:
        if marker not in txt:
            errors.append(f"index.html: missing {label} ({marker})")
    rav = (root / "scripts" / "run_all_20_gates.py").read_text(encoding="utf-8")
    if "timeout=30" not in rav:
        errors.append("run_all_20_gates.py: missing 30s subprocess timeout failsafe")
    return {"gate": "29_offline_indicator_and_compare_table", "passed": not errors, "errors": errors}


if __name__ == "__main__":
    r = run(); print(json.dumps(r)); raise SystemExit(0 if r["passed"] else 1)
