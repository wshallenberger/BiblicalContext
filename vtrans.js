/* vtrans.js — Bible versions in the reader and the verse sheet.
 * Every version is native: nothing for the reader to download or upload.
 *   - Public-domain versions (BSB, KJV, ASV, YLT) are plain files inside the site (data/translations/<id>/<book>/<chapter>.json).
 *   - Licensed versions (ESV, NLT, ...) come one chapter at a time from the site's own server function (/api/bible), which holds the keys.
 * The list of versions comes from data/translations/registry.json: a version shows up here when its "status" there is "ready".
 * The app calls: VT.afterRender(slug, chapter)  and  VT.onSheet(slug, chapter, verseNum, bsbText)
 */
(function () {
  'use strict';
  var LS = 'vi_vtrans';
  var FALLBACK = [
    { id: 'bsb', abbr: 'BSB', name: 'Berean Standard Bible', license: 'public-domain', delivery: 'bundled', path: 'data/{slug}/{ch}.json' },
    { id: 'kjv', abbr: 'KJV', name: 'King James Version', license: 'public-domain', delivery: 'bundled' }
  ];
  var list = FALLBACK.slice();     // the versions on offer, in order
  var T = null;                    // translations.js client (null = the built-in list above is used)
  var cur = 'bsb';
  try { var s = localStorage.getItem(LS); if (s) cur = s; } catch (e) {}
  var cache = {};
  var ctx = { slug: null, chap: null };
  var sheetMode = null, sheetArgs = null;
  var notReady = [];               // versions in the registry that are not switched on yet

  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function def(id) { for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i]; return null; }
  function have(id) { return !!def(id); }
  function pd(d) { return d.license === 'public-domain'; }
  function tagOf(d) { return d.name.toUpperCase() + (pd(d) ? ' · PUBLIC DOMAIN' : ''); }
  function bookName(slug) { return slug.replace(/-/g, ' ').replace(/\b[a-z]/g, function (c) { return c.toUpperCase(); }); }

  // ---------- reading a chapter in any version -> { verseNumber: text } or null ----------
  function fetchJson(u) { return fetch(u).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }); }
  function toMap(vs) { var m = {}; (vs || []).forEach(function (v) { m[v.num] = v.text; }); return m; }
  function chapter(id, slug, ch) {
    var key = id + '/' + slug + '/' + ch;
    if (cache[key]) return cache[key];
    var d = def(id), p;
    if (!d) p = Promise.resolve({ map: null, err: 'NOT_AVAILABLE' });
    else if (T) p = T.chapter(id, slug, ch).then(function (j) { return { map: toMap(j.verses), err: null }; }, function (e) { return { map: null, err: (e && e.code) || 'NETWORK' }; });
    else p = fetchJson(d.path ? d.path.replace('{slug}', slug).replace('{ch}', ch) : 'data/translations/' + id + '/' + slug + '/' + ch + '.json')
      .then(function (j) { return j ? { map: toMap(j.verses), err: null } : { map: null, err: 'NOT_AVAILABLE' }; });
    cache[key] = p;
    p.then(function (r) { if (r.err === 'NETWORK' || r.err === 'RATE_LIMIT') delete cache[key]; });   // try again next time
    return p;
  }
  function why(id, err, slug) {
    var a = (def(id) || { abbr: id }).abbr;
    if (err === 'NOT_AVAILABLE') return a + ' is not added for ' + bookName(slug) + ' yet, so the BSB is shown.';
    if (err === 'RATE_LIMIT' || err === 'DAILY_BUDGET') return a + ' is busy right now (the publisher limits how many chapters it will send). Try again in a minute. The BSB is shown.';
    return 'Could not reach ' + a + ' just now, so the BSB is shown.';
  }
  function creditHtml(id) {
    var d = def(id); if (!d || pd(d) || !d.notice) return '';
    return esc(d.notice) + (d.linkRequired ? ' <a href="' + esc(d.linkRequired) + '" target="_blank" rel="noopener">' + esc(d.linkRequired.replace(/^https?:\/\//, '')) + '</a>' : '');
  }

  // ---------- reader ----------
  function setTag(id) {
    var d = def(id) || list[0];
    var t = $('trTagText'); if (t) t.textContent = tagOf(d);
    var b = $('vtOpen'); if (b) b.textContent = d.abbr + ' ▾';
  }
  function afterRender(slug, chap) {
    ctx.slug = slug; ctx.chap = chap;
    var id = have(cur) ? cur : 'bsb';
    setTag(id);
    var note = $('vtNote'); if (note) note.hidden = true;
    if (id === 'bsb') return;
    chapter(id, slug, chap).then(function (r) {
      if (ctx.slug !== slug || ctx.chap !== chap) return;      // moved on
      var box = $('verseList'); if (!box) return;
      if (!r.map) { if (note) { note.textContent = why(id, r.err, slug); note.hidden = false; } return; }
      box.querySelectorAll('.verse').forEach(function (p) {
        var n = p.dataset.verse, t = r.map[n], tn = p.lastChild;
        if (!tn || tn.nodeType !== 3) return;
        if (t != null) tn.nodeValue = t; else p.classList.add('vt-missing');
      });
      var cr = creditHtml(id); if (note && cr) { note.innerHTML = cr; note.hidden = false; }
    });
  }
  function choose(id) {
    if (!have(id)) return;
    cur = id;
    try { localStorage.setItem(LS, id); } catch (e) {}
    setTag(id);
    if (ctx.slug) afterRender(ctx.slug, ctx.chap);
  }

  // ---------- verse sheet: flip between versions or see them all ----------
  function quoted(t) { return /^["“]/.test(t) ? t : '"' + t + '"'; }
  function onSheet(slug, chap, num, bsbText) {
    sheetArgs = { slug: slug, chap: chap, num: num, bsb: bsbText };
    sheetMode = have(cur) ? cur : 'bsb';
    drawSheet();
  }
  function drawSheet() {
    var a = sheetArgs; if (!a) return;
    var box = $('vtChips'), tgt = $('sheetVerseText'); if (!box || !tgt) return;
    var ids = list.map(function (d) { return d.id; });
    if (ids.length < 2) { box.innerHTML = ''; box.hidden = true; tgt.textContent = quoted(a.bsb); return; }
    box.hidden = false;
    box.innerHTML = ids.map(function (id) { return '<button type="button" class="vt-chip' + (sheetMode === id ? ' on' : '') + '" data-id="' + id + '">' + def(id).abbr + '</button>'; }).join('') +
      '<button type="button" class="vt-chip' + (sheetMode === 'all' ? ' on' : '') + '" data-id="all">Compare</button>';
    box.querySelectorAll('.vt-chip').forEach(function (b) { b.onclick = function () { sheetMode = b.dataset.id; drawSheet(); }; });
    var want = sheetMode === 'all' ? ids : [sheetMode];
    var token = a.slug + a.chap + ':' + a.num + ':' + sheetMode;
    drawSheet.token = token;
    Promise.all(want.map(function (id) { return id === 'bsb' ? Promise.resolve(null) : chapter(id, a.slug, a.chap); })).then(function (res) {
      if (drawSheet.token !== token) return;
      var rows = want.map(function (id, i) {
        var r = res[i];
        return { id: id, t: id === 'bsb' ? a.bsb : (r && r.map ? r.map[a.num] : null), err: r && r.err };
      });
      var credits = rows.filter(function (r) { return r.t != null; }).map(function (r) { return creditHtml(r.id); }).filter(Boolean);
      var cr = credits.length ? '<span class="vt-small vt-credit">' + credits.join(' ') + '</span>' : '';
      if (sheetMode !== 'all') {
        var r0 = rows[0];
        tgt.textContent = r0.t != null ? quoted(r0.t) : (r0.err && r0.err !== 'NOT_AVAILABLE' ? why(r0.id, r0.err, a.slug) : 'This verse is not in the ' + def(r0.id).abbr + ' text.');
        if (cr && r0.t != null) tgt.insertAdjacentHTML('beforeend', ' ' + cr);
      } else {
        tgt.innerHTML = rows.map(function (r) {
          return '<span class="vt-row"><b>' + def(r.id).abbr + '</b> ' + (r.t != null ? esc(r.t) : '<i>not in this version</i>') + '</span>';
        }).join('') + cr;
      }
    });
  }

  // ---------- picker ----------
  var overlay = null;
  function build() {
    if (overlay) return;
    var phone = document.querySelector('.phone') || document.body;
    overlay = document.createElement('div');
    overlay.className = 'vt-overlay'; overlay.id = 'vtOverlay'; overlay.hidden = true;
    overlay.innerHTML = '<div class="pick-head"><span style="min-width:56px"></span><span>Bible version</span><button class="pick-x" id="vtX" type="button">✕</button></div><div class="pick-body" id="vtBody"></div>';
    phone.appendChild(overlay);
    $('vtX').onclick = close;
  }
  function open() { build(); drawPicker(); overlay.hidden = false; }
  function close() { if (overlay) overlay.hidden = true; if (ctx.slug) afterRender(ctx.slug, ctx.chap); }
  function drawPicker() {
    var body = $('vtBody'); if (!body) return;
    var cur2 = have(cur) ? cur : 'bsb', html = '';
    list.forEach(function (d) {
      html += '<button type="button" class="vt-row-pick' + (cur2 === d.id ? ' on' : '') + '" data-id="' + d.id + '"><span class="vt-dot"></span><span class="vt-rt"><b>' + esc(d.abbr) + '</b> ' + esc(d.name) +
        '<small>' + (d.delivery === 'bundled' ? 'built in' : 'live from the publisher') + (pd(d) ? ' · public domain' : ' · used with permission') + '</small></span></button>';
    });
    if (notReady.length) html += '<p class="vt-small vt-more">Not switched on yet: ' + esc(notReady.join(', ')) + '.</p>';
    body.innerHTML = html;
    body.querySelectorAll('.vt-row-pick').forEach(function (b) { b.onclick = function () { choose(b.dataset.id); drawPicker(); }; });
  }

  function loadScript(src) {
    return new Promise(function (res, rej) {
      var s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = function () { rej(new Error('Could not load ' + src)); };
      document.head.appendChild(s);
    });
  }
  function startList() {
    var go = function () {
      T = window.Translations.create();
      return T.load().then(function () {
        var ready = T.list({ ready: true });
        var base = ready.filter(function (t) { return t.id === 'bsb'; }).concat(ready.filter(function (t) { return t.id !== 'bsb'; }));
        if (base.length) list = base;
        notReady = T.list().filter(function (t) { return !T.list({ ready: true }).some(function (r) { return r.id === t.id; }); }).map(function (t) { return t.abbr; });
      });
    };
    return (window.Translations ? Promise.resolve() : loadScript('translations.js')).then(go).catch(function () { T = null; list = FALLBACK.slice(); });
  }
  function mount() {
    var b = $('vtOpen'); if (b) b.onclick = open;
    try { if (window.indexedDB) indexedDB.deleteDatabase('vi-local'); } catch (e) {}     // clears the old "add your own PDF" data from earlier versions of the app
    startList().then(function () { if (!have(cur)) cur = 'bsb'; setTag(cur); if (ctx.slug) afterRender(ctx.slug, ctx.chap); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();

  window.VT = { afterRender: afterRender, onSheet: onSheet, open: open, current: function () { return cur; }, choose: choose };
})();
