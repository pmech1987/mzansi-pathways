import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

def read(rel):
    return (ROOT / rel).read_text(encoding='utf-8')

class TestV125B4B8B9QuickWins(unittest.TestCase):
    def test_b8_checkbox_has_explicit_light_and_dark_unchecked_border(self):
        css = read('css/mzansi_ui.css')
        self.assertIn('input[type="checkbox"]', css)
        self.assertIn('background-color: #ffffff !important;', css)
        self.assertIn('border: 2px solid #475569;', css)

    def test_b8_jump_btn_docked_in_more_sheet_and_scroll_top_after_2_screens(self):
        cj = read('js/comfort_and_jump.js')
        self.assertIn("document.querySelector('#mz-more .mz-more-sheet')", cj)
        bk = read('js/backup.js')
        self.assertIn('Math.max(700, (window.innerHeight || 640) * 1.8)', bk)

    def test_b9_plan_board_table_has_responsive_stacked_cards_below_600px(self):
        app = read('js/app.js')
        self.assertIn('class="mz-plan-table w-full', app)
        self.assertIn('data-label="Affordability & Distance"', app)
        css = read('css/mzansi_ui.css')
        self.assertIn('@media (max-width: 600px)', css)
        self.assertIn('.mz-plan-table td[data-label]::before', css)

if __name__ == '__main__':
    unittest.main()
