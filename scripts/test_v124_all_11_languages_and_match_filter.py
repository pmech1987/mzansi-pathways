import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

class TestV124All11LanguagesAndMatchFilter(unittest.TestCase):
    def test_i18n_covers_all_11_written_official_sa_languages(self):
        js = (ROOT / 'js/i18n.js').read_text(encoding='utf-8')
        for lang in ['isiZulu', 'Afrikaans', 'siSwati', 'Xitsonga', 'Sesotho', 'isiXhosa', 'Sepedi', 'Setswana', 'Tshivenda', 'isiNdebele']:
            self.assertIn(f"name: '{lang}'", js)

    def test_institutions_has_only_where_i_match_toggle(self):
        fjs = (ROOT / 'js/modules/funding.js').read_text(encoding='utf-8')
        self.assertIn('id="inst-match-only"', fjs)
        self.assertIn('Only where I match', fjs)
        app = (ROOT / 'js/app.js').read_text(encoding='utf-8')
        self.assertIn("getElementById('inst-match-only')", app)

if __name__ == '__main__':
    unittest.main()
