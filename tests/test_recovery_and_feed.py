import json, shutil, sys, tempfile, unittest
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
import mz_verify as m
import fetch_legal_public_jobs as feed

class Recovery(unittest.TestCase):
    def test_codes_are_unique_formatted_and_hashed(self):
        codes, rec = m.new_recovery_codes()
        self.assertEqual(len(codes), 8); self.assertEqual(len(set(codes)), 8)
        self.assertRegex(codes[0], r"^[A-Z2-9]{4}(-[A-Z2-9]{4}){3}$")
        self.assertNotIn(codes[0].replace("-", ""), json.dumps(rec))  # plaintext never stored in the public file

    def test_code_works_once_only(self):
        codes, rec = m.new_recovery_codes(); rev = {"recovery": rec}
        self.assertTrue(m.use_recovery_code(rev, codes[0]))
        self.assertFalse(m.use_recovery_code(rev, codes[0]), "a used code must never work again")
        self.assertTrue(m.use_recovery_code(rev, codes[1].lower().replace("-", " ")), "case and separators are forgiven")
        self.assertEqual(m.recovery_left(rev), 6)

    def test_wrong_and_empty_codes_rejected(self):
        codes, rec = m.new_recovery_codes(); rev = {"recovery": rec}
        for bad in ("", "AAAA-AAAA-AAAA-AAAA", "123456"): self.assertFalse(m.use_recovery_code(rev, bad))
        self.assertFalse(m.use_recovery_code({}, codes[0]))
        self.assertEqual(m.recovery_left(rev), 8)

    def test_peek_does_not_burn(self):
        codes, rec = m.new_recovery_codes(); rev = {"recovery": rec}
        self.assertTrue(m.use_recovery_code(rev, codes[0], consume=False)); self.assertEqual(m.recovery_left(rev), 8)

    def test_code_from_other_reviewer_rejected(self):
        a, ra = m.new_recovery_codes(); _, rb = m.new_recovery_codes()
        self.assertFalse(m.use_recovery_code({"recovery": rb}, a[0]))

class Feed(unittest.TestCase):
    def _root(self, prev_jobs):
        r = Path(tempfile.mkdtemp()); (r / "data").mkdir(); shutil.copy(ROOT / "data/open_jobs_live.json", r / "data/")
        d = json.loads((r / "data/open_jobs_live.json").read_text()); d["jobs"] += prev_jobs; (r / "data/open_jobs_live.json").write_text(json.dumps(d)); return r
    def setUp(self):
        self.o = (feed.fetch_greenhouse_boards, feed.fetch_lever_boards, feed.fetch_adzuna_sa_jobs)
        feed.fetch_greenhouse_boards = lambda root: []; feed.fetch_lever_boards = lambda root: []; feed.fetch_adzuna_sa_jobs = lambda: []
    def tearDown(self): feed.fetch_greenhouse_boards, feed.fetch_lever_boards, feed.fetch_adzuna_sa_jobs = self.o
    JOB = {"title": "Role", "employer": "Acme", "officialUrl": "https://boards.greenhouse.io/acme/1", "sourceType": "public_ats_api", "closingDate": "Open / Rolling"}
    def test_outage_keeps_previous_live_jobs(self):
        p = feed.refresh_open_jobs(self._root([self.JOB])); self.assertEqual(p["fetchStatus"], "network_unavailable_kept_previous"); self.assertIn("Role", [j["title"] for j in p["jobs"]])
    def test_expired_kept_job_still_dropped(self):
        old = dict(self.JOB, closingDate="2020-01-01"); p = feed.refresh_open_jobs(self._root([old])); self.assertNotIn("Role", [j["title"] for j in p["jobs"]])
    def test_broken_source_does_not_stop_refresh(self):
        def boom(): raise RuntimeError("api down")
        feed.fetch_adzuna_sa_jobs = boom; feed.fetch_greenhouse_boards = lambda root: [dict(self.JOB, title="Live")]
        p = feed.refresh_open_jobs(self._root([])); self.assertEqual(p["fetchStatus"], "ok"); self.assertIn("Live", [j["title"] for j in p["jobs"]])
    def test_offline_mode_is_not_an_outage(self):
        self.assertEqual(feed.refresh_open_jobs(self._root([]), offline=True)["fetchStatus"], "ok")
if __name__ == "__main__": unittest.main()
