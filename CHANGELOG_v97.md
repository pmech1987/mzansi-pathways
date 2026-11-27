# Mzansi Pathways v97 Changelog

## Front-End Resilience, Interactivity & Accessibility (WCAG 2.2 AA)
- **New `js/v97_resilience_ux.js` (Strict-CSP & Trusted-Types safe, zero raw HTML sinks):**
  - **One-Tap Update Toast (`#v97-update-toast`):** Automatically notifies users when a new service worker is ready and applies `SKIP_WAITING` + clean reload with one tap.
  - **Live Offline & Data-Saver Pill (`#v97-net-pill`):** Clearly indicates Offline Mode or Data-Saver status with screen-reader announcements.
  - **Accessible Floating Back-to-Top Button (`#v97-scroll-top`):** 44x44px pill shown when scrolling past 420px, respecting `prefers-reduced-motion`.
  - **Safe LocalStorage Self-Healing & Emergency JSON Backup/Restore (`window.mzSafeStorage`):** Auto-quarantines corrupted `mz_*` keys on boot and adds one-tap local JSON backup download & restore inside Settings.
  - **Keyboard Power Navigation:** WAI-ARIA Left/Right arrow-key roving across sub-tab bars, `Alt+1..5` section shortcuts, and `#mz-sr-announcer` live announcements.
- **Modal Accessibility (`js/a11y.js`):** Added `Escape`-key modal dismissal and enforced `aria-modal="true"` across all dialogs.
- **Visual & Contrast Polish (`css/civic_mobile_a11y.css`):** Added `prefers-contrast: more`, `forced-colors: active`, 44px coarse-pointer touch targets, and full Light + Dark Mode styling for all v97 controls.

## Service Worker, Security Headers & Back-End Failsafes
- **Service Worker (`sw.js` -> `mzansi-pathways-v97`):** Added 8-second `fetchWithTimeout` failsafe (`AbortController`) on navigation and `/data/` requests so slow/flaky mobile networks fall back cleanly to cached data instead of hanging, plus strict HTTP 200-only caching.
- **HTTP Headers (`_headers`):** Added Privacy Sandbox opt-out (`interest-cohort=(), browsing-topics=()`) and explicit `/favicon.svg` cache control.
- **System-Wide Health Auditor (`scripts/health_audit.py`):** Verifies live SHA-384 SRI hashes against `data/sri_manifest.json`, checks every `sw.js` `CORE`/`NICE` file exists, validates PNG/SVG icon headers, blocks forbidden DOM sinks, scans `data/*.json` for XSS tokens, and validates CI workflow syntax.
- **One-Command Failsafe Rollback (`scripts/backup_data.py --restore-latest`):** Automatically restores `data/` from the newest checksum-verified backup archive.
- **CI & Publish Pipeline Hardening (`.github/workflows/*.yml`, `scripts/push_data.sh`):** Fixed the multiline `run:` YAML folding bug in `data-refresh.yml`, wired `autonomous_ops.py` and the full `run_all_checks.py` suite into all three data workflows, and hardened `push_data.sh` with `health_audit.py`, expanded secret scanning (Stripe/JWT/AWS/GitHub/PEM), and an error-cleanup trap.
