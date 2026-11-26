/* Home hero behaviour: no inline code so it works with the strict CSP. */
(function () {
  var home = document.getElementById('mz-home');
  if (!home) return;
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  function activeTab() { var a = document.querySelector('nav [data-tab].active'); return a ? a.getAttribute('data-tab') : 'results'; }
  function sync() { home.hidden = activeTab() !== 'results'; }
  sync();
  document.querySelectorAll('nav [data-tab]').forEach(function (b) {
    new MutationObserver(sync).observe(b, { attributes: true, attributeFilter: ['class'] });
  });
  function toForm() { var m = document.getElementById('app-main'); if (m) m.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }); }
  var go = document.getElementById('mz-check');
  if (go) go.addEventListener('click', toForm);
  var scan = document.getElementById('mz-scan');
  if (scan) scan.addEventListener('click', function () {
    var t = document.querySelector('nav [data-tab="results"]'); if (t && activeTab() !== 'results') t.click();
    var b = document.getElementById('scan-results-btn'); if (b) b.click();
    setTimeout(toForm, 80);
  });
  var tour = document.getElementById('mz-tour');
  if (tour) tour.addEventListener('click', function () { var h = document.getElementById('help-btn'); if (h) h.click(); });
})();
