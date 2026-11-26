import contextlib, io, json, os, shutil, subprocess, sys, tempfile, time, unittest, zipfile
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))
import github_publish as gp, safe_io, scheduled_backup as sb, restore_drill as rd

HAS_GIT = shutil.which("git") is not None
def git(cwd, *a): return subprocess.run(["git", *a], cwd=cwd, capture_output=True, text=True)

class LineEndings(unittest.TestCase):
    def setUp(self): self.d = Path(tempfile.mkdtemp())
    def tearDown(self): shutil.rmtree(self.d, ignore_errors=True)
    def test_crlf_is_fixed_but_binary_bat_and_skipped_dirs_are_not(self):
        (self.d / "a.py").write_bytes(b"x = 1\r\ny = 2\r\n")
        (self.d / "run.bat").write_bytes(b"@echo off\r\n")                 # cmd.exe wants CRLF
        (self.d / "pic.png").write_bytes(b"\x89PNG\r\n\x1a\n\x00\r\n")      # binary
        (self.d / "blob.json").write_bytes(b"\x00\r\n")                      # NUL byte means binary, left alone
        (self.d / "backups").mkdir(); (self.d / "backups" / "old.py").write_bytes(b"a\r\n")
        self.assertEqual(safe_io.normalise_eol(self.d, dry_run=True), ["a.py"])
        self.assertEqual((self.d / "a.py").read_bytes(), b"x = 1\r\ny = 2\r\n")   # dry run changes nothing
        self.assertEqual(safe_io.normalise_eol(self.d), ["a.py"])
        self.assertEqual((self.d / "a.py").read_bytes(), b"x = 1\ny = 2\n")
        self.assertEqual((self.d / "run.bat").read_bytes(), b"@echo off\r\n")
        self.assertEqual((self.d / "backups" / "old.py").read_bytes(), b"a\r\n")
        self.assertEqual(safe_io.normalise_eol(self.d), [])                      # idempotent
    def test_repo_has_gitattributes_forcing_lf(self):
        t = (Path(__file__).resolve().parent.parent / ".gitattributes").read_text(encoding="utf-8")
        self.assertIn("* text=auto eol=lf", t); self.assertIn("*.bat text eol=crlf", t)
    def test_shipped_text_files_are_lf(self):
        root = Path(__file__).resolve().parent.parent
        self.assertEqual(safe_io.normalise_eol(root, dry_run=True), [], "CRLF files would break the SHA-256 seals")

class Schedule(unittest.TestCase):
    def test_schtasks_command_is_weekly_quoted_and_least_privilege(self):
        a = sb.schtasks_create_args(r"C:\Program Files\Python\pythonw.exe", r"C:\My Folder\scripts\scheduled_backup.py")
        self.assertEqual(a[:2], ["schtasks", "/Create"]); self.assertIn("WEEKLY", a); self.assertIn("LIMITED", a); self.assertIn("/F", a)
        tr = a[a.index("/TR") + 1]
        self.assertTrue(tr.startswith('"C:\\Program Files') and 'scheduled_backup.py"' in tr)   # spaces in paths stay quoted
    def test_backup_run_makes_verified_zip_and_status_file(self):
        d = Path(tempfile.mkdtemp()); real = (sb.ROOT, sb.STATUS, gp.ROOT)
        try:
            (d / "data").mkdir(); (d / "data" / "x.json").write_text('{"a":1}'); (d / "index.html").write_text("<p>hi</p>")
            sb.ROOT = gp.ROOT = d; sb.STATUS = d / "backups" / "last_scheduled_backup.json"
            env = os.environ.pop("MZ_OFFSITE_DIR", None)
            with contextlib.redirect_stdout(io.StringIO()): rc = sb.run_backup()
            self.assertEqual(rc, 0)
            st = json.loads(sb.STATUS.read_text()); self.assertTrue(st["ok"]); self.assertTrue(any("project backup zip" in s for s in st["steps"]))
            self.assertTrue(any("WARNING: MZ_OFFSITE_DIR" in s for s in st["steps"]))
            z = list((d / "backups").glob("*_scheduled.zip")); self.assertEqual(len(z), 1); self.assertTrue(safe_io.verify_snapshot(z[0])[0])
            if env: os.environ["MZ_OFFSITE_DIR"] = env
        finally:
            sb.ROOT, sb.STATUS, gp.ROOT = real; shutil.rmtree(d, ignore_errors=True)
    def test_backup_skips_politely_when_a_maintenance_run_is_open(self):
        d = Path(tempfile.mkdtemp()); real = (sb.ROOT, sb.STATUS, gp.ROOT)
        try:
            (d / "data").mkdir(); sb.ROOT = gp.ROOT = d; sb.STATUS = d / "backups" / "s.json"
            (d / ".maintain.lock").write_text(f"{os.getpid()} {int(time.time())}\n")
            with contextlib.redirect_stdout(io.StringIO()) as buf: rc = sb.run_backup()
            self.assertEqual(rc, 0); self.assertIn("SKIPPED", buf.getvalue())
        finally:
            sb.ROOT, sb.STATUS, gp.ROOT = real; shutil.rmtree(d, ignore_errors=True)

