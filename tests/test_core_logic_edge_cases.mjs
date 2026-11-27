import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MZ_EVOLVED } from '../js/core/pathways_v2_engines.js';
import { MZ_PLANNER } from '../js/core/reverse_aps_solver.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function loadBrowserEngines() {
  const sandbox = { console, Math, Date, Number, String, Array, Object, Set, RegExp, JSON };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/engine.js'), 'utf8'), sandbox);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/catalogue.js'), 'utf8'), sandbox);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/modules/results.js'), 'utf8'), sandbox);
  return { E: sandbox.MZENGINE || sandbox, CAT: sandbox.MZCAT, RES: sandbox.MZResults };
}

const { E, CAT, RES } = loadBrowserEngines();

const BACHELOR_MATHS = [
  { name: 'English Home Language', mark: 72, isHomeLanguage: true },
  { name: 'Afrikaans First Additional Language', mark: 65 },
  { name: 'Mathematics', mark: 68 },
  { name: 'Physical Sciences', mark: 62 },
  { name: 'Life Sciences', mark: 58 },
  { name: 'Geography', mark: 74 },
  { name: 'Life Orientation', mark: 80, isLifeOrientation: true },
];

test('1. Exact DBE NSC Level 1–7 boundaries (including 0 and 100)', () => {
  assert.equal(E.levelFromMark(0), 1);
  assert.equal(E.levelFromMark(29), 1);
  assert.equal(E.levelFromMark(30), 2);
  assert.equal(E.levelFromMark(39), 2);
  assert.equal(E.levelFromMark(40), 3);
  assert.equal(E.levelFromMark(49), 3);
  assert.equal(E.levelFromMark(50), 4);
  assert.equal(E.levelFromMark(59), 4);
  assert.equal(E.levelFromMark(60), 5);
  assert.equal(E.levelFromMark(69), 5);
  assert.equal(E.levelFromMark(70), 6);
  assert.equal(E.levelFromMark(79), 6);
  assert.equal(E.levelFromMark(80), 7);
  assert.equal(E.levelFromMark(100), 7);
});

test('2. Blank/whitespace/boolean/out-of-range marks are NOT counted as 0%', () => {
  const subs = [
    { name: 'English Home Language', mark: '   ', isHomeLanguage: true },
    { name: 'Mathematics', mark: false },
    { name: 'Physical Sciences', mark: -5 },
    { name: 'Life Sciences', mark: 105 },
    { name: 'Geography', mark: null },
    { name: 'History', mark: '' },
    { name: 'Life Orientation', mark: 70, isLifeOrientation: true },
  ];
  assert.equal(E.validSubjects(subs).length, 1);
  assert.equal(E.apsBestSixNoLO(subs).aps, null);
});

test('3. Missing subjects vs 8 subjects (best 6 excl. LO, max 42)', () => {
  assert.equal(E.apsBestSixNoLO([]).aps, null);
  assert.equal(E.apsBestSixNoLO(BACHELOR_MATHS.slice(0, 5)).aps, null);
  // 7 subjects: levels 6, 5, 5, 5, 4, 6 -> sum 31 (LO 80% = 7 excluded)
  assert.equal(E.apsBestSixNoLO(BACHELOR_MATHS).aps, 31);
  // Add an 8th subject with 100% (level 7): drops level 4 (58%) -> 31 - 4 + 7 = 34
  const eight = BACHELOR_MATHS.concat([{ name: 'Information Technology', mark: 100 }]);
  assert.equal(E.apsBestSixNoLO(eight).aps, 34);
  // All 100s -> max 42
  const perfect = BACHELOR_MATHS.map(s => ({ ...s, mark: 100 }));
  assert.equal(E.apsBestSixNoLO(perfect).aps, 42);
  // All 0s -> APS 6 (6 * level 1), NSC Did Not Meet Minimum Pass
  const zeros = BACHELOR_MATHS.map(s => ({ ...s, mark: 0 }));
  assert.equal(E.apsBestSixNoLO(zeros).aps, 6);
  assert.equal(E.evaluateNsc(zeros).passLevel, 'Did Not Meet Minimum NSC Pass');
});

test('4. Home Language detected by name even if isHomeLanguage flag is omitted, and HL < 40% fails NSC', () => {
  const noFlag = BACHELOR_MATHS.map(({ isHomeLanguage, ...rest }) => rest);
  assert.equal(E.evaluateNsc(noFlag).passLevel, "Bachelor's Pass");
  assert.equal(E.apsUMP(noFlag).aps, 34.5);

  const hlFail = BACHELOR_MATHS.map(s => s.isHomeLanguage ? { ...s, mark: 39 } : { ...s, mark: 92 });
  assert.equal(E.evaluateNsc(hlFail).passLevel, 'Did Not Meet Minimum NSC Pass');
});

