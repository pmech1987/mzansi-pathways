# v96: Unique Custom Brand Icon, Dark Mode Tier Badge Fixes, Open Tabs & Live Multi-Uni APS

1. **Unique, Original, Trademark-Safe Brand Icon (`favicon.svg`, `icon-192.png`, `icon-512.png`):** Replaced the generic `MP` square with the bespoke **Mzansi Rising Compass Pathways** emblem (midnight-slate shield, three ascending Plan A/B/C pathways in sky/emerald/gold converging to a 4-point compass star — zero state emblems, zero generic letters).
2. **Dark Mode Contrast Fixes (`css/mzansi_ui.css`):** Fixed `2. Career Path` button, active `HL` subject pill, and `.bg-emerald-100` / `.bg-teal-100` / `.bg-blue-100` / `.bg-slate-100` course qualification badges so nothing renders white-on-white or white-on-mint.
3. **Institutions & Funding Tabs Auto-Expanded (`js/app.js`, `js/catalogue.js`):** Set `<details open>` on dedicated `Institutions` and `Funding & bursaries` sections so learners see the full list immediately instead of a collapsed bar.
4. **Live Multi-University APS Fixed (`js/app.js`):** Fixed `renderMultiUniApsComparison()` so UP/UJ/TUT (`best 6 excl. LO`) and UMP (`LO ÷ 2`) compute directly from entered marks instead of showing `Incomplete`.
