import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

def read(rel):
    return (ROOT / rel).read_text(encoding='utf-8')

class TestV121ClassModeAndLanguages(unittest.TestCase):
    def test_shared_pc_class_mode_ui_and_storage_guard(self):
        html = read('index.html')
        self.assertIn('id="shared-pc-banner"', html)
        self.assertIn('id="shared-pc-btn"', html)
        self.assertIn('id="shared-pc-next-btn"', html)
        app = read('js/app.js')
        self.assertIn('function isSharedPcMode()', app)
        self.assertIn('if (isSharedPcMode()) return;', app)

    def test_marks_signature_uses_parseMark(self):
        app = read('js/app.js')
        self.assertIn("typeof parseMark === 'function' ? parseMark(x.mark)", app)

    def test_i18n_supports_7_sa_languages(self):
        js = read('js/i18n.js')
        for marker in ["name: 'isiZulu'", "name: 'Afrikaans'", "name: 'siSwati'", "name: 'Xitsonga'", "name: 'Sesotho'", "name: 'isiXhosa'"]:
            self.assertIn(marker, js)

if __name__ == '__main__':
    unittest.main()
