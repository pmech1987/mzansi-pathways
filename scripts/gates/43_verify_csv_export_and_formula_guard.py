#!/usr/bin/env python3
"""Gate 43: Verify formula-injection-safe CSV route export in frontend and Python CLI."""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))
import export_summary_csv as esc


def main() -> int:
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    errors = []
    for token in ['id="export-routes-csv-btn"', "function csvSafeCell(", "exportMatchedRoutesCsv"]:
        if token not in html:
            errors.append(f"index.html missing CSV export / formula-injection guard: {token}")
    if esc.csv_safe_cell("=CMD|'/C calc'!A0") != "'=CMD|'/C calc'!A0":
        errors.append("export_summary_csv.csv_safe_cell failed to neutralize formula prefix")
    print(json.dumps({"gate": "43_verify_csv_export_and_formula_guard", "passed": len(errors) == 0, "errors": errors}))
    return 0 if not errors else 1


if __name__ == "__main__":
    raise SystemExit(main())
