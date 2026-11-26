# Mzansi Pathways v10 — Release & Data Maintenance Runbook

## 1. Before Editing Any Programme Rule
1. Run `python scripts/backup_and_restore_data.py` to create a verified rollback snapshot (`data/programmes_2027.bak.json`).
2. Stage new prospectus rules via `scripts/stage_prospectus_rules.py` so conflicting requirements are held for QA.
3. Update `integrity_manifest.json` via `python scripts/gates/18_verify_sha256_integrity_manifest.py --write`.

## 2. Mandatory 26-Gate Pre-Release Check
Run `python scripts/run_all_20_gates.py`. All 26 gates must return `PASSED` (`26/26 PASSED`) before deploying to GitHub Pages or Cloudflare Pages.
