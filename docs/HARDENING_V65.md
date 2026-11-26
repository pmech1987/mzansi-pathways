# v65 hardening: protecting the learner's own data

These changes are in the app itself (`index.html`, `js/ocr.js`). They are covered by `tests/browser_failsafes.py`, which runs in a real browser.

| Risk for a learner | Before | Now |
|---|---|---|
| Saved profile gets damaged (browser crash, full storage) | Silently ignored, then OVERWRITTEN by the next save: everything lost | The damaged copy is kept (`..._corrupt`), the last good copy (`..._prev`, refreshed at most every 30 s) is loaded, and the learner is told to check their marks |
| Phone storage is full or blocked | Save failed silently; the learner believed their work was safe | One clear message: "Could not save on this phone... download a backup". It first retries after freeing the extra copies |
| Phone kills the browser tab | Latest change might be lost | Saved again when the page is hidden or closed |
| Encrypted backup of a large profile (many evidence items, long CV text) | Failed with "Encryption unavailable" (stack overflow in base64 step) | Chunked encoding; tested with a 400-item, 360 KB profile |
| Restoring a backup | Merged blindly; any JSON file accepted; no way back | Checks the file type, size (5 MB) and contents first; wrong passphrase or wrong file changes nothing; keeps a copy of the current profile and offers **Undo restore** |
| Learner forgets to back up | No reminder | "Last backup downloaded: date" or "No backup yet", advice to keep two copies, and a plain warning that a forgotten passphrase cannot be recovered by anyone |
| A screen crashes and the fallback crashes too | Blank page | Plain message with a Reload button; the saved profile is untouched |
| Photo reading stalls | "Reading..." forever | 2-minute limit to load the reader, 90 seconds to read; the stuck reader is discarded and the learner is told to try a smaller photo or type the marks |
| Live jobs request hangs | Could wait indefinitely | 10 second limit |
| **Privacy wipe** | Removed only the main saved copy | Removes every copy (main, previous, damaged, before-restore). Essential on a shared school computer |

## Operator notes
- `maintain.py` now runs both browser tests when Playwright is installed.
- Nothing here changes any rule, APS calculation or verification status.
