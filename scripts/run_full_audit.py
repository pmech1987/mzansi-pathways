#!/usr/bin/env python3
"""
Mzansi Pathways v46 — Single-Command Production Audit Pipeline
--------------------------------------------------------------
Runs the complete fail-closed release verification chain in order:
  1. Refresh legal open-jobs metadata (scripts/fetch_legal_public_jobs.py)
  2. Run all numbered gates with 3-stage authentication (scripts/verify_release.py)
  3. Independently verify the Stage 4 cryptographic seal (scripts/verify_attestation_seal.py)
"""
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def main() -> int:
    steps = [
        ("Refresh Legal Open Jobs", [sys.executable, "scripts/fetch_legal_public_jobs.py"]),
        ("Run 3-Stage Authenticated Gate Suite", [sys.executable, "scripts/verify_release.py"]),
        ("Independent Stage 4 Seal Verification", [sys.executable, "scripts/verify_attestation_seal.py"]),
    ]
    for label, cmd in steps:
        print(f"--- {label} ---")
        proc = subprocess.run(cmd, cwd=ROOT)
        if proc.returncode != 0:
            print(f"AUDIT FAILED AT: {label} (exit={proc.returncode})")
            return proc.returncode
    print("=== FULL 4-STAGE PRODUCTION AUDIT PASSED ===")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
