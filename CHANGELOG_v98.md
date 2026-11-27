# Mzansi Pathways v98 Changelog

## Front-End Interactivity, Brand Consistency & Accessibility
- **Quick-Jump Command Palette & Verified SA Helplines (`js/v98_quick_palette.js`):** Strict-CSP, zero-`innerHTML` command palette (`Ctrl+K`, `/`, or floating `Jump / Help` button) for instant section jumping plus offline-ready verified SA student helplines (CAS `081 308 4196`, NSFAS `0800 067 327`, Higher Health `0800 36 36 36`, SA Youth `0800 72 72 72`).
- **404 Recovery Page (`404.html`):** Branded with custom `favicon.svg` emblem, WCAG 2.2 AA & Dark Mode support, and direct links to Home, Study Path, and Work Path.
- **Creator Studio (`creator_studio.html`, `css/creator_studio.css`):** Upgraded to v98 with `lang="en-ZA"`, custom `favicon.svg`, skip-to-content link, WAI-ARIA `role="tabpanel"` + `aria-controls`, and automatic `prefers-color-scheme: dark` theme support.

## Back-End Anti-Scam, POPIA PII Scrubbing & Integrity
- **Job Fetcher Hardening (`scripts/fetch_jobs.py`):**
  - Added **Northern Cape** and **North West** so all 9 South African provinces are accurately mapped.
  - Blocked URL shorteners & messaging-app scam traps (`bit.ly`, `tinyurl.com`, `t.co`, `rb.gy`, `cutt.ly`, `shorturl.at`, `wa.me`, `chat.whatsapp.com`, `t.me`).
  - Added `scrub_popia_pii()` to strip SA 13-digit ID numbers, emails, and mobile phone numbers from fetched job listings before saving.
  - Added `deduplicate_jobs()` to eliminate duplicate ATS postings.
- **Service Worker & Audit (`sw.js` -> `mzansi-pathways-v98`, `scripts/health_audit.py`, `scripts/run_all_checks.py`):** Added `js/v98_quick_palette.js` to `CORE` and strict-CSP auditing, and wired `scripts/test_v98_hardening_and_ux.py` into `run_all_checks.py`.
