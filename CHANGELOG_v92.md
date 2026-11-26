# v92: self-running data automation

Added (from the v92 scripts):
- `scripts/check_links.py` + `.github/workflows/link-health.yml`: weekly link health (ok / moved / suspect / failing / unknown). Reports only; never edits a fact.
- `scripts/roll_year.py`: moves the intake year on by itself (adds next year's sources from 1 June, switches off finished years, adds empty year files). Never deletes. Runs in the nightly refresh and the weekly pipeline.
- `scripts/import_sheet.py`: inbox sheets for bursaries, key dates and institution links, under the same trust rules as programmes.
- `scripts/make_digest.py` + `.github/workflows/data-digest.yml`: one GitHub issue, "Data attention list", opened/updated when a person is needed and closed when all clear. Read-only token apart from issues.
- `scripts/test_automation.py`: 27 tests, no network.

Changed:
- `scripts/run_pipeline.py` skips sources marked `"active": false`.
- All data-writing workflows share one lock (`mz-data-writes`) and push only through `scripts/push_data.sh` (rebase and retry, never forced).
- Workflow inputs reach shell lines only through env vars (no script injection from the "only"/"year" boxes).
- `test_automation.py` runs before anything is committed.

## Free-tier AI reader and efficiency
- Gemini support (`GEMINI_API_KEY`, free tier) alongside Anthropic; provider chosen automatically or by `MZ_LLM_PROVIDER`. API keys go in headers, never URLs.
- AI answers cached by page text; paced requests; daily cap; patient retry on 429/5xx; quota errors postpone pages instead of failing the run; the report and row checks say "postponed".
- Prospectus PDFs are re-downloaded at most every 6 days (`MZ_PDF_MAX_AGE_HOURS`).
- Pipeline workflow now runs nightly (cheap, so the free-tier backlog clears in days and rows reach the 2-run check sooner).
- Tests: 7 new for the AI reader. PDF hashing no longer leaves files open.

## Hardening: failsafes, backups, security
- **One gate for publishing** (`scripts/push_data.sh`): kill switch, data validation, shrink circuit breaker, file-count and size limits, secret scan, rebase-and-retry without forcing, abort on conflict.
- **`scripts/validate_data.py`**: invalid JSON, non-https or private-address or blocked-domain links, injected script/HTML/control characters, duplicate ids, and (against git) any data file that suddenly lost over 30% of its items.
- **`scripts/backup_data.py`**: checksummed snapshots, safe restore (refuses tampered or path-escaping archives, saves what it replaces). Every workflow makes one first and keeps it as a 30-day artifact outside git.
- **Kill switch** `data/automation_pause.json`; **alerts**: a failing workflow opens one issue and closes it on recovery; the digest also flags a paused or silent (3+ days) nightly refresh.
- **Pipeline circuit breaker**: if a new prospectus read gives under half the rows an institution had, the old rows are kept and it is reported.
- **Network safety** (`mz_common.safe_open`): https only, no credentials in URLs, refuses private/internal addresses (also on redirects), 5-redirect limit; AI keys go only to the two provider hosts, never follow redirects.
- **Prompt-injection guard** in the AI reader prompt; every fetched byte is still verified against the document.
- Dependabot for Actions, pinned PDF dependency ranges, stricter `.gitignore` (keys, `.env`, backups), unclosed-file fixes.
- `scripts/run_all_checks.py` (one command) and `RUNBOOK.md` (what to do when something looks wrong). 30 new tests, including the real push script against a throwaway repository.
