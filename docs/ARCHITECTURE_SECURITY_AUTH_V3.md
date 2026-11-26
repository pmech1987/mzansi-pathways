# Mzansi Pathways v7 — Accounts, OTP, Cross-Device Sync & Backside Security Architecture

## 1. Which Account / Login Method Should We Use in South Africa?
- **Browse Free Without an Account:** Learners can calculate APS, explore careers, compare TVET/University/QCTO routes, and run What-If simulations without signing up or giving an SA ID number.
- **Recommended Cloud Login (Cross-Device Sync): Email 6-Digit OTP (Passwordless) + Optional Strong Password via Supabase Auth.**
  - **Why Email 6-digit OTP beats SMS OTP at launch:** SMS OTPs in South Africa cost ~R0.25–R0.45 per message and attract bot abuse; Email OTP is free on Supabase Auth, requires no password to remember, and works when switching phones or SIM cards.
  - **Optional Passkey / Password:** Users who prefer a password get Supabase Auth's salted bcrypt/Argon2id handling (we never roll our own password hashing).

## 2. Backside Security Controls (24 Automated Gates)
- **PostgreSQL Row-Level Security (`scripts/supabase_schema_rls.sql`):** Every user table (`user_profiles`, `academic_results`, `saved_plans`, `evidence_vault`) enforces `auth.uid() = user_id` so one user can never read another user's marks or CV.
- **OTP Abuse & Lockout (`auth_security_policy.json`):** 6-digit code expires in 10 minutes (`600s`), locks after 5 wrong tries, and rate-limits resends (max 3 per 15 minutes).
- **POPIA Under-18 Protection:** Cloud account sync requires confirming age 18+ or parent/guardian consent.
- **Zero-Server Encrypted Transfer Today (`index.html`):** Until Supabase Auth is connected, learners can export an **AES-256-GCM encrypted backup** (`PBKDF2` with 120,000 iterations + random 16-byte salt & 12-byte IV) to move their profile to any other phone safely.
- **Production Hosting Headers (`_headers`):** Blocks clickjacking (`X-Frame-Options: DENY`), MIME sniffing (`nosniff`), and enforces HSTS.
