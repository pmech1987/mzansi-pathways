#!/usr/bin/env python3
"""Unit tests for v93 autonomous ops, change watcher, and extended SA pathways."""
import json, sys, tempfile, unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
import autonomous_ops as aops
import prospectus_change_watcher as pcw


class TestV93Ops(unittest.TestCase):
    def test_archive_expired_records_sast(self):
        with tempfile.TemporaryDirectory() as tmp:
            fp = Path(tmp) / "live.json"
            ap = Path(tmp) / "archive.json"
            fp.write_text(json.dumps({"items": [
                {"id": "old1", "closes": "2026-10-31"},
                {"id": "open1", "closes": "2027-01-31"},
            ]}), encoding="utf-8")
            res = aops.archive_expired_records(fp, ap, today_sast="2026-11-26")
            self.assertEqual(res["active"], 1)
            self.assertEqual(res["archivedNow"], 1)
            self.assertTrue(ap.exists())

    def test_sri_manifest_has_sha384(self):
        mf = aops.build_sri_manifest(ROOT)
        self.assertGreater(mf["assetCount"], 10)
        sample_sri = next(iter(mf["assets"].values()))["sri"]
        self.assertTrue(sample_sri.startswith("sha384-"))

    def test_change_watcher_detects_etag_change(self):
        entry = {"id": "ump", "name": "UMP", "url": "https://www.ump.ac.za/prospectus.pdf"}
        prev = {"etag": '"v1"', "lastModified": "Mon, 01 Jan 2026 00:00:00 GMT", "contentLength": "1000"}
        same = pcw.diff_header_snapshot(entry, prev, {"ETag": '"v1"', "Last-Modified": "Mon, 01 Jan 2026 00:00:00 GMT", "Content-Length": "1000"})
        changed = pcw.diff_header_snapshot(entry, prev, {"ETag": '"v2"', "Last-Modified": "Thu, 26 Nov 2026 00:00:00 GMT", "Content-Length": "1200"})
        self.assertFalse(same["changed"])
        self.assertTrue(changed["changed"])

    def test_extended_pathways_json_complete(self):
        d = json.loads((ROOT / "data" / "sa_extended_pathways.json").read_text(encoding="utf-8"))
        self.assertEqual(d["policyUpdates2026"]["casReplacesCach"]["whatsapp"], "081 308 4196")
        self.assertEqual(len(d["publicNursingColleges"]["colleges"]), 10)
        self.assertEqual(len(d["publicAgriculturalColleges"]["colleges"]), 11)
        self.assertEqual(len(d["uniformedServices"]), 2)


if __name__ == "__main__":
    unittest.main()
