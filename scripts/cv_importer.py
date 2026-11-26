#!/usr/bin/env python3
"""
Mzansi Pathways v28 — Deterministic On-Device Previous CV Parser
----------------------------------------------------------------
Extracts candidate contact details (SA phone +27/0xx, email, name heuristic),
real skills/tools, and experience snippets from plain-text or OCR-extracted
previous CVs without fabricating metrics or uploading files to external servers.
"""
import re
from typing import Dict, List

KNOWN_SKILLS = [
    "Windows", "Linux", "Microsoft Excel", "Excel", "Microsoft Word", "Microsoft 365",
    "Active Directory", "Networking", "TCP/IP", "VLAN", "Packet Tracer", "Python",
    "JavaScript", "SQL", "Git", "HTML", "CSS", "Troubleshooting", "Help Desk",
    "Diesel", "Hydraulics", "Pneumatics", "Welding", "AutoCAD", "OHS", "Lockout",
    "Accounting", "Bookkeeping", "Z83", "POPIA", "Customer Service", "Data Capturing",
    "Forklift", "First Aid", "Driving Licence", "Code 10", "Code 8",
]

EMAIL_RE = re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b")
SA_PHONE_RE = re.compile(r"(?:\+27|0)\s?[6-8]\d[\s-]?\d{3}[\s-]?\d{4}\b")


def parse_previous_cv_text(raw_text: str) -> Dict[str, object]:
    if not isinstance(raw_text, str) or not raw_text.strip():
        return {
            "name": "",
            "email": "",
            "phone": "",
            "skills": [],
            "evidenceSnippets": [],
            "warnings": ["Empty CV text provided."],
            "needsConfirmation": True,
        }

    cleaned = re.sub(r"<[^>]+>", "\n", raw_text)
    lines = [ln.strip(" \t•-*") for ln in cleaned.splitlines() if ln.strip(" \t•-*")][:120]

    email_m = EMAIL_RE.search(cleaned)
    phone_m = SA_PHONE_RE.search(cleaned)
    email = email_m.group(0) if email_m else ""
    phone = re.sub(r"\s+", " ", phone_m.group(0)).strip() if phone_m else ""

    name = ""
    skip_words = ("curriculum vitae", "resume", "cv", "contact", "profile", "summary", "personal details")
    for ln in lines[:8]:
        low = ln.lower()
        if any(w in low for w in skip_words) or "@" in ln or re.search(r"\d{4,}", ln):
            continue
        if 2 <= len(ln.split()) <= 4 and len(ln) <= 48:
            name = ln
            break

    low_all = cleaned.lower()
    skills: List[str] = []
    for sk in KNOWN_SKILLS:
        if re.search(r"\b" + re.escape(sk.lower()) + r"\b", low_all):
            if sk not in skills:
                skills.append(sk)

    action_re = re.compile(r"\b(?:installed|configured|repaired|maintained|managed|assisted|supported|built|developed|captured|prepared|diagnosed|wired|tested|operated|trained)\b", re.IGNORECASE)
    snippets: List[str] = []
    for ln in lines:
        if len(ln) >= 24 and len(ln) <= 220 and action_re.search(ln):
            if ln not in snippets:
                snippets.append(ln)
        if len(snippets) >= 6:
            break

    warnings: List[str] = []
    if not skills and not snippets:
        warnings.append("No standard skills or action bullets matched; review and add your real tasks manually.")

    edu_re = re.compile(r"\b(?:nsc|matric|nqf|tvet|diploma|degree|bsc|bcom|beng|higher certificate|n2|n3|n4|n5|n6|national senior certificate)\b", re.IGNORECASE)
    qualifications: List[str] = []
    for ln in lines:
        if 8 <= len(ln) <= 160 and edu_re.search(ln) and ln not in qualifications:
            qualifications.append(ln)
        if len(qualifications) >= 4:
            break

    return {
        "name": name,
        "email": email,
        "phone": phone,
        "skills": skills[:12],
        "qualifications": qualifications,
        "evidenceSnippets": snippets,
        "warnings": warnings,
        "needsConfirmation": True,
    }


if __name__ == "__main__":
    import json
    sample = "Thabo Mokoena\n082 555 0194 | thabo.m@example.co.za\nSkills: Windows, Excel, Packet Tracer, Networking\n- Installed and configured office Wi-Fi routers and Windows 11 laptops for local learners."
    print(json.dumps(parse_previous_cv_text(sample), indent=2))
