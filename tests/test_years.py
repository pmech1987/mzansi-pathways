import json, shutil, subprocess, sys, tempfile, unittest
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
def run(*a, cwd=None):
    return subprocess.run([sys.executable, *map(str, a)], capture_output=True, text=True, cwd=cwd)
class Years(unittest.TestCase):
    def setUp(self):
        self.t = Path(tempfile.mkdtemp())
        shutil.copytree(ROOT / "data", self.t / "data"); (self.t / "scripts").mkdir()
        for n in ("new_year.py", "csv_to_programmes_json.py", "safe_io.py"): shutil.copy(ROOT / "scripts" / n, self.t / "scripts" / n)
        rec = {"id": "up_x", "institutionId": "up", "name": "BSc X", "route": "University", "intakeYear": 2027, "minAps": 30, "subjectRequirements": [],
               "verificationStatus": "verified", "lastVerifiedAt": "2026-11-01", "checks": [{"type": "official_domain", "ok": True}], "signoffs": [{"reviewer": "a"}, {"reviewer": "b"}], "seal": "x"}
        (self.t / "data/programmes/2027.json").write_text(json.dumps({"schemaVersion": 3, "intakeYear": 2027, "programmes": [rec]}))
    def tearDown(self): shutil.rmtree(self.t, ignore_errors=True)
    def test_new_empty_year(self):
        r = run(self.t / "scripts/new_year.py", "2031", "--root", self.t); self.assertEqual(r.returncode, 0, r.stderr)
        d = json.loads((self.t / "data/programmes/2031.json").read_text()); self.assertEqual((d["intakeYear"], d["programmes"]), (2031, []))
        self.assertIn("programmes/2031.json", json.loads((self.t / "data/index.json").read_text())["files"])
    def test_refuses_existing_and_bad_year(self):
        self.assertNotEqual(run(self.t / "scripts/new_year.py", "2027", "--root", self.t).returncode, 0)
        self.assertNotEqual(run(self.t / "scripts/new_year.py", "next", "--root", self.t).returncode, 0)
    def test_copy_forward_never_keeps_trust(self):
        r = run(self.t / "scripts/new_year.py", "2035", "--copy-from", "2027", "--root", self.t); self.assertEqual(r.returncode, 0, r.stderr)
        p = json.loads((self.t / "data/programmes/2035.json").read_text())["programmes"][0]
        self.assertEqual((p["intakeYear"], p["verificationStatus"], p["checks"], p["signoffs"], p["carriedFrom"]), (2035, "pending_review", [], [], 2027))
        self.assertNotIn("seal", p); self.assertNotIn("lastVerifiedAt", p)
        src = json.loads((self.t / "data/programmes/2027.json").read_text())["programmes"][0]; self.assertEqual(src["verificationStatus"], "verified")
    def test_csv_import_merges_and_protects_verified(self):
        hdr = "id,institutionId,campus,province,route,name,nqf,duration,minPassLevel,minAps,subjectRequirements,requiresSelection,closes,feesNote,funding,careerFamily,officialUrl,sourceDoc,sourcePage,intakeYear,lastVerifiedAt,verificationStatus\n"
        new = "ump_y,ump,Mbombela,Mpumalanga,University,BSc Y,7,3 Years,Bachelor's Pass,28,,no,,,NSFAS,tech,https://www.ump.ac.za/,UMP 2027 prospectus,p1,2027,2026-11-26,pending_review\n"
        (self.t / "a.csv").write_text(hdr + new)
        self.assertEqual(run(self.t / "scripts/csv_to_programmes_json.py", self.t / "a.csv", cwd=self.t).returncode, 0)
        ids = [p["id"] for p in json.loads((self.t / "data/programmes/2027.json").read_text())["programmes"]]
        self.assertEqual(sorted(ids), ["ump_y", "up_x"])  # existing record kept, new one added
        clash = hdr + new.replace("ump_y,ump,Mbombela,Mpumalanga,University,BSc Y", "up_x,up,Hatfield,Gauteng,University,BSc X").replace(",28,", ",25,")
        (self.t / "b.csv").write_text(clash)
        self.assertNotEqual(run(self.t / "scripts/csv_to_programmes_json.py", self.t / "b.csv", cwd=self.t).returncode, 0)
        self.assertEqual(json.loads((self.t / "data/programmes/2027.json").read_text())["programmes"][0]["verificationStatus"], "verified")
if __name__ == "__main__": unittest.main()
