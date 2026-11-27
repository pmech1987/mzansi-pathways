import json, tempfile, unittest
from pathlib import Path
import build_data_manifest as bdm

ROOT = Path(__file__).resolve().parent.parent

class TestV127FinalConvergence(unittest.TestCase):
    def test_b1_b3_data_manifest_is_deterministic_and_reconciles_with_catalogue(self):
        m1 = bdm.build_manifest(ROOT)
        b1 = (ROOT / 'data/data_manifest.json').read_bytes()
        m2 = bdm.build_manifest(ROOT)
        b2 = (ROOT / 'data/data_manifest.json').read_bytes()
        self.assertEqual(b1, b2, "build_data_manifest must be byte-identical across runs")
        cat = json.loads((ROOT / 'data/catalogue.json').read_text(encoding='utf-8'))
        total_cat = sum(len(i.get('programmes', [])) for i in cat.get('institutions', []))
        self.assertEqual(m1['programmesTotal'], total_cat)
        self.assertEqual(m1['institutionsTotal'], 76)
        self.assertEqual(m1['institutionsWithProgrammes'], 27)

    def test_b2_eligibility_config_and_contract_exist_with_product_default_label(self):
        cfg = json.loads((ROOT / 'config/eligibility_config.json').read_text(encoding='utf-8'))
        self.assertIn('NOT institution admission rules', cfg['notice'])
        self.assertEqual(cfg['CLOSE_APS_GAP'], 2)
        self.assertTrue((ROOT / 'contracts/CONTRACT.md').exists())

    def test_b7_toolkit_has_single_mount_id(self):
        tk = (ROOT / 'js/toolkit.js').read_text(encoding='utf-8')
        self.assertEqual(tk.count("id = 'v94-smart-tools'") + tk.count('id="v94-smart-tools"'), 1)

    def test_b12_unified_design_tokens_and_tabular_numerals(self):
        css = (ROOT / 'css/mzansi_ui.css').read_text(encoding='utf-8')
        for tok in ['--mz-bg:', '--mz-surface:', '--mz-ink:', '--mz-border:', '--mz-accent:', '--mz-z-dock:', '--mz-z-modal:', 'tabular-nums']:
            self.assertIn(tok, css)

if __name__ == '__main__':
    unittest.main()
