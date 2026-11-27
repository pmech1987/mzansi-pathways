# Mzansi Pathways v121 — Shared PC / Class Mode & 7 SA Languages

## Upgrades & Fixes
- **Shared PC / School Lab Class Mode (`index.html`, `js/app.js`):** Added a 1-tap **Shared PC / Class Mode** toggle in Settings + top banner with **Next Learner (Clear)** so teachers and learners on shared school computers can calculate APS and explore routes without saving any marks to `localStorage`.
- **7 South African Languages (`js/i18n.js`):** Added honest draft translations (`reviewed: false`) for **Sesotho (`st`)** and **isiXhosa (`xh`)** (full key set + home/dock maps), expanding coverage to 7 SA languages (`en`, `af`, `zu`, `xh`, `st`, `ss`, `ts`).
- **Verification Signature Bug Fix (`js/app.js:652`):** Updated `marksSignature()` to use `parseMark(x.mark)` so clearing a mark (`null`) vs typing `0` or `"65,5"` always invalidates stale mark verification cleanly.
- Added `scripts/test_v121_class_mode_and_languages.py` into `scripts/run_all_checks.py` and bumped `sw.js` to `mzansi-pathways-v121`.