class RestoreDrill(unittest.TestCase):
    def test_sidecar_checksum_mismatch_is_caught(self):
        d = Path(tempfile.mkdtemp())
        try:
            z = d / "b.zip"; z.write_bytes(b"data"); (d / "b.zip.sha256").write_text(safe_io.sha256_file(z) + "  b.zip\n")
            self.assertEqual(rd.check_sidecar(z), "")
            z.write_bytes(b"tampered"); self.assertIn("checksum does not match", rd.check_sidecar(z))
        finally: shutil.rmtree(d, ignore_errors=True)
    def test_unsafe_zip_paths_and_damaged_zip_are_refused(self):
        d = Path(tempfile.mkdtemp())
        try:
            z = d / "evil.zip"
            with zipfile.ZipFile(z, "w") as f: f.writestr("../escape.txt", "x")
            ok, msg = rd.drill_zip(z, d); self.assertFalse(ok); self.assertIn("unsafe", msg)
            (d / "bad.zip").write_bytes(b"not a zip"); ok, msg = rd.drill_zip(d / "bad.zip", d); self.assertFalse(ok)
            (d / "ok.zip").write_bytes(b""); ok, _ = rd.drill_zip(d / "ok.zip", d); self.assertFalse(ok)
        finally: shutil.rmtree(d, ignore_errors=True)

