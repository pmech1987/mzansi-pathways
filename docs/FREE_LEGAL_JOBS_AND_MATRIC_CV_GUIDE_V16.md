# Mzansi Pathways — Free Legal Open-Jobs Architecture & First-Time Matric CV Guide (v16)

## 1. Keeping CVs Current & Handling Missing Details (First-Time Matriculants)
- **CV Freshness Tracking (`getCvFreshnessStatus`):** Records `cvUpdatedAt` whenever a learner edits or imports their CV, gently prompting a review if a CV is over 90 days old so phone numbers, skills, and qualifications stay current.
- **Zero-Fabrication Missing-Detail Policy:** When a learner just finished Matric and has no previous CV or formal job history, Mzansi Pathways never prints fake employers, invented percentages, or blank `[Insert Experience]` placeholders.
- **Just Finished Matric / First-Time Starter (`#matric-starter-btn`):** Guides school leavers to log real, honest non-work evidence—school subjects/projects, community/church/sport roles, home PC/admin help, and NSC results—while omitting empty optional sections cleanly in exported Word `.doc` CVs.

## 2. Sourcing Free, Still-Open Job Posts With Zero Legal Issues
Never scrape private job boards whose Terms of Service prohibit automated collection or republishing (such as Graduates24, PNet, or CareerJunction). Instead, Mzansi Pathways supports six 100% legal, zero-cost South African sources—including posts published a week or more ago that remain open before their closing date:
1. **Weekly DPSA Public Service Vacancy Circulars (`gov.za`):** Published every Friday with 2–3 week application windows; link directly to the official circular PDF/portal.
2. **Department of Employment & Labour (`labour.gov.za/vacancies`):** Public government vacancy notices.
3. **SA Youth (`sayouth.mobi`):** Data-free national youth opportunity network for entry-level roles and learnerships.
4. **Public ATS JSON Feeds (Greenhouse & Lever):** Companies intentionally expose public JSON endpoints (`docs.greenhouse.io/job-board.html`, `github.com/lever/postings-api`) with live open status and direct apply links.
5. **Free Developer APIs (e.g., Adzuna SA `za` tier):** Legal attribution-based API with creation timestamps and open-status filtering.
6. **Direct Local Employer / Community JSON Submissions:** Validated by `scripts/ingest_free_open_jobs.py` (rejects expired `closingDate`, non-HTTPS links, blocked scraping domains, and upfront-fee scams).

## 3. Copyright-Safe Metadata-Only & Direct Link-Out Policy
- Both `scripts/ingest_free_open_jobs.py` and `filterLegalOpenJobs()` strip long copied advert prose and retain only factual metadata (`title`, `employer`, `town`, `province`, `closingDate`, `sourceType`, `officialUrl`) linking directly to the official employer or government portal.
- Scraping-restricted boards (`graduates24.com`, `pnet.co.za`, `careerjunction.co.za`, `careers24.com`, `indeed.com`, `linkedin.com`) are blocked automatically.
- Local employers and schools can download `mzansi_open_jobs_template.json` directly from **Work & Scams** to share verified open vacancies with zero copyright or scraping risk.
