#!/usr/bin/env python3
"""Gate 33: Verify Image-to-Result scanner UI, OOM canvas guard, and Python/JS SA statement parsers."""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def main() -> int:
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    errors = []
    for token in [
        'id="scan-results-btn"',
        'id="image-scanner-panel"',
        'id="scan-canvas"',
        'id="scan-image-input"',
        'id="scan-detect-btn"',
        'id="scan-parse-btn"',
        'id="scan-apply-btn"',
        "parseStatementText",
        "URL.revokeObjectURL",
        "maxW = 1400",
    ]:
        if token not in html:
            errors.append(f"Missing Image-to-Result scanner element or failsafe: {token}")

    py_parser = ROOT / "scripts" / "statement_parser.py"
    if not py_parser.exists():
        errors.append("Missing scripts/statement_parser.py")
    else:
        ptxt = py_parser.read_text(encoding="utf-8")
        if "def parse_statement_text(" not in ptxt or "needsConfirmation" not in ptxt:
            errors.append("statement_parser.py missing parse_statement_text or needsConfirmation guard")

    out = {"gate": "33_verify_image_to_result_scanner", "passed": len(errors) == 0, "errors": errors}
    print(json.dumps(out))
    return 0 if not errors else 1


if __name__ == "__main__":
    raise SystemExit(main())