@unittest.skipUnless(HAS_GIT, "git not installed")
class PublisherGuards(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp()); self.real = gp.ROOT
        self.remote = self.tmp / "remote.git"; subprocess.run(["git", "init", "-q", "--bare", "-b", "main", str(self.remote)], check=True)
        self.work = self.tmp / "work"; self.work.mkdir(); gp.ROOT = self.work
        for a in (("init", "-q", "-b", "main"), ("config", "user.name", "T"), ("config", "user.email", "t@e.st"), ("remote", "add", "origin", str(self.remote))):
            git(self.work, *a)
    def tearDown(self): gp.ROOT = self.real; shutil.rmtree(self.tmp, ignore_errors=True)
    def commit(self, name="a.txt", text="x"):
        (self.work / name).write_text(text); git(self.work, "add", "-A"); git(self.work, "commit", "-qm", "c " + name)
    def say(self, fn, *a):
        buf = io.StringIO()
        with contextlib.redirect_stdout(buf): rc = fn(*a)
        return rc, buf.getvalue()
    def test_wrong_branch_and_detached_head_are_refused(self):
        self.commit(); git(self.work, "checkout", "-q", "-b", "master")
        self.assertTrue(any("only built from 'main'" in e for e in gp.preflight()))
        git(self.work, "checkout", "-q", "--detach"); self.assertTrue(any("detached" in e for e in gp.preflight()))
        git(self.work, "checkout", "-q", "main"); self.assertEqual(gp.preflight(), [])
    def test_remote_head_and_verify_detect_what_github_holds(self):
        self.commit(); self.assertEqual(gp.remote_head()[1], "")                    # GitHub has nothing yet
        rc, out = self.say(gp.cmd_verify); self.assertEqual(rc, 1); self.assertIn("no copy of this branch", out)
        git(self.work, "push", "-q", "origin", "main")
        rc, out = self.say(gp.cmd_verify); self.assertEqual(rc, 0); self.assertIn("GitHub holds your latest commit", out)
        self.commit("b.txt"); rc, out = self.say(gp.cmd_verify); self.assertEqual(rc, 1); self.assertIn("Publish to send yours", out)
    def test_sync_explains_unrelated_history_when_readme_was_ticked(self):
        other = self.tmp / "other"; subprocess.run(["git", "clone", "-q", str(self.remote), str(other)], capture_output=True)
        for a in (("config", "user.name", "O"), ("config", "user.email", "o@e.st"), ("checkout", "-q", "-b", "main")): git(other, *a)
        (other / "README.md").write_text("# created on github.com"); git(other, "add", "-A"); git(other, "commit", "-qm", "Initial commit"); git(other, "push", "-q", "origin", "main")
        self.commit("mine.txt")
        rc, out = self.say(gp.cmd_sync)
        self.assertEqual(rc, 1); self.assertIn("unrelated", out); self.assertIn("NEW EMPTY repository", out)
        self.assertTrue((self.work / "mine.txt").exists())                              # nothing lost
        self.assertEqual(git(self.work, "diff", "HEAD", "--stat").stdout.strip(), "")
    def test_sync_fast_forwards_new_work_from_github_and_sets_upstream(self):
        self.commit(); git(self.work, "push", "-q", "origin", "main")
        other = self.tmp / "other"; subprocess.run(["git", "clone", "-q", str(self.remote), str(other)], capture_output=True)
        for a in (("config", "user.name", "O"), ("config", "user.email", "o@e.st")): git(other, *a)
        (other / "c.txt").write_text("from github.com"); git(other, "add", "-A"); git(other, "commit", "-qm", "web edit"); git(other, "push", "-q", "origin", "main")
        rc, out = self.say(gp.cmd_sync); self.assertEqual(rc, 0); self.assertTrue((self.work / "c.txt").exists())
    def test_old_safety_tags_are_pruned(self):
        self.commit()
        for i in range(35): git(self.work, "tag", f"pre-publish-20260101-0000{i:02d}")
        gp.prune_tags(30); left = git(self.work, "tag", "-l", "pre-publish-*").stdout.split()
        self.assertEqual(len(left), 30); self.assertIn("pre-publish-20260101-000034", left); self.assertNotIn("pre-publish-20260101-000000", left)
    def test_setup_turns_autocrlf_off(self):
        shutil.rmtree(self.work / ".git"); rc, _ = self.say(gp.cmd_setup, "https://github.com/me/mzansi-pathways.git")
        self.assertEqual(rc, 0); self.assertEqual(git(self.work, "config", "--local", "core.autocrlf").stdout.strip(), "false")
    def test_setup_aligns_codeowners_and_security_contact_to_your_account(self):
        (self.work / ".github").mkdir(); (self.work / ".github" / "CODEOWNERS").write_text("* @someoneelse\n")
        (self.work / "SECURITY.md").write_text("Report on `someoneelse/mzansi-pathways` please\n")
        self.assertEqual(sorted(gp.align_owner("Thandi-K", "mzansi-pathways")), [".github/CODEOWNERS", "SECURITY.md"])
        self.assertEqual((self.work / ".github" / "CODEOWNERS").read_text(), "* @Thandi-K\n")
        self.assertIn("`Thandi-K/mzansi-pathways`", (self.work / "SECURITY.md").read_text())
        self.assertEqual(gp.align_owner("Thandi-K", "mzansi-pathways"), [])          # nothing to do the second time
    def test_push_error_messages_are_plain_language(self):
        for text, want in (("remote: Repository not found.\nfatal: repository 'https://github.com/me/x.git/' not found", "does not exist"), ("remote: error: GH006: Protected branch update failed for refs/heads/main.\nremote: error: Required status check \"verify-release-gates\" is expected.\n ! [remote rejected] main -> main (protected branch hook declined)", "Require status checks"),
                           (" ! [rejected]        main -> main (fetch first)\nerror: failed to push some refs", "--sync"),
                           ("remote: error: GH013: Repository rule violations found\n ! [remote rejected] main -> main (push declined due to repository rule violations)", "secret scan"),
                           ("remote: error: GH001: Large files detected", "100 MB")):
            rc, out = self.say(gp.push_report, 1, text); self.assertEqual(rc, 1); self.assertIn(want, out, text)

if __name__ == "__main__": unittest.main()
