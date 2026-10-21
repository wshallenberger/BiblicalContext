// Server side of the translations back end (a Netlify Function).
//   GET /.netlify/functions/bible?t=esv&b=john&c=3     (or /api/bible?... with the redirect in netlify.toml.example)
// It keeps the API keys private, asks the publisher's service for one chapter, and sends back the same shape the app's own chapter files use:
//   { id, book, chapter, verses: [{ num, text }], notice, upstreamCopyright?, fums? }
// Nothing is stored on the server. Keys come from environment variables: ESV_API_KEY, NLT_API_KEY, API_BIBLE_KEY.
// Bundled (public-domain) translations are plain files and never come through here.
//
// NOTE: the three adapters follow each service's published documentation and are unit-tested against sample responses
// (tests/test_all.js). They have NOT been run against the live services yet (no keys at build time). See README "First live test".

const BibleBooks = require('../../shared/books.js');
const REGISTRY = require('../../data/translations/registry.json');

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ldquo: '“', rdquo: '”', lsquo: '‘', rsquo: '’', mdash: '—', ndash: '–', hellip: '…' };
const decode = s => s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
  if (e[0] === '#') { const n = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10); return isFinite(n) ? String.fromCodePoint(n) : m; }
  return Object.prototype.hasOwnProperty.call(ENTITIES, e.toLowerCase()) ? ENTITIES[e.toLowerCase()] : m;
});
const tidy = s => s.replace(/\s+/g, ' ').trim();

// "[1] In the beginning ... [2] The earth ..."  ->  [{num:1,text},{num:2,text}]   (ESV text and API.Bible text with verse numbers on)
function parseBracketVerses(text) {
  const out = [], re = /\[(\d+)\]/g;
  let m, last = null, from = 0;
  const first = text.search(/\[\d+\]/);
  if (first < 0) { const t = tidy(text); return t ? [{ num: 1, text: t }] : []; }
  const pre = tidy(text.slice(0, first)); if (pre) out.push({ num: 0, text: pre }); // a Psalm's title line, if the service sends one
  while ((m = re.exec(text))) {
    if (last) { const t = tidy(text.slice(from, m.index)); if (t) out.push({ num: last, text: t }); }
    last = Number(m[1]); from = re.lastIndex;
  }
  if (last) { const t = tidy(text.slice(from)); if (t) out.push({ num: last, text: t }); }
  return out;
}

// NLT API returns HTML with <verse_export vn="16"> around each verse
function parseNltHtml(html) {
  const out = [], re = /<verse_export\b[^>]*?\bvn="(\d+)"[^>]*>([\s\S]*?)<\/verse_export>/gi;
  let m;
  while ((m = re.exec(html))) {
    let h = m[2];
    h = h.replace(/<span[^>]*class="[^"]*\bvn\b[^"]*"[^>]*>[\s\S]*?<\/span>/gi, '');      // the verse number itself
    h = h.replace(/<a[^>]*class="[^"]*\ba-tn\b[^"]*"[^>]*>[\s\S]*?<\/a>/gi, '');          // footnote markers
    h = h.replace(/<span[^>]*class="[^"]*\btn\b[^"]*"[^>]*>[\s\S]*?<\/span>/gi, '');      // footnote bodies
    h = h.replace(/<h[1-6][^>]*>[\s\S]*?<\/h[1-6]>/gi, '');                              // section headings
    h = h.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '');
    const t = tidy(decode(h));
    if (t) out.push({ num: Number(m[1]), text: t });
  }
  // a verse can be split across several blocks (poetry): join the pieces
  const merged = [];
  out.forEach(v => { const p = merged[merged.length - 1]; if (p && p.num === v.num) p.text += ' ' + v.text; else merged.push(v); });
  return merged;
}

const timeoutFetch = async (f, url, opts, ms) => {
  const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const t = ctl ? setTimeout(() => ctl.abort(), ms) : null;
  try { return await f(url, Object.assign({}, opts, ctl ? { signal: ctl.signal } : {})); }
  finally { if (t) clearTimeout(t); }
};

