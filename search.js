/* search.js — Search the New Testament (Read top bar magnifier, and More > Search).
 *
 * data/search.json (built by tools/build_search.py) holds every verse once: { b: [book slugs], v: [[bookIndex, chapter, verse, text], ...] }.
 * Everything is matched in the browser. Nothing you type leaves the device.
 *
 *   love one another        every word has to be in the verse (each word is matched from the start, so "bless" finds "blessed")
 *   "good shepherd"         quotes: that exact phrase
 *   John 3:16, jn 3, 1:1    a reference: shows a "Go to" row first
 * Filters: a Gospel, and "Jesus' words only" (matches that fall inside the red letters).
 */
(function () {
  'use strict';
  var NAMES = Bk.nameMap();
  var data = null, loading = null, prev = 'read', built = false, timer = 0, lastQ = '';
  var st = { book: 'all', jesus: false };
  var GROUPS = { '@gospels': ['the Gospels', ['matthew', 'mark', 'luke', 'john']], '@acts': ['Acts', ['acts']], '@letters': ['the Letters', null], '@rev': ['Revelation', ['revelation']] };
  function inScope(book) {
    if (st.book === 'all') return true;
    var g = GROUPS[st.book]; if (!g) return st.book === book;
    if (g[1]) return g[1].indexOf(book) >= 0;
    return ['matthew', 'mark', 'luke', 'john', 'acts', 'revelation'].indexOf(book) < 0;
  }
  var CAP = 150;
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  function load() {
    if (data) return Promise.resolve(data);
    if (!loading) loading = fetch('data/search.json').then(function (r) { if (!r.ok) throw 0; return r.json(); }).then(function (j) { data = j; return j; }).catch(function () { loading = null; return null; });
    return loading;
  }

  // ---------- reading the query ----------
  function parseQuery(q) {
    var phrases = [], rest = q.replace(/["\u201c\u201d]([^"\u201c\u201d]+)["\u201c\u201d]?/g, function (m, p) { p = p.trim(); if (p) phrases.push(p); return ' '; });
    var words = rest.split(/[^A-Za-z0-9\u00C0-\u024F'\u2019]+/).filter(function (w) { return w.length > 0 && w !== "'"; });
    return { phrases: phrases, words: words };
  }
  var APOS = "['\u2019]";
  function rx(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/['\u2019]/g, APOS); }
  function wordRx(w) { return new RegExp('(^|[^\\p{L}\\p{N}])(' + rx(w) + ')', 'giu'); }
  function phraseRx(p) {
    var parts = p.split(/[^A-Za-z0-9\u00C0-\u024F'\u2019]+/).filter(Boolean).map(rx);
    return new RegExp('(^|[^\\p{L}\\p{N}])(' + parts.join("[^\\p{L}\\p{N}'\u2019]+") + ')(?![\\p{L}\\p{N}])', 'giu');
  }
  function ranges(re, text) {
    var out = [], m; re.lastIndex = 0;
    while ((m = re.exec(text))) { var s = m.index + m[1].length; out.push([s, s + m[2].length]); if (m[0].length === 0) re.lastIndex++; }
    return out;
  }
  function inRed(sp, a, b) { if (!sp) return false; for (var i = 0; i < sp.length; i++) if (a >= sp[i][0] && b <= sp[i][1]) return true; return false; }

  // ---------- a reference typed in the box ----------
  function asRef(q) {
    var m = q.trim().toLowerCase().replace(/\./g, '').match(/^((?:[1-3]\s*)?[a-z]+)\s*(\d+)(?:\s*[: ]\s*(\d+))?$/), ab = Bk.abbr(), key = m ? m[1].replace(/\s+/g, '') : '';
    if (!m || !ab[key]) return null;
    return { book: ab[key], ch: +m[2], v: m[3] ? +m[3] : 1, hasV: !!m[3] };
  }
  function hasChapter(book, ch) { try { var b = manifest.books.find(function (x) { return x.slug === book; }); return !!(b && b.availableChapters.indexOf(ch) >= 0); } catch (e) { return false; } }

  // ---------- running a search ----------
  function run(q) {
    var out = $('seOut'), sum = $('seSum'); if (!out) return;
    q = q.trim(); lastQ = q;
    if (!q) { sum.textContent = ''; out.innerHTML = hint(); return; }
    var html = '', ref = asRef(q);
    if (ref && hasChapter(ref.book, ref.ch)) html += '<button type="button" class="se-go" data-b="' + ref.book + '" data-c="' + ref.ch + '" data-v="' + ref.v + '"><span>Go to</span> <b>' + NAMES[ref.book] + ' ' + ref.ch + (ref.hasV ? ':' + ref.v : '') + '</b><em>›</em></button>';
    var pq = parseQuery(q);
    var res = [];
    if (pq.words.length || pq.phrases.length) {
      var res0 = rxs(pq);
      var need = st.jesus ? Promise.all(Bk.slugs().map(function (b) { return loadRedLetter(b); })) : Promise.resolve();
      need.then(function () {
        if (q !== lastQ) return;
        var all = data.v, cnt = 0, per = {}; Bk.slugs().forEach(function (b) { per[b] = 0; });
        for (var i = 0; i < all.length; i++) {
          var r = all[i], book = data.b[r[0]];
          if (!inScope(book)) continue;
          var text = r[3], marks = [], ok = true, sp = st.jesus ? rlSpans(book, r[1], r[2]) : null;
          if (st.jesus && !sp) continue;
          for (var k = 0; k < res0.length && ok; k++) {
            var rg = ranges(res0[k], text);
            if (st.jesus) rg = rg.filter(function (x) { return inRed(sp, x[0], x[1]); });
            if (!rg.length) ok = false; else marks = marks.concat(rg);
          }
          if (!ok) continue;
          cnt++; per[book]++;
          if (res.length < CAP) res.push({ book: book, ch: r[1], v: r[2], text: text, marks: marks });
        }
        draw(html, res, cnt, per, pq);
      });
      return;
    }
    sum.textContent = ''; out.innerHTML = html || hint();
  }
  function rxs(pq) { return pq.phrases.map(phraseRx).concat(pq.words.map(wordRx)); }
  function hint() {
    return '<div class="se-hint"><p>Search every verse of ' + Bk.names().join(', ').replace(/, ([^,]+)$/, ' and $1') + '.</p><ul>' +
      '<li><b>love one another</b> every word has to be in the verse</li>' +
      '<li><b>"good shepherd"</b> in quotes finds that exact phrase</li>' +
      '<li><b>John 3:16</b> or <b>jn 3</b> jumps straight to a passage</li></ul>' +
      '<p>Turn on <b>Jesus\u2019 words only</b> to search just the red letters.</p></div>';
  }
  function mark(text, marks, sp) {
    var cut = {}; function add(i) { cut[i] = 1; }
    add(0); add(text.length);
    marks.forEach(function (m) { add(m[0]); add(m[1]); });
    (sp || []).forEach(function (m) { add(m[0]); add(m[1]); });
    var pts = Object.keys(cut).map(Number).sort(function (a, b) { return a - b; }), out = '';
    for (var i = 0; i < pts.length - 1; i++) {
      var a = pts[i], b = pts[i + 1], seg = esc(text.slice(a, b));
      var hit = marks.some(function (m) { return a >= m[0] && b <= m[1]; });
      var red = (sp || []).some(function (m) { return a >= m[0] && b <= m[1]; });
      if (hit) seg = '<mark>' + seg + '</mark>';
      if (red) seg = '<span class="wj">' + seg + '</span>';
      out += seg;
    }
    return out;
  }
  function draw(pre, res, cnt, per, pq) {
    var out = $('seOut'), sum = $('seSum'), h = pre;
    var parts = []; Object.keys(per).forEach(function (b) { if (per[b]) parts.push(NAMES[b] + ' ' + per[b]); });
    sum.textContent = cnt ? cnt + (cnt === 1 ? ' verse' : ' verses') + (st.book === 'all' && parts.length > 1 ? ' \u00b7 ' + parts.join(' \u00b7 ') : '') + (cnt > CAP ? ' \u00b7 showing the first ' + CAP : '') : '';
    if (!cnt) h += '<p class="se-none">No verses found' + (st.jesus ? ' in the red letters' : '') + (st.book !== 'all' ? ' in ' + (GROUPS[st.book] ? GROUPS[st.book][0] : NAMES[st.book]) : '') + '. Try fewer or shorter words' + (st.jesus || st.book !== 'all' ? ', or loosen a filter' : '') + '.</p>';
    res.forEach(function (r) {
      var sp = rlSpans(r.book, r.ch, r.v);
      h += '<button type="button" class="se-r" data-b="' + r.book + '" data-c="' + r.ch + '" data-v="' + r.v + '"><span class="se-ref">' + NAMES[r.book] + ' ' + r.ch + ':' + r.v + '</span><span class="se-tx">' + mark(r.text, r.marks, sp) + '</span></button>';
    });
    out.innerHTML = h;
  }

  // ---------- the screen ----------
  function build() {
    if (built) return; built = true;
    var w = $('seBody'); if (!w) return;
    w.innerHTML =
      '<div class="se-box"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/></svg>' +
      '<input id="seQ" type="search" inputmode="search" enterkeyhint="search" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" placeholder="Search the New Testament" aria-label="Search the New Testament">' +
      '<button type="button" id="seClr" class="se-clr" aria-label="Clear" hidden>\u00d7</button></div>' +
      '<div class="se-filt" id="seFilt"><button type="button" data-f="all" class="on">All</button><button type="button" data-f="@gospels">Gospels</button><button type="button" data-f="@acts">Acts</button><button type="button" data-f="@letters">Letters</button><button type="button" data-f="@rev">Revelation</button>' + Bk.slugs().filter(function (b) { return b !== 'acts' && b !== 'revelation'; }).map(function (b) { return '<button type="button" data-f="' + b + '">' + Bk.name(b) + '</button>'; }).join('') + '</div>' +
      '<button type="button" class="se-red" id="seRed" aria-pressed="false"><i></i><span>Jesus\u2019 words only</span></button>' +
      '<p class="se-sum" id="seSum" aria-live="polite"></p><div id="seOut"></div>';
    var q = $('seQ');
    q.addEventListener('input', function () { $('seClr').hidden = !q.value; clearTimeout(timer); timer = setTimeout(go, 160); });
    q.addEventListener('keydown', function (e) { if (e.key === 'Enter') { clearTimeout(timer); go(); q.blur(); } });
    $('seClr').addEventListener('click', function () { q.value = ''; $('seClr').hidden = true; go(); q.focus(); });
    $('seFilt').addEventListener('click', function (e) {
      var b = e.target.closest('button[data-f]'); if (!b) return;
      st.book = b.dataset.f; Array.prototype.forEach.call($('seFilt').children, function (x) { x.classList.toggle('on', x === b); }); go();
    });
    $('seRed').addEventListener('click', function () { st.jesus = !st.jesus; this.classList.toggle('on', st.jesus); this.setAttribute('aria-pressed', st.jesus); go(); });
    $('seOut').addEventListener('click', function (e) {
      var b = e.target.closest('button[data-b]'); if (!b) return;
      var bk = b.dataset.b, c = +b.dataset.c, v = +b.dataset.v;
      try { window.__seFrom = true; } catch (x) {}
      openPassage(bk, c, v, false);
    });
  }
  function go() { var q = $('seQ'); if (!q) return; load().then(function (d) { if (!d) { $('seOut').innerHTML = '<p class="se-none">The search index could not load. Check your connection and try again.</p>'; return; } run(q.value); }); }

  window.Search = {
    // opens the screen from anywhere; the back button returns to where it was opened from
    open: function () {
      var cur = null; try { cur = currentScreen; } catch (e) {}
      if (cur && cur !== 'search') prev = cur;
      goToScreen('search');
    },
    render: function () {
      build(); load();
      var b = $('seBack'), bk = { to: 'read', label: 'Read' };
      try { var hb = Home.back('search', bk); bk = hb; } catch (e) {}
      if (b) { b.dataset.screen = bk.to === 'booknav' ? 'read' : bk.to; b.textContent = '\u2039 ' + bk.label; }
      var q = $('seQ'); if (q && !q.value) setTimeout(function () { try { q.focus(); } catch (e) {} }, 60);
      if (q && q.value) go();
    }
  };
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-search]'); if (b) { e.preventDefault(); Search.open(); }
  });
})();
