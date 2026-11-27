# Mzansi Pathways v102 Changelog

## Front-End Offline Calendar Reminders (`.ics`)
- **Offline SA Deadline Countdown & `.ics` Exporter (`js/v102_deadline_ics.js`, strict-CSP & zero `innerHTML`):** Displays live countdown badges for verified South African closing dates (enriched automatically from `data/events.json` when available) and exports an RFC 5545 `.ics` calendar file with built-in 7-day and 2-day `VALARM` reminders for Android, Samsung, and Apple Calendar.
- **Responsive Deadline Row Styling (`css/civic_mobile_a11y.css`):** Added clean light and dark mode styling for `.v102-ics-row` and `.v102-ics-badge`.

## Back-End Cryptographic Integrity & Atomic Failsafes
- **Root Guard & Service Worker SRI Signing (`scripts/autonomous_ops.py`):** Expanded `build_sri_manifest()` to cryptographically hash `guard.js` and `sw.js` alongside all `js/` and `css/` assets so `health_audit.py` detects any tampering with the root loader or service worker.
- **Atomic File Writes (`scripts/autonomous_ops.py`):** Added `atomic_write_text()` (temp file + `os.replace`) so interrupted runs never leave half-written JSON feeds or manifests.
- **Service Worker & Full Verification (`sw.js` -> `mzansi-pathways-v102`, `scripts/health_audit.py`, `scripts/test_v102_ics_and_sri.py`, `scripts/run_all_checks.py`):** Added `js/v102_deadline_ics.js` to `CORE` and strict-CSP auditing, rebuilt `data/sri_manifest.json` (36 assets), and passed `scripts/verify_release.py`.
