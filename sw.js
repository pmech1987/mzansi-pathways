const CACHE = 'mzansi-pathways-v119';
// CORE: the app cannot work offline without these. If one cannot be fetched the install fails and the old worker keeps running.
const CORE = ['./', './index.html', './guard.js', './css/utilities.css', './css/legacy_inline.css', './css/mzansi_ui.css', './css/civic_mobile_a11y.css', './js/work_tools.js', './js/boot.js', './js/features/trust_guards.js', './js/modules/storage.js', './js/modules/funding.js', './js/modules/ui.js', './js/modules/results.js', './js/modules/study.js', './js/modules/work.js', './js/app.js', './js/home.js', './js/a11y.js', './js/toolkit.js', './js/backup.js', './js/comfort_and_jump.js', './js/clean_layout.js', './js/pwa_health.js', './js/calendar.js', './js/checklist.js', './js/screens.js', './js/engine.js', './js/data.js', './js/i18n.js', './js/ocr.js', './js/catalogue.js', './js/catalogue_data.js'];
// NICE: saved if reachable, never blocks the install (a missing icon or data file must not break offline mode for everyone).
const NICE = ['./check_prospectus.html', './css/prospectus_check.css', './js/prospectus_check.js', './js/subjects_data.js', './creator_studio.html', './css/creator_studio.css', './js/creator_studio.js', './manifest.json', './favicon.svg', './icon-192.png', './icon-512.png', './data/index.json', './data/institutions.json', './data/careers.json', './data/bursaries.json', './data/events.json', './data/pset_national_registry.json', './data/sa_extended_pathways.json'];
const OPTIONAL = [];
const NET_TIMEOUT_MS = 8000;

function offlineJson() { return new Response('{}', { status: 503, headers: { 'Content-Type': 'application/json' } }); }

function fetchWithTimeout(req, ms) {
  if (typeof AbortController === 'undefined') return fetch(req);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms || NET_TIMEOUT_MS);
  return fetch(req, { signal: ctrl.signal }).finally(() => clearTimeout(timer));
}

// Quota failsafe: if storage is full, drop the oldest non-core entry once and retry, never throw into a fetch handler.
async function safePut(c, req, res) {
  try { await c.put(req, res.clone()); return true; }
  catch (e) {
    try { const ks = await c.keys(); const victim = ks.find(k => /\/data\/programmes\//.test(k.url) || /\.(png|gz)$/.test(k.url)); if (victim) { await c.delete(victim); await c.put(req, res.clone()); return true; } } catch (e2) {}
    return false;
  }
}

async function addOne(c, u) {
  try { const r = await fetch(u, { cache: 'reload' }); if (r && r.ok && r.status === 200) { return await safePut(c, u, r); } } catch (e) {}
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
      fetchWithTimeout(e.request, NET_TIMEOUT_MS).then(res => {
        if (res && res.ok && res.status === 200 && res.type === 'basic') { const clone = res.clone(); caches.open(CACHE).then(c => c.put(e.request, clone)).catch(() => {}); }
        return res;
      }).catch(() => caches.match(e.request, { ignoreSearch: true }).then(h => h || caches.match('./index.html')).then(h => h || new Response('<!doctype html><meta charset="utf-8"><title>Offline</title><p>You are offline and this page was not saved yet. Reconnect once to save it.</p>', { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } })))
    );
    return;
  }
  const u = new URL(e.request.url);
  if (u.origin === self.location.origin && u.pathname.indexOf('/data/') >= 0) {
    // Data files (any year): fresh copy first with 8s timeout failsafe, falls back to last saved copy.
    // Only a good 200 response replaces the saved copy, so a server error page can never overwrite working data.
    e.respondWith(fetchWithTimeout(e.request, NET_TIMEOUT_MS).then(res => {
      if (res && res.ok && res.status === 200) { const clone = res.clone(); caches.open(CACHE).then(c => c.put(e.request, clone)).catch(() => {}); return res; }
      return caches.match(e.request).then(h => h || res);
    }).catch(() => caches.match(e.request).then(h => h || offlineJson())));
    return;
  }
  if (u.origin === self.location.origin && /\.(css|js)$/.test(u.pathname)) {
    // Code and styles: saved copy shows instantly, a fresh copy is fetched behind it (a new release arrives on the next visit).
    e.respondWith(caches.open(CACHE).then(c => c.match(e.request).then(hit => {
      const net = fetch(e.request).then(res => { if (res && res.ok && res.status === 200) c.put(e.request, res.clone()).catch(() => {}); return res; }).catch(() => null);
      return hit || net.then(r => r || new Response('', { status: 503 }));
    })));
    return;
  }
  // Everything else: saved copy first. A failed request gets a clean error, never the home page pretending to be a script or image.
  e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request).catch(() => new Response('', { status: 503 }))));
});

self.addEventListener('message', e => { if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting(); });
self.addEventListener('message', e => { if (e.data && e.data.type === 'GET_VERSION' && e.source) e.source.postMessage({ type: 'VERSION', cache: CACHE }); });
