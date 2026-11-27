#!/usr/bin/env python3
"""v113 Regression Suite: Hardened Learning Engine, Community Anti-Scam/XSS Shield, push_data.sh Gate in Community Workflow & Prospectus Check A11y."""
import os, sys, unittest

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
sys.path.insert(0, os.path.join(ROOT, 'scripts'))
import community_submissions as CS


def read(rel):
    with open(os.path.join(ROOT, rel), 'r', encoding='utf-8') as f:
        return f.read()


class TestV113LearningAndHardening(unittest.TestCase):
    def test_community_workflow_uses_push_data_and_backup(self):
        wf = read('.github/workflows/community-submissions.yml')
        self.assertIn('scripts/backup_data.py', wf)
        self.assertIn('scripts/autonomous_ops.py', wf)
        self.assertIn('scripts/run_all_checks.py', wf)
        self.assertIn('scripts/push_data.sh', wf)
        self.assertNotIn('git add -A', wf)

    def test_community_submissions_blocks_shorteners_xss_and_spaced_phones(self):
        for bad in ('wa.me/27821234567', 'bit.ly/fake', '<script>alert(1)</script>', 'javascript:void(0)', 'Call 082 123 4567'):
            self.assertIsNotNone(CS.BAD_TEXT.search(bad), 'Expected blocked: ' + bad)

    def test_learn_from_feedback_bounds_and_caps(self):
        lf = read('scripts/learn_from_feedback.py')
        for tok in ('ALIAS_MAX_COUNT = 500', 'HINT_MAX_AGE_DAYS = 365', '0 <= ii < len(R.STRATEGIES)'):
            self.assertIn(tok, lf)

    def test_prospectus_check_a11y_and_tvet_headings(self):
        ch = read('check_prospectus.html')
        pc = read('js/prospectus_check.js')
        self.assertIn('lang="en-ZA"', ch)
        self.assertIn('id="main-content"', ch)
        self.assertIn('NC\\(V\\)', pc)
        self.assertIn('wa\\.me', pc)

    def test_sw_v113(self):
        self.assertRegex(read('sw.js'), r"const CACHE = 'mzansi-pathways-v11[3-9]'")


if __name__ == '__main__':
    unittest.main()