const ADAPTERS = {
  esv: {
    keyVar: 'ESV_API_KEY',
    async get(book, ch, ctx) {
      const q = new URLSearchParams({
        q: book.name + ' ' + ch, 'include-passage-references': 'false', 'include-verse-numbers': 'true', 'include-first-verse-numbers': 'true',
        'include-footnotes': 'false', 'include-footnote-body': 'false', 'include-headings': 'false', 'include-short-copyright': 'false',
        'include-copyright': 'false', 'include-passage-horizontal-lines': 'false', 'include-heading-horizontal-lines': 'false',
        'include-selahs': 'true', 'indent-using': 'space', 'indent-paragraphs': '0', 'indent-poetry': 'false', 'indent-declares': '0',
        'indent-psalm-doxology': '0', 'line-length': '0'
      });
      const r = await timeoutFetch(ctx.fetch, 'https://api.esv.org/v3/passage/text/?' + q, { headers: { Authorization: 'Token ' + ctx.key } }, 8000);
      if (!r.ok) throw upstream(r.status);
      const j = await r.json();
      const text = (j.passages && j.passages[0]) || '';
      return { verses: parseBracketVerses(text) };
    }
  },
  nlt: {
    keyVar: 'NLT_API_KEY',
    async get(book, ch, ctx) {
      const ref = book.name.replace(/ /g, '') + '.' + ch;
      const r = await timeoutFetch(ctx.fetch, 'https://api.nlt.to/api/passages?' + new URLSearchParams({ ref, version: 'NLT', key: ctx.key }), {}, 8000);
      if (!r.ok) throw upstream(r.status);
      return { verses: parseNltHtml(await r.text()) };
    }
  },
  apibible: {
    keyVar: 'API_BIBLE_KEY',
    async get(book, ch, ctx) {
      const bibleId = ctx.env['API_BIBLE_ID_' + ctx.tr.id.toUpperCase()] || ctx.tr.bibleId;
      if (!bibleId) throw Object.assign(new Error('No bibleId set for ' + ctx.tr.id), { code: 'NEEDS_LICENSE', status: 403 });
      const q = new URLSearchParams({ 'content-type': 'text', 'include-verse-numbers': 'true', 'include-titles': 'false', 'include-notes': 'false', 'include-chapter-numbers': 'false' });
      const base = ctx.env.API_BIBLE_BASE || 'https://rest.api.bible/v1';
      const r = await timeoutFetch(ctx.fetch, base + '/bibles/' + encodeURIComponent(bibleId) + '/chapters/' + book.usfm + '.' + ch + '?' + q, { headers: { 'api-key': ctx.key } }, 8000);
      if (!r.ok) throw upstream(r.status);
      const j = await r.json(), d = j.data || {}, m = j.meta || {};
      return {
        verses: parseBracketVerses(String(d.content || '')), upstreamCopyright: d.copyright || undefined,
        // API.Bible asks every app to report usage ("FUMS"). The UI must load fumsJs / call it when it shows this text.
        fums: m.fumsId ? { id: m.fumsId, js: m.fumsJs, jsInclude: m.fumsJsInclude, noScript: m.fumsNoScript } : undefined
      };
    }
  }
};

function upstream(status) {
  if (status === 401 || status === 403) return Object.assign(new Error('The service refused the key or this translation'), { code: 'UPSTREAM_AUTH', status: 502 });
  if (status === 404) return Object.assign(new Error('The service has no such passage'), { code: 'UPSTREAM_NOT_FOUND', status: 404 });
  if (status === 429) return Object.assign(new Error('The service says too many requests'), { code: 'UPSTREAM_RATE', status: 429 });
  return Object.assign(new Error('The service returned ' + status), { code: 'UPSTREAM', status: 502 });
}

const json = (status, body, extra) => ({ statusCode: status, headers: Object.assign({ 'Content-Type': 'application/json; charset=utf-8' }, extra || {}), body: JSON.stringify(body) });
const fail = (status, code, message, extra) => json(status, { error: { code, message } }, extra);

