# Mzansi Pathways — Release Changelog

## v67 (deep hardening of publishing, backups and automation; no learner-facing rule changes)
- **Fixed (Windows):** CRLF line endings made every one of the 91 gates fail with a false "tamper" error after a Windows `git clone`, `--sync` or editor save. New `.gitattributes` (LF everywhere, `.bat` stays CRLF), `core.autocrlf=false` on `--setup`, and `safe_io.normalise_eol()` which `maintain.py`, `github_publish.py` and `doctor.py` use to repair/detect it.
- **Fixed (guide):** Step 9 told solo owners to require status checks on `main`; GitHub then rejects every direct push. Replaced with rules that cannot block the owner. Added the missing "install Python" step, "enable Pages before the first push" and the re-run instructions for a first red deploy, the 60-day scheduled-workflow pause, and failure e-mails.
- **Fixed (publisher):** a protected-branch refusal (`[remote rejected]`) was explained as "GitHub has newer work"; messages reordered and extended (repository not found, files over 100 MB, required status check). `--sync` now explains the "README ticked on creation / unrelated history" case instead of a git error, and sets the upstream branch.
- **Publisher failsafes:** refuses any branch except `main` and a detached HEAD; checks GitHub is reachable up front; after every push asks GitHub which commit it holds and compares ("Confirmed"); only the new safety tag is pushed and old local tags are pruned; new `--verify` (git fsck + GitHub holds your latest commit).
- **Automation:** `scripts/scheduled_backup.py` (`--install` creates a weekly Windows Task Scheduler job: project zip + verified git bundle + off-site copy, never touches your files, writes `backups/last_scheduled_backup.json`; `doctor.py` warns if it stops). `backup_now.bat` for one click.
- **Proof, not hope:** `scripts/restore_drill.py` (also `maintain.py --restore-drill`) restores the newest zip and git bundle into a temp folder and runs all gates. The weekly GitHub backup workflow now runs the drill on its own bundle.
- **Deploy workflow:** the service-worker cache name is stamped with the commit id on every deploy (previously a release that forgot to bump the name left visitors on the old scripts); the refreshed job feed is validated and falls back to the last committed copy; a new `smoke-test` job requests the live site, `sw.js`, `data/index.json`, `js/engine.js` and `manifest.json` after deploy and turns the run red (e-mail) if any fails. Verify workflow cancels superseded runs.
- **Launchers:** `.bat` files fall back to the `py` launcher and print a clear message if Python is missing (the Microsoft Store "python" stub is detected).
- `--setup` aligns `.github/CODEOWNERS` and `SECURITY.md` with your GitHub account (they shipped naming someone else, so GitHub flagged CODEOWNERS and security reports pointed at the wrong repository) and warns if the footer link in `index.html` differs.
- Gate 92 and 16 new tests. Docs: `docs/GITHUB_GUIDE_V67.md`.

## v66 (GitHub publishing and backup hardening; no learner-facing changes)
- **Safe publisher:** `scripts/github_publish.py` + `publish.bat`: preflight, secret and size scan (before and after staging), fail-closed gates, project backup + verified git bundle (+ off-site copy) before the commit, safety tag, push that is never forced, `--sync` (fast-forward or safe rebase, auto-abort on clash), `--rollback` (revert commit), `--bundle`, `--status`, `--dry-run`, `--setup` (refuses addresses holding credentials).
- **Deploy workflow:** publishes only a staged `_site` (app files, no scripts/tests/docs), only from `main`, refuses an empty site. New weekly repository-bundle backup workflow; Dependabot for Actions.
- **.gitignore:** keys, certificates, password stores, tool leftovers.
- **doctor.py:** git, remote, unpublished changes, tracked `.env`.
- **Docs:** `docs/GITHUB_GUIDE_V66.md` (step by step, backups, restore on a new PC, fault table). README refreshed (gate counts were out of date).
- Gate 91 and 10 new tests.

## v65
- **Learner data safety:** damaged saved profile is quarantined and the last good copy restored; failed saves are reported; save-on-close; backup works for large profiles; restore validates the file, keeps a copy and offers Undo; "last backup" reminder; privacy wipe removes every saved copy; blank-screen last resort; OCR and live-job request time limits.
- New browser test `tests/browser_failsafes.py`, run by `maintain.py`. See `docs/HARDENING_V65.md`.

## v64
- **Reviewer backup codes:** 8 one-time, hashed recovery codes per reviewer (`signoff --recovery`, `recovery-status`, `recovery-new`, `code`); burned only after a sign-off passes; audit flag on the sign-off; doctor warns when low.
- **Job feed:** keeps the previous live jobs during an outage instead of wiping them, isolates failing sources, atomic write with a daily copy. Deploy workflow no longer blocked by a feed outage.
- 9 new unit tests. See `docs/HARDENING_V64.md`.

