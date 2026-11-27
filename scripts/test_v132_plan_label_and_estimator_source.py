import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

class TestV132PlanLabelAndEstimatorSource(unittest.TestCase):
    def test_plan_progress_label_does_not_contradict_doc_checklist(self):
        js = (ROOT / 'js/modules/study.js').read_text(encoding='utf-8')
        self.assertIn('Plans Marked Ready', js)
        self.assertNotIn("ready + ' Docs Ready'", js)

    def test_cost_estimator_includes_official_source_disclaimer_and_date(self):
        tk = (ROOT / 'js/toolkit.js').read_text(encoding='utf-8')
        self.assertIn('Illustrative planning range only', tk)
        self.assertIn('nsfas.org.za', tk)
        self.assertIn('reviewed 2026-11-27', tk)

if __name__ == '__main__':
    unittest.main()
