#!/usr/bin/env python3
"""Master Orchestrator: Runs all 20 verification, authentication, security, legal, and integrity gates."""
import json
import subprocess
import sys
from pathlib import Path


def main() -> int:
    root = Path(".")
    gate_files = sorted((root / "scripts" / "gates").glob("[0-9][0-9]_verify_*.py"))
    results = []
    for gf in gate_files:
        proc = subprocess.run([sys.executable, str(gf)], cwd=root, capture_output=True, text=True)
        try:
            res = json.loads(proc.stdout.strip().splitlines()[-1])
        except Exception:
            res = {"gate": gf.stem, "passed": proc.returncode == 0, "errors": [proc.stderr.strip()[:300]]}
        results.append(res)
        tag = "PASS" if res.get("passed") else "FAIL"
        print(f"[{tag}] {res.get('gate')} (errors={len(res.get('errors') or [])})")
        for e in res.get("errors") or []:
            print(f"   ERROR: {e}")

    passed_n = sum(1 for r in results if r.get("passed"))
    total_n = len(results)
    print(f"=== 20-GATE SUITE RESULT: {passed_n}/{total_n} PASSED ===")
    return 0 if passed_n == total_n and total_n == 20 else 1


if __name__ == "__main__":
    raise SystemExit(main())
