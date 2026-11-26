#!/usr/bin/env python3
"""Gate 42: Verify GitHub governance files, templates, CODEOWNERS, and gated Pages deployment workflow."""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))
import validate_repo_hygiene as vrh


def main() -> int:
    res = vrh.check_repo_hygiene(ROOT)
    errors = [f"Missing or empty GitHub file: {m}" for m in res["missing"]]
    dp = ROOT / ".github" / "workflows" / "deploy-pages.yml"
    if dp.exists():
        txt = dp.read_text(encoding="utf-8")
        if "verify_release.py" not in txt:
            errors.append("deploy-pages.yml must run scripts/verify_release.py before deploying")
        if "pages: write" not in txt:
            errors.append("deploy-pages.yml missing scoped pages: write permission")
    print(json.dumps({"gate": "42_verify_github_governance_and_pages_ci", "passed": len(errors) == 0, "errors": errors}))
    return 0 if not errors else 1


if __name__ == "__main__":
    raise SystemExit(main())
