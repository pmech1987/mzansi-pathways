/* Mzansi Pathways v68 - catalogue.js
 * STUDY PATHS: which courses can I get into? (separate from Career Paths and Work Paths).
 * Pure logic + HTML builders. No rules are invented here: every row comes from catalogue_data.js (built by
 * scripts/build_catalogue.py) and is labelled "indicative" until a real prospectus row replaces it.
 * Honesty rules kept from engine.js: never guess a mark, indicative rows never show a green "meets minimums",
 * institutions with no course rows are hidden (they appear only in a small "none loaded yet" note).
 */
(function (root) {
  'use strict';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const PASS_RANK = { 'Higher Certificate Pass': 1, 'Diploma Pass': 2, "Bachelor's Pass": 3 };
  let CAT = null;

  function expandReq(code, codes) {
    const out = [];
    String(code || '').split(/\s+/).filter(Boolean).forEach(tok => {
      const m = /^([A-Z/]+?)(\d{2})$/.exec(tok); if (!m) return;
      let names = []; m[1].split('/').forEach(c => { names = names.concat((codes || {})[c] || []); });
      if (names.length) out.push({ anyOf: names, minMark: Number(m[2]) });
    });
    return out;
  }
  function load() {
    if (CAT) return CAT;
    const raw = root.MZ_CATALOGUE;
    if (!raw || !Array.isArray(raw.institutions)) { CAT = { institutions: [], flat: [], build: '' }; return CAT; }
    const flat = [];
    raw.institutions.forEach(inst => {
      inst.programmes.forEach((p, i) => {
        p.institutionId = inst.id;
        p.id = p.id || (inst.id + '__' + i);
        if (!p.subjects) p.subjects = expandReq(p.req, raw.subjectCodes);
        p._inst = inst; flat.push(p);
      });
    });
    CAT = { institutions: raw.institutions, flat, build: raw.build || '' };
    return CAT;
  }

  // ---------------------------------------------------------------- marks -> numbers
  function myNumbers(subs, E) {
    const valid = E.validSubjects(subs);
    const nonLO = valid.filter(s => !E.flags(s).isLO);
    const lv = nonLO.map(s => E.levelFromMark(s.mark)).sort((a, b) => b - a);
    const lo = valid.find(s => E.flags(s).isLO);
    const apsEx = lv.length >= 6 ? lv.slice(0, 6).reduce((a, b) => a + b, 0) : null;
    const loLevel = lo ? E.levelFromMark(lo.mark) : null;
    const nsc = E.evaluateNsc(subs);
    const byName = {}; valid.forEach(s => { byName[String(s.name).toLowerCase()] = Number(s.mark); });
    return { nsc, apsEx, loLevel, apsWithLO: (apsEx != null && loLevel != null) ? apsEx + loLevel : null, byName, count: valid.length };
  }

  const LO_TEXT = {
    excluded: { short: 'LO not counted', long: 'Life Orientation is NOT counted in this institution\'s APS (it still must be passed).' },
    half: { short: 'LO counted at half', long: 'Life Orientation counts at half its level in this institution\'s APS.' },
    own_table: { short: 'Own APS table', long: 'This institution uses its own scoring table. Use their calculator; Life Orientation treatment is in their prospectus.' },
    none: { short: 'No APS score', long: 'Admission is by NSC pass type and subject needs rather than an APS score.' },
    check: { short: 'Check if LO counts', long: 'Whether Life Orientation counts toward APS is not loaded yet. Check the prospectus (look for "Life Orientation" in the APS section).' }
  };

  // ---------------------------------------------------------------- one programme vs me
  // tier: 'qualify' | 'close' | 'gap' | 'open' | 'incomplete'
  function evaluate(subs, p, E, me) {
    me = me || myNumbers(subs, E);
    const inst = p._inst || {};
    const indicative = p.status !== 'verified';
    const r = { tier: 'gap', indicative, reasons: [], gaps: [], apsMine: me.apsEx, apsNeed: p.minAps || 0, loNote: (LO_TEXT[inst.loPolicy] || LO_TEXT.check) };
    if (p.entryBasis && p.entryBasis !== 'nsc') {
      r.tier = 'open'; r.reasons.push(p.entryNote || 'Entry is set by the college.');
      if (p.entryBasis === 'grade9') r.reasons.push('No NSC marks needed to apply. Selection and available seats still apply.');
      return r;
    }
    if (!me.nsc.complete) { r.tier = 'incomplete'; r.gaps.push('Enter all 7 subjects with real marks to see what you qualify for.'); return r; }
    let near = true;
    const need = PASS_RANK[p.minPassLevel] || 0, have = PASS_RANK[me.nsc.passLevel] || 0;
    if (have < need) { r.gaps.push('Needs a ' + p.minPassLevel + ' (you have: ' + me.nsc.passLevel + ')'); near = false; }
    else r.reasons.push('NSC pass type OK (' + me.nsc.passLevel + ')');
    if (p.minAps > 0) {
      if (me.apsEx == null) { r.gaps.push('Need 6 subjects (excluding Life Orientation) to calculate APS'); near = false; }
      else if (me.apsEx >= p.minAps) r.reasons.push('APS ' + me.apsEx + ' meets ' + p.minAps + (inst.loPolicy === 'check' || inst.loPolicy === 'own_table' ? ' (generic best-6 APS)' : ''));
      else { const g = p.minAps - me.apsEx; r.gaps.push('APS ' + me.apsEx + ' is ' + g + ' short of ' + p.minAps); if (g > 3) near = false; }
    }
    (p.subjects || []).forEach(q => {
      let best = null; q.anyOf.forEach(n => { const v = me.byName[n.toLowerCase()]; if (v !== undefined) best = best === null ? v : Math.max(best, v); });
      const lbl = q.anyOf.join(' or ').replace('English Home Language or English First Additional Language', 'English').replace('Mathematics or Mathematical Literacy', 'Maths or Maths Lit');
      if (best === null) { r.gaps.push('Missing subject: ' + lbl + ' (' + q.minMark + '%+)'); near = false; }
      else if (best < q.minMark) { const d = q.minMark - best; r.gaps.push(lbl + ': ' + best + '% (need ' + q.minMark + '%, short by ' + d + ')'); if (d > 10) near = false; }
      else r.reasons.push(lbl + ': ' + best + '% (need ' + q.minMark + '%)');
    });
    if (!r.gaps.length) r.tier = 'qualify';
    else if (near && r.gaps.length <= 2) r.tier = 'close';
    else r.tier = 'gap';
    return r;
  }

  // ---------------------------------------------------------------- display helpers
  const TIER = {
    qualify: { label: 'Likely qualify - confirm', cls: 'bg-emerald-100 text-emerald-900 border-emerald-300', order: 0 },
    open: { label: 'Open entry (apply)', cls: 'bg-teal-100 text-teal-900 border-teal-300', order: 1 },
    close: { label: 'Close - small gap', cls: 'bg-amber-100 text-amber-950 border-amber-300', order: 2 },
    gap: { label: 'Not yet', cls: 'bg-rose-100 text-rose-900 border-rose-300', order: 3 },
    incomplete: { label: 'Enter all 7 subjects', cls: 'bg-slate-100 text-slate-700 border-slate-300', order: 4 }
  };
  const FIELDS = [
    ['all', 'All fields'], ['teaching', 'Teaching'], ['law', 'Law'], ['health', 'Health & Medicine'], ['nursing', 'Nursing'], ['engineering', 'Engineering'],
    ['built', 'Built Environment'], ['it', 'IT & Computer Science'], ['science', 'Science'], ['accounting', 'Accounting'], ['commerce', 'Business & Commerce'],
    ['admin', 'Public / Office Admin'], ['social', 'Social Sciences'], ['media', 'Media & Communication'], ['arts', 'Arts & Design'],
    ['hospitality', 'Hospitality & Tourism'], ['agriculture', 'Agriculture'], ['safety', 'Safety & Policing']
  ];
  function yearsText(y) { return y ? (y + (Number(y) === 1 ? ' year' : ' years')) : ''; }

  function institutionsWithData() { return load().institutions.filter(i => i.programmes && i.programmes.length); }
  function institutionsWithoutData(allInst) {
    const have = new Set(institutionsWithData().map(i => i.id));
    return (allInst || []).filter(i => i.type !== 'TVET' && !have.has(i.id));
  }

  // filters: {inst, type, field, faculty, q, show, loOnly, maxAps}
  function query(subs, E, f) {
    const me = myNumbers(subs, E), out = [];
    load().flat.forEach(p => {
      const inst = p._inst;
      if (f.inst && f.inst !== 'all' && inst.id !== f.inst) return;
      if (f.type && f.type !== 'all' && inst.type !== f.type) return;
      if (f.field && f.field !== 'all' && p.field !== f.field) return;
      if (f.faculty && f.faculty !== 'all' && p.faculty !== f.faculty) return;
      if (f.province && f.province !== 'all' && inst.province !== f.province && inst.province !== 'All provinces') return;
      if (f.q && !(p.name + ' ' + inst.name + ' ' + (inst.short || '') + ' ' + p.faculty + ' ' + p.qualType).toLowerCase().includes(f.q.toLowerCase())) return;
      if (f.loOnly && inst.loPolicy !== 'excluded' && inst.loPolicy !== 'none') return;
      const ev = evaluate(subs, p, E, me);
      if (f.show && f.show !== 'all') {
        if (f.show === 'yes' && !(ev.tier === 'qualify' || ev.tier === 'open')) return;
        if (f.show === 'close' && ev.tier !== 'close') return;
        if (f.show === 'yesclose' && !(ev.tier === 'qualify' || ev.tier === 'open' || ev.tier === 'close')) return;
      }
      out.push({ p, inst, ev });
    });
    const sortBy = f.sort || 'fit';
    out.sort((a, b) => {
      if (sortBy === 'aps_low') return (a.p.minAps || 0) - (b.p.minAps || 0) || a.p.name.localeCompare(b.p.name);
      if (sortBy === 'aps_high') return (b.p.minAps || 0) - (a.p.minAps || 0);
      if (sortBy === 'name') return a.p.name.localeCompare(b.p.name);
      return (TIER[a.ev.tier].order - TIER[b.ev.tier].order) || ((b.p.minAps || 0) - (a.p.minAps || 0)) || a.p.name.localeCompare(b.p.name);
    });
    return { rows: out, me };
  }

  function summaryFor(subs, E) {
    const q = query(subs, E, { show: 'all' }), c = { qualify: 0, open: 0, close: 0, gap: 0, incomplete: 0 };
    q.rows.forEach(r => { c[r.ev.tier]++; });
    return c;
  }

  // ---------------------------------------------------------------- course card
  function card(row, opts) {
    opts = opts || {};
    const { p, inst, ev } = row, t = TIER[ev.tier];
    const tLabel = (ev.tier === 'qualify' && !ev.indicative) ? 'You meet the minimums' : t.label;
    const reqs = (p.subjects || []).map(q => esc(q.anyOf.join(' / ').replace('English Home Language / English First Additional Language', 'English').replace('Mathematics / Mathematical Literacy', 'Maths or Maths Lit')) + ' ' + q.minMark + '%').join(' · ') || 'No specific subject minimums listed';
    const aps = p.entryBasis && p.entryBasis !== 'nsc' ? 'Not NSC-based' : (p.minAps > 0 ? 'APS ' + p.minAps + '+' : 'No APS score');
    return `
      <article class="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-2 text-xs" data-prog-card="${esc(p.id)}">
        <div class="flex flex-wrap items-center justify-between gap-1.5">
          <span class="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold border ${t.cls}">${esc(tLabel)}</span>
          <span class="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-bold">${esc(p.qualType)} · NQF ${esc(p.nqf)}${p.years ? ' · ' + esc(yearsText(p.years)) : ''}</span>
        </div>
        <h3 class="text-base font-extrabold text-slate-900 leading-snug">${esc(p.name)}</h3>
        <div class="font-semibold text-blue-700">${esc(inst.name)}${inst.short && inst.short !== 'TVET' ? ' (' + esc(inst.short) + ')' : ''} · ${esc(p.faculty)}</div>
        <div class="grid grid-cols-2 gap-1.5">
          <div class="p-2 rounded-xl bg-slate-50 border border-slate-200"><div class="text-[10px] font-bold uppercase text-slate-500">Minimum APS</div><div class="font-extrabold text-slate-900">${esc(aps)}${ev.apsMine != null && p.minAps > 0 ? ' <span class="font-semibold text-slate-500">(you: ' + ev.apsMine + ')</span>' : ''}</div></div>
          <div class="p-2 rounded-xl bg-slate-50 border border-slate-200"><div class="text-[10px] font-bold uppercase text-slate-500">Life Orientation</div><div class="font-bold text-slate-800">${esc(ev.loNote.short)}</div></div>
        </div>
        <div><span class="font-bold text-slate-800">Subjects needed:</span> <span class="text-slate-700">${reqs}</span></div>
        ${ev.gaps.length ? `<div class="p-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 font-semibold">${ev.gaps.map(esc).join(' | ')}</div>` : ''}
        ${ev.tier === 'qualify' || ev.tier === 'open' ? `<div class="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900">${ev.reasons.map(esc).join(' · ')}</div>` : ''}
        ${p.requiresSelection ? '<div class="text-[11px] text-amber-900 font-semibold">Selection applies: meeting the minimum does not guarantee a place.</div>' : ''}
        ${p.note ? `<div class="text-[11px] text-slate-600">${esc(p.note)}</div>` : ''}
        <div class="text-[10px] text-slate-500">${p.status === 'pending_review' ? esc('Read from the prospectus (' + (p.sourceDoc || 'document') + (p.sourcePage ? ', ' + p.sourcePage : '') + '). Not yet checked by a second person: confirm on the official page.') : ev.indicative ? 'INDICATIVE typical requirement, not a copy of this year\'s prospectus. Confirm APS, subjects and whether LO counts on the official page.' : esc('Source: ' + (p.sourceDoc || '') + (p.sourcePage ? ', ' + p.sourcePage : ''))}</div>
        <div class="flex flex-wrap gap-2 pt-1 border-t border-slate-100">
          <a href="${esc(inst.url)}" target="_blank" rel="noopener noreferrer" class="px-3 py-1.5 rounded-xl bg-slate-900 text-white font-bold">Official site ↗</a>
          <button type="button" data-study-plan="${esc(p.id)}" class="px-3 py-1.5 rounded-xl bg-blue-50 text-blue-900 border border-blue-200 font-bold">Add to Plan</button>
          <button type="button" data-study-cmp="${esc(p.id)}" class="px-3 py-1.5 rounded-xl border font-bold ${(opts.cmp || []).includes(p.id) ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-50 text-slate-700 border-slate-200'}">${(opts.cmp || []).includes(p.id) ? '✓ Comparing' : 'Compare'}</button>
        </div>
      </article>`;
  }

  // ---------------------------------------------------------------- the Study Paths screen
  function renderStudyPaths(state, E, allInst) {
    const subs = (typeof state._activeSubjects === 'function') ? state._activeSubjects() : state.subjects;
    const f = state.studyF || {};
    const have = institutionsWithData();
    const types = ['all'].concat([...new Set(have.map(i => i.type))]);
    const typeLabel = { all: 'All types', University: 'Universities', UoT: 'Universities of Technology', TVET: 'TVET Colleges' };
    const instOpts = have.filter(i => !f.type || f.type === 'all' || i.type === f.type);
    const faculties = [...new Set(load().flat.filter(p => (!f.inst || f.inst === 'all' || p.institutionId === f.inst) && (!f.type || f.type === 'all' || p._inst.type === f.type)).map(p => p.faculty))].sort();
    const q = query(subs, E, f), limit = f.limit || 24, shown = q.rows.slice(0, limit);
    const me = q.me, counts = { qualify: 0, open: 0, close: 0, gap: 0, incomplete: 0 };
    q.rows.forEach(r => counts[r.ev.tier]++);
    const none = institutionsWithoutData(allInst);
    const sel = (id, label, opts, cur) => `<select id="${id}" aria-label="${esc(label)}" class="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold min-w-0">${opts.map(([v, l]) => `<option value="${esc(v)}" ${String(cur || 'all') === String(v) ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
    // group results by institution -> faculty, so every department is listed one by one
    const groups = {};
    shown.forEach(r => { const k = r.inst.id; (groups[k] = groups[k] || { inst: r.inst, fac: {} }); (groups[k].fac[r.p.faculty] = groups[k].fac[r.p.faculty] || []).push(r); });
    const grouped = f.groupBy === 'inst';
    return `
    <div class="space-y-4">
      <section class="rounded-2xl bg-teal-900 text-white p-5 space-y-2">
        <div class="text-[11px] font-extrabold uppercase tracking-wide text-teal-200">Study Path · courses you can apply for</div>
        <h1 class="text-xl font-extrabold">What can I study with my marks?</h1>
        <p class="text-xs text-teal-100 leading-relaxed">This page is only about <strong>courses and qualifications</strong> (universities, universities of technology, TVET). Jobs are on the <strong>Work</strong> tab and careers are on the <strong>Careers</strong> tab.</p>
        <div class="flex flex-wrap gap-1.5 text-[11px] font-bold">
          <span class="px-2.5 py-1 rounded-full bg-white/15">Pass type: ${esc(me.nsc.passLevel)}</span>
          <span class="px-2.5 py-1 rounded-full bg-white/15">APS (best 6, no LO): ${me.apsEx == null ? 'n/a' : me.apsEx}</span>
          ${me.loLevel != null ? `<span class="px-2.5 py-1 rounded-full bg-white/15">LO level: ${me.loLevel}${me.apsWithLO != null ? ' · APS with LO added: ' + me.apsWithLO : ''}</span>` : ''}
          ${state.marksVerified ? '<span class="px-2.5 py-1 rounded-full bg-emerald-400/30">Marks confirmed by you</span>' : '<button type="button" data-open-verify class="px-2.5 py-1 rounded-full bg-amber-300 text-amber-950">Check my marks first</button>'}
        </div>
      </section>

      <section class="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3">
        <div class="grid grid-cols-3 gap-2 text-center text-[11px] font-extrabold">
          <button type="button" data-study-show="yes" class="p-2.5 rounded-xl border ${f.show === 'yes' ? 'ring-2 ring-emerald-500' : ''} bg-emerald-50 text-emerald-900 border-emerald-200"><div class="text-xl">${counts.qualify + counts.open}</div>Likely qualify / can apply</button>
          <button type="button" data-study-show="close" class="p-2.5 rounded-xl border ${f.show === 'close' ? 'ring-2 ring-amber-500' : ''} bg-amber-50 text-amber-900 border-amber-200"><div class="text-xl">${counts.close}</div>Close (small gap)</button>
          <button type="button" data-study-show="all" class="p-2.5 rounded-xl border ${(!f.show || f.show === 'all') ? 'ring-2 ring-slate-500' : ''} bg-slate-50 text-slate-800 border-slate-200"><div class="text-xl">${q.rows.length}</div>Show everything</button>
        </div>
        <input id="study-search" type="search" value="${esc(f.q || '')}" placeholder="Search a course: foundation phase, law, nursing, IT, UNISA..." class="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold" />
        <div class="flex flex-wrap gap-2">
          ${sel('study-type', 'Institution type', types.map(t => [t, typeLabel[t] || t]), f.type)}
          ${sel('study-inst', 'Institution', [['all', 'All institutions']].concat(instOpts.map(i => [i.id, (i.short && i.short !== 'TVET' ? i.short + ' · ' : '') + i.name.replace('Public TVET Colleges (national programme list)', 'TVET Colleges')])), f.inst)}
          ${sel('study-field', 'Field of study', FIELDS, f.field)}
          ${sel('study-faculty', 'Department / faculty', [['all', 'All departments']].concat(faculties.map(x => [x, x])), f.faculty)}
          ${sel('study-sort', 'Sort', [['fit', 'Best fit first'], ['aps_low', 'Lowest APS first'], ['aps_high', 'Highest APS first'], ['name', 'A to Z']], f.sort || 'fit')}
        </div>
        <div class="flex flex-wrap items-center gap-2 text-[11px] font-bold">
          <label class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border ${f.loOnly ? 'bg-indigo-700 text-white border-indigo-700' : 'bg-indigo-50 text-indigo-900 border-indigo-200'} cursor-pointer"><input type="checkbox" id="study-lo-only" class="hidden" ${f.loOnly ? 'checked' : ''}/> ${f.loOnly ? '✓ ' : ''}Only where LO is NOT counted in APS</label>
          <button type="button" id="study-group-toggle" class="px-2.5 py-1.5 rounded-lg border bg-slate-50 text-slate-800 border-slate-200">${grouped ? '✓ Grouped by university and department' : 'Group by university and department'}</button>
          <button type="button" id="study-reset" class="ml-auto px-2.5 py-1.5 rounded-lg border bg-rose-50 text-rose-800 border-rose-200">Clear filters</button>
        </div>
        <div class="text-[11px] text-slate-600">${esc(have.length)} institutions have course details loaded. ${none.length ? `<details class="inline"><summary class="inline cursor-pointer underline font-bold">${none.length} have no course details yet: None</summary><div class="mt-1 text-slate-500">${none.map(i => esc(i.short || i.name)).join(', ')}</div></details>` : ''}</div>
      </section>

      ${(() => {
        const ii = f.inst && f.inst !== 'all' ? have.find(i => i.id === f.inst) : null;
        if (!ii) return '';
        const aps = ii.programmes.map(p => p.minAps).filter(x => x > 0);
        const facs = [...new Set(ii.programmes.map(p => p.faculty))];
        const lo = LO_TEXT[ii.loPolicy] || LO_TEXT.check;
        return `<section class="bg-white rounded-2xl p-4 border border-blue-200 border-l-4 border-l-blue-700 shadow-sm space-y-2 text-xs">
          <div class="flex flex-wrap items-center justify-between gap-2"><h2 class="text-sm font-extrabold text-slate-900">${esc(ii.name)}</h2><a href="${esc(ii.url)}" target="_blank" rel="noopener noreferrer" class="px-3 py-1.5 rounded-xl bg-slate-900 text-white font-bold">Official site ↗</a></div>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-1.5 font-bold">
            <div class="p-2 rounded-xl bg-slate-50 border border-slate-200"><div class="text-[10px] uppercase text-slate-500">Courses loaded</div>${ii.programmes.length}</div>
            <div class="p-2 rounded-xl bg-slate-50 border border-slate-200"><div class="text-[10px] uppercase text-slate-500">Departments</div>${facs.length}</div>
            <div class="p-2 rounded-xl bg-slate-50 border border-slate-200"><div class="text-[10px] uppercase text-slate-500">APS range</div>${aps.length ? Math.min.apply(null, aps) + ' to ' + Math.max.apply(null, aps) : 'No APS score'}</div>
            <div class="p-2 rounded-xl bg-slate-50 border border-slate-200"><div class="text-[10px] uppercase text-slate-500">Life Orientation</div>${esc(lo.short)}</div>
          </div>
          <div class="text-slate-600">${esc(lo.long)}</div>
          <div class="flex flex-wrap gap-1.5">${facs.map(x => `<button type="button" data-study-faculty="${esc(x)}" class="px-2.5 py-1 rounded-full border font-bold ${f.faculty === x ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 text-slate-800 border-slate-200'}">${esc(x)}</button>`).join('')}</div>
        </section>`;
      })()}

      ${q.rows.length === 0 ? '<div class="p-5 rounded-2xl bg-white border border-slate-200 text-sm text-slate-700">No courses match these filters. Tap <strong>Clear filters</strong> or choose "Show everything".</div>' : ''}

      ${grouped ? Object.values(groups).map(g => `
        <section class="space-y-2">
          <div class="px-1"><h2 class="text-sm font-extrabold text-slate-900">${esc(g.inst.name)}</h2><div class="text-[11px] text-slate-500">${esc(g.inst.province)} · ${esc(LO_TEXT[g.inst.loPolicy] ? LO_TEXT[g.inst.loPolicy].long : '')}</div></div>
          ${Object.keys(g.fac).map(fn => `<details open class="rounded-2xl border border-slate-200 bg-slate-50/60 p-2"><summary class="cursor-pointer text-xs font-extrabold text-slate-800 px-2 py-1">${esc(fn)} (${g.fac[fn].length})</summary><div class="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">${g.fac[fn].map(r => card(r, { cmp: state.studyCmp })).join('')}</div></details>`).join('')}
        </section>`).join('') : `<div class="grid grid-cols-1 md:grid-cols-2 gap-3.5">${shown.map(r => card(r, { cmp: state.studyCmp })).join('')}</div>`}

      ${q.rows.length > shown.length ? `<div class="text-center"><button type="button" id="study-more" class="px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-extrabold">Show 24 more (${q.rows.length - shown.length} left)</button></div>` : ''}

      ${(() => {
        const cmp = (state.studyCmp || []).map(id => load().flat.find(p => p.id === id)).filter(Boolean).slice(0, 3);
        if (!cmp.length) return '';
        return `<section class="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm overflow-x-auto space-y-2 text-xs"><h2 class="text-sm font-extrabold text-slate-900">Side-by-side (${cmp.length})</h2><table class="w-full text-left border-collapse"><thead><tr class="border-b border-slate-200 text-slate-500"><th class="py-2 pr-3">&nbsp;</th>${cmp.map(p => `<th class="py-2 px-3 font-extrabold text-slate-900">${esc(p.name)}<div class="font-semibold text-blue-700">${esc(p._inst.short || p._inst.name)}</div></th>`).join('')}</tr></thead><tbody class="divide-y divide-slate-100">
          <tr><td class="py-2 pr-3 font-bold">Your result</td>${cmp.map(p => `<td class="py-2 px-3 font-bold">${esc(TIER[evaluate(subs, p, E, me).tier].label)}</td>`).join('')}</tr>
          <tr><td class="py-2 pr-3 font-bold">Minimum APS</td>${cmp.map(p => `<td class="py-2 px-3">${p.minAps > 0 ? p.minAps : 'None / own rules'}</td>`).join('')}</tr>
          <tr><td class="py-2 pr-3 font-bold">Pass type</td>${cmp.map(p => `<td class="py-2 px-3">${esc(p.minPassLevel || 'Set by college')}</td>`).join('')}</tr>
          <tr><td class="py-2 pr-3 font-bold">Subjects</td>${cmp.map(p => `<td class="py-2 px-3">${(p.subjects || []).map(q => esc(q.anyOf.length > 1 ? q.anyOf[0].split(' ')[0] + '/…' : q.anyOf[0]) + ' ' + q.minMark + '%').join(', ') || 'None listed'}</td>`).join('')}</tr>
          <tr><td class="py-2 pr-3 font-bold">Life Orientation</td>${cmp.map(p => `<td class="py-2 px-3">${esc((LO_TEXT[p._inst.loPolicy] || LO_TEXT.check).short)}</td>`).join('')}</tr>
          <tr><td class="py-2 pr-3 font-bold">Length</td>${cmp.map(p => `<td class="py-2 px-3">${esc(yearsText(p.years))}</td>`).join('')}</tr></tbody></table></section>`;
      })()}

      <section class="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-[11px] text-amber-950 space-y-1">
        <div class="font-extrabold">How to read this page</div>
        <div>Course rows are <strong>indicative</strong>: typical published ranges so you can compare options. They are not this year's prospectus. Before you apply, open the official site and check the APS, subject marks, whether Life Orientation counts, and the closing date. Many institutions also use a selection score or an admission test.</div>
        <div>Prospectus rows loaded through the prospectus tool replace these and show their source document and page.</div>
      </section>
    </div>`;
  }

  // ---------------------------------------------------------------- event binding (called after each render of the study tab)
  function bindStudy(state, save, rerender, toast) {
    const f = state.studyF = state.studyF || {};
    const on = (id, ev, fn) => { const el = document.getElementById(id); if (el) el.addEventListener(ev, fn); };
    const set = (k, v) => { f[k] = v; f.limit = 24; save(); rerender(); };
    on('study-type', 'change', e => { f.inst = 'all'; f.faculty = 'all'; set('type', e.target.value); });
    on('study-inst', 'change', e => { f.faculty = 'all'; set('inst', e.target.value); });
    on('study-field', 'change', e => set('field', e.target.value));
    on('study-faculty', 'change', e => set('faculty', e.target.value));
    on('study-sort', 'change', e => set('sort', e.target.value));
    on('study-lo-only', 'change', e => set('loOnly', e.target.checked));
    on('study-group-toggle', 'click', () => set('groupBy', f.groupBy === 'inst' ? '' : 'inst'));
    on('study-reset', 'click', () => { state.studyF = {}; save(); rerender(); });
    on('study-more', 'click', () => { f.limit = (f.limit || 24) + 24; save(); rerender(); });
    on('study-search', 'input', e => {
      f.q = e.target.value; f.limit = 24; clearTimeout(root._stT);
      root._stT = setTimeout(() => { save(); rerender(); const el = document.getElementById('study-search'); if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); } }, 220);
    });
    document.querySelectorAll('[data-study-faculty]').forEach(b => b.addEventListener('click', () => set('faculty', f.faculty === b.dataset.studyFaculty ? 'all' : b.dataset.studyFaculty)));
    document.querySelectorAll('[data-study-show]').forEach(b => b.addEventListener('click', () => set('show', b.dataset.studyShow)));
    document.querySelectorAll('[data-study-cmp]').forEach(b => b.addEventListener('click', () => {
      const id = b.dataset.studyCmp; let c = (state.studyCmp || []).slice();
      if (c.includes(id)) c = c.filter(x => x !== id); else { if (c.length >= 3) { toast('Compare up to 3 courses. Tap one to remove it.'); return; } c.push(id); }
      state.studyCmp = c; save(); rerender();
    }));
    document.querySelectorAll('[data-study-plan]').forEach(b => b.addEventListener('click', () => {
      const p = load().flat.find(x => x.id === b.dataset.studyPlan); if (!p) return;
      state.studyPlanPicks = state.studyPlanPicks || [];
      if (!state.studyPlanPicks.includes(p.id)) state.studyPlanPicks.push(p.id);
      save(); toast('Saved: ' + p.name + ' (' + (p._inst.short || p._inst.name) + '). See it on the Plan tab.');
    }));
  }


  // ---------------------------------------------------------------- Career Paths (what you can BECOME). Not courses, not job adverts.
  // A career maps to the study FIELDS in the catalogue, so the Career screen can show the matching Study Paths.
  const FAMILY_FIELDS = { tech: ['it'], eng: ['engineering', 'built'], artisan: ['engineering', 'built'], health: ['health', 'nursing'], business: ['accounting', 'commerce'],
    edu: ['teaching'], public: ['admin', 'safety', 'social'], agri: ['agriculture'], hosp: ['hospitality'], creative: ['arts', 'media'], law: ['law'], admin: ['admin'], other: [] };
  const CAREER_FIELDS = {
    nurse: ['nursing'], doctor: ['health'], pharmacy_assistant: ['health'], physio_radiography: ['health'], ems: ['health'],
    social_worker: ['social'], saps_sandf: ['safety'], correctional: ['safety', 'social'], hr_officer: ['commerce'], marketing: ['commerce'], logistics: ['commerce'],
    banking: ['commerce', 'accounting'], entrepreneur: ['commerce'], accountant: ['accounting'], foundation_teacher: ['teaching'], senior_teacher: ['teaching'],
    conservation: ['agriculture', 'science'], farmer_agri: ['agriculture'], paralegal_lawyer: ['law'], public_admin: ['admin'], network_eng: ['it'], software_dev: ['it'], diesel_artisan: ['engineering']
  };
  function fieldsFor(car) { return (car && (car.fields || CAREER_FIELDS[car.id] || FAMILY_FIELDS[car.family])) || []; }
  function jobQueryFor(car) {
    if (!car) return '';
    if (car.jobQuery) return car.jobQuery;
    const w = String(car.title || '').replace(/\(.*?\)/g, '').split(/[\/,]|\band\b/i)[0].trim();
    return w.split(/\s+/).slice(-1)[0] || w;
  }

  root.MZCAT = { fieldsFor, jobQueryFor, load, evaluate, myNumbers, query, summaryFor, renderStudyPaths, bindStudy, LO_TEXT, TIER, FIELDS, expandReq, institutionsWithData, card };
})(typeof window !== 'undefined' ? window : globalThis);
