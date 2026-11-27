# Mzansi Pathways v106 Changelog (Unified v104 + v105 Release)

## Phase 1 Unification (v104 Automation + v105 Security & UX Fixes)
- **Restored Full GitHub Automation Layer (`.github/`):** Merged `dependabot.yml` and all 4 workflows (`data-refresh.yml`, `prospectus-pipeline.yml`, `link-health.yml`, `data-digest.yml`) from v104 so all CI gates and scheduled data pipelines run green.
- **Complete Shared-Device Privacy Wipe (`js/app.js`):** Hardened `wipeLocalProfile()` to clear all `mz*`/`mzansi*` `localStorage` keys, `sessionStorage` quarantine copies, and `docChecklist` without re-saving state.
- **Origin-Safe Backup Allowlist & POPIA SA ID Scrubbing (`js/v97_resilience_ux.js`, `js/v99_encrypted_backup_and_perf.js`, `js/ocr.js`):** Scoped backup export/import strictly to Mzansi Pathways keys (blocking `__proto__`/`constructor`/`prototype` and enforcing a 256 KB cap), redacted 13-digit SA ID numbers from plaintext backups and OCR/PDF/DOCX output, and removed CSP-blocked `cdn.jsdelivr.net` OCR fallbacks.
- **XSS Sink Removal & Header Hardening (`js/creator_studio.js`, `js/i18n.js`, `_headers`):** Replaced `innerHTML` in the Creator Studio badge and `i18n.js` language selector with safe DOM/SVG node construction, and added `X-DNS-Prefetch-Control: off` plus tighter `Permissions-Policy`.
- **PWA Hash Routing & Mobile UX Polish (`js/screens.js`, `css/civic_mobile_a11y.css`, `v97`–`v102` Settings modules):** Added `routeFromHash()` + `hashchange` routing for `#study`/`#work`/`#plan`/`#marks`/`#funding`, eliminated fixed-position floating button overlaps on mobile, and converted the 5 Settings panels into compact collapsible `<details>` accordions.
- **Service Worker & 21/21 Verification (`sw.js` -> `mzansi-pathways-v106`, `scripts/test_v106_unified_security_and_ux.py`, `scripts/run_all_checks.py`):** Verified all 21 suites and 535 site tests pass with fresh SHA-384 SRI hashes.

## v107 audit pass
- `index.html`: 12 header, tab and modal buttons now declare `type="button"` so they can never submit an enclosing form.
- Audit found no duplicate ids, no missing image alt text, no inline styles or handlers, and no JS syntax errors in any script.

## v108 clean layout
- `js/clean_layout.js` (new): long cards on Work, Plan and Vault fold into tappable sections; the first visible one stays open. Nodes are moved, not rebuilt, so all buttons keep working.
- Every `<details>` in the app now shows an arrow, a 48px tap row and a focus ring (`css/civic_mobile_a11y.css`). Institutions, Funding and Guide open by default so they no longer look empty.
- "Jump / Help" button lifted clear of the bottom dock; "(v94)" removed from the Toolkit title; service worker is `mzansi-pathways-v108` so phones fetch the new build.

## v109 courses grouped
- `js/catalogue.js`: the Courses list now shows one row per course (same name and qualification type) instead of repeating it once per university. 586 course rows become 80 courses. Tap a course to see each institution with its own APS, Life Orientation rule and result. Courses offered by one institution still show as a normal card.
- The view switch is now "One row per course" (default), "By university" or "Every row". The summary tiles count courses in the default view. "Show more" pages by course.
- Nothing is merged or averaged: each institution keeps its own numbers. The group badge shows the best result, e.g. "Likely qualify at 2 of 5".
- Open/closed state of courses survives a re-render (for example after tapping Compare).
- `css/civic_mobile_a11y.css`: spacing for the new rows. Service worker is `mzansi-pathways-v109`; SRI manifest rebuilt.
- Marks to university to courses flow: the Courses screen now has "Step 2 · Pick a university", a list of all institutions ranked by how many courses your marks likely meet ("30 you likely qualify for · 2 close · 43 listed"). Tapping one opens that university grouped by department, showing only the courses you qualify for. Department chips show "(k of n)", and "← All universities" goes back. "See its courses" on the Institutions screen opens the same view. Without complete marks it shows course counts only and never guesses.
- "What you can do right now": a panel on the Courses screen groups everything the person can start with their marks into Higher Certificates (bridging), Diplomas, TVET (NATED and NC(V)) and Degrees, with a count for each. Tapping one filters the list. It also points to learnerships, apprenticeships and QCTO on the Work tab.
- Courses you do not meet no longer end in a red "Not yet". The label is "Start with another route", the unmet minimums are shown as plain facts ("What this course asks for"), and the card says "You do not have to go back to school" with a button to the courses in that field the person can start now.
- Fix: "Clear filters" on the Courses screen did nothing after the university-list change (a dropped `'click'`). It works again.
- "Bridge to" on every Higher Certificate card: lists up to three diplomas or degrees in the same field at the same institution (lowest APS first) as possible next steps, and marks any you may already meet directly so nobody takes a bridge they do not need. The catalogue holds no credit or articulation rules, so every block says "Not confirmed: ask the institution whether this certificate gives you credit or a guaranteed place". Where none is loaded it says so and tells the person to ask the institution.