test('5. Maths Literacy (95%) MUST NOT satisfy pure Mathematics (60%) requirement', () => {
  const mathsLitLearner = [
    { name: 'isiNdebele Home Language', mark: 78, isHomeLanguage: true },
    { name: 'English First Additional Language', mark: 68 },
    { name: 'Mathematical Literacy', mark: 95 },
    { name: 'Business Studies', mark: 72 },
    { name: 'Tourism', mark: 80 },
    { name: 'Geography', mark: 66 },
    { name: 'Life Orientation', mark: 75, isLifeOrientation: true },
  ];
  const bscCs = {
    id: 'up_bsc_cs', name: 'BSc Computer Science', institution: 'UP',
    verificationStatus: 'verified', entryBasis: 'nsc', apsMethod: 'nsc_best6_noLO',
    minPassLevel: "Bachelor's Pass", minAps: 30,
    subjectRequirements: [
      { anyOf: ['English Home Language', 'English First Additional Language'], minMark: 60 },
      { anyOf: ['Mathematics'], minMark: 60 },
    ],
  };
  const resPure = E.evaluateProgramme(mathsLitLearner, bscCs);
  assert.equal(resPure.status, 'Not Currently Eligible');
  assert.ok(resPure.missing.some(m => m.includes('Missing subject: Mathematics')));

  const dipTourism = {
    id: 'tut_dip_tour', name: 'Diploma in Tourism', institution: 'TUT',
    verificationStatus: 'verified', entryBasis: 'nsc', apsMethod: 'nsc_best6_noLO',
    minPassLevel: 'Diploma Pass', minAps: 22,
    subjectRequirements: [
      { anyOf: ['English Home Language', 'English First Additional Language'], minMark: 50 },
      { anyOf: ['Mathematics', 'Mathematical Literacy'], minMark: 40 },
    ],
  };
  const resFlex = E.evaluateProgramme(mathsLitLearner, dipTourism);
  assert.equal(resFlex.status, 'Meets Minimums');
});

test('6. UMP LO ÷ 2 policy in catalogue.js matches UMP official APS', () => {
  // Best 6 excl LO = 25 (levels: 5, 4, 4, 4, 4, 4); LO = 75% (level 6 -> +3) => UMP APS = 28
  const umpLearner = [
    { name: 'English Home Language', mark: 62, isHomeLanguage: true },
    { name: 'siSwati First Additional Language', mark: 55 },
    { name: 'Mathematics', mark: 52 },
    { name: 'Life Sciences', mark: 54 },
    { name: 'Geography', mark: 51 },
    { name: 'Agricultural Sciences', mark: 50 },
    { name: 'Life Orientation', mark: 75, isLifeOrientation: true },
  ];
  assert.equal(E.apsBestSixNoLO(umpLearner).aps, 25);
  assert.equal(E.apsUMP(umpLearner).aps, 28);

  const umpProg = {
    name: 'Diploma in ICT', minPassLevel: 'Diploma Pass', minAps: 28, status: 'verified',
    subjects: [{ anyOf: ['English Home Language', 'English First Additional Language'], minMark: 50 }],
    _inst: { id: 'ump', loPolicy: 'half' },
  };
  const catRes = CAT.evaluate(umpLearner, umpProg, E);
  assert.equal(catRes.apsMine, 28);
  assert.equal(catRes.tier, 'qualify');
});

test('7. NC(V) Level 4 Gazette 32743 articulation & TVET open-entry routes', () => {
  // NC(V) L4 Bachelor's Pass: 3 fundamentals >= 60% + 4 vocational >= 70%
  const ncvBach = MZ_EVOLVED.evaluateNcvL4Articulation({
    fundamentals: [{ name: 'English FAL', mark: 62 }, { name: 'Mathematics', mark: 65 }, { name: 'Life Orientation', mark: 68 }],
    vocationals: [{ name: 'V1', mark: 70 }, { name: 'V2', mark: 74 }, { name: 'V3', mark: 72 }, { name: 'V4', mark: 78 }],
  });
  assert.equal(ncvBach.tier, 'BACHELOR');

  // NC(V) L4 Diploma Pass: 3 fundamentals >= 50% + 4 vocational >= 60%
  const ncvDip = MZ_EVOLVED.evaluateNcvL4Articulation({
    fundamentals: [{ name: 'English FAL', mark: 52 }, { name: 'Mathematics', mark: 55 }, { name: 'Life Orientation', mark: 58 }],
    vocationals: [{ name: 'V1', mark: 60 }, { name: 'V2', mark: 64 }, { name: 'V3', mark: 62 }, { name: 'V4', mark: 68 }],
  });
  assert.equal(ncvDip.tier, 'DIPLOMA');

  // TVET open-entry (Grade 9 / NC(V)) remains open even for a learner with 0% NSC marks
  const zeros = BACHELOR_MATHS.map(s => ({ ...s, mark: 0 }));
  const tvetCourse = {
    id: 'tvet_ncv_it', name: 'NC(V) Information Technology & Computer Science L2',
    verificationStatus: 'verified', entryBasis: 'grade9',
    entryNote: 'Grade 9 pass required; TVET college sets placement.',
    _inst: { id: 'nkangala_tvet', loPolicy: 'none' },
  };
  assert.equal(E.evaluateProgramme(zeros, tvetCourse).status, 'Possible - Verify Rules');
  assert.equal(CAT.evaluate(zeros, tvetCourse, E).tier, 'open');
});

