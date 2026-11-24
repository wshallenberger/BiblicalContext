/* viz.js — Visualize › More: the Word Heatmap and Size It Up (r147).
   Heatmap: counts a word (and its simple forms) in every verse of data/search.json, per book, shaded across all 66 books.
   Size It Up: objects the Bible measures in cubits, drawn to scale beside things we know. */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var fmt = function (n) { return Number(n).toLocaleString(); };

  // ---------- the 66 books, grouped as on the Read page ----------
  var CANON = [
    ['Law', [['genesis', 'Gen'], ['exodus', 'Exod'], ['leviticus', 'Lev'], ['numbers', 'Num'], ['deuteronomy', 'Deut']]],
    ['History', [['joshua', 'Josh'], ['judges', 'Judg'], ['ruth', 'Ruth'], ['1-samuel', '1 Sam'], ['2-samuel', '2 Sam'], ['1-kings', '1 Kgs'], ['2-kings', '2 Kgs'], ['1-chronicles', '1 Chr'], ['2-chronicles', '2 Chr'], ['ezra', 'Ezra'], ['nehemiah', 'Neh'], ['esther', 'Esth']]],
    ['Wisdom & Poetry', [['job', 'Job'], ['psalms', 'Ps'], ['proverbs', 'Prov'], ['ecclesiastes', 'Eccl'], ['song-of-solomon', 'Song']]],
    ['Prophets', [['isaiah', 'Isa'], ['jeremiah', 'Jer'], ['lamentations', 'Lam'], ['ezekiel', 'Ezek'], ['daniel', 'Dan'], ['hosea', 'Hos'], ['joel', 'Joel'], ['amos', 'Amos'], ['obadiah', 'Obad'], ['jonah', 'Jonah'], ['micah', 'Mic'], ['nahum', 'Nah'], ['habakkuk', 'Hab'], ['zephaniah', 'Zeph'], ['haggai', 'Hag'], ['zechariah', 'Zech'], ['malachi', 'Mal']]],
    ['Gospels', [['matthew', 'Matt'], ['mark', 'Mark'], ['luke', 'Luke'], ['john', 'John']]],
    ['Acts', [['acts', 'Acts']]],
    ['Letters', [['romans', 'Rom'], ['1-corinthians', '1 Cor'], ['2-corinthians', '2 Cor'], ['galatians', 'Gal'], ['ephesians', 'Eph'], ['philippians', 'Phil'], ['colossians', 'Col'], ['1-thessalonians', '1 Thess'], ['2-thessalonians', '2 Thess'], ['1-timothy', '1 Tim'], ['2-timothy', '2 Tim'], ['titus', 'Titus'], ['philemon', 'Phlm'], ['hebrews', 'Heb'], ['james', 'Jas'], ['1-peter', '1 Pet'], ['2-peter', '2 Pet'], ['1-john', '1 John'], ['2-john', '2 John'], ['3-john', '3 John'], ['jude', 'Jude']]],
    ['Revelation', [['revelation', 'Rev']]]
  ];
  var NAMES = {};
  CANON.forEach(function (g) { g[1].forEach(function (b) { NAMES[b[0]] = b[0].replace(/^(\d)-/, '$1 ').replace(/-/g, ' ').replace(/\b[a-z]/g, function (c) { return c.toUpperCase(); }).replace(' Of ', ' of '); }); });
  function bookName(slug) { try { return Bk.name(slug) || NAMES[slug]; } catch (e) { return NAMES[slug]; } }

  // ---------- data ----------
  var S = null, N = null, loading = null;
  function load() {
    if (S && N) return Promise.resolve(true);
    if (!loading) loading = Promise.all([
      fetch('data/search.json').then(function (r) { return r.json(); }),
      fetch('data/word-index.json').then(function (r) { return r.json(); })
    ]).then(function (a) { S = a[0]; N = {}; a[1].b.forEach(function (b, i) { N[b] = a[1].n[i]; }); return true; })
      .catch(function () { loading = null; return false; });
    return loading;
  }

  // ---------- Words: Heatmap (a treemap of books) and Word cloud (r148) ----------
  var GCOL = { Law: '#7a5c4a', History: '#5c7a4a', 'Wisdom & Poetry': '#7b5a8a', Prophets: '#8c4646', Gospels: '#8a6d0b', Acts: '#2f7f7a', Letters: '#4d5f8f', Revelation: '#6b6b6b' };
  var OTG = ['Law', 'History', 'Wisdom & Poetry', 'Prophets'];
  var SUGGEST = ['love', 'covenant', 'blessed', 'faith', 'grace', 'wisdom', 'fear', 'light', 'blood', 'kingdom', 'heart', 'mercy', 'sin', 'peace', 'king', 'spirit'];
  var hm = { tab: 'heat', q: 'love', forms: true, size: 'count', tst: 'all', book: null, res: null, cb: 'all', cshow: 'all', cn: 100 };
  var ENDS = ['s', 'es', 'ed', 'd', 'ing', 'eth', 'est'];
  function rx(q, forms) {
    var w = q.toLowerCase().replace(/[^a-z' ]/g, '').trim().replace(/\s+/g, ' ');
    if (!w) return null;
    var e = w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), stem = e.replace(/e$/, '');
    var body = forms && w.indexOf(' ') < 0 ? '(?:' + e + '(?:' + ENDS.join('|') + ')?|' + stem + 'ing)' : e;
    return { w: w, re: new RegExp("(^|[^A-Za-z'])(" + body + ")(?![A-Za-z])", 'gi') };
  }
  function count() {
    var r = rx(hm.q, hm.forms); if (!r || !S) { hm.res = null; return; }
    var by = {}, ch = {}, first = {}, found = {}, total = 0;
    S.v.forEach(function (x) {
      r.re.lastIndex = 0; var m, n = 0;
      while ((m = r.re.exec(x[3]))) { n++; var f = m[2].toLowerCase(); found[f] = (found[f] || 0) + 1; }
      if (!n) return;
      var b = S.b[x[0]], k = b + ':' + x[1]; by[b] = (by[b] || 0) + n; total += n; ch[k] = (ch[k] || 0) + n; if (!first[k]) first[k] = x[2];
    });
    hm.res = { w: r.w, by: by, ch: ch, first: first, found: found, total: total };
  }
  // squarified treemap: items [{v,...}] into the rectangle; returns items with x,y,w,h
  function squarify(items, x, y, w, h) {
    items = items.filter(function (it) { return it.v > 0; }).sort(function (a, b) { return b.v - a.v; });
    var tot = items.reduce(function (s, it) { return s + it.v; }, 0); if (!tot) return [];
    var scale = w * h / tot, out = [], row = [], rx0 = x, ry0 = y, rw = w, rh = h;
    function worst(r, side) { var s = 0, mx = 0, mn = Infinity; r.forEach(function (it) { var a = it.v * scale; s += a; mx = Math.max(mx, a); mn = Math.min(mn, a); }); return Math.max(side * side * mx / (s * s), s * s / (side * side * mn)); }
    function lay(r) {
      var s = r.reduce(function (a, it) { return a + it.v * scale; }, 0);
      if (rw >= rh) { var cw = s / rh, cy = ry0; r.forEach(function (it) { var hh = it.v * scale / cw; out.push(Object.assign({}, it, { x: rx0, y: cy, w: cw, h: hh })); cy += hh; }); rx0 += cw; rw -= cw; }
      else { var chh = s / rw, cx = rx0; r.forEach(function (it) { var ww = it.v * scale / chh; out.push(Object.assign({}, it, { x: cx, y: ry0, w: ww, h: chh })); cx += ww; }); ry0 += chh; rh -= chh; }
    }
    items.forEach(function (it) {
      var side = Math.min(rw, rh);
      if (!row.length || worst(row.concat([it]), side) <= worst(row, side)) row.push(it);
      else { lay(row); row = [it]; }
    });
    if (row.length) lay(row);
    return out;
  }
  function stage() { var st = $('vzStage'); return st ? { el: st, w: Math.max(200, st.clientWidth), h: Math.max(180, st.clientHeight) } : null; }
  function txtOn(pct) { return pct > 52 ? 'color:#fff;' : 'color:var(--parchment);'; }
  function renderHeat() {
    var sg = stage(); if (!sg) return;
    var R = hm.res, have = {}; S.b.forEach(function (b) { have[b] = 1; });
    var foot = $('vzFoot'), sum = $('vzSum');
    if (!R) { sg.el.innerHTML = ''; sum.innerHTML = 'Type a word to see where it lives.'; return; }
    var val = function (b) { var n = R.by[b] || 0; return hm.size === 'rate' ? n / Math.max(1, N[b]) * 1000 : n; };
    var groups = CANON.filter(function (g) { return hm.tst === 'all' || (hm.tst === 'OT') === (OTG.indexOf(g[0]) >= 0); });
    var maxRate = 0; Object.keys(R.by).forEach(function (b) { maxRate = Math.max(maxRate, R.by[b] / Math.max(1, N[b]) * 1000); });
    var totV = 0; groups.forEach(function (g) { g[1].forEach(function (b) { totV += val(b[0]); }); });
    var minV = Math.max(totV, 1) * 0.0045;   // every book keeps a sliver, so all of them stay on screen
    var forms = Object.keys(R.found).sort(function (a, b) { return R.found[b] - R.found[a]; });
    var books = Object.keys(R.by).filter(function (b) { return groups.some(function (g) { return g[1].some(function (x) { return x[0] === b; }); }); });
    var top = books.sort(function (a, b) { return val(b) - val(a); })[0];
    if (hm.book) return renderChapters(sg, R);
    sum.innerHTML = R.total ? '<b>' + esc(R.w) + '</b> · ' + fmt(books.reduce(function (s, b) { return s + R.by[b]; }, 0)) + ' times in ' + books.length + ' books' + (top ? ' · most ' + (hm.size === 'rate' ? 'often' : '') + ' in <b>' + esc(bookName(top)) + '</b>' : '') +
      (forms.length > 1 ? '<span class="vz-forms">' + forms.slice(0, 6).map(function (f) { return esc(f) + ' ' + R.found[f]; }).join(' · ') + '</span>' : '') : 'No verse in the app uses <b>' + esc(R.w) + '</b>.';
    var gItems = groups.map(function (g) { var bs = g[1].map(function (b) { return { s: b[0], ab: b[1], g: g[0], v: Math.max(val(b[0]), minV), n: R.by[b[0]] || 0, off: !have[b[0]] }; }); return { g: g[0], bs: bs, v: bs.reduce(function (s, b) { return s + b.v; }, 0) }; });
    var gap = 2, html = '';
    squarify(gItems, 0, 0, sg.w, sg.h).forEach(function (G) {
      var lab = G.w > 70 && G.h > 46 ? 15 : 0, col = GCOL[G.g];
      html += '<div class="tm-g" style="left:' + G.x + 'px;top:' + G.y + 'px;width:' + G.w + 'px;height:' + G.h + 'px;--c:' + col + '">' + (lab ? '<span class="tm-gl">' + esc(G.g) + '</span>' : '') + '</div>';
      squarify(G.bs, G.x + gap, G.y + lab + gap, Math.max(1, G.w - 2 * gap), Math.max(1, G.h - lab - 2 * gap)).forEach(function (B) {
        var rate = B.n / Math.max(1, N[B.s] || 1) * 1000, t = maxRate ? rate / maxRate : 0;
        var pct = B.off ? 0 : B.n ? Math.round(30 + 70 * Math.sqrt(t)) : 10;
        var area = B.w * B.h, fs = Math.max(8, Math.min(26, Math.sqrt(area) / 5.2));
        var nm = B.w > fs * 0.62 * bookName(B.s).length + 8 ? bookName(B.s) : B.ab;
        var showN = B.h > fs * 2.4 && B.w > 30 && !B.off;
        var inner = B.w > 18 && B.h > 13 ? '<b style="font-size:' + fs.toFixed(1) + 'px">' + esc(nm) + '</b>' + (showN ? '<i style="font-size:' + Math.max(8, fs * 0.6).toFixed(1) + 'px">' + (hm.size === 'rate' ? (rate < 0.1 && B.n ? '<0.1' : rate.toFixed(1)) + ' / 1k' : fmt(B.n)) + '</i>' : '') : '';
        html += '<button type="button" class="tm-b' + (B.off ? ' off' : '') + '" ' + (B.off ? 'disabled ' : 'data-tb="' + B.s + '" ') + 'title="' + esc(bookName(B.s) + (B.off ? ': not in the app yet' : ': ' + B.n + ' time' + (B.n === 1 ? '' : 's') + ', ' + rate.toFixed(2) + ' per 1,000 words')) + '" style="left:' + (B.x + 1) + 'px;top:' + (B.y + 1) + 'px;width:' + Math.max(0, B.w - 2) + 'px;height:' + Math.max(0, B.h - 2) + 'px;' + (B.off ? '' : 'background:color-mix(in srgb, ' + col + ' ' + pct + '%, var(--ink-raised));' + txtOn(pct)) + '">' + inner + '</button>';
      });
    });
    sg.el.innerHTML = html;
    if (foot) foot.textContent = 'Each box is a book: the bigger it is, the more the word is used' + (hm.size === 'rate' ? ' for every 1,000 words of the book' : '') + '; the darker, the more often it comes up for the book’s length. Dashed boxes are books not in the app yet. Tap a book for its chapters. Counts use the BSB’s English wording.';
  }
  function renderChapters(sg, R) {
    var s = hm.book, sum = $('vzSum'), foot = $('vzFoot'), col = '#8a6d0b';
    CANON.forEach(function (g) { g[1].forEach(function (b) { if (b[0] === s) col = GCOL[g[0]]; }); });
    var bk = null; try { bk = manifest.books.find(function (b) { return b.slug === s; }); } catch (e) {}
    var chs = bk ? bk.availableChapters : [];
    var n = R.by[s] || 0, used = chs.filter(function (c) { return R.ch[s + ':' + c]; });
    var maxC = 0; used.forEach(function (c) { maxC = Math.max(maxC, R.ch[s + ':' + c]); });
    var unit = s === 'psalms' ? 'Psalm ' : '';
    sum.innerHTML = '<button type="button" class="vz-crumb" data-tback>‹ All books</button> <b>' + esc(bookName(s)) + '</b> · ' + esc(R.w) + ' ' + fmt(n) + ' time' + (n === 1 ? '' : 's') + ' in ' + used.length + ' of ' + chs.length + ' chapters';
    var tot = n || 1, minV = tot * 0.006;
    var items = chs.map(function (c) { var k = R.ch[s + ':' + c] || 0; return { c: c, n: k, v: Math.max(k, minV) }; });
    var html = '';
    squarify(items, 0, 0, sg.w, sg.h).forEach(function (B) {
      var pct = B.n ? Math.round(30 + 70 * Math.sqrt(B.n / maxC)) : 8, fs = Math.max(8, Math.min(24, Math.sqrt(B.w * B.h) / 4.6));
      var inner = B.w > 16 && B.h > 12 ? '<b style="font-size:' + fs.toFixed(1) + 'px">' + (B.w > fs * 3.4 && unit ? unit : '') + B.c + '</b>' + (B.n && B.h > fs * 2.3 ? '<i style="font-size:' + Math.max(8, fs * .6).toFixed(1) + 'px">' + B.n + '×</i>' : '') : '';
      html += '<button type="button" class="tm-b" data-tc="' + B.c + '" title="' + esc((unit || bookName(s) + ' ') + B.c + ': ' + B.n) + '" style="left:' + (B.x + 1) + 'px;top:' + (B.y + 1) + 'px;width:' + Math.max(0, B.w - 2) + 'px;height:' + Math.max(0, B.h - 2) + 'px;background:color-mix(in srgb, ' + col + ' ' + pct + '%, var(--ink-raised));' + txtOn(pct) + '">' + inner + '</button>';
    });
    sg.el.innerHTML = html;
    if (foot) foot.textContent = 'Each box is a chapter, sized by how often ' + R.w + ' comes up. Tap one to read it, opened at the first verse that uses the word.';
  }

  // ---------- Word cloud ----------
  var STOP = ('a about above after again against all also am an and any are as at be because been before being below between both but by can could did do does doing down during each even ever every few for from further had has have having he her here hers herself him himself his how i if in into is it its itself just let like may me might more most must my myself no nor not now of off on once one only or other ought our ours ourselves out over own same say says said saying shall she should so some such than that the their theirs them themselves then there therefore these they this those through thus to too under until unto up upon us very was we were what when where which while who whom whose why will with would yet you your yours yourself yourselves ' +
    'thee thou thy thine ye hath doth art shalt wilt hast didst thereof therein wherefore whither whence hither yea nay lo behold o oh ' +
    'went go goes going come came comes coming made make makes get got also two three many much things thing put took take give gave given told tell set left done found brought bring began become became may yes away back again among another around because whether neither either within without toward towards indeed rather already still though although across along beside besides cannot whoever whatever whenever wherever everyone everything someone something nothing anyone anything none ').split(/\s+/);
  var STOPS = {}; STOP.forEach(function (w) { if (w) STOPS[w] = 1; });
  var NOTNAME = { god: 1, lord: 1, spirit: 1, christ: 1, father: 1, son: 1, holy: 1, most: 1, high: 1, almighty: 1 };
  var cloudCache = {};
  function cloudWords() {
    var key = hm.cb; if (cloudCache[key]) return cloudCache[key];
    var cnt = {}, cap = {}, low = {}, disp = {};
    S.v.forEach(function (x) {
      var b = S.b[x[0]];
      if (hm.cb !== 'all' && !(hm.cb === 'OT' ? Bk.testament(b) === 'OT' : hm.cb === 'NT' ? Bk.testament(b) !== 'OT' : b === hm.cb)) return;
      var toks = x[3].match(/[A-Za-z]+(?:['’][A-Za-z]+)?/g) || [], start = true;
      toks.forEach(function (t, i) {
        var w = t.replace(/['’]s$/i, ''), k = w.toLowerCase();
        if (k.length < 3 || STOPS[k]) return;
        cnt[k] = (cnt[k] || 0) + 1;
        var d = disp[k] || (disp[k] = {}); d[w] = (d[w] || 0) + 1;
        if (/^[A-Z]/.test(w)) { if (i > 0) cap[k] = (cap[k] || 0) + 1; } else low[k] = (low[k] || 0) + 1;
      });
    });
    var list = Object.keys(cnt).map(function (k) {
      var d = disp[k], best = Object.keys(d).sort(function (a, b) { return d[b] - d[a]; })[0];
      return { k: k, w: best, n: cnt[k], name: !low[k] && cap[k] > 0 && !NOTNAME[k] };
    }).sort(function (a, b) { return b.n - a.n; });
    return (cloudCache[key] = list);
  }
  var measureCtx = null;
  function tw(word, fs, bold) { if (!measureCtx) measureCtx = document.createElement('canvas').getContext('2d'); measureCtx.font = (bold ? '600 ' : '500 ') + fs + "px 'Literata', Georgia, serif"; return measureCtx.measureText(word).width; }
  var PAL = ['#8a6d0b', '#8c4646', '#4d5f8f', '#7b5a8a', '#5c7a4a', '#2f7f7a', '#7a5c4a', '#b5541c'];
  function hsh(s) { var h = 0; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); }
  function renderCloud() {
    var sg = stage(); if (!sg) return;
    var all = cloudWords().filter(function (x) { return hm.cshow === 'all' ? true : hm.cshow === 'names' ? x.name : !x.name; }).slice(0, hm.cn);
    var sum = $('vzSum'), foot = $('vzFoot');
    var where = hm.cb === 'all' ? 'all the books in the app' : hm.cb === 'OT' ? 'the Old Testament books in the app' : hm.cb === 'NT' ? 'the New Testament' : bookName(hm.cb);
    sum.innerHTML = all.length ? 'The ' + all.length + ' most used ' + (hm.cshow === 'names' ? 'names' : 'words') + ' in <b>' + esc(where) + '</b>' + (all[0] ? ' · top: <b>' + esc(all[0].w) + '</b> ' + fmt(all[0].n) + '×' : '') : 'No words to show.';
    if (!all.length) { sg.el.innerHTML = ''; return; }
    var W = sg.w, H = sg.h, mx = all[0].n, mn = all[all.length - 1].n, placed = [], out = [];
    var base = Math.sqrt(W * H) / 9;
    for (var tries = 0; tries < 6; tries++) {
      placed = []; out = []; var miss = 0;
      var hiF = Math.min(base * Math.pow(0.86, tries), W / Math.max(4, all[0].w.length) * 1.5), loF = Math.max(9, hiF / 6.5);
      all.forEach(function (x, idx) {
        var t = mx === mn ? 1 : Math.sqrt((x.n - mn) / (mx - mn)), fs = loF + (hiF - loF) * t, bold = idx < 12;
        var rot = idx > 8 && hsh(x.k) % 6 === 0;
        var ww = tw(x.w, fs, bold) + 4, hh = fs * 0.98 + 2, bw = rot ? hh : ww, bh = rot ? ww : hh;
        var ok = false, a = 0, cx = W / 2, cy = H / 2, asp = W / H;
        for (var s = 0; s < 1400; s++) {
          var r = 2.2 * a, px = cx + r * Math.cos(a) * asp - bw / 2, py = cy + r * Math.sin(a) - bh / 2; a += 0.11;
          if (px < 2 || py < 2 || px + bw > W - 2 || py + bh > H - 2) continue;
          var hit = false;
          for (var j = 0; j < placed.length; j++) { var p = placed[j]; if (px < p[0] + p[2] && px + bw > p[0] && py < p[1] + p[3] && py + bh > p[1]) { hit = true; break; } }
          if (!hit) { placed.push([px, py, bw, bh]); out.push({ x: x, fs: fs, bold: bold, rot: rot, cx: px + bw / 2, cy: py + bh / 2 }); ok = true; break; }
        }
        if (!ok) miss++;
      });
      if (miss <= Math.max(2, all.length * 0.04)) break;
    }
    var svg = '<svg class="wc-svg" viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '">' + out.map(function (o) {
      var c = PAL[hsh(o.x.k) % PAL.length];
      return '<text data-wq="' + esc(o.x.k) + '" x="' + o.cx.toFixed(1) + '" y="' + o.cy.toFixed(1) + '" font-size="' + o.fs.toFixed(1) + '" fill="' + c + '" font-weight="' + (o.bold ? 600 : 500) + '"' + (o.rot ? ' transform="rotate(-90 ' + o.cx.toFixed(1) + ' ' + o.cy.toFixed(1) + ')"' : '') + '><title>' + esc(o.x.w + ': ' + fmt(o.x.n) + ' times') + '</title>' + esc(o.x.w) + '</text>';
    }).join('') + '</svg>';
    sg.el.innerHTML = svg;
    if (foot) foot.textContent = 'Bigger words are used more. Common words like “the,” “and” and “unto” are left out. Tap a word to see where it lives across the Bible. Counts use the BSB.';
  }

  // ---------- the Words screen ----------
  function bookOptions() {
    var o = '<option value="all">All books in the app</option><option value="OT">Old Testament</option><option value="NT">New Testament</option>';
    try { manifest.books.forEach(function (b) { o += '<option value="' + b.slug + '">' + esc(b.name) + '</option>'; }); } catch (e) {}
    return o;
  }
  function paintCtl() {
    var on = function (sel, attr, v) { Array.prototype.forEach.call(document.querySelectorAll(sel), function (b) { b.classList.toggle('on', b.dataset[attr] === v); }); };
    on('#vzTabs [data-vt]', 'vt', hm.tab);
    var hb = $('vzHeatBar'), cb = $('vzCloudBar'); if (hb) hb.hidden = hm.tab !== 'heat'; if (cb) cb.hidden = hm.tab !== 'cloud';
    on('#vzHsize [data-sz]', 'sz', hm.size); on('#vzHtst [data-ts]', 'ts', hm.tst);
    on('#vzCshow [data-cs]', 'cs', hm.cshow); on('#vzCn [data-cn]', 'cn', String(hm.cn));
    var f = $('vzHforms'); if (f) f.classList.toggle('on', hm.forms);
    on('#vzHsug [data-q]', 'q', hm.q);
    var sel = $('vzCbook'); if (sel) { if (!sel.options.length) sel.innerHTML = bookOptions(); sel.value = hm.cb; }
    var i = $('vzHq'); if (i && document.activeElement !== i) i.value = hm.q;
  }
  function draw() {
    var sg = stage(); if (!sg) return;
    if (!S) { sg.el.innerHTML = '<p class="vz-load">Loading every verse…</p>'; load().then(function (ok) { if (ok) { count(); draw(); } else sg.el.innerHTML = '<p class="vz-load">The verses could not load. Check your connection.</p>'; }); return; }
    paintCtl();
    if (hm.tab === 'cloud') renderCloud(); else { if (!hm.res) count(); renderHeat(); }
  }
  function heatSearch(q) { hm.q = q; hm.book = null; hm.tab = 'heat'; count(); draw(); }
  var rsT = 0, lastSz = '';
  // the frame widens when the screen turns or the wide view switches on: redraw when the stage itself changes size
  try { new ResizeObserver(function () { var sg = stage(); if (!sg) return; var k = sg.w + 'x' + sg.h; if (k === lastSz) return; lastSz = k; clearTimeout(rsT); rsT = setTimeout(function () { try { if (currentScreen === 'heatmap' && S) draw(); } catch (e) {} }, 120); }).observe($('vzStage') || document.body); } catch (e) {}
  window.addEventListener('resize', function () { clearTimeout(rsT); rsT = setTimeout(function () { try { if (currentScreen === 'heatmap') draw(); } catch (e) {} }, 180); });

  // ---------- Size It Up ----------
  var CUBIT = { common: 1.5, royal: 20.6 / 12 };   // feet
  var ITEMS = [
    { id: 'ark', n: 'Noah’s ark', view: 'side', L: 300, H: 30, W: 50, ref: 'Genesis 6:15', go: ['genesis', 6], q: 'The ark is to be 300 cubits long, 50 cubits wide, and 30 cubits high.',
      note: 'A long box built to float, not a ship with a pointed bow. It was about as long as a modern cruise ferry, and its three decks held about 1.5 million cubic feet.' },
    { id: 'goliath', n: 'Goliath', view: 'side', L: 1.6 / 1.5, H: 6.5, person: true, ref: '1 Samuel 17:4', q: 'He was six cubits and a span in height.',
      note: 'A span is half a cubit. The oldest Hebrew copy from Qumran (4QSam-a) and the Greek Septuagint read “four cubits and a span,” about 6 ft 9 in, which many scholars think is the original.' },
    { id: 'covenant', n: 'The ark of the covenant', view: 'side', L: 2.5, H: 1.5, W: 1.5, ref: 'Exodus 25:10', q: 'Two and a half cubits long, a cubit and a half wide, and a cubit and a half high.',
      note: 'A gold-covered chest of acacia wood, carried on poles. The cherubim on its cover are not counted in the height.' },
    { id: 'og', n: 'Og’s iron bed', view: 'top', L: 9, W: 4, ref: 'Deuteronomy 3:11', q: 'His bed of iron, nine cubits long and four cubits wide.',
      note: 'Og, king of Bashan, was the last of the Rephaim. Some scholars think the “bed” was a basalt sarcophagus or a ritual couch.' },
    { id: 'court', n: 'The tabernacle courtyard', view: 'top', L: 100, W: 50, ref: 'Exodus 27:18', q: 'The entire courtyard shall be a hundred cubits long and fifty cubits wide, with curtains of finely spun linen five cubits high.',
      note: 'A linen fence about 7½ ft high around the tent where God met Israel in the wilderness.' },
    { id: 'temple', n: 'Solomon’s temple', view: 'side', L: 60, H: 30, W: 20, ref: '1 Kings 6:2', q: 'The house that King Solomon built for the LORD was sixty cubits long, twenty cubits wide, and thirty cubits high.',
      note: 'The building itself, not its courts. It was small; most worship happened outside in the courtyards.' },
    { id: 'pillars', n: 'Jachin and Boaz, the temple pillars', view: 'side', L: 12 / Math.PI, H: 18, ref: '1 Kings 7:15', q: 'He cast two pillars of bronze, each eighteen cubits high and twelve cubits in circumference.',
      note: 'Twelve cubits around makes each about 6 ft thick. Second Chronicles 3:15 gives thirty-five cubits for the two together.' },
    { id: 'statue', n: 'Nebuchadnezzar’s golden statue', view: 'side', L: 6, H: 60, ref: 'Daniel 3:1', q: 'King Nebuchadnezzar made a golden statue sixty cubits high and six cubits wide.',
      note: 'Ten times as tall as it was wide: probably a tall pillar or a figure on a high base, set up on the plain of Dura.' },
    { id: 'gallows', n: 'Haman’s gallows', view: 'side', L: 1, H: 50, ref: 'Esther 5:14', q: 'Have them build a gallows fifty cubits high.',
      note: 'Haman built it for Mordecai and was hanged on it himself (Esther 7:10). The word can also mean a pole or stake.' }
  ];
  var THINGS = [
    { id: 'person', n: 'A person (6 ft)', view: 'side', L: 1.6, H: 6, person: true },
    { id: 'bus', n: 'A school bus', view: 'side', L: 40, H: 10.5 },
    { id: 'house', n: 'A two-story house', view: 'side', L: 40, H: 25, house: true },
    { id: 'liberty', n: 'The Statue of Liberty (statue only)', view: 'side', L: 35, H: 151, tall: true },
    { id: 'field', n: 'A football field (with end zones)', view: 'side', L: 360, H: 0.6 },
    { id: 'kbed', n: 'A king-size bed', view: 'top', L: 80 / 12, W: 76 / 12 },
    { id: 'parking', n: 'A parking space', view: 'top', L: 18, W: 9 },
    { id: 'court', n: 'A basketball court', view: 'top', L: 94, W: 50 },
    { id: 'field2', n: 'A football field (with end zones)', view: 'top', L: 360, W: 160 }
  ];
  var DEF = { ark: 'field', goliath: 'person', covenant: 'person', og: 'kbed', court: 'court', temple: 'house', pillars: 'house', statue: 'liberty', gallows: 'house' };
  var su = { item: 'ark', cmp: 'field', cubit: 'common' };
  function ftm(ft) { var m = ft * 0.3048; return (ft >= 20 ? Math.round(ft) : ft.toFixed(1).replace(/\.0$/, '')) + ' ft (' + (m >= 10 ? Math.round(m) : m.toFixed(1).replace(/\.0$/, '')) + ' m)'; }
  function personSvg(x, y, h, cls) {   // a simple standing figure, feet on y, h tall
    var r = h * 0.09, hy = y - h + r;
    return '<g class="' + cls + '"><circle cx="' + x + '" cy="' + hy + '" r="' + r + '"/><path d="M' + x + ' ' + (hy + r) + 'V' + (y - h * 0.42) + 'M' + (x - h * 0.13) + ' ' + (y - h * 0.62) + 'H' + (x + h * 0.13) + 'M' + x + ' ' + (y - h * 0.42) + 'L' + (x - h * 0.09) + ' ' + y + 'M' + x + ' ' + (y - h * 0.42) + 'L' + (x + h * 0.09) + ' ' + y + '"/></g>';
  }
  function renderSize() {
    var box = $('vzSize'); if (!box) return;
    var it = ITEMS.find(function (x) { return x.id === su.item; }) || ITEMS[0], c = CUBIT[su.cubit];
    var things = THINGS.filter(function (t) { return t.view === it.view; });
    if (!things.some(function (t) { return t.id === su.cmp; })) su.cmp = DEF[it.id] && things.some(function (t) { return t.id === DEF[it.id]; }) ? DEF[it.id] : things[0].id;
    var th = THINGS.find(function (t) { return t.id === su.cmp; });
    var A = { L: it.L * c, H: (it.view === 'side' ? it.H : it.W) * c }, B = { L: th.L, H: th.view === 'side' ? th.H : th.W };
    var side = it.view === 'side', Wv = 340, Hv = 230, pad = 14, gap = 18;
    var totalL = A.L + B.L, maxH = Math.max(A.H, B.H, side ? 6 : 0);
    var k = Math.min((Wv - 2 * pad - gap) / totalL, (Hv - 2 * pad - 18) / maxH);
    var ax = pad + (Wv - 2 * pad - gap - totalL * k) / 2, bx = ax + A.L * k + gap, base = Hv - pad - 16;
    var shapeA = it.person ? personSvg(ax + A.L * k / 2, base, A.H * k, 'su-a su-fig') : '<rect class="su-a" x="' + ax + '" y="' + (side ? base - A.H * k : base - A.H * k) + '" width="' + Math.max(1.5, A.L * k) + '" height="' + Math.max(1.5, A.H * k) + '" rx="' + Math.min(4, A.L * k / 6) + '"/>';
    var shapeB = th.person ? personSvg(bx + B.L * k / 2, base, B.H * k, 'su-b su-fig')
      : th.house ? '<path class="su-b" d="M' + bx + ' ' + base + 'V' + (base - B.H * k * 0.68) + 'L' + (bx + B.L * k / 2) + ' ' + (base - B.H * k) + 'L' + (bx + B.L * k) + ' ' + (base - B.H * k * 0.68) + 'V' + base + 'Z"/>'
      : th.tall ? '<path class="su-b" d="M' + (bx + B.L * k * .3) + ' ' + base + 'L' + (bx + B.L * k * .38) + ' ' + (base - B.H * k * .78) + 'L' + (bx + B.L * k * .5) + ' ' + (base - B.H * k * .82) + 'L' + (bx + B.L * k * .62) + ' ' + (base - B.H * k * .78) + 'L' + (bx + B.L * k * .7) + ' ' + base + 'Z M' + (bx + B.L * k * .62) + ' ' + (base - B.H * k * .8) + 'L' + (bx + B.L * k * .66) + ' ' + (base - B.H * k) + '"/>'
      : '<rect class="su-b" x="' + bx + '" y="' + (base - B.H * k) + '" width="' + Math.max(1.5, B.L * k) + '" height="' + Math.max(1.5, B.H * k) + '" rx="' + Math.min(4, B.L * k / 6) + '"/>';
    var person = side && !it.person && !th.person && A.H > 9 ? personSvg(bx + B.L * k + 7 > Wv - 4 ? ax - 6 : bx + B.L * k + 7, base, 6 * k, 'su-p') : '';
    var lab = function (x, w, t, cls) { return '<text class="' + cls + '" x="' + (x + w / 2) + '" y="' + (Hv - 4) + '" text-anchor="middle">' + esc(t) + '</text>'; };
    var svg = '<svg class="su-svg" viewBox="0 0 ' + Wv + ' ' + Hv + '" role="img" aria-label="' + esc(it.n + ' beside ' + th.n) + '">' +
      (side ? '<line class="su-g" x1="4" y1="' + base + '" x2="' + (Wv - 4) + '" y2="' + base + '"/>' : '') + shapeA + shapeB + person +
      lab(ax, A.L * k, it.n.replace(/^The /, ''), 'su-la') + lab(bx, B.L * k, th.n.replace(/ \(.*\)$/, ''), 'su-lb') + '</svg>';
    var dims = side ? (it.person ? 'Height ' + ftm(A.H) : 'Length ' + ftm(A.L) + ' · height ' + ftm(A.H) + (it.W ? ' · width ' + ftm(it.W * c) : ''))
      : 'Length ' + ftm(A.L) + ' · width ' + ftm(A.H);
    var times = A.L && B.L ? (side && (it.person || it.H > it.L) ? A.H / B.H : A.L / B.L) : 0;
    var cmp = times ? (times >= 1.05 ? 'About ' + (times >= 10 ? Math.round(times) : times.toFixed(1)) + ' times as ' + (side && (it.person || it.H > it.L) ? 'tall' : 'long') + ' as ' + th.n.charAt(0).toLowerCase() + th.n.slice(1).replace(/ \(.*\)$/, '') + '.'
      : times <= 0.95 ? 'About ' + Math.round(times * 100) + '% of the ' + (side && (it.person || it.H > it.L) ? 'height' : 'length') + ' of ' + th.n.charAt(0).toLowerCase() + th.n.slice(1).replace(/ \(.*\)$/, '') + '.' : 'About the same size as ' + th.n.charAt(0).toLowerCase() + th.n.slice(1) + '.') : '';
    var inApp = it.go && (function () { try { return Bk.has(it.go[0]); } catch (e) { return false; } })();
    box.innerHTML = '<div class="su-chips">' + ITEMS.map(function (x) { return '<button type="button" class="vz-chip' + (x.id === it.id ? ' on' : '') + '" data-si="' + x.id + '">' + esc(x.n) + '</button>'; }).join('') + '</div>' +
      '<div class="su-stage">' + svg + '</div>' +
      '<div class="su-cmp"><span>Compare with</span>' + things.map(function (t) { return '<button type="button" class="vz-chip sm' + (t.id === th.id ? ' on' : '') + '" data-sc="' + t.id + '">' + esc(t.n.replace(/ \(with end zones\)/, '')) + '</button>'; }).join('') + '</div>' +
      '<div class="su-info"><h3>' + esc(it.n) + '</h3><p class="su-dim">' + esc(dims) + (side ? '' : ' · seen from above') + '</p>' + (cmp ? '<p class="su-x">' + esc(cmp) + '</p>' : '') +
      '<blockquote>“' + esc(it.q) + '” <cite>' + esc(it.ref) + ' (BSB)</cite></blockquote><p>' + esc(it.note) + '</p>' +
      (inApp ? '<button type="button" class="su-read" data-sr="' + it.go[0] + ':' + it.go[1] + '">Read ' + esc(it.ref.split(':')[0]) + ' ›</button>' : '') + '</div>' +
      '<div class="su-cub" id="vzCub"><span>Cubit</span><button type="button" data-cu="common"' + (su.cubit === 'common' ? ' class="on"' : '') + '>Common, about 18 in</button><button type="button" data-cu="royal"' + (su.cubit === 'royal' ? ' class="on"' : '') + '>Royal, about 20.6 in</button></div>' +
      '<p class="vz-note">A cubit was the length from elbow to fingertip. Most sizes here use the common cubit of about 18 inches (46 cm); Ezekiel speaks of a longer cubit, a cubit and a handbreadth (Ezekiel 40:5), which would make everything about 15% bigger.</p>';
  }

  // ---------- More page, routing ----------
  function renderMore() {
    var b = $('vzMoreList'); if (!b || b.dataset.done) return; b.dataset.done = '1';
    var row = function (scr, ic, t, d) { return '<button type="button" class="more-row" data-vz="' + scr + '">' + ic + '<span class="more-t"><b>' + t + '</b><i>' + d + '</i></span><em>›</em></button>'; };
    b.innerHTML = row('heatmap', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="3" width="5" height="5" rx="1"/><rect x="9.5" y="3" width="5" height="5" rx="1" fill="currentColor" opacity=".35"/><rect x="16" y="3" width="5" height="5" rx="1" fill="currentColor"/><rect x="3" y="9.5" width="5" height="5" rx="1" fill="currentColor" opacity=".6"/><rect x="9.5" y="9.5" width="5" height="5" rx="1"/><rect x="16" y="9.5" width="5" height="5" rx="1" fill="currentColor" opacity=".35"/><rect x="3" y="16" width="5" height="5" rx="1"/><rect x="9.5" y="16" width="5" height="5" rx="1" fill="currentColor"/><rect x="16" y="16" width="5" height="5" rx="1"/></svg>', 'Words: heatmap and word cloud', 'See where a word lives across the books, or the words a book uses most.') +
      row('journeys', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M4 19c3-1.5 3-6 8-6s5-4.5 8-7" stroke-dasharray="2.6 2.2"/><circle cx="4" cy="19" r="2" fill="currentColor"/><circle cx="20" cy="6" r="2" fill="currentColor"/></svg>', 'Journeys', 'Follow Abraham, the Exodus, Paul and others stop by stop on the map.');
  }
  document.addEventListener('click', function (ev) {
    var t = ev.target;
    if (!t.closest) return;
    var b;
    if ((b = t.closest('#vzMoreList [data-vz]'))) {
      if (b.dataset.vz === 'journeys') { try { goToScreen('map'); setTimeout(function () { if (window.Journeys) Journeys.open(); }, 120); } catch (e) {} return; }
      try { goToScreen(b.dataset.vz); } catch (e) {} return;
    }
    if ((b = t.closest('#vzHsug [data-q]'))) { heatSearch(b.dataset.q); return; }
    if ((b = t.closest('#vzTabs [data-vt]'))) { hm.tab = b.dataset.vt; draw(); return; }
    if ((b = t.closest('#vzHsize [data-sz]'))) { hm.size = b.dataset.sz; draw(); return; }
    if ((b = t.closest('#vzHtst [data-ts]'))) { hm.tst = b.dataset.ts; hm.book = null; draw(); return; }
    if ((b = t.closest('#vzHforms'))) { hm.forms = !hm.forms; count(); draw(); return; }
    if ((b = t.closest('#vzStage [data-tb]'))) { hm.book = b.dataset.tb; draw(); return; }
    if ((b = t.closest('[data-tback]'))) { hm.book = null; draw(); return; }
    if ((b = t.closest('#vzStage [data-tc]'))) { var c = +b.dataset.tc, v = hm.res && hm.res.first[hm.book + ':' + c] || 1; try { openPassage(hm.book, c, v, false); } catch (e) {} return; }
    if ((b = t.closest('#vzCshow [data-cs]'))) { hm.cshow = b.dataset.cs; draw(); return; }
    if ((b = t.closest('#vzCn [data-cn]'))) { hm.cn = +b.dataset.cn; draw(); return; }
    if ((b = t.closest('#vzStage [data-wq]'))) { heatSearch(b.dataset.wq); return; }
    if ((b = t.closest('#vzSize [data-si]'))) { su.item = b.dataset.si; su.cmp = DEF[su.item]; renderSize(); return; }
    if ((b = t.closest('#vzSize [data-sc]'))) { su.cmp = b.dataset.sc; renderSize(); return; }
    if ((b = t.closest('#vzSize [data-cu]'))) { su.cubit = b.dataset.cu; renderSize(); return; }
    if ((b = t.closest('#vzSize [data-sr]'))) { var q = b.dataset.sr.split(':'); try { openPassage(q[0], +q[1], 1, false); } catch (e) {} return; }
  });
  document.addEventListener('submit', function (ev) { if (ev.target && ev.target.id === 'vzHform') { ev.preventDefault(); var v = ($('vzHq') || {}).value || ''; if (v.trim()) { heatSearch(v.trim()); try { document.activeElement.blur(); } catch (e) {} } } });
  document.addEventListener('change', function (ev) { if (ev.target && ev.target.id === 'vzCbook') { hm.cb = ev.target.value; draw(); } });
  window.Viz = {
    show: function (name) {
      if (name === 'vizmore') renderMore();
      if (name === 'heatmap') {
        var sg = $('vzHsug'); if (sg && !sg.innerHTML) sg.innerHTML = SUGGEST.map(function (w) { return '<button type="button" class="vz-chip sm" data-q="' + w + '">' + w + '</button>'; }).join('');
        requestAnimationFrame(function () { requestAnimationFrame(draw); });
      }
      if (name === 'sizeup') renderSize();
    },
    _hm: hm, _su: su
  };
})();
