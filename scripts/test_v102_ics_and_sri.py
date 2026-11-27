#!/usr/bin/env python3
"""v102 Regression Suite: Offline .ics Calendar Reminder Exporter, Root SRI Signing (guard.js/sw.js), Atomic Ops & SW v102."""
import json, os, unittest

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))


def read(rel):
    with open(os.path.join(ROOT, rel), 'r', encoding='utf-8') as f:
        return f.read()


class TestV102IcsAndSri(unittest.TestCase):
    def test_v102_deadline_ics_strict_csp(self):
        js = read('js/calendar.js')
        html = read('index.html')
        self.assertIn('./js/calendar.js', html)
        self.assertNotIn('innerHTML', js)
        for token in ('BEGIN:VCALENDAR', 'BEGIN:VALARM', 'TRIGGER:-P7D', 'mzDeadlineIcs', 'v102-ics-box'):
            self.assertIn(token, js)

    def test_sri_manifest_signs_root_guard_and_sw(self):
        sri = json.loads(read('data/sri_manifest.json'))
        assets = sri.get('assets', {})
        self.assertIn('guard.js', assets)
        self.assertIn('sw.js', assets)
        self.assertIn('js/calendar.js', assets)

    def test_autonomous_ops_atomic_write(self):
        ops = read('scripts/autonomous_ops.py')
        self.assertIn('atomic_write_text', ops)

    def test_sw_v102_includes_deadline_ics(self):
        sw = read('sw.js')
        self.assertRegex(sw, r"const CACHE = 'mzansi-pathways-v1[0-9]{2}'")
        self.assertIn('./js/calendar.js', sw)


if __name__ == '__main__':
    unittest.main()
