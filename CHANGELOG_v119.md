# Mzansi Pathways v119 — Round 5 (Final Release: CI Safety, Strict CSP & Compliance Polish)

## Fixes
- **E-01 (High) — Silent CI Failure Guard (`.github/workflows/prospectus-pipeline.yml`):** Added `set -o pipefail` before `python3 scripts/run_pipeline.py | tee pipeline.log` so pipeline crashes are never masked by `tee`'s exit status.
- **E-02 (Low) — Workflow Concurrency & Python 3 Consistency (`.github/workflows/data-digest.yml`):** Added `concurrency:` group (`mz-data-digest`) and standardized `python3` invocations.
- **F-01 (High) — Zero Inline Styles Across All 4 HTML Pages (`check_prospectus.html`, `404.html`, `css/prospectus_check.css`):** Replaced inline `style=` attributes (blocked by strict CSP `style-src 'self'`) with `.table-scroll` and `.sr-only` CSS classes, deferred all 4 scripts in `check_prospectus.html`, and added `/check_prospectus.html` `Cache-Control: no-cache` in `_headers`.
- Added `scripts/test_v119_ci_csp_and_release.py` into `scripts/run_all_checks.py` and bumped `sw.js` cache to `mzansi-pathways-v119`.
