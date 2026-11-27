/* Mzansi Pathways — Funding, NSFAS Pre-Check, Deadlines & Institutions Module (Step 2 of app.js modular split).
   Strict-CSP & Trusted-Types safe: returns HTML strings for Trusted Types rendering, zero inline handlers. */
(function (root) {
  'use strict';

  function esc(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function getDeadlineBadge(deadlineStr) {
    var s = String(deadlineStr || '').toLowerCase();
    if (s.includes('rolling') || s.includes('open') || s.includes('jan') || s.includes('nov')) {
      return { label: ' Open / Rolling', cls: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
    }
    if (s.includes('sep') || s.includes('oct')) {
      return { label: ' Closing Window', cls: 'bg-amber-50 text-amber-900 border-amber-200' };
    }
    return { label: ' Verify Intake', cls: 'bg-slate-100 text-slate-700 border-slate-200' };
  }

  function getNsfasPreCheck(incomeBand) {
    var inc = Number(incomeBand) || 0;
    if (inc <= 350000) {
      return {
        band: 'Within Standard NSFAS Income Threshold (<= R350,000/yr)',
        detail: 'Household income falls within the published NSFAS bursary threshold for public universities and TVET colleges (subject to official academic and SASSA/SARS verification).',
        cls: 'border-l-emerald-700'
      };
    }
    if (inc <= 600000) {
      return {
        band: 'Missing Middle Zone (R350,001 – R600,000/yr)',
        detail: 'Typically above the standard NSFAS bursary threshold; check the NSFAS Missing Middle Loan Scheme, SETA bursaries, Funza Lushaka, and institutional merit awards.',
        cls: 'border-l-amber-600'
      };
    }
    return {
      band: 'Above Standard NSFAS & Missing Middle Thresholds (> R600,000/yr)',
      detail: 'Focus on corporate/industry bursaries, SETA learnerships (paid workplace routes), merit scholarships, or lower-cost near-home TVET/UoT pathways.',
      cls: 'border-l-slate-700'
    };
  }

  function getDaysUntilIso(iso) {
    var m = String(iso || '').match(/^(\d{4}-\d{2}-\d{2})$/);
    if (!m) return null;
    var t = new Date();
    t.setHours(0, 0, 0, 0);
    return Math.round((new Date(m[1] + 'T00:00:00').getTime() - t.getTime()) / 86400000);
  }

  function renderFunding(bursaries) {
    var b = Array.isArray(bursaries) ? bursaries : [];
    if (!b.length) return '';
    return '<details open class="mt-4 bg-white rounded-3xl p-4 border border-slate-200 shadow-sm"><summary class="font-extrabold text-sm cursor-pointer min-h-[44px] flex items-center">Funding &amp; bursaries (' + b.length + ')</summary><div class="space-y-2 mt-2 text-xs">' +
      b.map(function (x) {
        return '<div class="p-3 rounded-xl bg-slate-50 border border-slate-200"><div class="font-extrabold">' + esc(x.name) + ' <span class="text-[10px] font-bold text-slate-500">' + esc(x.type) + '</span></div><div>' + esc(x.summary) + '</div><div class="text-slate-600">' + esc(x.note) + '</div></div>';
      }).join('') +
      '<div class="text-[11px] font-bold text-amber-900">Amounts, criteria and deadlines are not shown until checked against the funder\'s official site. Never pay to apply.</div></div></details>';
  }

  function renderInstitutions(ctx) {
    var MZDATA = ctx.MZDATA;
    var state = ctx.state;
    var SAMPLE_PROGRAMMES = ctx.SAMPLE_PROGRAMMES || [];
    var all = (MZDATA && MZDATA.state && MZDATA.state.institutions) || [];
    if (!all.length) return '';
    var yr = state.intakeYear;
    var q = (state.instQ || '').trim().toLowerCase(), fp = state.instProv || '', ft = state.instType || '';
    var ins = all.filter(function (i) {
      return (!fp || i.province === fp) && (!ft || i.type === ft) && (!q || (i.name + ' ' + (i.short || '') + ' ' + i.province + ' ' + i.type).toLowerCase().includes(q));
    });
    var years = MZDATA.yearChoices();
    var cov = years.map(function (y) {
      var ps = SAMPLE_PROGRAMMES.filter(function (p) { return p.intakeYear === y; });
      return { y: y, n: ps.length, v: ps.filter(function (p) { return p.verificationStatus === 'verified'; }).length };
    });
    var covHtml = '<div class="p-2 rounded-xl bg-slate-50 border border-slate-200 text-[11px]"><div class="font-extrabold text-slate-700">Programme records by intake year</div><div class="flex flex-wrap gap-1.5 pt-1">' +
      cov.map(function (c) {
        return '<button type="button" data-year-jump="' + c.y + '" class="px-2 py-1 rounded-lg border ' + (c.y === yr ? 'bg-slate-900 text-white border-slate-900' : 'bg-white border-slate-300') + ' font-bold">' + c.y + ': ' + c.n + ' loaded, ' + c.v + ' verified</button>';
      }).join('') + '</div></div>';

    var hasCat = function (id) {
      return root.MZCAT && root.MZCAT.load().institutions.some(function (x) { return x.id === id && x.programmes.length; });
    };

    var card = function (i) {
      var progs = SAMPLE_PROGRAMMES.filter(function (p) { return p.institution.indexOf(i.name) === 0; });
      var thisYr = progs.filter(function (p) { return p.intakeYear === yr; });
      var ver = thisYr.filter(function (p) { return p.verificationStatus === 'verified'; }).length;
      var others = Array.from(new Set(progs.filter(function (p) { return p.intakeYear && p.intakeYear !== yr; }).map(function (p) { return p.intakeYear; }))).sort();
      var aps = i.type === 'TVET'
        ? esc(i.apsNote || "Use the college's own entry rules.")
        : i.apsMethod
          ? 'APS method loaded: ' + esc(i.apsMethod.replace(/_/g, ' ')) + '. Re-checked each year.'
          : 'This institution uses its own APS table. Use its official calculator.';
      var draft = i.listStatus === 'draft_unchecked'
        ? '<div class="text-[11px] font-bold text-amber-900 bg-amber-50 border border-amber-200 rounded-lg p-1.5">Draft list entry: name and province not yet checked against the official DHET list. Confirm on the DHET site before relying on it.</div>'
        : '';
      var link = i.officialUrl
        ? '<a href="' + esc(i.officialUrl) + '" target="_blank" rel="noopener noreferrer" class="px-3 py-2 rounded-xl bg-slate-900 text-white font-bold min-h-[44px] inline-flex items-center">Official website</a>'
        : '<a href="https://www.dhet.gov.za/" target="_blank" rel="noopener noreferrer" class="px-3 py-2 rounded-xl bg-slate-900 text-white font-bold min-h-[44px] inline-flex items-center">Find on DHET site</a>';
      var ci = root.MZCAT ? root.MZCAT.load().institutions.find(function (x) { return x.id === i.id; }) : null;
      var n = ci ? ci.programmes.length : 0;
      var deptCount = ci ? Array.from(new Set(ci.programmes.map(function (p) { return p.faculty; }))).length : 0;
      var catSummary = '<div><strong>Course details:</strong> ' + (n ? n + ' courses in ' + deptCount + ' departments (indicative)' : 'None loaded yet') + '</div>';
      var seeBtn = hasCat(i.id)
        ? '<button type="button" data-study-inst="' + esc(i.id) + '" class="px-3 py-2 rounded-xl bg-teal-700 text-white font-bold min-h-[44px]">See its courses</button>'
        : '';

      return '<details class="rounded-xl bg-slate-50 border border-slate-200 p-2"><summary class="font-extrabold min-h-[44px] flex items-center cursor-pointer">' + esc(i.name) + ' <span class="ml-2 text-[10px] font-bold text-slate-500">' + esc(i.short) + ' · ' + esc(i.province) + '</span></summary>' +
        '<div class="space-y-1 pt-1 text-xs"><div><strong>Type:</strong> ' + esc(i.type) + '</div>' + draft + '<div>' + aps + '</div>' +
        catSummary +
        '<div><strong>' + yr + ' verified prospectus records:</strong> ' + thisYr.length + ' (' + ver + ' fully verified)' + (thisYr.length ? '' : ' - none yet, confirm with the institution') + '</div>' +
        (others.length ? '<div class="text-slate-600">Other years loaded: ' + others.join(', ') + '. Rules are for that year only.</div>' : '') +
        '<div class="flex flex-wrap gap-2 pt-1">' + link + seeBtn + '</div>' +
        '<div class="text-[11px] text-slate-500">Admission is decided by the institution. Found a mistake? Tell the app owner (see CONTRIBUTING.md).</div></div></details>';
    };

    ins.sort(function (a, b) { return (hasCat(b.id) ? 1 : 0) - (hasCat(a.id) ? 1 : 0); });
    var groups = Array.from(new Set(ins.map(function (i) { return i.type; })));
    var types = Array.from(new Set(all.map(function (i) { return i.type; })));
    var selCls = 'px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold';
    var filters = '<div class="flex flex-wrap gap-2"><input id="inst-search" type="text" value="' + esc(state.instQ || '') + '" aria-label="Search institutions" placeholder="Search name, province, type..." class="flex-1 min-w-[160px] px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold" />' +
      '<select id="inst-prov" aria-label="Institution province" class="' + selCls + '"><option value="">All provinces</option>' + MZDATA.PROVINCES.map(function (v) { return '<option value="' + v + '" ' + (fp === v ? 'selected' : '') + '>' + v + '</option>'; }).join('') + '</select>' +
      '<select id="inst-type" aria-label="Institution type" class="' + selCls + '"><option value="">All types</option>' + types.map(function (v) { return '<option value="' + esc(v) + '" ' + (ft === v ? 'selected' : '') + '>' + esc(v) + '</option>'; }).join('') + '</select></div>' +
      '<div class="text-[11px] text-slate-500">Showing ' + ins.length + ' of ' + all.length + '</div>';

    var body = groups.map(function (g) {
      return '<div class="text-[11px] font-extrabold text-slate-500 uppercase pt-1">' + esc(g) + '</div>' + ins.filter(function (i) { return i.type === g; }).map(card).join('');
    }).join('') || '<div class="text-xs text-slate-500">No institution matches. Clear the search or filters.</div>';

    return '<details id="inst-panel" ' + (state.instOpen ? 'open' : '') + ' class="mt-4 bg-white rounded-3xl p-4 border border-slate-200 shadow-sm"><summary class="font-extrabold text-sm cursor-pointer min-h-[44px] flex items-center"><span>Institutions</span>&nbsp;(' + all.length + ')</summary><div class="space-y-2 mt-2">' + covHtml + filters + body + '<div class="text-[11px] text-slate-500">Private colleges and SETAs are added once checked against official lists.</div></div></details>';
  }

  root.MZFunding = {
    getDeadlineBadge: getDeadlineBadge,
    getNsfasPreCheck: getNsfasPreCheck,
    getDaysUntilIso: getDaysUntilIso,
    renderFunding: renderFunding,
    renderInstitutions: renderInstitutions
  };
})(typeof window !== 'undefined' ? window : globalThis);
