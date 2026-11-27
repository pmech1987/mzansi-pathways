const SA_26_UNIS = [
  ['ump','University of Mpumalanga (UMP)','ump_lo_half_45_5 (LO ÷ 2, max 45.5)'],
  ['up','University of Pretoria (UP)','nsc_best6_42 (Best 6 excl. LO, max 42)'],
  ['tut','Tshwane University of Technology (TUT)','tut_best6_42 (Best 6, Level 1 discarded)'],
  ['uj','University of Johannesburg (UJ)','nsc_best6_42 (Best 6 excl. LO, max 42)'],
  ['wits','University of the Witwatersrand (Wits)','wits_weighted_56 (Eng/Maths +2, LO 0–4)'],
  ['uct','University of Cape Town (UCT)','uct_fps_600 (Raw % sum + WPS)'],
  ['su','Stellenbosch University (SU)','stellenbosch_avg_100 (Best 6 average %)'],
  ['uwc','University of the Western Cape (UWC)','uwc_weighted_65 (Weighted 7 subjects)'],
  ['ukzn','University of KwaZulu-Natal (UKZN)','eight_pt_best6_48 (8-pt ladder, CAO)'],
  ['nwu','North-West University (NWU)','eight_pt_best6_48 (8-pt ladder, max 48)'],
  ['ufs','University of the Free State (UFS)','ufs_ap_49 (8-pt + 1 LO >=60%)'],
  ['ru','Rhodes University (RU)','pct_div10_60 (Raw % ÷ 10, LO >=50%)'],
  ['nmu','Nelson Mandela University (NMU)','nmu_as_600 (Raw % + 7 Q1-3 bonus)'],
  ['unisa','University of South Africa (UNISA)','nsc_best6_42 (Best 6 excl. LO)'],
  ['cput','Cape Peninsula University of Technology (CPUT)','cput_methods (Methods 1–3, % ÷ 10)'],
  ['dut','Durban University of Technology (DUT)','nsc_best6_42 (Best 6, CAO)'],
  ['cut','Central University of Technology (CUT)','cut_ap_49 (8-pt + 1 LO >=50%)'],
  ['vut','Vaal University of Technology (VUT)','eight_pt_best6_48 (8-pt ladder)'],
  ['mut','Mangosuthu University of Technology (MUT)','mut_best5_40 (Verify Best 5 vs 6 CAO)'],
  ['spu','Sol Plaatje University (SPU)','spu_bonus_56 (8-pt + HL/Maths bonus)'],
  ['smu','Sefako Makgatho Health Sciences Univ. (SMU)','smu_full7_49 (All 7 incl. LO full)'],
  ['ul','University of Limpopo (UL)','nsc_best6_42 (Best 6 + Level 3 gates)'],
  ['univen','University of Venda (UNIVEN)','pct_div10_60 (Raw % ÷ 10)'],
  ['unizulu','University of Zululand (UNIZULU)','eight_pt_best6_48 (8-pt ladder, CAO)'],
  ['ufh','University of Fort Hare (UFH)','ufh_conflict_guard (Verify on ufh.ac.za)'],
  ['wsu','Walter Sisulu University (WSU)','eight_pt_best6_48 (Excl. LO except Educ.)']
];
const BLOCKED_DOMAINS = ['facebook.com','fb.com','whatsapp.com','chat.whatsapp.com','bit.ly','tinyurl.com','t.co','rb.gy','graduates24.com','pnet.co.za','indeed.com','linkedin.com'];
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const STORAGE_KEY = 'mzansi_creator_studio_v73';
const ROUTES = ['University', 'Diploma / UoT (Extended)', 'Public TVET College', 'QCTO Occupational', 'Workplace Learning'];
// Browser storage can be blocked (private window, cleared data). The page must still work, so every access is guarded.
function readStore() { try { const s = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); if (s && Array.isArray(s.programmes) && Array.isArray(s.jobs)) return s; } catch (e) {} return { programmes: [], jobs: [] }; }
let store = readStore();
let storageOk = true;
function defaultIntakeYear() { const d = new Date(); return d.getMonth() >= 7 ? d.getFullYear() + 1 : d.getFullYear(); }
// Older queues (v73-v88) used other field names and had no intake year or route. Bring them up to the current format once.
function migrate(p) {
  const q = Object.assign({}, p);
  if (q.requiredSubjects && !q.subjectRequirements) { q.subjectRequirements = q.requiredSubjects; delete q.requiredSubjects; }
  if (q.sourceUrl && !q.officialUrl) { q.officialUrl = q.sourceUrl; delete q.sourceUrl; }
  if (q.checkedAt && !q.lastVerifiedAt) { q.lastVerifiedAt = q.checkedAt; delete q.checkedAt; }
  if (!q.intakeYear) q.intakeYear = defaultIntakeYear();
  if (!q.route) q.route = 'University';
  if (q.verificationStatus === 'verified') q.verificationStatus = 'pending_review';
  return q;
}
store.programmes = store.programmes.map(migrate);


