# Mzansi Pathways v122 — Real-Phone Screenshot Fixes

## Fixes (From Live Android Screenshots)
- **Invisible White-on-White Dropdowns & Inputs (`css/mzansi_ui.css`):** Locked `color: #0e1b3d`, `background-color: #f8fafc`, and `color-scheme: light` on light-mode `<select>`, `<input>`, and `<textarea>` elements so Android OS Dark Theme never renders white text on white backgrounds.
- **Removed Ugly `0 loaded, 0 verified` Year Pills (`js/modules/funding.js`):** Replaced the 5 empty year buttons (`2026`–`2030`) on Study → Institutions with the real loaded course count (`586 courses loaded across 27 institutions`) and only displays intake year pills that actually contain records.
- **Automated SA Municipality & Department Portal Finder (`js/app.js`):** Made `#muni-url` optional, added 1-tap quick-add buttons (`DPSA Vacancies`, `Mpumalanga Govt`, `Thembisile Hani`, `eMalahleni`, `Tshwane`), and auto-resolved SA towns/municipalities/departments to official `.gov.za` URLs so learners never get blocked by `"Please fill in this field"`.
- **Clean Layout & Mobile Fit (`css/mzansi_ui.css`, `css/civic_mobile_a11y.css`):** Shrunk `Jump / Help` and `↑ Top` floating pills, added `136px` bottom scroll clearance on `#app-main`, and tightened `.mz-sub` pills so `Verify` no longer clips on 360px screens.
- Added `scripts/test_v122_real_phone_ux_fixes.py` into `scripts/run_all_checks.py` and bumped `sw.js` to `mzansi-pathways-v122`.
