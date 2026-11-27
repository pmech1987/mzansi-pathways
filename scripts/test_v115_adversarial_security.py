#!/usr/bin/env python3
"""v115 Adversarial Security Regression Suite: NFKC & Zero-Width Anti-Scam/PII Normalization + Post-Wipe pagehide Guard."""
import os, sys, unittest

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
sys.path.insert(0, os.path.join(ROOT, 'scripts'))
import mz_common as C
import community_submissions as CS
import fetch_jobs as FJ
import refresh_data as RD


def read(rel):
    with open(os.path.join(ROOT, rel), 'r', encoding='utf-8') as f:
        return f.read()


class TestV115AdversarialSecurity(unittest.TestCase):
    def test_zero_width_and_fullwidth_bypasses_blocked_in_python(self):
        for payload in (
            'Apply at b\u200bit.ly/freejob',
            'ID 990101\u200b5009087',
            'Call 082\u200b1234567',
            'Message \uff57\uff41\uff0e\uff4d\uff45/27821234567',
            '\uff1cscript\uff1ealert(1)\uff1c/script\uff1e',
        ):
            norm = C.normalize_for_security(payload)
            self.assertIsNotNone(CS.BAD_TEXT.search(norm), 'Expected CS.BAD_TEXT to block: ' + repr(payload))

        # fetch_jobs & refresh_data scrub obfuscated SA ID and phone
        scrubbed = FJ.scrub_popia_pii('Clerk 990101\u200b5009087 call 082\u200b1234567')
        self.assertNotIn('990101', scrubbed)
        self.assertNotIn('082', scrubbed)
        # fetch_jobs blocks obfuscated fee phrase
        self.assertIsNotNone(FJ.FEE_RE.search(C.normalize_for_security('Pay registration\u200b fee R150')))
        # refresh_data scrubs obfuscated SA ID
        row = RD.sanitize_job_row({'title': 'Clerk 990101\u200b5009087', 'officialUrl': 'https://www.dpsa.gov.za/'})
        self.assertNotIn('990101', row['title'])

    def test_js_nfkc_and_zero_width_normalization(self):
        for rel in ('js/ocr.js', 'js/prospectus_check.js', 'js/modules/work.js'):
            txt = read(rel)
            self.assertIn("normalize('NFKC')", txt, rel)
            self.assertIn('\\u200b', txt, rel)

    def test_wipe_clears_residual_memory_and_blocks_pagehide_resave(self):
        app = read('js/app.js')
        self.assertIn('justWiped = true;', app)
        self.assertIn('!justWiped && (ev === \'pagehide\'', app)
        self.assertIn('state.savedCvs = [];', app)

    def test_duplicate_staging_workflow_folder_removed_and_sw_v115(self):
        self.assertFalse(os.path.exists(os.path.join(ROOT, 'github_workflows_to_add')))
        import re; m = re.search(r"const CACHE = 'mzansi-pathways-v(\d+)'", read('sw.js')); self.assertTrue(m and int(m.group(1)) >= 115)


if __name__ == '__main__':
    unittest.main()
