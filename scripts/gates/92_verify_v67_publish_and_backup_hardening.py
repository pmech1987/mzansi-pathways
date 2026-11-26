#!/usr/bin/env python3
"""Gate 92: the v67 publishing, backup and automation safeguards stay in place.
LF line endings everywhere (CRLF breaks every SHA-256 seal), the publisher's branch guard / confirm-after-push / verify, the deploy
workflow's cache stamp + feed validation + smoke test, the weekly restore drill, the scheduled backup, and a guide that never tells a solo
owner to require status checks (GitHub would then refuse every direct push)."""
import json, re, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))

def main() -> int:
    errors = []
    def txt(rel):
        p = ROOT / rel
        if not p.exists(): errors.append("missing " + rel); return ""
        return p.read_text(encoding="utf-8", errors="replace")
    def need(rel, toks):
        t = txt(rel)
        for k in toks:
            if k not in t: errors.append(f"{rel} missing {k!r}")
        return t
    ga = need(".gitattributes", ("* text=auto eol=lf", "*.bat text eol=crlf"))
    try:
        import safe_io
        crlf = safe_io.normalise_eol(ROOT, dry_run=True)
        if crlf: errors.append(f"{len(crlf)} text file(s) have CRLF line endings (seals would fail on GitHub), e.g. {crlf[0]}. Run: python scripts/maintain.py --zip")
    except Exception as e: errors.append(f"safe_io.normalise_eol unusable: {e}")
    gp = need("scripts/github_publish.py", ("normalise_eol", "core.autocrlf", "remote_head", "def cmd_verify", "prune_tags", "detached HEAD", "only built from 'main'", "Confirmed: GitHub now holds", "merge-base", "required status check"))
    if gp.find("required status check") != -1 and gp.find("[rejected]") != -1:
        body = gp[gp.find("def push_report"):gp.find("def cmd_publish")]
        if body.find("required status check") > body.find("[rejected]"): errors.append("push_report must test protected-branch errors BEFORE the generic 'rejected' text")
    dp = need(".github/workflows/deploy-pages.yml", ("smoke-test", "page_url", "GITHUB_SHA", "node --check _site/sw.js", "Validate the refreshed job feed", "git\", \"checkout\", \"--\""))
    if dp and not (dp.find("Validate the refreshed job feed") < dp.find("Stage ONLY") < dp.find("actions/deploy-pages@v4") < dp.find("smoke-test:")): errors.append("deploy-pages.yml order must be: validate feed, stage, deploy, smoke test")
    need(".github/workflows/backup-repo.yml", ("restore_drill.py", "git bundle verify"))
    need("scripts/restore_drill.py", ("check_sidecar", "drill_bundle", "drill_zip", "unsafe paths"))
    sb = need("scripts/scheduled_backup.py", ("schtasks_create_args", "WEEKLY", "last_scheduled_backup.json", "--install", "safe_io.snapshot"))
    if re.search(r"github_publish\.cmd_publish|\"push\"", sb): errors.append("scheduled_backup.py must never publish or push")
    need("scripts/doctor.py", ("last_scheduled_backup.json", "normalise_eol"))
    need("scripts/maintain.py", ("--restore-drill", "normalise_eol"))
    for bat in ("publish.bat", "maintain.bat", "backup_now.bat"):
        p = ROOT / bat
        if not p.exists(): errors.append("missing " + bat); continue
        b = p.read_bytes()
        if b"\r\n" not in b: errors.append(f"{bat} must keep CRLF line endings for cmd.exe")
        if b"py -3" not in b: errors.append(f"{bat} must fall back to the py launcher")
    g = need("docs/GITHUB_GUIDE_V67.md", ("Install Python", "Add python.exe to PATH", "Restrict deletions", "--restore-drill", "scheduled_backup.py --install", "--verify", "60 days", "Re-run all jobs", "Restoring everything on a brand new PC"))
    if re.search(r"(?i)\btick\b[^.\n]{0,60}require status checks to pass(?![^.\n]{0,80}\bnot\b)", g) and "Do NOT tick \"Require status checks" not in g:
        errors.append("the guide must never tell a solo owner to require status checks on main")
    if "Do NOT tick \"Require status checks" not in g: errors.append("guide Step 11 must warn against required status checks")
    need("tests/test_v67.py", ("test_crlf_is_fixed_but_binary_bat_and_skipped_dirs_are_not", "test_wrong_branch_and_detached_head_are_refused", "test_sync_explains_unrelated_history_when_readme_was_ticked", "test_push_error_messages_are_plain_language"))
    print(json.dumps({"gate": "92_verify_v67_publish_and_backup_hardening", "passed": not errors, "errors": errors}))
    return 0 if not errors else 1

if __name__ == "__main__":
    raise SystemExit(main())
