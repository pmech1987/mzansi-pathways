# Mzansi Pathways — SOLO Track Notes (v127 — All B1–B12 Addressed)

## Completed Turns
- **Turn 1 (v125):** Closed B4 (light-mode select contrast), B8 (explicit bordered checkboxes, docked Jump/Help in More, 2-screen ↑ Top), B9 (responsive stacked Plan cards <600px).
- **Turn 2 (v126):** Created `js/modules/selectors.js` (`window.MZSelectors`), closing B5 (counts & unsourced fees), B6 (computed `getTrust`), B10 (81-pair province consistency), B11 (sample-job honesty).
- **Turn 3 (v127):** Created `config/eligibility_config.json`, `contracts/CONTRACT.md`, deterministic `scripts/build_data_manifest.py` → `data/data_manifest.json`, and unified `:root`/`body.dark-mode` CSS design tokens + tabular numerals in `css/mzansi_ui.css`, closing B1, B2 (fixture-verified), B3, B7 (single toolkit mount), and B12.

## Human Tasks Remaining Outside Code
1. Add `GEMINI_API_KEY` (or `ANTHROPIC_API_KEY`) to GitHub Secrets & click **Run workflow** on `Prospectus pipeline`.
2. Native-speaker review of the 10 non-English draft language packs in `js/i18n.js` (`reviewed: false`).
3. South African POPIA attorney review before enabling optional cloud OTP sync.
4. Real-phone QA on v127 after deploying via Termux.
