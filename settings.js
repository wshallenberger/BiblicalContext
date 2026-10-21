/* settings.js — the Settings screen: theme, reading font, text size, line spacing, verse numbers.
 * Choices are kept on this device (localStorage key "vi_set"). The theme is also applied by a tiny script in index.html's <head>
 * so the page never flashes the wrong colours. Nothing here is sent anywhere.
 */
(function () {
  'use strict';
  var KEY = 'vi_set';
  var DEF = { theme: 'light', font: 'literata', size: 1, lh: 'normal', vnums: 'on', hide: [] };
  var VOICES = [
    { id: 'piper', name: 'John Piper' }, { id: 'keller', name: 'Tim Keller' }, { id: 'guzik', name: 'David Guzik' },
    { id: 'henry', name: 'Matthew Henry' }, { id: 'spurgeon', name: 'Charles Spurgeon' }, { id: 'lewis', name: 'C.S. Lewis' },
    { id: 'ryle', name: 'J.C. Ryle' }, { id: 'joby', name: 'Joby Martin' }, { id: 'comer', name: 'John Mark Comer' },
    { id: 'mackie', name: 'Tim Mackie' }, { id: 'peterson', name: 'Jordan Peterson' }, { id: 'early', name: 'Early church writers' }
  ];
  var FONTS = [
    { id: 'literata', name: 'Literata', css: "'Literata', serif" },
    { id: 'lora', name: 'Lora', css: "'Lora', serif" },
    { id: 'source', name: 'Source Serif', css: "'Source Serif 4', serif" },
    { id: 'georgia', name: 'Georgia', css: "Georgia, 'Times New Roman', serif" },
    { id: 'plex', name: 'IBM Plex Sans', css: "'IBM Plex Sans', sans-serif" },
    { id: 'atkinson', name: 'Atkinson (easy to read)', css: "'Atkinson Hyperlegible', sans-serif" }
  ];
  var SIZES = [0.85, 1, 1.15, 1.3, 1.5];                         // index 1 is the normal size
  var LH = { tight: 1.4, normal: 1.55, roomy: 1.75 };
  var FONT_URL = 'https://fonts.googleapis.com/css2?family=Lora:wght@400;500;600&family=Source+Serif+4:opsz,wght@8..60,400;8..60,500;8..60,600&family=Atkinson+Hyperlegible:wght@400;700&display=swap';
  var st = {}, fontsLoaded = false, mq = null;
  var root = document.documentElement;

  function load() {
    var o = {};
    try { o = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) {}
    st = {
      theme: ['light', 'dark', 'auto'].indexOf(o.theme) >= 0 ? o.theme : DEF.theme,
      font: FONTS.some(function (f) { return f.id === o.font; }) ? o.font : DEF.font,
      size: typeof o.size === 'number' && o.size >= 0 && o.size < SIZES.length ? Math.round(o.size) : DEF.size,
      lh: LH[o.lh] ? o.lh : DEF.lh,
      vnums: o.vnums === 'off' ? 'off' : 'on',
      hide: Array.isArray(o.hide) ? o.hide.filter(function (h) { return VOICES.some(function (v) { return v.id === h; }); }) : []
    };
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }
  function fontOf(id) { for (var i = 0; i < FONTS.length; i++) if (FONTS[i].id === id) return FONTS[i]; return FONTS[0]; }
  function loadFonts() {
    if (fontsLoaded) return; fontsLoaded = true;
    var l = document.createElement('link'); l.rel = 'stylesheet'; l.href = FONT_URL; document.head.appendChild(l);
  }
  function resolvedTheme() {
    if (st.theme === 'auto') return window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    return st.theme;
  }
  function apply() {
    root.setAttribute('data-theme', resolvedTheme());
    var f = fontOf(st.font);
    if (f.id !== 'literata' && f.id !== 'georgia' && f.id !== 'plex') loadFonts();
    root.style.setProperty('--read-font', f.css);
    root.style.setProperty('--read-scale', String(SIZES[st.size]));
    root.style.setProperty('--read-lh', String(LH[st.lh]));
    document.body.classList.toggle('no-vnums', st.vnums === 'off');
  }
  function paint() {
    var w = document.getElementById('stWrap'); if (!w) return;
    w.querySelectorAll('.st-seg').forEach(function (g) {
      g.querySelectorAll('button').forEach(function (b) { b.classList.toggle('on', b.dataset.v === String(st[g.dataset.key])); });
    });
    w.querySelectorAll('#stVoices button[data-voice]').forEach(function (b) { b.classList.toggle('on', st.hide.indexOf(b.dataset.voice) < 0); });
    var vs = document.getElementById('stVoicesAll'); if (vs) vs.disabled = st.hide.length === 0;
    w.querySelectorAll('#stFonts button').forEach(function (b) { b.classList.toggle('on', b.dataset.f === st.font); });
    var v = document.getElementById('stSizeVal'); if (v) v.textContent = Math.round(SIZES[st.size] * 100) + '%';
    var a = document.getElementById('stSmaller'), z = document.getElementById('stBigger');
    if (a) a.disabled = st.size <= 0; if (z) z.disabled = st.size >= SIZES.length - 1;
  }
  function set(k, v) { st[k] = v; save(); apply(); paint(); }

  function build() {
    var box = document.getElementById('stFonts'); if (!box) return;
    box.innerHTML = FONTS.map(function (f) { return '<button type="button" data-f="' + f.id + '" style="font-family:' + f.css + '">' + f.name + '</button>'; }).join('');
    box.addEventListener('click', function (ev) { var b = ev.target.closest('button'); if (b) set('font', b.dataset.f); });
    var vb = document.getElementById('stVoices');
    if (vb) {
      vb.innerHTML = VOICES.map(function (v) { return '<button type="button" data-voice="' + v.id + '">' + v.name + '</button>'; }).join('');
      vb.addEventListener('click', function (ev) {
        var b = ev.target.closest('button[data-voice]'); if (!b) return;
        var h = st.hide.slice(), i = h.indexOf(b.dataset.voice); if (i >= 0) h.splice(i, 1); else h.push(b.dataset.voice);
        set('hide', h);
      });
      document.getElementById('stVoicesAll').onclick = function () { set('hide', []); };
    }
    document.getElementById('stWrap').addEventListener('click', function (ev) {
      var b = ev.target.closest('.st-seg button'); if (!b) return;
      var key = b.parentNode.dataset.key, v = b.dataset.v;
      set(key, v);
    });
    document.getElementById('stSmaller').onclick = function () { if (st.size > 0) set('size', st.size - 1); };
    document.getElementById('stBigger').onclick = function () { if (st.size < SIZES.length - 1) set('size', st.size + 1); };
    document.getElementById('stReset').onclick = function () { st = { theme: DEF.theme, font: DEF.font, size: 1, lh: DEF.lh, vnums: DEF.vnums, hide: [] }; save(); apply(); paint(); };
    var scr = document.getElementById('screen-settings');
    if (scr && typeof MutationObserver !== 'undefined') new MutationObserver(function () { if (scr.classList.contains('active')) loadFonts(); }).observe(scr, { attributes: true, attributeFilter: ['class'] });
    if (window.matchMedia) {
      mq = matchMedia('(prefers-color-scheme: dark)');
      var onchg = function () { if (st.theme === 'auto') apply(); };
      if (mq.addEventListener) mq.addEventListener('change', onchg); else if (mq.addListener) mq.addListener(onchg);
    }
  }
  function start() { load(); apply(); build(); paint(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
  window.ViSettings = { get: function () { return Object.assign({}, st); }, set: set, hidden: function () { return st.hide.slice(); } };
})();
