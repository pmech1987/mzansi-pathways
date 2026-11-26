#!/usr/bin/env python3
"""Restore drill: proves a backup can really be restored AND still passes every gate. A backup you never tested is a hope, not a backup.
  python scripts/restore_drill.py                  newest project zip in backups/ or dist/, and newest git bundle in backups/git/
  python scripts/restore_drill.py PATH [PATH...]   a .zip (project backup or release) and/or a .bundle (git history)
Works in a throw-away temp folder; your real project is never touched. Exit code 0 only if every item restored and passed.
Also used by the weekly GitHub backup workflow."""
import hashlib, json, os, shutil, subprocess, sys, tempfile, zipfile
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent

def say(m=""): print(m, flush=True)

def _sha(p):
    h = hashlib.sha256()
    with open(p, "rb") as f:
        for c in iter(lambda: f.read(1 << 20), b""): h.update(c)
    return h.hexdigest()

def check_sidecar(p: Path) -> str:
    """If a .sha256 file sits next to the backup, it must match. Returns '' when fine, else the problem."""
    side = Path(str(p) + ".sha256") if Path(str(p) + ".sha256").exists() else p.with_suffix(p.suffix + ".sha256")
    if not side.exists(): side = p.with_suffix(".sha256")
    if not side.exists(): return ""
    want = (side.read_text(encoding="utf-8", errors="replace").split() or [""])[0].lower()
    return "" if want == _sha(p) else f"{p.name}: checksum does not match {side.name} (file damaged or altered)"

def find_root(d: Path) -> Path:
    """The folder that holds index.html (a release zip nests it one level down)."""
    if (d / "index.html").exists(): return d
    for c in sorted(d.iterdir()):
        if c.is_dir() and (c / "index.html").exists(): return c
    return d

def run_gates(root: Path):
    r = subprocess.run([sys.executable, "-I", "scripts/verify_release.py"], cwd=root, capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=900,
                       env={k: v for k, v in os.environ.items() if k != "PYTHONPATH"})
    tail = [l for l in (r.stdout + r.stderr).splitlines() if l.strip()]
    return r.returncode == 0, (tail[-1] if tail else "no output")

def drill_zip(z: Path, tmp: Path):
    bad = check_sidecar(z)
    if bad: return False, bad
    try:
        with zipfile.ZipFile(z) as zf:
            if zf.testzip() is not None: return False, f"{z.name}: a file inside is damaged"
            names = zf.namelist()
            if any(n.startswith(("/", "..")) or ".." in Path(n).parts for n in names): return False, f"{z.name}: unsafe paths inside"
            dest = tmp / "zip"; zf.extractall(dest)
    except (zipfile.BadZipFile, OSError) as e: return False, f"{z.name}: cannot be opened ({e})"
    root = find_root(dest)
    if not (root / "scripts" / "verify_release.py").exists():
        # a project backup (snapshot) holds the same files plus a manifest; it must still carry the gates
        return False, f"{z.name}: no scripts/verify_release.py inside, so it cannot be verified"
    ok, last = run_gates(root)
    return ok, f"{z.name}: {last}"

def drill_bundle(b: Path, tmp: Path):
    bad = check_sidecar(b)
    if bad: return False, bad
    if subprocess.run(["git", "bundle", "verify", str(b)], capture_output=True, text=True).returncode != 0: return False, f"{b.name}: git says this bundle is damaged"
    dest = tmp / "bundle"
    r = subprocess.run(["git", "clone", "-q", str(b), str(dest)], capture_output=True, text=True)
    if r.returncode != 0: return False, f"{b.name}: could not be cloned: {r.stderr.strip()[-200:]}"
    ok, last = run_gates(dest)
    return ok, f"{b.name}: {last}"

def newest(pattern_dirs, pattern):
    files = [f for d in pattern_dirs if d.exists() for f in d.glob(pattern) if f.is_file() and "before-restore" not in f.name]
    return max(files, key=lambda f: f.stat().st_mtime) if files else None

def main(argv):
    items = [Path(a) for a in argv if not a.startswith("--")]
    if not items:
        z = newest([ROOT / "dist", ROOT / "backups"], "*.zip"); b = newest([ROOT / "backups" / "git"], "*.bundle")
        items = [x for x in (z, b) if x]
    if not items: say("Nothing to test yet. Run: python scripts/maintain.py --zip   and   python scripts/github_publish.py --bundle"); return 1
    results = []
    for it in items:
        if not it.exists(): results.append((False, f"{it}: not found")); continue
        tmp = Path(tempfile.mkdtemp(prefix="mz_drill_"))
        try:
            say(f"Restoring {it.name} into a temporary folder and running every gate...")
            results.append(drill_bundle(it, tmp) if it.suffix == ".bundle" else drill_zip(it, tmp))
        except subprocess.TimeoutExpired: results.append((False, f"{it.name}: gates took too long"))
        finally: shutil.rmtree(tmp, ignore_errors=True)
    say()
    for ok, msg in results: say(("[OK]   " if ok else "[FAIL] ") + msg)
    good = all(ok for ok, _ in results)
    say("\nRESTORE DRILL " + ("PASSED: these backups can be restored and verified." if good else "FAILED: do NOT rely on the failed backup(s). Make a fresh one: python scripts/maintain.py --zip"))
    return 0 if good else 1

if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