const instSel = document.getElementById('p-inst');
SA_26_UNIS.forEach(([id, name, method]) => {
  const opt = document.createElement('option');
  opt.value = id; opt.textContent = name; opt.dataset.method = method;
  instSel.appendChild(opt);
});
function updateApsHint() {
  const opt = instSel.options[instSel.selectedIndex];
  document.getElementById('p-aps-hint').textContent = 'APS Method: ' + (opt ? opt.dataset.method : '');
  const code = (opt ? opt.value : 'SA').toUpperCase().slice(0, 6);
  const bEl = document.getElementById('p-civic-badge');
  if (bEl) {
    const safeCode = String(code || '').replace(/[^A-Z0-9-]/gi, '').slice(0, 8);
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 56 56'); svg.setAttribute('width', '38'); svg.setAttribute('height', '38');
    svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', safeCode + ' Civic Monogram');
    const r1 = document.createElementNS(ns, 'rect'); r1.setAttribute('x', '2'); r1.setAttribute('y', '2'); r1.setAttribute('width', '52'); r1.setAttribute('height', '52'); r1.setAttribute('rx', '12'); r1.setAttribute('fill', '#1A4B8C');
    const r2 = document.createElementNS(ns, 'rect'); r2.setAttribute('x', '2'); r2.setAttribute('y', '38'); r2.setAttribute('width', '52'); r2.setAttribute('height', '16'); r2.setAttribute('fill', '#000'); r2.setAttribute('fill-opacity', '0.2');
    const t1 = document.createElementNS(ns, 'text'); t1.setAttribute('x', '28'); t1.setAttribute('y', '29'); t1.setAttribute('text-anchor', 'middle'); t1.setAttribute('font-family', 'system-ui,sans-serif'); t1.setAttribute('font-weight', '800'); t1.setAttribute('font-size', safeCode.length <= 4 ? '15' : '11'); t1.setAttribute('fill', '#fff'); t1.textContent = safeCode;
    const t2 = document.createElementNS(ns, 'text'); t2.setAttribute('x', '28'); t2.setAttribute('y', '49'); t2.setAttribute('text-anchor', 'middle'); t2.setAttribute('font-family', 'system-ui,sans-serif'); t2.setAttribute('font-weight', '700'); t2.setAttribute('font-size', '9'); t2.setAttribute('fill', '#E8F0FE'); t2.textContent = 'SA PSET';
    svg.append(r1, r2, t1, t2);
    bEl.replaceChildren(svg);
  }
}
instSel.addEventListener('change', updateApsHint); updateApsHint();

