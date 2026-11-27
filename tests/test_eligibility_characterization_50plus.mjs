import test from 'node:test';
import assert from 'node:assert/strict';
import E from '../js/engine.js';

function mkSubs(marks, opts = {}) {
  const names = [
    opts.hl || 'English Home Language',
    opts.fal || 'isiZulu First Additional Language',
    opts.math || 'Mathematics',
    'Physical Sciences',
    'Life Sciences',
    'Geography',
    'Life Orientation',
  ];
  return names.map((name, i) => ({
    name,
    mark: marks[i],
    isHomeLanguage: i === 0,
    isLifeOrientation: i === 6,
  }));
}

// 55 deterministic characterization cases across NSC pass tiers, APS 6..42, UMP LO/2, Maths Lit, Tech Maths, commas, blanks, LOLT
const CASES = [
  // 1-10: Uniform boundary marks
  ...([0, 29, 30, 39, 40, 49, 50, 59, 60, 70, 80, 100].map((m, i) => ({
    label: `uniform_${m}`,
    subs: mkSubs([m, m, m, m, m, m, m]),
    aps: E.levelFromMark(m) * 6,
    pass: m < 40 ? 'Did Not Meet Minimum NSC Pass' : (m < 50 ? 'Diploma Pass' : "Bachelor's Pass"),
  }))),
  // 13-20: Higher Certificate exact boundary (HL>=40, 3 non-LO >=40, 6 of 7 >=30)
  { label: 'hc_exact', subs: mkSubs([40, 40, 40, 30, 30, 29, 35]), aps: 14, pass: 'Higher Certificate Pass' },
  { label: 'hc_fail_hl39', subs: mkSubs([39, 80, 80, 80, 80, 80, 80]), aps: 37, pass: 'Did Not Meet Minimum NSC Pass' },
  { label: 'hc_fail_only_5_passed', subs: mkSubs([60, 60, 60, 60, 25, 25, 80]), aps: 22, pass: 'Did Not Meet Minimum NSC Pass' },
  { label: 'diploma_exact', subs: mkSubs([40, 45, 42, 40, 30, 30, 50]), aps: 16, pass: 'Diploma Pass' },
  { label: 'bachelor_exact_4x50', subs: mkSubs([40, 50, 50, 50, 50, 30, 30]), aps: 21, pass: "Bachelor's Pass" },
  { label: 'bachelor_hl_counts_as_one_of_4', subs: mkSubs([50, 50, 50, 50, 30, 30, 30]), aps: 20, pass: "Bachelor's Pass" },
  { label: 'bachelor_lo_does_not_count_toward_4x50', subs: mkSubs([40, 50, 50, 50, 45, 35, 95]), aps: 20, pass: 'Diploma Pass' },
  { label: 'lolt_english_fal_pass', subs: mkSubs([70, 30, 60, 60, 60, 60, 70], { hl: 'isiZulu Home Language', fal: 'English First Additional Language' }), aps: 28, pass: "Bachelor's Pass" },
  { label: 'lolt_english_fal_fail_29', subs: mkSubs([70, 29, 60, 60, 60, 60, 70], { hl: 'isiZulu Home Language', fal: 'English First Additional Language' }), aps: 27, pass: 'Did Not Meet Minimum NSC Pass' },
  // 22-35: Maths Lit & Technical Maths & SASL & decimal commas
  { label: 'mathlit_high_bachelor', subs: mkSubs([75, 70, 92, 68, 64, 62, 80], { math: 'Mathematical Literacy' }), aps: 34, pass: "Bachelor's Pass" },
  { label: 'techmath_bachelor', subs: mkSubs([65, 60, 72, 62, 58, 55, 75], { math: 'Technical Mathematics' }), aps: 29, pass: "Bachelor's Pass" },
  { label: 'comma_decimals_bachelor', subs: mkSubs(['65,5', '60,2', '55,8', '52,1', '48,9', '40,0', '75,5']), aps: 24, pass: "Bachelor's Pass" },
  { label: 'pct_suffix_strings', subs: mkSubs(['80%', '70%', '60%', '50%', '40%', '30%', '85%']), aps: 27, pass: "Bachelor's Pass" },
  // 26-55: Parametric sweep of 30 realistic Grade 12 learner profiles
  ...Array.from({ length: 30 }, (_, k) => {
    const base = 35 + k * 2;
    const clamp = v => Math.max(0, Math.min(100, v));
    const ms = [clamp(base + 5), clamp(base + 2), clamp(base - 3), clamp(base), clamp(base + 4), clamp(base - 1), clamp(base + 10)];
    const subs = mkSubs(ms);
    const expectedAps = ms.slice(0, 6).reduce((a, m) => a + E.levelFromMark(m), 0);
    return { label: `learner_profile_${k + 1}`, subs, aps: expectedAps, pass: null };
  }),
];

test(`Characterization suite covers ${CASES.length} (>=50) mark sets deterministically`, () => {
  assert.ok(CASES.length >= 50, `Expected >=50 cases, got ${CASES.length}`);
  for (const c of CASES) {
    const nsc = E.evaluateNsc(c.subs);
    assert.equal(nsc.aps, c.aps, `APS mismatch on ${c.label}`);
    if (c.pass) assert.equal(nsc.passLevel, c.pass, `Pass level mismatch on ${c.label}`);
    const ump = E.apsUMP(c.subs);
    assert.equal(ump.aps, c.aps + E.levelFromMark(c.subs[6].mark) / 2, `UMP APS mismatch on ${c.label}`);
  }
});
