#!/usr/bin/env python3
"""One command for the routine work: python scripts/maintain.py [--zip] [--no-browser] [--dry-run]
  python scripts/maintain.py --list-backups | --verify-backups | --restore [backup.zip] | --doctor | --offsite DIR
Failsafes: one run at a time (lock); a backup zip of code, data and seals before anything changes (last 10 kept);
if the gates fail for any reason other than the expected hash refresh, NOTHING is refreshed (so a real problem is not hidden);
if the gates fail after a refresh, the backup is restored automatically; every write is atomic; the zip is verified and gets a .sha256 file.
v63 failsafes: backups carry checksums and are verified before restore (a damaged one is refused, never half-applied); the backup you
are restoring is never pruned; --verify-backups checks every backup; an unexpected crash after the backup restores it automatically;
release zips and off-site copies never contain secrets (.env, *.key, *.pem, *.bak); off-site copies are atomic, hash-checked and keep the last 5.
Steps: 1 create year files for this and next application year (pending_review copies), 2 show changed tracked files and refresh seals,
3 run every gate and the browser test, 4 print the to-do list only a person can do. It never marks anything verified."""
import hashlib, importlib.util, json, os, re, shutil, subprocess, sys, zipfile
from datetime import date, datetime
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(Path(__file__).resolve().parent))
import safe_io, doctor
PY = sys.executable

def sh(*a, timeout=900):
    """Run a helper script. A hung script is stopped after `timeout` seconds instead of freezing the whole run."""
    try:
        r = subprocess.run([PY, *map(str, a)], cwd=ROOT, capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=timeout)
    except subprocess.TimeoutExpired:
        return 124, f"{a[0]} timed out after {timeout}s and was stopped"
    return r.returncode, (r.stdout + r.stderr)

_SNAP = {"path": None}

def default_year(d=None):
    d = d or date.today(); return d.year + 1 if d.month >= 8 else d.year

HASH_ERR = ("SHA-256", "missing from gate_integrity_manifest", "missing hashes for", "MISMATCH", "tamper")

def run_gates():
    rc, out = sh("scripts/run_all_20_gates.py")
    fails, cur = {}, None
    for line in out.splitlines():
        if line.startswith("[FAIL]"): cur = line.split()[1]; fails[cur] = []
        elif line.startswith("   ERROR") and cur: fails[cur].append(line.strip())
    return rc == 0, fails, out

def only_hash_failures(fails):
    return all(all(any(k in e for k in HASH_ERR) or "Stage 2" in e for e in errs) for errs in fails.values())

def refresh_seals():
    sh("scripts/gates/18_verify_sha256_integrity_manifest.py", "--write"); sh("scripts/run_all_20_gates.py", "--write-gate-hashes")

def main(argv):
    if "--list-backups" in argv:
        for b in safe_io.list_snapshots(ROOT): print(b.name)
        return 0
    if "--doctor" in argv:
        return doctor.main()
    if "--verify-backups" in argv:
        snaps = safe_io.list_snapshots(ROOT)
        if not snaps: print("No backups yet."); return 1
        bad = 0
        for b in snaps:
            ok, msg = safe_io.verify_snapshot(b); bad += (not ok); print(("OK   " if ok else "BAD  ") + b.name + ": " + msg)
        print(f"{len(snaps) - bad} good, {bad} damaged."); return 1 if bad else 0
    if "--restore-drill" in argv:
        rc, out = sh("scripts/restore_drill.py", *[x for x in argv if not x.startswith("--")], timeout=1800)
        print(out.strip()); return rc
    if "--restore" in argv:
        rest = [a for a in argv if not a.startswith("--")]
        snaps = safe_io.list_snapshots(ROOT)
        if rest:
            pick = Path(rest[0]) if Path(rest[0]).exists() else ROOT / "backups" / rest[0]
        else:  # newest backup that passes its own checks; skip damaged ones and the automatic before-restore copies
            good = [b for b in reversed(snaps) if "before-restore" not in b.name and safe_io.verify_snapshot(b)[0]]
            pick = good[0] if good else None
        if not pick: print("No usable backup found. Run: python scripts/maintain.py --verify-backups"); return 1
        n = safe_io.restore(ROOT, pick); print(f"Restored {n} files from {pick.name}. (A safety copy of the previous state was saved first.)"); return 0
    if any(l == "FAIL" for l, _ in doctor.checks()):
        print("Preflight found a problem that would break the run:"); doctor.main(); return 1
    with safe_io.lock(ROOT):
        rc = run(argv)
    off = argv[argv.index("--offsite") + 1] if "--offsite" in argv and argv.index("--offsite") + 1 < len(argv) else os.environ.get("MZ_OFFSITE_DIR")
    if off and rc == 0: rc = offsite_copy(Path(off)) or rc
    return rc

