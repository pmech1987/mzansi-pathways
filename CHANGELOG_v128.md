# Mzansi Pathways v128 — E5 Local Diagnostics & Zero-PII Support Report

## Upgrades
- **App Diagnostics & Offline Health Panel (`index.html`, `js/app.js`):** Added an offline diagnostics accordion inside Settings showing online/offline status, Shared PC / Class Mode status, loaded catalogue counts, localStorage usage (KB), and the last 3 JS errors with a 1-tap **Copy Safe Report** button — guaranteed zero personal marks, names, or SA IDs.
- Added `scripts/test_v128_local_diagnostics.py` into `scripts/run_all_checks.py` and bumped `sw.js` to `mzansi-pathways-v128`.
