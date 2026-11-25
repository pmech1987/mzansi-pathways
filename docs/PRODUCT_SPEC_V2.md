# Mzansi Pathways v2 — Architecture & Phase-1 Product Specification

## 1. Core Positioning
- **Central Question:** "What can I realistically do next?"
- **Flow:** `Results / Qualification Profile -> Careers -> All Post-School Routes -> Verified Institutions -> Affordability & Funding -> Plan A/B/C & Applications -> Evidence Vault -> Jobs`
- **CAS Relationship:** CAS is the official South African government access/support service (WhatsApp `081 308 4196`); Mzansi Pathways is the student's independent planning, comparison, and preparation layer.

## 2. Core PostgreSQL Schema (Production Target)
- `users`, `academic_profiles`, `result_documents` (versioned Grade 9–12, NSC, NC(V), NATED, N4–N6, Diplomas, Degrees)
- `institutions` (status: `verified`, `pending`, `outdated`, `warning`, `unavailable`; DHET/QCTO/SAQA register references)
- `campuses` (province, town, coordinates for distance/relocation checks)
- `programmes` + `admission_rules` (versioned by `intake_year`, structured `AND/OR/MIN` JSON rules, `source_url`, `source_page`, `source_tier` 1–5, `last_verified_at`)
- `careers` + `career_routes` (links occupations to University, UoT, TVET, CET, QCTO Occupational, and Workplace routes)
- `funding_opportunities` + `applications` (Plan A/B/C tags, deadlines, document checklist)
- `evidence_vault` (verified user skills, projects, practical experience — never fabricated numbers)
- `vacancies` + `scam_reports` (separate trust flags: employer identity, official source, link check, scam scan)

## 3. AI Authority Boundary
- Deterministic rules engine (`scripts/match_engine.py`) calculates NSC pass level, APS, 5-state eligibility, bottlenecks, and closest alternatives.
- AI is restricted to plain-language explanations, summarising prospectuses into `pending_review`, and interview coaching grounded solely in the user's real Evidence Vault.
