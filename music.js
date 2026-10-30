/* music.js — the Music page (More > Music).
 * Links only: nothing plays inside the app. Saved links live in data/music.json ("items"); the page also builds
 * one-tap searches on YouTube, Spotify and Apple Music from whatever moods and styles are picked.
 *
 * data/music.json:
 *   groups: [{ id, name, chips: [[chipId, label, searchWords], ...] }]     (the "src" group filters saved links by platform and is not used in searches)
 *   items:  [{ t: title, by: artist or channel, u: url, src: youtube|spotify|apple|other, k: playlist|song|album|channel, tags: [chipId, ...], n: note }]
 */
(function () {
  'use strict';
  var data = null, loading = false, picked = {}, text = '';
  var $ = function (id) { return document.getElementById(id); };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function chipById(id) { var r = null; (data.groups || []).forEach(function (g) { g.chips.forEach(function (c) { if (c[0] === id) r = c; }); }); return r; }
  function groupOf(id) { var r = null; (data.groups || []).forEach(function (g) { g.chips.forEach(function (c) { if (c[0] === id) r = g; }); }); return r; }

  function drawChips() {
    $('muChips').innerHTML = data.groups.map(function (g) {
      return '<div class="mu-g"><h3>' + esc(g.name) + '</h3><div class="mu-chips">' + g.chips.map(function (c) {
        return '<button type="button" data-chip="' + esc(c[0]) + '" aria-pressed="' + (picked[c[0]] ? 'true' : 'false') + '"' + (picked[c[0]] ? ' class="on"' : '') + '>' + esc(c[1]) + '</button>';
      }).join('') + '</div></div>';
    }).join('');
  }
  function activeIds() { return Object.keys(picked).filter(function (k) { return picked[k]; }); }
  function matches(it) {
    var act = activeIds(), byGroup = {};
    act.forEach(function (id) { var g = groupOf(id); if (g) (byGroup[g.id] = byGroup[g.id] || []).push(id); });
    var tags = (it.tags || []).concat([it.src || 'other']);
    for (var gid in byGroup) { if (!byGroup[gid].some(function (id) { return tags.indexOf(id) >= 0; })) return false; }
    if (text) {
      var hay = [it.t, it.by, it.n, (it.tags || []).map(function (id) { var c = chipById(id); return c ? c[1] + ' ' + c[2] : id; }).join(' ')].join(' ').toLowerCase();
      var ok = text.toLowerCase().split(/\s+/).filter(Boolean).every(function (w) { return hay.indexOf(w) >= 0; });
      if (!ok) return false;
    }
    return true;
  }
  function query() {
    var words = [];
    activeIds().forEach(function (id) { var g = groupOf(id); if (g && g.id !== 'src') { var c = chipById(id); if (c) words.push(c[2]); } });
    if (text.trim()) words.push(text.trim());
    var q = words.join(' ').replace(/\s+/g, ' ').trim();
    if (!q) return '';
    if (!/music|worship|hymn|song|playlist/i.test(q)) q += ' music';
    return q;
  }
  function draw() {
    var items = (data.items || []).filter(matches);
    var act = activeIds();
    var sum = $('muSum');
    sum.hidden = !(act.length || text);
    if (!sum.hidden) $('muSumT').textContent = act.map(function (id) { var c = chipById(id); return c ? c[1] : id; }).concat(text ? ['“' + text + '”'] : []).join(' · ');
    var saved = $('muSaved');
    if (!(data.items || []).length) {
      saved.innerHTML = '<p class="mu-empty">No saved playlists yet. Use the search buttons below and they will open with your choices filled in.</p>';
    } else if (!items.length) {
      saved.innerHTML = '<p class="mu-empty">Nothing saved matches that yet. Try fewer filters, or use the search buttons below.</p>';
    } else {
      saved.innerHTML = '<div class="mu-h">Saved links · ' + items.length + '</div>' + items.map(function (it) {
        var tg = (it.tags || []).map(function (id) { var c = chipById(id); return c ? '<span>' + esc(c[1]) + '</span>' : ''; }).join('');
        var sn = { youtube: 'YouTube', spotify: 'Spotify', apple: 'Apple Music' }[it.src] || 'Link';
        return '<a class="mu-card" href="' + esc(it.u) + '" target="_blank" rel="noopener"><b>' + esc(it.t) + '</b>' + (it.by ? '<span class="mu-by">' + esc(it.by) + '</span>' : '') +
          (it.n ? '<p class="mu-note">' + esc(it.n) + '</p>' : '') + '<div class="mu-meta"><span class="src">' + sn + ' ↗</span>' + tg + '</div></a>';
      }).join('');
    }
    var q = query(), f = $('muFind');
    if (!q) {
      f.innerHTML = '<h3>Search for it</h3><p class="st-hint">Pick a mood, a use or a style above, or type a few words. Buttons will appear here that search YouTube, Spotify and Apple Music for you.</p>';
    } else {
      var e = encodeURIComponent(q);
      f.innerHTML = '<h3>Search for it</h3><p class="mu-q">“' + esc(q) + '”</p><div class="mu-links">' +
        '<a href="https://www.youtube.com/results?search_query=' + e + '" target="_blank" rel="noopener">Search YouTube ↗</a>' +
        '<a class="alt" href="https://open.spotify.com/search/' + e + '" target="_blank" rel="noopener">Search Spotify ↗</a>' +
        '<a class="alt" href="https://music.apple.com/search?term=' + e + '" target="_blank" rel="noopener">Search Apple Music ↗</a></div>';
    }
    $('muChips').querySelectorAll('button[data-chip]').forEach(function (b) {
      var on = !!picked[b.dataset.chip]; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }
  function start() {
    drawChips();
    $('muChips').addEventListener('click', function (ev) {
      var b = ev.target.closest('button[data-chip]'); if (!b) return;
      picked[b.dataset.chip] = !picked[b.dataset.chip]; draw();
    });
    $('muQ').addEventListener('input', function () { text = this.value; draw(); });
    $('muClear').addEventListener('click', function () { picked = {}; text = ''; $('muQ').value = ''; draw(); });
    draw();
  }
  function load() {
    if (data || loading) return;
    loading = true;
    fetch('data/music.json').then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
      loading = false;
      if (!j || !j.groups) { $('muFind').innerHTML = '<p class="st-hint">The music list could not be loaded. Check your connection and try again.</p>'; return; }
      data = j; start();
    }).catch(function () { loading = false; $('muFind').innerHTML = '<p class="st-hint">The music list could not be loaded. Check your connection and try again.</p>'; });
  }
  function init() {
    var scr = $('screen-music'); if (!scr) return;
    if (typeof MutationObserver !== 'undefined') new MutationObserver(function () { if (scr.classList.contains('active')) load(); }).observe(scr, { attributes: true, attributeFilter: ['class'] });
    if (scr.classList.contains('active')) load();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
