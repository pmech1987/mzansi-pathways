import re, unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

def read(rel):
    return (ROOT / rel).read_text(encoding='utf-8')

class TestV118A11yAndI18n(unittest.TestCase):
    def test_all_dialogs_in_index_have_aria_modal_and_label(self):
        html = read('index.html')
        dialogs = re.findall(r'<[^>]*role="dialog"[^>]*>', html)
        self.assertGreaterEqual(len(dialogs), 5)
        for d in dialogs:
            self.assertIn('aria-modal="true"', d)
            self.assertTrue('aria-labelledby=' in d or 'aria-label=' in d, f"Dialog missing label: {d}")

    def test_auth_and_file_inputs_have_accessible_labels(self):
        html = read('index.html')
        self.assertIn('for="enc-pass"', html)
        self.assertIn('aria-describedby="enc-pass-strength"', html)
        self.assertIn('for="otp-email"', html)
        self.assertIn('id="in-import-enc" type="file" accept=".mzansi,.json" aria-label=', html)
        self.assertIn('id="import-rules-file" type="file" accept=".json" aria-label=', html)
        self.assertIn('id="tut-try-btn" aria-label=', html)

    def test_404_has_skip_link(self):
        h4 = read('404.html')
        self.assertIn('Skip to content', h4)

    def test_i18n_has_home_nav_maps_for_zu_ss_ts_and_af(self):
        js = read('js/i18n.js')
        for marker in ["'My marks':'Amamaki ami'", "'My marks':'Emamaki ami'", "'My marks':'Timaraka ta mina'", "'My marks':'My punte'"]:
            self.assertIn(marker, js)

if __name__ == '__main__':
    unittest.main()
