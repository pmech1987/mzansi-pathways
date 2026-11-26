#!/usr/bin/env python3
"""Gate 53: Verify isolated Dark Mode CSS & mutual exclusion with High Contrast, Z83 checklist, and official SA government portals directory."""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))
import verify_gov_portals as vgp


def main() -> int:
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    errors = []

    for token in [
        "body.dark-mode .bg-blue-50",
        "body.dark-mode .bg-emerald-50",
        "body.dark-mode .bg-amber-50",
        'id="gov-portal-directory"',
        'id="z83-checklist-card"',
        "if (state.darkMode) state.highContrast = false;",
    ]:
        if token not in html:
            errors.append(f"index.html missing v33 dark-mode isolation or SA gov directory feature: {token}")

    gp = vgp.verify_gov_portals(ROOT / "data" / "sa_gov_portals.json")
    errors.extend(gp.get("errors") or [])

    print(json.dumps({"gate": "53_verify_dark_mode_isolation_and_sa_gov_directory", "passed": len(errors) == 0, "errors": errors}))
    return 0 if not errors else 1


if __name__ == "__main__":
    raise SystemExit(main())
