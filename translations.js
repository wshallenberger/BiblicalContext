// Browser side of the translations back end. NOT linked into index.html yet: it is the layer the UI will call later.
//   const T = Translations.create();            // one per page
//   await T.load();                              // reads data/translations/registry.json
//   T.list({ ready: true })                      // what can be offered right now
//   await T.chapter('kjv', 'john', 3)            // -> { id, book, chapter, verses:[{num,text}], notice, source }
//   await T.compare(['bsb','kjv','esv'], 'john', 3, 16)   // -> [{ id, abbr, ok, text | error }]  (never throws for one bad translation)
//   T.credits(['kjv','esv'])                     // -> the credit lines the publishers require, de-duplicated
// Licensed text (ESV, NLT, ...) is only ever held in memory, within each translation's cache budget, and never written to storage.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Translations = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  class TranslationError extends Error {
    constructor(code, message, status) { super(message); this.name = 'TranslationError'; this.code = code; this.status = status; }
  }
  const CODES = {
    UNKNOWN_TRANSLATION: 'That translation is not in the list',
    NEEDS_LICENSE: 'That translation is not switched on yet',
    NEEDS_KEY: 'That translation is waiting for a key on the server',
    NOT_AVAILABLE: 'That chapter is not available in this translation',
    RATE_LIMIT: 'Too many requests, try again in a moment',
    DAILY_BUDGET: 'The daily allowance for this translation is used up',
    NETWORK: 'Could not reach the service'
  };

  function create(opts) {
    opts = opts || {};
    const base = opts.base || 'data/translations/';
    const endpoint = opts.endpoint || '/api/bible';
    const f = opts.fetch || (typeof fetch !== 'undefined' ? fetch.bind(typeof self !== 'undefined' ? self : undefined) : null);
    const okStatus = opts.okStatus || ['ready'];    // tests (or a staging site) can allow 'needs-key' too
    let reg = null, regP = null;
    const cache = new Map();                        // key -> { id, n, data };  Map order = least recently used first
    const inflight = new Map();

    const err = (code, status, msg) => new TranslationError(code, msg || CODES[code] || code, status);
    async function getJson(url) {
      if (!f) throw err('NETWORK', 0, 'No fetch available');
      let r;
      try { r = await f(url); } catch (e) { throw err('NETWORK', 0); }
      let body = null; try { body = await r.json(); } catch (e) { /* not JSON */ }
      if (!r.ok) {
        const c = body && body.error && body.error.code;
        if (c) throw err(c, r.status, body.error.message);
        throw err(r.status === 404 ? 'NOT_AVAILABLE' : 'NETWORK', r.status);
      }
      return body;
    }
    function load() {
      if (!regP) regP = getJson(base + 'registry.json').then(j => { reg = j; return j; }).catch(e => { regP = null; throw e; });
      return regP;
    }
    const need = () => { if (!reg) throw err('NETWORK', 0, 'Call load() first'); return reg; };
    function get(id) { return need().translations.find(t => t.id === String(id).toLowerCase()) || null; }
    function list(o) {
      o = o || {};
      return need().translations.filter(t => (!o.ready || okStatus.includes(t.status)) && (!o.status || t.status === o.status)).map(t => Object.assign({}, t));
    }
    function cacheGet(key) { const e = cache.get(key); if (e) { cache.delete(key); cache.set(key, e); return e.data; } return null; }
    function cachePut(tr, key, data) {
      const budget = tr.rules ? tr.rules.cacheMaxVerses : null;
      if (budget === 0) return;                                        // licensed text with no cache allowance: use it once
      const n = data.verses.length;
      if (budget != null && n > budget) return;
      cache.set(key, { id: tr.id, n, data });
      if (budget == null) return;
      let total = 0; cache.forEach(e => { if (e.id === tr.id) total += e.n; });
      for (const [k, e] of cache) { if (total <= budget) break; if (e.id === tr.id && k !== key) { cache.delete(k); total -= e.n; } }
    }
    async function chapter(id, slug, ch) {
      const tr = get(id); if (!tr) throw err('UNKNOWN_TRANSLATION', 404);
      if (!okStatus.includes(tr.status)) throw err(tr.status === 'needs-key' ? 'NEEDS_KEY' : 'NEEDS_LICENSE', 403);
      ch = Number(ch);
      const key = tr.id + '|' + slug + '|' + ch, hit = cacheGet(key);
      if (hit) return Object.assign({}, hit, { source: 'cache' });
      if (inflight.has(key)) return inflight.get(key);
      const p = (async () => {
        let data;
        if (tr.delivery === 'bundled') {
          const j = await getJson(tr.path ? tr.path.replace('{slug}', slug).replace('{ch}', ch) : base + tr.id + '/' + slug + '/' + ch + '.json');
          const vs = j.verses || (j.chapters && j.chapters[ch]) || [];       // a chapter file, or a whole-book file holding every chapter
          data = { id: tr.id, book: slug, chapter: ch, translation: tr.abbr, verses: vs.map(v => ({ num: v.num, text: v.text })), notice: tr.notice, source: 'bundled' };
        } else {
          const j = await getJson(endpoint + '?' + new URLSearchParams({ t: tr.id, b: slug, c: String(ch) }));
          data = Object.assign({}, j, { source: 'live' });
        }
        if (!data.verses.length) throw err('NOT_AVAILABLE', 404);
        cachePut(tr, key, data);
        return data;
      })();
      inflight.set(key, p);
      try { return await p; } finally { inflight.delete(key); }
    }
    async function verse(id, slug, ch, n) {
      const c = await chapter(id, slug, ch), v = c.verses.find(x => x.num === Number(n));
      if (!v) throw err('NOT_AVAILABLE', 404, 'This translation has no verse ' + n + ' here (versification differs in a few places)');
      return { id: c.id, abbr: c.translation, num: v.num, text: v.text, notice: c.notice, link: c.link, fums: c.fums };
    }
    async function compare(ids, slug, ch, n) {
      return Promise.all(ids.map(async id => {
        const tr = get(id), abbr = tr ? tr.abbr : String(id).toUpperCase();
        try { const v = await verse(id, slug, ch, n); return { id: tr.id, abbr, ok: true, text: v.text, fums: v.fums }; }
        catch (e) { return { id: tr ? tr.id : id, abbr, ok: false, error: e.code || 'NETWORK', message: e.message }; }
      }));
    }
    // the credit lines to show once for everything on the screen; also the "(NIV)" style mark to put after a quoted verse
    function credits(ids) {
      const seen = new Set(), out = [];
      ids.forEach(id => { const tr = get(id); if (!tr || seen.has(tr.id)) return; seen.add(tr.id); out.push({ id: tr.id, abbr: tr.abbr, notice: tr.notice, link: tr.linkRequired || null, fromUpstream: !!tr.noticeFromUpstream }); });
      return out;
    }
    const mark = (id, text) => { const tr = get(id); return tr ? text + ' (' + tr.abbr + ')' : text; };
    function clear() { cache.clear(); }
    function cached(id) { let n = 0; cache.forEach(e => { if (!id || e.id === id) n += e.n; }); return n; }
    return { load, get, list, chapter, verse, compare, credits, mark, clear, cached, TranslationError };
  }
  return { create, TranslationError };
});
