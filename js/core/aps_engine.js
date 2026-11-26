/* js/core/aps_engine.js — Verified 26-University APS, DBE NSC Pass v2 & ISO Deadline Engine */
export const MZ_APS_ENGINE = (() => {
  'use strict';

  const NSC_LEVEL = (mark) => {
    const m = Math.max(0, Math.min(100, Number(mark)));
    if (!Number.isFinite(m)) return null;
    if (m >= 80) return 7;
    if (m >= 70) return 6;
    if (m >= 60) return 5;
    if (m >= 50) return 4;
    if (m >= 40) return 3;
    if (m >= 30) return 2;
    return 1;
  };

  const EIGHT_PT_LEVEL = (mark, zeroBelow = 0) => {
    const m = Math.max(0, Math.min(100, Number(mark)));
    if (!Number.isFinite(m) || m < zeroBelow) return 0;
    if (m >= 90) return 8;
    if (m >= 80) return 7;
    if (m >= 70) return 6;
    if (m >= 60) return 5;
    if (m >= 50) return 4;
    if (m >= 40) return 3;
    if (m >= 30) return 2;
    return 1;
  };

  function validSubjects(subjects = []) {
    return subjects.filter(
      (s) => s && s.mark !== null && s.mark !== '' && Number.isFinite(Number(s.mark)) && Number(s.mark) >= 0 && Number(s.mark) <= 100
    ).map((s) => ({ ...s, mark: Number(s.mark) }));
  }

  function isEnglish(s) {
    return /\benglish\b/i.test(String(s.name || ''));
  }

  function sumTop(arr, n) {
    return [...arr].sort((a, b) => b - a).slice(0, n).reduce((a, b) => a + b, 0);
  }

  function evaluateNscPass(rawSubjects, lolt = 'English') {
    const subs = validSubjects(rawSubjects);
    if (subs.length < 7) {
      return { level: null, code: 'INCOMPLETE', reason: 'Enter all 7 NSC subjects to evaluate your official pass endorsement.' };
    }
    const hl = subs.find((s) => s.isHL);
    const nonLo = subs.filter((s) => !s.isLO);
    const passed30 = subs.filter((s) => s.mark >= 30).length;
    const loltOk = subs.some(
      (s) => (s.isHL || s.isFAL) && String(s.name || '').toLowerCase().includes(lolt.toLowerCase()) && s.mark >= 30
    );
    if (!hl || hl.mark < 40 || passed30 < 6) {
      return { level: 'No NSC Pass Endorsement', code: 'NO_PASS', loltOk, reason: 'Requires Home Language >= 40% and at least 6 of 7 subjects >= 30%.' };
    }
    const nonLo50 = nonLo.filter((s) => s.mark >= 50).length;
    const nonLoNonHl50 = nonLo.filter((s) => !s.isHL && s.mark >= 50).length;
    const nonLo40 = nonLo.filter((s) => s.mark >= 40).length;

    if (nonLo50 >= 4 && loltOk) {
      const borderlineNote = nonLoNonHl50 < 4 ? 'Home Language counted among the four 50%+ subjects; confirm on your DBE certificate.' : null;
      return { level: "Bachelor's Pass", code: 'BACHELOR', loltOk, borderlineNote };
    }
    if (nonLo40 >= 4 && loltOk) return { level: 'Diploma Pass', code: 'DIPLOMA', loltOk, borderlineNote: null };
    if (nonLo40 >= 3 && loltOk) return { level: 'Higher Certificate Pass', code: 'HIGHER_CERT', loltOk, borderlineNote: null };
    if (!loltOk) return { level: 'NSC Pass (LOLT Check Needed)', code: 'LOLT_WARNING', loltOk: false, reason: `Requires >= 30% in ${lolt}.` };
    return { level: 'NSC Pass Only', code: 'NSC_ONLY', loltOk, borderlineNote: null };
  }

  const METHODS = {
    nsc_best6_42(subs) {
      const nonLo = subs.filter((s) => !s.isLO);
      if (nonLo.length < 6) return { score: null, max: 42, reason: 'Need 6 non-LO subjects' };
      return { score: sumTop(nonLo.map((s) => NSC_LEVEL(s.mark)), 6), max: 42, scale: '1–7 best 6 (excl. LO)' };
    },
    tut_best6_42(subs) {
      const nonLo = subs.filter((s) => !s.isLO);
      if (nonLo.length < 6) return { score: null, max: 42, reason: 'Need 6 non-LO subjects' };
      const pts = nonLo.map((s) => (s.mark < 30 ? 0 : NSC_LEVEL(s.mark)));
      return { score: sumTop(pts, 6), max: 42, scale: '1–7 best 6 (excl. LO; Level 1 discarded)' };
    },
    eight_pt_best6_48(subs, opts = {}) {
      const includeLo = Boolean(opts.includeLo);
      const pool = includeLo ? subs : subs.filter((s) => !s.isLO);
      const count = includeLo ? 7 : 6;
      if (pool.length < count) return { score: null, max: count * 8, reason: `Need ${count} eligible subjects` };
      return { score: sumTop(pool.map((s) => EIGHT_PT_LEVEL(s.mark, 0)), count), max: count * 8, scale: `8-pt ladder, best ${count}` };
    },
    wits_weighted_56(subs) {
      const lo = subs.find((s) => s.isLO);
      const nonLo = subs.filter((s) => !s.isLO);
      if (nonLo.length < 6) return { score: null, max: 56, reason: 'Need 6 academic subjects + LO' };
      const loPts = !lo ? 0 : lo.mark >= 90 ? 4 : lo.mark >= 80 ? 3 : lo.mark >= 70 ? 2 : lo.mark >= 60 ? 1 : 0;
      const acadPts = nonLo.map((s) => EIGHT_PT_LEVEL(s.mark, 40) + ((isEnglish(s) || s.isMath) && s.mark >= 60 ? 2 : 0));
      return { score: sumTop(acadPts, 6) + loPts, max: 56, scale: 'Wits 7-subject weighted (Eng/Maths +2 >=60%, LO 0–4)' };
    },
    uwc_weighted_65(subs) {
      const lo = subs.find((s) => s.isLO);
      const nonLo = subs.filter((s) => !s.isLO);
      if (nonLo.length < 6) return { score: null, max: 65, reason: 'Need 6 academic subjects + LO' };
      const weighted = (m) => (m < 20 ? 0 : m < 30 ? 1 : m < 40 ? 3 : m < 50 ? 5 : m < 60 ? 7 : m < 70 ? 9 : m < 80 ? 11 : m < 90 ? 13 : 15);
      const loPts = !lo ? 0 : lo.mark >= 80 ? 3 : lo.mark >= 50 ? 2 : lo.mark >= 20 ? 1 : 0;
      const acadPts = nonLo.map((s) => ((isEnglish(s) || s.isMath) ? weighted(s.mark) : (s.mark < 20 ? 0 : EIGHT_PT_LEVEL(s.mark, 20))));
      return { score: sumTop(acadPts, 6) + loPts, max: 65, scale: 'UWC weighted 7-subject (Eng/Maths up to 15, Other 1–8, LO 0–3)' };
    },
    ufs_ap_49(subs) {
      const lo = subs.find((s) => s.isLO);
      const nonLo = subs.filter((s) => !s.isLO);
      if (nonLo.length < 6) return { score: null, max: 49, reason: 'Need 6 academic subjects' };
      return { score: sumTop(nonLo.map((s) => EIGHT_PT_LEVEL(s.mark, 30)), 6) + (lo && lo.mark >= 60 ? 1 : 0), max: 49, scale: 'UFS AP (8-pt, <30%=0, +1 LO >=60%)' };
    },
    cut_ap_49(subs) {
      const lo = subs.find((s) => s.isLO);
      const nonLo = subs.filter((s) => !s.isLO);
      if (nonLo.length < 6) return { score: null, max: 49, reason: 'Need 6 academic subjects' };
      return { score: sumTop(nonLo.map((s) => EIGHT_PT_LEVEL(s.mark, 0)), 6) + (lo && lo.mark >= 50 ? 1 : 0), max: 49, scale: 'CUT scale (8-pt best 6 + 1 LO >=50%)' };
    },
    uct_fps_600(subs) {
      const nonLo = subs.filter((s) => !s.isLO);
      if (nonLo.length < 6) return { score: null, max: 600, reason: 'Need 6 non-LO subjects' };
      return { score: sumTop(nonLo.map((s) => (s.mark < 40 ? 0 : s.mark)), 6), max: 600, scale: 'UCT FPS (raw % best 6 excl. LO; <40%=0)' };
    },
    stellenbosch_avg_100(subs) {
      const nonLo = subs.filter((s) => !s.isLO);
      if (nonLo.length < 6) return { score: null, max: 100, reason: 'Need 6 non-LO subjects' };
      return { score: Number((sumTop(nonLo.map((s) => s.mark), 6) / 6).toFixed(1)), max: 100, unit: '%', scale: 'Stellenbosch NSC Aggregate %' };
    },
    nmu_as_600(subs, opts = {}) {
      const lo = subs.find((s) => s.isLO);
      const nonLo = subs.filter((s) => !s.isLO);
      if (nonLo.length < 6) return { score: null, max: 600, reason: 'Need 6 non-LO subjects' };
      const qBonus = opts.isQuintile1to3 && lo && lo.mark >= 50 ? 7 : 0;
      return { score: sumTop(nonLo.map((s) => s.mark), 6) + qBonus, max: opts.isQuintile1to3 ? 607 : 600, scale: 'NMU Applicant Score' };
    },
    pct_div10_60(subs, opts = {}) {
      const nonLo = subs.filter((s) => !s.isLO);
      if (nonLo.length < 6) return { score: null, max: 60, reason: 'Need 6 non-LO subjects' };
      const pts = nonLo.map((s) => (s.mark < 40 ? 0 : s.mark / 10));
      const lo = subs.find((s) => s.isLO);
      return { score: Number(sumTop(pts, 6).toFixed(1)), max: 60, warning: opts.requireLo50 && (!lo || lo.mark < 50) ? 'Rhodes requires LO >= 50%.' : null, scale: 'Best 6 raw % ÷ 10' };
    },
    cput_methods(subs, opts = {}) {
      const method = opts.cputMethod || 1;
      const nonLo = subs.filter((s) => !s.isLO);
      const eng = nonLo.find(isEnglish);
      if (!eng) return { score: null, max: 60, reason: 'CPUT requires English' };
      if (method === 2) {
        const math = nonLo.find((s) => s.isMath);
        const phys = nonLo.find((s) => /physical\s*science/i.test(s.name));
        if (!math || !phys) return { score: null, max: 60, reason: 'CPUT Method 2 requires Maths & Physical Sciences' };
        const fourth = sumTop(nonLo.filter((s) => s !== eng && s !== math && s !== phys).map((s) => s.mark), 1);
        return { score: Number(((eng.mark + 2 * math.mark + 2 * phys.mark + fourth) / 10).toFixed(1)), max: 60, scale: 'CPUT Method 2' };
      }
      if (method === 3) {
        const math = nonLo.find((s) => s.isMath);
        const acc = nonLo.find((s) => /\baccounting\b/i.test(s.name));
        if (!math || !acc) return { score: null, max: 80, reason: 'CPUT Method 3 requires Maths & Accounting' };
        const next3 = sumTop(nonLo.filter((s) => s !== eng && s !== math && s !== acc).map((s) => s.mark), 3);
        return { score: Number(((eng.mark + 2 * math.mark + 2 * acc.mark + next3) / 10).toFixed(1)), max: 80, scale: 'CPUT Method 3' };
      }
      if (nonLo.length < 6) return { score: null, max: 60, reason: 'Need 6 non-LO subjects' };
      return { score: Number((sumTop(nonLo.map((s) => s.mark), 6) / 10).toFixed(1)), max: 60, scale: 'CPUT Method 1' };
    },
    ump_lo_half_45_5(subs) {
      const hl = subs.find((s) => s.isHL);
      const fal = subs.find((s) => s.isFAL);
      const mathOrLit = subs.find((s) => s.isMath) || subs.find((s) => s.isMathLit);
      const lo = subs.find((s) => s.isLO);
      if (!hl || !fal || !mathOrLit || !lo) return { score: null, max: 45.5, reason: 'Need HL, FAL, Maths/Maths Lit, and LO' };
      const used = new Set([hl, fal, mathOrLit, lo]);
      const electives = subs.filter((s) => !used.has(s)).map((s) => NSC_LEVEL(s.mark));
      if (electives.length < 3) return { score: null, max: 45.5, reason: 'Need 3 electives' };
      const total = NSC_LEVEL(hl.mark) + NSC_LEVEL(fal.mark) + NSC_LEVEL(mathOrLit.mark) + (NSC_LEVEL(lo.mark) / 2) + sumTop(electives, 3);
      return { score: total, max: 45.5, usedMathLit: !subs.find((s) => s.isMath), scale: 'UMP 7-subject (LO ÷ 2)' };
    },
    spu_bonus_56(subs) {
      const lo = subs.find((s) => s.isLO);
      const nonLo = subs.filter((s) => !s.isLO);
      if (nonLo.length < 6) return { score: null, max: 56, reason: 'Need 6 academic subjects + LO' };
      const loPts = !lo ? 0 : lo.mark >= 90 ? 4 : lo.mark >= 80 ? 3 : lo.mark >= 70 ? 2 : lo.mark >= 60 ? 1 : 0;
      const bonusFor = (m) => (m >= 60 ? 2 : m >= 40 ? 1 : 0);
      const acadPts = nonLo.map((s) => EIGHT_PT_LEVEL(s.mark, 0) + ((s.isHL || s.isMath) ? bonusFor(s.mark) : 0));
      return { score: sumTop(acadPts, 6) + loPts, max: 56, scale: 'SPU 8-pt + HL/Maths bonus + LO (0–4)' };
    },
    smu_full7_49(subs) {
      if (subs.length < 7) return { score: null, max: 49, reason: 'Need all 7 subjects including LO' };
      return { score: sumTop(subs.map((s) => NSC_LEVEL(s.mark)), 7), max: 49, scale: 'SMU full 7 subjects' };
    },
    mut_best5_40(subs) {
      const nonLo = subs.filter((s) => !s.isLO);
      if (nonLo.length < 5) return { score: null, max: 40, reason: 'Need at least 5 non-LO subjects' };
      return { score: sumTop(nonLo.map((s) => EIGHT_PT_LEVEL(s.mark, 40)), 5), max: 40, warning: 'Verify MUT Best 5 vs Best 6 in CAO Handbook.', scale: 'MUT 8-pt Best 5 excl. LO' };
    },
    ufh_conflict_guard() {
      return { score: null, max: null, status: 'CONFLICT_VERIFY_OFFICIAL', reason: 'Published guides conflict on UFH rules. Verify directly on ufh.ac.za.' };
    }
  };

  const UNIVERSITY_REGISTRY = {
    up: 'nsc_best6_42', uj: 'nsc_best6_42', unisa: 'nsc_best6_42', ul: 'nsc_best6_42', dut: 'nsc_best6_42',
    tut: 'tut_best6_42',
    ukzn: 'eight_pt_best6_48', nwu: 'eight_pt_best6_48', vut: 'eight_pt_best6_48', unizulu: 'eight_pt_best6_48', wsu: 'eight_pt_best6_48',
    wits: 'wits_weighted_56', uwc: 'uwc_weighted_65', ufs: 'ufs_ap_49', cut: 'cut_ap_49',
    uct: 'uct_fps_600', su: 'stellenbosch_avg_100', nmu: 'nmu_as_600',
    ru: 'pct_div10_60', univen: 'pct_div10_60', cput: 'cput_methods',
    ump: 'ump_lo_half_45_5', spu: 'spu_bonus_56', smu: 'smu_full7_49',
    mut: 'mut_best5_40', ufh: 'ufh_conflict_guard'
  };

  function computeForUniversity(uniId, rawSubjects, opts = {}) {
    const subs = validSubjects(rawSubjects);
    const key = UNIVERSITY_REGISTRY[String(uniId || '').toLowerCase()];
    if (!key || !METHODS[key]) return { score: null, max: null, reason: 'APS method not verified for this institution.' };
    return METHODS[key](subs, uniId === 'ru' ? { ...opts, requireLo50: true } : opts);
  }

  function scoreAll26Universities(rawSubjects, opts = {}) {
    return Object.keys(UNIVERSITY_REGISTRY).map((id) => ({ institutionId: id, ...computeForUniversity(id, rawSubjects, opts) }));
  }

  function evaluateDeadline(isoCloseDate, referenceDate = new Date()) {
    if (!isoCloseDate || !/^\d{4}-\d{2}-\d{2}$/.test(isoCloseDate)) {
      return { status: 'UNKNOWN', daysLeft: null, label: 'Verify closing date on official portal' };
    }
    const nowSast = new Date(referenceDate.toLocaleString('en-US', { timeZone: 'Africa/Johannesburg' }));
    const todayMidnight = new Date(nowSast.getFullYear(), nowSast.getMonth(), nowSast.getDate());
    const [y, m, d] = isoCloseDate.split('-').map(Number);
    const closeDate = new Date(y, m - 1, d);
    const daysLeft = Math.round((closeDate - todayMidnight) / 86400000);
    if (daysLeft < 0) return { status: 'CLOSED', daysLeft, label: `Closed (${isoCloseDate})` };
    if (daysLeft === 0) return { status: 'CLOSING_TODAY', daysLeft: 0, label: 'Closes TODAY (SAST)' };
    if (daysLeft <= 14) return { status: 'CLOSING_SOON', daysLeft, label: `Closes in ${daysLeft} day${daysLeft === 1 ? '' : 's'}` };
    return { status: 'OPEN', daysLeft, label: `Open until ${isoCloseDate}` };
  }

  function checkRequiredSubjects(reqs, subs) {
    const missing = [];
    for (const req of reqs) {
      const candidates = req.anyOf || [];
      const minMark = Number(req.minMark || 0);
      const matched = subs.some((s) => candidates.some((c) => String(s.name || '').toLowerCase().includes(c.toLowerCase())) && s.mark >= minMark);
      if (!matched) missing.push(`${candidates.join(' or ')} >= ${minMark}%`);
    }
    return missing;
  }

  function evaluateProgramme(programme, rawSubjects, opts = {}) {
    const deadline = evaluateDeadline(programme.closes, opts.now);
    const apsRes = computeForUniversity(programme.institutionId, rawSubjects, { ...opts, cputMethod: programme.cputMethod, includeLo: programme.includeLoOverride });
    const isVerified = programme.verificationStatus === 'verified';
    if (apsRes.score === null) return { verdict: 'VERIFY_OFFICIAL', tone: 'amber', apsRes, deadline, message: apsRes.reason };
    const gap = Number(programme.minAps) - apsRes.score;
    const missingSubjects = checkRequiredSubjects(programme.requiredSubjects || [], validSubjects(rawSubjects));
    if (gap <= 0 && missingSubjects.length === 0) {
      if (!isVerified) {
        return { verdict: 'POSSIBLE_UNVERIFIED', tone: 'amber', apsRes, deadline, message: 'Marks appear to meet provisional rules — verify exact cut-offs on the official prospectus.' };
      }
      return { verdict: 'MEETS_MINIMUMS', tone: deadline.status === 'CLOSED' ? 'neutral' : 'green', apsRes, deadline, message: 'Meets published minimum requirements. Meeting minimums never guarantees admission.' };
    }
    if (gap <= 2 && missingSubjects.length <= 1) {
      return { verdict: 'CLOSE_REACH', tone: 'amber', apsRes, gap: Math.max(0, gap), missingSubjects, deadline, message: 'Very close — test What-If, Extended Curriculum, or January remark options.' };
    }
    return { verdict: 'ALTERNATIVE_ROUTE', tone: 'blue', apsRes, gap: Math.max(0, gap), missingSubjects, deadline, message: 'Explore Higher Certificate bridging, TVET NC(V)/Occupational, or SETA learnerships.' };
  }

  return { NSC_LEVEL, evaluateNscPass, computeForUniversity, scoreAll26Universities, evaluateDeadline, evaluateProgramme, UNIVERSITY_REGISTRY };
})();
