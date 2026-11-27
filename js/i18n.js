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
      'Ukwamukelwa kunqunywa yisikhungo.','Izikhungo','Ulimi'],
      x: { 'Career Paths':'Izindlela zemisebenzi','Study Paths':'Izindlela zokufunda','Work Paths':'Izindlela zomsebenzi','Evidence & CV':'Ubufakazi ne-CV','My marks':'Amamaki ami','My pathway':'Indlela yami','Study':'Ukufunda','Work':'Umsebenzi','Funding':'Uxhaso lwezimali','More':'Okuningi','Tour':'Uhambo','Sync':'Vumelanisa',
        'Install App':'Faka uhlelo','Offline':'Akukho inthanethi','University':'Inyuvesi','University of Technology':'Inyuvesi Yobuchwepheshe','TVET or occupational':'I-TVET noma amakhono','Learn and earn':'Funda uthole nemali','Check my options':'Hlola izinketho zami',
        'Scan or paste my results':'Skena noma unamathisele imiphumela','Free. No sign-up.':'Mahhala. Akudingi ukubhalisa.','Take the 1-minute tour':'Thatha uhambo lweminithi elilodwa' } },
    af: { name: 'Afrikaans', reviewed: false, t: ['Resultate','Loopbane','Alle roetes','Plan A/B/C','Instellings','Maak toe','Kies uit Galery / L\u00eaers','Neem foto','Lees foto outomaties',
      'Voldoen aan minimum','Voorwaardelik','Amper \u2019n passing','Verifikasie nodig','Tans nie geskik nie','Wys nog 20','Alle provinsies',
      'Toelating word deur die instelling besluit.','Instellings','Taal'],
      // Extra exact-match labels (home screen, navigation). Draft, same status as the lines above.
      x: { 'Career Paths':'Loopbaanpaaie','Study Paths':'Studiepaaie','Work Paths':'Werkpaaie','Evidence & CV':'Bewyse en CV','My marks':'My punte','My pathway':'My pad','Study':'Studeer','Work':'Werk','Funding':'Befondsing','More':'Meer','Tour':'Toer','Sync':'Sinkroniseer',
        'Install App':'Installeer toepassing','Offline':'Aflyn','University':'Universiteit','University of Technology':'Universiteit van Tegnologie','TVET or occupational':'TVET of beroepsgerig','Learn and earn':'Leer en verdien','Check my options':'Kyk na my opsies',
        'Scan or paste my results':'Skandeer of plak my uitslae','Tell us where you are.':'Vertel ons waar jy is.','What do you want to figure out?':'Wat wil jy uitvind?','Free. No sign-up.':'Gratis. Geen registrasie.',
        'Enter your results and see where you stand.':'Voer jou uitslae in en sien waar jy staan.','Courses and institutions you realistically qualify for.':'Kursusse en instellings waarvoor jy realisties kwalifiseer.',
        'Jobs and careers that match where you are now.':'Werke en loopbane wat by jou huidige posisie pas.','Keep your proof and build a CV.':'Hou jou bewyse en bou \u2019n CV.','Bursaries and what each route will cost you.':'Beurse en wat elke roete jou sal kos.',
        'Build a Plan A, B and C you can act on.':'Bou \u2019n Plan A, B en C waarop jy kan optree.','Take the 1-minute tour':'Doen die 1-minuut-toer' } },
    ss: { name: 'siSwati', reviewed: false, t: ['Imiphumela','Emisebenti','Tonkhe tindlela','Luhlelo A/B/C','Kulungiselela','Vala','Khetsa e-Gallery / Emafayela','Thatha sitfombe','Fundza sitfombe ngekwakho',
      'Ifinyelela kulokudzingekako','Ngemibandzela','Seduze nekufaneleka','Idzinga kucinisekiswa','Angakafaneli njengamanje','Khombisa letingu-20 letingetiwe','Tonkhe tifundza',
      'Kwemukelwa kunqunywa sisikhungo.','Tikhungo','Lulwimi'],
      x: { 'Career Paths':'Tindlela temisebenti','Study Paths':'Tindlela tekufundza','Work Paths':'Tindlela temsebenti','Evidence & CV':'Bufakazi ne-CV','My marks':'Emamaki ami','My pathway':'Indlela yami','Study':'Kufundza','Work':'Umsebenti','Funding':'Lusito lwetimali','More':'Lokunye','Tour':'Luhambo','Sync':'Vumelanisa',
        'Install App':'Faka luhlelo','Offline':'Akukho inthanethi','University':'Inyuvesi','University of Technology':'Inyuvesi Yebuchwepheshe','TVET or occupational':'I-TVET noma emakhono','Learn and earn':'Fundza utfole nemali','Check my options':'Hlola tinkhetfo tami',
        'Scan or paste my results':'Skena noma unamatsisele imiphumela','Free. No sign-up.':'Mahhala. Akudzingi kubhalisa.','Take the 1-minute tour':'Tsatsa luhambo lweminithi linye' } },
    ts: { name: 'Xitsonga', reviewed: false, t: ['Mimbuyelo','Mintirho','Tindlela hinkwato','Pulani A/B/C','Marungulelo','Pfala','Hlawula eka Gallery / Mafayili','Teka xifaniso','Hlaya xifaniso hi ku tiyimela',
      'Swi fikelela leswi lavekaka','Hi swiyimo','Ya tshinela','Swi lava ku tiyisisiwa','Hi nkarhi lowu a nga fanelanga','Kombisa 20 yin\'wana','Swifundzha hinkwaswo',
      'Ku amukeriwa swi tiyisisiwa hi xikolo.','Swikolo','Ririmi'],
      x: { 'Career Paths':'Tindlela ta mintirho','Study Paths':'Tindlela ta ku dyondza','Work Paths':'Tindlela ta ntirho','Evidence & CV':'Vumbhoni na CV','My marks':'Timaraka ta mina','My pathway':'Ndlela ya mina','Study':'Ku dyondza','Work':'Ntirho','Funding':'Nseketelo wa timali','More':'Swin\'wana','Tour':'Riendzo','Sync':'Hlanganisa',
        'Install App':'Nghenisa app','Offline':'A ku na inthanete','University':'Yunivhesiti','University of Technology':'Yunivhesiti ya Thekinoloji','TVET or occupational':'TVET kumbe vutshila','Learn and earn':'Dyondza u kuma mali','Check my options':'Kamba leswi ndzi nga swi endlaka',
        'Scan or paste my results':'Sikena kumbe u namarheta mimbuyelo','Free. No sign-up.':'Mahala. A swi lavi ku tsarisa.','Take the 1-minute tour':'Teka riendzo ra minete yin\'we' } },
    st: { name: 'Sesotho', reviewed: false, t: ['Diphetho','Mesebetsi','Mekgwa yohle','Morero A/B/C','Ditlhophiso','Kwala','Kgetha ho Gallery / Difaele','Nka senepe','Bala senepe ka boiketsetso',
      'E fihlela ditlhoko tse tlase','Ka maemo','Haufi le ho tshwaneleha','E hloka netefatso','Ha o tshwanelehe ha jwale','Bontsha tse ding tse 20','Diprofinse tsohle',
      'Kamohelo e etswa qeto ke setheo.','Ditheo','Puo'],
      x: { 'Career Paths':'Mekgwa ya mesebetsi','Study Paths':'Mekgwa ya ho ithuta','Work Paths':'Mekgwa ya mosebetsi','Evidence & CV':'Bopaki le CV','My marks':'Matshwao a ka','My pathway':'Tsela ya ka','Study':'Ho ithuta','Work':'Mosebetsi','Funding':'Tshehetso ya ditjhelete','More':'Tse ding','Tour':'Leeto','Sync':'Kopanya',
        'Install App':'Kenya app','Offline':'Ha ho inthanete','University':'Yunivesithi','University of Technology':'Yunivesithi ya Theknoloji','TVET or occupational':'TVET kapa mosebetsi wa matsoho','Learn and earn':'Ithute o fumane moputso','Check my options':'Hlahloba dikgetho tsa ka',
        'Scan or paste my results':'Skena kapa o manamise diphetho','Free. No sign-up.':'Mahala. Ha ho hlokahale ho ingodisa.','Take the 1-minute tour':'Nka leeto la motsotso o le mong' } },
    xh: { name: 'isiXhosa', reviewed: false, t: ['Iziphumo','Imisebenzi','Zonke iindlela','Isicwangciso A/B/C','Iisetingi','Vala','Khetha kwi-Gallery / Iifayile','Thatha ifoto','Funda ifoto ngokuzenzekelayo',
      'Iyafikelela kwiimfuno ezisezantsi','Ngokwemiqathango','Kufutshane nokufaneleka','Ifuna ukuqinisekiswa','Okwangoku akufanelekanga','Bonisa ezingama-20 ezongezelelweyo','Onke amaphondo',
      'Ukwamkelwa kugqitywa liziko.','Amaziko','Ulwimi'],
      x: { 'Career Paths':'Iindlela zemisebenzi','Study Paths':'Iindlela zokufunda','Work Paths':'Iindlela zomsebenzi','Evidence & CV':'Ubungqina ne-CV','My marks':'Amanqaku am','My pathway':'Indlela yam','Study':'Ukufunda','Work':'Umsebenzi','Funding':'Inkxaso-mali','More':'Okunye','Tour':'Ukhenketho','Sync':'Ungqamaniso',
        'Install App':'Faka i-app','Offline':'Akukho intanethi','University':'IYunivesithi','University of Technology':'IYunivesithi yeTekhnoloji','TVET or occupational':'I-TVET okanye izakhono','Learn and earn':'Funda ufumane umvuzo','Check my options':'Jonga iindlela zam',
        'Scan or paste my results':'Skena okanye uncamathisele iziphumo','Free. No sign-up.':'Simahla. Akukho kubhalisa.','Take the 1-minute tour':'Thatha ukhenketho lomzuzu omnye' } },
    nso: { name: 'Sepedi', reviewed: false, t: ['Dipoelo','Mešomo','Ditsela ka moka','Leano A/B/C','Dipeakanyo','Tswalela','Kgetha go Gallery / Difaele','Tšea seswantšho','Bala seswantšho ka boitshepo',
      'E fihlelela dinyakwa tša tlase','Ka maemo','Kgauswi le go swanela','E nyaka go netefatšwa','Ga o swanele gabjale','Laetša tše dingwe tše 20','Diprofense ka moka',
      'Kamogelo e dirwa ke setheo.','Ditheo','Polelo'],
      x: { 'Career Paths':'Ditsela tša mešomo','Study Paths':'Ditsela tša go ithuta','Work Paths':'Ditsela tša mošomo','Evidence & CV':'Bohlatse le CV','My marks':'Dimaraka tša ka','My pathway':'Tsela ya ka','Study':'Go ithuta','Work':'Mošomo','Funding':'Thekgo ya ditšhelete','More':'Tše dingwe','Tour':'Leeto','Sync':'Kopanya',
        'Install App':'Tsenya app','Offline':'Ga go inthanete','University':'Yunibesithi','University of Technology':'Yunibesithi ya Theknolotši','TVET or occupational':'TVET goba mabokgoni','Learn and earn':'Ithute o hwetše moputso','Check my options':'Lekola dikgetho tša ka',
        'Scan or paste my results':'Skena goba o kgomaretše dipoelo','Free. No sign-up.':'Mahala. Ga go hloke go ingwadiša.','Take the 1-minute tour':'Tšea leeto la motsotso o tee' } },
    tn: { name: 'Setswana', reviewed: false, t: ['Dipholo','Ditiro','Ditsela tsotlhe','Leano A/B/C','Dithulaganyo','Tswala','Tlhopha go Gallery / Difaele','Tsaya senepe','Bala senepe ka boiketsetso',
      'E fitlhelela ditlhokego tse di kwa tlase','Ka maemo','Gaufi le go tshwanelega','E tlhoka netefatso','Ga o tshwanelege jaanong','Bontsha tse dingwe di le 20','Diprofense tsotlhe',
      'Kamogelo e swetswa ke setheo.','Ditheo','Puo'],
      x: { 'Career Paths':'Ditsela tsa ditiro','Study Paths':'Ditsela tsa go ithuta','Work Paths':'Ditsela tsa tiro','Evidence & CV':'Bosupi le CV','My marks':'Matshwao a me','My pathway':'Tsela ya me','Study':'Go ithuta','Work':'Tiro','Funding':'Thuso ya madi','More':'Tse dingwe','Tour':'Loeto','Sync':'Kopanya',
        'Install App':'Tsenya app','Offline':'Ga go inthanete','University':'Yunibesithi','University of Technology':'Yunibesithi ya Thekenoloji','TVET or occupational':'TVET kgotsa bokgoni','Learn and earn':'Ithute o amogele madi','Check my options':'Tlhatlhoba ditlhopho tsa me',
        'Scan or paste my results':'Skena kgotsa o kgomaretse dipholo','Free. No sign-up.':'Mahala. Ga go tlhoke go ikwadisa.','Take the 1-minute tour':'Tsaya loeto lwa motsotso o le mongwe' } },
    ve: { name: 'Tshivenda', reviewed: false, t: ['Mvelelo','Mishumo','Nḓila dzoṱhe','Pulane A/B/C','Nzudzanyo','Vala','Nanga kha Gallery / Dzifaela','Dzhiya tshifanyiso','Vhala tshifanyiso nga tshone tshine',
      'I swikelela zwi ṱoḓeaho','Nga zwitendedzi','Tsini na u tendelwa','I ṱoḓa u khwaṱhisedzwa','Zwa zwino a zwi tendelwi','Sumbedza zwiṅwe zwa 20','Mavundu oṱhe',
      'U ṱanganedzwa hu khethwa nga tshiimiswa.','Zwiimiswa','Luambo'],
      x: { 'Career Paths':'Nḓila dza mishumo','Study Paths':'Nḓila dza u guda','Work Paths':'Nḓila dza mushumo','Evidence & CV':'Vhuṱanzi na CV','My marks':'Maraka dzanga','My pathway':'Nḓila yanga','Study':'U guda','Work':'Mushumo','Funding':'Thusedzo ya masheleni','More':'Zwiṅwe','Tour':'Lwendo','Sync':'Ṱanganya',
        'Install App':'Dzhenisa app','Offline':'A hu na inthanethe','University':'Yunivesithi','University of Technology':'Yunivesithi ya Thekhinoloji','TVET or occupational':'TVET kana vhukoni','Learn and earn':'Guda u wane muholo','Check my options':'Sedza zwine nda nga khetha',
        'Scan or paste my results':'Sikena kana u namatedza mvelelo','Free. No sign-up.':'Mahala. A hu ṱoḓei u ḓiṅwalisa.','Take the 1-minute tour':'Dzhiya lwendo lwa minithi muthihi' } },
    nr: { name: 'isiNdebele', reviewed: false, t: ['Imiphumela','Imisebenzi','Zoke iindlela','Ihlelo A/B/C','Iinhlelo','Vala','Khetha ku-Gallery / Amafayela','Thatha isithombe','Funda isithombe ngokuzenzakalela',
      'Ifikelela ezidingweni ezincani','Ngokwemibandela','Eduze nokufaneleka','Idinga ukuqinisekiswa','Okwanje awufaneleki','Tjengisa ezinye ezima-20','Zoke iimfunda',
      'Ukwamukelwa kuquntwa yiziko.','Amaziko','Ilimi'],
      x: { 'Career Paths':'Iindlela zemisebenzi','Study Paths':'Iindlela zokufunda','Work Paths':'Iindlela zomsebenzi','Evidence & CV':'Ubufakazi ne-CV','My marks':'Amamaki ami','My pathway':'Indlela yami','Study':'Ukufunda','Work':'Umsebenzi','Funding':'Isekelo leemali','More':'Okunye','Tour':'Ikhambo','Sync':'Hlanganisa',
        'Install App':'Faka i-app','Offline':'Akukho inthanethi','University':'IYunivesithi','University of Technology':'IYunivesithi yeTheknoloji','TVET or occupational':'I-TVET namkha amakghono','Learn and earn':'Funda uthole umrholo','Check my options':'Hlola iinkhetho zami',
        'Scan or paste my results':'Skena namkha unamathisele imiphumela','Free. No sign-up.':'Mahala. Akudingi ukubhalisa.','Take the 1-minute tour':'Thatha ikhambo lomzuzu munye' } }
  };
  const DRAFT = { en: '', af: 'This is a draft Afrikaans translation not yet checked by a fluent speaker. English is always correct.', zu: 'Lokhu kuyinguqulo yokuqala engakahlolwa ngumuntu okhuluma isiZulu kahle.', ss: 'This is a draft siSwati translation not yet checked by a fluent speaker. English is always correct.', ts: 'This is a draft Xitsonga translation not yet checked by a fluent speaker. English is always correct.', st: 'This is a draft Sesotho translation not yet checked by a fluent speaker. English is always correct.', xh: 'This is a draft isiXhosa translation not yet checked by a fluent speaker. English is always correct.', nso: 'This is a draft Sepedi translation not yet checked by a fluent speaker. English is always correct.', tn: 'This is a draft Setswana translation not yet checked by a fluent speaker. English is always correct.', ve: 'This is a draft Tshivenda translation not yet checked by a fluent speaker. English is always correct.', nr: 'This is a draft isiNdebele translation not yet checked by a fluent speaker. English is always correct.' };
  let lang = 'en', busy = false; const orig = new WeakMap();
  function map(l) { const m = {}; if (D[l]) { EN_KEYS.forEach((k, i) => { m[k] = D[l].t[i]; }); if (D[l].x) Object.keys(D[l].x).forEach(k => { m[k] = D[l].x[k]; }); } return m; }
  // Every English phrase that any language can translate, so a text node is only remembered when it might change.
  const KNOWN = {}; EN_KEYS.forEach(k => { KNOWN[k] = 1; }); Object.keys(D).forEach(l => { if (D[l].x) Object.keys(D[l].x).forEach(k => { KNOWN[k] = 1; }); });
  let hasTranslated = false;
  function apply(rootEl) {
    if (busy) return;
    if (lang === 'en' && !hasTranslated) {
      const note = document.getElementById('lang-draft-note'); if (note && note.textContent) note.textContent = '';
      return;
    }
    busy = true;
    try {
      const m = map(lang), w = document.createTreeWalker(rootEl || document.body, NodeFilter.SHOW_TEXT);
      let n; while ((n = w.nextNode())) {
        const par = n.parentNode && n.parentNode.nodeName; if (par === 'SCRIPT' || par === 'STYLE' || par === 'TEXTAREA') continue;
        if (!orig.has(n)) { const s = n.nodeValue.trim(); if (!KNOWN[s]) continue; orig.set(n, n.nodeValue); }
        const o = orig.get(n); if (o === undefined) continue; const s = o.trim();
        const to = lang === 'en' ? o : (m[s] ? o.replace(s, m[s]) : o);
        if (n.nodeValue !== to) n.nodeValue = to;
      }
      const note = document.getElementById('lang-draft-note'); if (note) note.textContent = DRAFT[lang] || '';
      hasTranslated = (lang !== 'en');
    } finally { busy = false; }
  }
  function setLang(l) {
    lang = D[l] ? l : 'en'; try { localStorage.setItem('mz_lang', lang); } catch (e) {}
    document.documentElement.lang = lang; apply();
  }
  function injectSelector() {
    const done = document.getElementById('settings-done-btn'); if (!done || document.getElementById('lang-select')) return;
    const d = document.createElement('div'); d.className = 'mt-3 text-xs font-bold';
    const lbl = document.createElement('label'); lbl.setAttribute('for', 'lang-select'); lbl.textContent = 'Language ';
    const sel = document.createElement('select'); sel.id = 'lang-select'; sel.className = 'px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold';
    const optEn = document.createElement('option'); optEn.value = 'en'; optEn.textContent = 'English'; sel.appendChild(optEn);
    Object.keys(D).forEach(k => { const o = document.createElement('option'); o.value = k; o.textContent = D[k].name; sel.appendChild(o); });
    const note = document.createElement('div'); note.id = 'lang-draft-note'; note.className = 'mt-1 text-[11px] text-amber-900';
    d.append(lbl, sel, note);
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
