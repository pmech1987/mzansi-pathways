#!/usr/bin/env python3
"""Gate 106: Verify automated pipeline wired in deploy-pages.yml, National Treasury 257-muni fetcher, and sw.js v74."""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def main():
    errors = []
    wf = (ROOT / ".github" / "workflows" / "deploy-pages.yml").read_text(encoding="utf-8")
    if "scripts/run_legal_automation_pipeline.py" not in wf:
        errors.append("deploy-pages.yml not invoking scripts/run_legal_automation_pipeline.py")

    muni_script = ROOT / "scripts" / "fetch_sa_municipalities.py"
    if not muni_script.exists() or "municipaldata.treasury.gov.za" not in muni_script.read_text(encoding="utf-8"):
        errors.append("Missing National Treasury open API municipality fetcher")

    sw = (ROOT / "sw.js").read_text(encoding="utf-8")
    if "mzansi-pathways-v" not in sw:
        errors.append("sw.js missing mzansi-pathways-v74 cache version")

    print(json.dumps({"gate": "106_verify_v74_automation_workflows_and_sw", "passed": len(errors) == 0, "errors": errors}))
    sys.exit(0 if not errors else 1)


if __name__ == "__main__":
    main()
