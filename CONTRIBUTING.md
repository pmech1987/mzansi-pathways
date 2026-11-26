# Contributing to Mzansi Pathways

Thank you for helping keep South African education, TVET, QCTO, and workplace pathway data accurate and honest.

## Source Authority Rules
1. **Tier 1 (Regulatory Registers):** DHET, QCTO, SAQA, NSFAS, and DBE official publications.
2. **Tier 2 (Institutional Prospectuses):** Official university, UoT, and public TVET 2027 prospectus PDFs with page numbers.
3. **Zero Fabricated Claims:** Never claim guaranteed admission, never invent salary figures, and never add paid/scam job links.

## Local Verification Checklist
Before opening a Pull Request:
1. Update `integrity_manifest.json` if you edited any tracked file:
   ```bash
   python3 scripts/gates/18_verify_sha256_integrity_manifest.py --write
   ```
2. Run the full verification suite:
   ```bash
   python3 scripts/verify_release.py
   ```
3. Confirm all gates pass (`errors=0`) and `release_verification_report.json` reports `"all_passed": true`.
