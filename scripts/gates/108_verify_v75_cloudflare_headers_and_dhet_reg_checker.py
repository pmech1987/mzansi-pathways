#!/usr/bin/env python3
"""Gate 108: Verify hardened Cloudflare _headers, Cloudflare workflow, offline DHET reg checker, and sw.js v75."""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def main():
    errors = []
    hdr = (ROOT / "_headers").read_text(encoding="utf-8")
    for tok in ("'wasm-unsafe-eval'", "frame-ancestors 'none'", "/vendor/*", "immutable"):
        if tok not in hdr:
            errors.append(f"_headers missing hardened directive: {tok}")

    cf_wf = ROOT / ".github" / "workflows" / "deploy-cloudflare-pages.yml"
    if not cf_wf.exists() or "pages deploy" not in cf_wf.read_text(encoding="utf-8"):
        errors.append("Missing Cloudflare Pages workflow (.github/workflows/deploy-cloudflare-pages.yml)")

    html = (ROOT / "index.html").read_text(encoding="utf-8")
    if 'id="dhet-reg-check-input"' not in html or "Gazette 49518" not in html:
        errors.append("index.html missing offline DHET registration checker or Gazette 49518 N1-N3 warning")

    sw = (ROOT / "sw.js").read_text(encoding="utf-8")
    if "mzansi-pathways-v" not in sw or "./data/pset_national_registry.json" not in sw:
        errors.append("sw.js missing mzansi-pathways-v75 or ./data/pset_national_registry.json")

    print(json.dumps({"gate": "108_verify_v75_cloudflare_headers_and_dhet_reg_checker", "passed": len(errors) == 0, "errors": errors}))
    sys.exit(0 if not errors else 1)


if __name__ == "__main__":
    main()
