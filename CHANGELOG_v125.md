# Mzansi Pathways v125 — Turn 1 SOLO Quick Wins (B4, B8, B9)

## Fixes
- **B8 (Checkboxes & Floating Overlays):** Added explicit `appearance: none` bordered checkboxes (`css/mzansi_ui.css`) so Android Dark OS never renders unchecked boxes as dark filled squares; moved `#v98-jump-btn` inside `#mz-more .mz-more-sheet` (`js/comfort_and_jump.js`) so no floating button covers content; raised `#v97-scroll-top` threshold to 2 screens (`js/backup.js:229`).
- **B9 (Plan Board at 360px):** Added `.mz-plan-table` + `data-label` attributes (`js/app.js:1391-1420`) and `@media (max-width: 600px)` stacked-card CSS (`css/mzansi_ui.css`) eliminating horizontal clipping at 360px.
- Created `notes/NOTES_SOLO.md`, added `scripts/test_v125_b4_b8_b9_quick_wins.py`, and bumped `sw.js` to `mzansi-pathways-v125`.
