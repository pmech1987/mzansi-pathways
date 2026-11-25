import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))
import match_engine as me


class PathwaysV2EngineTests(unittest.TestCase):
    def setUp(self):
        self.subs = [
            {"name": "English Home Language", "mark": 64, "isHomeLanguage": True},
            {"name": "isiZulu First Additional Language", "mark": 70},
            {"name": "Mathematics", "mark": 48},
            {"name": "Physical Sciences", "mark": 51},
            {"name": "Information Technology", "mark": 68},
            {"name": "Geography", "mark": 59},
            {"name": "Life Orientation", "mark": 80, "isLifeOrientation": True},
        ]
        self.progs = [
            {"id": "bsc", "name": "BSc Computer Science", "route": "University", "careerFamily": "tech", "verifiedRules": True, "minPassLevel": "Bachelor's Pass", "minAps": 28, "subjectRequirements": [{"anyOf": ["Mathematics"], "minMark": 58}]},
            {"id": "dip", "name": "Diploma in ICT", "route": "University", "careerFamily": "tech", "verifiedRules": True, "minPassLevel": "Diploma Pass", "minAps": 24, "subjectRequirements": [{"anyOf": ["Mathematics", "Mathematical Literacy"], "minMark": 45}]},
            {"id": "tvet", "name": "TVET IT Programme", "route": "Public TVET College", "careerFamily": "tech", "verifiedRules": True, "minPassLevel": "Higher Certificate Pass", "minAps": 16, "subjectRequirements": []},
        ]

    def test_bottleneck_analyser_detects_maths_unlock(self):
        b = me.find_bottlenecks(self.subs, self.progs, delta=12)
        self.assertTrue(any(x["subject"] == "Mathematics" and x["unlockedCount"] >= 1 for x in b))

    def test_closest_alternatives_returns_accessible_routes(self):
        alts = me.find_closest_alternatives(self.subs, self.progs[0], self.progs)
        ids = [a["id"] for a in alts]
        self.assertIn("dip", ids)
        self.assertIn("tvet", ids)
        self.assertNotIn("bsc", ids)

    def test_unverified_programme_returns_needs_verification(self):
        ev = me.evaluate_programme(self.subs, {"verifiedRules": False})
        self.assertEqual(ev["status"], "Needs Verification")



    def test_tier5_user_report_cannot_override_tier2_prospectus(self):
        import data_health_audit as dha
        existing = {"id": "up_bsc_cs", "sourceTier": 2, "minMaths": 60, "minAps": 30}
        user_rep = {"id": "up_bsc_cs", "sourceTier": 5, "minMaths": 50, "minAps": 30}
        res = dha.detect_rule_conflicts(existing, user_rep)
        self.assertTrue(res["hasConflict"])
        self.assertEqual(res["action"], "hold_for_admin_review")

    def test_data_health_audit_passes_on_2027_fixture(self):
        import data_health_audit as dha
        root = Path(__file__).resolve().parent.parent
        res = dha.audit_data_health(root / "data" / "programmes_2027.json")
        self.assertTrue(res["passed"])
        self.assertEqual(res["totalProgrammes"], 3)



    def test_prospectus_staging_flags_changed_requirement_as_conflict(self):
        import tempfile, stage_prospectus_rules as spr
        root = Path(__file__).resolve().parent.parent
        with tempfile.TemporaryDirectory() as tmp:
            out = Path(tmp) / "pending_programme_reviews.json"
            incoming = [{"id": "up_bsc_cs", "sourceTier": 2, "minMaths": 65, "minAps": 32, "intakeYear": 2027}]
            rep = spr.stage_candidates(root / "data" / "programmes_2027.json", incoming, out)
            self.assertEqual(rep["conflictsDetected"], 1)
            self.assertEqual(rep["items"][0]["conflictCheck"]["action"], "version_and_review")


if __name__ == "__main__":
    unittest.main()
