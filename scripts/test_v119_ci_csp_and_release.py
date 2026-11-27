import re, unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

def read(rel):
    return (ROOT / rel).read_text(encoding='utf-8')

class TestV119CiCspAndRelease(unittest.TestCase):
    def test_no_inline_style_attrs_in_html_pages(self):
        for page in ['index.html', 'check_prospectus.html', 'creator_studio.html', '404.html']:
            html = read(page)
            self.assertNotRegex(html, r'\sstyle\s*=', f'Inline style attribute violates CSP style-src self in {page}')

    def test_prospectus_pipeline_uses_pipefail(self):
        wf = read('.github/workflows/prospectus-pipeline.yml')
        self.assertIn('set -o pipefail', wf)

    def test_data_digest_has_concurrency_and_python3(self):
        wf = read('.github/workflows/data-digest.yml')
        self.assertIn('concurrency:', wf)
        self.assertIn('python3 scripts/make_digest.py', wf)

    def test_headers_covers_check_prospectus(self):
        hdr = read('_headers')
        self.assertIn('/check_prospectus.html', hdr)

    def test_check_prospectus_scripts_deferred(self):
        html = read('check_prospectus.html')
        tags = re.findall(r'<script[^>]*src="[^"]+"[^>]*>', html)
        self.assertEqual(len(tags), 4)
        for t in tags:
            self.assertIn('defer', t)

if __name__ == '__main__':
    unittest.main()
