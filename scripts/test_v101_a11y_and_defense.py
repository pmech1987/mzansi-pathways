#!/usr/bin/env python3
"""v101 Regression Suite: Persistent Accessibility Comfort Controls, Defense-in-Depth Job Refresh PII/Shortener Guard & SW v101."""
import os, sys, unittest

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
sys.path.insert(0, os.path.join(ROOT, 'scripts'))
import refresh_data as RD


def read(rel):
    with open(os.path.join(ROOT, rel), 'r', encoding='utf-8') as f:
        return f.read()


class TestV101A11yAndDefense(unittest.TestCase):
    def test_v101_a11y_comfort_strict_csp(self):
        js = read('js/comfort_and_jump.js')
        html = read('index.html')
        self.assertIn('./js/comfort_and_jump.js', html)
        self.assertNotIn('innerHTML', js)
        for token in ('data-mz-scale', 'data-mz-contrast', 'data-mz-spacing', 'v101-a11y-box', 'mzA11yComfort'):
            self.assertIn(token, js)

    def test_civic_css_v101_comfort_rules(self):
        css = read('css/civic_mobile_a11y.css')
        for token in ('html[data-mz-scale="115"]', 'html[data-mz-scale="130"]', 'html[data-mz-contrast="high"]', 'html[data-mz-spacing="wide"]'):
            self.assertIn(token, css)

    def test_refresh_data_defense_in_depth_job_sanitization(self):
        rd = read('scripts/refresh_data.py')
        self.assertIn('sanitize_job_row', rd)
        clean = RD.sanitize_job_row({
            'title': 'Clerk 9901015009087 call 0821234567',
            'town': 'eMalahleni',
            'officialUrl': 'https://www.dpsa.gov.za/vacancy',
        })
        self.assertIsNotNone(clean)
        self.assertNotIn('9901015009087', clean['title'])
        self.assertNotIn('0821234567', clean['title'])
        blocked = RD.sanitize_job_row({
            'title': 'Clerk',
            'town': 'eMalahleni',
            'officialUrl': 'https://bit.ly/scamlink',
        })
        self.assertIsNone(blocked)

    def test_sw_v101_includes_a11y_comfort(self):
        sw = read('sw.js')
        self.assertRegex(sw, r"const CACHE = 'mzansi-pathways-v1[0-9]{2}'")
        self.assertIn('./js/comfort_and_jump.js', sw)


if __name__ == '__main__':
    unittest.main()
