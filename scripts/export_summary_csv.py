#!/usr/bin/env python3
"""
Mzansi Pathways — Formula-Injection-Safe CSV Summary Exporter
-------------------------------------------------------------
Exports programme rules and verification metadata to CSV while neutralizing
spreadsheet formula-injection prefixes (=, +, -, @, tab, CR) so schools and
counselors can safely open exports in Excel or Google Sheets.
"""
import csv
import json
from pathlib import Path
from typing import Iterable

DANGEROUS_PREFIXES = ("=", "+", "-", "@", "\t", "\r")


def csv_safe_cell(val) -> str:
    s = "" if val is None else str(val)
    if s and s[0] in DANGEROUS_PREFIXES:
        return "'" + s
    return s


def export_programmes_csv(json_path: Path, out_csv: Path) -> int:
    data = json.loads(json_path.read_text(encoding="utf-8"))
    progs: Iterable[dict] = data.get("programmes") or []
    headers = ["id", "name", "institution", "intakeYear", "sourceTier", "verificationStatus", "minAps", "minMaths", "lastVerifiedAt"]
    count = 0
    with out_csv.open("w", newline="", encoding="utf-8") as fh:
        writer = csv.writer(fh)
        writer.writerow(headers)
        for p in progs:
            writer.writerow([csv_safe_cell(p.get(h, "")) for h in headers])
            count += 1
    return count


if __name__ == "__main__":
    root = Path(__file__).resolve().parent.parent
    n = export_programmes_csv(root / "data" / "programmes_2027.json", root / "programmes_summary.csv")
    print(f"Exported {n} rows safely.")
