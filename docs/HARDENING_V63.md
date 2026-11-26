# v63 hardening: what changed and why

## Bugs fixed (found by reading and testing v62)
| Problem in v62 | Effect | v63 |
|---|---|---|
| `--restore` of an old backup took a "before-restore" copy first, which pruned the very backup being restored | The restore crashed AND your chosen backup was deleted | The backup being restored is protected from pruning (tested) |
| Restore wiped `data/`, `js/`, `docs/` before unpacking | A damaged backup could leave you with no data | Backup is verified first, unpacked to a temp folder, then swapped in |
| Lock file checked then created in two steps | Two runs started together could both proceed | Created atomically (`O_EXCL`). Stale locks (1 h, or dead owner on Linux/Mac) are taken over. Never calls `os.kill(pid, 0)` on Windows (it would terminate the process) |
| Same-second backups with the same label | Second overwrote the first | Unique names, ordered correctly |
| Release zips and the off-site copy used plain string sort | At v100 the NEWEST zip sorts before v62 and was deleted | Numeric version sort |
| `mz_verify.py` wrote with `write_text` | A crash mid-write could corrupt checks and sign-offs (the hardest data to redo) | Atomic write + a safety copy (`backups/files/`) before every check, sign-off, promote and enroll |
| Service worker used `cache.addAll` | One missing file (e.g. an icon) failed the whole install: no offline mode | Core files must load; the rest are best-effort. Every year in `data/index.json` is saved |
| Service worker answered failed script/image requests with `index.html` | Confusing errors | Clean 503 |
| Data loader had no timeout | A stalled connection could hang loading | 10 s timeout and one retry |
| Records with no year / no `sourceDoc` | "undefined" shown, or wrong keys | Skipped safely / "Source not recorded" |
| Interrupted `new_year.py` left a year file the app could not see | Silent missing year | Re-running it lists the file; doctor warns |
| Release zip could include `.env`, `*.key`, `*.pem`, `*.bak` | Secret leak | Excluded from zips, backups and off-site copies |

## New failsafes
- Every backup has a SHA-256 list inside it and is re-checked on creation, on restore and on `--verify-backups`.
- `python scripts/maintain.py --restore` with no name picks the newest backup that passes its checks, skipping damaged ones.
- An unexpected crash during `maintain.py` restores the pre-run backup automatically. Helper scripts time out after 15 minutes.
- Off-site copy: writable and free-space test, atomic hash-checked copy, keeps the newest 5.
- Data-only snapshots: `python scripts/backup_and_restore_data.py snapshot | verify | restore`.
- `doctor.py` also reports: unlisted year files, duplicate programme ids, stale lock, leftover temp files, secrets in the folder, damaged or old newest backup, no off-site folder set.

## Not changed on purpose
Nothing here can mark a programme verified. Trust rules, gates' meaning, and every learner-facing statement are unchanged.
