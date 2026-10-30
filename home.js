/* Home, the Study and Visualize tab strips, and the bottom bar logic.
 *
 * Bottom bar:   Read · Study · Home (centre) · Visualize · More
 * Study  =  Chapter study (Deep Dive landing) | Parallels | Saved        (a tab strip on each of those screens)
 * Visualize = Timeline | Map | Connections | Family tree                 (a tab strip on each of those screens)
 * Search is a magnifier on every strip, on the Read header and on Home.
 *
 * Home is a stack of cards the reader chooses, orders and switches on or off (Customize Home).
 * Everything is kept in this browser only (localStorage key "vi_home_v1"); nothing is sent anywhere.
 *
 * Hooks used by the rest of the app:
 *   Home.go(prev, name)    called by goToScreen as soon as the screen changes
 *   Home.group(name)       which bottom-bar button a screen belongs to
 *   Home.nav(which)        a tap on the Study or Visualize button
 *   Home.back(name, fb)    where a page's back button should go, and what it should say
 *   Home.render()          draws the Home screen        Home.renderCust()   draws Customize Home
 *   Home.readQuick(on)     the plan and saved shortcuts at the top of the Read book list
 *   Home.notePar(id)       remembers the last Gospel story opened
 */
(function () {
  'use strict';
  var KEY = 'vi_home_v1';
  var $ = function (id) { return document.getElementById(id); };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  // ---------- which bar button a screen belongs to ----------
  var GROUP = { read: 'read', booknav: 'read', plans: 'read', search: 'read',
    divehome: 'study', deepdive: 'study', parallels: 'study', glossary: 'study', commentary: 'study', saved: 'more',
    timeline: 'visualize', map: 'visualize', genealogy: 'visualize',
    home: 'home', homecust: 'home', more: 'more', settings: 'more', music: 'more' };
  var LABEL = { read: 'Read', booknav: 'Read', home: 'Home', more: 'More', divehome: 'Study', deepdive: 'Study', parallels: 'Compare',
    saved: 'Saved', glossary: 'Glossary', commentary: 'Commentary', plans: 'Plans', timeline: 'Timeline', map: 'Map', genealogy: 'Family tree', settings: 'Settings', music: 'Music', homecust: 'Customize Home' };
  var STUDY = ['divehome', 'parallels', 'glossary', 'commentary'], VISUAL = ['timeline', 'map', 'genealogy'];
  var origin = {};                    // screen -> the screen the reader came from
  var lastStudy = 'divehome', lastVisual = 'timeline';

  // ---------- settings ----------
  var CARDS = [
    ['votd', 'Verse or Bible Clock', 'The top card. Pick a verse for the day, or a clock that tells the time in Scripture.', 'full'],
    ['left', 'Continue Reading', 'Jump back into the chapter you were reading.', 'half'],
    ['plan', 'Current reading plan', 'The next day of the plan you are on.', 'half'],
    ['discover', 'Learn something new', 'A feed to scroll through: places, paintings, archaeology, history, customs, verses and more.', 'full'],
    ['saves', 'Saved verses', 'Your latest favorites, bookmarks and highlights.', 'full'],
    ['study', 'Keep studying', 'Pick up a chapter study or a Gospel story.', 'full'],
    ['tools', 'Quick tools', 'Shortcuts to search, the map, the timeline and more.', 'full']
  ];
  var KINDS = [['scripture', 'Scriptures'], ['place', 'Places and photos'], ['art', 'Paintings'], ['dig', 'Archaeology'], ['history', 'History, customs and setting'], ['voice', 'Commentary'], ['person', 'People'], ['moment', 'Moments on the timeline'], ['story', 'Gospel stories'], ['word', 'Greek words']];
  var DEFAULT = {
    v: 2, hero: 'clock', order: ['votd', 'left', 'plan', 'discover', 'saves', 'study', 'tools'],
    on: { votd: 1, left: 1, plan: 1, discover: 1, saves: 0, study: 0, tools: 0 },
    kinds: { scripture: 1, place: 1, art: 1, dig: 1, history: 1, voice: 1, person: 1, moment: 1, story: 1, word: 1 }, open: 'home', par: ''
  };
  var PRESETS = {
    welcome: { name: 'Welcome', d: 'A verse, your place, your plan and something new.', order: ['votd', 'left', 'plan', 'discover', 'saves', 'study', 'tools'], on: ['votd', 'left', 'plan', 'discover'] },
    simple: { name: 'Simple', d: 'A verse, and where you left off.', order: ['votd', 'left', 'plan', 'discover', 'saves', 'study', 'tools'], on: ['votd', 'left', 'plan'] },
    study: { name: 'Study', d: 'Your studies and saved verses close by.', order: ['left', 'plan', 'study', 'saves', 'votd', 'discover', 'tools'], on: ['left', 'plan', 'study', 'saves'] },
    discover: { name: 'Discover', d: 'A verse and plenty to explore.', order: ['votd', 'discover', 'left', 'plan', 'saves', 'study', 'tools'], on: ['votd', 'discover', 'left'] }
  };
  var cfg = null, storageOk = true;
  function load() {
    if (cfg) return cfg;
    var s = null;
    try { s = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { s = null; }
    cfg = JSON.parse(JSON.stringify(DEFAULT));
    if (s && typeof s === 'object') {
      if (s.v === 2) {
        if (Array.isArray(s.order)) {
          var seen = {}, o = [];
          s.order.forEach(function (k) { if (CARDS.some(function (c) { return c[0] === k; }) && !seen[k]) { seen[k] = 1; o.push(k); } });
          DEFAULT.order.forEach(function (k) { if (!seen[k]) o.push(k); });
          cfg.order = o;
        }
        if (s.on && typeof s.on === 'object') CARDS.forEach(function (c) { if (c[0] in s.on) cfg.on[c[0]] = s.on[c[0]] ? 1 : 0; });
        if (s.kinds && typeof s.kinds === 'object') KINDS.forEach(function (k) { if (k[0] in s.kinds) cfg.kinds[k[0]] = s.kinds[k[0]] ? 1 : 0; });
      }
      if (s.hero === 'clock' || s.hero === 'votd') cfg.hero = s.hero;
      if (s.open === 'left' || s.open === 'home') cfg.open = s.open;
      if (typeof s.par === 'string') cfg.par = s.par;
    }
    return cfg;
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(cfg)); storageOk = true; } catch (e) { storageOk = false; }
  }

  // ---------- small helpers ----------
  function bookName(slug) {
    try { var b = manifest.books.filter(function (x) { return x.slug === slug; })[0]; if (b) return b.name; } catch (e) {}
    return String(slug || '').replace(/\b[a-z]/g, function (x) { return x.toUpperCase(); });
  }
  function pos() {
    var p = null;
    try { p = JSON.parse(localStorage.getItem('foreverBiblePos') || 'null'); } catch (e) {}
    var b = (p && p.book) || (typeof currentBook !== 'undefined' ? currentBook : 'matthew');
    var c = (p && p.chapter) || (typeof currentChapterNum !== 'undefined' ? currentChapterNum : 1);
    return { b: b, c: Number(c) || 1 };
  }
  var cache = {};
  function getJSON(path) {
    if (!cache[path]) cache[path] = fetch(path).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; });
    return cache[path];
  }
  var ICON = {
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/></svg>',
    pen: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="M13.5 6.5l4 4"/></svg>',
    up: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 15l6-6 6 6"/></svg>',
    down: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>',
    shuffle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7h3.5c5 0 5 10 10 10H21M18 14l3 3-3 3M3 17h3.5c1.6 0 2.7-.8 3.6-1.9M13.9 8.9C14.8 7.8 15.7 7 17.5 7H21M18 4l3 3-3 3"/></svg>'
  };

  // ---------- tab strips for Study and Visualize ----------
  var TABS = {
    study: [['divehome', 'Deep Dive'], ['commentary', 'Commentary'], ['parallels', 'Compare'], ['glossary', 'Glossary']],
    visualize: [['timeline', 'Timeline'], ['map', 'Map'], ['connections', 'Connections'], ['genealogy', 'Family tree']]
  };
  function stripHtml(kind) {
    return TABS[kind].map(function (t) { return '<button type="button" class="hs-tab" data-hs="' + t[0] + '" role="tab">' + t[1] + '</button>'; }).join('') +
      (kind === 'study' ? '' : '<button type="button" class="hs-search" data-search aria-label="Search the Gospels">' + ICON.search + '</button>');
  }
  function buildStrips() {
    [['study', STUDY], ['visualize', VISUAL]].forEach(function (g) {
      g[1].forEach(function (name) {
        var scr = $('screen-' + name); if (!scr || scr.querySelector('.hubseg')) return;
        var d = document.createElement('div'); d.className = 'hubseg'; d.setAttribute('role', 'tablist'); d.dataset.kind = g[0];
        d.innerHTML = stripHtml(g[0]);
        scr.insertBefore(d, scr.firstChild);
      });
    });
  }
  function curTab(name) {
    if (name === 'deepdive') return 'divehome';
    if (name === 'timeline') { var m = 'line'; try { m = tlViewMode; } catch (e) {} return m === 'threads' ? 'connections' : 'timeline'; }
    return name;
  }
  function paintStrips(name) {
    var cur = curTab(name);
    if (VISUAL.indexOf(name) >= 0) lastVisual = cur;
    Array.prototype.forEach.call(document.querySelectorAll('.hubseg .hs-tab'), function (b) {
      var on = b.dataset.hs === cur; b.classList.toggle('on', on); b.setAttribute('aria-selected', on ? 'true' : 'false');
    });
  }
  function openSub(t, fresh, detail) {
    if (t === 'parallels' && fresh) { try { Par.reset(); } catch (e) {} }
    if (t === 'commentary' && fresh) { try { Cm.home(); } catch (e) {} }
    if (t === 'glossary' && fresh) { try { Gl.home(); } catch (e) {} }
    if (t === 'divehome') {
      try { dhPick = null; } catch (e) {}
      goToScreen('divehome'); try { renderDiveHome(); } catch (e) {}
      var dh = $('diveHome'); if (dh) { dh.scrollTop = 0; requestAnimationFrame(function () { dh.scrollTop = 0; }); }
    } else if (t === 'connections') {
      goToScreen('timeline'); try { tlSetView('threads'); } catch (e) {}
    } else if (t === 'timeline') {
      try { if (detail && !tlBuilt) { tlLv = 1; tlViewMode = 'line'; localStorage.setItem('vi_tl_lv3', '1'); } } catch (e) {}
      goToScreen('timeline');
      try { if (detail) tlGoLevel(1); else if (tlViewMode === 'threads') tlSetView('line'); } catch (e) {}
    } else if (t === 'genealogy') { try { Gen.open('timeline'); } catch (e) { goToScreen('genealogy'); } }
    else goToScreen(t);
  }
  function inTour() { try { return !!tour; } catch (e) { return false; } }

  // ---------- Read: plan and saved shortcuts above the book list ----------
  function readQuick(on) {
    var q = $('rdQuick'); if (!q) return;
    q.hidden = !on; if (!on) return;
    var saved = 0; try { var n = Saved.counts(); saved = n.fav + n.bm + n.hl; } catch (e) {}
    var I = {
      plan: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4M16 3v4M4 10h16M9 15l2 2 4-4"/></svg>',
      plans: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h16M4 12h16M4 18h10"/></svg>',
      saved: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h12v18l-6-4-6 4V3Z"/></svg>'
    };
    function tile(cls, icon, title, sub, attrs) {
      return '<button type="button" class="rq-t ' + cls + '" ' + attrs + '><span class="rq-i">' + icon + '</span><b>' + esc(title) + '</b><i>' + esc(sub) + '</i></button>';
    }
    function paint(t) {
      var p = pos(), nm = bookName(p.b);
      var cont = tile('rq-t1', KICON.scripture, 'Continue Reading', nm + ' ' + p.c, 'data-hm="read" data-b="' + esc(p.b) + '" data-c="' + p.c + '"');
      var pl = t ? tile('rq-t2', I.plans, 'Reading Plans', 'Day ' + t.day + ' · ' + t.title, 'data-hmgo="plans"')
                 : tile('rq-t2', I.plans, 'Reading Plans', 'Browse and start one', 'data-hmgo="plans"');
      q.innerHTML = '<div class="rq-grid">' + cont + pl +
        tile('rq-t3', I.saved, 'Saved scriptures', saved ? saved + ' saved' : 'Favorites and highlights', 'data-hmgo="saved"') + '</div>';
    }
    paint(null);
    try { Plans.today().then(paint); } catch (e) {}
  }

  // ---------- the Home screen ----------
  // Verses for "Verse of the day" and the scripture slides: [book, chapter, first verse, last verse]
  var VOTD = [['john',3,16,17],['matthew',11,28,30],['luke',2,10,11],['john',14,27,27],['mark',10,27,27],['matthew',6,33,34],['john',8,12,12],['luke',1,37,37],['john',15,9,11],['matthew',5,14,16],
    ['john',10,10,11],['luke',12,32,32],['mark',9,23,24],['matthew',7,7,8],['john',1,1,1],['luke',15,7,7],['john',6,35,35],['matthew',28,19,20],['luke',6,36,36],['john',16,33,33],
    ['mark',12,30,31],['matthew',14,27,27],['luke',11,9,10],['john',13,34,35],['mark',4,39,39],['matthew',5,3,6],['john',11,25,26],['luke',10,27,27],['john',4,14,14],['matthew',19,26,26],
    ['luke',2,14,14],['john',1,14,14],['matthew',6,26,26],['john',15,5,5],['mark',1,15,15],['luke',19,10,10],['john',14,6,6],['matthew',22,37,39],['mark',10,45,45],['luke',12,34,34],
    ['john',8,32,32],['matthew',18,20,20],['john',1,4,5],['luke',9,23,23],['mark',11,24,24],['matthew',5,44,45],['john',10,27,28],['john',14,1,1],['john',20,29,29],['matthew',16,26,26],
    ['luke',1,46,47],['john',15,12,13],['mark',2,17,17],['matthew',10,29,31],['john',17,3,3],['luke',6,31,31],['john',4,24,24],['mark',8,34,35],['luke',12,15,15],['john',1,12,12],
    ['matthew',7,12,12],['john',6,37,37],['luke',23,34,34],['mark',6,31,31],['matthew',6,19,21],['john',20,31,31],['luke',10,41,42],['john',5,24,24],['mark',5,36,36],['matthew',9,37,38],
    ['luke',2,52,52],['john',7,38,38],['matthew',5,9,9],['luke',18,27,27],['john',1,29,29],['mark',10,14,15],['luke',12,6,7],['john',14,15,15],['matthew',4,4,4],['luke',6,45,45]];
  function dayNum() { var d = new Date(); return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5); }
  function votdRef(offset) { var n = dayNum() + (offset || 0); return VOTD[((n % VOTD.length) + VOTD.length) % VOTD.length]; }
  function verseText(r) {      // resolves { text, ref }
    return getJSON('data/' + r[0] + '/' + r[1] + '.json').then(function (d) {
      if (!d || !d.verses) return null;
      var t = d.verses.filter(function (v) { return v.num >= r[2] && v.num <= r[3]; }).map(function (v) { return v.text; }).join(' ').replace(/\s+/g, ' ').trim();
      if (!t) return null;
      var q = (t.match(/"/g) || []).length;           // a verse cut out of a longer quotation can carry one stray quote mark
      if (q % 2 === 1) {                               // a lone quote mark: its other half is in the next or the previous verse
        if (/"$/.test(t)) t = t.slice(0, -1);          // closes a quotation that began before this verse
        else if (/^"/.test(t)) t = t.slice(1);         // opens one that carries on after it
        else t += '"';                                 // a quotation opened part way in: close it for the excerpt
      }
      // quotes inside our own curly quotes become single ones, and a quote inside those becomes double again
      t = t.replace(/(^|[\s(\u2018"])'(?=\w)/g, '$1\u201C').replace(/([.!?,;:\w])'(?=\s|$|"|\u2019)/g, '$1\u201D');
      var inq = false; t = t.replace(/"/g, function () { inq = !inq; return inq ? '\u2018' : '\u2019'; });
      return { text: t, ref: bookName(r[0]) + ' ' + r[1] + ':' + r[2] + (r[3] > r[2] ? '–' + r[3] : '') };
    });
  }
  function greeting() { var h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; }
  var KICON = {
    scripture: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"/></svg>',
    place: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z"/><circle cx="12" cy="10" r="2.3"/></svg>',
    dig: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3h6M10 3v3c-3 1-4 4-4 7 0 4 2 8 6 8s6-4 6-8c0-3-1-6-4-7V3"/><path d="M7 11h10"/></svg>',
    person: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="3.6"/><path d="M5 20c.6-4 3.4-6 7-6s6.4 2 7 6"/></svg>',
    moment: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></svg>',
    story: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h13M13 4l4 4-4 4"/><path d="M20 16H7M11 12l-4 4 4 4"/></svg>',
    history: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 21h16M6 21V10M10 21V10M14 21V10M18 21V10M3 10l9-6 9 6"/></svg>',
    custom: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M7 3h10l-1 6a4 4 0 0 1-8 0L7 3Z"/><path d="M12 13v8M8 21h8"/></svg>',
    ot: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l-6 6 6 6M15 6l6 6-6 6" opacity="0"/><path d="M15 5l-7 7 7 7"/></svg>',
    voice: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h16v11H9l-5 4V5Z"/><path d="M8 9.5h8M8 12.5h5"/></svg>',
    art: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="1.8"/><path d="M21 16l-5-5-8 8"/></svg>',
    word: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4C8 4 5 7.5 5 12s3 8 7 8 7-3.5 7-8-3-8-7-8Z" opacity="0"/><path d="M6 20c3-1 4-4 4-8 0-3 1-6 4-6 2 0 3.200 1 3.800 2.500M7.500 12h6"/></svg>'
  };
  function cardShell(key, kicker, inner, link) {
    return '<section class="hm-card hm-' + key + '"><div class="hm-k"><span>' + esc(kicker) + '</span>' + (link ? '<button type="button" class="hm-link" ' + link[1] + '>' + esc(link[0]) + ' ›</button>' : '') + '</div>' + inner + '</section>';
  }
  var drawers = {
    votd: function () {
      if (load().hero === 'clock') {
        return '<section class="hm-hero hm-clock" id="hmClock">' + motif(5, false) + '<div class="hm-hero-in">' +
          '<span class="hm-pill">Bible Clock</span><div class="hm-ck"><span class="hm-ck-bk" id="hmCkBk">&nbsp;</span><div class="hm-ck-num" id="hmCkNum">&nbsp;</div><span class="hm-ck-ap" id="hmCkAp">&nbsp;</span>' +
          '<blockquote class="hm-ck-vt" id="hmCkVt"></blockquote><p class="hm-vr" id="hmCkRef"></p></div>' +
          '<button type="button" class="hm-ctx" id="hmCkCtx" hidden>Read in context</button></div><i class="hm-ck-sec" id="hmCkSec"></i></section>';
      }
      return '<section class="hm-hero" id="hmVotd">' + motif(dayNum(), false) + '<div class="hm-hero-in">' +
        '<span class="hm-pill">Verse of the day</span><div class="hm-vmid"><blockquote class="hm-vt" id="hmVt">&nbsp;</blockquote><p class="hm-vr" id="hmVr"></p></div>' +
        '<button type="button" class="hm-ctx" id="hmVctx" hidden>Read in context</button></div></section>';
    },
    left: function () {
      var p = pos(), nm = bookName(p.b);
      return '<button type="button" class="hm-mini hm-m-left" data-hm="read" data-b="' + esc(p.b) + '" data-c="' + p.c + '"><span class="hm-mi">' + KICON.scripture + '</span><span class="hm-mk">Continue Reading</span><b>' + esc(nm) + ' ' + p.c + '</b><i>Where you left off</i><em>›</em></button>';
    },
    plan: function () {
      return '<button type="button" class="hm-mini hm-m-plan" id="hmPlan" data-hmgo="plans"><span class="hm-mi">' + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4M16 3v4M4 10h16M9 15l2 2 4-4"/></svg>' + '</span><span class="hm-mk">Current reading plan</span><b>&nbsp;</b><i>&nbsp;</i></button>';
    },
    study: function () { return cardShell('study', 'Keep studying', '<div class="hm-list" id="hmStudy"></div>', ['Study', 'data-hm="openstudy"']); },
    saves: function () { return cardShell('saves', 'Saved verses', '<div class="hm-list" id="hmSaves"></div>', ['See all', 'data-hmgo="saved"']); },
    discover: function () {
      return '<section class="hm-learn"><div class="hm-lh"><div><span>Learn something new</span><small>Swipe left or right for more</small></div><button type="button" class="hm-shuf" data-hm="shuffle" aria-label="Show me something different">' + ICON.shuffle + '</button></div>' +
        '<div class="hm-feed" id="hmFeed" tabindex="0" aria-label="Scroll for more to learn"><p class="hm-sub hm-wait">Finding something for you…</p></div></section>';
    },
    tools: function () {
      var t = [['search', 'Search', 'data-search'], ['parallels', 'Compare', 'data-hmgo="parallels"'], ['glossary', 'Glossary', 'data-hmgo="glossary"'], ['family', 'Family tree', 'data-genea'],
        ['map', 'Map', 'data-hmgo="map"'], ['timeline', 'Timeline', 'data-hmgo="timeline"'], ['conn', 'Connections', 'data-hmgo="connections"'], ['plans', 'Reading plans', 'data-hmgo="plans"'], ['saved', 'Saved', 'data-hmgo="saved"']];
      return cardShell('tools', 'Quick tools', '<div class="hm-chips">' + t.map(function (x) { return '<button type="button" class="hm-chip" ' + x[2] + '>' + esc(x[1]) + '</button>'; }).join('') + '</div>');
    }
  };

  // ---------- Learn something new: a feed to scroll through ----------
  // Quiet line drawings that sit behind a verse. One per day on the Verse of the day, one per card in the feed.
  var MOTIFS = [
    '<path d="M0 74H200"/><path d="M72 74a28 28 0 0 1 56 0"/><path d="M30 84H170" opacity=".6"/>',
    '<path d="M0 70Q40 44 82 66T160 60T200 66"/><path d="M0 86Q50 62 100 82T200 76" opacity=".7"/>',
    '<path d="M100 0V26M72 2L84 24M128 2L116 24M46 8L66 28M154 8L134 28"/>',
    '<path d="M0 66q12-7 25 0t25 0 25 0 25 0 25 0 25 0 25 0 25 0"/><path d="M0 78q12-7 25 0t25 0 25 0 25 0 25 0 25 0 25 0 25 0" opacity=".7"/><path d="M0 90q12-7 25 0t25 0 25 0 25 0 25 0 25 0 25 0 25 0" opacity=".45"/>',
    '<circle cx="40" cy="22" r="1.2"/><circle cx="150" cy="14" r="1.2"/><circle cx="176" cy="44" r="1.2"/><circle cx="22" cy="58" r="1.2"/><circle cx="108" cy="34" r="5"/><circle cx="108" cy="34" r="9" opacity=".5"/>',
    '<path d="M14 92Q80 80 186 36"/><path d="M56 83q2-13 15-14-1 12-15 14Z"/><path d="M92 74q2-13 15-14-1 12-15 14Z"/><path d="M128 62q2-13 15-14-1 12-15 14Z"/><path d="M70 82q8 9 20 6-6-9-20-6Z"/><path d="M110 70q8 9 20 6-6-9-20-6Z"/>'
  ];
  function motif(i, top) { return '<svg class="hm-mo' + (top || i === 2 ? ' top' : '') + '" viewBox="0 0 200 100" preserveAspectRatio="xMidYMax slice" fill="none" stroke="currentColor" stroke-width=".7" stroke-linecap="round" aria-hidden="true">' + MOTIFS[((i % MOTIFS.length) + MOTIFS.length) % MOTIFS.length] + '</svg>'; }

  var shuffleN = 0;
  function seed() { return dayNum() + shuffleN * 37; }
  function rng(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function shuffled(arr, salt) { var r = rng(salt), a = arr.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  var feed = { html: '', top: 0, ord: {}, ptr: {}, round: {}, last: '', busy: false, n: 0, cnt: 0, fills: 0 };
  function feedReset() { var o = $('hmFeed'); if (o) o.innerHTML = ''; feed = { html: '', top: 0, ord: {}, ptr: {}, round: {}, last: '', busy: false, n: 0, cnt: 0, fills: 0 }; }
  // the next item of a pool: every item is shown once, in a day-seeded order, before any repeats
  function nextOf(kind, pool) {
    if (!pool || !pool.length) return null;
    if (!feed.ord[kind] || feed.ptr[kind] >= feed.ord[kind].length) {
      feed.round[kind] = (feed.round[kind] || 0) + 1;
      var idx = pool.map(function (x, i) { return i; });
      feed.ord[kind] = shuffled(idx, seed() * 977 + kind.length * 131 + feed.round[kind] * 7919 + kind.charCodeAt(0)); feed.ptr[kind] = 0;
    }
    return pool[feed.ord[kind][feed.ptr[kind]++]];
  }
  function imgOf(ids) {
    try { for (var i = 0; ids && i < ids.length; i++) { var im = MAPIMG[ids[i]]; if (im) return im; } } catch (e) {}
    return null;
  }
  function wm(im, w) { try { return mapImgUrl(im, w || 760); } catch (e) { return ''; } }
  function parseRef(r) { var p = Bk.parse(r); return p && p.v ? p : null; }
  function btn(label, attrs, alt) { return '<button type="button" class="lc-go' + (alt ? ' alt' : '') + '" ' + attrs + '>' + esc(label) + ' ›</button>'; }
  function verseBtn(b, c, v, label) { return btn(label || 'Read in context', 'data-hm="verse" data-b="' + esc(b) + '" data-c="' + c + '" data-v="' + v + '"'); }
  function photoCard(kind, kicker, title, body, src, credit, actions, pos) {
    // a picture card: the picture fills the card; the words sit in a slim band at the bottom (under a fifth of the card) with the rest behind "More"
    var more = body ? '<button type="button" class="lc-go alt lc-more" aria-expanded="false">More ▾</button>' : '';
    return '<article class="lc lc-photo lc-' + kind + '"><img class="lc-bg" src="' + esc(src) + '" alt="" loading="lazy"' + (pos ? ' style="object-position:' + pos + '"' : '') + ' onerror="this.closest(\'.lc\').classList.add(\'bad\');this.remove()">' +
      '<span class="lc-scrim"></span><div class="lc-top"><span class="lc-k">' + esc(kicker) + '</span>' + (credit ? '<span class="lc-cr">' + esc(credit) + '</span>' : '') + '</div>' +
      '<div class="lc-in"><h4>' + esc(title) + '</h4>' + (body ? '<p>' + esc(body) + '</p>' : '') +
      '<div class="lc-a">' + (actions || '') + more + '</div></div></article>';
  }
  function textCard(kind, kicker, title, body, actions, extra) {
    return '<article class="lc lc-text lc-' + kind + '">' + motif(feed.cnt++) + '<span class="lc-ic">' + (KICON[kind] || KICON.scripture) + '</span><div class="lc-in"><span class="lc-k">' + esc(kicker) + '</span><h4>' + (extra && extra.rawTitle ? title : esc(title)) + '</h4>' +
      (body ? '<p>' + esc(body) + '</p>' : '') + (actions ? '<div class="lc-a">' + actions + '</div>' : '') + '</div></article>';
  }
  var learnP = null;
  function loadLearn() { return learnP || (learnP = getJSON('data/learn.json').then(function (d) { return Array.isArray(d) ? d : []; })); }
  function chapName(e) { return bookName(e.b) + ' ' + e.c; }
  var eventsByImg = null;
  function eventForImage(key) {
    return getJSON('data/events.json').then(function (ev) {
      if (!eventsByImg) { eventsByImg = {}; (ev || []).forEach(function (e) { (e.im || []).forEach(function (k) { if (!eventsByImg[k] && e.r && e.r[0]) eventsByImg[k] = e; }); }); }
      return eventsByImg[key] || null;
    });
  }
  var makers = {
    scripture: function () {
      var r = nextOf('scripture', VOTD), n = feed.cnt++;
      return verseText(r).then(function (v) {
        if (!v) return null;
        var L = v.text.length, sz = L > 520 ? ' xs' : L > 330 ? ' sm' : L > 190 ? ' md' : '';
        return '<article class="lc lc-verse' + sz + '">' + motif(n + 3) + '<div class="lc-vm"><blockquote>' + esc('“' + v.text + '”') + '</blockquote><p class="lc-vr">' + esc(v.ref) + '</p></div><div class="lc-a">' + verseBtn(r[0], r[1], r[2]) + '</div></article>';
      });
    },
    place: function () {
      return Promise.all([getJSON('data/events.json'), loadMapImages()]).then(function (r) {
        var pool = (r[0] || []).filter(function (e) { return e.s && e.r && e.r[0] && imgOf(e.im); });
        var e = nextOf('place', pool); if (!e) return null;
        var im = imgOf(e.im);
        return photoCard('place', 'A place · ' + (e.p || ''), e.t, e.s, wm(im), im.c || '',
          verseBtn(e.r[0][0], e.r[0][1], e.r[0][2], 'Read the passage') + btn('On the map', 'data-hm="map" data-la="' + e.la + '" data-ln="' + e.ln + '" data-name="' + esc(e.p || e.t) + '"', true));
      });
    },
    art: function () {
      return loadMapImages().then(function () {
        var keys = Object.keys(MAPIMG).filter(function (k) { return MAPIMG[k].k === 'art' && MAPIMG[k].f; });
        var key = nextOf('art', keys); if (!key) return null;
        var im = MAPIMG[key];
        return eventForImage(key).then(function (e) {
          var act = e ? verseBtn(e.r[0][0], e.r[0][1], e.r[0][2], 'Read the passage') : '';
          return photoCard('art', 'A painting' + (e && e.p ? ' · ' + e.p : ''), im.c || im.n || 'Painting', e ? e.s : '', wm(im, 800), im.a || '', act, '50% 30%');
        });
      });
    },
    dig: function () {
      return Promise.all([loadLibs(), loadMapImages()]).then(function () {
        var x = nextOf('dig', SITES.filter(function (s) { return s.w && imgOf(s.im); })); if (!x) return null;
        var place = String(x.pl || '').split(',')[0], im = imgOf(x.im), k = 'Archaeology' + (place ? ' · ' + place : '');
        var act = btn('Read more', 'data-hm="site" data-id="' + esc(x.i) + '"');
        return im ? photoCard('dig', k, x.n, x.w, wm(im), im.c || '', act) : textCard('dig', k, x.n, x.w, act);
      }).catch(function () { return null; });
    },
    history: function () {
      return loadLearn().then(function (L) {
        var pool = [];
        L.forEach(function (e) {
          if (e.set) pool.push({ t: 'set', e: e });
          (e.his || []).forEach(function (x) { pool.push({ t: 'his', e: e, x: x }); });
          (e.cus || []).forEach(function (x) { pool.push({ t: 'cus', e: e, x: x }); });
          (e.ot || []).forEach(function (x) { pool.push({ t: 'ot', e: e, x: x }); });
        });
        var it = nextOf('history', pool); if (!it) return null;
        var e = it.e, study = btn('Study ' + chapName(e), 'data-hm="deep" data-b="' + e.b + '" data-c="' + e.c + '"');
        if (it.t === 'set') {
          if (e.im) return loadMapImages().then(function () { return photoCard('history', 'Where it happens · ' + chapName(e), e.t, e.set, wm({ u: e.im.u }, 800), e.im.c, study, '50% 30%'); });
          return textCard('history', 'Where it happens · ' + chapName(e), e.t, e.set, study);
        }
        if (it.t === 'his') return textCard('history', 'The history behind it · ' + chapName(e), it.x.h, it.x.t, study);
        if (it.t === 'cus') return textCard('custom', 'A custom you might miss · ' + chapName(e), it.x.h, it.x.t, study);
        return textCard('ot', 'Looking back · ' + chapName(e), it.x.r, it.x.n, study);
      });
    },
    voice: function () {
      return loadLearn().then(function (L) {
        var pool = []; L.forEach(function (e) { (e.cm || []).forEach(function (x) { pool.push({ e: e, x: x }); }); });
        var it = nextOf('voice', pool); if (!it) return null;
        return textCard('voice', 'A commentator on ' + chapName(it.e) + (it.x.y ? ' · ' + it.x.y : ''), it.x.s, it.x.n, btn('More commentary', 'data-hm="cm" data-b="' + it.e.b + '" data-c="' + it.e.c + '"'));
      });
    },
    person: function () {
      return loadLibs().then(function () {
        var x = nextOf('person', PEOPLE.filter(function (p) { return p.bio && p.k === 'person'; })); if (!x) return null;
        return textCard('person', 'A person' + (x.sub ? ' · ' + x.sub : ''), x.n, x.bio, btn('Read more', 'data-hm="ent" data-id="' + esc(x.i) + '"'));
      }).catch(function () { return null; });
    },
    moment: function () {
      return getJSON('data/bible-timeline.json').then(function (tl) {
        var m = nextOf('moment', ((tl && tl.events) || []).filter(function (e) { return e.sum && e.t; })); if (!m) return null;
        var g = parseRef(m.r);
        return textCard('moment', 'A moment' + (m.d ? ' · ' + m.d : ''), m.t, m.sum, (g ? verseBtn(g.b, g.c, g.v, 'Read ' + m.r) : '') + btn('On the timeline', 'data-hmgo="timeline"', true));
      });
    },
    story: function () {
      return getJSON('data/parallels.json').then(function (pa) {
        var g = nextOf('story', ((pa && pa.groups) || []).filter(function (x) { return x.sh; })); if (!g) return null;
        return textCard('story', 'A story in more than one Gospel', g.t, g.sh, btn('Compare the Gospels', 'data-hm="par" data-id="' + esc(g.id) + '"'));
      });
    },
    word: function () {
      return getJSON('data/word-counts.json').then(function (wc) {
        var pool = [];
        try {
          var top = (wc && wc.top) || {}, ww = (typeof WW !== 'undefined' && WW.w) || {};
          Object.keys(top).forEach(function (bk) { ['nouns', 'verbs'].forEach(function (k) { (top[bk][k] || []).forEach(function (w) { if (ww[w.s]) pool.push({ w: w, bk: bk, blurb: ww[w.s] }); }); }); });
        } catch (e) {}
        var wd = nextOf('word', pool); if (!wd) return null;
        return textCard('word', 'A Greek word · common in ' + bookName(wd.bk), '<span class="lc-gr">' + esc(wd.w.l) + '</span><span class="lc-tr">' + esc(wd.w.t) + ' · ' + esc(wd.w.g) + '</span>', wd.blurb, '', { rawTitle: true });
      });
    }
  };
  var WEIGHT = { scripture: 2, place: 3, art: 3, dig: 2, history: 3, voice: 1, person: 1, moment: 1, story: 1, word: 1 };
  function planBatch() {
    var c = load(), list = [];
    KINDS.forEach(function (k) { if (c.kinds[k[0]]) for (var i = 0; i < (WEIGHT[k[0]] || 1); i++) list.push(k[0]); });
    if (!list.length) return [];
    list = shuffled(list, seed() * 31 + (feed.n++) * 101);
    for (var i = 1; i < list.length; i++) {              // never the same kind twice in a row
      if (list[i] === list[i - 1]) { for (var j = i + 1; j < list.length; j++) if (list[j] !== list[i - 1] && list[j] !== list[i]) { var t = list[i]; list[i] = list[j]; list[j] = t; break; } }
    }
    if (list[0] === feed.last && list.length > 1) { var q = list.shift(); list.push(q); }
    if (feed.n === 1) {                                  // open on a picture or a verse
      var vis = ['place', 'art', 'scripture'], k = list.findIndex(function (x) { return vis.indexOf(x) >= 0; });
      if (k > 0) { var t0 = list[0]; list[0] = list[k]; list[k] = t0; }
    }
    feed.last = list[list.length - 1];
    return list;
  }
  function sizeFeed() {
    var f = $('hmFeed'), w = $('hmWrap'); if (!f || !w) return;
    var nh = 0; if (!document.querySelector('.phone.nav-reserve')) { var ph0 = document.querySelector('.phone'), pr = document.getElementById('navProbe'); if (ph0 && !pr) { pr = document.createElement('div'); pr.id = 'navProbe'; pr.style.cssText = 'position:absolute;left:0;width:0;visibility:hidden;pointer-events:none;height:var(--navh)'; ph0.appendChild(pr); } nh = pr ? pr.offsetHeight : 0; }      // the bar floats over this screen, so the card stops above it
    f.style.setProperty('--lf', Math.max(420, w.clientHeight - 96 - nh + 6) + 'px');
  }
  function addBatch(first) {
    var f = $('hmFeed'); if (!f || feed.busy) return; feed.busy = true; if (first) feed.fills = 0;
    var kinds = planBatch();
    if (!kinds.length) { f.innerHTML = '<p class="hm-sub">Nothing is switched on here. Tap the pencil to pick what you would like to learn about.</p>'; feed.busy = false; return; }
    Promise.all(kinds.map(function (k) { return makers[k]().catch(function () { return null; }); })).then(function (cards) {
      f = $('hmFeed'); feed.busy = false; if (!f) return;
      cards = cards.filter(Boolean);
      if (first) f.innerHTML = '';
      if (!cards.length && first) { f.innerHTML = '<p class="hm-sub">Nothing to show yet. Check your connection and try again.</p>'; return; }
      f.insertAdjacentHTML('beforeend', cards.join(''));
      if (first) f.scrollLeft = 0;
      if (f.scrollWidth < f.clientWidth * 2.5 && feed.fills++ < 6) addBatch(false);   // always leave something to scroll to
    });
  }
  function fillDiscover() {
    var f = $('hmFeed'); if (!f) return;
    sizeFeed();
    if (feed.html && Date.now() - feedAt >= FEED_MS) { shuffleN++; feedReset(); f = $('hmFeed'); }     // it has been 15 minutes: fresh cards
    if (feed.html) { f.innerHTML = feed.html; f.scrollLeft = feed.top; return; }
    feedAt = Date.now();
    addBatch(true);
  }
  // Learn something new gets fresh cards every 15 minutes while Home is open and you are not in the middle of something (no touch for 30 seconds, no card opened with More)
  var FEED_MS = 15 * 60 * 1000, feedAt = Date.now(), lastTouch = 0;
  ['touchstart', 'pointerdown', 'wheel', 'keydown'].forEach(function (ev) { document.addEventListener(ev, function () { lastTouch = Date.now(); }, { passive: true, capture: true }); });
  setInterval(function () {
    var f = $('hmFeed'), scr = $('screen-home');
    if (!f || !scr || !scr.classList.contains('active') || document.hidden || !f.querySelector('.lc')) return;
    if (Date.now() - feedAt < FEED_MS || Date.now() - lastTouch < 30000 || feed.busy || f.querySelector('.lc.open')) return;
    shuffleN++; feedReset(); feedAt = Date.now(); addBatch(true);
  }, 30000);
  function feedMore(f) { if (f.scrollLeft + f.clientWidth * 2.2 >= f.scrollWidth) addBatch(false); }

  // ---------- Bible Clock: the time as a chapter and verse (4:23 is chapter 4, verse 23) ----------
  var clockP = null, clockTimer = null, clockKey = -1;
  function loadClock() { return clockP || (clockP = getJSON('data/bibleclock.json')); }
  // The verse goes inside one pair of quotation marks: a quote that already opens or closes the verse is taken out, and quotes inside become single
  function clockQuote(t) {
    var O = '\u201C', C = '\u201D', n = function (c) { return t.split(c).length - 1; };
    if (t.charAt(0) === O && t.charAt(t.length - 1) === C) {
      var d = 0, whole = true; for (var i = 0; i < t.length - 1; i++) { if (t.charAt(i) === O) d++; else if (t.charAt(i) === C) d--; if (d === 0) { whole = false; break; } }
      if (whole) t = t.slice(1, -1);
    }
    var o = n(O), c = n(C);
    if (o > c && t.charAt(0) === O) t = t.slice(1); else if (c > o && t.charAt(t.length - 1) === C) t = t.slice(0, -1);
    return t.split(O).join('\u2018').split(C).join('\u2019');
  }
  function clockPaint(h, m) {
    loadClock().then(function (d) {
      var e = d && d.v && d.v[(h - 1) * 60 + m], box = $('hmClock'); if (!e || !box) return;
      var book = d.books[e[0]], ap = new Date().getHours() < 12 ? 'AM' : 'PM', slug = Bk.slugOf(book);
      var inner = box.querySelector('.hm-ck'); inner.classList.remove('in'); void inner.offsetWidth;
      $('hmCkBk').textContent = book;
      $('hmCkNum').innerHTML = h + '<span class="hm-ck-co">:</span>' + (m < 10 ? '0' + m : m);
      $('hmCkAp').textContent = ap;
      var t = clockQuote(e[2]); $('hmCkVt').textContent = '\u201C' + t + '\u201D'; $('hmCkVt').className = 'hm-ck-vt' + (t.length > 170 ? ' long' : '');
      $('hmCkRef').textContent = book + ' ' + h + ':' + e[1] + ' · WEB';
      var b = $('hmCkCtx'); if (b) { b.hidden = !slug; if (slug) { b.dataset.hm = 'verse'; b.dataset.b = slug; b.dataset.c = h; b.dataset.v = e[1]; } }
      inner.classList.add('in');
    });
  }
  function clockTick() {
    var box = $('hmClock');
    if (!box) { clearInterval(clockTimer); clockTimer = null; clockKey = -1; return; }
    var d = new Date(), h = d.getHours() % 12 || 12, m = d.getMinutes(), s = d.getSeconds(), key = h * 100 + m;
    var bar = $('hmCkSec'); if (bar) bar.style.width = (((s * 1000 + d.getMilliseconds()) / 60000) * 100).toFixed(1) + '%';
    if (key !== clockKey || !$('hmCkNum').textContent.trim()) { clockKey = key; clockPaint(h, m); }
  }
  function clockStart() { clockKey = -1; clockTick(); if (!clockTimer) clockTimer = setInterval(clockTick, 1000); }

  var fillers = {
    votd: function () {
      if (load().hero === 'clock') { clockStart(); return; }
      var r = votdRef(0);
      verseText(r).then(function (v) {
        var t = $('hmVt'); if (!t || !v) return;
        t.textContent = '“' + v.text + '”'; t.className = 'hm-vt' + (v.text.length > 230 ? ' long' : v.text.length > 130 ? ' mid' : '');
        $('hmVr').textContent = v.ref;
        var b = $('hmVctx'); if (b) { b.hidden = false; b.dataset.hm = 'verse'; b.dataset.b = r[0]; b.dataset.c = r[1]; b.dataset.v = r[2]; }
      });
    },
    plan: function () {
      var el = $('hmPlan'); if (!el) return;
      try {
        Plans.today().then(function (t) {
          el = $('hmPlan'); if (!el) return;
          var mk = '<span class="hm-mi">' + el.querySelector('.hm-mi').innerHTML + '</span><span class="hm-mk">Current reading plan</span>';
          if (!t) { el.innerHTML = mk + '<b>No plan yet</b><i>Choose one</i><em>›</em>'; return; }
          el.removeAttribute('data-hmgo'); el.dataset.hm = 'plango'; el.dataset.id = t.id; el.dataset.d = t.day;
          el.innerHTML = mk + '<b>' + esc(t.title) + '</b><i>Day ' + t.day + ' of ' + t.total + '</i><span class="hm-pb"><u style="width:' + Math.round(100 * t.done / t.total) + '%"></u></span><em>›</em>';
        });
      } catch (e) { /* ignore */ }
    },
    study: function () {
      var el = $('hmStudy'); if (!el) return;
      var p = pos(), h = '<button type="button" class="hm-row" data-hm="deep" data-b="' + esc(p.b) + '" data-c="' + p.c + '"><b>Study ' + esc(bookName(p.b)) + ' ' + p.c + '</b><i>Setting, history, customs, places and words</i><em>›</em></button>';
      el.innerHTML = h;
      var id = load().par;
      if (id) {
        try {
          Par.load().then(function (d) {
            var g = d && d.groups && d.groups.filter(function (x) { return x.id === id; })[0]; el = $('hmStudy'); if (!g || !el) return;
            el.insertAdjacentHTML('beforeend', '<button type="button" class="hm-row" data-hm="par" data-id="' + esc(g.id) + '"><b>' + esc(g.t) + '</b><i>Gospel parallels · where you last looked</i><em>›</em></button>');
          });
        } catch (e) {}
      }
    },
    saves: function () {
      var el = $('hmSaves'); if (!el) return;
      var items = []; try { items = Saved.recent(3); } catch (e) {}
      if (!items.length) { el.innerHTML = '<p class="hm-sub">Tap any verse, then the star, bookmark or highlight, and it will be kept here.</p>'; return; }
      el.innerHTML = items.map(function (s) {
        return '<button type="button" class="hm-row hm-vs" data-hm="verse" data-b="' + esc(s.b) + '" data-c="' + s.c + '" data-v="' + s.v + '"><b>' + esc(s.ref) + '</b>' + (s.t ? '<i>' + esc(s.t) + '</i>' : '') + '<em>›</em></button>';
      }).join('');
    },
    discover: fillDiscover
  };
  function dateLine() {
    try { return new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }); } catch (e) { return ''; }
  }
  function render() {
    var c = load(), body = $('hmBody'); if (!body) return;
    var d = $('hmDate'); if (d) d.textContent = dateLine();
    var g = $('hmHello'); if (g) g.textContent = greeting();
    var on = c.order.filter(function (k) { return c.on[k]; });
    if (!on.length) { body.innerHTML = '<div class="hm-card"><p class="hm-sub">Nothing is switched on. Tap the pencil above to choose what Home shows.</p><button type="button" class="hm-btn" data-hm="cust">Customize Home</button></div>'; return; }
    var h = '', i = 0;
    while (i < on.length) {
      var k = on[i];
      if (k === 'left' || k === 'plan') {                       // the two small blocks sit side by side
        var pair = [k]; if ((on[i + 1] === 'left' || on[i + 1] === 'plan') && on[i + 1] !== k) pair.push(on[i + 1]);
        h += '<div class="hm-pair' + (pair.length === 1 ? ' one' : '') + '">' + pair.map(function (x) { return drawers[x](); }).join('') + '</div>'; i += pair.length;
      } else { h += drawers[k](); i++; }
    }
    var oldFeed = $('hmFeed'); if (oldFeed && oldFeed.children.length > 1) { feed.html = oldFeed.innerHTML; feed.top = oldFeed.scrollLeft; }
    body.innerHTML = h;
    on.forEach(function (k) { if (fillers[k]) fillers[k](); });
  }

  // ---------- Customize Home ----------
  var custFrom = 'home';
  function presetMatch() {
    var c = load();
    for (var k in PRESETS) {
      var p = PRESETS[k], ok = c.order.join() === p.order.join() && CARDS.every(function (x) { return !!c.on[x[0]] === (p.on.indexOf(x[0]) >= 0); });
      if (ok) return k;
    }
    return '';
  }
  function renderCust() {
    var c = load(), body = $('hcBody'); if (!body) return;
    var back = $('hcBack'); if (back) back.textContent = '‹ ' + (custFrom === 'more' ? 'More' : 'Home');
    var pm = presetMatch(), h = '<section class="st-card"><h3>Quick setups</h3><div class="hc-presets">';
    Object.keys(PRESETS).forEach(function (k) {
      h += '<button type="button" class="hc-pre' + (pm === k ? ' on' : '') + '" data-hm="preset" data-k="' + k + '"><b>' + PRESETS[k].name + '</b><i>' + PRESETS[k].d + '</i></button>';
    });
    h += '</div></section><section class="st-card"><h3>Blocks on Home</h3><p class="st-hint">Switch blocks on or off, and use the arrows to put them in the order you like. Continue Reading and Current reading plan sit side by side when they are next to each other.</p>';
    c.order.forEach(function (k, i) {
      var meta = CARDS.filter(function (x) { return x[0] === k; })[0], on = !!c.on[k];
      h += '<div class="hc-row' + (on ? '' : ' off') + '"><button type="button" class="hc-sw' + (on ? ' on' : '') + '" role="switch" aria-checked="' + (on ? 'true' : 'false') + '" aria-label="' + esc(meta[1]) + '" data-hm="toggle" data-k="' + k + '"><i></i></button>' +
        '<span class="hc-t"><b>' + esc(meta[1]) + '</b><i>' + esc(meta[2]) + '</i></span>' +
        '<span class="hc-mv"><button type="button" aria-label="Move ' + esc(meta[1]) + ' up" data-hm="move" data-k="' + k + '" data-dir="-1"' + (i === 0 ? ' disabled' : '') + '>' + ICON.up + '</button>' +
        '<button type="button" aria-label="Move ' + esc(meta[1]) + ' down" data-hm="move" data-k="' + k + '" data-dir="1"' + (i === c.order.length - 1 ? ' disabled' : '') + '>' + ICON.down + '</button></span></div>';
      if (k === 'votd') h += '<div class="hc-sub" role="radiogroup" aria-label="Top card"><button type="button" class="hc-kind' + (c.hero === 'votd' ? ' on' : '') + '" role="radio" aria-checked="' + (c.hero === 'votd') + '" data-hm="hero" data-k="votd">Verse of the day</button><button type="button" class="hc-kind' + (c.hero === 'clock' ? ' on' : '') + '" role="radio" aria-checked="' + (c.hero === 'clock') + '" data-hm="hero" data-k="clock">Bible Clock</button><span class="hc-note">Clock verses are from the World English Bible, which is public domain.</span></div>';
    });
    h += '</section><section class="st-card"><h3>Learn something new shows</h3><p class="st-hint">The cards you can swipe through. Switch off anything you would rather not see.</p><div class="hc-kinds">' +
      KINDS.map(function (k) { return '<button type="button" class="hc-kind' + (c.kinds[k[0]] ? ' on' : '') + '" role="switch" aria-checked="' + (c.kinds[k[0]] ? 'true' : 'false') + '" data-hm="kind" data-k="' + k[0] + '">' + k[1] + '</button>'; }).join('') + '</div></section>' +
      '<section class="st-card"><h3>When I open the app</h3>' +
      '<button type="button" class="hc-opt' + (c.open === 'home' ? ' on' : '') + '" data-hm="open" data-k="home"><span class="hc-dot"></span><span class="hc-t"><b>Home</b><i>Start on the Home screen.</i></span></button>' +
      '<button type="button" class="hc-opt' + (c.open === 'left' ? ' on' : '') + '" data-hm="open" data-k="left"><span class="hc-dot"></span><span class="hc-t"><b>Where I left off</b><i>Go straight back to the chapter I was reading.</i></span></button></section>' +
      '<button type="button" class="hm-btn alt" data-hm="reset">Put everything back the way it was</button>' +
      (storageOk ? '' : '<p class="st-hint">This browser is not letting the app save, so these choices will be lost when you close it.</p>');
    body.innerHTML = h;
  }

  // ---------- events ----------
  document.addEventListener('click', function (e) {
    var t = e.target; if (!t || !t.closest) return;
    var b;
    if ((b = t.closest('.hubseg .hs-tab'))) { openSub(b.dataset.hs, true); return; }
    if ((b = t.closest('[data-hmgo]'))) { openSub(b.dataset.hmgo, true); return; }
    if ((b = t.closest('#ddBack'))) { e.preventDefault(); openSub('divehome', true); return; }
    if ((b = t.closest('#hmEdit'))) { e.preventDefault(); custFrom = 'home'; goToScreen('homecust'); return; }
    if ((b = t.closest('#hcBack'))) { goToScreen(custFrom === 'more' ? 'more' : 'home'); return; }
    if ((b = t.closest('#svBack'))) { var so = origin.saved; goToScreen(so && so !== 'saved' && LABEL[so] ? so : 'home'); return; }
    if ((b = t.closest('[data-hm]'))) {
      var a = b.dataset.hm, c = load();
      if (a === 'cust') { custFrom = 'home'; goToScreen('homecust'); }
      else if (a === 'read') { openChapterTop(b.dataset.b, Number(b.dataset.c)); }
      else if (a === 'deep') { openPassage(b.dataset.b, Number(b.dataset.c), 0, true); }
      else if (a === 'verse') { openPassage(b.dataset.b, Number(b.dataset.c), Number(b.dataset.v), false); }
      else if (a === 'par') { try { Par.open(b.dataset.id, 'read'); } catch (x) {} }
      else if (a === 'plango') { try { Plans.go(b.dataset.id, Number(b.dataset.d)); } catch (x) {} }
      else if (a === 'openstudy') { openSub(lastStudy); }
      else if (a === 'shuffle') { shuffleN++; feedReset(); feedAt = Date.now(); fillers.discover(); }
      else if (a === 'site') { loadLibs().then(function () { var x = SITE_BY_ID[b.dataset.id]; if (x) openLibModal(siteCardHTML(x, true)); }); }
      else if (a === 'ent') { loadLibs().then(function () { var x = PEOPLE_BY_ID[b.dataset.id]; if (x) openLibModal(entCardHTML(x, true)); }); }
      else if (a === 'map') { try { focusMapAt(Number(b.dataset.la), Number(b.dataset.ln), b.dataset.name || '', 13); } catch (x) { goToScreen('map'); } }
      else if (a === 'cm') { try { Cm.open(b.dataset.b, Number(b.dataset.c)); } catch (x) { goToScreen('commentary'); } }
      else if (a === 'kind') { c.kinds[b.dataset.k] = c.kinds[b.dataset.k] ? 0 : 1; save(); feedReset(); renderCust(); }
      else if (a === 'hero') { c.hero = b.dataset.k === 'clock' ? 'clock' : 'votd'; save(); renderCust(); }
      else if (a === 'toggle') { c.on[b.dataset.k] = c.on[b.dataset.k] ? 0 : 1; save(); renderCust(); }
      else if (a === 'move') {
        var i = c.order.indexOf(b.dataset.k), j = i + Number(b.dataset.dir);
        if (i >= 0 && j >= 0 && j < c.order.length) { c.order.splice(j, 0, c.order.splice(i, 1)[0]); save(); renderCust(); }
      }
      else if (a === 'preset') {
        var p = PRESETS[b.dataset.k]; if (p) { c.order = p.order.slice(); CARDS.forEach(function (x) { c.on[x[0]] = p.on.indexOf(x[0]) >= 0 ? 1 : 0; }); save(); renderCust(); }
      }
      else if (a === 'open') { c.open = b.dataset.k === 'left' ? 'left' : 'home'; save(); renderCust(); }
      else if (a === 'reset') { var par = c.par; cfg = null; try { localStorage.removeItem(KEY); } catch (x) {} load(); cfg.par = par; save(); renderCust(); }
      else if (a === 'custmore') { custFrom = 'more'; goToScreen('homecust'); }
      else if (a === 'guide') { try { tourStart(); } catch (x) {} }
      else if (a === 'backup') { goToScreen('saved'); var w = $('svWrap'); if (w) setTimeout(function () { w.scrollTop = w.scrollHeight; }, 60); }
      return;
    }
  });

  // the feed adds more cards as you near the end; the feed is sized to the screen
  document.addEventListener('scroll', function (e) { var f = e.target; if (f && f.id === 'hmFeed') feedMore(f); }, true);
  document.addEventListener('click', function (e) {       // "More" on a picture card opens the rest of its words; tap again to close
    var b = e.target && e.target.closest ? e.target.closest('.lc-more') : null; if (!b) return;
    var c = b.closest('.lc'); if (!c) return;
    var on = c.classList.toggle('open'); b.setAttribute('aria-expanded', on ? 'true' : 'false'); b.textContent = on ? 'Less ▴' : 'More ▾';
  });
  window.addEventListener('resize', function () { sizeFeed(); });

  // ---------- the hooks ----------
  var api = {
    go: function (prev, name) {
      if (prev && prev !== name) origin[name] = prev;
      if (STUDY.indexOf(name) >= 0) lastStudy = name; else if (name === 'deepdive') lastStudy = 'divehome';
      if (name === 'homecust' && prev !== 'homecust') custFrom = prev === 'more' ? 'more' : 'home';
      paintStrips(name);
      // the Saved page is no longer in the Study strip, so it always has a back button to where you came from
      if (name === 'saved') { var sb = $('svBack'), so = origin.saved; if (sb) sb.textContent = '\u2039 ' + (so && so !== 'saved' && LABEL[so] ? LABEL[so] : 'Home'); }
    },
    group: function (name) {
      if (name === 'search') { var o = origin.search; return (o && GROUP[o]) || 'read'; }
      if (name === 'saved') { var so = origin.saved; return (so && so !== 'saved' && GROUP[so]) || 'more'; }
      return GROUP[name] || 'read';
    },
    nav: function (which) {
      if (which === 'study') openSub(lastStudy);
      else if (which === 'visualize') openSub('timeline', true, true);   // the Visualize button always opens the Timeline at Detail
    },
    back: function (name, fb) {
      var o = origin[name];
      if (o && o !== name && LABEL[o]) return { to: o, label: LABEL[o] };
      return fb || { to: 'read', label: 'Read' };
    },
    render: render,
    renderCust: renderCust,
    readQuick: readQuick,
    notePar: function (id) { if (!id) return; load().par = id; save(); },
    startScreen: function () { return load().open === 'left' ? 'read' : 'home'; },
    sync: function () { var n = null; try { n = currentScreen; } catch (e) {} if (n) paintStrips(n); },
    cfg: function () { return load(); },
    init: buildStrips
  };
  window.Home = api;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', buildStrips); else buildStrips();
})();
