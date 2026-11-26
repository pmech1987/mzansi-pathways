#!/usr/bin/env python3
"""Gate 91: the GitHub publishing safeguards stay in place: secret scan, fail-closed gates, backups before commit, never a force push,
deploy publishes only the staged site from main, keys are git-ignored, and the guide and tests exist."""
import json, re
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
    gp = need("scripts/github_publish.py", ("scan_files", "verify_release.py", "make_bundle", "safe_io.snapshot", "ff-only", "git(\"revert\"", "normalise_remote", "GIT_TERMINAL_PROMPT", "rebase\", \"--abort", "MAX_FILE_BYTES"))
    if re.search(r'"--force(?:-with-lease)?"|"-f"\s*,\s*"origin"|push\W+(?:-f|--force)', gp): errors.append("github_publish.py must never force-push")
    order = [gp.find(k) for k in ("def preflight", "secret scan", "verify_release.py", "safe_io.snapshot", '"commit"', '"push"')]
    body = gp[gp.find("def cmd_publish"):]
    seq = [body.find(k) for k in ("preflight()", "scan_files(", "verify_release.py", "safe_io.snapshot", 'git("commit"', 'git("push"')]
    if -1 in seq or seq != sorted(seq): errors.append("cmd_publish steps must run in order: preflight, scan, gates, backup, commit, push")
    dp = need(".github/workflows/deploy-pages.yml", ("github.ref == 'refs/heads/main'", "_site", "path: '_site'", "test -s _site/index.html"))
    if "path: '.'" in dp: errors.append("deploy-pages.yml must upload _site, not the whole repository")
    for k in ("scripts", "tests", "docs"):
        if re.search(r"cp -r [^\n]*\b" + k + r"\b", dp): errors.append(f"deploy-pages.yml must not publish {k}/")
    ig = txt(".gitignore")
    for k in (".env", "*.pem", "*.key", "*.mzansi", "backups/", "dist/", "_site/", "secrets*.json"):
        if k not in ig: errors.append(".gitignore missing " + k)
    need(".github/workflows/backup-repo.yml", ("git bundle verify", "contents: read", "fetch-depth: 0"))
    need(".github/dependabot.yml", ("github-actions",))
    need("publish.bat", ("github_publish.py",))
    need("docs/GITHUB_GUIDE_V67.md", ("Push protection", "never force-push", "--rollback", "--sync", "MZ_OFFSITE_DIR", "Restoring everything on a brand new PC", "If something fails"))
    need("scripts/doctor.py", ("GitHub remote", ".env is tracked by git"))
    need("tests/test_github_publish.py", ("test_publisher_never_force_pushes", "test_bundle_is_verified_restorable_and_pruned"))
    need("SETUP.md", ("docs/GITHUB_GUIDE_V67.md", "github_publish.py"))
    print(json.dumps({"gate": "91_verify_github_publish_failsafes", "passed": not errors, "errors": errors}))
    return 0 if not errors else 1

if __name__ == "__main__":
    raise SystemExit(main())
