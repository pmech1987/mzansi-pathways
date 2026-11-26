# Mzansi Pathways
**Your Results. Your Options. Your Next Step.**

An independent South African education-to-employment opportunity decision engine covering:
- **Deterministic NSC Pass, APS & 5-State Eligibility** (`scripts/match_engine.py`)
- **Career-First Reality Pages & Closest Alternatives** (University, UoT, TVET, QCTO Occupational, Workplace Apprenticeships)
- **Interactive Affordability Comparator & Plan A/B/C Decision Board**
- **Evidence-Based Career Vault & Single-Column Word CV Export** (zero fabricated claims)
- **Scam Shield & Official CAS Attribution** (`081 308 4196`)
- **92 Automated Security, Auth, RLS, POPIA, Failsafe & Integrity Gates** (`scripts/run_all_20_gates.py`)

## Quick Verification
```bash
python scripts/run_all_20_gates.py
```

- `docs/IMAGE_TO_RESULT_AND_FAILSAFES_V12.md`: On-device Image-to-Result scanner, Grade 9 reverse planner, deadline badges & custom rules validator
- `docs/HUMAN_EXPERIENCE_AND_ACCESSIBILITY_V13.md`: Human-first check-in, readiness ring, family talk script, safe speech & symbol fallback
- `docs/CIVIC_DESIGN_AND_TRUST_STANDARD_V14.md`: Institutional civic visual standard, 2-way Results switcher & Settings hierarchy

## Publishing to GitHub
Start with `SETUP.md`, then `docs/GITHUB_GUIDE_V67.md`. Day to day: double-click `publish.bat` (secret scan, all gates, backups, then a push that is never forced).

## GitHub Governance & Automated Deployment
- `.github/workflows/verify-pathways.yml`: Runs the full gate suite on every push/PR and uploads `release_verification_report.json`.
- `.github/workflows/deploy-pages.yml`: Fail-closed GitHub Pages deployment (blocks live deploy if any gate fails).
- `SECURITY.md`, `CONTRIBUTING.md`, `LICENSE`, `.gitignore`, `.github/CODEOWNERS`, Issue & PR templates.
- `scripts/export_summary_csv.py` & `scripts/validate_repo_hygiene.py`: Formula-injection-safe CSV exporter and repository hygiene validator.
- `docs/CV_IMPORT_AND_SCANNER_V15.md`: On-device previous CV file upload & printed CV photo scanner
- `docs/FREE_LEGAL_JOBS_AND_MATRIC_CV_GUIDE_V16.md`: Legal free open-job sourcing (DPSA, SA Youth, ATS APIs) & First-Time Matric CV guide
- `docs/COMPANY_AND_AGENCY_VERIFICATION_V17.md`: Free legal SA company (CIPC BizPortal) & recruitment agency (PEA/TES) verification
- `docs/JOB_FLYER_SCANNER_AND_AUTO_FEEDS_V18.md`: On-device WhatsApp/Facebook job flyer photo scanner & automated GitHub Actions legal feed
- `docs/LEGAL_AND_COMPLIANCE_CHARTER_V19.md`: Legal, Copyright, Zero-Scraping & POPIA Compliance Charter
- `docs/MULTI_CHECK_GATE_ATTESTATION_V20.md`: 3-Stage Gate Authentication (`gate_integrity_manifest.json`) & Cryptographic Release Attestation (`release_attestation.json`)
- `docs/PROSPECTUS_VERIFICATION_V21.md`: 5-check + 2-reviewer authenticator verification for every programme

- `docs/YEARS_AND_INSTITUTIONS_V23.md`: Any intake year (`scripts/new_year.py`, merge-safe CSV import, id@year records, year comparison) and 76 institutions including the 50 public TVET colleges (draft list, check against DHET)
