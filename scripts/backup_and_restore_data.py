#!/usr/bin/env python3
"""Data-only snapshot and rollback (every file under data/), with a checksum list.
  python scripts/backup_and_restore_data.py snapshot     -> backups/data/<time>/ (copy of data/ + CHECKSUMS.json)
  python scripts/backup_and_restore_data.py verify [dir] -> checks every file against its checksum
  python scripts/backup_and_restore_data.py restore [dir]-> puts the newest (or named) good snapshot back, after saving the current data
For a full backup of code + data + seals use: python scripts/maintain.py --zip"""
import hashlib, json, shutil, sys
from datetime import datetime
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
import safe_io

ROOT = Path(__file__).resolve().parent.parent


def create_verified_snapshot(data_path: Path, backup_path: Path) -> dict:
    """Kept for compatibility: verified single-file snapshot of a programmes file."""
    if not data_path.exists():
        raise FileNotFoundError(f"Missing {data_path}")
    raw = data_path.read_bytes()
    parsed = json.loads(raw.decode("utf-8"))
    if not isinstance(parsed.get("programmes"), list):
        raise ValueError("programmes must be a list")
    safe_io.atomic_write_bytes(backup_path, raw)
    if safe_io.sha256_file(backup_path) != hashlib.sha256(raw).hexdigest():
        raise OSError("snapshot differs from the original")
    return {"snapshot": str(backup_path), "sha256": hashlib.sha256(raw).hexdigest(), "count": len(parsed["programmes"])}


def snapshot_data(root: Path = ROOT, keep: int = 20) -> Path:
    root = Path(root); src = root / "data"
    if not src.is_dir(): raise FileNotFoundError("data/ folder is missing")
    out_root = root / "backups" / "data"; out_root.mkdir(parents=True, exist_ok=True)
    dest = out_root / datetime.now().strftime("%Y%m%d-%H%M%S-%f")
    sums = {}
    for f in sorted(src.rglob("*")):
        if f.is_file() and f.suffix != ".tmp":
            rel = f.relative_to(src).as_posix(); raw = f.read_bytes()
            if f.suffix == ".json": json.loads(raw.decode("utf-8-sig"))  # refuse to back up a damaged file as if it were good
            safe_io.atomic_write_bytes(dest / rel, raw); sums[rel] = hashlib.sha256(raw).hexdigest()
    safe_io.write_json(dest / "CHECKSUMS.json", {"created": datetime.now().isoformat(timespec="seconds"), "files": sums})
    ok, msg = verify_data_snapshot(dest)
    if not ok:
        shutil.rmtree(dest, ignore_errors=True); raise OSError("snapshot failed its own check: " + msg)
    for old in sorted(p for p in out_root.iterdir() if p.is_dir())[:-keep]:
        shutil.rmtree(old, ignore_errors=True)
    return dest


def verify_data_snapshot(dest: Path) -> tuple:
    dest = Path(dest)
    try:
        sums = json.loads((dest / "CHECKSUMS.json").read_text(encoding="utf-8"))["files"]
    except (OSError, ValueError, KeyError) as e:
        return False, f"no usable CHECKSUMS.json ({e})"
    for rel, h in sums.items():
        f = dest / rel
        if not f.is_file(): return False, f"missing {rel}"
        if safe_io.sha256_file(f) != h: return False, f"checksum mismatch for {rel}"
    return True, f"ok ({len(sums)} files)"


def restore_data(root: Path = ROOT, snap: Path = None) -> int:
    root = Path(root); base = root / "backups" / "data"
    cands = sorted(p for p in base.iterdir() if p.is_dir()) if base.is_dir() else []
    if snap is None:
        good = [c for c in reversed(cands) if verify_data_snapshot(c)[0]]
        if not good: raise SystemExit("No intact data snapshot found.")
        snap = good[0]
    snap = Path(snap)
    ok, msg = verify_data_snapshot(snap)
    if not ok: raise SystemExit(f"That snapshot is damaged ({msg}). Nothing changed.")
    if (root / "data").is_dir(): snapshot_data(root)  # save the current state first
    stage = root / ("data.restoring")
    shutil.rmtree(stage, ignore_errors=True)
    n = 0
    for f in snap.rglob("*"):
        if f.is_file() and f.name != "CHECKSUMS.json":
            safe_io.atomic_write_bytes(stage / f.relative_to(snap), f.read_bytes()); n += 1
    old = root / "data.replaced"; shutil.rmtree(old, ignore_errors=True)
    if (root / "data").is_dir(): (root / "data").rename(old)
    try:
        stage.rename(root / "data")
    except OSError:
        if old.is_dir() and not (root / "data").exists(): old.rename(root / "data")  # put the live data back; never leave data/ missing
        raise
    shutil.rmtree(old, ignore_errors=True)
    return n


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "snapshot"
    if cmd == "snapshot": print("Data snapshot saved: " + str(snapshot_data()))
    elif cmd == "verify":
        base = ROOT / "backups" / "data"
        for d in ([Path(sys.argv[2])] if len(sys.argv) > 2 else sorted(base.iterdir()) if base.is_dir() else []):
            ok, msg = verify_data_snapshot(d); print(("OK   " if ok else "BAD  ") + d.name + ": " + msg)
    elif cmd == "restore": print(f"Restored {restore_data(ROOT, Path(sys.argv[2]) if len(sys.argv) > 2 else None)} files.")
    else: sys.exit(__doc__)
