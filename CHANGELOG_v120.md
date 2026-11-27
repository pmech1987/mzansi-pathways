# Mzansi Pathways v120 — Round 6 (Focus G/H/I + Convergence Polish)

## Fixes
- **HI-01 (High) — Null-Safe Mark Input & Android Decimal Keypad (`js/app.js`):** Fixed `value="${s.mark}"` rendering `"null"` when a learner clears a mark (changed to `value="${s.mark ?? ''}"`), added `step="any" inputmode="decimal"` on mark/OCR inputs and `inputmode="numeric"` on affordability inputs so Android Chrome accepts decimal marks cleanly, and routed `data-scan-mark` through `parseMark()` so comma decimals never store `NaN`.
- **HI-02 (Medium) — WhatsApp / Open Graph Preview (`index.html`):** Changed relative `./icon-512.png` to absolute HTTPS `og:image`, added `og:url` and `twitter:card` for clean WhatsApp sharing.
- **HI-03 (Medium) — Per-Subject Screen-Reader Labels (`js/app.js`):** Updated all 7 mark inputs from identical `aria-label="Mark"` to `aria-label="${esc(s.name || 'Subject')} mark percentage"`.
- Added `scripts/test_v120_ux_polish_and_convergence.py` into `scripts/run_all_checks.py` and bumped `sw.js` cache to `mzansi-pathways-v120`.
