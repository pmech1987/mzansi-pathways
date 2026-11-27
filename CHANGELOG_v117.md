# Mzansi Pathways v117 — Round 3 (Focus C: Performance & Architecture)

## Fixes
- **C-01 (High) — Full-Catalogue Evaluation Memoization & Pre-Indexed Search (`js/catalogue.js`):** Added single-entry marks-signature memoization (`getEvaluatedAll()`) and cached lowercase `_searchLow` strings per programme, eliminating 3x–4x redundant evaluations of all 586 programmes on every Study-tab render.
- **C-02 (High) — O(1) English Fast-Path in `js/i18n.js`:** Skipped whole-`document.body` `TreeWalker` scans on DOM mutations when `lang === 'en'` and no non-English translation is active, eliminating unnecessary main-thread walks on every screen update.
- **C-03 (High) — rAF-Throttled What-If Slider (`js/app.js`):** Replaced synchronous `saveState() + render()` on every `input` event of `#whatif-range` with `requestAnimationFrame` throttling and `change`-only persistence.
- **C-04 (Medium) — Non-Blocking Script Loading (`index.html`):** Added `defer` to all 26 classic `<script>` tags so HTML parsing and first paint proceed in parallel with script downloads while preserving exact execution order.
- Added `scripts/test_v117_perf_and_arch.py` into `scripts/run_all_checks.py` and bumped `sw.js` cache to `mzansi-pathways-v117`.
