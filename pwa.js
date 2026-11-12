/* pwa.js — installing the app, reading without internet, and update notices (Settings → Install & offline).
 * Works with sw.js. Nothing is sent anywhere; everything is saved on this device.
 */
(function () {
  'use strict';
  var LS = 'vi_offline';
  var DATA = 'vi-data';
  var EXTRA_CSS = [
    'https://fonts.googleapis.com/css2?family=Literata:opsz,wght@7..72,400;7..72,500;7..72,600&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap',
    'https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css'
  ];
  var EXTRA_JS = ['https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js'];
  var reg = null, deferred = null, busy = false;

  function $(id) { return document.getElementById(id); }
  function mb(n) { return (n / 1048576).toFixed(n >= 10485760 ? 0 : 1) + ' MB'; }
  function isStandalone() { return (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true; }
  function isIOS() { return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); }
  function saved() { try { return JSON.parse(localStorage.getItem(LS) || 'null'); } catch (e) { return null; } }
  function keep(o) { try { if (o) localStorage.setItem(LS, JSON.stringify(o)); else localStorage.removeItem(LS); } catch (e) {} }
  var canCache = 'caches' in window;

  // ---------- install ----------
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); deferred = e; paint(); });
  window.addEventListener('appinstalled', function () { deferred = null; paint(); });
  function installNow() {
    if (!deferred) return;
    deferred.prompt();
    deferred.userChoice.then(function () { deferred = null; paint(); }, function () {});
  }

  // ---------- offline download ----------
  var listP = null;
  function getList() { return fetch('offline-files.json', { cache: 'no-store' }).then(function (r) { if (!r.ok) throw new Error('no list'); return r.json(); }); }
  function put(cache, url, res) { return cache.put(url, res); }
  function warmExtras(cache) {
    var jobs = [];
    EXTRA_CSS.forEach(function (u) {
      jobs.push(fetch(u).then(function (r) { if (!r.ok) return; var c = r.clone(); put(cache, u, r); return c.text(); }).then(function (css) {
        if (!css) return;
        var m = css.match(/url\((https:[^)]+)\)/g) || [];
        return Promise.all(m.map(function (x) { var fu = x.slice(4, -1).replace(/["']/g, ''); return fetch(fu).then(function (r) { if (r.ok) return put(cache, fu, r); }).catch(function () {}); }));
      }).catch(function () {}));
    });
    EXTRA_JS.forEach(function (u) { jobs.push(fetch(u).then(function (r) { if (r.ok) return put(cache, u, r); }).catch(function () {})); });
    return Promise.all(jobs);
  }
  function download() {
    if (busy || !canCache) return;
    busy = true; paint(0, 0);
    var list, cache, done = 0, bytes = 0, fail = 0;
    getList().then(function (l) { list = l; return caches.open(DATA); }).then(function (c) {
      cache = c;
      var q = list.files.slice(), total = list.bytes;
      function worker() {
        var f = q.shift(); if (!f) return Promise.resolve();
        return fetch(f[0], { cache: 'reload' }).then(function (r) {
          if (!r.ok) { fail++; return; }
          return cache.put(f[0], r.clone()).then(function () { return r.arrayBuffer(); }).then(function () { done++; bytes += f[1]; paint(done / list.count, bytes, list); });
        }).catch(function () { fail++; }).then(worker);
      }
      var ws = []; for (var i = 0; i < 6; i++) ws.push(worker());
      return Promise.all(ws).then(function () { return warmExtras(cache); }).then(function () { return total; });
    }).then(function () {
      busy = false;
      if (fail === 0) keep({ v: list.v, at: Date.now(), n: list.count, bytes: list.bytes });
      paint(null, 0, list, fail ? 'Some files could not be saved (' + fail + '). Check your connection and try again.' : '');
    }).catch(function () { busy = false; paint(null, 0, null, 'Could not start the download. Check your connection and try again.'); });
  }
  function removeAll() {
    if (!canCache || busy) return;
    caches.delete(DATA).then(function () { keep(null); paint(); });
  }

  // ---------- Settings card ----------
  var latest = null;   // newest list from the server, when known
  function paint(frac, bytes, list, msg) {
    var t = $('stInstTxt'); if (!t) return;
    var ins = $('stInstall'), ios = $('stInstIos'), go = $('stOffGo'), rm = $('stOffRm'), bar = $('stOffBar'), ot = $('stOffTxt'), ver = $('stVer');
    // install
    if (isStandalone()) { t.textContent = 'You are using the installed app.'; ins.hidden = true; ios.hidden = true; }
    else if (deferred) { t.textContent = 'Add Daily Butter to your home screen so it opens like any other app, full screen.'; ins.hidden = false; ios.hidden = true; }
    else if (isIOS()) { t.textContent = 'Add Daily Butter to your home screen so it opens like any other app, full screen.'; ins.hidden = true; ios.hidden = false; }
    else { t.textContent = 'In your browser menu, choose Install app (or Add to Home screen) to open Daily Butter like any other app.'; ins.hidden = true; ios.hidden = true; }
    // offline
    if (!canCache) { ot.textContent = 'This browser cannot save data for offline use.'; go.hidden = true; rm.hidden = true; bar.hidden = true; return; }
    var s = saved();
    if (busy) {
      bar.hidden = false; bar.firstElementChild.style.width = Math.round((frac || 0) * 100) + '%';
      ot.textContent = 'Saving… ' + (list ? Math.round((frac || 0) * list.count) + ' of ' + list.count + ' files · ' + mb(bytes || 0) : 'starting');
      go.disabled = true; go.textContent = 'Downloading…'; rm.hidden = true; return;
    }
    bar.hidden = true; go.disabled = false;
    var stale = s && latest && latest.v !== s.v;
    if (s) {
      ot.textContent = (msg ? msg + ' ' : '') + 'Saved on this device: ' + mb(s.bytes) + ', ' + new Date(s.at).toLocaleDateString() + '.' + (stale ? ' A newer set of chapters is available.' : ' Everything in the app opens without internet.');
      go.textContent = stale ? 'Update the download' : 'Download again'; go.className = stale ? 'st-btn' : 'st-btn st-quiet'; rm.hidden = false;
    } else {
      ot.textContent = (msg ? msg + ' ' : '') + 'Save every chapter, commentary and timeline on this device' + (latest ? ' (' + mb(latest.bytes) + ')' : ' (about 22 MB)') + ' so you can read without a connection. Best done on Wi-Fi.';
      go.textContent = 'Download for offline use'; go.className = 'st-btn'; rm.hidden = true;
    }
    if (ver && ver.dataset.v) ver.textContent = ver.dataset.v;
  }

  // ---------- updates ----------
  function banner(show) {
    var b = $('updBar'); if (!b) return; b.hidden = !show;
  }
  function watchUpdates() {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('sw.js').then(function (r) {
      reg = r;
      var seen = function (w) { w.addEventListener('statechange', function () { if (w.state === 'installed' && navigator.serviceWorker.controller) banner(true); }); };
      if (r.waiting && navigator.serviceWorker.controller) banner(true);
      r.addEventListener('updatefound', function () { if (r.installing) seen(r.installing); });
      var chk = function () { try { var u = r.update(); if (u && u.catch) u.catch(function () {}); } catch (e) {} };
      document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') chk(); });
      setInterval(chk, 30 * 60 * 1000);
      chk();
    }).catch(function () {});
    var reloading = false;
    navigator.serviceWorker.addEventListener('controllerchange', function () { if (reloading) return; reloading = true; location.reload(); });
    navigator.serviceWorker.addEventListener('message', function (e) { if (e.data && e.data.sw) { var v = $('stVer'); if (v) { v.dataset.v = 'App version ' + e.data.sw; v.textContent = v.dataset.v; } } });
    navigator.serviceWorker.ready.then(function (r) { if (r.active) r.active.postMessage('VERSION'); });
  }
  function applyUpdate() {
    if (reg && reg.waiting) reg.waiting.postMessage('SKIP_WAITING'); else location.reload();
  }

  // the phone's top bar follows the app's theme
  function themeColor() {
    var m = document.querySelector('meta[name="theme-color"]:not([media])');
    if (!m) { m = document.createElement('meta'); m.name = 'theme-color'; document.head.appendChild(m); }
    var c = getComputedStyle(document.body).backgroundColor; if (c) m.content = c;
  }

  function start() {
    var i = $('stInstall'); if (i) i.onclick = installNow;
    var g = $('stOffGo'); if (g) g.onclick = download;
    var r = $('stOffRm'); if (r) r.onclick = removeAll;
    var u = $('updGo'); if (u) u.onclick = applyUpdate;
    var x = $('updX'); if (x) x.onclick = function () { banner(false); };
    var scr = document.getElementById('screen-settings');
    var refresh = function () { getList().then(function (l) { latest = l; paint(); }).catch(function () { paint(); }); };
    if (scr && typeof MutationObserver !== 'undefined') new MutationObserver(function () { if (scr.classList.contains('active') && !busy) refresh(); }).observe(scr, { attributes: true, attributeFilter: ['class'] });
    paint(); themeColor();
    new MutationObserver(themeColor).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    watchUpdates();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
  window.ViApp = { download: download, installed: isStandalone };
})();
