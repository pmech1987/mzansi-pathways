# Mzansi Pathways v126 — Turn 2 SOLO Single Sources of Truth (B5, B6, B10, B11)

## Fixes
- **New `js/modules/selectors.js` (`window.MZSelectors`):** Single source of truth for `getHome()`, `computeDistanceLabel()`, `getTrust()`, `isSampleJob()`, and `getCounts()`.
- **B5 (Counts & Unsourced Fees):** Unified doc counts via `getCounts(state)` and replaced unsourced hardcoded `Est. R55k–R70k` / `Est. R35k–R48k` tuition ranges in `SAMPLE_PROGRAMMES` with official-site verification copy.
- **B6 (Computed Trust Badges):** Replaced static trust labels with `getTrust(record)` — sample jobs show `Sample / Demo (not a live vacancy)` and unchecked external links default to `Not verified yet`.
- **B10 (Home-Province Consistency):** Replaced hardcoded `High (Relocation)` / `Lower (Near Home)` strings with `computeDistanceLabel()`, proven across all 81 SA province pairs (`9 × 9`).
- **B11 (Sample Job Honesty):** Sample jobs no longer show fake live countdowns (`Still Open`), unsourced salary ranges, or unexplained `Profile Match %`.
- Added `scripts/test_v126_single_sources_of_truth.py`, updated `notes/NOTES_SOLO.md`, precached `js/modules/selectors.js`, and bumped `sw.js` to `mzansi-pathways-v126`.
