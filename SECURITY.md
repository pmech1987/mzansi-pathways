# Security & Privacy Policy

## 1. Zero-Cloud, On-Device Privacy by Default
- Mzansi Pathways runs 100% client-side on static hosting (GitHub Pages).
- Report card photos scanned via **Scan Report Photo** are processed locally in browser memory and never uploaded to external servers.
- Cross-device backup files (`.mzansi`) are encrypted locally using **WebCrypto PBKDF2 (120,000 iterations, SHA-256)** and **AES-256-GCM** with random salt and IV.
- Shared-device users can clear all local records in one tap via **Sync -> Wipe My Info From This Device**.

## 2. POPIA & Minor Protection
- No South African ID number is required to browse routes or calculate APS.
- Optional cloud OTP sync (when deployed with Supabase Auth) enforces PostgreSQL Row-Level Security (`auth.uid() = user_id`), OTP rate limits, and under-18 guardian consent.

## 3. Verifying Build Integrity
Run the full release verification suite locally before deploying:

```bash
python3 scripts/verify_release.py
```

Every tracked file hash is verified against `integrity_manifest.json` (SHA-256).

## 4. Reporting a Vulnerability
Do not open a public issue for security vulnerabilities. Report privately via GitHub Security Advisories on `pmech1987/mzansi-pathways` with steps to reproduce.
