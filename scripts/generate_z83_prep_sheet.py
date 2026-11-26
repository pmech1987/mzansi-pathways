#!/usr/bin/env python3
"""
Mzansi Pathways v34 — POPIA-Safe Z83 Public Service Prep Sheet Generator
------------------------------------------------------------------------
Generates a plain-text reference sheet to help South African applicants copy
verified personal/academic details accurately onto the official DPSA Z83 form.
Never requests or stores South African ID numbers.
"""
from typing import Dict, List


def build_z83_prep_text(profile: Dict[str, object]) -> str:
    name = str(profile.get("name") or "(Enter your full legal name on the official Z83)").strip()
    province = str(profile.get("province") or "South Africa").strip()
    phone = str(profile.get("phone") or "(Add phone number)").strip()
    email = str(profile.get("email") or "(Add email address)").strip()
    role = str(profile.get("targetRole") or "(Copy exact post title from DPSA circular)").strip()
    quals: List[str] = [str(q).strip() for q in (profile.get("qualifications") or []) if str(q).strip()]

    lines = [
        "MZANSI PATHWAYS — Z83 GOVERNMENT APPLICATION PREP SHEET",
        "Official Form Source: https://www.gov.za/about-government/government-jobs",
        "NOTE: Never store your SA ID number here; write it directly on the official Z83 form.",
        "",
        "PART A — ADVERTISED POST",
        f"  Position Applied For: {role}",
        "  Department / Municipality: (Copy exact name from circular)",
        "  Reference Number: (Copy exact Ref No. from circular)",
        "",
        "PART B — PERSONAL & CONTACT DETAILS",
        f"  Full Name: {name}",
        f"  Province: {province}",
        f"  Phone: {phone}",
        f"  Email: {email}",
        "",
        "PART E — QUALIFICATIONS",
    ]
    if quals:
        for q in quals:
            lines.append(f"  - {q}")
    else:
        lines.append("  - National Senior Certificate (Matric) / Highest completed NQF qualification")
    lines.extend([
        "",
        "FINAL CHECKLIST BEFORE SUBMITTING",
        "  [ ] Initial every page of the official Z83 form",
        "  [ ] Sign and date the Declaration on the last page",
        "  [ ] Attach your clean single-column Evidence CV (zero fees ever required)",
    ])
    return "\n".join(lines) + "\n"


if __name__ == "__main__":
    print(build_z83_prep_text({"name": "Thabo Mokoena", "province": "Mpumalanga", "qualifications": ["NSC (Bachelor's Pass)"]}))
