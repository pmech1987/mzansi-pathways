#!/usr/bin/env python3
"""v106 Unified Regression Suite: Merged v104 .github/ Automation + All v105 Security, POPIA, Hash-Routing & Mobile UX Fixes."""
import os, unittest

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))


def read(rel):
    with open(os.path.join(ROOT, rel), 'r', encoding='utf-8') as f:
        return f.read()


class TestV106UnifiedSecurityAndUx(unittest.TestCase):
    def test_github_automation_restored(self):
        for rel in (
            '.github/dependabot.yml',
            '.github/workflows/data-digest.yml',
            '.github/workflows/data-refresh.yml',
            '.github/workflows/link-health.yml',
            '.github/workflows/prospectus-pipeline.yml',
        ):
            self.assertTrue(os.path.isfile(os.path.join(ROOT, rel)), 'Missing ' + rel)

    def test_wipe_clears_all_mz_and_session_quarantine(self):
        app = read('js/app.js')
        self.assertIn('sessionStorage.key(i)', app)
        self.assertIn('quarantine_', app)
        self.assertIn('state.docChecklist = {};', app)

    def test_backup_allowlist_and_size_caps(self):
        v97 = read('js/backup.js')
        v99 = read('js/backup.js')
        self.assertIn('isAllowedKey', v97)
        self.assertIn('262144', v97)
        self.assertIn('[SA-ID-REDACTED]', v97)
        self.assertIn('isAllowedMzKey', v99)

    def test_dom_sinks_removed_from_studio_badge_and_i18n(self):
        cs = read('js/creator_studio.js')
        i18n = read('js/i18n.js')
        self.assertIn('createElementNS', cs)
        self.assertNotIn('innerHTML', i18n)

    def test_ocr_scrubs_sa_id_and_blocks_cdn_fallback(self):
        ocr = read('js/ocr.js')
        self.assertIn('function scrubSaId', ocr)
        self.assertIn('[SA-ID-REDACTED]', ocr)
        self.assertNotIn('await loadScript(CDN.tess)', ocr)
        self.assertNotIn('await import(CDN.pdfMod)', ocr)

    def test_headers_dns_prefetch_off(self):
        hdr = read('_headers')
        self.assertIn('X-DNS-Prefetch-Control: off', hdr)
        self.assertIn('autoplay=()', hdr)

    def test_hash_routing_and_mobile_layout_fixes(self):
        sc = read('js/screens.js')
        css = read('css/civic_mobile_a11y.css')
        self.assertIn('function routeFromHash()', sc)
        self.assertIn("addEventListener('hashchange'", sc)
        self.assertIn('top: 12px; bottom: auto;', css)
        self.assertIn('bottom: 136px;', css)
        self.assertIn('details.v105-settings-acc', css)

    def test_sw_v106(self):
        sw = read('sw.js')
        self.assertRegex(sw, r"const CACHE = 'mzansi-pathways-v1[0-9]{2}'")


if __name__ == '__main__':
    unittest.main()
