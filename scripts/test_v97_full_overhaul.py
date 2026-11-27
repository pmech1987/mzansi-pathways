#!/usr/bin/env python3
"""v97 Regression Suite: Resilience UX, Escape Modal A11y, SW Timeout Failsafe, CI YAML Fix, Backup --restore-latest & Health Audit."""
import os, re, subprocess, sys, unittest

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))


def read(rel):
    with open(os.path.join(ROOT, rel), 'r', encoding='utf-8') as f:
        return f.read()


class TestV97FullOverhaul(unittest.TestCase):
    def test_index_loads_v97_resilience_ux(self):
        html = read('index.html')
        self.assertIn('./js/backup.js', html)

    def test_v97_resilience_ux_strict_csp_and_features(self):
        js = read('js/backup.js')
        self.assertNotIn('innerHTML', js)
        self.assertNotIn('eval(', js)
        for token in ('mzAnnounce', 'mzSafeStorage', 'v97-update-toast', 'v97-net-pill', 'v97-scroll-top', 'v97-backup-box', 'ArrowRight'):
            self.assertIn(token, js)

    def test_a11y_escape_and_aria_modal(self):
        js = read('js/a11y.js')
        self.assertIn("e.key === 'Escape'", js)
        self.assertIn("aria-modal", js)

    def test_civic_css_v97_and_high_contrast(self):
        css = read('css/civic_mobile_a11y.css')
        for token in ('.v97-update-toast', '.v97-net-pill', '.v97-scroll-top', '.v97-backup-box', 'prefers-contrast: more', 'forced-colors: active'):
            self.assertIn(token, css)

    def test_sw_v97_timeout_and_core_entry(self):
        sw = read('sw.js')
        self.assertRegex(sw, r"const CACHE = 'mzansi-pathways-v(9[7-9]|1[0-9]{2})'")
        self.assertIn('./js/backup.js', sw)
        self.assertIn('fetchWithTimeout', sw)
        self.assertIn('AbortController', sw)

    def test_headers_privacy_and_favicon_cache(self):
        hdr = read('_headers')
        self.assertIn('browsing-topics=()', hdr)
        self.assertIn('/favicon.svg', hdr)

    def test_backup_data_supports_restore_latest(self):
        bk = read('scripts/backup_data.py')
        self.assertIn('--restore-latest', bk)
        self.assertIn('def restore_latest', bk)

    def test_push_data_gates_on_health_audit_and_jwt_secret(self):
        sh = read('scripts/push_data.sh')
        self.assertIn('health_audit.py', sh)
        self.assertIn('sk_live_', sh)
        self.assertIn('trap cleanup_on_err ERR', sh)

    def test_workflows_fixed_and_run_all_checks(self):
        for wf in ('data-refresh.yml', 'prospectus-pipeline.yml', 'link-health.yml'):
            txt = read('.github/workflows/' + wf)
            self.assertIn('scripts/run_all_checks.py', txt, wf)
            self.assertIsNone(re.search(r'^\s+run:\s+[^\s|>].*\n\s{10,}python', txt, re.M), wf)

    def test_health_audit_passes(self):
        r = subprocess.run([sys.executable, 'scripts/health_audit.py'], cwd=ROOT, capture_output=True, text=True)
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)


if __name__ == '__main__':
    unittest.main()
