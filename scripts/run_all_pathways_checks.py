#!/usr/bin/env python3
"""Master Verification Gate Orchestrator for Mzansi Pathways."""
import json
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import verify_pathways_integrity as vpi
import data_health_audit as dha


def main() -> int:
    root = Path(".")
    g1 = vpi.audit_pathways(root)
    g2 = dha.audit_data_health(root / "data" / "programmes_2027.json")
    pwa_errors = []
    if not (root / "manifest.json").exists():
        pwa_errors.append("Missing manifest.json")
    for ic in ("icon-192.png", "icon-512.png"):
        p = root / ic
        if not p.exists() or p.read_bytes()[:8] != b"\x89PNG\r\n\x1a\n":
            pwa_errors.append(f"Missing or invalid PNG icon: {ic}")
    sw_chk = subprocess.run(["node", "--check", str(root / "sw.js")], capture_output=True, text=True)
    if sw_chk.returncode != 0:
        pwa_errors.append(f"sw.js syntax error: {sw_chk.stderr[:200]}")
    g3 = {"gate": "pwa_offline_shell", "passed": len(pwa_errors) == 0, "errors": pwa_errors}

    ut = subprocess.run([sys.executable, "-m", "unittest", "discover", "-s", "tests", "-p", "test_*.py"], capture_output=True, text=True)
    g4 = {"gate": "python_unit_tests", "passed": ut.returncode == 0, "errors": [] if ut.returncode == 0 else [ut.stderr[-500:]]}

    gates = [g1, g2, g3, g4]
    for g in gates:
        print(f"[{'PASS' if g['passed'] else 'FAIL'}] {g['gate']} (errors={len(g['errors'])})")
        for e in g["errors"]:
            print("  ERROR:", e)
    ok = all(g["passed"] for g in gates)
    print(f"OVERALL MZANSI PATHWAYS GATE: {'PASSED' if ok else 'BLOCKED'}")
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
