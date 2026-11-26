import shutil, subprocess, sys, tempfile, unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))
import github_publish as gp

HAS_GIT = shutil.which("git") is not None
FAKE_TOKEN = "ghp_" + "a1B2c3D4e5F6g7H8i9J0k1L2m3N4o5P6q7R8"   # built at runtime so this file holds no real-looking secret

class Pure(unittest.TestCase):
    def test_secret_file_names_are_refused(self):
        for n in (".env", ".env.local", "x/id_rsa", "backup.mzansi", "a.pem", "b.key", "secrets_prod.json", "old.bak"):
            self.assertTrue(gp.secret_name(n), n)
        for n in ("index.html", "data/reviewers.json", "scripts/doctor.py", "environment.md"):
            self.assertFalse(gp.secret_name(n), n)
    def test_scan_text_finds_real_looking_secrets_only(self):
        self.assertTrue(gp.scan_text("a", "token = " + FAKE_TOKEN))
        self.assertTrue(gp.scan_text("a", "-----BEGIN " + "RSA PRIVATE KEY-----"))
        self.assertTrue(gp.scan_text("a", "AKIA" + "ABCDEFGHIJKLMNOP"))
        self.assertTrue(gp.scan_text("a", "MZ_SECRET_ALICE=" + "Zm9vYmFyYmF6cXV4MTIzNDU2"))
        self.assertEqual(gp.scan_text("a", "Set MZ_SECRET_<ID> in the environment. Use a token from GitHub. ghp_ is the prefix."), [])
    def test_scan_files_checks_size_and_names(self):
        d = Path(tempfile.mkdtemp())
        try:
            (d / "ok.txt").write_text("hello"); (d / "bad.txt").write_text(FAKE_TOKEN); (d / ".env").write_text("A=1")
            probs = gp.scan_files(["ok.txt", "bad.txt", ".env", "missing.txt"], d)
            self.assertEqual(len(probs), 2)
            old = gp.MAX_FILE_BYTES; gp.MAX_FILE_BYTES = 3
            try: self.assertTrue(any("too big" in p for p in gp.scan_files(["ok.txt"], d)))
            finally: gp.MAX_FILE_BYTES = old
        finally: shutil.rmtree(d, ignore_errors=True)
    def test_remote_must_be_plain_https_github_without_credentials(self):
        self.assertEqual(gp.normalise_remote("https://github.com/me/mzansi-pathways"), "https://github.com/me/mzansi-pathways.git")
        self.assertEqual(gp.normalise_remote(" https://github.com/me/mzansi-pathways.git/ "), "https://github.com/me/mzansi-pathways.git")
        for bad in ("", "git@github.com:me/x.git", "http://github.com/me/x", "https://me:tok@github.com/me/x.git", "https://evil.com/me/x", "https://github.com/me"):
            with self.assertRaises(ValueError): gp.normalise_remote(bad)
    def test_pages_url(self):
        self.assertEqual(gp.pages_url("https://github.com/PMech1987/mzansi-pathways.git"), "https://pmech1987.github.io/mzansi-pathways/")
    def test_publisher_never_force_pushes(self):
        src = (Path(gp.__file__)).read_text(encoding="utf-8")
        self.assertNotIn('"--force"', src); self.assertNotIn('"-f"', src.replace('"tag", "-f"', ""))
        self.assertNotIn("--force-with-lease", src)

@unittest.skipUnless(HAS_GIT, "git not installed")
class WithGit(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp()); self.real = gp.ROOT
        self.remote = self.tmp / "remote.git"; subprocess.run(["git", "init", "-q", "--bare", "-b", "main", str(self.remote)], check=True)
        self.work = self.tmp / "work"; self.work.mkdir(); gp.ROOT = self.work
        for a in (("init", "-q", "-b", "main"), ("config", "user.name", "T"), ("config", "user.email", "t@e.st"), ("remote", "add", "origin", str(self.remote))):
            subprocess.run(["git", *a], cwd=self.work, check=True)
    def tearDown(self):
        gp.ROOT = self.real; shutil.rmtree(self.tmp, ignore_errors=True)
    def test_preflight_and_file_listing(self):
        self.assertEqual(gp.preflight(), [])
        (self.work / "a.txt").write_text("x"); (self.work / ".gitignore").write_text("skip.txt\n"); (self.work / "skip.txt").write_text("y")
        self.assertEqual(gp.files_to_publish(), [".gitignore", "a.txt"])
    def test_preflight_reports_half_finished_operation(self):
        (self.work / ".git" / "MERGE_HEAD").write_text("x")
        self.assertTrue(any("half finished" in e for e in gp.preflight()))
    def test_bundle_is_verified_restorable_and_pruned(self):
        (self.work / "a.txt").write_text("x"); subprocess.run(["git", "add", "-A"], cwd=self.work, check=True); subprocess.run(["git", "commit", "-qm", "c"], cwd=self.work, check=True)
        b = gp.make_bundle("t"); self.assertTrue(b.exists()); self.assertTrue(b.with_suffix(".bundle.sha256").exists())
        out = self.tmp / "restored"; subprocess.run(["git", "clone", "-q", str(b), str(out)], check=True); self.assertTrue((out / "a.txt").exists())
        self.assertTrue(gp.offsite_bundle(b, self.tmp / "off")); self.assertTrue((self.tmp / "off" / b.name).exists())
    def test_dry_run_changes_nothing_and_secret_blocks_publish(self):
        (self.work / "leak.txt").write_text(FAKE_TOKEN)
        import io, contextlib
        buf = io.StringIO()
        with contextlib.redirect_stdout(buf): rc = gp.cmd_publish(["--dry-run"])
        self.assertEqual(rc, 1); self.assertIn("GitHub token", buf.getvalue()); self.assertNotIn("Verification gates", buf.getvalue())  # stopped at the scan
        self.assertEqual(subprocess.run(["git", "rev-parse", "HEAD"], cwd=self.work, capture_output=True).returncode, 128)  # still no commit

if __name__ == "__main__": unittest.main()
