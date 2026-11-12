/* plans.js — Reading plans (More > Reading plans).
 *
 * The plans themselves are in data/plans.json (built by tools/build_plans.py). Progress is kept in this browser only
 * (localStorage key "vi_plans_v1"); nothing is sent anywhere:   { "<plan id>": { s: start time, d: { "<day number>": time done } } }
 *
 * Navigation        Plans.render()                    when the Reading plans screen opens
 * The reader        Plans.afterRender(book, chapter)  after it draws a chapter (shows the "Day N" bar when the chapter is part of the day being read)
 */
(function () {
  'use strict';
  var KEY = 'vi_plans_v1';
  var NAMES = Bk.nameMap();
  var plans = null, loading = null, mem = null, storageOk = true;
  var openId = null;        // the plan whose days are showing (null = the list)
  var ctx = null;           // the day being read: { id, day }
  var armed = false;        // "Restart" needs a second tap
  var keep = false;         // opened from the reader's bar: show that plan's days, not the list
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
    moreRow();
  }
  function rec(id) { return load()[id] || null; }
  function getPlan(id) { for (var i = 0; i < (plans || []).length; i++) if (plans[i].id === id) return plans[i]; return null; }
  function doneCount(p) { var r = rec(p.id); if (!r) return 0; var n = 0; for (var i = 1; i <= p.days.length; i++) if (r.d && r.d[i]) n++; return n; }
  function nextDay(p) { var r = rec(p.id); for (var i = 1; i <= p.days.length; i++) if (!(r && r.d && r.d[i])) return i; return 0; }   // 0 = all done
  function isDone(p, i) { var r = rec(p.id); return !!(r && r.d && r.d[i]); }
  function curBook() { try { return currentBook; } catch (e) { return null; } }
  function curChap() { try { return currentChapterNum; } catch (e) { return null; } }
  function refOf(s) { var a = s.split(' '); return { b: a[0], c: Number(a[1]) }; }

  // "Matthew 5–7", "Matthew 14, 16", "Mark 16"
  function dayLabel(day) {
    var out = [], cur = null;
    day.r.forEach(function (s) {
      var r = refOf(s);
      if (cur && cur.b === r.b && r.c === cur.e + 1) cur.e = r.c; else { cur = { b: r.b, s: r.c, e: r.c }; out.push(cur); }
    });
    return out.map(function (g) { return NAMES[g.b] + ' ' + g.s + (g.e > g.s ? '–' + g.e : ''); }).join(', ');
  }
  function perDay(p) {
    var n = 0; p.days.forEach(function (d) { n += d.r.length; });
    var a = n / p.days.length;
    return a <= 1.05 ? 'one chapter a day' : a < 1.5 ? 'one or two chapters a day' : 'about ' + Math.round(a) + ' chapters a day';
  }

  // ---------- more-row line ----------
  function moreLine() {
    var started = 0, active = null;
    (plans || []).forEach(function (p) { if (rec(p.id) && doneCount(p) < p.days.length) { started++; if (!active) active = p; } });
    if (active) return active.title + ': day ' + nextDay(active) + ' of ' + active.days.length + (started > 1 ? ' (+' + (started - 1) + ' more)' : '');
    return 'Read the Gospels, Acts, Romans, 1 Corinthians, 2 Corinthians, Galatians, Ephesians, Philippians, Colossians, 1 Thessalonians, 2 Thessalonians, 1 Timothy, 2 Timothy, Titus, Philemon, Hebrews, James, 1 Peter, 2 Peter, 1 John, 2 John, 3 John, Jude and Revelation a little each day, with plans from a few days to a few months.';
  }
  function moreRow() { var el = document.querySelector('#screen-more [data-screen="plans"] .more-t i'); if (el) el.textContent = moreLine(); }

  // ---------- data ----------
  function ensure() {
    if (plans) return Promise.resolve(plans);
    if (!loading) loading = fetch('data/plans.json').then(function (r) { return r.ok ? r.json() : { plans: [] }; }).catch(function () { return { plans: [] }; })
      .then(function (j) { plans = j.plans || []; moreRow(); return plans; });
    return loading;
  }

  // ---------- screens ----------
  function bar(p) {
    var n = doneCount(p), t = p.days.length;
    return '<div class="pl-bar"><i style="width:' + Math.round(100 * n / t) + '%"></i></div>';
  }
  function card(p) {
    var r = rec(p.id), n = doneCount(p), t = p.days.length, nx = nextDay(p);
    var state = !r ? '' : (nx === 0 ? '<p class="pl-state ok">Finished</p>' : '<p class="pl-state">Day ' + nx + ' of ' + t + ' next</p>') + bar(p);
    return '<button type="button" class="pl-card' + (r ? ' on' : '') + '" data-id="' + esc(p.id) + '">' +
      '<span class="pl-top"><b>' + esc(p.title) + '</b><em>' + t + ' day' + (t === 1 ? '' : 's') + '</em></span>' +
      '<span class="pl-blurb">' + esc(p.blurb) + '</span>' +
      '<span class="pl-meta">' + esc(perDay(p)) + '</span>' + state + '</button>';
  }
  function drawList() {
    var body = $('plBody'); if (!body) return;
    var mine = plans.filter(function (p) { return rec(p.id) && nextDay(p) !== 0; });
    var fin = plans.filter(function (p) { return rec(p.id) && nextDay(p) === 0; });
    var rest = plans.filter(function (p) { return !rec(p.id); });
    var groups = [['whole', 'Through the Gospels'], ['book', 'One Gospel'], ['acts', 'The Book of Acts'], ['romans', 'The Letter to the Romans'], ['1cor', 'The First Letter to the Corinthians'], ['2cor', 'The Second Letter to the Corinthians'], ['gal', 'The Letter to the Galatians'], ['eph', 'The Letter to the Ephesians'], ['phil', 'The Letter to the Philippians'], ['col', 'The Letter to the Colossians'], ['th', 'The Letters to the Thessalonians'], ['1tim', 'The First Letter to Timothy'], ['2tim', 'The Second Letter to Timothy'], ['titus', 'The Letter to Titus'], ['philemon', 'The Letter to Philemon'], ['hebrews', 'The Letter to the Hebrews'], ['james', 'The Letter of James'], ['1peter', 'The First Letter of Peter'], ['2peter', 'The Second Letter of Peter'], ['1john', 'The First Letter of John'], ['2john', 'The Second Letter of John'], ['3john', 'The Third Letter of John'], ['jude', 'The Letter of Jude'], ['revelation', 'The Book of Revelation'], ['theme', 'By theme']];
    var html = '';
    if (mine.length) html += '<h3 class="pl-h">In progress</h3>' + mine.map(card).join('');
    groups.forEach(function (g) {
      var l = rest.filter(function (p) { return p.kind === g[0]; });
      if (l.length) html += '<h3 class="pl-h">' + g[1] + '</h3>' + l.map(card).join('');
    });
    if (fin.length) html += '<h3 class="pl-h">Finished</h3>' + fin.map(card).join('');
    if (!storageOk) html += '<p class="st-hint">This browser is not letting the app save, so your progress will be lost when you close it.</p>';
    body.innerHTML = html;
    $('plTitle').textContent = 'Reading plans';
    var bk = { to: 'booknav', label: 'Read' }; try { var hb = Home.back('plans', bk); bk = { to: hb.to === 'read' ? 'booknav' : hb.to, label: hb.label }; } catch (e) {}
    $('plBack').dataset.screen = bk.to; $('plBack').textContent = '‹ ' + bk.label;
    $('plHint').hidden = false;
  }
  function drawDetail(p) {
    var body = $('plBody'); if (!body) return;
    var r = rec(p.id), n = doneCount(p), t = p.days.length, nx = nextDay(p);
    var html = '<p class="pl-dblurb">' + esc(p.blurb) + '</p>' +
      '<div class="pl-prog"><b>' + n + ' of ' + t + ' days done</b>' + bar(p) + '</div>';
    if (nx) html += '<button type="button" class="lib-btn pl-go" data-act="go" data-d="' + nx + '">' + (n ? 'Continue: Day ' + nx : 'Start: Day 1') + ' · ' + esc(dayLabel(p.days[nx - 1])) + '</button>';
    else html += '<p class="pl-state ok">All ' + t + ' days finished.</p>';
    html += '<div class="pl-days">' + p.days.map(function (d, i) {
      var k = i + 1, dn = isDone(p, k);
      return '<div class="pl-day' + (dn ? ' done' : '') + (k === nx ? ' next' : '') + '">' +
        '<button type="button" class="pl-chk" data-act="chk" data-d="' + k + '" aria-pressed="' + dn + '" aria-label="Day ' + k + ' done">' + (dn ? '✓' : '') + '</button>' +
        '<div class="pl-dt"><b>Day ' + k + (d.t ? ' · ' + esc(d.t) : '') + '</b><span class="pl-chs">' +
        d.r.map(function (s) { var x = refOf(s); return '<button type="button" class="pl-ch" data-act="read" data-d="' + k + '" data-b="' + x.b + '" data-c="' + x.c + '">' + NAMES[x.b] + ' ' + x.c + '</button>'; }).join('') +
        '</span></div></div>';
    }).join('') + '</div>';
    if (r) html += '<button type="button" class="lib-btn alt pl-restart" data-act="restart">' + (armed ? 'Tap again to erase progress and restart' : 'Restart this plan') + '</button>';
    body.innerHTML = html;
    $('plTitle').textContent = p.title;
    $('plBack').dataset.screen = ''; $('plBack').textContent = '‹ All plans';
    $('plHint').hidden = true;
  }
  function render() {
    ensure().then(function () {
      var p = openId && getPlan(openId);
      if (p) drawDetail(p); else { openId = null; drawList(); }
    });
  }

  // ---------- opening a chapter from a plan ----------
  function openDay(p, day, b, c) {
    ctx = { id: p.id, day: day };
    var d = p.days[day - 1];
    if (!b) { var f = refOf(d.r[0]); b = f.b; c = f.c; }
    if (!rec(p.id)) { mem[p.id] = { s: Date.now(), d: {} }; save(); }
    if (window.openChapterTop) window.openChapterTop(b, c);
  }
  function setDone(p, day, on) {
    load(); var r = mem[p.id] || (mem[p.id] = { s: Date.now(), d: {} });
    r.d = r.d || {};
    if (on) r.d[day] = Date.now(); else delete r.d[day];
    save();
  }

  // ---------- the bar at the top of the reader ----------
  function barEl() {
    var el = $('planBar');
    if (!el) {
      var rd = $('reader'); if (!rd) return null;
      el = document.createElement('div'); el.id = 'planBar'; el.className = 'pl-rbar'; el.hidden = true;
      rd.insertBefore(el, rd.firstChild);
      el.addEventListener('click', onBar);
    }
    return el;
  }
  function afterRender(book, chap) {
    var el = barEl(); if (!el) return;
    if (!ctx || !plans) { el.hidden = true; return; }
    var p = getPlan(ctx.id), day = p && p.days[ctx.day - 1];
    if (!day) { el.hidden = true; return; }
    var idx = -1;
    day.r.forEach(function (s, i) { var r = refOf(s); if (r.b === book && r.c === Number(chap)) idx = i; });
    if (idx < 0) { el.hidden = true; ctx = null; return; }     // read something else: the plan steps aside
    var last = idx === day.r.length - 1, dn = isDone(p, ctx.day), more = ctx.day < p.days.length;
    var left = '<button type="button" class="pl-rl" data-act="plan">Plan \u00b7 Day ' + ctx.day + (day.r.length > 1 ? ' · ' + (idx + 1) + ' of ' + day.r.length : '') + '</button>';
    var right = !last ? '<button type="button" class="pl-rb" data-act="nextch">Next chapter ›</button>'
      : dn ? (more ? '<button type="button" class="pl-rb" data-act="nextday">Day ' + (ctx.day + 1) + ' ›</button>' : '<span class="pl-rd">Plan finished</span>')
      : '<button type="button" class="pl-rb pri" data-act="done">Day done ✓</button>';
    el.innerHTML = left + right; el.hidden = false;
  }
  function onBar(ev) {
    var b = ev.target.closest('button[data-act]'); if (!b || !ctx) return;
    var p = getPlan(ctx.id); if (!p) return;
    var act = b.dataset.act, day = p.days[ctx.day - 1];
    if (act === 'plan') { api.show(p.id); }
    else if (act === 'nextch') {
      var cb = curBook(), cc = curChap();
      var cur = -1; day.r.forEach(function (s, i) { var r = refOf(s); if (r.b === cb && r.c === cc) cur = i; });
      if (cur >= 0 && cur < day.r.length - 1) { var r2 = refOf(day.r[cur + 1]); window.openChapterTop(r2.b, r2.c); }
    }
    else if (act === 'done') { setDone(p, ctx.day, true); afterRender(curBook(), curChap()); }
    else if (act === 'nextday') openDay(p, ctx.day + 1);
  }

  // ---------- wiring ----------
  function wire() {
    var w = $('plWrap'); if (!w) return;
    w.addEventListener('click', function (ev) {
      var back = ev.target.closest('#plBack');
      if (back) { if (openId) { openId = null; armed = false; render(); ev.stopPropagation(); } return; }
      var c = ev.target.closest('.pl-card');
      if (c) { openId = c.dataset.id; armed = false; render(); var s = $('plWrap'); if (s) s.scrollTop = 0; return; }
      var b = ev.target.closest('button[data-act]'); if (!b) return;
      var p = getPlan(openId); if (!p) return;
      var act = b.dataset.act, d = Number(b.dataset.d);
      if (act === 'go') openDay(p, d);
      else if (act === 'read') openDay(p, d, b.dataset.b, Number(b.dataset.c));
      else if (act === 'chk') { setDone(p, d, !isDone(p, d)); render(); }
      else if (act === 'restart') {
        if (!armed) { armed = true; render(); setTimeout(function () { if (armed) { armed = false; if (openId === p.id) render(); } }, 4000); }
        else { armed = false; delete mem[p.id]; save(); if (ctx && ctx.id === p.id) ctx = null; render(); }
      }
    }, true);
  }
  function start() { wire(); ensure(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
  var api = {
    render: function () { if (keep) keep = false; else openId = null; armed = false; render(); },
    show: function (id) { openId = id; keep = true; armed = false; if (typeof goToScreen === 'function') goToScreen('plans'); },
    afterRender: afterRender,
    // the plan the reader is on (the first one started and not finished): { id, title, day, total, done, label }, or null
    today: function () {
      return ensure().then(function () {
        var act = null;
        plans.forEach(function (p) { if (!act && rec(p.id) && nextDay(p) !== 0) act = p; });
        if (!act) return null;
        var d = nextDay(act);
        return { id: act.id, title: act.title, day: d, total: act.days.length, done: doneCount(act), label: dayLabel(act.days[d - 1]) };
      });
    },
    go: function (id, day) { var p = getPlan(id); if (p) openDay(p, Number(day) || nextDay(p) || 1); }
  };
  window.Plans = api;
})();
