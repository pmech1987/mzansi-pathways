import subprocess, unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

class TestV126SingleSourcesOfTruth(unittest.TestCase):
    def test_selectors_81_province_pairs_trust_samples_and_counts(self):
        script = r"""
const assert = require('node:assert/strict');
const S = require('./js/modules/selectors.js');

for (const homeProv of S.SA_PROVINCES) {
  for (const itemProv of S.SA_PROVINCES) {
    const res = S.computeDistanceLabel(itemProv, { province: homeProv, canRelocate: false });
    if (homeProv === itemProv) {
      assert.equal(res.sameProvince, true);
      assert.match(res.label, /Near home/);
      assert.ok(!/Relocation \(/.test(res.label));
    } else {
      assert.equal(res.sameProvince, false);
      assert.match(res.label, /Relocation/);
      assert.ok(!/Near home/.test(res.label));
    }
  }
}

const smp = S.getTrust({ id: 'wk_1', title: 'Junior IT Support Technician [Sample]' });
assert.equal(smp.status, 'sample');
assert.ok(!/Verified Employer/i.test(smp.label));
assert.equal(S.isSampleJob({ id: 'wk_1', title: 'Junior IT [Sample]' }), true);

const unchk = S.getTrust({ id: 'job_99', title: 'Real Role', url: 'https://example.co.za/job' });
assert.equal(unchk.status, 'unverified');
assert.equal(unchk.label, 'Not verified yet');

const cnt = S.getCounts({ docChecklist: { a: true, b: false, c: true }, plan: { A: 'x', B: null, C: 'y' }, savedJobs: ['j1'] });
assert.deepEqual(cnt, { docsReady: 2, docsTotal: 3, planSize: 2, savedJobs: 1 });
console.log('SELECTORS_OK_81_PAIRS');
"""
        r = subprocess.run(['node', '-e', script], cwd=ROOT, capture_output=True, text=True, check=True)
        self.assertIn('SELECTORS_OK_81_PAIRS', r.stdout)

    def test_app_removes_unsourced_tuition_estimates_and_wires_selectors(self):
        app = (ROOT / 'js/app.js').read_text(encoding='utf-8')
        self.assertNotIn('Est. R55k–R70k', app)
        self.assertNotIn('Est. R35k–R48k', app)
        self.assertIn('window.MZSelectors.getTrust(w)', app)
        self.assertIn('window.MZSelectors.computeDistanceLabel(', app)
        self.assertIn('window.MZSelectors.getCounts(state)', app)

if __name__ == '__main__':
    unittest.main()
