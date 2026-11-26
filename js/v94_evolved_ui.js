/* js/v94_evolved_ui.js — Live Interactive Reverse-APS Solver, NSFAS/Funza Checkers, National Pathways Search & Storage Guard
 * Strictly zero raw HTML sinks & zero inline handlers (100% Trusted Types & CSP script-src 'self' compliant). */
(function () {
  'use strict';

  const NSC_BOUNDS = [30, 40, 50, 60, 70, 80];
  const nscPts = (m) => (m >= 80 ? 7 : m >= 70 ? 6 : m >= 60 ? 5 : m >= 50 ? 4 : m >= 40 ? 3 : m >= 30 ? 2 : 1);

  function el(tag, cls, text) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  }

  function solveReverseAps(subjects, targetAps) {
    const clean = (subjects || [])
      .filter((s) => s && !s.isLifeOrientation && !s.isLO && Number.isFinite(Number(s.mark)))
      .map((s) => ({ name: s.name || 'Subject', orig: Number(s.mark), mark: Number(s.mark) }))
      .sort((a, b) => b.mark - a.mark);
    if (clean.length < 6) return { ok: false, msg: 'Enter at least 6 non-LO subjects first to calculate your minimum mark plan.' };
    const active = clean.slice(0, 6);
    const current = active.reduce((acc, s) => acc + nscPts(s.mark), 0);
    if (current >= targetAps) return { ok: true, met: true, current, targetAps, totalPct: 0, changes: [] };
    if (targetAps > 42) return { ok: false, msg: 'Standard 6-subject NSC APS maximum is 42.' };
    const gap = targetAps - current;
    for (let step = 0; step < gap; step++) {
      let bestIdx = -1, bestCost = Infinity, bestNext = null;
      for (let i = 0; i < active.length; i++) {
        const nb = NSC_BOUNDS.find((b) => active[i].mark < b);
        if (nb !== undefined && (nb - active[i].mark) < bestCost) {
          bestCost = nb - active[i].mark; bestIdx = i; bestNext = nb;
        }
      }
      if (bestIdx === -1) return { ok: false, msg: 'Maximum reachable APS hit.' };
      active[bestIdx].mark = bestNext;
    }
    const changes = active.filter((s) => s.mark > s.orig).map((s) => ({
      name: s.name, from: s.orig, to: s.mark, delta: s.mark - s.orig, remark: (s.mark - s.orig) <= 3
    }));
    return { ok: true, met: false, current, targetAps, totalPct: changes.reduce((a, c) => a + c.delta, 0), changes };
  }

  function getLiveSubjects() {
    try {
      const raw = localStorage.getItem('mzansi_pathways_v15_state') || localStorage.getItem('mzansi_pathways_state');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.subjects) && parsed.subjects.length >= 6) return parsed.subjects;
      }
    } catch (_e) {}
    return [
      { name: 'English Home Language', mark: 67 },
      { name: 'isiZulu First Additional Language', mark: 78 },
      { name: 'Mathematics', mark: 58 },
      { name: 'Physical Sciences', mark: 64 },
      { name: 'Life Sciences', mark: 59 },
      { name: 'Geography', mark: 48 },
      { name: 'Life Orientation', mark: 80, isLO: true }
    ];
  }

  function checkNsfasAppealUi(studentType, days, yearsFunded, minYears, creditsLeft) {
    const maxDays = studentType === 'FTEN' ? 15 : 30;
    if (days > maxDays) return { ok: false, msg: `Your ${maxDays}-day myNSFAS appeal window has passed. Contact NSFAS on 0800 067 327.` };
    if (yearsFunded >= minYears + 2) return { ok: false, msg: 'Hard N+2 cap reached — NSFAS cannot consider appeals past N+2 (N+3 for disability).' };
    if (studentType === 'SENIOR' && yearsFunded === minYears + 1 && creditsLeft <= 50) {
      return { ok: true, msg: `Eligible for Propensity Letter appeal (${maxDays - days} days left): have your faculty/principal sign confirming <=50% final credits remain.` };
    }
    return { ok: true, msg: `Within appeal window (${maxDays - days} days left): upload supporting proof on myNSFAS (0800 067 327).` };
  }

  function mountSmartTools() {
    if (document.getElementById('v94-smart-tools')) return;
    const host = document.querySelector('main') || document.body;
    const section = el('section', 'v94-tools-card');
    section.id = 'v94-smart-tools';
    section.setAttribute('aria-label', 'Smart SA Pathways & Reverse-APS Tools');

    const hdr = el('div', 'v94-tools-hdr');
    hdr.appendChild(el('h2', 'v94-tools-title', 'Smart SA Pathways Toolkit (v94)'));
    hdr.appendChild(el('p', 'v94-tools-sub', 'Offline Reverse-APS Goal Solver, NSFAS Appeal Navigator, and National Pathways Search (CAS, Nursing, Agriculture, SAPS & SANDF).'));
    section.appendChild(hdr);

    // Safari 7-day storage durability check
    if (navigator.storage && navigator.storage.persist) {
      navigator.storage.persisted().then((ok) => {
        if (!ok) navigator.storage.persist().catch(() => {});
      }).catch(() => {});
    }
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent || '');
    const isStandalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true;
    if (isIOS && !isStandalone) {
      section.appendChild(el('div', 'v94-warn-banner', 'iPhone Safari Notice: Safari clears local data after 7 days of disuse. Tap Share -> Add to Home Screen or download an encrypted backup to protect your marks.'));
    }

    // Tabs
    const tabRow = el('div', 'v94-tab-row');
    tabRow.setAttribute('role', 'tablist');
    const tabs = [
      { id: 'rev', label: '1. Reverse-APS Solver' },
      { id: 'aid', label: '2. NSFAS Appeal & Funza 2027' },
      { id: 'nat', label: '3. CAS, Nursing, Agri & Services' }
    ];
    const panels = {};
    const buttons = {};

    tabs.forEach((t, idx) => {
      const b = el('button', idx === 0 ? 'v94-tab-btn is-active' : 'v94-tab-btn', t.label);
      b.type = 'button';
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-selected', idx === 0 ? 'true' : 'false');
      b.addEventListener('click', () => {
        tabs.forEach((x) => {
          buttons[x.id].classList.toggle('is-active', x.id === t.id);
          buttons[x.id].setAttribute('aria-selected', x.id === t.id ? 'true' : 'false');
          panels[x.id].hidden = x.id !== t.id;
        });
      });
      buttons[t.id] = b;
      tabRow.appendChild(b);
    });
    section.appendChild(tabRow);

    // Panel 1: Reverse-APS Solver
    const pRev = el('div', 'v94-panel');
    const revRow = el('div', 'v94-inline-row');
    const lblT = el('label', 'v94-lbl', 'Target APS (20–42):');
    lblT.htmlFor = 'v94-target-aps';
    const inpT = el('input', 'v94-input');
    inpT.id = 'v94-target-aps'; inpT.type = 'number'; inpT.min = '20'; inpT.max = '42'; inpT.value = '30';
    const btnSolve = el('button', 'v94-btn-primary', 'Calculate Minimum Mark Lift');
    btnSolve.type = 'button'; btnSolve.id = 'v94-solve-aps-btn';
    const revOut = el('div', 'v94-result-box', 'Tap "Calculate Minimum Mark Lift" to find the smallest % increase across your subjects needed to reach your target APS.');
    revOut.id = 'v94-reverse-out';
    btnSolve.addEventListener('click', () => {
      const res = solveReverseAps(getLiveSubjects(), Number(inpT.value || 30));
      revOut.textContent = '';
      if (!res.ok) { revOut.appendChild(el('div', '', res.msg)); return; }
      if (res.met) { revOut.appendChild(el('strong', '', `Already met! Your current APS (${res.current}) meets or exceeds ${res.targetAps}.`)); return; }
      revOut.appendChild(el('strong', '', `APS ${res.current} -> ${res.targetAps} needs only +${res.totalPct}% total across ${res.changes.length} subject(s):`));
      const ul = el('ul', 'v94-list');
      res.changes.forEach((c) => {
        const tag = c.remark ? ' [Strong January DBE Re-mark Candidate]' : ' [May/June Rewrite Target]';
        ul.appendChild(el('li', '', `${c.name}: ${c.from}% -> ${c.to}% (+${c.delta}%)${tag}`));
      });
      revOut.appendChild(ul);
    });
    revRow.append(lblT, inpT, btnSolve);
    pRev.append(revRow, revOut);
    panels.rev = pRev;
    section.appendChild(pRev);

    // Panel 2: NSFAS Appeal & Funza Lushaka 2027 Quick-Checker
    const pAid = el('div', 'v94-panel');
    pAid.hidden = true;
    const aidRow = el('div', 'v94-inline-row');
    const selType = el('select', 'v94-input');
    selType.id = 'v94-nsfas-type'; selType.setAttribute('aria-label', 'NSFAS student type');
    [['FTEN', 'First-Time Entering (15-day window)'], ['SENIOR', 'Senior / Continuing (30-day window)']].forEach(([v, tx]) => {
      const o = el('option', '', tx); o.value = v; selType.appendChild(o);
    });
    const inpDays = el('input', 'v94-input');
    inpDays.id = 'v94-nsfas-days'; inpDays.type = 'number'; inpDays.min = '0'; inpDays.max = '90'; inpDays.value = '7'; inpDays.setAttribute('aria-label', 'Days since NSFAS outcome');
    const btnAid = el('button', 'v94-btn-primary', 'Check Appeal Window');
    btnAid.type = 'button';
    const aidOut = el('div', 'v94-result-box', 'Funza Lushaka 2027 (4-yr BEd, age <=30 by 31 Mar 2027): returning closes 30 Nov 2026; new closes 31 Jan 2027 at eservices.gov.za (1-for-1 public school service obligation).');
    btnAid.addEventListener('click', () => {
      const r = checkNsfasAppealUi(selType.value, Number(inpDays.value || 0), selType.value === 'SENIOR' ? 4 : 0, 3, 40);
      aidOut.textContent = r.msg;
    });
    aidRow.append(selType, inpDays, btnAid);
    pAid.append(aidRow, aidOut);
    panels.aid = pAid;
    section.appendChild(pAid);

    // Panel 3: National Pathways & Emergency Helplines Instant Search
    const pNat = el('div', 'v94-panel');
    pNat.hidden = true;
    const natSearch = el('input', 'v94-input');
    natSearch.id = 'v94-nat-search'; natSearch.type = 'search'; natSearch.placeholder = 'Search CAS, Higher Health, Nursing, Agriculture, SAPS, SANDF...';
    const natList = el('div', 'v94-nat-list');
    const ITEMS = [
      { title: 'Central Application Service (CAS — Replaced CACH from 2026)', detail: 'Official WhatsApp: 081 308 4196. Do not follow outdated CACH SMS shortcodes.' },
      { title: 'Higher Health 24h Free Student Mental Health Support', detail: 'Toll-free 24/7 crisis & wellbeing line: 0800 36 36 36.' },
      { title: 'SA Youth / YES4Youth (100% Zero-Rated Data-Free)', detail: 'sayouth.mobi · Toll-free 0800 72 72 72 · Ages 18–34, Grade 9–12 & Matric.' },
      { title: 'Public Nursing Colleges (SANC Accredited — 9 Provinces + Military)', detail: 'Verify on sanc.co.za (Section 42). Mpumalanga College of Nursing R171 APS 23 excl. LO. Free provincial Dept. of Health portals only.' },
      { title: '11 Public Colleges of Agriculture (CHE Accredited)', detail: 'Elsenburg, Cedara, Fort Cox, Glen, Grootfontein (GADI), Madzivhandila, Owen Sithole, Potchefstroom, Tompi Seleka, Tsolo, Taung.' },
      { title: 'SAPS BPDLP & SANDF MSDS Uniformed Services', detail: 'SAPS: free online at saps.gov.za (age 18–35). SANDF MSDS: hardcopy/hand-delivered forms ONLY (NOT FOR SALE — no online portal).' }
    ];
    function renderNat(q) {
      natList.textContent = '';
      const term = String(q || '').trim().toLowerCase();
      const hits = ITEMS.filter((it) => !term || `${it.title} ${it.detail}`.toLowerCase().includes(term));
      hits.forEach((it) => {
        const card = el('div', 'v94-nat-item');
        card.appendChild(el('strong', '', it.title));
        card.appendChild(el('div', '', it.detail));
        natList.appendChild(card);
      });
    }
    natSearch.addEventListener('input', (e) => renderNat(e.target.value));
    renderNat('');
    pNat.append(natSearch, natList);
    panels.nat = pNat;
    section.appendChild(pNat);

    host.appendChild(section);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountSmartTools);
  else mountSmartTools();
})();
