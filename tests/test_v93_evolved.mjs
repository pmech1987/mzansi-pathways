import test from 'node:test';
import assert from 'node:assert/strict';
import { MZ_EVOLVED } from '../js/core/pathways_v2_engines.js';
import { MZ_PLANNER } from '../js/core/reverse_aps_solver.js';
import { MZ_SEARCH } from '../js/data/bm25_shard_search.js';
import { MZ_DOM } from '../js/core/trusted_dom.js';

test('NC(V) L4 statutory Bachelor articulation (3 fundamentals >=60% + 4 vocationals >=70%)', () => {
  const res = MZ_EVOLVED.evaluateNcvL4Articulation({
    fundamentals: [{ name: 'English FAL', mark: 65 }, { name: 'Mathematics', mark: 62 }, { name: 'Life Orientation', mark: 70 }],
    vocationals: [{ name: 'V1', mark: 72 }, { name: 'V2', mark: 75 }, { name: 'V3', mark: 70 }, { name: 'V4', mark: 80 }]
  });
  assert.equal(res.tier, 'BACHELOR');
});

test('Funza Lushaka 2027 enforces age <=30, 4-year BEd, and returning deadline', () => {
  const ok = MZ_EVOLVED.evaluateFunzaLushaka2027({
    isSaCitizen: true, ageOnMarch31_2027: 20, isReturningBursar: false,
    hasPublicUniStudentNo: true, isFourYearBEd: true, prioritySubjectCount: 2,
    now: new Date('2026-11-26T12:00:00+02:00')
  });
  assert.equal(ok.eligible, true);
  const pgce = MZ_EVOLVED.evaluateFunzaLushaka2027({ isFourYearBEd: false, hasPublicUniStudentNo: true, now: new Date('2026-11-26T12:00:00+02:00') });
  assert.equal(pgce.eligible, false);
});

test('NSFAS appeal enforces 15-day FTEN window and Propensity Letter at N+1 with <=50% credits left', () => {
  const prop = MZ_EVOLVED.evaluateNsfasAppeal({ studentType: 'SENIOR', daysSinceOutcome: 10, yearsFunded: 4, minQualYears: 3, remainingFinalYearCreditsPct: 40 });
  assert.equal(prop.canAppeal, true);
  assert.equal(prop.requiresPropensityLetter, true);
  const expired = MZ_EVOLVED.evaluateNsfasAppeal({ studentType: 'FTEN', daysSinceOutcome: 20 });
  assert.equal(expired.canAppeal, false);
});

test('Reverse-APS solver finds exact +5% minimum delta from APS 27 to APS 30', () => {
  const subs = [
    { name: 'English HL', mark: 67 },
    { name: 'isiZulu FAL', mark: 78 },
    { name: 'Mathematics', mark: 58 },
    { name: 'Physical Sciences', mark: 64 },
    { name: 'Life Sciences', mark: 59 },
    { name: 'Geography', mark: 48 },
    { name: 'Life Orientation', mark: 80, isLO: true }
  ];
  const plan = MZ_PLANNER.solveMinimumMarkPlan(subs, 30, 'nsc_42');
  assert.equal(plan.possible, true);
  assert.equal(plan.currentAps, 27);
  assert.equal(plan.totalPctNeeded, 5);
  assert.equal(plan.changes.every((c) => c.remarkCandidate), true);
});

test('Offline BM25 prefix search ranks matching SA programme first', () => {
  MZ_SEARCH.indexDocuments([
    { name: 'Diploma in Nursing R171', institutionName: 'Mpumalanga College of Nursing', province: 'Mpumalanga' },
    { name: 'BSc Computer Science', institutionName: 'University of Pretoria', province: 'Gauteng' }
  ]);
  const hits = MZ_SEARCH.query('mpumalanga nurs');
  assert.equal(hits.length, 1);
  assert.equal(hits[0].name, 'Diploma in Nursing R171');
});

test('Trusted Types DOM gate blocks external script URLs and allows local ./js/ modules', () => {
  assert.equal(MZ_DOM.validateScriptUrl('./js/core/aps_engine.js'), './js/core/aps_engine.js');
  assert.throws(() => MZ_DOM.validateScriptUrl('https://evil.example/x.js'));
});
