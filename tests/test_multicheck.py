import copy, sys, unittest
from datetime import date, timedelta
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))
import mz_verify as m
S1, S2 = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ", "MFRGGZDFMZTWQ2LKNNWG23TPOBYXE43U"
ENV = {"MZ_SECRET_R1": S1, "MZ_SECRET_R2": S2}
def good():
    r = {"id": "x", "institutionId": "up", "name": "BSc Test", "route": "University", "nqf": 7, "minPassLevel": "Bachelor's Pass", "minAps": 30,
         "subjectRequirements": [], "requiresSelection": True, "closes": None, "intakeYear": 2027, "officialUrl": "https://www.up.ac.za/",
         "lastVerifiedAt": date.today().isoformat(), "enteredBy": "r3", "signoffs": []}
    ck = lambda t, u, h=None: {"type": t, "ok": True, "url": u, "sha256": h, "by": "r1"}
    r["checks"] = [ck("official_domain", "https://www.up.ac.za/a"), ck("document_hash", "https://www.up.ac.za/p.pdf", "aa"), ck("second_source", "https://www.up.ac.za/admissions", "bb"),
                   ck("institution_confirmation", "https://www.up.ac.za/"), ck("year_match", "https://www.up.ac.za/p.pdf", "aa")]
    h = m.record_hash(r)
    for who, sec in (("r1", S1), ("r2", S2)): r["signoffs"].append({"reviewer": who, "at": "t", "recordHash": h, "sig": m.seal(sec, h, who, "t")})
    return r
class T(unittest.TestCase):
    def test_rfc6238(self): self.assertEqual(m.totp(S1, t=59), "287082")
    def test_pass(self): self.assertEqual(m.evaluate(good(), env=ENV, strict_sigs=True), (True, []))
    def test_tamper(self):
        r = good(); r["minAps"] = 20; self.assertFalse(m.evaluate(r, env=ENV)[0])
    def test_forged_seal(self):
        r = good(); r["signoffs"][0]["sig"] = "0" * 64; self.assertFalse(m.evaluate(r, env=ENV)[0])
    def test_one_reviewer(self):
        r = good(); r["signoffs"].pop(); self.assertFalse(m.evaluate(r, env=ENV)[0])
    def test_author_cannot_verify(self):
        r = good(); r["enteredBy"] = "r1"; self.assertFalse(m.evaluate(r, env=ENV)[0])
    def test_missing_check(self):
        r = good(); r["checks"].pop(); self.assertFalse(m.evaluate(r, env=ENV)[0])
    def test_same_file_twice(self):
        r = good(); r["checks"][2]["sha256"] = "aa"; self.assertFalse(m.evaluate(r, env=ENV)[0])
    def test_wrong_domain(self):
        r = good(); r["checks"][0]["url"] = "https://up.ac.za.evil.com/"; self.assertFalse(m.evaluate(r, env=ENV)[0])
    def test_stale(self):
        r = good(); r["lastVerifiedAt"] = (date.today() - timedelta(days=200)).isoformat(); self.assertFalse(m.evaluate(r, env=ENV)[0])
    def test_failed_check_does_not_count(self):
        r = good(); r["checks"][1]["ok"] = False; self.assertFalse(m.evaluate(r, env=ENV)[0])
if __name__ == "__main__": unittest.main()
