import json, sys, tempfile, unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))
import safe_io
class T(unittest.TestCase):
    def setUp(self):
        self.r = Path(tempfile.mkdtemp()); (self.r / "data").mkdir(); (self.r / "data/a.json").write_text('{"v":1}'); (self.r / "sw.js").write_text("x"); (self.r / "scripts").mkdir(); (self.r / "scripts/g.py").write_text("old")
    def test_atomic_rejects_bad_json_and_keeps_old_file(self):
        with self.assertRaises(ValueError): safe_io.atomic_write(self.r / "data/a.json", "{oops")
        self.assertEqual(json.loads((self.r / "data/a.json").read_text()), {"v": 1})
        self.assertFalse(list(self.r.glob("data/*.tmp")))
    def test_snapshot_and_restore(self):
        s = safe_io.snapshot(self.r, "t")
        safe_io.atomic_write(self.r / "data/a.json", '{"v":2}'); (self.r / "data/new.json").write_text("{}")
        (self.r / "scripts/g.py").write_text("edited"); safe_io.restore(self.r, s)
        self.assertEqual((self.r / "scripts/g.py").read_text(), "old")  # code is backed up too
        self.assertEqual(json.loads((self.r / "data/a.json").read_text()), {"v": 1}); self.assertFalse((self.r / "data/new.json").exists())
        self.assertTrue(any("before-restore" in b.name for b in safe_io.list_snapshots(self.r)))
    def test_prune_keeps_newest(self):
        import time
        for i in range(4): safe_io.snapshot(self.r, f"n{i}", keep=2); time.sleep(1.05)
        self.assertEqual(len(safe_io.list_snapshots(self.r)), 2)
    def test_lock_blocks_second_run(self):
        with safe_io.lock(self.r):
            with self.assertRaises(SystemExit): safe_io.with_lock = safe_io.lock(self.r).__enter__()
        with safe_io.lock(self.r): pass
    def test_bad_json_gives_clear_message(self):
        (self.r / "data/b.json").write_text("{")
        with self.assertRaises(SystemExit) as c: safe_io.read_json(self.r / "data/b.json")
        self.assertIn("not valid JSON", str(c.exception))
if __name__ == "__main__": unittest.main()