## v63 (hardening release, no learner-facing rule changes)
- **Backups:** checksummed and verified; restore never deletes the backup being restored, never wipes data from a damaged backup, and picks the newest intact one; `--verify-backups`; data-only snapshots; secrets never packed; off-site copy atomic with free-space check.
- **Atomicity:** atomic exclusive run lock; `mz_verify.py` sign-offs/checks written atomically with a safety copy; CSV import and new-year writes validated; crash guard in `maintain.py` auto-restores.
- **Offline/PWA:** service worker no longer fails install on one missing file, saves every listed year, returns clean errors; cache v63. Data loader has a timeout and retry.
- **Preflight:** doctor checks unlisted year files, duplicate ids, stale lock, leftover temp files, secrets, backup health, off-site setting.
- **Gates:** 90 gates (new gate 90), 14 new unit tests. See `docs/HARDENING_V63.md`.

## v62
- **Any intake year:** `scripts/new_year.py` (empty year or last-year starting point that can never show as verified), CSV import now merges instead of overwriting and protects verified records, records are keyed `id@year` so the same programme can exist in every year, "Compared with previous year" note, year buttons for years that have data, no hardcoded year text.
- **All institutions:** the 50 public TVET colleges added as a draft list (no website links until checked against DHET), institution search with province and type filters, year coverage panel, "Institutions" heading now translates.
- **Offline:** service worker serves `data/` files fresh and keeps the last copy; cache bumped to v62.
- **Gates:** 87 gates (new gate 87). Gate 84 now accepts any `mzansi-pathways-vNN` cache name.
## v48 (Current Verified Release)
- **Verification Suite:** 84 automated security, determinism, accessibility, and governance gates.
- **Documentation Suite:** 19 specification and operational guides under `docs/`.
- **2027 Pathway Fixtures:** 5 schema-validated South African pathway records in `data/programmes_2027.json`.
- **Frontend Enhancements:** Institutional Deep Slate civic UI (zero cartoon emojis), first-class 2-way Results entry (`Enter Manually | Scan Report Photo`), live scanner APS preview, full subject Undo stack, expandable NSC Level 1–7 APS scale reference, skippable 7-step interactive tutorial with live demos, consolidated Settings modal with 1-tap Reset Preferences, NSFAS/Missing Middle pre-check, and formula-injection-safe CSV export.
- **GitHub & PWA Hardening:** Network-first `sw.js` (`mzansi-pathways-v48`), fail-closed GitHub Pages CI (`deploy-pages.yml`), static link/domain hygiene checker (`scripts/check_links_and_domains.py`), and SHA-256 integrity manifest.

## Tracked SHA-256 Fingerprints
- `data/programmes_2027.json`: `6b2fb03da14b2814...`
- `index.html`: `cbfce7819bf2cbee...`
- `manifest.json`: `28960ff0012a5017...`
- `scripts/match_engine.py`: `27d2ca14f075a7b6...`
- `sw.js`: `514ed2922fd216e4...`

## v57
- Real on-device OCR (Tesseract.js) replaces the unsupported TextDetector for report card, CV and job flyer scanners.
- Separate "Choose from Gallery / Files" and "Take Photo" inputs (gallery no longer blocked by `capture`).
- CV upload now reads PDF and DOCX (pdf.js, mammoth); scanned PDFs fall back to OCR.
- Parser never guesses a mark (removed the silent 50 default); apply is blocked until every row has a mark and the learner confirms; ID numbers are scrubbed.
- Mobile overflow fixes, 44px touch targets, service worker v57 with optional offline OCR files (`scripts/fetch_vendor.sh`).

## v58
- App now uses the strict engine (`js/engine.js`): unverified data can never show green; APS is per-institution (UP, UJ, UMP loaded; others tell the learner to use the official calculator).
- Year-aware: intake-year picker (default rolls to next year from August), rules from another year are always treated as unverified, banner when a year has no checked data.
- `data/institutions.json` (26 public universities and UoTs), `data/index.json` + `data/programmes/<year>.json` loader (`js/data.js`).
- `scripts/csv_to_programmes_json.py` + `data/programmes_template.csv`: validated import, rejects rows without source, https URL, verify date or valid APS.
- Province filter, "Show 20 more" paging. Fixed CV upload bug. `tests/browser_check.py` real-browser test.

## v59
- Multi-check verification (`scripts/mz_verify.py`, gate 85, docs V21): 5 document checks with hashing and text searches, 2 independent TOTP-authenticated reviewer seals, 120-day freshness, tamper-proof against later edits. App downgrades unproven "verified" records.

## v60
- 40 careers across 11 sectors (`data/careers.json`, descriptions only, no unsourced salaries) and a funding & bursaries section (`data/bursaries.json`, names only, no unverified amounts or dates).
- `mz_verify.py queue <year>`: expired / expiring / to-do list. CI: weekly run, reviewer secrets passed as `MZ_REVIEWER_SECRETS` JSON, seals enforced when present.

## v61
- Institution pages (Study > Institutions): type, province, APS status, loaded/verified counts per year, official site.
- Draft isiZulu, siSwati, Xitsonga for key screens with in-app draft notice; gate 86 blocks claiming "reviewed" without a named reviewer.
