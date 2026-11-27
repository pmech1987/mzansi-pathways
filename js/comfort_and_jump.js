/* Mzansi Pathways — Quick-Jump Command Palette, SA Helplines & Accessibility Comfort Controls (merged from v98_quick_palette.js + v101_a11y_comfort.js) */
/* Mzansi Pathways v98 Quick-Jump Command Palette & Verified SA Helplines Modal.
   Strict-CSP & Trusted-Types safe: zero raw HTML sinks, zero inline handlers.
   Trigger via Ctrl+K, '/' (outside inputs), or the accessible floating Quick Jump button. */
(function () {
  'use strict';

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

  var ACTIONS = [
    { label: 'Home & Overview', hint: 'Alt+1', keys: 'home overview start marks', run: function () { clickDock(0); } },
    { label: 'Study Path (Courses, Institutions & Funding)', hint: 'Alt+2', keys: 'study courses university tvet funding bursaries nsfas', run: function () { clickDock(1); } },
    { label: 'Work Path (Open Jobs, Learnerships & CV)', hint: 'Alt+3', keys: 'work jobs learnerships internships cv dpsa', run: function () { clickDock(2); } },
    { label: 'Plan A / B / C Decision Board', hint: 'Alt+4', keys: 'plan decision board dossier family', run: function () { clickDock(3); } },
    { label: 'More, Settings & Local JSON Backup', hint: 'Alt+5', keys: 'more settings backup export restore dark mode', run: function () { clickDock(4); } },
    { label: 'Smart SA Pathways Toolkit (NCV L4, Reverse-APS, Funza, NSFAS)', hint: 'Tool', keys: 'toolkit ncv reverse aps funza lushaka nsfas appeal nbt', run: function () { scrollToId('v94-smart-tools'); } },
    { label: 'Open Settings & Emergency Backup', hint: 'Modal', keys: 'settings backup json restore wipe dark mode', run: function () { var b = document.getElementById('settings-btn'); if (b) b.click(); } }
  ];

  var HELPLINES = [
    { name: 'CAS (Central Application Service)', detail: 'WhatsApp 081 308 4196' },
    { name: 'NSFAS Student Funding', detail: 'Toll-Free 0800 067 327' },
    { name: 'Higher Health (24h Student Support)', detail: 'Toll-Free 0800 36 36 36' },
    { name: 'SA Youth (Zero-Rated Jobs & YES)', detail: 'Toll-Free 0800 72 72 72' }
  ];

  function clickDock(idx) {
    var btns = document.querySelectorAll('#mz-dock button, .mz-dock button, nav[aria-label] button');
    if (btns && btns[idx]) btns[idx].click();
  }

  function scrollToId(id) {
    var target = document.getElementById(id);
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  var modal = null;
  var searchInput = null;
  var listBox = null;
  var lastOpener = null;

  function renderList(query) {
    if (!listBox) return;
    while (listBox.firstChild) listBox.removeChild(listBox.firstChild);
    var q = String(query || '').trim().toLowerCase();
    var matches = ACTIONS.filter(function (a) {
      return !q || a.label.toLowerCase().indexOf(q) >= 0 || a.keys.indexOf(q) >= 0;
    });
    if (!matches.length) {
      listBox.appendChild(el('div', { className: 'v98-pal-empty' }, 'No matching shortcut. Try "study", "jobs", "backup", or "nsfas".'));
      return;
    }
    matches.forEach(function (a) {
      var btn = el('button', { type: 'button', className: 'v98-pal-item' });
      btn.appendChild(el('span', { className: 'v98-pal-label' }, a.label));
      btn.appendChild(el('span', { className: 'v98-pal-hint' }, a.hint));
      btn.addEventListener('click', function () {
        closePalette();
        a.run();
        if (typeof window.mzAnnounce === 'function') window.mzAnnounce('Navigated to ' + a.label);
      });
      listBox.appendChild(btn);
    });
  }

  function closePalette() {
    if (!modal || modal.classList.contains('is-hidden')) return;
    modal.classList.add('is-hidden');
    if (lastOpener && lastOpener.isConnected && typeof lastOpener.focus === 'function') {
      try { lastOpener.focus({ preventScroll: true }); } catch (e) {}
    }
  }

  function openPalette() {
    ensurePalette();
    lastOpener = document.activeElement;
    modal.classList.remove('is-hidden');
    if (searchInput) {
      searchInput.value = '';
      renderList('');
      setTimeout(function () { try { searchInput.focus(); } catch (e) {} }, 25);
    }
  }

  function ensurePalette() {
    if (modal) return;
    modal = el('div', {
      id: 'v98-palette-modal',
      className: 'v98-pal-backdrop is-hidden',
      role: 'dialog',
      'aria-modal': 'true',
      'aria-labelledby': 'v98-pal-title'
    });
    var panel = el('div', { className: 'v98-pal-panel' });
    var head = el('div', { className: 'v98-pal-head' });
    head.appendChild(el('h2', { id: 'v98-pal-title', className: 'v98-pal-title' }, 'Quick Jump & SA Helplines'));
    var closeBtn = el('button', { type: 'button', className: 'v98-pal-close', 'aria-label': 'Close Quick Jump palette' }, 'Close');
    closeBtn.addEventListener('click', closePalette);
    head.appendChild(closeBtn);

    searchInput = el('input', {
      type: 'search',
      id: 'v98-pal-search',
      className: 'v98-pal-input',
      placeholder: 'Jump to Study, Work, Plan, Backup, NSFAS...',
      'aria-label': 'Filter quick jump actions'
    });
    searchInput.addEventListener('input', function () { renderList(searchInput.value); });

    listBox = el('div', { className: 'v98-pal-list', role: 'list' });

    var helpBox = el('div', { className: 'v98-pal-helplines' });
    helpBox.appendChild(el('div', { className: 'v98-pal-help-title' }, 'Verified Free SA Student Helplines'));
    var helpGrid = el('div', { className: 'v98-pal-help-grid' });
    HELPLINES.forEach(function (h) {
      var item = el('div', { className: 'v98-pal-help-item' });
      item.appendChild(el('strong', null, h.name));
      item.appendChild(el('span', null, h.detail));
      helpGrid.appendChild(item);
    });
    helpBox.appendChild(helpGrid);

    panel.appendChild(head);
    panel.appendChild(searchInput);
    panel.appendChild(listBox);
    panel.appendChild(helpBox);
    modal.appendChild(panel);

    modal.addEventListener('click', function (e) { if (e.target === modal) closePalette(); });
    modal.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { e.preventDefault(); closePalette(); }
    });

    (document.body || document.documentElement).appendChild(modal);
    renderList('');
  }

  function wireTrigger() {
    if (!document.getElementById('v98-jump-btn')) {
      var btn = el('button', {
        id: 'v98-jump-btn',
        type: 'button',
        className: 'v98-jump-btn',
        'aria-label': 'Open Quick Jump and SA Helplines (Ctrl+K)'
      }, 'Jump / Help');
      btn.addEventListener('click', openPalette);
      var moreSheet = document.querySelector('#mz-more .mz-more-sheet'); (moreSheet || document.body || document.documentElement).appendChild(btn);
    }

    document.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && String(e.key).toLowerCase() === 'k') {
        e.preventDefault();
        openPalette();
        return;
      }
      var tag = e.target && e.target.tagName;
      if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey && tag !== 'INPUT' && tag !== 'TEXTAREA' && tag !== 'SELECT') {
        e.preventDefault();
        openPalette();
      }
    });
  }

  window.mzQuickPalette = { open: openPalette, close: closePalette };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wireTrigger);
  else wireTrigger();
})();


