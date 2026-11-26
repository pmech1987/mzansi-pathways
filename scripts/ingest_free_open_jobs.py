#!/usr/bin/env python3
"""
Mzansi Pathways v55 — Copyright-Safe, Zero-Scraping Open-Jobs Validator
-----------------------------------------------------------------------
Enforces factual metadata-only + direct link-out indexing (no republished full
advert prose), blocks scraping-restricted job boards & Meta/WhatsApp platforms,
requires HTTPS official application URLs, rejects upfront-fee scams, computes
daysRemaining & freshnessStatus, and keeps older (7+ day) posts while still open.
"""
import datetime
import json
import re
from typing import Dict, List

BLOCKED_SCRAPE_DOMAINS = {
    "graduates24.com",
    "pnet.co.za",
    "careerjunction.co.za",
    "indeed.com",
    "linkedin.com",
    "careers24.com",
    "facebook.com",
    "fb.com",
    "whatsapp.com",
    "chat.whatsapp.com",
}
BLOCKED_URL_SHORTENERS = {
    "bit.ly",
    "tinyurl.com",
    "t.co",
    "rb.gy",
    "shorturl.at",
}
ALLOWED_SOURCE_TYPES = {"dpsa_circular", "gov_portal", "public_ats_api", "direct_employer", "open_api"}
FEE_SCAM_RE = re.compile(r"\b(?:registration|application|admin|uniform|processing)\s+fee\b|\b(?:ewallet|cashsend|pay\s*r\d+)\b", re.IGNORECASE)
PERSONAL_PHONE_RE = re.compile(r"(?:\+27|0)\s*[6-8]\d[\s-]?\d{3}[\s-]?\d{4}")
PERSONAL_EMAIL_RE = re.compile(r"\b[\w.+-]+@(?:gmail|yahoo|hotmail|outlook|icloud)\.com\b", re.IGNORECASE)


def _scrub_popia_pii(text: str) -> str:
    cleaned = PERSONAL_PHONE_RE.sub("[redacted-phone]", text)
    cleaned = PERSONAL_EMAIL_RE.sub("[redacted-personal-email]", cleaned)
    return re.sub(r"\s+", " ", cleaned).strip()


def filter_legal_open_jobs(jobs: List[dict], today_iso: str = "") -> Dict[str, object]:
    today = datetime.date.fromisoformat(today_iso) if today_iso else datetime.date.today()
    accepted = []
    rejected = []
    seen_keys = set()

    for j in jobs or []:
        if not isinstance(j, dict):
            rejected.append({"reason": "Non-object job record"})
            continue
        title = _scrub_popia_pii(str(j.get("title") or "").strip())[:120]
        employer = _scrub_popia_pii(str(j.get("employer") or "").strip())[:100]
        url = str(j.get("officialUrl") or j.get("url") or "").strip()
        closing = str(j.get("closingDate") or j.get("closing") or "").strip()
        posted = str(j.get("postedDate") or "").strip()
        desc = str(j.get("description") or "")
        src_type = str(j.get("sourceType") or "direct_employer").strip().lower()

        if not title or not employer or not url.startswith("https://"):
            rejected.append({"title": title, "reason": "Missing title, employer, or HTTPS officialUrl"})
            continue

        host = url.lower().split("://", 1)[1].split("/", 1)[0]
        if any(host == bd or host.endswith("." + bd) for bd in BLOCKED_SCRAPE_DOMAINS):
            rejected.append({"title": title, "reason": f"Blocked scraping-restricted domain: {host}"})
            continue

        if any(host == sd or host.endswith("." + sd) for sd in BLOCKED_URL_SHORTENERS):
            rejected.append({"title": title, "reason": f"Blocked unverified URL shortener: {host}"})
            continue

        if FEE_SCAM_RE.search(f"{title} {desc}"):
            rejected.append({"title": title, "reason": "Rejected by anti-scam upfront-fee filter"})
            continue

        days_remaining = None
        freshness_status = "rolling"
        if closing and closing.lower() not in ("rolling", "open", "ongoing", "open / rolling"):
            try:
                cdate = datetime.date.fromisoformat(closing[:10])
                days_remaining = (cdate - today).days
                if days_remaining < 0:
                    rejected.append({"title": title, "reason": f"Expired closingDate ({closing})"})
                    continue
                if days_remaining == 0:
                    freshness_status = "closing_today"
                elif days_remaining <= 3:
                    freshness_status = "closing_soon"
                else:
                    freshness_status = "open"
            except ValueError:
                pass

        still_open_after_week = False
        if posted:
            try:
                pdate = datetime.date.fromisoformat(posted[:10])
                if (today - pdate).days >= 7:
                    still_open_after_week = True
            except ValueError:
                pass

        dedup_key = (title.lower(), employer.lower(), url.lower().rstrip("/"))
        if dedup_key in seen_keys:
            rejected.append({"title": title, "reason": "Duplicate listing removed"})
            continue
        seen_keys.add(dedup_key)

        # Copyright-safe metadata-only output: never republish full copied advert prose
        accepted.append({
            "title": title,
            "employer": employer,
            "town": str(j.get("town") or "South Africa").strip()[:80],
            "province": str(j.get("province") or "South Africa").strip()[:40],
            "closingDate": closing or "Open / Rolling",
            "daysRemaining": days_remaining,
            "freshnessStatus": freshness_status,
            "stillOpenAfterWeek": still_open_after_week,
            "sourceType": src_type if src_type in ALLOWED_SOURCE_TYPES else "direct_employer",
            "officialUrl": url,
        })

    accepted.sort(key=lambda x: (999999 if x.get("daysRemaining") is None else x["daysRemaining"], x.get("title", "").lower()))
    by_source = {}
    for item in accepted:
        st = item.get("sourceType", "direct_employer")
        by_source[st] = by_source.get(st, 0) + 1
    return {"accepted": accepted, "rejected": rejected, "openCount": len(accepted), "bySourceType": by_source}


if __name__ == "__main__":
    sample = [
        {"title": "Junior IT Support Clerk (DPSA Circular)", "employer": "Mpumalanga Provincial Govt", "sourceType": "dpsa_circular", "officialUrl": "https://www.gov.za/about-government/government-jobs", "postedDate": "2026-11-10", "closingDate": "2026-12-15", "description": "Long copied text that must be stripped..."},
        {"title": "Expired Post", "employer": "Old Co", "officialUrl": "https://example.co.za/job", "closingDate": "2025-01-01"},
        {"title": "Scraped Post", "employer": "Aggregator", "officialUrl": "https://www.graduates24.com/job/1", "closingDate": "2026-12-20"},
        {"title": "WhatsApp Scraped Post", "employer": "Channel", "officialUrl": "https://whatsapp.com/channel/123", "closingDate": "2026-12-20"},
    ]
    print(json.dumps(filter_legal_open_jobs(sample, today_iso="2026-11-26"), indent=2))
