import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MZ_EVOLVED } from '../js/core/pathways_v2_engines.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function loadBrowserEngines() {
  const sandbox = { console, Math, Date, Number, String, Array, Object, Set, RegExp, JSON };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/engine.js'), 'utf8'), sandbox);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/catalogue.js'), 'utf8'), sandbox);
  return { E: sandbox.MZENGINE || sandbox, CAT: sandbox.MZCAT };
}

const { E, CAT } = loadBrowserEngines();

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
