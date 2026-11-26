/* Mzansi Pathways v67 - data.js: year-aware data loader. No rules live here, only plumbing. */
(function (root) {
  'use strict';
  const PROVINCES = ['Eastern Cape','Free State','Gauteng','KwaZulu-Natal','Limpopo','Mpumalanga','North West','Northern Cape','Western Cape'];
  // Applications for next year open mid-year; from August we default to next year's intake.
  function defaultYear(d) { d = d || new Date(); return d.getMonth() >= 7 ? d.getFullYear() + 1 : d.getFullYear(); }
  const state = { institutions: [], years: [], bursaries: [], familyLabels: { tech: 'Tech & IT', artisan: 'Artisan & Mining', admin: 'Public Admin & Office' }, loaded: false };
  const instById = id => state.institutions.find(i => i.id === id);

  // Client-side safety net: a record can only LOSE trust here, never gain it. Real proof is checked in CI (gate 85).
  function trustOf(p) {
    // Rows read from the official prospectus by the pipeline carry their own list of automatic checks. Every one must pass and the row must be recent.
    if (p.verificationStatus === 'auto_verified') {
      const cs = Array.isArray(p.autoChecks) ? p.autoChecks : [];
      const good = cs.filter(c => c && c.ok === true).length;
      const days = p.lastVerifiedAt ? (Date.now() - Date.parse(p.lastVerifiedAt)) / 864e5 : 9999;
      const pass = cs.length >= 14 && good === cs.length && days <= 120;
      return { checks: good, total: cs.length, reviewers: 0, auto: true, ageDays: Math.round(days), status: pass ? 'verified' : 'pending_review' };
    }
    const types = new Set((p.checks || []).filter(c => c.ok === true).map(c => c.type));
    const n = ['official_domain', 'document_hash', 'second_source', 'institution_confirmation', 'year_match'].filter(t => types.has(t)).length;
    const rev = new Set((p.signoffs || []).map(s => s.reviewer)).size;
    const age = p.lastVerifiedAt ? (Date.now() - Date.parse(p.lastVerifiedAt)) / 864e5 : 9999;
    const ok = p.verificationStatus === 'verified' && n === 5 && rev >= 2 && age <= 120;
    return { checks: n, reviewers: rev, ageDays: Math.round(age), status: p.verificationStatus === 'verified' && !ok ? 'pending_review' : p.verificationStatus };
  }
  function toAppShape(p) {
    const tr = trustOf(p);
    const inst = instById(p.institutionId) || { name: p.institutionName || p.institutionId, short: '', type: 'Other', province: p.province, officialUrl: p.officialUrl };
    const closes = p.closes || null;
    return {
      id: p.intakeYear ? p.id + '@' + p.intakeYear : p.id, baseId: p.id, careerFamily: p.careerFamily || 'other', institution: inst.name + (inst.short ? ' (' + inst.short + ')' : ''),
      instType: inst.type, campus: p.campus || '', province: p.province || inst.province, distanceKmFromMp: null,
      route: p.route, isUniversity: p.route === 'University', name: p.name, nqf: p.nqf ? 'NQF ' + p.nqf : '', duration: p.duration || '',
      estAnnualCost: p.feesNote || 'See official fee schedule', costLevel: 'Check official fees', funding: p.funding || [],
      deadline: closes || 'Check official portal', closes: closes, verifiedRules: tr.status !== 'unverified_existence',
      verificationStatus: tr.status, trust: tr, sourceTier: tr.auto ? 'Auto-checked against the official prospectus: ' + (p.sourceDoc || 'source not recorded') + (p.sourcePage ? ', ' + p.sourcePage : '') + ' | ' + tr.checks + '/' + tr.total + ' automatic checks passed' : (p.sourceDoc || 'Source not recorded') + (p.sourcePage ? ', ' + p.sourcePage : '') + ' | checks ' + tr.checks + '/5, reviewers ' + tr.reviewers + '/2',
      legitStatus: inst.type === 'University' || inst.type === 'UoT' ? 'Public institution (DHET)' : 'Verify accreditation',
      minPassLevel: p.minPassLevel, minAps: p.minAps || 0, requiresSelection: !!p.requiresSelection,
      subjectRequirements: p.subjectRequirements || [], apsMethod: inst.apsMethod || null,
      officialUrl: p.officialUrl, intakeYear: p.intakeYear, lastVerifiedAt: p.lastVerifiedAt
    };
  }
  // Failsafe fetch: 10 s timeout (a stalled network can never freeze the app), one retry, and the body must be a JSON object.
  async function getJson(u, tries) {
    tries = tries || 2; let last;
    for (let i = 0; i < tries; i++) {
      const ctl = typeof AbortController === 'function' ? new AbortController() : null;
      const timer = ctl ? setTimeout(() => ctl.abort(), 10000) : null;
      try {
        const r = await fetch(u, { cache: 'no-cache', signal: ctl ? ctl.signal : undefined });
        if (!r.ok) throw new Error(u + ' ' + r.status);
        const j = await r.json();
        if (!j || typeof j !== 'object') throw new Error(u + ' is not a JSON object');
        return j;
      } catch (e) { last = e; } finally { if (timer) clearTimeout(timer); }
    }
    throw last;
  }

  // Loads every year listed in data/index.json. A bad file is skipped, never fatal.
  async function load(target, careers) {
    let added = 0;
    try {
      const idx = await getJson('./data/index.json');
      try { state.institutions = (await getJson('./data/' + idx.institutions)).institutions || []; } catch (e) {}
      try {
        const cd = await getJson('./data/' + idx.careers); Object.assign(state.familyLabels, cd.families || {});
        for (const c of cd.careers || []) if (careers && !careers.some(x => x.id === c.id)) { careers.push(c); added++; }
      } catch (e) {}
      try { state.bursaries = (await getJson('./data/' + idx.bursaries)).bursaries || []; } catch (e) {}
      for (const f of idx.files || []) {
        try {
          const d = await getJson('./data/' + f);
          for (const p of Array.isArray(d.programmes) ? d.programmes : []) {
            if (!p || !p.id || !p.intakeYear) continue; // a record with no id or year cannot be keyed safely, so it is skipped, never guessed
            const shaped = toAppShape(p);
            if (target.some(x => x.id === shaped.id)) continue; // same programme AND same year only; other years are kept
            target.push(shaped); added++;
            if (state.years.indexOf(p.intakeYear) < 0 && isFinite(p.intakeYear)) state.years.push(p.intakeYear);
          }
        } catch (e) { console.warn('data file skipped', f, e); }
      }
      state.years.sort();
    } catch (e) { console.warn('data index unavailable - using built-in samples', e); }
    state.loaded = true; return added;
  }
  // Years a learner can pick: loaded years + default year + neighbours, so every year works.
  function yearChoices() {
    const y = defaultYear(), s = new Set(state.years.concat([y - 1, y, y + 1, y + 2, y + 3]));
    return Array.from(s).sort();
  }
  root.MZDATA = { PROVINCES, defaultYear, load, yearChoices, state, toAppShape, trustOf };
})(window);
