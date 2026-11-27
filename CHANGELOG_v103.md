# Mzansi Pathways v103 Changelog

## Front-End Interactive Cost & Funding Estimator
- **Offline SA Annual Study Cost & Funding-Gap Estimator (`js/v103_cost_estimator.js`, strict-CSP & zero `innerHTML`):** Lets learners compare indicative annual costs across Public Universities, Universities of Technology, and Public TVET Colleges for home vs. residence living and NSFAS / Missing Middle / Self-Funded brackets, with tailored South African funding guidance.

## Back-End Shared Security & Curriculum Expansion
- **Shared URL Blocklist Hardening (`scripts/mz_common.py`):** Expanded `BLOCKED_DOMAINS` with `wa.me`, `t.me`, `cutt.ly`, `shorturl.at`, `goo.gl`, `ow.ly`, `is.gd`, `tiktok.com`, `instagram.com`, and `x.com` so every validator, importer, and pipeline script rejects shorteners and social-media traps consistently.
- **Expanded DBE NSC Subject Aliases (`scripts/csv_to_programmes_json.py`):** Added Technical Mathematics, Technical Sciences, Civil/Electrical/Mechanical Technology, Visual Arts, Dramatic Arts, Music, Consumer Studies, and Hospitality Studies so technical and arts programmes import cleanly without false rejections.
- **Service Worker & Full Verification (`sw.js` -> `mzansi-pathways-v103`, `scripts/health_audit.py`, `scripts/test_v103_estimator_and_common.py`, `scripts/run_all_checks.py`):** Added `js/v103_cost_estimator.js` to `CORE` and strict-CSP auditing, rebuilt `data/sri_manifest.json` (37 assets), and passed `scripts/verify_release.py`.
