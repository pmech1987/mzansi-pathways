import json, os, sys, tempfile, time, unittest, zipfile
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))
import safe_io, backup_and_restore_data as brd

def mk():
    r = Path(tempfile.mkdtemp()); (r / "data/programmes").mkdir(parents=True)
    (r / "data/index.json").write_text(json.dumps({"files": ["programmes/2027.json"]}))
    (r / "data/programmes/2027.json").write_text(json.dumps({"programmes": []}))
    (r / "sw.js").write_text("x"); (r / "scripts").mkdir(); (r / "scripts/g.py").write_text("old")
    return r

class T(unittest.TestCase):
    def setUp(self): self.r = mk()

    def test_restoring_oldest_backup_does_not_delete_it(self):
        for i in range(3): safe_io.snapshot(self.r, f"s{i}", keep=3); time.sleep(0.01)
        target = safe_io.list_snapshots(self.r)[0]      # the oldest: the one plain pruning would delete first
        safe_io.restore(self.r, target)
        self.assertTrue(target.exists(), "the backup being restored must survive pruning")
        self.assertLessEqual(len(safe_io.list_snapshots(self.r)), 4)

    def test_damaged_backup_is_refused_and_live_data_untouched(self):
        s = safe_io.snapshot(self.r, "good")
        bad = s.with_name("bad.zip"); bad.write_bytes(s.read_bytes()[:200])
        with self.assertRaises(SystemExit): safe_io.restore(self.r, bad)
        self.assertTrue((self.r / "data/index.json").exists())

    def test_tampered_file_inside_backup_is_detected(self):
        s = safe_io.snapshot(self.r, "t")
        t = s.with_name("tampered.zip")
        with zipfile.ZipFile(s) as zi, zipfile.ZipFile(t, "w") as zo:
            for n in zi.namelist(): zo.writestr(n, b"{}" if n == "data/index.json" else zi.read(n))
        ok, msg = safe_io.verify_snapshot(t); self.assertFalse(ok); self.assertIn("mismatch", msg)
        self.assertTrue(safe_io.verify_snapshot(s)[0])

    def test_zip_slip_path_refused(self):
        z = self.r / "evil.zip"
        with zipfile.ZipFile(z, "w") as zo: zo.writestr("../outside.txt", "x")
        self.assertFalse(safe_io.verify_snapshot(z)[0])
        with self.assertRaises(SystemExit): safe_io.restore(self.r, z)

    def test_lock_is_exclusive_and_released(self):
        with safe_io.lock(self.r):
            with self.assertRaises(SystemExit):
                with safe_io.lock(self.r): pass
        with safe_io.lock(self.r): pass
        self.assertFalse((self.r / ".maintain.lock").exists())

    def test_stale_lock_is_taken_over(self):
        p = self.r / ".maintain.lock"; p.write_text("999999 1")
        old = time.time() - 7200; os.utime(p, (old, old))
        with safe_io.lock(self.r): pass

    def test_secrets_never_in_backup(self):
        (self.r / "data/secrets_x.json").write_text("{}"); (self.r / "data/.env").write_text("K=1")
        with zipfile.ZipFile(safe_io.snapshot(self.r, "s")) as z:
            names = z.namelist()
        self.assertNotIn("data/.env", names); self.assertNotIn("data/secrets_x.json", names)
        self.assertTrue(safe_io.is_secret_name(".env.local") and safe_io.is_secret_name("a.pem") and not safe_io.is_secret_name("index.html"))

    def test_same_second_backups_do_not_overwrite(self):
        a = safe_io.snapshot(self.r, "same"); b = safe_io.snapshot(self.r, "same"); self.assertNotEqual(a, b); self.assertTrue(a.exists() and b.exists())

    def test_version_sort_is_numeric(self):
        names = ["mzansi_pathways_v100.zip", "mzansi_pathways_v9.zip", "mzansi_pathways_v62.zip"]
        self.assertEqual(sorted(names, key=safe_io.version_key)[-1], "mzansi_pathways_v100.zip")

    def test_atomic_write_normalises_newlines_and_leaves_no_temp(self):
        safe_io.atomic_write(self.r / "a.txt", "a\r\nb"); self.assertEqual((self.r / "a.txt").read_bytes(), b"a\nb")
        self.assertFalse(list(self.r.glob("*.tmp")))

    def test_file_backup_keeps_newest(self):
        f = self.r / "data/programmes/2027.json"
        for _ in range(4): safe_io.file_backup(self.r, f, keep=2)
        self.assertEqual(len(list((self.r / "backups/files").glob("2027.json.*.bak"))), 2)

    def test_copy_verified(self):
        d = self.r / "off/x.json"; safe_io.copy_verified(self.r / "data/index.json", d); self.assertEqual(d.read_bytes(), (self.r / "data/index.json").read_bytes())

    def test_data_snapshot_roundtrip_and_corruption(self):
        d = brd.snapshot_data(self.r); self.assertTrue(brd.verify_data_snapshot(d)[0])
        (self.r / "data/index.json").write_text('{"files": []}')
        brd.restore_data(self.r, d)
        self.assertEqual(json.loads((self.r / "data/index.json").read_text())["files"], ["programmes/2027.json"])
        (d / "index.json").write_text("{}")
        self.assertFalse(brd.verify_data_snapshot(d)[0])
        with self.assertRaises(SystemExit): brd.restore_data(self.r, d)

    def test_data_snapshot_refuses_damaged_json(self):
        (self.r / "data/index.json").write_text("{oops")
        with self.assertRaises(ValueError): brd.snapshot_data(self.r)

if __name__ == "__main__": unittest.main()
