# Runbook: when something looks wrong

Everything the bots publish goes through one gate (`scripts/push_data.sh`). It stops on: kill switch on, invalid data, an injected `<script>` or a bad link, a sudden shrink of any data file, too many changed files, or anything that looks like a secret. Nothing wrong is published; the job turns red and a GitHub issue ("Automation failed: ...") opens by itself. It closes itself when the job next succeeds.

## 1. Stop the bots (10 seconds)
Edit `data/automation_pause.json` on GitHub: set `"paused": true`, commit. Every bot keeps running its checks but publishes nothing. Set it back to `false` to resume. The weekly digest issue reminds you while it is paused.

## 2. Look at what happened
- Issue "Automation failed: ..." links to the red run. Open the red step.
- `reports/pipeline_report.md`: every programme row and why it was or wasn't verified. "Kept previous rows" means a new prospectus read far worse than the old one (layout change); the old rows were kept on purpose.
- Issue "Data attention list": the one weekly list of things a person should look at.

## 3. Undo a bad publish
Preferred: GitHub > Commits > open the bad `data: ...` commit > **Revert**. Nothing is lost.
If the repository itself is damaged: Actions > any recent run > Artifacts > `data-backup-...` (kept 30 days), unzip, then:
```
python scripts/backup_data.py --list
python scripts/backup_data.py --restore backups/data-<time>.tar.gz
```
Restore checks the checksum first, refuses odd archives, and saves the data it replaces before overwriting.

## 4. Check before you publish your own changes
`python scripts/run_all_checks.py` (needs Python 3.9+, and Node for the site tests). One line per step, PASS or FAIL.

## Safety facts worth knowing
- **Secrets** (`GEMINI_API_KEY`, `ANTHROPIC_API_KEY`) live only in Settings > Secrets and variables > Actions. Workflows pass them as environment variables and never print them. Keys are sent only to `api.anthropic.com` and `generativelanguage.googleapis.com`, in headers, never in URLs, and those calls never follow redirects.
- **If a key leaks:** delete it at the provider (AI Studio / Console), create a new one, update the GitHub secret. Then search the repository for the old one.
- **Outbound fetches** (prospectuses, link checks, job boards) are https only, refuse private/internal addresses (also after redirects), have size and time limits, and identify themselves honestly.
- **Untrusted text:** prospectus text is treated as data. The AI reader is told to ignore instructions inside it, its answer is only a cross-check, and every value must also appear in the document itself.
- **Bots cannot write code to the site.** The digest workflow has read-only code access. The data workflows write only the paths they name (`data`, `reports`, `js`, `inbox`).
- **Recommended GitHub settings (free):** two-factor on your account; Settings > Code security: enable secret scanning, push protection and Dependabot alerts; Settings > Actions > General: "Read repository contents" by default (workflows ask for more only where they need it).
- **Dependabot** opens a pull request when a GitHub Action has an update. Nothing merges by itself; read it and merge.

## 5. Fast Failsafes & Release Verification (v97–v100)
- **One-command emergency data rollback:** `python3 scripts/backup_data.py --restore-latest` (automatically picks the newest checksum-verified backup in `backups/`).
- **System-wide security, SRI, SW & CI audit:** `python3 scripts/health_audit.py`
- **One-command production release check:** `python3 scripts/verify_release.py` (rebuilds `data/sri_manifest.json`, runs all suites via `run_all_checks.py`, and verifies zero stray temp files).
