"""scripts/dpsa_and_dhet_parser.py — Factual Indexer for Official DPSA Circulars & DHET Registers"""
from __future__ import annotations

import re
from pathlib import Path

POST_HEADER_RE = re.compile(r"\bPOST\s+(\d{1,2}/\d{1,4})\s*[:\-]\s*(.+)")
REF_NO_RE = re.compile(r"\bREF\s*NO\s*[:\-]\s*([A-Z0-9/\-]{3,40})", re.I)
SALARY_RE = re.compile(r"\bSALARY\s*[:\-]\s*(R\s?[\d\s,]+(?:\s*(?:to|-|–)\s*R\s?[\d\s,]+)?(?:\s*per\s*annum)?)", re.I)
CLOSING_RE = re.compile(r"\bCLOSING\s*DATE\s*[:\-]\s*(\d{1,2}\s+[A-Za-z]+\s+\d{4}(?:\s+at\s+\d{2}:\d{2})?)", re.I)
DHET_REG_NO_RE = re.compile(r"\b(19|20)\d{2}/(HE07|HE08|HE10|FE07)/\d{3}\b")


def extract_dpsa_index_from_text(full_text: str, official_url: str, circular_label: str) -> dict:
    """Extracts bare factual metadata (no copied prose, no HR contact PII) from official DPSA text."""
    blocks = re.split(r"(?=\bPOST\s+\d{1,2}/\d{1,4}\s*[:\-])", full_text)
    vacancies = []
    for block in blocks:
        m_post = POST_HEADER_RE.search(block)
        if not m_post:
            continue
        post_no, raw_title = m_post.group(1), m_post.group(2).strip()
        m_ref = REF_NO_RE.search(block)
        m_sal = SALARY_RE.search(block)
        m_close = CLOSING_RE.search(block)
        vacancies.append({
            "postNumber": post_no,
            "title": re.sub(r"\s+", " ", raw_title)[:140],
            "referenceNumber": m_ref.group(1).strip() if m_ref else "Verify in official circular",
            "salary": re.sub(r"\s+", " ", m_sal.group(1)).strip() if m_sal else "See official circular",
            "closingDateText": m_close.group(1).strip() if m_close else "Verify in official circular",
            "circular": circular_label,
            "officialCircularUrl": official_url,
            "z83Requirement": "Mandatory New Z83 form (effective 1 Jan 2021), originally signed & dated; never pay any fee.",
        })
    return {"circular": circular_label, "officialUrl": official_url, "count": len(vacancies), "vacancies": vacancies}


def extract_dpsa_circular_index(pdf_path: Path, official_url: str, circular_label: str) -> dict:
    from pypdf import PdfReader
    reader = PdfReader(str(pdf_path))
    full_text = "\n".join((page.extract_text() or "") for page in reader.pages)
    return extract_dpsa_index_from_text(full_text, official_url, circular_label)


def extract_dhet_register_from_text(pages_text: list[str], register_type: str, register_date: str) -> dict:
    active_regs, cancelled_regs = set(), set()
    in_cancelled = False
    for text in pages_text:
        if re.search(r"SECTION\s*A\s*[:\-]?.*CANCELLED", text, re.I):
            in_cancelled = True
        if re.search(r"SECTION\s*B\s*[:\-]?.*REGISTERED", text, re.I):
            in_cancelled = False
        for m in DHET_REG_NO_RE.finditer(text):
            (cancelled_regs if in_cancelled else active_regs).add(m.group(0))
    return {
        "registerType": register_type,
        "registerDate": register_date,
        "source": "Department of Higher Education and Training (dhet.gov.za)",
        "activeRegistrationNumbers": sorted(active_regs - cancelled_regs),
        "cancelledRegistrationNumbers": sorted(cancelled_regs),
    }


def extract_dhet_private_register(pdf_path: Path, register_type: str, register_date: str) -> dict:
    from pypdf import PdfReader
    reader = PdfReader(str(pdf_path))
    return extract_dhet_register_from_text([(p.extract_text() or "") for p in reader.pages], register_type, register_date)
