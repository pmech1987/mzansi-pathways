# Mzansi Pathways: setup and where everything goes

## 1. First time (10 minutes)
1. Extract the zip. You get one folder, `mzansi-pathways`. Keep it somewhere that is NOT temporary (not Downloads). Everything below is relative to it.
2. Install Python 3.9+ (python.org). Optional: Node.js (JavaScript tests) and `pip install playwright` then `playwright install chromium` (browser test).
3. Run `python scripts/doctor.py`. It lists what is missing and how to fix it.
4. Run `python scripts/maintain.py --zip` (Windows: double-click `maintain.bat`). Expect "92/92 PASSED" or more.
5. Open the app: in the folder run `python -m http.server 8000`, then browse to http://localhost:8000. (Opening `index.html` by double-click will not load the data files.)

## 2. Where everything goes
| You want to... | Put / edit this | Then |
|---|---|---|
| Add programme rules (the main job) | Copy `data/programmes_template.csv`, fill one row per programme from the official prospectus | `python scripts/csv_to_programmes_json.py yourfile.csv`. Rows are merged into `data/programmes/<year>.json`. They arrive as `pending_review` |
| Start a new intake year | nothing to edit | `python scripts/new_year.py 2029` (add `--copy-from 2028` for a starting point). `maintain.py` also does this for the current and next year |
| Verify a record (turns it green) | records in `data/programmes/<year>.json` | `python scripts/mz_verify.py queue <year>` then the 5 checks and 2 sign-offs in `docs/PROSPECTUS_VERIFICATION_V21.md` |
| Add reviewers | `data/reviewers.json` (public, no secrets) | `python scripts/mz_verify.py enroll <id> <n>`; each reviewer's secret goes ONLY in the environment variable `MZ_SECRET_<ID>` or the GitHub secret `MZ_REVIEWER_SECRETS`. Write the 8 backup codes it prints on paper (see `docs/HARDENING_V64.md`) |
| Check the 50 TVET colleges | `data/institutions.json`, entries with `"listStatus": "draft_unchecked"` | Compare each name and province with the official DHET list, add the college's https `officialUrl`, set `"listStatus": "checked"` |
| Add a university's APS method | `data/institutions.json` field `apsMethod`, and the matching function in `js/engine.js` | Only after checking the institution's published method for that year |
| Review a translation | `js/i18n.js` (strings) and `docs/LANGUAGES_V22.md` | After a fluent speaker checks every line: write `<Language> reviewed by <name>` in the doc, then set `reviewed: true` for it |
| Offline photo scanning | `vendor/tesseract/` | Run `scripts/fetch_vendor.sh` once (needs internet and npm), then put `eng.traineddata.gz` in `vendor/tesseract/` by hand |
| Publish to GitHub | follow `docs/GITHUB_GUIDE_V67.md` once (account, Git, empty repo, `python scripts/github_publish.py --setup <https-address>`) | afterwards double-click `publish.bat`. It scans for secrets, runs every gate, backs up, commits and pushes (never forced). `.github/workflows/deploy-pages.yml` then re-runs all gates and deploys only if every one passes |

Folders: `index.html` (the app), `js/` (engine, data loader, OCR, languages), `data/` (all facts and rules), `scripts/` (tools) and `scripts/gates/` (the checks), `tests/`, `docs/`, `.github/` (automation), `sw.js` (offline), `backups/` and `dist/` (made for you, never edit; both are kept out of GitHub).

## 3. The routine
Run `python scripts/maintain.py --zip` after ANY change. It backs up first, creates year files, refreshes the seals, runs every gate, builds `dist/mzansi_pathways_vNN.zip`, and prints what only a person can do. If a gate fails for a real reason it stops and leaves the seals alone.

## 4. Backups and recovery
- Automatic: a backup zip (code, data, scripts, docs, seals) is made in `backups/` before every change. The newest 10 are kept.
- Second copy: `python scripts/maintain.py --zip --offsite D:\MzansiBackup` (a USB drive or a synced cloud folder), or set the environment variable `MZ_OFFSITE_DIR` once. Copies are hash-checked. Do this: a backup on the same PC is lost with the PC.
- Undo: `python scripts/maintain.py --list-backups`, then `python scripts/maintain.py --restore` (newest intact backup) or `--restore <file>`. The state before the restore is saved first, and a damaged backup is refused, never half-applied.
- Check your backups: `python scripts/maintain.py --verify-backups`. Data only: `python scripts/backup_and_restore_data.py snapshot|verify|restore`. Every edit made by `mz_verify.py` also keeps a copy in `backups/files/`.
- Details of every safeguard: `docs/HARDENING_V63.md`, `docs/HARDENING_V64.md` (reviewer backup codes) and `docs/HARDENING_V65.md` (learner data safety).
- GitHub copies: `python scripts/github_publish.py --bundle --offsite <folder>` saves the whole history as one verified file; a weekly workflow also keeps one on GitHub for 90 days. Undo a published change with `--rollback`, bring in outside changes with `--sync` (see `docs/GITHUB_GUIDE_V67.md`).
- Hands-free: `python scripts/scheduled_backup.py --install` (Windows) makes a checked project zip + git bundle every Sunday and copies them off-site; `python scripts/scheduled_backup.py --status` and `python scripts/doctor.py` tell you if it stopped. One click any time: `backup_now.bat`.
- Prove it works: `python scripts/maintain.py --restore-drill` restores the newest zip and git bundle into a temporary folder and runs every gate. Do this monthly.
- Line endings: Windows can silently turn LF into CRLF, which makes every seal fail. `maintain.py` and `publish` repair it automatically; `.gitattributes` prevents it.
- Check a downloaded release: compare `mzansi_pathways_vNN.zip.sha256` with the zip (`certutil -hashfile file SHA256` on Windows).

## 5. If something goes wrong
| Message | Meaning | Fix |
|---|---|---|
| "not valid JSON" | a data file is damaged | `python scripts/maintain.py --restore` |
| "Another run is in progress" | a previous run crashed | delete `.maintain.lock` (locks older than 1 hour are ignored automatically) |
| Reviewer lost their phone | authenticator unavailable | `signoff ... --recovery <backup code>`, then `recovery-new` (see `docs/HARDENING_V64.md`) |
| "That backup is damaged" | the zip failed its checksum | `python scripts/maintain.py --verify-backups`, then restore an older good one |
| "Gates failed for a reason other than the expected seal refresh" | a real problem, shown on screen | fix it, or `--restore` |
| `[STOP]` from `github_publish.py` | a secret, a failed gate, or newer work on GitHub | read the line it prints; nothing was pushed. Table of fixes in `docs/GITHUB_GUIDE_V67.md` |
| Data does not load, page is empty | opened by double-click | use `python -m http.server 8000` |
| Learners see old rules | cached copy | the app now fetches data fresh; reload once online |

## 6. What the app will never do
It never marks a programme verified by itself. Unverified rules are amber, never green, and every screen tells the learner to confirm with the institution. Never pay anyone to apply; the official CAS WhatsApp is 081 308 4196.
