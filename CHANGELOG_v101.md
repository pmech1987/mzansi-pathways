# Mzansi Pathways v101 Changelog

## Front-End Accessibility Comfort Controls (WCAG 2.2 AA+)
- **Persistent Reading & Accessibility Controls (`js/v101_a11y_comfort.js`, strict-CSP & zero inline styles):** Added a dedicated **Reading & Accessibility Comfort** panel inside Settings with persistent `Text 100% / 115% / 130%` scaling (`data-mz-scale`), a `High Contrast` toggle (`data-mz-contrast="high"`), and a `Wide Spacing` dyslexia-friendly reading toggle (`data-mz-spacing="wide"`), with instant screen-reader announcements and one-tap reset.
- **Root-Attribute Accessibility Stylesheet (`css/civic_mobile_a11y.css`):** Added clean CSS rules for `html[data-mz-scale]`, `html[data-mz-contrast="high"]`, and `html[data-mz-spacing="wide"]`.

## Back-End Defense-in-Depth & Verification
- **Nightly Job Sanitization (`scripts/refresh_data.py`):** Added `sanitize_job_row()` inside `refresh_jobs()` so every nightly refresh also blocks URL-shortener/WhatsApp redirect links and scrubs any stray SA 13-digit IDs, emails, or mobile phone numbers from `data/open_jobs_live.json` (defense-in-depth even for manually imported rows).
- **Service Worker & Full Release Verification (`sw.js` -> `mzansi-pathways-v101`, `scripts/health_audit.py`, `scripts/test_v101_a11y_and_defense.py`, `scripts/run_all_checks.py`):** Added `js/v101_a11y_comfort.js` to `CORE` and strict-CSP auditing, rebuilt `data/sri_manifest.json` (33 assets), and passed `scripts/verify_release.py`.
