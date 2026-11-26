/* Launcher, floating bar and More sheet. No inline code so it works with the strict CSP. */
(function () {
  var body = document.body, home = document.getElementById('mz-home'), more = document.getElementById('mz-more');
  if (!home) return;
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches, lastFocus = null;
  function openScreen(push) { body.classList.add('mz-screen'); if (push !== false && !(history.state && history.state.mz)) history.pushState({ mz: 1 }, ''); }
  function mark() {
    document.querySelectorAll('#mz-dock .mz-d').forEach(function (b) {
      var on = b.hasAttribute('data-home') ? !body.classList.contains('mz-screen') : (body.classList.contains('mz-screen') && b.classList.contains('active'));
      if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
    });
  }
  new MutationObserver(mark).observe(body, { attributes: true, attributeFilter: ['class'] });
  document.querySelectorAll('#mz-dock .tab-btn').forEach(function (b) { new MutationObserver(mark).observe(b, { attributes: true, attributeFilter: ['class'] }); });
  mark();
  function goHome() { body.classList.remove('mz-screen'); closeMore(); window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }); }
  function openMore() {
    if (!more) return; lastFocus = document.activeElement;
    var inst = document.getElementById('install-pwa-btn'), mi = document.getElementById('mz-more-install');
    if (mi) mi.hidden = !inst || inst.classList.contains('hidden');
    more.hidden = false; body.classList.add('mz-lock');
    var x = document.getElementById('mz-more-x'); if (x) x.focus();
  }
  function closeMore() { if (!more || more.hidden) return; more.hidden = true; body.classList.remove('mz-lock'); if (lastFocus && lastFocus.focus) lastFocus.focus(); }
  document.addEventListener('click', function (e) {
    var t = e.target.closest ? e.target : e.target.parentElement; if (!t || !t.closest) return;
    if (t.closest('[data-more-close]')) { closeMore(); return; }
    var mb = t.closest('[data-more]'); if (mb) { openMore(); return; }
    var px = t.closest('[data-proxy]');
    if (px) { var id = px.getAttribute('data-proxy'); closeMore(); var b = document.getElementById(id); if (b) setTimeout(function () { b.click(); }, 30); return; }
    if (t.closest('[data-home]')) { if (history.state && history.state.mz) history.back(); else goHome(); return; }
    if (t.closest('[data-tab]')) { closeMore(); openScreen(); window.scrollTo(0, 0); }
  }, true);
  window.addEventListener('popstate', function () { if (!(history.state && history.state.mz)) { body.classList.remove('mz-screen'); closeMore(); window.scrollTo(0, 0); } });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeMore();
    if (e.key === 'Tab' && more && !more.hidden) {
      var f = more.querySelectorAll('button:not([hidden]),a[href]'); if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (!more.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
      else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    var b = e.target.closest && e.target.closest('.mz-brand'); if (b && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); b.click(); }
  });
  function toResults(sub) {
    if (window.MZScreens) MZScreens.go('results', sub);
    var t = document.querySelector('nav[aria-label="Primary navigation"] [data-tab="results"]'); if (t) t.click();
  }
  var go = document.getElementById('mz-check'); if (go) go.addEventListener('click', function () { toResults('My marks'); });
  var scan = document.getElementById('mz-scan');
  if (scan) scan.addEventListener('click', function () { toResults('My marks'); setTimeout(function () { var b = document.getElementById('scan-results-btn'); if (b) b.click(); }, 80); });
  var tour = document.getElementById('mz-tour'); if (tour) tour.addEventListener('click', function () { var h = document.getElementById('help-btn'); if (h) h.click(); });
})();
