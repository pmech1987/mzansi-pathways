#!/usr/bin/env python3
"""Safe GitHub publisher: python scripts/github_publish.py [--message "text"] [--dry-run]
  python scripts/github_publish.py --status | --verify | --bundle | --rollback | --setup <https-url> | --sync

What it does, in order (any step that fails STOPS the run and nothing is pushed):
 1 preflight: git installed, this folder is a repo on branch main, your name/email are set, no half-finished merge/rebase;
   Windows line endings (CRLF) are put back to LF so the SHA-256 seals stay valid
 2 secret scan of every file that would be committed (keys, tokens, .env, .mzansi backups, reviewer secrets) and a size check
 3 all verification gates (scripts/verify_release.py). Fail-closed: a failing gate means no push
 4 safety copies BEFORE anything changes: a checksummed project backup (backups/) and a git bundle (backups/git/),
   plus a copy off this PC when MZ_OFFSITE_DIR / --offsite is set
 5 commit, then a local safety tag (pre-publish-YYYYMMDD-HHMMSS)
 6 push to the remote. NEVER a force push. If GitHub has newer work, it stops and tells you what to do
 7 prints the live addresses
--rollback undoes the LAST published commit by adding a new "revert" commit (history is kept, nothing is erased).
--sync fetches GitHub's version and fast-forwards only when that is safe; it never overwrites your work.
--verify proves GitHub really holds your latest commit and that the local history is not damaged (git fsck).
After every push the tool asks GitHub which commit it now holds and compares it with yours (so "Pushed" always means "confirmed").
Everything it needs is in the Python standard library and git."""
import fnmatch, hashlib, json, os, re, shutil, subprocess, sys, time
from datetime import datetime
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(Path(__file__).resolve().parent))
import safe_io

