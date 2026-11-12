/* Round 88: one drop-down for choosing a book and a chapter, used everywhere a passage is picked.
   Type to search ("gal", "1 cor", "john 3"), tap a book to see its chapters in the same panel, tap a chapter to go.
   BCPick.open({ anchor, slug, chapter, onPick(slug, chapter), onClose }) ; BCPick.close() ; BCPick.label(slug, chapter) */
(function () {
  'use strict';
  var GOSPELS = { matthew: 1, mark: 1, luke: 1, john: 1 };
  var ALIAS = { jn: 'john', mt: 'matthew', matt: 'matthew', mk: 'mark', lk: 'luke', rm: 'romans', rom: 'romans', gal: 'galatians', eph: 'ephesians', php: 'philippians', phil: 'philippians',
    col: 'colossians', heb: 'hebrews', jas: 'james', rev: 'revelation', act: 'acts', tit: 'titus', phm: 'philemon', phlm: 'philemon' };
  var root, panel, input, body, crumb, pos, st = { opts: null, view: 'books', book: null, q: '' };

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function books() { try { return (typeof manifest !== 'undefined' && manifest && manifest.books) || []; } catch (e) { return []; } }
  function find(slug) { var b = books(); for (var i = 0; i < b.length; i++) if (b[i].slug === slug) return b[i]; return null; }
  function key(s) { return String(s).toLowerCase().replace(/[^a-z0-9]/g, ''); }
  function label(slug, ch) { var b = find(slug); return (b ? b.name : '') + (ch ? ' ' + ch : ''); }

  function group(b) {
    if (GOSPELS[b.slug]) return 'Gospels';
    if (b.slug === 'acts') return 'Acts';
    if (b.slug === 'revelation') return 'Revelation';
    return 'Letters';
  }
  // how well a book name fits what was typed: 3 starts with it, 2 a word starts with it, 1 contains it, 0 no
  function score(b, bq) {
    if (!bq) return 3;
    var al = ALIAS[bq]; if (al) return b.slug === al ? 4 : 0;
    var k = key(b.name), s = key(b.slug);
    if (k.indexOf(bq) === 0 || s.indexOf(bq) === 0) return 3;
    var words = b.name.toLowerCase().split(/\s+/);
    for (var i = 0; i < words.length; i++) if (words[i].indexOf(bq) === 0) return 2;
    return k.indexOf(bq) >= 0 ? 1 : 0;
  }
  function parse(q) {     // "john 3" -> { bq:'john', ch:3 }; "1 cor" -> { bq:'1cor' }
    var t = String(q || '').toLowerCase().replace(/\./g, ' ').replace(/\s+/g, ' ').trim();
    var m = t.match(/^(.*?[a-z])\s*(\d{1,3})(?::\d+.*)?$/);
    if (m) return { bq: key(m[1]), ch: +m[2] };
    return { bq: key(t), ch: 0 };
  }
  function matches(q) {
    var p = parse(q), out = [];
    books().forEach(function (b) { var s = score(b, p.bq); if (s) out.push({ b: b, s: s }); });
    out.sort(function (a, b) { return b.s - a.s; });
    return { list: out.map(function (x) { return x.b; }), ch: p.ch };
  }

  function mark() {     // the small gold marker that shows where you are in the list (the scroll bar itself is hidden)
    if (!pos || !body) return;
    var over = body.scrollHeight - body.clientHeight;
    if (over <= 4) { pos.classList.remove('on'); return; }
    var room = body.clientHeight - pos.offsetHeight - 6;
    pos.style.top = (3 + room * Math.min(1, Math.max(0, body.scrollTop / over))) + 'px';
    pos.classList.add('on');
  }
  function build() {
    if (root) return;
    var phone = document.querySelector('.phone') || document.body;
    root = document.createElement('div'); root.className = 'bcp'; root.id = 'bcp'; root.hidden = true;
    root.innerHTML = '<div class="bcp-scrim"></div><div class="bcp-panel" role="dialog" aria-label="Choose a book and chapter">' +
      '<div class="bcp-top"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/></svg>' +
      '<input class="bcp-q" type="search" placeholder="Search books, or type John 3" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="go" aria-label="Search for a book or a chapter">' +
      '<button type="button" class="bcp-x" aria-label="Close">&times;</button></div>' +
      '<div class="bcp-crumb" hidden><button type="button" class="bcp-back">&lsaquo; Books</button><b></b><span>Choose a chapter</span></div>' +
      '<div class="bcp-wrap"><div class="bcp-body" role="listbox"></div><i class="bcp-pos" aria-hidden="true"></i></div></div>';
    phone.appendChild(root);
    panel = root.querySelector('.bcp-panel'); input = root.querySelector('.bcp-q'); body = root.querySelector('.bcp-body'); crumb = root.querySelector('.bcp-crumb'); pos = root.querySelector('.bcp-pos');
    body.addEventListener('scroll', mark, { passive: true });
    root.querySelector('.bcp-scrim').addEventListener('click', close);
    root.querySelector('.bcp-x').addEventListener('click', close);
    root.querySelector('.bcp-back').addEventListener('click', function () { st.view = 'books'; st.book = null; draw(); });
    input.addEventListener('input', function () { st.q = input.value; st.view = 'books'; st.book = null; draw(); });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        var r = matches(st.q);
        if (r.list.length) { e.preventDefault(); choose(r.list[0], r.ch); }
      }
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && root && !root.hidden) close(); });
    body.addEventListener('click', function (e) {
      var go = e.target.closest('[data-go]'), bk = e.target.closest('[data-b]'), ch = e.target.closest('[data-c]');
      if (go) { var b = find(go.dataset.go); if (b) pick(b, +go.dataset.n); return; }
      if (ch && !ch.disabled) { pick(find(st.book), +ch.dataset.c); return; }
      if (bk) { var b2 = find(bk.dataset.b); if (b2) { st.view = 'chapters'; st.book = b2.slug; draw(); } }
    });
  }

  function choose(b, ch) {            // from the keyboard: a number goes straight there, otherwise show that book's chapters
    if (ch && b.availableChapters.indexOf(ch) >= 0) { pick(b, ch); return; }
    st.view = 'chapters'; st.book = b.slug; draw();
  }
  function pick(b, n) {
    var cb = st.opts && st.opts.onPick;
    close();
    if (cb) cb(b.slug, n);
  }

  function row(b, cur) {
    return '<button type="button" class="bcp-b" data-b="' + b.slug + '" role="option"><span>' + esc(b.name) + '</span><small>' + b.totalChapters + (b.totalChapters === 1 ? ' chapter' : ' chapters') + '</small></button>';
  }
  function draw() {
    var o = st.opts || {}, cur = o.slug, h = '';
    crumb.hidden = st.view !== 'chapters';
    if (st.view === 'chapters') {
      var b = find(st.book);
      crumb.querySelector('b').textContent = b.name;
      h = '<div class="bcp-grid">';
      for (var n = 1; n <= b.totalChapters; n++) {
        var ok = b.availableChapters.indexOf(n) >= 0;
        h += '<button type="button" class="bcp-c' + (b.slug === cur && n === o.chapter ? ' cur' : '') + '" data-c="' + n + '"' + (ok ? '' : ' disabled') + '>' + n + '</button>';
      }
      body.innerHTML = h + '</div>';
      body.scrollTop = 0;
      return;
    }
    if (st.q.trim()) {
      var r = matches(st.q), one = r.list[0];
      if (!r.list.length) h = '<p class="bcp-none">No book matches “' + esc(st.q.trim()) + '”.</p>';
      else {
        if (r.ch && one && one.availableChapters.indexOf(r.ch) >= 0) h += '<button type="button" class="bcp-go" data-go="' + one.slug + '" data-n="' + r.ch + '"><span>Go to <b>' + esc(one.name) + ' ' + r.ch + '</b></span><i>&rsaquo;</i></button>';
        h += r.list.map(function (x) { return row(x, x.slug === cur); }).join('');
      }
      body.innerHTML = h; body.scrollTop = 0;
      return;
    }
    var seen = {};
    books().forEach(function (b) {
      var g = group(b);
      if (!seen[g]) { seen[g] = 1; h += '<h4 class="bcp-g">' + g + '</h4>'; }
      h += row(b, b.slug === cur);
    });
    body.innerHTML = h;
    body.scrollTop = 0;
  }

  var drawRaw = draw; draw = function () { drawRaw(); mark(); };
  function place(anchor) {
    if (st.opts && st.opts.full) { panel.style.top = ''; panel.style.maxHeight = ''; return; }
    var phone = root.parentNode, pr = phone.getBoundingClientRect(), top = 56;
    if (anchor && anchor.getBoundingClientRect) { var ar = anchor.getBoundingClientRect(); top = Math.max(8, ar.bottom - pr.top + 6); }
    panel.style.top = top + 'px';
    panel.style.maxHeight = Math.max(240, pr.height - top - 92) + 'px';
  }
  function open(opts) {
    build();
    if (!books().length) return;
    st.opts = opts || {}; st.q = ''; st.view = 'books'; st.book = null; input.value = '';
    root.classList.toggle('full', !!st.opts.full);
    root.hidden = false;
    place(st.opts.anchor);
    draw();
    if (st.opts.anchor) st.opts.anchor.setAttribute('aria-expanded', 'true');
    // on a phone the keyboard would cover the list, so only focus the search box when asked (desktop) or on a tap of its own
    try { if (window.matchMedia && window.matchMedia('(pointer:fine)').matches) input.focus(); } catch (e) {}
  }
  function close() {
    if (!root || root.hidden) return;
    root.hidden = true;
    try { input.blur(); } catch (e) {}
    var o = st.opts || {};
    if (o.anchor) o.anchor.setAttribute('aria-expanded', 'false');
    if (o.onClose) o.onClose();
    st.opts = null;
  }

  window.BCPick = { open: open, close: close, label: label, matches: matches };
})();
