/* Mzansi Pathways clean layout (v108). Folds long cards into tappable sections so each screen is short and calm.
   Nodes are MOVED, never cloned or rebuilt, so every button and listener inside keeps working.
   Strict-CSP safe: no innerHTML, no inline styles. If anything here fails, the app simply shows the long page as before. */
(function () {
  'use strict';
  var MIN_CHARS = 320;           // shorter cards stay open and flat
  var busy = false, timer = 0, obs = null;
  var FOLD_TABS = { work: 1, vault: 1, plan: 1 };

  function activeTab() {
    try { var b = document.querySelector('#mz-dock .tab-btn.active, nav .tab-btn.active'); return b ? (b.getAttribute('data-tab') || '') : ''; } catch (e) { return ''; }
  }
  function titleOf(card) {
    var h = card.querySelector(':scope > h1, :scope > h2, :scope > h3, :scope > div > h2, :scope > div > h3, :scope > div:first-child > strong, :scope > strong, :scope > div:first-child > div.font-extrabold');
    return h && h.textContent ? { el: h, text: h.textContent.replace(/\s+/g, ' ').trim() } : null;
  }
  function isCard(el) {
    var c = typeof el.className === 'string' ? el.className : '';
    return /rounded-(2|3)xl/.test(c) && /border/.test(c);
  }
  function foldCard(card, openIt) {
    var t = titleOf(card);
    if (!t || t.text.length < 3 || t.text.length > 90) return false;
    var d = document.createElement('details'); d.className = 'mz-fold';
    var s = document.createElement('summary'); s.className = 'mz-fold-sum';
    var span = document.createElement('span'); span.textContent = t.text; s.appendChild(span);
    var body = document.createElement('div'); body.className = 'mz-fold-body';
    card.parentNode.insertBefore(d, card);
    d.appendChild(s); d.appendChild(body); body.appendChild(card);
    card.setAttribute('data-mz-fold', '1'); card.classList.add('mz-folded');
    // The title now lives in the summary, so hide the real heading to avoid saying it twice (buttons beside it stay).
    if (/^H[1-3]$/.test(t.el.tagName)) { t.el.classList.add('mz-fold-dup'); t.el.setAttribute('aria-hidden', 'true'); }
    if (openIt) d.open = true;
    return true;
  }
  function pass() {
    var main = document.getElementById('app-main'); if (!main) return;
    busy = true; if (obs) obs.disconnect();
    try {
      var tab = activeTab();
      // 1) Institutions / Funding / Guide: a lone collapsed section looks like an empty page, so open it once.
      var tops = main.querySelectorAll('details');
      for (var i = 0; i < tops.length; i++) {
        var dd = tops[i];
        if (dd.closest('details') !== dd || dd.getAttribute('data-mz-seen')) continue;
        dd.setAttribute('data-mz-seen', '1');
        var st = (dd.querySelector('summary') || {}).textContent || '';
        if (/^\s*(Institutions|Funding|Other route types)/i.test(st)) dd.open = true;
      }
      // 2) Long cards on Work / Plan / Vault fold up; the first one on each screen stays open.
      if (FOLD_TABS[tab]) {
        var cards = main.querySelectorAll('div, section'), seen = [], openedOne = !!main.querySelector('.mz-fold[open]');
        for (var j = 0; j < cards.length; j++) {
          var c = cards[j];
          if (!isCard(c) || c.getAttribute('data-mz-fold') || c.closest('details') || c.closest('[data-mz-fold]') || c.closest('[role="dialog"]')) continue;
          if (seen.some(function (p) { return p.contains(c); })) continue;
          seen.push(c);
          if ((c.innerText || '').length < MIN_CHARS) continue;
          var visible = c.offsetParent !== null && c.getBoundingClientRect().height > 140;
          if (foldCard(c, visible && !openedOne)) { if (visible && !openedOne) openedOne = true; }
        }
      }
    } catch (e) { /* never break the app for a layout nicety */ }
    busy = false; watch();
  }
  function later() { if (busy) return; clearTimeout(timer); timer = setTimeout(pass, 140); }
  function watch() {
    var main = document.getElementById('app-main'); if (!main) return;
    if (!obs) obs = new MutationObserver(later);
    obs.observe(main, { childList: true, subtree: true });
  }
  function start() { watch(); pass(); document.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('.tab-btn, .mz-sub button')) later(); }, true); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
