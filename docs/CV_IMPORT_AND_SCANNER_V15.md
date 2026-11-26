# Mzansi Pathways — Previous CV Upload & Photo Scanner (v15)

## 1. Zero-Cloud Previous CV Import & Printed CV Photo Scan
- Inside **Evidence & CV**, learners and job seekers can open **Import / Scan Previous CV** (`#cv-import-toggle-btn`) to bring in details from an existing CV without retyping everything from scratch:
  - **Upload Previous CV File (`#cv-file-input`):** Reads `.txt`, `.md`, `.html`, or `.doc` text locally via `FileReader`.
  - **Scan Printed CV Photo (`#cv-image-input`):** Loads a phone camera photo of a printed CV into an OOM-safe local canvas (`maxW = 1400`, with immediate `URL.revokeObjectURL` cleanup), supports on-device `window.TextDetector` when available, and accepts pasted text from Google Lens or iOS Live Text (`#cv-raw-text`).
- **Deterministic Extraction (`parsePreviousCvText` / `scripts/cv_importer.py`):** Extracts South African phone numbers (`+27` / `06x–08x`), email addresses, candidate name heuristic, verified skills/tools, and real experience action bullets.

## 2. Mandatory Human Confirmation & Anti-Fabrication Guard
- Extracted CV fields are always shown in an editable **Review Imported CV Details** preview before merging (`#cv-import-apply-btn`).
- The importer never invents unverified metrics, inflated percentages, or fake employers; only real tasks confirmed by the user are appended to the **Career Evidence Vault** and included in the exported single-column Word CV (`.doc`).

## 3. Photo Controls, Editable Preview & Saved Previous CV Versions
- Printed CV photos support **Rotate 90°**, **Boost Contrast**, and **Zoom Photo** on-device.
- Extracted Name, Phone, Email, and South African Qualifications (`NSC`, `Matric`, `NQF`, `TVET`, `Higher Certificate`) can be edited inline before applying and are included in exported single-column Word `.doc` CVs.
- Learners can save and switch between up to 8 tailored **Saved Previous CV Versions** locally (`state.savedCvs`), automatically validated by `validateStateIntegrity()`.