MAX_FILE_BYTES = 50 * 1024 * 1024      # GitHub blocks files over 100 MB and warns over 50 MB
NEVER_COMMIT_NAMES = (".env", "*.pem", "*.key", "*.mzansi", "*.bak", "secrets*.json", "id_rsa*", "id_ed25519*", "*.pfx", "*.p12", "*.kdbx")
SECRET_PATTERNS = (  # (label, regex). Deliberately narrow so that normal text never trips it.
    ("private key block", re.compile(r"-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY")),
    ("GitHub token", re.compile(r"\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{30,}\b|\bgithub_pat_[A-Za-z0-9_]{40,}\b")),
    ("AWS access key", re.compile(r"\bAKIA[0-9A-Z]{16}\b")),
    ("Slack token", re.compile(r"\bxox[abprs]-[A-Za-z0-9-]{10,}\b")),
    ("Google API key", re.compile(r"\bAIza[0-9A-Za-z_-]{35}\b")),
    ("reviewer secret value", re.compile(r"MZ_SECRET_[A-Z0-9_]+\s*[=:]\s*['\"]?[A-Za-z0-9+/=_-]{16,}")),
    ("Adzuna/other key assignment", re.compile(r"(?i)\b(?:ADZUNA_APP_KEY|API_KEY|SECRET_KEY|ACCESS_TOKEN)\s*[=:]\s*['\"][A-Za-z0-9_-]{16,}['\"]")),
)
SCAN_SKIP_SUFFIX = (".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".zip", ".gz", ".pdf", ".woff", ".woff2")
SCAN_SKIP_FILES = ("scripts/github_publish.py", "tests/test_github_publish.py", "scripts/gates/01_verify_secrets_and_keys.py", "scripts/gates/91_verify_github_publish_failsafes.py")  # these name the patterns, they do not hold secrets

def say(msg=""): print(msg, flush=True)

def git(*args, check=False, timeout=180):
    """Run git. Never raises on a hang or a missing git: returns (code, text)."""
    try:
        r = subprocess.run(["git", *args], cwd=ROOT, capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=timeout,
                           env={**os.environ, "GIT_TERMINAL_PROMPT": "0", "LC_ALL": "C"})
    except FileNotFoundError: return 127, "git is not installed"
    except subprocess.TimeoutExpired: return 124, f"git {args[0]} timed out after {timeout}s (network problem? try again)"
    out = (r.stdout + r.stderr).strip()
    if check and r.returncode != 0: raise RuntimeError(f"git {' '.join(args)} failed: {out}")
    return r.returncode, out

# ---------------------------------------------------------------- scans (pure functions, unit tested)
def secret_name(rel: str) -> bool:
    n = Path(rel).name.lower()
    return any(fnmatch.fnmatch(n, p) for p in NEVER_COMMIT_NAMES) or n.startswith(".env")

def scan_text(rel: str, text: str) -> list:
    return [f"{rel}: looks like a {label}" for label, rx in SECRET_PATTERNS if rx.search(text)]

def scan_files(rels, root=None) -> list:
    """Return a list of problems for the given repo-relative paths. Empty list means clean."""
    problems = []
    root = Path(root) if root else ROOT
    for rel in rels:
        p = root / rel
        if not p.is_file(): continue
        if secret_name(rel): problems.append(f"{rel}: a file name that is only ever a secret or a private backup. Move it out of the project folder"); continue
        try: size = p.stat().st_size
        except OSError: continue
        if size > MAX_FILE_BYTES: problems.append(f"{rel}: {size // 1048576} MB is too big for GitHub (limit 100 MB). Remove it or add it to .gitignore"); continue
        if rel in SCAN_SKIP_FILES or p.suffix.lower() in SCAN_SKIP_SUFFIX or size > 5 * 1024 * 1024: continue
        try: txt = p.read_text(encoding="utf-8", errors="ignore")
        except OSError: continue
        problems += scan_text(rel, txt)
    return problems

def normalise_remote(url: str) -> str:
    """Only https GitHub addresses are accepted. Passwords or tokens inside the address are refused (they would be stored in plain text)."""
    u = (url or "").strip()
    m = re.fullmatch(r"https://github\.com/([A-Za-z0-9-]+)/([A-Za-z0-9._-]+?)(?:\.git)?/?", u)
    if not m: raise ValueError("Use the plain https address from GitHub, like https://github.com/YOURNAME/mzansi-pathways.git (no password or token inside it)")
    return f"https://github.com/{m.group(1)}/{m.group(2)}.git"

def align_owner(owner: str, repo: str, root=None) -> list:
    """The shipped CODEOWNERS and SECURITY.md name one GitHub account. If you publish under a different account, GitHub marks CODEOWNERS invalid and
    security reports would point at someone else's repository. This rewrites only those two (unsealed) files. Returns what it changed."""
    root = Path(root) if root else ROOT; changed = []
    co = root / ".github" / "CODEOWNERS"
    if co.is_file():
        t = co.read_text(encoding="utf-8"); new = re.sub(r"(?m)^(\*\s+)@[A-Za-z0-9-]+", lambda m: m.group(1) + "@" + owner, t)
        if new != t: safe_io.atomic_write(co, new); changed.append(".github/CODEOWNERS")
    sec = root / "SECURITY.md"
    if sec.is_file():
        t = sec.read_text(encoding="utf-8"); new = re.sub(r"`[A-Za-z0-9-]+/mzansi-pathways`", f"`{owner}/{repo}`", t)
        if new != t: safe_io.atomic_write(sec, new); changed.append("SECURITY.md")
    return changed

def pages_url(remote: str) -> str:
    m = re.search(r"github\.com[/:]([^/]+)/([^/]+?)(?:\.git)?$", remote or "")
    return f"https://{m.group(1).lower()}.github.io/{m.group(2)}/" if m else "(unknown: check Settings > Pages on GitHub)"

# ---------------------------------------------------------------- steps
def preflight(need_remote=True) -> list:
    errs = []
    code, out = git("--version")
    if code != 0: return ["Git is not installed. Install it from https://git-scm.com/download/win then close and reopen this window"]
    if not (ROOT / ".git").exists(): return ["This folder is not a git repository yet. Run: python scripts/github_publish.py --setup https://github.com/YOURNAME/mzansi-pathways.git"]
    for k, label in (("user.name", "your name"), ("user.email", "your email")):
        if not git("config", k)[1]: errs.append(f'Git does not know {label}. Run: git config --global {k} "..."')
    for marker in ("MERGE_HEAD", "rebase-merge", "rebase-apply", "CHERRY_PICK_HEAD", "REVERT_HEAD"):
        if (ROOT / ".git" / marker).exists(): errs.append(f"A git operation is half finished ({marker}). Finish it or run: git status   (see docs/GITHUB_GUIDE_V67.md, section 'If git says...')")
    code, br = git("symbolic-ref", "--short", "-q", "HEAD")
    if (ROOT / ".git").exists() and code == 0 and br and br != "main":
        errs.append(f"You are on branch '{br}', but the website is only built from 'main'. Run: git checkout main   (or: git branch -m {br} main)")
    elif (ROOT / ".git").exists() and code != 0 and git("rev-parse", "HEAD")[0] == 0:
        errs.append("Git is in 'detached HEAD' state (not on any branch). Run: git checkout main")
    if need_remote and git("remote", "get-url", "origin")[0] != 0: errs.append("No GitHub address is connected. Run: python scripts/github_publish.py --setup https://github.com/YOURNAME/mzansi-pathways.git")
    if (ROOT / ".maintain.lock").exists() and time.time() - (ROOT / ".maintain.lock").stat().st_mtime < 3600: errs.append("A maintenance run seems to be open (.maintain.lock). Wait for it to finish")
    return errs

def files_to_publish() -> list:
    """Everything git would commit now: modified plus new files that are not ignored (deleted files need no scanning)."""
    code, out = git("ls-files", "-m", "-o", "--exclude-standard", "-z")
    return sorted({x for x in out.split("\0") if x}) if code == 0 else []

def make_bundle(label="manual") -> Path:
    """A single file holding the entire git history. Restorable with: git clone <bundle> folder."""
    d = ROOT / "backups" / "git"; d.mkdir(parents=True, exist_ok=True)
    out = d / f"repo_{datetime.now().strftime('%Y%m%d-%H%M%S')}_{label}.bundle"
    tmp = out.with_suffix(".bundle.tmp")
    code, msg = git("bundle", "create", str(tmp), "--all")
    if code != 0 or not tmp.exists(): raise RuntimeError("Could not create the git bundle: " + msg)
    code, msg = git("bundle", "verify", str(tmp))
    if code != 0: tmp.unlink(missing_ok=True); raise RuntimeError("The git bundle failed its own check and was discarded: " + msg)
    tmp.replace(out)
    safe_io.atomic_write_bytes(out.with_suffix(".bundle.sha256"), (safe_io.sha256_file(out) + "  " + out.name + "\n").encode())
    for old in sorted(d.glob("*.bundle"), key=lambda p: p.stat().st_mtime)[:-10]:  # keep the newest 10
        old.unlink(missing_ok=True); old.with_suffix(".bundle.sha256").unlink(missing_ok=True)
    return out

def offsite_bundle(bundle: Path, dest) -> bool:
    try:
        d = Path(dest); d.mkdir(parents=True, exist_ok=True)
        safe_io.copy_verified(bundle, d / bundle.name)
        safe_io.copy_verified(bundle.with_suffix(".bundle.sha256"), d / (bundle.name + ".sha256"))
        olds = sorted(d.glob("repo_*.bundle"), key=lambda p: p.stat().st_mtime)[:-5]
        for o in olds: o.unlink(missing_ok=True); (d / (o.name + ".sha256")).unlink(missing_ok=True)
        return True
    except OSError as e:
        say(f"  Off-site copy of the git bundle FAILED ({e}). The local copy is fine.")
        return False

def remote_head():
    """(code, sha) of what GitHub holds for the current branch right now. Never raises."""
    _, br = git("symbolic-ref", "--short", "-q", "HEAD")
    code, out = git("ls-remote", "--heads", "origin", br or "main", timeout=60)
    if code != 0: return code, out
    return 0, (out.split() or [""])[0]

def prune_tags(keep=30):
    """Local pre-publish safety tags are kept for the newest `keep`; older ones are removed so the list never grows forever."""
    _, out = git("tag", "-l", "pre-publish-*")
    tags = sorted(t for t in out.split() if t)
    for t in tags[:-keep]: git("tag", "-d", t)

def offsite_dir(argv):
    if "--offsite" in argv and argv.index("--offsite") + 1 < len(argv): return argv[argv.index("--offsite") + 1]
    return os.environ.get("MZ_OFFSITE_DIR")

# ---------------------------------------------------------------- commands
def cmd_setup(url: str) -> int:
    try: url = normalise_remote(url)
    except ValueError as e: say(str(e)); return 1
    if git("--version")[0] != 0: say("Git is not installed. Install it from https://git-scm.com/download/win then reopen this window."); return 1
    if not (ROOT / ".git").exists():
        say("Creating the repository here (branch main)...")
        if git("init", "-b", "main")[0] != 0: git("init", check=True); git("checkout", "-B", "main")
    if git("remote", "get-url", "origin")[0] == 0: git("remote", "set-url", "origin", url)
    else: git("remote", "add", "origin", url, check=True)
    git("config", "--local", "core.autocrlf", "false")    # .gitattributes keeps every text file LF; CRLF would break the SHA-256 seals
    git("config", "--local", "core.safecrlf", "false")
    git("config", "--local", "pull.ff", "only")           # a pull can never create a surprise merge
    git("config", "--local", "push.default", "simple")
    git("config", "--local", "receive.denyNonFastForwards", "true")
    m = re.match(r"https://github\.com/([^/]+)/([^/]+?)\.git$", url)
    if m:
        ch = align_owner(m.group(1), m.group(2))
        if ch: say("Updated " + " and ".join(ch) + " to name your GitHub account (" + m.group(1) + "). Run maintain.py --zip once so the backups include it.")
        idx = (ROOT / "index.html").read_text(encoding="utf-8", errors="ignore") if (ROOT / "index.html").exists() else ""
        mm = re.search(r"https://github\.com/([A-Za-z0-9-]+)/mzansi-pathways", idx)
        if mm and mm.group(1).lower() != m.group(1).lower(): say(f"Note: the footer link in index.html points to github.com/{mm.group(1)}. If that is not you, change it in index.html, then run python scripts/maintain.py --zip.")
    say("Connected to " + url)
    say("Next: python scripts/github_publish.py --message \"First upload\"   (add --dry-run first to see what would happen)")
    return 0

def cmd_status() -> int:
    errs = preflight(need_remote=False)
    for e in errs: say("[PROBLEM] " + e)
    if (ROOT / ".git").exists():
        _, br = git("rev-parse", "--abbrev-ref", "HEAD"); _, rem = git("remote", "get-url", "origin")
        say(f"Branch: {br}   Remote: {rem or '(none)'}")
        ch = files_to_publish(); say(f"Files changed and not yet saved to git: {len(ch)}")
        for c in ch[:15]: say("  " + c)
        if len(ch) > 15: say(f"  ... and {len(ch) - 15} more")
        git("fetch", "--quiet", timeout=60)
        code, cnt = git("rev-list", "--left-right", "--count", "HEAD...@{u}")
        if code == 0:
            a, b = (cnt.split() + ["0", "0"])[:2]; say(f"Saved here but not on GitHub: {a}   On GitHub but not here: {b}")
            if b != "0": say("GitHub has newer work. Run: python scripts/github_publish.py --sync")
        if rem: say("Live site (once Pages is on): " + pages_url(rem))
    return 1 if errs else 0

def cmd_verify() -> int:
    """Read-only health check: local history intact, and GitHub holds exactly what this PC holds."""
    errs = preflight()
    for e in errs: say("[PROBLEM] " + e)
    if errs: return 1
    code, out = git("fsck", "--connectivity-only", "--no-dangling", timeout=300)
    say(("[OK] Local git history is intact." if code == 0 else "[PROBLEM] Local git history has damage: " + out[-300:] + " Restore from a bundle (see the guide, 'Restoring everything')."))
    bad = code != 0
    lh = git("rev-parse", "HEAD")[1] if git("rev-parse", "HEAD")[0] == 0 else ""
    c, rh = remote_head()
    if c != 0: say("[WARN] Could not reach GitHub, so the remote could not be checked: " + rh[-150:])
    elif not rh: say("[PROBLEM] GitHub has no copy of this branch yet. Run: python scripts/github_publish.py --message \"First upload\""); bad = True
    elif rh == lh: say("[OK] GitHub holds your latest commit (" + lh[:8] + ").")
    else:
        git("fetch", "--quiet", timeout=60)
        ahead = git("merge-base", "--is-ancestor", "origin/main", "HEAD")[0] == 0 if git("rev-parse", "--verify", "-q", "origin/main")[0] == 0 else False
        say("[PROBLEM] GitHub is at " + rh[:8] + " but this PC is at " + lh[:8] + ". " + ("Publish to send yours." if ahead else "Run --sync to bring GitHub's work in.")); bad = True
    n = len(files_to_publish())
    if n: say(f"[WARN] {n} changed file(s) not yet committed. Publish them.")
    return 1 if bad else 0

def cmd_bundle(argv) -> int:
    if not (ROOT / ".git").exists(): say("No git history yet; nothing to bundle."); return 1
    if git("rev-parse", "HEAD")[0] != 0: say("Nothing is committed yet, so there is no history to bundle."); return 1
    b = make_bundle("manual"); say("Git bundle written and verified: " + str(b.relative_to(ROOT)))
    off = offsite_dir(argv)
    if off: say("Off-site copy: " + ("OK" if offsite_bundle(b, off) else "FAILED"))
    else: say("Tip: set MZ_OFFSITE_DIR (or use --offsite D:\\MzansiBackup) so a copy also lives off this PC.")
    return 0

def cmd_sync() -> int:
    errs = preflight()
    if errs: [say("[PROBLEM] " + e) for e in errs]; return 1
    if files_to_publish(): say("You have unsaved changes. Publish or back them up first (python scripts/github_publish.py --message \"...\"). Nothing was changed."); return 1
    code, out = git("fetch", "origin", timeout=120)
    if code != 0: say("Could not reach GitHub (" + out[-200:] + "). Check your internet and try again."); return 1
    if git("rev-parse", "HEAD")[0] == 0: make_bundle("before-sync")
    _, br = git("symbolic-ref", "--short", "-q", "HEAD"); br = br or "main"
    if git("rev-parse", "--verify", "-q", f"origin/{br}")[0] != 0:
        say("GitHub has no '" + br + "' branch yet, so there is nothing to bring in. Publish normally."); return 0
    if git("rev-parse", "--verify", "-q", "HEAD")[0] != 0:
        say("Nothing is committed here yet. Your GitHub repository already has files (a README or licence was probably ticked when it was created).")
        say("Easiest safe fix: on GitHub open the repository > Settings > scroll to 'Delete this repository', then create a NEW EMPTY repository with the same name (no README, no .gitignore, no licence) and publish again."); return 1
    if git("merge-base", "HEAD", f"origin/{br}")[0] != 0:
        say("Your GitHub repository was not empty when you first created it (a README, .gitignore or licence was ticked), so its history and yours are unrelated.")
        say("Nothing was changed. Easiest safe fix: on GitHub open the repository > Settings > 'Delete this repository', create a NEW EMPTY repository with the same name, run --setup with its address, then publish again.")
        say("(If it holds work you want to keep: clone it into another folder first, then copy those files here.)"); return 1
    git("branch", f"--set-upstream-to=origin/{br}", br)
    code, out = git("merge", "--ff-only", "@{u}")
    if code == 0: say(out or "Already up to date."); return 0
    # Both sides have new work. Put YOUR unsent commits on top of GitHub's. Only your own unpushed commits are replayed; if
    # anything clashes the rebase is aborted and the folder goes back exactly as it was.
    say("GitHub and this PC both have new work. Placing your unsent work on top of GitHub's version...")
    code, out = git("rebase", "@{u}")
    if code == 0: say("Done. Both sets of changes are now together. Run the publish command again to send yours."); return 0
    _, bad = git("diff", "--name-only", "--diff-filter=U")
    git("rebase", "--abort")
    say("The same lines were changed in both places, so they cannot be joined automatically. The folder is back exactly as before; nothing was lost.")
    if bad: say("Clashing files: " + ", ".join(bad.split()[:8]))
    say("Easiest fix: back up this folder, then see docs/GITHUB_GUIDE_V67.md, section 'If git says...' (clone a fresh copy and copy your files over).")
    return 1

def cmd_rollback(argv) -> int:
    errs = preflight()
    if errs: [say("[PROBLEM] " + e) for e in errs]; return 1
    if files_to_publish(): say("You have unsaved changes. Publish or back them up first. Nothing was changed."); return 1
    code, last = git("log", "-1", "--pretty=%h %s")
    if code != 0: say("No commits to undo."); return 1
    if git("rev-list", "--count", "HEAD")[1] == "1": say("This is the very first commit; there is nothing earlier to go back to."); return 1
    say("This will add a new commit that undoes: " + last)
    if "--yes" not in argv and input("Type YES to continue: ").strip() != "YES": say("Cancelled. Nothing changed."); return 1
    make_bundle("before-rollback")
    code, out = git("revert", "--no-edit", "HEAD")
    if code != 0: git("revert", "--abort"); say("Could not undo cleanly (" + out[-200:] + "). Nothing was changed."); return 1
    say("Undone here. Sending the undo to GitHub now...")
    return cmd_push_only()

def cmd_push_only() -> int:
    code, out = git("push", "origin", "HEAD", timeout=240)
    return push_report(code, out)

def push_report(code, out) -> int:
    if code == 0: say("Pushed to GitHub."); return 0
    low = out.lower()
    if "required status check" in low or "gh006" in low or "protected branch" in low or "gh013" in low or "rule violations" in low:
        say("GitHub refused: the branch rules or GitHub's own secret scan blocked this push. Read GitHub's message above; do not try to force it.")
        say("If it mentions a 'required status check': in GitHub > Settings > Branches (or Rules), switch OFF 'Require status checks to pass' (see the guide, Step 9). A solo owner publishing straight to main cannot satisfy it.")
    elif "gh001" in low or "large files detected" in low:
        say("GitHub refused a file that is over 100 MB. Remove it or add it to .gitignore, then publish again.")
    elif "non-fast-forward" in low or "fetch first" in low or "[rejected]" in low:
        say("GitHub has newer work than this PC, so the push was refused (nothing was overwritten).")
        say("Run: python scripts/github_publish.py --sync   (it joins the two versions safely), then publish again.")
    elif "repository not found" in low or ("not found" in low and "repository" in low):
        say("GitHub says that repository does not exist or this account cannot see it. Check the address (python scripts/github_publish.py --status) and that you are signed in to the right GitHub account.")
    elif "authentication" in low or "could not read username" in low or "403" in low or "401" in low:
        say("GitHub did not accept your login. Sign in again: run  git credential-manager github login  (or see the guide, section 'Signing in').")
    elif "could not resolve" in low or "timed out" in low or "unable to access" in low:
        say("No connection to GitHub. Your work is safe and committed here. Run the same command again when online.")
    else: say("Push failed. Your work is safe and committed here. Details: " + out[-300:])
    return 1

def cmd_publish(argv) -> int:
    dry = "--dry-run" in argv
    msg = argv[argv.index("--message") + 1] if "--message" in argv and argv.index("--message") + 1 < len(argv) else f"Update {datetime.now().strftime('%Y-%m-%d %H:%M')}"
    msg = re.sub(r"[\x00-\x1f]", " ", msg)[:200]
    say("1/7 Preflight")
    errs = preflight()
    if errs: [say("  [STOP] " + e) for e in errs]; return 1
    fixed = safe_io.normalise_eol(ROOT)
    if fixed: say(f"  Fixed Windows line endings (CRLF to LF) in {len(fixed)} file(s) so the seals stay valid.")
    if git("ls-remote", "--heads", "origin", timeout=30)[0] != 0: say("  Note: GitHub cannot be reached right now. Checks and backups will still run; the push at the end may fail, and your work stays safe and committed.")
    say("  OK")
    say("2/7 Secret and size scan")
    rels = files_to_publish()
    tracked = git("ls-files", "-z")[1].split("\0")
    problems = scan_files(sorted(set(rels) | {t for t in tracked if t}))
    if problems: say("  [STOP] Nothing was published. Fix these first:"); [say("   - " + p) for p in problems]; return 1
    say(f"  OK ({len(rels)} changed file(s) scanned)")
    say("3/7 Verification gates (fail-closed)")
    r = subprocess.run([sys.executable, "scripts/verify_release.py"], cwd=ROOT, capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=900)
    tail = [l for l in (r.stdout + r.stderr).splitlines() if l.strip()][-3:]
    if r.returncode != 0:
        say("  [STOP] A gate failed, so nothing was published:"); [say("   " + l) for l in tail]
        say("  If you only changed files, first run: python scripts/maintain.py --zip   (it refreshes the seals), then try again."); return 1
    say("  OK: " + (tail[-1] if tail else "gates passed"))
    if dry:
        say("DRY RUN: all checks passed. Would commit " + str(len(rels)) + " file(s) with message: " + msg + " and push. Nothing was changed."); return 0
    say("4/7 Safety copies before anything changes")
    snap = safe_io.snapshot(ROOT, "before-publish"); say("  Project backup: " + snap.name)
    has_head = git("rev-parse", "HEAD")[0] == 0
    bundle = None
    if has_head:
        bundle = make_bundle("before-publish"); say("  Git bundle: " + bundle.name)
    off = offsite_dir(argv)
    if off and bundle: say("  Off-site git bundle: " + ("OK" if offsite_bundle(bundle, off) else "FAILED (continuing, local copies exist)"))
    elif not off: say("  Reminder: no off-site folder set (MZ_OFFSITE_DIR). Copies on this PC are lost with this PC.")
    new_tag = None
    say("5/7 Commit")
    git("add", "-A", check=True)
    # second look at exactly what is staged (guards against anything added between the scan and now)
    staged = [x for x in git("diff", "--cached", "--name-only", "-z")[1].split("\0") if x]
    problems = scan_files(staged)
    if problems: git("reset", "--quiet"); say("  [STOP] Secret check on the staged files failed; unstaged again:"); [say("   - " + p) for p in problems]; return 1
    if not staged and has_head: say("  Nothing new to commit. Pushing any earlier commits only.")
    else:
        code, out = git("commit", "-m", msg)
        if code != 0: say("  [STOP] Commit failed: " + out[-300:]); return 1
        new_tag = "pre-publish-" + datetime.now().strftime("%Y%m%d-%H%M%S")
        git("tag", "-f", new_tag); prune_tags()
        say("  Committed: " + msg)
    say("6/7 Push (never forced)")
    code, out = git("push", "-u", "origin", "HEAD", timeout=240)
    rc = push_report(code, out)
    if rc: return rc
    if new_tag: git("push", "origin", new_tag, timeout=120)
    code, rh = remote_head(); lh = git("rev-parse", "HEAD")[1]
    if code == 0 and rh == lh: say("  Confirmed: GitHub now holds your latest commit (" + lh[:8] + ").")
    elif code == 0: say("  WARNING: GitHub reports a different latest commit (" + rh[:8] + ") than this PC (" + lh[:8] + "). Run: python scripts/github_publish.py --verify"); return 1
    else: say("  Could not double-check with GitHub just now (" + rh[-120:] + "). Run --verify later.")
    say("7/7 Done")
    _, rem = git("remote", "get-url", "origin")
    say("  Check the build: " + re.sub(r"\.git$", "", rem) + "/actions")
    say("  Live site:       " + pages_url(rem) + "   (first deploy takes 1-3 minutes)")
    return 0

def main(argv) -> int:
    try:
        if "--setup" in argv:
            i = argv.index("--setup"); return cmd_setup(argv[i + 1] if i + 1 < len(argv) else "")
        if "--status" in argv: return cmd_status()
        if "--verify" in argv: return cmd_verify()
        if "--bundle" in argv: return cmd_bundle(argv)
        if "--sync" in argv: return cmd_sync()
        if "--rollback" in argv: return cmd_rollback(argv)
        if "--push-only" in argv: return cmd_push_only()
        return cmd_publish(argv)
    except KeyboardInterrupt:
        say("\nStopped by you. Backups made so far are kept; nothing was pushed after this point."); return 130
    except Exception as e:  # last resort: say what happened in words, never a traceback wall
        say(f"Unexpected problem: {type(e).__name__}: {e}\nYour files and backups are untouched by this error. Run: python scripts/github_publish.py --status"); return 1

if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
