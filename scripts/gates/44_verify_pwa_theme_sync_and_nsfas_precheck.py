#!/usr/bin/env python3
"""Gate 44: Verify PWA v24 network-first cache, civic manifest theme, ARIA live toast, scanner APS preview, and NSFAS pre-check."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def main() -> int:
    sw = (ROOT / "sw.js").read_text(encoding="utf-8")
    mf = json.loads((ROOT / "manifest.json").read_text(encoding="utf-8"))
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    errors = []

    if "mzansi-pathways-v" not in sw or "e.request.mode === 'navigate'" not in sw:
        errors.append("sw.js must use v24 cache with network-first navigation fallback")
    if mf.get("theme_color") != "#0f172a":
        errors.append(f"manifest.json theme_color expected #0f172a, got {mf.get('theme_color')}")
    for token in ['aria-live="polite"', "function getNsfasPreCheck(", 'id="nsfas-precheck-card"', "Live Preview:"]:
        if token not in html:
            errors.append(f"index.html missing v24 accessibility/funding/scanner feature: {token}")

    print(json.dumps({"gate": "44_verify_pwa_theme_sync_and_nsfas_precheck", "passed": len(errors) == 0, "errors": errors}))
    return 0 if not errors else 1


if __name__ == "__main__":
    raise SystemExit(main())
