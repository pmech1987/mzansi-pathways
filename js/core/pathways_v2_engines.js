/* js/core/pathways_v2_engines.js — NC(V) L4, NBT, Funza Lushaka 2027, NSFAS Appeals, Reverse Planner & Trusted Types */
export const MZ_EVOLVED = (() => {
  'use strict';

  const domPolicy = (typeof window !== 'undefined' && window.trustedTypes && window.trustedTypes.createPolicy)
    ? window.trustedTypes.createPolicy('mzansi-dom', {
        createHTML: (input) => String(input)
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/\son[a-z]+\s*=\s*(['"]).*?\1/gi, '')
          .replace(/javascript:/gi, 'blocked:')
      })
    : { createHTML: (input) => String(input) };

  function setSafeHtml(el, htmlString) {
    if (!el) return;
    el.innerHTML = domPolicy.createHTML(htmlString);
  }

  async function checkStorageDurability() {
    const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isStandalone = typeof window !== 'undefined' &&
      (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true);
    let persisted = false;
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
      persisted = await navigator.storage.persisted();
      if (!persisted) persisted = await navigator.storage.persist();
    }
    return {
      persisted,
      isIOSBrowserTab: isIOS && !isStandalone,
      warning: (isIOS && !isStandalone)
        ? 'Safari clears browser data after 7 days of disuse. Tap Share -> Add to Home Screen or download an encrypted .mzplan backup to keep your marks safe.'
        : null
    };
  }

  function evaluateNcvL4Articulation({ fundamentals = [], vocationals = [], lolt = 'English' } = {}) {
    const fundMarks = fundamentals.filter((s) => Number.isFinite(Number(s.mark))).map((s) => ({ ...s, mark: Number(s.mark) }));
    const vocMarks = vocationals.filter((s) => Number.isFinite(Number(s.mark))).map((s) => ({ ...s, mark: Number(s.mark) }));
    if (fundMarks.length < 3 || vocMarks.length < 4) {
      return { tier: 'INCOMPLETE', label: 'Enter all 3 fundamental subjects (Language, Maths/Maths Lit, LO) and 4 vocational subjects.' };
    }
    const loltSub = fundMarks.find((s) => String(s.name || '').toLowerCase().includes(lolt.toLowerCase()));
    const mathSub = fundMarks.find((s) => /math/i.test(String(s.name || '')));
    const loSub = fundMarks.find((s) => /life\s*orient/i.test(String(s.name || '')));
    const fund60 = fundMarks.filter((s) => s.mark >= 60).length;
    const fund50 = fundMarks.filter((s) => s.mark >= 50).length;
    const voc70 = vocMarks.filter((s) => s.mark >= 70).length;
    const voc60 = vocMarks.filter((s) => s.mark >= 60).length;
    const voc50 = vocMarks.filter((s) => s.mark >= 50).length;
    const note = 'University admission from NC(V) Level 4 applies only to cognate (similar) fields and remains subject to institutional rules and access tests.';
    if (loltSub && loltSub.mark >= 60 && fund60 >= 3 && voc70 >= 4) return { tier: 'BACHELOR', label: "Meets Statutory NC(V) L4 Minimum for Bachelor's Degree", note };
    if (loltSub && loltSub.mark >= 60 && fund60 >= 3 && voc70 === 3) return { tier: 'BACHELOR_CHECK_INSTITUTION', label: "Possible Bachelor's Entry at Select Institutions (3 Vocational Subjects >= 70%)", note: 'Confirm on the official prospectus (most require 4 vocational subjects at 70%).' };
    if (loltSub && loltSub.mark >= 50 && fund50 >= 3 && voc60 >= 3) return { tier: 'DIPLOMA', label: 'Meets Statutory NC(V) L4 Minimum for Diploma Study', note };
    if (loltSub && loltSub.mark >= 40 && mathSub && mathSub.mark >= 30 && loSub && loSub.mark >= 40 && voc50 >= 4) return { tier: 'HIGHER_CERT', label: 'Meets Statutory NC(V) L4 Minimum for Higher Certificate', note };
    return { tier: 'NOT_MET', label: 'Does not yet meet statutory NC(V) L4 university articulation minimums', note: 'Explore QCTO occupational qualifications, artisan apprenticeships, or SAYouth.mobi (0800 72 72 72).' };
  }

  function evaluateNbtReadiness({ al = null, ql = null, mat = null } = {}) {
    const classify = (score) => {
      if (score === null || score === '' || !Number.isFinite(Number(score))) return null;
      const n = Math.max(0, Math.min(100, Number(score)));
      if (n >= 70) return { score: n, band: 'Proficient', guidance: 'Ready for mainstream study in this domain.' };
      if (n >= 55) return { score: n, band: 'Intermediate Upper', guidance: 'Likely to cope with tutorials or augmented academic support.' };
      if (n >= 40) return { score: n, band: 'Intermediate Lower', guidance: 'Strong indicator for extended curriculum or foundation placement.' };
      return { score: n, band: 'Basic', guidance: 'Significant gaps detected; bridging or extensive support recommended.' };
    };
    return {
      AL: classify(al), QL: classify(ql), MAT: classify(mat),
      feeNote: '2026 official NBT fees: R195 (AQL only), R390 (AQL + MAT), R250 (re-mark) via nbt.ac.za. Results stay valid for 3 years.',
      honestyNote: 'Exact per-programme NBT cut-offs are rarely published; bands show academic readiness without inventing cut-offs.'
    };
  }

  function evaluateFunzaLushaka2027({
    isSaCitizen = true, ageOnMarch31_2027 = 19, isReturningBursar = false,
    hasPublicUniStudentNo = false, isFourYearBEd = true, prioritySubjectCount = 2,
    prevPriorityAvg = null, now = new Date()
  } = {}) {
    const blockers = [];
    if (!isSaCitizen) blockers.push('Requires South African citizenship with valid SA ID.');
    if (!isReturningBursar && ageOnMarch31_2027 > 30) blockers.push('First-time applicants must turn 30 on or before 31 March 2027.');
    if (!isFourYearBEd) blockers.push('Funza Lushaka funds approved 4-year BEd degrees (PGCE, extended, and postgraduate programmes are excluded).');
    if (prioritySubjectCount < 2) blockers.push('Requires specialising in at least two priority subject areas.');
    if (!hasPublicUniStudentNo) blockers.push('Apply only once allocated a valid public university student number.');
    if (isReturningBursar && (prevPriorityAvg === null || Number(prevPriorityAvg) < 66.5)) blockers.push('Returning bursars require at least a 66.5% average in priority specialisation modules.');
    const closingIso = isReturningBursar ? '2026-11-30' : '2027-01-31';
    if (now > new Date(`${closingIso}T23:59:59+02:00`)) blockers.push(`2027 application window closed on ${closingIso}.`);
    return {
      eligible: blockers.length === 0, closingDate: closingIso, blockers,
      obligationWarning: 'Service contract: Teach 1 year at a public school per funded year. No preferential PED placement; must prove 6 months of active applications.'
    };
  }

  function evaluateNsfasAppeal({
    studentType = 'FTEN', daysSinceOutcome = 5, yearsFunded = 0,
    minQualYears = 3, hasDisability = false, remainingFinalYearCreditsPct = 100
  } = {}) {
    const maxDays = studentType === 'FTEN' ? 15 : 30;
    const hardNLimit = minQualYears + (hasDisability ? 3 : 2);
    const propensityLimit = minQualYears + (hasDisability ? 2 : 1);
    if (daysSinceOutcome > maxDays) return { canAppeal: false, reason: `Your ${maxDays}-day myNSFAS appeal window has passed.` };
    if (yearsFunded >= hardNLimit) return { canAppeal: false, reason: `Reached the hard N+${hasDisability ? 3 : 2} cap — NSFAS cannot consider appeals beyond this limit.` };
    if (studentType === 'SENIOR' && yearsFunded === propensityLimit && remainingFinalYearCreditsPct <= 50) {
      return { canAppeal: true, requiresPropensityLetter: true, daysLeft: maxDays - daysSinceOutcome, action: 'Download the official NSFAS Propensity Letter, have your faculty or TVET principal stamp and sign it confirming <=50% final credits/term left, and upload on myNSFAS.' };
    }
    return { canAppeal: true, requiresPropensityLetter: false, daysLeft: maxDays - daysSinceOutcome, action: `Submit appeal with supporting evidence on myNSFAS within ${maxDays - daysSinceOutcome} day(s). Call NSFAS toll-free on 0800 067 327.` };
  }

  function reverseGapPlanner(targetProgramme, currentSubjects = [], apsResult = { score: 0 }) {
    const subjectGaps = [];
    for (const req of targetProgramme.requiredSubjects || []) {
      const candidates = req.anyOf || [];
      const minMark = Number(req.minMark || 0);
      const current = currentSubjects.find((s) => candidates.some((c) => String(s.name || '').toLowerCase().includes(c.toLowerCase())));
      if (!current) {
        const hasMathLitInstead = candidates.includes('Mathematics') && currentSubjects.some((s) => s.isMathLit);
        subjectGaps.push({
          required: candidates.join(' or '), minMark, currentMark: null, deltaPct: minMark,
          blockerType: hasMathLitInstead ? 'SUBJECT_SWITCH_NEEDED' : 'MISSING_SUBJECT',
          advice: hasMathLitInstead ? 'Requires pure Mathematics (not Maths Lit). Consider a Higher Certificate bridge, TVET NC(V) IT, or DBE May/June Mathematics upgrade.' : `Missing required subject: ${candidates.join(' or ')} (>= ${minMark}%).`
        });
      } else if (Number(current.mark) < minMark) {
        const delta = minMark - Number(current.mark);
        subjectGaps.push({
          required: current.name, minMark, currentMark: Number(current.mark), deltaPct: delta,
          blockerType: delta <= 4 ? 'REMARK_OR_REWRITE_CANDIDATE' : 'REWRITE_NEEDED',
          advice: delta <= 4 ? `Only ${delta}% short in ${current.name} — strong candidate for a January DBE remark check (before 25 Jan) or May/June rewrite.` : `Need +${delta}% in ${current.name} (from ${current.mark}% to ${minMark}%).`
        });
      }
    }
    const apsGap = apsResult.score === null ? null : Math.max(0, Number(targetProgramme.minAps || 0) - Number(apsResult.score));
    return { programmeName: targetProgramme.name, apsGap, subjectGaps, readyNow: apsGap === 0 && subjectGaps.length === 0 };
  }

  return { setSafeHtml, checkStorageDurability, evaluateNcvL4Articulation, evaluateNbtReadiness, evaluateFunzaLushaka2027, evaluateNsfasAppeal, reverseGapPlanner };
})();
