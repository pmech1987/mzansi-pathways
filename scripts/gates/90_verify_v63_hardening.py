#!/usr/bin/env python3
"""Gate 90: v63 hardening stays in place: atomic lock, verified backups, protected restore, secrets never packed,
atomic verification writes, resilient service worker, timed-out data loading, and the failsafe tests exist."""
import json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]

def main() -> int:
    errors = []
    def txt(rel):
        p = ROOT / rel
        if not p.exists(): errors.append("missing " + rel); return ""
        return p.read_text(encoding="utf-8")
    def need(rel, toks):
        t = txt(rel)
        for k in toks:
            if k not in t: errors.append(f"{rel} missing {k}")
        return t
    need("scripts/safe_io.py", ("O_EXCL", "def verify_snapshot", "MANIFEST_NAME", "protect=[snap]", "def file_backup", "def copy_verified", "def version_key", "is_secret_name", "tempfile.mkdtemp"))
    sio = txt("scripts/safe_io.py")
    if "os.kill(pid, 0)" in sio and 'os.name == "nt"' not in sio: errors.append("safe_io.py must never call os.kill(pid, 0) on Windows (it terminates the process)")
    need("scripts/maintain.py", ("--verify-backups", "copy_verified", "version_key", "is_secret_name", "timeout=timeout", "Crash guard"))
    mz = txt("scripts/mz_verify.py")
    if ".write_text(" in mz: errors.append("mz_verify.py must write through safe_io (atomic + backup), not write_text")
    need("scripts/mz_verify.py", ("safe_io.file_backup", "safe_io.write_json", "new_recovery_codes", "use_recovery_code", "consume=False", "pbkdf2_hmac", "recovery-new"))
    need("scripts/fetch_legal_public_jobs.py", ("network_unavailable_kept_previous", "safe_io.write_json", "file_backup"))
    need(".github/workflows/deploy-pages.yml", ("continue-on-error: true",))
    need("scripts/doctor.py", ("not listed in data/index.json", ".maintain.lock", "verify_snapshot", "duplicate programme ids"))
    need("scripts/backup_and_restore_data.py", ("CHECKSUMS.json", "verify_data_snapshot", "def restore_data"))
    need("scripts/new_year.py", ("not listed in data/index.json",))
    sw = need("sw.js", ("CORE", "NICE", "new Response('', { status: 503 })", "e.request.mode === 'navigate'"))
    if "addAll" in sw: errors.append("sw.js must not use cache.addAll (one missing file would break the whole install)")
    need("js/data.js", ("AbortController", "10000"))
    need("index.html", ("PREV_KEY", "CORRUPT_KEY", "UNDO_KEY", "String.fromCharCode.apply(null, u.subarray", "pkg.format !== 'mzansi-pathways-aes256-v1'", "btn-undo-restore", "Could not save on this phone", "mz-reload-btn"))
    ih = txt("index.html")
    wipe = ih[ih.find("function wipeLocalProfile("):ih.find("function wipeLocalProfile(") + 700]
    if not all(k in wipe for k in ("STORAGE_KEY", "PREV_KEY", "CORRUPT_KEY", "UNDO_KEY")): errors.append("wipeLocalProfile must remove every saved copy (main, previous, corrupt, before-restore)")
    if "String.fromCharCode(...u)" in ih: errors.append("index.html backup must not spread a large array into fromCharCode (stack overflow)")
    need("js/ocr.js", ("function withTimeout", "TIMEOUT"))
    need("scripts/maintain.py", ("tests/browser_failsafes.py",))
    for rel in ("tests/browser_failsafes.py", "docs/HARDENING_V65.md", "docs/HARDENING_V63.md", "docs/HARDENING_V64.md", "tests/test_recovery_and_feed.py", "tests/test_failsafes_v63.py"):
        if not (ROOT / rel).exists(): errors.append("missing " + rel)
    print(json.dumps({"gate": "90_verify_v63_hardening", "passed": not errors, "errors": errors}))
    return 0 if not errors else 1

if __name__ == "__main__":
    raise SystemExit(main())
