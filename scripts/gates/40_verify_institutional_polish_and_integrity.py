#!/usr/bin/env python3
"""Gate 40: Verify zero cartoon emojis in index.html, state integrity guard, profile audit, and verify_release.py."""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def main() -> int:
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    me = (ROOT / "scripts" / "match_engine.py").read_text(encoding="utf-8")
    errors = []

    emojis = re.findall(r"[\U0001F300-\U0001FAFF\u2696\u26A0\u26A1\u2705\u2709\u2753\u23F3]", html)
    if emojis:
        errors.append(f"Found {len(emojis)} cartoon emojis in index.html; institutional UI must remain emoji-free.")

    if "function validateStateIntegrity(" not in html:
        errors.append("Missing validateStateIntegrity() failsafe in index.html")

    if "def audit_profile_integrity(" not in me:
        errors.append("Missing audit_profile_integrity() in scripts/match_engine.py")

    if not (ROOT / "scripts" / "verify_release.py").exists():
        errors.append("Missing scripts/verify_release.py")

    print(json.dumps({"gate": "40_verify_institutional_polish_and_integrity", "passed": len(errors) == 0, "errors": errors}))
    return 0 if not errors else 1


if __name__ == "__main__":
    raise SystemExit(main())
