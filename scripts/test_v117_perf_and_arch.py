import re, unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

def read(rel):
    return (ROOT / rel).read_text(encoding='utf-8')

class TestV117PerfAndArch(unittest.TestCase):
    def test_all_index_scripts_deferred(self):
        html = read('index.html')
        tags = re.findall(r'<script[^>]*src="[^"]+"[^>]*>', html)
        self.assertGreaterEqual(len(tags), 27)
        non_deferred = [t for t in tags if 'defer' not in t and 'async' not in t]
        self.assertEqual(non_deferred, [], f"Render-blocking scripts found: {non_deferred}")

    def test_catalogue_has_eval_memoization_and_precomputed_search(self):
        cat = read('js/catalogue.js')
        self.assertIn('function getEvaluatedAll(subs, E)', cat)
        self.assertIn('p._searchLow', cat)

    def test_i18n_skips_full_dom_walk_for_english_default(self):
        i18n = read('js/i18n.js')
        self.assertIn("if (lang === 'en' && !hasTranslated)", i18n)

    def test_whatif_slider_is_raf_throttled_and_saves_on_change(self):
        app = read('js/app.js')
        self.assertIn("wr.addEventListener('change', () => { saveState(); });", app)
        self.assertIn('requestAnimationFrame', app)

if __name__ == '__main__':
    unittest.main()
