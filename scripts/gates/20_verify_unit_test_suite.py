#!/usr/bin/env python3
"""Gate 20: Executes the entire Python unit test suite and fails closed on any error."""
import json, subprocess, sys
from pathlib import Path

def run(root: Path = Path(".")) -> dict:
    r = subprocess.run([sys.executable, "-m", "unittest", "discover", "-s", str(root / "tests"), "-p", "test_*.py"], capture_output=True, text=True)
    return {"gate": "20_unit_test_suite", "passed": r.returncode == 0, "errors": [] if r.returncode == 0 else [r.stderr.strip()[-400:]]}

if __name__ == "__main__":
    r = run(); print(json.dumps(r)); raise SystemExit(0 if r["passed"] else 1)
