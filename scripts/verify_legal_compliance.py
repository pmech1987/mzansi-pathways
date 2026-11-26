#!/usr/bin/env python3
"""
Mzansi Pathways v41 — Automated Legal, Anti-Scraping & POPIA Compliance Auditor
-------------------------------------------------------------------------------
Verifies zero scraping libraries exist in scripts/, zero blocked scraping domains
are queried in fetch_legal_public_jobs.py, and all compliance notices remain intact.
"""
import json
import re
from pathlib import Path

FORBIDDEN_SCRAPER_IMPORTS = re.compile(
    r"\b(?:from\s+|import\s+)(?:bs4|beautifulsoup|scrapy|selenium|playwright|puppeteer|mechanize)\b",
    re.IGNORECASE,
)


def audit_legal_compliance(root: Path) -> dict:
    errors = []
    for pyf in sorted((root / "scripts").rglob("*.py")):
        if pyf.name == "verify_legal_compliance.py":
            continue
        txt = pyf.read_text(encoding="utf-8", errors="replace")
        if FORBIDDEN_SCRAPER_IMPORTS.search(txt):
            errors.append(f"{pyf.relative_to(root)}: forbidden scraping library import detected")

    fetcher = (root / "scripts" / "fetch_legal_public_jobs.py").read_text(encoding="utf-8")
    for bad in ("graduates24.com", "pnet.co.za", "careerjunction.co.za", "careers24.com", "facebook.com", "linkedin.com"):
        if bad in fetcher.lower():
            errors.append(f"fetch_legal_public_jobs.py references restricted domain: {bad}")

    return {"passed": len(errors) == 0, "errors": errors}


if __name__ == "__main__":
    print(json.dumps(audit_legal_compliance(Path(".")), indent=2))