def offsite_copy(dest, keep=5):
    """Second copy of the newest GOOD backup and the newest release zips somewhere else (USB drive, synced cloud folder).
    Each copy is written atomically and hash-checked; secrets are never copied; the destination keeps the newest `keep` zips."""
    dest = Path(dest)
    try:
        dest.mkdir(parents=True, exist_ok=True)
        probe = dest / ".mz_write_test"; probe.write_bytes(b"x"); probe.unlink()
    except OSError as e: print(f"Off-site folder unusable ({e}). Nothing copied."); return 1
    good = [b for b in reversed(safe_io.list_snapshots(ROOT)) if safe_io.verify_snapshot(b)[0]]
    rel = sorted((ROOT / "dist").glob("mzansi_pathways_*.zip*"), key=safe_io.version_key)[-4:] if (ROOT / "dist").exists() else []
    files = good[:1] + [f for f in rel if not safe_io.is_secret_name(f.name)]
    if not files: print("Nothing to copy yet: no backup or release zip exists."); return 1
    try: free = shutil.disk_usage(dest).free
    except OSError: free = None
    need = sum(f.stat().st_size for f in files)
    if free is not None and free < need * 2: print(f"Off-site folder has too little room ({free // 1048576} MB free, need about {need * 2 // 1048576} MB). Nothing copied."); return 1
    for f in files:
        t = dest / f.name
        try:
            safe_io.copy_verified(f, t)
            print("Off-site copy OK: " + str(t))
        except OSError as e:
            print(f"Off-site copy FAILED for {f.name}: {e}"); return 1
    zips = sorted([z for z in dest.glob("*.zip") if not z.name.endswith("_before-restore.zip")], key=lambda z: z.stat().st_mtime)
    for old in zips[:-keep * 2]:
        try: old.unlink(); old.with_suffix(".zip.sha256").unlink(missing_ok=True)
        except OSError: pass
    return 0

def run(argv):
    """Crash guard: if anything unexpected goes wrong after the backup was taken, put the backup back automatically."""
    try:
        return _run(argv)
    except Exception as e:  # SystemExit (clean refusals) passes through untouched
        print(f"Unexpected error: {type(e).__name__}: {e}")
        if _SNAP["path"] and Path(_SNAP["path"]).exists():
            n = safe_io.restore(ROOT, _SNAP["path"]); print(f"Restored {n} files from {Path(_SNAP['path']).name}. Nothing was left half-done.")
        return 1

