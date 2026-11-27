#!/usr/bin/env python3
"""Regression tests for v96 unique brand icon, Dark Mode badge/button contrast, open details tabs, and live multi-uni APS."""
import re, unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class TestV96IconAndDarkContrast(unittest.TestCase):
    def test_unique_brand_emblem_assets_exist(self):
        svg = ROOT / "favicon.svg"
        self.assertTrue(svg.exists(), "Missing custom favicon.svg")
        self.assertIn("Mzansi Pathways Emblem", svg.read_text(encoding="utf-8"))
        self.assertGreater((ROOT / "icon-192.png").stat().st_size, 2000)
        self.assertGreater((ROOT / "icon-512.png").stat().st_size, 8000)

    def test_dark_mode_tier_badges_and_career_btn_fixed(self):
        css = (ROOT / "css" / "mzansi_ui.css").read_text(encoding="utf-8")
        for tok in (
            "body.dark-mode .bg-emerald-100",
            "body.dark-mode .bg-teal-100",
            'body.dark-mode button[data-path-go="careers"]',
            "body.dark-mode button[data-hl].bg-slate-900",
        ):
            self.assertIn(tok, css)

    def test_multi_uni_aps_computes_directly_without_incomplete_bug(self):
        app = (ROOT / "js" / "app.js").read_text(encoding="utf-8") + "\n" + (ROOT / "js" / "modules" / "funding.js").read_text(encoding="utf-8") + "\n" + (ROOT / "js" / "modules" / "results.js").read_text(encoding="utf-8")
        self.assertIn("const nonLoLvls = clean.filter", app)
        self.assertIn('<details open class="mt-4 bg-white rounded-3xl', app)

    def test_sw_bumped_to_v96_with_favicon(self):
        sw = (ROOT / "sw.js").read_text(encoding="utf-8")
        self.assertRegex(sw, r"mzansi-pathways-v(9[6-9]|1[0-9]{2})")
        self.assertIn("./favicon.svg", sw)


if __name__ == "__main__":
    unittest.main()
