/* Study > Compare: Compare Scripture, with three headings.
 *   Parallels     the stories the Gospels tell more than once (parallels.js draws this one)
 *   Translations  one passage in two to four versions, verse by verse, with the differences marked
 *   Custom        any two sections of the Gospels side by side, each in the version you pick
 * Uses VT (vtrans.js) for the Bible text in every version. Wide view lines the versions up in columns.
 *   Cmp.show()  Cmp.mode(name)  Cmp.translations(book, chapter, fromVerse, toVerse)
 */
(function () {
  'use strict';
  var LS = 'vi_cmp3';
  var MAXV = 4;                                    // most versions shown at once
  var STYLE = { formal: 'Word for word', literal: 'Very literal', balanced: 'Balanced', dynamic: 'Thought for thought', simple: 'Simple English', paraphrase: 'Paraphrase' };
  var st = {
    mode: 'parallels',
    tr: { b: 'john', c: 1, f: 1, t: 5, ids: ['bsb', 'asv'], diff: true },
    cu: { a: { b: '', c: 0, f: 0, t: 0, id: 'bsb' }, b: { b: '', c: 0, f: 0, t: 0, id: 'bsb' }, shared: false }
  };
  // What is remembered between visits: the heading, the versions and the switches. The passages always start from the defaults.
  try { var sv = JSON.parse(localStorage.getItem(LS) || 'null'); if (sv) { if (sv.tr) { if (Array.isArray(sv.tr.ids) && sv.tr.ids.length) st.tr.ids = sv.tr.ids; st.tr.diff = sv.tr.diff !== false; } if (sv.cu) { if (sv.cu.a && sv.cu.a.id) st.cu.a.id = sv.cu.a.id; if (sv.cu.b && sv.cu.b.id) st.cu.b.id = sv.cu.b.id; st.cu.shared = !!sv.cu.shared; } if (sv.mode) st.mode = sv.mode; } } catch (e) {}
  function save() { try { localStorage.setItem(LS, JSON.stringify({ mode: st.mode, tr: { ids: st.tr.ids, diff: st.tr.diff }, cu: { a: { id: st.cu.a.id }, b: { id: st.cu.b.id }, shared: st.cu.shared } })); } catch (e) {} }
  var $ = function (id) { return document.getElementById(id); };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function chCount(b) { try { var m = manifest.books.filter(function (x) { return x.slug === b; })[0]; if (m && m.totalChapters) return m.totalChapters; } catch (e) {} return Bk.chapters(b); }
  function vers() { try { return VT.list(); } catch (e) { return []; } }
  function def(id) { try { return VT.def(id); } catch (e) { return null; } }
  function pd(d) { return d && d.license === 'public-domain'; }
  function ready() { try { return VT.ready(); } catch (e) { return Promise.resolve(); } }

  // ---------- text ----------
  var vmCache = {};
  function chapter(id, b, c) { return VT.chapter(id, b, c); }
  function vmax(b, c) {           // how many verses the chapter has (from the BSB)
    var k = b + ':' + c;
    if (!vmCache[k]) vmCache[k] = chapter('bsb', b, c).then(function (r) { var n = 0; if (r && r.map) Object.keys(r.map).forEach(function (x) { n = Math.max(n, +x); }); return n || 30; });
    return vmCache[k];
  }
  var WORD = /([A-Za-z0-9À-ɏ'’]+)/;
  function nw(w) { return w.toLowerCase().replace(/’/g, "'").replace(/^'+|'+$/g, ''); }
  var STOP = {}; ('the and that this with from they them their there then than have has had was were are for but not you your his her him she who whom what when which will would shall into unto upon over out all any each said say saith came come went also very been being both those these thus does did may might can could')
    .split(' ').forEach(function (w) { STOP[w] = 1; });
  function wordSet(texts) { var s = {}; texts.forEach(function (t) { String(t || '').split(WORD).forEach(function (p, i) { if (i % 2 === 1) { var k = nw(p); if (k) s[k] = 1; } }); }); return s; }
  function mark(t, set, cls, minLen) {      // wrap the words NOT in `set` (or, when cls is shared, the words in it)
    return String(t).split(WORD).map(function (p, i) {
      if (i % 2 === 0) return esc(p);
      var k = nw(p); return !k || set[k] ? esc(p) : '<mark class="' + cls + '">' + esc(p) + '</mark>';
    }).join('').replace(/<\/mark>(\s+)<mark class="cmp-d">/g, '$1');
  }
  function markShared(t, set) {
    return String(t).split(WORD).map(function (p, i) {
      if (i % 2 === 0) return esc(p);
      var k = nw(p); return k && k.length > 3 && !STOP[k] && set[k] ? '<mark class="cmp-s">' + esc(p) + '</mark>' : esc(p);
    }).join('').replace(/<\/mark>(\s+)<mark class="cmp-s">/g, '$1');
  }

  // ---------- small form pieces ----------
  function opts(list, cur, label) { return list.map(function (x) { var v = x[0], n = x[1]; return '<option value="' + esc(v) + '"' + (String(v) === String(cur) ? ' selected' : '') + '>' + esc(n) + '</option>'; }).join(''); }
  function ph(txt, on) { return on ? '<option value="">' + txt + '</option>' : ''; }
  function bookOpts(cur, p) { return ph('Book', p) + opts(Bk.slugs().map(function (b) { return [b, Bk.name(b)]; }), cur); }
  function chOpts(b, cur, p) { var a = []; if (b) for (var i = 1; i <= chCount(b); i++) a.push([i, i]); return ph('Ch.', p) + opts(a, cur); }
  function vOpts(n, cur, p, t) { var a = []; for (var i = 1; i <= n; i++) a.push([i, i]); return ph(t || 'v.', p) + opts(a, cur); }
  // small one-line selects: the little label sits inside the box, so a whole reference fits on one row
  function field(label, id, html, cls, off) { return '<label class="cmp-f' + (cls ? ' ' + cls : '') + (off ? ' off' : '') + '"><span>' + label + '</span><select id="' + id + '" aria-label="' + label + '"' + (off ? ' disabled' : '') + '>' + html + '</select></label>'; }
  function refRow(p, o, verHtml, blank) {     // Book  Chapter : From - To  [Version]   (blank: nothing chosen yet, so empty placeholders)
    var hasB = !!o.b, hasC = !!(o.b && o.c);
    return '<div class="cmp-ref-row' + (verHtml ? ' has-v' : '') + '">' + field('Book', p + 'b', bookOpts(o.b, blank), 'bk') + field('Chapter', p + 'c', chOpts(o.b, o.c, blank), 'ch', blank && !hasB) + '<i class="cmp-sep" aria-hidden="true">:</i>' +
      field('From verse', p + 'f', hasC ? '' : '<option value="">v.</option>', 'vs', blank && !hasC) + '<i class="cmp-sep" aria-hidden="true">–</i>' + field('To verse', p + 't', hasC ? '' : '<option value="">v.</option>', 'vs', blank && !hasC) + (verHtml ? field('Version', p + 'v', verHtml, 'vr') : '') + '</div>';
  }
  function fix(o, n) { o.f = Math.min(Math.max(1, o.f | 0), n); o.t = Math.min(Math.max(o.f, o.t | 0), n); }

  // ---------- Translations ----------
  function drawTr() {
    var body = $('cmpBody'), o = st.tr;
    var have = vers().map(function (d) { return d.id; });
    o.ids = o.ids.filter(function (id) { return have.indexOf(id) >= 0; });
    if (!o.ids.length && have.length) o.ids = [have[0]];
    var h = '<p class="cmp-lead">One passage in several versions at once. Words that differ from the first version are marked.</p>' +
      refRow('cmpT', o) +
      '<div class="cmp-vers" role="group" aria-label="Versions to compare">' + vers().map(function (d) {
        var i = o.ids.indexOf(d.id), on = i >= 0;
        return '<button type="button" class="cmp-vc' + (on ? ' on' : '') + (pd(d) ? '' : ' lic') + '" data-cmp="ver" data-id="' + esc(d.id) + '" aria-pressed="' + on + '"><b>' + esc(d.abbr) + '</b>' + (on ? '<i>' + (i + 1) + '</i>' : '') + '</button>';
      }).join('') + '</div>' +
      '<div class="cmp-bar"><button type="button" class="pa-sw' + (o.diff ? ' on' : '') + '" data-cmp="diff" aria-pressed="' + !!o.diff + '"><i></i>Mark the differences</button><span class="cmp-tip">Up to ' + MAXV + ' versions. The first one you pick is the base.</span></div>' +
      '<div id="cmpOut"><p class="cmp-load">Loading…</p></div>';
    body.innerHTML = h;
    vmax(o.b, o.c).then(function (n) {
      fix(o, n);
      var f = $('cmpTf'), t = $('cmpTt'); if (!f || !t) return;
      f.innerHTML = vOpts(n, o.f); t.innerHTML = vOpts(n, o.t);
      drawTrOut();
    });
  }
  function drawTrOut() {
    var o = st.tr, out = $('cmpOut'); if (!out) return;
    var tok = ++drawTrOut.n;
    Promise.all(o.ids.map(function (id) { return chapter(id, o.b, o.c); })).then(function (res) {
      if (tok !== drawTrOut.n || !$('cmpOut')) return;
      var base = o.ids[0], bs = wordSet([]), rows = '', shown = 0, n = o.ids.length;
      var maps = res.map(function (r) { return r && r.map ? r.map : null; });
      var hdr = '<div class="cmp-hrow">' + '<div class="cmp-vn"></div>' + o.ids.map(function (id, i) {
        var d = def(id) || { abbr: id, name: id }, r = res[i];
        return '<div class="cmp-h' + (i === 0 ? ' base' : '') + '"><b>' + esc(d.abbr) + '</b><span>' + esc(d.name || '') + '</span>' + (STYLE[d.style] ? '<em>' + esc(STYLE[d.style]) + (i === 0 && n > 1 && o.diff ? ' · comparing against' : '') + '</em>' : '') + '</div>';
      }).join('') + '</div>';
      for (var v = o.f; v <= o.t; v++) {
        var texts = maps.map(function (m) { return m && m[v] != null ? m[v] : null; });
        if (texts.every(function (x) { return x == null; })) continue;
        shown++;
        var bset = wordSet([texts[0]]);
        rows += '<div class="cmp-r"><div class="cmp-vn">' + v + '</div>' + texts.map(function (t, i) {
          var d = def(o.ids[i]) || { abbr: o.ids[i] }, cell;
          if (t == null) cell = res[i] && res[i].err && res[i].err !== 'NOT_AVAILABLE' ? '<i class="cmp-miss">' + esc(VT.why(o.ids[i], res[i].err, o.b)) + '</i>' : '<i class="cmp-miss">not in this version</i>';
          else cell = i === 0 || !o.diff || texts[0] == null ? esc(t) : mark(t, bset, 'cmp-d');
          return '<div class="cmp-c' + (i === 0 ? ' base' : '') + '"><span class="cmp-ab">' + esc(d.abbr) + '</span><span class="cmp-tx">' + cell + '</span></div>';
        }).join('') + '</div>';
      }
      var creds = [];
      o.ids.forEach(function (id) { var c = VT.credit(id); if (c && creds.indexOf(c) < 0) creds.push(c); });
      var fail = res.some(function (r) { return r && !r.map; });
      out.innerHTML = '<h3 class="cmp-ref">' + Bk.name(o.b) + ' ' + o.c + ':' + o.f + (o.t > o.f ? '–' + o.t : '') + '</h3>' +
        (shown ? '<div class="cmp-grid" style="--n:' + n + '">' + hdr + rows + '</div>' : '<p class="cmp-load">None of the chosen versions has these verses.</p>') +
        (creds.length ? '<p class="cmp-credit">' + creds.join(' ') + '</p>' : '') +
        (fail && shown ? '' : '');
    });
  }
  drawTrOut.n = 0;

  // ---------- Custom ----------
  function sideHtml(key, o, label) {
    var p = 'cmp' + key;
    return '<fieldset class="cmp-side" data-s="' + key + '"><legend>' + label + '</legend>' +
      refRow(p, o, vers().map(function (d) { return '<option value="' + esc(d.id) + '"' + (d.id === o.id ? ' selected' : '') + '>' + esc(d.abbr) + '</option>'; }).join(''), true) + '</fieldset>';
  }
  function ready1(o) { return !!(o.b && o.c && o.f); }
  function drawCu() {
    var body = $('cmpBody'), c = st.cu, have = vers().map(function (d) { return d.id; });
    if (have.indexOf(c.a.id) < 0) c.a.id = have[0] || 'bsb';
    if (have.indexOf(c.b.id) < 0) c.b.id = have[0] || 'bsb';
    body.innerHTML = '<div class="cmp-two">' + sideHtml('a', c.a, 'Section A') + sideHtml('b', c.b, 'Section B') + '</div>' +
      '<div class="cmp-bar"><button type="button" class="cmp-swap" data-cmp="swap">⇄ Swap sides</button><button type="button" class="pa-sw' + (c.shared ? ' on' : '') + '" data-cmp="shared" aria-pressed="' + !!c.shared + '"><i></i>Mark words in both</button></div>' +
      '<div id="cmpOut"></div>';
    Promise.all([c.a, c.b].map(function (o) { return o.b && o.c ? vmax(o.b, o.c) : Promise.resolve(0); })).then(function (n) {
      [['a', c.a, n[0]], ['b', c.b, n[1]]].forEach(function (x) {
        var o = x[1]; if (!x[2]) return;
        fix(o, x[2]);
        var f = $('cmp' + x[0] + 'f'), t = $('cmp' + x[0] + 't'); if (f && t) { f.innerHTML = vOpts(x[2], o.f); t.innerHTML = vOpts(x[2], o.t); }
      });
      drawCuOut();
    });
  }
  function side(o) {
    if (!ready1(o)) return Promise.resolve({ o: o, vs: [], err: null });
    return chapter(o.id, o.b, o.c).then(function (r) {
      var vs = [];
      if (r && r.map) for (var v = o.f; v <= o.t; v++) if (r.map[v] != null) vs.push({ n: v, t: r.map[v] });
      return { o: o, vs: vs, err: r && !r.map ? r.err : null };
    });
  }
  function drawCuOut() {
    var c = st.cu, out = $('cmpOut'); if (!out) return;
    var tok = ++drawCuOut.n;
    if (!ready1(c.a) && !ready1(c.b)) { out.innerHTML = '<p class="cmp-empty">Any two sections of scripture, side by side</p>'; return; }
    Promise.all([side(c.a), side(c.b)]).then(function (s) {
      if (tok !== drawCuOut.n || !$('cmpOut')) return;
      var shared = null;
      if (c.shared) { var A = wordSet(s[0].vs.map(function (x) { return x.t; })), B = wordSet(s[1].vs.map(function (x) { return x.t; })); shared = {}; Object.keys(A).forEach(function (k) { if (B[k]) shared[k] = 1; }); }
      var creds = [];
      var cols = s.map(function (x, i) {
        var o = x.o;
        if (!ready1(o)) return '<section class="cmp-col' + (i ? ' b' : ' a') + ' blank"><p class="cmp-miss">Choose a book and chapter for Section ' + (i ? 'B' : 'A') + '.</p></section>';
        var d = def(o.id) || { abbr: o.id }, cr = VT.credit(o.id); if (cr && creds.indexOf(cr) < 0) creds.push(cr);
        var ps = x.vs.length ? x.vs.map(function (v) { return '<p class="cmp-p"><sup>' + v.n + '</sup>' + (shared ? markShared(v.t, shared) : esc(v.t)) + '</p>'; }).join('') :
          '<p class="cmp-miss">' + esc(x.err && x.err !== 'NOT_AVAILABLE' ? VT.why(o.id, x.err, o.b) : 'These verses are not in the ' + d.abbr + ' text.') + '</p>';
        return '<section class="cmp-col' + (i ? ' b' : ' a') + '"><header><b>' + Bk.name(o.b) + ' ' + o.c + ':' + o.f + (o.t > o.f ? '–' + o.t : '') + '</b><span>' + esc(d.abbr) + '</span></header>' + ps + '</section>';
      }).join('');
      out.innerHTML = '<div class="cmp-cols">' + cols + '</div>' + (creds.length ? '<p class="cmp-credit">' + creds.join(' ') + '</p>' : '') +
        (shared ? '<p class="cmp-credit">Highlighted words appear in both sections. Small everyday words are left alone.</p>' : '');
    });
  }
  drawCuOut.n = 0;

  // ---------- the screen ----------
  function paint() {
    var w = $('paWrap'); if (!w) return;
    w.classList.remove('cmpm-parallels', 'cmpm-translations', 'cmpm-custom'); w.classList.add('cmpm-' + st.mode);
    Array.prototype.forEach.call(document.querySelectorAll('#cmpSeg [data-cmp]'), function (b) { var on = b.dataset.cmp === st.mode; b.classList.toggle('on', on); b.setAttribute('aria-selected', on ? 'true' : 'false'); });
    var body = $('cmpBody'); if (body) body.hidden = st.mode === 'parallels';
  }
  function show() {
    paint();
    if (st.mode === 'parallels') { try { Par.render(); } catch (e) {} return; }
    var body = $('cmpBody'); if (body) body.innerHTML = '<p class="cmp-load">Loading…</p>';
    ready().then(function () { if (st.mode === 'translations') drawTr(); else if (st.mode === 'custom') drawCu(); });
  }
  function mode(m, quiet) { if (['parallels', 'translations', 'custom'].indexOf(m) < 0) return; st.mode = m; save(); if (!quiet) show(); else paint(); }
  function translations(b, c, f, t) {
    if (Bk.slugs().indexOf(b) < 0) return;
    st.tr.b = b; st.tr.c = +c || 1; st.tr.f = +f || 1; st.tr.t = +t || +f || 1; st.mode = 'translations'; save();
    var cur = null; try { cur = currentScreen; } catch (e) {}
    if (cur !== 'parallels') goToScreen('parallels'); else show();
  }

  document.addEventListener('click', function (e) {
    var b = e.target && e.target.closest ? e.target.closest('#screen-parallels [data-cmp]') : null; if (!b) return;
    var a = b.dataset.cmp;
    if (['parallels', 'translations', 'custom'].indexOf(a) >= 0) { if (a === 'parallels' && st.mode === 'parallels') { try { Par.reset(); } catch (x) {} } mode(a); var w = $('paWrap'); if (w) w.scrollTop = 0; return; }
    if (a === 'ver') {
      var o = st.tr, id = b.dataset.id, i = o.ids.indexOf(id);
      if (i >= 0) { if (o.ids.length > 1) o.ids.splice(i, 1); }
      else if (o.ids.length < MAXV) o.ids.push(id);
      else { var tip = document.querySelector('.cmp-tip'); if (tip) tip.classList.add('hot'); return; }
      save(); drawTr();
    } else if (a === 'diff') { st.tr.diff = !st.tr.diff; save(); drawTr(); }
    else if (a === 'shared') { st.cu.shared = !st.cu.shared; save(); drawCu(); }
    else if (a === 'swap') { var t = st.cu.a; st.cu.a = st.cu.b; st.cu.b = t; save(); drawCu(); }
  });
  document.addEventListener('change', function (e) {
    var t = e.target; if (!t || !t.id || t.id.indexOf('cmp') !== 0 || !t.closest('#screen-parallels')) return;
    var id = t.id;
    if (id.indexOf('cmpT') === 0) {
      var o = st.tr, k = id.charAt(4);
      if (k === 'b') { o.b = t.value; o.c = 1; o.f = 1; o.t = 8; } else if (k === 'c') { o.c = +t.value; o.f = 1; o.t = 8; } else if (k === 'f') { o.f = +t.value; if (o.t < o.f) o.t = o.f; } else if (k === 't') { o.t = +t.value; if (o.t < o.f) o.f = o.t; }
      save(); drawTr();
    } else if (/^cmp[ab][bcftv]$/.test(id)) {
      var s = id.charAt(3) === 'a' ? st.cu.a : st.cu.b, kk = id.charAt(4);
      if (kk === 'b') { s.b = t.value; s.c = 0; s.f = 0; s.t = 0; } else if (kk === 'c') { s.c = +t.value || 0; s.f = s.c ? 1 : 0; s.t = s.c ? 8 : 0; } else if (kk === 'f') { s.f = +t.value; if (s.t < s.f) s.t = s.f; } else if (kk === 't') { s.t = +t.value; if (s.t < s.f) s.f = s.t; } else if (kk === 'v') s.id = t.value;
      save(); drawCu();
    }
  });

  window.Cmp = { show: show, mode: mode, translations: translations };
})();
