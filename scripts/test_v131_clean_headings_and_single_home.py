import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

class TestV131CleanHeadingsAndSingleHome(unittest.TestCase):
    def test_no_internal_version_tags_in_toolkit_or_checklist_headings(self):
        tk = (ROOT / 'js/toolkit.js').read_text(encoding='utf-8')
        ck = (ROOT / 'js/checklist.js').read_text(encoding='utf-8')
        self.assertNotIn('(v103)', tk)
        self.assertNotIn('(v104)', ck)

    def test_toolkit_has_single_home_plan_tab_visibility_guard(self):
        tk = (ROOT / 'js/toolkit.js').read_text(encoding='utf-8')
        self.assertIn('function syncToolkitVisibility()', tk)
        self.assertIn("var show = (tab === 'plan');", tk)

if __name__ == '__main__':
    unittest.main()
