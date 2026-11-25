#!/usr/bin/env python3
"""Verification Gate for Mzansi Pathways v2: checks security, explainability, CAS & anti-scam notices."""
import json
import re
from pathlib import Path

UNSAFE = [
    ("Blocking alert()", re.compile(r"\b(?:window\.)?alert\s*\(")),
    ("Blocking confirm()", re.compile(r"\b(?:window\.)?confirm\s*\(")),
    ("Blocking prompt()", re.compile(r"(?:\bwindow\.prompt|(?<![.\w])prompt)\s*\(")),
    ("Leaked API key", re.compile(r"AIza[0-9A-Za-z_-]{35}")),
]


def audit_pathways(root: Path = Path(".")) -> dict:
    errors = []
    idx = root / "index.html"
    if not idx.exists():
        errors.append("Missing index.html")
    else:
        txt = idx.read_text(encoding="utf-8", errors="replace")
        for label, rx in UNSAFE:
            if rx.search(txt):
                errors.append(f"index.html: {label}")
        low = txt.lower()
        for label, needle in [
            ("Official CAS WhatsApp (081 308 4196)", "081 308 4196"),
            ("Anti-scam warning", "never pay"),
            ("What-If simulator", "what-if"),
            ("Parent/Guardian View", "parent"),
            ("Plan A / B / C Decision Board", "plan a"),
            ("Evidence-based Interview Coach", "interview"),
        ]:
            if needle not in low:
                errors.append(f"index.html: missing {label}")
    return {"gate": "pathways_v2_integrity", "passed": len(errors) == 0, "errors": errors}


if __name__ == "__main__":
    res = audit_pathways(Path("."))
    print(json.dumps(res, indent=2))
    raise SystemExit(0 if res["passed"] else 1)
