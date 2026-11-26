#!/usr/bin/env python3
"""Gate 103: Verify Creator Studio app and v73 modular civic/security/a11y/TTS/trust JS & CSS assets."""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def main():
    errors = []
    for rel in (
        "creator_studio.html",
        "js/core/aps_engine.js",
        "js/ui/civic_badges.js",
        "js/core/tts_hardened.js",
        "js/features/trust_guards.js",
        "js/crypto_backup.js",
        "css/civic_mobile_a11y.css",
    ):
        if not (ROOT / rel).exists():
            errors.append(f"Missing v73 module/asset: {rel}")

    cs = (ROOT / "creator_studio.html").read_text(encoding="utf-8")
    for tok in ("SA_26_UNIS", "programmes_creator_batch.json", "community_jobs_submissions.json", "scrubPii"):
        if tok not in cs:
            errors.append(f"creator_studio.html missing token: {tok}")

    print(json.dumps({"gate": "103_verify_creator_studio_and_civic_modules", "passed": len(errors) == 0, "errors": errors}))
    sys.exit(0 if not errors else 1)


if __name__ == "__main__":
    main()
