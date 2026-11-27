# Mzansi Pathways v127 — Turn 3 SOLO Final Convergence (B1–B3, B7, B12)

## Upgrades & Fixes
- **B1 / B3 (`scripts/build_data_manifest.py`, `data/data_manifest.json`):** Added deterministic, byte-identical manifest builder reconciling exact counts (`76` institutions, `27` with loaded courses, `586` courses) and precached `data/data_manifest.json` in `sw.js`.
- **B2 (`config/eligibility_config.json`, `contracts/CONTRACT.md`):** Centralized product defaults (`CLOSE_APS_GAP: 2`, `CLOSE_SUBJECT_GAP_LEVELS: 1`, `STALE_DAYS: 365`, `SHRINK_BREAKER_MIN_RATIO: 0.90`) explicitly labelled as product defaults, and froze selector contract documentation.
- **B12 (`css/mzansi_ui.css`):** Added unified `:root` and `body.dark-mode` CSS design tokens (`--mz-bg`, `--mz-surface`, `--mz-ink`, `--mz-border`, `--mz-accent`, `--mz-ok`, `--mz-warn`, `--mz-danger`, radii, shadows, z-indexes) plus `font-variant-numeric: tabular-nums` for APS and marks.
- Added `scripts/test_v127_final_b1_b2_b3_b7_b12.py`, updated `notes/NOTES_SOLO.md`, and bumped `sw.js` to `mzansi-pathways-v127`.
