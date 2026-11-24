/* rmode.js — Reader's layout and the Hebrew Poetry Guide.
 *
 * Reader's layout (Settings "Layout: Reader's", or the reader's view button): the chapter is set in the BSB's own paragraphs and
 * poetry lines (data/layout/<book>.json, built from the BSB USFM), with no verse numbers. Each piece of text is still a
 * .verse element (data-verse, data-a/data-b = character range of the verse it shows), so tapping opens the verse card,
 * highlights and red letters keep working.
 *
 * Poetry guide (Settings "Poetry guide: On"): for chapters in data/poetry.json, a card at the top explains the structure,
 * each part of the poem gets a colour and a letter (A B C B' A', or the Hebrew letter of an acrostic), and repeated
 * phrases (refrains, bookends) are marked. Works in both layouts.
 *
 * The app calls: RM.prep(book) before drawing a chapter, RM.render(ch) inside renderChapter (true = it drew the chapter),
 * RM.after(book, chap) after drawing, RM.soon() after a verse's text is repainted (another version, back to the BSB).
 */
(function () {
  'use strict';
  var LAY = {}, LAYP = {}, PG = null, PGP = null;
  var COL = { A: 1, B: 2, C: 3, D: 4, E: 5, R: 6 };
  function $(id) { return document.getElementById(id); }
  function st() { try { return window.ViSettings ? ViSettings.get() : {}; } catch (e) { return {}; } }
  function readerOn() { return st().layout === 'reader'; }
  function guideOn() { return st().poetry === 'on'; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function getJ(u) { return fetch(u).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }); }

  function loadLayout(book) {
    if (LAY[book] !== undefined) return Promise.resolve(LAY[book]);
    if (!LAYP[book]) LAYP[book] = getJ('data/layout/' + book + '.json').then(function (d) { LAY[book] = d; return d; }, function () { delete LAYP[book]; return null; });
    return LAYP[book];
  }
  function loadGuide() {
    if (PG) return Promise.resolve(PG);
    if (!PGP) PGP = getJ('data/poetry.json').then(function (d) { PG = d; return d; }, function () { PGP = null; return null; });
    return PGP;
  }
  function prep(book) {
    var w = [];
    if (readerOn()) w.push(loadLayout(book));
    if (guideOn()) w.push(loadGuide());
    return Promise.all(w).catch(function () {});
  }

  // ---------- Reader's layout ----------
  // the verse text from a to b, with the words of Jesus in red where they fall inside that range
  function subFrag(book, chap, num, text, a, b) {
    var f = document.createDocumentFragment(), sp = (typeof rlSpans === 'function' && rlSpans(book, chap, num)) || [], p = a;
    sp.forEach(function (r) {
      var x = Math.max(a, r[0]), y = Math.min(b, r[1]); if (x >= y) return;
      if (x > p) f.appendChild(document.createTextNode(text.slice(p, x)));
      var s = document.createElement('span'); s.className = 'wj'; s.textContent = text.slice(x, y); f.appendChild(s); p = y;
    });
    if (p < b) f.appendChild(document.createTextNode(text.slice(p, b)));
    return f;
  }
  function render(ch) {
    var box = $('verseList');
    if (box) box.classList.remove('rd-flow');
    if (!readerOn() || !ch) return false;
    var book = currentBook, chap = currentChapterNum, L = LAY[book] && LAY[book][String(chap)];
    if (!L) return false;
    var texts = {}; ch.verses.forEach(function (v) { texts[v.num] = v.text; });
    box.innerHTML = ''; box.classList.add('rd-flow');
    if (ch.superscription) { var t = document.createElement('p'); t.className = 'ps-title'; t.textContent = ch.superscription; t.dataset.bsb = ch.superscription; box.appendChild(t); }
    L.forEach(function (blk) {
      var stl = blk[0], segs = blk[1];
      if (stl === 'b') { var g = document.createElement('div'); g.className = 'rd-b'; box.appendChild(g); return; }
      var d = document.createElement('p'); d.className = 'rd-blk rd-' + stl;
      segs.forEach(function (sg) {
        var v = sg[0], a = sg[1], b = sg[2], tx = texts[v]; if (tx == null) return;
        if (d.lastChild && !/\s$/.test(d.lastChild.textContent)) d.appendChild(document.createTextNode(' '));      // two verses side by side in a paragraph
        var s = document.createElement('span'); s.className = 'verse rd-seg'; s.dataset.verse = v; s.dataset.a = a; s.dataset.b = b;
        s.appendChild(subFrag(book, chap, v, tx, a, Math.min(b, tx.length)));
        s.addEventListener('click', function () { openSummary(v); });
        d.appendChild(s);
      });
      box.appendChild(d);
    });
    // keep reading: the next chapter is one tap away, so the chapter break is not a wall
    var nx = typeof adjacentChapter === 'function' ? adjacentChapter(1) : null;
    if (nx) {
      var nm = nx.book; try { var mb = manifest.books.find(function (x) { return x.slug === nx.book; }); if (mb) nm = mb.name; } catch (e) {}
      var k = document.createElement('button'); k.type = 'button'; k.className = 'rd-next';
      k.innerHTML = '<span>Keep reading</span><b>' + esc(nm === 'Psalms' ? 'Psalm' : nm) + ' ' + nx.ch + '</b><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 6l6 6-6 6"/></svg>';
      k.addEventListener('click', function () { if (typeof stepChapter === 'function') stepChapter(1); });
      box.appendChild(k);
    }
    return true;
  }

  // ---------- Poetry guide ----------
  function colOf(k, i, kind) {
    if (!k) return 0;
    if (kind === 'acrostic') return (i % 2) ? 2 : 1;
    return COL[k.charAt(0)] || 0;
  }
  function refOf(book, chap, p) { return 'v' + p.v + (p.from ? 'b' : ''); }
  function guideFor(book, chap) { return PG && PG[book + '/' + chap] || null; }
  // elements for verse v, in reading order
  function els(v) { return Array.prototype.slice.call(document.querySelectorAll('#verseList .verse[data-verse="' + v + '"]')); }
  // the text nodes of a verse element, without its number, marks or our own chips
  function textNodes(el) {
    var out = [], w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, { acceptNode: function (n) {
      var p = n.parentNode; while (p && p !== el) { if (p.classList && (p.classList.contains('verse-num') || p.classList.contains('vmk') || p.classList.contains('pg-chip'))) return NodeFilter.FILTER_REJECT; p = p.parentNode; }
      return NodeFilter.FILTER_ACCEPT; } });
    while (w.nextNode()) out.push(w.currentNode);
    return out;
  }
  // put node before the first occurrence of words inside verse v (or at the start of the verse)
  function insertAt(v, words, node) {
    var list = els(v);
    for (var i = 0; i < list.length; i++) {
      var tn = textNodes(list[i]);
      if (!words) {
        if (tn.length) { tn[0].parentNode.insertBefore(node, tn[0]); return list[i]; }
        continue;
      }
      for (var j = 0; j < tn.length; j++) {
        var at = tn[j].nodeValue.indexOf(words);
        if (at >= 0) { var rest = tn[j].splitText(at); rest.parentNode.insertBefore(node, rest); return list[i]; }
      }
    }
    return null;
  }
  function markPhrase(el, ph) {
    textNodes(el).forEach(function (n) {
      var at = n.nodeValue.indexOf(ph);
      while (at >= 0) {
        var mid = n.splitText(at), after = mid.splitText(ph.length);
        var m = document.createElement('mark'); m.className = 'pg-ref'; mid.parentNode.insertBefore(m, mid); m.appendChild(mid);
        n = after; at = n.nodeValue.indexOf(ph);
      }
    });
  }
  function clearGuide() {
    var box = $('verseList'); if (!box) return;
    box.classList.remove('pg-has');
    box.querySelectorAll('.pg-card,.pg-chip').forEach(function (x) { x.remove(); });
    box.querySelectorAll('mark.pg-ref').forEach(function (m) { var p = m.parentNode; while (m.firstChild) p.insertBefore(m.firstChild, m); p.removeChild(m); p.normalize(); });
    box.querySelectorAll('[class*="pg-"]').forEach(function (x) { for (var i = 0; i <= 6; i++) { x.classList.remove('pg-c' + i); x.classList.remove('pg-b' + i); } });
  }
  function card(g, book, chap) {
    var parts = g.parts.filter(function (p) { return p.k; });
    var chips = g.kind === 'acrostic'
      ? '<div class="pg-abc">' + parts.map(function (p, i) { return '<span class="pg-l pg-c' + colOf(p.k, i, g.kind) + '" title="' + esc(p.t) + '">' + esc(p.h || '') + '</span>'; }).join('') + '</div>'
      : '<ol class="pg-parts">' + g.parts.map(function (p, i) { return p.k ? '<li><span class="pg-k pg-c' + colOf(p.k, i, g.kind) + '">' + esc(p.k) + '</span><span class="pg-t">' + esc(p.t) + '</span><span class="pg-v">' + esc(refOf(book, chap, p)) + '</span></li>' : ''; }).join('') + '</ol>';
    var c = document.createElement('div'); c.className = 'pg-card';
    c.innerHTML = '<div class="pg-hd"><span class="pg-tag">Poetry guide</span><span class="pg-form">' + esc(g.form) + '</span></div>' +
      '<p class="pg-sum">' + esc(g.sum) + '</p>' + chips +
      (g.notes && g.notes.length ? '<details class="pg-notes"><summary>What to notice</summary><ul>' + g.notes.map(function (n) { return '<li>' + esc(n) + '</li>'; }).join('') + '</ul></details>' : '') +
      '<button type="button" class="pg-how">How Hebrew poetry works</button>';
    c.querySelector('.pg-how').addEventListener('click', openHow);
    return c;
  }
  function applyGuide(book, chap) {
    clearGuide();
    if (!guideOn()) return;
    var g = guideFor(book, chap), box = $('verseList'); if (!g || !box) return;
    box.classList.add('pg-has');
    var pt = box.querySelector(':scope > .ps-title'); box.insertBefore(card(g, book, chap), pt ? pt.nextSibling : box.firstChild);
    // colour each verse by the part it starts in
    var nums = Array.prototype.map.call(box.querySelectorAll('.verse[data-verse]'), function (e) { return Number(e.dataset.verse); });
    var vmax = Math.max.apply(null, nums.concat([0]));
    for (var v = 1; v <= vmax; v++) {
      var idx = -1;
      g.parts.forEach(function (p, i) { if (p.v < v || (p.v === v && !p.from)) idx = i; });
      if (idx < 0) continue;
      var c = colOf(g.parts[idx].k, g.parts.filter(function (p, j) { return p.k && j < idx; }).length, g.kind);
      if (c) els(v).forEach(function (e) { e.classList.add('pg-c' + c); });
      // a part that starts inside this verse colours the text from there on (reader's layout pieces only)
      g.parts.forEach(function (p, i) {
        if (p.v !== v || !p.from) return;
        var c2 = colOf(p.k, g.parts.filter(function (q, j) { return q.k && j < i; }).length, g.kind);
        els(v).forEach(function (e) { if (e.classList.contains('rd-seg') && e.textContent.indexOf(p.from) === 0) { for (var z = 0; z <= 6; z++) e.classList.remove('pg-c' + z); if (c2) e.classList.add('pg-c' + c2); } });
      });
    }
    // in Reader's layout each line or paragraph takes the colour of the part it starts in (a bar down its left side)
    box.querySelectorAll('.rd-blk').forEach(function (bk) {
      var f = bk.querySelector('.rd-seg'); if (!f) return;
      for (var z = 1; z <= 6; z++) if (f.classList.contains('pg-c' + z)) { bk.classList.add('pg-b' + z); break; }
    });
    // a letter chip where each part begins
    var n = 0;
    g.parts.forEach(function (p) {
      if (!p.k) return;
      var chip = document.createElement('span'); chip.className = 'pg-chip pg-c' + colOf(p.k, n, g.kind); n++;
      chip.textContent = g.kind === 'acrostic' ? (p.h || p.k) : p.k;
      chip.title = p.t;
      insertAt(p.v, p.from || null, chip);
    });
    (g.ref || []).forEach(function (ph) { box.querySelectorAll('.verse').forEach(function (e) { markPhrase(e, ph); }); });
  }
  function after(book, chap) {
    if (!guideOn()) { clearGuide(); return; }
    loadGuide().then(function () { if (book === currentBook && chap === currentChapterNum) applyGuide(book, chap); });
  }
  var soonT = 0;
  function soon() { clearTimeout(soonT); soonT = setTimeout(function () { if (typeof currentBook !== 'undefined') after(currentBook, currentChapterNum); }, 30); }

  // ---------- "How Hebrew poetry works" ----------
  var HOW = [
    ['Parallel lines', 'Hebrew poetry rhymes ideas, not sounds. A second line echoes the first ("He makes me lie down in green pastures; He leads me beside quiet waters"), contrasts it ("the LORD guards the path of the righteous, but the way of the wicked will perish"), or carries it further. In Reader’s layout the second line is indented.'],
    ['Chiasm (mirror pattern)', 'Ideas are laid out A B C B’ A’: the second half mirrors the first. The center usually holds the main point. Matching parts share a color.'],
    ['Bookends (inclusio)', 'The same words open and close a poem or section, framing what is inside and telling you what it is about.'],
    ['Refrain', 'A repeated line closes each stanza, like a chorus. It is often the line to remember.'],
    ['Acrostic', 'Each verse or stanza begins with the next letter of the Hebrew alphabet, aleph to taw (22 letters). It says "complete, A to Z" and made poems easier to memorize.'],
    ['Selah', 'A word in 39 psalms and Habakkuk 3, probably a pause or musical break. Its exact meaning is unknown.']
  ];
  function openHow() {
    var m = $('pgHow');
    if (!m) {
      m = document.createElement('div'); m.id = 'pgHow'; m.className = 'pg-how-wrap';
      m.innerHTML = '<div class="pg-how-box" role="dialog" aria-modal="true" aria-label="How Hebrew poetry works"><div class="pg-how-hd"><h3>How Hebrew poetry works</h3><button type="button" class="pg-x" aria-label="Close">×</button></div>' +
        HOW.map(function (h) { return '<div class="pg-how-i"><b>' + esc(h[0]) + '</b><p>' + esc(h[1]) + '</p></div>'; }).join('') +
        '<div class="pg-how-i"><b>Guides so far</b><p class="pg-list" id="pgList"></p></div></div>';
      document.body.appendChild(m);
      m.addEventListener('click', function (ev) { if (ev.target === m || ev.target.closest('.pg-x')) m.classList.remove('open'); });
    }
    loadGuide().then(function () { var l = $('pgList'); if (l) l.innerHTML = listHtml(); bindList(l, function () { m.classList.remove('open'); }); });
    m.classList.add('open');
  }
  function nameOf(k) { var b = k.split('/')[0], c = k.split('/')[1]; return (b === 'psalms' ? 'Psalm' : b.charAt(0).toUpperCase() + b.slice(1)) + ' ' + c; }
  function listHtml() { return PG ? Object.keys(PG).map(function (k) { return '<button type="button" data-pg="' + k + '">' + esc(nameOf(k)) + '</button>'; }).join('') : ''; }
  function bindList(el, done) {
    if (!el || el.dataset.bound) return; el.dataset.bound = '1';
    el.addEventListener('click', function (ev) {
      var b = ev.target.closest('[data-pg]'); if (!b) return;
      var p = b.dataset.pg.split('/');
      if (!guideOn() && window.ViSettings) ViSettings.set('poetry', 'on');
      if (done) done();
      if (typeof openPassage === 'function') openPassage(p[0], Number(p[1]), 1).then(function () { setTimeout(function () { var r = $('reader'); if (r) r.scrollTop = 0; var sc = document.querySelector('#screen-read .scroll'); if (sc) sc.scrollTop = 0; }, 150); });
    });
  }

  // ---------- the view button in the reader ----------
  function paintMenu() {
    var m = $('rdViewMenu'); if (!m) return;
    var s = st();
    m.querySelectorAll('[data-rk]').forEach(function (b) { b.classList.toggle('on', s[b.dataset.rk] === b.dataset.rv); });
    var has = guideFor(currentBook, currentChapterNum);
    var n = $('rdViewNote'); if (n) n.textContent = s.poetry === 'on' && !has ? 'No guide for this chapter yet. Try one of these:' : 'Chapters with a guide:';
  }
  function buildMenu() {
    var btn = $('rdView'), m = $('rdViewMenu'); if (!btn || !m) return;
    m.innerHTML = '<div class="rv-row"><span>Layout</span><div class="rv-seg"><button type="button" data-rk="layout" data-rv="verses">Verses</button><button type="button" data-rk="layout" data-rv="reader">Reader’s</button></div></div>' +
      '<p class="rv-hint">Reader’s: no verse numbers, the text in paragraphs and poetry lines.</p>' +
      '<div class="rv-row"><span>Poetry guide</span><div class="rv-seg"><button type="button" data-rk="poetry" data-rv="off">Off</button><button type="button" data-rk="poetry" data-rv="on">On</button></div></div>' +
      '<p class="rv-hint" id="rdViewNote">Chapters with a guide:</p><div class="pg-list" id="rdViewList"></div>' +
      '<button type="button" class="rv-how">How Hebrew poetry works</button>';
    m.addEventListener('click', function (ev) {
      var b = ev.target.closest('[data-rk]');
      if (b && window.ViSettings) { ViSettings.set(b.dataset.rk, b.dataset.rv); paintMenu(); return; }
      if (ev.target.closest('.rv-how')) { close(); openHow(); }
    });
    function close() { m.hidden = true; btn.setAttribute('aria-expanded', 'false'); }
    btn.addEventListener('click', function (ev) {
      ev.stopPropagation();
      var open = m.hidden; m.hidden = !open; btn.setAttribute('aria-expanded', String(open));
      if (open) { paintMenu(); loadGuide().then(function () { var l = $('rdViewList'); if (l && !l.innerHTML) { l.innerHTML = listHtml(); bindList(l, close); } paintMenu(); }); }
    });
    document.addEventListener('click', function (ev) { if (!m.hidden && !ev.target.closest('#rdViewMenu') && !ev.target.closest('#rdView')) close(); });
  }

  // a change of layout or guide redraws the chapter on screen
  document.addEventListener('vi-layout', function () {
    if (typeof currentBook === 'undefined' || !currentBook || typeof currentChapterData === 'undefined' || !currentChapterData) return;
    var y = 0, rd = $('reader'); if (rd) y = rd.scrollTop;
    prep(currentBook).then(function () { if (typeof renderChapter === 'function') renderChapter(); if (rd) rd.scrollTop = y; paintMenu(); });
  });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', buildMenu); else buildMenu();

  window.RM = { prep: prep, render: render, after: after, soon: soon, openHow: openHow, readerOn: readerOn };
})();
