/* saved.js — Highlights, Bookmarks and Favorites (More > Saved).
 *
 * Everything is kept in this browser only (localStorage key "vi_saved_v1"); nothing is sent anywhere.
 * One record per verse:  "john:3:16": { c: 0-5 highlight colour (0 = none), b: bookmark time (0 = none), f: favorite time (0 = none), t: BSB text, ts: last change }
 * Only the BSB text (public domain) is stored with a saved verse, never text from a licensed version.
 *
 * The reader calls   Saved.decorate()            after it draws a chapter
 * The verse sheet    Saved.onSheet(book, ch, v, text)   when a verse is opened
 * Navigation         Saved.render()              when the Saved screen opens
 */
(function () {
  'use strict';
  var KEY = 'vi_saved_v1';
  var COLORS = [['y', 'Yellow'], ['g', 'Green'], ['b', 'Blue'], ['p', 'Pink'], ['o', 'Orange']];
  var mem = null, storageOk = true;
  var tab = 'fav', colorFilter = 0;
  var sheetCtx = null;
  var $ = function (id) { return document.getElementById(id); };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  // ---------- storage ----------
  function load() {
    if (mem) return mem;
    try { mem = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { mem = {}; }
    if (typeof mem !== 'object' || Array.isArray(mem)) mem = {};
    return mem;
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(mem)); storageOk = true; } catch (e) { storageOk = false; }
    refreshRow(); moreRow();
  }
  function moreRow() { var el = document.querySelector('#screen-more [data-screen="saved"] .more-t i'); if (el) el.textContent = moreLine(); }
  function keyOf(b, c, v) { return b + ':' + c + ':' + v; }
  function rec(k) { return load()[k] || null; }
  function tidy(k) { var r = mem[k]; if (r && !r.c && !r.b && !r.f) delete mem[k]; }
  function bookName(slug) {
    try { if (typeof LIB_BOOK !== 'undefined' && LIB_BOOK[slug]) return LIB_BOOK[slug]; } catch (e) {}
    return String(slug).replace(/-/g, ' ').replace(/\b[a-z]/g, function (x) { return x.toUpperCase(); });
  }
  function refOf(k) { var p = k.split(':'); return bookName(p[0]) + ' ' + p[1] + ':' + p[2]; }
  function order(k) {      // canonical book order where known, then chapter and verse
    var p = k.split(':'), bi = Bk.order(p[0]);
    return [bi, Number(p[1]), Number(p[2])];
  }
  function byBible(a, b) { var x = order(a), y = order(b); return x[0] - y[0] || x[1] - y[1] || x[2] - y[2]; }
  function dateOf(ts) { try { return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }); } catch (e) { return ''; } }

  // ---------- changing a verse ----------
  function setFlag(b, c, v, text, what, val) {
    var k = keyOf(b, c, v), all = load(), r = all[k] || (all[k] = { c: 0, b: 0, f: 0, t: '', ts: 0 });
    if (what === 'c') r.c = val; else r[what] = val ? Date.now() : 0;
    if (text) r.t = String(text).replace(/^["“]|["”]$/g, '');
    r.ts = Date.now(); tidy(k); save();
    paintVerse(b, c, v);
    return all[k] || null;
  }

  // ---------- the reader ----------
  function verseEl(b, c, v) {
    if (typeof currentBook === 'undefined' || currentBook !== b || currentChapterNum !== Number(c)) return null;
    return document.querySelector('#verseList .verse[data-verse="' + v + '"]');
  }
  function paintEl(p, r) {
    for (var i = 1; i <= COLORS.length; i++) p.classList.remove('hl-' + i);
    if (r && r.c) p.classList.add('hl-' + r.c);
    var old = p.querySelector('.vmk'); if (old) old.remove();
    var mk = '';
    if (r && r.f) mk += '<span class="vmk-f" aria-label="Favorite">★</span>';
    if (r && r.b) mk += '<span class="vmk-b" aria-label="Bookmarked"></span>';
    if (mk) {
      var s = document.createElement('span'); s.className = 'vmk'; s.innerHTML = mk;
      var n = p.querySelector('.verse-num'); if (n && n.nextSibling) p.insertBefore(s, n.nextSibling); else p.appendChild(s);
    }
  }
  function paintVerse(b, c, v) { var p = verseEl(b, c, v); if (p) paintEl(p, rec(keyOf(b, c, v))); }
  function decorate() {
    if (typeof currentBook === 'undefined') return;
    var all = load(), pre = currentBook + ':' + currentChapterNum + ':';
    document.querySelectorAll('#verseList .verse').forEach(function (p) { paintEl(p, all[pre + p.dataset.verse] || null); });
  }

  // ---------- the verse sheet (controls line: colours you can swipe, favorite, bookmark) ----------
  var built = false;
  function buildRow() {
    var ctl = $('sxCtl'), dots = $('svDots'); if (!ctl || !dots) return null;
    if (built) return ctl; built = true;
    dots.innerHTML = COLORS.map(function (c, i) {
      return '<button type="button" class="sv-dot hl-d' + (i + 1) + '" data-c="' + (i + 1) + '" aria-label="Highlight ' + c[1].toLowerCase() + '" aria-pressed="false"></button>';
    }).join('');
    var w = $('sxDotsW');
    var cues = function () { w.classList.toggle('can-l', dots.scrollLeft > 4); w.classList.toggle('can-r', dots.scrollLeft < dots.scrollWidth - dots.clientWidth - 4); };
    dots.addEventListener('scroll', cues, { passive: true });
    $('svDotsR').addEventListener('click', function () { dots.scrollBy({ left: 74, behavior: 'smooth' }); });
    $('svDotsL').addEventListener('click', function () { dots.scrollBy({ left: -74, behavior: 'smooth' }); });
    dots._cues = cues;
    ctl.addEventListener('click', function (ev) {
      var t = ev.target.closest('button'); if (!t || !sheetCtx) return;
      var s = sheetCtx, r = rec(keyOf(s.b, s.c, s.v));
      if (t.dataset.c) setFlag(s.b, s.c, s.v, s.t, 'c', r && r.c === Number(t.dataset.c) ? 0 : Number(t.dataset.c));
      else if (t.dataset.w) setFlag(s.b, s.c, s.v, s.t, t.dataset.w, r && r[t.dataset.w] ? 0 : 1);
    });
    return ctl;
  }
  var nudged = false;
  function refreshRow() {
    var row = $('sxCtl'); if (!row || !sheetCtx || !built) return;
    var r = rec(keyOf(sheetCtx.b, sheetCtx.c, sheetCtx.v)) || { c: 0, b: 0, f: 0 };
    var vt = $('sheetVerseText');       // the verse in the inspector takes the colour too
    if (vt) { for (var i = 1; i <= COLORS.length; i++) vt.classList.remove('hl-' + i); if (r.c) vt.classList.add('hl-' + r.c); }
    row.querySelectorAll('.sv-dot').forEach(function (d) { var on = Number(d.dataset.c) === r.c; d.classList.toggle('on', on); d.setAttribute('aria-pressed', String(on)); });
    ['f', 'b'].forEach(function (k) { var b = row.querySelector('[data-w="' + k + '"]'); if (b) { b.classList.toggle('on', !!r[k]); b.setAttribute('aria-pressed', String(!!r[k])); } });
    var w = row.querySelector('.sx-warn'), sh = $('sheet');
    var warn = $('svWarn');
    if (!storageOk) { if (!warn) { warn = document.createElement('p'); warn.id = 'svWarn'; warn.className = 'sx-warn'; warn.textContent = 'This browser is not letting the app save, so this will be lost when you close it.'; (row.closest('.sx-top') || row).parentNode.insertBefore(warn, (row.closest('.sx-top') || row).nextSibling); } }
    else if (warn) warn.remove();
  }
  function onSheet(book, ch, v, text) {
    sheetCtx = { b: book, c: Number(ch), v: Number(v), t: text };
    buildRow(); refreshRow();
    var dots = $('svDots');
    if (dots) {
      dots.scrollLeft = 0;       // a colour picked earlier may be off to the right; show it
      var r = rec(keyOf(book, ch, v));
      if (r && r.c > 3) setTimeout(function () { var d = dots.querySelector('[data-c="' + r.c + '"]'); if (d) dots.scrollTo({ left: d.offsetLeft - 2 }); }, 60);
      setTimeout(function () {
        if (dots._cues) dots._cues();
        if (!nudged && dots.scrollWidth > dots.clientWidth && dots.scrollLeft === 0) {      // one small hint per visit that the colours slide
          nudged = true; setTimeout(function () { dots.scrollTo({ left: 34, behavior: 'smooth' }); setTimeout(function () { dots.scrollTo({ left: 0, behavior: 'smooth' }); }, 520); }, 450);
        }
      }, 120);
    }
  }

  // ---------- the Saved screen ----------
  function counts() {
    var all = load(), n = { fav: 0, bm: 0, hl: 0 };
    Object.keys(all).forEach(function (k) { var r = all[k]; if (r.f) n.fav++; if (r.b) n.bm++; if (r.c) n.hl++; });
    return n;
  }
  function moreLine() {
    var n = counts(), bits = [];
    if (n.fav) bits.push(n.fav + (n.fav === 1 ? ' favorite' : ' favorites'));
    if (n.bm) bits.push(n.bm + (n.bm === 1 ? ' bookmark' : ' bookmarks'));
    if (n.hl) bits.push(n.hl + (n.hl === 1 ? ' highlight' : ' highlights'));
    return bits.length ? bits.join(', ') + '.' : 'Highlights, bookmarks and favorites you save from any verse.';
  }
  function chip(k) { var p = k.split(':'); return '<button type="button" class="lib-chip here" data-lib="ref" data-b="' + esc(p[0]) + '" data-c="' + esc(p[1]) + '" data-v="' + esc(p[2]) + '">' + esc(refOf(k)) + '</button>'; }
  function card(k, r) {
    var show = tab === 'bm' ? r.b : tab === 'fav' ? r.f : r.ts;
    var dot = tab === 'hl' ? '<span class="sv-dot hl-d' + r.c + ' sv-mini" aria-hidden="true"></span>' : '';
    return '<div class="sd-card' + (tab === 'hl' ? ' hl-' + r.c : '') + '" data-k="' + esc(k) + '">' +
      '<div class="sd-top">' + dot + chip(k) + '<span class="sd-date">' + esc(dateOf(show)) + '</span></div>' +
      '<p class="sd-text">' + esc(r.t || '(open the verse to see its text)') + '</p>' +
      '<div class="sd-acts">' + (tab === 'fav' && r.t ? '<button type="button" class="note-lnk" data-act="copy">Copy</button>' : '') +
      '<button type="button" class="note-lnk del" data-act="rm">' + (tab === 'hl' ? 'Remove highlight' : tab === 'bm' ? 'Remove bookmark' : 'Remove favorite') + '</button></div></div>';
  }
  var EMPTY = {
    fav: 'No favorites yet. Open any verse in the Read screen and tap Favorite to keep the verses you love here.',
    bm: 'No bookmarks yet. Open a verse and tap Bookmark to save your place and come back to it.',
    hl: 'No highlights yet. Open a verse and tap one of the colour dots.'
  };
  function render() {
    var box = $('svBody'); if (!box) return;
    var all = load(), n = counts();
    var ks = Object.keys(all).filter(function (k) {
      var r = all[k];
      return tab === 'fav' ? r.f : tab === 'bm' ? r.b : (r.c && (!colorFilter || r.c === colorFilter));
    });
    if (tab === 'hl') ks.sort(byBible);
    else ks.sort(function (a, b) { return (all[b][tab === 'bm' ? 'b' : 'f']) - (all[a][tab === 'bm' ? 'b' : 'f']); });   // newest first
    var seg = $('svSeg');
    seg.querySelectorAll('button').forEach(function (b) {
      var t = b.dataset.t; b.classList.toggle('on', t === tab);
      b.querySelector('i').textContent = n[t] ? n[t] : '';
    });
    var fl = $('svFilter');
    fl.hidden = tab !== 'hl';
    if (tab === 'hl') fl.innerHTML = '<button type="button" data-f="0"' + (!colorFilter ? ' class="on"' : '') + '>All</button>' + COLORS.map(function (c, i) {
      return '<button type="button" data-f="' + (i + 1) + '" class="sv-fd hl-d' + (i + 1) + (colorFilter === i + 1 ? ' on' : '') + '" aria-label="' + c[1] + ' highlights"></button>';
    }).join('');
    $('svHint').textContent = tab === 'bm' ? 'Newest first. Tap a reference to jump straight to that verse.' : tab === 'fav' ? 'Newest first. Tap a reference to jump to that verse.' : 'In Bible order. Tap a reference to jump to that verse.';
    box.innerHTML = ks.length ? ks.map(function (k) { return card(k, all[k]); }).join('') : '<p class="sd-empty">' + esc(tab === 'hl' && colorFilter ? 'No highlights in that colour.' : EMPTY[tab]) + '</p>';
    moreRow();
    var st = $('svStore'); if (st) st.hidden = storageOk;
  }

  // ---------- backup ----------
  function toast(t) { var e = $('svTool'); if (e) { e.textContent = t; clearTimeout(toast._t); toast._t = setTimeout(function () { e.textContent = ''; }, 5000); } }
  function download() {
    try {
      var data = JSON.stringify({ app: 'forever-bible-saved', v: 1, saved: new Date().toISOString(), data: load() }, null, 1);
      var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
      a.download = 'forever-bible-saved-' + new Date().toISOString().slice(0, 10) + '.json';
      document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
      toast('Backup downloaded.');
    } catch (e) { toast('Could not create the backup file.'); }
  }
  function restore(txt) {      // merges: nothing already saved is lost
    var j; try { j = JSON.parse(txt); } catch (e) { return -1; }
    if (!j || j.app !== 'forever-bible-saved' || !j.data || typeof j.data !== 'object') return -1;
    var all = load(), n = 0;
    Object.keys(j.data).forEach(function (k) {
      if (!/^[a-z0-9-]+:\d+:\d+$/.test(k)) return;
      var s = j.data[k], r = all[k] || (all[k] = { c: 0, b: 0, f: 0, t: '', ts: 0 });
      var c = Number(s.c) || 0; if (c >= 1 && c <= COLORS.length && (s.ts || 0) >= (r.ts || 0)) r.c = c;
      if (s.b) r.b = Math.max(r.b || 0, Number(s.b) || 1);
      if (s.f) r.f = Math.max(r.f || 0, Number(s.f) || 1);
      if (!r.t && typeof s.t === 'string') r.t = s.t.slice(0, 1200);
      r.ts = Math.max(r.ts || 0, Number(s.ts) || 0); tidy(k); n++;
    });
    save(); return n;
  }
  function copyText(t) {
    try { if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(t); } catch (e) {}
    var ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); } catch (e) {} ta.remove(); return Promise.resolve();
  }

  function wire() {
    var seg = $('svSeg'); if (!seg || seg._w) return; seg._w = true;
    seg.addEventListener('click', function (ev) { var b = ev.target.closest('button'); if (!b) return; tab = b.dataset.t; render(); });
    $('svFilter').addEventListener('click', function (ev) { var b = ev.target.closest('button'); if (!b) return; colorFilter = Number(b.dataset.f) || 0; render(); });
    $('svBody').addEventListener('click', function (ev) {
      var a = ev.target.closest('[data-act]'); if (!a) return;
      var cd = a.closest('.sd-card'), k = cd && cd.dataset.k; if (!k) return;
      var r = rec(k); if (!r) return;
      if (a.dataset.act === 'rm') {
        if (tab === 'hl') r.c = 0; else if (tab === 'bm') r.b = 0; else r.f = 0;
        tidy(k); save();
        var p = k.split(':'); paintVerse(p[0], p[1], p[2]); render();
      } else if (a.dataset.act === 'copy') {
        copyText('“' + r.t + '” — ' + refOf(k) + ' (BSB)').then(function () { a.textContent = 'Copied'; setTimeout(function () { a.textContent = 'Copy'; }, 1600); });
      }
    });
    $('svDown').addEventListener('click', download);
    $('svFile').addEventListener('change', function (ev) {
      var f = ev.target.files && ev.target.files[0]; if (!f) return;
      var rd = new FileReader();
      rd.onload = function () { var n = restore(String(rd.result || '')); toast(n < 0 ? 'That file is not a Saved backup.' : 'Restored ' + n + ' saved verse' + (n === 1 ? '' : 's') + '.'); if (n >= 0) { render(); decorate(); } };
      rd.readAsText(f); ev.target.value = '';
    });
  }
  function init() { wire(); moreRow(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

  function recent(n) {
    var all = load(), ks = Object.keys(all).filter(function (k) { var r = all[k]; return r.f || r.b || r.c; });
    ks.sort(function (a, b) { return (all[b].ts || 0) - (all[a].ts || 0); });
    return ks.slice(0, n).map(function (k) { var p = k.split(':'), r = all[k]; return { b: p[0], c: Number(p[1]), v: Number(p[2]), t: r.t || '', ref: refOf(k), f: r.f, bm: r.b, hl: r.c }; });
  }
  window.Saved = { recent: recent, decorate: decorate, onSheet: onSheet, render: function () { wire(); render(); }, counts: counts, _restore: restore };
})();