function makeHandler(deps) {
  deps = deps || {};
  const registry = deps.registry || REGISTRY;
  const env = deps.env || process.env;
  const f = deps.fetch || (typeof fetch !== 'undefined' ? fetch : null);
  const now = deps.now || (() => Date.now());
  const hits = new Map(), daily = {};   // best effort only: serverless instances come and go, the services enforce the real limits
  const PER_MIN = Number(env.BIBLE_RATE_PER_MIN || 40);

  return async function handler(event) {
    if (event.httpMethod && event.httpMethod !== 'GET') return fail(405, 'METHOD', 'Use GET');
    const qs = event.queryStringParameters || {};
    if (qs.list === 'bibles') {      // a look at which Bibles the API.Bible key can use (names and ids only, no text, no key): open /api/bible?list=bibles
      if (!env.API_BIBLE_KEY) return fail(503, 'NEEDS_KEY', 'API_BIBLE_KEY is not set on the server');
      if (!f) return fail(500, 'NO_FETCH', 'No fetch available on this server');
      try {
        const base = env.API_BIBLE_BASE || 'https://rest.api.bible/v1';
        const r = await timeoutFetch(f, base + '/bibles?language=eng&include-full-details=false', { headers: { 'api-key': env.API_BIBLE_KEY } }, 8000);
        if (!r.ok) throw upstream(r.status);
        const j = await r.json();
        const list = (j.data || []).map(b => ({ id: b.id, abbreviation: b.abbreviationLocal || b.abbreviation, name: b.nameLocal || b.name, language: b.language && b.language.id }));
        return json(200, { count: list.length, bibles: list });
      } catch (e) {
        if (e && e.code) return fail(e.status || 502, e.code, e.message);
        return fail(502, 'UPSTREAM', 'Could not reach the service');
      }
    }
    const tr = registry.translations.find(t => t.id === String(qs.t || '').toLowerCase());
    if (!tr) return fail(404, 'UNKNOWN_TRANSLATION', 'Unknown translation');
    const book = BibleBooks.find(qs.b), ch = Number(qs.c);
    if (!book || !Number.isInteger(ch) || ch < 1 || ch > book.ch) return fail(400, 'BAD_REQUEST', 'Pick a book (slug) and a chapter that exists');
    if (tr.delivery === 'bundled') return fail(400, 'BUNDLED', tr.abbr + ' is a bundled file, not a service call');
    const adapter = ADAPTERS[tr.delivery];
    if (!adapter || tr.status === 'needs-license') return fail(403, 'NEEDS_LICENSE', tr.abbr + ' is not switched on: a license or written permission is needed first');
    const key = env[adapter.keyVar];
    if (!key) return fail(503, 'NEEDS_KEY', tr.abbr + ' needs ' + adapter.keyVar + ' set on the server');

    // simple per-visitor and per-day guards
    const ip = String((event.headers && (event.headers['x-nf-client-connection-ip'] || event.headers['x-forwarded-for'])) || 'anon').split(',')[0].trim();
    const t = now(), win = (hits.get(ip) || []).filter(x => t - x < 60000);
    if (win.length >= PER_MIN) return fail(429, 'RATE_LIMIT', 'Slow down a little', { 'Retry-After': '30' });
    win.push(t); hits.set(ip, win);
    const day = Math.floor(t / 86400000), dk = tr.id + ':' + day, cap = Math.floor((tr.rules.requestsPerDay || 5000) * 0.8);
    daily[dk] = (daily[dk] || 0) + 1;
    if (daily[dk] > cap) return fail(429, 'DAILY_BUDGET', 'Today\'s allowance for ' + tr.abbr + ' on this server is used up', { 'Retry-After': '3600' });

    if (!f) return fail(500, 'NO_FETCH', 'No fetch available on this server');
    try {
      const r = await adapter.get(book, ch, { fetch: f, key, env, tr });
      if (!r.verses.length) return fail(502, 'EMPTY', 'The service sent no verses');
      const max = (tr.rules && tr.rules.maxVersesPerRequest) || 500;
      if (r.verses.length > max) return fail(502, 'TOO_MANY', 'More verses than this translation allows per request');
      const body = { id: tr.id, book: book.slug, chapter: ch, translation: tr.abbr, verses: r.verses, notice: tr.notice };
      if (r.upstreamCopyright) body.upstreamCopyright = r.upstreamCopyright;
      if (r.fums) body.fums = r.fums;
      if (tr.linkRequired) body.link = tr.linkRequired;
      return json(200, body, { 'Cache-Control': 'private, max-age=300' });
    } catch (e) {
      if (e && e.name === 'AbortError') return fail(504, 'TIMEOUT', 'The service took too long');
      if (e && e.code) return fail(e.status || 502, e.code, e.message);
      return fail(502, 'UPSTREAM', 'Could not reach the service');
    }
  };
}

exports.handler = makeHandler();
exports.makeHandler = makeHandler;
exports.parseBracketVerses = parseBracketVerses;
exports.parseNltHtml = parseNltHtml;
