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
  var sheetArgs = null;
  var readyP = Promise.resolve();
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
  // API.Bible asks every web app to report each chapter it shows ("FUMS"). The server sends the report id; we load their small script once and call it.
  var fumsLoad = null;
  function reportFums(j) {
    try {
      var f = j && j.source === 'live' && j.fums; if (!f || !f.id) return;
      var go = function () { try { if (window._BAPI && typeof window._BAPI.t === 'function') window._BAPI.t(f.id); } catch (e) {} };
      if (window._BAPI && typeof window._BAPI.t === 'function') { go(); return; }
      if (!fumsLoad && /^https:\/\//.test(f.jsInclude || '')) {
        fumsLoad = new Promise(function (ok) { var s = document.createElement('script'); s.src = f.jsInclude; s.async = true; s.onload = ok; s.onerror = ok; document.head.appendChild(s); });
      }
      if (fumsLoad) fumsLoad.then(go);
    } catch (e) {}
  }
  function chapter(id, slug, ch) {
    var key = id + '/' + slug + '/' + ch;
    if (cache[key]) return cache[key];
    var d = def(id), p;
    if (!d) p = Promise.resolve({ map: null, err: 'NOT_AVAILABLE' });
    else if (T) p = T.chapter(id, slug, ch).then(function (j) { reportFums(j); return { map: toMap(j.verses), err: null }; }, function (e) { return { map: null, err: (e && e.code) || 'NETWORK' }; });
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
    var b = $('vtOpen'); if (b) b.textContent = d.abbr + ' ▾';
  }
  function setCredit(id) {
    var c = $('vtCredit'); if (!c) return;
    var h = id ? creditHtml(id) : '';
    c.innerHTML = h; c.hidden = !h;
  }
  function afterRender(slug, chap) {
    ctx.slug = slug; ctx.chap = chap;
    var id = have(cur) ? cur : 'bsb';
    setTag(id);
    var note = $('vtNote'); if (note) note.hidden = true;
    setCredit(null);
    if (id === 'bsb') {      // coming back from another version: put the BSB text (with the red letters) back
      var bx = $('verseList');
      if (bx && window.paintBsbVerse) bx.querySelectorAll('.verse[data-ver]').forEach(function (p) { window.paintBsbVerse(p); });
      return;
    }
    chapter(id, slug, chap).then(function (r) {
      if (ctx.slug !== slug || ctx.chap !== chap) return;      // moved on
      var box = $('verseList'); if (!box) return;
      if (!r.map) { if (note) { note.textContent = why(id, r.err, slug); note.hidden = false; } return; }
      box.querySelectorAll('.verse').forEach(function (p) {
        var n = p.dataset.verse, t = r.map[n];
        if (t != null && window.setVerseText) window.setVerseText(p, t, id);
        else { if (window.paintBsbVerse) window.paintBsbVerse(p); p.classList.add('vt-missing'); }
      });
      setCredit(id);      // the publisher's credit line goes at the END of the chapter, not at the top
    });
  }
  function choose(id) {
    if (!have(id)) return;
    cur = id;
    try { localStorage.setItem(LS, id); } catch (e) {}
    setTag(id);
    if (ctx.slug) afterRender(ctx.slug, ctx.chap);
  }

  // ---------- verse sheet: the version dropdown, the verse in that version, and the Compare Translations block ----------
  var licOn = {};                  // licensed versions the reader chose to show in Compare this visit (each one is a request to the publisher)
  function quoted(t) { return /^["“]/.test(t) ? t : '"' + t + '"'; }
  function curId() { return have(cur) ? cur : 'bsb'; }
  function onSheet(slug, chap, num, bsbText) {
    sheetArgs = { slug: slug, chap: chap, num: num, bsb: bsbText };
    closeSheetMenu();
    drawSheet();
  }
  function textFor(id) {           // -> Promise { id, t (text or null), err }
    var a = sheetArgs;
    if (id === 'bsb') return Promise.resolve({ id: id, t: a.bsb, err: null });
    return chapter(id, a.slug, a.chap).then(function (r) { return { id: id, t: r && r.map ? (r.map[a.num] != null ? r.map[a.num] : null) : null, err: r && r.err }; });
  }
  function drawSheet() {
    var a = sheetArgs; if (!a) return;
    var tgt = $('sheetVerseText'); if (!tgt) return;
    var chips = $('vtChips'); if (chips) { chips.innerHTML = ''; chips.hidden = true; }
    var id = curId(), ab = $('sxVerAb'); if (ab) ab.textContent = def(id).abbr;
    var token = a.slug + a.chap + ':' + a.num + ':' + id;
    drawSheet.token = token;
    if (id === 'bsb') { if (window.rlHtml) tgt.innerHTML = window.rlHtml(a.slug, a.chap, a.num, a.bsb, true); else tgt.textContent = quoted(a.bsb); }
    else textFor(id).then(function (r) {
      if (drawSheet.token !== token) return;
      if (r.t != null && window.rlHtmlVer) tgt.innerHTML = window.rlHtmlVer(a.slug, a.chap, a.num, a.bsb, r.t, true);      // red letters carried over from the BSB
      else tgt.textContent = r.t != null ? quoted(r.t) : (r.err && r.err !== 'NOT_AVAILABLE' ? why(id, r.err, a.slug) : 'This verse is not in the ' + def(id).abbr + ' text.');
      var cr = r.t != null ? creditHtml(id) : '';
      if (cr) tgt.insertAdjacentHTML('beforeend', '<span class="vt-credit">' + cr + '</span>');
    });
    drawCompare();
  }

  // words that differ from the version being read are highlighted
  var WORD = /([A-Za-z0-9À-ɏ'’]+)/;
  function norm(w) { return w.toLowerCase().replace(/’/g, "'").replace(/^'+|'+$/g, ''); }
  function diffHtml(t, base) {
    return String(t).split(WORD).map(function (p, i) {
      if (i % 2 === 0) return esc(p);
      var k = norm(p); return !k || base[k] ? esc(p) : '<mark class="cp-d">' + esc(p) + '</mark>';
    }).join('').replace(/<\/mark>(\s+)<mark class="cp-d">/g, '$1');
  }
  function drawCompare() {
    var a = sheetArgs, body = $('cpBody'); if (!a || !body) return;
    var base = curId(), others = list.map(function (d) { return d.id; }).filter(function (x) { return x !== base; });
    var ids = [base].concat(others.filter(function (x) { return pd(def(x)) || licOn[x]; }), others.filter(function (x) { return !pd(def(x)) && !licOn[x]; }));   // public-domain texts first; licensed ones wait for a tap
    var token = a.slug + a.chap + ':' + a.num + ':' + base + ':' + Object.keys(licOn).join(',');
    drawCompare.token = token;
    Promise.all(ids.map(function (id) { return (!pd(def(id)) && id !== base && !licOn[id]) ? Promise.resolve({ id: id, skip: true }) : textFor(id); })).then(function (rows) {
      if (drawCompare.token !== token) return;
      var bs = {}; String(rows[0].t || '').split(WORD).forEach(function (p, i) { if (i % 2 === 1) bs[norm(p)] = 1; });
      var credits = [];
      var lead = ids.length > 1 ? '<p class="cp-note cp-lead">Highlighted words differ from the ' + esc(def(base).abbr) + '.</p>' : '';
      body.innerHTML = lead + rows.map(function (r, i) {
        var d = def(r.id), cell;
        if (r.skip) cell = '<button type="button" class="cp-load" data-id="' + esc(r.id) + '">Show ' + esc(d.abbr) + ' text</button>';
        else if (r.t == null) cell = r.err && r.err !== 'NOT_AVAILABLE' ? '<i>' + esc(why(r.id, r.err, a.slug)) + '</i>' : '<i>not in this version</i>';
        else { cell = i === 0 ? esc(r.t) : diffHtml(r.t, bs); var c = creditHtml(r.id); if (c) credits.push(c); }
        return '<div class="cp-row' + (i === 0 ? ' cur' : '') + '"><span class="cp-ab">' + esc(d.abbr) + '</span><span class="cp-tx">' + cell + '</span></div>';
      }).join('') + (credits.length ? '<p class="cp-note">' + credits.join(' ') + '</p>' : '');
    });
  }
  function wireCompare() {
    var body = $('cpBody'); if (!body || body._w) return; body._w = true;
    body.addEventListener('click', function (ev) { var b = ev.target.closest('.cp-load'); if (!b) return; licOn[b.dataset.id] = true; b.textContent = 'Loading…'; drawCompare(); });
  }

  // the dropdown on the controls line of the verse sheet
  function sheetMenuOpen() { var m = $('sxVerMenu'); return !!(m && !m.hidden); }
  function closeSheetMenu() { var m = $('sxVerMenu'), b = $('sxVerBtn'); if (m) m.hidden = true; if (b) b.setAttribute('aria-expanded', 'false'); }
  function toggleSheetMenu(ev) {
    if (ev) ev.stopPropagation();
    var m = $('sxVerMenu'), b = $('sxVerBtn'); if (!m) return;
    if (!m.hidden) { closeSheetMenu(); return; }
    var c = curId();
    m.innerHTML = list.map(function (d) { return '<button type="button" role="option" class="' + (d.id === c ? 'on' : '') + '" aria-selected="' + (d.id === c) + '" data-id="' + esc(d.id) + '"><b>' + esc(d.abbr) + '</b><span>' + esc(d.name) + '</span></button>'; }).join('');
    m.hidden = false; b.setAttribute('aria-expanded', 'true');
  }
  function wireSheetMenu() {
    var b = $('sxVerBtn'), m = $('sxVerMenu'); if (!b || !m || b._w) return; b._w = true;
    b.addEventListener('click', toggleSheetMenu);
    m.addEventListener('click', function (ev) { var o = ev.target.closest('button[data-id]'); if (!o) return; ev.stopPropagation(); closeSheetMenu(); choose(o.dataset.id); drawSheet(); });
    document.addEventListener('click', function (ev) { if (sheetMenuOpen() && !ev.target.closest('.sx-ver')) closeSheetMenu(); });
    document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape' && sheetMenuOpen()) { closeSheetMenu(); b.focus(); } });
  }

  // ---------- the version menu (top right of the Read screen): pick one and the chapter changes at once ----------
  function menuOpen() { var m = $('vtMenu'); return !!(m && !m.hidden); }
  function menuClose() { var m = $('vtMenu'), b = $('vtOpen'); if (m) m.hidden = true; if (b) b.setAttribute('aria-expanded', 'false'); }
  function drawMenu() {
    var m = $('vtMenu'); if (!m) return;
    var cur2 = have(cur) ? cur : 'bsb';
    m.innerHTML = list.map(function (d) {
      return '<button type="button" class="vt-opt' + (cur2 === d.id ? ' on' : '') + '" role="option" aria-selected="' + (cur2 === d.id) + '" data-id="' + d.id + '"><b>' + esc(d.abbr) + '</b><span>' + esc(d.name) + '</span><i>✓</i></button>';
    }).join('');
  }
  function toggleMenu(ev) {
    if (ev) ev.stopPropagation();
    var m = $('vtMenu'), b = $('vtOpen'); if (!m) return;
    if (!m.hidden) { menuClose(); return; }
    drawMenu(); m.hidden = false; b.setAttribute('aria-expanded', 'true');
  }
  function open() { toggleMenu(); }

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
        var ORDER = ['bsb', 'nkjv', 'niv', 'nlt', 'esv', 'kjv'];      // William's order; every other version follows in the registry's order
        var base = ORDER.map(function (id) { return ready.filter(function (t) { return t.id === id; })[0]; }).filter(Boolean)
          .concat(ready.filter(function (t) { return ORDER.indexOf(t.id) < 0; }));
        if (base.length) list = base;
        notReady = T.list().filter(function (t) { return !T.list({ ready: true }).some(function (r) { return r.id === t.id; }); }).map(function (t) { return t.abbr; });
      });
    };
    return (window.Translations ? Promise.resolve() : loadScript('translations.js')).then(go).catch(function () { T = null; list = FALLBACK.slice(); });
  }
  function mount() {
    wireSheetMenu(); wireCompare();
    var b = $('vtOpen'); if (b) b.onclick = toggleMenu;
    var m = $('vtMenu');
    if (m) m.addEventListener('click', function (ev) { var o = ev.target.closest('.vt-opt'); if (!o) return; choose(o.dataset.id); menuClose(); });
    document.addEventListener('click', function (ev) { if (menuOpen() && !ev.target.closest('.vt-menuwrap')) menuClose(); });
    document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape' && menuOpen()) { menuClose(); if (b) b.focus(); } });
    try { if (window.indexedDB) indexedDB.deleteDatabase('vi-local'); } catch (e) {}     // clears the old "add your own PDF" data from earlier versions of the app
    readyP = startList().then(function () { if (!have(cur)) cur = 'bsb'; setTag(cur); if (ctx.slug) afterRender(ctx.slug, ctx.chap); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();

  window.VT = { afterRender: afterRender, onSheet: onSheet, open: open, current: function () { return cur; }, choose: choose,
    // used by the Compare screen
    ready: function () { return readyP; }, list: function () { return list.slice(); }, def: def, chapter: chapter, why: why, credit: creditHtml };
})();
