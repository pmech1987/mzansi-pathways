/* js/core/reverse_aps_solver.js — Exact Minimum-Percentage-Delta Reverse APS & NBT Readiness */
export const MZ_PLANNER = (() => {
  'use strict';
  const SCALE_BOUNDS = {
    nsc_42: { max: 42, bounds: [30, 40, 50, 60, 70, 80], pts: (m) => (m >= 80 ? 7 : m >= 70 ? 6 : m >= 60 ? 5 : m >= 50 ? 4 : m >= 40 ? 3 : m >= 30 ? 2 : 1) },
    eight_48: { max: 48, bounds: [30, 40, 50, 60, 70, 80, 90], pts: (m) => (m >= 90 ? 8 : m >= 80 ? 7 : m >= 70 ? 6 : m >= 60 ? 5 : m >= 50 ? 4 : m >= 40 ? 3 : m >= 30 ? 2 : 1) }
  };
  function solveMinimumMarkPlan(subjects, targetAps, scaleKey = 'nsc_42') {
    const cfg = SCALE_BOUNDS[scaleKey] || SCALE_BOUNDS.nsc_42;
    const parseM = (v) => { if (v === null || v === undefined || typeof v === 'boolean') return null; const c = String(v).trim().replace(/%$/, '').trim().replace(',', '.'); if (c === '') return null; const n = Number(c); return (Number.isFinite(n) && n >= 0 && n <= 100) ? n : null; };
    const nonLo = (subjects || []).map((s) => ({ s, m: s ? parseM(s.mark) : null })).filter((x) => x.s && !x.s.isLO && !x.s.isLifeOrientation && x.m !== null).map((x) => ({ name: x.s.name, orig: x.m, mark: x.m })).sort((a, b) => b.mark - a.mark);
    if (nonLo.length < 6) return { possible: false, reason: 'Enter at least 6 non-LO subjects.' };
    if (targetAps > cfg.max) return { possible: false, reason: `Target exceeds scale maximum (${cfg.max}).` };
    const active = nonLo.slice(0, 6);
    const currentAps = active.reduce((sum, s) => sum + cfg.pts(s.mark), 0);
    if (currentAps >= targetAps) return { possible: true, alreadyMet: true, currentAps, targetAps, totalPctNeeded: 0, changes: [] };
    const gap = targetAps - currentAps;
    for (let step = 0; step < gap; step++) {
      let bestIdx = -1, bestCost = Infinity, bestNext = null;
      for (let i = 0; i < active.length; i++) {
        const nextBound = cfg.bounds.find((b) => active[i].mark < b);
        if (nextBound !== undefined && (nextBound - active[i].mark) < bestCost) {
          bestCost = nextBound - active[i].mark; bestIdx = i; bestNext = nextBound;
        }
      }
      if (bestIdx === -1) return { possible: false, reason: 'Maximum reachable APS hit.' };
      active[bestIdx].mark = bestNext;
    }
    const changes = active.filter((s) => s.mark > s.orig).map((s) => ({ name: s.name, from: s.orig, to: s.mark, deltaPct: s.mark - s.orig, deltaPts: cfg.pts(s.mark) - cfg.pts(s.orig), remarkCandidate: (s.mark - s.orig) <= 3 }));
    return { possible: true, alreadyMet: false, currentAps, targetAps, totalPctNeeded: changes.reduce((sum, c) => sum + c.deltaPct, 0), changes };
  }
  return { solveMinimumMarkPlan };
})();
