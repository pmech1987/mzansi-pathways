#!/usr/bin/env python3
"""Strict v94 behavioral, security, accessibility, SRI, and automation verification tests."""
import hashlib, base64, json, re, unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class TestV94Overhaul(unittest.TestCase):
    def test_v94_ui_script_is_strict_csp_and_trusted_types_safe(self):
        code = (ROOT / "js" / "toolkit.js").read_text(encoding="utf-8")
        self.assertNotIn("innerHTML", code, "toolkit.js must not use innerHTML sinks")
        self.assertIsNone(re.search(r"\bon(?:click|change|input|load)\s*=", code), "No inline HTML event handlers allowed")
        self.assertIn("v94-smart-tools", code)
        self.assertIn("solveReverseAps", code)

    def test_headers_trusted_types_and_hardening(self):
        hdr = (ROOT / "_headers").read_text(encoding="utf-8")
        for tok in ("require-trusted-types-for 'script'", "frame-ancestors 'none'", "X-Content-Type-Options: nosniff", "'wasm-unsafe-eval'"):
            self.assertIn(tok, hdr)

    def test_a11y_css_content_visibility_and_dark_mode_isolation(self):
        css = (ROOT / "css" / "civic_mobile_a11y.css").read_text(encoding="utf-8")
        self.assertIn("content-visibility: auto", css)
        self.assertIn("min-height: 44px", css)
        self.assertIn("body.dark-mode .v94-tools-card", css)

    def test_sri_manifest_matches_live_v94_script(self):
        mf = json.loads((ROOT / "data" / "sri_manifest.json").read_text(encoding="utf-8"))
        entry = mf["assets"].get("js/toolkit.js")
        self.assertIsNotNone(entry)
        actual = "sha384-" + base64.b64encode(hashlib.sha384((ROOT / "js" / "toolkit.js").read_bytes()).digest()).decode("ascii")
        self.assertEqual(entry["sri"], actual)

    def test_workflow_and_sw_wired(self):
        dr = (ROOT / ".github" / "workflows" / "data-refresh.yml").read_text(encoding="utf-8")
        self.assertIn("scripts/autonomous_ops.py", dr)
        sw = (ROOT / "sw.js").read_text(encoding="utf-8")
        self.assertIn("mzansi-pathways-v", sw)
        self.assertIn("./js/toolkit.js", sw)


if __name__ == "__main__":
    unittest.main()
