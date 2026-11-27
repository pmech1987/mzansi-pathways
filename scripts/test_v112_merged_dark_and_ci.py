#!/usr/bin/env python3
"""v112 Regression Suite: Merged v107+v109+v111, Full .github/ Workflows + Community Workflow, Grouped Courses & Dark Mode on Courses/Fit/My marks."""
import os, unittest

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))


def read(rel):
    with open(os.path.join(ROOT, rel), 'r', encoding='utf-8') as f:
        return f.read()


class TestV112MergedDarkAndCi(unittest.TestCase):
    def test_all_six_github_files_present(self):
        for rel in (
            '.github/dependabot.yml',
            '.github/workflows/data-digest.yml',
            '.github/workflows/data-refresh.yml',
            '.github/workflows/link-health.yml',
            '.github/workflows/prospectus-pipeline.yml',
            '.github/workflows/community-submissions.yml',
        ):
            self.assertTrue(os.path.isfile(os.path.join(ROOT, rel)), 'Missing ' + rel)

    def test_grouped_courses_and_progression_present(self):
        cat = read('js/catalogue.js')
        self.assertIn('details class="mz-course', cat)
        self.assertIn('details class="mz-offer', cat)
        self.assertIn('evidenceHtml', cat)
        self.assertIn('loPolicy === \'half\'', cat)

    def test_dark_mode_covers_courses_fit_and_my_marks(self):
        css = read('css/mzansi_ui.css')
        for tok in (
            'body.dark-mode #app-main details.mz-course',
            'body.dark-mode #app-main details.mz-offer',
            'body.dark-mode #image-scanner-panel',
            'body.dark-mode #app-main input:not([type="checkbox"])',
            'body.dark-mode main .bg-blue-50',
            'body.dark-mode main .bg-amber-50',
            'body.dark-mode main .text-slate-900',
        ):
            self.assertIn(tok, css)

    def test_prospectus_check_dark_mode_and_sw_v112(self):
        pc = read('css/prospectus_check.css')
        sw = read('sw.js')
        self.assertIn('prefers-color-scheme: dark', pc)
        self.assertRegex(sw, r"const CACHE = 'mzansi-pathways-v(11[2-9]|1[2-9]\d|[2-9]\d\d)'")


if __name__ == '__main__':
    unittest.main()
