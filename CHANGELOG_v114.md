# Mzansi Pathways v114 Changelog (POPIA Privacy Safeguards & One-Tap Delete)

- **Complete OCR Stash Wipe (`js/app.js`):** Updated `wipeLocalProfile()` to also call `MZOCR.clearStash()` so scanned report-card images cached in IndexedDB/sessionStorage are wiped on shared school PCs and borrowed phones, and exposed `window.mzWipeAllData`.
- **Plain-Language Learner Privacy Notice & One-Tap Delete (`js/backup.js`):** Added a collapsible `Your Privacy (POPIA) & One-Tap Delete` accordion inside Settings explaining in plain language what stays on the device, why SA IDs are never kept, when to use AES-256-GCM encrypted backups, under-18 guardian guidance, and a one-tap `Delete Everything From This Device` button.
- **Defensive SA ID Redaction in Dossier Export (`js/modules/study.js`):** Added `\b\d{13}\b` redaction on `buildFamilyDossier()`.
- **Service Worker & Verification (`sw.js` -> `mzansi-pathways-v114`, `scripts/test_v114_popia_privacy.py`):** Verified all 26 suites pass (`RELEASE READY`).
