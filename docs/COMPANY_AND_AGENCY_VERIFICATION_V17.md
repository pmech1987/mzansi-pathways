# Mzansi Pathways — Free Legal SA Company & Recruitment Agency Verification (v17)

## 1. Official Free South African Verification Registers (Zero Scraping)
Because official company lookup (`BizProfile` on CIPC BizPortal) requires user login for POPIA compliance, Mzansi Pathways never scrapes CIPC or private databases. Instead, it provides 1-tap official link-outs and deterministic format/scam checks:
1. **CIPC BizPortal (`https://www.bizportal.gov.za/`) & CIPC (`https://www.cipc.co.za/`):** Free official enterprise registration verification (BizProfile requires free login under POPIA).
2. **Department of Employment & Labour — Registered Private Employment Agencies (PEA) & TES (`https://www.labour.gov.za/DocumentCenter/Pages/Private-Employment-Agencies-(PEA)-and-Temporary-Employment-Services-(TES).aspx`):** Under Section 13(7) of the Employment Services Act No. 4 of 2014, recruitment agencies must register with the Department of Employment & Labour.
3. **Employment Services of South Africa — ESSA (`https://essa.labour.gov.za/EssaOnline/WebBeans/`):** Free official government work-seeker and employer matching portal.
4. **Information Regulator BizPortal (`https://inforegulator.bizportal.gov.za/Search/Default.aspx`):** Free lookup for POPIA-registered organisations.

## 2. Deterministic CIPC Format & Scam Checks Built Into Gates
- `scripts/verify_company_and_agency_registers.py` and the live `#cipc-check-input` widget validate standard CIPC registration formats (`YYYY/NNNNNN/07` for `(Pty) Ltd`, `/08` for `NPC`, `/23` for `CC`) while reminding applicants that format validity never proves active status—always confirm on BizPortal.
- Gate 56 verifies all official company and recruitment agency verification links remain intact and HTTPS.
