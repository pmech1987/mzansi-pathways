#!/usr/bin/env python3
"""v114 Regression Suite: POPIA Privacy Safeguards, OCR Stash Wipe, Plain-Language Privacy Notice & One-Tap Delete."""
import os, unittest

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))


def read(rel):
    with open(os.path.join(ROOT, rel), 'r', encoding='utf-8') as f:
        return f.read()


class TestV114PopiaPrivacy(unittest.TestCase):
    def test_wipe_clears_ocr_stash_and_exposes_one_tap_hook(self):
        app = read('js/app.js')
        self.assertIn('MZOCR.clearStash()', app)
        self.assertIn('window.mzWipeAllData = wipeLocalProfile;', app)

    def test_popia_notice_and_one_tap_delete_in_backup_js(self):
        bk = read('js/backup.js')
        self.assertNotIn('innerHTML', bk)
        for tok in ('v114-popia-box', 'v114-one-tap-wipe', 'Your Privacy (POPIA)', 'AES-256-GCM Encrypted Backup'):
            self.assertIn(tok, bk)

    def test_family_dossier_redacts_sa_id(self):
        st = read('js/modules/study.js')
        self.assertIn('[SA-ID-REDACTED]', st)

    def test_sw_v114(self):
        self.assertRegex(read('sw.js'), r"const CACHE = 'mzansi-pathways-v(11[2-9]|1[2-9]\d|[2-9]\d\d)'")


if __name__ == '__main__':
    unittest.main()
