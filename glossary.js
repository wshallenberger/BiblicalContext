/* Study > Glossary: a library of the Gospel world.
 *   home    a bookshelf (one book per subject), a search field and an A-Z index button
 *   shelf   one book: filter, group chips, letter bar, the entries
 *   entry   one entry: text, facts, where it appears, related entries, map / Deep Dive / Commentary
 *   az      every entry in the glossary, alphabetical
 * Data: data/glossary.json  { s: [shelves], e: [entries] }  (built by tools/build_glossary.py)
 *   Gl.render()  Gl.home()  Gl.open(id)
 */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  var DATA = null, loadP = null, BY = {}, SH = {}, LIST = {}, SORT = {};
  var st = { view: 'home', shelf: '', grp: '', q: '', f: '', id: '' };   // current page
  var stack = [];                                                       // pages to go back to
  var SPINE = { greek: 'Greek', names: 'Names', archaeology: 'Archaeology' };

  // ---------- data ----------
  function fold(s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }
  function sortKey(e) { return fold(e.n).replace(/^(the|a|an) /, '').replace(/^[^a-z0-9]+/, ''); }
  function letter(e) { var c = sortKey(e).charAt(0).toUpperCase(); return /[A-Z]/.test(c) ? c : '#'; }
  function load() {
    if (loadP) return loadP;
    loadP = fetch('data/glossary.json').then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }).then(function (d) {
      if (!d) { loadP = null; return null; }
      DATA = d;
      d.s.forEach(function (s) { SH[s.k] = s; });
      d.e.forEach(function (e) { BY[e.i] = e; });
      addVoices();
      d.s.forEach(function (s) { LIST[s.k] = []; });
      d.e.forEach(function (e) { e._k = sortKey(e); e._ix = fold(e.n + ' ' + (e.a || []).join(' ')); e._tx = fold((e.t || []).join(' ')); LIST[e.s].push(e); });
      d.s.forEach(function (s) {
        if (s.k === 'events') return;                      // the events stay in the order they happened
        LIST[s.k].sort(function (a, b) { return a._k < b._k ? -1 : a._k > b._k ? 1 : 0; });
      });
      return d;
    });
    return loadP;
  }
  // the commentary voices are taken from the Commentary library itself
  function addVoices() {
    var vs = []; try { vs = Cm.voices(); } catch (e) {}
    var sh = SH.commentary; if (!sh) return;
    vs.forEach(function (v) {
      var id = 'voice-' + v.k; if (BY[id]) return;
      var rel = []; ['commentary', 'church-fathers', 'catena-aurea'].forEach(function (k) { if (BY[k] && (k === 'commentary' || v.k === 'early')) rel.push(k); });
      var e = { i: id, s: 'commentary', n: v.n, u: v.r, t: [v.bio], g: 'Voices', l: rel, v: v.k };
      DATA.e.push(e); BY[id] = e;
    });
    if (sh.g.indexOf('Voices') < 0) sh.g.unshift('Voices');
  }

  // ---------- helpers ----------
  function snippet(e, n) {
    var t = (e.t && e.t[0]) || e.u || ''; n = n || 110;
    if (t.length <= n) return t;
    var cut = t.slice(0, n), i = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf(', '), cut.lastIndexOf(' '));
    return cut.slice(0, i > 40 ? i : n).replace(/[,;:\s]+$/, '') + '…';
  }
  function kstyle(shelf) { var s = SH[shelf]; return s ? ' style="--k:' + s.c + '"' : ''; }
  function parseRef(r) { return Bk.parse(r); }
  function chLabel(k) { var p = k.split(':'); return Bk.name(p[0]) + ' ' + p[1]; }
  function firstChapter(e) {
    var i, p;
    for (i = 0; i < (e.r || []).length; i++) { p = parseRef(e.r[i]); if (p) return p; }
    if (e.c && e.c.length) { var q = e.c[0].split(':'); return { b: q[0], c: Number(q[1]), v: 0 }; }
    return null;
  }
  function top() { var w = $('glWrap'); if (w) { w.scrollTop = 0; } }
  function here() { var w = $('glWrap'); return { v: st.view, shelf: st.shelf, grp: st.grp, q: st.q, f: st.f, id: st.id, y: w ? w.scrollTop : 0 }; }
  function labelOf(s) {
    if (s.v === 'origin') return s.label;
    if (s.v === 'home') return 'Glossary';
    if (s.v === 'shelf') return (SH[s.shelf] || {}).n || 'Glossary';
    if (s.v === 'az') return 'A–Z';
    if (s.v === 'entry') { var e = BY[s.id]; return e ? (e.n.length > 22 ? e.n.slice(0, 21) + '…' : e.n) : 'Back'; }
    return 'Glossary';
  }
  function go(next) {          // go forward to a new page, remembering this one
    stack.push(here());
    st = { view: next.view, shelf: next.shelf || '', grp: next.grp || '', q: '', f: '', id: next.id || '' };
    render(); top();
  }
  function back() {
    var p = stack.pop(); if (!p) { st = { view: 'home', shelf: '', grp: '', q: '', f: '', id: '' }; render(); top(); return; }
    if (p.v === 'origin') { st = { view: 'home', shelf: '', grp: '', q: '', f: '', id: '' }; try { p.fn(); } catch (x) { goToScreen('glossary'); } return; }
    st = { view: p.v, shelf: p.shelf, grp: p.grp, q: p.q, f: p.f, id: p.id };
    render(); var w = $('glWrap'); if (w) { w.scrollTop = p.y; requestAnimationFrame(function () { w.scrollTop = p.y; }); }
  }
  function backBtn() {
    var p = stack[stack.length - 1];
    return '<button type="button" class="mu-back gl-back" data-gl="back">‹ ' + esc(p ? labelOf(p) : 'Glossary') + '</button>';
  }

  // ---------- landing: the bookshelf ----------
  var OFFS = [[0, 6], [5, 0], [2, 3], [6, 1], [0, 5], [4, 2], [1, 6], [5, 0], [0, 4]];     // small left/right nudges so each pile looks hand-stacked
  function stackCount() { return 2; }     // always two piles, however wide the window is
  function shelfHtml() {
    var cols = stackCount(), list = DATA.s, per = Math.ceil(list.length / cols), out = '<div class="gl-stacks" data-cols="' + cols + '">';
    for (var c = 0; c < cols; c++) {
      var books = list.slice(c * per, (c + 1) * per); if (!books.length) continue;
      out += '<div class="gl-stack">';
      books.forEach(function (s, i) {
        var lab = SPINE[s.k] || s.n, o = OFFS[(i + c * 3) % OFFS.length];
        out += '<button type="button" class="gl-book' + (lab.length > 10 ? ' long' : '') + '" data-gl="shelf" data-k="' + s.k + '" style="--bk:' + s.c + ';--ml:' + o[0] + 'px;--mr:' + o[1] + 'px" aria-label="' + esc(s.n) + ', ' + LIST[s.k].length + ' entries"><span class="gl-bt">' + esc(lab) + '</span><span class="gl-bn">' + LIST[s.k].length + '</span></button>';
      });
      out += '<div class="gl-plank"></div></div>';
    }
    return out + '</div>';
  }
  var TRY = ['sin', 'passover', 'pharisees', 'the-sower', 'agape', 'love'];
  function renderHome() {
    var total = DATA.e.length;
    var h = '<p class="cmx-kick">Study</p><h2 class="cmx-h lead">Glossary</h2><p class="gl-sub">' + total.toLocaleString() + ' entries about the people, places, teachings and words of the Gospels, Acts, Romans, 1 Corinthians, 2 Corinthians, Galatians, Ephesians, Philippians, Colossians, the Thessalonian letters, the Timothy letters, Titus, Philemon, Hebrews, James, 1 Peter, 2 Peter, 1 John, 2 John, 3 John, Jude and Revelation. Pick a book from the shelf, search, or browse A–Z.</p>' +
      '<div class="gl-bar"><label class="gl-search"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/></svg><input id="glQ" type="search" placeholder="Search the glossary" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Search the glossary" value="' + esc(st.q) + '"></label>' +
      '<button type="button" class="gl-az" data-gl="az">A–Z</button></div><div id="glBody"></div>';
    $('glMain').innerHTML = h;
    paintBody();
  }
  function paintBody() {
    var b = $('glBody'); if (!b) return;
    var q = st.q.trim();
    if (q.length < 1) {
      var tries = TRY.filter(function (k) { return BY[k]; });
      b.innerHTML = '<div class="gl-shelf" role="list">' + shelfHtml() + '</div>' +
        (tries.length ? '<p class="gl-try">Try <span>' + tries.map(function (k) { return '<button type="button" data-gl="entry" data-id="' + k + '">' + esc(BY[k].n) + '</button>'; }).join('') + '</span></p>' : '');
      return;
    }
    var res = search(q);
    if (!res.length) { b.innerHTML = '<p class="gl-none">Nothing found for “' + esc(q) + '”. Try a shorter word, or browse a book.</p>'; return; }
    b.innerHTML = '<p class="gl-count">' + (res.length >= 80 ? 'Top 80 matches' : res.length + (res.length === 1 ? ' match' : ' matches')) + '</p><div class="gl-list">' + res.map(function (e) { return itemHtml(e, true); }).join('') + '</div>';
  }
  function search(q) {
    var s = fold(q).trim(), words = s.split(/\s+/).filter(Boolean), out = [];
    DATA.e.forEach(function (e) {
      var nm = fold(e.n), score = 99;
      if (nm === s) score = 0;
      else if (nm.indexOf(s) === 0 || nm.replace(/^(the|a) /, '').indexOf(s) === 0) score = 1;
      else if (nm.indexOf(' ' + s) >= 0) score = 2;
      else if (nm.indexOf(s) >= 0) score = 3;
      else if (e._ix.indexOf(s) >= 0) score = 4;
      else if (words.length > 1 && words.every(function (w) { return e._ix.indexOf(w) >= 0 || e._tx.indexOf(w) >= 0; })) score = 6;
      else if (s.length > 2 && e._tx.indexOf(s) >= 0) score = 7;
      if (score < 99) out.push([score, e]);
    });
    out.sort(function (a, b) { return a[0] - b[0] || (a[1]._k < b[1]._k ? -1 : 1); });
    return out.slice(0, 80).map(function (x) { return x[1]; });
  }
  function itemHtml(e, showShelf) {
    var sh = SH[e.s] || {};
    return '<button type="button" class="gl-item" data-gl="entry" data-id="' + esc(e.i) + '"' + kstyle(e.s) + '><span class="gl-it"><b>' + esc(e.n) + '</b>' +
      (showShelf ? '<em>' + esc(sh.n || '') + '</em>' : '') + '<span class="gl-is">' + esc(e.u ? e.u : snippet(e, 96)) + '</span></span><i aria-hidden="true">›</i></button>';
  }

  // ---------- one book ----------
  function renderShelf() {
    var s = SH[st.shelf]; if (!s) { st.view = 'home'; return renderHome(); }
    var all = LIST[s.k], alpha = s.k !== 'events';
    var h = backBtn() + '<div class="gl-cover" style="--bk:' + s.c + '"><span class="gl-cv-k">Glossary book</span><h2>' + esc(s.n) + '</h2><p>' + esc(s.b) + '</p><span class="gl-cv-n">' + all.length + ' entries</span></div>';
    h += '<div class="gl-bar"><label class="gl-search"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/></svg><input id="glF" type="search" placeholder="Filter this book" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Filter this book" value="' + esc(st.f) + '"></label></div>';
    if (s.g.length > 1) {
      h += '<div class="gl-chips" role="tablist" aria-label="Groups">' + chip('', 'All', !st.grp) + s.g.map(function (g) { return chip(g, g, st.grp === g); }).join('') + '</div>';
    }
    h += '<div id="glBody"' + kstyle(s.k) + '></div>';
    $('glMain').innerHTML = h;
    paintShelf();
  }
  function chip(g, label, on) { return '<button type="button" class="gl-chip' + (on ? ' on' : '') + '" data-gl="grp" data-g="' + esc(g) + '" role="tab" aria-selected="' + (on ? 'true' : 'false') + '">' + esc(label) + '</button>'; }
  function paintShelf() {
    var s = SH[st.shelf], b = $('glBody'); if (!s || !b) return;
    var f = fold(st.f).trim(), list = LIST[s.k].filter(function (e) {
      if (st.grp && e.g !== st.grp) return false;
      return !f || e._ix.indexOf(f) >= 0 || e._tx.indexOf(f) >= 0;
    });
    if (!list.length) { b.innerHTML = '<p class="gl-none">Nothing matches.</p>'; return; }
    b.innerHTML = listHtml(list, s.k !== 'events' && list.length > 24, false);
  }
  function listHtml(list, lettered, showShelf) {
    if (!lettered) return '<div class="gl-list">' + list.map(function (e) { return itemHtml(e, showShelf); }).join('') + '</div>';
    var groups = {}, order = [];
    list.forEach(function (e) { var L = letter(e); if (!groups[L]) { groups[L] = []; order.push(L); } groups[L].push(e); });
    order.sort(function (a, b) { return a === '#' ? 1 : b === '#' ? -1 : a < b ? -1 : 1; });
    var bar = '<div class="gl-letters" role="navigation" aria-label="Jump to letter">' + order.map(function (L) { return '<button type="button" data-gl="jump" data-l="' + L + '">' + L + '</button>'; }).join('') + '</div>';
    return bar + order.map(function (L) {
      return '<section class="gl-lt" id="gl-L' + (L === '#' ? 'x' : L) + '"><h3>' + L + '</h3><div class="gl-list">' + groups[L].map(function (e) { return itemHtml(e, showShelf); }).join('') + '</div></section>';
    }).join('');
  }

  // ---------- A-Z ----------
  function renderAz() {
    var h = backBtn() + '<p class="cmx-kick">Glossary</p><h2 class="cmx-h sm">A–Z index</h2><p class="gl-sub">Every entry in the glossary, in alphabetical order.</p>' +
      '<div class="gl-bar"><label class="gl-search"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/></svg><input id="glF" type="search" placeholder="Filter the list" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Filter the list" value="' + esc(st.f) + '"></label></div><div id="glBody"></div>';
    $('glMain').innerHTML = h; paintAz();
  }
  function paintAz() {
    var b = $('glBody'); if (!b) return;
    var f = fold(st.f).trim(), list = DATA.e.slice().sort(function (a, c) { return a._k < c._k ? -1 : a._k > c._k ? 1 : 0; }).filter(function (e) { return !f || e._ix.indexOf(f) >= 0; });
    if (!list.length) { b.innerHTML = '<p class="gl-none">Nothing matches.</p>'; return; }
    b.innerHTML = '<p class="gl-count">' + list.length.toLocaleString() + ' entries</p>' + listHtml(list, true, true);
  }

  // ---------- one entry ----------
  var REFMAX = 9;                     // the first few verses show; the rest sit behind "+N more" so the block stays small
  function refChips(e) {
    var out = '', n = 0;
    (e.r || []).forEach(function (r) {
      var p = parseRef(r), x = n++ >= REFMAX ? ' gl-x' : '';
      if (p) out += '<button type="button" class="gl-ref' + x + '" data-gl="verse" data-b="' + p.b + '" data-c="' + p.c + '" data-v="' + p.v + '">' + esc(r) + '</button>';
      else out += '<span class="gl-ref ot' + x + '">' + esc(r) + '</span>';
    });
    return out + (n > REFMAX ? '<button type="button" class="gl-ref gl-more" data-gl="refsmore">+' + (n - REFMAX) + ' more</button>' : '');
  }
  function chapChips(e) {
    var n = 0, out = e.c.map(function (k) { var p = k.split(':'), x = n++ >= REFMAX ? ' gl-x' : ''; return '<button type="button" class="gl-ref' + x + '" data-gl="verse" data-b="' + p[0] + '" data-c="' + p[1] + '" data-v="0">' + esc(chLabel(k)) + '</button>'; }).join('');
    return out + (n > REFMAX ? '<button type="button" class="gl-ref gl-more" data-gl="refsmore">+' + (n - REFMAX) + ' more</button>' : '');
  }
  function renderEntry() {
    var e = BY[st.id]; if (!e) { st.view = 'home'; return renderHome(); }
    var s = SH[e.s] || {}, h = backBtn();
    h += '<article class="gl-entry"' + kstyle(e.s) + '><p class="gl-kick"><button type="button" data-gl="shelf" data-k="' + e.s + '">' + esc(s.n) + '</button>' + (e.g ? ' <span>· ' + esc(e.g) + '</span>' : '') + '</p>' +
      '<h2 class="gl-h">' + esc(e.n) + '</h2>' + (e.u ? '<p class="gl-u">' + esc(e.u) + '</p>' : '');
    if (e.a && e.a.length) h += '<p class="gl-al">Also: ' + e.a.map(esc).join(' · ') + '</p>';
    // the definition comes first; the small "Where it appears" block and the buttons sit under it
    var body = '<div class="gl-body">';
    (e.t || []).forEach(function (p) { body += '<p class="gl-p">' + esc(p) + '</p>'; });
    if (e.f && e.f.length) body += '<dl class="gl-facts">' + e.f.map(function (x) { return '<div><dt>' + esc(x[0]) + '</dt><dd>' + esc(x[1]) + '</dd></div>'; }).join('') + '</dl>';
    body += '</div>';
    var meta = '<div class="gl-meta">';
    if (e.r && e.r.length) meta += '<h3 class="gl-sec first">Where it appears</h3><div class="gl-refs">' + refChips(e) + '</div>';
    else if (e.c && e.c.length) meta += '<h3 class="gl-sec first">Appears in</h3><div class="gl-refs">' + chapChips(e) + '</div>';
    var fc = firstChapter(e), acts = '';
    if (e.la != null) acts += '<button type="button" class="gl-act" data-gl="map" data-la="' + e.la + '" data-ln="' + e.ln + '" data-name="' + esc(e.n) + '">Show on the map</button>';
    if (fc) {
      acts += '<button type="button" class="gl-act" data-gl="deep" data-b="' + fc.b + '" data-c="' + fc.c + '">Deep Dive: ' + Bk.name(fc.b) + ' ' + fc.c + '</button>';
      acts += '<button type="button" class="gl-act" data-gl="cm" data-b="' + fc.b + '" data-c="' + fc.c + '">Commentary: ' + Bk.name(fc.b) + ' ' + fc.c + '</button>';
    }
    if (e.v) acts += '<button type="button" class="gl-act" data-gl="voice" data-k="' + e.v + '">Read this voice in Commentary</button>';
    if (acts) meta += '<div class="gl-acts">' + acts + '</div>';
    meta += '</div>';
    h += body + meta;
    var rel = (e.l || []).map(function (i) { return BY[i]; }).filter(Boolean);
    if (rel.length) h += '<h3 class="gl-sec">Related</h3><div class="gl-rel">' + rel.map(function (x) {
      return '<button type="button" class="gl-rc" data-gl="entry" data-id="' + esc(x.i) + '"' + kstyle(x.s) + '><i></i><b>' + esc(x.n) + '</b><em>' + esc((SH[x.s] || {}).n || '') + '</em></button>';
    }).join('') + '</div>';
    h += '<div class="gl-foot"><button type="button" class="gl-act alt" data-gl="shelf" data-k="' + e.s + '">More in ' + esc(s.n) + '</button>' +
      (e.g ? '<button type="button" class="gl-act alt" data-gl="shelfgrp" data-k="' + e.s + '" data-g="' + esc(e.g) + '">More: ' + esc(e.g) + '</button>' : '') + '</div></article>';
    $('glMain').innerHTML = h;
  }

  // ---------- render ----------
  function render() {
    var main = $('glMain'); if (!main) return;
    main.innerHTML = '';
    if (!DATA) {
      main.innerHTML = '<p class="cmx-kick">Study</p><h2 class="cmx-h lead">Glossary</h2><p class="gl-sub">Opening the shelf…</p>';
      var want = st;
      load().then(function (d) {
        if (!d) { main.innerHTML = '<p class="cmx-kick">Study</p><h2 class="cmx-h lead">Glossary</h2><p class="gl-none">The glossary could not be loaded. Check your connection and open it again.</p>'; return; }
        if (st === want) render();
      });
      return;
    }
    if (st.view === 'shelf') renderShelf();
    else if (st.view === 'entry') renderEntry();
    else if (st.view === 'az') renderAz();
    else renderHome();
  }
  function home() { stack = []; st = { view: 'home', shelf: '', grp: '', q: '', f: '', id: '' }; }
  function open(id, from) {          // from: { label, fn } when the entry is opened from another page, so Back returns there
    stack = []; home();
    var show = function () { if (BY[id]) { stack = [from && from.fn ? { v: 'origin', label: from.label, fn: from.fn } : here()]; st = { view: 'entry', shelf: '', grp: '', q: '', f: '', id: id }; } goToScreen('glossary'); };
    load().then(show);
  }

  // ---------- the Deep Dive "Glossary" tab: everything in the glossary that belongs to this chapter ----------
  var CHIDX = null, dgMore = {}, DG_CAP = 6, DG_SKIP = { commentary: 1, translations: 1 };
  function chapterIndex() {
    if (CHIDX) return CHIDX;
    CHIDX = {};
    DATA.e.forEach(function (e) {
      if (DG_SKIP[e.s]) return;
      var seen = {};
      (e.c || []).forEach(function (k) { seen[k] = 1; });
      (e.r || []).forEach(function (r) { var p = Bk.parse(r); if (p) seen[p.b + ':' + p.c] = 1; });
      Object.keys(seen).forEach(function (k) { (CHIDX[k] || (CHIDX[k] = [])).push(e); });
    });
    return CHIDX;
  }
  function chapterNow() { try { return { b: currentBook, c: currentChapterNum }; } catch (e) { return { b: '', c: 0 }; } }
  function tabHtml() {
    var ch = chapterNow(), mine = chapterIndex()[ch.b + ':' + ch.c] || [], by = {};
    mine.forEach(function (e) { (by[e.s] || (by[e.s] = [])).push(e); });
    var shelves = DATA.s.filter(function (s) { return by[s.k]; }).sort(function (a, b) { return (a.k === 'greek') - (b.k === 'greek'); });      // the many Greek words go last
    var h = '<p class="panel-eyebrow">GLOSSARY</p>';
    if (!shelves.length) return h + '<div class="tpl-card"><p class="panel-text dim" style="margin:0;">Nothing in the Glossary is tied to this chapter yet.</p></div><button type="button" class="dg-open" data-dg="home">Open the Glossary</button>';
    var bits = shelves.map(function (s) { return by[s.k].length + ' ' + s.n.toLowerCase(); });
    h += '<p class="lib-intro">In ' + esc(Bk.name(ch.b)) + ' ' + ch.c + ': ' + bits.slice(0, 6).join(', ') + (bits.length > 6 ? ' and more' : '') + '. Tap any card to open it in the Glossary.</p>';
    shelves.forEach(function (s) {
      var list = LIST[s.k].filter(function (e) { return by[s.k].indexOf(e) >= 0; }), all = !!dgMore[s.k] || list.length <= DG_CAP + 1, shown = all ? list : list.slice(0, DG_CAP);
      h += '<section class="dg-sec"' + kstyle(s.k) + '><h3 class="dg-h"><i></i>' + esc(s.n) + '<span>' + list.length + '</span></h3><div class="gl-list">' + shown.map(function (e) {
        return '<button type="button" class="gl-item" data-dg="entry" data-id="' + esc(e.i) + '"' + kstyle(e.s) + '><span class="gl-it"><b>' + esc(e.n) + '</b><span class="gl-is">' + esc(e.u ? e.u : snippet(e, 96)) + '</span></span><i aria-hidden="true">›</i></button>';
      }).join('') + '</div>' + (all ? '' : '<button type="button" class="dg-more" data-dg="more" data-k="' + s.k + '">Show all ' + list.length + '</button>') + '</section>';
    });
    return h + '<button type="button" class="dg-open" data-dg="home">Open the Glossary</button>';
  }
  function fillTab(panel) {          // returns a promise that rejects if the glossary cannot be loaded
    return load().then(function (d) { if (!d) throw new Error('glossary'); panel.innerHTML = tabHtml(); });
  }
  function fromDeepDive() { var ch = chapterNow(); return { label: 'Deep Dive', fn: function () { openChapterTab(ch.b, ch.c, 'people'); } }; }
  document.addEventListener('click', function (ev) {
    var b = ev.target && ev.target.closest ? ev.target.closest('[data-dg]') : null; if (!b) return;
    var a = b.dataset.dg;
    if (a === 'entry') open(b.dataset.id, fromDeepDive());
    else if (a === 'home') { load().then(function () { stack = [{ v: 'origin', label: 'Deep Dive', fn: fromDeepDive().fn }]; st = { view: 'home', shelf: '', grp: '', q: '', f: '', id: '' }; goToScreen('glossary'); }); }
    else if (a === 'more') { dgMore[b.dataset.k] = 1; var p = document.querySelector('[data-panel="people"]'); if (p) { var y = p.scrollTop; p.innerHTML = tabHtml(); } }
  });

  // ---------- events ----------
  document.addEventListener('input', function (ev) {
    var t = ev.target; if (!t || !t.id) return;
    if (t.id === 'glQ') { st.q = t.value; paintBody(); }
    else if (t.id === 'glF') { st.f = t.value; if (st.view === 'az') paintAz(); else paintShelf(); }
  });
  document.addEventListener('click', function (ev) {
    var b = ev.target && ev.target.closest ? ev.target.closest('#screen-glossary [data-gl]') : null; if (!b) return;
    var a = b.dataset.gl;
    if (a === 'back') back();
    else if (a === 'refsmore') { var rf = b.closest('.gl-refs'); if (rf) rf.classList.add('all'); b.remove(); }
    else if (a === 'shelf') go({ view: 'shelf', shelf: b.dataset.k });
    else if (a === 'shelfgrp') go({ view: 'shelf', shelf: b.dataset.k, grp: b.dataset.g });
    else if (a === 'entry') go({ view: 'entry', id: b.dataset.id });
    else if (a === 'az') go({ view: 'az' });
    else if (a === 'grp') { st.grp = b.dataset.g; Array.prototype.forEach.call(document.querySelectorAll('.gl-chip'), function (c) { var on = c.dataset.g === st.grp; c.classList.toggle('on', on); c.setAttribute('aria-selected', on ? 'true' : 'false'); }); paintShelf(); }
    else if (a === 'jump') { var el = $('gl-L' + (b.dataset.l === '#' ? 'x' : b.dataset.l)); if (el) el.scrollIntoView({ block: 'start' }); }
    else if (a === 'verse') { try { openPassage(b.dataset.b, Number(b.dataset.c), Number(b.dataset.v), false); } catch (x) {} }
    else if (a === 'deep') { try { openPassage(b.dataset.b, Number(b.dataset.c), 0, true); } catch (x) {} }
    else if (a === 'cm') { try { Cm.open(b.dataset.b, Number(b.dataset.c)); } catch (x) { goToScreen('commentary'); } }
    else if (a === 'map') { try { focusMapAt(Number(b.dataset.la), Number(b.dataset.ln), b.dataset.name || '', 13); } catch (x) { goToScreen('map'); } }
    else if (a === 'voice') { try { Cm.openVoice(b.dataset.k); } catch (x) { goToScreen('commentary'); } }
  });

  window.Gl = { render: render, home: home, open: open, fillTab: fillTab };
})();
