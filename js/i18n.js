/* Mzansi Pathways v62 - i18n.js: key-screen translations (isiZulu, siSwati, Xitsonga) on top of English.
 * Exact-match text replacement, so English is always the safe fallback.
 * HONEST STATUS: these are DRAFT translations written without a native-speaker review (reviewed:false).
 * Do not remove the draft notice until a fluent speaker has checked every line (see docs/LANGUAGES_V22.md). */
(function (root) {
  'use strict';
  const EN_KEYS = ['Results','Careers','All Routes','Plan A/B/C','Settings','Close','Choose from Gallery / Files','Take Photo','Auto-Read Photo',
    'Meets Minimums','Conditional','Near Match','Needs Verification','Not Currently Eligible','Show 20 more','All provinces',
    'Admission is decided by the institution.','Institutions','Language'];
  const D = {
    zu: { name: 'isiZulu', reviewed: false, t: ['Imiphumela','Imisebenzi','Zonke izindlela','Uhlelo A/B/C','Izilungiselelo','Vala','Khetha kwi-Gallery / Amafayela','Thatha isithombe','Funda isithombe ngokuzenzakalelayo',
      'Ifinyelela ezidingweni eziphansi','Ngokwemibandela','Seduze nokufaneleka','Idinga ukuqinisekiswa','Okwamanje ayifaneleki','Bonisa ezingu-20 ezengeziwe','Zonke izifundazwe',
      'Ukwamukelwa kunqunywa yisikhungo.','Izikhungo','Ulimi'] },
    ss: { name: 'siSwati', reviewed: false, t: ['Imiphumela','Emisebenti','Tonkhe tindlela','Luhlelo A/B/C','Kulungiselela','Vala','Khetsa e-Gallery / Emafayela','Thatha sitfombe','Fundza sitfombe ngekwakho',
      'Ifinyelela kulokudzingekako','Ngemibandzela','Seduze nekufaneleka','Idzinga kucinisekiswa','Angakafaneli njengamanje','Khombisa letingu-20 letingetiwe','Tonkhe tifundza',
      'Kwemukelwa kunqunywa sisikhungo.','Tikhungo','Lulwimi'] },
    ts: { name: 'Xitsonga', reviewed: false, t: ['Mimbuyelo','Mintirho','Tindlela hinkwato','Pulani A/B/C','Marungulelo','Pfala','Hlawula eka Gallery / Mafayili','Teka xifaniso','Hlaya xifaniso hi ku tiyimela',
      'Swi fikelela leswi lavekaka','Hi swiyimo','Ya tshinela','Swi lava ku tiyisisiwa','Hi nkarhi lowu a nga fanelanga','Kombisa 20 yin\'wana','Swifundzha hinkwaswo',
      'Ku amukeriwa swi tiyisisiwa hi xikolo.','Swikolo','Ririmi'] }
  };
  const DRAFT = { en: '', zu: 'Lokhu kuyinguqulo yokuqala engakahlolwa ngumuntu okhuluma isiZulu kahle.', ss: 'This is a draft siSwati translation not yet checked by a fluent speaker. English is always correct.', ts: 'This is a draft Xitsonga translation not yet checked by a fluent speaker. English is always correct.' };
  let lang = 'en', busy = false; const orig = new WeakMap();
  function map(l) { const m = {}; if (D[l]) EN_KEYS.forEach((k, i) => { m[k] = D[l].t[i]; }); return m; }
  function apply(rootEl) {
    if (busy) return; busy = true;
    try {
      const m = map(lang), w = document.createTreeWalker(rootEl || document.body, NodeFilter.SHOW_TEXT);
      let n; while ((n = w.nextNode())) {
        const par = n.parentNode && n.parentNode.nodeName; if (par === 'SCRIPT' || par === 'STYLE' || par === 'TEXTAREA') continue;
        if (!orig.has(n)) { const s = n.nodeValue.trim(); if (!(s in map('zu')) && !EN_KEYS.includes(s)) continue; orig.set(n, n.nodeValue); }
        const o = orig.get(n); if (o === undefined) continue; const s = o.trim();
        const to = lang === 'en' ? o : (m[s] ? o.replace(s, m[s]) : o);
        if (n.nodeValue !== to) n.nodeValue = to;
      }
      const note = document.getElementById('lang-draft-note'); if (note) note.textContent = DRAFT[lang] || '';
    } finally { busy = false; }
  }
  function setLang(l) {
    lang = D[l] ? l : 'en'; try { localStorage.setItem('mz_lang', lang); } catch (e) {}
    document.documentElement.lang = lang; apply();
  }
  function injectSelector() {
    const done = document.getElementById('settings-done-btn'); if (!done || document.getElementById('lang-select')) return;
    const d = document.createElement('div'); d.className = 'mt-3 text-xs font-bold';
    d.innerHTML = '<label for="lang-select">Language</label> <select id="lang-select" class="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold"><option value="en">English</option>' +
      Object.keys(D).map(k => '<option value="' + k + '">' + D[k].name + '</option>').join('') + '</select><div id="lang-draft-note" class="mt-1 text-[11px] text-amber-900"></div>';
    done.parentNode.insertBefore(d, done);
    const s = d.querySelector('select'); s.value = lang; s.addEventListener('change', e => setLang(e.target.value));
  }
  function start() {
    try { lang = localStorage.getItem('mz_lang') || 'en'; } catch (e) {} if (!D[lang]) lang = 'en';
    injectSelector(); setLang(lang); let t = null;
    new MutationObserver(() => { clearTimeout(t); t = setTimeout(() => { injectSelector(); apply(); }, 60); }).observe(document.body, { childList: true, subtree: true });
  }
  root.MZI18N = { D, EN_KEYS, setLang, apply, start, get lang() { return lang; } };
  if (typeof document !== 'undefined') (document.readyState === 'loading' ? document.addEventListener.bind(document, 'DOMContentLoaded') : (f => f()))(start);
})(typeof window !== 'undefined' ? window : globalThis);
