#!/usr/bin/env python3
"""Gate 101: Behavioral Node.js execution of tests/test_aps_parity.mjs across all 26 SA public universities."""
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def main():
    errors = []
    proc = subprocess.run(["node", "--test", str(ROOT / "tests" / "test_aps_parity.mjs")], capture_output=True, text=True, timeout=25)
    if proc.returncode != 0:
        errors.append(f"Node APS parity suite failed (rc={proc.returncode}): {proc.stdout[-300:]} {proc.stderr[-300:]}")
    print(json.dumps({"gate": "101_verify_26_uni_aps_engine_node_parity", "passed": len(errors) == 0, "errors": errors}))
    sys.exit(0 if not errors else 1)


if __name__ == "__main__":
    main()
