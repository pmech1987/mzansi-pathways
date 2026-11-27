/* Mzansi Pathways — SA Application Document Readiness Checklist with Plan Sync (renamed from v104_doc_checklist.js) */
/* Mzansi Pathways v104 Interactive SA Application Document Readiness Checklist.
   Strict-CSP & Trusted-Types safe: zero raw HTML sinks, zero inline handlers, 100% offline persistent. */
(function () {
  'use strict';

  var STORAGE_KEY = 'mz_v104_doc_checks';
  var APP_STATE_KEY = 'mzansi_pathways_v2_state';
  var APP_DOC_MAP = {
    results: 'Matric / Grade 11 Statement',
    sa_id: 'Certified SA ID (when required)',
    residence: 'Proof of Residence',
    income: 'Parent / Guardian Income Proof (NSFAS)'
  };
  var DOC_ITEMS = [
    { id: 'sa_id', label: 'Certified SA ID / Smart Card or Unabridged Birth Certificate (certified <= 3 months)' },
    { id: 'results', label: 'Certified Grade 11 Final Report / Grade 12 NSC Statement of Results' },
    { id: 'guardian_id', label: 'Certified Parent / Guardian ID(s) (or Death Certificate if applicable)' },
    { id: 'income', label: 'Proof of Household Income (3 months payslips, SASSA letter, or sworn affidavit)' },
    { id: 'residence', label: 'Proof of Residence (municipal bill, tribal authority letter, or councillor letter)' },
    { id: 'consent', label: 'Signed NSFAS / Bursary Consent Form (for SARS/SASSA verification)' },
    { id: 'email_sim', label: 'Active Personal Email Address & Phone Number (kept on for CAS/university SMS)' }
  ];

  function el(tag, attrs, text) {
    var n = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === 'className') n.className = attrs[k];
        else n.setAttribute(k, attrs[k]);
      });
    }
    if (text != null) n.textContent = String(text);
    return n;
  }

  function loadState() {
    var obj = {};
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      var parsed = raw ? JSON.parse(raw) : {};
      if (parsed && typeof parsed === 'object') obj = parsed;
    } catch (e) {}
    try {
      var appRaw = localStorage.getItem(APP_STATE_KEY);
      var appSt = appRaw ? JSON.parse(appRaw) : null;
      if (appSt && appSt.docChecklist && typeof appSt.docChecklist === 'object') {
        Object.keys(APP_DOC_MAP).forEach(function (k) {
          var appKey = APP_DOC_MAP[k];
          if (typeof appSt.docChecklist[appKey] === 'boolean') obj[k] = appSt.docChecklist[appKey];
        });
      }
    } catch (e) {}
    return obj;
  }

  function saveState(st) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(st)); } catch (e) {}
    try {
      var appRaw = localStorage.getItem(APP_STATE_KEY);
      var appSt = appRaw ? JSON.parse(appRaw) : null;
      if (appSt && typeof appSt === 'object') {
        if (!appSt.docChecklist || typeof appSt.docChecklist !== 'object') appSt.docChecklist = {};
        Object.keys(APP_DOC_MAP).forEach(function (k) {
          if (typeof st[k] === 'boolean') appSt.docChecklist[APP_DOC_MAP[k]] = st[k];
        });
        localStorage.setItem(APP_STATE_KEY, JSON.stringify(appSt));
      }
    } catch (e) {}
    try { window.dispatchEvent(new CustomEvent('mz-docs-synced', { detail: { source: 'v104' } })); } catch (e) {}
  }

  function getMissingSummary(state) {
    var missing = DOC_ITEMS.filter(function (d) { return !state[d.id]; }).map(function (d) { return '- ' + d.label; });
    if (!missing.length) return 'All 7 SA application documents are marked ready!';
    return 'Still needed for SA applications:\n' + missing.join('\n');
  }

  function mountChecklist() {
    var host = document.getElementById('v94-smart-tools') || document.getElementById('settings-modal');
    if (!host || document.getElementById('v104-doc-box')) return;
    if (host.id === 'settings-modal') {
      host = host.querySelector('.space-y-4, .space-y-3') || host.firstElementChild || host;
    }

    var state = loadState();
    var box = el('div', { id: 'v104-doc-box', className: 'v97-backup-box v101-mt8' });
    box.appendChild(el('div', { className: 'v97-backup-title' }, 'SA Application Document Readiness Checklist (v104)'));
    box.appendChild(el('p', { className: 'v97-backup-desc' }, 'Track certified documents needed for Universities, TVETs, CAS, and NSFAS. SAPS certification is free — never pay to certify copies.'));

    var progText = el('div', { id: 'v104-doc-progress', className: 'v104-prog-text', role: 'status', 'aria-live': 'polite' }, '');
    var list = el('div', { className: 'v104-doc-list' });
    var status = el('div', { id: 'v104-doc-status', className: 'v97-backup-status', role: 'status', 'aria-live': 'polite' }, '');

    function refreshProgress() {
      var done = DOC_ITEMS.filter(function (d) { return !!state[d.id]; }).length;
      progText.textContent = done + ' / ' + DOC_ITEMS.length + ' documents ready (' + Math.round((done / DOC_ITEMS.length) * 100) + '%)';
    }

    var cbs = {};
    DOC_ITEMS.forEach(function (item) {
      var row = el('label', { className: 'v104-doc-row' });
      var cb = el('input', { type: 'checkbox', className: 'v104-doc-cb' });
      cbs[item.id] = cb;
      cb.checked = !!state[item.id];
      cb.addEventListener('change', function () {
        state[item.id] = cb.checked;
        saveState(state);
        refreshProgress();
      });
      row.appendChild(cb);
      row.appendChild(el('span', null, item.label));
      list.appendChild(row);
    });

    var btnRow = el('div', { className: 'v97-backup-row v101-mt8' });
    var btnCopy = el('button', { type: 'button', id: 'v104-btn-copy-missing', className: 'v97-btn-primary' }, 'Copy Missing Docs List');
    btnCopy.addEventListener('click', function () {
      var text = getMissingSummary(state);
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        navigator.clipboard.writeText(text).then(function () {
          status.textContent = 'Copied to clipboard — ready to paste into WhatsApp or Notes.';
          if (typeof window.mzAnnounce === 'function') window.mzAnnounce('Missing documents list copied.');
        }).catch(function () {
          status.textContent = text;
        });
      } else {
        status.textContent = text;
      }
    });

    btnRow.appendChild(btnCopy);
    box.appendChild(progText);
    box.appendChild(list);
    box.appendChild(btnRow);
    box.appendChild(status);
    host.appendChild(box);
    window.addEventListener('mz-docs-synced', function (ev) {
      if (ev && ev.detail && ev.detail.source === 'v104') return;
      state = loadState();
      DOC_ITEMS.forEach(function (item) { if (cbs[item.id]) cbs[item.id].checked = !!state[item.id]; });
      refreshProgress();
    });
    refreshProgress();
  }

  window.mzDocChecklist = { getMissingSummary: getMissingSummary, items: DOC_ITEMS };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountChecklist);
  else mountChecklist();
})();
