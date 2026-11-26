#!/usr/bin/env python3
"""Gate 32: Verifies all core docs exist, are non-empty, and contain zero TBD/TODO placeholders."""
import json
from pathlib import Path

REQUIRED_DOCS = [
    "README.md",
    "docs/PRODUCT_SPEC_V2.md",
    "docs/ARCHITECTURE_SECURITY_AUTH_V3.md",
    "docs/MASTER_OPERATIONS_AND_SECURITY_V4.md",
    "docs/FAILSAFE_AND_RESILIENCE_SPEC_V5.md",
    "docs/RELEASE_AND_DATA_RUNBOOK_V6.md",
    "docs/SHARED_DEVICE_PRIVACY_AND_POPIA_V7.md",
    "docs/ACCESSIBILITY_AND_FAMILY_GUIDE_V8.md",
    "docs/OFFLINE_AND_LOW_DATA_PLAYBOOK_V9.md",
    "docs/CAREER_BRIDGE_AND_CONTRAST_V10.md",
    "docs/WHATIF_AND_MULTI_SUBJECT_PLANNER_V11.md",
]


def run(root: Path = Path(".")) -> dict:
    errors = []
    for rel in REQUIRED_DOCS:
        p = root / rel
        if not p.exists():
            errors.append(f"Missing required doc: {rel}")
            continue
        txt = p.read_text(encoding="utf-8", errors="replace")
        if len(txt.strip()) < 80:
            errors.append(f"Doc too short / incomplete: {rel}")
        if "TODO" in txt or "TBD" in txt:
            errors.append(f"Placeholder TODO/TBD found in {rel}")
    return {"gate": "32_docs_completeness", "passed": not errors, "errors": errors}


if __name__ == "__main__":
    r = run(); print(json.dumps(r)); raise SystemExit(0 if r["passed"] else 1)
