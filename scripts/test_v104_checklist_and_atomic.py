#!/usr/bin/env python3
"""v104 Regression Suite: SA Document Readiness Checklist, Atomic Catalogue Build, edu.za Domain Verification & SW v104."""
import os, sys, unittest

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
sys.path.insert(0, os.path.join(ROOT, 'scripts'))
import pipeline_verify as PV


def read(rel):
    with open(os.path.join(ROOT, rel), 'r', encoding='utf-8') as f:
        return f.read()


class TestV104ChecklistAndAtomic(unittest.TestCase):
    def test_v104_doc_checklist_strict_csp(self):
        js = read('js/checklist.js')
        html = read('index.html')
        self.assertIn('./js/checklist.js', html)
        self.assertNotIn('innerHTML', js)
        for token in ('mzDocChecklist', 'v104-doc-box', 'SAPS certification is free', 'Copy Missing Docs List'):
            self.assertIn(token, js)

    def test_build_catalogue_uses_atomic_replace(self):
        bc = read('scripts/build_catalogue.py')
        self.assertIn('os.replace(', bc)
        self.assertIn('tempfile.mkstemp', bc)

    def test_pipeline_verify_supports_edu_za_domains(self):
        self.assertEqual(PV.registrable('www.college.edu.za'), 'college.edu.za')
        self.assertTrue(PV.same_site('https://apply.college.edu.za/2027.pdf', 'https://www.college.edu.za/'))

    def test_sw_v104_includes_doc_checklist(self):
        sw = read('sw.js')
        self.assertRegex(sw, r"const CACHE = 'mzansi-pathways-v1[0-9]{2}'")
        self.assertIn('./js/checklist.js', sw)


if __name__ == '__main__':
    unittest.main()
