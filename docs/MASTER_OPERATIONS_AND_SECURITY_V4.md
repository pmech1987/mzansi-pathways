# Mzansi Pathways v8 — Master Operations, Security & Android Deployment Guide

## 1. Complete Repository Map (Exact Folder Placement)
- **Root (`/`):** `index.html`, `manifest.json`, `sw.js`, `icon-192.png`, `icon-512.png`, `integrity_manifest.json`, `auth_security_policy.json`, `_headers`, `README.md`
- **`.github/workflows/`:** `verify-pathways.yml`
- **`data/`:** `programmes_2027.json`
- **`docs/`:** `PRODUCT_SPEC_V2.md`, `ARCHITECTURE_SECURITY_AUTH_V3.md`, `MASTER_OPERATIONS_AND_SECURITY_V4.md`
- **`scripts/`:** `match_engine.py`, `data_health_audit.py`, `stage_prospectus_rules.py`, `verify_pathways_integrity.py`, `run_all_pathways_checks.py`, `run_all_20_gates.py`, `supabase_schema_rls.sql`
- **`scripts/gates/`:** `01_verify_...py` through `24_verify_...py`
- **`tests/`:** `test_pathways_engine.py`

## 2. Backside Security & POPIA Checklist
1. **Zero secrets in client code:** Never place `GEMINI_API_KEY`, Supabase `service_role` keys, or private credentials in `index.html` or public JSON.
2. **Row-Level Security (`supabase_schema_rls.sql`):** Every user table enforces `auth.uid() = user_id`.
3. **Authentication:** Free browsing without an account or SA ID; Email 6-digit OTP (`600s` expiry, max 5 tries, rate-limited) via Supabase Auth when cloud sync is enabled, plus offline **AES-256-GCM** encrypted `.mzansi` backups today.
4. **Under-18 Learners (POPIA s35):** Require parent/guardian consent before cloud storage.
5. **Production Headers (`_headers`):** `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Strict-Transport-Security`, `Referrer-Policy`.