test('8. Locale decimal comma marks (65,5) & trailing % parse cleanly in engine and catalogue', () => {
  assert.equal(E.parseMark('65,5'), 65.5);
  assert.equal(E.parseMark('79,9%'), 79.9);
  assert.equal(E.hasMark({ name: 'Mathematics', mark: '65,5' }), true);
  assert.equal(E.levelFromMark('65,5'), 5);
  assert.equal(E.levelFromMark('80,0'), 7);
  const commaSubs = BACHELOR_MATHS.map(s => ({ ...s, mark: String(s.mark) + ',5' }));
  assert.equal(E.evaluateNsc(commaSubs).passLevel, "Bachelor's Pass");
  assert.equal(E.apsBestSixNoLO(commaSubs).aps, 31);
});

test('9. OCR parseStatementText handles decimal % (65.5% and 65,5%) without truncating to 5%', () => {
  const dot = E.parseStatementText('Mathematics 65.5% 5');
  assert.equal(dot.length, 1);
  assert.equal(dot[0].name, 'Mathematics');
  assert.equal(dot[0].mark, 65.5);
  assert.equal(dot[0].level, 5);

  const comma = E.parseStatementText('Physical Sciences 65,5% 5');
  assert.equal(comma.length, 1);
  assert.equal(comma[0].name, 'Physical Sciences');
  assert.equal(comma[0].mark, 65.5);
});

test('10. OCR parseStatementText detects low 0-7% mark paired with level 1', () => {
  const low = E.parseStatementText('Physical Sciences 5 1');
  assert.equal(low.length, 1);
  assert.equal(low[0].mark, 5);
  assert.equal(low[0].level, 1);
  assert.equal(low[0].confidence, 'review');
});

test('11. Technical Mathematics is NEVER misclassified as pure Mathematics', () => {
  const m = E.matchSubject('Technical Mathematics');
  assert.equal(m.name, 'Technical Mathematics');
  assert.equal(E.flags({ name: 'Technical Mathematics' }).isTechMath, true);
  assert.equal(E.flags({ name: 'Technical Mathematics' }).isMath, false);

  const techLearner = BACHELOR_MATHS.map(s => s.name === 'Mathematics' ? { ...s, name: 'Technical Mathematics', mark: 88 } : s);
  const pureMathProg = {
    id: 'up_eng', name: 'BEng Mechanical', verificationStatus: 'verified', entryBasis: 'nsc',
    apsMethod: 'nsc_best6_noLO', minPassLevel: "Bachelor's Pass", minAps: 30,
    subjectRequirements: [{ anyOf: ['Mathematics'], minMark: 70 }],
  };
  assert.equal(E.evaluateProgramme(techLearner, pureMathProg).status, 'Not Currently Eligible');
  assert.equal(E.apsUMP(techLearner).aps, 36.5);
});

test('12. Technical Sciences and South African Sign Language HL are recognized', () => {
  assert.equal(E.matchSubject('Technical Sciences').name, 'Technical Sciences');
  const sasl = E.matchSubject('South African Sign Language Home Language');
  assert.equal(sasl.name, 'South African Sign Language Home Language');
  assert.equal(E.flags({ name: sasl.name }).isHL, true);
});

