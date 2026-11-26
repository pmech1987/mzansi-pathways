# Mzansi Pathways — Image-to-Result Scanner & Hidden Failsafes (v12)

## 1. Zero-Cloud Image-to-Result Scanner (POPIA-Safe)
- Learners can tap **Scan Report / Statement** on the Results tab (`#scan-results-btn`) to load a phone photo or camera capture of an NSC Statement of Results or school report card (`#scan-image-input`).
- **On-Device Canvas Pre-Processing:** Photos are downscaled to a 1,400 px maximum width (`maxW = 1400`) to prevent mobile Chrome out-of-memory crashes, with 90-degree rotation and grayscale contrast stretching (`#scan-rotate-btn`, `#scan-contrast-btn`) and immediate `URL.revokeObjectURL` cleanup.
- **Deterministic SA Subject & Mark Parser:** Both the browser (`parseStatementText`) and Python backend (`scripts/statement_parser.py`) recognise 25+ South African NSC/IEB/TVET subjects, HL/FAL/LO flags, and 0–100% marks, flagging low-confidence lines for mandatory human confirmation (`needsConfirmation: true`) before updating saved marks.
- **Browser TextDetector + Google Lens / Live Text Compatibility:** Uses `window.TextDetector` locally when supported by the browser, and accepts pasted text from Android Circle-to-Search / Google Lens or iOS Live Text without uploading any report card photo to external servers.

## 2. Grade 9 Reverse Planner, Deadlines & Custom Rules Failsafe
- **Grade 9 Career-to-Subject Reverse Planner:** Interactive goal chips (`eng`, `health`, `comm`, `trades`) map career tracks back to recommended Grade 10–12 subjects.
- **Deadline Urgency Badges:** `getDeadlineBadge()` highlights closing windows vs. rolling intakes on Plan A/B/C.
- **Custom Rules JSON Validator:** `validateImportedProgrammes()` rejects malformed JSON, missing `sourceTier`, out-of-range `minAps`, or non-HTTPS URLs before merging into the decision table.
