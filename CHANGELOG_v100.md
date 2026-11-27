# Mzansi Pathways v100 Changelog (Milestone Release)

## Native PWA Experience & Offline Self-Check
- **Native Android/PWA App Shortcuts (`manifest.json`):** Added 4 home-screen shortcuts (`Study Path & APS`, `Open Jobs & Learnerships`, `Plan A / B / C Board`, `Creator Studio`) so long-pressing the app icon jumps straight to any workflow.
- **PWA Install Manager & Offline Self-Check (`js/v100_pwa_install_and_telemetry.js`, strict-CSP & Trusted-Types safe):** Captures `beforeinstallprompt` for a one-tap **Install App** button in Settings, adds a **Verify Offline Cache** self-check reporting active service worker cache version, cached file count, and saved storage keys, and handles offline `unhandledrejection` network errors calmly.

## Production Release Verification & Runbook
- **One-Command Release Verifier (`scripts/verify_release.py`):** Runs `autonomous_ops.py` + `run_all_checks.py`, ensures zero stray `.tmp`/`.part` files, and prints a production readiness summary (`buildTag`, SRI asset count, PWA shortcuts).
- **Updated Operational Runbook (`RUNBOOK.md`):** Documented `scripts/health_audit.py`, `scripts/backup_data.py --restore-latest`, and `scripts/verify_release.py`.
- **Service Worker & Full Verification (`sw.js` -> `mzansi-pathways-v100`, `scripts/health_audit.py`, `scripts/test_v100_production_ready.py`, `scripts/run_all_checks.py`):** Added `js/v100_pwa_install_and_telemetry.js` to `CORE` and strict-CSP auditing, rebuilt `data/sri_manifest.json` (32 assets), and verified all checks pass.