def _run(argv):
    dry = "--dry-run" in argv
    idx = safe_io.read_json(ROOT / "data/index.json")
    for f in idx["files"]: safe_io.read_json(ROOT / "data" / f)  # every year file must parse before we touch anything
    have = sorted(int(re.search(r"(\d{4})", f).group(1)) for f in idx["files"])
    snap = None if dry else safe_io.snapshot(ROOT, "before-maintain")
    if snap: print("Backup: " + snap.name); _SNAP["path"] = snap
    if not dry:
        fixed = safe_io.normalise_eol(ROOT)  # CRLF (Windows editors, git autocrlf) would make every SHA-256 seal fail
        if fixed: print(f"Fixed Windows line endings (CRLF to LF) in {len(fixed)} file(s).")
    for y in (default_year(), default_year() + 1):
        if y in have: continue
        args = ["scripts/new_year.py", str(y)] + (["--copy-from", str(max(h for h in have if h < y))] if any(h < y for h in have) else []) + (["--dry-run"] if dry else [])
        rc, out = sh(*args); print(("OK " if rc == 0 else "Could not create ") + f"{y}: " + ((out.strip().splitlines() or ["(no output)"])[0]))
        if rc == 0 and not dry: have.append(y)

    man = safe_io.read_json(ROOT / "integrity_manifest.json")["sha256"]
    changed = [k for k, v in man.items() if (ROOT / k).exists() and hashlib.sha256((ROOT / k).read_bytes()).hexdigest() != v]
    print("Changed since last seal: " + (", ".join(changed) if changed else "nothing"))
    ok, fails, out = run_gates()
    if not ok:
        if not only_hash_failures(fails):
            print("Gates failed for a reason other than the expected seal refresh. Seals NOT refreshed, nothing hidden:")
            for k, v in fails.items(): print("  " + k + ": " + "; ".join(v[:3]))
            print("Fix the problem, or undo with: python scripts/maintain.py --restore"); return 1
        if dry: print("Dry run: would refresh seals (only hash checks failing)."); return 0
        refresh_seals(); ok, fails, out = run_gates()
        if not ok:
            for k, v in fails.items(): print("  " + k + ": " + "; ".join(v[:3]))
            n = safe_io.restore(ROOT, snap); print(f"Gates still fail after refresh. Restored {n} files from {snap.name}."); return 1
    print(out.strip().splitlines()[-1] if out.strip() else "no gate output")
    if "--no-browser" not in argv:
        if importlib.util.find_spec("play" + "wright"):
            rc2, o2 = 0, ""
            for bt in ("tests/browser_check.py", "tests/browser_failsafes.py"):  # app behaviour, then learner-side failsafes (backup, restore, damaged storage)
                r_, o_ = sh(bt, timeout=300)
                if r_ != 0: rc2, o2 = r_, bt + ":\n" + o_
            print("Browser test: " + ("OK" if rc2 == 0 else "FAILED\n" + o2[-600:]))
            if rc2 != 0 and snap: ok = False
        else:
            print("Browser test skipped (pip install playwright && playwright install chromium).")

    todo = []
    inst = json.loads((ROOT / "data/institutions.json").read_text(encoding="utf-8"))["institutions"]
    n = sum(1 for i in inst if i.get("listStatus") == "draft_unchecked")
    if n: todo.append(f"{n} TVET colleges are draft: check against the DHET list, add officialUrl, set listStatus to checked.")
    for y in sorted(have):
        d = safe_io.read_json(ROOT / f"data/programmes/{y}.json"); ps = d.get("programmes", [])
        ver = [p for p in ps if p.get("verificationStatus") == "verified"]
        if not ps: todo.append(f"{y}: no programme rules yet. Import real rows with scripts/csv_to_programmes_json.py.")
        else: todo.append(f"{y}: {len(ps)} records, {len(ver)} verified, {len(ps) - len(ver)} waiting for the 5 checks + 2 sign-offs (python scripts/mz_verify.py queue {y}).")
        for p in ver:
            lv = p.get("lastVerifiedAt")
            if lv and (date.today() - datetime.strptime(lv, "%Y-%m-%d").date()).days > 90: todo.append(f"{y}/{p['id']}: verified {lv}, expires at 120 days. Re-check it.")
    i18n = (ROOT / "js/i18n.js").read_text(encoding="utf-8")
    for m in re.finditer(r"name: '(\w+)', reviewed: false", i18n): todo.append(f"{m.group(1)} translation is unreviewed (see docs/LANGUAGES_V22.md).")
    v = ROOT / "vendor/tesseract/eng.traineddata.gz"
    if not v.exists(): todo.append("Offline photo scanning: run scripts/fetch_vendor.sh, then add vendor/tesseract/eng.traineddata.gz.")
    print("\nOnly a person can do:\n" + "\n".join("  - " + t for t in todo))

    if "--zip" in argv and ok and not dry:
        ver = re.search(r"mzansi-pathways-(v\d+)", (ROOT / "sw.js").read_text(encoding="utf-8")).group(1)
        out = ROOT / "dist" / f"mzansi_pathways_{ver}.zip"; out.parent.mkdir(exist_ok=True)
        tmp = out.with_suffix(".zip.tmp")
        with zipfile.ZipFile(tmp, "w", zipfile.ZIP_DEFLATED) as z:
            for f in sorted(ROOT.rglob("*")):
                if f.is_file() and not any(x in f.parts or x.startswith(".restore-") for x in ("dist", "backups", "__pycache__", ".git", "node_modules")) and not any(x.startswith(".restore-") for x in f.parts) and f.suffix != ".tmp" and f.name not in (".maintain.lock", ".doctor.tmp", ".mz_write_test") and not safe_io.is_secret_name(f.name):
                    z.write(f, Path("mzansi-pathways") / f.relative_to(ROOT))
        with zipfile.ZipFile(tmp) as z:
            names = set(z.namelist())
            need = {"mzansi-pathways/index.html", "mzansi-pathways/sw.js", "mzansi-pathways/data/index.json", "mzansi-pathways/integrity_manifest.json"}
            if z.testzip() is not None or not need <= names:
                tmp.unlink(); print("Zip failed its own check and was discarded."); return 1
        tmp.replace(out)
        safe_io.atomic_write_bytes(out.with_suffix(".zip.sha256"), (safe_io.sha256_file(out) + "  " + out.name + "\n").encode("utf-8"))
        for old in sorted(out.parent.glob("*.zip"), key=safe_io.version_key)[:-5]:  # numeric order: v100 is newer than v62
            old.unlink(); old.with_suffix(".zip.sha256").unlink(missing_ok=True)
        print("Wrote " + str(out.relative_to(ROOT)) + " (+ .sha256)")
    return 0 if ok else 1

if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
