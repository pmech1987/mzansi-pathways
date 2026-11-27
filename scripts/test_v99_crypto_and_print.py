#!/usr/bin/env python3
"""v99 Regression Suite: AES-256-GCM Encrypted Backup UI, Print Media CSS, Extended Pathway Link Monitoring & Digest SRI Check."""
import os, sys, unittest

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
sys.path.insert(0, os.path.join(ROOT, 'scripts'))
import check_links as CL


def read(rel):
    with open(os.path.join(ROOT, rel), 'r', encoding='utf-8') as f:
        return f.read()


class TestV99CryptoAndPrint(unittest.TestCase):
    def test_v99_encrypted_backup_script_strict_csp(self):
        js = read('js/backup.js')
        html = read('index.html')
        self.assertIn('./js/backup.js', html)
        self.assertNotIn('innerHTML', js)
        for token in ('PBKDF2_ITERATIONS = 600000', 'AES-GCM', 'mzansi-pathways-encrypted-v2', 'mzEncryptedBackup', 'v99-crypto-box'):
            self.assertIn(token, js)

    def test_print_media_stylesheet_hides_floating_chrome(self):
        css = read('css/civic_mobile_a11y.css')
        self.assertIn('@media print', css)
        self.assertIn('.v98-jump-btn', css)
        self.assertIn('.v97-scroll-top', css)

    def test_check_links_includes_extended_pathways(self):
        urls = CL.collect()
        # Verified SA Youth URL from sa_extended_pathways.json should be collected
        has_ext = any(any(w.startswith('extended:') for w in who) for who in urls.values())
        self.assertTrue(has_ext, 'check_links.collect() should monitor official URLs from sa_extended_pathways.json')

    def test_make_digest_checks_sri_manifest(self):
        md = read('scripts/make_digest.py')
        self.assertIn('sri_manifest.json', md)

    def test_sw_v99_includes_crypto_module(self):
        sw = read('sw.js')
        self.assertRegex(sw, r"const CACHE = 'mzansi-pathways-v(99|1[0-9]{2})'")
        self.assertIn('./js/backup.js', sw)


if __name__ == '__main__':
    unittest.main()
