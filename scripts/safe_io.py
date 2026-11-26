#!/usr/bin/env python3
"""Shared failsafes for the maintenance scripts: atomic writes, validated JSON, a run lock, and verified snapshots you can restore.
A script that crashes half way can never leave a half-written data file: writes go to a temp file, are checked, then swapped in.
v63: the lock is created atomically (no race between two runs); a backup is never pruned while it is being restored;
every backup carries a SHA-256 of each file inside it and is re-checked before it is trusted; restore stages everything in a
temporary folder first, so a damaged backup can never wipe your live data; backup names can never collide."""
import hashlib, json, os, shutil, sys, tempfile, time, zipfile
from contextlib import contextmanager
from datetime import datetime
from pathlib import Path

SNAP_ITEMS = ("data", "sw.js", "index.html", "js", "integrity_manifest.json", "gate_integrity_manifest.json",
              "release_attestation.json", "release_verification_report.json", "audit_summary.json", "CHANGELOG.md", "README.md", "docs",
              "scripts", "tests", ".github", "manifest.json", "_headers", "auth_security_policy.json", "SETUP.md", "SECURITY.md",
              "CONTRIBUTING.md", "LICENSE", "maintain.bat", "publish.bat", "backup_now.bat", ".gitignore", ".gitattributes", "icon-192.png", "icon-512.png")
CLEAN_ON_RESTORE = ("data", "js", "docs")  # files added since the snapshot are removed here; code folders are overwritten in place
MANIFEST_NAME = "SNAPSHOT_MANIFEST.json"   # inside every backup: {"files": {path: sha256}}
SECRET_PATTERNS = (".env", "*.mzansi", "*.bak", "*.pem", "*.key", "secrets*.json")  # never packed into a release zip or off-site copy

def sha256_bytes(b: bytes) -> str:
    return hashlib.sha256(b).hexdigest()

