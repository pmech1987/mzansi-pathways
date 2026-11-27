#!/usr/bin/env python3
"""v103 Regression Suite: Expanded mz_common Blocked Domains, Expanded DBE NSC Subject Aliases, Cost Estimator & SW v103."""
import os, sys, unittest

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
sys.path.insert(0, os.path.join(ROOT, 'scripts'))
import mz_common as C
import csv_to_programmes_json as IMP


def read(rel):
    with open(os.path.join(ROOT, rel), 'r', encoding='utf-8') as f:
        return f.read()


class TestV103EstimatorAndCommon(unittest.TestCase):
    def test_mz_common_blocks_extended_shorteners_and_socials(self):
        for bad in (
            'https://wa.me/27821234567',
            'https://t.me/fakebursary',
            'https://cutt.ly/scam123',
            'https://shorturl.at/abcde',
            'https://www.tiktok.com/@fakejobs',
            'https://www.instagram.com/fakejobs',
        ):
            self.assertFalse(C.https_ok(bad), 'Expected blocked URL: ' + bad)
        self.assertTrue(C.https_ok('https://www.up.ac.za/yearbooks/2027'))

    def test_csv_importer_supports_technical_and_arts_nsc_subjects(self):
        rules = IMP.parse_subjects('Technical Mathematics>=50; Technical Sciences>=50; Electrical Technology>=60; Visual Arts>=50')
        self.assertEqual(len(rules), 4)
        self.assertEqual(rules[0]['anyOf'], ['Technical Mathematics'])
        self.assertEqual(rules[2]['anyOf'], ['Electrical Technology'])

    def test_v103_cost_estimator_strict_csp(self):
        js = read('js/toolkit.js')
        html = read('index.html')
        self.assertIn('./js/toolkit.js', html)
        self.assertNotIn('innerHTML', js)
        for token in ('mzCostEstimator', 'v103-cost-box', 'missing_middle', '0800 067 327'):
            self.assertIn(token, js)

    def test_sw_v103_includes_cost_estimator(self):
        sw = read('sw.js')
        self.assertRegex(sw, r"const CACHE = 'mzansi-pathways-v1[0-9]{2}'")
        self.assertIn('./js/toolkit.js', sw)


if __name__ == '__main__':
    unittest.main()
