/* books.js: the one place the app learns which books it has.
 * Everything comes from data/manifest.json (manifest.books). Add a book there (slug, name, short, abbr, color, usfm,
 * testament, totalChapters, availableChapters) and the pickers, Commentary, Compare, Glossary, Search, Plans, Saved, Notes and the
 * Map all see it with no other code change.
 *   Bk.slugs()  Bk.name(slug)  Bk.short(slug)  Bk.chapters(slug)  Bk.has(slug)  Bk.order(slug)  Bk.color(slug)  Bk.testament(slug)
 *   Bk.slugOf(text)  Bk.abbr()  Bk.refRe()  Bk.keyRe()  Bk.parse('Luke 14:28')  Bk.names()  Bk.nameMap()
 */
(function () {
  'use strict';
  var FALLBACK = [
    { slug: 'matthew', name: 'Matthew', short: 'Matt', testament: 'New', totalChapters: 28, abbr: ['mt', 'mat', 'matt'], color: '#8a6d0b' },
    { slug: 'mark', name: 'Mark', short: 'Mark', testament: 'New', totalChapters: 16, abbr: ['mk', 'mar', 'mrk'], color: '#8C4646' },
    { slug: 'luke', name: 'Luke', short: 'Luke', testament: 'New', totalChapters: 24, abbr: ['lk', 'luk'], color: '#4a6a5a' },
    { slug: 'john', name: 'John', short: 'John', testament: 'New', totalChapters: 21, abbr: ['jn', 'jhn', 'joh'], color: '#4d5f8f' }
  ];
  var PALETTE = ['#8a6d0b', '#8C4646', '#4a6a5a', '#4d5f8f', '#2f7f7a', '#6b4a7a', '#a0522d', '#5a6b3a'];
  var cache = { k: '', refRe: null, keyRe: null, splitRe: null };
  function list() { try { if (typeof manifest !== 'undefined' && manifest && manifest.books && manifest.books.length) return manifest.books; } catch (e) {} return FALLBACK; }
  function get(slug) { var l = list(); for (var i = 0; i < l.length; i++) if (l[i].slug === slug) return l[i]; return null; }
  function slugs() { return list().map(function (b) { return b.slug; }); }
  function title(slug) { return String(slug || '').replace(/-/g, ' ').replace(/\b[a-z]/g, function (x) { return x.toUpperCase(); }); }
  function name(slug) { var b = get(slug); return b ? b.name : title(slug); }
  function short(slug) { var b = get(slug); return b ? (b.short || b.shortName || b.name) : title(slug); }
  function chapters(slug) { var b = get(slug); return b ? b.totalChapters : 0; }
  function has(slug) { return !!get(slug); }
  function order(slug) { var i = slugs().indexOf(slug); return i < 0 ? 99 : i; }
  function color(slug) { var b = get(slug), i = slugs().indexOf(slug); return (b && b.color) || PALETTE[(i < 0 ? 0 : i) % PALETTE.length]; }
  function testament(slug) { var b = get(slug); return b && b.testament === 'Old' ? 'OT' : 'NT'; }
  function esc(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  function build() {
    var k = slugs().join(',');
    if (cache.k === k) return;
    var names = list().map(function (b) { return b.name; }).sort(function (a, b) { return b.length - a.length; });
    cache = { k: k, splitRe: new RegExp('^(' + names.map(esc).join('|') + ')\\s+(.*)$'), refRe: new RegExp('^(' + names.map(esc).join('|') + ')\\s+(\\d+)(?::(\\d+))?'), keyRe: new RegExp('^(' + slugs().map(esc).join('|') + '):\\d+$') };
  }
  function refRe() { build(); return cache.refRe; }
  function splitRe() { build(); return cache.splitRe; }
  function keyRe() { build(); return cache.keyRe; }
  function slugOf(text) {          // 'John', 'jn', 'matthew' -> 'john'
    var t = String(text || '').toLowerCase().trim(), l = list();
    for (var i = 0; i < l.length; i++) {
      var b = l[i];
      if (t === b.slug || t === String(b.name).toLowerCase() || (b.abbr || []).indexOf(t) >= 0) return b.slug;
    }
    return '';
  }
  function abbr() {                // search shortcuts: { mt: 'matthew', ... }
    var o = {}; list().forEach(function (b) { o[b.slug] = b.slug; o[String(b.name).toLowerCase().replace(/\s+/g, '')] = b.slug; (b.abbr || []).forEach(function (a) { o[String(a).replace(/\s+/g, '')] = b.slug; }); }); return o;
  }
  function parse(ref) {            // 'Luke 14:28-33' -> { b: 'luke', c: 14, v: 28 }, or null for a book we do not have
    var m = refRe().exec(String(ref || '')); if (!m) return null;
    return { b: slugOf(m[1]), c: Number(m[2]), v: m[3] ? Number(m[3]) : 0 };
  }
  // an object that looks like { slug: value } but is always up to date: Bk.nameMap(), or any function of the slug
  function map(fn) { return new Proxy({}, { get: function (_, k) { return typeof k === 'string' && has(k) ? fn(k) : undefined; }, has: function (_, k) { return has(k); }, ownKeys: function () { return slugs(); }, getOwnPropertyDescriptor: function (_, k) { return has(k) ? { enumerable: true, configurable: true, value: fn(k) } : undefined; } }); }
  window.Bk = { list: list, slugs: slugs, get: get, name: name, short: short, chapters: chapters, has: has, order: order, color: color, testament: testament,
    slugOf: slugOf, abbr: abbr, refRe: refRe, splitRe: splitRe, keyRe: keyRe, parse: parse, map: map, nameMap: function () { return map(name); }, names: function () { return list().map(function (b) { return b.name; }); } };
})();
