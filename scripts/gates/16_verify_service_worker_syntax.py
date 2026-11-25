#!/usr/bin/env python3
"""Gate 16: Verifies sw.js offline service worker passes Node syntax check."""
import json, subprocess
from pathlib import Path

def run(root: Path = Path(".")) -> dict:
    sw = root / "sw.js"
    if not sw.exists():
        return {"gate": "16_service_worker_syntax", "passed": False, "errors": ["Missing sw.js"]}
    r = subprocess.run(["node", "--check", str(sw)], capture_output=True, text=True)
    return {"gate": "16_service_worker_syntax", "passed": r.returncode == 0, "errors": [] if r.returncode == 0 else [r.stderr.strip()[:200]]}

if __name__ == "__main__":
    r = run(); print(json.dumps(r)); raise SystemExit(0 if r["passed"] else 1)
