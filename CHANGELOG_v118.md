# Mzansi Pathways v118 — Round 4 (Focus D: Accessibility & Languages)

## Fixes
- **D-01 (High) — WCAG 2.1 AA Modal & Form Labeling (`index.html`):** Added `aria-labelledby="auth-modal-title"` on `#auth-modal`, explicit `<label>` elements for `#enc-pass` (with `aria-describedby="enc-pass-strength"` + `role="status" aria-live="polite"`) and `#otp-email`, and `aria-label` on `#in-import-enc`, `#import-rules-file`, and `#tut-try-btn`.
- **D-02 (Medium) — isiZulu, siSwati & Xitsonga Home/Nav Coverage (`js/i18n.js`):** Added draft `x` translation maps (retaining `reviewed: false` honesty notices) for `zu`, `ss`, and `ts` covering core home screen and bottom-dock navigation labels so Mpumalanga learners do not see an English-only home/nav shell.
- **D-03 (Low) — Skip-to-Content Link on `404.html`:** Matched landmark/skip-link consistency across all 4 HTML entry pages.
- Added `scripts/test_v118_a11y_and_i18n.py` into `scripts/run_all_checks.py` and bumped `sw.js` cache to `mzansi-pathways-v118`.