const $ = id => document.getElementById(id);
const todayIso = () => new Date().toISOString().slice(0, 10);
function toast(msg) {
  const t = $('toast');
  t.textContent = msg; t.style.display = 'block';
  clearTimeout(toast._t); toast._t = setTimeout(() => { t.style.display = 'none'; }, 3200);
}
function scrubPii(s) {
  return String(s || '').replace(/\b\d{13}\b/g, '[ID-REDACTED]').replace(/(?:\+27|0)\s*[6-8]\d[\s-]?\d{3}[\s-]?\d{4}/g, '[PHONE-REDACTED]').replace(/\b[\w.+-]+@(?:gmail|yahoo|hotmail|outlook)\.com\b/gi, '[EMAIL-REDACTED]').trim();
}
function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(store)); storageOk = true; } catch (e) { storageOk = false; }
  render();
}
function hostOf(u) { return String(u).toLowerCase().split('://')[1].split('/')[0].split('?')[0]; }
function badHost(u) { const h = hostOf(u); return BLOCKED_DOMAINS.some(d => h === d || h.endsWith('.' + d)); }
function slug(s) { return String(s).toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 48); }

// The same rules scripts/csv_to_programmes_json.py applies, so a problem is caught here on the phone, not later in GitHub.
function problemsFor(p) {
  const out = [];
  if (!/^[a-z0-9][a-z0-9_]{2,80}$/.test(p.id || '')) out.push('id is not valid');
  if (!p.name || p.name.length < 3) out.push('programme name is missing');
  if (!ROUTES.includes(p.route)) out.push('route is not recognised');
  if (!(p.intakeYear >= 2024 && p.intakeYear <= 2040)) out.push('intake year looks wrong');
  if (!(p.minAps >= 0 && p.minAps <= 600)) out.push('APS must be 0 to 600');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(p.closes || '') || isNaN(Date.parse(p.closes))) out.push('closing date is not a real date');
  if (!String(p.officialUrl || '').startsWith('https://') || badHost(p.officialUrl)) out.push('official link must be https and from the institution (not social media, a short link or a job board)');
  if (!p.sourceDoc || p.sourceDoc.length < 4) out.push('say which prospectus page this came from');
  if (p.lastVerifiedAt > todayIso()) out.push('check date is in the future');
  return out;
}
function warningsFor(p) { const w = []; if (/^\d{4}-\d{2}-\d{2}$/.test(p.closes) && p.closes < todayIso()) w.push('closing date has already passed'); return w; }

function render() {
  const pl = $('prog-list');
  pl.innerHTML = toTrustedHtml(store.programmes.length ? store.programmes.map((p, i) => {
    const pr = problemsFor(p), wr = warningsFor(p);
    return `<div class="item"><div><strong>${esc(p.institutionId.toUpperCase())} — ${esc(p.name)} (${esc(p.intakeYear)})</strong><div class="sub">${esc(p.route)} · Min APS ${esc(p.minAps)} · Closes ${esc(p.closes)} · <span class="badge ${p.verificationStatus === 'conflict' ? 'b-err' : 'b-warn'}">${esc(p.verificationStatus)}</span>${pr.length ? ` <span class="badge b-err">Fix: ${esc(pr.join('; '))}</span>` : ''}${wr.length ? ` <span class="badge b-warn">${esc(wr.join('; '))}</span>` : ''}</div></div><span class="row nomt"><button type="button" class="sec" data-edit-p="${i}">Edit</button><button type="button" class="sec" data-del-p="${i}">Remove</button></span></div>`;
  }).join('') : '<p class="empty">No programmes queued yet.</p>');
  pl.querySelectorAll('[data-del-p]').forEach(b => b.addEventListener('click', () => { store.programmes.splice(Number(b.dataset.delP), 1); save(); }));
  pl.querySelectorAll('[data-edit-p]').forEach(b => b.addEventListener('click', () => editProgramme(Number(b.dataset.editP))));

  const jl = $('job-list');
  jl.innerHTML = toTrustedHtml(store.jobs.length ? store.jobs.map((j, i) =>
    `<div class="item"><div><strong>${esc(j.title)}</strong> — ${esc(j.employer)}<div class="sub">${esc(j.town)}, ${esc(j.province)} · Closes ${esc(j.closingDate)} · ${esc(j.sourceType)}</div></div><button type="button" class="sec" data-del-j="${i}">Remove</button></div>`
  ).join('') : '<p class="empty">No legal jobs queued yet.</p>');
  jl.querySelectorAll('[data-del-j]').forEach(b => b.addEventListener('click', () => { store.jobs.splice(Number(b.dataset.delJ), 1); save(); }));

  $('tab-prog').textContent = '1. Programmes (' + store.programmes.length + ')';
  $('tab-job').textContent = '2. Jobs (' + store.jobs.length + ')';
  const bad = store.programmes.filter(p => problemsFor(p).length).length;
  $('export-status').innerHTML = toTrustedHtml((storageOk ? '' : '<span class="badge b-err">This browser is not saving your queue. Download your file before leaving the page.</span> ') +
    (bad ? `<span class="badge b-err">${bad} programme(s) need fixing before export</span>` : store.programmes.length ? '<span class="badge b-ok">All queued programmes passed the checks</span>' : ''));
  $('dl-prog-json').disabled = !store.programmes.length || bad > 0;
  $('dl-prog-json').textContent = 'Download programmes_' + todayIso() + '.json (for inbox/)';
  $('json-preview').textContent = JSON.stringify({ schemaVersion: 2, programmes: store.programmes, jobs: store.jobs }, null, 2);
}

