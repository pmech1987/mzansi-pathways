/* Mzansi Pathways v57 - engine.js
 * Pure logic (no DOM). Loaded by index.html as a classic script AND by Node tests.
 *
 * Design rules (never relax these):
 *   1. NEVER guess a mark. A missing mark stays null until the learner types it.
 *   2. APS is institution-specific. Unknown method => null + "use the official calculator".
 *   3. Unverified programme data may NEVER produce a green "meets minimums" result.
 *   4. Deadlines are ISO dates; status is computed, never free text.
 *
 * NSC pass-level rules follow the DBE wording (see docs/ENGINE_RULES_V57.md for the
 * places where official sources differ and which reading this engine takes).
 */
(function (root) {
  'use strict';

  // ---------------------------------------------------------------- helpers
  function levelFromMark(m) {
    const n = Math.max(0, Math.min(100, Number(m) || 0));
    if (n >= 80) return 7; if (n >= 70) return 6; if (n >= 60) return 5;
    if (n >= 50) return 4; if (n >= 40) return 3; if (n >= 30) return 2; return 1;
  }
  const markToLevel = levelFromMark; // backwards-compatible alias used by index.html

  function hasMark(s) {
    if (!s || s.mark === null || s.mark === undefined || s.mark === '') return false;
    const n = Number(s.mark);
    return Number.isFinite(n) && n >= 0 && n <= 100;
  }
  function validSubjects(subs) { return (Array.isArray(subs) ? subs : []).filter(hasMark); }

  function flags(s) {
    const name = String((s && s.name) || '');
    return {
      isHL: !!(s && s.isHomeLanguage),
      isFAL: /first additional language/i.test(name),
      isMath: /^mathematics$/i.test(name.trim()),
      isMathLit: /mathematical literacy/i.test(name),
      isLO: !!(s && s.isLifeOrientation) || /^life orientation$/i.test(name.trim())
    };
  }

  // ------------------------------------------------------------ APS methods
  // Method 1: best six subjects, Life Orientation excluded, NSC levels 1-7 (max 42).
  // Used (per their published rules) by UP and UJ. Re-verify each year.
  function apsBestSixNoLO(subs) {
    const lv = validSubjects(subs).filter(s => !flags(s).isLO)
      .map(s => levelFromMark(s.mark)).sort((a, b) => b - a);
    if (lv.length < 6) return { aps: null, reason: 'Need at least 6 subjects (excluding Life Orientation) with marks' };
    return { aps: lv.slice(0, 6).reduce((a, b) => a + b, 0), max: 42 };
  }

  // Method 2: University of Mpumalanga (UMP undergraduate PDF): 4 compulsory
  // (home language, first additional language, Maths or Maths Lit, Life Orientation)
  // + best 3 electives; Life Orientation level is DIVIDED BY TWO.
  // The rounding of the half point is NOT confirmed - we return the exact value
  // and flag it so the UI can say "confirm with UMP".
  function apsUMP(subs) {
    const v = validSubjects(subs);
    const hl = v.find(s => flags(s).isHL);
    const fal = v.find(s => flags(s).isFAL && s !== hl);
    const mth = v.find(s => flags(s).isMath) || v.find(s => flags(s).isMathLit);
    const lo = v.find(s => flags(s).isLO);
    if (!hl || !fal || !mth || !lo) {
      return { aps: null, reason: 'UMP method needs home language, first additional language, Maths or Maths Lit, and Life Orientation' };
    }
    const used = new Set([hl, fal, mth, lo]);
    const electives = v.filter(s => !used.has(s)).map(s => levelFromMark(s.mark)).sort((a, b) => b - a).slice(0, 3);
    if (electives.length < 3) return { aps: null, reason: 'UMP method needs 3 elective subjects' };
    const total = levelFromMark(hl.mark) + levelFromMark(fal.mark) + levelFromMark(mth.mark) +
      levelFromMark(lo.mark) / 2 + electives.reduce((a, b) => a + b, 0);
    return {
      aps: total, max: 45.5, usedMathLit: !flags(mth).isMath,
      note: 'Life Orientation counts half at UMP. Half-point rounding is not confirmed - ask UMP.'
    };
  }

  // Wits / UFS / UCT: tables are NOT completed here on purpose. A wrong number is worse than none.
  function apsNotVerified(label) {
    return function () { return { aps: null, reason: label + ' uses its own APS table - use the university calculator' }; };
  }

  const APS_METHODS = {
    nsc_best6_noLO: apsBestSixNoLO,
    ump_lo_half: apsUMP,
    wits_weighted: apsNotVerified('Wits'),
    ufs_ap: apsNotVerified('UFS'),
    uct_fps: apsNotVerified('UCT')
  };

  function computeApsFor(apsMethod, subs) {
    const f = APS_METHODS[apsMethod];
    return f ? f(subs) : { aps: null, reason: 'APS method not verified for this institution - use their own calculator' };
  }

  // ----------------------------------------------------------- NSC pass level
  const PASS_RANK = {
    'Did Not Meet Minimum NSC Pass': 0, 'Higher Certificate Pass': 1, 'Diploma Pass': 2, "Bachelor's Pass": 3
  };
  const INCOMPLETE_LABEL = 'Enter all 7 subjects to confirm pass level';

  // lolt = language of learning and teaching of the institution (English for most).
  // Reading taken (documented): Home Language counts inside the "four at 50%" /
  // "four at 40%" / "three at 40%" counts, and Life Orientation counts only toward
  // "pass six of seven" (>=30%).
  function nscPass(subs, lolt) {
    lolt = lolt || 'English';
    const v = validSubjects(subs);
    const complete = v.length >= 7;
    const nonLO = v.filter(s => !flags(s).isLO);
    const best = apsBestSixNoLO(subs);
    const out = { complete, aps: best.aps, apsMax: 42, apsReason: best.reason || null, loltOk: null };
    if (!complete) { out.passLevel = INCOMPLETE_LABEL; return out; }
    const hl = v.filter(s => flags(s).isHL);
    const hlMark = hl.length ? Math.max.apply(null, hl.map(s => Number(s.mark))) : -1;
    const passed = v.filter(s => Number(s.mark) >= 30).length;
    const n50 = nonLO.filter(s => Number(s.mark) >= 50).length;
    const n40 = nonLO.filter(s => Number(s.mark) >= 40).length;
    out.loltOk = v.some(s => (flags(s).isHL || flags(s).isFAL) &&
      String(s.name).toLowerCase().indexOf(String(lolt).toLowerCase()) !== -1 && Number(s.mark) >= 30);
    let level = 'Did Not Meet Minimum NSC Pass';
    if (hlMark >= 40 && passed >= 6 && out.loltOk) {
      if (n50 >= 4) level = "Bachelor's Pass";
      else if (n40 >= 4) level = 'Diploma Pass';
      else if (n40 >= 3) level = 'Higher Certificate Pass';
    }
    out.passLevel = level;
    return out;
  }
  // Legacy name used all over index.html
  function evaluateNsc(subs) { return nscPass(subs, 'English'); }

  // ----------------------------------------------------------- deadlines
  function isoToday(d) {
    d = d || new Date();
    const p = n => String(n).padStart(2, '0');
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  }
  function daysBetween(fromIso, toIso) {
    const a = Date.UTC.apply(null, fromIso.split('-').map((x, i) => i === 1 ? Number(x) - 1 : Number(x)));
    const b = Date.UTC.apply(null, toIso.split('-').map((x, i) => i === 1 ? Number(x) - 1 : Number(x)));
    return Math.round((b - a) / 86400000);
  }
  // prog.closes = 'YYYY-MM-DD' | null ; prog.rolling = true for rolling intakes.
  function getDeadlineStatus(prog, todayIso) {
    todayIso = todayIso || isoToday();
    const closes = prog && prog.closes;
    if (prog && prog.rolling && !closes) {
      return { code: 'ROLLING', daysLeft: null, label: 'Rolling intake - check provider', cls: 'bg-sky-50 text-sky-900 border-sky-200' };
    }
    if (!closes || !/^\d{4}-\d{2}-\d{2}$/.test(closes)) {
      return { code: 'UNKNOWN', daysLeft: null, label: 'Closing date unknown - verify', cls: 'bg-slate-100 text-slate-700 border-slate-200' };
    }
    const d = daysBetween(todayIso, closes);
    const conf = prog.closesConfidence === 'official' ? '' : ' (unconfirmed)';
    if (d < 0) return { code: 'CLOSED', daysLeft: d, label: 'Applications closed ' + closes + conf, cls: 'bg-rose-50 text-rose-900 border-rose-300' };
    if (d === 0) return { code: 'CLOSING_SOON', daysLeft: 0, label: 'Closes TODAY' + conf, cls: 'bg-rose-50 text-rose-900 border-rose-300' };
    if (d <= 14) return { code: 'CLOSING_SOON', daysLeft: d, label: 'Closes in ' + d + ' day' + (d === 1 ? '' : 's') + conf, cls: 'bg-amber-50 text-amber-900 border-amber-300' };
    return { code: 'OPEN', daysLeft: d, label: 'Open - closes ' + closes + conf, cls: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
  }

  // ----------------------------------------------------------- programme evaluation
  const ST = {
    MEETS: 'Meets Minimums', COND: 'Conditional', POSSIBLE: 'Possible - Verify Rules',
    NEAR: 'Near Match', NOT: 'Not Currently Eligible', VERIFY: 'Needs Verification',
    CONFLICT: 'Check Official Page', NEED7: 'Enter All 7 Subjects'
  };
  const GOOD_STATUSES = new Set([ST.MEETS, ST.COND, ST.POSSIBLE]);
  const STATUS_RANK = {};
  [ST.MEETS, ST.COND, ST.POSSIBLE, ST.NEAR, ST.CONFLICT, ST.VERIFY, ST.NEED7, ST.NOT].forEach((k, i) => { STATUS_RANK[k] = i; });

  const BADGE = {
    [ST.MEETS]: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    [ST.COND]: 'bg-sky-100 text-sky-900 border-sky-300',
    [ST.POSSIBLE]: 'bg-amber-100 text-amber-950 border-amber-300',
    [ST.NEAR]: 'bg-amber-100 text-amber-950 border-amber-300',
    [ST.NOT]: 'bg-rose-100 text-rose-900 border-rose-300',
    [ST.VERIFY]: 'bg-slate-100 text-slate-700 border-slate-300',
    [ST.CONFLICT]: 'bg-violet-100 text-violet-900 border-violet-300',
    [ST.NEED7]: 'bg-slate-100 text-slate-700 border-slate-300'
  };
  function res(status, reasons, missing, extra) {
    return Object.assign({ status, badge: BADGE[status], reasons: reasons || [], missing: missing || [] }, extra || {});
  }

  // prog.verificationStatus: 'verified' | 'pending_review' | 'conflict' | 'unverified_existence'
  function evaluateProgramme(subs, prog) {
    const vs = prog.verificationStatus || (prog.verifiedRules ? 'pending_review' : 'unverified_existence');
    if (vs === 'unverified_existence' || prog.verifiedRules === false) {
      return res(ST.VERIFY, ['Requirements must be confirmed directly with the provider.']);
    }
    if (vs === 'conflict') {
      const notes = (prog.conflictNotes || ['Sources disagree on the entry requirements.']).slice();
      return res(ST.CONFLICT, notes.concat(['Check the institution\'s own page before applying.']));
    }
    if (prog.entryBasis && prog.entryBasis !== 'nsc') {
      // Entry is set by the college / employer / provider (Grade 9 NC(V), learnerships, QCTO ...).
      return res(ST.POSSIBLE, [prog.entryNote || 'Entry rules are set by the provider - confirm with them.'], []);
    }
    const nsc = evaluateNsc(subs);
    if (!nsc.complete) {
      return res(ST.NEED7, [], ['Enter all 7 subjects with real marks so your pass level can be confirmed.']);
    }
    const aps = prog.apsMethod ? computeApsFor(prog.apsMethod, subs) : computeApsFor(null, subs);
    const byName = {};
    validSubjects(subs).forEach(s => { byName[String(s.name).toLowerCase()] = Number(s.mark); });
    const missing = [], reasons = [];
    let nearGap = true;

    if ((PASS_RANK[nsc.passLevel] || 0) < (PASS_RANK[prog.minPassLevel] || 0)) {
      missing.push('Needs ' + prog.minPassLevel + ' (currently ' + nsc.passLevel + ')');
      if ((PASS_RANK[prog.minPassLevel] || 0) - (PASS_RANK[nsc.passLevel] || 0) > 1) nearGap = false;
    }
    let apsUnknown = false;
    if (prog.minAps > 0) {
      if (aps.aps === null) {
        apsUnknown = true;
        reasons.push('Cannot compare APS: ' + (aps.reason || 'method not verified'));
      } else if (aps.aps >= prog.minAps) {
        reasons.push('APS ' + aps.aps + ' >= minimum ' + prog.minAps + (prog.apsMethod ? ' (' + prog.apsMethod.replace(/_/g, ' ') + ')' : ''));
      } else {
        const g = prog.minAps - aps.aps;
        missing.push('APS ' + aps.aps + ' is ' + g + ' pt(s) below minimum ' + prog.minAps);
        if (g > 4) nearGap = false;
      }
    }
    (prog.subjectRequirements || []).forEach(req => {
      let best = null;
      req.anyOf.forEach(o => { const x = byName[o.toLowerCase()]; if (x !== undefined) best = best === null ? x : Math.max(best, x); });
      const lbl = req.anyOf.join(' or ');
      if (best === null) { missing.push('Missing subject: ' + lbl + ' (' + req.minMark + '%+)'); nearGap = false; }
      else if (best < req.minMark) { const d = Math.round(req.minMark - best); missing.push(lbl + ': ' + best + '% (need ' + req.minMark + '%, short by ' + d + '%)'); if (d > 15) nearGap = false; }
      else reasons.push(lbl + ': ' + best + '% >= ' + req.minMark + '%');
    });

    if (!missing.length) {
      if (apsUnknown) return res(ST.POSSIBLE, reasons.concat(['Verify APS with the institution calculator']), []);
      if (vs !== 'verified') return res(ST.POSSIBLE, reasons.concat(['Rules not yet verified against the official source']), []);
      if (prog.requiresSelection) return res(ST.COND, reasons.concat(['Subject to institutional selection & space']), []);
      return res(ST.MEETS, reasons, []);
    }
    if (nearGap && missing.length <= 2) return res(ST.NEAR, reasons, missing);
    return res(ST.NOT, reasons, missing);
  }

  // ---------------------------------------------------------- OCR text helpers
  function scrubPii(text) {
    // POPIA: SA ID numbers are 13 digits. Never keep them.
    return String(text || '').replace(/\b\d{13}\b/g, '[ID removed]');
  }
  function cleanOcrLine(s) {
    return String(s || '')
      .replace(/[|\\_~]/g, ' ')
      .replace(/(\d)[Oo](?=[\d\s%]|$)/g, function (m, d) { return d + '0'; })
      .replace(/(\d)[lI](?=[\d\s%]|$)/g, function (m, d) { return d + '1'; })
      .replace(/\b[Oo](\d)/g, function (m, d) { return '0' + d; })
      .replace(/(\d)\s+%/g, '$1%')
      .replace(/\s+/g, ' ')
      .trim();
  }
  function levenshtein(a, b) {
    if (a === b) return 0;
    if (!a.length) return b.length; if (!b.length) return a.length;
    let prev = new Array(b.length + 1), cur = new Array(b.length + 1);
    for (let j = 0; j <= b.length; j++) prev[j] = j;
    for (let i = 1; i <= a.length; i++) {
      cur[0] = i;
      for (let j = 1; j <= b.length; j++) {
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      }
      const t = prev; prev = cur; cur = t;
    }
    return prev[b.length];
  }

  // ---- subject dictionary
  const LANGS = ['English', 'Afrikaans', 'isiZulu', 'isiXhosa', 'isiNdebele', 'siSwati', 'Sepedi', 'Sesotho', 'Setswana', 'Tshivenda', 'Xitsonga'];
  const SA_SUBJECT_ALIASES = [];
  LANGS.forEach(l => {
    const k = l.toLowerCase();
    SA_SUBJECT_ALIASES.push([l + ' Home Language', [k + ' home language', k + ' hl', k + ' hal', k + ' home lang']]);
    SA_SUBJECT_ALIASES.push([l + ' First Additional Language', [k + ' first additional language', k + ' first additional', k + ' fal', k + ' first add lang']]);
  });
  [
    ['Mathematical Literacy', ['mathematical literacy', 'maths lit', 'math lit', 'mathematics literacy', 'mlit']],
    ['Mathematics', ['mathematics', 'pure maths', 'maths', 'math']],
    ['Physical Sciences', ['physical sciences', 'physical science', 'phys sci', 'physics']],
    ['Life Sciences', ['life sciences', 'life science', 'life sci', 'biology']],
    ['Life Orientation', ['life orientation', 'life orient', 'lo']],
    ['Accounting', ['accounting', 'acc']],
    ['Business Studies', ['business studies', 'business']],
    ['Economics', ['economics', 'econ']],
    ['Geography', ['geography', 'geog']],
    ['History', ['history', 'hist']],
    ['Computer Applications Technology', ['computer applications technology', 'computer applications', 'cat']],
    ['Information Technology', ['information technology', 'info tech', 'it']],
    ['Engineering Graphics and Design', ['engineering graphics and design', 'engineering graphics', 'egd']],
    ['Tourism', ['tourism']],
    ['Agricultural Sciences', ['agricultural sciences', 'agricultural science', 'agric sciences', 'agric']],
    ['Consumer Studies', ['consumer studies']],
    ['Hospitality Studies', ['hospitality studies', 'hospitality']],
    ['Dramatic Arts', ['dramatic arts', 'drama']],
    ['Visual Arts', ['visual arts']],
    ['Music', ['music']],
    ['Religion Studies', ['religion studies']],
    ['Civil Technology', ['civil technology']],
    ['Electrical Technology', ['electrical technology']],
    ['Mechanical Technology', ['mechanical technology']]
  ].forEach(x => SA_SUBJECT_ALIASES.push(x));

  const SUBJECT_NAMES = SA_SUBJECT_ALIASES.map(x => x[0]);

  const SKIP_LINE = /\b(total|candidate|examination|exam\s*no|centre|identity|id\s*number|date of birth|average|aggregate|position|attendance|percentage achieved)\b/i;

  function normName(s) { return String(s).toLowerCase().replace(/[^a-z\s]/g, ' ').replace(/\s+/g, ' ').trim(); }

  // Returns {name, via} or null. Short aliases (<=3 letters) must be the WHOLE name part.
  function matchSubject(namePart) {
    const low = normName(namePart);
    if (!low) return null;
    let best = null;
    for (const [canonical, aliases] of SA_SUBJECT_ALIASES) {
      for (const al of aliases) {
        let ok = false;
        if (al.length <= 3) ok = (low === al);
        else ok = new RegExp('(^|\\s)' + al.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(\\s|$)').test(low);
        if (ok && (!best || al.length > best.len)) best = { name: canonical, via: 'exact', len: al.length };
      }
    }
    if (best) return best;
    // fuzzy: compare the name part (and its first N words) with long aliases only
    const words = low.split(' ');
    let bestD = 99, bestName = null;
    for (const [canonical, aliases] of SA_SUBJECT_ALIASES) {
      for (const al of aliases) {
        if (al.length < 5) continue;
        const nWords = al.split(' ').length;
        const cand = words.slice(0, nWords).join(' ');
        const d = levenshtein(cand, al);
        const lim = al.length <= 8 ? 1 : 2;
        if (d <= lim && d < bestD) { bestD = d; bestName = canonical; }
      }
    }
    return bestName ? { name: bestName, via: 'fuzzy', len: 0 } : null;
  }

  // Bare language name with no HL/FAL marker: the learner must choose.
  function bareLanguage(namePart) {
    const low = normName(namePart);
    for (const l of LANGS) if (low === l.toLowerCase()) return l;
    return null;
  }

  function parseStatementText(rawText) {
    if (typeof rawText !== 'string' || !rawText.trim()) return [];
    const lines = scrubPii(rawText).split(/\r?\n/).map(cleanOcrLine).filter(Boolean).slice(0, 120);
    const found = {};
    const order = [];
    for (const line of lines) {
      if (SKIP_LINE.test(line)) continue;
      // name part = text before the first digit run
      const firstDigit = line.search(/\d/);
      const namePart = (firstDigit === -1 ? line : line.slice(0, firstDigit)).replace(/[.:;,\-_]+$/g, '').trim();
      const tail = firstDigit === -1 ? '' : line.slice(firstDigit);
      let m = matchSubject(namePart);
      let bare = null;
      if (!m) { bare = bareLanguage(namePart); if (!bare) continue; }

      // ---- marks
      const pcts = [...tail.matchAll(/\b(100|\d{1,2})\s*%/g)].map(x => Number(x[1]));
      const nums = [...tail.replace(/%/g, ' ').matchAll(/\b(100|\d{1,2})\b/g)].map(x => Number(x[1]));
      const bigNums = nums.filter(n => n >= 8 && n <= 100);
      const smallNums = nums.filter(n => n >= 1 && n <= 7);
      let mark = null, level = null, confidence = 'high', reason = '';
      if (pcts.length >= 1) {
        mark = pcts[0];
        if (pcts.length > 1) { confidence = 'review'; reason = 'More than one % on this line'; }
        if (smallNums.length) level = smallNums[0];
      } else if (bigNums.length === 1) {
        mark = bigNums[0];
        if (smallNums.length) level = smallNums[0];
      } else if (bigNums.length > 1) {
        const lv = smallNums[0];
        mark = (lv && bigNums.find(n => levelFromMark(n) === lv)) || bigNums[0];
        level = lv || null; confidence = 'review'; reason = 'Several numbers on this line - check the mark';
      } else if (smallNums.length) {
        level = smallNums[0]; confidence = 'review';
        reason = 'Only a level (1-7) was found - type your exact %';
      } else {
        confidence = 'missing'; reason = 'No mark found - type it in';
      }
      if (mark !== null && level !== null && levelFromMark(mark) !== level) {
        confidence = 'review'; reason = 'Mark and level do not agree - check both';
      }
      if (m && m.via === 'fuzzy') { confidence = confidence === 'high' ? 'review' : confidence; reason = reason || 'Subject name was corrected from a misread - check it'; }

      let name, isHL = false, needsChoice = false;
      if (bare) { name = ''; needsChoice = true; confidence = 'review'; reason = bare + ': choose Home Language or First Additional Language'; }
      else { name = m.name; isHL = /home language$/i.test(name); }
      const isLO = name === 'Life Orientation';
      const key = name || ('lang:' + bare);
      const row = {
        name, mark, level, isHomeLanguage: isHL, isLifeOrientation: isLO,
        confidence, reason, needsChoice, include: true, source: 'text'
      };
      if (found[key]) {
        // duplicate subject: keep the row that has a mark, flag it
        if (found[key].mark === null && mark !== null) { found[key] = row; }
        found[key].confidence = 'review'; found[key].reason = 'Subject appeared twice - check which is right';
      } else { found[key] = row; order.push(key); }
    }
    return order.map(k => found[k]);
  }

  // A scan row is ready only when it has a name and a valid mark.
  function scanRowsReady(rows) {
    const inc = (rows || []).filter(r => r.include !== false);
    if (!inc.length) return { ok: false, why: 'Select at least one subject' };
    for (const r of inc) {
      if (!r.name) return { ok: false, why: 'Choose a subject for every row' };
      if (!hasMark(r)) return { ok: false, why: 'Type a mark (0-100) for every selected row' };
    }
    return { ok: true, why: '' };
  }

  const api = {
    levelFromMark, markToLevel, hasMark, validSubjects, flags,
    apsBestSixNoLO, apsUMP, computeApsFor, APS_METHODS,
    nscPass, evaluateNsc, PASS_RANK, INCOMPLETE_LABEL,
    isoToday, daysBetween, getDeadlineStatus,
    ST, GOOD_STATUSES, STATUS_RANK, evaluateProgramme,
    scrubPii, cleanOcrLine, levenshtein, matchSubject, parseStatementText, scanRowsReady,
    SA_SUBJECT_ALIASES, SUBJECT_NAMES
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else Object.keys(api).forEach(k => { root[k] = api[k]; });
})(typeof window !== 'undefined' ? window : globalThis);
