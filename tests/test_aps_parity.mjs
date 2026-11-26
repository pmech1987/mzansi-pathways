import test from 'node:test';
import assert from 'node:assert/strict';
import { MZ_APS_ENGINE } from '../js/core/aps_engine.js';

const SEVEN_WITH_BEST_LAST = [
  { name: 'English Home Language', mark: 50, isHL: true },
  { name: 'Afrikaans First Additional Language', mark: 50, isFAL: true },
  { name: 'Mathematics', mark: 50, isMath: true },
  { name: 'Life Orientation', mark: 80, isLO: true },
  { name: 'Geography', mark: 50 },
  { name: 'History', mark: 50 },
  { name: 'Physical Sciences', mark: 85 },
  { name: 'Information Technology', mark: 40 }
];

test('T1: Best-six excludes LO and picks highest mark even when entered last', () => {
  const res = MZ_APS_ENGINE.computeForUniversity('up', SEVEN_WITH_BEST_LAST);
  assert.equal(res.score, 27);
  assert.equal(res.max, 42);
});

test('T2 & T3: UMP halves Life Orientation level and keeps best 3 electives', () => {
  const res = MZ_APS_ENGINE.computeForUniversity('ump', SEVEN_WITH_BEST_LAST);
  assert.equal(res.score, 30.5);
  assert.equal(res.max, 45.5);
});

test('T4: Wits weighted scale applies +2 bonus to Eng & Maths >=60% and LO 0-4', () => {
  const marks = [
    { name: 'English Home Language', mark: 92, isHL: true },
    { name: 'isiZulu First Additional Language', mark: 82, isFAL: true },
    { name: 'Mathematics', mark: 75, isMath: true },
    { name: 'Physical Sciences', mark: 65 },
    { name: 'Life Sciences', mark: 55 },
    { name: 'Geography', mark: 35 },
    { name: 'Life Orientation', mark: 85, isLO: true }
  ];
  const res = MZ_APS_ENGINE.computeForUniversity('wits', marks);
  assert.equal(res.score, 37);
});

test('T5: Bare Bachelor pass returns Bachelor endorsement with APS 21', () => {
  const bare = [
    { name: 'English Home Language', mark: 40, isHL: true },
    { name: 'isiZulu First Additional Language', mark: 30, isFAL: true },
    { name: 'Mathematical Literacy', mark: 50, isMathLit: true },
    { name: 'Life Orientation', mark: 30, isLO: true },
    { name: 'Business Studies', mark: 50 },
    { name: 'History', mark: 50 },
    { name: 'Tourism', mark: 50 }
  ];
  assert.equal(MZ_APS_ENGINE.evaluateNscPass(bare, 'English').code, 'BACHELOR');
  assert.equal(MZ_APS_ENGINE.computeForUniversity('up', bare).score, 21);
});

test('T6: Unverified programme NEVER returns green verdict', () => {
  const prog = { institutionId: 'up', minAps: 20, verificationStatus: 'pending_review', closes: '2027-09-30', requiredSubjects: [] };
  const verdict = MZ_APS_ENGINE.evaluateProgramme(prog, SEVEN_WITH_BEST_LAST, { now: new Date('2026-11-26T10:00:00Z') });
  assert.equal(verdict.tone, 'amber');
  assert.equal(verdict.verdict, 'POSSIBLE_UNVERIFIED');
});

test('T7: ISO deadline evaluation classifies closed vs closing soon deterministically', () => {
  const ref = new Date('2026-11-26T12:00:00Z');
  assert.equal(MZ_APS_ENGINE.evaluateDeadline('2026-06-30', ref).status, 'CLOSED');
  assert.equal(MZ_APS_ENGINE.evaluateDeadline('2026-11-30', ref).status, 'CLOSING_SOON');
  assert.equal(MZ_APS_ENGINE.evaluateDeadline('2026-11-30', ref).daysLeft, 4);
});

test('T8: All 26 public universities are registered in UNIVERSITY_REGISTRY', () => {
  assert.equal(Object.keys(MZ_APS_ENGINE.UNIVERSITY_REGISTRY).length, 26);
});
