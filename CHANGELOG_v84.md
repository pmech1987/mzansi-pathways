# v84 changes
- Creator Studio: inline <style>/<script> moved to css/creator_studio.css and js/creator_studio.js (the strict CSP was blocking them, so the page would have been unstyled and dead when deployed). Saved entries are now HTML-escaped.
- Encrypted backups: 600,000 PBKDF2 rounds (was 120,000), count stored in the file (format v2). v1 backups still restore. Tampered or downgraded files are refused.
- Speech: chunked reading (long text no longer cuts out on Android), best local voice picked, isiZulu voice used when selected, speech stops on leaving the page.
- escapeHtml now also escapes the apostrophe.
- Accessibility: skip link, dialogs trap focus and return it on close, unlabeled dialogs get names, visible focus ring.
- Service worker v84: Creator Studio saved for offline, query-string-safe offline fallback, only same-origin pages cached.
- Headers: manifest and icon caching, Creator Studio not indexed, extra Permissions-Policy and manifest-src.
- Head: apple-touch-icon, Open Graph, color-scheme.
- New: tests/run.mjs (node tests/run.mjs) checks JSON, referenced files, CSP-blocked inline code, duplicate ids, https links, date formats and engine maths (425 checks).

# v85 changes (works on older and cheaper phones)
- Fixed a regex lookbehind in the scam checker. On iPhones older than iOS 16.4 it is a SyntaxError that stops the whole app from loading. Replaced with compatible code.
- Scam checker now also flags: eWallet/CashSend/Mukuru transfers, more link shorteners, WhatsApp-only/pressure applications, "100% guaranteed job", requests for ID copy/bank details/PIN/OTP, and NATED N1-N3 (phased out 2024). "No registration fee" is no longer flagged as a fee.
- guard.js now says "this browser is too old, please update" when a SyntaxError occurs, instead of a misleading missing-files message.
- 100dvh fallbacks so mobile address bars no longer cut off the page or More sheet.
- Asks the browser to keep saved marks safe from storage eviction (navigator.storage.persist).
- Tells the user once when a new version has been installed.
- tests/run.mjs now also fails on regex lookbehind and very new JS features (461 checks).

# v86 changes
- Language fix: the Settings language picker only changed the greeting, because i18n.js was never connected to it. It now switches the translated screen text, remembers the choice after reload, and the document language is set for screen readers.
- Added Afrikaans (draft) to the translation table, and siSwati and Xitsonga to the picker. All are marked draft until a fluent speaker reviews them.
- tests/run.mjs checks every translation has one line per English key and the picker lists all five languages (471 checks).

# v87 changes
- Afrikaans (draft) now covers the real navigation and home-screen labels (Career Paths, Study Paths, Work Paths, home cards and buttons), not just 19 key phrases. Switching back to English restores every original label.
- Verified in a browser: the service worker caches 33 files and the app and Creator Studio both load with the network switched off; an automated scan of all six tabs at phone width found no unlabeled buttons or inputs, no images missing alt text, and no sideways scrolling.

# v88 changes
- Larger touch targets (40px) on phones and tablets.
- Removed a duplicate Alt+number keyboard handler (dead code).
- Errors stay hidden from learners but the last 20 are kept in window.__mzErrors for troubleshooting.
- Added 404.html (works with the site styles) and robots.txt (keeps Creator Studio and raw data out of search).
- All earlier browser checks re-run and passing: CSP-clean pages, focus handling, backup round trip, scam checker, accessibility scan.

# v88 changes
- New in Work > Verify: "Verify a private college or qualification". Checks the format of a DHET registration number and a SAQA ID, and warns about retired qualifications (for example SAQA 78964). It says clearly that it cannot confirm registration and points to the DHET register and 0800 87 2222. Built from the previously unused js/features/trust_guards.js, now a normal script that works offline.

# v89 changes (automation)
- New scripts/ folder (the files pointed at scripts that were missing from the bundle):
  - csv_to_programmes_json.py: adds or corrects programme rows from a CSV or a Creator Studio export. Rejects rows without an https official source, a source document and a check date, with unknown institutions, bad APS or dates. Never accepts "verified" from a file. Updates data/index.json so a new intake year appears in the app and offline cache.
  - build_catalogue.py: rebuilds js/catalogue_data.js from data/catalogue.json (byte-for-byte the same output as before; only the build id changes).
  - refresh_data.py: daily event statuses, drops expired jobs, reports stale or past-closing programme rows. Never edits a programme.
  - fetch_jobs.py: pulls open roles from the official Greenhouse/Lever boards in data/public_ats_boards.json, keeps old rows if a board is down.
  - test_scripts.py: 16 tests; tests/run.mjs now runs them and checks the catalogue is in step.
- New .github/workflows/data-refresh.yml: runs nightly and when a sheet is added to inbox/, runs all checks first, commits only if they pass.
- New inbox/ folder for programme sheets. data/automation_status.json now also reports programme counts and stale rows.
- Creator Studio v90: exports the same format the importer reads (intake year, route, official link, check date), so files go straight into inbox/. Edit button, same programme replaces the old entry, checks run on the phone before export, "verified" removed from the form (a second person must confirm), old queues migrated automatically, storage-blocked warning, load-a-saved-file, clear queue, copy fallback, tab counts, focus outlines. Added CREATOR_STUDIO.md. APS limit in the importer raised to 600 so UCT-scale rows are accepted.

# v91 changes (prospectus automation)
- New prospectus pipeline (scripts/run_pipeline.py + pipeline_*.py, data/sources.json, .github/workflows/prospectus-pipeline.yml, PIPELINE.md): finds the official prospectus PDF, reads it with two PDF engines (and an optional AI reader), runs 14 independent checks per row with up to 10 retry rounds, and publishes auto_verified / pending_review rows; failed rows are never published. Weekly re-check; removed programmes disappear; a person's verified rows are never overwritten.
- App: js/data.js treats auto_verified as verified only when all 14+ automatic checks passed and the row is under 120 days old; the source line says "Auto-checked against the official prospectus".
- Closing date is optional for pipeline rows (the app already shows "Check official portal"). tests/run.mjs: 483 checks, including the pipeline tests.
