# Mzansi Pathways v99 Changelog

## Front-End Zero-Knowledge Encryption, Diagnostics & Print Polish
- **Zero-Knowledge Encrypted Backup UI (`js/v99_encrypted_backup_and_perf.js`):** Strict-CSP, zero-`innerHTML` Settings panel using native Web Crypto API (`PBKDF2-HMAC-SHA256`, 600,000 iterations, `AES-256-GCM`, `mzansi-pathways-encrypted-v2`) to encrypt/decrypt local learner marks, CV, and Plan A/B/C with a 10+ character passphrase, plus a live runtime diagnostics line (version, `localStorage` KB usage, offline PWA support).
- **Print & PDF-Ready Stylesheet (`css/civic_mobile_a11y.css`):** Added `@media print` rules that automatically hide floating UI chrome (`#v97-update-toast`, `#v97-net-pill`, `#v97-scroll-top`, `#v98-jump-btn`, `#v98-palette-modal`, `#mz-dock`) and keep cards/tables crisp on paper or exported PDFs.

## Back-End Monitoring & Failsafes
- **Extended Pathways Link Monitoring (`scripts/check_links.py`):** Expanded `collect()` to also verify official HTTPS URLs in `data/sa_extended_pathways.json` during weekly link-health runs.
- **SRI Integrity Alerting in Weekly Digest (`scripts/make_digest.py`):** Added an SRI manifest check so missing or empty `data/sri_manifest.json` surfaces in `reports/attention.md` automatically.
- **Service Worker & Verification (`sw.js` -> `mzansi-pathways-v99`, `scripts/health_audit.py`, `scripts/test_v99_crypto_and_print.py`, `scripts/run_all_checks.py`):** Added `js/v99_encrypted_backup_and_perf.js` to `CORE` and strict-CSP auditing, rebuilt `data/sri_manifest.json` (31 assets), and verified all checks pass.