def sha256_file(path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()

def is_secret_name(name: str) -> bool:
    from fnmatch import fnmatch
    return any(fnmatch(name.lower(), p) for p in SECRET_PATTERNS) or name.lower().startswith(".env")

def _fsync_dir(path):
    """Make a rename durable. Not supported on Windows; harmless to skip there."""
    try:
        fd = os.open(str(path), os.O_RDONLY)
        try: os.fsync(fd)
        finally: os.close(fd)
    except (OSError, AttributeError):
        pass

def atomic_write_bytes(path, data: bytes):
    path = Path(path); path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(prefix=path.name + ".", suffix=".tmp", dir=str(path.parent))
    try:
        with os.fdopen(fd, "wb") as f:
            f.write(data); f.flush(); os.fsync(f.fileno())
        os.replace(tmp, path)
    except BaseException:
        try: os.unlink(tmp)
        except OSError: pass
        raise
    _fsync_dir(path.parent)

def atomic_write(path, text: str):
    """Write text to path safely. .json files must parse first or nothing is written. Always UTF-8 with LF line endings."""
    path = Path(path)
    if path.suffix == ".json":
        json.loads(text)
    atomic_write_bytes(path, text.encode("utf-8").replace(b"\r\n", b"\n"))

def write_json(path, obj, indent=1):
    """Serialise, validate, then write atomically. Use this for every data file."""
    atomic_write(path, json.dumps(obj, indent=indent) + "\n")

def read_json(path):
    try:
        return json.loads(Path(path).read_text(encoding="utf-8-sig"))
    except FileNotFoundError:
        raise SystemExit(f"Missing file: {path}")
    except json.JSONDecodeError as e:
        raise SystemExit(f"{path} is not valid JSON ({e}). Restore it with: python scripts/maintain.py --restore")

def _pid_alive(pid: int) -> bool:
    """Only trusted on POSIX. On Windows os.kill(pid, 0) would TERMINATE the process, so we never call it there."""
    if os.name == "nt" or pid <= 0: return True
    try:
        os.kill(pid, 0)
    except ProcessLookupError:
        return False
    except PermissionError:
        return True
    except OSError:
        return True
    return True

@contextmanager
def lock(root, name=".maintain.lock", stale_seconds=3600):
    """Only one maintenance run at a time. The lock file is created atomically (O_EXCL), so two runs starting together cannot both win.
    A lock is treated as left over from a crash when it is older than an hour, or (Linux/Mac) its owner process no longer exists."""
    p = Path(root) / name
    for attempt in (1, 2):
        try:
            fd = os.open(str(p), os.O_CREAT | os.O_EXCL | os.O_WRONLY)
            with os.fdopen(fd, "w") as f:
                f.write(f"{os.getpid()} {int(time.time())}\n")
            break
        except FileExistsError:
            try:
                age = time.time() - p.stat().st_mtime
                pid = int((p.read_text().split() or ["0"])[0])
            except (OSError, ValueError):
                age, pid = 0, 0
            if attempt == 1 and (age >= stale_seconds or not _pid_alive(pid)):
                try: p.unlink()
                except OSError: pass
                continue
            raise SystemExit(f"Another run is in progress ({name}). If you are sure it is not, delete that file.")
    try:
        yield
    finally:
        try: p.unlink()
        except OSError: pass

def _snap_files(root):
    root = Path(root)
    for item in SNAP_ITEMS:
        p = root / item
        files = [p] if p.is_file() else sorted(p.rglob("*")) if p.is_dir() else []
        for f in files:
            if f.is_file() and "__pycache__" not in f.parts and f.suffix != ".tmp" and not is_secret_name(f.name):
                yield f

def verify_snapshot(snap) -> tuple:
    """Check a backup zip end to end. Returns (ok, message). Verifies the zip structure, every file's SHA-256, and that no path escapes the folder."""
    snap = Path(snap)
    try:
        with zipfile.ZipFile(snap) as z:
            bad = z.testzip()
            if bad is not None: return False, f"damaged entry {bad}"
            names = z.namelist()
            for n in names:
                if n.startswith(("/", "\\")) or ".." in Path(n).parts or (len(n) > 1 and n[1] == ":"):
                    return False, f"unsafe path inside backup: {n}"
            if MANIFEST_NAME not in names:
                return True, "ok (older backup without a checksum list)"
            files = json.loads(z.read(MANIFEST_NAME).decode("utf-8"))["files"]
            for n, h in files.items():
                if n not in names: return False, f"missing {n}"
                if sha256_bytes(z.read(n)) != h: return False, f"checksum mismatch for {n}"
            return True, f"ok ({len(files)} files checked)"
    except (zipfile.BadZipFile, OSError, KeyError, ValueError) as e:
        return False, f"unreadable ({e})"

def _unique_name(out: Path, label: str) -> str:
    base = f"{datetime.now().strftime('%Y%m%d-%H%M%S')}_{label}"
    name, n = base + ".zip", 1
    while (out / name).exists():
        n += 1; name = f"{base}-{n}.zip"
    return name

def snapshot(root, label="manual", keep=10, protect=()):
    """Zip the code, data and seals into backups/<time>_<label>.zip with a checksum list, verify it, then prune to the newest `keep`.
    `protect` lists backups that must never be pruned (e.g. the one being restored). Returns the path."""
    root = Path(root); out = root / "backups"; out.mkdir(exist_ok=True)
    name = _unique_name(out, "".join(c for c in label if c.isalnum() or c in "-_") or "manual")
    final, tmp = out / name, out / (name + ".tmp")
    manifest = {}
    try:
        with zipfile.ZipFile(tmp, "w", zipfile.ZIP_DEFLATED) as z:
            for f in _snap_files(root):
                rel = f.relative_to(root).as_posix()
                data = f.read_bytes()
                manifest[rel] = sha256_bytes(data)
                z.writestr(rel, data)
            z.writestr(MANIFEST_NAME, json.dumps({"created": datetime.now().isoformat(timespec="seconds"), "files": manifest}, indent=1))
        ok, msg = verify_snapshot(tmp)
        if not ok: raise SystemExit(f"Backup failed its own check ({msg}); nothing was changed.")
        os.replace(tmp, final)
    finally:
        if tmp.exists():
            try: tmp.unlink()
            except OSError: pass
    protected = {Path(p).resolve() for p in protect} | {final.resolve()}
    snaps = [s for s in list_snapshots(root) if s.resolve() not in protected]
    room = max(0, keep - len(protected))              # how many unprotected backups may stay
    for old in snaps[:max(0, len(snaps) - room)]:      # delete the oldest ones beyond that
        try: old.unlink()
        except OSError: pass
    return final

def file_backup(root, path, keep=20):
    """Cheap one-file safety copy for frequent edits (each verification check or sign-off). Goes to backups/files/<name>.<time>.bak,
    which never competes with the full backups for space; the newest `keep` per file are kept. Returns the copy's path or None."""
    root, path = Path(root), Path(path)
    if not path.exists(): return None
    d = root / "backups" / "files"; d.mkdir(parents=True, exist_ok=True)
    dst = d / f"{path.name}.{datetime.now().strftime('%Y%m%d-%H%M%S-%f')}.bak"
    atomic_write_bytes(dst, path.read_bytes())
    for old in sorted(d.glob(path.name + ".*.bak"))[:-keep]:
        try: old.unlink()
        except OSError: pass
    return dst

def list_snapshots(root):
    """Oldest first. Ordered by the time in the name, then file time, so two backups made in the same second stay in order."""
    return sorted((Path(root) / "backups").glob("*.zip"), key=lambda p: (p.name[:15], p.stat().st_mtime_ns))

def restore(root, snap):
    """Put a snapshot back. The backup is verified first and unpacked into a temporary folder; only a complete, intact copy is swapped in.
    A safety snapshot of the current state is taken first, and the backup being restored is protected from pruning."""
    root = Path(root).resolve(); snap = Path(snap)
    if not snap.exists(): raise SystemExit(f"No such backup: {snap}")
    ok, msg = verify_snapshot(snap)
    if not ok: raise SystemExit(f"That backup is damaged ({msg}). Nothing was changed. Try an older one: python scripts/maintain.py --list-backups")
    snapshot(root, "before-restore", protect=[snap])
    stage = Path(tempfile.mkdtemp(prefix=".restore-", dir=str(root)))
    try:
        with zipfile.ZipFile(snap) as z:
            names = [n for n in z.namelist() if n != MANIFEST_NAME and not n.endswith("/")]
            z.extractall(stage, members=names)
        for item in CLEAN_ON_RESTORE:  # remove current copies so files added after the snapshot do not linger
            if any(n == item or n.startswith(item + "/") for n in names):
                p = root / item
                if p.is_dir(): shutil.rmtree(p)
                elif p.exists(): p.unlink()
        for n in names:
            dst = root / n
            dst.parent.mkdir(parents=True, exist_ok=True)
            os.replace(stage / n, dst)
    finally:
        shutil.rmtree(stage, ignore_errors=True)
    return len(names)

def copy_verified(src, dst) -> None:
    """Copy src to dst atomically and confirm the copy has the same SHA-256. Raises OSError if anything is off."""
    src, dst = Path(src), Path(dst)
    data = src.read_bytes(); h = sha256_bytes(data)
    atomic_write_bytes(dst, data)
    if sha256_file(dst) != h:
        try: dst.unlink()
        except OSError: pass
        raise OSError("copy differs from the original")

def version_key(path) -> tuple:
    """Sort mzansi_pathways_v9.zip before mzansi_pathways_v62.zip before mzansi_pathways_v100.zip (plain sorting gets this wrong)."""
    import re
    m = re.search(r"_v(\d+)", Path(path).name)
    return (int(m.group(1)) if m else -1, Path(path).name)

TEXT_SUFFIXES = (".py", ".js", ".html", ".json", ".md", ".yml", ".yaml", ".css", ".txt", ".csv", ".sql", ".sh", ".svg", ".webmanifest")
EOL_SKIP_DIRS = ("backups", "dist", ".git", "node_modules", "vendor", "__pycache__", "_site")

def normalise_eol(root, dry_run=False) -> list:
    """Windows editors and Git can turn LF line endings into CRLF. The SHA-256 seals are computed on the exact bytes, so CRLF makes
    every gate fail with a false 'tamper' error. This puts text files back to LF (the repository standard, see .gitattributes).
    Returns the relative paths that were (or, with dry_run, would be) changed. Binary files (a NUL byte) are never touched."""
    root = Path(root); changed = []
    for p in sorted(root.rglob("*")):
        try:
            rel = p.relative_to(root)
            if not p.is_file() or p.suffix.lower() not in TEXT_SUFFIXES or any(x in EOL_SKIP_DIRS or x.startswith(".restore-") for x in rel.parts): continue
            b = p.read_bytes()
        except OSError: continue
        if b"\r\n" not in b or b"\0" in b: continue
        changed.append(rel.as_posix())
        if not dry_run:
            atomic_write_bytes(p, b.replace(b"\r\n", b"\n"))
    return changed

if __name__ == "__main__":
    sys.exit(__doc__)
