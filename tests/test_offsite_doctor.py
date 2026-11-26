import sys, tempfile, unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))
import doctor, maintain, safe_io
class T(unittest.TestCase):
    def test_doctor_has_no_failures_on_this_project(self):
        self.assertFalse([m for l, m in doctor.checks() if l == "FAIL"])
    def test_offsite_copy_is_identical_rejects_unusable_folder_and_empty_source(self):
        real, root = maintain.ROOT, Path(tempfile.mkdtemp())
        try:
            maintain.ROOT = root; (root / "data").mkdir(); (root / "data/a.json").write_text("{}")
            self.assertEqual(maintain.offsite_copy(root / "off0"), 1)  # nothing to copy yet
            safe_io.snapshot(root, "t"); (root / "dist").mkdir(); (root / "dist/mzansi_pathways_v1.zip").write_bytes(b"zip")
            d = root / "off"; self.assertEqual(maintain.offsite_copy(d), 0)
            self.assertEqual({f.name for f in d.glob("*.zip")} >= {"mzansi_pathways_v1.zip"}, True)
            blocker = root / "file"; blocker.write_text("x")
            self.assertEqual(maintain.offsite_copy(blocker / "sub"), 1)
        finally: maintain.ROOT = real
if __name__ == "__main__": unittest.main()
