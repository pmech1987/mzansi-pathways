# Mzansi Pathways v132 — Disambiguated Plan Progress Label & Estimator Attribution

## Fixes
- **B5 Plan Progress vs Document Count (`js/modules/study.js:32`):** Renamed `0 Docs Ready` (which counted Plan A/B/C slots, contradicting `1/6 ready` right below it) to `0/3 Plans Marked Ready`.
- **B5 Cost Estimator Attribution (`js/toolkit.js`):** Added explicit illustrative-range disclaimer with official `nsfas.org.za` / `dhet.gov.za` reference and review date (`2026-11-27`).
- Added `scripts/test_v132_plan_label_and_estimator_source.py` and bumped `sw.js` to `mzansi-pathways-v132`.
