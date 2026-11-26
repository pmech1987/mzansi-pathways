# v64 hardening: backup codes for reviewers, job-feed failsafe, workflow resilience

## Reviewer backup codes (new)
Verification needs two reviewers who prove themselves with an authenticator app. If a phone is lost or broken, that reviewer used to be locked out.
- `python scripts/mz_verify.py enroll <id> <name>` now prints **8 one-time backup codes**, once, as well as the authenticator secret. Write them on paper and keep them in two safe places. Never put them in the project folder or GitHub.
- When the app is unavailable: `python scripts/mz_verify.py signoff <year> <record> --by <id> --recovery XXXX-XXXX-XXXX-XXXX`.
- Each code works once. It is burned only after every other check passes, so a refused sign-off does not waste a code.
- `recovery-status <id>` shows how many are left; `recovery-new <id> --code <code>` replaces all of them (needs a current authenticator code or an unused backup code). `doctor.py` warns when a reviewer has fewer than 3, or none.
- `code <id>` prints the current 6-digit code if the secret is still stored in `MZ_SECRET_<ID>` but the phone is gone.
- Safety: only salted PBKDF2 hashes (200,000 rounds) of 80-bit codes go into the public `data/reviewers.json`. A backup code replaces only the 6-digit code; the sign-off is still sealed with the reviewer's secret, so a backup code alone can never forge a sign-off. Sign-offs made this way are marked `"recovery": true` for audit.
- Lose BOTH the phone and the secret: re-enrol the reviewer. Their old seals then fail loudly (they are never silently trusted).
- Keep a paper copy of each reviewer's secret too, in a different place from the backup codes.

## Job feed
- If every live source returns nothing (outage, rate limit, no internet), the previous live jobs are kept (expired ones still drop out) and `fetchStatus` says `network_unavailable_kept_previous`. Before, the feed was wiped to community entries only.
- One source crashing no longer stops the others. The feed is written atomically, and yesterday's copy is kept in `backups/files/`.

## Workflows
- A job-feed outage can no longer block publishing the site (`continue-on-error` on that step only; every verification step still blocks).
- The job-refresh workflow cannot overlap itself.
