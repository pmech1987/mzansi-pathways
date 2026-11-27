/* Mzansi Pathways — Study Programmes, Year-Over-Year Comparison & Family Plan A/B/C Module (Step 5 of app.js split).
   Strict-CSP & Trusted-Types safe: pure logic & text/HTML builders, zero inline handlers. */
(function (root) {
  'use strict';

  function esc(s) {
    return root.MZUI ? root.MZUI.escapeHtml(s) : String(s || '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function validateImportedProgrammes(payload) {
    var list = Array.isArray(payload) ? payload : (payload && Array.isArray(payload.programmes) ? payload.programmes : null);
    if (!list || !list.length) return { ok: false, error: 'JSON must contain a non-empty programmes array.' };
    var valid = [];
    for (var i = 0; i < list.length; i++) {
      var item = list[i];
      if (!item || typeof item !== 'object') continue;
      var aps = Number(item.minAps);
      var urlOk = typeof item.officialUrl === 'string' && item.officialUrl.startsWith('https://');
      if (item.id && item.name && item.institution && Number.isFinite(aps) && aps >= 0 && aps <= 60 && item.sourceTier && urlOk) {
        valid.push(item);
      }
    }
    if (!valid.length) return { ok: false, error: 'No valid programmes passed schema & HTTPS source-tier checks.' };
    return { ok: true, items: valid };
  }

  function getPlanSubmissionProgress(state) {
    var st = (state && state.planStatus) || {};
    var done = ['A', 'B', 'C'].filter(function (k) { return st[k] === 'Submitted' || st[k] === 'Accepted'; }).length;
    var ready = ['A', 'B', 'C'].filter(function (k) { return st[k] === 'Docs Ready'; }).length;
    return { done: done, ready: ready, summary: done + '/3 Plans Submitted/Accepted · ' + ready + '/3 Plans Marked Ready' };
  }

  function prevYearNote(p, sampleProgrammes) {
    if (!p || !p.baseId || !p.intakeYear) return '';
    var progs = Array.isArray(sampleProgrammes) ? sampleProgrammes : [];
    var q = progs.find(function (x) { return x.baseId === p.baseId && x.intakeYear === p.intakeYear - 1; });
    if (!q) return '';
    var same = q.minAps === p.minAps && JSON.stringify(q.subjectRequirements) === JSON.stringify(p.subjectRequirements);
    var note = q.verificationStatus === 'verified' ? '' : ' (that record was not fully verified)';
    return '<div class="text-[11px] text-slate-700 pt-1"><strong>Compared with ' + q.intakeYear + ':</strong> ' +
      (same ? 'APS and subject minimums are the same' : 'APS or subject minimums changed (minimum APS was ' + esc(q.minAps) + ', now ' + esc(p.minAps) + ')') +
      note + '. Always confirm on the official prospectus.</div>';
  }

  function buildFamilyTalkScript(ctx) {
    var nsc = ctx.nsc;
    var state = ctx.state;
    var progs = ctx.SAMPLE_PROGRAMMES || [];
    var pA = progs.find(function (x) { return x.id === state.plans.A; });
    var pB = progs.find(function (x) { return x.id === state.plans.B; });
    var pC = progs.find(function (x) { return x.id === state.plans.C; });
    return [
      'Hi family — here is my realistic post-school plan based on my ' + nsc.passLevel + ' (APS ' + (nsc.aps != null ? nsc.aps : 'n/a') + ', excl. LO):',
      pA ? '• Plan A (Reach): ' + pA.name + ' at ' + pA.institution + ' (' + pA.estAnnualCost + ').' : '',
      pB ? '• Plan B (Safe In-Province): ' + pB.name + ' at ' + pB.institution + ' (' + pB.estAnnualCost + ').' : '',
      pC ? '• Plan C (Near-Home / TVET Backup): ' + pC.name + ' at ' + pC.institution + ' (' + pC.estAnnualCost + ').' : '',
      'I am applying to all three so we are never stuck waiting on one university, and we can check NSFAS / SETA funding together.'
    ].filter(Boolean).join('\n');
  }

  function buildFamilyDossier(ctx) {
    var nsc = ctx.nsc;
    var state = ctx.state;
    var progs = ctx.SAMPLE_PROGRAMMES || [];
    var a = state.affordA || {};
    var c = state.affordC || {};
    var netA = Math.max(0, (Number(a.tuition) || 0) + (Number(a.accomm) || 0) + (Number(a.transport) || 0) - (Number(a.funding) || 0));
    var netC = Math.max(0, (Number(c.tuition) || 0) + (Number(c.accomm) || 0) + (Number(c.transport) || 0) - (Number(c.funding) || 0));
    var plansTxt = ['A', 'B', 'C'].map(function (k) {
      var p = progs.find(function (x) { return x.id === state.plans[k]; });
      var st = (state.planStatus && state.planStatus[k]) || 'Not Started';
      return p ? ('Plan ' + k + ' [' + st + ']: ' + p.name + ' @ ' + p.institution + ' (' + p.route + ') | ' + p.estAnnualCost) : ('Plan ' + k + ': Not selected');
    }).join('\n');
    var docsTxt = Object.entries(state.docChecklist || {}).map(function (pair) { return (pair[1] ? '[x] ' : '[ ] ') + pair[0]; }).join('\n');
    return ('MZANSI PATHWAYS — FAMILY STUDY & CAREER DOSSIER\nProvince: ' + state.province + ' | Stage: ' + state.gradeStage +
      '\nNSC Summary: ' + nsc.passLevel + ' (APS ' + (nsc.aps != null ? nsc.aps : 'n/a') + ', excl. LO)\n\nPLAN A / B / C\n' +
      plansTxt + '\n\nAFFORDABILITY ESTIMATE\nOption A Net/yr: R' + netA.toLocaleString() +
      '\nOption C Net/yr: R' + netC.toLocaleString() + '\n\nDOCUMENT READINESS\n' + docsTxt +
      '\n\nOfficial CAS WhatsApp (Gov Service): 081 308 4196').replace(/\b\d{13}\b/g, '[SA-ID-REDACTED]');
  }

  root.MZStudy = {
    validateImportedProgrammes: validateImportedProgrammes,
    getPlanSubmissionProgress: getPlanSubmissionProgress,
    prevYearNote: prevYearNote,
    buildFamilyTalkScript: buildFamilyTalkScript,
    buildFamilyDossier: buildFamilyDossier
  };
})(typeof window !== 'undefined' ? window : globalThis);
