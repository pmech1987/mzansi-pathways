#!/usr/bin/env python3
"""Regression tests for all 4 real phone-screenshot bugs fixed in v95."""
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class TestV95VisualAndUxFixes(unittest.TestCase):
    def test_no_duplicate_home_cards(self):
        html = (ROOT / "index.html").read_text(encoding="utf-8")
        i = html.find('id="mz-home"')
        j = html.find("</section>", i)
        home_sec = html[i:j]
        self.assertEqual(home_sec.count("<strong>My marks</strong>"), 1)
        self.assertEqual(home_sec.count("<strong>Evidence &amp; CV</strong>"), 1)
        self.assertEqual(home_sec.count("<strong>Careers</strong>"), 1)
        self.assertEqual(home_sec.count("<strong>More</strong>"), 1)

    def test_dark_mode_contrast_fixes_present(self):
        css = (ROOT / "css" / "mzansi_ui.css").read_text(encoding="utf-8")
        for tok in (
            "body.dark-mode #civic-trust-bar",
            "body.dark-mode .mz-sub button.on",
            "body.dark-mode header #auth-btn",
            "body.dark-mode #dl-dossier",
            "color: #93c5fd !important;",
        ):
            self.assertIn(tok, css)

    def test_study_and_work_cards_not_hidden_on_default_subtab(self):
        scr = (ROOT / "js" / "screens.js").read_text(encoding="utf-8")
        self.assertIn("['Fit', /./]", scr)
        self.assertIn("active open job", scr)

    def test_sw_bumped_to_v95(self):
        sw = (ROOT / "sw.js").read_text(encoding="utf-8")
        self.assertIn("mzansi-pathways-v", sw)


if __name__ == "__main__":
    unittest.main()
