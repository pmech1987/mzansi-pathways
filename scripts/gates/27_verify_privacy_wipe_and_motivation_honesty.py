#!/usr/bin/env python3
"""Gate 27: Verifies shared-device Privacy Wipe button & honest Motivation Letter builder."""
import json
from pathlib import Path


def run(root: Path = Path(".")) -> dict:
    errors = []
    txt = (root / "index.html").read_text(encoding="utf-8", errors="replace")
    for label, marker in [
        ("Shared-device Privacy Wipe", "function wipeLocalProfile("),
        ("Honest Motivation Letter Builder", "function buildHonestMotivationLetter("),
        ("Live Results Route Summary Badges", "data-quick-route="),
    ]:
        if marker not in txt:
            errors.append(f"index.html: missing {label} ({marker})")
    return {"gate": "27_privacy_wipe_and_motivation_honesty", "passed": not errors, "errors": errors}


if __name__ == "__main__":
    r = run(); print(json.dumps(r)); raise SystemExit(0 if r["passed"] else 1)
