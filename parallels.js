/* parallels.js — Gospel parallels (More > Gospel parallels, and the "Gospel parallel" mark in the verse sheet).
 *
 * data/parallels.json (built by tools/build_parallels.py) lists the stories the Gospels tell more than once. Each group has
 *   r   where it is in each Gospel: { m|k|l|j: [[chapter, verse, chapter, verse], ...] }
 *   sh  what the tellings share      d  the main differences (a short list)      w  why each Gospel may tell it this way
 * The words themselves are the BSB, read from the chapter files. The shaded "only in this telling" words are worked out here:
 * a word is shaded when none of the other passages being compared use it (small everyday words are never shaded).
 *
 *   Par.open(id, fromKey)     opens one group
 *   Par.mark(book, ch, verse) fills the "Gospel parallel" row in the verse sheet
 */
(function () {
  'use strict';
  var KEY = { m: 'matthew', k: 'mark', l: 'luke', j: 'john' }, NAME = { m: 'Matthew', k: 'Mark', l: 'Luke', j: 'John' }, SHORT = { m: 'Mt', k: 'Mk', l: 'Lk', j: 'Jn' };
  var KEY2 = { matthew: 'm', mark: 'k', luke: 'l', john: 'j' };
  var ORDER = ['m', 'k', 'l', 'j'];
  var data = null, loading = null, byCh = null, byId = {}, textCache = {};
  var view = { open: {}, id: null, on: ORDER.slice(), diff: true, from: 'more', q: '', f: 'all' };
  var STOP = {}; ('the and that this with from they them their there then than have has had was were are for but not you your his her him she who whom what when which will would shall into unto upon over out all any each one him our his its also them been being did does said say says saith came come went had let may can could should these those such than now very more most some many much too yet nor off own same both few just only are was be to of in on at by as is it he we i a an or if so no do my me up us').split(' ').forEach(function (w) { STOP[w] = 1; });
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  // ---------- data ----------
  function load() {
    if (data) return Promise.resolve(data);
    if (!loading) loading = fetch('data/parallels.json').then(function (r) { if (!r.ok) throw 0; return r.json(); }).then(function (j) { data = j; index(); return j; }).catch(function () { loading = null; return null; });
    return loading;
  }
  function index() {
    byCh = {}; byId = {};
    data.groups.forEach(function (g) {
      byId[g.id] = g;
      Object.keys(g.r).forEach(function (k) {
        g.r[k].forEach(function (rg) {
          for (var c = rg[0]; c <= rg[2]; c++) {
            var key = KEY[k] + ':' + c;
            (byCh[key] = byCh[key] || []).push({ g: g, k: k, lo: c === rg[0] ? rg[1] : 1, hi: c === rg[2] ? rg[3] : 999 });
          }
        });
      });
    });
  }
  function groupsAt(book, ch, v) {
    if (!byCh) return [];
    var out = [], seen = {};
    (byCh[book + ':' + ch] || []).forEach(function (e) {
      if (v >= e.lo && v <= e.hi && !seen[e.g.id]) { seen[e.g.id] = 1; out.push({ g: e.g, k: e.k, size: size(e.g.r[e.k]) }); }
    });
    out.sort(function (a, b) { return a.size - b.size; });
    return out;
  }
  function size(rs) { var n = 0; rs.forEach(function (r) { n += (r[2] - r[0]) * 40 + (r[3] - r[1]) + 1; }); return n; }
  function refLabel(k, rs) {
    var out = [], lastC = null;
    rs.forEach(function (r) {
      var s;
      if (r[0] === r[2]) s = (r[0] === lastC ? '' : r[0] + ':') + (r[1] === r[3] ? r[1] : r[1] + '–' + r[3]);
      else s = r[0] + ':' + r[1] + '–' + r[2] + ':' + r[3];
      lastC = r[2]; out.push(s);
    });
    return NAME[k] + ' ' + out.join(', ');
  }
  function present(g) { return ORDER.filter(function (k) { return g.r[k]; }); }

  // ---------- the mark in the verse sheet ----------
  var markTok = 0;
  function mark(book, ch, v) {
    var el = $('sxPar'); if (!el) return;
    var my = ++markTok; el.hidden = true; el.dataset.g = '';
    load().then(function () {
      if (my !== markTok) return;
      var hits = groupsAt(book, ch, v); if (!hits.length) return;
      var h = hits[0], mine = KEY2[book];
      var others = present(h.g).filter(function (k) { return k !== mine; }).map(function (k) { return NAME[k]; });
      if (!others.length) return;
      el.dataset.g = h.g.id; el.dataset.k = mine;
      el.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8h13M13 4l4 4-4 4"/><path d="M20 16H7M11 12l-4 4 4 4"/></svg><span class="sx-par-t"><b>Gospel parallel</b> · ' + esc(others.join(', ')) + '</span><em>›</em>' + (hits.length > 1 ? '<i>+' + (hits.length - 1) + '</i>' : '');
      el.setAttribute('aria-label', 'Also told in ' + others.join(', ') + '. See the parallel passages and what differs.');
      el.hidden = false;
    });
  }

  // ---------- opening a group ----------
  function open(id, from) {
    load().then(function (d) {
      if (!d || !byId[id]) return;
      try { Home.notePar(id); } catch (e) {}
      view.id = id; view.open = {}; view.on = present(byId[id]); view.from = from || 'list';
      try { if (typeof closeSheet === 'function') closeSheet(); } catch (e) {}
      try { Cmp.mode('parallels', true); } catch (e) {}
      var cur = null; try { cur = currentScreen; } catch (e) {}
      if (cur !== 'parallels') { view.prev = cur; goToScreen('parallels'); } else render();
    });
  }
  function showList() { view.id = null; render(); var w = $('paWrap'); if (w) w.scrollTop = 0; }

  // ---------- text and differences ----------
  function passageVerses(k, g) {
    // every chapter this passage needs, in order
    var book = KEY[k], need = [];
    g.r[k].forEach(function (rg) { for (var c = rg[0]; c <= rg[2]; c++) need.push([book, c, c === rg[0] ? rg[1] : 1, c === rg[2] ? rg[3] : 999]); });
    return Promise.all(need.map(function (n) {
      var ck = n[0] + ':' + n[1];
      if (!textCache[ck]) textCache[ck] = fetchJSON('data/' + n[0] + '/' + n[1] + '.json').then(function (j) { return j.verses; }).catch(function () { return []; });
      return textCache[ck].then(function (vs) { return vs.filter(function (v) { return v.num >= n[2] && v.num <= n[3]; }).map(function (v) { return { b: n[0], c: n[1], v: v.num, t: v.text }; }); });
    })).then(function (parts) { return [].concat.apply([], parts); });
  }
  function norm(w) { w = w.toLowerCase().replace(/['’]s$/, '').replace(/['’]/g, ''); if (w.length > 4 && /s$/.test(w) && !/ss$/.test(w)) w = w.replace(/e?s$/, ''); return w; }
  function tokens(t) { var re = /[A-Za-zÀ-ɏ'’]+/g, m, out = []; while ((m = re.exec(t))) out.push([m.index, m.index + m[0].length, norm(m[0])]); return out; }
  function verseHtml(v, uniqueSet, withRed) {
    var tk = tokens(v.t), cuts = {}; cuts[0] = 1; cuts[v.t.length] = 1;
    var hit = [];
    tk.forEach(function (w) { if (uniqueSet && w[2].length > 2 && !STOP[w[2]] && uniqueSet[w[2]] === 1) { hit.push([w[0], w[1]]); cuts[w[0]] = 1; cuts[w[1]] = 1; } });
    var sp = withRed ? (rlSpans(v.b, v.c, v.v) || []) : [];
    sp.forEach(function (s) { cuts[s[0]] = 1; cuts[s[1]] = 1; });
    var pts = Object.keys(cuts).map(Number).sort(function (a, b) { return a - b; }), out = '';
    for (var i = 0; i < pts.length - 1; i++) {
      var a = pts[i], b = pts[i + 1], seg = esc(v.t.slice(a, b));
      if (hit.some(function (h) { return a >= h[0] && b <= h[1]; })) seg = '<u class="pa-d">' + seg + '</u>';
      if (sp.some(function (s) { return a >= s[0] && b <= s[1]; })) seg = '<span class="wj">' + seg + '</span>';
      out += seg;
    }
    return out;
  }

  function renderDetail(g) {
    var body = $('paBody'), my = view.id;
    body.innerHTML = '<p class="pa-load">Loading the passages…</p>';
    var keys = present(g);
    Promise.all(keys.map(function (k) { return passageVerses(k, g); })).then(function (res) {
      return Promise.all(Bk.slugs().map(function (b) { return typeof loadRedLetter === 'function' ? loadRedLetter(b) : null; })).then(function () { return res; });
    }).then(function (res) {
      if (view.id !== my) return;
      var P = {}; keys.forEach(function (k, i) { P[k] = res[i]; });
      view.P = P; view.g = g; drawDetail();
    });
  }
  function drawDetail() {
    var g = view.g, P = view.P, body = $('paBody'); if (!g || !P) return;
    var keys = present(g), on = view.on.filter(function (k) { return keys.indexOf(k) >= 0; });
    if (!on.length) on = keys.slice(); view.on = on;
    // how many of the shown passages use each word
    var count = {}, own = {};
    on.forEach(function (k) {
      var seen = {}; P[k].forEach(function (v) { tokens(v.t).forEach(function (w) { seen[w[2]] = 1; }); });
      own[k] = seen; Object.keys(seen).forEach(function (w) { count[w] = (count[w] || 0) + 1; });
    });
    var diffOn = view.diff && on.length > 1;
    var h = '';
    h += '<div class="pa-chips">' + keys.map(function (k) {
      var isOn = on.indexOf(k) >= 0;
      return '<button type="button" class="pa-chip g-' + k + (isOn ? ' on' : '') + '" data-k="' + k + '" aria-pressed="' + isOn + '"><b>' + NAME[k] + '</b><span>' + esc(refLabel(k, g.r[k]).replace(NAME[k] + ' ', '')) + '</span></button>';
    }).join('') + '</div>';
    h += '<p class="pa-sh">' + esc(g.sh) + '</p>';
    if (keys.length > 1) h += '<div class="pa-bar"><button type="button" class="pa-sw' + (diffOn ? ' on' : '') + '" id="paDiff" aria-pressed="' + diffOn + '"' + (on.length < 2 ? ' disabled' : '') + '><i></i><span>Shade the differences</span></button><span class="pa-tip">Tap a Gospel above to add or remove it</span></div>';
    h += '<div class="pa-cols" style="--n:' + on.length + '">';
    var firstP = true;
    on.forEach(function (k) {
      var uniq = {}; Object.keys(own[k]).forEach(function (w) { uniq[w] = count[w] === 1 ? 1 : 0; });
      var lastC = null, ps = P[k].map(function (v) {
        var lab = v.c !== lastC && P[k][0].c !== v.c ? v.c + ':' + v.v : String(v.v); lastC = v.c;
        return '<sup class="pa-vn">' + lab + '</sup>' + verseHtml(v, diffOn ? uniq : null, true) + ' ';
      }).join('');
      var first = P[k][0];
      h += '<div class="pa-col g-' + k + '"><section class="pa-p' + (view.open[k] ? ' open' : '') + '"><header><b>' + NAME[k] + '</b><button type="button" class="pa-ref" data-b="' + KEY[k] + '" data-c="' + (first ? first.c : 1) + '" data-v="' + (first ? first.v : 1) + '">' + esc(refLabel(k, g.r[k])) + ' <em>›</em></button></header><p class="pa-tx">' + ps + '</p><button type="button" class="pa-more" data-k="' + k + '" aria-expanded="false"><span>Read the whole passage</span> <em>\u25be</em></button></section>';
      var ds = g.d && g.d[k];
      if (ds && ds.length) h += '<div class="pa-dif"><i class="pa-lbl">What is different</i><b>' + NAME[k] + '</b><ul>' + ds.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></div>';
      if (g.w && g.w[k]) h += '<div class="pa-why"><i class="pa-lbl">Why it may be told this way</i><b>' + NAME[k] + '</b><p>' + esc(g.w[k]) + '</p></div>';
      h += '</div>';
    });
    if (diffOn) {
      h += '<div class="pa-only"><b>Only in this telling</b>' + on.map(function (k) {
        var seenW = {}, ws = [];
        P[k].forEach(function (v) { tokens(v.t).forEach(function (w) { if (w[2].length > 3 && !STOP[w[2]] && count[w[2]] === 1 && !seenW[w[2]]) { seenW[w[2]] = 1; ws.push(v.t.slice(w[0], w[1]).toLowerCase()); } }); });
        return '<p class="g-' + k + '"><i>' + NAME[k] + '</i> ' + (ws.length ? esc(ws.slice(0, 14).join(' · ')) + (ws.length > 14 ? ' · …' : '') : '<span>nothing unique</span>') + '</p>';
      }).join('') + '<small>Underlined words are in this Gospel’s telling but not in the other passage' + (on.length > 2 ? 's' : '') + ' shown. Words of Jesus stay red.</small></div>';
    }
    h += '<h3 class="pa-h pa-hd">What is different</h3><h3 class="pa-h pa-hw">Why each Gospel may tell it this way</h3>';
    h += '<p class="pa-note">These are the common explanations scholars give from the way each Gospel treats the same story elsewhere. The Gospels do not state their reasons, so read them as suggestions, not settled fact.</p>';
    h += '</div>';
    if (g.id === 'genealogy') h += '<button type="button" class="ge-lnk" data-genea style="margin-top:12px">See both lists as a family tree \u203a</button>';
    var i = data.groups.indexOf(g), pv = data.groups[i - 1], nx = data.groups[i + 1];
    h += '<div class="pa-nav">' + (pv ? '<button type="button" data-go="' + pv.id + '"><i>‹ Previous</i><b>' + esc(pv.t) + '</b></button>' : '<span></span>') + (nx ? '<button type="button" data-go="' + nx.id + '"><i>Next ›</i><b>' + esc(nx.t) + '</b></button>' : '<span></span>') + '</div>';
    body.innerHTML = h;
    syncMore();
  }
  // Long passages show about five lines, with a button to read all of it. The buttons are hidden when a passage already fits.
  function syncMore() {
    var body = $('paBody'); if (!body) return;
    Array.prototype.forEach.call(body.querySelectorAll('.pa-p'), function (sec) {
      var btn = sec.querySelector('.pa-more'), p = sec.querySelector('.pa-tx'); if (!btn || !p) return;
      var open = sec.classList.contains('open');
      if (!open && p.clientHeight > 0) btn.hidden = p.scrollHeight <= p.clientHeight + 2;
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      btn.firstChild.textContent = open ? 'Show less' : 'Read the whole passage';
      btn.lastChild.textContent = open ? '\u25b4' : '\u25be';
    });
  }
  var _rs; window.addEventListener('resize', function () { clearTimeout(_rs); _rs = setTimeout(syncMore, 120); });

  // ---------- the list ----------
  function listHtml() {
    var h = '';
    h += '<details class="pa-lens"><summary>How the four Gospels differ</summary><p class="pa-lensp">Matthew, Mark and Luke share a great deal, and are called the Synoptic Gospels because they can be read side by side. John is much more independent. Each writer chose, arranged and shaped what he told for the readers he had in mind.</p>' +
      ORDER.map(function (k) { return '<div class="pa-why g-' + k + '"><b>' + data.lens[k].t + '</b><p>' + esc(data.lens[k].s) + '</p></div>'; }).join('') + '</details>';
    h += '<div class="pa-box"><input id="paQ" type="search" placeholder="Filter the stories" aria-label="Filter the stories" autocomplete="off" spellcheck="false" value="' + esc(view.q) + '"></div>';
    h += '<div class="pa-f" id="paF">' + [['all', 'All'], ['three', 'Matthew, Mark and Luke'], ['john', 'With John'], ['two', 'Two Gospels']].map(function (f) { return '<button type="button" data-f="' + f[0] + '"' + (view.f === f[0] ? ' class="on"' : '') + '>' + f[1] + '</button>'; }).join('') + '</div>';
    var q = view.q.trim().toLowerCase(), n = 0;
    data.sections.forEach(function (s) {
      var gs = data.groups.filter(function (g) {
        if (g.s !== s[0]) return false;
        var ks = present(g);
        if (view.f === 'three' && !(g.r.m && g.r.k && g.r.l)) return false;
        if (view.f === 'john' && !g.r.j) return false;
        if (view.f === 'two' && ks.length !== 2) return false;
        if (q && (g.t + ' ' + ks.map(function (k) { return refLabel(k, g.r[k]); }).join(' ')).toLowerCase().indexOf(q) < 0) return false;
        return true;
      });
      if (!gs.length) return;
      h += '<h3 class="pa-sec">' + esc(s[1]) + '</h3><div class="pa-grid">';
      gs.forEach(function (g) {
        n++;
        h += '<button type="button" class="pa-card" data-go="' + g.id + '"><span class="pa-ct">' + esc(g.t) + '</span><span class="pa-cg">' + present(g).map(function (k) { return '<i class="g-' + k + '">' + SHORT[k] + '</i>'; }).join('') + '</span></button>';
      });
      h += '</div>';
    });
    if (!n) h += '<p class="pa-none">No stories match.</p>';
    return h;
  }
  function render() {
    var w = $('paBody'); if (!w) return;
    var back = $('paBack'), title = $('paTitle'), hint = $('paHint');
    if (!data) { w.innerHTML = '<p class="pa-load">Loading…</p>'; load().then(function (d) { if (!d) w.innerHTML = '<p class="pa-load">The parallels could not load. Check your connection and try again.</p>'; else render(); }); return; }
    if (view.id && byId[view.id]) {
      var g = byId[view.id], sec = data.sections.filter(function (s) { return s[0] === g.s; })[0];
      title.textContent = g.t; hint.textContent = sec ? sec[1] : ''; hint.className = 'st-hint pa-sub';
      back.style.display = ''; back.textContent = view.from === 'read' ? (view.prev === 'home' ? '‹ Home' : '‹ Back to reading') : '‹ All parallels';
      renderDetail(g);
    } else {
      title.textContent = 'Gospel parallels'; hint.className = 'st-hint'; hint.textContent = 'The stories that appear in more than one Gospel. Read them together, see exactly which words differ, and why each writer may have told it his way.';
      back.style.display = 'none';
      w.innerHTML = listHtml();
    }
  }

  // ---------- events ----------
  document.addEventListener('click', function (e) {
    var t = e.target;
    var m = t.closest && t.closest('#sxPar'); if (m && m.dataset.g) { e.preventDefault(); open(m.dataset.g, 'read'); return; }
    var wrap = t.closest && t.closest('#screen-parallels'); if (!wrap) return;
    var b;
    if ((b = t.closest('#paBack'))) {
      if (!view.id) goToScreen('more');
      else if (view.from === 'read') { view.id = null; goToScreen(view.prev && view.prev !== 'parallels' ? view.prev : 'read'); }
      else showList();
      return;
    }
    if ((b = t.closest('[data-go]'))) { view.from = view.from === 'read' && view.id ? 'read' : 'list'; view.id = b.dataset.go; view.open = {}; view.on = present(byId[view.id]); render(); $('paWrap').scrollTop = 0; return; }
    if ((b = t.closest('#paF button'))) { view.f = b.dataset.f; render(); return; }
    if ((b = t.closest('.pa-chip'))) {
      var k = b.dataset.k, i = view.on.indexOf(k);
      if (i >= 0) { if (view.on.length > 1) view.on.splice(i, 1); } else view.on = ORDER.filter(function (x) { return x === k || view.on.indexOf(x) >= 0; });
      drawDetail(); return;
    }
    if ((b = t.closest('#paDiff'))) { view.diff = !view.diff; drawDetail(); return; }
    if ((b = t.closest('.pa-more'))) {
      var wide = document.querySelector('.phone.wide'), sec = b.closest('.pa-p'), nowOpen = !sec.classList.contains('open');
      var secs = wide ? $('paBody').querySelectorAll('.pa-p') : [sec];
      Array.prototype.forEach.call(secs, function (x) { x.classList.toggle('open', nowOpen); var bb = x.querySelector('.pa-more'); if (bb && bb.dataset.k) view.open[bb.dataset.k] = nowOpen; });
      syncMore(); return;
    }
    if ((b = t.closest('.pa-ref'))) { var bk = b.dataset.b, c = +b.dataset.c, v = +b.dataset.v; view.id = view.id; openPassage(bk, c, v, false); return; }
  });
  document.addEventListener('input', function (e) { if (e.target && e.target.id === 'paQ') { view.q = e.target.value; var pos = e.target.selectionStart; var w = $('paBody'); var det = w.querySelector('.pa-lens'); var open = det && det.open; render(); var q = $('paQ'); if (q) { q.focus(); try { q.setSelectionRange(pos, pos); } catch (x) {} } var d2 = w.querySelector('.pa-lens'); if (d2 && open) d2.open = true; } });

  window.Par = {
    load: load, mark: mark, open: open,
    render: function () { if (!view.id) view.from = 'list'; render(); },
    // the list opens fresh from More
    reset: function () { view.id = null; view.from = 'list'; }
  };
})();
