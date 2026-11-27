#!/usr/bin/env python3
"""Backups of data/ that live outside the normal git history (so a damaged repository is not the only copy).

    python scripts/backup_data.py                    # make backups/data-<time>.tar.gz plus a .sha256, keep the newest 14
    python scripts/backup_data.py --list             # show backups and whether each still matches its checksum
    python scripts/backup_data.py --restore FILE     # put a backup back (checks the checksum first, backs up the current data first)

The workflows make one before every automated change and keep it as a downloadable artifact for 30 days.
Restoring only ever writes inside data/ and refuses any archive with odd paths, links or devices.
"""
import hashlib, io, os, shutil, sys, tarfile, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import mz_common as C

KEEP = 14


def backups_dir():
    return os.path.join(C.ROOT, 'backups')


def sha256_of(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for chunk in iter(lambda: f.read(1 << 20), b''):
            h.update(chunk)
    return h.hexdigest()


def make(stamp=None):
    os.makedirs(backups_dir(), exist_ok=True)
    stamp = stamp or time.strftime('%Y%m%d-%H%M%S', time.gmtime())
    out = os.path.join(backups_dir(), 'data-%s.tar.gz' % stamp)
    n = 0
    while os.path.exists(out):
        n += 1; out = os.path.join(backups_dir(), 'data-%s-%d.tar.gz' % (stamp, n))
    tmp = out + '.part'
    with tarfile.open(tmp, 'w:gz') as tar:
        tar.add(C.DATA, arcname='data', filter=lambda ti: None if ti.name.endswith(('.tmp', '.part')) else ti)
    os.replace(tmp, out)
    with open(out + '.sha256', 'w', encoding='utf-8') as f:
        f.write('%s  %s\n' % (sha256_of(out), os.path.basename(out)))
    prune()
    return out


def listing():
    d = backups_dir()
    return sorted(os.path.join(d, f) for f in os.listdir(d) if f.startswith('data-') and f.endswith('.tar.gz')) if os.path.isdir(d) else []


def verify(path):
    try:
        want = C.read_text(path + '.sha256').split()[0]
    except Exception:
        return False
    return want == sha256_of(path)


def prune(keep=KEEP):
    for p in listing()[:-keep]:
        for q in (p, p + '.sha256'):
            if os.path.exists(q):
                os.unlink(q)


def safe_members(tar):
    out = []
    for m in tar.getmembers():
        parts = m.name.split('/')
        if m.name.startswith('/') or '..' in parts or parts[0] != 'data' or not (m.isfile() or m.isdir()):
            raise ValueError('unsafe entry in backup: %r' % m.name)
        out.append(m)
    return out


def restore(path):
    if not verify(path):
        raise ValueError('checksum does not match (or .sha256 missing): refusing to restore %s' % path)
    with tarfile.open(path, 'r:gz') as tar:
        members = safe_members(tar)
        safety = make('before-restore-' + time.strftime('%Y%m%d-%H%M%S', time.gmtime()))
        staging = os.path.join(C.ROOT, '.restore_tmp')
        shutil.rmtree(staging, ignore_errors=True)
        os.makedirs(staging)
        tar.extractall(staging, members=members)
    new = os.path.join(staging, 'data')
    if not os.path.isdir(new):
        raise ValueError('backup has no data/ folder')
    old = C.DATA + '.old'
    shutil.rmtree(old, ignore_errors=True)
    os.replace(C.DATA, old)
    try:
        os.replace(new, C.DATA)
    except Exception:
        os.replace(old, C.DATA); raise
    shutil.rmtree(old, ignore_errors=True); shutil.rmtree(staging, ignore_errors=True)
    return safety



def restore_latest():
    """Restore the newest checksum-verified backup archive in backups/."""
    candidates = [p for p in reversed(listing()) if verify(p)]
    if not candidates:
        raise ValueError('no verified backups found in backups/')
    src = candidates[0]
    return src, restore(src)


def main(argv=None):
    argv = list(sys.argv[1:] if argv is None else argv)
    if '--list' in argv:
        for p in listing():
            C.log('%s  %s  %d KB' % ('OK     ' if verify(p) else 'CORRUPT', os.path.basename(p), os.path.getsize(p) // 1024))
        return 0
    if '--restore-latest' in argv:
        src, safety = restore_latest()
        C.log('restored latest verified backup %s. Previous data saved as %s' % (os.path.basename(src), safety))
        return 0
    if '--restore' in argv:
        src = argv[argv.index('--restore') + 1]
        safety = restore(src)
        C.log('restored %s. The data you replaced was saved first as %s' % (src, safety))
        return 0
    out = make()
    C.log('backup written: %s (%d KB)' % (os.path.relpath(out, C.ROOT), os.path.getsize(out) // 1024))
    return 0


if __name__ == '__main__':
    sys.exit(main())
