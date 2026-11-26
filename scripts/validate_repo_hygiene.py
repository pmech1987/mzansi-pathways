#!/usr/bin/env python3
"""Validates required GitHub repository governance, security, and CI hygiene files."""
import json
from pathlib import Path

REQUIRED_FILES = [
    "README.md",
    "LICENSE",
    "SECURITY.md",
    "CONTRIBUTING.md",
    ".gitignore",
    ".github/CODEOWNERS",
    ".github/ISSUE_TEMPLATE/prospectus_update.md",
    ".github/PULL_REQUEST_TEMPLATE.md",
    ".github/workflows/verify-pathways.yml",
    ".github/workflows/deploy-pages.yml",
]


def check_repo_hygiene(root: Path) -> dict:
    missing = []
    for rel in REQUIRED_FILES:
        fp = root / rel
        if not fp.exists() or len(fp.read_text(encoding="utf-8").strip()) < 5:
            missing.append(rel)
    return {"passed": len(missing) == 0, "missing": missing, "checked": len(REQUIRED_FILES)}


if __name__ == "__main__":
    print(json.dumps(check_repo_hygiene(Path(".")), indent=2))
