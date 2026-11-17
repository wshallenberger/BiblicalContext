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

  // ---------- Word Heatmap ----------
  var SUGGEST = ['love', 'covenant', 'blessed', 'faith', 'grace', 'wisdom', 'fear', 'light', 'blood', 'kingdom', 'heart', 'mercy'];
  var hm = { q: 'love', forms: true, mode: 'rate', sel: null, res: null };
  var ENDS = ['s', 'es', 'ed', 'd', 'ing', 'eth', 'est'];
  function rx(q, forms) {
    var w = q.toLowerCase().replace(/[^a-z' ]/g, '').trim().replace(/\s+/g, ' ');
    if (!w) return null;
    var e = w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // simple endings only for a single word: love → loves, loved, loving (love minus e + ing), loveth
    var stem = e.replace(/e$/, '');
    var body = forms && w.indexOf(' ') < 0 ? '(?:' + e + '(?:' + ENDS.join('|') + ')?|' + stem + 'ing)' : e;
    return { w: w, re: new RegExp("(^|[^A-Za-z'])(" + body + ")(?![A-Za-z])", 'gi') };
  }
  function count() {
    var r = rx(hm.q, hm.forms); if (!r || !S) { hm.res = null; return; }
    var by = {}, ch = {}, found = {}, total = 0;
    S.v.forEach(function (x) {
      r.re.lastIndex = 0; var m, n = 0;
      while ((m = r.re.exec(x[3]))) { n++; found[m[2].toLowerCase()] = (found[m[2].toLowerCase()] || 0) + 1; }
      if (!n) return;
      var b = S.b[x[0]]; by[b] = (by[b] || 0) + n; total += n;
      var k = b + ':' + x[1]; ch[k] = (ch[k] || 0) + n;
    });
    hm.res = { w: r.w, by: by, ch: ch, found: found, total: total };
  }
  function shade(t) { return t <= 0 ? '' : 'background:color-mix(in srgb, var(--gold) ' + Math.round(14 + 86 * Math.sqrt(t)) + '%, var(--ink-raised));' + (t > .45 ? 'color:#fff;' : ''); }
  function renderHeat() {
    var box = $('vzHeat'); if (!box) return;
    if (!S) { box.innerHTML = '<p class="vz-load">Loading every verse…</p>'; load().then(function (ok) { if (ok) { count(); renderHeat(); } else box.innerHTML = '<p class="vz-load">The verses could not load. Check your connection.</p>'; }); return; }
    var R = hm.res, have = {}; (S.b || []).forEach(function (b) { have[b] = 1; });
    var val = function (b) { if (!R || !R.by[b]) return 0; return hm.mode === 'rate' ? R.by[b] / Math.max(1, N[b]) * 1000 : R.by[b]; };
    var max = 0; Object.keys(have).forEach(function (b) { max = Math.max(max, val(b)); });
    var forms = R ? Object.keys(R.found).sort(function (a, b) { return R.found[b] - R.found[a]; }) : [];
    var nb = R ? Object.keys(R.by).length : 0;
    var head = R ? (R.total ? '<p class="vz-sum"><b>' + esc(R.w) + '</b> appears <b>' + fmt(R.total) + '</b> time' + (R.total === 1 ? '' : 's') + ' in ' + nb + ' of the ' + S.b.length + ' books in the app (BSB).' + (forms.length > 1 ? ' Forms counted: ' + forms.map(function (f) { return esc(f) + ' ' + R.found[f]; }).join(', ') + '.' : '') + '</p>'
      : '<p class="vz-sum">No verse in the app uses <b>' + esc(R.w) + '</b>. Try another word, or turn on word forms.</p>') : '';
    var grid = CANON.map(function (g) {
      return '<div class="hx-row"><span class="hx-gl">' + esc(g[0]) + '</span><div class="hx-cells">' + g[1].map(function (b) {
        var s = b[0];
        if (!have[s]) return '<span class="hx-c off" title="' + esc(bookName(s)) + ': not in the app yet"><b>' + esc(b[1]) + '</b><i>·</i></span>';
        var v = val(s), t = max ? v / max : 0, n = R && R.by[s] || 0;
        return '<button type="button" class="hx-c' + (hm.sel === s ? ' sel' : '') + '" data-hb="' + s + '" style="' + shade(t) + '" title="' + esc(bookName(s)) + ': ' + n + '"><b>' + esc(b[1]) + '</b><i>' + (n ? (hm.mode === 'rate' ? (v >= 10 ? Math.round(v) : v < 0.1 ? '<0.1' : v.toFixed(1)) : fmt(n)) : '0') + '</i></button>';
      }).join('') + '</div></div>';
    }).join('');
    var det = '';
    if (R && hm.sel && have[hm.sel]) {
      var s = hm.sel, n = R.by[s] || 0, rate = n / Math.max(1, N[s]) * 1000;
      var chs = Object.keys(R.ch).filter(function (k) { return k.split(':')[0] === s; }).map(function (k) { return [+k.split(':')[1], R.ch[k]]; }).sort(function (a, b) { return b[1] - a[1] || a[0] - b[0]; });
      var unit = s === 'psalms' ? 'Psalm ' : bookName(s) + ' ';
      det = '<div class="hx-det"><div class="hx-dh"><b>' + esc(bookName(s)) + '</b><button type="button" class="hx-dx" data-hx aria-label="Close">&times;</button></div>' +
        (n ? '<p>' + fmt(n) + ' time' + (n === 1 ? '' : 's') + ' · ' + rate.toFixed(1) + ' per 1,000 words · in ' + chs.length + ' chapter' + (chs.length === 1 ? '' : 's') + '</p><div class="hx-chs">' +
          chs.slice(0, 12).map(function (c) { return '<button type="button" data-hc="' + s + ':' + c[0] + '">' + esc(unit + c[0]) + ' <i>' + c[1] + '</i></button>'; }).join('') + '</div>'
          : '<p>Not used in this book.</p>') + '</div>';
    }
    box.innerHTML = head + det + '<div class="hx-grid">' + grid + '</div>' +
      '<p class="vz-note">' + (hm.mode === 'rate' ? 'Shaded by how often the word comes up for every 1,000 words of the book, so long and short books compare fairly.' : 'Shaded by the total count in each book.') +
      ' Dotted squares are books not in the app yet. Counts use the BSB, an English translation, so they follow its wording rather than the Hebrew or Greek.</p>';
  }
  function heatSearch(q) { hm.q = q; hm.sel = null; var i = $('vzHq'); if (i && i.value !== q) i.value = q; paintHeatCtl(); if (S) { count(); renderHeat(); } else renderHeat(); }
  function paintHeatCtl() {
    Array.prototype.forEach.call(document.querySelectorAll('#vzHmode button'), function (b) { b.classList.toggle('on', b.dataset.m === hm.mode); });
    var f = $('vzHforms'); if (f) f.classList.toggle('on', hm.forms);
    Array.prototype.forEach.call(document.querySelectorAll('#vzHsug button'), function (b) { b.classList.toggle('on', b.dataset.q === hm.q); });
  }

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
    b.innerHTML = row('heatmap', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="3" width="5" height="5" rx="1"/><rect x="9.5" y="3" width="5" height="5" rx="1" fill="currentColor" opacity=".35"/><rect x="16" y="3" width="5" height="5" rx="1" fill="currentColor"/><rect x="3" y="9.5" width="5" height="5" rx="1" fill="currentColor" opacity=".6"/><rect x="9.5" y="9.5" width="5" height="5" rx="1"/><rect x="16" y="9.5" width="5" height="5" rx="1" fill="currentColor" opacity=".35"/><rect x="3" y="16" width="5" height="5" rx="1"/><rect x="9.5" y="16" width="5" height="5" rx="1" fill="currentColor"/><rect x="16" y="16" width="5" height="5" rx="1"/></svg>', 'Word Heatmap', 'Type a word and see where it lives across the books of the Bible.') +
      row('sizeup', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 20h18"/><rect x="4" y="11" width="9" height="9" rx="1"/><path d="M17.5 20v-9M17.5 8.2a1.3 1.3 0 1 0 0-.1M15.8 13.5h3.4"/></svg>', 'Size It Up', 'Noah’s ark, Goliath, the temple and more, drawn to scale beside things you know.');
  }
  document.addEventListener('click', function (ev) {
    var t = ev.target;
    if (!t.closest) return;
    var b;
    if ((b = t.closest('#vzMoreList [data-vz]'))) { try { goToScreen(b.dataset.vz); } catch (e) {} return; }
    if ((b = t.closest('#vzHsug [data-q]'))) { heatSearch(b.dataset.q); return; }
    if ((b = t.closest('#vzHmode [data-m]'))) { hm.mode = b.dataset.m; paintHeatCtl(); renderHeat(); return; }
    if ((b = t.closest('#vzHforms'))) { hm.forms = !hm.forms; paintHeatCtl(); count(); renderHeat(); return; }
    if ((b = t.closest('#vzHeat [data-hb]'))) { hm.sel = hm.sel === b.dataset.hb ? null : b.dataset.hb; renderHeat(); var d = document.querySelector('#vzHeat .hx-det'); if (d) d.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); return; }
    if ((b = t.closest('#vzHeat [data-hx]'))) { hm.sel = null; renderHeat(); return; }
    if ((b = t.closest('#vzHeat [data-hc]'))) { var p = b.dataset.hc.split(':'); try { openPassage(p[0], +p[1], 1, false); } catch (e) {} return; }
    if ((b = t.closest('#vzSize [data-si]'))) { su.item = b.dataset.si; su.cmp = DEF[su.item]; renderSize(); return; }
    if ((b = t.closest('#vzSize [data-sc]'))) { su.cmp = b.dataset.sc; renderSize(); return; }
    if ((b = t.closest('#vzSize [data-cu]'))) { su.cubit = b.dataset.cu; renderSize(); return; }
    if ((b = t.closest('#vzSize [data-sr]'))) { var q = b.dataset.sr.split(':'); try { openPassage(q[0], +q[1], 1, false); } catch (e) {} return; }
  });
  document.addEventListener('submit', function (ev) { if (ev.target && ev.target.id === 'vzHform') { ev.preventDefault(); var v = ($('vzHq') || {}).value || ''; if (v.trim()) heatSearch(v.trim()); } });
  window.Viz = {
    show: function (name) {
      if (name === 'vizmore') renderMore();
      if (name === 'heatmap') {
        var sg = $('vzHsug'); if (sg && !sg.innerHTML) sg.innerHTML = SUGGEST.map(function (w) { return '<button type="button" class="vz-chip sm" data-q="' + w + '">' + w + '</button>'; }).join('');
        var i = $('vzHq'); if (i && !i.value) i.value = hm.q;
        paintHeatCtl(); if (S && !hm.res) count(); renderHeat();
      }
      if (name === 'sizeup') renderSize();
    },
    _hm: hm, _su: su
  };
})();
