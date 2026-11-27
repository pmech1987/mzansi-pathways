/* Mzansi Pathways — Results, Multi-University APS Comparison, Bottlenecks & Next-Action Module (Step 4 of app.js split).
   Strict-CSP & Trusted-Types safe: pure logic & HTML string builders, zero inline handlers. */
(function (root) {
  'use strict';

  function esc(s) {
    return root.MZUI ? root.MZUI.escapeHtml(s) : String(s || '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function parseMarkLocal(val) {
    if (root.parseMark) return root.parseMark(val);
    if (val === null || val === undefined || typeof val === 'boolean') return null;
    var cleaned = String(val).trim().replace(/%$/, '').trim().replace(',', '.');
    if (cleaned === '') return null;
    var n = Number(cleaned);
    return (Number.isFinite(n) && n >= 0 && n <= 100) ? n : null;
  }

  function markToLevel(m) {
    var p = parseMarkLocal(m);
    var n = p !== null ? p : (Number(m) || 0);
    if (n >= 80) return 7; if (n >= 70) return 6; if (n >= 60) return 5;
    if (n >= 50) return 4; if (n >= 40) return 3; if (n >= 30) return 2; return 1;
  }

  function renderMultiUniApsComparison(subs) {
    var clean = (subs || []).filter(function (s) { return s && parseMarkLocal(s.mark) !== null; });
    var isLO = function (s) { return !!(s.isLifeOrientation || s.isLO || /life\s*orient/i.test(String(s.name || ''))); };
    const nonLoLvls = clean.filter(function (s) { return !isLO(s); }).map(function (s) { return markToLevel(s.mark); }).sort(function (a, b) { return b - a; });
    var best6 = nonLoLvls.length >= 6
      ? { aps: nonLoLvls.slice(0, 6).reduce(function (a, b) { return a + b; }, 0) }
      : { aps: null, reason: 'Enter 6 non-LO subjects' };
    var loSub = clean.find(isLO);
    var hasMath = clean.some(function (s) { return /^mathematics$/i.test(String(s.name || '').trim()); });
    var hasMathLit = clean.some(function (s) { return /mathematical\s*literacy/i.test(String(s.name || '')); });
    var ump = (typeof root.apsUMP === 'function')
      ? root.apsUMP(subs)
      : ((nonLoLvls.length >= 6 && loSub)
          ? { aps: nonLoLvls.slice(0, 6).reduce(function (a, b) { return a + b; }, 0) + (markToLevel(loSub.mark) / 2), usedMathLit: !hasMath && hasMathLit }
          : { aps: null, reason: 'Enter 6 subjects + Life Orientation' });
    return '<section id="aps-compare-universities" class="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-2.5 text-xs">' +
      '<div><h3 class="text-sm font-extrabold text-slate-900">Your APS Across South African Universities</h3>' +
      '<p class="text-slate-600 mt-0.5">South African universities calculate APS differently—never rely on one single score across all institutions.</p></div>' +
      '<div class="grid grid-cols-1 sm:grid-cols-3 gap-2">' +
      '<div class="p-3 rounded-xl bg-slate-50 border border-slate-200"><div class="text-[11px] font-bold text-slate-600">UP / UJ / TUT (Best 6, Excl. LO)</div>' +
      '<div class="text-lg font-extrabold text-slate-900 mt-0.5">' + (best6.aps !== null ? (best6.aps + ' / 42') : 'Incomplete') + '</div>' +
      '<div class="text-[11px] text-slate-500">' + (best6.aps !== null ? 'Standard NSC levels 1–7' : esc(best6.reason || '')) + '</div></div>' +
      '<div class="p-3 rounded-xl bg-slate-50 border border-slate-200"><div class="text-[11px] font-bold text-slate-600">UMP (7 Subjects, LO ÷ 2)</div>' +
      '<div class="text-lg font-extrabold text-slate-900 mt-0.5">' + (ump.aps !== null ? (ump.aps + ' / 45.5') : 'Incomplete') + '</div>' +
      '<div class="text-[11px] text-slate-500">' + (ump.aps !== null ? (ump.usedMathLit ? 'Includes Maths Lit (check higher UMP APS rule)' : 'Official UMP undergraduate PDF method') : esc(ump.reason || '')) + '</div></div>' +
      '<div class="p-3 rounded-xl bg-amber-50 border border-amber-200"><div class="text-[11px] font-bold text-amber-900">Wits / UCT / UFS (Custom Scales)</div>' +
      '<div class="text-sm font-extrabold text-amber-900 mt-1">Use Official Calculator</div>' +
      '<div class="text-[11px] text-amber-800">Weighted/faculty scales (e.g. Wits Maths/Eng bonus, UCT FPS, UFS LO 1pt at 60%+).</div></div>' +
      '</div></section>';
  }

  function findBottlenecks(subs, sampleProgrammes, evaluateProgrammeFn) {
    var okSet = new Set(['Meets Minimums', 'Conditional']);
    var progs = Array.isArray(sampleProgrammes) ? sampleProgrammes : [];
    var base = progs.filter(function (p) { return okSet.has(evaluateProgrammeFn(subs, p).status); }).length;
    var out = [];
    (subs || []).forEach(function (s, idx) {
      var curMark = parseMarkLocal(s && s.mark);
      if (!s || s.isLifeOrientation || curMark === null || curMark >= 90) return;
      var target = Math.min(100, Math.round((curMark + 12) * 10) / 10);
      var sim = subs.map(function (x, i) { return i === idx ? Object.assign({}, x, { mark: target }) : x; });
      var nowOk = progs.filter(function (p) { return okSet.has(evaluateProgrammeFn(sim, p).status); }).length;
      if (nowOk > base) out.push({ subject: s.name, from: s.mark, to: target, unlocked: nowOk - base });
    });
    return out.sort(function (a, b) { return b.unlocked - a.unlocked; });
  }

  function getNextBestAction(subs, state, evaluateNscFn) {
    var nsc = evaluateNscFn(subs);
    var hlLow = (subs || []).some(function (s) { var m = parseMarkLocal(s && s.mark); return s && s.isHomeLanguage && m !== null && m < 40; });
    if (hlLow) return { title: 'Home Language is below 40%', desc: 'In South Africa, Home Language under 40% blocks NSC pass levels — check TVET/QCTO options or use the What-If simulator.', tab: 'study', btn: 'See Alternative Routes →' };
    if (((state && state.evidenceVault) || []).length === 0) return { title: 'Your Evidence Vault is empty', desc: 'Add 1 real task, school project, or practical skill so your CV and Interview Coach have real proof.', tab: 'vault', btn: 'Open Evidence Vault →' };
    var docs = (state && state.docChecklist) || {};
    var docsDone = Object.values(docs).filter(Boolean).length;
    var docsTot = Object.keys(docs).length;
    if (docsDone < docsTot) return { title: 'Application documents ' + docsDone + '/' + docsTot + ' ready', desc: 'Check off your Statement of Results, Proof of Residence, and Z83/CV before deadlines close.', tab: 'plan', btn: 'Open Plan A/B/C & Docs →' };
    return { title: 'Your ' + nsc.passLevel + ' (APS ' + (nsc.aps != null ? nsc.aps : 'n/a') + ') is ready', desc: 'Compare your Plan A, Plan B, and Plan C side-by-side and test affordability.', tab: 'plan', btn: 'Review Plan A/B/C →' };
  }

  root.MZResults = {
    markToLevel: markToLevel,
    renderMultiUniApsComparison: renderMultiUniApsComparison,
    findBottlenecks: findBottlenecks,
    getNextBestAction: getNextBestAction
  };
})(typeof window !== 'undefined' ? window : globalThis);
