# v94: Full Front-End, Back-End, Security, Accessibility & Automation Overhaul

## Front-End Interactivity, Looks, Feel & Accessibility
- Wired live **Smart SA Pathways Toolkit** (`js/v94_evolved_ui.js`) directly into `index.html` using zero `innerHTML` sinks and zero inline event handlers (100% Trusted Types & strict CSP safe):
  - **Reverse-APS Goal Solver**: computes exact minimum % lift across borderline subjects and flags `<=3%` gaps as January DBE re-mark candidates.
  - **NSFAS Appeal & Funza Lushaka 2027 Quick-Checker**: 15-day FTEN / 30-day senior appeal & Propensity Letter guidance plus Funza Lushaka 2027 rules.
  - **Instant National Pathways Search**: CAS (`081 308 4196`), Higher Health (`0800 36 36 36`), zero-rated SAYouth (`0800 72 72 72`), 10 Public Nursing Colleges, 11 Agricultural Colleges, and SAPS / hardcopy-only SANDF.
  - **iOS Safari 7-Day Storage Durability Guard** (`navigator.storage.persist()` + Add to Home Screen notice).
- Upgraded `css/civic_mobile_a11y.css` with `content-visibility: auto` (zero-jank off-screen rendering on budget Android phones), `44px` WCAG 2.2 AA touch targets, and strict `body.dark-mode` isolation.

## Back-End Security, Automation & Failsafes
- Upgraded `_headers` with `Content-Security-Policy-Report-Only: require-trusted-types-for 'script'; trusted-types mz-ui mz-worker mzansi-dom`.
- Wired `scripts/autonomous_ops.py` (SHA-384 SRI manifest generation) directly into `.github/workflows/data-refresh.yml`.
- Bumped `sw.js` to `mzansi-pathways-v94` caching `./js/v94_evolved_ui.js` in `CORE`, and added `scripts/test_v94_overhaul.py` into `scripts/run_all_checks.py`.