function readProgForm() {
  const eng = Number($('p-eng').value), math = Number($('p-math').value);
  const reqs = [{ anyOf: ['English Home Language', 'English First Additional Language'], minMark: eng }];
  if (math > 0) reqs.push({ anyOf: ['Mathematics'], minMark: math });
  const name = scrubPii($('p-name').value), year = Number($('p-year').value);
  return {
    id: slug(instSel.value + '_' + name + '_' + year),  // same programme + year = same id, so re-adding a corrected row replaces the old one
    institutionId: instSel.value, intakeYear: year, name, route: $('p-route').value,
    faculty: scrubPii($('p-faculty').value), department: scrubPii($('p-dept').value),
    nqf: Number($('p-nqf').value), minAps: Number($('p-aps').value), subjectRequirements: reqs,
    closes: $('p-closes').value, verificationStatus: $('p-status').value,
    officialUrl: $('p-url').value.trim(), sourceDoc: scrubPii($('p-doc').value), lastVerifiedAt: todayIso()
  };
}
$('prog-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const rec = readProgForm(), pr = problemsFor(rec);
  if (pr.length) { toast('Not added: ' + pr[0]); return; }
  const at = store.programmes.findIndex(p => p.id === rec.id);
  if (at >= 0) store.programmes[at] = rec; else store.programmes.push(rec);
  e.target.reset(); $('p-year').value = defaultIntakeYear(); updateApsHint(); save();
  toast(at >= 0 ? 'Updated the existing entry.' : 'Added to the queue.');
});
function editProgramme(i) {
  const p = store.programmes[i]; if (!p) return;
  const eng = (p.subjectRequirements.find(r => r.anyOf.indexOf('English Home Language') >= 0) || {}).minMark;
  const math = (p.subjectRequirements.find(r => r.anyOf.indexOf('Mathematics') >= 0) || {}).minMark;
  instSel.value = p.institutionId; updateApsHint();
  $('p-year').value = p.intakeYear; $('p-route').value = p.route; $('p-faculty').value = p.faculty || ''; $('p-dept').value = p.department || '';
  $('p-name').value = p.name; $('p-nqf').value = p.nqf; $('p-aps').value = p.minAps; $('p-eng').value = eng || 50; $('p-math').value = math || 0;
  $('p-closes').value = p.closes; $('p-status').value = p.verificationStatus === 'conflict' ? 'conflict' : 'pending_review';
  $('p-url').value = p.officialUrl || ''; $('p-doc').value = p.sourceDoc || '';
  store.programmes.splice(i, 1); save(); switchTab('prog'); $('p-name').focus();
  toast('Loaded for editing. Change it and press Add to queue.');
}

