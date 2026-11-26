# Prospectus & Document Verification (V21)
No programme is "verified" until ALL of this is true. Anything less stays `pending_review` (amber, never green).

**5 checks** (`python scripts/mz_verify.py check <year> <id> <type> --by <reviewer> --url <https url> --file <download>`):
1. `official_domain`: URL is https on the institution's own domain (or .gov.za).
2. `document_hash`: the prospectus file is downloaded, SHA-256 recorded, and searched for the intake year, programme name, APS and every subject minimum. All must be found.
3. `second_source`: a DIFFERENT page/file (admissions page, faculty rules) with a different hash, searched the same way.
4. `institution_confirmation`: written answer from the institution (email/portal) saved as a file.
5. `year_match`: the document states the same intake year as the record.

**2 reviewers** sign with `signoff` using an authenticator (TOTP) code. The seal (HMAC) covers the exact rule values, so any later edit voids it. The person who entered the data cannot verify it. Secrets live only in `MZ_SECRET_<ID>` env vars / CI secrets, never in the repo.

**Freshness:** verified records older than 120 days fail the gate and must be re-checked. CSV import cannot create `verified` rows.

**Enforcement:** gate 85 in CI (set `MZ_REQUIRE_SIGS=1` plus the secrets to check seals); the app also downgrades any record lacking 5 checks, 2 reviewers or fresh date. Honest limit: these tools check documents you download; they cannot browse the web or replace a human reading the prospectus.
