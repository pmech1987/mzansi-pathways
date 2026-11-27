# Mzansi Pathways — One-Page Incident Playbooks & Yearly Rollover Runbook (E6)

## 1. Incident Playbooks
- **Wrong Institution/Course Data Published:**
  1. Set `"paused": true` in `data/automation_pause.json` and commit to stop automated writes.
  2. Restore previous good data via `python3 scripts/backup_data.py --restore-latest` (or `git revert <commit>`).
  3. Run `python3 scripts/verify_release.py && python3 scripts/run_all_checks.py` and push.
- **Privacy / POPIA Incident (Accidental PII in Repo or Community Submission):**
  1. Remove the offending file/row immediately and run `python3 scripts/run_all_checks.py` to confirm zero 13-digit SA IDs or personal emails remain.
  2. Purge Git history if PII was committed (`git filter-repo`), rotate any exposed tokens, and document remediation per POPIA Section 22 (Information Regulator SA: `inforegulator.org.za`).
- **Leaked Secret / API Key:**
  1. Revoke the exposed key immediately in GitHub / Google AI Studio / Anthropic Console.
  2. Generate a new key and store it ONLY in GitHub Actions Secrets (`Settings -> Secrets -> Actions`).
- **Institution Takedown or Correction Request:**
  1. Acknowledge within 48 hours; disable the institution's adapter in `data/sources.json` or update the disputed row to `status: "indicative"` with link-out only.
  2. Log the change in `CHANGELOG` and re-run `scripts/verify_release.py`.

## 2. Yearly Academic Rollover Checklist (Verify Every Date from Official Sources — Never Memory)
1. Confirm DBE NSC results release date, remark closing date, and May/June Second Chance registration window on `education.gov.za`.
2. Confirm NSFAS opening/closing window on `nsfas.org.za` (helpline `0800 067 327`).
3. Confirm Funza Lushaka dates on `eservices.gov.za`.
4. Run `python3 scripts/roll_year.py`, update `data/events.json` with official `sourceUrl` + `lastVerifiedAt`, run `python3 scripts/build_data_manifest.py`, and verify `python3 scripts/run_all_checks.py`.
