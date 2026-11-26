# Mzansi Pathways — Legal, Copyright, Anti-Scraping & POPIA Compliance Charter (v19)

## 1. Strict Zero-Scraping & Copyright-Safe Indexing
- Mzansi Pathways contains **zero** web-scraping libraries (`bs4`, `scrapy`, `selenium`, `playwright`, `puppeteer`) and never crawls private job boards, social media groups, or login-gated portals.
- Automated open-job discovery (`scripts/fetch_legal_public_jobs.py`) queries only public, intentionally exposed JSON APIs (Greenhouse Job Board API, Lever Postings API, optional free-tier Adzuna SA API) and direct employer submissions (`data/community_jobs_submissions.json`).
- All job records are reduced to **factual metadata + direct official link-out** (`title`, `employer`, `town`, `province`, `closingDate`, `sourceType`, `officialUrl`), stripping copied advert prose to respect copyright.

## 2. POPIA & Minor Privacy Protection
- Report card photos, printed CV photos, and job flyer photos are processed 100% locally in browser memory (`URL.revokeObjectURL` cleanup immediately after draw) and never uploaded to external servers.
- South African ID numbers are never required or stored (including in the Z83 Prep Sheet).
- Cross-device offline transfers use WebCrypto PBKDF2 (120,000 iterations) + AES-256-GCM; optional cloud OTP sync enforces Row-Level Security (`auth.uid() = user_id`) and under-18 guardian consent.

## 3. Employment Services Act Anti-Scam & Official Register Attribution
- Users are explicitly warned never to pay fees to apply for a job and are linked directly to official free South African registers: CIPC BizPortal, Department of Employment & Labour PEA/TES Register, ESSA, DHET, QCTO, SAQA, NSFAS, SA Youth, and official CAS WhatsApp (`081 308 4196`).
- Mzansi Pathways is an independent South African decision tool, not a government department or admission authority.
