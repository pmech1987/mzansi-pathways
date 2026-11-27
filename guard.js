/* Mzansi Pathways load guard (v78). Lives at the site root on purpose: if a partial upload loses the
   css/, js/ or data/ folders, this file can still tell the person what is wrong instead of showing a broken page.
   No inline styles in markup, so it works with the strict Content-Security-Policy. */
(function () {
  'use strict';
  var shown = false;
  function css(el, o) { for (var k in o) el.style[k] = o[k]; return el; }

  function banner(missing, custom) {
    if (shown) return; shown = true;
    var b = document.createElement('div');
    b.setAttribute('role', 'alert'); b.setAttribute('aria-live', 'assertive');
    css(b, { position: 'fixed', left: '0', right: '0', top: '0', zIndex: '99999', background: '#0e1b3d', color: '#fff',
      padding: '14px 16px', font: '15px/1.45 system-ui,-apple-system,Segoe UI,Roboto,sans-serif', boxShadow: '0 8px 24px rgba(0,0,0,.35)' });
    var h = document.createElement('strong'); h.textContent = 'Part of Mzansi Pathways did not load.';
    var p = document.createElement('div'); css(p, { margin: '4px 0 10px', opacity: '.9' });
    p.textContent = custom ? custom : missing.length
      ? 'Missing: ' + missing.join(', ') + '. If you just updated the site, make sure the css, js and data folders were published too.'
      : 'Check your connection, then try again.';
    var go = document.createElement('button'); go.type = 'button'; go.textContent = 'Reload fresh copy';
    css(go, { background: '#f2a516', color: '#0e1b3d', border: '0', borderRadius: '999px', padding: '10px 18px', font: 'inherit', fontWeight: '800', minHeight: '44px' });
    go.onclick = function () {
      // Failsafe: if a fresh reload already failed twice this session, stop looping and say so plainly.
      var tries = 0;
      try { tries = Number(sessionStorage.getItem('mz_guard_reloads') || 0); sessionStorage.setItem('mz_guard_reloads', String(tries + 1)); } catch (e) {}
      if (tries >= 2) { p.textContent = 'Still not loading after two fresh tries. Please check your data connection or try again later. Your saved information on this phone is safe.'; go.textContent = 'Try once more'; try { sessionStorage.removeItem('mz_guard_reloads'); } catch (e) {} return; }
      var jobs = [];
      try { if (navigator.serviceWorker) jobs.push(navigator.serviceWorker.getRegistrations().then(function (rs) { return Promise.all(rs.map(function (r) { return r.unregister(); })); })); } catch (e) {}
      try { if (window.caches) jobs.push(caches.keys().then(function (ks) { return Promise.all(ks.map(function (k) { return caches.delete(k); })); })); } catch (e) {}
      Promise.all(jobs).catch(function () {}).then(function () { location.reload(); });
    };
    b.appendChild(h); b.appendChild(p); b.appendChild(go);
    (document.body || document.documentElement).appendChild(b);
    try { go.focus(); } catch (e) {}
  }

  function cssLoaded() {
    var t = document.createElement('div'); t.className = 'hidden';
    (document.body || document.documentElement).appendChild(t);
    var ok = getComputedStyle(t).display === 'none';
    t.parentNode.removeChild(t); return ok;
  }

  function head(u) { return fetch(u, { method: 'HEAD', cache: 'no-store' }).then(function (r) { return r.ok; }, function () { return false; }); }

  function check() {
    var missing = [];
    if (!cssLoaded()) missing.push('css/');
    var main = document.getElementById('app-main');
    var appRan = !!(main && main.children.length);
    var probes = [];
    if (!appRan) probes.push(head('./js/app.js').then(function (ok) { if (!ok) missing.push('js/'); }));
    probes.push(head('./data/index.json').then(function (ok) { if (!ok) missing.push('data/'); }));
    Promise.all(probes).then(function () {
      if (missing.length || !appRan) banner(missing);
      else { try { sessionStorage.removeItem('mz_guard_reloads'); } catch (e) {} }
    }).catch(function () {});
  }

  window.addEventListener('load', function () { setTimeout(function () { try { check(); } catch (e) {} }, 2500); });
  // A SyntaxError means this browser is too old for the app's code (not a missing file), so say that plainly.
  window.addEventListener('error', function (e) {
    if (e && (!e.target || e.target === window)) {
      var msg = String((e && e.message) || '');
      if (/SyntaxError|Unexpected token|Invalid regular expression/i.test(msg)) {
        banner([], 'This browser looks too old to run Mzansi Pathways. Please update Chrome, Safari or Firefox (or open this link in a newer browser), then reload.');
      }
    }
  });
  window.addEventListener('error', function (e) {
    if (e && e.target && e.target !== window && (e.target.tagName === 'SCRIPT' || e.target.tagName === 'LINK')) {
      setTimeout(function () { banner([(e.target.getAttribute('src') || e.target.getAttribute('href') || 'a file')]); }, 300);
    }
  }, true);
})();
