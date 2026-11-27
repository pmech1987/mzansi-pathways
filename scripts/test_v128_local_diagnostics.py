import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

class TestV128LocalDiagnostics(unittest.TestCase):
    def test_diagnostics_panel_exists_and_contains_no_pii_fields(self):
        html = (ROOT / 'index.html').read_text(encoding='utf-8')
        self.assertIn('id="diag-panel"', html)
        self.assertIn('id="diag-refresh-btn"', html)
        self.assertIn('id="diag-copy-btn"', html)
        app = (ROOT / 'js/app.js').read_text(encoding='utf-8')
        self.assertIn('function buildDiagnosticsReport()', app)
        self.assertIn('Mzansi Pathways Diagnostics (No Personal Data)', app)
        idx = app.index('function buildDiagnosticsReport()')
        snippet = app[idx:idx + 1200]
        self.assertNotIn('state.subjects', snippet)
        self.assertNotIn('learnerName', snippet)

if __name__ == '__main__':
    unittest.main()