$('job-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const url = $('j-url').value.trim();
  if (!url.startsWith('https://')) { toast('Official apply URL must start with https://'); return; }
  if (badHost(url)) { toast(`Blocked domain (${hostOf(url)}) — use official employer or .gov.za URL only.`); return; }
  store.jobs.push({
    title: scrubPii($('j-title').value), employer: scrubPii($('j-emp').value), town: scrubPii($('j-town').value),
    province: $('j-prov').value, closingDate: $('j-close').value, sourceType: $('j-src').value, officialUrl: url
  });
  e.target.reset(); save(); toast('Validated & added POPIA-scrubbed job!');
});

function switchTab(id) {
  ['prog', 'job', 'export'].forEach(k => {
    $('panel-' + k).style.display = k === id ? 'block' : 'none';
    const b = $('tab-' + k);
    b.className = k === id ? 'active' : 'sec';
    b.setAttribute('aria-selected', k === id ? 'true' : 'false');
  });
}
$('tab-prog').onclick = () => switchTab('prog');
$('tab-job').onclick = () => switchTab('job');
$('tab-export').onclick = () => switchTab('export');

function downloadJson(filename, obj) {
  const blob = new Blob([JSON.stringify(obj, null, 2) + '\n'], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1500);
  toast(`Downloaded ${filename}`);
}
function copyText(text, label) {
  const done = () => toast('Copied ' + label);
  const fail = () => { $('json-preview').focus(); toast('Could not copy automatically. Select the preview text and copy it.'); };
  try { navigator.clipboard.writeText(text).then(done, fail); } catch (e) { fail(); }
}
const progPayload = () => ({ schemaVersion: 2, programmes: store.programmes });
const jobPayload = () => ({ schemaVersion: 1, jobs: store.jobs });
$('dl-prog-json').onclick = () => downloadJson('programmes_' + todayIso() + '.json', progPayload());
$('dl-job-json').onclick = () => downloadJson('community_jobs_submissions.json', jobPayload());
$('copy-prog-json').onclick = () => copyText(JSON.stringify(progPayload(), null, 2), 'programmes JSON');
$('copy-job-json').onclick = () => copyText(JSON.stringify(jobPayload(), null, 2), 'jobs JSON');
$('clear-queue').onclick = () => {
  if (!store.programmes.length && !store.jobs.length) return;
  if (confirm('Clear the whole queue? Only do this after you have downloaded your file and uploaded it to GitHub.')) { store = { programmes: [], jobs: [] }; save(); toast('Queue cleared.'); }
};
$('load-batch').addEventListener('change', (e) => {
  const f = e.target.files && e.target.files[0]; if (!f) return;
  const r = new FileReader();
  r.onload = () => {
    try {
      const d = JSON.parse(r.result), list = Array.isArray(d) ? d : (d.programmes || []);
      let n = 0;
      list.forEach(x => { if (!x || typeof x !== 'object') return; const p = migrate(x); const at = store.programmes.findIndex(q => q.id === p.id); if (at >= 0) store.programmes[at] = p; else store.programmes.push(p); n++; });
      (d.jobs || []).forEach(j => { if (j && j.title && j.officialUrl) store.jobs.push(j); });
      save(); toast('Loaded ' + n + ' programme(s) from the file.');
    } catch (err) { toast('That file is not a Creator Studio JSON file.'); }
    e.target.value = '';
  };
  r.readAsText(f);
});

$('dpsa-extract-btn').addEventListener('click', () => {
  const txt = $('dpsa-paste').value || '';
  const pm = txt.match(/POST\s+\d{1,2}\/\d{1,4}\s*[:\-]\s*(.+)/i);
  const rm = txt.match(/REF\s*NO\s*[:\-]\s*([A-Z0-9\/\-]{3,40})/i);
  if (pm) $('j-title').value = scrubPii(pm[1]) + (rm ? ` (Ref: ${rm[1]})` : '');
  $('j-src').value = 'dpsa_circular';
  $('j-url').value = 'https://www.gov.za/about-government/government-jobs';
  toast(pm ? 'Extracted factual DPSA post title & reference!' : 'Paste a line starting with POST XX/YY : TITLE');
});
$('p-year').value = defaultIntakeYear();
render();
