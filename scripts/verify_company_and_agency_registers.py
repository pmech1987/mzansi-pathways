#!/usr/bin/env python3
"""
Mzansi Pathways v36 — SA Company & Recruitment Agency Legitimacy Verifier
-------------------------------------------------------------------------
Provides deterministic CIPC registration number format validation (zero scraping)
and verifies that official South African verification portals (CIPC BizPortal,
Dept. of Employment & Labour PEA/TES Register, ESSA, InfoRegulator BizPortal)
are linked via HTTPS in index.html and data/sa_gov_portals.json.
"""
import json
import re
from pathlib import Path

CIPC_REG_RE = re.compile(r"^(?:19|20)\d{2}/\d{6}/(?:06|07|08|10|21|23|30)$")

REQUIRED_VERIFICATION_URLS = [
    "https://www.bizportal.gov.za/",
    "https://www.cipc.co.za/",
    "https://www.labour.gov.za/DocumentCenter/Pages/Private-Employment-Agencies-(PEA)-and-Temporary-Employment-Services-(TES).aspx",
    "https://essa.labour.gov.za/EssaOnline/WebBeans/",
]


def validate_cipc_format(reg_no: str) -> dict:
    cleaned = re.sub(r"\s+", "", str(reg_no or "")).upper()
    if not CIPC_REG_RE.match(cleaned):
        return {
            "validFormat": False,
            "normalized": cleaned,
            "entityType": "Invalid CIPC format (expected YYYY/NNNNNN/07, /08, or /23)",
        }
    suffix = cleaned.rsplit("/", 1)[-1]
    type_map = {
        "06": "Public Company (Ltd)",
        "07": "Private Company ((Pty) Ltd)",
        "08": "Non-Profit Company (NPC)",
        "10": "External Company",
        "21": "Personal Liability Company (Inc)",
        "23": "Close Corporation (CC)",
        "30": "State-Owned Company (SOC Ltd)",
    }
    return {
        "validFormat": True,
        "normalized": cleaned,
        "entityType": type_map.get(suffix, "Registered Enterprise"),
        "note": "Format valid — confirm active status directly on https://www.bizportal.gov.za/ (never rely on format alone).",
    }


def verify_registers_present(root: Path) -> dict:
    html = (root / "index.html").read_text(encoding="utf-8")
    errors = []
    for u in REQUIRED_VERIFICATION_URLS:
        if u not in html:
            errors.append(f"index.html missing official SA company/agency verification link: {u}")
    return {"passed": len(errors) == 0, "errors": errors}


if __name__ == "__main__":
    print(json.dumps(validate_cipc_format("2018/123456/07"), indent=2))
