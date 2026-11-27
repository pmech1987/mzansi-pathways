import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

def read(rel):
    return (ROOT / rel).read_text(encoding='utf-8')

class TestV120UxPolishAndConvergence(unittest.TestCase):
    def test_mark_inputs_have_null_safe_value_decimal_step_and_subject_aria_label(self):
        app = read('js/app.js')
        self.assertIn('data-sub-mark="${i}" type="number" min="0" max="100" step="any" inputmode="decimal"', app)
        self.assertIn("value=\"${s.mark ?? ''}\"", app)
        self.assertIn("aria-label=\"${esc(s.name || 'Subject')} mark percentage\"", app)
        self.assertIn('step="any" inputmode="decimal" data-scan-mark="${idx}"', app)
        self.assertIn('inputmode="numeric"', app)

    def test_scan_mark_handler_uses_parseMark_without_NaN(self):
        app = read('js/app.js')
        self.assertIn("typeof parseMark === 'function' ? parseMark(rawV)", app)

    def test_whatsapp_og_image_is_absolute_https(self):
        html = read('index.html')
        self.assertIn('property="og:image" content="https://pmech1987.github.io/mzansi-pathways/icon-512.png"', html)
        self.assertIn('property="og:url" content="https://pmech1987.github.io/mzansi-pathways/"', html)

if __name__ == '__main__':
    unittest.main()
