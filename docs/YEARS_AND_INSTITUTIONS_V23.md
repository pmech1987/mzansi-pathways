# Intake years and institutions (V23)

## Any year
- Every intake year is one file: `data/programmes/<year>.json`, listed in `data/index.json`. The Study tab offers last year to three years ahead, and any loaded year.
- Start a year: `python scripts/new_year.py 2028`. It creates an empty file and lists it. Add `--copy-from 2027` to copy last year's records as a starting point.
  Copies become `pending_review`, lose their checks, sign-offs, seal and verify date, and say `carriedFrom`. They are last year's numbers, never this year's rules, and can only become verified after the full 5 checks and 2 sign-offs for the new year.
- Import rows: `python scripts/csv_to_programmes_json.py rows.csv`. Rows are now merged into each year file by id, so a second import no longer erases the first. A verified record is never replaced unless you pass `--allow-unverify`.
- The same programme can exist in several years. The app keys records as `id@year`, so 2027 and 2028 both load. The programme panel shows "Compared with <year-1>" when both years exist. This is information only and never changes eligibility.
- The service worker fetches `data/` files fresh and keeps the last copy for offline use, so new years and corrected rules reach learners without waiting for a cache change.
- Year text in headers and checklists follows the chosen intake year.

## All institutions
- 26 universities and universities of technology, plus the 50 public TVET colleges (76 in total).
- Institution cards can be searched and filtered by province and type.
- TVET entries are `listStatus: "draft_unchecked"`. The names and provinces were compiled without access to the DHET list, and they have no website links on purpose. Check each against the official DHET public TVET college list, add its https `officialUrl`, then set `listStatus` to `checked`.
- `institutions.json` holds facts only. Gate 87 rejects any admission rule field in it.

## What still needs a person
Real programme rules per year (5 checks, 2 sign-offs), the DHET check of the TVET list, and a fluent-speaker review of the translations.

## Automation
`python scripts/maintain.py --zip` (or double-click `maintain.bat` on Windows) creates the year files for the current and next application year, shows what changed since the last seal, refreshes the integrity manifests, runs every gate and the browser test, writes `dist/mzansi_pathways_vNN.zip`, and prints the to-do list that only a person can do. It never marks a record verified. GitHub Actions already runs the gates on every push and weekly.
