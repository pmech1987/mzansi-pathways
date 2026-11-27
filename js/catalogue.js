/* Mzansi Pathways v68 - catalogue.js
 * STUDY PATHS: which courses can I get into? (separate from Career Paths and Work Paths).
 * Pure logic + HTML builders. No rules are invented here: every row comes from catalogue_data.js (built by
 * scripts/build_catalogue.py) and is labelled "indicative" until a real prospectus row replaces it.
 * Honesty rules kept from engine.js: never guess a mark, indicative rows never show a green "meets minimums",
 * institutions with no course rows are hidden (they appear only in a small "none loaded yet" note).
 */
(function (root) {
  'use strict';
  var PAGE = (typeof matchMedia === 'function' && matchMedia('(max-width:639px)').matches) ? 12 : 24; // shorter first screen on phones
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
    const byName = {}; valid.forEach(s => { byName[String(s.name).trim().toLowerCase()] = E.parseMark ? E.parseMark(s.mark) : Number(s.mark); });
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
    const myAps = (inst.loPolicy === 'half' && me.apsEx != null && me.loLevel != null) ? (me.apsEx + me.loLevel / 2) : me.apsEx;
    const r = { tier: 'gap', indicative, reasons: [], gaps: [], apsMine: myAps, apsNeed: p.minAps || 0, loNote: (LO_TEXT[inst.loPolicy] || LO_TEXT.check) };
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
      if (myAps == null) { r.gaps.push('Need 6 subjects (excluding Life Orientation) to calculate APS'); near = false; }
      else if (myAps >= p.minAps) r.reasons.push('APS ' + myAps + ' meets ' + p.minAps + (inst.loPolicy === 'half' ? ' (LO ÷ 2)' : (inst.loPolicy === 'check' || inst.loPolicy === 'own_table' ? ' (generic best-6 APS)' : '')));
      else { const g = Math.round((p.minAps - myAps) * 10) / 10; r.gaps.push('APS ' + myAps + ' is ' + g + ' short of ' + p.minAps); if (g > 3) near = false; }
    }
    (p.subjects || []).forEach(q => {
      let best = null; q.anyOf.forEach(n => { const v = me.byName[n.toLowerCase()]; if (v !== undefined) best = best === null ? v : Math.max(best, v); });
      const lbl = q.anyOf.join(' or ').replace('English Home Language or English First Additional Language', 'English').replace('Mathematics or Mathematical Literacy', 'Maths or Maths Lit');
      if (best === null) { r.gaps.push('Missing subject: ' + lbl + ' (' + q.minMark + '%+)'); near = false; }
      else if (best < q.minMark) { const d = Math.round((q.minMark - best) * 10) / 10; r.gaps.push(lbl + ': ' + best + '% (need ' + q.minMark + '%, short by ' + d + ')'); if (d > 10) near = false; }
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
    gap: { label: 'Start with another route', cls: 'bg-slate-100 text-slate-800 border-slate-300', order: 3 },
    incomplete: { label: 'Enter all 7 subjects', cls: 'bg-slate-100 text-slate-700 border-slate-300', order: 4 }
  };
  const FIELDS = [
    ['all', 'All fields'], ['teaching', 'Teaching'], ['law', 'Law'], ['health', 'Health & Medicine'], ['nursing', 'Nursing'], ['engineering', 'Engineering'],
    ['built', 'Built Environment'], ['it', 'IT & Computer Science'], ['science', 'Science'], ['accounting', 'Accounting'], ['commerce', 'Business & Commerce'],
    ['admin', 'Public / Office Admin'], ['social', 'Social Sciences'], ['media', 'Media & Communication'], ['arts', 'Arts & Design'],
    ['hospitality', 'Hospitality & Tourism'], ['agriculture', 'Agriculture'], ['safety', 'Safety & Policing']
  ];
  // route = what kind of step this is. Used for the "What you can do right now" panel.
  const ROUTES = {
    hc: { label: 'Higher Certificates', hint: 'One-year entry-level qualifications, often used as a bridge to a diploma or degree. Ask the institution how credits carry over.' },
    diploma: { label: 'Diplomas', hint: 'Career-focused qualifications at universities and universities of technology.' },
    tvet: { label: 'TVET: NATED and NC(V)', hint: 'Skills-based college courses that lead to a trade or career, with workplace training.' },
    degree: { label: 'Degrees', hint: "Bachelor's and professional degrees you meet the minimums for." }
  };
  function routeOf(p) {
    const q = String(p.qualType || '').toLowerCase();
    if (p._inst && p._inst.type === 'TVET') return 'tvet';
    if (q.indexOf('higher certificate') >= 0) return 'hc';
    if (q.indexOf('diploma') >= 0) return 'diploma';
    return 'degree';
  }
  function yearsText(y) { return y ? (y + (Number(y) === 1 ? ' year' : ' years')) : ''; }

  function institutionsWithData() { return load().institutions.filter(i => i.programmes && i.programmes.length); }
  function institutionsWithoutData(allInst) {
    const have = new Set(institutionsWithData().map(i => i.id));
    return (allInst || []).filter(i => i.type !== 'TVET' && !have.has(i.id));
  }

  // Single-entry evaluation cache: avoids re-evaluating all 586 programmes 3-4x per render for the same marks
  let _evalCache = { key: null, flatRef: null, me: null, evaluated: null };
  function subsCacheKey(subs) {
    if (!Array.isArray(subs)) return '';
    let k = '';
    for (let i = 0; i < subs.length; i++) {
      const s = subs[i];
      if (!s) continue;
      k += (s.name || '') + ':' + (s.mark === null || s.mark === undefined ? '' : s.mark) + ':' + (s.isHomeLanguage ? 1 : 0) + (s.isLifeOrientation ? 1 : 0) + '|';
    }
    return k;
  }
  function getEvaluatedAll(subs, E) {
    const flat = load().flat;
    const key = subsCacheKey(subs);
    if (_evalCache.key === key && _evalCache.flatRef === flat && _evalCache.evaluated) {
      return _evalCache;
    }
    const me = myNumbers(subs, E);
    const evaluated = new Array(flat.length);
    for (let i = 0; i < flat.length; i++) {
      const p = flat[i];
      const inst = p._inst;
      if (!p._searchLow) {
        p._searchLow = (p.name + ' ' + inst.name + ' ' + (inst.short || '') + ' ' + p.faculty + ' ' + p.qualType).toLowerCase();
      }
      evaluated[i] = { p, inst, ev: evaluate(subs, p, E, me) };
    }
    _evalCache = { key, flatRef: flat, me, evaluated };
    return _evalCache;
  }

  // filters: {inst, type, field, faculty, q, show, loOnly, maxAps}
  function query(subs, E, f) {
    const cached = getEvaluatedAll(subs, E);
    const me = cached.me, out = [];
    const qLow = f.q ? String(f.q).toLowerCase() : '';
    const evaluated = cached.evaluated;
    for (let i = 0; i < evaluated.length; i++) {
      const row = evaluated[i];
      const p = row.p, inst = row.inst, ev = row.ev;
      if (f.inst && f.inst !== 'all' && inst.id !== f.inst) continue;
      if (f.type && f.type !== 'all' && inst.type !== f.type) continue;
      if (f.field && f.field !== 'all' && p.field !== f.field) continue;
      if (f.route && f.route !== 'all' && routeOf(p) !== f.route) continue;
      if (f.faculty && f.faculty !== 'all' && p.faculty !== f.faculty) continue;
      if (f.province && f.province !== 'all' && inst.province !== f.province && inst.province !== 'All provinces') continue;
      if (qLow && !p._searchLow.includes(qLow)) continue;
      if (f.loOnly && inst.loPolicy !== 'excluded' && inst.loPolicy !== 'none') continue;
      if (f.show && f.show !== 'all') {
        if (f.show === 'yes' && !(ev.tier === 'qualify' || ev.tier === 'open')) continue;
        if (f.show === 'close' && ev.tier !== 'close') continue;
        if (f.show === 'yesclose' && !(ev.tier === 'qualify' || ev.tier === 'open' || ev.tier === 'close')) continue;
      }
      out.push(row);
    }
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
  // "Bridge to": diplomas and degrees in the same field at the same institution. The catalogue holds no credit or
  // articulation rules, so these are POSSIBLE next steps only and always say "confirm with the institution".
  // Quotes copied from the prospectus (data/progression.json, merged by scripts/merge_progression.py). Only a quote that two enrolled
  // reviewers confirmed is called "Confirmed"; anything else says it has not been checked. Nothing here is a promise of credit or entry.
  const PROG_LABEL = { credit: 'Credits', access: 'Progression', bridging: 'Bridging' };
  function evidenceHtml(p) {
    const list = Array.isArray(p.progression) ? p.progression.slice(0, 3) : [];
    if (!list.length) return '';
    const items = list.map(x => {
      const ok = x.status === 'verified';
      const badge = ok ? '<span class="font-extrabold text-emerald-800">Confirmed by reviewers</span>' : '<span class="font-extrabold text-amber-900">Not yet checked by a person</span>';
      const where = [x.doc, x.page ? 'p. ' + x.page : ''].filter(Boolean).join(', ');
      return `<li><span class="font-bold">${esc(PROG_LABEL[x.kind] || 'Note')}:</span> &ldquo;${esc(x.text)}&rdquo; ${badge}${where ? ' <span class="text-slate-600">(' + esc(where) + ')</span>' : ''}</li>`;
    }).join('');
    return `<div class="p-2 rounded-xl bg-blue-50 border border-blue-200 text-blue-900"><div class="text-[10px] font-bold uppercase">What the prospectus says about next steps</div><ul class="list-disc pl-4 mt-0.5 space-y-0.5">${items}</ul><div class="text-[11px] font-semibold mt-1">Credits and entry are decided by the institution. Ask them before you rely on this.</div></div>`;
  }
  function bridgeHtml(row) {
    const p = row.p, inst = row.inst;
    if (routeOf(p) !== 'hc' || !inst || !inst.programmes) return '';
    const next = inst.programmes.filter(q => q !== p && q.field === p.field && routeOf(Object.assign({ _inst: inst }, q)) !== 'hc' && /diploma|bachelor/i.test(q.qualType || ''))
      .sort((a, b) => (a.minAps || 0) - (b.minAps || 0)).slice(0, 3);
    const described = /bridg|lead/i.test(p.note || '');
    const ev = evidenceHtml(p);
    if (!next.length && ev) return ev;
    if (!next.length) return `<div class="p-2 rounded-xl bg-blue-50 border border-blue-200 text-blue-900"><div class="text-[10px] font-bold uppercase">Bridge to</div>No related diploma or degree is loaded for ${esc(instLabel(inst))} yet. Ask the institution where this certificate can lead.</div>`;
    const lines = next.map(q => {
      let tag = '';
      if (CTX) { const e = evaluate(CTX.subs, Object.assign({ _inst: inst }, q), CTX.E, CTX.me); if (e.tier === 'qualify' || e.tier === 'open') tag = ' <span class="font-extrabold text-emerald-800">You may already meet this directly</span>'; }
      return `<li>${esc(q.name)} <span class="text-slate-600">· ${esc(q.qualType)}${q.minAps > 0 ? ' · APS ' + q.minAps + '+' : ''}</span>${tag}</li>`;
    }).join('');
    return ev + `<div class="p-2 rounded-xl bg-blue-50 border border-blue-200 text-blue-900"><div class="text-[10px] font-bold uppercase">Bridge to (possible next steps at ${esc(instLabel(inst))})</div><ul class="list-disc pl-4 mt-0.5 space-y-0.5">${lines}</ul><div class="text-[11px] font-semibold mt-1">${described ? 'Listed as a bridging route. ' : ''}Not confirmed: ask the institution whether this certificate gives you credit or a guaranteed place.</div></div>`;
  }

  function bodyHtml(row, opts) {
    opts = opts || {};
    const { p, inst, ev } = row;
    const reqs = (p.subjects || []).map(q => esc(q.anyOf.join(' / ').replace('English Home Language / English First Additional Language', 'English').replace('Mathematics / Mathematical Literacy', 'Maths or Maths Lit')) + ' ' + q.minMark + '%').join(' · ') || 'No specific subject minimums listed';
    const aps = p.entryBasis && p.entryBasis !== 'nsc' ? 'Not NSC-based' : (p.minAps > 0 ? 'APS ' + p.minAps + '+' : 'No APS score');
    return `
        <div class="grid grid-cols-2 gap-1.5">
          <div class="p-2 rounded-xl bg-slate-50 border border-slate-200"><div class="text-[10px] font-bold uppercase text-slate-500">Minimum APS</div><div class="font-extrabold text-slate-900">${esc(aps)}${ev.apsMine != null && p.minAps > 0 ? ' <span class="font-semibold text-slate-500">(you: ' + ev.apsMine + ')</span>' : ''}</div></div>
          <div class="p-2 rounded-xl bg-slate-50 border border-slate-200"><div class="text-[10px] font-bold uppercase text-slate-500">Life Orientation</div><div class="font-bold text-slate-800">${esc(ev.loNote.short)}</div></div>
        </div>
        <div><span class="font-bold text-slate-800">Subjects needed:</span> <span class="text-slate-700">${reqs}</span></div>
        ${bridgeHtml(row)}
        ${ev.gaps.length ? `<div class="p-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 font-semibold"><div class="text-[10px] font-bold uppercase text-slate-500">What this course asks for</div>${ev.gaps.map(esc).join(' | ')}</div>` : ''}
        ${ev.tier === 'gap' || ev.tier === 'close' ? `<div class="p-2 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 font-semibold">You do not have to go back to school. <button type="button" data-study-field-yes="${esc(p.field || 'all')}" class="underline font-extrabold">See ${esc((FIELDS.find(x => x[0] === p.field) || [0, 'related'])[1])} courses you can start now</button></div>` : ''}
        ${ev.tier === 'qualify' || ev.tier === 'open' ? `<div class="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900">${ev.reasons.map(esc).join(' · ')}</div>` : ''}
        ${p.requiresSelection ? '<div class="text-[11px] text-amber-900 font-semibold">Selection applies: meeting the minimum does not guarantee a place.</div>' : ''}
        ${(ev.indicative || p.status === 'pending_review') ? '<div class="text-[11px] font-semibold text-amber-900">Confirm on the official page before you apply.</div>' : ''}
        <details class="mz-notes"><summary>Notes and source</summary><div class="text-[11px] mt-1"><a class="underline font-bold" href="./check_prospectus.html">Spot a mistake? Check the prospectus yourself</a></div>${p.note ? `<div class="text-[11px] text-slate-600 mt-1">${esc(p.note)}</div>` : ''}<div class="text-[10px] text-slate-500 mt-1">${p.status === 'pending_review' ? esc('Read from the prospectus (' + (p.sourceDoc || 'document') + (p.sourcePage ? ', ' + p.sourcePage : '') + '). Not yet checked by a second person: confirm on the official page.') : ev.indicative ? 'INDICATIVE typical requirement, not a copy of this year\'s prospectus. Confirm APS, subjects and whether LO counts on the official page.' : esc('Source: ' + (p.sourceDoc || '') + (p.sourcePage ? ', ' + p.sourcePage : ''))}</div></details>
        <div class="flex flex-wrap gap-2 pt-1 border-t border-slate-100">
          <a href="${esc(inst.url)}" target="_blank" rel="noopener noreferrer" class="px-3 py-1.5 rounded-xl bg-slate-900 text-white font-bold">Official site ↗</a>
          <button type="button" data-study-plan="${esc(p.id)}" class="px-3 py-1.5 rounded-xl bg-blue-50 text-blue-900 border border-blue-200 font-bold">Add to Plan</button>
          <button type="button" data-study-cmp="${esc(p.id)}" class="px-3 py-1.5 rounded-xl border font-bold ${(opts.cmp || []).includes(p.id) ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-50 text-slate-700 border-slate-200'}">${(opts.cmp || []).includes(p.id) ? '✓ Comparing' : 'Compare'}</button>
        </div>`;
  }

  function card(row, opts) {
    opts = opts || {};
    const { p, inst, ev } = row, t = TIER[ev.tier];
    const tLabel = (ev.tier === 'qualify' && !ev.indicative) ? 'You meet the minimums' : t.label;
    return `
      <article class="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-2 text-xs" data-prog-card="${esc(p.id)}">
        <div class="flex flex-wrap items-center justify-between gap-1.5">
          <span class="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold border ${t.cls}">${esc(tLabel)}</span>
          <span class="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-bold">${esc(p.qualType)} · NQF ${esc(p.nqf)}${p.years ? ' · ' + esc(yearsText(p.years)) : ''}</span>
        </div>
        <h3 class="text-base font-extrabold text-slate-900 leading-snug">${esc(p.name)}</h3>
        <div class="font-semibold text-blue-700">${esc(inst.name)}${inst.short && inst.short !== 'TVET' ? ' (' + esc(inst.short) + ')' : ''} · ${esc(p.faculty)}</div>
        ${bodyHtml(row, opts)}
      </article>`;
  }

  // ---------------------------------------------------------------- one course offered by several institutions
  // Rows with the same course name and qualification type are folded into one entry. Each institution keeps its own
  // APS, Life Orientation rule and result, so nothing is averaged or merged: it is only laid out once.
  let CTX = null; // { subs, E, me } of the render in progress
  const OPEN = new Set(); // keys of group / offering <details> the person has opened (survives re-renders)
  function courseKey(p) { return (String(p.name).trim() + '|' + String(p.qualType || '')).toLowerCase(); }
  function courseGroups(rows) {
    const m = new Map();
    rows.forEach(r => { const k = courseKey(r.p); if (!m.has(k)) m.set(k, { key: k, rows: [] }); m.get(k).rows.push(r); });
    return Array.from(m.values()).map(g => {
      g.best = g.rows.reduce((b, r) => TIER[r.ev.tier].order < TIER[b.ev.tier].order ? r : b, g.rows[0]);
      g.bestCount = g.rows.filter(r => r.ev.tier === g.best.ev.tier).length;
      return g;
    });
  }
  function instLabel(inst) { return inst.short && inst.short !== 'TVET' ? inst.short : inst.name; }
  function groupCard(g, opts) {
    if (g.rows.length === 1) return card(g.rows[0], opts);
    const p = g.rows[0].p, t = TIER[g.best.ev.tier], n = g.rows.length;
    const apsList = g.rows.map(r => r.p.minAps).filter(x => x > 0);
    const apsTxt = apsList.length ? (Math.min.apply(null, apsList) === Math.max.apply(null, apsList) ? 'APS ' + apsList[0] + '+' : 'APS ' + Math.min.apply(null, apsList) + ' to ' + Math.max.apply(null, apsList)) : 'No APS score';
    const pill = (g.best.ev.tier === 'qualify' || g.best.ev.tier === 'open' || g.best.ev.tier === 'close') ? t.label + ' at ' + g.bestCount + ' of ' + n : t.label;
    const gk = 'g:' + g.key;
    return `
      <details class="mz-course bg-white rounded-2xl border border-slate-200 shadow-sm" data-course-key="${esc(gk)}" ${OPEN.has(gk) || opts.openAll ? 'open' : ''}>
        <summary class="px-4 py-2 text-xs">
          <span class="block min-w-0 space-y-1">
            <span class="block text-base font-extrabold text-slate-900 leading-snug">${esc(p.name)}</span>
            <span class="block text-[11px] font-semibold text-slate-600">${esc(p.qualType)} · NQF ${esc(p.nqf)}${p.years ? ' · ' + esc(yearsText(p.years)) : ''}</span>
            <span class="block text-[11px] font-bold text-blue-700">${n} institutions · ${esc(apsTxt)}</span>
            <span class="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-extrabold border ${t.cls}">${esc(pill)}</span>
          </span>
        </summary>
        <div class="px-2 pb-3 space-y-2 text-xs">
          ${g.rows.map(r => {
            const rt = TIER[r.ev.tier], ok = 'o:' + r.p.id;
            return `<details class="mz-offer rounded-xl border border-slate-200 bg-slate-50" data-course-key="${esc(ok)}" data-prog-card="${esc(r.p.id)}" ${OPEN.has(ok) ? 'open' : ''}>
              <summary class="px-3 py-1 text-xs">
                <span class="block min-w-0">
                  <span class="block font-extrabold text-slate-900">${esc(instLabel(r.inst))} <span class="font-semibold text-slate-600">· ${esc(r.p.minAps > 0 ? 'APS ' + r.p.minAps + '+' : (r.p.entryBasis && r.p.entryBasis !== 'nsc' ? 'Not NSC-based' : 'No APS score'))}</span></span>
                  <span class="inline-block mt-0.5 px-2 py-0.5 rounded-full text-[11px] font-extrabold border ${rt.cls}">${esc(rt.label)}</span>
                </span>
              </summary>
              <div class="px-3 pb-3 space-y-2">
                <div class="font-semibold text-blue-700">${esc(r.inst.name)} · ${esc(r.p.faculty)}</div>
                ${bodyHtml(r, opts)}
              </div>
            </details>`;
          }).join('')}
        </div>
      </details>`;
  }

  // ---------------------------------------------------------------- what can I do RIGHT NOW with these marks
  function nowSection(subs, E, f) {
    const q = query(subs, E, { show: 'yes' });
    if (!q.me.nsc.complete) return `<section class="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-2 text-xs"><h2 class="text-sm font-extrabold text-slate-900">What you can do right now</h2><p class="text-slate-600">Enter your 7 marks or read your report card. Then this shows every route you can start with them: bridging courses, diplomas, TVET and degrees.</p></section>`;
    const seen = {}, n = { hc: 0, diploma: 0, tvet: 0, degree: 0 };
    q.rows.forEach(r => { const k = routeOf(r.p) + '|' + courseKey(r.p); if (!seen[k]) { seen[k] = 1; n[routeOf(r.p)]++; } });
    const btn = k => `<button type="button" data-study-route="${k}" aria-pressed="${f.route === k}" class="text-left p-3 rounded-xl border min-h-[48px] ${f.route === k ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 text-slate-900 border-slate-200'}"><span class="block text-xl font-extrabold">${n[k]}</span><span class="block text-[11px] font-extrabold">${esc(ROUTES[k].label)}</span></button>`;
    const sel = f.route && ROUTES[f.route] ? `<div class="p-2 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 font-semibold">${esc(ROUTES[f.route].hint)} <button type="button" data-study-route="all" class="underline font-extrabold">Show all routes</button></div>` : '';
    return `<section class="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-2 text-xs" id="study-now">
      <h2 class="text-sm font-extrabold text-slate-900">What you can do right now</h2>
      <p class="text-slate-600">Your marks open real options. Pick a route to see the courses you can apply for, with no need to repeat Grade 12.</p>
      <div class="grid grid-cols-2 gap-2">${['hc', 'diploma', 'tvet', 'degree'].map(btn).join('')}</div>
      ${sel}
      <p class="text-slate-600">Also worth checking: learnerships, apprenticeships and occupational (QCTO) certificates. <button type="button" data-tab="work" class="underline font-extrabold text-blue-700">See Work options</button></p>
    </section>`;
  }

  // ---------------------------------------------------------------- universities ranked for MY marks
  // One entry per institution: how many of its courses I likely qualify for, how many are close, how many it lists.
  function uniSummary(subs, E, f) {
    const q = query(subs, E, { type: f.type, show: 'all' }), by = {};
    q.rows.forEach(r => {
      const o = by[r.inst.id] || (by[r.inst.id] = { inst: r.inst, yes: 0, close: 0, total: 0 });
      o.total++;
      if (r.ev.tier === 'qualify' || r.ev.tier === 'open') o.yes++; else if (r.ev.tier === 'close') o.close++;
    });
    const list = Object.values(by);
    list.sort((a, b) => (b.yes - a.yes) || (b.close - a.close) || a.inst.name.localeCompare(b.inst.name));
    return { list, complete: !!q.me.nsc.complete };
  }
  function uniRow(u, complete) {
    const nums = complete
      ? `<span class="font-extrabold ${u.yes ? 'text-emerald-800' : 'text-slate-700'}">${u.yes} you likely qualify for</span> · <span class="font-semibold text-slate-600">${u.close} close · ${u.total} listed</span>`
      : `<span class="font-semibold text-slate-600">${u.total} courses listed</span>`;
    return `<button type="button" data-study-uni="${esc(u.inst.id)}" class="w-full text-left px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 min-h-[48px]">
      <span class="block font-extrabold text-slate-900 text-sm">${esc(u.inst.name)}${u.inst.short && u.inst.short !== 'TVET' ? ' (' + esc(u.inst.short) + ')' : ''}</span>
      <span class="block text-[11px]">${nums}</span></button>`;
  }
  function uniSection(subs, E, f) {
    const u = uniSummary(subs, E, f);
    if (!u.list.length) return '';
    const head = u.list.slice(0, 8), rest = u.list.slice(8);
    return `<section class="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-2 text-xs" id="study-unis">
      <h2 class="text-sm font-extrabold text-slate-900">Step 2 · Pick a university</h2>
      <p class="text-slate-600">${u.complete ? 'Ranked by how many courses your marks likely meet. Tap one to see its departments and the courses you qualify for.' : 'Enter all 7 marks (or read your report card) to see how many courses you qualify for at each one.'}</p>
      <div class="space-y-1.5">${head.map(x => uniRow(x, u.complete)).join('')}</div>
      ${rest.length ? `<details class="rounded-xl"><summary class="font-bold text-slate-800 text-xs">Show ${rest.length} more institutions</summary><div class="space-y-1.5 mt-1.5">${rest.map(x => uniRow(x, u.complete)).join('')}</div></details>` : ''}
    </section>`;
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
    const q = query(subs, E, f), limit = f.limit || PAGE;
    CTX = { subs, E, me: q.me };
    const view = f.groupBy === 'inst' ? 'inst' : (f.groupBy === 'flat' ? 'flat' : 'course');
    const cgroups = view === 'course' ? courseGroups(q.rows) : [];
    const shownGroups = cgroups.slice(0, limit);
    const shown = view === 'course' ? [] : q.rows.slice(0, limit);
    const total = view === 'course' ? cgroups.length : q.rows.length, shownN = view === 'course' ? shownGroups.length : shown.length;
    const me = q.me, counts = { qualify: 0, open: 0, close: 0, gap: 0, incomplete: 0 };
    if (view === 'course') cgroups.forEach(g => counts[g.best.ev.tier]++); else q.rows.forEach(r => counts[r.ev.tier]++);
    const none = institutionsWithoutData(allInst);
    const sel = (id, label, opts, cur) => `<select id="${id}" aria-label="${esc(label)}" class="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold min-w-0">${opts.map(([v, l]) => `<option value="${esc(v)}" ${String(cur || 'all') === String(v) ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
    // group results by institution -> faculty, so every department is listed one by one
    const groups = {};
    shown.forEach(r => { const k = r.inst.id; (groups[k] = groups[k] || { inst: r.inst, fac: {} }); (groups[k].fac[r.p.faculty] = groups[k].fac[r.p.faculty] || []).push(r); });
    const grouped = view === 'inst';
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

      ${(!f.inst || f.inst === 'all') ? nowSection(subs, E, f) : ''}

      <section class="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3">
        <div class="grid grid-cols-3 gap-2 text-center text-[11px] font-extrabold">
          <button type="button" data-study-show="yes" class="p-2.5 rounded-xl border ${f.show === 'yes' ? 'ring-2 ring-emerald-500' : ''} bg-emerald-50 text-emerald-900 border-emerald-200"><div class="text-xl">${counts.qualify + counts.open}</div>Likely qualify / can apply</button>
          <button type="button" data-study-show="close" class="p-2.5 rounded-xl border ${f.show === 'close' ? 'ring-2 ring-amber-500' : ''} bg-amber-50 text-amber-900 border-amber-200"><div class="text-xl">${counts.close}</div>Close (small gap)</button>
          <button type="button" data-study-show="all" class="p-2.5 rounded-xl border ${(!f.show || f.show === 'all') ? 'ring-2 ring-slate-500' : ''} bg-slate-50 text-slate-800 border-slate-200"><div class="text-xl">${total}</div>Show everything</button>
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
          <span class="inline-flex items-center gap-1.5" role="group" aria-label="How to list courses">${[['course', 'One row per course'], ['inst', 'By university'], ['flat', 'Every row']].map(([v, l]) => `<button type="button" data-study-view="${v}" aria-pressed="${view === v}" class="px-2.5 py-1.5 rounded-lg border ${view === v ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 text-slate-800 border-slate-200'}">${esc(l)}</button>`).join('')}</span>
          <button type="button" id="study-reset" class="ml-auto px-2.5 py-1.5 rounded-lg border bg-rose-50 text-rose-800 border-rose-200">Clear filters</button>
        </div>
        <div class="text-[11px] text-slate-600">${esc(have.length)} institutions have course details loaded. ${none.length ? `<details class="inline"><summary class="inline cursor-pointer underline font-bold">${none.length} have no course details yet: None</summary><div class="mt-1 text-slate-500">${none.map(i => esc(i.short || i.name)).join(', ')}</div></details>` : ''}</div>
      </section>

      ${(() => {
        const ii = f.inst && f.inst !== 'all' ? have.find(i => i.id === f.inst) : null;
        if (!ii) return '';
        const aps = ii.programmes.map(p => p.minAps).filter(x => x > 0);
        const facs = [...new Set(ii.programmes.map(p => p.faculty))];
        const iq = query(subs, E, { inst: ii.id, show: 'all' }), fq = {};
        iq.rows.forEach(r => { const o = fq[r.p.faculty] || (fq[r.p.faculty] = { y: 0, n: 0 }); o.n++; if (r.ev.tier === 'qualify' || r.ev.tier === 'open') o.y++; });
        const cplt = iq.me.nsc.complete;
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
          <div class="flex flex-wrap gap-1.5">${facs.map(x => `<button type="button" data-study-faculty="${esc(x)}" class="px-2.5 py-1 rounded-full border font-bold ${f.faculty === x ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 text-slate-800 border-slate-200'}">${esc(x)}${cplt && fq[x] ? ' (' + fq[x].y + ' of ' + fq[x].n + ')' : ''}</button>`).join('')}</div>
          <button type="button" id="study-all-unis" class="px-3 py-1.5 rounded-xl border bg-slate-50 text-slate-800 border-slate-200 font-bold">← All universities</button>
        </section>`;
      })()}

      ${(!f.inst || f.inst === 'all') && !f.q && !f.field ? uniSection(subs, E, f) : ''}

      ${q.rows.length === 0 ? '<div class="p-5 rounded-2xl bg-white border border-slate-200 text-sm text-slate-700">No courses match these filters. Tap <strong>Clear filters</strong> or choose "Show everything".</div>' : ''}

      ${grouped ? Object.values(groups).map(g => `
        <section class="space-y-2">
          <div class="px-1"><h2 class="text-sm font-extrabold text-slate-900">${esc(g.inst.name)}</h2><div class="text-[11px] text-slate-500">${esc(g.inst.province)} · ${esc(LO_TEXT[g.inst.loPolicy] ? LO_TEXT[g.inst.loPolicy].long : '')}</div></div>
          ${Object.keys(g.fac).map(fn => `<details open class="rounded-2xl border border-slate-200 bg-slate-50/60 p-2"><summary class="cursor-pointer text-xs font-extrabold text-slate-800 px-2 py-1">${esc(fn)} (${g.fac[fn].length})</summary><div class="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">${g.fac[fn].map(r => card(r, { cmp: state.studyCmp })).join('')}</div></details>`).join('')}
        </section>`).join('') : (view === 'course' ? `<div class="grid grid-cols-1 md:grid-cols-2 gap-3.5 items-start">${shownGroups.map(g => groupCard(g, { cmp: state.studyCmp, openAll: shownGroups.length <= 3 })).join('')}</div>` : `<div class="grid grid-cols-1 md:grid-cols-2 gap-3.5">${shown.map(r => card(r, { cmp: state.studyCmp })).join('')}</div>`)}

      ${total > shownN ? `<div class="text-center"><button type="button" id="study-more" class="px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-extrabold">Show ${Math.min(PAGE, total - shownN)} more ${view === 'course' ? 'courses' : 'rows'} (${total - shownN} left)</button></div>` : ''}

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
  function bindStudy(state, save, rerender, toast, getSubs) {
    const f = state.studyF = state.studyF || {};
    const on = (id, ev, fn) => { const el = document.getElementById(id); if (el) el.addEventListener(ev, fn); };
    const set = (k, v) => { f[k] = v; f.limit = PAGE; save(); rerender(); };
    on('study-type', 'change', e => { f.inst = 'all'; f.faculty = 'all'; set('type', e.target.value); });
    on('study-inst', 'change', e => { f.faculty = 'all'; set('inst', e.target.value); });
    on('study-field', 'change', e => set('field', e.target.value));
    on('study-faculty', 'change', e => set('faculty', e.target.value));
    on('study-sort', 'change', e => set('sort', e.target.value));
    on('study-lo-only', 'change', e => set('loOnly', e.target.checked));
    document.querySelectorAll('[data-study-view]').forEach(b => b.addEventListener('click', () => set('groupBy', b.dataset.studyView)));
    document.querySelectorAll('details[data-course-key]').forEach(d => d.addEventListener('toggle', () => { const k = d.getAttribute('data-course-key'); if (d.open) OPEN.add(k); else OPEN.delete(k); }));
    document.querySelectorAll('[data-study-uni]').forEach(b => b.addEventListener('click', () => {
      const ok = myNumbers(typeof getSubs === 'function' ? getSubs() : state.subjects, root).nsc.complete;
      state.studyF = { inst: b.dataset.studyUni, show: ok ? 'yes' : 'all', groupBy: 'inst' }; save(); rerender(); window.scrollTo(0, 0);
    }));
    on('study-all-unis', 'click', () => { state.studyF = { show: 'all' }; save(); rerender(); window.scrollTo(0, 0); });
    document.querySelectorAll('[data-study-route]').forEach(b => b.addEventListener('click', () => {
      const r = b.dataset.studyRoute; f.route = (r === 'all' || f.route === r) ? 'all' : r; if (f.route !== 'all') f.show = 'yes'; f.limit = PAGE; save(); rerender();
    }));
    document.querySelectorAll('[data-study-field-yes]').forEach(b => b.addEventListener('click', () => {
      state.studyF = { field: b.dataset.studyFieldYes, show: 'yes' }; save(); rerender(); window.scrollTo(0, 0);
    }));
    on('study-reset', 'click', () => { state.studyF = {}; save(); rerender(); });
    on('study-more', 'click', () => { f.limit = (f.limit || PAGE) + PAGE; save(); rerender(); });
    on('study-search', 'input', e => {
      f.q = e.target.value; f.limit = PAGE; clearTimeout(root._stT);
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

  root.MZCAT = { fieldsFor, jobQueryFor, load, evaluate, myNumbers, query, summaryFor, renderStudyPaths, bindStudy, uniSummary, LO_TEXT, TIER, FIELDS, expandReq, institutionsWithData, card };
})(typeof window !== 'undefined' ? window : globalThis);
