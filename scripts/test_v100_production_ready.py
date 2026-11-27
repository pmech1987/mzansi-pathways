#!/usr/bin/env python3
"""v100 Regression Suite: PWA App Shortcuts, Install & Offline Self-Check UI, SW v100, Release Verifier & Updated Runbook."""
import json, os, unittest

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))


def read(rel):
    with open(os.path.join(ROOT, rel), 'r', encoding='utf-8') as f:
        return f.read()


class TestV100ProductionReady(unittest.TestCase):
    def test_manifest_has_four_pwa_shortcuts(self):
        mf = json.loads(read('manifest.json'))
        shortcuts = mf.get('shortcuts', [])
        self.assertGreaterEqual(len(shortcuts), 4)
        urls = [s.get('url') for s in shortcuts]
        for expected in ('./index.html#study', './index.html#work', './index.html#plan', './creator_studio.html'):
            self.assertIn(expected, urls)

    def test_v100_pwa_install_script_strict_csp(self):
        js = read('js/pwa_health.js')
        html = read('index.html')
        self.assertIn('./js/pwa_health.js', html)
        self.assertNotIn('innerHTML', js)
        for token in ('beforeinstallprompt', 'runOfflineSelfCheck', 'v100-pwa-box', 'unhandledrejection', 'mzPwaHealth'):
            self.assertIn(token, js)

    def test_sw_v100_includes_pwa_module(self):
        sw = read('sw.js')
        self.assertRegex(sw, r"const CACHE = 'mzansi-pathways-v1[0-9]{2}'")
        self.assertIn('./js/pwa_health.js', sw)

    def test_runbook_documents_v97_to_v100_failsafes(self):
        rb = read('RUNBOOK.md')
        for token in ('health_audit.py', '--restore-latest', 'verify_release.py'):
            self.assertIn(token, rb)

    def test_verify_release_script_exists(self):
        vr = read('scripts/verify_release.py')
        self.assertIn('RELEASE READY:', vr)


if __name__ == '__main__':
    unittest.main()
