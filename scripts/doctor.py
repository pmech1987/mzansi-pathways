#!/usr/bin/env python3
"""Preflight check: python scripts/doctor.py   (also run by maintain.py). Says what is missing and exactly how to fix it.
Exit code 1 only for problems that would break a run; everything else is a warning."""
import importlib.util, json, shutil, sys, time
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(Path(__file__).resolve().parent))
import safe_io

def checks():
    out = []  # (level, message)  level: FAIL | WARN | OK
    out.append(("OK" if sys.version_info >= (3, 9) else "FAIL", f"Python {sys.version.split()[0]}" + ("" if sys.version_info >= (3, 9) else " is too old. Install Python 3.9 or newer from python.org")))
    for rel in ("index.html", "sw.js", "manifest.json", "data/index.json", "data/institutions.json", "integrity_manifest.json", "gate_integrity_manifest.json", "scripts/run_all_20_gates.py"):
        out.append(("OK" if (ROOT / rel).exists() else "FAIL", rel if (ROOT / rel).exists() else f"{rel} is missing. Run: python scripts/maintain.py --restore, or re-extract the zip"))
    try:
        idx = json.loads((ROOT / "data/index.json").read_text(encoding="utf-8"))
        for f in idx.get("files", []):
            try: json.loads((ROOT / "data" / f).read_text(encoding="utf-8"))
            except Exception as e: out.append(("FAIL", f"data/{f} is not usable ({e}). Run: python scripts/maintain.py --restore"))
    except Exception as e:
        out.append(("FAIL", f"data/index.json is not usable ({e}). Run: python scripts/maintain.py --restore"))
    # v63 data safety: every year file listed and parseable, no unlisted year files, no duplicate ids, no half-finished runs
    try:
        idx = json.loads((ROOT / "data/index.json").read_text(encoding="utf-8"))
        listed = {f for f in idx.get("files", [])}
        for f in sorted((ROOT / "data/programmes").glob("*.json")):
            if f"programmes/{f.name}" not in listed:
                out.append(("WARN", f"data/programmes/{f.name} exists but is not listed in data/index.json, so the app cannot see it. Run: python scripts/new_year.py {f.stem}"))
        for f in sorted(listed):
            try:
                ids = [p.get("id") for p in json.loads((ROOT / "data" / f).read_text(encoding="utf-8")).get("programmes", [])]
                dup = sorted({i for i in ids if ids.count(i) > 1})
                if dup: out.append(("FAIL", f"data/{f} has duplicate programme ids: {', '.join(map(str, dup[:5]))}. Remove the extra rows"))
            except Exception: pass  # already reported above
    except Exception: pass
    try:
        for rv in json.loads((ROOT / "data/reviewers.json").read_text(encoding="utf-8")).get("reviewers", []):
            rec = rv.get("recovery") or {}; left = len(rec.get("hashes", [])) - len(rec.get("used", []))
            if not rec: out.append(("WARN", f"reviewer {rv.get('id')} has no backup codes. If their phone is lost they cannot sign. Run: python scripts/mz_verify.py recovery-new {rv.get('id')} --code <current code>"))
            elif left < 3: out.append(("WARN", f"reviewer {rv.get('id')} has only {left} backup code(s) left. Run: python scripts/mz_verify.py recovery-new {rv.get('id')} --code <current code>"))
    except Exception: pass
    crlf = safe_io.normalise_eol(ROOT, dry_run=True)
    if crlf: out.append(("WARN", f"{len(crlf)} file(s) have Windows line endings (CRLF), which makes the seals fail (e.g. {crlf[0]}). Run: python scripts/maintain.py --zip (it fixes them)"))
    if not (ROOT / ".gitattributes").exists(): out.append(("WARN", ".gitattributes is missing: Git may convert line endings on Windows and break the seals. Restore it from the release zip"))
    lk = ROOT / ".maintain.lock"
    if lk.exists():
        age = int(time.time() - lk.stat().st_mtime)
        out.append(("WARN", f".maintain.lock is {age // 60} minute(s) old. If no maintenance run is open, delete it" if age < 3600 else ".maintain.lock is stale (over 1 hour). It is ignored automatically; you may delete it"))
    for d in ROOT.glob(".restore-*"):
        out.append(("WARN", f"{d.name} is left over from an interrupted restore. Your data is safe; delete this folder"))
    for t in list(ROOT.rglob("*.tmp"))[:5]:
        if not any(x in t.parts for x in ("node_modules", ".git")): out.append(("WARN", f"leftover temp file {t.relative_to(ROOT)} from an interrupted write; it is safe to delete"))
    # secrets must never sit inside the project folder where a zip or git push could pick them up
    for pat in (".env", ".env.*", "*.pem", "*.key", "*.mzansi"):
        for f in ROOT.glob(pat):
            out.append(("WARN", f"{f.name} looks like a secret. It is excluded from backups and release zips, but keep it outside this folder"))
    snaps = safe_io.list_snapshots(ROOT)
    if snaps:
        ok, msg = safe_io.verify_snapshot(snaps[-1])
        out.append(("OK" if ok else "WARN", f"newest backup {snaps[-1].name}: {msg}" if ok else f"newest backup {snaps[-1].name} is damaged ({msg}). Run: python scripts/maintain.py --verify-backups"))
        age_d = (time.time() - snaps[-1].stat().st_mtime) / 86400
        if age_d > 14: out.append(("WARN", f"newest backup is {int(age_d)} days old. Run: python scripts/maintain.py --zip --offsite <folder>"))
    try:
        sb = json.loads((ROOT / "backups" / "last_scheduled_backup.json").read_text(encoding="utf-8"))
        d = (time.time() - sb.get("epoch", 0)) / 86400
        if not sb.get("ok"): out.append(("WARN", "the last automatic backup had problems. Run: python scripts/scheduled_backup.py --status"))
        elif d > 10: out.append(("WARN", f"the last automatic backup was {int(d)} days ago: the schedule may have stopped. Run: python scripts/scheduled_backup.py --install"))
        else: out.append(("OK", f"automatic backup ran {d:.0f} day(s) ago"))
    except (OSError, ValueError):
        out.append(("WARN", "no automatic weekly backup yet. Install it once: python scripts/scheduled_backup.py --install (Windows)"))
    off = __import__("os").environ.get("MZ_OFFSITE_DIR")
    out.append(("OK", f"off-site folder set: {off}") if off else ("WARN", "No off-site backup folder set. A backup on this PC is lost with this PC: set MZ_OFFSITE_DIR or use --offsite"))
    try:
        free = shutil.disk_usage(ROOT).free // (1024 * 1024)
        out.append(("OK" if free >= 200 else "WARN", f"{free} MB free disk" + ("" if free >= 200 else " (backups need room; free some space)")))
    except OSError: pass
    try:
        t = ROOT / ".doctor.tmp"; t.write_text("x"); t.unlink(); out.append(("OK", "Project folder is writable"))
    except OSError: out.append(("FAIL", "Project folder is read-only. Move it out of Downloads-protected or synced read-only folders"))
    out.append(("OK" if shutil.which("node") else "WARN", "Node.js found" if shutil.which("node") else "Node.js not found: only needed for the JavaScript syntax tests. Install from nodejs.org"))
    pw = importlib.util.find_spec("play" + "wright")
    out.append(("OK" if pw else "WARN", "Browser test tool installed" if pw else "Browser test skipped: pip install playwright, then playwright install chromium"))
    for rel, how in (("vendor/tesseract/eng.traineddata.gz", "photo scanning will not work offline: run scripts/fetch_vendor.sh, then add this file by hand"),):
        out.append(("OK" if (ROOT / rel).exists() else "WARN", rel if (ROOT / rel).exists() else f"{rel} missing: {how}"))
    # v66 GitHub safety (warnings only: the app works without GitHub)
    if not shutil.which("git"):
        out.append(("WARN", "Git not installed: needed only to publish. Install from git-scm.com, then see docs/GITHUB_GUIDE_V67.md"))
    elif not (ROOT / ".git").exists():
        out.append(("WARN", "Not connected to GitHub yet. Follow docs/GITHUB_GUIDE_V67.md (step 6) to publish"))
    else:
        import subprocess
        def _g(*a):
            try: r = subprocess.run(["git", *a], cwd=ROOT, capture_output=True, text=True, timeout=20); return r.returncode, r.stdout.strip()
            except Exception: return 1, ""
        c, rem = _g("remote", "get-url", "origin")
        out.append(("OK", f"GitHub remote: {rem}") if c == 0 and rem else ("WARN", "No GitHub remote set. Run: python scripts/github_publish.py --setup https://github.com/YOURNAME/mzansi-pathways.git"))
        c, dirty = _g("ls-files", "-m", "-o", "--exclude-standard")
        n = len([x for x in dirty.splitlines() if x]) if c == 0 else 0
        if n: out.append(("WARN", f"{n} file(s) changed but not published. Run: python scripts/github_publish.py --message \"what you changed\""))
        c, ts = _g("log", "-1", "--format=%ct")
        if c == 0 and ts.isdigit() and (time.time() - int(ts)) / 86400 > 30: out.append(("WARN", "Last saved commit is over 30 days old. Publish your latest work"))
        c, _ = _g("ls-files", "--error-unmatch", ".env")
        if c == 0: out.append(("FAIL", ".env is tracked by git. Run: git rm --cached .env  and change every password in it"))
    snaps = list((ROOT / "backups").glob("*.zip")) if (ROOT / "backups").exists() else []
    out.append(("OK" if snaps else "WARN", f"{len(snaps)} backup(s) in backups/" if snaps else "No backups yet: they are made automatically on the first python scripts/maintain.py run"))
    return out

def main():
    res = checks()
    for lvl, msg in res: print(f"[{lvl}] {msg}")
    bad = sum(1 for l, _ in res if l == "FAIL")
    print(f"\n{bad} problem(s), {sum(1 for l, _ in res if l == 'WARN')} warning(s).")
    return 1 if bad else 0

if __name__ == "__main__":
    raise SystemExit(main())
