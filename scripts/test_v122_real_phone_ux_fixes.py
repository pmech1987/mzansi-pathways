import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

def read(rel):
    return (ROOT / rel).read_text(encoding='utf-8')

class TestV122RealPhoneUxFixes(unittest.TestCase):
    def test_light_mode_inputs_have_explicit_dark_text_and_color_scheme_light(self):
        css = read('css/mzansi_ui.css')
        self.assertIn('color-scheme: light !important;', css)
        self.assertIn('color: #0e1b3d !important;', css)

    def test_institutions_tab_shows_real_catalogue_count_instead_of_empty_zero_pills(self):
        js = read('js/modules/funding.js')
        self.assertIn('courses loaded across', js)
        self.assertIn('nonEmptyCov', js)

    def test_work_sources_url_is_optional_with_auto_portal_resolver_and_quick_chips(self):
        app = read('js/app.js')
        self.assertNotIn('<input id="muni-url" required', app)
        self.assertIn('SA_AUTO_PORTALS', app)
        self.assertIn('thembisilehanilm.gov.za', app)
        self.assertIn('data-quick-muni', app)

    def test_floating_pills_compact_and_main_has_bottom_clearance(self):
        css = read('css/mzansi_ui.css')
        self.assertIn('padding-bottom: 136px !important;', css)
        a11y = read('css/civic_mobile_a11y.css')
        self.assertIn('min-height: 36px !important;', a11y)

if __name__ == '__main__':
    unittest.main()
