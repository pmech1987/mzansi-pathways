# Mzansi Pathways v104 Changelog

## Front-End Application Readiness Checklist
- **SA Application Document Readiness Checklist (`js/v104_doc_checklist.js`, strict-CSP & zero `innerHTML`):** Tracks 7 essential South African certified documents (SA ID/birth certificate, Grade 11/12 results, guardian ID, proof of income/SASSA, proof of residence, NSFAS consent form, active email/SIM) locally on the learner's device with live completion percentage and one-tap **Copy Missing Docs List** for WhatsApp or Notes.
- **Accessible Checklist Styling (`css/civic_mobile_a11y.css`):** Added 44px-friendly checkbox rows with full light and dark mode contrast.

## Back-End Atomic Builds & Domain Precision
- **Atomic Catalogue Rebuilds (`scripts/build_catalogue.py`):** Replaced direct file writes with `tempfile.mkstemp` + `os.replace` so an interrupted build can never truncate `js/catalogue_data.js`.
- **Expanded SA Educational Domain Matching (`scripts/pipeline_verify.py`):** Added `edu.za` and `net.za` to `registrable()` so public TVET and college `.edu.za` prospectus hosts verify cleanly under `same_site()`.
- **Service Worker & Full Verification (`sw.js` -> `mzansi-pathways-v104`, `scripts/health_audit.py`, `scripts/test_v104_checklist_and_atomic.py`, `scripts/run_all_checks.py`):** Added `js/v104_doc_checklist.js` to `CORE` and strict-CSP auditing, rebuilt `data/sri_manifest.json` (38 assets), and passed `scripts/verify_release.py`.
