/* journeys.js — Journeys on the map: Abraham, the Exodus, the birth of Jesus, Paul's three journeys, the voyage to Rome.
 * data/journeys.json (built by build/journeys.py): each journey is a route of numbered stops; a stop is an event pin
 * or a point of its own (a place on the road with no event, like Haran or Syracuse).
 * The map's "Journeys" button opens the list; picking one draws its route and a bar to step through the stops.
 */
(function () {
  'use strict';
  var J = null, JP = null, cur = null, k = -1, markers = [];
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function load() {
    if (J) return Promise.resolve(J);
    if (!JP) JP = fetch('data/journeys.json').then(function (r) { if (!r.ok) throw 0; return r.json(); }).then(function (d) { J = d; return d; }, function () { JP = null; return null; });
    return JP;
  }
  function ready(fn, n) {
    n = n || 0;
    if (typeof mapMain !== 'undefined' && mapMain && mapMainReady) return fn();
    if (n > 80) return;
    setTimeout(function () { ready(fn, n + 1); }, 150);
  }
  function bookName(slug) {
    try { var b = manifest.books.find(function (x) { return x.slug === slug; }); if (b) return b.name; } catch (e) {}
    return slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, ' ');
  }
  function refText(r) { if (!r) return ''; var p = r.split('|'), n = bookName(p[0]); return (n === 'Psalms' ? 'Psalm' : n) + ' ' + p[1]; }
  function openRef(r) {
    var p = r.split('|'), m = p[1].match(/^(\d+)(?::(\d+))?/), ch = Number(m[1]), v = m[2] ? Number(m[2]) : 1, mb = null;
    try { mb = manifest.books.find(function (x) { return x.slug === p[0]; }); } catch (e) {}
    if (mb && mb.availableChapters.indexOf(ch) >= 0) openPassage(p[0], ch, v, false);
    else window.open('https://www.biblegateway.com/passage/?search=' + encodeURIComponent(refText(r)) + '&version=BSB', '_blank', 'noopener');
  }

  // ---------- the list ----------
  function panel(on) {
    var p = $('mapJPanel'); if (!p) return;
    p.hidden = !on; var b = $('mapJBtn'); if (b) b.setAttribute('aria-expanded', String(!!on));
    if (on) {
      try { mapFiltOpen(false); } catch (e) {}
      try { $('mapCard').hidden = true; $('mapList').hidden = true; } catch (e) {}
      load().then(drawList);
    }
  }
  function drawList() {
    var box = $('mapJList'); if (!box || !J) return;
    var grp = function (t, lab) {
      var xs = J.filter(function (j) { return j.testament === t; }); if (!xs.length) return '';
      return '<p class="jr-gh">' + lab + '</p>' + xs.map(function (j) {
        return '<button type="button" class="jr-item' + (cur && cur.id === j.id ? ' on' : '') + '" data-j="' + j.id + '" style="--c:' + j.color + '"><i></i><span><b>' + esc(j.name) + '</b><em>' + esc(j.sub) + ' &middot; ' + j.stops.length + ' stops</em></span></button>';
      }).join('');
    };
    box.innerHTML = grp('OT', 'Old Testament') + grp('NT', 'New Testament') + '<p class="jr-foot">Places are named in the Bible; the roads between them are drawn as simple curves, not exact routes. Sites marked "debated" have no agreed location.</p>';
  }

  // ---------- the route on the map ----------
  function clearMap() {
    markers.forEach(function (m) { try { m.remove(); } catch (e) {} }); markers = [];
    try { if (mapMain && mapMain.getSource('jr-path')) mapMain.getSource('jr-path').setData({ type: 'FeatureCollection', features: [] }); } catch (e) {}
  }
  function drawRoute() {
    if (!cur) return;
    clearMap();
    var coords = [], prev = null;
    cur.stops.forEach(function (s) {
      var p = [s.ln, s.la];
      if (prev && Math.hypot(p[0] - prev[0], p[1] - prev[1]) < 0.003) return;
      if (prev) { var seg = mapCurve(prev, p); seg.shift(); seg.forEach(function (q) { coords.push(q); }); } else coords.push(p);
      prev = p;
    });
    var data = { type: 'FeatureCollection', features: coords.length > 1 ? [{ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: coords } }] : [] };
    try {
      if (!mapMain.getSource('jr-path')) {
        mapMain.addSource('jr-path', { type: 'geojson', data: data });
        mapMain.addLayer({ id: 'jr-casing', type: 'line', source: 'jr-path', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#fffaf0', 'line-width': 7, 'line-opacity': 0.85 } });
        mapMain.addLayer({ id: 'jr-line', type: 'line', source: 'jr-path', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': cur.color, 'line-width': 3.4, 'line-dasharray': [2, 1.4] } });
      } else mapMain.getSource('jr-path').setData(data);
      mapMain.setPaintProperty('jr-line', 'line-color', cur.color);
      ['jr-casing', 'jr-line'].forEach(function (id) { mapMain.setLayoutProperty(id, 'visibility', 'visible'); });
    } catch (e) {}
    // numbered stops: a place visited twice keeps one pin with both numbers
    var at = {};
    cur.stops.forEach(function (s, i) {
      var key = s.la.toFixed(3) + ',' + s.ln.toFixed(3);
      if (at[key]) { at[key].nums.push(i); return; }
      at[key] = { s: s, nums: [i] };
    });
    Object.keys(at).forEach(function (key) {
      var a = at[key], el = document.createElement('button');
      el.type = 'button'; el.className = 'jr-pin'; el.style.setProperty('--c', cur.color);
      el.dataset.ks = a.nums.join(',');
      el.textContent = a.nums.map(function (n) { return n + 1; }).join(' · ');
      el.title = a.s.n;
      el.addEventListener('click', function (ev) { ev.stopPropagation(); var ks = a.nums, nx = ks.indexOf(k) >= 0 && ks.length > 1 ? ks[(ks.indexOf(k) + 1) % ks.length] : ks[0]; go(nx); });
      markers.push(new maplibregl.Marker({ element: el }).setLngLat([a.s.ln, a.s.la]).addTo(mapMain));
    });
  }
  function fitAll() {
    if (!cur || !mapMain) return;
    var b = new maplibregl.LngLatBounds();
    cur.stops.forEach(function (s) { b.extend([s.ln, s.la]); });
    var bar = $('mapJBar'), h = bar && !bar.hidden ? bar.offsetHeight : 0;
    try { mapMain.fitBounds(b, { padding: { top: 50, left: 40, right: 50, bottom: 70 + h }, maxZoom: 8, duration: 700 }); } catch (e) {}
  }
  function start(id) {
    load().then(function () {
      var j = J && J.find(function (x) { return x.id === id; }); if (!j) return;
      cur = j; k = -1;
      var w = document.querySelector('#screen-map .map-wrap'); if (w) w.classList.add('jr-on');
      panel(false);
      try { if (typeof mapActiveStory === 'function' && mapActiveStory()) mapSetStory(null); } catch (e) {}
      renderBar();
      ready(function () { drawRoute(); fitAll(); paintPins(); });
    });
  }
  function stop() {
    cur = null; k = -1; clearMap();
    var w = document.querySelector('#screen-map .map-wrap'); if (w) w.classList.remove('jr-on');
    try { ['jr-casing', 'jr-line'].forEach(function (id) { if (mapMain && mapMain.getLayer(id)) mapMain.setLayoutProperty(id, 'visibility', 'none'); }); } catch (e) {}
    var bar = $('mapJBar'); if (bar) bar.hidden = true;
    var b = $('mapJBtn'); if (b) b.classList.remove('on');
  }
  function paintPins() {
    markers.forEach(function (m) { var el = m.getElement(), ks = el.dataset.ks.split(',').map(Number); el.classList.toggle('on', ks.indexOf(k) >= 0); el.classList.toggle('past', k >= 0 && Math.max.apply(null, ks) < k && ks.indexOf(k) < 0); });
  }
  function go(i) {
    if (!cur) return;
    k = Math.max(0, Math.min(cur.stops.length - 1, i));
    renderBar(); paintPins();
    var s = cur.stops[k];
    ready(function () { try { mapMain.easeTo({ center: [s.ln, s.la], zoom: Math.max(mapMain.getZoom(), 6.4), duration: 650 }); } catch (e) {} });
  }
  function renderBar() {
    var bar = $('mapJBar'); if (!bar || !cur) return;
    var b = $('mapJBtn'); if (b) b.classList.add('on');
    var n = cur.stops.length, s = k >= 0 ? cur.stops[k] : null;
    bar.style.setProperty('--c', cur.color);
    bar.innerHTML = '<div class="jr-top"><i></i><b>' + esc(cur.name) + '</b><button type="button" class="jr-all" data-jr="all">Whole route</button><button type="button" class="jr-x" data-jr="x" aria-label="Close journey">&times;</button></div>' +
      (s ? '<div class="jr-stop"><button type="button" class="jr-step" data-jr="prev"' + (k <= 0 ? ' disabled' : '') + ' aria-label="Previous stop">&lsaquo;</button>' +
        '<div class="jr-mid"><span class="jr-k">' + (k + 1) + ' of ' + n + '</span><b>' + esc(s.n) + '</b><span class="jr-t">' + esc(s.t) + '</span>' +
        (s.note ? '<span class="jr-note">' + esc(s.note) + '</span>' : '') +
        (s.r ? '<button type="button" class="jr-ref" data-jr="ref">' + esc(refText(s.r)) + ' &rsaquo;</button>' : '') + '</div>' +
        '<button type="button" class="jr-step" data-jr="next"' + (k >= n - 1 ? ' disabled' : '') + ' aria-label="Next stop">&rsaquo;</button></div>'
        : '<p class="jr-blurb">' + esc(cur.blurb) + '</p><button type="button" class="jr-begin" data-jr="begin">Start at stop 1 &rsaquo;</button>');
    bar.hidden = false;
  }
  function onBar(ev) {
    var b = ev.target.closest('[data-jr]'); if (!b || !cur) return;
    var a = b.dataset.jr;
    if (a === 'x') stop();
    else if (a === 'all') { k = -1; renderBar(); paintPins(); fitAll(); }
    else if (a === 'begin') go(0);
    else if (a === 'prev') go(k - 1);
    else if (a === 'next') go(k + 1);
    else if (a === 'ref') openRef(cur.stops[k].r);
  }

  function build() {
    var bar = document.querySelector('#screen-map .map-bar'), dock = $('mapDock'); if (!bar || !dock || $('mapJBtn')) return;
    var btn = document.createElement('button'); btn.type = 'button'; btn.id = 'mapJBtn'; btn.className = 'map-jbtn'; btn.setAttribute('aria-expanded', 'false');
    btn.innerHTML = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 13c2-1 2-4 5-4s3-3 5-5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-dasharray="2 1.8"/><circle cx="3" cy="13" r="1.6" fill="currentColor"/><circle cx="13" cy="4" r="1.6" fill="currentColor"/></svg>Journeys';
    var f = $('mapFiltBtn'); bar.insertBefore(btn, f ? f.nextSibling : bar.firstChild);
    btn.addEventListener('click', function () { var p = $('mapJPanel'); panel(p && p.hidden); });
    var p = document.createElement('div'); p.className = 'map-fpanel jr-panel'; p.id = 'mapJPanel'; p.hidden = true; p.setAttribute('role', 'dialog'); p.setAttribute('aria-label', 'Journeys');
    p.innerHTML = '<div class="mf-head"><b>Journeys</b><button type="button" class="mf-x" aria-label="Close journeys">&times;</button></div><div class="mf-body" id="mapJList"></div>';
    dock.insertBefore(p, dock.firstChild);
    p.querySelector('.mf-x').addEventListener('click', function () { panel(false); });
    p.addEventListener('click', function (ev) { var b = ev.target.closest('[data-j]'); if (b) start(b.dataset.j); });
    var jb = document.createElement('div'); jb.className = 'map-top jr-bar'; jb.id = 'mapJBar'; jb.hidden = true;
    dock.insertBefore(jb, bar);
    jb.addEventListener('click', onBar);
    // Filters and Journeys share the space above the bar: opening one closes the other
    if (f) f.addEventListener('click', function () { var q = $('mapJPanel'); if (q && !q.hidden) panel(false); }, true);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build); else build();

  window.Journeys = { open: function () { build(); panel(true); }, start: start, stop: stop };
})();
