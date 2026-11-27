#!/usr/bin/env python3
"""v98 Regression Suite: 404 & Creator Studio Overhaul, Quick-Jump Palette, Fetch-Jobs POPIA/Shortener/9-Province Shield & SW v98."""
import os, sys, unittest

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
sys.path.insert(0, os.path.join(ROOT, 'scripts'))
import fetch_jobs as FJ


def read(rel):
    with open(os.path.join(ROOT, rel), 'r', encoding='utf-8') as f:
        return f.read()


class TestV98HardeningAndUx(unittest.TestCase):
    def test_404_branded_and_accessible(self):
        html = read('404.html')
        self.assertIn('./favicon.svg', html)
        self.assertIn('./css/civic_mobile_a11y.css', html)
        self.assertIn('./index.html#study', html)

    def test_creator_studio_v98_a11y_and_dark_mode(self):
        html = read('creator_studio.html')
        css = read('css/creator_studio.css')
        self.assertIn('lang="en-ZA"', html)
        self.assertIn('./favicon.svg', html)
        self.assertIn('Creator Studio (v98)', html)
        self.assertIn('role="tabpanel"', html)
        self.assertIn('prefers-color-scheme: dark', css)

    def test_quick_palette_strict_csp_and_helplines(self):
        js = read('js/comfort_and_jump.js')
        html = read('index.html')
        self.assertIn('./js/comfort_and_jump.js', html)
        self.assertNotIn('innerHTML', js)
        for token in ('081 308 4196', '0800 067 327', '0800 36 36 36', '0800 72 72 72', 'v98-palette-modal', 'mzQuickPalette'):
            self.assertIn(token, js)

    def test_fetch_jobs_blocks_shorteners_and_scrubs_pii(self):
        board = {'employer': 'TestCo', 'defaultProvince': 'Gauteng'}
        kws = ['south africa', 'kimberley', 'rustenburg']
        # Shortener blocked
        bad = FJ.to_row({'title': 'Junior Dev', 'location': 'Kimberley, South Africa', 'url': 'https://bit.ly/fakejob'}, board, 'greenhouse', kws)
        self.assertIsNone(bad)
        # WhatsApp redirect blocked
        wa = FJ.to_row({'title': 'Clerk', 'location': 'Rustenburg, South Africa', 'url': 'https://wa.me/27821234567'}, board, 'greenhouse', kws)
        self.assertIsNone(wa)
        # POPIA PII scrubbed + Northern Cape mapped
        ok = FJ.to_row({
            'title': 'Technician ID 9901015009087 contact hr@example.com or 0821234567',
            'location': 'Kimberley, South Africa',
            'url': 'https://boards.greenhouse.io/testco/jobs/123',
        }, board, 'greenhouse', kws)
        self.assertIsNotNone(ok)
        self.assertEqual(ok['province'], 'Northern Cape')
        self.assertNotIn('9901015009087', ok['title'])
        self.assertNotIn('hr@example.com', ok['title'])
        self.assertNotIn('0821234567', ok['title'])
        # North West mapped
        nw = FJ.to_row({'title': 'Intern', 'location': 'Rustenburg, South Africa', 'url': 'https://boards.greenhouse.io/testco/jobs/124'}, board, 'greenhouse', kws)
        self.assertEqual(nw['province'], 'North West')
        # Deduplication
        deduped = FJ.deduplicate_jobs([ok, dict(ok), nw])
        self.assertEqual(len(deduped), 2)

    def test_sw_v98_includes_quick_palette(self):
        sw = read('sw.js')
        self.assertRegex(sw, r"const CACHE = 'mzansi-pathways-v(9[8-9]|1[0-9]{2})'")
        self.assertIn('./js/comfort_and_jump.js', sw)


if __name__ == '__main__':
    unittest.main()
