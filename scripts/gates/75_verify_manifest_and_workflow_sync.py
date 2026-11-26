#!/usr/bin/env python3
"""Gate 75: Verify GitHub Pages workflow fail-closed verification sequence and manifest theme sync."""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def main():
    errors = []
    wf = (ROOT / ".github" / "workflows" / "deploy-pages.yml").read_text(encoding="utf-8")
    p_rel = wf.find("python3 scripts/verify_release.py")
    p_seal = wf.find("python3 scripts/verify_attestation_seal.py")
    p_jobs = wf.find("python3 scripts/fetch_legal_public_jobs.py")
    p_dep = wf.find("actions/deploy-pages@v4")
    if -1 in (p_rel, p_seal, p_jobs, p_dep):
        errors.append("deploy-pages.yml missing one or more required fail-closed steps")
    elif not (p_rel < p_seal < p_jobs < p_dep):
        errors.append("deploy-pages.yml steps out of fail-closed order")

    mf = json.loads((ROOT / "manifest.json").read_text(encoding="utf-8"))
    if mf.get("theme_color") != "#0f172a":
        errors.append(f"manifest.json theme_color drift: {mf.get('theme_color')}")

    print(json.dumps({"gate": "75_verify_manifest_and_workflow_sync", "passed": len(errors) == 0, "errors": errors}))
    sys.exit(0 if not errors else 1)


if __name__ == "__main__":
    main()
