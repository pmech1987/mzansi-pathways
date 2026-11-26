#!/usr/bin/env python3
"""Gate 36: Verify symbol/level parser fallback, scanner zoom, and safeSpeech failsafe."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def main() -> int:
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    sp = (ROOT / "scripts" / "statement_parser.py").read_text(encoding="utf-8")
    errors = []
    for token in ["safeSpeech(", 'id="scan-zoom-btn"', "symMap"]:
        if token not in html:
            errors.append(f"Missing v17 speech/zoom/symbol token in index.html: {token}")
    if "sym_map" not in sp or "lvl_mid" not in sp:
        errors.append("Missing symbol/level fallback in scripts/statement_parser.py")

    print(json.dumps({"gate": "36_verify_symbol_fallback_and_safe_speech", "passed": len(errors) == 0, "errors": errors}))
    return 0 if not errors else 1


if __name__ == "__main__":
    raise SystemExit(main())
