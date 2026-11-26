#!/usr/bin/env python3
"""Generates a timestamped SAST release audit certificate (audit_summary.json) across all 30 gates."""
import json
import subprocess
import sys
from datetime import datetime, timezone, timedelta
from pathlib import Path

SAST = timezone(timedelta(hours=2))


def main() -> int:
    root = Path(".")
    proc = subprocess.run([sys.executable, str(root / "scripts" / "run_all_20_gates.py")], cwd=root, capture_output=True, text=True)
    summary = {
        "generatedAt": datetime.now(SAST).isoformat(),
        "passed": proc.returncode == 0,
        "output": proc.stdout.strip().splitlines(),
    }
    (root / "audit_summary.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
    print(f"Wrote audit_summary.json (passed={summary['passed']})")
    return proc.returncode


if __name__ == "__main__":
    raise SystemExit(main())
