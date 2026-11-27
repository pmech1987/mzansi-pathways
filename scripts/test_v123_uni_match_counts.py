import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

class TestV123UniMatchCounts(unittest.TestCase):
    def test_institutions_list_computes_live_match_counts_and_sorts_by_matches(self):
        js = (ROOT / 'js/modules/funding.js').read_text(encoding='utf-8')
        self.assertIn('matchByInst', js)
        self.assertIn("See my ' + m.yes + ' matching courses", js)
        self.assertIn('return (mb.yes - ma.yes) || (mb.close - ma.close)', js)

if __name__ == '__main__':
    unittest.main()
