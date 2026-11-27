# Mzansi Pathways v115 Changelog (Round 1 Adversarial Security & Privacy Fixes)

- **Blocked Zero-Width & Unicode NFKC Filter Bypasses (A-01):** Added `normalize_for_security()` in `scripts/mz_common.py` (NFKC canonicalization + stripping `\u200b-\u200f`, bidi overrides, and soft hyphens) and wired it into `scripts/community_submissions.py`, `scripts/fetch_jobs.py`, and `scripts/refresh_data.py`, with matching JS normalization in `js/ocr.js`, `js/prospectus_check.js`, and `js/modules/work.js`.
- **Fixed Post-Wipe `pagehide` Re-Persistence Bug (A-02):** Updated `wipeLocalProfile()` in `js/app.js` to also clear in-memory `savedCvs`, `cvQualifications`, `savedFlyerJobs`, and `subjectHistory`, and added a `justWiped` guard so closing the tab after wiping never re-saves cleared state into `localStorage`.
- **Removed Duplicate Workflow Staging Folder (A-03):** Removed redundant `github_workflows_to_add/` now that `.github/workflows/community-submissions.yml` is active and audited.
- **Verification (`sw.js` -> `mzansi-pathways-v115`, `scripts/test_v115_adversarial_security.py`):** Verified all 27 suites pass (`RELEASE READY`).
