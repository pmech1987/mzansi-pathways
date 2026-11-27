# v95: Real-Device Screenshot Visual, Dark Mode Contrast & Blank-List Fixes

Diagnosed and fixed all 4 issues spotted in real Android phone screenshots:
1. **Home screen duplicate cards fixed (`index.html`):** Removed the 4 duplicated `My marks`, `Careers`, `Evidence & CV`, and `More` cards stacked underneath the main grid.
2. **Dark Mode white-on-white unreadable buttons fixed (`css/mzansi_ui.css`):** Fixed `#civic-trust-bar`, `MP` logo box, `Sync` button, active sub-tab pills (`All`/`Jobs`/`Board`), bottom-nav active pill, `Download Dossier (.txt)`, and `More` modal links (`#93c5fd`) so every control has crisp WCAG contrast in Dark Mode.
3. **Blank Study & Work lists fixed (`js/screens.js`):** Fixed sub-tab routing rules so the matching Study courses list renders immediately below the Study filter bar and the live Work job cards render immediately below the Work search bar.
4. **Regression protection (`scripts/test_v95_visual_and_ux_fixes.py`):** Added automated checks into `scripts/run_all_checks.py`, regenerated `data/sri_manifest.json`, and bumped `sw.js` to `mzansi-pathways-v95`.
