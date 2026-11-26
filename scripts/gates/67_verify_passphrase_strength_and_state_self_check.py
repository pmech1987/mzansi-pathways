#!/usr/bin/env python3
"""Gate 67: Verify live AES-256 passphrase strength meter in Sync modal and on-demand local state integrity check in Settings."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def main() -> int:
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    errors = []
    for token in ['id="enc-pass-strength"', "function checkPassphraseStrength(", 'id="verify-local-state-btn"']:
        if token not in html:
            errors.append(f"index.html missing v47 security/integrity feature: {token}")
    print(json.dumps({"gate": "67_verify_passphrase_strength_and_state_self_check", "passed": len(errors) == 0, "errors": errors}))
    return 0 if not errors else 1


if __name__ == "__main__":
    raise SystemExit(main())
