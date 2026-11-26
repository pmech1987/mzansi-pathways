# Mzansi Pathways — Job Flyer Photo Scanner & Automated Legal Feeds (v18)

## 1. Why Local SME Image Flyers Cannot Be Scraped Automatically
- Small South African businesses frequently publish vacancy flyers as images inside private WhatsApp groups or Facebook pages.
- Automated crawling of Facebook or WhatsApp violates platform terms and copyright rules, so Mzansi Pathways never scrapes social media.

## 2. How Mzansi Pathways Solves Local & National Job Discovery Legally
1. **On-Device Job Flyer Photo Scanner (`#job-flyer-scanner`):** Upload or snap any WhatsApp/Facebook vacancy poster locally; `parseJobFlyerText()` extracts the closing date (flagging whether it is still open), application email and custom domain trust signal (e.g., `.co.za` corporate email vs. free webmail), South African landline/mobile number (`013...`), and upfront-fee scam flags—then lets you save the opportunity into your local **Saved Open Jobs** list.
2. **Automated Scheduled Legal Job Refresher (`scripts/fetch_legal_public_jobs.py` + `.github/workflows/refresh-open-jobs.yml`):** Runs free on GitHub Actions daily to combine verified direct-employer submissions (`data/community_jobs_submissions.json`) and optional Adzuna SA free-tier API results (`ADZUNA_APP_ID` / `ADZUNA_APP_KEY`), automatically removing expired closing dates and stripping copied prose.
3. **Local Town & Province Finder (`#local-job-finder`):** Lets learners enter their exact town or ward (e.g., `Siyabuswa`, `eMalahleni`, `Vaalbank`) to launch direct official searches on SA Youth, ESSA, gov.za, and CIPC BizPortal.