test('13. reverseGapPlanner rejects Technical Mathematics for pure Mathematics & picks highest matching subject', () => {
  const gap = MZ_EVOLVED.reverseGapPlanner(
    { name: 'BSc CS', minAps: 30, requiredSubjects: [{ anyOf: ['Mathematics'], minMark: 65 }] },
    [{ name: 'Technical Mathematics', mark: 90 }],
    { score: 34 }
  );
  assert.equal(gap.readyNow, false);
  assert.equal(gap.subjectGaps[0].blockerType, 'SUBJECT_SWITCH_NEEDED');

  const bestOfTwo = MZ_EVOLVED.reverseGapPlanner(
    { name: 'BA', minAps: 24, requiredSubjects: [{ anyOf: ['English Home Language', 'English First Additional Language'], minMark: 60 }] },
    [{ name: 'English First Additional Language', mark: 45 }, { name: 'English Home Language', mark: 72 }],
    { score: 30 }
  );
  assert.equal(bestOfTwo.readyNow, true);
});

test('14. NC(V) L4 rejects blank/null marks instead of treating them as 0%', () => {
  const incomplete = MZ_EVOLVED.evaluateNcvL4Articulation({
    fundamentals: [{ name: 'English FAL', mark: '' }, { name: 'Mathematics', mark: 65 }, { name: 'Life Orientation', mark: 68 }],
    vocationals: [{ name: 'V1', mark: 70 }, { name: 'V2', mark: 74 }, { name: 'V3', mark: 72 }, { name: 'V4', mark: 78 }],
  });
  assert.equal(incomplete.tier, 'INCOMPLETE');
});

test('15. Reverse APS solver rejects blank/null marks & supports comma decimals', () => {
  const blankSubs = BACHELOR_MATHS.map((s, i) => i === 0 ? { ...s, mark: '' } : s);
  const resBlank = MZ_PLANNER.solveMinimumMarkPlan(blankSubs, 35);
  assert.equal(resBlank.possible, false);

  const commaSubs = BACHELOR_MATHS.map(s => ({ ...s, mark: String(s.mark) + ',5' }));
  const resComma = MZ_PLANNER.solveMinimumMarkPlan(commaSubs, 32);
  assert.equal(resComma.possible, true);
  assert.equal(resComma.currentAps, 31);
});

test('16. getNextBestAction does NOT warn Home Language < 40% when mark is blank/null', () => {
  const blankHL = BACHELOR_MATHS.map(s => s.isHomeLanguage ? { ...s, mark: null } : s);
  const action = RES.getNextBestAction(blankHL, { evidenceVault: [{ id: 1 }], docChecklist: { a: true } }, E.evaluateNsc);
  assert.ok(!action.title.includes('below 40%'));
});

test('17. findBottlenecks skips blank/null subjects instead of simulating 0 -> 12%', () => {
  const blankSub = BACHELOR_MATHS.map((s, i) => i === 2 ? { ...s, mark: null } : s);
  const out = RES.findBottlenecks(blankSub, [], E.evaluateProgramme);
  assert.equal(out.length, 0);
});

test('18. Wits / UCT / UFS custom APS methods return null with official-calculator guidance', () => {
  for (const method of ['wits_weighted', 'uct_fps', 'ufs_ap']) {
    const r = E.computeApsFor(method, BACHELOR_MATHS);
    assert.equal(r.aps, null);
    assert.ok(/calculator/i.test(r.reason));
  }
});

test('19. Floating-point gap display in catalogue.js rounds cleanly without IEEE-754 noise', () => {
  const decLearner = BACHELOR_MATHS.map(s => s.name === 'Mathematics' ? { ...s, mark: '65,3' } : s);
  const prog = {
    name: 'BSc Maths', minPassLevel: "Bachelor's Pass", minAps: 28, status: 'verified',
    subjects: [{ anyOf: ['Mathematics'], minMark: 70 }],
    _inst: { id: 'up', loPolicy: 'excluded' },
  };
  const r = CAT.evaluate(decLearner, prog, E);
  assert.ok(r.gaps.some(g => g.includes('short by 4.7)')), 'Expected clean 4.7, got: ' + JSON.stringify(r.gaps));
});

test('20. LOLT failure (English < 30% while HL isiZulu >= 40%) fails English-medium NSC check', () => {
  const noEnglish = [
    { name: 'isiZulu Home Language', mark: 78, isHomeLanguage: true },
    { name: 'English First Additional Language', mark: 25 },
    { name: 'Mathematics', mark: 65 },
    { name: 'Physical Sciences', mark: 62 },
    { name: 'Life Sciences', mark: 68 },
    { name: 'Geography', mark: 70 },
    { name: 'Life Orientation', mark: 80, isLifeOrientation: true },
  ];
  const nsc = E.nscPass(noEnglish, 'English');
  assert.equal(nsc.loltOk, false);
  assert.equal(nsc.passLevel, 'Did Not Meet Minimum NSC Pass');
});
