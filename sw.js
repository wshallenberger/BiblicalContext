/* sw.js — makes Verse Inspector installable and usable without internet.
 * Version label below changes with every release so phones notice the update.
 *   - The app itself (pages, scripts) is fetched fresh when online and kept for when you are offline.
 *   - Data (chapters, commentary, timeline, ...) is served from the phone's saved copy first and refreshed in the background.
 *   - ESV and NLT text (/api/...) is NEVER saved: the publishers do not allow it, so those versions need a connection.
 */
const VER = 'r72';
const SHELL = 'vi-shell-' + VER;
const DATA = 'vi-data';                     // chapters and pictures; survives updates; this is what "Download for offline use" fills
const CDN = ['fonts.googleapis.com', 'fonts.gstatic.com', 'unpkg.com'];
const SHELL_FILES = ['./', 'index.html', 'books.js', 'app.js', 'settings.js', 'music.js', 'saved.js', 'plans.js', 'search.js', 'parallels.js', 'compare.js', 'genealogy.js', 'commentary.js', 'glossary.js', 'home.js', 'vtrans.js', 'translations.js', 'pwa.js', 'manifest.webmanifest',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png', 'icons/favicon-32.png',
  'data/translations/registry.json', 'data/manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(SHELL);
    await Promise.all(SHELL_FILES.map(u => c.add(new Request(u, { cache: 'reload' })).catch(() => {})));
  })());
});
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.indexOf('vi-shell-') === 0 && k !== SHELL).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});
self.addEventListener('message', e => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
  if (e.data === 'VERSION' && e.source) e.source.postMessage({ sw: VER });
});

const timeout = (ms) => new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms));
async function networkFirst(req, ms) {
  const c = await caches.open(SHELL);
  try {
    const res = await Promise.race([fetch(req), timeout(ms)]);
    if (res && res.ok) c.put(req, res.clone());
    return res;
  } catch (err) {
    const hit = await c.match(req, { ignoreSearch: true }) || await caches.match(req, { ignoreSearch: true });
    if (hit) return hit;
    if (req.mode === 'navigate') { const idx = await c.match('index.html') || await c.match('./'); if (idx) return idx; }
    throw err;
  }
}
async function freshAndStore(req) {            // a deliberate "download now" request
  const res = await fetch(req);
  if (res && res.ok) (await caches.open(DATA)).put(req, res.clone());
  return res;
}
async function staleWhileRevalidate(req) {
  const hit = await caches.match(req);
  const net = fetch(req).then(res => {
    if (res && (res.ok || res.type === 'opaque')) caches.open(DATA).then(c => c.put(req, res.clone()));
    return res;
  }).catch(() => null);
  if (hit) { net.catch(() => {}); return hit; }
  const res = await net;
  return res || Response.error();
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === self.location.origin) {
    const p = url.pathname;
    if (p.indexOf('/api/') === 0 || p.indexOf('/.netlify/') === 0) return;        // licensed Bible text: network only, never saved
    if (req.headers.has('range')) return;
    if (req.cache === 'reload' || req.cache === 'no-store') {
      if (/\.(json|jpg|jpeg|png|webp|svg)$/.test(p) && p.indexOf('registry.json') < 0 && p.indexOf('offline-files.json') < 0) { e.respondWith(freshAndStore(req)); }
      return;
    }
    const shell = req.mode === 'navigate' || /\.(html|js|webmanifest)$/.test(p) || /\/$/.test(p) || /registry\.json$/.test(p) || /offline-files\.json$/.test(p);
    e.respondWith(shell ? networkFirst(req, 4000) : staleWhileRevalidate(req));
  } else if (CDN.indexOf(url.hostname) >= 0) {
    e.respondWith(staleWhileRevalidate(req));
  }
});
