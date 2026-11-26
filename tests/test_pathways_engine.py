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
        self.assertEqual(res["totalProgrammes"], 5)



    def test_prospectus_staging_flags_changed_requirement_as_conflict(self):
        import tempfile, stage_prospectus_rules as spr
        root = Path(__file__).resolve().parent.parent
        with tempfile.TemporaryDirectory() as tmp:
            out = Path(tmp) / "pending_programme_reviews.json"
            incoming = [{"id": "up_bsc_cs", "sourceTier": 2, "minMaths": 65, "minAps": 32, "intakeYear": 2027}]
            rep = spr.stage_candidates(root / "data" / "programmes_2027.json", incoming, out)
            self.assertEqual(rep["conflictsDetected"], 1)
            self.assertEqual(rep["items"][0]["conflictCheck"]["action"], "version_and_review")



    def test_prospectus_snippet_fact_extractor(self):
        sample = "BSc IT requires minimum APS 28, Mathematics 60% and English HL 50%. Applications close 30 September 2027."
        out = me.extract_prospectus_snippet_facts(sample)
        self.assertEqual(out["apsFound"], 28)
        self.assertEqual(out["mathsPercentFound"], 60)
        self.assertEqual(out["englishPercentFound"], 50)
        self.assertEqual(out["closingDateHint"], "30 September 2027")
        self.assertTrue(out["reviewRequired"])



    def test_failsafe_nan_and_out_of_bounds_clamping(self):
        self.assertEqual(me.evaluate_nsc_pass([])["apsExclLO"], 0)
        self.assertEqual(me.mark_to_nsc_level(float("nan")), 1)
        self.assertEqual(me.mark_to_nsc_level(999), 7)
        bad = me.extract_prospectus_snippet_facts("APS 999 and Mathematics 145%")
        self.assertIsNone(bad["apsFound"])
        self.assertIsNone(bad["mathsPercentFound"])



    def test_low_home_language_blocks_bachelor_pass(self):
        subs = [
            {"name": "English Home Language", "mark": 35, "isHomeLanguage": True},
            {"name": "isiZulu FAL", "mark": 80},
            {"name": "Mathematics", "mark": 85},
            {"name": "Physical Sciences", "mark": 80},
            {"name": "IT", "mark": 90},
            {"name": "Geography", "mark": 75},
        ]
        res = me.evaluate_nsc_pass(subs)
        self.assertEqual(res["passLevel"], "Did Not Meet Minimum NSC Pass")

    def test_backup_snapshot_helper(self):
        import tempfile, backup_and_restore_data as brd
        root = Path(__file__).resolve().parent.parent
        with tempfile.TemporaryDirectory() as tmp:
            bak = Path(tmp) / "bak.json"
            out = brd.create_verified_snapshot(root / "data" / "programmes_2027.json", bak)
            self.assertEqual(out["count"], 5)
            self.assertTrue(bak.exists())



    def test_data_health_rejects_malformed_json_and_bad_tier(self):
        import tempfile, data_health_audit as dha
        with tempfile.TemporaryDirectory() as tmp:
            bad_json = Path(tmp) / "bad.json"
            bad_json.write_text("{not valid json", encoding="utf-8")
            r1 = dha.audit_data_health(bad_json)
            self.assertFalse(r1["passed"])

            bad_tier = Path(tmp) / "tier.json"
            bad_tier.write_text('{"programmes":[{"id":"x","sourceTier":9,"verificationStatus":"bogus"}]}', encoding="utf-8")
            r2 = dha.audit_data_health(bad_tier)
            self.assertFalse(r2["passed"])
            self.assertTrue(len(r2["errors"]) >= 2)



    def test_statement_parser_extracts_sa_subjects_and_flags_review(self):
        import statement_parser as sp
        raw = """
        English Home Language 64%
        isiZulu FAL 66%
        Maths 58%
        Physical Sciences 54%
        Life Orientation 74%
        """
        res = sp.parse_statement_text(raw)
        self.assertTrue(res["needsConfirmation"])
        names = {s["name"]: s for s in res["subjects"]}
        self.assertEqual(names["English Home Language"]["mark"], 64)
        self.assertTrue(names["English Home Language"]["isHomeLanguage"])
        self.assertEqual(names["Mathematics"]["mark"], 58)
        self.assertTrue(names["Life Orientation"]["isLifeOrientation"])

    def test_statement_parser_handles_empty_input_safely(self):
        import statement_parser as sp
        res = sp.parse_statement_text("")
        self.assertEqual(res["subjects"], [])
        self.assertTrue(len(res["warnings"]) >= 1)



    def test_statement_parser_symbol_and_level_fallback(self):
        import statement_parser as sp
        raw = "Mathematics Level 5\nAccounting B"
        res = sp.parse_statement_text(raw)
        names = {s["name"]: s for s in res["subjects"]}
        self.assertEqual(names["Mathematics"]["mark"], 65)
        self.assertEqual(names["Mathematics"]["confidence"], "review")
        self.assertEqual(names["Accounting"]["mark"], 75)
        self.assertEqual(names["Accounting"]["confidence"], "review")



    def test_audit_profile_integrity_flags_duplicates_and_missing_hl(self):
        subs = [
            {"name": "Mathematics", "mark": 60},
            {"name": "Mathematics", "mark": 65},
            {"name": "Life Orientation", "mark": 75, "isLifeOrientation": True},
        ]
        res = me.audit_profile_integrity(subs)
        self.assertFalse(res["valid"])
        self.assertTrue(any("Duplicate" in w for w in res["warnings"]))
        self.assertTrue(any("Home Language" in w for w in res["warnings"]))



    def test_csv_export_neutralizes_formula_injection(self):
        import tempfile, export_summary_csv as esc
        self.assertEqual(esc.csv_safe_cell("=SUM(A1:A2)"), "'=SUM(A1:A2)")
        self.assertEqual(esc.csv_safe_cell("+123"), "'+123")
        root = Path(__file__).resolve().parent.parent
        with tempfile.TemporaryDirectory() as tmp:
            out_csv = Path(tmp) / "out.csv"
            n = esc.export_programmes_csv(root / "data" / "programmes_2027.json", out_csv)
            self.assertEqual(n, 5)
            self.assertTrue(out_csv.exists())

    def test_repo_hygiene_passes(self):
        import validate_repo_hygiene as vrh
        root = Path(__file__).resolve().parent.parent
        res = vrh.check_repo_hygiene(root)
        self.assertTrue(res["passed"], f"Missing GitHub files: {res['missing']}")



    def test_link_and_domain_hygiene_passes(self):
        import check_links_and_domains as cld
        root = Path(__file__).resolve().parent.parent
        res = cld.audit_links(root)
        self.assertTrue(res["passed"], f"Link errors: {res['errors']}")
        self.assertGreaterEqual(res["scannedUrls"], 5)



    def test_programme_coverage_audit_passes(self):
        import audit_programme_coverage as apc
        root = Path(__file__).resolve().parent.parent
        res = apc.audit_coverage(root / "data" / "programmes_2027.json")
        self.assertTrue(res["passed"], f"Coverage errors: {res['errors']}")
        self.assertGreaterEqual(res["count"], 5)



    def test_cv_importer_extracts_contact_skills_and_experience(self):
        import cv_importer as cvi
        raw = "Thabo Mokoena\n+27 82 555 0194 | thabo@example.co.za\nSkills: Excel, Windows, Networking\n- Installed and configured office printers and Windows laptops for classmates."
        res = cvi.parse_previous_cv_text(raw)
        self.assertTrue(res["needsConfirmation"])
        self.assertEqual(res["name"], "Thabo Mokoena")
        self.assertEqual(res["email"], "thabo@example.co.za")
        self.assertIn("082 555 0194", res["phone"].replace("+27 ", "0"))
        self.assertIn("Windows", res["skills"])
        self.assertEqual(len(res["evidenceSnippets"]), 1)



    def test_cv_importer_extracts_sa_qualifications(self):
        import cv_importer as cvi
        raw = "National Senior Certificate (Matric) - 2025\nHigher Certificate in IT (NQF 5) - TUT"
        res = cvi.parse_previous_cv_text(raw)
        self.assertGreaterEqual(len(res["qualifications"]), 2)



    def test_legal_open_jobs_filter_keeps_open_and_rejects_expired_or_scraped(self):
        import ingest_free_open_jobs as ifoj
        res = ifoj.filter_legal_open_jobs([
            {"title": "Admin Clerk (Posted 8 days ago, still open)", "employer": "DPSA", "officialUrl": "https://www.gov.za/about-government/government-jobs", "closingDate": "2026-12-18"},
            {"title": "Expired Clerk", "employer": "Old", "officialUrl": "https://example.co.za/a", "closingDate": "2026-10-01"},
            {"title": "Scam Fee Post", "employer": "Fake", "officialUrl": "https://example.co.za/b", "description": "Pay R150 registration fee via eWallet", "closingDate": "2026-12-20"},
        ], today_iso="2026-11-26")
        self.assertEqual(res["openCount"], 1)
        self.assertEqual(len(res["rejected"]), 2)



    def test_sa_gov_portals_directory_valid(self):
        import verify_gov_portals as vgp
        root = Path(__file__).resolve().parent.parent
        res = vgp.verify_gov_portals(root / "data" / "sa_gov_portals.json")
        self.assertTrue(res["passed"], f"Gov portal errors: {res['errors']}")
        self.assertGreaterEqual(res["count"], 4)



    def test_z83_prep_sheet_excludes_sa_id_and_includes_parts(self):
        import generate_z83_prep_sheet as gz
        txt = gz.build_z83_prep_text({"name": "Sipho", "province": "Mpumalanga", "qualifications": ["NSC"]})
        self.assertIn("PART A", txt)
        self.assertIn("Never store your SA ID", txt)



    def test_cipc_format_validation(self):
        import verify_company_and_agency_registers as vcar
        ok = vcar.validate_cipc_format("2018/123456/07")
        bad = vcar.validate_cipc_format("12345")
        self.assertTrue(ok["validFormat"])
        self.assertIn("Private Company", ok["entityType"])
        self.assertFalse(bad["validFormat"])



    def test_all_repo_json_files_valid(self):
        import check_json_formatting as cjf
        root = Path(__file__).resolve().parent.parent
        res = cjf.lint_all_json(root)
        self.assertTrue(res["passed"], f"JSON lint errors: {res['errors']}")
        self.assertGreaterEqual(res["checkedFiles"], 5)



    def test_legal_compliance_audit_passes(self):
        import verify_legal_compliance as vlc
        root = Path(__file__).resolve().parent.parent
        res = vlc.audit_legal_compliance(root)
        self.assertTrue(res["passed"], f"Legal compliance errors: {res['errors']}")



    def test_attestation_seal_rejects_tampered_file(self):
        import json, shutil, tempfile, verify_attestation_seal as vas
        root = Path(__file__).resolve().parent.parent
        with tempfile.TemporaryDirectory() as tmp:
            troot = Path(tmp)
            (troot / "scripts" / "gates").mkdir(parents=True)
            sample_f = troot / "index.html"
            sample_f.write_text("<html>ok</html>", encoding="utf-8")
            import hashlib
            h1 = hashlib.sha256(sample_f.read_bytes()).hexdigest()
            (troot / "integrity_manifest.json").write_text(json.dumps({"schemaVersion": 1, "sha256": {"index.html": h1}}), encoding="utf-8")
            (troot / "gate_integrity_manifest.json").write_text(json.dumps({"schemaVersion": 1, "sha256": {}}), encoding="utf-8")
            im_h = hashlib.sha256((troot / "integrity_manifest.json").read_bytes()).hexdigest()
            gm_h = hashlib.sha256((troot / "gate_integrity_manifest.json").read_bytes()).hexdigest()
            seal = hashlib.sha256(f"1|1|True|{im_h}|{gm_h}".encode("utf-8")).hexdigest()
            (troot / "release_attestation.json").write_text(json.dumps({"all_passed": True, "gate_count": 1, "integrity_manifest_sha256": im_h, "gate_integrity_manifest_sha256": gm_h, "attestation_sha256": seal}), encoding="utf-8")
            self.assertTrue(vas.verify_seal(troot)["passed"])
            # Tamper 1 byte in index.html -> Stage 4 verifier MUST fail closed!
            sample_f.write_text("<html>tampered!</html>", encoding="utf-8")
            res = vas.verify_seal(troot)
            self.assertFalse(res["passed"])
            self.assertTrue(any("index.html" in e for e in res["errors"]))



    def test_stage1_authenticate_gate_blocks_eval_and_tamper(self):
        import hashlib, tempfile, verify_release as vr
        with tempfile.TemporaryDirectory() as tmp:
            gf = Path(tmp) / "99_verify_fake.py"
            gf.write_text("import json\neval('1+1')\nprint(json.dumps({'passed': True}))\n", encoding="utf-8")
            good_hash = hashlib.sha256(gf.read_bytes()).hexdigest()
            errs_eval = vr._authenticate_gate(gf, {gf.name: good_hash})
            self.assertTrue(any("Anti-Bypass" in e for e in errs_eval))
            errs_hash = vr._authenticate_gate(gf, {gf.name: "0" * 64})
            self.assertTrue(any("SHA-256 mismatch" in e for e in errs_hash))



    def test_v49_job_freshness_and_meta_whatsapp_blocking(self):
        import ingest_free_open_jobs as ifoj
        sample = [
            {"title": "Week-Old Open Role", "employer": "Civic Dept", "officialUrl": "https://www.gov.za/jobs/9", "postedDate": "2026-11-12", "closingDate": "2026-12-05"},
            {"title": "Meta Scraped", "employer": "FB Page", "officialUrl": "https://www.facebook.com/jobs/9", "closingDate": "2026-12-05"},
            {"title": "WhatsApp Scraped", "employer": "WA Group", "officialUrl": "https://chat.whatsapp.com/xyz", "closingDate": "2026-12-05"},
        ]
        res = ifoj.filter_legal_open_jobs(sample, today_iso="2026-11-26")
        self.assertEqual(res["openCount"], 1)
        self.assertTrue(res["accepted"][0]["stillOpenAfterWeek"])
        self.assertEqual(res["accepted"][0]["freshnessStatus"], "open")
        self.assertEqual(len(res["rejected"]), 2)



    def test_v50_job_deduplication(self):
        import ingest_free_open_jobs as ifoj
        sample = [
            {"title": "Field Clerk", "employer": "Mpumalanga Dept", "officialUrl": "https://www.gov.za/jobs/50", "closingDate": "2026-12-15"},
            {"title": "Field Clerk", "employer": "Mpumalanga Dept", "officialUrl": "https://www.gov.za/jobs/50/", "closingDate": "2026-12-15"},
        ]
        res = ifoj.filter_legal_open_jobs(sample, today_iso="2026-11-26")
        self.assertEqual(res["openCount"], 1)
        self.assertEqual(len(res["rejected"]), 1)



    def test_v51_source_type_breakdown(self):
        import ingest_free_open_jobs as ifoj
        sample = [
            {"title": "Clerk", "employer": "Dept", "sourceType": "dpsa_circular", "officialUrl": "https://www.gov.za/jobs/71", "closingDate": "2026-12-20"},
            {"title": "Tech", "employer": "Co", "sourceType": "public_ats_api", "officialUrl": "https://boards.greenhouse.io/co/jobs/72", "closingDate": "2026-12-20"},
        ]
        res = ifoj.filter_legal_open_jobs(sample, today_iso="2026-11-26")
        self.assertEqual(res["bySourceType"]["dpsa_circular"], 1)
        self.assertEqual(res["bySourceType"]["public_ats_api"], 1)



    def test_v52_workflow_fail_closed_pipeline(self):
        wf = (Path(__file__).resolve().parent.parent / ".github" / "workflows" / "deploy-pages.yml").read_text(encoding="utf-8")
        self.assertLess(wf.find("verify_release.py"), wf.find("verify_attestation_seal.py"))
        self.assertLess(wf.find("verify_attestation_seal.py"), wf.find("actions/deploy-pages@v4"))



    def test_v53_url_shortener_rejection(self):
        import ingest_free_open_jobs as ifoj
        sample = [
            {"title": "Shortened Redirect", "employer": "Mystery", "officialUrl": "https://tinyurl.com/abc", "closingDate": "2026-12-20"},
            {"title": "Official Role", "employer": "DPSA", "officialUrl": "https://www.gov.za/jobs/88", "closingDate": "2026-12-20"},
        ]
        res = ifoj.filter_legal_open_jobs(sample, today_iso="2026-11-26")
        self.assertEqual(res["openCount"], 1)
        self.assertEqual(len(res["rejected"]), 1)



    def test_v54_popia_pii_scrub_in_open_jobs(self):
        import ingest_free_open_jobs as ifoj
        sample = [
            {"title": "Clerk 083-111-2222 test@gmail.com", "employer": "Local Org", "officialUrl": "https://www.gov.za/jobs/99", "closingDate": "2026-12-20"},
        ]
        res = ifoj.filter_legal_open_jobs(sample, today_iso="2026-11-26")
        self.assertEqual(res["openCount"], 1)
        self.assertNotIn("083-111-2222", res["accepted"][0]["title"])
        self.assertNotIn("test@gmail.com", res["accepted"][0]["title"])



    def test_v55_deterministic_job_sorting_and_scheme_block(self):
        import ingest_free_open_jobs as ifoj
        sample = [
            {"title": "Rolling", "employer": "Org", "officialUrl": "https://www.gov.za/jobs/a", "closingDate": "Rolling"},
            {"title": "Soonest", "employer": "Org", "officialUrl": "https://www.gov.za/jobs/b", "closingDate": "2026-11-29"},
            {"title": "Unsafe", "employer": "Org", "officialUrl": "javascript:void(0)", "closingDate": "2026-12-20"},
        ]
        res = ifoj.filter_legal_open_jobs(sample, today_iso="2026-11-26")
        self.assertEqual([x["title"] for x in res["accepted"]], ["Soonest", "Rolling"])
        self.assertEqual(len(res["rejected"]), 1)



    def test_v56_cv_importer_matric_no_fabrication(self):
        import cv_importer as ci
        res = ci.parse_previous_cv_text("Lerato Nkosi\nGrade 12 NSC Matric 2026")
        self.assertEqual(res.get("email", ""), "")
        self.assertEqual(res.get("phone", ""), "")


if __name__ == "__main__":
    unittest.main()