/* Mzansi Pathways v101 Persistent Accessibility Comfort Controls (Text Scale, High-Contrast Boost, Readable Spacing).
   Strict-CSP & Trusted-Types safe: uses root data-* attributes + stylesheet rules, zero inline styles, zero raw HTML sinks. */
(function () {
  'use strict';

  var K_SCALE = 'mz_v101_text_scale';
  var K_CONTRAST = 'mz_v101_high_contrast';
  var K_SPACING = 'mz_v101_wide_spacing';

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

  function safeGet(k, fallback) {
    try { var v = localStorage.getItem(k); return v || fallback; } catch (e) { return fallback; }
  }
  function safeSet(k, v) {
    try { localStorage.setItem(k, v); } catch (e) {}
  }

  function applyPrefs() {
    var root = document.documentElement;
    var scale = safeGet(K_SCALE, '100');
    var contrast = safeGet(K_CONTRAST, 'normal');
    var spacing = safeGet(K_SPACING, 'normal');

    if (scale === '115' || scale === '130') root.setAttribute('data-mz-scale', scale);
    else root.removeAttribute('data-mz-scale');

    if (contrast === 'high') root.setAttribute('data-mz-contrast', 'high');
    else root.removeAttribute('data-mz-contrast');

    if (spacing === 'wide') root.setAttribute('data-mz-spacing', 'wide');
    else root.removeAttribute('data-mz-spacing');

    return { scale: scale, contrast: contrast, spacing: spacing };
  }

  function mountComfortPanel() {
    var modal = document.getElementById('settings-modal');
    if (!modal || document.getElementById('v101-a11y-box')) return;
    var host = modal.querySelector('.space-y-4, .space-y-3') || modal.firstElementChild || modal;

    var box = el('details', { id: 'v101-a11y-box', className: 'v97-backup-box v105-settings-acc' });
    box.appendChild(el('summary', { className: 'v97-backup-title v105-acc-summary' }, 'Reading & Accessibility Comfort (v101)'));
    box.appendChild(el('p', { className: 'v97-backup-desc' }, 'Adjust text size, high-contrast outlines, and reading spacing. Saved locally on your device.'));

    var scaleRow = el('div', { className: 'v97-backup-row', role: 'group', 'aria-label': 'Text size options' });
    var scales = [
      { val: '100', label: 'Text 100%' },
      { val: '115', label: 'Text 115%' },
      { val: '130', label: 'Text 130%' }
    ];
    var scaleBtns = [];

    var toggleRow = el('div', { className: 'v97-backup-row v101-mt8' });
    var btnContrast = el('button', { type: 'button', id: 'v101-btn-contrast', className: 'v97-btn-secondary', 'aria-pressed': 'false' }, 'High Contrast: Off');
    var btnSpacing = el('button', { type: 'button', id: 'v101-btn-spacing', className: 'v97-btn-secondary', 'aria-pressed': 'false' }, 'Wide Spacing: Off');
    var btnReset = el('button', { type: 'button', id: 'v101-btn-reset', className: 'v97-btn-secondary' }, 'Reset');

    function syncUi() {
      var st = applyPrefs();
      scaleBtns.forEach(function (pair) {
        var on = pair.val === st.scale;
        pair.btn.className = on ? 'v97-btn-primary' : 'v97-btn-secondary';
        pair.btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      var hc = st.contrast === 'high';
      btnContrast.className = hc ? 'v97-btn-primary' : 'v97-btn-secondary';
      btnContrast.setAttribute('aria-pressed', hc ? 'true' : 'false');
      btnContrast.textContent = hc ? 'High Contrast: On' : 'High Contrast: Off';

      var ws = st.spacing === 'wide';
      btnSpacing.className = ws ? 'v97-btn-primary' : 'v97-btn-secondary';
      btnSpacing.setAttribute('aria-pressed', ws ? 'true' : 'false');
      btnSpacing.textContent = ws ? 'Wide Spacing: On' : 'Wide Spacing: Off';
    }

    scales.forEach(function (sc) {
      var b = el('button', { type: 'button', className: 'v97-btn-secondary', 'aria-pressed': 'false' }, sc.label);
      b.addEventListener('click', function () {
        safeSet(K_SCALE, sc.val);
        syncUi();
        if (typeof window.mzAnnounce === 'function') window.mzAnnounce('Text size set to ' + sc.val + ' percent.');
      });
      scaleBtns.push({ val: sc.val, btn: b });
      scaleRow.appendChild(b);
    });

    btnContrast.addEventListener('click', function () {
      var next = safeGet(K_CONTRAST, 'normal') === 'high' ? 'normal' : 'high';
      safeSet(K_CONTRAST, next);
      syncUi();
      if (typeof window.mzAnnounce === 'function') window.mzAnnounce('High contrast ' + (next === 'high' ? 'enabled' : 'disabled') + '.');
    });

    btnSpacing.addEventListener('click', function () {
      var next = safeGet(K_SPACING, 'normal') === 'wide' ? 'normal' : 'wide';
      safeSet(K_SPACING, next);
      syncUi();
      if (typeof window.mzAnnounce === 'function') window.mzAnnounce('Wide reading spacing ' + (next === 'wide' ? 'enabled' : 'disabled') + '.');
    });

    btnReset.addEventListener('click', function () {
      safeSet(K_SCALE, '100');
      safeSet(K_CONTRAST, 'normal');
      safeSet(K_SPACING, 'normal');
      syncUi();
      if (typeof window.mzAnnounce === 'function') window.mzAnnounce('Accessibility comfort settings reset to default.');
    });

    toggleRow.appendChild(btnContrast);
    toggleRow.appendChild(btnSpacing);
    toggleRow.appendChild(btnReset);
    box.appendChild(scaleRow);
    box.appendChild(toggleRow);
    host.appendChild(box);
    syncUi();
  }

  applyPrefs();
  window.mzA11yComfort = { applyPrefs: applyPrefs };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountComfortPanel);
  else mountComfortPanel();
})();
