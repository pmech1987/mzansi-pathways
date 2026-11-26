/* Modal accessibility for the dialogs in index.html (v84). Strict-CSP safe: no inline code.
   Watches each dialog's "hidden" class and, when it opens, moves focus inside, keeps Tab inside, and on close
   hands focus back to the button that opened it. Also names any dialog that has no label. */
(function () {
  'use strict';
  var IDS = ['why-modal', 'settings-modal', 'auth-modal', 'tutorial-modal'];
  var FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
  var opener = null;

  function visible(el) { return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length); }
  function items(dlg) { return Array.prototype.filter.call(dlg.querySelectorAll(FOCUSABLE), visible); }

  function onOpen(dlg) {
    opener = document.activeElement && document.activeElement !== document.body ? document.activeElement : opener;
    document.body.classList.add('mz-lock');
    var t = items(dlg);
    if (t.length) setTimeout(function () { try { t[0].focus({ preventScroll: true }); } catch (e) {} }, 30);
  }
  function onClose() {
    var anyOpen = IDS.some(function (id) { var d = document.getElementById(id); return d && !d.classList.contains('hidden'); });
    if (anyOpen) return;
    document.body.classList.remove('mz-lock');
    if (opener && opener.isConnected && typeof opener.focus === 'function') { try { opener.focus({ preventScroll: true }); } catch (e) {} }
    opener = null;
  }

  IDS.forEach(function (id) {
    var dlg = document.getElementById(id);
    if (!dlg) return;
    if (!dlg.hasAttribute('aria-labelledby') && !dlg.hasAttribute('aria-label')) {
      var h = dlg.querySelector('h1,h2,h3');
      if (h) { if (!h.id) h.id = id + '-title'; dlg.setAttribute('aria-labelledby', h.id); }
    }
    var wasHidden = dlg.classList.contains('hidden');
    new MutationObserver(function () {
      var nowHidden = dlg.classList.contains('hidden');
      if (nowHidden === wasHidden) return;
      wasHidden = nowHidden;
      if (nowHidden) onClose(); else onOpen(dlg);
    }).observe(dlg, { attributes: true, attributeFilter: ['class'] });
    dlg.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab' || dlg.classList.contains('hidden')) return;
      var t = items(dlg); if (!t.length) return;
      var first = t[0], last = t[t.length - 1];
      if (e.shiftKey && (document.activeElement === first || !dlg.contains(document.activeElement))) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  });
})();
