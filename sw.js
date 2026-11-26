const CACHE = 'mzansi-pathways-v91';
// CORE: the app cannot work offline without these. If one cannot be fetched the install fails and the old worker keeps running.
const CORE = ['./', './index.html', './guard.js', './css/utilities.css', './css/legacy_inline.css', './css/mzansi_ui.css', './css/civic_mobile_a11y.css', './js/work_tools.js', './js/boot.js', './js/features/trust_guards.js', './js/app.js', './js/home.js', './js/a11y.js', './js/screens.js', './js/engine.js', './js/data.js', './js/i18n.js', './js/ocr.js', './js/catalogue.js', './js/catalogue_data.js'];
// NICE: saved if reachable, never blocks the install (a missing icon or data file must not break offline mode for everyone).
const NICE = ['./creator_studio.html', './css/creator_studio.css', './js/creator_studio.js', './manifest.json', './icon-192.png', './icon-512.png', './data/index.json', './data/institutions.json', './data/careers.json', './data/bursaries.json', './data/events.json', './data/pset_national_registry.json'];
const OPTIONAL = ['./vendor/tesseract/tesseract.min.js', './vendor/tesseract/worker.min.js', './vendor/tesseract/eng.traineddata.gz'];

function offlineJson() { return new Response('{}', { status: 503, headers: { 'Content-Type': 'application/json' } }); }

async function addOne(c, u) {
  try { const r = await fetch(u, { cache: 'reload' }); if (r && r.ok) { await c.put(u, r); return true; } } catch (e) {}
  return false;
}

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    const core = await Promise.all(CORE.map(u => addOne(c, u)));
    if (core.some(ok => !ok)) throw new Error('core files unavailable; keeping the previous version');
    await Promise.all(NICE.concat(OPTIONAL).map(u => addOne(c, u)));
    // Every intake year listed in data/index.json is saved too, so any year works offline (not just one hardcoded year).
    try {
      const idx = await (await fetch('./data/index.json', { cache: 'reload' })).json();
      await Promise.all((idx.files || []).filter(f => typeof f === 'string' && /^[\w./-]+\.json$/.test(f) && f.indexOf('..') < 0).map(f => addOne(c, './data/' + f)));
    } catch (err) {}
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE && k.indexOf('mzansi-pathways-') === 0).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const isNav = e.request.mode === 'navigate' || (e.request.headers.get('accept') || '').includes('text/html');
  if (isNav) {
    e.respondWith(
      fetch(e.request).then(res => {
        if (res && res.ok && res.type === 'basic') { const clone = res.clone(); caches.open(CACHE).then(c => c.put(e.request, clone)).catch(() => {}); }
        return res;
      }).catch(() => caches.match(e.request, { ignoreSearch: true }).then(h => h || caches.match('./index.html')).then(h => h || new Response('<!doctype html><meta charset="utf-8"><title>Offline</title><p>You are offline and this page was not saved yet. Reconnect once to save it.</p>', { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } })))
    );
    return;
  }
  const u = new URL(e.request.url);
  if (u.origin === self.location.origin && u.pathname.indexOf('/data/') >= 0) {
    // Data files (any year): fresh copy first, saved for offline; falls back to the last saved copy.
    // Only a good response replaces the saved copy, so a server error page can never overwrite the last working data.
    e.respondWith(fetch(e.request).then(res => {
      if (res && res.ok) { const clone = res.clone(); caches.open(CACHE).then(c => c.put(e.request, clone)).catch(() => {}); return res; }
      return caches.match(e.request).then(h => h || res);
    }).catch(() => caches.match(e.request).then(h => h || offlineJson())));
    return;
  }
  if (u.origin === self.location.origin && /\.(css|js)$/.test(u.pathname)) {
    // Code and styles: saved copy shows instantly, a fresh copy is fetched behind it (a new release arrives on the next visit).
    e.respondWith(caches.open(CACHE).then(c => c.match(e.request).then(hit => {
      const net = fetch(e.request).then(res => { if (res && res.ok) c.put(e.request, res.clone()).catch(() => {}); return res; }).catch(() => null);
      return hit || net.then(r => r || new Response('', { status: 503 }));
    })));
    return;
  }
  // Everything else: saved copy first. A failed request gets a clean error, never the home page pretending to be a script or image.
  e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request).catch(() => new Response('', { status: 503 }))));
});

self.addEventListener('message', e => { if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting(); });
self.addEventListener('message', e => { if (e.data && e.data.type === 'GET_VERSION' && e.source) e.source.postMessage({ type: 'VERSION', cache: CACHE }); });
