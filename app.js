// ---------- State ----------
let manifest = null;
let timelineData = null;
let WW = { w: {}, k: {}, e: {} };
const wwP = fetch('data/word-world.json').then(r => (r.ok ? r.json() : null)).then(j => { if (j) WW = j; }).catch(() => {});
let SUM = {};
const sumP = fetch('data/summaries.json').then(r => (r.ok ? r.json() : {})).then(j => { SUM = j || {}; }).catch(() => {});
let chapterIndex = null;
const chapterIndexP = fetch('data/chapter-index.json').then(r => (r.ok ? r.json() : null)).then(j => { chapterIndex = j; return j; }).catch(() => null);
const GOSPEL_FACTS = {
  matthew: { written: 'c. AD 60s–80s', focus: 'Jesus as the promised Messiah-King who fulfills Israel’s Scriptures' },
  mark: { written: 'Probably AD 50s–60s, often linked to Rome', focus: 'Fast-moving account of Jesus as the suffering Son of God' },
  luke: { written: 'Probably AD 60s–80s, with Acts as its sequel', focus: 'Jesus’ mercy to outsiders, the poor and the overlooked' },
  john: { written: 'Probably AD 80s–90s, often linked to Ephesus', focus: 'Signs and “I am” sayings that call for belief and life' }
};
let currentBook = null;
let currentChapterNum = null;
let currentChapterData = null;
let currentScreen = 'read';
let navStep = 'books'; // 'books' | 'chapters', used inside the booknav screen
let navBrowsingBook = null; // book slug currently being drilled into in booknav

// ---------- DOM refs ----------
const screens = document.querySelectorAll('.screen');
const navButtons = document.querySelectorAll('[data-screen]');

const bookLabel = document.getElementById('bookLabel');
const chapterTitle = document.getElementById('chapterTitle');
const verseListEl = document.getElementById('verseList');

const readBookSelect = document.getElementById('readBookSelect');
const readChapterSelect = document.getElementById('readChapterSelect');
const ddBookSelect = document.getElementById('ddBookSelect');
const ddChapterSelect = document.getElementById('ddChapterSelect');

const backdrop = document.getElementById('backdrop');
const sheet = document.getElementById('sheet');
const diveBtn = document.getElementById('diveBtn');

const sheetRef = document.getElementById('sheetRef');
const sheetVerseText = document.getElementById('sheetVerseText');
const sheetGrid = document.getElementById('sheetGrid');

const navBackBtn = document.getElementById('navBackBtn');
const navHeaderTitle = document.getElementById('navHeaderTitle');
const navBookList = document.getElementById('navBookList');
const navChapterGrid = document.getElementById('navChapterGrid');

const folderTabs = document.querySelectorAll('.folder-tab');
const folderPanels = document.querySelectorAll('.tab-panel');
const folderContent = document.getElementById('folderContent');

const BASE_TABS = ['context', 'translation', 'xref', 'commentary', 'gallery', 'author', 'archaeology', 'people', 'discussion', 'notes', 'book'];
let tabOrder = BASE_TABS.slice();
let activeTabIndex = 0;

// ---------- Custom static region map (Setting tab, carousel slide 0) ----------
const REGION_MAP_W = 160, REGION_MAP_H = 320;
const REGION_LAT_MIN = 31.5, REGION_LAT_MAX = 33.6;
const REGION_LNG_MIN = 35.0, REGION_LNG_MAX = 36.0;

function projectCoord(lat, lng) {
  const x = (lng - REGION_LNG_MIN) / (REGION_LNG_MAX - REGION_LNG_MIN) * REGION_MAP_W;
  const y = (REGION_LAT_MAX - lat) / (REGION_LAT_MAX - REGION_LAT_MIN) * REGION_MAP_H;
  return { x, y };
}

const REGION_POLYGONS = [
  { name: 'PHOENICIA', fill: '#C9D6C4', labelY: 30, pts: '0.0,0.0 56.0,0.0 48.0,83.8 0.0,83.8' },
  { name: 'GALILEE', fill: '#E3C889', labelY: 105, pts: '16.0,83.8 104.0,83.8 104.0,160.0 16.0,160.0' },
  { name: 'GAULANITIS', fill: '#C9B896', labelY: 60, pts: '88.0,0.0 160.0,0.0 160.0,160.0 88.0,160.0' },
  { name: 'SAMARIA', fill: '#D8C9A3', labelY: 190, pts: '0.0,160.0 88.0,160.0 88.0,251.4 0.0,251.4' },
  { name: 'PEREA', fill: '#B8C9B0', labelY: 220, pts: '88.0,160.0 160.0,160.0 160.0,320.0 88.0,320.0' },
  { name: 'JUDEA', fill: '#D4A8A0', labelY: 300, pts: '0.0,251.4 96.0,251.4 96.0,320.0 0.0,320.0' }
];

const REGION_FIXED_POINTS = [
  { name: 'Jerusalem', lat: 31.7683, lng: 35.2137 },
  { name: 'Nazareth', lat: 32.7009, lng: 35.2035 },
  { name: 'Capernaum', lat: 32.8807, lng: 35.5753 },
  { name: 'Tyre', lat: 33.2704, lng: 35.2038 },
  { name: 'Jericho', lat: 31.8667, lng: 35.4500 },
  { name: 'Caesarea Philippi', lat: 33.2494, lng: 35.6928 }
];

let regionMapBuilt = false;

function ensureRegionMap() {
  const svg = document.getElementById('regionMap');
  if (!svg || regionMapBuilt) return;
  regionMapBuilt = true;

  const galilee = projectCoord(32.83, 35.58);
  const deadSea = projectCoord(31.35, 35.45);

  let regionsHtml = REGION_POLYGONS.map(r =>
    `<polygon class="rmap-region" points="${r.pts}" fill="${r.fill}"/>
     <text class="rmap-region-label" x="${REGION_MAP_W / 2}" y="${r.labelY}" font-size="7">${r.name}</text>`
  ).join('');

  let citiesHtml = REGION_FIXED_POINTS.map(p => {
    const pt = projectCoord(p.lat, p.lng);
    const align = pt.x > REGION_MAP_W - 40 ? 'end' : 'start';
    const dx = align === 'end' ? -3 : 3;
    return `<circle class="rmap-city-dot" cx="${pt.x}" cy="${pt.y}" r="1.6"/>
      <text class="rmap-city-label" x="${pt.x + dx}" y="${pt.y + 2}" text-anchor="${align}">${p.name}</text>`;
  }).join('');

  svg.innerHTML = `
    ${regionsHtml}
    <ellipse class="rmap-water" cx="${galilee.x}" cy="${galilee.y}" rx="7" ry="10"/>
    <path class="rmap-river" d="M${galilee.x},${galilee.y + 10} Q${(galilee.x + deadSea.x) / 2 - 8},${(galilee.y + deadSea.y) / 2} ${deadSea.x},${deadSea.y - 15}"/>
    <ellipse class="rmap-water" cx="${deadSea.x}" cy="${deadSea.y}" rx="9" ry="22"/>
    ${citiesHtml}
    <g id="regionMapMarker"></g>
  `;
}

function updateRegionMap(coords, placeName) {
  ensureRegionMap();
  const marker = document.getElementById('regionMapMarker');
  if (!marker || !coords) return;
  const pt = projectCoord(coords.lat, coords.lng);
  const label = placeName || '';
  const labelWidth = Math.min(72, label.length * 3.6 + 8);
  const labelX = (pt.x + labelWidth + 6 > REGION_MAP_W) ? (pt.x - labelWidth - 6) : (pt.x + 6);
  marker.innerHTML = `
    <circle class="rmap-marker-ring" cx="${pt.x}" cy="${pt.y}" r="6"/>
    <circle class="rmap-marker-dot" cx="${pt.x}" cy="${pt.y}" r="3"/>
    <rect class="rmap-marker-label-bg" x="${labelX - 3}" y="${pt.y - 13}" width="${labelWidth}" height="10" rx="3"/>
    <text class="rmap-marker-label" x="${labelX}" y="${pt.y - 5.5}">${label}</text>
  `;
}

// ---------- Live English-labeled map (test scope: Matthew 1 only) ----------
// OpenFreeMap (free, no key, no limits) + MapLibre GL JS. We rewrite every
// symbol layer's text-field to prefer the "name:en" field over the local-
// language "name" field, so labels render in English wherever that data exists.
let liveMap = null;

let liveMapBuilding = false, livePending = null, liveChapterPin = null;
// the Deep Dive maps now use the same nature look as the main Map screen
function ensureLiveMap() {
  if (liveMap || liveMapBuilding || typeof maplibregl === 'undefined') return;
  liveMapBuilding = true;
  Promise.all([loadNatureStyle(), loadEvents().catch(() => null)]).then(([st]) => {
    liveMapBuilding = false; buildLiveMap(st);
    if (livePending) { const p = livePending; livePending = null; updateLiveMap(p.coords, p.placeName); }
  });
}
// a round photo pin for the chapter's own place, like the pins on the Map screen
function chapterPinEl(ctx) {
  if (!ctx || !ctx.mapCoords) return null;
  let src = null, kind = null;
  const bk = currentBook, n = currentChapterNum;
  if (EVENTS) {
    const ev = EVENTS.find(e => !e.chapterPin && (e.r || []).some(r => r[0] === bk && n >= r[1] && n <= r[3]) && mapImgs(e).length);
    const h = ev && mapImgs(ev)[0];
    if (h) { src = mkThumb(h, 120); kind = h.k; }
  }
  if (!src && ctx.currentImage && ctx.currentImage.url) { src = displayImageUrl(ctx.currentImage.url); kind = 'art'; }
  if (!src) return null;
  const el = document.createElement('div'); el.className = 'pm-wrap ov-pinwrap';
  const kc = (MAP_KINDS[kind] || MAP_KINDS.art).color;
  el.innerHTML = `<div class="pm ov-pin" style="--kc:${kc}"><img src="${escHtml(src)}" alt="" decoding="async" draggable="false">${KIND_SVG[kind] ? `<span class="pm-k">${KIND_SVG[kind]}</span>` : ''}</div>`;
  mapImgRetry(el);
  return el;
}
function buildLiveMap(style) {
  liveMap = new maplibregl.Map({
    container: 'liveMap',
    style,
    center: [35.2137, 31.7683],
    zoom: 7,
    attributionControl: false
  });
  liveMap.addControl(new maplibregl.AttributionControl({ compact: true }));
  liveMap.scrollZoom.disable();
  liveMap.dragRotate.disable();
  liveMap.touchZoomRotate.disableRotation();

  liveMap.on('style.load', () => {
    const POLITICAL_CLASSES = ['country', 'state', 'continent', 'province'];
    const layers = liveMap.getStyle().layers || [];
    layers.forEach(layer => {
      if (layer.type !== 'symbol') return;
      const idLower = layer.id.toLowerCase();
      const filterStr = JSON.stringify(layer.filter || []).toLowerCase();
      const isPoliticalLevel = POLITICAL_CLASSES.some(c => idLower.includes(c))
        || (layer['source-layer'] === 'place' && POLITICAL_CLASSES.some(c => filterStr.includes(c)));
      if (isPoliticalLevel) {
        try { liveMap.setLayoutProperty(layer.id, 'visibility', 'none'); } catch (e) {}
        return;
      }
      if (layer.layout && layer.layout['text-field']) {
        try {
          liveMap.setLayoutProperty(layer.id, 'text-field', [
            'coalesce', ['get', 'name:en'], ['get', 'name']
          ]);
        } catch (e) { /* some label layers don't use a simple name field; skip */ }
      }
    });
  });

  liveMap.on('load', () => {
    const cc = currentChapterData && currentChapterData.context;
    if (cc && cc.biblePlaces) { bibleOnlyStyle(liveMap); return; }
    const el = document.createElement('div');
    el.style.cssText = `
      width:26px;height:26px;
      display:flex;align-items:center;justify-content:center;
    `;
    el.innerHTML = `
      <div style="position:absolute;width:26px;height:26px;border-radius:50%;
        background:rgba(201,162,39,0.28);border:2px solid rgba(201,162,39,0.55);"></div>
      <div style="position:relative;width:13px;height:13px;border-radius:50%;
        background:#C9A227;border:2.5px solid #3A2E1F;box-shadow:0 1px 4px rgba(0,0,0,0.4);"></div>
    `;
    liveMapMarker = new maplibregl.Marker({ element: el }).setLngLat([35.2137, 31.7683]).addTo(liveMap);
  });
}


// ---------- Bible-only place layer (data from OpenBible.info, CC BY 4.0) ----------
function bibleOnlyStyle(map) {
  const layers = (map.getStyle().layers || []);
  layers.forEach(l => {
    const id = l.id.toLowerCase();
    if (l.type === 'symbol' || /road|bridge|tunnel|rail|aeroway|boundary|housenumber|poi|building/.test(id)) {
      try { map.setLayoutProperty(l.id, 'visibility', 'none'); } catch (e) {}
    }
  });
}
function makeBibleMarker(pl, interactive, bookLabel, chapter) {
  const el = document.createElement('div');
  el.className = 'bp-marker';
  el.innerHTML = '<span class="bp-dot"></span><span class="bp-label">' + pl.name + '</span>';
  el.style.pointerEvents = interactive ? 'auto' : 'none';
  return el;
}
function addBibleMarkers(map, ctx, interactive, store) {
  (store || []).forEach(m => m.remove());
  const out = [];
  (ctx.biblePlaces || []).forEach(pl => {
    const el = makeBibleMarker(pl, interactive);
    const m = new maplibregl.Marker({ element: el, anchor: 'left' }).setLngLat([pl.lng, pl.lat]).addTo(map);
    if (interactive) {
      const refs = (pl.verses || []).map(v => currentChapterData.chapter + ':' + v).join(', ');
      const pop = new maplibregl.Popup({ offset: 12, closeButton: false })
        .setHTML('<b>' + pl.name + '</b><br><span style="font-size:11px">' + currentChapterData.book + ' ' + refs + '</span>');
      m.setPopup(pop);
    }
    out.push(m);
  });
  return out;
}
let liveBibleMarkers = [];

let liveMapMarker = null;

function updateLiveMap(coords, placeName) {
  ensureLiveMap();
  if (!liveMap || !coords) { if (coords) livePending = { coords, placeName }; return; }
  const setPos = () => {
    liveMap.jumpTo({ center: [coords.lng, coords.lat], zoom: coords.zoom || 12 });
    if (liveMapMarker) liveMapMarker.setLngLat([coords.lng, coords.lat]);
    const cc = currentChapterData && currentChapterData.context;
    if (cc && cc.biblePlaces) { bibleOnlyStyle(liveMap); if (liveMapMarker) liveMapMarker.remove(); }
    if (liveChapterPin) { liveChapterPin.remove(); liveChapterPin = null; }
    const pin = chapterPinEl(cc && cc.mapCoords ? cc : { mapCoords: coords, currentImage: cc && cc.currentImage });
    if (pin) { liveChapterPin = new maplibregl.Marker({ element: pin, anchor: 'center' }).setLngLat([coords.lng, coords.lat]).addTo(liveMap); if (liveMapMarker) { liveMapMarker.remove(); liveMapMarker = null; } }
  };
  { const cc = currentChapterData && currentChapterData.context;
    if (cc && cc.biblePlaces) liveBibleMarkers = addBibleMarkers(liveMap, cc, true, liveBibleMarkers);
    else { liveBibleMarkers.forEach(m => m.remove()); liveBibleMarkers = []; } }
  if (liveMap.loaded()) setPos(); else liveMap.once('load', setPos);
  requestAnimationFrame(() => liveMap.resize());
}

function chapterUsesLiveMap() {
  return true;
}

// ---------- Setting tab: image carousel ----------
const carouselOrder = ['map', 'historical', 'current'];
let carouselIndex = 0;
const carouselSlideEls = document.querySelectorAll('.carousel-slide');
const carouselDotEls = document.querySelectorAll('.carousel-dot');
const carouselCaptionEl = document.getElementById('carouselCaption');
const carouselPrevBtn = document.getElementById('carouselPrev');
const carouselNextBtn = document.getElementById('carouselNext');

function renderCarousel() {
  const name = carouselOrder[carouselIndex];
  carouselSlideEls.forEach(el => el.classList.toggle('active', el.dataset.slide === name));
  carouselDotEls.forEach((el, i) => el.classList.toggle('active', i === carouselIndex));

  const ctx = currentChapterData ? currentChapterData.context : null;
  if (name === 'map') {
    carouselCaptionEl.textContent = ctx && ctx.mapCoords ? ctx.mapCoords.placeName : '';
    const svgEl = document.getElementById('regionMap');
    const liveEl = document.getElementById('liveMap');
    if (chapterUsesLiveMap()) {
      svgEl.style.display = 'none';
      liveEl.style.display = 'block';
      if (ctx && ctx.mapCoords) updateLiveMap(ctx.mapCoords, ctx.mapCoords.placeName);
    } else {
      liveEl.style.display = 'none';
      svgEl.style.display = 'block';
      ensureRegionMap();
      if (ctx && ctx.mapCoords) updateRegionMap(ctx.mapCoords, ctx.mapCoords.placeName);
    }
  } else if (name === 'historical') {
    renderImageSlide('historicalSlide', ctx && ctx.historicalImage, 'Historical depiction \u2014 coming soon');
  } else {
    renderImageSlide('currentSlide', ctx && ctx.currentImage, 'Present day \u2014 coming soon');
  }
}

// Wikimedia Special:FilePath serves the full-size original (often 5-20 MB), which can
// exhaust memory on phones and make the browser reload the page. Ask for a ~1000px version.
// Wikimedia only serves thumbnails at its standard widths; any other width (100, 600, 700, 900, 1000...) is refused,
// so every width we ask for is rounded up to the next standard one.
const WM_WIDTHS = [20, 40, 60, 120, 250, 330, 500, 960, 1280, 1920];
function wmW(w) { w = Number(w) || 500; for (const s of WM_WIDTHS) if (s >= w) return s; return 1920; }
function wmSnap(u) { return typeof u === 'string' ? u.replace(/([?&]width=)(\d+)/, (m, a, n) => a + wmW(n)) : u; }
function displayImageUrl(url) {
  if (url && url.includes('commons.wikimedia.org/wiki/Special:FilePath/') && !url.includes('?')) {
    return url + '?width=960';
  }
  return wmSnap(url);
}

function renderImageSlide(slideId, imageData, placeholderText) {
  const slide = document.getElementById(slideId);
  if (imageData && imageData.url) {
    slide.innerHTML = `<img src="${displayImageUrl(imageData.url)}" alt="${imageData.caption || ''}" loading="lazy" decoding="async">`;
    carouselCaptionEl.textContent = (imageData.caption || '') + (imageData.credit ? ' \u2014 ' + imageData.credit : '');
  } else {
    slide.innerHTML = `
      <div class="carousel-placeholder">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="3" y="3" width="18" height="14" rx="1.5"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 20"/></svg>
        <span>${placeholderText}</span>
      </div>`;
    carouselCaptionEl.textContent = placeholderText;
  }
}

function setCarouselSlide(index) {
  carouselIndex = (index + carouselOrder.length) % carouselOrder.length;
  renderCarousel();
}

carouselPrevBtn.addEventListener('click', () => setCarouselSlide(carouselIndex - 1));
carouselNextBtn.addEventListener('click', () => setCarouselSlide(carouselIndex + 1));

function toTitleCase(str) {
  return str.toLowerCase().replace(/(^|[\s—-])([a-z])/g, (m, sep, ch) => sep + ch.toUpperCase());
}

// ---------- Context tab: accordion sections ----------
const ACCORDION_ICONS = {
  setting: '<path d="M9 20l-5.5-2V4L9 6m0 14l6-2m-6 2V6m6 12l5.5 2V6L15 4m0 14V4m0 2L9 4"/>',
  history: '<path d="M3 21h18"/><path d="M5 21V9l7-5 7 5v12"/><path d="M9 21v-6h6v6"/>',
  customs: '<path d="M20.59 13.41L13.42 20.58a2 2 0 0 1-2.83 0L3 13V3h10l7.59 7.59a2 2 0 0 1 0 2.82z"/><circle cx="7.5" cy="7.5" r="1.5" fill="currentColor" stroke="none"/>',
  timeline: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
  author: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>'
};

let accordionOpen = {};

// Clamped preview + "Read more" (Setting & History tab). The button only shows when the text really is cut off.
function rmHtml(html) {
  return `<div class="rm"><p class="panel-text rm-body">${html}</p><button type="button" class="rm-btn"><span class="rm-lbl">Read more</span><svg width="10" height="6" viewBox="0 0 10 6"><path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.6"/></svg></button></div>`;
}
function wireRm(root) {
  root.querySelectorAll('.rm').forEach(r => {
    if (r._wired) return; r._wired = true;
    const body = r.querySelector('.rm-body');
    r.classList.toggle('can', body.textContent.length > 100);
    r.querySelector('.rm-btn').addEventListener('click', e => {
      e.stopPropagation();
      const o = r.classList.toggle('open');
      r.querySelector('.rm-lbl').textContent = o ? 'Show less' : 'Read more';
    });
  });
  refreshRm(root);
}
function refreshRm(root) {
  (root || document).querySelectorAll('.rm:not(.open)').forEach(r => {
    const b = r.querySelector('.rm-body');
    if (!b || !b.offsetParent) return;
    r.classList.toggle('can', b.scrollHeight > b.clientHeight + 1);
  });
}
window.addEventListener('resize', () => refreshRm());

function renderAccordion(ctx) {
  accordionOpen = { setting: true, timeline: true };

  const sections = [];

  let settingBody = `<p class="accordion-place">${toTitleCase(ctx.mapLabel.split('—')[0].trim())}</p>${rmHtml(ctx.setting)}`;
  const histRows = ctx.overview && Array.isArray(ctx.overview.history) ? ctx.overview.history : [];
  if (ctx.history) {
    settingBody += `<p class="ctx-subhead ctx-subhead-spaced">HISTORY</p>${rmHtml(ctx.history)}`;
  } else if (histRows.length) {
    settingBody += `<p class="ctx-subhead ctx-subhead-spaced">HISTORY</p>` + histRows.map(x => `<p class="ctx-row"><b>${escHtml(x.h)}.</b> ${escHtml(x.t)}</p>`).join('');
  }
  settingBody += `<p class="ctx-subhead ctx-subhead-spaced">CUSTOMS</p>${rmHtml(ctx.custom)}`;
  sections.push({ id: 'setting', label: 'Setting and History', icon: 'setting', body: settingBody });

  sections.push({
    id: 'timeline',
    label: 'Timeline',
    icon: 'timeline',
    body: `${rmHtml(ctx.timelineImmediate)}
           <p class="ctx-subhead ctx-subhead-spaced" style="margin-top:14px;">BIBLE-WIDE</p>
           ${rmHtml(ctx.timelineBible)}
           <button class="ctx-timeline-link" id="ctxTimelineLink">
             <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">${ACCORDION_ICONS.timeline}</svg>
             See the full Bible timeline
           </button>`
  });

  drawAccordion(sections);
}

function drawAccordion(sections) {
  const el = document.getElementById('contextAccordion');
  el.innerHTML = sections.map(s => `
    <div class="accordion-item">
      <button class="accordion-head" data-section="${s.id}">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="1.6">${ACCORDION_ICONS[s.icon]}</svg>
        <span class="accordion-label">${s.label.toUpperCase()}</span>
        <svg class="accordion-chevron ${accordionOpen[s.id] ? 'open' : ''}" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--parchment-dim)" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
      </button>
      <div class="accordion-body ${accordionOpen[s.id] ? 'open' : ''}">${s.body}</div>
    </div>
  `).join('');

  el.querySelectorAll('.accordion-head').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.section;
      accordionOpen[id] = !accordionOpen[id];
      btn.nextElementSibling.classList.toggle('open', accordionOpen[id]);
      btn.querySelector('.accordion-chevron').classList.toggle('open', accordionOpen[id]);
      refreshRm(btn.nextElementSibling);
    });
  });
  wireRm(el);

  const link = document.getElementById('ctxTimelineLink');
  if (link) link.addEventListener('click', async () => { await loadEvents(); openTimelineAtChapter(currentBook, currentChapterNum); });
}

// ---------- Boot ----------
async function init() {
  manifest = await fetchJSON('data/manifest.json');
  currentBook = manifest.books[0].slug;
  const book = manifest.books.find(b => b.slug === currentBook);
  currentChapterNum = book.availableChapters[0];

  // Restore the last place the reader was, so an unexpected page reload does not send them back to Matthew 1.
  try {
    const saved = JSON.parse(localStorage.getItem('foreverBiblePos') || 'null');
    if (saved) {
      const sb = manifest.books.find(b => b.slug === saved.book);
      if (sb && sb.availableChapters.includes(saved.chapter)) {
        currentBook = sb.slug;
        currentChapterNum = saved.chapter;
      }
    }
  } catch (e) { /* storage unavailable; fall back to Matthew */ }

  // archaeology photos are needed by the Deep Dive; never let a slow/missing file block the app for long
  await Promise.race([Promise.all([loadMapImages(), loadLibs(), loadBooks(), loadWC()]), new Promise(r => setTimeout(r, 3000))]);
  Promise.all([loadLibs(), loadBooks(), loadWC()]).then(() => { try { if (currentChapterData && currentChapterData.context) fillTemplateTabs(currentChapterData.context); } catch (e) {} });
  await loadChapter();
  goToScreen('read');

  navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      // From a Deep Dive, the Read tab returns to the reader at the chapter being studied.
      if (btn.dataset.screen === 'booknav' && currentScreen === 'deepdive') {
        goToScreen('read');
        try { const sc = document.querySelector('#screen-read .scroll, #screen-read'); if (sc) sc.scrollTop = 0; } catch (e) {}
        return;
      }
      // the Deep Dive button opens the landing page; a book and chapter picked there open the study itself
      if (btn.dataset.screen === 'deepdive') { dhPick = null; goToScreen('divehome'); return; }
      goToScreen(btn.dataset.screen);
    });
  });
  tourMaybeStart();
}

async function fetchJSON(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
  return res.json();
}

// ---------- Quick-nav selects (Read screen + Deep Dive) ----------
function populateBookSelect(selectEl) {
  selectEl.innerHTML = '';
  manifest.books.forEach(b => {
    const opt = document.createElement('option');
    opt.value = b.slug;
    opt.textContent = b.name;
    selectEl.appendChild(opt);
  });
  selectEl.value = currentBook;
}

function populateChapterSelect(selectEl) {
  const book = manifest.books.find(b => b.slug === currentBook);
  selectEl.innerHTML = '';
  for (let n = 1; n <= book.totalChapters; n++) {
    const opt = document.createElement('option');
    opt.value = n;
    const available = book.availableChapters.includes(n);
    opt.textContent = 'Chapter ' + n + (available ? '' : ' (soon)');
    opt.disabled = !available;
    selectEl.appendChild(opt);
  }
  selectEl.value = currentChapterNum;
}

// ---------- Combined book + chapter picker (Deep Dive) ----------
const pickOverlay = document.getElementById('pickOverlay');
const pickBody = document.getElementById('pickBody');
const pickTitle = document.getElementById('pickTitle');
const pickBack = document.getElementById('pickBack');
let pickBookSlug = null;
function pickShowBooks() {
  pickBookSlug = null;
  pickTitle.textContent = 'Choose a book';
  pickBack.style.visibility = 'hidden';
  pickBody.innerHTML = manifest.books.map(b => `<button class="pick-book" data-slug="${b.slug}"><span>${b.name}</span><small>${b.availableChapters.length}/${b.totalChapters}</small></button>`).join('');
  pickBody.querySelectorAll('.pick-book').forEach(btn => btn.addEventListener('click', () => pickShowChapters(btn.dataset.slug)));
}
function pickShowChapters(slug) {
  pickBookSlug = slug;
  const b = manifest.books.find(x => x.slug === slug);
  pickTitle.textContent = b.name;
  pickBack.style.visibility = 'visible';
  let html = '<div class="pick-grid">';
  for (let n = 1; n <= b.totalChapters; n++) {
    const ok = b.availableChapters.includes(n);
    html += `<button class="pick-ch${slug === currentBook && n === currentChapterNum ? ' cur' : ''}" data-n="${n}" ${ok ? '' : 'disabled'}>${n}</button>`;
  }
  pickBody.innerHTML = html + '</div>';
  pickBody.querySelectorAll('.pick-ch:not(:disabled)').forEach(btn => btn.addEventListener('click', async () => {
    currentBook = slug; currentChapterNum = Number(btn.dataset.n);
    pickOverlay.hidden = true;
    await loadChapter();
    if (currentScreen === 'deepdive') { renderFolderContent(); ddToTop(); }
  }));
}
document.getElementById('ddPickBtn').addEventListener('click', () => { pickShowBooks(); pickOverlay.hidden = false; });
document.getElementById('pickX').addEventListener('click', () => { pickOverlay.hidden = true; });
pickBack.addEventListener('click', pickShowBooks);

function syncQuickNav() {
  const pb = document.getElementById('ddPickBtn');
  if (pb && manifest) {
    const bk = manifest.books.find(b => b.slug === currentBook);
    pb.firstChild.textContent = (bk ? bk.name : '') + ' ' + currentChapterNum + ' ';
  }
  populateBookSelect(readBookSelect);
  populateChapterSelect(readChapterSelect);
  populateBookSelect(ddBookSelect);
  populateChapterSelect(ddChapterSelect);
}

async function handleBookChange(newSlug) {
  currentBook = newSlug;
  const book = manifest.books.find(b => b.slug === currentBook);
  currentChapterNum = book.availableChapters[0];
  await loadChapter();
  if (currentScreen === 'deepdive') { renderFolderContent(); ddToTop(); }
}

async function handleChapterChange(newNum) {
  currentChapterNum = Number(newNum);
  await loadChapter();
  if (currentScreen === 'deepdive') { renderFolderContent(); ddToTop(); }
}

readBookSelect.addEventListener('change', () => handleBookChange(readBookSelect.value));
readChapterSelect.addEventListener('change', () => handleChapterChange(readChapterSelect.value));
ddBookSelect.addEventListener('change', () => handleBookChange(ddBookSelect.value));
ddChapterSelect.addEventListener('change', () => handleChapterChange(ddChapterSelect.value));

document.getElementById('harmonyBackBtn').addEventListener('click', () => {
  goToScreen('deepdive');
});

// ---------- Deep Dive landing page: pick a book (its overview opens), then a chapter ----------
let dhPick = null;
function dhBookView(slug) {
  const mb = manifest.books.find(b => b.slug === slug); if (!mb) return '';
  const B = BOOKS && BOOKS.books && BOOKS.books[slug], st = BOOKS && BOOKS.stats && BOOKS.stats[slug];
  const col = MAP_BOOK_COLORS[slug] || '#8a6d0b';
  const ttl = k => (chapterIndex && chapterIndex[slug] && chapterIndex[slug][String(k)]) || '';
  const grid = `<div class="dh-grid">${mb.availableChapters.map(n => `<button type="button" data-c="${n}" title="${escHtml(ttl(n))}">${n}</button>`).join('')}</div>`;
  const nums = st ? `<div class="bk-nums"><div><b>${st.ch}</b><span>chapters</span></div><div><b>${fmtN(st.v)}</b><span>verses</span></div><div><b>${fmtN(st.w)}</b><span>English words</span></div><div><b>${fmtN(st.g)}</b><span>Greek words</span></div></div>` : '';
  const facts = B ? B.facts.map(f => `<dt>${escHtml(f[0])}</dt><dd>${escHtml(f[1])}</dd>`).join('') : '';
  const outline = B ? B.outline.map(o => `<button type="button" class="dh-out" data-c="${o[0]}"><span class="dh-oc">${o[0] === o[1] ? 'Ch ' + o[0] : 'Ch ' + o[0] + '–' + o[1]}</span><span class="dh-ot"><b>${escHtml(o[2])}</b><span>${escHtml(o[3])}</span></span><i>›</i></button>`).join('') : '';
  return `<button type="button" class="dh-back" data-go="home">‹ All books</button>
    <div class="dh-bk" style="--c:${col}">
      <p class="panel-eyebrow">BOOK OVERVIEW</p>
      <h2 class="dh-title">${escHtml(B ? B.full : mb.name)}</h2>
      ${B ? `<p class="dh-tag">${escHtml(B.tag)}</p>` : ''}
      ${nums}
      <h3 class="dh-h">Choose a chapter <span>opens that chapter’s Deep Dive</span></h3>
      ${grid}
      ${B ? `<h3 class="dh-h">Why it was written</h3><p class="dh-p">${escHtml(B.purpose)}</p><p class="dh-p"><b>Jesus is shown as:</b> ${escHtml(B.jesus)}</p>
      <h3 class="dh-h">At a glance</h3><dl class="dh-facts">${facts}</dl>
      <h3 class="dh-h">Outline <span>tap a section to open it</span></h3><div class="dh-outline">${outline}</div>` : '<p class="dh-p">The overview for this book is still loading.</p>'}
    </div>`;
}
function renderDiveHome() {
  const box = document.getElementById('diveHome'); if (!box || !manifest) return;
  if (dhPick && !BOOKS) { loadBooks().then(() => { if (dhPick && currentScreen === 'divehome') renderDiveHome(); }); }
  if (dhPick) { box.innerHTML = dhBookView(dhPick); return; }
  const have = new Map(manifest.books.map(b => [b.name, b]));
  const cur = currentChapterData;
  const resume = cur ? `<button type="button" class="dh-resume" data-go="resume"><span><em>PICK UP WHERE YOU LEFT OFF</em><b>${escHtml(cur.book)} ${cur.chapter}${cur.title ? ' · ' + escHtml(cur.title) : ''}</b></span><i>›</i></button>` : '';
  const tiles = manifest.books.map(b => {
    const f = GOSPEL_FACTS[b.slug];
    return `<button type="button" class="dh-tile" data-b="${b.slug}" style="--c:${MAP_BOOK_COLORS[b.slug] || '#8a6d0b'}"><b>${escHtml(b.name)}</b><span class="dh-n">${b.availableChapters.length} chapters</span>${f ? `<em>${escHtml(f.focus)}</em>` : ''}</button>`;
  }).join('');
  const shelf = TL_GROUPS.map((g, gi) => {
    const books = TL_BOOKS.filter(b => b[2] === gi);
    const spine = b => {
      const mb = have.get(b[0]), w = Math.min(34, Math.round(15 + 3.2 * Math.sqrt(b[1])));
      return `<button type="button" class="dh-sp${mb ? ' ok' : ''}" ${mb ? `data-b="${mb.slug}"` : 'disabled'} title="${escHtml(b[0])}${mb ? '' : ' · coming soon'}" style="--c:${g.c};flex:0 1 ${w}px"><span>${escHtml(b[0])}</span></button>`;
    };
    // every group sits on one row of spines; Letters (the longest) takes two
    const rows = g.n === 'Letters' ? [books.slice(0, Math.ceil(books.length / 2)), books.slice(Math.ceil(books.length / 2))] : [books];
    return `<div class="dh-grp"><h5 style="color:${g.c}">${g.n}</h5>${rows.map(r => `<div class="dh-row">${r.map(spine).join('')}</div>`).join('')}</div>`;
  }).join('');
  box.innerHTML = `<p class="panel-eyebrow">DEEP DIVE</p>
    <h2 class="dh-title">Go deeper into the Word</h2>
    <p class="dh-intro">Want to learn more about the history, setting and customs of the time? Pick a book, then a chapter, to dive deeper.</p>
    ${resume}
    <h3 class="dh-h">Ready to explore</h3>
    <div class="dh-tiles">${tiles}</div>
    <h3 class="dh-h">The whole Bible <span>the other books are on their way</span></h3>
    <div class="dh-shelf">${shelf}</div>`;
}
(function wireDiveHome() {
  const box = document.getElementById('diveHome'); if (!box) return;
  box.addEventListener('click', ev => {
    const c = ev.target.closest('[data-c]'), b = ev.target.closest('[data-b]'), g = ev.target.closest('[data-go]');
    if (g) { if (g.dataset.go === 'home') { dhPick = null; renderDiveHome(); box.scrollTop = 0; } else { goToScreen('deepdive'); ddToTop(); } return; }
    if (c && dhPick) { openPassage(dhPick, Number(c.dataset.c), 1, true); return; }
    if (b && !b.disabled) { dhPick = b.dataset.b; renderDiveHome(); box.scrollTop = 0; }
  });
})();

// ---------- Screen routing ----------
function goToScreen(name) {
  const prevScreen = currentScreen;
  currentScreen = name;
  tlApplyWide();
  screens.forEach(s => s.classList.toggle('active', s.id === `screen-${name}`));

  document.querySelectorAll('.nav-btn, .nav-btn-center button').forEach(b => {
    b.classList.toggle('active', b.dataset.screen === name || (name === 'read' && b.dataset.screen === 'booknav') || (name === 'divehome' && b.dataset.screen === 'deepdive'));
  });

  if (name === 'booknav') {
    navStep = 'books';
    navBrowsingBook = null;
    renderBookNav();
  }
  if (name === 'deepdive') {
    renderDeepDive();
  }
  if (name === 'divehome') renderDiveHome();
  if (name === 'timeline') {
    renderTimeline();
  }
  if (name === 'map') {
    showMapScreen(prevScreen !== 'map');
  }
  if (name !== 'timeline') tlClearSelection();
  tlApplyWide();
  tourNote('screen:' + name);
}
// Leaving the Timeline screen puts the shelf and the threads back to "nothing selected".
function tlClearSelection() {
  if (tlBook == null && tlChap == null && tlGroup == null && tlRB == null && !tlRP) return;
  tlBook = null; tlChap = null; tlGroup = null; tlHitI = -1; tlRB = null; tlRP = null;
  try { tlShelfSync(); tlApplyHits(); } catch (e) {}
  try { tlRefsClose(); } catch (e) {}
}

// ---------- Timeline screen: the whole Bible (data/bible-timeline.json) ----------
// Views: Line (chronological, the default), Threads, Lanes.
// The Line has two separate levels: Overview (the big eras) and Detail (every moment).
// Pinch, mouse wheel and + / - only zoom inside the current level; the buttons switch level.
const TL_LEVELS = [
  { id: 'era', name: 'Overview', step: 190, w: 204, level: -1 },
  { id: 'dt', name: 'Detail', step: 112, w: 170, level: 3 }
];
const TL_CERT = { f: 'Firmly dated', a: 'Approximate date', d: 'Circa', o: 'Placed by the text', p: 'Yet to come' };
const TL_GROUPS = [
  { n: 'Law', c: '#7a5c4a' }, { n: 'History', c: '#5c7a4a' }, { n: 'Poetry', c: '#7b5a8a' }, { n: 'Prophets', c: '#8c4646' },
  { n: 'Gospels', c: '#8a6d0b' }, { n: 'Acts', c: '#2f7f7a' }, { n: 'Letters', c: '#4d5f8f' }, { n: 'Revelation', c: '#6b6b6b' }
];
const TL_BOOKS = [
  ['Genesis', 50, 0], ['Exodus', 40, 0], ['Leviticus', 27, 0], ['Numbers', 36, 0], ['Deuteronomy', 34, 0],
  ['Joshua', 24, 1], ['Judges', 21, 1], ['Ruth', 4, 1], ['1 Samuel', 31, 1], ['2 Samuel', 24, 1], ['1 Kings', 22, 1], ['2 Kings', 25, 1], ['1 Chronicles', 29, 1], ['2 Chronicles', 36, 1], ['Ezra', 10, 1], ['Nehemiah', 13, 1], ['Esther', 10, 1],
  ['Job', 42, 2], ['Psalms', 150, 2], ['Proverbs', 31, 2], ['Ecclesiastes', 12, 2], ['Song of Solomon', 8, 2],
  ['Isaiah', 66, 3], ['Jeremiah', 52, 3], ['Lamentations', 5, 3], ['Ezekiel', 48, 3], ['Daniel', 12, 3], ['Hosea', 14, 3], ['Joel', 3, 3], ['Amos', 9, 3], ['Obadiah', 1, 3], ['Jonah', 4, 3], ['Micah', 7, 3], ['Nahum', 3, 3], ['Habakkuk', 3, 3], ['Zephaniah', 3, 3], ['Haggai', 2, 3], ['Zechariah', 14, 3], ['Malachi', 4, 3],
  ['Matthew', 28, 4], ['Mark', 16, 4], ['Luke', 24, 4], ['John', 21, 4], ['Acts', 28, 5],
  ['Romans', 16, 6], ['1 Corinthians', 16, 6], ['2 Corinthians', 13, 6], ['Galatians', 6, 6], ['Ephesians', 6, 6], ['Philippians', 4, 6], ['Colossians', 4, 6], ['1 Thessalonians', 5, 6], ['2 Thessalonians', 3, 6], ['1 Timothy', 6, 6], ['2 Timothy', 4, 6], ['Titus', 3, 6], ['Philemon', 1, 6], ['Hebrews', 13, 6], ['James', 5, 6], ['1 Peter', 5, 6], ['2 Peter', 3, 6], ['1 John', 5, 6], ['2 John', 1, 6], ['3 John', 1, 6], ['Jude', 1, 6], ['Revelation', 22, 7]
];
const tlAbbr = n => { const m = n.match(/^(\d )?(.+)$/); const core = m[2].split(' ')[0]; return (m[1] || '') + (core.length > 4 ? core.slice(0, 3) : core); };
let TL = null, tlP = null, tlSel = null, tlLayout = [], tlBuilt = false, tlFocusPending = null, tlLastFocus = 0;
let tlLv = 1, tlViewMode = 'line', tlYear = 27;
let tlZ = { l0: 0.6, l1: 0.6, threads: 1, lanes: 4 }; // opens at 60%, starting at the life of Jesus
let tlBook = null, tlChap = null, tlGroup = null, tlHitI = -1, tlHits = { all: [], vis: [] }, tlShelfShut = false;
const tlSave = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
try {
  const lv = localStorage.getItem('vi_tl_lv3');
  if (lv === '0' || lv === '1') tlLv = Number(lv);
  const z = JSON.parse(localStorage.getItem('vi_tl_zoom5') || 'null');
  if (z && typeof z === 'object') Object.keys(tlZ).forEach(k => { if (z[k] > 0.3 && z[k] < 15) tlZ[k] = z[k]; });
  { const sv = localStorage.getItem('vi_tl_shelf2'); // the Bible shelf starts folded on a phone (portrait or landscape) and open on a bigger screen, until the person chooses
    tlShelfShut = sv === null ? window.matchMedia('(max-width:699px), (orientation:landscape) and (max-height:520px)').matches : sv === '0'; }
} catch (e) {}
function tlPrep(j) {
  if (!j || !j.eras) return j;
  const bySec = {};
  j.events.forEach((e, i) => { (bySec[e.s] = bySec[e.s] || []).push(i); });
  j.bn = new Array(66).fill(0);
  j.events.forEach(e => { if (e.z <= 3 && (e.zx === undefined || e.zx >= 3)) new Set((e.bk || []).map(b => b[0])).forEach(b => { j.bn[b]++; }); });
  let tot = 0;
  j.eras.forEach(er => { er.idx = [].concat(...er.secs.map(s => bySec[s] || [])); er.fi0 = Math.min(...er.idx); er.fi1 = Math.max(...er.idx); er.mid = (er.fi0 + er.fi1) / 2; er.w = Math.sqrt(er.idx.length); tot += er.w; });
  let acc = 0;
  j.eras.forEach(er => {
    er.nv0 = acc / tot; acc += er.w; er.nv1 = acc / tot;
    const bs = new Set(); er.idx.forEach(i => (j.events[i].bk || []).forEach(b => bs.add(b[0])));
    er.books = [...bs].sort((a, b) => a - b);
    er.key = er.idx.filter(i => j.events[i].z === 0);
  });
  return j;
}
function loadTL() {
  return tlP || (tlP = fetch('data/bible-timeline.json').then(r => (r.ok ? r.json() : null)).catch(() => null).then(j => { TL = tlPrep(j); return TL; }));
}
function tlVisible(level) { return TL.events.map((e, i) => Object.assign({ fi: i }, e)).filter(e => e.z <= level && (e.zx === undefined || e.zx >= level)); }
function tlRefQuery(e) {
  let r = e.q || e.r || '';
  const m = r.match(/^Background \((.+)\)$/); if (m) r = m[1];
  return String(r).split(';')[0].trim();
}
// a timeline photo that fails to load (Wikimedia sometimes throttles) tries again before giving up
function tlImgErr(im) {
  const n = Number(im.dataset.n || 0) + 1; im.dataset.n = n;
  if (n <= 5) setTimeout(() => { if (im.isConnected) im.src = im.getAttribute('src'); }, 900 * n + Math.random() * 600); else im.remove();
}
function tlThumb(e) {
  if (!e.ev || !EV_BY_ID[e.ev]) return null;
  const img = mapHero(EV_BY_ID[e.ev]);
  return img ? mapImgUrl(img, 260) : null;
}
function tlSecOf(id) { return TL.sections.find(s => s.id === id) || { name: '', color: '#8a6d0b' }; }
const tlZoomKey = () => (tlViewMode === 'line' ? 'l' + tlLv : tlViewMode);
const tlZoomLimits = () => (tlViewMode === 'lanes' ? [1.5, 14] : tlViewMode === 'threads' ? [0.6, 8] : [0.55, 1.8]);
const tlEl = id => document.getElementById(id);
const tlEraOf = fi => TL.eras.find(er => fi >= er.fi0 - 0.5 && fi <= er.fi1 + 0.5) || (fi < 0 ? TL.eras[0] : TL.eras[TL.eras.length - 1]);

// piecewise-linear map between a place on the line (px) and a place in the story (event index)
function tlPosAt(x) {
  const L = tlLayout; if (!L.length) return 0;
  if (x <= L[0].x) return L[0].fi;
  if (x >= L[L.length - 1].x) return L[L.length - 1].fi;
  let lo = 0, hi = L.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (L[m].x <= x) lo = m; else hi = m; }
  return L[lo].fi + (x - L[lo].x) / (L[hi].x - L[lo].x) * (L[hi].fi - L[lo].fi);
}
function tlXOfFi(fi) {
  const L = tlLayout; if (!L.length) return 0;
  if (fi <= L[0].fi) return L[0].x;
  if (fi >= L[L.length - 1].fi) return L[L.length - 1].x;
  let lo = 0, hi = L.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (L[m].fi <= fi) lo = m; else hi = m; }
  const d = L[hi].fi - L[lo].fi;
  return L[lo].x + (d ? (fi - L[lo].fi) / d : 0) * (L[hi].x - L[lo].x);
}

// show/hide the pieces that belong to each view
function tlChrome() {
  const v = tlViewMode;
  document.querySelectorAll('#tlViews button').forEach(b => b.classList.toggle('on', b.dataset.v === v));
  document.querySelectorAll('#tlLevels button').forEach(b => b.classList.toggle('on', Number(b.dataset.l) === tlLv));
  tlEl('screen-timeline').classList.toggle('tl-lanebar-on', v === 'lanes' || v === 'threads');
  tlEl('tlLevels').hidden = v !== 'line';
  tlEl('tlThreadBar').hidden = v !== 'threads';
  tlEl('tlYear').hidden = v !== 'lanes';
  tlEl('tlYSub').hidden = v !== 'lanes';
  tlEl('tlView').hidden = v === 'lanes';
  tlEl('tlThreadTop').hidden = v !== 'threads';
  if (v !== 'threads' && tlEl('tlThEmpty')) tlEl('tlThEmpty').hidden = true;
  tlEl('tlHead').classList.toggle('th', v === 'threads');
  tlEl('tlHead').classList.toggle('yb', v === 'lanes');
  tlEl('tlShelf').hidden = v !== 'line';
  tlEl('tlMap').hidden = !(v === 'line' && tlLv === 1);
  tlEl('tlView').classList.toggle('bks', v === 'threads');
  const zv = tlEl('tlZoomVal'); if (zv) zv.textContent = Math.round(tlZ[tlZoomKey()] * 100) + '%';
}
function tlRedraw(focusFi) {
  if (!TL) return;
  tlChrome();
  if (tlViewMode === 'line') { tlDrawTrack(focusFi); tlMapBuild(); tlShelfBuild(); tlShelfSync(); tlApplyHits(); tlNavUpdate(); }
  else if (tlViewMode === 'threads') tlDrawThreads();
  else { ybSubDraw(); ybDraw(tlYear); }
}

// ----- Line view -----
function tlDrawTrack(focusFi) {
  const view = tlEl('tlView'), track = tlEl('tlTrack');
  if (!view || !TL) return;
  const L = TL_LEVELS[tlLv], z = tlZ['l' + tlLv];
  const padL = 130, padR = 150, secGap = 34;
  let html = '', total, axisStart, axisEnd;
  if (tlLv === 0) {
    const ers = TL.eras;
    tlLayout = ers.map((er, k) => ({ era: er, x: padL + k * L.step, side: k % 2 === 0 ? 'up' : 'dn', fi: er.mid }));
    total = padL + (ers.length - 1) * L.step + padR;
    axisStart = padL - 70; axisEnd = total - padR + 70;
    html = `<div class="tl-dots tl-dots-l" style="left:12px;width:${axisStart - 12}px"></div><span class="tl-cap tl-cap-l" style="left:12px">THE BEGINNING</span>`;
    ers.forEach((er, k) => {
      const x0 = k === 0 ? axisStart : tlLayout[k].x - L.step / 2, x1 = k === ers.length - 1 ? axisEnd : tlLayout[k + 1].x - L.step / 2;
      html += `<div class="tl-axs" style="left:${x0}px;width:${x1 - x0}px;background:${er.c}"></div>`;
    });
    html += `<div class="tl-dots tl-dots-r" style="left:${axisEnd}px;width:${total - axisEnd - 12}px"></div><span class="tl-cap tl-cap-r" style="left:${axisEnd + 8}px">ETERNITY &#8734;</span>`;
    tlLayout.forEach((it, k) => {
      const er = it.era, on = tlSel === 'era:' + er.id ? ' on' : '';
      html += `<span class="tl-dot big${on}" data-id="era:${er.id}" style="left:${it.x}px;background:${er.c}"></span>` +
        `<button type="button" class="tl-card era big ${it.side}${on}" data-id="era:${er.id}" data-k="${k}" style="left:${it.x - L.w / 2}px;width:${L.w}px;--c:${er.c}">` +
        `<span class="tl-date">${escHtml(er.d)}</span><b class="tl-title">${escHtml(er.name)}</b><span class="tl-sum">${escHtml(er.sum)}</span>` +
        `<span class="tl-n">${er.idx.length} moments</span></button>`;
    });
    track.querySelectorAll && 0;
    track.innerHTML = html;
    track.querySelectorAll('.tl-card').forEach(b => b.addEventListener('click', () => tlSelectEra(tlLayout[Number(b.dataset.k)].era.id)));
  } else {
    const vis = tlVisible(L.level);
    let x = padL, prevS = null;
    const secs = [];
    tlLayout = vis.map((e, i) => {
      if (prevS !== null && e.s !== prevS) x += secGap;
      if (e.s !== prevS) secs.push({ id: e.s, x0: x, x1: x });
      const item = { e, x, side: i % 2 === 0 ? 'up' : 'dn', fi: e.fi };
      secs[secs.length - 1].x1 = x;
      prevS = e.s;
      x += L.step;
      return item;
    });
    total = x - L.step + padR;
    axisStart = padL - 70; axisEnd = total - padR + 70;
    html = `<div class="tl-dots tl-dots-l" style="left:12px;width:${axisStart - 12}px"></div><span class="tl-cap tl-cap-l" style="left:12px">THE BEGINNING</span>`;
    secs.forEach((s, k) => {
      const sec = tlSecOf(s.id);
      const x0 = k === 0 ? axisStart : s.x0 - secGap / 2;
      const x1 = k === secs.length - 1 ? axisEnd : (secs[k + 1].x0 - secGap / 2);
      html += `<div class="tl-sec" style="left:${x0}px;width:${x1 - x0}px;--c:${sec.color}"><span>${escHtml(sec.name)}</span></div><div class="tl-axs" style="left:${x0}px;width:${x1 - x0}px;background:${sec.color}"></div>`;
    });
    html += `<div class="tl-dots tl-dots-r" style="left:${axisEnd}px;width:${total - axisEnd - 12}px"></div><span class="tl-cap tl-cap-r" style="left:${axisEnd + 8}px">ETERNITY &#8734;</span>`;
    tlLayout.forEach((it, k) => {
      const e = it.e, sec = tlSecOf(e.s);
      const big = e.z === 0 ? ' big' : '';
      const th = tlThumb(e);
      const on = tlSel === e.id ? ' on' : '';
      html += `<span class="tl-dot${big}${on}" data-id="${e.id}" style="left:${it.x}px;background:${sec.color}"></span>` +
        `<button type="button" class="tl-card ${it.side}${big}${on}" data-id="${e.id}" data-k="${k}" style="left:${it.x - L.w / 2}px;width:${L.w}px;--c:${sec.color}">` +
        (th ? `<img class="tl-th" src="${escHtml(th)}" alt="" loading="lazy" decoding="async" onerror="tlImgErr(this)">` : '') +
        `<span class="tl-date">${escHtml(e.d)}</span><b class="tl-title">${escHtml(e.t)}</b>` +
        `</button>`;
    });
    track.innerHTML = html;
    track.querySelectorAll('.tl-card').forEach(b => b.addEventListener('click', () => tlSelect(tlLayout[Number(b.dataset.k)].e.id, false)));
  }
  track.style.width = total + 'px'; track.style.height = ''; track.style.minHeight = ''; track.style.zoom = z;
  track.classList.toggle('tl-lo', z < 0.8);
  track.dataset.level = L.id; track.style.marginLeft = '';
  if (focusFi != null) tlCenterOnFi(focusFi);
}
function tlCenterX(x) {
  const v = tlEl('tlView'); if (!v) return;
  const z = tlViewMode === 'lanes' ? 1 : tlZ[tlZoomKey()];
  const left = Math.max(0, x * z - v.clientWidth / 2);
  try { v.scrollTo({ left, behavior: 'smooth' }); } catch (er) { v.scrollLeft = left; }
}
function tlCenterOnFi(fi) {
  if (!tlLayout.length) return;
  const v = tlEl('tlView');
  v.scrollLeft = Math.max(0, tlXOfFi(fi) * tlZ[tlZoomKey()] - v.clientWidth / 2);
}
function tlCurrentFocus() {
  const view = tlEl('tlView');
  if (tlSel) { const i = TL.events.findIndex(e => e.id === tlSel); if (i >= 0) return i; }
  if (!tlLayout.length || tlViewMode === 'lanes') return tlLastFocus;
  return tlPosAt((view.scrollLeft + view.clientWidth / 2) / tlZ[tlZoomKey()]);
}
// switch level (0 Overview, 1 Detail), keeping the same place in the story in the middle
function tlGoLevel(n, o) {
  o = o || {};
  n = Math.max(0, Math.min(1, n));
  if (tlBuilt && n === tlLv && tlViewMode === 'line' && o.fi == null) return;
  const view = tlEl('tlView');
  const ax = o.ax != null ? o.ax : view.clientWidth / 2;
  let fi = o.fi;
  if (fi == null) fi = tlViewMode === 'line' && tlLayout.length ? tlPosAt((view.scrollLeft + ax) / tlZ[tlZoomKey()]) : tlLastFocus;
  tlLv = n; tlViewMode = 'line';
  tlSave('vi_tl_lv3', String(n)); tlSave('vi_tl_zoom5', JSON.stringify(tlZ));
  if (!o.keepSel) tlClose();
  tlRedraw(null);
  view.scrollLeft = Math.max(0, tlXOfFi(fi) * tlZ['l' + n] - ax);
  tlNavUpdate();
}
function tlSetView(v) {
  if (v !== 'threads' && v !== 'lanes') v = 'line';
  if (v === tlViewMode && tlBuilt) return;
  tlLastFocus = tlCurrentFocus();
  tlViewMode = v;
  if (v === 'threads') { tlZ.threads = 1; tlSave('vi_tl_zoom5', JSON.stringify(tlZ)); } // the books always open fitted to the width of the screen
  tlClose();
  if (v === 'threads') { const tv = tlEl('tlView'); if (tv) tv.scrollLeft = 0; } // Connections opens at Genesis, not wherever the timeline was scrolled
  tlRedraw(v === 'lanes' ? null : tlLastFocus);
}
function tlSetZoom(z, ax) {
  if (tlViewMode === 'lanes') return ybSetZoom(z);
  const view = tlEl('tlView'), track = tlEl('tlTrack');
  if (ax == null) ax = view.clientWidth / 2;
  const key = tlZoomKey(), [lo, hi] = tlZoomLimits();
  z = Math.max(lo, Math.min(hi, z));
  const old = tlZ[key];
  if (Math.abs(z - old) < 0.002) return false;
  tlZ[key] = z; tlSave('vi_tl_zoom5', JSON.stringify(tlZ));
  const zv = tlEl('tlZoomVal'); if (zv) zv.textContent = Math.round(z * 100) + '%';
  if (tlViewMode === 'threads') {
    const frac = (view.scrollLeft + ax) / Math.max(1, track.offsetWidth);
    if (tlSetZoom.raf) cancelAnimationFrame(tlSetZoom.raf);
    tlSetZoom.raf = requestAnimationFrame(() => { tlSetZoom.raf = 0; tlDrawThreads(frac, ax); });
    return false;
  }
  const cx = (view.scrollLeft + ax) / old;
  track.style.zoom = z; track.classList.toggle('tl-lo', z < 0.8);
  view.scrollLeft = Math.max(0, cx * z - ax);
  tlNavUpdate();
  return false;
}

// ----- Where am I: a small map of the whole story with a lens you can drag (Detail level) -----
// the map gives every era a fair share of the bar (like Overview), so each piece of the line is easy to aim at
let tlMapB = null;
const tlMapXToF = x => { const B = tlMapB; if (!B) return 0; const k = B.bnd.findIndex(q => x < q.b); const q = B.bnd[k < 0 ? B.bnd.length - 1 : k]; return q.f0 + Math.max(0, Math.min(1, (x - q.a) / Math.max(1, q.b - q.a))) * (q.f1 - q.f0); };
const tlMapFToX = f => { const B = tlMapB; if (!B) return 0; const k = B.bnd.findIndex(q => f < q.f1); const q = B.bnd[k < 0 ? B.bnd.length - 1 : k]; return q.a + Math.max(0, Math.min(1, (f - q.f0) / Math.max(1e-6, q.f1 - q.f0))) * (q.b - q.a); };
function tlMapBuild() {
  const box = tlEl('tlMap'), track = tlEl('tlTrack');
  if (!box || !TL || !TL.eras || tlViewMode !== 'line' || tlLv !== 1 || !tlLayout.length) return;
  const E = TL.eras, total = Math.max(1, track.offsetWidth);
  const bnd = E.map((er, k) => ({ a: k === 0 ? 0 : tlXOfFi((E[k - 1].fi1 + er.fi0) / 2), b: k === E.length - 1 ? total : tlXOfFi((er.fi1 + E[k + 1].fi0) / 2), f0: er.nv0, f1: er.nv1 }));
  tlMapB = { bnd, total };
  box.innerHTML = '<div class="mp-top"><span class="mp-lab">You are here</span><b class="mp-era"></b><span class="mp-d"></span></div>' +
    '<div class="mp-wrap"><div class="mp-bar" id="mpBar">' + E.map((er, k) => `<i class="mp-seg" data-k="${k}" title="${escHtml(er.name)}" style="left:${(er.nv0 * 100).toFixed(2)}%;width:${((er.nv1 - er.nv0) * 100).toFixed(2)}%;--c:${er.c}"><em class="mp-nm"></em></i>`).join('') +
    '<div class="mp-lens" id="mpLens"></div></div></div>';
  const bar = tlEl('mpBar');
  const go = ev => {
    const r = bar.getBoundingClientRect(), v = tlEl('tlView'), z = tlZ.l1;
    const f = Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width));
    v.scrollLeft = Math.max(0, tlMapFToX(f) * z - v.clientWidth / 2);
  };
  let drag = false;
  bar.addEventListener('pointerdown', ev => { drag = true; try { bar.setPointerCapture(ev.pointerId); } catch (e) {} tlShelfTouch = 0; go(ev); ev.preventDefault(); });
  bar.addEventListener('pointermove', ev => { if (drag) go(ev); });
  ['pointerup', 'pointercancel'].forEach(t => bar.addEventListener(t, () => { drag = false; }));
  // each era's name sits right on its piece of the bar: the full name if it fits, a short one if not, nothing if the piece is too thin
  requestAnimationFrame(() => tlMapLabels());
  tlMapUpdate();
}
const TL_SHORT = { begin: 'Creation', patriarchs: 'Patriarchs', exodus: 'Exodus', land: 'The land', kings: 'Kings', exile: 'Exile', between: 'Between', jesus: 'Life of Jesus', church: 'Church', future: 'To come' };
const TL_TINY = { begin: 'Gen', patriarchs: 'Pat', exodus: 'Exo', land: 'Land', kings: 'Kings', exile: 'Exile', between: 'Btw', jesus: 'Jesus', church: 'Church', future: 'End' };
function tlMapLabels() {
  const bar = tlEl('mpBar'); if (!bar || !TL || !TL.eras) return;
  const W = bar.clientWidth; if (!W) return;
  const E = TL.eras;
  bar.querySelectorAll('.mp-seg').forEach((seg, k) => {
    const er = E[k], sp = seg.querySelector('.mp-nm'), room = (er.nv1 - er.nv0) * W - 2;
    sp.textContent = ''; sp.style.visibility = 'hidden';
    const sh = TL_SHORT[er.id] || er.name;
    for (const [nm, fs] of [[er.name, 9], [sh, 9], [TL_TINY[er.id] || sh, 9], [TL_TINY[er.id] || sh, 7.5]]) {
      sp.textContent = nm; sp.style.fontSize = fs + 'px'; sp.style.position = 'absolute';
      const w = sp.offsetWidth; sp.style.position = '';
      if (w <= room) { sp.style.visibility = ''; return; }
    }
    sp.textContent = '';
  });
}
function tlMapUpdate() {
  const box = tlEl('tlMap'), lens = tlEl('mpLens'), view = tlEl('tlView');
  if (!box || !lens || !view || !tlMapB || tlViewMode !== 'line' || tlLv !== 1) return;
  const total = tlMapB.total, z = tlZ.l1;
  const x0 = Math.max(0, view.scrollLeft / z), x1 = Math.min(total, (view.scrollLeft + view.clientWidth) / z);
  const f0 = tlMapXToF(x0), f1 = tlMapXToF(x1);
  lens.style.left = (f0 * 100).toFixed(2) + '%';
  lens.style.width = Math.max(1.4, (f1 - f0) * 100).toFixed(2) + '%';
  const fi = tlPosAt((x0 + x1) / 2), er = tlEraOf(fi), ev = TL.events[Math.max(0, Math.min(TL.events.length - 1, Math.round(fi)))];
  const en = box.querySelector('.mp-era'), dd = box.querySelector('.mp-d');
  if (en) { en.textContent = er.name; en.style.color = er.c; }
  if (dd) dd.textContent = ev ? '· ' + ev.d : '';
}

// ----- Lens: a transparent box on the shelf over the books told in the part of the line you are looking at -----
let tlShelfTouch = 0;
function tlNavUpdate() {
  const box = tlEl('tlShelf'), bk = tlEl('shBooks');
  tlMapUpdate();
  if (!TL || !TL.eras || !box || !bk || !box.dataset.built || tlViewMode !== 'line') return;
  bk.querySelectorAll('.sh-lens').forEach(n => n.remove());
  if (tlLv !== 1 || !tlLayout.length) return;
  const view = tlEl('tlView'), z = tlZ[tlZoomKey()];
  const x0 = view.scrollLeft / z, x1 = (view.scrollLeft + view.clientWidth) / z;
  const set = new Set();
  tlLayout.forEach(it => { if (it.e && it.x >= x0 - 10 && it.x <= x1 + 10) (it.e.bk || []).forEach(b => set.add(b[0])); });
  const arr = [...set].sort((p, q) => p - q), runs = [];
  arr.forEach(i => { const r = runs[runs.length - 1]; if (r && i === r[1] + 1) r[1] = i; else runs.push([i, i]); });
  const sps = bk.querySelectorAll('.sp');
  runs.forEach(r => {
    const p = sps[r[0]], q = sps[r[1]]; if (!p || !q) return;
    const d = document.createElement('div'); d.className = 'sh-lens';
    d.style.left = (p.offsetLeft - 2) + 'px'; d.style.width = (q.offsetLeft + q.offsetWidth - p.offsetLeft + 4) + 'px';
    bk.appendChild(d);
  });
  if (runs.length && Date.now() - tlShelfTouch > 2500) {
    const p = sps[runs[0][0]], q = sps[runs[runs.length - 1][1]];
    if (p.offsetLeft < bk.scrollLeft || q.offsetLeft + q.offsetWidth > bk.scrollLeft + bk.clientWidth) { try { bk.scrollTo({ left: Math.max(0, p.offsetLeft - 20), behavior: 'smooth' }); } catch (er2) { bk.scrollLeft = Math.max(0, p.offsetLeft - 20); } }
  }
}
// ----- Bible shelf (Line view) -----
function tlHitInfo() {
  const none = { all: [], vis: [] };
  if (!TL) return none;
  let test;
  if (tlLv === 0) { if (tlGroup == null) return none; test = e => (e.bk || []).some(b => TL_BOOKS[b[0]][2] === tlGroup); }
  else { if (tlBook == null) return none; test = e => (e.bk || []).some(b => b[0] === tlBook && (tlChap == null || b[1] === 0 || (tlChap >= b[1] && tlChap <= b[2]))); }
  const all = [];
  TL.events.forEach((e, i) => { if (test(e)) all.push(i); });
  const set = new Set(all);
  let vis;
  if (tlLv === 0) vis = TL.eras.filter(er => er.idx.some(i => set.has(i))).map(er => ({ id: 'era:' + er.id, fi: er.mid }));
  else { const vs = new Set(tlLayout.map(it => it.fi)); vis = all.filter(i => vs.has(i)).map(i => ({ id: TL.events[i].id, fi: i })); }
  return { all, vis };
}
function tlShelfBuild() {
  const box = tlEl('tlShelf');
  if (!box || box.dataset.built || !TL) return;
  const has = new Set(); TL.events.forEach(e => (e.bk || []).forEach(b => has.add(b[0])));
  const gc = TL_GROUPS.map((g, gi) => TL_BOOKS.filter(b => b[2] === gi).length);
  box.innerHTML = '<div class="sh-top"><button type="button" class="sh-tog" data-s="tog" aria-label="Show or hide the shelf">&#9662;</button><span class="sh-name"></span><span class="sh-btns"></span></div>' +
    '<div class="sh-body">' +
    '<div class="sh-groups" id="shGroups">' + TL_GROUPS.map((g, gi) => `<button type="button" data-g="${gi}" style="--c:${g.c};flex:${Math.max(gc[gi], 2.2)} 1 0">${g.n}</button>`).join('') + '</div>' +
    '<div class="sh-books" id="shBooks">' + TL_BOOKS.map((b, i) => `<button type="button" data-b="${i}" class="sp${has.has(i) ? ' has' : ''}${b[0].length > 12 ? ' lg' : ''}" title="${b[0]} · ${TL.bn[i]} moment${TL.bn[i] === 1 ? '' : 's'}" style="--c:${TL_GROUPS[b[2]].c};--w:${Math.min(84, Math.round(14 + 9 * Math.sqrt(TL.bn[i])))}px"><span class="nm"><span class="f">${b[0]}</span><span class="a">${tlAbbr(b[0])}</span></span></button>`).join('') + '</div>' +
    '<div class="sh-chaps" id="shChaps" hidden></div></div>';
  box.dataset.built = '1';
  box.classList.toggle('shut', tlShelfShut);
  ['pointerdown', 'wheel', 'touchstart'].forEach(t => tlEl('shBooks').addEventListener(t, () => { tlShelfTouch = Date.now(); }, { passive: true }));
  box.addEventListener('click', ev => {
    const s = ev.target.closest('[data-s]'), c = ev.target.closest('[data-c]'), b = ev.target.closest('[data-b]'), g = ev.target.closest('[data-g]');
    if (c) { tlPickChapter(Number(c.dataset.c)); return; }
    if (b) { tlPickBook(Number(b.dataset.b)); return; }
    if (g) { tlPickGroup(Number(g.dataset.g)); return; }
    if (!s) return;
    const a = s.dataset.s;
    if (a === 'prev') tlHitStep(-1);
    else if (a === 'next') tlHitStep(1);
    else if (a === 'clr') { tlBook = null; tlChap = null; tlGroup = null; tlHitI = -1; tlShelfSync(); tlApplyHits(); }
    else if (a === 'read') tlReadBook();
    else if (a === 'tog') { tlShelfShut = !tlShelfShut; tlSave('vi_tl_shelf2', tlShelfShut ? '0' : '1'); box.classList.toggle('shut', tlShelfShut); }
  });
}
function tlPickBook(i) {
  tlBook = tlBook === i && tlChap == null ? null : i; tlChap = null; tlHitI = -1;
  tlShelfSync(); tlApplyHits(); if (tlBook != null) tlRevealHits();
}
function tlPickGroup(g) {
  tlGroup = tlGroup === g ? null : g; tlHitI = -1;
  tlShelfSync(); tlApplyHits(); if (tlGroup != null) tlRevealHits();
}
function tlPickChapter(ch) {
  tlChap = tlChap === ch ? null : ch; tlHitI = -1;
  tlShelfSync(); tlApplyHits(); tlRevealHits();
}
function tlRevealHits() {
  let info = tlHits;
  if (info.vis.length) tlCenterOnFi(info.vis[0].fi);
}
function tlHitStep(d) {
  let v = tlHits.vis;
  if (!v.length) return;
  tlHitI = tlHitI < 0 ? (d > 0 ? 0 : v.length - 1) : (tlHitI + d + v.length) % v.length;
  const h = v[tlHitI];
  if (h.id.indexOf('era:') === 0) { tlSelectEra(h.id.slice(4)); tlCenterOnFi(h.fi); } else tlSelect(h.id, true);
}
function tlReadBook() {
  if (tlBook == null) return;
  const nm = TL_BOOKS[tlBook][0], ch = tlChap || 1;
  const mb = manifest && manifest.books.find(b => b.name === nm);
  if (mb && mb.availableChapters.includes(ch)) openPassage(mb.slug, ch, 1, false);
  else window.open('https://www.biblegateway.com/passage/?search=' + encodeURIComponent(nm + ' ' + ch) + '&version=BSB', '_blank', 'noopener');
}
function tlShelfSync() {
  const box = tlEl('tlShelf');
  if (!box || !box.dataset.built) return;
  const info = tlHits = tlHitInfo();
  const lv0 = tlLv === 0;
  tlEl('shGroups').hidden = !lv0; tlEl('shBooks').hidden = lv0;
  box.querySelectorAll('.sp').forEach((el, i) => el.classList.toggle('sel', i === tlBook && !lv0));
  box.querySelectorAll('#shGroups button').forEach((el, i) => el.classList.toggle('sel', lv0 && i === tlGroup));
  const nameEl = box.querySelector('.sh-name'), btns = box.querySelector('.sh-btns');
  const sel = lv0 ? tlGroup != null : tlBook != null;
  if (!sel) {
    nameEl.textContent = lv0 ? 'Bible shelf · tap a group of books' : 'Bible shelf · tap a book';
    btns.innerHTML = '';
  } else {
    const g = lv0 ? TL_GROUPS[tlGroup] : TL_GROUPS[TL_BOOKS[tlBook][2]];
    const nm = lv0 ? escHtml(g.n) : escHtml(TL_BOOKS[tlBook][0]) + (tlChap != null ? ' ' + tlChap : '');
    const n = info.vis.length;
    const unit = lv0 ? 'era' : 'moment';
    let txt;
    if (!info.all.length) txt = `<b>${nm}</b> · no moment pinned here yet`;
    else if (lv0) txt = `<b>${nm}</b> · ${info.all.length} moments in ${n} era${n === 1 ? '' : 's'}`;
    else txt = `<b>${nm}</b> · ${n} ${unit}${n === 1 ? '' : 's'}`;
    nameEl.innerHTML = (lv0 ? '' : `<span class="sh-g" style="color:${g.c}">${escHtml(g.n)}</span> `) + txt;
    btns.innerHTML = (info.vis.length ? '<button type="button" data-s="prev" aria-label="Previous">&lsaquo;</button><button type="button" data-s="next" aria-label="Next">&rsaquo;</button>' : '') +
      (lv0 ? '' : '<button type="button" data-s="read">Read</button>') + '<button type="button" data-s="clr" aria-label="Clear">&times;</button>';
  }
  // no chapter row: picking a book simply takes you to it on the line
  const ch = tlEl('shChaps'); if (ch) { ch.hidden = true; ch.dataset.book = ''; }
  const sp = box.querySelector('.sp.sel'); if (sp && sp.scrollIntoView) { try { sp.scrollIntoView({ inline: 'center', block: 'nearest' }); } catch (e) {} }
}
function tlApplyHits() {
  const track = tlEl('tlTrack'); if (!track) return;
  const sel = tlLv === 0 ? tlGroup != null : tlBook != null;
  const on = tlViewMode === 'line' && sel && tlHits.all.length > 0;
  const ids = new Set();
  if (on) { if (tlLv === 0) tlHits.vis.forEach(h => ids.add(h.id)); else tlHits.all.forEach(i => ids.add(TL.events[i].id)); }
  track.classList.toggle('hitmode', on);
  const g = tlLv === 0 ? (tlGroup != null ? TL_GROUPS[tlGroup] : null) : (tlBook != null ? TL_GROUPS[TL_BOOKS[tlBook][2]] : null);
  if (g) track.style.setProperty('--hit', g.c);
  track.querySelectorAll('[data-id]').forEach(n => n.classList.toggle('hit', on && ids.has(n.dataset.id)));
}
function tlLitBooks(e) {
  const lit = new Set((e && e.bk || []).map(b => b[0]));
  document.querySelectorAll('#shBooks .sp').forEach((el, i) => el.classList.toggle('lit', lit.has(i)));
}

// ----- Threads view: one still line of all 66 books. Each layer is a set of arcs from the book that is quoted to the book that quotes it -----
let tlOn = ['prophecy'], tlThOpen = [], tlRB = null, tlRP = null;
try {
  const o = JSON.parse(localStorage.getItem('vi_tl_on') || 'null');
  if (Array.isArray(o)) tlOn = o;
  else {
    const old = JSON.parse(localStorage.getItem('vi_tl_ov') || 'null');
    if (old && Array.isArray(old.scripture)) tlOn = old.scripture.concat(old.themes || []);
  }
} catch (e) {}
const tlOvOn = () => (TL && TL.refs ? TL.refs.filter(o => tlOn.includes(o.id)) : []);
const tlBookWts = () => TL_BOOKS.map(() => 1); // every book is the same width
let tlBk = null; // geometry of the last draw: positions of each book
function tlThreadBarDraw() {
  const bar = tlEl('tlThreadBar'), refs = TL.refs, groups = TL.refGroups || [];
  const sel = refs.filter(o => tlOn.includes(o.id));
  const n = sel.reduce((s, o) => s + o.arcs.length, 0);
  let blurb;
  const empty = tlEl('tlThEmpty');
  if (empty) { empty.hidden = sel.length > 0 || tlThOpen.length > 0; empty.textContent = 'Pick one or more layers to draw how the books of the Bible refer to each other. Each arc runs from the book that is quoted to the book that quotes it.'; }
  if (!sel.length) blurb = '';
  else if (sel.length === 1) blurb = `<b>${escHtml(sel[0].name)}.</b> ${escHtml(sel[0].blurb)}`;
  else blurb = `<b>${sel.length} layers on.</b> Tap a book to see its exact references, or tap an arc to see just those two books.`;
  const old = bar.querySelector('.th-scroll'), keep = old ? old.scrollTop : 0;
  const chip = o => `<button type="button" class="th-chip${tlOn.includes(o.id) ? ' on' : ''}" data-ov="${o.id}" style="--c:${o.color}" title="${escHtml(o.blurb)}"><i></i>${escHtml(o.name)}<u>${o.arcs.length}</u></button>`;
  const open = groups.filter(g => tlThOpen.includes(g.id));
  const tabs = groups.map(g => {
    const list = refs.filter(o => o.g === g.id), k = list.filter(o => tlOn.includes(o.id)).length, isOpen = tlThOpen.includes(g.id);
    return `<button type="button" class="th-gt${isOpen ? ' open' : ''}${k ? ' has' : ''}" data-ov="*grp:${g.id}" aria-expanded="${isOpen}">${escHtml(g.name)}${k ? `<u>${k}</u>` : ''}<em>${isOpen ? '&#9652;' : '&#9662;'}</em></button>`;
  }).join('');
  const top = tlEl('tlThreadTop');
  top.innerHTML = `<div class="th-gtabs">${tabs}<button type="button" class="th-clear" data-ov="*none"${sel.length ? '' : ' disabled'}>Clear all</button></div>`;
  bar.innerHTML = ((open.length ? '<div class="th-scroll">' + open.map(g => {
      const list = refs.filter(o => o.g === g.id); if (!list.length) return '';
      const k = list.filter(o => tlOn.includes(o.id)).length;
      return `<section class="th-grp"><header><b>${escHtml(g.name)}</b><span>${escHtml(g.sub || '')}</span><button type="button" class="th-mini" data-ov="*all:${g.id}">All</button><button type="button" class="th-mini" data-ov="*none:${g.id}"${k ? '' : ' disabled'}>None</button></header><div class="th-chips">${list.map(chip).join('')}</div></section>`;
    }).join('') + '</div>' : '')) +
    (blurb ? `<p class="th-blurb">${blurb}</p>` : '');
  const nw = bar.querySelector('.th-scroll'); if (nw) nw.scrollTop = keep;
}
function tlDrawThreads(anchor, ax) {
  const view = tlEl('tlView'), track = tlEl('tlTrack');
  if (!view || !TL || !TL.refs) return;
  tlThreadBarDraw();
  tlLayout = [];
  const z = tlZ.threads, padX = 16;
  const TL_MINBK = 11.5; // narrowest a book may be, so its name always fits: narrow screens scroll sideways
  const W = Math.round(Math.max(Math.max(300, view.clientWidth) * z, TL_BOOKS.length * TL_MINBK + 2 * padX));
  const H = Math.max(150, view.clientHeight);
  const bookH = Math.max(48, Math.min(100, Math.round(H * 0.32))), grpH = 15, A = H - bookH - grpH - 16;
  const wts = tlBookWts(), tot = wts.reduce((s, v) => s + v, 0), usable = W - 2 * padX;
  const xs = [], ws = []; let acc = padX;
  wts.forEach(w => { const pw = w / tot * usable; xs.push(acc); ws.push(pw); acc += pw; });
  tlBk = { xs, ws, A, W, H, vw: view.clientWidth };
  const cx = i => xs[i] + ws[i] / 2;
  // gather the arcs of every layer that is on, merged so each pair of books gets one arc per layer
  const act = tlOvOn(), merged = [], pairSeen = {};
  act.forEach(o => {
    const m = {};
    o.arcs.forEach(a => {
      const lo = Math.min(a[0], a[1]), hi = Math.max(a[0], a[1]), k = lo * 66 + hi;
      const q = m[k] || (m[k] = { a: lo, b: hi, n: 0, fw: 0, ov: o });
      q.n++; if (a[0] === lo) q.fw++;
    });
    Object.keys(m).forEach(k => { const q = m[k]; q.k = Number(k); q.slot = pairSeen[k] = (pairSeen[k] || 0) + 1; merged.push(q); });
  });
  merged.sort((p, q) => (q.b - q.a) - (p.b - p.a));
  const total = merged.length, span = Math.max(1, cx(65) - cx(0));
  const op = Math.max(.32, Math.min(.82, 1.15 - total / 320)), bw = total > 400 ? .8 : 1.05;
  const maxH = Math.max(40, A - 30);
  let arcs = '', hits = '', dots = '';
  merged.forEach(q => {
    const xa = cx(q.a), xb = cx(q.b), dx = xb - xa, rx = dx / 2;
    let ry = maxH * Math.pow(dx / span, .72);
    ry = Math.max(9, Math.min(ry, Math.max(rx * 2.4, 9))) + (q.slot - 1) * 3;
    ry = Math.min(ry, maxH + 12);
    const sw = (bw + Math.min(2.6, Math.log2(q.n) * .85)).toFixed(2), y = A - 1;
    const d = `M${xa.toFixed(1)} ${y}A${rx.toFixed(1)} ${ry.toFixed(1)} 0 0 1 ${xb.toFixed(1)} ${y}`;
    arcs += `<path class="ar" d="${d}" data-a="${q.a}" data-b="${q.b}" stroke="${q.ov.color}" stroke-width="${sw}" style="opacity:${op}"/>`;
    hits += `<path class="hit" d="${d}" data-a="${q.a}" data-b="${q.b}"/>`;
    const sx = q.fw >= q.n - q.fw ? xa : xb;
    dots += `<circle class="sd" cx="${sx.toFixed(1)}" cy="${y}" r="2.6" fill="${q.ov.color}" data-a="${q.a}" data-b="${q.b}"/>`;
  });
  // the line itself: one coloured stretch per group of books
  let line = '';
  TL_GROUPS.forEach((g, gi) => {
    const idx = TL_BOOKS.map((b, i) => (b[2] === gi ? i : -1)).filter(i => i >= 0);
    const x0 = xs[idx[0]], x1 = xs[idx[idx.length - 1]] + ws[idx[idx.length - 1]];
    line += `<line x1="${x0.toFixed(1)}" x2="${x1.toFixed(1)}" y1="${A + 1.5}" y2="${A + 1.5}" stroke="${g.c}" stroke-width="3"/>`;
  });
  let html = `<svg class="bk-svg${total <= 110 ? ' few' : ''}" width="${W}" height="${A + 4}" viewBox="0 0 ${W} ${A + 4}">${line}<g class="ars">${arcs}</g><g class="dts">${dots}</g><g class="hts">${hits}</g></svg>`;
  const used = new Set(); merged.forEach(q => { used.add(q.a); used.add(q.b); });
  TL_BOOKS.forEach((b, i) => {
    const lab = ws[i] >= 15 && b[0].length * (b[0].length > 12 ? 4.7 : 5.4) <= bookH - 8 ? 'f' : 'a'; // a name on every book: the full name when there is room, else a short one
    html += `<button type="button" class="bk${used.has(i) || !total ? ' has' : ''}${b[0].length > 12 ? ' lg' : ''}" data-b="${i}" title="${b[0]}" aria-label="${b[0]}" style="left:${xs[i].toFixed(1)}px;top:${A + 3}px;width:${Math.max(1.5, ws[i] - 1).toFixed(1)}px;height:${bookH}px;--c:${TL_GROUPS[b[2]].c}">` +
      (lab ? `<span class="nm ${lab}">${lab === 'f' ? b[0] : tlAbbr(b[0])}</span>` : '') + '</button>';
  });
  TL_GROUPS.forEach((g, gi) => {
    const idx = TL_BOOKS.map((b, i) => (b[2] === gi ? i : -1)).filter(i => i >= 0);
    const x0 = xs[idx[0]], x1 = xs[idx[idx.length - 1]] + ws[idx[idx.length - 1]], w = x1 - x0;
    html += `<span class="bk-g" style="left:${x0.toFixed(1)}px;width:${w.toFixed(1)}px;top:${A + bookH + 5}px;--c:${g.c}">${w >= 46 ? g.n : (w >= 26 ? ({ Law: 'Law', History: 'Hist.', Poetry: 'Poet.', Prophets: 'Proph.', Gospels: 'Gosp.', Letters: 'Lett.' }[g.n] || '') : '')}</span>`;
  });
  html += '<span class="bk-flag" hidden></span>';
  const capW = `style="width:${Math.min(W, view.clientWidth)}px"`;
  if (!act.length) { /* nothing picked: the sentence in the middle says what to do */ }
  else if (!total) html += `<p class="bk-cap" ${capW}>Tap a layer above to draw its arcs</p>`;
  else html += `<p class="bk-cap" ${capW}>${act.length} layer${act.length === 1 ? '' : 's'} &middot; ${act.reduce((s, o) => s + o.arcs.length, 0)} references &middot; tap a book or an arc</p>`;
  track.style.width = W + 'px'; track.style.height = H + 'px'; track.style.minHeight = '0'; track.style.zoom = '';
  track.style.marginLeft = W < view.clientWidth ? Math.round((view.clientWidth - W) / 2) + 'px' : '';
  track.classList.remove('tl-lo', 'hitmode');
  track.dataset.level = 'threads';
  track.innerHTML = html;
  if (anchor != null) view.scrollLeft = Math.max(0, anchor * W - (ax != null ? ax : view.clientWidth / 2));
  else if (anchor === undefined) view.scrollLeft = Math.min(view.scrollLeft, Math.max(0, W - view.clientWidth));
  tlThreadsStyle();
}
// dim everything except what is tied to the chosen book or arc
function tlThreadsStyle() {
  const track = tlEl('tlTrack'); if (!track || tlViewMode !== 'threads') return;
  const B = tlRB, P = tlRP, any = B != null || !!P, rel = new Set();
  track.querySelectorAll('.ar,.sd').forEach(n => {
    const a = Number(n.dataset.a), b = Number(n.dataset.b);
    const hot = !any || (P ? (a === P[0] && b === P[1]) : (a === B || b === B));
    n.classList.toggle('dim', any && !hot); n.classList.toggle('hot', any && hot);
    if (any && hot) { rel.add(a); rel.add(b); }
  });
  track.querySelectorAll('.bk').forEach(el => {
    const i = Number(el.dataset.b);
    el.classList.toggle('sel', i === B || (P && P.indexOf(i) >= 0));
    el.classList.toggle('rel', any && rel.has(i) && !(i === B || (P && P.indexOf(i) >= 0)));
    el.classList.toggle('far', any && !rel.has(i));
  });
  const fl = track.querySelector('.bk-flag');
  if (fl && tlBk) {
    const ids = P ? P : (B != null ? [B] : []);
    if (!ids.length) fl.hidden = true;
    else {
      fl.hidden = false;
      fl.textContent = ids.map(i => TL_BOOKS[i][0]).join(' ↔ ');
      const mid = ids.reduce((s, i) => s + tlBk.xs[i] + tlBk.ws[i] / 2, 0) / ids.length;
      fl.style.left = Math.max(4, Math.min(tlBk.W - 4, mid)) + 'px'; fl.style.top = Math.max(2, tlBk.A - 26) + 'px';
    }
  }
}
function tlThreadsClick(ev) {
  const hit = ev.target.closest('.hit'), bk = ev.target.closest('.bk');
  if (bk) { const i = Number(bk.dataset.b); tlRP = null; tlRB = tlRB === i ? null : i; }
  else if (hit) { const p = [Number(hit.dataset.a), Number(hit.dataset.b)]; tlRB = null; tlRP = tlRP && tlRP[0] === p[0] && tlRP[1] === p[1] ? null : p; }
  else { if (tlRB == null && !tlRP) return; tlRB = null; tlRP = null; }
  tlThreadsStyle(); tlRefsPanel();
}
function tlToggleOv(id) {
  if (id.indexOf('*grp:') !== 0 && (tlRB != null || tlRP)) { tlRB = null; tlRP = null; tlRefsClose(); } // a new overlay starts fresh: no book stays selected
  if (id.indexOf('*grp:') === 0) {
    const g = id.slice(5), k = tlThOpen.indexOf(g);
    tlThOpen = k >= 0 ? [] : [g]; // one sub-group open at a time
    tlThreadBarDraw(); tlThreadsFit(); return;
  }
  if (id[0] === '*') {
    const g = id.split(':')[1], ids = TL.refs.filter(o => !g || o.g === g).map(o => o.id);
    tlOn = id.indexOf('*all') === 0 ? Array.from(new Set(tlOn.concat(ids))) : tlOn.filter(x => ids.indexOf(x) < 0);
  } else { const k = tlOn.indexOf(id); if (k >= 0) tlOn.splice(k, 1); else tlOn.push(id); }
  tlSave('vi_tl_on', JSON.stringify(tlOn));
  tlDrawThreads();
  if (tlRB != null || tlRP) tlRefsPanel();
}
// the exact references behind the book or arc that is chosen
function tlOpenRef(bi, ref) {
  const nm = TL_BOOKS[bi][0], m = String(ref).match(/\d+/), ch = m ? Number(m[0]) : 1;
  const mb = typeof manifest !== 'undefined' && manifest && manifest.books.find(b => b.name === nm);
  if (mb && mb.availableChapters.includes(ch)) openPassage(mb.slug, ch, 1, false);
  else window.open('https://www.biblegateway.com/passage/?search=' + encodeURIComponent(nm + ' ' + ref) + '&version=BSB', '_blank', 'noopener');
}
const tlRefName = (bi, r) => (bi === 18 ? 'Psalm' : TL_BOOKS[bi][0]) + (r ? ' ' + r : '');
function tlRefsPanel() {
  const box = tlEl('tlDetail'), B = tlRB, P = tlRP;
  if (B == null && !P) { tlRefsClose(); return; }
  const act = tlOvOn(), rows = [];
  act.forEach(o => o.arcs.forEach(a => {
    if (P ? ((a[0] === P[0] && a[1] === P[1]) || (a[0] === P[1] && a[1] === P[0])) : (a[0] === B || a[1] === B)) rows.push({ o, a });
  }));
  const col = TL_GROUPS[TL_BOOKS[P ? P[0] : B][2]].c;
  const line = r => `<li><i style="background:${r.o.color}" title="${escHtml(r.o.name)}"></i><span class="rf" data-bi="${r.a[0]}" data-r="${escHtml(r.a[2])}">${escHtml(tlRefName(r.a[0], r.a[2]))}</span> <span class="ar-to">&rarr;</span> <span class="rf" data-bi="${r.a[1]}" data-r="${escHtml(r.a[3])}">${escHtml(tlRefName(r.a[1], r.a[3]))}</span>${r.a[4] ? `<em>${escHtml(r.a[4])}</em>` : ''}</li>`;
  let body = '', head, sub;
  if (P) {
    head = TL_BOOKS[P[0]][0] + ' ↔ ' + TL_BOOKS[P[1]][0];
    sub = `${rows.length} reference${rows.length === 1 ? '' : 's'} between these two books`;
    body = `<ul class="rf-list">${rows.map(line).join('')}</ul>`;
  } else {
    head = TL_BOOKS[B][0];
    const out = rows.filter(r => r.a[0] === B), inn = rows.filter(r => r.a[1] === B);
    sub = `${TL_GROUPS[TL_BOOKS[B][2]].n} &middot; ${rows.length} reference${rows.length === 1 ? '' : 's'} in the layers that are on`;
    const grp = (list, key) => {
      const by = {}; list.forEach(r => { (by[r.a[key]] = by[r.a[key]] || []).push(r); });
      return Object.keys(by).map(Number).sort((p, q) => p - q).map(k => `<p class="rf-h">${escHtml(TL_BOOKS[B][0])} ${key === 1 ? '&rarr;' : '&larr;'} ${escHtml(TL_BOOKS[k][0])} <span>${by[k].length}</span></p><ul class="rf-list">${by[k].map(line).join('')}</ul>`).join('');
    };
    if (out.length) body += `<p class="tl-dsec" style="color:${col}">QUOTED OR ECHOED IN</p>` + grp(out, 1);
    if (inn.length) body += `<p class="tl-dsec" style="color:${col}">DRAWS ON</p>` + grp(inn, 0);
    if (!rows.length) body = '<p class="tl-ds">No references from the layers that are on touch this book. Turn on more layers above.</p>';
  }
  box.innerHTML = `<button type="button" class="tl-x" aria-label="Close">&times;</button>
    <p class="tl-dsec" style="color:${col}">${P ? 'TWO BOOKS' : 'BOOK'}</p>
    <h3 class="tl-dt">${escHtml(head)}</h3><p class="tl-dmeta"><span>${sub}</span></p>${body}
    ${!P ? '<div class="tl-acts"><button type="button" class="tl-btn" data-a="read">Read ' + escHtml(TL_BOOKS[B][0]) + ' &rsaquo;</button></div>' : ''}`;
  box.hidden = false; tlEl('screen-timeline').classList.add('has-detail');
  box.querySelector('.tl-x').addEventListener('click', () => { tlRB = null; tlRP = null; tlThreadsStyle(); tlRefsClose(); });
  box.querySelectorAll('.rf').forEach(s => s.addEventListener('click', () => tlOpenRef(Number(s.dataset.bi), s.dataset.r)));
  const rd = box.querySelector('[data-a="read"]'); if (rd) rd.addEventListener('click', () => tlOpenRef(B, '1'));
  box.scrollTop = 0;
  tlThreadsFit();
}
function tlRefsClose() {
  const d = tlEl('tlDetail'); if (d) d.hidden = true;
  const s = tlEl('screen-timeline'); if (s) s.classList.remove('has-detail');
  tlThreadsFit();
}
// the line gets shorter when the panel opens, so draw it again to fit
function tlThreadsFit() {
  if (tlViewMode !== 'threads' || !tlBk) return;
  const v = tlEl('tlView'); if (!v) return;
  requestAnimationFrame(() => { if (tlViewMode === 'threads' && ((Math.abs(v.clientHeight - tlBk.H) > 6 && v.clientHeight >= 100) || Math.abs(v.clientWidth - tlBk.vw) > 6)) tlDrawThreads(); });
}

// ----- Year by Year: lanes of time, scrubbed with one gold line in the middle -----
const tlFmtYear = y => (y < 0 ? (-y) + ' BC' : 'AD ' + Math.max(1, y));
const YB_FROM = -2400, YB_TO = 220, YB_ROW = 26, YB_RULER = 26, YB_GAP = 7;
const YB_NAMES = { israel: 'Israel', kings: 'Kings', powers: 'World powers', prophets: 'Prophets', figures: 'People', place: 'Places', theme: 'Themes', style: 'Writing', authors: 'Authors', church: 'The church' };
const YB_DEF = ['israel', 'kings', 'powers', 'prophets', 'figures'];
const YB_MAXR = 3; // never more than three bars stacked in one lane; a fourth is folded into its neighbour
const YB_KROW = { '#8c4646': 0, '#4d5f8f': 1 }; // Kings: north on the top row, south on the bottom row, the united kingdom across both
// each era gets a fair share of the little "you are here" bar, like the Overview
const YB_ERAS = [['begin', -2400, -2100, .04], ['patriarchs', -2100, -1526, .09], ['exodus', -1526, -1406, .08], ['land', -1406, -1050, .10], ['kings', -1050, -605, .20], ['exile', -605, -430, .10], ['between', -430, -5, .09], ['jesus', -5, 30, .13], ['church', 30, 120, .13], ['future', 120, 220, .04]];
const YB_JUMPS = [['Abraham', -1950], ['Exodus', -1446], ['David', -1000], ['Exile', -586], ['Jesus', 27], ['The church', 55]];
let ybOn = YB_DEF.slice(), ybNowOpen = null, ybM = null, ybEls = [], ybLanesNow = [], ybLN = [], ybAuto = true;
tlZ.lanes = 1; tlYear = 27;
try {
  const a = JSON.parse(localStorage.getItem('vi_yb_lanes') || 'null'); if (Array.isArray(a) && a.length) ybOn = a;
  const z = Number(localStorage.getItem('vi_yb_z')); if (z > 0.05 && z < 40) tlZ.lanes = z;
  const yy = localStorage.getItem('vi_yb_year'); if (yy !== null && isFinite(Number(yy))) tlYear = Number(yy);
  const nw = localStorage.getItem('vi_yb_now2'); if (nw === '0' || nw === '1') ybNowOpen = nw === '1';
  if (localStorage.getItem('vi_yb_auto') === '0') ybAuto = false;
} catch (e) {}
const ybIsOpen = () => (ybNowOpen == null ? false : ybNowOpen); // the "what's happening" strip starts folded to one line so the lanes get the room
function ybMet() {
  const sc = tlEl('ybScroll'), vw = sc ? sc.clientWidth : 0, G = vw < 560 ? 62 : 98, P = Math.max(30, (vw - G) / 2);
  const def = Math.max(0.1, (vw - G) / (vw < 560 ? 240 : 430));
  return { vw, G, P, def, lo: 0.3 / def, hi: 18 / def };
}
const ybEraAt = y => { const e = YB_ERAS.find(r => y < r[2]) || YB_ERAS[YB_ERAS.length - 1]; return TL.eras.find(x => x.id === e[0]) || TL.eras[0]; };
function ybFx(y) { let acc = 0; for (const r of YB_ERAS) { if (y <= r[2]) return acc + Math.max(0, (y - r[1]) / (r[2] - r[1])) * r[3]; acc += r[3]; } return 1; }
function ybFy(f) { let acc = 0; for (const r of YB_ERAS) { if (f <= acc + r[3]) return r[1] + Math.max(0, (f - acc) / r[3]) * (r[2] - r[1]); acc += r[3]; } return YB_TO; }
// the gold line stays in the middle of the lanes; the year under it is where the lanes are scrolled to
const ybYear = () => { const sc = tlEl('ybScroll'); return ybM ? YB_FROM + sc.scrollLeft / ybM.ppy : tlYear; };
// bring a year under the gold line (the lanes slide, the line stays put)
function ybGo(y, smooth) {
  const sc = tlEl('ybScroll'); if (!sc || !ybM) return;
  const left = (Math.max(YB_FROM, Math.min(YB_TO, y)) - YB_FROM) * ybM.ppy;
  if (smooth) { try { sc.scrollTo({ left, behavior: 'smooth' }); return; } catch (e) {} }
  sc.scrollLeft = left;
}
const ybMeasure = (() => { let c = null; const cache = {}; return t => { if (cache[t] != null) return cache[t]; try { c = c || document.createElement('canvas').getContext('2d'); c.font = "600 11px 'IBM Plex Sans', sans-serif"; cache[t] = c.measureText(t).width * 1.04; } catch (e) { cache[t] = t.length * 6.4; } return cache[t]; }; })();
// text goes in the bar nearly always: full size if it fits, a smaller size if it must, a clipped start when very narrow
function ybFit(label, w, badge) {
  const avail = w - 10 - (badge ? 16 : 0), m = ybMeasure(label);
  if (avail <= 0) return null;
  if (m <= avail) return { fs: 11, m };
  const fs = Math.floor(11 * avail / m * 2) / 2;
  if (fs >= 8) return { fs, m: m * fs / 11 };
  return avail >= 34 ? { fs: 8, m: avail, cut: true } : null;
}
function ybSubDraw() {
  const box = tlEl('tlYSub'); if (!box || !TL || !TL.lanes) return;
  const chips = TL.lanes.lanes.map(l => `<button type="button" class="th-chip${ybOn.includes(l.id) ? ' on' : ''}" data-yl="${l.id}" data-yid="${l.id}" style="--c:${l.color}"><i></i>${escHtml(YB_NAMES[l.id] || l.short)}</button>`).join('');
  box.innerHTML = `<div class="ys-chips" role="group" aria-label="Lanes to show">${chips}</div>` +
    `<button type="button" class="ys-more" id="ybLanesBtn" aria-expanded="false" aria-label="More lane options">&#8943;</button>` +
    `<div class="yb-pop" id="ybPop" hidden><button type="button" class="ys-auto${ybAuto ? ' on' : ''}" id="ybAutoBtn" data-yl="*auto" role="switch" aria-checked="${ybAuto}"><i></i><span>Shrink a lane to one row when nothing in it is on screen</span></button>` +
    `<button type="button" class="ys-reset" data-yl="*reset">Back to the five main lanes</button></div>`;
}
function ybDraw(cy) {
  const sc = tlEl('ybScroll'), inner = tlEl('ybInner');
  if (!sc || !inner || !TL || !TL.lanes) return;
  const M = ybMet(); if (M.vw < 80) return;
  tlZ.lanes = Math.max(M.lo, Math.min(M.hi, tlZ.lanes));
  const ppy = M.def * tlZ.lanes, { G, P } = M;
  ybM = { ppy, G, P, vw: M.vw, def: M.def, phX: G + P };
  if (cy == null) cy = tlYear;
  const D = TL.lanes, W = Math.round(P * 2 + (YB_TO - YB_FROM) * ppy), X = y => P + (y - YB_FROM) * ppy;
  const sl0 = Math.round((Math.max(YB_FROM, Math.min(YB_TO, cy)) - YB_FROM) * ppy);
  ybLN = []; ybLanesNow = [];
  // 1. work out each lane: which blocks show at this zoom, which row each one sits on
  D.lanes.filter(l => ybOn.includes(l.id)).forEach(ln => {
    const kings = ln.id === 'kings', maxR = kings ? 2 : YB_MAXR, rowEnd = new Array(maxR).fill(-1e9), lastOf = new Array(maxR).fill(null), placed = [];
    const vis = ln.items.filter(it => (it.z == null || ppy >= it.z) && (it.zx == null || ppy < it.zx)).sort((p, q) => p.a - q.a || q.b - p.b);
    vis.forEach(it => {
      const x0 = X(it.a), w = Math.max(5, (it.b - it.a) * ppy);
      let r, span = 1;
      if (kings) { if (it.c in YB_KROW) r = YB_KROW[it.c]; else { r = 0; span = 2; } }
      const free = r == null ? rowEnd.findIndex(e => e <= x0 + 1) : (rowEnd[r] <= x0 + 1 && (span < 2 || rowEnd[1] <= x0 + 1) ? r : -1);
      if (free < 0) { // a real crowd: the extra block is folded into the one it overlaps most, so no lane grows past its limit
        r = r == null ? rowEnd.indexOf(Math.min(...rowEnd)) : r;
        const o = lastOf[r]; if (!o) return;
        o.parts.push(it); o.b = Math.max(o.b, it.b); o.w = Math.max(o.w, x0 + w - o.x0); rowEnd[r] = o.x0 + o.w; return;
      }
      r = free;
      const o = { it, parts: [it], x0, w, r, span, b: it.b }; rowEnd[r] = x0 + w; if (span > 1) rowEnd[1] = x0 + w; lastOf[r] = o; placed.push(o);
    });
    const used = Math.max(kings ? 2 : 1, lastOf.reduce((m, o, i) => (o ? i + 1 : m), 0));
    ybLN.push({ id: ln.id, ln, placed, vis, rowsAll: used, h: used * YB_ROW + 6, a: vis.length ? Math.min(...vis.map(i => i.a)) : 1e9, b: vis.length ? Math.max(...vis.map(i => i.b)) : -1e9 });
  });
  const hs = ybModel(sl0, ppy, M.vw, G, P);
  // 2. draw them, already at their right height
  let y = YB_RULER + YB_GAP, names = '', bands = '';
  ybLN.forEach(L => {
    const ln = L.ln, h = hs.get(L.id), on = L.live = hs.live.has(L.id);
    let bars = '';
    L.placed.forEach(o => {
      const m = o.parts.length > 1, nm = o.parts.map(p => p.t);
      const label = m ? (nm.length === 2 ? nm.join(' + ') : nm[0] + ' + ' + (nm.length - 1) + ' more') : o.it.t;
      const bw = Math.max(4, Math.round(o.w) - 2), fit = ybFit(label, bw, m);
      const e = (o.parts.find(p => p.e) || {}).e, a0 = Math.min(...o.parts.map(p => p.a));
      const ttl = m ? o.parts.map(p => p.t + ' (' + tlFmtYear(p.a) + ' to ' + tlFmtYear(p.b) + ')').join(' | ')
        : (o.it.n ? o.it.n + ': ' : '') + o.it.t + ' (' + tlFmtYear(o.it.a) + ' to ' + tlFmtYear(o.it.b) + ')';
      const tag = e ? 'button type="button"' : 'div', cls = 'yb-bar' + (m ? ' mrg' : '') + (fit ? '' : ' sm') + (o.span > 1 ? ' tall' : '');
      bars += `<${tag} class="${cls}" data-a="${a0}" data-b="${o.b}"${e ? ` data-e="${e}"` : ''} title="${escHtml(ttl)}" style="left:${Math.round(o.x0)}px;top:${5 + o.r * YB_ROW}px;width:${bw}px${o.span > 1 ? ';height:' + (o.span * YB_ROW - 4) + 'px' : ''}${o.it.c ? ';--c:' + o.it.c : ''}">` +
        (fit ? `<span style="font-size:${fit.fs}px">${escHtml(label)}</span>` : '') + (m && fit ? `<b>${o.parts.length}</b>` : '') + `</${e ? 'button' : 'div'}>`;
    });
    bands += `<div class="yb-band${on ? '' : ' idle'}" data-ln="${L.id}" style="top:${y}px;height:${h}px;width:${W}px;--c:${ln.color}">${bars}</div>`;
    names += `<div class="yb-nm${on ? '' : ' idle'}" data-ln="${L.id}" style="top:${y}px;height:${h}px;--c:${ln.color}"><b>${escHtml(YB_NAMES[ln.id] || ln.short)}</b>${ln.id === 'kings' ? '<em><span><s style="background:#8c4646"></s>North</span> <span><s style="background:#4d5f8f"></s>South</span></em>' : ''}</div>`;
    ybLanesNow.push({ id: ln.id, name: YB_NAMES[ln.id] || ln.short, color: ln.color, items: ln.items });
    y += h + YB_GAP;
  });
  const total = y + 4, step = ppy >= 8 ? 10 : ppy >= 3.4 ? 25 : ppy >= 1.6 ? 50 : ppy >= 0.7 ? 100 : 200;
  let ticks = '';
  for (let t = Math.ceil(YB_FROM / step) * step; t <= YB_TO; t += step) ticks += `<span style="left:${Math.round(X(t))}px">${t === 0 ? 'AD 1' : tlFmtYear(t)}</span>`;
  (D.bands || []).forEach(b => { if (b.t) bands += `<div class="yb-gap" style="left:${Math.round(X(b.a))}px;width:${Math.round((b.b - b.a) * ppy)}px;top:${YB_RULER + 2}px;height:${total - YB_RULER - 6}px" title="${escHtml(b.t)}"></div>`; });
  inner.style.width = (G + W) + 'px'; inner.style.height = total + 'px';
  inner.innerHTML = `<div class="yb-names" style="width:${G}px;height:${total}px"><div class="yb-corner" style="height:${YB_RULER}px"></div>${names}</div>` +
    `<div class="yb-canvas" style="width:${W}px;height:${total}px"><div class="yb-ruler" style="width:${W}px;height:${YB_RULER}px">${ticks}</div>${bands}</div>`;
  ybEls = [...inner.querySelectorAll('.yb-bar')].map(el => ({ el, a: Number(el.dataset.a), b: Number(el.dataset.b) }));
  ybLN.forEach(L => { L.nm = inner.querySelector('.yb-nm[data-ln="' + L.id + '"]'); L.bd = inner.querySelector('.yb-band[data-ln="' + L.id + '"]'); L.on = hs.live.has(L.id); });
  ybLayout.sig = ybSig(hs);
  const ph = tlEl('ybPh'); ph.style.left = (G + P) + 'px';
  const mini = tlEl('ybMiniBar');
  mini.innerHTML = YB_ERAS.map((r, i) => { const f0 = YB_ERAS.slice(0, i).reduce((s, q) => s + q[3], 0), er = TL.eras.find(x => x.id === r[0]); return `<i style="left:${f0 * 100}%;width:${r[3] * 100}%;background:${er ? er.c : '#999'}"></i>`; }).join('') + '<u id="ybLens"></u>';
  const zv = tlEl('tlZoomVal'); if (zv) zv.textContent = Math.round(tlZ.lanes * 100) + '%';
  sc.scrollLeft = sl0;
  ybIdle();
  ybTick(true);
}
// for the years on screen: which lanes are in use and how tall each needs to be. A lane nothing in it is on screen shrinks to one row (it never disappears)
function ybModel(sl, ppy, vw, G, P) {
  const vwc = vw - G, hs = new Map(), live = new Set();
  ybLN.forEach(L => {
    let rows = 0;
    L.placed.forEach(o => { if (o.x0 <= sl + vwc && o.x0 + o.w >= sl) rows = Math.max(rows, o.r + o.span); });
    if (rows) live.add(L.id);
    if (!ybAuto) rows = L.rowsAll; else rows = rows ? Math.max(rows, L.id === 'kings' ? 2 : 1) : 1;
    hs.set(L.id, rows * YB_ROW + 6);
  });
  if (!ybAuto) ybLN.forEach(L => live.add(L.id));
  hs.live = live;
  return hs;
}
const ybSig = hs => [...hs].map(e => e[0] + ':' + e[1]).join(',') + '|' + [...hs.live].join(',');
function ybIdle() { document.querySelectorAll('#tlYSub [data-yid]').forEach(b => { const L = ybLN.find(l => l.id === b.dataset.yid); b.classList.toggle('idle', !!(L && !L.on && ybOn.includes(L.id))); }); }
// lanes slide open and shut as the gold line moves through time
function ybLayout(force) {
  const sc = tlEl('ybScroll'), inner = tlEl('ybInner'); if (!sc || !ybM || !ybLN.length) return;
  const hs = ybModel(sc.scrollLeft, ybM.ppy, ybM.vw, ybM.G, ybM.P), sig = ybSig(hs);
  if (!force && sig === ybLayout.sig) return;
  ybLayout.sig = sig;
  let y = YB_RULER + YB_GAP;
  ybLN.forEach(L => {
    const h = hs.get(L.id), on = hs.live.has(L.id);
    L.on = on;
    [L.nm, L.bd].forEach(el => { if (!el) return; el.style.top = y + 'px'; el.style.height = h + 'px'; el.classList.toggle('idle', !on); });
    y += h + YB_GAP;
  });
  const total = y + 4;
  inner.style.height = total + 'px';
  const nmc = inner.querySelector('.yb-names'), cv = inner.querySelector('.yb-canvas');
  if (nmc) nmc.style.height = total + 'px'; if (cv) cv.style.height = total + 'px';
  inner.querySelectorAll('.yb-gap').forEach(g => { g.style.height = (total - YB_RULER - 6) + 'px'; });
  ybIdle();
}
function ybLaneAt(y) {
  const ppy = ybM ? ybM.ppy : 1;
  return ybLanesNow.filter(l => { const L = ybLN.find(q => q.id === l.id); return !L || L.on; }).map(l => {
    const all = l.items.filter(it => y >= it.a && y <= it.b && (it.z == null || it.z < 2 || ppy >= it.z));
    return { id: l.id, name: l.name, color: l.color, items: all.slice(0, 2), more: Math.max(0, all.length - 2) };
  });
}
function ybTick(full) {
  const sc = tlEl('ybScroll'); if (!sc || !ybM || !TL || !TL.lanes) return;
  ybLayout(false);
  const y = Math.max(YB_FROM, Math.min(YB_TO, ybYear())); tlYear = y;
  const yl = tlFmtYear(Math.round(y));
  const pill = tlEl('ybPhY'); if (pill) pill.textContent = yl;
  ybEls.forEach(o => o.el.classList.toggle('act', y >= o.a && y <= o.b));
  const lens = tlEl('ybLens');
  if (lens) { const half = ybM.P / ybM.ppy, f0 = ybFx(Math.max(YB_FROM, y - half)), f1 = ybFx(Math.min(YB_TO, y + half)); lens.style.left = (f0 * 100) + '%'; lens.style.width = Math.max(1.2, (f1 - f0) * 100) + '%'; }
  const er = ybEraAt(y), at = tlEl('ybAt'); if (at) at.textContent = er.name; if (at) at.style.color = er.c;
  ybNowDraw(y, yl, er, full);
  clearTimeout(ybTick.t); ybTick.t = setTimeout(() => tlSave('vi_yb_year', String(Math.round(tlYear))), 250);
}
function ybNowDraw(y, yl, er, force) {
  const box = tlEl('ybNow'); if (!box) return;
  const open = ybIsOpen(), rows = ybLaneAt(y).filter(r => r.items.length);
  const sig = er.id + '#' + (open ? 1 : 0) + '#' + rows.map(r => r.id + ':' + r.items.map(i => i.t).join('|') + r.more).join('/');
  const yEl = tlEl('ybNowY');
  if (!force && sig === box.dataset.sig && yEl) { yEl.textContent = yl; return; }
  box.dataset.sig = sig;
  const sum = rows.slice(0, 3).map(r => r.name + ': ' + r.items[0].t).join(' · ');
  box.innerHTML = `<button type="button" class="yb-nh" id="ybNowTog" aria-expanded="${open}"><span class="yb-ny" id="ybNowY">${yl}</span><span class="yb-ne" style="color:${er.c}">${escHtml(er.name)}</span>` +
    (open ? '' : `<span class="yb-nsum">${escHtml(sum)}</span>`) + `<i>${open ? '&#9662;' : '&#9652;'}</i></button>` +
    (open ? `<div class="yb-nbody">${rows.length ? rows.map(r => `<span class="yb-nr" style="--c:${r.color}"><b>${escHtml(r.name)}</b>${r.items.map(i => i.e ? `<button type="button" data-e="${i.e}">${escHtml(i.t)}</button>` : `<em>${escHtml(i.t)}</em>`).join('')}${r.more ? `<em class="mo">+${r.more}</em>` : ''}</span>`).join('') : '<span class="yb-nr"><em class="none">Nothing listed for this year</em></span>'}</div>` : '');
}
function ybSetZoom(z) {
  const M = ybMet(); if (M.vw < 80 || !ybM) return false;
  z = Math.max(M.lo, Math.min(M.hi, z));
  if (Math.abs(z - tlZ.lanes) < 0.002) return false;
  const y = ybYear(); tlZ.lanes = z; tlSave('vi_yb_z', String(z));
  ybDraw(y); return true;
}
function ybToggleLane(id) {
  if (id === '*auto') {
    ybAuto = !ybAuto; tlSave('vi_yb_auto', ybAuto ? '1' : '0');
    const b = tlEl('ybAutoBtn'); if (b) { b.classList.toggle('on', ybAuto); b.setAttribute('aria-checked', String(ybAuto)); }
    ybLayout(true); return;
  }
  if (id === '*reset') ybOn = YB_DEF.slice();
  else { const i = ybOn.indexOf(id); if (i >= 0) { if (ybOn.length > 1) ybOn.splice(i, 1); } else ybOn.push(id); }
  ybOn = TL.lanes.lanes.map(l => l.id).filter(x => ybOn.includes(x));
  tlSave('vi_yb_lanes', JSON.stringify(ybOn));
  document.querySelectorAll('#tlYSub [data-yid]').forEach(b => b.classList.toggle('on', ybOn.includes(b.dataset.yid)));
  ybDraw(ybYear());
}
function ybWire() {
  if (ybWire.done) return; ybWire.done = true;
  const sc = tlEl('ybScroll'), inner = tlEl('ybInner'), head = tlEl('tlYSub'), ph = tlEl('ybPh'), board = sc.parentElement;
  sc.addEventListener('scroll', () => { if (ybWire.raf) return; ybWire.raf = requestAnimationFrame(() => { ybWire.raf = 0; ybTick(false); }); }, { passive: true });
  let dn = null;
  sc.addEventListener('pointerdown', ev => { dn = { x: ev.clientX, y: ev.clientY }; });
  // tap on the lanes: the gold line slides to that spot; a block with a story also opens it
  inner.addEventListener('click', ev => {
    if (ev.target.closest('.yb-names') || !ybM) return;
    if (dn && Math.hypot(ev.clientX - dn.x, ev.clientY - dn.y) > 8) return; // a swipe is not a tap
    const r = sc.getBoundingClientRect();
    ybGo(YB_FROM + (sc.scrollLeft + ev.clientX - r.left - ybM.G - ybM.P) / ybM.ppy, true);
    const b = ev.target.closest('.yb-bar');
    if (b && b.dataset.e) tlSelect(b.dataset.e, false);
  });
  tlEl('ybNow').addEventListener('click', ev => {
    const e = ev.target.closest('[data-e]');
    if (e) { tlSelect(e.dataset.e, false); return; }
    if (ev.target.closest('#ybNowTog')) { ybNowOpen = !ybIsOpen(); tlSave('vi_yb_now2', ybNowOpen ? '1' : '0'); ybTick(true); }
  });
  head.addEventListener('click', ev => {
    const pop = tlEl('ybPop'), lb = tlEl('ybLanesBtn');
    if (ev.target.closest('#ybLanesBtn')) { pop.hidden = !pop.hidden; lb.setAttribute('aria-expanded', String(!pop.hidden)); return; }
    const l = ev.target.closest('[data-yl]'); if (l) { ybToggleLane(l.dataset.yl); return; }
  });
  document.addEventListener('click', ev => { const pop = tlEl('ybPop'); if (pop && !pop.hidden && !ev.target.closest('#tlYSub')) { pop.hidden = true; } });
  document.addEventListener('keydown', ev => { const pop = tlEl('ybPop'); if (ev.key === 'Escape' && pop && !pop.hidden) pop.hidden = true; });
  // keys
  sc.addEventListener('keydown', ev => {
    const k = ev.key, st = (ev.shiftKey ? 50 : 10);
    if (k === 'ArrowRight') { ybGo(ybYear() + st, false); ev.preventDefault(); }
    else if (k === 'ArrowLeft') { ybGo(ybYear() - st, false); ev.preventDefault(); }
    else if (k === '+' || k === '=') ybSetZoom(tlZ.lanes * 1.25);
    else if (k === '-') ybSetZoom(tlZ.lanes / 1.25);
  });
  // wheel / trackpad: slides through time under the gold line; Ctrl + wheel (or a trackpad pinch) zooms
  sc.addEventListener('wheel', ev => {
    if (ev.ctrlKey || ev.metaKey) { ev.preventDefault(); ybSetZoom(tlZ.lanes * Math.exp(-Math.max(-40, Math.min(40, ev.deltaY)) * 0.012)); return; }
    if (Math.abs(ev.deltaX) > Math.abs(ev.deltaY)) { ev.preventDefault(); sc.scrollLeft += ev.deltaX; return; }
    if (sc.scrollHeight > sc.clientHeight + 2 && !ev.shiftKey) return;
    ev.preventDefault(); sc.scrollLeft += ev.deltaY;
  }, { passive: false });
  // two fingers pinch to zoom
  let d0 = 0, z0 = 1;
  const dist = t => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
  sc.addEventListener('touchstart', ev => { if (ev.touches.length === 2) { d0 = dist(ev.touches); z0 = tlZ.lanes; } }, { passive: true });
  sc.addEventListener('touchmove', ev => { if (ev.touches.length === 2 && d0) { ev.preventDefault(); ybSetZoom(z0 * dist(ev.touches) / d0); } }, { passive: false });
  sc.addEventListener('touchend', () => { d0 = 0; }, { passive: true });
  // the gold line stays in the middle: drag it and the lanes slide behind it
  let pd = null;
  ph.addEventListener('pointerdown', ev => {
    if (ev.button || !ybM) return;
    ev.preventDefault();
    try { ph.setPointerCapture(ev.pointerId); } catch (e) {}
    pd = { id: ev.pointerId, x0: ev.clientX, last: ev.clientX, moved: false };
    ph.classList.add('drag');
  });
  ph.addEventListener('pointermove', ev => {
    if (!pd || ev.pointerId !== pd.id) return;
    if (Math.abs(ev.clientX - pd.x0) > 4) pd.moved = true;
    if (pd.moved) { sc.scrollLeft += ev.clientX - pd.last; }   // graph follows the finger; the year changes with it
    pd.last = ev.clientX;
  });
  const endDrag = ev => {
    if (!pd || ev.pointerId !== pd.id) return;
    const d = pd; pd = null; ph.classList.remove('drag');
    if (!d.moved && ev.type === 'pointerup') { // a plain tap on the line passes through to whatever is under it
      ph.style.pointerEvents = 'none'; const el = document.elementFromPoint(ev.clientX, ev.clientY); ph.style.pointerEvents = '';
      if (el && el !== ph) el.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: ev.clientX, clientY: ev.clientY }));
    }
  };
  ph.addEventListener('pointerup', endDrag); ph.addEventListener('pointercancel', endDrag);
  // the little whole-story bar: tap or drag to move there
  const mb = tlEl('ybMiniBar');
  const mgo = ev => { const r = mb.getBoundingClientRect(); ybGo(ybFy(Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width))), false); };
  let md = false;
  mb.addEventListener('pointerdown', ev => { md = true; try { mb.setPointerCapture(ev.pointerId); } catch (e) {} mgo(ev); });
  mb.addEventListener('pointermove', ev => { if (md) mgo(ev); });
  mb.addEventListener('pointerup', () => { md = false; }); mb.addEventListener('pointercancel', () => { md = false; });
  if (typeof ResizeObserver !== 'undefined') {
    let rt = 0;
    new ResizeObserver(() => { clearTimeout(rt); rt = setTimeout(() => { if (tlViewMode === 'lanes' && currentScreen === 'timeline' && sc.clientWidth > 80 && (!ybM || Math.abs(ybM.vw - sc.clientWidth) > 2)) ybDraw(tlYear); }, 80); }).observe(sc);
  }
}

// ----- Detail panel -----
function tlSelectEra(id) {
  const er = TL.eras.find(x => x.id === id); if (!er) return;
  tlSel = 'era:' + id;
  document.querySelectorAll('#tlTrack .on').forEach(n => n.classList.remove('on'));
  document.querySelectorAll('#tlTrack [data-id="era:' + id + '"]').forEach(n => n.classList.add('on'));
  tlLitBooks({ bk: er.books.map(b => [b, 0, 0]) });
  const box = tlEl('tlDetail');
  const bn = er.books.map(i => TL_BOOKS[i][0]);
  box.innerHTML = `<button type="button" class="tl-x" aria-label="Close">&times;</button>
    <p class="tl-dsec" style="color:${er.c}">ERA</p>
    <h3 class="tl-dt">${escHtml(er.name)}</h3>
    <p class="tl-dmeta"><span>${escHtml(er.d)}</span><span class="tl-cert c-o">${er.idx.length} moments</span></p>
    <p class="tl-ds">${escHtml(er.sum)}</p>
    <p class="tl-dr">Told in: <b>${escHtml(bn.slice(0, 8).join(', '))}${bn.length > 8 ? ' and ' + (bn.length - 8) + ' more' : ''}</b></p>
    <p class="tl-dsec" style="color:var(--parchment-dim)">KEY MOMENTS</p>
    <div class="tl-chips">${er.key.map(i => `<button type="button" class="tl-chip" data-fi="${i}">${escHtml(TL.events[i].t)}</button>`).join('')}</div>
    <div class="tl-acts"><button type="button" class="tl-btn" data-a="dt">See every moment in this era</button></div>`;
  box.hidden = false;
  tlEl('screen-timeline').classList.add('has-detail');
  box.querySelector('.tl-x').addEventListener('click', tlClose);
  box.querySelectorAll('[data-a]').forEach(b => b.addEventListener('click', () => {
    tlGoLevel(1, { fi: er.fi0 });
  }));
  box.querySelectorAll('[data-fi]').forEach(b => b.addEventListener('click', () => {
    const fi = Number(b.dataset.fi); tlGoLevel(1, { fi, keepSel: true }); tlSelect(TL.events[fi].id, true);
  }));
}
function tlSelect(id, center) {
  if (String(id).indexOf('era:') === 0) { tlSelectEra(String(id).slice(4)); return; }
  tlSel = id;
  const e = TL.events.find(x => x.id === id);
  if (!e) return;
  document.querySelectorAll('#tlTrack .on').forEach(n => n.classList.remove('on'));
  document.querySelectorAll('#tlTrack [data-id="' + id + '"]').forEach(n => n.classList.add('on'));
  const k = tlLayout.findIndex(it => it.e && it.e.id === id);
  if (k >= 0 && center) tlCenterX(tlLayout[k].x);
  tlLitBooks(e);
  const sec = tlSecOf(e.s), box = tlEl('tlDetail');
  const evd = e.ev ? EV_BY_ID[e.ev] : null;
  const img = evd ? mapHero(evd) : null;
  const why = '';
  const acts = [];
  if (e.go) acts.push(`<button type="button" class="tl-btn" data-a="read">Open in the reader ›</button>`);
  else acts.push(`<a class="tl-btn" href="https://www.biblegateway.com/passage/?search=${encodeURIComponent(tlRefQuery(e))}&version=BSB" target="_blank" rel="noopener">Read on BibleGateway ›</a>`);
  if (evd && evd.la != null) acts.push(`<button type="button" class="tl-btn" data-a="map">See on map ›</button>`);
  box.innerHTML = `<button type="button" class="tl-x" aria-label="Close">&times;</button>
    <p class="tl-dsec" style="color:${sec.color}">${escHtml(sec.name.toUpperCase())}</p>
    <h3 class="tl-dt">${escHtml(e.t)}</h3>
    <p class="tl-dmeta"><span>${escHtml(e.d)}</span><span class="tl-cert c-${e.c}">${TL_CERT[e.c] || ''}</span></p>
    ${why}
    ${img ? `<img class="tl-dimg" src="${escHtml(mapImgUrl(img, 600))}" alt="${escHtml(img.c || '')}" loading="lazy" decoding="async" onerror="this.remove()">` : ''}
    <p class="tl-ds">${escHtml(e.sum)}</p>
    <p class="tl-dr"><b>${escHtml(evd && evd.r ? evd.r.map(refLabel).join('; ') : e.r)}</b></p>
    ${e.n ? `<p class="tl-dn">${escHtml(e.n)}</p>` : ''}
    <div class="tl-acts">${acts.join('')}</div>`;
  box.hidden = false;
  tlEl('screen-timeline').classList.add('has-detail');
  box.querySelector('.tl-x').addEventListener('click', tlClose);
  box.querySelectorAll('[data-a]').forEach(b => b.addEventListener('click', () => {
    const a = b.dataset.a;
    if (a === 'read') openPassage(e.go[0], e.go[1], e.go[2], false);
    else if (a === 'map') focusMapAt(evd.la, evd.ln, evd.t, 13);
  }));
}
function tlClose() {
  tlSel = null;
  const d = tlEl('tlDetail'); if (d) d.hidden = true;
  const s = tlEl('screen-timeline'); if (s) s.classList.remove('has-detail');
  document.querySelectorAll('#tlTrack .on').forEach(n => n.classList.remove('on'));
  tlLitBooks(null);
}
// Wide view is the only view for the Map and the Timeline / Connections: the frame stretches wide on a computer or
// tablet, and a phone turned sideways uses the whole screen. In portrait on a phone a small hint asks for a turn.
const WIDE_MQ = '(min-width:700px) and (min-height:521px), (orientation:landscape) and (max-height:520px)';
const isWideEnv = () => { try { return window.matchMedia(WIDE_MQ).matches; } catch (e) { return false; } };
let wideWas = isWideEnv(), rotSeen = {}, rotTimer = null;
function tlApplyWide() {
  const ph = document.querySelector('.phone'); if (!ph) return;
  const on = isWideEnv() && (currentScreen === 'timeline' || currentScreen === 'map');
  ph.classList.toggle('wide', on);
  rotHint();
}
function rotHint() {
  const el = document.getElementById('rotHint'); if (!el) return;
  const portraitPhone = !isWideEnv() && window.innerWidth < 700;
  const want = portraitPhone && currentScreen === 'timeline' && !rotSeen[currentScreen] && !(tour && tour.cur);
  if (rotTimer && rotTimer.s === currentScreen && portraitPhone) return; // already showing for this screen
  clearTimeout(rotTimer && rotTimer.t); rotTimer = null;
  if (want) {
    rotSeen[currentScreen] = true; el.hidden = false; requestAnimationFrame(() => el.classList.add('on'));
    rotTimer = { s: currentScreen, t: setTimeout(() => { el.classList.remove('on'); setTimeout(() => { if (!el.classList.contains('on')) el.hidden = true; }, 400); }, 6000) };
  } else { el.classList.remove('on'); el.hidden = true; }
}
function wideSync() {
  const w = isWideEnv(); tlApplyWide();
  if (w === wideWas) return;
  const first = wideWas === null; wideWas = w; if (first) return;
  if (currentScreen === 'timeline' && tlBuilt) { const f = tlCurrentFocus(); setTimeout(() => tlRedraw(f), 80); }
  if (currentScreen === 'map') [120, 360].forEach(t => setTimeout(() => { try { mapInset(); if (mapMain) { mapMain.resize(); renderMarkers(); } } catch (e) {} }, t));
}
let wideTimer = null;
['resize', 'orientationchange'].forEach(ev => window.addEventListener(ev, () => { clearTimeout(wideTimer); wideTimer = setTimeout(wideSync, 150); }));
function tlWire() {
  if (tlWire.done) return; tlWire.done = true;
  document.querySelectorAll('#tlViews button').forEach(b => b.addEventListener('click', () => tlSetView(b.dataset.v)));
  document.querySelectorAll('#tlLevels button').forEach(b => b.addEventListener('click', () => tlGoLevel(Number(b.dataset.l))));
  tlEl('tlZoomIn').addEventListener('click', () => tlSetZoom(tlZ[tlZoomKey()] * 1.25));
  tlEl('tlZoomOut').addEventListener('click', () => tlSetZoom(tlZ[tlZoomKey()] / 1.25));
  const hint = tlEl('tlHint');
  if (hint) hint.querySelector('button').addEventListener('click', () => { hint.hidden = true; tlSave('vi_tl_hint', '2'); });
  ['tlThreadBar', 'tlThreadTop'].forEach(id => tlEl(id).addEventListener('click', ev => {
    const c = ev.target.closest('[data-ov]');
    if (c) tlToggleOv(c.dataset.ov);
  }));
  tlEl('tlTrack').addEventListener('click', ev => { if (tlViewMode === 'threads') tlThreadsClick(ev); });
  ybWire();
  const view = tlEl('tlView');
  // the books are fitted to the width of the screen, so whenever that width changes (a screen switch, Wide / Phone view) draw them again
  if (typeof ResizeObserver !== 'undefined') {
    let rt = 0;
    new ResizeObserver(() => {
      clearTimeout(rt);
      rt = setTimeout(() => { if (tlViewMode === 'threads' && tlBk && view.clientWidth > 0 && Math.abs(tlBk.vw - view.clientWidth) > 2 && currentScreen === 'timeline') tlRedraw(null); }, 80);
    }).observe(view);
  }
  view.addEventListener('scroll', () => { if (tlNavUpdate.raf) return; tlNavUpdate.raf = requestAnimationFrame(() => { tlNavUpdate.raf = 0; tlNavUpdate(); }); }, { passive: true });
  const viewX = cx => cx - view.getBoundingClientRect().left;
  // pinch: zooms around the spot between the two fingers
  let d0 = 0, z0 = 1;
  const dist = t => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
  const mid = t => (t[0].clientX + t[1].clientX) / 2;
  view.addEventListener('touchstart', e => { if (e.touches.length === 2) { d0 = dist(e.touches); z0 = tlZ[tlZoomKey()]; } }, { passive: true });
  view.addEventListener('touchmove', e => {
    if (e.touches.length !== 2 || !d0) return;
    if (tlSetZoom(z0 * dist(e.touches) / d0, viewX(mid(e.touches)))) { z0 = tlZ[tlZoomKey()]; d0 = dist(e.touches); }
  }, { passive: true });
  view.addEventListener('touchend', () => { d0 = 0; }, { passive: true });
  // mouse wheel zooms around the pointer; Shift+wheel or a sideways swipe pans; in Lanes the plain wheel scrolls up and down
  view.addEventListener('wheel', e => {
    if (tlViewMode === 'lanes' && !(e.ctrlKey || e.metaKey)) return;
    if (!e.ctrlKey && Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
    if (e.shiftKey && !e.ctrlKey) { e.preventDefault(); view.scrollLeft += e.deltaY; return; }
    e.preventDefault();
    const dy = Math.max(-40, Math.min(40, e.deltaY)), k = e.ctrlKey ? 0.012 : 0.006;
    tlSetZoom(tlZ[tlZoomKey()] * Math.exp(-dy * k), viewX(e.clientX));
  }, { passive: false });
  // mouse drag pans
  let drag = null, moved = false;
  view.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse' || e.button !== 0) return; drag = { x: e.clientX, y: e.clientY, sl: view.scrollLeft, st: view.scrollTop }; moved = false; });
  window.addEventListener('pointermove', e => {
    if (!drag) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!moved && Math.abs(dx) + Math.abs(dy) > 6) { moved = true; view.classList.add('grab'); }
    if (moved) { view.scrollLeft = drag.sl - dx; if (tlViewMode === 'lanes') view.scrollTop = drag.st - dy; }
  });
  window.addEventListener('pointerup', () => { if (drag && moved) { view.classList.remove('grab'); const eat = ev => { ev.stopPropagation(); ev.preventDefault(); }; view.addEventListener('click', eat, { capture: true, once: true }); setTimeout(() => view.removeEventListener('click', eat, true), 0); } drag = null; });
}
async function renderTimeline() {
  const track = tlEl('tlTrack');
  if (!track) return;
  tlWire();
  if (!TL) track.innerHTML = '<p class="empty-note" style="padding:20px">Loading the timeline…</p>';
  await Promise.all([loadTL(), loadEvents()]);
  if (!TL) { track.innerHTML = '<p class="empty-note" style="padding:20px">Couldn’t load the timeline. Check that data/bible-timeline.json has been deployed.</p>'; return; }
  const hint = tlEl('tlHint');
  if (hint) { let seen = false; try { seen = localStorage.getItem('vi_tl_hint') === '2'; } catch (e) {} hint.hidden = seen; }
  if (!TL.eras) tlLv = 1;
  if (!TL.refs && tlViewMode === 'threads') tlViewMode = 'line';
  if (!TL.lanes && tlViewMode === 'lanes') tlViewMode = 'line';
  let focusId = null;
  if (tlFocusPending) {
    focusId = tlFocusPending; tlFocusPending = null;
    tlViewMode = 'line';
    tlLv = 1;
  }
  const keep = tlBuilt && tlViewMode === 'line' ? tlEl('tlView').scrollLeft : null;
  const jes = !focusId && !tlBuilt && tlViewMode === 'line' && TL.eras ? TL.eras.find(e => e.id === 'jesus') : null;
  tlRedraw(focusId ? TL.events.findIndex(x => x.id === focusId) : jes ? (tlLv === 0 ? jes.mid : jes.fi0) : null);
  if (focusId) tlSelect(focusId, true);
  else if (keep != null) tlEl('tlView').scrollLeft = keep;
  tlBuilt = true;
  tlNavUpdate();
}
// From a chapter: open the timeline at the Gospel event that covers this chapter.
function openTimelineAtChapter(book, ch) {
  const hit = (EVENTS || []).find(e => (e.r || []).some(r => r[0] === book && ch >= r[1] && ch <= r[3]));
  tlFocusPending = hit ? 'g' + hit.i : null;
  goToScreen('timeline');
}

// ---------- Book navigator ----------
function renderBookNav() {
  if (navStep === 'books') {
    navHeaderTitle.textContent = 'Books';
    navBackBtn.style.visibility = 'hidden';
    navBookList.style.display = 'block';
    navChapterGrid.style.display = 'none';

    navBookList.innerHTML = '';
    manifest.books.forEach(b => {
      const item = document.createElement('div');
      item.className = 'nav-item';
      item.innerHTML = `
        <span class="nav-item-name">${b.name}</span>
        <span class="nav-item-meta">${b.availableChapters.length} / ${b.totalChapters} ch.</span>
      `;
      item.addEventListener('click', () => {
        navBrowsingBook = b.slug;
        navStep = 'chapters';
        renderBookNav();
      });
      navBookList.appendChild(item);
    });
  } else {
    const book = manifest.books.find(b => b.slug === navBrowsingBook);
    navHeaderTitle.textContent = book.name;
    navBackBtn.style.visibility = 'visible';
    navBookList.style.display = 'none';
    navChapterGrid.style.display = 'grid';

    navChapterGrid.innerHTML = '';
    for (let n = 1; n <= book.totalChapters; n++) {
      const available = book.availableChapters.includes(n);
      const cell = document.createElement('div');
      cell.className = 'nav-chapter-cell' + (available ? '' : ' unavailable');
      cell.textContent = n;
      if (available) {
        cell.addEventListener('click', async () => {
          currentBook = book.slug;
          currentChapterNum = n;
          await loadChapter();
          goToScreen('read');
        });
      }
      navChapterGrid.appendChild(cell);
    }
  }
}

navBackBtn.addEventListener('click', () => {
  navStep = 'books';
  navBrowsingBook = null;
  renderBookNav();
});

// Extra keywords + Greek corrections live in one file, merged into each chapter as it loads.
let kwExtraP = null;
function loadKwExtra() {
  return kwExtraP || (kwExtraP = fetch('data/keywords-extra.json').then(r => (r.ok ? r.json() : null)).catch(() => null));
}
function applyKwExtra(ch, kx) {
  if (!kx || !ch || !ch.context || ch.context._kwx) return;
  const key = currentBook + '/' + currentChapterNum;
  const tr = ch.context.translation || (ch.context.translation = []);
  const fx = kx.fixes && kx.fixes[key];
  if (fx) tr.forEach(e => { if (fx[e.english]) e.greek = fx[e.english]; });
  const have = new Set(tr.map(e => e.english));
  ((kx.add && kx.add[key]) || []).forEach(e => { if (!have.has(e.english)) tr.push(e); });
  if (kx.discussion && kx.discussion[key] && ch.context.overview) { ch.context.overview.discussion = kx.discussion[key]; if (kx.discussionShort && kx.discussionShort[key]) ch.context.overview.discussionShort = kx.discussionShort[key]; }
  ch.context._kwx = true;
}

// ---------- Load + render a chapter (Read screen) ----------
async function loadChapter() {
  bookLabel.textContent = 'Loading…';
  verseListEl.innerHTML = '';

  try {
    currentChapterData = await fetchJSON(`data/${currentBook}/${currentChapterNum}.json`);
    applyKwExtra(currentChapterData, await loadKwExtra());
    await wwP;
  } catch (err) {
    bookLabel.textContent = '';
    chapterTitle.textContent = '';
    verseListEl.innerHTML = `<p class="empty-note">This chapter hasn't been drafted yet.</p>`;
    syncQuickNav();
    return;
  }

  renderChapter();
  syncQuickNav();
  try {
    localStorage.setItem('foreverBiblePos', JSON.stringify({ book: currentBook, chapter: currentChapterNum }));
  } catch (e) { /* ignore */ }
}

function renderChapter() {
  const ch = currentChapterData;
  bookLabel.textContent = `${ch.book.toUpperCase()} · CHAPTER ${ch.chapter}`;
  chapterTitle.textContent = ch.title;

  verseListEl.innerHTML = '';
  ch.verses.forEach(({ num, text }) => {
    const p = document.createElement('p');
    p.className = 'verse';
    p.dataset.verse = num;
    const supEl = document.createElement('span');
    supEl.className = 'verse-num';
    supEl.textContent = num;
    p.appendChild(supEl);
    p.appendChild(document.createTextNode(text));
    p.addEventListener('click', () => openSummary(num));
    verseListEl.appendChild(p);
  });
  try { if (window.VT) VT.afterRender(currentBook, currentChapterNum); } catch (e) { /* versions are optional */ }
}

// ---------- Summary sheet ----------
function findTranslationEntry(verseNum) {
  const ctx = currentChapterData.context;
  for (const entry of ctx.translation) {
    const refs = entry.verseRef.match(/\d+/g).map(Number);
    if (refs.includes(verseNum)) return entry;
  }
  return null;
}

// Verse sheet: same compact tiles as the chapter Overview. Each tile opens its tab.
function renderSheetTiles(ch, verseNum) {
  const ctx = ch.context, ov = ctx.overview || null;
  const strip = x => String(x == null ? '' : x).replace(/<[^>]*>/g, '').trim();
  const clipTo = (x, n) => { x = strip(x); return x.length > n ? x.slice(0, n - 1).replace(/\s+\S*$/, '') + '\u2026' : x; };
  const firstS = x => { x = strip(x); const m = x.match(/^(.+?[.!?])(\s|$)/); return m ? m[1] : x; };
  const tile = (label, color, go, inner, section) =>
    `<button class="ov-blk" data-go="${go}" ${section ? `data-section="${section}"` : ''}><span class="ov-h" style="color:${color}">${label}<i>\u203a</i></span>${inner}</button>`;

  const t = findTranslationEntry(verseNum);
  let tr;
  if (t) {
    const def = t.gloss || firstS(t.meaning);
    tr = `<span class="ov-words"><span class="ov-w"><span class="ov-w1"><span class="ov-greek"><b>${escHtml(t.ovGreek || String(t.greek).split(' (')[0])}</b></span> \u2013 <b>${escHtml((t.ovEnglish || t.english).charAt(0).toUpperCase() + (t.ovEnglish || t.english).slice(1))}</b></span></span></span><span class="ov-sn ov-sn5 sh-def">${escHtml(clipTo(def, 90))}</span>`;
  } else {
    tr = `<span class="ov-sn ov-sn5">No keyword in this verse. Tap to see the chapter's key words.</span>`;
  }

  const place = (ov && ov.placeName) || (ctx.mapCoords && ctx.mapCoords.placeName) || toTitleCase(strip(ctx.mapLabel).split('\u2014')[0].trim());
  const settingLine = ov && ov.settingLine ? ov.settingLine : firstS(ctx.setting);
  const setting = `<span class="ov-sn ov-sn5">${escHtml(clipTo(place + '. ' + settingLine, 130))}</span>`;

  const timeline = `<span class="ov-sn ov-sn5">${escHtml(clipTo(String(ctx.timelineImmediate).split(' \u2014 ')[0], 120))}</span>`;

  const author = ov && ov.author
    ? `<span class="ov-kv"><span><em>AUTHOR</em>${escHtml(ov.author)}</span></span><span class="ov-sn ov-sn3 sh-def">${escHtml(ov.genre || '')}</span>`
    : `<span class="ov-sn ov-sn5">${escHtml(clipTo(ctx.author, 90))}</span>`;

  sheetGrid.innerHTML =
    tile('TRANSLATION', 'var(--gold)', 'translation', tr) +
    tile('SETTING', 'var(--verdigris)', 'context', setting, 'setting') +
    tile('TIMELINE', 'var(--blue)', 'context', timeline, 'timeline') +
    tile('ORIGINAL WRITING', 'var(--verdigris)', 'author', author);

  const w1 = sheetGrid.querySelector('.ov-w1');
  if (w1) { let fs = 12.5; w1.style.fontSize = fs + 'px'; while (w1.scrollWidth > w1.clientWidth && fs > 8) { fs -= 0.5; w1.style.fontSize = fs + 'px'; } }

  sheetGrid.querySelectorAll('.ov-blk').forEach(btn => btn.addEventListener('click', () => {
    backdrop.classList.remove('open');
    sheet.classList.remove('open');
    goToScreen('deepdive');
    setTab(tabOrder.indexOf(btn.dataset.go));
    const sec = btn.dataset.section;
    if (btn.dataset.go === 'context' && sec) {
      const head = document.querySelector(`.accordion-head[data-section="${sec}"]`);
      if (head && !accordionOpen[sec]) head.click();
      if (head) head.scrollIntoView({ block: 'start' });
    }
  }));
}


// Word-by-word view (verse sheet + Translation tab). Data: STEP Bible (CC BY 4.0), one file per chapter, loaded on demand.
const wordCache = {};
let wbwSeq = 0, wbwTabSeq = 0, wbwTabVerse = 1, wbwTabKey = '';
function loadWords(slug, chap) {
  const key = slug + '/' + chap;
  if (!(key in wordCache)) {
    wordCache[key] = fetch(`data/words/${slug}/${chap}.json`).then(r => (r.ok ? r.json() : null)).catch(() => null);
  }
  return wordCache[key];
}
function wbwClass(morph) {
  const k = String(morph || '').split(' · ')[0];
  if (k === 'Verb') return 'v';
  if (k === 'Noun') return 'n';
  if (k === 'Adjective' || /pronoun/i.test(k)) return 'a';
  return 'o';
}
// Compact pattern: show the first `cap` children of a list, hide the rest behind a "Show N more" button.
function capList(listEl, cap) {
  if (!listEl) return;
  const prev = listEl.nextElementSibling; if (prev && prev.classList.contains('cap-btn')) prev.remove();
  const kids = Array.from(listEl.children);
  kids.forEach(k => { k.hidden = false; });
  if (kids.length <= cap + 1) return;
  const extra = kids.slice(cap);
  extra.forEach(k => { k.hidden = true; });
  const btn = document.createElement('button');
  btn.type = 'button'; btn.className = 'show-toggle cap-btn'; btn.textContent = `Show ${extra.length} more`;
  btn.addEventListener('click', () => { const open = extra[0].hidden; extra.forEach(k => { k.hidden = !open; }); btn.textContent = open ? 'Show fewer' : `Show ${extra.length} more`; });
  listEl.insertAdjacentElement('afterend', btn);
  listEl._reveal = () => { extra.forEach(k => { k.hidden = false; }); btn.textContent = 'Show fewer'; };
}
// Compact pattern: clamp a block to maxH px with a fade + toggle button; no button if it already fits.
function clampBlock(el, maxH, moreLabel, lessLabel) {
  if (!el || el.dataset.clamped) return;
  if (el.scrollHeight <= maxH + 8) return;
  el.dataset.clamped = '1';
  el.classList.add('clamp');
  el.style.maxHeight = maxH + 'px';
  const btn = document.createElement('button');
  btn.type = 'button'; btn.className = 'show-toggle'; btn.textContent = moreLabel;
  btn.addEventListener('click', () => {
    const open = el.classList.toggle('clamp-open');
    el.style.maxHeight = open ? 'none' : maxH + 'px';
    btn.textContent = open ? lessLabel : moreLabel;
  });
  el.insertAdjacentElement('afterend', btn);
}
const wbwTrim = s => String(s).replace(/[\s·,.;:·;¶—]+$/g, '');
function drawWbw(box, words, data, big) {
  const counts = {};
  Object.values(data).forEach(vw => vw.forEach(w => { if (w[3]) counts[w[3]] = (counts[w[3]] || 0) + 1; }));
  box.innerHTML =
    `<div class="wbw-legend"><span class="c-v">Verb</span><span class="c-n">Noun</span><span class="c-a">Adjective / pronoun</span><span class="c-o">Little words</span></div>` +
    `<div class="wbw-row${big ? ' big' : ''}">${words.map((w, i) => `<button class="wbw-chip c-${wbwClass(w[6])}" data-i="${i}"><span class="g">${escHtml(wbwTrim(w[0]))}</span><span class="e">${escHtml(w[2])}</span></button>`).join('')}</div>` +
    `<div class="wbw-card" style="display:none"></div>` +
    (big ? `<p class="wbw-credit">Word data: <a href="https://www.stepbible.org" target="_blank" rel="noopener">STEP Bible</a> · CC BY 4.0</p>` : '');
  const card = box.querySelector('.wbw-card');
  box.querySelectorAll('.wbw-chip').forEach(chip => chip.addEventListener('click', () => {
    const w = words[Number(chip.dataset.i)];
    box.querySelectorAll('.wbw-chip').forEach(c => c.classList.toggle('on', c === chip));
    const lex = w[4] ? `${escHtml(w[4])}${w[5] ? ' · ' + escHtml(w[5]) : ''}${w[3] ? ' · ' + escHtml(w[3]) : ''}` : '';
    const n = w[3] ? counts[w[3]] : 0;
    card.innerHTML =
      `<div class="bg">${escHtml(wbwTrim(w[0]))}<i>${escHtml(w[1])}</i></div>` +
      `<div class="ln"><b>IN THIS VERSE</b>${escHtml(wbwTrim(w[2]))}</div>` +
      (worldFor(null, w[3]) ? `<div class="ln wd"><b>IN THEIR WORLD</b><span>${escHtml(worldFor(null, w[3]))}</span></div>` : '') +
      (lex ? `<div class="ln"><b>ROOT</b>${lex}</div>` : '') +
      (w[6] ? `<div class="ln"><b>GRAMMAR</b>${escHtml(w[6])}</div>` : '') +
      (n ? `<div class="ln"><b>IN THIS CHAPTER</b>${n} time${n === 1 ? '' : 's'}</div>` : '') +
      (w[3] && WC ? gospelUsageHTML(w[3]) : '');
    card.style.display = '';
    try { card.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } catch (e) {}
  }));
}
async function renderWordStrip(verseNum) {
  const box = document.getElementById('wbw');
  const seq = ++wbwSeq;
  box.style.display = 'none';
  box.innerHTML = '';
  const data = await loadWords(currentBook, currentChapterNum);
  if (seq !== wbwSeq) return;
  const words = data && data[String(verseNum)];
  if (!words || !words.length) return;
  box.innerHTML = '<div class="wbw-h">TRANSLATION WORD BY WORD<span>tap a word</span></div><div class="wbw-body"></div>';
  drawWbw(box.querySelector('.wbw-body'), words, data, false);
  box.style.display = '';
  clampBlock(box.querySelector('.wbw-row'), 62, `Show all ${words.length} words`, 'Show fewer words');
}
async function renderWbwTab() {
  const vers = document.getElementById('wbwVers');
  if (!vers || !currentChapterData) return;
  const key = currentBook + '/' + currentChapterNum;
  if (key !== wbwTabKey) { wbwTabKey = key; wbwTabVerse = 1; }
  const seq = ++wbwTabSeq;
  const data = await loadWords(currentBook, currentChapterNum);
  if (seq !== wbwTabSeq) return;
  const verses = currentChapterData.verses;
  if (!verses.some(v => v.num === wbwTabVerse)) wbwTabVerse = verses[0].num;
  vers.innerHTML = verses.map(v => `<option value="${v.num}"${v.num === wbwTabVerse ? ' selected' : ''}>${escHtml(currentChapterData.book)} ${currentChapterNum}:${v.num}</option>`).join('');
  vers.value = String(wbwTabVerse);
  vers.onchange = () => { wbwTabVerse = Number(vers.value); renderWbwTab(); };
  const vv = verses.find(v => v.num === wbwTabVerse);
  document.getElementById('wbwVtext').textContent = vv ? vv.text : '';
  const body = document.getElementById('wbwTabBody');
  const words = data && data[String(wbwTabVerse)];
  if (!words || !words.length) {
    body.innerHTML = '<p class="panel-text dim">No word-by-word data for this verse. Some verses appear only in later manuscripts and are left out of the earliest Greek text.</p>';
    return;
  }
  drawWbw(body, words, data, true);
}


// Per-verse commentary: four tiles, up to three modern voices plus early-church writers.
// Data is prebuilt into data/mix/<book>.json (keyed by chapter). Entry: [kind m|e, who, work, preview, url, range, fullText?]
const cmCache = {};
const cmBookCache = {};
let cmSeq = 0, cmTabSeq = 0, cmTabVerse = 1, cmTabKey = '';
// One file per Gospel (data/mix/<book>.json, keyed by chapter); falls back to the older per-chapter files.
function loadCommentary(slug, chap) {
  const key = slug + '/' + chap;
  if (!(key in cmCache)) {
    if (!(slug in cmBookCache)) cmBookCache[slug] = fetch(`data/mix/${slug}.json`).then(r => (r.ok ? r.json() : null)).catch(() => null);
    cmCache[key] = cmBookCache[slug].then(book => {
      if (book && book[String(chap)]) return book[String(chap)];
      return fetch(`data/mix/${slug}/${chap}.json`).then(r => (r.ok ? r.json() : null)).catch(() => null);
    });
  }
  return cmCache[key].then(r => sumP.then(() => r));
}
const cmShort = { 'Augustine of Hippo': 'Augustine', 'Origen of Alexandria': 'Origen', 'Ambrose of Milan': 'Ambrose', 'Hilary of Poitiers': 'Hilary', 'Gregory the Dialogist': 'Gregory the Great', 'Basil of Caesarea': 'Basil', 'Alcuin of York': 'Alcuin', 'Remigius of Rheims': 'Remigius', 'Cyril of Alexandria': 'Cyril of Alexandria', 'Tim Mackie · BibleProject': 'Tim Mackie' };
function cmLinkLabel(e) {
  const u = e[4] || '';
  if (e[0] === 'e') return 'Read the full text ↗';
  if (/desiringgod/.test(u)) return 'Open on Desiring God ↗';
  if (/enduringword/.test(u)) return 'Read on Enduring Word ↗';
  if (/biblegateway/.test(u)) return 'Matthew Henry, full commentary ↗';
  if (/bibleproject/.test(u)) return 'Open on BibleProject ↗';
  if (/openlibrary/.test(u)) return 'Find the book ↗';
  if (/ccel\.org/.test(u)) return 'Read Ryle on CCEL ↗';
  if (/preceptaustin/.test(u)) return 'Read Spurgeon\'s commentary ↗';
  if (/spurgeon/.test(u)) return 'Read the sermon ↗';
  if (/gospelinlife/.test(u)) return /book-of-the-bible/.test(u) ? 'See his sermons on this chapter ↗' : 'Listen or read on Gospel in Life ↗';
  if (/coe22\.com/.test(u)) return 'Watch the sermon ↗';
  if (/petersonacademy/.test(u)) return 'See the course ↗';
  if (/podcast\.de|spotify|podbean|listennotes|podcasts\.apple/.test(u)) return 'Listen to the episode ↗';
  return 'Open ↗';
}
function cmCredit(list) {
  const has = k => list.some(e => e[0] === k);
  const own = [];
  if (list.some(e => /Guzik/.test(e[1]))) own.push('Guzik');
  if (list.some(e => /Lewis/.test(e[1]))) own.push('Lewis');
  if (list.some(e => /Mackie|BibleProject/.test(e[1]))) own.push('BibleProject');
  const bits = [];
  if (own.length) bits.push(own.join(' and ') + ' ' + (own.length > 1 ? 'are' : 'is') + ' summarized in our own words');
  if (list.some(e => /Henry/.test(e[1]) && e[2].indexOf('link') < 0)) bits.push('Henry is quoted from the public-domain Concise Commentary');
  if (list.some(e => /Comer/.test(e[1]))) bits.push('Comer’s tile is a short summary of his teaching');
  if (list.some(e => e[7] === 'c' && /Spurgeon/.test(e[1]))) bits.push('Spurgeon’s commentary tiles are short summaries in our own words');
  if (list.some(e => e[7] === 'c' && /Ryle/.test(e[1]))) bits.push('Ryle’s tiles are short summaries of his Expository Thoughts, in our own words');
  if (list.some(e => e[7] === 'c' && /Piper/.test(e[1]))) bits.push('Piper book tiles are short pointers to the book, in our own words');
  if (list.some(e => /Peterson/.test(e[1]))) bits.push('Peterson’s course is paid, with a preview');
  if (has('e')) bits.push('early-church excerpts are public-domain translations via <a href="https://historicalchristian.faith" target="_blank" rel="noopener">historicalchristian.faith</a>');
  return bits.length ? bits.join('; ').replace(/^./, c => c.toUpperCase()) + '.' : '';
}

// One-sentence "what is this link" line for tiles that otherwise show only a title.
function linkBlurb(e, sm) {
  const work = e[2] || '', u = e[4] || '', who = e[1] || '';
  const parts = work.split(' · ');
  const last = parts[parts.length - 1] || '';
  let r = 'this passage';
  const mv = last.match(/^(vv?)\.(.+)$/);
  if (mv) r = (mv[1] === 'v' ? 'verse ' : 'verses ') + mv[2];
  else if (/^[1-3]?\s?[A-Z][a-z]+ \d/.test(last)) r = last;
  const pretty = x => x.replace(/-/g, ' ').replace(/\b(god|christ)s\b/g, "$1's").replace(/(^|\s)[a-z]/g, c => c.toUpperCase()).replace(/\b(Of|The|And|To|In|A|On|For)\b(?!^)/g, m => m.toLowerCase()).replace(/^./, c => c.toUpperCase());
  if (who === 'John Piper') {
    const seg = (u.match(/desiringgod\.org\/([^/]+)\/(?:([^/]+)\/)?/) || []);
    const kind = seg[1] || '';
    const medium = /Video/.test(work) ? 'video' : /Audio/.test(work) ? 'audio' : '';
    if (/Excerpt/.test(work)) return `A short clip pulled from one of Piper’s longer messages, on ${r}.`;
    if (kind === 'scripture') return 'Every Desiring God sermon, article and devotional filed under this chapter.';
    if (kind === 'messages') return `A full-length ${medium ? medium + ' ' : ''}sermon by Piper on ${r}, centered on God’s glory and our joy in him.`;
    if (kind === 'articles') return sm && sm.by ? `A written Desiring God article by ${sm.by} on ${r}; part of the Desiring God library Piper founded.` : `A written Desiring God article drawing on ${r}; shorter and more focused than a sermon.`;
    if (kind === 'solid-joys') return `A short daily devotional from Piper’s Solid Joys series, built around ${r}.`;
    if (kind === 'interviews') return `Ask Pastor John: Piper answers a listener’s question connected to ${r} in a short podcast episode.`;
    if (kind === 'labs') return `Look at the Book: a guided video where Piper marks up the text on screen and walks through ${r} line by line.`;
    if (kind === 'light-and-truth') return `A short teaching from Piper’s Light + Truth series${seg[2] ? ' “' + pretty(seg[2]) + '”' : ''}, tying ${r} into a larger Bible theme.`;
    return '';
  }
  if (who === 'Tim Keller') {
    const series = parts[1] && !/^all sermons/.test(parts[1]) ? ` from his “${parts[1]}” series` : '';
    if (sm && sm.by) return `A sermon by ${sm.by}, preached on ${r}.`;
    return `A full sermon by Keller${series}, preached on ${r}, unpacking the text and showing how it points to Christ.`;
  }
  if (who === 'Joby Martin' || who === 'Eleven22 Church') {
    const series = parts[1] ? `“${parts[1]}”` : 'a sermon series';
    const guest = (sm && sm.by) || (e[3].match(/·\s*(.+)$/) || [])[1];
    return guest ? `A sermon by guest preacher ${guest} in Eleven22’s ${series}, on ${r}.` : `A sermon by Joby Martin in Eleven22’s ${series}, on ${r}, in a conversational, story-driven style.`;
  }
  if (who === 'Charles Spurgeon') {
    const n = (work.match(/#(\d+)/) || [])[1];
    return `Spurgeon’s own sermon${n ? ' no. ' + n : ''} preaching ${r}; vivid, Christ-centered Victorian preaching, opened as a PDF.`;
  }
  return '';
}
function drawCommentary(box, entries, openFirst, showCredit, cap) {
  const list = entries.slice(0, 4);
  const shown = cap && list.length > cap ? cap : list.length;
  const rawSum = e => SUM[e[4]] || null;
  const sumOf = e => { const x = rawSum(e); return x && x.s ? x : null; };
  const who = e => { const x = rawSum(e); return escHtml(x && x.by ? x.by : (cmShort[e[1]] || e[1])); };
  const isTitle = e => e[7] !== 'c' && (e[1] === 'John Piper' || e[1] === 'Charles Spurgeon' || e[7] === 't');
  box.innerHTML =
    `<div class="cm-grid">${list.map((e, i) => `<button class="cm-tile ${e[0]}${i >= shown ? ' cm-extra' : ''}" type="button" data-i="${i}"${i >= shown ? ' hidden' : ''}>
        <span class="cm-who">${who(e)}</span>
        <span class="cm-work">${escHtml(e[2])}${e[5] ? ' · ' + escHtml(e[5]) : ''}</span>
        <span class="cm-prev${isTitle(e) ? ' t' : ''}">${escHtml(isTitle(e) && sumOf(e) ? sumOf(e).s : e[3])}</span>
      </button>`).join('')}</div>` +
    (shown < list.length ? `<button type="button" class="show-toggle cm-more">Show ${list.length - shown} more</button>` : '') +
    `<div class="cm-detail" style="display:none"></div>` +
    (showCredit && cmCredit(list) ? `<p class="cm-credit">${cmCredit(list)}</p>` : '');
  const detail = box.querySelector('.cm-detail');
  const tiles = box.querySelectorAll('.cm-tile');
  const pick = i => {
    const e = list[i];
    const was = tiles[i].classList.contains('on');
    tiles.forEach(t => t.classList.remove('on'));
    if (was) { detail.style.display = 'none'; return; }
    tiles[i].classList.add('on');
    const body = e[6] && e[0] === 'm' && /Guzik/.test(e[1]) ? `<p class="cm-dtitle">${escHtml(e[6])}</p><p>${escHtml(e[3])}</p>` : isTitle(e) ? `<p class="cm-dtitle">${escHtml(e[3])}</p>` + (sumOf(e) ? `<p>${escHtml(sumOf(e).s)}</p>` : '') + (linkBlurb(e, rawSum(e)) ? `<p class="${sumOf(e) ? 'cm-dsrc' : 'cm-dblurb'}">${escHtml(linkBlurb(e, rawSum(e)))}</p>` : '') : `<p>${escHtml(e[3])}</p>`;
    detail.innerHTML = `<div class="cm-dh ${e[0]}"><b>${who(e)}</b><span>${escHtml(e[2])}${e[5] ? ' · ' + escHtml(e[5]) : ''}</span></div>${body}` +
      (e[4] ? `<a class="cm-link" href="${escHtml(e[4])}" target="_blank" rel="noopener">${cmLinkLabel(e)}</a>` : '');
    detail.style.display = '';
    try { detail.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } catch (err) {}
  };
  tiles.forEach((t, i) => t.addEventListener('click', () => pick(i)));
  const moreBtn = box.querySelector('.cm-more');
  if (moreBtn) moreBtn.addEventListener('click', () => {
    const open = moreBtn.dataset.open !== '1';
    moreBtn.dataset.open = open ? '1' : '';
    box.querySelectorAll('.cm-extra').forEach(t => { t.hidden = !open; });
    moreBtn.textContent = open ? 'Show fewer' : `Show ${list.length - shown} more`;
  });
  if (openFirst && tiles.length) pick(0);
}
async function renderSheetCommentary(verseNum) {
  const box = document.getElementById('cmSheet');
  const seq = ++cmSeq;
  box.style.display = 'none';
  box.innerHTML = '';
  const data = await loadCommentary(currentBook, currentChapterNum);
  if (seq !== cmSeq) return;
  const ents = data && data[String(verseNum)];
  if (!ents || !ents.length) return;
  box.innerHTML = '<div class="wbw-h">COMMENTARY<span>gold = modern voices · red = early church</span></div><div class="cm-body"></div>';
  drawCommentary(box.querySelector('.cm-body'), ents, false, false, 2);
  box.style.display = '';
}
async function renderCmTab() {
  const vers = document.getElementById('cmVers');
  if (!vers || !currentChapterData) return;
  const key = currentBook + '/' + currentChapterNum;
  if (key !== cmTabKey) { cmTabKey = key; cmTabVerse = 1; }
  const seq = ++cmTabSeq;
  const data = await loadCommentary(currentBook, currentChapterNum);
  if (seq !== cmTabSeq) return;
  const verses = currentChapterData.verses;
  if (!verses.some(v => v.num === cmTabVerse)) cmTabVerse = verses[0].num;
  vers.innerHTML = verses.map(v => `<option value="${v.num}"${v.num === cmTabVerse ? ' selected' : ''}>${escHtml(currentChapterData.book)} ${currentChapterNum}:${v.num}</option>`).join('');
  vers.value = String(cmTabVerse);
  vers.onchange = () => { cmTabVerse = Number(vers.value); renderCmTab(); };
  const vv = verses.find(v => v.num === cmTabVerse);
  document.getElementById('cmVtext').textContent = vv ? vv.text : '';
  const body = document.getElementById('cmTabBody');
  const ents = data && data[String(cmTabVerse)];
  if (!ents || !ents.length) { body.innerHTML = '<p class="panel-text dim">Commentary could not be loaded. Check your connection and try again.</p>'; return; }
  drawCommentary(body, ents, true, true);
}
// Overview: let the Commentary tile use exactly the height of the References tile beside it.
function fitOvCommentary() {
  const panel = document.querySelector('[data-panel="overview"]');
  if (!panel) return;
  const cm = panel.querySelector('.ov-cmblk'), rf = panel.querySelector('.ov-refblk');
  if (!cm || !rf) return;
  const q = Array.from(cm.querySelectorAll('.ov-qt'));
  if (!q.length || !rf.offsetHeight) return;
  const set = (el, n) => el.style.setProperty('-webkit-line-clamp', String(n), 'important');
  const get = el => Number(el.style.getPropertyValue('-webkit-line-clamp')) || 2;
  const aS = cm.style.alignSelf, bS = rf.style.alignSelf;
  cm.style.alignSelf = 'start'; rf.style.alignSelf = 'start';
  const target = rf.offsetHeight;
  q.forEach(el => set(el, 2));
  for (let guard = 0; guard < 30; guard++) {
    let grew = false;
    for (let i = q.length - 1; i >= 0 && !grew; i--) {
      if (q[i].scrollHeight <= q[i].clientHeight + 1) continue;
      const cur = get(q[i]);
      set(q[i], cur + 1);
      if (cm.offsetHeight > target + 1) set(q[i], cur); else grew = true;
    }
    if (!grew) break;
  }
  cm.style.alignSelf = aS; rf.style.alignSelf = bS;
}
// Verse sheet: one gentle pointer to the Chapter Deep Dive (the old row of "learn more" pills is gone).
function renderLearnMore(ch, verseNum) {
  sheetGrid.innerHTML = '<p class="learn-s">Want more on this chapter? Tap <b>Chapter Deep Dive</b> below for the setting, history, customs and more.</p>';
}

function openSummary(verseNum) {
  const ch = currentChapterData;
  document.querySelectorAll('.verse').forEach(v =>
    v.classList.toggle('active', Number(v.dataset.verse) === verseNum)
  );

  const verseEntry = ch.verses.find(v => v.num === verseNum);
  sheetRef.textContent = `${ch.book.toUpperCase()} ${ch.chapter}:${verseNum}`;
  sheetVerseText.textContent = /^["\u201c]/.test(verseEntry.text) ? verseEntry.text : `"${verseEntry.text}"`;
  try { if (window.VT) VT.onSheet(currentBook, currentChapterNum, verseNum, verseEntry.text); } catch (e) { /* versions are optional */ }
  wbwTabVerse = verseNum;
  cmTabVerse = verseNum;
  renderLearnMore(ch, verseNum);
  renderWordStrip(verseNum);
  renderSheetCommentary(verseNum);
  if (document.getElementById('wbwVers') && document.getElementById('wbwVers').children.length) renderWbwTab();

  backdrop.classList.add('open');
  sheet.classList.add('open');
  fitSheet();
  tourNote('sheet');
}
// Keep everything on one screen: if the sheet would still scroll, switch to the tight layout.
let _fitT = 0;
new MutationObserver(() => { clearTimeout(_fitT); _fitT = setTimeout(() => { if (sheet.classList.contains('open')) fitSheet(); }, 60); })
  .observe(sheet, { childList: true, subtree: true });
function fitSheet() {
  sheet.classList.remove('tight');
  if (sheet.scrollHeight > sheet.clientHeight + 1) sheet.classList.add('tight');
}

backdrop.addEventListener('click', () => {
  backdrop.classList.remove('open');
  sheet.classList.remove('open');
});

// Whenever a chapter's Deep Dive is opened, it starts at the top of its first tab (the Overview when the chapter has one).
function ddToTop() {
  try { setTab(0); } catch (e) {}
  const reset = () => {
    folderContent.scrollTop = 0;
    document.querySelectorAll('#screen-deepdive .tab-panel').forEach(p => { p.scrollTop = 0; });
    const ft = document.getElementById('folderTabs'); if (ft) ft.scrollLeft = 0;
  };
  reset(); requestAnimationFrame(reset); setTimeout(reset, 120);
}
diveBtn.addEventListener('click', () => {
  backdrop.classList.remove('open');
  sheet.classList.remove('open');
  goToScreen('deepdive');
  ddToTop();
});

// ---------- Deep Dive screen ----------
function renderDeepDive() {
  syncQuickNav();
  renderFolderContent();
}

function renderFolderContent() {
  const ctx = currentChapterData.context;

  document.getElementById('ctxChapterTitle').textContent =
    currentChapterData.book + ' ' + currentChapterData.chapter + ': ' + currentChapterData.title;

  { const sn = document.getElementById('sparkNotesText'); sn.innerHTML = ctx.sparkNotes ? rmHtml(escHtml(ctx.sparkNotes)) : ''; wireRm(sn); }

  carouselIndex = 0;
  renderCarousel();

  renderAccordion(ctx);
  document.getElementById('authorPanel').innerHTML = `
    <p class="panel-eyebrow">ORIGINAL WRITING</p>
    <div class="au-row"><p class="ctx-subhead">AUTHOR</p><p class="panel-text">${ctx.author}</p></div>
    <div class="au-row"><p class="ctx-subhead">GENRE</p><p class="panel-text">${ctx.genre}</p></div>
    <div class="au-row"><p class="ctx-subhead">AUDIENCE</p><p class="panel-text">${ctx.audience}</p></div>`;
  renderOverview(ctx);
  fillTemplateTabs(ctx);

  document.getElementById('translationHeading').textContent =
    `Key words across ${currentChapterData.book} ${currentChapterData.chapter}`;
  const tList = document.getElementById('translationList');
  tList.innerHTML = '';
  document.getElementById('kwSub').textContent = ctx.translation.length + ' words';
  ctx.translation.forEach((entry, idx) => {
    const div = document.createElement('div');
    div.className = 'word-card exp';
    div.id = 'kwc' + idx;
    const hasOcc = entry.occurrences && entry.occurrences.total;
    const usageBlock = hasOcc ? `
      <button class="word-usage-toggle" data-idx="${idx}">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 18l6-6-6-6"/></svg>
        Used ${entry.occurrences.total}\u00d7 in the New Testament
      </button>
      <div class="word-usage-panel" id="wordUsage${idx}"></div>
    ` : (entry.gospelCount ? `<p class="kw-count">Appears ${entry.gospelCount}\u00d7 in the Gospel chapters in this app.</p>` : '');
    div.innerHTML = `
      <div class="word-title-row">
        <span class="word-english">${entry.english}</span>
        <span class="word-verseref">${entry.verseRef}</span>
      </div>
      <span class="word-greek">${entry.greek}</span>
      <p class="word-meaning exp-body">${entry.meaning}</p>
      <div class="exp-extra">${(() => { const w = worldFor(Object.assign({ _wk: currentBook + '/' + currentChapterNum + '|' + String(entry.english).toLowerCase() }, entry)); return w ? `<p class="kw-world"><b>IN THEIR WORLD</b>${escHtml(w)}</p>` : ''; })()}${usageBlock}</div>
      <span class="exp-more"><span class="exp-lbl">Read more</span><svg width="10" height="6" viewBox="0 0 10 6"><path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.6"/></svg></span>
    `;
    tList.appendChild(div);
  });
  tList.querySelectorAll('.word-usage-toggle').forEach(btn => {
    btn.addEventListener('click', () => toggleWordUsage(btn, ctx.translation[parseInt(btn.dataset.idx)]));
  });

  wireExpand(tList);
  capList(tList, 3);
  fillKeywordUsage(ctx, tList);
  const kwChips = document.getElementById('kwChips');
  kwChips.innerHTML = ctx.translation.map((entry, idx) => `<button type="button" class="kw-chip" data-i="${idx}">${escHtml(entry.english)}</button>`).join('');
  kwChips.querySelectorAll('.kw-chip').forEach(b => b.addEventListener('click', () => {
    const card = document.getElementById('kwc' + b.dataset.i);
    if (!card) return;
    if (card.hidden && tList._reveal) tList._reveal();
    // Scroll only the Deep Dive content pane (scrollIntoView also nudges the phone frame and shifts the layout).
    const top = card.getBoundingClientRect().top - folderContent.getBoundingClientRect().top + folderContent.scrollTop - 10;
    try { folderContent.scrollTo({ top, behavior: 'smooth' }); } catch (e) { folderContent.scrollTop = top; }
    card.classList.remove('kw-flash'); void card.offsetWidth; card.classList.add('kw-flash');
  }));
  renderWbwTab();
  renderCmTab();

  const cList = document.getElementById('commentaryList');
  if (ctx.commentary && ctx.commentary.length) {
    document.getElementById('cmChapSub').textContent = ctx.commentary.length + ' commentators';
    cList.innerHTML = ctx.commentary.map(entry => `
      <div class="commentary-card exp">
        <div><span class="commentary-source">${entry.source}</span><span class="commentary-year">${entry.year}</span></div>
        <p class="commentary-note exp-body" style="margin-top:6px">${entry.note}</p>
        <div class="exp-extra">
          <a class="commentary-link" href="${entry.url}" target="_blank" rel="noopener">
            Read the full commentary
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 17L17 7M17 7H7M17 7V17"/></svg>
          </a>
        </div>
        <span class="exp-more"><span class="exp-lbl">Read more</span><svg width="10" height="6" viewBox="0 0 10 6"><path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.6"/></svg></span>
      </div>
    `).join('');
  } else {
    document.getElementById('cmChapSub').textContent = '';
    cList.innerHTML = `<p class="panel-text dim">No commentary added for this chapter yet.</p>`;
  }

  wireExpand(cList);
  capList(cList, 2);
  const gList = document.getElementById('gospelParallelsList');
  document.getElementById('gpSub').textContent = ctx.gospelParallels.length ? ctx.gospelParallels.length + (ctx.gospelParallels.length === 1 ? ' passage' : ' passages') : '';
  document.getElementById('otSub').textContent = ctx.otBackground.length ? ctx.otBackground.length + (ctx.otBackground.length === 1 ? ' passage' : ' passages') : '';
  gList.innerHTML = '';
  ctx.gospelParallels.forEach(entry => {
    const div = document.createElement('div');
    div.className = 'xref-card';
    const parsed = parseRef(entry.ref);
    const homeRange = entry.verses ? entry.verses.split('-').map(n => parseInt(n)) : [null, null];
    const homeStart = homeRange[0], homeEnd = homeRange.length > 1 ? homeRange[1] : homeRange[0];
    const harmonyBtn = parsed
      ? `<button class="harmony-link" data-book="${parsed.bookSlug}" data-chapter="${parsed.chapter}" data-vstart="${parsed.verseStart || ''}" data-vend="${parsed.verseEnd || ''}" data-hstart="${homeStart || ''}" data-hend="${homeEnd || ''}">
           <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M8 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3 M16 3h3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-3 M12 3v18"/></svg>
           Read side by side
         </button>`
      : '';
    div.innerHTML = `<div class="xref-ref">${entry.ref}</div><p class="xref-note">${entry.note}</p>${harmonyBtn}`;
    gList.appendChild(div);
  });
  gList.querySelectorAll('.harmony-link').forEach(btn => {
    btn.addEventListener('click', () => {
      const vs = btn.dataset.vstart ? parseInt(btn.dataset.vstart) : null;
      const ve = btn.dataset.vend ? parseInt(btn.dataset.vend) : null;
      const hs = btn.dataset.hstart ? parseInt(btn.dataset.hstart) : null;
      const he = btn.dataset.hend ? parseInt(btn.dataset.hend) : null;
      openHarmony(currentBook, currentChapterNum, hs, he, btn.dataset.book, parseInt(btn.dataset.chapter), vs, ve);
    });
  });

  const oList = document.getElementById('otBackgroundList');
  oList.innerHTML = '';
  ctx.otBackground.forEach(entry => {
    const div = document.createElement('div');
    div.className = 'xref-card';
    div.innerHTML = `<div class="xref-ref">${entry.ref}</div><p class="xref-note">${entry.note}</p>`;
    oList.appendChild(div);
  });
}

// Tap-to-expand cards: a short preview shows by default; tapping reveals the whole entry.

// "How this word was used in their world" snippet, by keyword (english / chapter) or by Strong's number.
function worldFor(entry, strongs) {
  const eng = String(entry && entry.english || '').toLowerCase();
  if (eng && WW.e[eng]) return WW.e[eng];
  if (entry && entry._wk && WW.k[entry._wk] && WW.w[WW.k[entry._wk]]) return WW.w[WW.k[entry._wk]];
  if (strongs && WW.w[strongs]) return WW.w[strongs];
  return '';
}
function wireExpand(root) {
  root.querySelectorAll('.exp').forEach(c => {
    const extra = c.querySelector('.exp-extra'), body = c.querySelector('.exp-body');
    const hasExtra = extra && extra.textContent.trim().length > 0;
    const long = body && body.textContent.length > 100;
    if (!hasExtra && !long) { const m = c.querySelector('.exp-more'); if (m) m.remove(); return; }
    if (c.dataset.wx) return;
    c.dataset.wx = '1';
    c.classList.add('can');
    c.addEventListener('click', e => {
      if (e.target.closest('a, button, .word-usage-toggle, .word-usage-panel, .gu')) return;
      const open = c.classList.toggle('open');
      const l = c.querySelector('.exp-lbl'); if (l) l.textContent = open ? 'Show less' : 'Read more';
    });
  });
}

// ---------- Harmony: parse a "Book Chapter:verses" ref and check availability ----------
function parseRef(ref) {
  const m = ref.match(/^([1-3]?\s?[A-Za-z]+)\s+(\d+)(?::(\d+)(?:-(\d+))?)?/);
  if (!m) return null;
  const bookName = m[1].trim();
  const chapter = parseInt(m[2]);
  const verseStart = m[3] ? parseInt(m[3]) : null;
  const verseEnd = m[4] ? parseInt(m[4]) : verseStart;
  const book = manifest.books.find(b => b.name.toLowerCase() === bookName.toLowerCase());
  if (!book) return null;
  if (!book.availableChapters.includes(chapter)) return null;
  return { bookSlug: book.slug, bookName: book.name, chapter, verseStart, verseEnd };
}

async function toggleWordUsage(btn, entry) {
  const panel = document.getElementById('wordUsage' + btn.dataset.idx);
  const isOpen = btn.classList.contains('open');
  if (isOpen) {
    btn.classList.remove('open');
    panel.classList.remove('open');
    return;
  }
  btn.classList.add('open');
  panel.classList.add('open');
  if (panel.dataset.loaded) return;
  panel.dataset.loaded = '1';
  panel.innerHTML = '<p class="word-usage-note">Loading\u2026</p>';

  const refs = (entry.occurrences.sampleRefs || []).slice(0, 5);
  const items = await Promise.all(refs.map(async ref => {
    const parsed = parseRef(ref);
    if (parsed && parsed.verseStart) {
      try {
        const data = await fetchJSON(`data/${parsed.bookSlug}/${parsed.chapter}.json`);
        const verse = data.verses.find(v => v.num === parsed.verseStart);
        if (verse) {
          return `<div class="word-usage-item"><p class="word-usage-ref">${ref}</p><p class="word-usage-text">\u201c${verse.text}\u201d</p></div>`;
        }
      } catch (e) { /* fall through to reference-only */ }
    }
    return `<div class="word-usage-item"><p class="word-usage-ref">${ref}</p></div>`;
  }));

  let html = items.join('');
  if (entry.occurrences.note) {
    html += `<p class="word-usage-note">${entry.occurrences.note}</p>`;
  }
  panel.innerHTML = html;
}

function getShortName(slug) {
  const book = manifest.books.find(b => b.slug === slug);
  return book ? (book.shortName || book.name) : slug;
}

function filterVerses(verses, start, end) {
  if (!start) return verses;
  return verses.filter(v => v.num >= start && v.num <= end);
}

function renderHarmonyVerses(elId, data, start, end) {
  const shown = filterVerses(data.verses, start, end);
  document.getElementById(elId).innerHTML = shown.map(v =>
    `<p class="harmony-verse"><span class="harmony-vnum">${v.num}</span>${v.text}</p>`).join('');
}

async function openHarmony(bookA, chA, verseStartA, verseEndA, bookB, chB, verseStartB, verseEndB) {
  const [dataA, dataB] = await Promise.all([
    fetchJSON(`data/${bookA}/${chA}.json`),
    fetchJSON(`data/${bookB}/${chB}.json`)
  ]);
  const shortA = getShortName(bookA), shortB = getShortName(bookB);

  document.getElementById('harmonyTitleA').textContent = `${shortA}${chA}` + (verseStartA ? `:${verseStartA}${verseEndA !== verseStartA ? '-' + verseEndA : ''}` : '');
  document.getElementById('harmonySubtitleA').textContent = dataA.title;
  renderHarmonyVerses('harmonyVersesA', dataA, verseStartA, verseEndA);

  document.getElementById('harmonyTitleB').textContent = `${shortB}${chB}` + (verseStartB ? `:${verseStartB}${verseEndB !== verseStartB ? '-' + verseEndB : ''}` : '');
  document.getElementById('harmonySubtitleB').textContent = dataB.title;
  renderHarmonyVerses('harmonyVersesB', dataB, verseStartB, verseEndB);

  goToScreen('harmony');
}

// Ignore taps that are really scroll gestures: a tap that stops momentum scrolling, or a touch that moved.
let lastOvScroll = 0, ovTouchMoved = false, ovTouchX = 0, ovTouchY = 0;
(function () {
  const fc = document.getElementById('folderContent');
  fc.addEventListener('scroll', () => { lastOvScroll = Date.now(); }, { passive: true });
  fc.addEventListener('touchstart', e => { ovTouchMoved = false; ovTouchX = e.touches[0].clientX; ovTouchY = e.touches[0].clientY; }, { passive: true });
  fc.addEventListener('touchmove', e => {
    if (Math.abs(e.touches[0].clientX - ovTouchX) > 8 || Math.abs(e.touches[0].clientY - ovTouchY) > 8) ovTouchMoved = true;
  }, { passive: true });
})();

// ---------- Archaeology photos per chapter (from data/map-images.json `_ch`; every chapter has at least one) ----------
function chapterDigs() {
  const keys = (MAPIMG._ch && MAPIMG._ch[currentBook + ':' + currentChapterNum]) || [];
  return keys.map(k => MAPIMG[k]).filter(Boolean);
}
function archPrimary(ov) {
  if (ov.archaeologyImage && ov.archaeologyImage.url) return { url: ov.archaeologyImage.url, name: ov.archaeologyImage.name || '', desc: ov.archaeologyImage.desc || '', img: null };
  const d = chapterDigs()[0];
  return d ? { url: mapImgUrl(d, 900), name: d.n || 'Archaeology', desc: d.d || d.c || '', img: d } : null;
}
function digCredit(im) {
  const pg = mapImgPage(im);
  return (im.a ? `<span class="mc-cr">Photo: ${escHtml(im.a)}</span> ` : '') + (pg ? `<a class="mc-src" href="${escHtml(pg)}" target="_blank" rel="noopener">${/commons/.test(pg) ? 'Source &amp; license' : 'Source'} ›</a>` : '');
}

// ---------- Reference libraries: archaeology (data/sites.json) and people & places (data/people.json) ----------
// Both are chapter-agnostic: each entry lists the chapters it belongs to, so a new book only needs new entries, not new code.
let SITES = [], SITE_BY_ID = {}, PEOPLE = [], PEOPLE_BY_ID = {}, libsP = null;
function loadLibs() {
  return libsP || (libsP = Promise.all([
    fetch('data/sites.json').then(r => (r.ok ? r.json() : [])).catch(() => []),
    fetch('data/people.json').then(r => (r.ok ? r.json() : [])).catch(() => [])
  ]).then(([s, p]) => {
    SITES = Array.isArray(s) ? s : []; PEOPLE = Array.isArray(p) ? p : [];
    SITES.forEach(x => { SITE_BY_ID[x.i] = x; }); PEOPLE.forEach(x => { PEOPLE_BY_ID[x.i] = x; });
  }));
}
const LIB_BOOK = { matthew: 'Matthew', mark: 'Mark', luke: 'Luke', john: 'John' };
const LIB_BOOK_SHORT = { matthew: 'Matt', mark: 'Mark', luke: 'Luke', john: 'John' };
const CF_LABEL = { direct: 'Directly attested', site: 'Site identified', ctx: 'Background context', trad: 'Traditional site', recon: 'Reconstruction' };
const CF_HELP = { direct: 'An object or inscription that names a person or place from the text.', site: 'A place the text names that has been found and excavated.', ctx: 'A find that shows the world of the story without naming it.', trad: 'Honored for centuries, not proven by evidence.', recon: 'A modern reconstruction of what has been lost.' };
function curChKey() { return currentBook + ':' + currentChapterNum; }
function inThisChapter(x) { return !!(x.ch && x.ch.indexOf(curChKey()) >= 0); }
function parseRefs(r) {
  const out = []; let book = null;
  String(r || '').split(';').forEach(seg => {
    seg = seg.trim(); if (!seg) return;
    const m = seg.match(/^(Matthew|Mark|Luke|John)\s+(.*)$/);
    const rest = m ? m[2] : seg;
    if (m) book = m[1].toLowerCase();
    const q = rest.match(/^(\d+):(\d+)/);
    if (!book || !q) return;
    out.push({ book, ch: +q[1], v: +q[2], label: LIB_BOOK[book] + ' ' + rest.replace(/-/g, '\u2013') });
  });
  return out;
}
function libPhoto(keys) {
  const im = (keys || []).map(k => MAPIMG[k]).filter(Boolean)[0];
  if (!im) return '';
  return `<figure class="lib-photo"><img src="${escHtml(mapImgUrl(im, 700))}" alt="${escHtml(im.n || im.c || '')}" loading="lazy" decoding="async" onerror="this.parentNode.remove()"><figcaption>${escHtml(im.c || '')} ${digCredit(im)}</figcaption></figure>`;
}
function libRefChips(r, limit) {
  const refs = parseRefs(r); const key = currentBook;
  const here = refs.filter(x => x.book === currentBook && x.ch === currentChapterNum);
  const rest = refs.filter(x => !(x.book === currentBook && x.ch === currentChapterNum));
  const all = here.concat(rest);
  const chip = (x, i) => `<button type="button" class="lib-chip lib-ref${here.indexOf(x) >= 0 ? ' here' : ''}${i >= limit ? ' lib-extra' : ''}" data-lib="ref" data-b="${x.book}" data-c="${x.ch}" data-v="${x.v}">${escHtml(x.label)}</button>`;
  return all.map(chip).join('') + (all.length > limit ? `<button type="button" class="lib-chip lib-moreref" data-lib="expand">+${all.length - limit} more</button>` : '');
}
function detToggle(modal) { return modal ? '' : '<button type="button" class="lib-det-btn" data-lib="det" aria-expanded="false">Why it matters &amp; details <i>\u25be</i></button>'; }
function siteCardHTML(x, modal) {
  const hasXY = x.la != null && x.ln != null;
  const people = modal ? [] : PEOPLE.filter(e => e.sites && e.sites.indexOf(x.i) >= 0 && inThisChapter(e)).slice(0, 5);
  return `<article class="lib-card site-card"${modal ? '' : ' id="site-' + escHtml(x.i) + '"'}>
    ${libPhoto(x.im)}
    <div class="lib-tags"><span class="lib-type">${escHtml(x.t)}</span><span class="lib-cf cf-${escHtml(x.cf)}" title="${escHtml(CF_HELP[x.cf] || '')}">${escHtml(CF_LABEL[x.cf] || x.cf)}</span></div>
    <h3 class="lib-title">${escHtml(x.n)}</h3>
    <p class="lib-meta">${escHtml(x.pl)} \u00b7 ${escHtml(x.per)}</p>
    <p class="lib-lbl">WHAT WAS FOUND</p><p class="lib-p">${escHtml(x.w)}</p>
    ${detToggle(modal)}<div class="lib-det"${modal ? '' : ' hidden'}>
    <p class="lib-lbl">WHY IT MATTERS HERE</p><p class="lib-p">${escHtml(x.m)}</p>
    ${x.c ? `<p class="lib-caution"><b>Keep in mind:</b> ${escHtml(x.c)}</p>` : ''}
    <div class="lib-chips">${libRefChips(x.r, 5)}</div>
    ${people.length ? `<div class="lib-chips lib-rel"><span class="lib-chiplbl">Connected:</span>${people.map(e => `<button type="button" class="lib-chip lib-ent" data-lib="ent" data-id="${escHtml(e.i)}">${escHtml(e.n)}</button>`).join('')}</div>` : ''}
    ${hasXY ? `<div class="lib-acts"><button type="button" class="lib-btn" data-lib="map" data-la="${x.la}" data-ln="${x.ln}" data-z="13" data-name="${escHtml(x.n)}">See on map \u203a</button></div>` : ''}
    </div>
  </article>`;
}
function entInitials(n) {
  const w = String(n).replace(/^(The|A|An)\s+/i, '').replace(/[()]/g, '').split(/\s+/).filter(Boolean);
  return ((w[0] || '?')[0] + (w.length > 1 ? w[1][0] : '')).toUpperCase();
}
function entCardHTML(e, modal) {
  const here = curChKey();
  const other = (e.ch || []).filter(c => modal || c !== here);
  const lim = 8;
  const chips = other.map((c, i) => { const [b, n] = c.split(':'); return `<button type="button" class="lib-chip lib-also${i >= lim ? ' lib-extra' : ''}" data-lib="also" data-b="${b}" data-c="${n}">${LIB_BOOK_SHORT[b]} ${n}</button>`; }).join('') +
    (other.length > lim ? `<button type="button" class="lib-chip lib-moreref" data-lib="expand">+${other.length - lim} more</button>` : '');
  const sites = (e.sites || []).map(id => SITE_BY_ID[id]).filter(Boolean).slice(0, 4);
  const kind = { person: 'Person', group: 'Group', place: 'Place' }[e.k] || '';
  return `<article class="lib-card ent-card ent-${escHtml(e.k)}">
    ${e.k === 'place' ? libPhoto(e.im ? [e.im] : []) : ''}
    <div class="ent-head">${e.k !== 'place' ? `<span class="ent-mono">${escHtml(entInitials(e.n))}</span>` : ''}<div class="ent-ttl"><h3 class="lib-title">${escHtml(e.n)}</h3><p class="lib-meta">${escHtml(e.sub || kind)}</p></div></div>
    <p class="lib-p">${escHtml(e.bio)}</p>
    ${detToggle(modal).replace('Why it matters &amp; details', 'Connections &amp; more')}<div class="lib-det"${modal ? '' : ' hidden'}>
    ${e.rel ? `<p class="lib-p lib-relp"><b>Connections:</b> ${escHtml(e.rel)}</p>` : ''}
    ${e.c ? `<p class="lib-caution"><b>Keep in mind:</b> ${escHtml(e.c)}</p>` : ''}
    ${other.length ? `<div class="lib-chips"><span class="lib-chiplbl">Also in:</span>${chips}</div>` : ''}
    ${sites.length ? `<div class="lib-chips lib-rel"><span class="lib-chiplbl">Archaeology:</span>${sites.map(s => `<button type="button" class="lib-chip lib-site" data-lib="site" data-id="${escHtml(s.i)}">${escHtml(s.n)}</button>`).join('')}</div>` : ''}
    ${e.k === 'place' && e.la != null ? `<div class="lib-acts"><button type="button" class="lib-btn" data-lib="map" data-la="${e.la}" data-ln="${e.ln}" data-z="${e.z || 12.5}" data-name="${escHtml(e.n)}">See on map \u203a</button></div>` : ''}
    </div>
  </article>`;
}
function libSection(title, cards, cap) {
  if (!cards.length) return '';
  const shown = cards.slice(0, cap).join('');
  const hid = cards.slice(cap);
  return `<p class="ctx-subhead lib-sec">${title}</p>${shown}${hid.length ? `<div class="lib-hidden" hidden>${hid.join('')}</div><button type="button" class="lib-showmore" data-lib="showmore">Show ${hid.length} more</button>` : ''}`;
}
function renderArchTab(ov) {
  const mine = SITES.filter(inThisChapter);
  const items = Array.isArray(ov.archaeology) ? ov.archaeology : [];
  const key = curChKey();
  // finds with the most passages in this chapter come first; specific sites before general background
  const nHere = x => parseRefs(x.r).filter(f => (f.book + ':' + f.ch) === key).length;
  const CF_RANK = { site: 0, direct: 1, trad: 2, recon: 3, ctx: 4 };
  mine.sort((a, b) => (nHere(b) - nHere(a)) || ((CF_RANK[a.cf] || 9) - (CF_RANK[b.cf] || 9)));
  const shownImgs = new Set(); mine.forEach(x => (x.im || []).forEach(k => shownImgs.add(MAPIMG[k])));
  const extras = chapterDigs().filter(d => !shownImgs.has(d));
  if (!mine.length) {
    const main = archPrimary(ov);
    return '<p class="panel-eyebrow">ARCHAEOLOGY</p>' +
      (main ? `<figure class="arch-fig"><div class="arch-photo"><img src="${displayImageUrl(main.url)}" alt="${escHtml(main.name)}" loading="lazy" decoding="async" onerror="this.parentNode.remove()"><span>${escHtml(main.name)}</span></div>${main.img ? `<figcaption>${escHtml(main.img.c || '')} ${digCredit(main.img)}</figcaption>` : ''}</figure>` : '') +
      (items.length ? items.map(x => `<div class="au-row"><p class="ctx-subhead">${escHtml(x.h)}</p><p class="panel-text">${escHtml(x.t)}</p></div>`).join('')
        : '<div class="tpl-card"><p class="panel-text dim" style="margin:0;">Sites, digs and artifacts tied to this chapter. Coming soon.</p></div>');
  }
  const legend = Object.keys(CF_LABEL).map(k => `<span class="lib-cf cf-${k}" title="${escHtml(CF_HELP[k])}">${CF_LABEL[k]}</span>`).join('');
  return '<p class="panel-eyebrow">ARCHAEOLOGY</p>' +
    `<p class="lib-intro">${mine.length} ${mine.length === 1 ? 'find or site' : 'finds and sites'} tied to this chapter.</p><details class="acc acc-sm"><summary>WHAT THE TAGS MEAN</summary><div class="acc-body"><div class="lib-legend">${legend}</div></div></details>` +
    libSection('FINDS &amp; SITES', mine.map(x => siteCardHTML(x)), 5) +
    (items.length ? '<p class="ctx-subhead lib-sec">NOTES ON THIS CHAPTER</p>' + items.map(x => `<div class="au-row"><p class="ctx-subhead">${escHtml(x.h)}</p><p class="panel-text">${escHtml(x.t)}</p></div>`).join('') : '') +
    (extras.length ? bkSection('MORE PHOTOS FROM THE DIGS (' + Math.min(extras.length, 4) + ')', extras.slice(0, 4).map(d => `<figure class="arch-fig arch-card"><div class="arch-photo"><img src="${escHtml(mapImgUrl(d, 700))}" alt="${escHtml(d.n || '')}" loading="lazy" decoding="async" onerror="this.parentNode.remove()"><span>${escHtml(d.n || '')}</span></div><figcaption>${escHtml(d.c || '')} ${digCredit(d)}</figcaption></figure>`).join('')) : '');
}
function renderPeopleTab(ov) {
  const mine = PEOPLE.filter(inThisChapter);
  const pp = Array.isArray(ov.peoplePlaces) ? ov.peoplePlaces : [];
  if (!mine.length && !pp.length) return '<p class="panel-eyebrow">PEOPLE &amp; PLACES</p><div class="tpl-card"><p class="panel-text dim" style="margin:0;">People and places in this chapter. Coming soon.</p></div>';
  const names = new Set(pp.map(x => x.n));
  const flagged = e => (names.has(e.n) || (e.al || []).some(a => names.has(a))) ? 0 : 1;
  const ord = list => list.slice().sort((a, b) => flagged(a) - flagged(b));
  const by = k => ord(mine.filter(e => e.k === k)).map(e => entCardHTML(e));
  const known = new Set(); mine.forEach(e => { known.add(e.n); (e.al || []).forEach(a => known.add(a)); });
  const left = pp.filter(x => !known.has(x.n));
  const nPeople = mine.filter(e => e.k === 'person').length, nGroups = mine.filter(e => e.k === 'group').length, nPlaces = mine.filter(e => e.k === 'place').length;
  const bits = [nPeople && (nPeople + (nPeople === 1 ? ' person' : ' people')), nGroups && (nGroups + (nGroups === 1 ? ' group' : ' groups')), nPlaces && (nPlaces + (nPlaces === 1 ? ' place' : ' places'))].filter(Boolean);
  return '<p class="panel-eyebrow">PEOPLE &amp; PLACES</p>' +
    (bits.length ? `<p class="lib-intro">In this chapter: ${bits.join(', ')}. Tap a chapter chip to see where else they appear.</p>` : '') +
    libSection('PEOPLE', by('person'), 4) + libSection('GROUPS', by('group'), 4) + libSection('PLACES', by('place'), 4) +
    (left.length ? '<p class="ctx-subhead lib-sec">ALSO IN THIS CHAPTER</p><ul class="lib-left">' + left.map(x => `<li><b>${escHtml(x.n)}</b>${x.d ? ' \u00b7 ' + escHtml(x.d) : ''}</li>`).join('') + '</ul>' : '');
}
// popup card for cross-links (archaeology <-> people & places)
function libModalEl() {
  let m = document.getElementById('libModal');
  if (!m) {
    m = document.createElement('div'); m.id = 'libModal'; m.className = 'lib-modal'; m.hidden = true;
    m.innerHTML = '<div class="lib-sheet" role="dialog" aria-modal="true"><button type="button" class="lib-x" aria-label="Close">&times;</button><div class="lib-body"></div></div>';
    document.body.appendChild(m);
    m.addEventListener('click', ev => { if (ev.target === m || ev.target.closest('.lib-x')) closeLibModal(); });
  }
  return m;
}
function closeLibModal() { const m = document.getElementById('libModal'); if (m) m.hidden = true; }
function openLibModal(html) { const m = libModalEl(); m.querySelector('.lib-body').innerHTML = html; m.hidden = false; m.querySelector('.lib-sheet').scrollTop = 0; }
async function openChapterTab(b, c, tab) {
  closeLibModal();
  try { backdrop.classList.remove('open'); sheet.classList.remove('open'); } catch (e) {}
  await openPassage(b, c, 1, true);
  const i = tabOrder.indexOf(tab); if (i >= 0) setTab(i);
}
let mapFocusMk = null;
function focusMapAt(la, ln, name, z) {
  goToScreen('map');
  let tries = 0;
  const go = () => {
    if (mapMain && mapMainReady) {
      if (mapFocusMk) { mapFocusMk.remove(); mapFocusMk = null; }
      const el = document.createElement('div'); el.className = 'map-focus'; el.innerHTML = '<span>' + escHtml(name) + '</span><i></i>';
      mapFocusMk = new maplibregl.Marker({ element: el, anchor: 'bottom' }).setLngLat([ln, la]).addTo(mapMain);
      mapMain.flyTo({ center: [ln, la], zoom: z || 12.5, duration: 900, padding: { top: 60, bottom: 110, left: 20, right: 20 } });
      mapMain.once('click', () => { if (mapFocusMk) { mapFocusMk.remove(); mapFocusMk = null; } });
      return;
    }
    if (++tries < 80) setTimeout(go, 150);
  };
  setTimeout(go, 450);
}
document.addEventListener('click', ev => {
  const t = ev.target.closest('[data-lib]'); if (!t) return;
  const a = t.dataset.lib;
  if (a === 'ref') { closeLibModal(); openPassage(t.dataset.b, Number(t.dataset.c), Number(t.dataset.v), false); }
  else if (a === 'map') { closeLibModal(); focusMapAt(Number(t.dataset.la), Number(t.dataset.ln), t.dataset.name, Number(t.dataset.z)); }
  else if (a === 'site') {
    const x = SITE_BY_ID[t.dataset.id]; if (!x) return;
    const md = document.getElementById('libModal'); const open = md && !md.hidden;
    const el = open ? null : document.getElementById('site-' + x.i);
    if (el) { const db = el.querySelector('.lib-det-btn'); if (db && db.nextElementSibling && db.nextElementSibling.hidden) db.click(); setTab(tabOrder.indexOf('archaeology')); setTimeout(() => el.scrollIntoView({ block: 'start', behavior: 'smooth' }), 80); }
    else openLibModal(siteCardHTML(x, true));
  }
  else if (a === 'ent') { const e = PEOPLE_BY_ID[t.dataset.id]; if (e) openLibModal(entCardHTML(e, true)); }
  else if (a === 'also') openChapterTab(t.dataset.b, Number(t.dataset.c), 'people');
  else if (a === 'chap') openChapterTab(t.dataset.b, Number(t.dataset.c), 'translation');
  else if (a === 'chapdeep') openChapterTab(t.dataset.b, Number(t.dataset.c), 'book');
  else if (a === 'notechap') openChapterTab(t.dataset.b, Number(t.dataset.c), 'notes');
  else if (a === 'chapread') { closeLibModal(); try { backdrop.classList.remove('open'); sheet.classList.remove('open'); } catch (e) {} openPassage(t.dataset.b, Number(t.dataset.c), 1, false); }
  else if (a === 'expand') { const row = t.parentNode; row.classList.add('open'); t.remove(); }
  else if (a === 'det') { const d = t.nextElementSibling; if (d) { d.hidden = !d.hidden; t.classList.toggle('on', !d.hidden); t.setAttribute('aria-expanded', String(!d.hidden)); } }
  else if (a === 'showmore') { const h = t.previousElementSibling; if (h) h.hidden = false; t.remove(); }
});

// ---------- Word usage counts (data/word-counts.json: Greek roots by Strong's number; data/word-index.json: English words in the BSB) ----------
let WC = null, wcP = null, WIDX = null, widxP = null, BOOKS = null, booksP = null;
function loadWC() { return wcP || (wcP = fetch('data/word-counts.json').then(r => (r.ok ? r.json() : null)).catch(() => null).then(j => { WC = j; return j; })); }
function loadWIDX() { return widxP || (widxP = fetch('data/word-index.json').then(r => (r.ok ? r.json() : null)).catch(() => null).then(j => { WIDX = j; return j; })); }
function loadBooks() { return booksP || (booksP = fetch('data/books.json').then(r => (r.ok ? r.json() : null)).catch(() => null).then(j => { BOOKS = j; return j; })); }
const GBOOKS = ['matthew', 'mark', 'luke', 'john'];
const fmtN = n => Number(n).toLocaleString('en-US');
function usageBars(counts) {
  const tot = counts.reduce((a, b) => a + b, 0), mx = Math.max.apply(null, counts) || 1;
  return `<div class="gu-bars">${counts.map((n, i) => `<div class="gu-row${GBOOKS[i] === currentBook ? ' cur' : ''}"><span class="gu-l">${LIB_BOOK_SHORT[GBOOKS[i]]}</span><span class="gu-bar"><i style="width:${Math.max(n ? 3 : 0, Math.round(n / mx * 100))}%"></i></span><span class="gu-n">${fmtN(n)}</span></div>`).join('')}</div>`;
}
function chapChips(list, act) {
  return (list || []).map(t => `<button type="button" class="lib-chip" data-lib="${act}" data-b="${GBOOKS[t[0]]}" data-c="${t[1]}">${LIB_BOOK_SHORT[GBOOKS[t[0]]]} ${t[1]}${t[2] > 1 ? ' · ' + t[2] + '×' : ''}</button>`).join('');
}
function gospelUsageHTML(s) {
  const e = WC && WC.w && WC.w[s]; if (!e) return '';
  const counts = e.slice(0, 4), tot = counts.reduce((a, b) => a + b, 0);
  return `<div class="gu"><p class="gu-h">IN THE FOUR GOSPELS<span>${fmtN(tot)} time${tot === 1 ? '' : 's'}</span></p>${usageBars(counts)}${e[4] && e[4].length ? `<div class="lib-chips"><span class="lib-chiplbl">Most in:</span>${chapChips(e[4], 'chap')}</div>` : ''}</div>`;
}
function normGreek(s) {
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^Ͱ-Ͽ]/g, '').toLowerCase().replace(/ς/g, 'σ');
}
// Fill the Gospel usage block into each Translation keyword card once the Greek data for the chapter is loaded.
async function fillKeywordUsage(ctx, listEl) {
  const key = currentBook + '/' + currentChapterNum;
  const [data] = await Promise.all([loadWords(currentBook, currentChapterNum), loadWC()]);
  if (!data || !WC || key !== currentBook + '/' + currentChapterNum) return;
  ctx.translation.forEach((entry, idx) => {
    const card = listEl.querySelector('#kwc' + idx); if (!card) return;
    const g = normGreek(String(entry.greek || '').split('(')[0]); if (!g) return;
    const m = String(entry.verseRef || '').match(/(\d+)(?:\s*[-–]\s*(\d+))?/);
    const lo = m ? Number(m[1]) : 0, hi = m ? Number(m[2] || m[1]) : 0;
    let s = null;
    const scan = inRange => { for (const v of Object.keys(data)) { const n = Number(v); if (!inRange(n)) continue; const w = data[v].find(x => normGreek(x[0]) === g && x[3]); if (w) return w[3]; } return null; };
    s = (lo && scan(n => n >= lo && n <= hi)) || scan(() => true);
    const html = s ? gospelUsageHTML(s) : '';
    if (!html) return;
    const extra = card.querySelector('.exp-extra'); if (!extra || extra.querySelector('.gu')) return;
    const tot = WC.w[s].slice(0, 4).reduce((x, y) => x + y, 0), mEl = card.querySelector('.word-meaning');
    if (mEl && !card.querySelector('.kw-tot')) mEl.insertAdjacentHTML('beforebegin', `<span class="kw-tot">${fmtN(tot)}\u00d7 in the four Gospels</span>`);
    extra.insertAdjacentHTML('beforeend', html);
    if (!card.querySelector('.exp-more')) card.insertAdjacentHTML('beforeend', '<span class="exp-more"><span class="exp-lbl">Read more</span><svg width="10" height="6" viewBox="0 0 10 6"><path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.6"/></svg></span>');
    if (!card.dataset.wx) wireExpand(card.parentNode);
  });
}

// ---------- Word counter (English, BSB) ----------
function wordForms(w) {
  const set = new Set([w, w + 's', w + 'es', w + 'ed', w + 'd', w + 'ing', w + 'er', w + 'ers', w + 'ly']);
  if (/e$/.test(w)) set.add(w.slice(0, -1) + 'ing');
  if (/y$/.test(w)) { set.add(w.slice(0, -1) + 'ies'); set.add(w.slice(0, -1) + 'ied'); }
  if (/[^aeiou][aeiou][bdglmnprt]$/.test(w)) { set.add(w + w.slice(-1) + 'ed'); set.add(w + w.slice(-1) + 'ing'); }
  return Array.from(set);
}
function renderWordCounter(box) {
  box.innerHTML = `<p class="lib-intro">Type any English word to see how often it appears in each Gospel (Berean Standard Bible).</p>
    <div class="wc-form"><input type="search" id="wcInput" class="wc-in" placeholder="e.g. love, believe, kingdom" autocomplete="off" autocapitalize="none" spellcheck="false" aria-label="Word to count"><label class="wc-opt"><input type="checkbox" id="wcForms"> Include simple forms (-s, -ed, -ing)</label></div>
    <div class="lib-chips wc-sugg">${['love', 'believe', 'faith', 'kingdom', 'peace', 'sin', 'fear', 'joy', 'bread', 'water'].map(w => `<button type="button" class="lib-chip" data-wc="${w}">${w}</button>`).join('')}</div>
    <div id="wcOut" class="wc-out"></div>`;
  const inp = box.querySelector('#wcInput'), forms = box.querySelector('#wcForms'), out = box.querySelector('#wcOut');
  const run = async () => {
    const w = inp.value.trim().toLowerCase().replace(/[^a-z’']/g, '');
    if (!w) { out.innerHTML = ''; return; }
    out.innerHTML = '<p class="lib-intro">Counting…</p>';
    const idx = await loadWIDX();
    if (!idx) { out.innerHTML = '<p class="lib-intro">The word list could not be loaded.</p>'; return; }
    if (w !== inp.value.trim().toLowerCase().replace(/[^a-z’']/g, '')) return;
    const keys = forms.checked ? wordForms(w).filter(k => idx.w[k]) : (idx.w[w] ? [w] : []);
    if (!keys.length) { out.innerHTML = `<p class="lib-intro">“${escHtml(w)}” does not appear in the four Gospels (or only once). Words that appear just once are not listed.</p>`; return; }
    const counts = [0, 0, 0, 0], merged = {};
    keys.forEach(k => { const e = idx.w[k]; for (let i = 0; i < 4; i++) counts[i] += e[i]; (e[4] || []).forEach(t => { const kk = t[0] + ':' + t[1]; merged[kk] = (merged[kk] || 0) + t[2]; }); });
    const tops = Object.keys(merged).map(k => { const [b, c] = k.split(':').map(Number); return [b, c, merged[k]]; }).sort((a, b) => b[2] - a[2]).slice(0, 8);
    const tot = counts.reduce((a, b) => a + b, 0);
    const per = counts.map((n, i) => n ? (n / idx.n[i] * 10000).toFixed(1) : '0');
    out.innerHTML = `<div class="gu"><p class="gu-h">“${escHtml(keys.length > 1 ? w + '” and forms' : w + '”')}<span>${fmtN(tot)} time${tot === 1 ? '' : 's'}</span></p>${usageBars(counts)}
      <p class="wc-rate">Per 10,000 words: ${GBOOKS.map((b, i) => `${LIB_BOOK_SHORT[b]} ${per[i]}`).join(' · ')}</p>
      ${keys.length > 1 ? `<p class="wc-rate">Forms counted: ${keys.map(k => `${escHtml(k)} ${fmtN(idx.w[k][0] + idx.w[k][1] + idx.w[k][2] + idx.w[k][3])}`).join(' · ')}</p>` : ''}
      <div class="lib-chips"><span class="lib-chiplbl">Most in:</span>${chapChips(tops, 'chapread')}</div></div>`;
  };
  let tm = null;
  inp.addEventListener('input', () => { clearTimeout(tm); tm = setTimeout(run, 250); });
  forms.addEventListener('change', run);
  box.querySelectorAll('[data-wc]').forEach(b => b.addEventListener('click', () => { inp.value = b.dataset.wc; run(); }));
}

// ---------- Notes (kept in this browser's localStorage; nothing is sent anywhere) ----------
const NOTES_KEY = 'vi_notes_v1';
let notesMem = null, notesVerse = 0, notesStorageOk = true, notesChapTimer = null;
function notesLoad() {
  if (notesMem) return notesMem;
  try { notesMem = JSON.parse(localStorage.getItem(NOTES_KEY) || '{}') || {}; } catch (e) { notesMem = {}; }
  if (typeof notesMem !== 'object' || Array.isArray(notesMem)) notesMem = {};
  return notesMem;
}
function notesSave() { try { localStorage.setItem(NOTES_KEY, JSON.stringify(notesMem)); notesStorageOk = true; } catch (e) { notesStorageOk = false; } updateNotesTile(); }
function noteRec(key, create) {
  const all = notesLoad();
  if (!all[key] && create) all[key] = { c: '', v: [] };
  return all[key] || null;
}
function noteCount(rec) { return rec ? { chap: rec.c && rec.c.trim() ? 1 : 0, verses: (rec.v || []).length } : { chap: 0, verses: 0 }; }
function notesTileText() {
  const n = noteCount(noteRec(curChKey(), false));
  if (!n.chap && !n.verses) return 'Write your own ideas and questions for this chapter.';
  const bits = []; if (n.chap) bits.push('A chapter note'); if (n.verses) bits.push(n.verses + (n.verses === 1 ? ' verse note' : ' verse notes'));
  return 'You have ' + bits.join(' and ').toLowerCase() + ' here.';
}
function updateNotesTile() {
  const el = document.querySelector('[data-panel="overview"] .ov-blk[data-go="notes"] .ov-sn');
  if (el) el.textContent = notesTileText();
}
const NOTE_BOOK_ORDER = { matthew: 0, mark: 1, luke: 2, john: 3 };
function noteKeyLabel(k) { const [b, c] = k.split(':'); return (LIB_BOOK[b] || b) + ' ' + c; }
function noteDate(ts) { try { return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); } catch (e) { return ''; } }
function noteCardHTML(n) {
  return `<div class="note-card" data-id="${escHtml(n.id)}"><div class="note-top"><button type="button" class="lib-chip here" data-lib="ref" data-b="${currentBook}" data-c="${currentChapterNum}" data-v="${n.n}">${escHtml(LIB_BOOK[currentBook])} ${currentChapterNum}:${n.n}</button><span class="note-date">${escHtml(noteDate(n.ts))}</span></div><p class="note-text">${escHtml(n.t)}</p><div class="note-acts"><button type="button" class="note-lnk" data-act="edit">Edit</button><button type="button" class="note-lnk del" data-act="del">Delete</button></div></div>`;
}
function renderNotesTab() {
  const panel = document.querySelector('[data-panel="notes"]'); if (!panel || !currentChapterData) return;
  const key = curChKey(), rec = noteRec(key, false) || { c: '', v: [] };
  const verses = currentChapterData.verses || [];
  if (!verses.some(v => v.num === notesVerse)) notesVerse = verses.length ? verses[0].num : 1;
  const mine = (rec.v || []).slice().sort((a, b) => a.n - b.n || a.ts - b.ts);
  const others = Object.keys(notesLoad()).filter(k => k !== key).filter(k => { const n = noteCount(notesMem[k]); return n.chap || n.verses; })
    .sort((a, b) => { const [ab, ac] = a.split(':'), [bb, bc] = b.split(':'); return (NOTE_BOOK_ORDER[ab] - NOTE_BOOK_ORDER[bb]) || (Number(ac) - Number(bc)); });
  panel.innerHTML = `<p class="panel-eyebrow">NOTES</p>
    <p class="lib-intro">Your own notes for ${escHtml(noteKeyLabel(key))}. They save automatically on this device.</p>
    <p class="ctx-subhead">CHAPTER NOTE</p>
    <textarea id="noteChap" class="note-ta" rows="5" placeholder="Thoughts, questions, things to look up…" aria-label="Chapter note">${escHtml(rec.c || '')}</textarea>
    <p class="note-status" id="noteChapSt">${rec.c ? 'Saved' : ''}</p>
    <p class="ctx-subhead lib-sec">VERSE NOTES</p>
    <div class="note-add">
      <label class="note-lbl">Verse <select id="noteVerse" class="note-sel">${verses.map(v => `<option value="${v.num}"${v.num === notesVerse ? ' selected' : ''}>${v.num}</option>`).join('')}</select></label>
      <p class="note-vtext" id="noteVtext"></p>
      <textarea id="noteNew" class="note-ta" rows="3" placeholder="Add a note on this verse…" aria-label="New verse note"></textarea>
      <button type="button" class="lib-btn" data-act="add">Save note</button>
    </div>
    <div id="noteList">${mine.length ? mine.map(noteCardHTML).join('') : '<p class="lib-intro">No verse notes in this chapter yet.</p>'}</div>
    ${others.length ? `<p class="ctx-subhead lib-sec">YOUR NOTES IN OTHER CHAPTERS</p>` + others.map(k => { const r = notesMem[k], n = noteCount(r); const snip = (r.c && r.c.trim()) || ((r.v && r.v[0] && r.v[0].t) || ''); const [b, c] = k.split(':'); return `<button type="button" class="note-other" data-lib="notechap" data-b="${b}" data-c="${c}"><b>${escHtml(noteKeyLabel(k))}</b><span>${n.chap ? 'chapter note' : ''}${n.chap && n.verses ? ' · ' : ''}${n.verses ? n.verses + (n.verses === 1 ? ' verse note' : ' verse notes') : ''}</span><em>${escHtml(snip.slice(0, 90))}${snip.length > 90 ? '…' : ''}</em></button>`; }).join('') : ''}
    <p class="ctx-subhead lib-sec">BACK UP YOUR NOTES</p>
    <p class="lib-intro">Notes live in this browser on this device only. They do not sync to other devices, and clearing your browser data erases them. Back them up here.${notesStorageOk ? '' : ' <b>Your browser is blocking storage right now, so notes will not be kept after you leave.</b>'}</p>
    <div class="note-tools"><button type="button" class="lib-btn alt" data-act="copy">Copy all as text</button><button type="button" class="lib-btn alt" data-act="download">Download backup</button><label class="lib-btn alt note-file">Restore backup<input type="file" accept=".json,application/json" id="noteRestore"></label></div>
    <p class="note-status" id="noteToolSt"></p>`;
  const sel = panel.querySelector('#noteVerse'), vt = panel.querySelector('#noteVtext');
  const showV = () => { const v = verses.find(x => x.num === Number(sel.value)); vt.textContent = v ? v.text : ''; };
  sel.addEventListener('change', () => { notesVerse = Number(sel.value); showV(); }); showV();
  const ta = panel.querySelector('#noteChap'), st = panel.querySelector('#noteChapSt');
  const saveChap = () => { clearTimeout(notesChapTimer); const r = noteRec(key, true); r.c = ta.value; r.ts = Date.now(); if (!r.c.trim() && !(r.v || []).length) delete notesMem[key]; notesSave(); st.textContent = ta.value ? (notesStorageOk ? 'Saved' : 'Could not save: storage is blocked') : ''; };
  ta.addEventListener('input', () => { st.textContent = 'Saving…'; clearTimeout(notesChapTimer); notesChapTimer = setTimeout(saveChap, 400); });
  ta.addEventListener('blur', () => { if (notesChapTimer) saveChap(); });
  panel.querySelector('#noteRestore').addEventListener('change', ev => {
    const f = ev.target.files && ev.target.files[0]; if (!f) return;
    const rd = new FileReader();
    rd.onload = () => { const n = notesRestore(String(rd.result || '')); panel.querySelector('#noteToolSt').textContent = n < 0 ? 'That file is not a notes backup.' : 'Restored ' + n + ' note' + (n === 1 ? '' : 's') + '.'; if (n >= 0) { renderNotesTab(); panel.querySelector('#noteToolSt').textContent = 'Restored ' + n + ' note' + (n === 1 ? '' : 's') + '.'; } };
    rd.readAsText(f);
  });
}
function notesRestore(text) {
  let j; try { j = JSON.parse(text); } catch (e) { return -1; }
  if (!j || typeof j !== 'object' || Array.isArray(j)) return -1;
  const src = j.notes && typeof j.notes === 'object' ? j.notes : j;
  const all = notesLoad(); let n = 0;
  Object.keys(src).forEach(k => {
    if (!/^(matthew|mark|luke|john):\d+$/.test(k)) return;
    const r = src[k]; if (!r || typeof r !== 'object') return;
    const cur = noteRec(k, true);
    if (typeof r.c === 'string' && r.c.trim() && r.c !== cur.c) { cur.c = cur.c && cur.c.trim() ? cur.c + '\n\n---\n' + r.c : r.c; n++; }
    (Array.isArray(r.v) ? r.v : []).forEach(x => {
      if (!x || typeof x.t !== 'string' || !x.t.trim() || !Number.isFinite(Number(x.n))) return;
      if ((cur.v || []).some(y => y.id === x.id || (y.n === Number(x.n) && y.t === x.t))) return;
      cur.v.push({ id: String(x.id || ('n' + Date.now() + Math.random().toString(36).slice(2, 6))), n: Number(x.n), t: x.t, ts: Number(x.ts) || Date.now() }); n++;
    });
    if (!cur.c.trim() && !cur.v.length) delete all[k];
  });
  notesSave(); return n;
}
function notesAsText() {
  const all = notesLoad(); const keys = Object.keys(all).sort((a, b) => { const [ab, ac] = a.split(':'), [bb, bc] = b.split(':'); return (NOTE_BOOK_ORDER[ab] - NOTE_BOOK_ORDER[bb]) || (Number(ac) - Number(bc)); });
  const out = ['My notes'];
  keys.forEach(k => {
    const r = all[k], [b, c] = k.split(':');
    if (r.c && r.c.trim()) out.push('', noteKeyLabel(k) + ' (chapter note)', r.c.trim());
    (r.v || []).slice().sort((x, y) => x.n - y.n).forEach(v => out.push('', LIB_BOOK[b] + ' ' + c + ':' + v.n, v.t.trim()));
  });
  return out.join('\n');
}
function notesToast(msg) { const el = document.getElementById('noteToolSt'); if (el) el.textContent = msg; }
document.addEventListener('click', ev => {
  const t = ev.target.closest('[data-act]'); if (!t) return;
  const panel = t.closest('[data-panel="notes"]'); if (!panel) return;
  const act = t.dataset.act, key = curChKey();
  if (act === 'add') {
    const ta = panel.querySelector('#noteNew'), txt = ta.value.trim(); if (!txt) { ta.focus(); return; }
    const r = noteRec(key, true); r.v.push({ id: 'n' + Date.now() + Math.random().toString(36).slice(2, 6), n: Number(panel.querySelector('#noteVerse').value), t: txt, ts: Date.now() });
    notesSave(); renderNotesTab();
  } else if (act === 'del') {
    if (!t.dataset.sure) { t.dataset.sure = '1'; t.textContent = 'Tap again to delete'; setTimeout(() => { if (t.isConnected) { delete t.dataset.sure; t.textContent = 'Delete'; } }, 3000); return; }
    const id = t.closest('.note-card').dataset.id, r = noteRec(key, false); if (!r) return;
    r.v = r.v.filter(x => x.id !== id); if (!r.c.trim() && !r.v.length) delete notesMem[key];
    notesSave(); renderNotesTab();
  } else if (act === 'edit') {
    const card = t.closest('.note-card'), r = noteRec(key, false), n = r && r.v.find(x => x.id === card.dataset.id); if (!n) return;
    card.innerHTML = `<textarea class="note-ta" rows="4" aria-label="Edit note">${escHtml(n.t)}</textarea><div class="note-acts"><button type="button" class="note-lnk" data-act="saveedit">Save</button><button type="button" class="note-lnk" data-act="canceledit">Cancel</button></div>`;
    card.querySelector('textarea').focus();
  } else if (act === 'saveedit') {
    const card = t.closest('.note-card'), r = noteRec(key, false), n = r && r.v.find(x => x.id === card.dataset.id); if (!n) return;
    const v = card.querySelector('textarea').value.trim(); if (!v) return;
    n.t = v; n.ts = Date.now(); notesSave(); renderNotesTab();
  } else if (act === 'canceledit') { renderNotesTab(); }
  else if (act === 'copy') {
    const txt = notesAsText();
    const done = () => notesToast('Copied. Paste it anywhere.');
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(done, () => { notesFallbackCopy(txt); done(); });
    else { notesFallbackCopy(txt); done(); }
  } else if (act === 'download') {
    try {
      const blob = new Blob([JSON.stringify({ app: 'verse-inspector', version: 1, saved: new Date().toISOString(), notes: notesLoad() }, null, 1)], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'verse-inspector-notes.json'; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
      notesToast('Backup downloaded.');
    } catch (e) { notesToast('Could not create the backup file.'); }
  }
});
function notesFallbackCopy(txt) { const ta = document.createElement('textarea'); ta.value = txt; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch (e) {} ta.remove(); }
window.addEventListener('pagehide', () => { if (notesChapTimer) { const ta = document.getElementById('noteChap'); if (ta) { const r = noteRec(curChKey(), true); r.c = ta.value; if (!r.c.trim() && !(r.v || []).length) delete notesMem[curChKey()]; notesSave(); } } });

// ---------- Book Overview tab (data/books.json) ----------
function bkSection(title, inner, open) { return inner ? `<details class="acc"${open ? ' open' : ''}><summary>${title}</summary><div class="acc-body">${inner}</div></details>` : ''; }
function renderBookTab() {
  const panel = document.querySelector('[data-panel="book"]'); if (!panel) return;
  const B = BOOKS && BOOKS.books && BOOKS.books[currentBook];
  if (!B) { panel.innerHTML = '<p class="panel-eyebrow">BOOK OVERVIEW</p><div class="tpl-card"><p class="panel-text dim" style="margin:0;">The big picture of this book. Coming soon.</p></div>'; return; }
  const st = BOOKS.stats[currentBook], ch = currentChapterNum;
  const top = WC && WC.top && WC.top[currentBook], sig = WC && WC.sig && WC.sig[currentBook];
  const wordRow = x => `<li><b>${escHtml(x.l)}</b> <span>${escHtml(x.g)}</span><em>${fmtN(x.n)}×</em></li>`;
  const outline = B.outline.map(o => { const here = ch >= o[0] && ch <= o[1]; return `<button type="button" class="bk-sec${here ? ' here' : ''}" data-lib="chapdeep" data-b="${currentBook}" data-c="${o[0]}"><span class="bk-ch">${o[0] === o[1] ? 'Ch ' + o[0] : 'Ch ' + o[0] + '–' + o[1]}</span><span class="bk-st"><b>${escHtml(o[2])}</b>${here ? '<i>You are here</i>' : ''}<span>${escHtml(o[3])}</span></span></button>`; }).join('');
  const keys = B.keys.map(k => `<button type="button" class="lib-chip" data-lib="ref" data-b="${k[0].toLowerCase()}" data-c="${k[1]}" data-v="${k[2]}">${escHtml(k[0])} ${k[1]}:${k[2]}</button>`).join('');
  const cmpHead = '<tr><th></th>' + GBOOKS.map(b => `<th class="${b === currentBook ? 'cur' : ''}">${LIB_BOOK_SHORT[b]}</th>`).join('') + '</tr>';
  const cmp = BOOKS.compare.map(r => { const mx = Math.max.apply(null, r.slice(1)); return `<tr><td>${escHtml(r[0])}</td>${r.slice(1).map((n, i) => `<td class="${GBOOKS[i] === currentBook ? 'cur' : ''}${n === mx && mx > 0 ? ' mx' : ''}">${n}</td>`).join('')}</tr>`; }).join('');
  panel.innerHTML = `<p class="panel-eyebrow">BOOK OVERVIEW</p>
    <h3 class="bk-title">${escHtml(B.full)}</h3><p class="bk-tag">${escHtml(B.tag)}</p>
    <div class="bk-nums"><div><b>${st.ch}</b><span>chapters</span></div><div><b>${fmtN(st.v)}</b><span>verses</span></div><div><b>${fmtN(st.w)}</b><span>English words</span></div><div><b>${fmtN(st.g)}</b><span>Greek words</span></div></div>
    ${bkSection('AT A GLANCE', `<dl class="bk-facts">${B.facts.map(f => `<dt>${escHtml(f[0])}</dt><dd>${escHtml(f[1])}</dd>`).join('')}</dl>`)}
    ${bkSection('WHY IT WAS WRITTEN', `<p class="lib-p">${escHtml(B.purpose)}</p><p class="lib-p"><b>Jesus is shown as:</b> ${escHtml(B.jesus)}</p>${B.caution ? `<p class="lib-caution"><b>Keep in mind:</b> ${escHtml(B.caution)}</p>` : ''}`, true)}
    ${bkSection('OUTLINE', `<div class="bk-outline">${outline}</div>`)}
    ${bkSection('THEMES', B.themes.map(t => `<div class="bk-theme"><b>${escHtml(t[0])}</b><p class="lib-p">${escHtml(t[1])}</p></div>`).join(''))}
    ${bkSection('ONLY OR MOSTLY IN ' + B.name.toUpperCase(), `<ul class="bk-list">${B.unique.map(u => `<li>${escHtml(u)}</li>`).join('')}</ul>`)}
    ${bkSection('KEY PASSAGES', `<div class="lib-chips">${keys}</div>`)}
    ${top ? bkSection('MOST-USED WORDS IN THE GREEK', `<div class="bk-cols"><div><p class="bk-sub">Nouns</p><ul class="bk-words">${top.nouns.map(wordRow).join('')}</ul></div><div><p class="bk-sub">Verbs</p><ul class="bk-words">${top.verbs.map(wordRow).join('')}</ul></div></div><p class="lib-intro">Counted by root word from the earliest Greek text (STEP Bible). Verses found only in later manuscripts, such as Mark 16:9–20, are left out.</p>`) : ''}
    ${sig ? bkSection('WORDS ' + B.name.toUpperCase() + ' FAVORS', `<ul class="bk-words fav">${sig.map(x => `<li><b>${escHtml(x.l)}</b> <span>${escHtml(x.g)}</span><em>${fmtN(x.n)}× here · ${fmtN(x.o)}× in the other three</em></li>`).join('')}</ul>`) : ''}
    ${bkSection('COMPARE THE GOSPELS', `<div class="bk-tblwrap"><table class="bk-tbl">${cmpHead}${cmp}</table></div><p class="lib-intro">Counts of English words and phrases in the Berean Standard Bible. The highest count in each row is shaded.</p>`)}
    <details class="acc"><summary>WORD COUNTER</summary><div class="acc-body" id="wcBox"></div></details>`;
  renderWordCounter(panel.querySelector('#wcBox'));
}

function fillTemplateTabs(ctx) {
  const ov = ctx.overview || {};
  const arch = document.querySelector('[data-panel="archaeology"]');
  if (arch) arch.innerHTML = renderArchTab(ov);
  const ppl = document.querySelector('[data-panel="people"]');
  if (ppl) ppl.innerHTML = renderPeopleTab(ov);
  renderNotesTab();
  renderBookTab();
  const dis = document.querySelector('[data-panel="discussion"]');
  if (dis) {
    dis.innerHTML = '<p class="panel-eyebrow">THEOLOGY &amp; DISCUSSION</p>' +
      (ov.discussion ? `<div class="au-row"><p class="ctx-subhead">TO THINK ABOUT</p><p class="panel-text">${escHtml(ov.discussion)}</p></div><p class="panel-text dim">More theology notes and questions coming soon.</p>`
        : '<div class="tpl-card"><p class="panel-text dim" style="margin:0;">Theology notes and open discussion questions for this chapter. Coming soon.</p></div>');
  }
}

// ---------- Overview tab (only for chapters that carry context.overview) ----------
function escHtml(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function renderOverview(ctx) {
  const tabBtn = document.querySelector('.folder-tab[data-tab="overview"]');
  const panel = document.querySelector('[data-panel="overview"]');
  const ov = ctx.overview;
  const prevName = tabOrder[activeTabIndex];
  if (!ov) {
    tabOrder = BASE_TABS.slice();
    tabBtn.hidden = true;
    panel.innerHTML = '';
    if (prevName === 'overview') setTab(0);
    else activeTabIndex = Math.max(0, tabOrder.indexOf(prevName));
    return;
  }
  const hadOverview = tabOrder[0] === 'overview';
  tabOrder = ['overview'].concat(BASE_TABS);
  tabBtn.hidden = false;
  if (!hadOverview) setTab(0);
  else activeTabIndex = Math.max(0, tabOrder.indexOf(prevName));

  const arch = archPrimary(ov);
  const img = ctx.historicalImage;
  const place = ov.placeName || (ctx.mapCoords && ctx.mapCoords.placeName ? ctx.mapCoords.placeName : toTitleCase((ctx.mapLabel || '').split('—')[0].trim()));
  const words = '<span class="ov-words">' + (ctx.translation || []).slice(0, 3).map(w => {
    const gloss = w.gloss || String(w.meaning).split('.')[0];
    const cap = gloss.charAt(0).toUpperCase() + gloss.slice(1);
    return `<span class="ov-w"><span class="ov-w1"><span class="ov-greek"><b>${escHtml(w.ovGreek || String(w.greek).split(' (')[0])}</b></span> – <b>${escHtml((w.ovEnglish || w.english).charAt(0).toUpperCase() + (w.ovEnglish || w.english).slice(1))}</b></span><span class="ov-def">${escHtml(cap)}</span></span>`;
  }).join('') + '</span>';
  const clip = (s, n) => { s = String(s).replace(/<[^>]*>/g, ''); return s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…' : s; };
  const firstSentence = s => { s = String(s).replace(/<[^>]*>/g, '').trim(); const m = s.match(/^(.+?)([.:])(\s|$)/); return m ? m[1] + '.' : s; };
  const seg = (v, col) => Array.isArray(v)
    ? '<span class="ov-segs">' + v.map(x => `<span class="ov-seg"><b style="color:${col}">${escHtml(x.h)}</b><span>${escHtml(x.t)}</span></span>`).join('') + '</span>'
    : `<span class="ov-sn ov-sn6">${escHtml(v || '')}</span>`;
  const refLine = r => `<span class="ov-ref"><b>${escHtml(r.ref)}</b><span>${escHtml((ov.refNotes && ov.refNotes[r.ref]) || clip(r.note, 22))}</span></span>`;
  const gps = (ctx.gospelParallels || []).slice(0, 1);
  const ots = (ctx.otBackground || []).slice(0, gps.length ? 2 : 3);
  const refs = (gps.length ? '<span class="ov-subh" style="color:var(--burgundy)">GOSPEL PARALLELS</span>' + gps.map(refLine).join('') : '') +
    '<span class="ov-subh"' + (gps.length ? ' style="margin-top:4px;color:var(--burgundy)"' : ' style="color:var(--burgundy)"') + '>OLD TESTAMENT</span>' + ots.map(refLine).join('');
  const voices = (ctx.commentary || []).slice(0, 2).map((c, i) =>
    `<div class="ov-q"><b>${escHtml(c.source)}</b><span class="ov-qt ov-qt${i}">${escHtml(i === 0 ? firstSentence(c.note) : String(c.note).replace(/<[^>]*>/g, ''))}</span></div>`).join('');
  const tl = (ov.timeline || []).map(t => `<div><b>${escHtml(t.when)}</b>${escHtml(t.label)}</div>`).join('');

  const tl3Html = () => {
    const slug = currentBook, n = currentChapterNum;
    const nm = getShortName(slug);
    const bk = manifest.books.find(b => b.slug === slug);
    const total = bk ? bk.totalChapters : 0;
    const ttl = k => (chapterIndex && chapterIndex[slug] && chapterIndex[slug][String(k)]) || '';
    const bc = (typeof MAP_BOOK_COLORS !== 'undefined' && MAP_BOOK_COLORS[slug]) || '#8a6d0b';
    const prev = n > 1 ? `<span class="tl-seg tl-side" style="--c:${bc}"><em>BEFORE · ${escHtml(nm)} ${n - 1}</em><span>${escHtml(ttl(n - 1))}</span></span>` : `<span class="tl-seg tl-side tl-edge"><em>BEFORE</em><span>The start of ${escHtml(bk ? bk.name : '')}’s Gospel</span></span>`;
    const next = n < total ? `<span class="tl-seg tl-side" style="--c:${bc}"><em>AFTER · ${escHtml(nm)} ${n + 1}</em><span>${escHtml(ttl(n + 1))}</span></span>` : `<span class="tl-seg tl-side tl-edge"><em>AFTER</em><span>The end of ${escHtml(bk ? bk.name : '')}’s Gospel</span></span>`;
    return prev + `<span class="tl-seg tl-mid" style="--c:${bc}"><em>NOW · ${escHtml(nm)} ${n}</em><span>${escHtml(currentChapterData.title)}</span></span>` + next;
  };
  const block = (cls, label, color, go, inner, section) =>
    `<button class="ov-blk ${cls}" data-go="${go}" ${section ? `data-section="${section}"` : ''}>
       <span class="ov-h" style="color:${color}">${label}<i>›</i></span>${inner}
     </button>`;

  panel.innerHTML = `
    <div class="ov-grid">
      ${block('ov-full ov-sum', 'SUMMARY', 'var(--verdigris)', 'context', `<span class="ov-title">${escHtml(currentChapterData.title)}</span><span class="ov-sumtext">${escHtml(ov.summary || ctx.sparkNotes)}</span>`, 'setting')}
      ${ctx.currentImage && ctx.currentImage.url
        ? `<button class="ov-blk ov-setblk" data-go="gallery" data-section="setting"><span class="ov-setphoto"><img src="${displayImageUrl(ctx.currentImage.url)}" alt="" loading="lazy" decoding="async" onerror="this.remove()"><span class="ov-artlabel" style="color:#fff">SETTING<i>›</i></span><span class="ov-placename">${escHtml(place)}</span></span><span class="ov-setdesc">${escHtml(ov.settingLine || '')}</span></button>`
        : block('', 'SETTING', 'var(--verdigris)', 'gallery', `<span class="ov-sn ov-sn3">${escHtml(place)}. ${escHtml(ov.settingLine || '')}</span>`, 'setting')}
      ${block('', 'HISTORY', 'var(--blue)', 'context', seg(ov.history, 'var(--verdigris)'), 'setting')}
      ${block('', 'CUSTOMS', 'var(--burgundy)', 'context', seg(ov.customs, 'var(--blue)'), 'setting')}
      ${block('', 'TRANSLATIONS', 'var(--gold)', 'translation', words)}
      ${img ? `<button class="ov-blk ov-full ov-artblk" data-go="gallery"><img src="${displayImageUrl(img.url)}" alt="${escHtml(img.caption)}" loading="lazy" decoding="async"><span class="ov-artlabel">ART<i>›</i></span><span class="ov-artcap">${escHtml(img.caption)}</span></button>` : block('ov-full', 'ART', 'var(--gold)', 'gallery', '<span class="ov-sn">Artwork coming soon.</span>')}
      ${block('ov-refblk', 'REFERENCES', 'var(--gold)', 'xref', refs)}
      ${block('ov-cmblk', 'COMMENTARY', 'var(--burgundy)', 'commentary', voices)}
      ${arch
        ? `<button class="ov-blk ov-setblk${arch.img ? ' ov-setfit' : ''}" data-go="archaeology"><span class="ov-setphoto"><img src="${escHtml(displayImageUrl(arch.url))}" alt="" loading="lazy" decoding="async" onerror="this.remove()"><span class="ov-artlabel" style="color:#fff">ARCHAEOLOGY<i>›</i></span><span class="ov-placename">${escHtml(arch.name)}</span></span><span class="ov-setdesc">${escHtml(arch.desc)}</span></button>`
        : block('', 'ARCHAEOLOGY', 'var(--blue)', 'archaeology', ov.archaeology ? seg(ov.archaeology, 'var(--gold)') : '<span class="ov-sn ov-sn3">Sites, digs and artifacts tied to this chapter. Coming soon.</span>')}
      ${block('ov-top', 'ORIGINAL WRITING', 'var(--verdigris)', 'author', `<span class="ov-kv"><span><em>AUTHOR</em>${escHtml(ov.author || clip(ctx.author, 70))}</span><span><em>GENRE</em>${escHtml(ov.genre || String(ctx.genre).split(/[,—.]/)[0])}</span><span><em>AUDIENCE</em>${escHtml(ov.audience || clip(ctx.audience, 60))}</span>${GOSPEL_FACTS[currentBook] ? `<span><em>FOCUS</em>${escHtml(GOSPEL_FACTS[currentBook].focus)}</span>` : ''}</span>`, 'writing')}
      ${block('ov-full ov-tlblk', 'TIMELINE', 'var(--blue)', 'context', `<span class="ov-tl3" id="ovTl3">${tl3Html()}</span><span class="ov-tlcap">IN THIS CHAPTER</span><span class="ov-rail">${tl}</span>`, 'timeline')}
      <button class="ov-blk ov-soon" data-go="discussion"><span class="ov-h" style="color:var(--verdigris)">DISCUSSION<i>›</i></span><span class="ov-sn ov-sn5">${escHtml(ov.discussionShort || ov.discussion || 'Theology and discussion questions. Coming soon.')}</span></button>
      ${block('', 'PEOPLE &amp; PLACES', 'var(--burgundy)', 'people', `<ul class="ov-bul">${(ov.peoplePlaces || (ov.people || []).concat(ov.places || []).map(n => ({ n, d: '' }))).map(x => `<li><b>${escHtml(x.n)}</b>${x.d ? ' · ' + escHtml(x.d) : ''}</li>`).join('')}</ul>`)}
      <button class="ov-blk ov-soon" data-go="notes"><span class="ov-h" style="color:var(--gold)">NOTES<i>›</i></span><span class="ov-sn ov-sn5">${escHtml(notesTileText())}</span></button>
      ${block('', 'BOOK OVERVIEW', 'var(--blue)', 'book', `<span class="ov-sn ov-sn5">${escHtml(ov.book || '')}</span>`)}
      <button class="ov-blk ov-full ov-mapblk" data-go="gallery"><span class="ov-maplive" id="ovMapLive"></span><span class="ov-artlabel">MAP<i>›</i></span>${ctx.biblePlacesCredit ? `<span class="ov-credit">${escHtml(ctx.biblePlacesCredit)}</span>` : ''}</button>
    </div>`;

  if (!chapterIndex) chapterIndexP.then(() => { const el = panel.querySelector('#ovTl3'); if (el && chapterIndex) el.innerHTML = tl3Html(); });
  const ttl = panel.querySelector('.ov-title');
  const fitTitle = () => { let fs = 17; ttl.style.fontSize = fs + 'px'; while (ttl.scrollWidth > ttl.clientWidth && fs > 10) { fs -= 0.5; ttl.style.fontSize = fs + 'px'; } };
  fitTitle();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitTitle);
  const fitWords = () => panel.querySelectorAll('.ov-w1').forEach(el => { let fs = 11.5; el.style.fontSize = fs + 'px'; while (el.scrollWidth > el.clientWidth && fs > 8) { fs -= 0.5; el.style.fontSize = fs + 'px'; } });
  fitWords();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitWords);
  if (document.fonts) document.fonts.addEventListener('loadingdone', fitWords);
  [300, 900, 2000].forEach(t => setTimeout(() => { fitWords(); fitOvCommentary(); }, t));
  initOvMap(ctx);
  fitOvCommentary();
  setTimeout(updateOvMore, 60);
  panel.querySelectorAll('button.ov-blk').forEach(btn => {
    btn.addEventListener('click', (ev) => {
      if (Date.now() - lastOvScroll < 350 || ovTouchMoved) { ev.preventDefault(); return; }
      const target = btn.dataset.go;
      setTab(tabOrder.indexOf(target));
      const sec = btn.dataset.section;
      if (target === 'context' && sec) {
        const head = document.querySelector(`.accordion-head[data-section="${sec}"]`);
        if (head && !accordionOpen[sec]) head.click();
        if (head) head.scrollIntoView({ block: 'start' });
      }
    });
  });
}

// ---------- Tab strip arrows (for mouse and trackpad users) ----------
const tabStrip = document.getElementById('folderTabs');
const tabArrowL = document.getElementById('tabArrowL');
const tabArrowR = document.getElementById('tabArrowR');
function updateTabArrows() {
  if (!tabStrip) return;
  const max = tabStrip.scrollWidth - tabStrip.clientWidth;
  tabArrowL.hidden = tabStrip.scrollLeft <= 2;
  tabArrowR.hidden = max <= 2 || tabStrip.scrollLeft >= max - 2;
}
tabArrowL.addEventListener('click', () => tabStrip.scrollBy({ left: -140, behavior: 'smooth' }));
tabArrowR.addEventListener('click', () => tabStrip.scrollBy({ left: 140, behavior: 'smooth' }));
tabStrip.addEventListener('scroll', updateTabArrows, { passive: true });
window.addEventListener('resize', updateTabArrows);
setInterval(updateTabArrows, 600);

// ---------- Overview mini map (same live map as the Map & Gallery tab, non-interactive) ----------
let ovMap = null;
let ovMapSeq = 0;
function initOvMap(ctx) {
  if (ovMap) { try { ovMap.remove(); } catch (e) {} ovMap = null; }
  const el = document.getElementById('ovMapLive');
  if (!el || typeof maplibregl === 'undefined' || !ctx.mapCoords) return;
  const seq = ++ovMapSeq;
  Promise.all([loadNatureStyle(), loadEvents().catch(() => null)]).then(([style]) => {
    if (seq !== ovMapSeq || !document.body.contains(el)) return;
    try {
      ovMap = new maplibregl.Map({
        container: el,
        style,
        center: [ctx.mapCoords.lng, ctx.mapCoords.lat],
        zoom: (ctx.mapCoords.zoom || 10) + 2,
        interactive: false,
        attributionControl: false
      });
      if (ctx.biblePlaces) {
        addBibleMarkers(ovMap, ctx, false);
        const rad = ctx.biblePlacesRadius || 0.25;
        const near = ctx.biblePlaces.filter(p => Math.abs(p.lat - ctx.mapCoords.lat) < rad && Math.abs(p.lng - ctx.mapCoords.lng) < rad);
        if (near.length > 1) {
          const lngs = near.map(p => p.lng).concat(ctx.mapCoords.lng), lats = near.map(p => p.lat).concat(ctx.mapCoords.lat);
          ovMap.fitBounds([[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]], { padding: { left: 60, right: 60, top: 35, bottom: 25 }, maxZoom: 10.5, duration: 0 });
        }
      }
      ovMap.on('load', () => {
        if (ctx.biblePlaces) bibleOnlyStyle(ovMap);
        const pin = chapterPinEl(ctx);
        if (pin) { pin.style.pointerEvents = 'none'; new maplibregl.Marker({ element: pin, anchor: 'center' }).setLngLat([ctx.mapCoords.lng, ctx.mapCoords.lat]).addTo(ovMap); }
        else if (!ctx.biblePlaces) {
          const dot = document.createElement('div');
          dot.style.cssText = 'width:12px;height:12px;border-radius:50%;background:#C9A227;border:2.5px solid #3A2E1F;';
          new maplibregl.Marker({ element: dot }).setLngLat([ctx.mapCoords.lng, ctx.mapCoords.lat]).addTo(ovMap);
        }
      });
    } catch (e) { /* map unavailable; block stays a plain card */ }
  });
}

// ---------- Scroll hint for the Overview ----------
function updateOvMore() {
  const more = document.getElementById('ovMore');
  const fc = document.getElementById('folderContent');
  if (!more || !fc) return;
  const onOv = tabOrder[activeTabIndex] === 'overview';
  more.classList.toggle('show', onOv && fc.scrollHeight - fc.scrollTop - fc.clientHeight > 40);
}
document.getElementById('folderContent').addEventListener('scroll', updateOvMore, { passive: true });
window.addEventListener('resize', updateOvMore);

// ---------- Folder tabs ----------
function setTab(index) {
  activeTabIndex = (index + tabOrder.length) % tabOrder.length;
  const name = tabOrder[activeTabIndex];
  folderTabs.forEach(b => b.classList.toggle('active', b.dataset.tab === name));
  folderPanels.forEach(p => p.classList.toggle('active', p.dataset.panel === name));
  document.getElementById('folderWrap').classList.toggle('ov-active', name === 'overview');
  const actBtn = document.querySelector('.folder-tab.active:not(.pinned)');
  if (actBtn && actBtn.scrollIntoView) { try { actBtn.scrollIntoView({ inline: 'nearest', block: 'nearest' }); } catch (e) {} }
  updateOvMore();
  refreshRm(document.querySelector(`.tab-panel[data-panel="${name}"]`));
  if (name === 'overview') setTimeout(fitOvCommentary, 80);
  if (name === 'overview' && ovMap) setTimeout(() => { try { ovMap.resize(); } catch (e) {} }, 60);
  if (name === 'gallery') {
    if (chapterUsesLiveMap()) ensureLiveMap(); else ensureRegionMap();
  }
}

folderTabs.forEach(btn => {
  btn.addEventListener('click', () => setTab(tabOrder.indexOf(btn.dataset.tab)));
});

// Swiping sideways changes the tab, but only a clearly sideways swipe does: scrolling down with a little drift, a swipe
// inside a sideways-scrolling strip (photos, tables), or a swipe past the first or last tab never switches tabs.
let touchStartX = null, touchStartY = 0;
const swipeBlocked = el => { for (let n = el; n && n !== folderContent; n = n.parentElement) { if (n.nodeType === 1 && n.scrollWidth > n.clientWidth + 4 && /auto|scroll/.test(getComputedStyle(n).overflowX)) return true; } return false; };
folderContent.addEventListener('touchstart', e => {
  const blocked = e.touches.length !== 1 || e.target.closest('.tabbar') || swipeBlocked(e.target);
  touchStartX = blocked ? null : e.touches[0].clientX; touchStartY = blocked ? 0 : e.touches[0].clientY;
}, { passive: true });
folderContent.addEventListener('touchend', e => {
  if (touchStartX === null) return;
  const dx = e.changedTouches[0].clientX - touchStartX, dy = e.changedTouches[0].clientY - touchStartY;
  touchStartX = null;
  if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 2.2) return;
  const next = activeTabIndex + (dx < 0 ? 1 : -1);
  if (next < 0 || next >= tabOrder.length) return;
  setTab(next);
});

// ---------- Map screen: Bible events as pins ----------
// Data: data/events.json (hand-built Gospel events). Filters: testament, book, chapter. Basemap: OpenFreeMap via MapLibre.
const MAP_BOOK_COLORS = { matthew: '#8a6d0b', mark: '#8C4646', luke: '#4a6a5a', john: '#4d5f8f' };
const MAP_TST = { matthew: 'NT', mark: 'NT', luke: 'NT', john: 'NT' };
let EVENTS = null, EV_BY_ID = {};
let mapMain = null, mapMainReady = false, mapStyleFailed = false;
let mapF = { tst: 'all', book: 'all', chapter: 'all', from: 1, to: 9999 };
let mapMaxI = 110;       // number of the last event (set when events load)
let mapStory = '';       // '' or a story id (see MAP_STORIES): draws the path and numbers the stops
// a story is never carried over from an earlier visit: the map always opens with no filters
// Stories follow one life through the events, in order. More can be added (Life of Paul comes with Acts).
const MAP_STORIES = [
  { id: 'jesus', name: 'Life of Jesus', color: '#8C4646', ready: true, match: e => typeof e.i === 'number',
    // the full walk is 30 key moments (the rest still show on the map)
    key: [2, 5, 7, 9, 12, 14, 15, 17, 21, 23, 24, 25, 36, 42, 48, 49, 58, 59, 72, 81, 83, 85, 92, 95, 99, 102, 104, 105, 109, 110], // the full walk: 30 stops
    short: [2, 5, 14, 25, 36, 48, 83, 92, 102, 104, 110], // the short walk: 11 stops
    blurb: 'Every Gospel event from the angel’s visit to Mary to the Ascension, in order and joined by a path. Numbers show the order.' },
  { id: 'paul', name: 'Life of Paul', color: '#4d5f8f', ready: false, match: () => false,
    blurb: 'Three journeys and the road to Rome. It arrives together with the book of Acts.' }
];
// Gospel order, not calendar dates: scholars still debate the years
const MAP_PERIODS = [
  { n: 'Birth and childhood', a: 1, b: 12 },
  { n: 'First signs', a: 13, b: 22 },
  { n: 'Galilee ministry', a: 23, b: 62 },
  { n: 'Toward Jerusalem', a: 63, b: 81 },
  { n: 'The final week', a: 82, b: 94 },
  { n: 'Arrest and cross', a: 95, b: 103 },
  { n: 'Risen', a: 104, b: 110 }
];
let mapShown = [];       // events currently on the map (after filters)
let mapSelId = null;
let mapPins = 'photos';   // 'photos' or 'dots' (Filters > Photos)

let mapExtra = null;     // fallback "chapter setting" pin when a chapter has no curated event
let mapEvP = null;
let MAPIMG = {};         // data/map-images.json: key -> {k: art|now|dig, f: Commons file name, c: caption, a: artist}
let mapKind = 'all';     // legend toggle: prefer art / now / dig photos on the markers
const mapMarkers = new Map(); // marker key -> {m, el}
const MAP_KINDS = { art: { label: 'Art', color: '#8C4646' }, now: { label: 'Today', color: '#3f7a6b' }, dig: { label: 'Archaeology', color: '#b0702f' } };
const KIND_SVG = {
  art: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.6a6.4 6.4 0 1 0 0 12.8c1.2 0 1.6-.8 1.1-1.6-.5-.8-.1-1.9 1-1.9H12a2.4 2.4 0 0 0 2.4-2.4C14.4 4.5 11.6 1.6 8 1.6z" fill="none" stroke="currentColor" stroke-width="1.4"/><circle cx="5" cy="7.2" r="1.05" fill="currentColor"/><circle cx="8" cy="4.9" r="1.05" fill="currentColor"/><circle cx="11" cy="6.6" r="1.05" fill="currentColor"/></svg>',
  now: '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="1.6" y="4.6" width="12.8" height="8.8" rx="2" fill="none" stroke="currentColor" stroke-width="1.4"/><circle cx="8" cy="9" r="2.4" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M5.6 4.6l.9-2h3l.9 2" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>',
  dig: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2.5 14h11M4.5 14V7M8 14V7M11.5 14V7M2.5 7h11M8 2L2.2 6.6h11.6z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" stroke-linecap="round"/></svg>'
};
let mapImgP = null;
function loadMapImages() {
  return mapImgP || (mapImgP = fetch('data/map-images.json').then(r => (r.ok ? r.json() : {})).catch(() => ({})).then(imgs => { MAPIMG = imgs || {}; return MAPIMG; }));
}
function loadEvents() {
  return mapEvP || (mapEvP = Promise.all([
    fetch('data/events.json').then(r => (r.ok ? r.json() : [])).catch(() => []),
    loadMapImages()
  ]).then(([list, imgs]) => {
    EVENTS = list || []; EV_BY_ID = {}; EVENTS.forEach(e => { EV_BY_ID[e.i] = e; });
    mapMaxI = EVENTS.reduce((m, e) => Math.max(m, typeof e.i === 'number' ? e.i : 0), 1);
    if (mapF.to > mapMaxI) mapF.to = mapMaxI;
    return EVENTS;
  }));
}
// Event photos: each event has an `im` list of keys into MAPIMG (or inline {k,u,c,a} objects for fallback pins).
function mapImgs(e) { return (e.im || []).map(x => (typeof x === 'string' ? MAPIMG[x] : x)).filter(Boolean); }
function mapImgUrl(img, w) {
  if (img.u) return wmSnap(img.u);
  if (/^https?:/.test(img.f)) return wmSnap(img.f);
  return 'https://commons.wikimedia.org/wiki/Special:FilePath/' + encodeURIComponent(img.f) + '?width=' + wmW(w);
}
function mapImgPage(img) {
  if (img.u) return img.s || '';
  if (/^https?:/.test(img.f)) return img.f;
  return 'https://commons.wikimedia.org/wiki/File:' + encodeURIComponent(img.f);
}
function mapHero(e) {
  const imgs = mapImgs(e);
  return (mapKind !== 'all' && imgs.find(i => i.k === mapKind)) || imgs[0] || null;
}
const mapBookName = slug => { const b = manifest && manifest.books.find(x => x.slug === slug); return b ? b.name : slug; };
function refLabel(r) {
  const [b, c1, v1, c2, v2] = r;
  const nm = mapBookName(b);
  if (c1 === c2) return `${nm} ${c1}:${v1}${v2 !== v1 ? '–' + v2 : ''}`;
  return `${nm} ${c1}:${v1}–${c2}:${v2}`;
}
function evRefs(e) { return (e.r || []).map(refLabel).join(' · '); }
function evPrimaryBook(e) { return e.r && e.r[0] ? e.r[0][0] : 'matthew'; }
function evMatches(e) {
  const rs = e.r || [];
  if (typeof e.i === 'number' && (e.i < mapF.from || e.i > Math.min(mapF.to, mapMaxI))) return false;
  if (mapF.tst !== 'all' && !rs.some(r => MAP_TST[r[0]] === mapF.tst)) return false;
  if (mapF.book !== 'all') {
    if (!rs.some(r => r[0] === mapF.book)) return false;
    if (mapF.chapter !== 'all') { const c = Number(mapF.chapter); if (!rs.some(r => r[0] === mapF.book && r[1] <= c && c <= r[3])) return false; }
  }
  return true;
}
function mapOrderKey(e) {
  if (mapF.book !== 'all') { const r = (e.r || []).find(x => x[0] === mapF.book) || e.r[0]; return r[1] * 1000 + r[2]; }
  return e.i;
}

function renderMapControls() {
  const nt = ['matthew', 'mark', 'luke', 'john'];
  const chips = [`<button type="button" class="map-chip${mapF.book === 'all' ? ' on' : ''}" data-b="all"><i style="background:var(--gold)"></i>All books</button>`]
    .concat(nt.filter(b => mapF.tst === 'all' || MAP_TST[b] === mapF.tst).map(b => `<button type="button" class="map-chip${mapF.book === b ? ' on' : ''}" data-b="${b}"><i style="background:${MAP_BOOK_COLORS[b]}"></i>${mapBookName(b)}</button>`));
  const box = document.getElementById('mapBooks');
  box.innerHTML = mapF.tst === 'OT' ? '' : chips.join('');
  box.style.display = mapF.tst === 'OT' ? 'none' : 'flex';
  box.querySelectorAll('.map-chip').forEach(btn => btn.addEventListener('click', () => {
    mapF.book = btn.dataset.b; mapF.chapter = 'all'; applyMapFilters(true);
  }));
  document.querySelectorAll('#mapTst button').forEach(b => b.classList.toggle('on', b.dataset.t === mapF.tst));
  const sel = document.getElementById('mapChapter');
  if (mapF.book === 'all') { sel.hidden = true; }
  else {
    const bk = manifest.books.find(b => b.slug === mapF.book);
    sel.innerHTML = '<option value="all">All chapters</option>' + (bk ? bk.availableChapters.map(n => `<option value="${n}">Chapter ${n}</option>`).join('') : '');
    sel.value = String(mapF.chapter);
    sel.hidden = false;
  }
  renderMapFilterUI();
}

async function applyMapFilters(fit) {
  await loadEvents();
  mapWalk = null; document.getElementById('mapCard').classList.remove('walking');
  mapExtra = null;
  mapShown = EVENTS.filter(evMatches);
  if (mapF.tst === 'OT') mapShown = [];
  // A chapter with no curated event still gets a pin for its setting, taken from the chapter's own data.
  if (mapF.book !== 'all' && mapF.chapter !== 'all' && !mapShown.length) {
    try {
      const ch = await fetchJSON(`data/${mapF.book}/${mapF.chapter}.json`);
      const mc = ch.context && ch.context.mapCoords;
      if (mc) {
        const ov = ch.context.overview || {};
        mapExtra = { i: 'c' + mapF.book + mapF.chapter, t: ch.title || (mapBookName(mapF.book) + ' ' + mapF.chapter), p: mc.placeName || '', la: mc.lat, ln: mc.lng,
          r: [[mapF.book, Number(mapF.chapter), 1, Number(mapF.chapter), (ch.verses || []).length || 1]], s: ov.summary || ch.context.sparkNotes || '',
          n: 'No single event is pinned for this chapter yet, so this marks the chapter’s general setting.', chapterPin: true };
        const hi = ch.context.historicalImage;
        if (hi && hi.url) mapExtra.im = [{ k: 'art', u: displayImageUrl(hi.url), c: hi.caption || '', a: hi.credit || '' }];
        EV_BY_ID[mapExtra.i] = mapExtra; mapShown = [mapExtra];
      }
    } catch (e) { /* leave empty */ }
  }
  renderMapControls();
  const cnt = document.getElementById('mapCount');
  const msg = document.getElementById('mapMsg');
  if (mapF.tst === 'OT') { cnt.textContent = '0 events'; msg.textContent = 'Old Testament events are not pinned yet. This filter is ready for them.'; msg.hidden = false; }
  else if (!mapShown.length) { cnt.textContent = '0 events'; msg.textContent = 'No events are pinned here yet.'; msg.hidden = false; }
  else { msg.hidden = true; cnt.textContent = mapExtra ? 'chapter setting only' : (mapShown.length + (mapShown.length === 1 ? ' event' : ' events')); }
  document.getElementById('mapCard').hidden = true; mapSelId = null;
  pushMapData();
  updateStoryPath();
  if (mapActiveStory() && mapShown.length && !mapExtra) cnt.textContent = mapShown.length + (mapShown.length === 1 ? ' stop' : ' stops');
  if (fit) fitMapToShown();
}


// ----- Map Filters panel: stories, timeline, Bible, photos, borders live in one place -----
const mapEl = id => document.getElementById(id);
const mapActiveStory = () => MAP_STORIES.find(x => x.id === mapStory && x.ready) || null;
function mapFiltCount() {
  let n = 0;
  if (mapF.tst !== 'all') n++;
  if (mapF.book !== 'all') n++;
  if (mapF.chapter !== 'all') n++;
  if (mapF.from > 1 || mapF.to < mapMaxI) n++;
  if (mapKind !== 'all') n++;
  if (mapPins === 'dots') n++;
  if (mapActiveStory()) n++;
  return n;
}
function mapRangeLabel() {
  const a = EV_BY_ID[mapF.from], z = EV_BY_ID[Math.min(mapF.to, mapMaxI)];
  const full = mapF.from <= 1 && mapF.to >= mapMaxI;
  const el = mapEl('mapRLab'); if (!el) return;
  if (!a || !z) { el.textContent = ''; return; }
  el.innerHTML = full ? 'Showing the whole story, in Gospel order. Drag either end to narrow it. Dates are circa, so the order is what we show.'
    : `From <b>${escHtml(a.t)}</b> (${a.i}) to <b>${escHtml(z.t)}</b> (${z.i}).`;
  const bar = mapEl('mapRBar'), span = Math.max(1, mapMaxI - 1);
  if (bar) { bar.style.left = ((mapF.from - 1) / span * 100) + '%'; bar.style.right = (100 - (Math.min(mapF.to, mapMaxI) - 1) / span * 100) + '%'; }
}
function renderMapFilterUI() {
  const st = mapEl('mapStories'); if (!st) return;
  const cur = mapActiveStory();
  st.innerHTML = MAP_STORIES.map(x => `<button type="button" class="mf-story${cur && cur.id === x.id ? ' on' : ''}" data-s="${x.id}" style="--c:${x.color}"${x.ready ? '' : ' disabled'}><i></i>${escHtml(x.name)}${x.ready ? '' : ' · with Acts'}</button>`).join('');
  mapEl('mapStoryNote').textContent = cur ? cur.blurb : 'Pick a story to draw its path and number the stops in order.';
  mapEl('mapWalkBtns').innerHTML = cur ? '<button type="button" data-w="full">Walk me through the full story</button><button type="button" data-w="short">Walk me through the short version</button>' : '';
  const full = mapF.from <= 1 && mapF.to >= mapMaxI;
  mapEl('mapPeriods').innerHTML = `<button type="button" class="map-chip${full ? ' on' : ''}" data-p="all"><i style="background:var(--gold)"></i>Whole story</button>` +
    MAP_PERIODS.map((p, k) => `<button type="button" class="map-chip${mapF.from === p.a && mapF.to === p.b ? ' on' : ''}" data-p="${k}"><i style="background:var(--gold)"></i>${escHtml(p.n)}</button>`).join('');
  const rf = mapEl('mapRFrom'), rt = mapEl('mapRTo');
  rf.max = rt.max = String(mapMaxI); rf.value = String(mapF.from); rt.value = String(Math.min(mapF.to, mapMaxI));
  mapRangeLabel();
  const secSum = (id, t) => { const el = document.getElementById(id); if (el) el.querySelector('h4').dataset.sum = t; };
  secSum('mfStory', cur ? cur.name : 'Off');
  secSum('mfTime', full ? 'Whole story' : `${mapF.from}–${Math.min(mapF.to, mapMaxI)}`);
  secSum('mfBible', mapF.book === 'all' ? (mapF.tst === 'all' ? 'All' : mapF.tst) : mapBookName(mapF.book) + (mapF.chapter !== 'all' ? ' ' + mapF.chapter : ''));
  secSum('mfPhotos', (mapPins === 'dots' ? 'Dots' : 'Photos') + (mapKind !== 'all' ? ' · ' + MAP_KINDS[mapKind].label : ''));
  secSum('mfBorders', mapEra === 'off' ? 'Off' : mapEra === 'herod' ? '4 BC' : 'AD 30');
  document.querySelectorAll('#mapPins button').forEach(b => b.classList.toggle('on', b.dataset.p === mapPins));
  const n = mapFiltCount(), nb = mapEl('mapFiltN'); nb.hidden = !n; nb.textContent = n;
  const pill = mapEl('mapStoryPill'); pill.hidden = !cur; if (cur) { pill.textContent = (mapWalk ? 'Walking · ' : '') + cur.name + ' ✕'; pill.style.background = cur.color; pill.title = mapWalk ? 'End the walk-through' : 'Turn off the story path'; }
  mapEl('bigMap').classList.toggle('story', !!cur);
}
function mapFiltOpen(on) {
  const p = mapEl('mapFilters'); if (!p) return;
  const was = !p.hidden;
  p.hidden = !on; mapEl('mapFiltBtn').setAttribute('aria-expanded', String(!!on));
  if (on) { mapEl('mapCard').hidden = true; setMapSel(null); mapEl('mapList').hidden = true; }
  mapInset();
  if (!on && was && mapWalk) walkRender(false); // coming back from Filters: the walk picks up where it was
}
async function mapSetStory(id, ask) {
  mapStory = id || '';
  try { localStorage.setItem('foreverMapStory', mapStory); } catch (e) { /* ignore */ }
  await applyMapFilters(true);
  if (ask && mapActiveStory() && !mapExtra && mapStoryAll().length > 1) walkAsk();
}
function mapResetFilters() {
  mapF = { tst: 'all', book: 'all', chapter: 'all', from: 1, to: mapMaxI };
  mapKind = 'all'; mapPins = 'photos'; try { localStorage.setItem('foreverMapPins', 'photos'); } catch (e) { /* ignore */ }
  document.querySelectorAll('#mapLegend button').forEach(x => x.classList.remove('on'));
  mapStory = ''; try { localStorage.setItem('foreverMapStory', ''); } catch (e) { /* ignore */ }
  applyMapFilters(true);
}
function mapApplyRange(fit) {
  const rf = mapEl('mapRFrom'), rt = mapEl('mapRTo');
  let a = Number(rf.value), z = Number(rt.value);
  if (a > z) { if (document.activeElement === rf) { a = z; rf.value = String(a); } else { z = a; rt.value = String(z); } }
  mapF.from = a; mapF.to = z;
  mapRangeLabel();
  const full = a <= 1 && z >= mapMaxI;
  document.querySelectorAll('#mapPeriods .map-chip').forEach(b => { const p = b.dataset.p; b.classList.toggle('on', p === 'all' ? full : (MAP_PERIODS[p].a === a && MAP_PERIODS[p].b === z)); });
  applyMapFilters(fit);
}
function mapWireFilters() {
  if (mapWireFilters.done) return; mapWireFilters.done = true;
  mapEl('mapFilters').addEventListener('click', ev => { const h = ev.target.closest('.mf-sec > h4'); if (h) h.parentElement.classList.toggle('open'); }); // sections start collapsed
  mapEl('mapFiltBtn').addEventListener('click', () => mapFiltOpen(mapEl('mapFilters').hidden));
  mapEl('mapFClose').addEventListener('click', () => mapFiltOpen(false));
  mapEl('mapFReset').addEventListener('click', mapResetFilters);
  mapEl('mapStories').addEventListener('click', ev => {
    const b = ev.target.closest('[data-s]'); if (!b || b.disabled) return;
    const turnOn = mapStory !== b.dataset.s;
    mapFiltOpen(false);
    mapSetStory(turnOn ? b.dataset.s : '', turnOn);
  });
  mapEl('mapWalkBtns').addEventListener('click', ev => {
    const b = ev.target.closest('[data-w]'); if (!b) return;
    mapFiltOpen(false); walkStart(b.dataset.w);
  });
  mapEl('mapStoryPill').addEventListener('click', () => { if (mapWalk) walkEnd(true); else mapSetStory(''); });
  mapEl('mapPeriods').addEventListener('click', ev => {
    const b = ev.target.closest('[data-p]'); if (!b) return;
    const p = b.dataset.p;
    if (p === 'all' || (mapF.from === MAP_PERIODS[p].a && mapF.to === MAP_PERIODS[p].b)) { mapF.from = 1; mapF.to = mapMaxI; }
    else { mapF.from = MAP_PERIODS[p].a; mapF.to = MAP_PERIODS[p].b; }
    applyMapFilters(true);
  });
  ['mapRFrom', 'mapRTo'].forEach(id => {
    const el = mapEl(id);
    el.addEventListener('input', () => { if (mapWireFilters.raf) return; mapWireFilters.raf = requestAnimationFrame(() => { mapWireFilters.raf = 0; mapApplyRange(false); }); });
    el.addEventListener('change', () => mapApplyRange(true));
  });
  mapEl('mapPins').addEventListener('click', ev => {
    const b = ev.target.closest('[data-p]'); if (!b) return;
    mapPins = b.dataset.p === 'dots' ? 'dots' : 'photos';
    try { localStorage.setItem('foreverMapPins', mapPins); } catch (e) { /* ignore */ }
    renderMapFilterUI(); pushMapData();
  });
}
// size hints for the dock and the Filters panel
function mapInset() {
  const wrap = document.querySelector('#screen-map .map-wrap'), dock = mapEl('mapDock'), card = mapEl('mapCard');
  if (!wrap || !dock) return;
  const dh = dock.offsetHeight || 80;
  wrap.style.setProperty('--dock-h', dh + 'px');
  wrap.style.setProperty('--wrap-h', wrap.clientHeight + 'px');
  const ch = card && !card.hidden && card.offsetHeight ? card.offsetHeight + 8 : 0;
  mapEl('bigMap').style.setProperty('--map-inset', (dh + 14 + ch) + 'px');
}

// ----- Story path: a curved line through the stops in order, with arrows; numbers sit on the pins -----
function mapStoryAll() {
  const cur = mapActiveStory(); if (!cur) return [];
  return mapShown.filter(e => !e.chapterPin && cur.match(e)).sort((a, b) => a.i - b.i);
}
// while walking through a story, the path only reaches as far as the stop you are on
function mapStoryEvents() {
  const all = mapStoryAll();
  return mapWalk ? mapWalk.seq.slice(0, mapWalk.k + 1) : all;
}
function mapArrowImage() {
  const c = document.createElement('canvas'); c.width = c.height = 28;
  const g = c.getContext('2d'); g.translate(14, 14);
  g.beginPath(); g.moveTo(7, 0); g.lineTo(-5, -6.5); g.lineTo(-2, 0); g.lineTo(-5, 6.5); g.closePath();
  g.fillStyle = '#fffaf0'; g.fill(); g.lineWidth = 1.6; g.strokeStyle = 'rgba(80,40,30,.85)'; g.lineJoin = 'round'; g.stroke();
  return g.getImageData(0, 0, 28, 28);
}
function mapCurve(a, b) {
  // a gentle bow to the right of the direction of travel, so there-and-back trips do not sit on one line
  const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy), k = 0.16;
  const c = [(a[0] + b[0]) / 2 + dy * k, (a[1] + b[1]) / 2 - dx * k], out = [];
  const N = Math.max(6, Math.min(22, Math.round(len * 40)));
  for (let t = 0; t <= N; t++) { const u = t / N, v = 1 - u; out.push([v * v * a[0] + 2 * v * u * c[0] + u * u * b[0], v * v * a[1] + 2 * v * u * c[1] + u * u * b[1]]); }
  return out;
}
function updateStoryPath() {
  if (!mapMain || !mapMainReady) return;
  const evs = mapStoryEvents(), coords = [];
  let prev = null;
  const hubCount = {}; evs.forEach(e => { const h = mapHubOf(e); if (h) hubCount[h.id] = (hubCount[h.id] || 0) + 1; });
  evs.forEach(e => {
    const h = mapHubOf(e), p = h && hubCount[h.id] > 1 ? [h.ln, h.la] : [e.ln, e.la]; // events inside a place that stays grouped all route through its centre
    if (prev && Math.hypot(p[0] - prev[0], p[1] - prev[1]) < 0.003) return;
    if (prev) { const seg = mapCurve(prev, p); seg.shift(); seg.forEach(q => coords.push(q)); } else coords.push(p);
    prev = p;
  });
  const data = { type: 'FeatureCollection', features: coords.length > 1 ? [{ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: coords } }] : [] };
  if (!mapMain.getSource('story-path')) {
    try {
      if (!mapMain.hasImage('story-arrow')) mapMain.addImage('story-arrow', mapArrowImage());
      const ls = mapMain.getStyle().layers || [], firstSym = (ls.find(l => l.type === 'symbol' && !/^reg-/.test(l.id)) || {}).id;
      mapMain.addSource('story-path', { type: 'geojson', data, lineMetrics: true });
      mapMain.addLayer({ id: 'story-casing', type: 'line', source: 'story-path', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#fffaf0', 'line-width': 6.5, 'line-opacity': 0.8 } }, firstSym);
      mapMain.addLayer({ id: 'story-line', type: 'line', source: 'story-path', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-width': 3.2, 'line-gradient': ['interpolate', ['linear'], ['line-progress'], 0, '#c9a227', 0.5, '#c0763a', 1, '#8C4646'] } }, firstSym);
      mapMain.addLayer({ id: 'story-arrows', type: 'symbol', source: 'story-path', layout: { 'symbol-placement': 'line', 'symbol-spacing': 80, 'icon-image': 'story-arrow', 'icon-size': 0.6, 'icon-allow-overlap': true, 'icon-ignore-placement': true } }, firstSym);
    } catch (err) { return; }
  } else mapMain.getSource('story-path').setData(data);
  ['story-casing', 'story-line', 'story-arrows'].forEach(id => { if (mapMain.getLayer(id)) mapMain.setLayoutProperty(id, 'visibility', coords.length > 1 && mapActiveStory() ? 'visible' : 'none'); });
}


// Places where many things happen and we often do not know exactly where: these always stay together as one pin
const MAP_HUBS = [
  { id: 'jerusalem', name: 'Jerusalem', la: 31.778, ln: 35.235, r: 2.3 },
  { id: 'bethany', name: 'Bethany', la: 31.771, ln: 35.262, r: 1.2 },
  { id: 'capernaum', name: 'Capernaum', la: 32.881, ln: 35.573, r: 3.0 },
  { id: 'nazareth', name: 'Nazareth', la: 32.70, ln: 35.30, r: 3.0 },
  { id: 'bethlehem', name: 'Bethlehem', la: 31.705, ln: 35.205, r: 3.5 },
  { id: 'jericho', name: 'Jericho', la: 31.87, ln: 35.44, r: 3.0 },
  { id: 'cana', name: 'Cana', la: 32.75, ln: 35.34, r: 2.5 },
  { id: 'bethsaida', name: 'Bethsaida', la: 32.91, ln: 35.63, r: 2.5 },
  { id: 'jordan', name: 'Jordan River', la: 31.84, ln: 35.55, r: 3.0 }
];
const mapKm = (la1, ln1, la2, ln2) => Math.hypot((ln1 - ln2) * Math.cos(la1 * Math.PI / 180) * 111.3, (la1 - la2) * 111.2);
function mapHubOf(e) {
  if (e.chapterPin || typeof e.la !== 'number') return null;
  return MAP_HUBS.find(h => mapKm(e.la, e.ln, h.la, h.ln) <= h.r) || null;
}
// Names of cities, seas and regions float above the photos. [lat, lng, name, kind (c city, r region, w water), min zoom, max zoom]
const MAP_PLACES = [
  ['31.778,35.235', 'Jerusalem', 'c', 5, 99, 'jerusalem'], ['32.881,35.573', 'Capernaum', 'c', 5, 99, 'capernaum'], ['32.70,35.30', 'Nazareth', 'c', 5, 99, 'nazareth'],
  ['31.705,35.205', 'Bethlehem', 'c', 5, 99, 'bethlehem'], ['31.87,35.44', 'Jericho', 'c', 8, 99, 'jericho'], ['31.771,35.262', 'Bethany', 'c', 9, 99, 'bethany'],
  ['32.79,35.53', 'Tiberias', 'c', 9, 99], ['32.754,35.28', 'Sepphoris', 'c', 9.5, 99], ['32.50,34.89', 'Caesarea', 'c', 7.5, 99], ['33.27,35.20', 'Tyre', 'c', 7, 99],
  ['33.56,35.37', 'Sidon', 'c', 7, 99], ['33.25,35.69', 'Caesarea Philippi', 'c', 8.5, 99], ['32.275,35.19', 'Sebaste', 'c', 9.5, 99], ['31.53,35.10', 'Hebron', 'c', 8.5, 99],
  ['31.50,34.47', 'Gaza', 'c', 7, 99], ['32.05,34.75', 'Joppa', 'c', 8, 99], ['33.51,36.29', 'Damascus', 'c', 6, 99], ['32.28,35.89', 'Gerasa', 'c', 8.5, 99], ['32.50,35.50', 'Scythopolis', 'c', 9, 99],
  ['32.82,35.59', 'Sea of Galilee', 'w', 8.2, 13.5], ['31.50,35.47', 'Dead Sea', 'w', 7.5, 13], ['32.18,35.55', 'Jordan River', 'w', 9.5, 13], ['33.0,34.3', 'Mediterranean Sea', 'w', 5, 9.5],
  ['31.62,35.0', 'JUDEA', 'r', 6.3, 9.3], ['32.30,35.22', 'SAMARIA', 'r', 6.3, 9.3], ['32.90,35.30', 'GALILEE', 'r', 6.3, 9.3], ['32.0,35.74', 'PEREA', 'r', 6.3, 9.3],
  ['32.60,35.95', 'DECAPOLIS', 'r', 6.3, 9.3], ['31.30,35.0', 'IDUMEA', 'r', 6.3, 9.3], ['33.45,35.45', 'PHOENICIA', 'r', 6.3, 9.3], ['30.5,31.0', 'EGYPT', 'r', 4, 9.3], ['33.9,36.3', 'SYRIA', 'r', 5, 9.3], ['27.8,34.4', 'Red Sea', 'w', 4.5, 7.5]
].map(p => { const [la, ln] = p[0].split(',').map(Number); return { la, ln, name: p[1], kind: p[2], z0: p[3], z1: p[4], hub: p[5] || null, rec: null }; });
function renderPlaceLabels() {
  if (!mapMain || !mapMainReady) return;
  const z = mapMain.getZoom(), taken = [], hubsUp = new Set();
  mapMarkers.forEach(rec => {
    if (!rec.hub) return;
    hubsUp.add(rec.hub);
    const q = mapMain.project(rec.m.getLngLat()); taken.push([q.x - 62, q.y + 18, q.x + 62, q.y + 46]); // keep names clear of the place pills
  });
  MAP_PLACES.forEach(pl => {
    let show = z >= pl.z0 && z <= pl.z1 && !(pl.hub && hubsUp.has(pl.hub));
    if (show) {
      const p = mapMain.project([pl.ln, pl.la]), w = pl.name.length * (pl.kind === 'r' ? 8.2 : 6) + 12, h = 14;
      const box = pl.kind === 'c' ? [p.x - 3, p.y - h / 2, p.x + w, p.y + h / 2] : [p.x - w / 2, p.y - h / 2, p.x + w / 2, p.y + h / 2];
      const cv = mapMain.getContainer();
      if (box[2] < -20 || box[0] > cv.clientWidth + 20 || box[3] < -20 || box[1] > cv.clientHeight + 20) show = false;
      else if (taken.some(t => box[0] < t[2] + 3 && box[2] > t[0] - 3 && box[1] < t[3] + 2 && box[3] > t[1] - 2)) show = false;
      else taken.push(box);
    }
    if (show && !pl.rec) {
      const el = document.createElement('div'); el.className = 'mp-place ' + pl.kind; el.innerHTML = (pl.kind === 'c' ? '<i></i>' : '') + escHtml(pl.name);
      pl.rec = new maplibregl.Marker({ element: el, anchor: pl.kind === 'c' ? 'left' : 'center' }).setLngLat([pl.ln, pl.la]).addTo(mapMain);
    }
    if (pl.rec) pl.rec.getElement().style.display = show ? '' : 'none';
  });
}

// ----- Photo markers: our own light clustering (110 points), DOM markers with round photos -----
function mkThumb(img, w) {
  return mapImgUrl(img, w).replace(/width=\d+/, 'width=' + wmW(w));
}
// Picture cache for the map pins. Wikimedia throttles bursts of requests, so the pin photos are fetched a few at a
// time right after the map opens, and a pin that fails keeps trying instead of going blank.
const mapImgOk = new Set(), mapImgBad = new Set();
let mapPreloadStarted = false;
function mapPreloadHeroes() {
  if (mapPreloadStarted || !EVENTS) return;
  mapPreloadStarted = true;
  const urls = [], seen = new Set();
  EVENTS.forEach(e => { mapImgs(e).slice(0, 3).forEach(h => { [120, 100].forEach(w => { const u = mkThumb(h, w); if (!seen.has(u)) { seen.add(u); urls.push(u); } }); }); });
  // heroes first: the first photo of every event goes to the front of the queue
  const first = new Set(EVENTS.map(e => { const h = mapImgs(e)[0]; return h ? mkThumb(h, 120) : null; }).filter(Boolean));
  urls.sort((a, b) => (first.has(b) ? 1 : 0) - (first.has(a) ? 1 : 0));
  let busy = 0, idx = 0;
  const pump = () => {
    while (busy < 4 && idx < urls.length) {
      const u = urls[idx++]; if (mapImgOk.has(u)) continue;
      busy++;
      const im = new Image(); let tries = 0;
      const done = ok => { if (ok) mapImgOk.add(u); else mapImgBad.add(u); busy--; pump(); };
      im.onload = () => done(true);
      im.onerror = () => { if (++tries < 3) setTimeout(() => { im.src = u; }, 900 * tries); else done(false); };
      im.src = u;
    }
  };
  pump();
}
// the best photo for a group of events: one already loaded, else one not known to be broken
function mapPickHero(evList) {
  const hs = evList.map(e => mapHero(e)).filter(Boolean);
  return hs.find(h => mapImgOk.has(mkThumb(h, 120))) || hs.find(h => !mapImgBad.has(mkThumb(h, 120))) || hs[0] || null;
}
// a pin photo that fails to load tries again a couple of times before it gives up
function mapImgRetry(root) {
  root.querySelectorAll('img').forEach(im => {
    let n = 0;
    im.addEventListener('error', () => {
      if (++n <= 3 && im.isConnected !== false) { const u = im.getAttribute('src'); setTimeout(() => { if (im.parentNode) im.src = u; }, 1000 * n); }
      else { mapImgBad.add(im.getAttribute('src')); im.remove(); }
    });
    im.addEventListener('load', () => { mapImgOk.add(im.getAttribute('src')); im.classList.add('ok'); });
    if (im.complete && im.naturalWidth) im.classList.add('ok');
  });
}
function markerHTML(g, hero, hub) {
  const lead = g[0].e, n = g.length;
  const kcol = hero ? MAP_KINDS[hero.k].color : '#8a6d0b';
  const bcol = MAP_BOOK_COLORS[evPrimaryBook(lead)] || '#8a6d0b';
  const label = hub ? hub.name + ' · ' + n : (n > 1 ? n + ' events' : lead.t);
  // one number per pin: a single stop shows its stop number (in a story); a group shows how many events it holds
  const story = !!mapActiveStory();
  const no = (!hub && n === 1 && story && typeof lead.i === 'number') ? String(lead.i) : '';
  const cnt = n > 1 ? String(n) : '';
  if (mapPins === 'dots') {
    return `<div class="pd${hub ? ' hub' : ''}${n > 1 ? ' cl' : ''}" style="--bc:${bcol}" title="${escHtml(label)}">${escHtml(no || cnt)}</div>${hub ? `<span class="pm-lab hub">${escHtml(hub.name)}</span>` : ''}`;
  }
  // groups fan out up to two more photos from other events in the group
  let back = '';
  if (n > 1) {
    const seen = new Set([hero && (hero.f || hero.u)]), extra = [];
    g.slice(1).forEach(x => { const h = mapHero(x.e); const id = h && (h.f || h.u); if (h && !seen.has(id) && extra.length < 2) { seen.add(id); extra.push(h); } });
    back = extra.map((h, k) => `<span class="pm-back b${k + 1}"><img src="${escHtml(mkThumb(h, 100))}" alt="" decoding="async" draggable="false"></span>`).join('');
  }
  return `${back}<div class="pm${n > 1 ? ' cl' : ''}${hub ? ' hub' : ''}${lead.chapterPin ? ' cp' : ''}" style="--kc:${kcol};--bc:${bcol}" title="${escHtml(label)}">
    ${hero ? `<img src="${escHtml(mkThumb(hero, 120))}" alt="" decoding="async" draggable="false">` : ''}
    ${hero ? `<span class="pm-k">${KIND_SVG[hero.k]}</span>` : ''}
    ${cnt ? `<span class="pm-n">${cnt}</span>` : ''}
    ${no ? `<span class="pm-no">${no}</span>` : ''}
    <span class="pm-lab${hub ? ' hub' : ''}">${escHtml(hub ? hub.name : label)}</span></div>`;
}
function renderMarkers() {
  if (!mapMain || !mapMainReady) return;
  if (mapWalk) { renderWalkMarkers(); return; }
  const z = mapMain.getZoom(), small = false;
  const R = 72; // px: how close two pins may be before they merge (the same at every zoom, so photos stay up when you zoom out)
  const evs = mapShown.map(e => ({ e, p: mapMain.project([e.ln, e.la]) })).sort((a, b) => a.e.i - b.e.i);
  // items: a hub (a place that always stays in one piece) or a single event
  const byHub = {}, items = [];
  evs.forEach(a => { const h = mapHubOf(a.e); if (h) (byHub[h.id] = byHub[h.id] || []).push(a); });
  const inHub = new Set();
  MAP_HUBS.forEach(h => {
    const g = byHub[h.id]; if (!g || g.length < 2) return;
    g.forEach(a => inHub.add(a));
    items.push({ hub: h, pts: g, c: [h.ln, h.la], p: mapMain.project([h.ln, h.la]) });
  });
  items.sort((a, b) => b.pts.length - a.pts.length);
  const sel = mapSelId;
  const singles = evs.filter(a => !inHub.has(a)).map(a => ({ hub: null, pts: [a], c: [a.e.ln, a.e.la], p: a.p }));
  const si = singles.findIndex(x => x.pts[0].e.i === sel); if (si > 0) singles.unshift(singles.splice(si, 1)[0]);
  const all = items.concat(singles), used = new Set(), groups = [];
  all.forEach(a => {
    if (used.has(a)) return;
    used.add(a); const g = [a];
    all.forEach(b => { if (!used.has(b) && Math.hypot(a.p.x - b.p.x, a.p.y - b.p.y) < R) { used.add(b); g.push(b); } });
    groups.push(g);
  });
  const keep = new Set();
  groups.forEach(g => {
    const flat = [].concat(...g.map(x => x.pts)).sort((p, q) => p.e.i - q.e.i);
    const lead = g.find(x => x.hub) || null;
    const pure = g.length === 1 && !!lead;
    const hubName = lead ? (pure || g.length === 1 ? lead.hub.name : lead.hub.name + ' area') : '';
    const hero = (g.length === 1 && g[0].pts.length === 1) ? mapHero(g[0].pts[0].e) : mapPickHero(flat.map(x => x.e));
    const key = (lead ? 'h' + g.length + ':' : '') + flat.map(x => x.e.i).join(',') + '|' + (hero ? hero.f || hero.u : '') + '|' + mapPins + '|' + (mapActiveStory() ? 's' : '');
    keep.add(key);
    let rec = mapMarkers.get(key);
    if (!rec) {
      const wrap = document.createElement('div'); wrap.className = 'pm-wrap' + (mapPins === 'dots' ? ' dots' : '') + (lead ? ' hubw' : '');
      wrap.innerHTML = markerHTML(flat, hero, hubName ? { name: hubName } : null);
      mapImgRetry(wrap);
      const ids = flat.map(x => x.e.i), centers = g.map(x => x.c);
      wrap.addEventListener('click', ev => { ev.stopPropagation(); onMarkerTap(ids, centers, pure, hubName); });
      const pos = g.length === 1 ? g[0].c : (lead ? lead.c : [centers.reduce((s, c) => s + c[0], 0) / centers.length, centers.reduce((s, c) => s + c[1], 0) / centers.length]);
      const m = new maplibregl.Marker({ element: wrap, anchor: 'center' }).setLngLat(pos).addTo(mapMain);
      rec = { m, el: wrap, ids, hub: lead ? lead.hub.id : null };
      mapMarkers.set(key, rec);
    }
    rec.el.classList.toggle('sel', rec.ids.includes(mapSelId));
  });
  mapMarkers.forEach((rec, key) => { if (!keep.has(key)) { rec.m.remove(); mapMarkers.delete(key); } });
  const bigMap = document.getElementById('bigMap');
  bigMap.classList.toggle('z-lab', z >= 12.5);
  bigMap.classList.toggle('z-sm', small);
  renderPlaceLabels();
}
function clearMarkers() { mapMarkers.forEach(rec => rec.m.remove()); mapMarkers.clear(); }
function pushMapData() { clearMarkers(); renderMarkers(); }
function onMarkerTap(ids, centers, pure, hubName) {
  const evs = ids.map(i => EV_BY_ID[i]).filter(Boolean);
  if (evs.length === 1) { selectEvent(evs[0], false); return; }
  if (pure) { showPicker(evs, hubName); return; }
  const b = new maplibregl.LngLatBounds(centers[0], centers[0]); centers.forEach(p => b.extend(p));
  const span = Math.max(b.getEast() - b.getWest(), b.getNorth() - b.getSouth());
  if (span < 0.012 || mapMain.getZoom() >= 13) showPicker(evs, hubName);
  else mapMain.fitBounds(b, { padding: { top: 70, bottom: 200, left: 70, right: 70 }, maxZoom: 13, duration: 500 });
}
const mapSideCard = () => document.querySelector('.phone').classList.contains('wide') || window.matchMedia('(orientation:landscape) and (max-height:520px)').matches; // the card sits beside the map instead of under it
function fitMapToShown(extraBottom) {
  if (!mapMain || !mapMainReady || !mapShown.length) return;
  if (!extraBottom && !mapExtra && !mapActiveStory() && mapF.tst === 'all' && mapF.book === 'all' && mapF.chapter === 'all' && mapF.from <= 1 && mapF.to >= mapMaxI) {
    // no filters: the starting view is centered on Aqraba and zoomed out so a good chunk of the land shows
    const wide = document.querySelector('.phone').classList.contains('wide');
    mapMain.flyTo({ center: [35.34, 32.15], zoom: mapMain.getContainer().clientHeight < 480 ? 6.1 : wide ? 7.0 : 6.5, padding: { top: 0, bottom: 50, left: 0, right: 0 }, duration: 600 });
    return;
  }
  let pts = mapShown.map(e => [e.ln, e.la]);
  if (pts.length > 4) { // ignore far outliers (the flight to Egypt) so the default view stays on Israel
    const med = a => a.slice().sort((x, y) => x - y)[Math.floor(a.length / 2)];
    const mx = med(pts.map(p => p[0])), my = med(pts.map(p => p[1]));
    const near = pts.filter(p => Math.abs(p[0] - mx) < 2 && Math.abs(p[1] - my) < 2); if (near.length) pts = near;
  }
  const b = new maplibregl.LngLatBounds(pts[0], pts[0]); pts.forEach(p => b.extend(p));
  const isWide = document.querySelector('.phone').classList.contains('wide');
  const side = mapSideCard(), cardEl = document.getElementById('mapCard'), cardOn = !cardEl.hidden && extraBottom;
  const pad = isWide ? { top: 60, bottom: 100, left: 40, right: 40 + (cardOn ? cardEl.offsetWidth : 0) }
    : side ? { top: 50, bottom: 80, left: 30, right: 30 + (cardOn ? cardEl.offsetWidth : 0) }
    : { top: 60, bottom: 130 + (extraBottom || 0), left: 30, right: 30 };
  if (pts.length === 1) mapMain.flyTo({ center: pts[0], zoom: 11, padding: pad, duration: 600 });
  else mapMain.fitBounds(b, { padding: pad, maxZoom: 12, duration: 600 });
}


// ---------- Map base style: a nature / terrain look, built from OpenFreeMap "liberty" at load time ----------
// Roads, borders, buildings, shops and most modern labels come off; water and land cover are recolored; a hillshade
// from open elevation tiles shows the hills and valleys. If anything fails the stock style is used instead.
const MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';
const MAP_DEM_TILES = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png';
function natureStyle(st) {
  const DROP_SL = new Set(['transportation', 'transportation_name', 'boundary', 'building', 'poi', 'aeroway', 'aerodrome_label', 'housenumber']);
  const DROP_LU = /residential|industrial|commercial|retail|school|hospital|cemetery|pitch|playground|stadium|railway|quarry|military|parking|neighbo|urban|aerodrome|airport|garages|theme_park|zoo|track|pedestrian|bus|transit/i;
  const colorFor = id => {
    if (/wood|forest|tree/i.test(id)) return '#d2dcb6';
    if (/sand|beach|desert/i.test(id)) return '#efe2ba';
    if (/rock|bare|scree/i.test(id)) return '#e3dac6';
    if (/wetland|marsh|swamp/i.test(id)) return '#cddfcc';
    if (/ice|glacier|snow/i.test(id)) return '#f3f5f4';
    if (/farm|crop|orchard|vineyard|allotment/i.test(id)) return '#e8e5c4';
    return '#e1e5c6';
  };
  const out = [];
  (st.layers || []).forEach(l => {
    const sl = l['source-layer'], id = l.id || '', fj = JSON.stringify(l.filter || []);
    if (l.type === 'fill-extrusion' || l.type === 'heatmap') return;
    if (sl && DROP_SL.has(sl)) return;
    if (/road|bridge|tunnel|rail|ferry|aeroway|airport|building|boundary|poi|shield|housenumber|oneway|highway|transit/i.test(id) && sl !== 'water_name') return;
    if (sl === 'landuse' && DROP_LU.test(id + ' ' + fj)) return;
    if (sl === 'place' && l.type === 'symbol' && !/city|town|capital|island|sea|ocean/i.test(id + ' ' + fj)) return;
    if (l.type === 'background') { l.paint = Object.assign({}, l.paint, { 'background-color': '#efe8d4' }); }
    if (l.type === 'fill' && (sl === 'landcover' || sl === 'landuse' || sl === 'park' || /park|landcover|landuse|grass|wood|forest/i.test(id))) {
      l.paint = Object.assign({}, l.paint, { 'fill-color': colorFor(id) }); delete l.paint['fill-pattern']; delete l.paint['fill-outline-color'];
    }
    if (sl === 'water' && l.type === 'fill') { l.paint = Object.assign({}, l.paint, { 'fill-color': '#a9cad8' }); delete l.paint['fill-pattern']; }
    if (sl === 'waterway' && l.type === 'line') { l.paint = Object.assign({}, l.paint, { 'line-color': '#93b9c9' }); }
    if (l.type === 'symbol') {
      l.paint = Object.assign({}, l.paint, sl === 'water_name' ? { 'text-color': '#4c7b8f', 'text-halo-color': 'rgba(239,232,212,.85)' } : { 'text-color': '#5c5036', 'text-halo-color': 'rgba(239,232,212,.9)' });
    }
    out.push(l);
  });
  // hillshade goes right after the last fill (land and water) and before any lines or labels
  let at = -1; out.forEach((l, i) => { if (l.type === 'fill' || l.type === 'background' || l.type === 'raster') at = i; });
  st.sources = Object.assign({}, st.sources, { 'nature-dem': { type: 'raster-dem', tiles: [MAP_DEM_TILES], encoding: 'terrarium', tileSize: 256, maxzoom: 14, attribution: 'Terrain: AWS/Mapzen' } });
  out.splice(at + 1, 0, { id: 'nature-hillshade', type: 'hillshade', source: 'nature-dem', paint: { 'hillshade-exaggeration': 0.7, 'hillshade-shadow-color': '#6a5a3a', 'hillshade-highlight-color': '#fff8e4', 'hillshade-accent-color': '#8a7650', 'hillshade-illumination-direction': 335 } });
  st.layers = out;
  return st;
}
let natureRawP = null;
function loadNatureStyle() {
  if (!natureRawP) natureRawP = fetch(MAP_STYLE_URL).then(r => { if (!r.ok) throw new Error('style'); return r.json(); });
  // natureStyle edits the style it is given, so every map gets its own copy
  return natureRawP.then(raw => natureStyle(JSON.parse(JSON.stringify(raw)))).catch(() => { natureRawP = null; return MAP_STYLE_URL; });
}

// ---------- Historical borders (approximate), from data/regions.json ----------
const MAP_ERAS = {
  ministry: { chip: 'AD 30', note: 'approximate, AD 26–36' },
  herod: { chip: '4 BC', note: 'approximate, c. 4 BC' },
  off: { chip: 'Off', note: '' }
};
let mapEra = 'off', mapRegionsOk = false; // the map starts with no filters and no Political Overlay
try { const s = localStorage.getItem('foreverMapEra2'); if (s && MAP_ERAS[s]) mapEra = s; } catch (e) { /* ignore */ }
const REG_LAYERS = ['reg-fill', 'reg-line', 'reg-label', 'reg-label-s', 'reg-city', 'reg-citylab'];
function regFilter(id) {
  const era = ['==', ['get', 'era'], mapEra];
  if (id === 'reg-fill') return ['all', era, ['==', ['get', 'role'], 'area']];
  if (id === 'reg-line') return ['all', era, ['in', ['get', 'role'], ['literal', ['area', 'outline']]]];
  if (id === 'reg-label') return ['all', era, ['==', ['get', 'role'], 'label'], ['>=', ['get', 'size'], 1]];
  if (id === 'reg-label-s') return ['all', era, ['==', ['get', 'role'], 'label'], ['<', ['get', 'size'], 1]];
  return ['all', era, ['==', ['get', 'role'], 'city']];
}
function addRegionLayers(data) {
  const m = mapMain, ls = m.getStyle().layers || [];
  const hi = ls.findIndex(l => l.id === 'nature-hillshade');
  const firstSym = (ls.find(l => l.type === 'symbol') || {}).id;
  const before = hi >= 0 && ls[hi + 1] ? ls[hi + 1].id : firstSym;
  const fontL = ls.filter(l => l.layout && l.layout['text-font']).map(l => l.layout['text-font']);
  const font = fontL.find(f => /bold/i.test(f.join(' '))) || fontL[0] || ['Noto Sans Bold'];
  const fontReg = fontL.find(f => !/bold|italic/i.test(f.join(' '))) || font;
  m.addSource('regions', { type: 'geojson', data });
  m.addLayer({ id: 'reg-fill', type: 'fill', source: 'regions', paint: { 'fill-color': ['get', 'color'], 'fill-opacity': 0.12 } }, before);
  m.addLayer({ id: 'reg-line', type: 'line', source: 'regions', layout: { 'line-join': 'round' }, paint: { 'line-color': ['get', 'line'], 'line-width': ['*', ['get', 'w'], 1], 'line-opacity': 0.55, 'line-dasharray': [3, 2] } }, before);
  const lab = (id, sizes) => m.addLayer({ id, type: 'symbol', source: 'regions', minzoom: 5, maxzoom: 10.6, layout: {
    'text-field': ['format', ['get', 'name'], {}, '\n', {}, ['get', 'ruler'], { 'font-scale': 0.78 }],
    'text-font': font, 'text-size': ['interpolate', ['linear'], ['zoom'], 5, sizes[0], 8, sizes[1], 10.6, sizes[2]], 'text-letter-spacing': 0.1, 'text-max-width': 9, 'text-line-height': 1.25, 'text-padding': 4
  }, paint: { 'text-color': ['get', 'line'], 'text-halo-color': 'rgba(244,238,222,.92)', 'text-halo-width': 1.6 } });
  lab('reg-label', [9, 12.5, 15]); lab('reg-label-s', [8, 11, 13]);
  m.addLayer({ id: 'reg-city', type: 'circle', source: 'regions', paint: { 'circle-radius': 3.2, 'circle-color': '#f4eede', 'circle-stroke-color': ['get', 'line'], 'circle-stroke-width': 1.5 } });
  m.addLayer({ id: 'reg-citylab', type: 'symbol', source: 'regions', minzoom: 7, layout: { 'text-field': ['get', 'name'], 'text-font': fontReg, 'text-size': 10.5, 'text-offset': [0, 0.9], 'text-anchor': 'top', 'text-optional': true }, paint: { 'text-color': ['get', 'line'], 'text-halo-color': 'rgba(244,238,222,.92)', 'text-halo-width': 1.4 } });
  mapRegionsOk = true;
  document.getElementById('mapEraRow').hidden = false;
  applyEra();
}
function applyEra() {
  const note = document.getElementById('mapEraNote'), E = MAP_ERAS[mapEra];
  document.querySelectorAll('#mapEra button').forEach(b => b.classList.toggle('on', b.dataset.e === mapEra));
  if (note) note.textContent = E.note;
  if (!mapMain || !mapRegionsOk) return;
  REG_LAYERS.forEach(id => {
    if (!mapMain.getLayer(id)) return;
    mapMain.setLayoutProperty(id, 'visibility', (mapEra === 'off' || id === 'reg-label' || id === 'reg-label-s') ? 'none' : 'visible'); // area names now float above the photos (renderPlaceLabels)
    if (mapEra !== 'off') mapMain.setFilter(id, regFilter(id));
  });
}
document.querySelectorAll('#mapEra button').forEach(b => b.addEventListener('click', () => {
  mapEra = b.dataset.e;
  try { localStorage.setItem('foreverMapEra2', mapEra); } catch (e) { /* ignore */ }
  applyEra();
  renderMapFilterUI();
}));

let mapBuilding = false;
function ensureMainMap() {
  if (mapMain) { requestAnimationFrame(() => mapMain.resize()); return; }
  if (mapBuilding) return;
  if (typeof maplibregl === 'undefined') { const m = document.getElementById('mapMsg'); m.textContent = 'The map library could not load. Check your connection and reload.'; m.hidden = false; return; }
  mapBuilding = true;
  loadNatureStyle().then(st => { mapBuilding = false; buildMainMap(st); });
}
function buildMainMap(style) {
  mapMain = new maplibregl.Map({ container: 'bigMap', style, center: [35.34, 32.15], zoom: 6.6, minZoom: 3, attributionControl: false });
  mapMain.addControl(new maplibregl.AttributionControl({ compact: true }));
  mapMain.dragRotate.disable(); mapMain.touchZoomRotate.disableRotation();
  mapMain.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
  // keep the attribution just above whatever sits at the bottom (filter dock, or the event card when open)
  const insetUpdate = mapInset;
  if (typeof ResizeObserver !== 'undefined') {
    const ro = new ResizeObserver(insetUpdate);
    ['mapDock', 'mapCard'].forEach(id => { const el = document.getElementById(id); if (el) ro.observe(el); });
    const wrapEl = document.querySelector('#screen-map .map-wrap'); if (wrapEl) ro.observe(wrapEl);
    const rm = new ResizeObserver(() => { if (mapMain) { mapMain.resize(); renderMarkers(); } });
    rm.observe(document.getElementById('bigMap'));
  }
  insetUpdate();
  mapMain.on('error', e => {
    if (e && (e.sourceId === 'nature-dem' || /elevation-tiles/.test(String((e.error && e.error.message) || '') + String(e.tile && e.tile.tileID ? '' : '')))) return; // terrain is optional
    if (!mapMainReady && !mapStyleFailed && e && e.error && /style|fetch|Failed|network/i.test(String(e.error.message || e.error))) {
      mapStyleFailed = true;
      const m = document.getElementById('mapMsg'); m.textContent = 'The base map could not load. Check your connection and reload.'; m.hidden = false;
    }
  });
  const onMapReady = () => {
    if (mapMainReady) return;
    // Quiet the base map: every base-map name comes off (modern towns, seas, roads, shops), so each place shows once,
    // from our own list of Bible places (MAP_PLACES) and nothing else competes with the photos.
    (mapMain.getStyle().layers || []).forEach(layer => {
      if (layer.type !== 'symbol') return;
      try { mapMain.setLayoutProperty(layer.id, 'visibility', 'none'); } catch (e) {}
    });
    mapMainReady = true;
    setTimeout(mapPreloadHeroes, 300);
    fetch('data/regions.json').then(r => (r.ok ? r.json() : null)).then(d => { if (d && mapMain) { try { addRegionLayers(d); } catch (e) { /* borders optional */ } } }).catch(() => {});
    applyMapFilters(true);
    mapMain.on('moveend', renderMarkers);
    mapMain.on('click', () => { if (mapWalk) return; const ask = document.getElementById('mapCard').dataset.ask; if (ask) { document.getElementById('mapCard').dataset.ask = ''; } document.getElementById('mapCard').hidden = true; setMapSel(null); mapFiltOpen(false); });
  };
  // style.load fires as soon as the style itself is ready, so a blocked terrain/elevation tile can never keep the map from starting
  mapMain.on('style.load', onMapReady); mapMain.on('load', onMapReady);
}

function setMapSel(id) {
  mapSelId = id;
  mapMarkers.forEach(rec => rec.el.classList.toggle('sel', id != null && rec.ids.includes(id)));
}

const kindBadge = k => `<span class="mc-kind" style="--kc:${MAP_KINDS[k].color}">${KIND_SVG[k]}${MAP_KINDS[k].label}</span>`;
function galleryHTML(e) {
  const imgs = mapImgs(e);
  if (!imgs.length) return '';
  const slides = imgs.map((im, k) => {
    const pg = mapImgPage(im);
    return `<figure class="mc-slide"><div class="mc-img"><img src="${escHtml(mkThumb(im, 900))}" alt="${escHtml(im.c || '')}" loading="${k ? 'lazy' : 'eager'}" decoding="async">${kindBadge(im.k)}</div>
      <figcaption>${escHtml(im.c || '')}${im.a ? ` <span class="mc-cr">· ${escHtml(im.a)}</span>` : ''}${pg ? ` <a class="mc-src" href="${escHtml(pg)}" target="_blank" rel="noopener">${/commons/.test(pg) ? 'Source &amp; license' : 'Source'} ›</a>` : ''}</figcaption></figure>`;
  }).join('');
  return `<div class="mc-gal"><div class="mc-track">${slides}</div>${imgs.length > 1 ? `<div class="mc-dots">${imgs.map((im, k) => `<i class="${k ? '' : 'on'}"></i>`).join('')}</div>` : ''}</div>`;
}
function selectEvent(e, fly) {
  setMapSel(e.i);
  const card = document.getElementById('mapCard');
  const col = MAP_BOOK_COLORS[evPrimaryBook(e)] || '#8a6d0b';
  card.style.borderLeftColor = col;
  mapFiltOpen(false);
  const story = mapActiveStory();
  let stepBar = '';
  card.classList.toggle('walking', !!mapWalk); card.dataset.ask = '';
  if (mapWalk) stepBar = walkBar();
  else if (story && !e.chapterPin && story.match(e)) {
    const seq = mapStoryEvents(), k = seq.findIndex(x => x.i === e.i);
    stepBar = `<div class="mc-step"><span>Stop ${e.i} of ${mapMaxI}</span><button type="button" data-step="-1"${k <= 0 ? ' disabled' : ''}>‹ Back</button><button type="button" data-step="1"${k < 0 || k >= seq.length - 1 ? ' disabled' : ''}>Next ›</button></div>`;
  }
  card.innerHTML = `<button type="button" class="mc-x" aria-label="Close">&times;</button>
    ${stepBar}
    ${galleryHTML(e)}
    ${e.p ? `<p class="mc-place">${escHtml(e.p)}</p>` : ''}
    <p class="mc-title">${escHtml(e.t)}</p>
    ${e.s ? `<p class="mc-sum">${escHtml(e.s)}</p>` : ''}
    ${e.n ? `<p class="mc-note">${escHtml(e.n)}</p>` : ''}
    <div class="mc-refs">${(e.r || []).map((r, k) => `<button type="button" class="mc-ref" data-k="${k}">${escHtml(refLabel(r))} ›</button>`).join('')}</div>
    <button type="button" class="mc-dive">Open chapter Deep Dive</button>`;
  card.hidden = false; card.scrollTop = 0;
  // keep the selected photo visible above the card (the card is about as tall as its content, up to its max)
  const isWide = mapSideCard();
  const padCard = isWide ? { top: 70, bottom: (document.getElementById('mapDock').offsetHeight || 60) + 30, left: 30, right: card.offsetWidth + 40 }
    : { top: 70, bottom: Math.min(card.offsetHeight, card.parentElement.clientHeight * 0.56) + (document.getElementById('mapDock').offsetHeight || 80) + 34, left: 20, right: 20 };
  if (fly && mapWalk) {
    // walking: a slow, gentle glide that stays pulled back so you can see the road between stops
    const z = mapMain.getZoom(), first = !mapWalk.moved;
    mapWalk.moved = true;
    mapMain.flyTo({ center: [e.ln, e.la], zoom: first ? 9.2 : Math.max(8.4, Math.min(10, z)), padding: padCard, duration: 2600, curve: 1.3, speed: 0.5, essential: true });
  }
  else if (fly) mapMain.flyTo({ center: [e.ln, e.la], zoom: Math.max(mapMain.getZoom(), 11.5), padding: padCard, duration: 600 });
  else mapMain.easeTo({ center: [e.ln, e.la], padding: padCard, duration: 450 });
  card.querySelector('.mc-x').addEventListener('click', () => { card.hidden = true; setMapSel(null); });
  if (mapWalk) walkWire(card);
  card.querySelectorAll('[data-step]').forEach(b => b.addEventListener('click', () => {
    const seq = mapStoryEvents(), k = seq.findIndex(x => x.i === e.i), nx = seq[k + Number(b.dataset.step)];
    if (nx) selectEvent(nx, true);
  }));
  card.querySelectorAll('.mc-ref').forEach(b => b.addEventListener('click', () => { const r = e.r[Number(b.dataset.k)]; openPassage(r[0], r[1], r[2], false); }));
  card.querySelector('.mc-dive').addEventListener('click', () => { const r = (e.r.find(x => x[0] === mapF.book) || e.r[0]); openPassage(r[0], r[1], r[2], true); });
  const track = card.querySelector('.mc-track');
  if (track) {
    const dots = card.querySelectorAll('.mc-dots i');
    track.addEventListener('scroll', () => { const k = Math.round(track.scrollLeft / Math.max(1, track.clientWidth)); dots.forEach((d, j) => d.classList.toggle('on', j === k)); }, { passive: true });
    card.querySelectorAll('.mc-img img').forEach(im => im.addEventListener('error', () => { im.replaceWith(Object.assign(document.createElement('span'), { className: 'mc-noimg', textContent: 'Image unavailable offline' })); }));
  }
}
function evThumb(e, w) { const h = mapHero(e); return h ? `<img src="${escHtml(mkThumb(h, w))}" alt="" loading="lazy" decoding="async" onerror="this.remove()">` : ''; }
// ----- Story walk-through: one stop at a time, with a bar showing how much is left -----
let mapWalk = null; // { mode: 'full' | 'short', seq: [events], k: index of the current stop }
function walkSeq(mode) {
  const cur = mapActiveStory(), all = mapStoryAll();
  const list = cur && (mode === 'short' ? cur.short : cur.key);
  if (list) { const keys = new Set(list), sel = all.filter(e => keys.has(e.i)); if (sel.length >= 2) return sel; }
  return all;
}
// asked right after a story is picked, while every picture and the whole path are still showing
function walkAsk() {
  const cur = mapActiveStory(); if (!cur || mapWalk) return;
  const card = mapEl('mapCard'), nFull = walkSeq('full').length, nShort = walkSeq('short').length;
  setMapSel(null); mapFiltOpen(false);
  card.classList.remove('walking'); card.style.borderLeftColor = cur.color; card.dataset.ask = '1';
  card.innerHTML = `<button type="button" class="mc-x" aria-label="Not now">&times;</button>
    <p class="mc-place">${escHtml(cur.name)}</p>
    <p class="mc-title">Walk through this story step by step?</p>
    <p class="mc-sum">You will see one place at a time and tap Next to move on. A bar shows how much of the story is left.</p>
    <div class="wk-btns">
      <button type="button" class="wk-go" data-w="full">Yes, take me through the full story<small>${nFull} stops, in order</small></button>
      ${nShort < nFull ? `<button type="button" class="wk-go alt" data-w="short">Yes, give me the short version<small>${nShort} key moments</small></button>` : ''}
      <button type="button" class="wk-no" data-w="no">Not now, I will explore on my own</button>
    </div>`;
  card.hidden = false; card.scrollTop = 0;
  card.querySelector('.mc-x').addEventListener('click', () => { card.hidden = true; card.dataset.ask = ''; });
  card.querySelectorAll('[data-w]').forEach(b => b.addEventListener('click', () => {
    if (b.dataset.w === 'no') { card.hidden = true; card.dataset.ask = ''; return; }
    walkStart(b.dataset.w);
  }));
  mapInset();
  setTimeout(() => fitMapToShown(Math.min(card.offsetHeight, card.parentElement.clientHeight * 0.5)), 60); // keep the whole path in view above the question
}
function walkStart(mode) {
  const seq = walkSeq(mode); if (!seq.length) return;
  mapWalk = { mode, seq, k: 0 };
  mapFiltOpen(false); setMapSel(null);
  walkRender(true);
}
function walkRender(fly) {
  const w = mapWalk; if (!w) return;
  renderMarkers(); updateStoryPath(); renderMapFilterUI();
  mapEl('mapCount').textContent = '';
  selectEvent(w.seq[w.k], fly);
}
function walkStep(d) {
  const w = mapWalk; if (!w) return;
  const k = w.k + d;
  if (k < 0) return;
  if (k >= w.seq.length) { walkFinish(); return; }
  w.k = k; walkRender(true);
}
function walkEnd(fit) {
  mapWalk = null;
  const card = mapEl('mapCard'); card.hidden = true; card.classList.remove('walking'); setMapSel(null);
  pushMapData(); updateStoryPath(); renderMapFilterUI();
  const n = mapStoryAll().length; mapEl('mapCount').textContent = n + (n === 1 ? ' stop' : ' stops');
  if (fit !== false) fitMapToShown();
}
function walkFinish() {
  const w = mapWalk, cur = mapActiveStory(); if (!w || !cur) return;
  const card = mapEl('mapCard'), nFull = walkSeq('full').length;
  setMapSel(null); card.classList.add('walking'); card.style.borderLeftColor = cur.color; card.dataset.ask = '';
  mapEl('mapCount').textContent = '';
  card.innerHTML = `<p class="mc-place">${escHtml(cur.name)}</p>
    <p class="mc-title">That is the whole journey</p>
    <p class="mc-sum">You have walked all ${w.seq.length} stops. Look at the whole route on the map, or take the walk again.</p>
    <div class="wk-btns">
      <button type="button" class="wk-go" data-w="all">See the whole route</button>
      <button type="button" class="wk-go alt" data-w="again">Walk it again</button>
      ${w.mode === 'short' && nFull > w.seq.length ? `<button type="button" class="wk-go alt" data-w="full">Take the full story (${nFull} stops)</button>` : ''}
      <button type="button" class="wk-no" data-w="back">Back to the last stop</button>
    </div>`;
  card.hidden = false; card.scrollTop = 0;
  card.querySelectorAll('[data-w]').forEach(b => b.addEventListener('click', () => {
    const a = b.dataset.w;
    if (a === 'all') walkEnd(true);
    else if (a === 'again') walkStart(w.mode);
    else if (a === 'full') walkStart('full');
    else if (a === 'back') walkRender(true);
  }));
  mapInset();
  if (mapMain) { const pts = w.seq.map(e => [e.ln, e.la]); const b = new maplibregl.LngLatBounds(pts[0], pts[0]); pts.forEach(p => b.extend(p)); mapMain.fitBounds(b, { padding: { top: 60, bottom: Math.min(card.offsetHeight, card.parentElement.clientHeight * 0.5) + 140, left: 30, right: 30 }, maxZoom: 10, duration: 700 }); }
}
function walkBar() {
  const w = mapWalk, n = w.seq.length, k = w.k, left = n - 1 - k, e = w.seq[k];
  const per = MAP_PERIODS.find(p => e.i >= p.a && e.i <= p.b);
  const ticks = MAP_PERIODS.slice(1).map(p => { const idx = w.seq.findIndex(x => x.i >= p.a); return idx > 0 && n > 1 ? `<i style="left:${(idx / (n - 1) * 100).toFixed(1)}%"></i>` : ''; }).join('');
  return `<div class="wk-bar">
    <div class="wk-top"><span><b>Stop ${k + 1} of ${n}</b> · ${left ? left + ' to go' : 'the last stop'}</span><button type="button" class="wk-end" data-w="end">End walk</button></div>
    <div class="wk-track" role="progressbar" aria-valuemin="1" aria-valuemax="${n}" aria-valuenow="${k + 1}"><u style="width:${((k + 1) / n * 100).toFixed(1)}%"></u>${ticks}</div>
    <div class="wk-per">${per ? escHtml(per.n) : ''}</div>
    <div class="wk-nav"><button type="button" data-w="back"${k ? '' : ' disabled'}>‹ Back</button><button type="button" class="go" data-w="next">${left ? 'Next stop ›' : 'Finish ✓'}</button></div>
  </div>`;
}
function walkWire(card) {
  card.querySelectorAll('.wk-bar [data-w]').forEach(b => b.addEventListener('click', () => {
    const a = b.dataset.w;
    if (a === 'next') walkStep(1); else if (a === 'back') walkStep(-1); else if (a === 'end') walkEnd(true);
  }));
}
// markers while walking: the stop you are on is a photo; stops already passed are small numbered dots
function renderWalkMarkers() {
  const w = mapWalk, keep = new Set();
  w.seq.slice(0, w.k + 1).forEach((e, idx) => {
    const cur = idx === w.k, key = 'w' + e.i + (cur ? ':c' : ':d') + '|' + w.mode + '|' + mapPins;
    keep.add(key);
    if (mapMarkers.has(key)) return;
    const hero = mapHero(e), no = idx + 1, bcol = MAP_BOOK_COLORS[evPrimaryBook(e)] || '#8a6d0b';
    const wrap = document.createElement('div');
    wrap.className = 'pm-wrap ' + (cur ? 'wcur' : 'wdot') + (mapPins === 'dots' || !cur ? ' dots' : '');
    if (cur && mapPins === 'photos' && hero) {
      const kcol = MAP_KINDS[hero.k].color;
      wrap.innerHTML = `<div class="pm" style="--kc:${kcol};--bc:${bcol}" title="${escHtml(e.t)}"><img src="${escHtml(mkThumb(hero, 120))}" alt="" decoding="async" draggable="false"><span class="pm-k">${KIND_SVG[hero.k]}</span><span class="pm-no">${no}</span><span class="pm-lab">${escHtml(e.t)}</span></div>`;
    } else if (cur) wrap.innerHTML = `<div class="pd" style="--bc:${bcol}" title="${escHtml(e.t)}">${no}</div><span class="pm-lab">${escHtml(e.t)}</span>`;
    else wrap.innerHTML = `<div class="pd sm" style="--bc:${bcol}" title="${escHtml(e.t)}">${no}</div>`;
    mapImgRetry(wrap);
    wrap.addEventListener('click', ev => { ev.stopPropagation(); if (mapWalk && idx !== mapWalk.k) { mapWalk.k = idx; walkRender(true); } });
    const m = new maplibregl.Marker({ element: wrap, anchor: 'center' }).setLngLat([e.ln, e.la]).addTo(mapMain);
    mapMarkers.set(key, { m, el: wrap, ids: [e.i], hub: null });
  });
  mapMarkers.forEach((rec, key) => { if (!keep.has(key)) { rec.m.remove(); mapMarkers.delete(key); } });
  mapMarkers.forEach(rec => rec.el.classList.toggle('sel', rec.ids.includes(w.seq[w.k].i) && rec.el.classList.contains('wcur')));
  renderPlaceLabels();
}
function showPicker(evs, title) {
  evs.sort((a, b) => a.i - b.i);
  const card = document.getElementById('mapCard');
  setMapSel(null);
  card.classList.remove('walking'); card.dataset.ask = '';
  card.style.borderLeftColor = '#8a6d0b';
  card.innerHTML = `<button type="button" class="mc-x" aria-label="Close">&times;</button><p class="mc-place">${title ? escHtml(title) + ' · ' : ''}${evs.length} events here</p>` +
    evs.map(e => `<button type="button" class="mc-pick" data-i="${e.i}">${mapActiveStory() && typeof e.i === 'number' ? `<span class="no">${e.i}</span>` : ''}<span class="th">${evThumb(e, 80)}</span><span class="tx"><b>${escHtml(e.t)}</b><span>${escHtml(evRefs(e))}</span></span></button>`).join('');
  card.hidden = false; card.scrollTop = 0;
  card.querySelector('.mc-x').addEventListener('click', () => { card.hidden = true; });
  card.querySelectorAll('.mc-pick').forEach(b => b.addEventListener('click', () => selectEvent(EV_BY_ID[b.dataset.i] || evs.find(x => String(x.i) === b.dataset.i), true)));
}

function openMapList() {
  if (mapWalk) walkEnd(false);
  mapFiltOpen(false); document.getElementById('mapCard').hidden = true;
  const list = mapShown.slice().sort((a, b) => mapOrderKey(a) - mapOrderKey(b));
  const story = mapActiveStory();
  document.getElementById('mapListTitle').textContent = story ? story.name.toUpperCase() + ' · IN ORDER · ' + list.length : (mapF.book === 'all' ? 'IN THE ORDER OF JESUS’ LIFE' : mapBookName(mapF.book).toUpperCase() + ' · IN READING ORDER') + ' · ' + list.length;
  document.getElementById('mapListBody').innerHTML = list.length ? list.map(e => `<button type="button" class="map-li" data-i="${e.i}">${story && typeof e.i === 'number' ? `<span class="no">${e.i}</span>` : ''}<span class="th" style="--bc:${MAP_BOOK_COLORS[evPrimaryBook(e)]}">${evThumb(e, 80)}</span><div><b>${escHtml(e.t)}</b><span>${escHtml(evRefs(e))}${e.p ? ' · ' + escHtml(e.p) : ''}</span></div></button>`).join('') : '<p class="mc-sum">Nothing to list yet.</p>';
  document.querySelectorAll('#mapListBody .map-li').forEach(b => b.addEventListener('click', () => {
    document.getElementById('mapList').hidden = true;
    const ev = EV_BY_ID[b.dataset.i]; if (ev) { selectEvent(ev, true); }
  }));
  document.getElementById('mapList').hidden = false;
}

function scrollToVerseIn(el) {
  let p = el.parentElement;
  while (p && p !== document.body) {
    if (/(auto|scroll)/.test(getComputedStyle(p).overflowY) && p.scrollHeight > p.clientHeight) {
      p.scrollTop = el.getBoundingClientRect().top - p.getBoundingClientRect().top + p.scrollTop - 90; return;
    }
    p = p.parentElement;
  }
}
async function openPassage(book, ch, v, deep) {
  currentBook = book; currentChapterNum = ch;
  await loadChapter();
  if (deep) { goToScreen('deepdive'); ddToTop(); return; }
  goToScreen('read');
  setTimeout(() => {
    const el = document.querySelector(`#verseList .verse[data-verse="${v}"]`);
    if (el) { scrollToVerseIn(el); el.classList.add('map-flash'); setTimeout(() => el.classList.remove('map-flash'), 2200); }
  }, 80);
}

// Every time the Map is opened from another tab or page it starts fresh: no filters, no story, no overlay, no open
// card or list, and the default view (a map opened to show one place keeps that place, because it flies there afterwards).
function showMapScreen(fresh) {
  mapWireFilters(); mapInset();
  if (fresh) {
    mapEra = 'off'; try { localStorage.setItem('foreverMapEra2', 'off'); } catch (e) { /* ignore */ }
    try { applyEra(); } catch (e) { /* map not built yet */ }
    mapF = { tst: 'all', book: 'all', chapter: 'all', from: 1, to: mapMaxI };
    mapKind = 'all'; mapPins = 'photos'; mapStory = ''; mapWalk = null;
    try { localStorage.setItem('foreverMapPins', 'photos'); localStorage.setItem('foreverMapStory', ''); } catch (e) { /* ignore */ }
    document.querySelectorAll('#mapLegend button').forEach(x => x.classList.remove('on'));
    try { mapFiltOpen(false); } catch (e) { /* ignore */ }
    mapEl('mapCard').hidden = true; mapEl('mapCard').classList.remove('walking'); mapEl('mapList').hidden = true; setMapSel(null);
    if (mapFocusMk) { mapFocusMk.remove(); mapFocusMk = null; }
  }
  loadEvents().then(() => {
    if (fresh) { mapF.to = mapMaxI; mapF.from = 1; }
    ensureMainMap();
    if (mapMainReady) { mapMain.resize(); applyMapFilters(!!fresh); requestAnimationFrame(() => mapMain.resize()); } // size first, so the camera is aimed at the real size
    else renderMapControls();
  });
}
document.querySelectorAll('#mapTst button').forEach(b => b.addEventListener('click', () => {
  mapF.tst = b.dataset.t;
  if (mapF.book !== 'all' && mapF.tst !== 'all' && MAP_TST[mapF.book] !== mapF.tst) { mapF.book = 'all'; mapF.chapter = 'all'; }
  applyMapFilters(true);
}));
document.getElementById('mapChapter').addEventListener('change', e => { mapF.chapter = e.target.value; applyMapFilters(true); });
document.getElementById('mapListBtn').addEventListener('click', openMapList);
document.querySelectorAll('#mapLegend button').forEach(b => b.addEventListener('click', () => {
  mapKind = (mapKind === b.dataset.k) ? 'all' : b.dataset.k;
  document.querySelectorAll('#mapLegend button').forEach(x => x.classList.toggle('on', x.dataset.k === mapKind));
  pushMapData();
  renderMapFilterUI();
}));
document.getElementById('mapListX').addEventListener('click', () => { document.getElementById('mapList').hidden = true; });


// ---------- Init ----------
// ---------- First-run guide (welcome popup, 10 steps, optional map guide) ----------
const TOUR_KEY = 'vi_tour_done';
const TOUR_PREV = {
  verse: '<div class="tp tp-v"><small>LUKE 2:2</small><p>“This was the first census to take place while Quirinius was governor of Syria.”</p><div class="tp-chips"><span><b>αὕτη</b>This</span><span><b>ἀπογραφὴ</b>registration</span><span><b>πρώτη</b>first</span><span><b>ἐγένετο</b>took place</span></div><div class="tp-cms"><div><b>C.S. Lewis</b>Laments how commercial Christmas has become and calls hearts back to the plain…</div><div><b>John Piper</b>God uses even mighty rulers and global events to advance His purposes…</div></div></div>',
  dive: '<div class="tp tp-d"><div class="tp-tabs"><i class="on">Overview</i><i>Setting &amp; History</i><i>Translation</i><i>Commentary</i></div><div class="tp-sum"><b>SUMMARY</b>A decree from Caesar Augustus sends Joseph and Mary to Bethlehem, where Jesus is born and laid in a manger.</div><div class="tp-grid"><div><b>SETTING</b><u></u>Nazareth to Bethlehem, Judea</div><div><b>HISTORY</b>Roman rule: Augustus rules the Mediterranean world</div><div><b>CUSTOMS</b>“The inn”: Luke’s word can mean a guest room</div><div><b>TRANSLATIONS</b>εὐαγγελίζω – Good news</div></div></div>',
  map: '<svg viewBox="0 0 300 170" class="tp-svg" aria-hidden="true"><rect width="300" height="170" fill="#ece4cf"/><path d="M0 0H92C104 30 88 52 96 84C102 112 90 140 100 170H0Z" fill="#c4d8da"/><path d="M118 0H178L186 52L176 108L190 170H108L116 96L108 40Z" fill="#e4dcc0" opacity=".9"/><path d="M96 38L186 30M100 98L190 108" stroke="#a9805a" stroke-width="1.2" stroke-dasharray="4 3" fill="none"/><path d="M130 118C138 92 150 70 160 46L170 30" stroke="#8a6d0b" stroke-width="2" stroke-dasharray="1 4" stroke-linecap="round" fill="none"/><g><circle cx="168" cy="30" r="10" fill="#e8685f" stroke="#fff" stroke-width="2"/><circle cx="150" cy="62" r="10" fill="#e8685f" stroke="#fff" stroke-width="2"/><circle cx="134" cy="122" r="10" fill="#e8685f" stroke="#fff" stroke-width="2"/><circle cx="148" cy="96" r="7" fill="#e8685f" stroke="#fff" stroke-width="2"/></g><g font-family="IBM Plex Sans,sans-serif" font-size="9" fill="#fff"><rect x="178" y="24" width="54" height="15" rx="7.5" fill="#2b2a26" opacity=".85"/><text x="205" y="34.5" text-anchor="middle">Capernaum</text><rect x="160" y="56" width="44" height="15" rx="7.5" fill="#2b2a26" opacity=".85"/><text x="182" y="66.5" text-anchor="middle">Nazareth</text><rect x="146" y="130" width="46" height="15" rx="7.5" fill="#2b2a26" opacity=".85"/><text x="169" y="140.5" text-anchor="middle">Jerusalem</text></g></svg>',
  time: '<svg viewBox="0 0 300 170" class="tp-svg" aria-hidden="true"><rect width="300" height="170" fill="#f4efe3"/><g font-family="IBM Plex Sans,sans-serif" font-size="8.5"><text x="10" y="14" fill="#8a6d0b" letter-spacing="1.4">TIMELINE</text><line x1="10" y1="52" x2="290" y2="52" stroke="#8a6d0b" stroke-width="1.5"/><g fill="#8a6d0b"><circle cx="32" cy="52" r="4"/><circle cx="92" cy="52" r="4"/><circle cx="152" cy="52" r="4"/><circle cx="212" cy="52" r="4"/><circle cx="268" cy="52" r="4"/></g><g fill="#fffaf0" stroke="#d8cfb6"><rect x="12" y="22" width="40" height="18" rx="5"/><rect x="72" y="62" width="40" height="18" rx="5"/><rect x="132" y="22" width="40" height="18" rx="5"/><rect x="192" y="62" width="40" height="18" rx="5"/><rect x="248" y="22" width="40" height="18" rx="5"/></g><g fill="#4a4538" text-anchor="middle"><text x="32" y="34">Creation</text><text x="92" y="74">Exodus</text><text x="152" y="34">Kings</text><text x="212" y="74">Jesus</text><text x="268" y="34">Church</text></g><text x="10" y="100" fill="#8a6d0b" letter-spacing="1.4">CONNECTIONS</text></g><g fill="#d8cfb6"><rect x="10" y="150" width="34" height="14" rx="3"/><rect x="50" y="150" width="44" height="14" rx="3"/><rect x="100" y="150" width="30" height="14" rx="3"/><rect x="136" y="150" width="60" height="14" rx="3"/><rect x="202" y="150" width="40" height="14" rx="3"/><rect x="248" y="150" width="42" height="14" rx="3"/></g><g fill="none" stroke-width="1.6" stroke-linecap="round"><path d="M27 150C40 90 110 90 118 150" stroke="#8c4646"/><path d="M72 150C90 108 200 108 222 150" stroke="#7b5a8a"/><path d="M165 150C180 100 250 100 268 150" stroke="#8c4646"/><path d="M118 150C140 118 170 118 180 150" stroke="#3f7a6b"/></g></svg>'
};
// The pictures in step 1 are built in (so no extra files are needed on the site).
const TOUR_IMG = {verse:'data:image/jpeg;base64,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',dive:'data:image/jpeg;base64,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',map:'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAQDAwMDAgQDAwMEBAQFBgoGBgUFBgwICQcKDgwPDg4MDQ0PERYTDxAVEQ0NExoTFRcYGRkZDxIbHRsYHRYYGRj/2wBDAQQEBAYFBgsGBgsYEA0QGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBj/wAARCAGXAY0DASIAAhEBAxEB/8QAHQAAAAcBAQEAAAAAAAAAAAAAAAECAwQFBgcICf/EAEwQAAEDAwMCBAMGBAIHBQUJAAECAwQABREGEiExQQcTIlEUYXEVIzJCgZEIUqGxFsEkM0Ni0dLwF1OCssJWcpWiwyU0Y4STs9Ph8f/EABoBAAIDAQEAAAAAAAAAAAAAAAABAgMEBQb/xAA1EQACAQMDAgMHAgYCAwAAAAAAAQIDESEEEjEFQRNRYSIycZGhsfCBwRQVQnLR4SMzQ7Lx/9oADAMBAAIRAxEAPwDult1g7OgGMrG7GW1nr9KJCWnVLflOEq+Zpm8aOYtUZDVukLMppOShX+0+n/Csv9pzw8Y8llTeO5GK4D9TXZdjSQGGZFwIYQVEmr+5W5btnTESUpdB4NVVnulut1s88kecegPerG3Qrren03J10sxt2RnvTRFjdjs9utsdUVQSH1KKnHD71T6mvjz8QWll4lvcQCk9af1eqXby8lr1KWk7Vp71S2C35Qh6erKic80n5EvUZt9lnQICX4TzgUo5ODyKstsuMy2+48tT6umT0NaSOwlu4BtCgptY4xVbcobvxiErOzYe9FhXuSrfqW5WeKVz2EubhkE+1IVrFua8G/h1NAnrnNWgtUeRaA5LcCsCoCLXAcOxhoHBzkU8iTRZSlMzrMlh0BW4elY61Uw7axaStxtWc8nNSpCSwhLSRhKf6VFSh25PCIwolSjjI7UNgKuF7jvRfh2MreJxV5przoDI+PUUqcxtz2p+1aKgwnm33cvvZz8gayXi54x+GnhfshammSrjetu5Note0upB6F1ROED+vyqcIybuCfkdO+Lz6QMk96d+ISl4IUQOK8pW3+OLSYmpjTfC24RYIOPiGLuH3QPfYptIz8t1deZ8QHvEbTEe8+DTUS/pWoIkNyngy/BUezrRI/cKx9alVl4cXJq/wV2Tirux1NJSkEjG6m1KysLyPYiuSztLazSkL174y2/TuRn4O3rAWB7cFB/81Ui7B4UhZEzxm1M893WhDxBP/wCmf71z5a+a/wDHb+6UV9LmmGlcsq7+CbO2JCGHHQs4QrvWedZmXO7l8Haw3wmufRNK2Z/06R8fJDTh/BHuZUlKj7YWpP8A5TVlJleMOhoRcu9khaltQG4z7XysJ9yAAcf+HHzprXO15waXmrSX0u/oKWncXa+fXH3Nw+zvby45kDikIJbjkJPBrGWjX1r1KkItrxQ7+dhz0rT+la2E0takBRzWunVhVjug7oplFxdmToMFsq850ZJq2QlA4A4phLexICe1OpCgKtREcWPThNElCxzSRvSMgZpaFrzlSSBQIVjt3pKkhIx3pf41dcD3owkJVyd1MCMplJTmmPhEkEkZzVg61uaKgccUy2khKQTweM0AVsiG0EYUBzVem2j4j0gGrp8pG7d296jMPBK8gA0AV78Z2LMbfShvYhCgQpW0J7k9Pl/Sre3uNS46XAkJJzlPzqPMbW+kqeIU3g5TjOR7VGt63G3GgygJDmFLznjCecfTKQT3J+VWJbot+RROWyS8mTpTIbeSpCcc1KQoqdSCOop13a4ylRAz3pTewuZA/CKqLxQXtVwKMhRTk0fpP1obwngmmAbajjBpfBqOp8A4QnNI85z/ALs0AShSVrSjrTPmur4CMU42xxlasmgAeekjpRB5QOcGnQhCeQKX6PYUAMF0nsaPcSOlO7kdCBQ3JpgM4Ur5Ufl8cmlKUKaUVkcHikAZKUd6aW8VYx2obefVzQ8sK6UAc1vV4cmai84R3GkJO1Oev1qaq3ovz7LbrCUkAZWByRUplESVcNvmNnB71oY6o0OQkrW0PmCKqtccimk6SssVtrzYuSkg5KjWhDaE2rZHSEs+ThIHaqK7XxEuamKwytbSVcue9Ozb9HYtyYrIVuxjmjBC5HiR0ltz45hDycnHmDOKQ5b7VOBRs8lY/CpHSoVx1Kv4ARojO9wjkgUzZl3JCVPyIxVnok1EPUSqFdLO6XW2/im/y7easGrLLvUH4y4pXHxyEd6trQ3IccXLmNFlA6IJ61dvSI6YRcUoBGMEntTSEZI2WZIbTGiyE+SOCSeRUlcWPbYyWWTufT1+dVkjVMGNPWzCd81ecYTVzYmXH3FXSb6VK4SDQDRSLh3a5OFsMFAJ/ERitRY7BGtTRUVb38epXt9Ks9gBU4QBjnioj8kNP7yfu3BjPtTSsBG1VqNrSHh3f9WFO/7LhOSEg9CsDCc/qRXyxfup1Xr9d31ddX2xcJfmzpqW/NWgKPqUE5GcDoK+n2r9Pvaz8JNUaTi5U7cLe40ggcFX4kj6kjFfL22IgWPW7DWrbM/MiRJOydb0ulhxYScKRuHKTWiHukondNV+CfhmPAy9670fL15AVa1IDTup4rTDF0CvzRwEJVj65+lYf+HrXs7QfjlaXmn1pt9ycFvnMpVgONuHb+4JBB7Vv9VeOfhmvwSvehtMRde3cXHaIrGq5DT7FqSO0dQWpeB2BrlvglpKXrLxxsFtjoPkMSUzJT2PSy00d6lqPYDFTY0dt17JmWHxGu1lZDavhZK21LcUVK65H9D86wty1BqJlL3kzUNg8IWGkq8v5HI5rXarduWufGa+zrEw7KTKlrcLRUlKAjON29ZCUDjqogfSt5Z/B3RjcHdrHWHmvPtguR7G6xIDP8qVL3Kyr6Ix8zW6n0vQ0qdvDV/VX+9y6Wt1VR++/wBMfY88W7xKv7TYMxDEsBWCVI8snn5V2fwt8V9XFTr+l03VpmMR57Sm1OxCeu0n8O75cKrRRPBbwriXVTsJd3uxUR9zdnlJaHzOxhoH6FZHyrobFrs9rs7ce3sfEtN+hmDAjGM1HyecJKAgAn+VP6iuVV6PRb3Q9l+ccG2hqq9rVXuXk8kRtnSXi258TbUo0prpob21snazLUP8/wCv1q00Tqucm+vaT1bGMG/xOFJUMB8D8yaqNXeHM2z6M/xnNei2S4tuhTMNjgkZ4yof7Tvx+pp5uUvxY0OJ8dSI+utPpDzElB2qlNp5/U/5/WuLOFXTVePa5xxNftJfUnWpU6kPEp+7/wCv+jrTTiVn8WamoSnbXPPD3xGtGu202uYgWjUrQIWwoYbklPVSPY+46g+9bttTjTpYeSUuJ4INdinONSCqQd0zlSTi7MkjAGaSpzJwkUoYKMUkDaqpkQtmVcHFAAIORzSwnnJonQA36etAxlb7hV92Mj2pkvbUqCgQTzj2NWKG0tsZA5IzUfy0lzepIPNAFW0zOmSFJWgpbJ/Eas0Qo8dvYRn51KKwhsFKc/IVEdeCnBv9Oe1ADMmGt1haGXSjKSEqHVJx1qPBba8gOJRtc/C5u5UCOoJ+tWLrraWglCsn5VWPMpVMLUbLDm0OuLSojOSe3c8HrUllNXsU1VxIsE7VDYeDnIp5LSUN5qMScBSeop1pS3UZVxg81XFk4vA6EBR60SmEqXyo0MlKsUhboS4CakTJCW0NjgUslHXAqKkuOjeo4B6CnEjjBNAhxakgdKTuyOKMJBGDRYx1oALJBoFWOlA4xScYPFAAUcjpzRZ6UeaHB5oGFu3cYotvzoycUYOeTQILZ86I8HFL5zQIB60DMHaLbBlRvik4dR3IOCKtzabWVBbW7OOcqzVMNO3K2wd8B8FITykHmnLS5MCCmS0oEnnNQRJmihRIhyhLST+lRH7XHdmKStofUVYQ5LEdsb0nmnEy4rkrgHJOc02rlclfgjxLHFYjFaGkbj3IqNEaW7ddik4ANT1uK+J2EHyz0oiHQ4VsIwod6LEkrEV+UE35VrT6t6DnHb2rNX43VVoFrZbWVvOdR7AVrYFrSzLduDhLj6zyT26VILRNwDhAIA9PFQaIXsZbT2k4NuhB19hK5R5UpXOKvI77apCoasAHoPnU0ltxzPmIQscKSTiqGdHdRcRLYVuQD1SaLWHyXTcjKyyo8hJAFVUFp65TnLbkgE7iv+QdzU1TfnpRNCtuBlVZbXmqJGiPB+bfmY7i5U93yEuNg/dNnqrODg+2eM08JOT4QJXM/wCKmtpESBH01pCa/FX8U22HmFYU+5uHBOM7c+3X6VhfHXwa8LdT39Mm56oTpHWKorb06YqMVwpKynq4lJyhXuofqDVZ4YzY2svGbT8NCnnGoz3mupfSQo4BPOeD25HFUvjhfnJmtbvKO5YdmFsAKAwlPGBkj2rl0NXVnWbX9UlFLskld/c6dKhTqQb7JX/ZHP2P4ZobchL108cfDZu3nnzIM5cp8p9wyEAk/LNa6JdNGaJ0zK0R4SRLhJk3DaxcNTXBKWHpeTgNtoPLTWffn69a5UJEWGVIdIabI81ClJ4b2/PueegBroHgdpq1eKXiIB9tToUe0Buat5tKvvVBfpQnP4ckd88dj0r06dOkt18nPUbux6R05pHTGldFs2a02cCQUB2Y+4SrzncclWE8gHOOcY9qNUZ+OHMJjpdxlIJ2pUPb/oV0GYlRhuOKhQ1PuElbxYQr9/Ukk/PH6VxfWniFcbV4s2PT0KyPuszBiTKYjJDbIAOQ4rnHQEcpA9z0rlvqVVPbFXO1S00LXd0HE1He72/eIF9hSLFCY2txVx3kpklfd0LSojb7JKcH8x7V0bTUBNtsIvt8g3SZEjNgMOXBTiH3ljneQAAlPT1YAPYYrmWkplz1BebpckSHG4MNwF9DTaSSsj0qUc4KR7Dk8dBzXTJ9guM+ChUi6+fu9ZDiiVIzj25/ail1OMcVEFXR7sRkcz17qy46ovDj9ymBLHKGGEkhtoH2BHU+/X6Vm9J3mXo/WcC9MOJCW3cLSlQ5bPCgcfKtteNMuMqk7Lk4yUDOW1rTn5dCPoOPrWMvEC4/ZPnyG3vLRyFL2nv9Sr/jVfUNZSr6duKalHKfwL9No5Upbbra8Ma8d7BdtN+JzF90S06VXLZPiBgeobiN+0c5x1x9a7f4Za//AO0PRzqLg42NS2j0TGkp2KdT2c2HoP3571gNbqXdfAXRV+So/EwpJiKc7kdqzmh78vTH8TinJb7yGpqW/MysIQsOADkfm5A696j0u0vEguMSXwkr/e5wtXHw5K/w+WD0vGkpcQDzUo4ODURTSYl2fjAcJVkfQ1LxuAxxWtopDUSQAKNKMnKqBwkdaLd36UAKW4MbaSkg0YAJ+dGcDigAj0pt5KDgrAJp3GTmmHkjcMnNAxwMt7QvYKQ5Djyjucb9QGAscEfQ0vdhsBP6005KSPu0AhRpp2yhNJ4ZFRvbuhhFzzE7AtKldeuCP7fvVgEhKdqahCNJM1MhlTeQgoy4CduSCcfXA/ajdXMhFx5QVLQUfhGElJGf0weP2qW1SyuSpPZe6JJV6sUrahZ9VRYzwkt+aElJzhQ7Z+R7j508pCt3pqDTTsy1NNXQ/sKRhPSk4OeabStxJAXTxUCnNABev8tGkKP4jzQCiKJRVnIoABGFUYA70Og96GSe1AAKcUnbilAkjBFHt55NACMe9HgCl8EUnOKAAcYGKGCRmiJyOBSS4EgZoAzb1xZlqxH3tOD8SFUpqT6koeQKrjDlzUJeZTtdH4u2aUuUoFDMlspcTxnFQJGhdYcLKdqAUnvUdbC2lAoRkn2p+NPbciJa2qJx1p+CS5JWFfhT71ICudnO7fJcYVkdFYqfGl7IQWrqDzU9KW1LUhSUkj3FQglPnONLbwigQarxbmGVOLdCcDkVTI1fDkSvJS2doOAv2o5ljhzJPlpeUnPWnF6atzEMstpw4ei/nSyOyKm7qMl5xbcgh3tg9RVU2JsSASZSgrrjNXcLTEwXPe85lvPvV7JtVrYj+a82kpT1KjSsFzFN3O5rhFLrpSj2HeoPjJqmHYbNHtzsK6S823BbhxA8kb+ATvKUnk9N36VrJX2dJiK8kNFI7JrBePOnLHelWSXLtzEuQuKEtFxbhOE9ghKgFYJzzxxRL3Hcto33qxifBCEq3ePVt+Jj+S4604MFe4k7RjIHCD/ugkD3rmPi5Amyr9JYZaQ4ROe3oWraCCTjqf8AjWt0PcJml/F2xvTy66IchCHZe13ynkrOBhSipPAwCEkDI/CK6DqHSGmnf4jpFn1ZCdkWuc4XWQ08to5WMpIUkjvn5VxaEo066lPhT+kkrfY6dOF4VILvH7M8pW7Qzz0wFzyklxIbKWCpa1EnpuPHPsED6mvYHhdpBjRmjUMw4jqLk+Q5JUy2haQccJylWeB1Oc/Kn49t8P8ASmo3mdKadDTkbKVTpqluutuYx92VEhPsSBz71bqv0bZ5q7a5tb53tL9WcdUp7f0rs9S6hBw8OgsdyWg0Di/Emi9uN2catm9yL5ygCFlCvKI+oJH9K5Y+07qe+fYkNsRnVqU686hRJSgden5vY1rr7PiuwELt99bbK04+FncrJ9sL5rN6DZuP+LLhJbuMde5OFMMrLZBz1O3HWuDTrT8U6/hJUm7G1Gn48DRUe0QWwzFjgEBkhtajnO5SyklRPPyPtUEW2NLjpUmG/hhY8tDTbRScc8EAH9+ffNX8hp1DKCiYtsoVvKQhJBPseOf1BNYyQ2hq6SHX5bfmyCHCpWRjbwACB/QVGrqlJ3I0KGOBV+iRsu+YFloIyprhI98kAc881zW73SE/BdjRpb8hzO4lO5KAPbknI+vPtW5n2jWV/jyGNOWu4SkuOpR5oIDZT+Y7ioD+oNVGr9Ca3iQESJGkpaUNJ2qXH2vgDuSEKURV7TlQcrPgHVhGps3K/wARd+d+E/g+hOLGVfainED3AOa8/wCo9WrvviBp42m3vuONoafG/aUJAWDkH1ZHX2rv3iufsnwm0Zo5LxYlKbVMeUE5KCRgEj5Eg1wjTNhnX7x207AuMKSw87IbZbKW/uXUA5KgsEBwKxnr6fauj0mO2c79lFfqlf8Ac8x1B75XXdv7nu6U6py5x31cKcitLUPmUiprZyOKqXrhFuOpJfwbgWiM4YisflUjgirdoYRW6XJlXAZBzStvHNJzzSxknnpUQCCTnrSsjvQIxQ69KABkbsZphwZexmngkD60ktFbm1GM4ySTgAe5NAxKFALweaX5bZO7aDXCvED+K3ww0JdnbTbWJmrLiySl0wnA1HQodU+aQcn6Aj51RaX/AI0/Du93VuHqTS9002hw7RKbkCY2jPdY2pIH0BqWxiPR/mJDmE1DmlKH2pDqS4wnIcRnpnGFY745/esTPuHiNf5qD4fwbRIs8hsOsX5UkONLQe4HY+4wazFz06G1rOufHaPHdV/rYluVnHyISf8A01kWpqb2qVKUrfovm7fQKkIKN6k0jtDqgkjaAB7ClJdAArgaYHhRvCWvG++pdHRRQ7j/APb/AM6vLbp/ULpCtCeNdvvS/wAsO4LG4/LCio//ACik6uqjmdB29Gn/AICFTTzxCqmzsiglxGQOaJKRjBrlf/aHq3R0pETxI0o9FYJ2i5QRvaPzPJH9QflXRbTfLVfbaifaZzMphfRbas4+R9j8jUqOqp1nti7Ndnh/IsnTlHL4LEDHFAD3oAg0r6VpKwAYFDIoY4ogMGkAeRRYyTRnB6UQPODTALBzihtPelnHahnmgBsgDim1oC8YNPKTmoj3mII296Q0RpSQwr7vAUrpim/LYA3zGkFXZSqrFyXbKC7LQqQjHUdjWL1BeL3qF4/BpXFjgYz0qDlYE7nQZN5s9niLfkPNJAGcAgmqe3eIFonFwMApyrgmufsaEvFyaL0i4lxpPUFRJq5Z0pGgWhIhq3r/ADH51DewwdEVdGJDLUmM+nceCnPNS5U9qPED7oBQU8gdc1xl+33qPJStt1YSk5ABq9t+o34rIbuKFPJHY801PzA11mfkXO6LcQ2UMp/MaurnLjxWcLcG/oB3rEjxFhMx/IhwilwmorWoE/EG5XU71HlKKkpIayb5mYiJblyZi9gxnn2rB3zUzt/fNugJUlndyR3op11namUlllCm2B0FWttsTEFjzGm9zvU0N3wh8FUm2OwLYlW5RH5hRamtKNYeDzjIiGZOtYWhLKXChSkKHGFYVj67TirqVKbWS26kJyMFJrLt6pRpbUCXXGfiITv3UhrGQts9eO9NWtZjjJqSkcdu9khW6M44/pqVarg6htCSw2sss4GfU4TgnI5Vtb7cV0a+rV4heC9q1rbiTd7KkRZ6W/xhI6L4/Q5rLeJOhbhprydQ6OjOTtNSZHxKHIjiy4ylRBUhQCVDA5ACuKofDTXV20NqtdxuNkdTpy57kLb88PpfZKiMngELHsQPlmuLq6Hhyc5+61aXp5S/R/Q6lOrZxnT5X40Prvd/bviLjCf+Mbcaysux9xYIHqyUkKJ75UcfIVcta3nugNlxgHgrdSgjj3ySQP0xWqvFnkaEubGu9EuC6aUnYWptCjtSCc+WvHQex7VZJhaH8QbKpOnrVZrJcHXAp0JSA4Fdc7AEJOTnJ7+9atI6M/8AjrRW9fX1Xmbamoml4kG3F/T0ZgrjfW37U+Zbi5KE4K/UQCew9JAOenIrQeHcZmHpp6VFVC+0HXtz7K04IQegBHXAqBrfwvu1iEG6QJqLpbI7ilqEdJbeK8YztClen6E/MAc1kGdZW+Pb37UpMZL7b6nFNvOFlSkHooKIKcD2NZ+ptU6TUVb4GvRNVppt3OvXF+5htS2RDTkZC/KJAHyJVgftVdbrdALMvWeppK5MG3JwGUrKQ+6fwt+k4+tchvermpjCRGefd3ADC5SVIB77QkK/fitnvUP4ZrSGTy5dnviADnGB6c8D+1cfR3tKq1dRX1NesaSjTT5dhu46o1r4h31u2x3JCkL9LFtiEoZaSP8AdHGAOqjUVxGtPD26tPMy5MAq9TT8V8LYeHyUklK/mK1/h7fLAx4cXiFM0x57jZb+IkMzVsOSErXtCCpIyEj2Bwfary/XDSFk0LqG0w9Gb48aUiKlD9xccAWpG4Op3AlBGegPPvWlUd8PGlU9rm+cc449PMwOtsn4Sp+zxbHpnn18jnniLMf134dPeIUNhB1DY0BNxihRS2+yeEvAflweoFL/AIdtNX9li5+Kep47LzaEYtMVCQkKeIwSD3A7E5I557VYeD0aPP1bcbbcG0uW6RbX0SkLGUlOOMj611OA81NgxLdbIqIlqiIDceO2kJSAO+BXoOlahz012s3d/V+ZwOpadUtRaPAWgbLOttldXc3EuT5kp2bJKOUhbiiraPkBgfpW5SkJRiokFjymwKmHitJjAhIJyaPIoHqBRYATQIM9KMHCeKJI9OSaA4OT0oANIOcmuI/xVa+naG8BVRbS8piffnzCDyTgoaAy5j2JyBn612l59Kc159/i/wBK3DU38P8ABv0GO46LFOU66lIJPluAJK/oCB+9ThyB4y8NrJo2/wCsDD1vdLzEh+UpTTVni/ESZTnZtAIIBPzB/Stl43eE2m/Dyzaavemp19THvbKnTbb+0hubGx/OlIGM/Sst4V3zQlg1W7N1xGv4QGv9Dn2KT5UmE92cSMgKP1NbPx28W9K+Ilh03Z9PtX2e9aW1Jevl/wDL+Mk56BWwkED3JqfYfc238LeoLhqvS2pvB+ZdHmIzkf7SgOBR+4Ug/eDGRlJBzjPWu9aS8DfD+ZDaeuF4n3R9wn0tq2I/+UEj9TXm3+FqA9YTq3xNmJW1At9tXb2nOnmvPEDakngkAA11S06turj0VqK847FcIQ+gvrHlp7+ltJBP9Ktp6pUfZkjBqtHTqyU5LJ2K7eDHg/Z7auTc4ghISCd65zu4/RO4kn5AVzbUvh14YMRTJ03q+4R5WNyGfKLo9++0j9TTCWb3NnOy7jObYjJeWlmNHiqW44nHG9xasj34ApvThg2yI+px8XaQVFK3DuaQkZ4SAonp7nJq2pr4Jdin+WUpcxImn/FHXOjmhBvrZv8AYlehyJP+8wg9grkp47HIrYxbbEk25zxA8FpTiPLO+5accOSkd9qf7Y/T2rms+aGLiqKLdCeVIWpxRWgqSk44xuz2+lV9mv120FqpjUNjlIQoKw6wknYtJ6oPuP7VyqstPr3seJdpLz/PmNSrdP8AaT3U+6fY9O6O1rb9W2NM2KS08g7H2F/iaX3BrWNuhQ65rid3ubFrbheNOh4iF26b91erXnCUrPXIHQ57+/1rp2mNRWbWOn03nTbysAffQnRh1k+2O4+Y4qGmnNuVGr78efVdmvzk6zcZRVSHus0maMgEdajsvJWnrUgYxWkgEAM0ZAz0oiMKzQyD1oAMYoUmldqABSVDPUUrqKGKQHK2dbCbG82TEKEk9O1Id1A3eFCBCihkdN44qU5ZWl2PcW0p4yMVEtsNuK0pawEjPWqMixyTWWnYcQxhIWlxXTB4qVbWJUZp1DvrzzVK9dIzVyQGVl4oPNXKrl5iRLZQUe6DQDHcBw71pH0pt2BDI8xxpOD2xSkszXUCU2jLZ7DtSPMLy/Lc4I7UCKlqxRVSFP8AlgDqOKW9Y25DiXXF4bT0TV6fKUhCEdR1FQpZU28GQfSTQhpljFYYahhDKAjakEGprc+O1CUpw4X2NUUqYuLHClcJxiqxMmRcGS22khOetWXLErl2tli5q3leFe4qHL0oxMHrTuA70/b7UtKA4lw7varlucmCwRIKT9aF6iMii5L0lHfhvxmplqdBD8N8bkLHfg9DXOrt4beHOtQ8fDm727T9yccLq7dMYDfJ5IQsDOCecDcPkK295J1Zefs6Ag+X+cjsKec0hY9NW1byw0yhKMuOuEDP6mk7TW1q6JQqSg7x5MXpGL4u+E4ksXDTqLzYHOJMVt1LzTqe6kp/Ek4/3cHvVx/hDQfiJuneHV9atF0VkuWO4HyyFdwg9cfTcPpWKmeNXh3aJK441y4wpJI2RC86n920kVzy++J3hrc7oqWjUTqnicl/4Z8KJ9+UVzavTnGNqS3R8n2/ta4+GUa6WslGW7h+nH6o7zKl+M+klx27haZUlmL6UrQyXWlJxjClNHBH15rletIlp1Pevj3bE9bZax9+lEhe1xefxbeCPpk1Ds/8RsuxNJbtfiy8ppPAZnw330gewKmlEfpir9H8Y15bTsOptPvH+dVtlA/0QP7VnlTrJbXvX6KX1ubY66Ky4Rb9G1+xUWDQV0ew1YtOTZJV+ZiMpX6lWD/U117TOg7va9AXTTet3oFniXBaXYCpMlIW3IHQHtg9MZz8q5hJ/iput1QW3/FG22tpXUQ7U/u/Qlkkfoqs8/4geE12mfG6m8RZ96lHq5KiyyP6oJ/rUqNCq3bbJ/3WivkrshW17krKy+F2/wBjpLV1u3h21K07dtHW1x15QU47MD2Xkg5SUlLgSUjsQPrRzvEGXqONLtSdG2Zx24upWryEyC4pwDCVJHm9QKqrZ/EdoO321u0L1jCudvbAS3FulqffbQPYbm8gfrXUdF65ganhqkaKf0vGbIw45ZIqG3E57K6qT+uKu/ldRezGp7PwQfzSD9qVP2vixrSWlH9H6WkMT0BN+uyQhbIIJisdcK9lGt3Z7f8ABxUJ2dBSbbZw04X3FKddWdylrOSo+5NaBtG0Y24rpUaMaMFThwjmVq0q03UnywNYKadOKQR2HWk7V5wasKRZWN2KBOaLytoyo80NpoGKBJGKS4dqPpR4I6VBmOrACE8qUcAUxB+ZFbjv3G4vBqDGG5xRP4j7CuTwNZ37XnjtG0+15aNPlpxEm3uN5bVHKcK3gjknjntmtL4k3ZxhULSkGHMlhtIemJYbWRyPzEAj981gfDZ9MON4h6uDa2zEhqjseYMKRnI5+fIqvVprwqcXZykvksv7BGSipzfEUcW8QPAnwquepZT+gfE21ad3PrR9l6jUWWkqB58t/kbfYEE1S2f+HPTNv3XPXHi/pdy2x1Aus6YeNxecyfwggAIJ9yDWR1mbPcr22xdL3HhuN4UpLu7J3HlWQMf512fwQ8OtD3KC5c3JMS5LdQlKI0eSV7Mfi3gqH1yea6MaUZzcIuz9TnafWTlSU5rLH7p4haEjaVi6E0qIlisMY4aamNrWpS88uuK24Us++7ilInPP6OfjQb+LglnhC1fcJBz+HhJ4x35zXYE6C0pGQWza4T/qKgFxUrIz2zjmlPQ7Vb2S2i0I2fypjA/0xUpdBdR7nPP0B6zblnDozGoXdFfDyNRMIeUvcJCXcpR2wdxGf2qXJZuFstLrpvUSYtaU7tj6Vb8DolKT6c105a7ethTben09d2z4dCeagAywySxYGm0k8pLbacj9xVs+gRacZSX5+gn1C/EWeerTq67yPEFuDKtzbLL2UiQt/Pk/oAc/uKq9WajuMS9ot0dLj0ZCyrKdoUT75J5HHyr0i7YTKeQ89AitK5yAEn+oqNM0kiY2WnGoqEj/APDSTj6lJqEOhRhJSU1gT1sZKzgQP4ftRsTrjL0PdlA2y/x1N7CchDwHBHz/AOAqusl7vfhn4kyWG3yyqA+pp5C1BKXEg/hVnsR37VCl2tOi9b2a6QXsJTJQ5kJxjChnsO1X/j/p6FL8YTIcJaROjNS0FJx6ykZ/rXN6tS8CvSreu1/r/uxZ0ebcKun8so9IQbpb75Y4epbQ6hyHMSCQ2rcEL7pyKtG1FSQRXCf4dLhMbbvekJiMNKR8XGIcKxuH4sZ6dv3rtkJ0qbAPUcVKXmb1fuTt2eooYGOKPg9qGOOKQBAUfHSixiiyMdaAFY9qFI3K7Ue496QHMZdwkxP9EdSSEmojJfvtyTDiAoQcbsdq3MmFGYt+JLCHHCPxEc03arS1DiqkxW9jqzyR7VTYSIsPSdugRVqLO98HlaqZfYjyHWorKAhe7BPY1qVKCYIL60oPT1HGaychxEa5B0HKc5yKbVgsXq0phQFKZ48vhQqmS01cSt1GEOjkD3pu+6oiR7e4ltClqdQAT7Gqiw3YSUK3NOJxyFAUmxWxcfk3JqFI2rQd461CbuyJUnAT6s8VfJhNXFJclM85xuxUtOmbbEa+KCST1pWYXKhpDU07JRGB0FWsWHDgIC8pLZGaNdgiLZ+ID7iAaJi0eaCj4kraT1qSbQXaKmfdXZMoR7Q2oqJx0qK1pi/XGYpMuWEJxyCa3EO2woSkFhpKVEde5qUpIBLoGFd/nRa/IbiktmmoVhgr8lWXVD1unqflXiH+J3xMu9317I0dGmLbgQyBIbQrG9f8p+Q9q95OIU62pa+mOlfMrxwt8m3eP+pmZIOVyy6hR/MkgYNXQikSSM1pPSGodcana09piCibcXUqUhlb7bAIHJ9TikpH71N1z4c6y8NryxataWgW2W+15zTYksvhSM4zuaWof1qX4c+GOoPFG7zLRpiXa03GOwX0RJkjyVycfla4IKvkSPrXsNzT+jbt482bTmrIVtut7s+kW22bTISzKHxQxlBaWtKHFAdAVAfOrUrjbPBFaJnQuqpHh2/rtm1FWn2HxGcm+c2Nrh/Ls3b/ANcYr2axpHw+PjU0ib4VQbfOa09IkyrbcrZBbjOrTylwR2HnQ2rt1BrBWKJoTWvgwnU+ptHaUsiHtXR4b7tsgIipaYyQUBXKkpPGfVg09oXPL1hsV11NqSHYLJF+KuM10Mx2N6Ub1noNyiAP1IpN7stz07qGZY7zG+Gnw3Sy+zvSvYsdRuSSD+hNe07tpi6Wbxp02o+F2htPWFrUjTdpu1sQ1HmSmNvB2oV94k91K5+Xeo2u7VojWWm9SXTU2mLDa1WrVzcNdzt0NLMh1kqG7znOSvPck/tRtC54mq+0frC+aH1XG1BYJi48llQKkg+l1PdCh3Br1v4y6H0vbvCTWkq5aC0jYLbE8j/Ct1tsdliROJAzlaFFTmeeteKqTVgTufVjw71bF1r4fWrUsQBKJjCXCj+RXcfoc1ryec1w7+GSBOt38P8AZUS0qT5oU8kK4ISo8V24qBAGeaqYg+qs0onBFFwABSVGgAK3KOKWASKQPej9W2gYlasVCa++v8Rs9CvP7VMWk4JzVfHcDWp4aldN+D+1EeQOdamtYu2vJslEiKiQ48rBdnbAlOeP9nhJAH8x+lZfTrS0eDPilE3hx9LgJUDnIymt1f8AUj+ntbvWlPkJW6pbm1xPpKc9c+55Hesj4fTol91/rrTjSQlN7huLZb7b056Z+opa32a2nqPjdb5plSi50qsFy0eF/EC3XN7XkmQ22TF+HTgkcZ280xonxL1V4f3ZEizKDI8tKFNLCk7k7sknPX9eK6Lq/TCV3V2RLuL0P4cKZdQlIO7BIz2I/esHqC32b7OaTDl3CdcEAgOLbQhjGeEjPqJ+eR9K6koXldnM0i36eL9D27prxUst/wBIR7w5MMZRSEqZdKUJ3EZyknqKslaqduAT8FFDqTyS04Dke/8A0a8HaRkajtGtITljuKrfLQoFaHgQ2oA5wpJOD34r1xa/EYTtPfENsvAhOXXFoSy2OcFQBUTjPbGa7WllGrD2sMorRlB4Nm9ekI2qW04k5woujaB+tIVd4DijwlRHZOTzWJevjl1SgRHhMSrBLgV5bP6E8n9qiLiTHD9zIeDi15UWyooR9Dxn9hWqWnpWyyhVZ34N4bpGec2tLbQQfwuLIP7Ypv41AWpPxEc467SfT9axBtt0UrbKu0uQnHpQkpQf35NaW3+GGsbnFQ/G03KkoIylyQ+WlAe43EZrFKNCP9Roi6j7GW8RJDEpi3IiutuKLisFsgjsO1Xv8SLjzeorIIyQt9FpaynGc8e1RZnh5qdnxMsNpm6dmxYy5KAp9SS4g+rccrHHQHvUfxrvzczx5dXHjrlRrdtYCEHj7tGOv1rzPW5RlKlCPeS+mX9jZ0mMlVrVGuxXfw36guSvHO2wJDq3UOtOoIWOUjA457cV6thK/wBIdTngLOP3rgH8PsOTM8W59+lMx2kw4KnSgZUpO/8ADhR7cHua7za1bypw/mJNSr7b+yb4Nvku0/hFAnFIB4wKUOOtUkgZJOD0obQOaMjPSiwcc0DBuGeKPIPaiAGKB47UAVD/AJjk/wAt0ZSDwKKVeIttSEKUknskVkHo12ukhcmTMW3k8JTxikoscgPpK3VO47k1UOyLG7T3bg2HMlLfb5Vm5d3cZHkKaKh0Cq1Mi3PmKlpI4NTIFgYQxvksIcI5G4dKbTY8GftFodu8MPyo5THB6qHWtUIcS027dGaSlOOeKkCQhEVKW0ZQDsKEipEu3F6zrcnSWbfHx/rZCgkD96NpBrJWx3mZVu3pABzUgPNri/DrPqKdtZ1esPDWwsmK/qVyatJ9QjIKsGog8U/C1x4ffXdBH5izx/eqHqKMXZzXzL1oqzV1B/I090ym3IZY4J9qFtCWmyws4Kh1NR7bqfQd8cSi26nYDx6Myvuz+54/rTtxt91ZuDa0xMxyAQ+0rckirYtTW6DuvQqnTlB2mrEmY78PDQSTv3YSB3qe28li2h6YoJAGST7VWspU7cd7yd5QklOfes9ra9qDLFtZX618uAHp1qfGRRiInazQuUuLCaVtJxvNcO8avA8a9hJv1qlNs3ttOElw+h5P8qj2Psa77Y7DGctiHFNpWojJzR3G3xEMqTHBS53QelCbWSR82Lh4V+I1smKjP6MvLqknG6LGVISfopAIqL/2c+IW3d/gTU2Pf7Lf/wCWvpHDsxWgqcSAadNuk/gRHC0irN4j5rHw68QQMnQupQPf7Lf/AOWgnw68QV/g0JqVX0tb5/8ATX0nftk15oIENLae5zUq2WdpBwpIKqN4HzR/7NfEX/2A1R/8Kf8A+Sh/2aeI3/sBqj/4U/8A8lfUYWhn+QftQ+yWc42CnuFc+XafDLxHUsJGgNUZPva3x/6a614Vfwwaqv18j3HW8JdotDagtUZwjz5GPy7R+Ae5PPyr3am0NA/gFS2obbYwEjNG4LkOzWxi3W1iFFZSyw0gNobSMBKQMACrJTQCsg0afRwBSsnOaiIbJWnjGaClA4HenAeaSUJ35UKQCgRwKJR6AUONwxQVkcimACMJ5NUV2UqOpMhH4kKCh9RzV51OVGq64tB5opA6ikD4ObeL8KMufb9VKU6qNKaxuQoBKFAc7sjHzrjdo1aqwa/tWo4xJVEe+8wlQDjfQjnrwe3HSvRjX2bNgSNK31KVQ5Jyw450ac7fQGvOeq/DDWtvvMuC+lMVptY8l1vepDje485APHTgnirK9Jaqg6adn29GsohTnsmpdh7+IzQbb09WoLKo/ZN+bEuM+3+FDpGSnP8A11rx6/8AacWe7EmqeKUZDiHDnbjqQD3r3foK826fplzwr8QlJTBlHdbp+8KEZ7sNwJAGf74rhHjR4I3ex6n8qUFMyUZUxIRw1Mb7c+/9qu0Oq/iYWeJxw15P84ObWh/A1W3/ANcsp+TOM6d1LYWdU2+fKdluNR3AotpVuUrtxu6GvVUZbEuEZMWZhp5IUA41wePdXevKLcW9JuMexv2SMy0iQHVh6Onccdw7jdj9cV3S3TXLgEokzJDhKQAwy70Htx2r0/TvZTUjPq2p2cWdCZudmtxJILjueQoKUM4/X+2Kea1HEeUVOR0qbHQFBCP7f5ViVpfjZ+GQhgkY3BSSr9E5z+9Nlq4Ij7vJUlsghSnzgn5k5rXVjF8mendHZ3b5G0BoeLqdyLFkX26AqtsdbXojNDjzlD8xJ6ZrnzSfEXxKmSZyZcu5FpQC1vy0MtoKuiU71JSPkBWr8RWW5Hjdpe2rQF28R4DbSPylCgncB8sk1q7NqvVAf1C7DRc7wIVxENizW5zyQy1/3mEDJA6Dt715uUs3RXWbrVXCbaisWX3OZ6e8Q9eeG2pFwHpUhSI7myRbJiytvjqMZOD8xS/EC12eJdrZrC2TFpsmoFea2XSVGO8P9Y0onqQTx9a1OrrhPulv1zabtdFXZq2Fh2I7ICVOMKKiCneBzjofpVh4TwbTcPB/4vUUUSmrXe0vwmljIUst+x7ZOf0rPWpQlapJZX7mnp1adKr4Ck3F3+jOhaTsrOkPDZqKhBE+6EOLKs7ktdhz0+nFaq2tKEdIxiqmGuRdLgZ0vlaug7JHYCtPHQEIAFYpy3M9AlZWFjKRjFLCgRzSsg0W0VEAZ5oZB70nviiKQOQaADPBzQKiKMEEUYAIoAx7AXJjl4cJJ4q3gtNNtbnlCqoIdju+Un0t1JQ05nYpZ+VQRIkTnm0SWwwoKJOCB2qah1x+amEwgqWRgYqt8hMZfxCxlYHAqn8QtZL0FpRuNBKf8RXROU9zHb/m+vYfPPtUalSNKDqT4RZSpSqzUIcsTrLxEtGgCu1WttF1v6/xjq3HJ9/c/KuIakuurtRT23L/ADJLkmWD8K04djOcgY9kpBIz9aW/CNhR8VfIzdy+PQpEg4LjjC+pxjPJGeRyCmp1mKbZEXIu1xdcjuFKg+VhQjtqG1LK0nJIBJ9Q6lXPSuVNVNR7VbC7R/z5s68HDT+zRV35/wCCOqyrt12ebjWITgcGKQPNQspQCpKknkc55PHI96sdTWqGqEi8W6FamUIaaYXFZAKH3D+IIUDwsk4B5BwKj2GWq12uTf40qQ42kOKcac9e1pClENJHVKtpTwep49qcY0zIu17lLeX/AIfuKVNuxoSkhKHFpScOrSOM4XtyDng+1SVGmliKIOrNu7kyjTaWFWh1mZFXDu6HFFaXFhAZGcoSoDqCMescftirjSHiBrLSLTUiO4/IgK5dt8wE7Rnng8p+tRokkaj1C29JlIQICCthR9aX3EqxlOR60DbnHfcD2q4fYl3x0wrhMWhhAUftFpIPnjjCEA+2SVZ+n0g6EU91P2ZeaJrUSttqe1H1Ov23VNv1po2TdtJthNzZRuftyiN6D7j3HzrHWOCuXKeuV3UrcsnIV1BrmUW73DTWtH7xYJLaZkB378RwQ04k9cD+U8gjtXefj7XqnSMXWVrbSht70TI6f9i73z+v9we9bNNqXVbhU99fVeZi1WmVNKpT91/R+QzFlPMsKisr2k8oWKr/ACr0bhl4hwE8EVJcBbj+cwQU9h3FXVqbUYiZDx5rWYhMWNLCcvEJGOlWTK0ttYKc/MUw5IMhza30HepGAhsYFSIkW53SMxG8tKFFZ6YFR7N5qnN7qSkH3q4RAZWQ642kq+YqmuM7yLgllsjrjih+Yy+UpIIAo/SDnimWUFbKFk8kU8EZNMiK3ZPAoKJHShjbRqPHWmAlP4iTRFXqwOlDcMUMgc0gDxim1hVLGVc9qLqevAoAUnCU+5olE9qCVDOKSVYPNABbhn1CmZCkhOB1p0qTvGRUWXhCtxVwRSkyMzM3S3iU7jb+1KTdUIgC16hiGbDAwh3q439D3qDqfXukNHNB7Ut/hW7cMpS8v1qHySMqP6CufTP4iPBt8qA1myf/AMnI/wD46INrKEvgbTUGhrRqLTq4tnXEnLI3JW65seQR0x6cj+3yrLt3u6WCxI0f4waccu+nh6WLkgeY5G7D1D2/Q/XpWWl+OHg+4NzWsmwrttiSB/8ATqBK8dPDp6KqP/j11bShgtqZkFJHtgoquvRdSSrU3tmu/n6Ndy2NnHZNXi+xaXrwEZvsNV38Nr5B1HAPqEZbgRIa+RzgZ+u2uX3HQWq9PPqbuFnvMEA4JUyoJx7BWMEfrUxfiH4aQ5f2hYddP2yYFDauMy+jHPJ4R/atBC/ihultaDaPEi33JpPRM6A6pR/8Xlk/1rRR6vq6CtUpt+sc/R5+5zanRqTf/BUcfR8HODAuK3lstTX/AC1cBoAkp+nPX6itHZvDHWV9WEWrTl2khXHmOtlCPqVqAH9a2J/i+nKTtF30yg/z/Av/APLUGZ/EhLviCzcPFqNbmFdUW6C8g49spbB/rVs+v1Zq0aUm/gl97EY9Fn/XWx6HQ9RaB1FctA2FLj0P/G9iaCfgmX0qdkMJOUKA7rT+tYNXijfoNzdXL0zp5Nx5Q+87bEIeWe+/AHPvVLb9e+EVvuqLunXj7tzQreJbjMjeFe4witk5/ET4aTgn7euenL6tIwHrjaHXF4+obGaNPqpyjetGz+NyGq6XeW6hNp979yljXjVuvwvS2ndPWyMmWtK5KbZBQyF4PCnFgcJGSeTXcLPp2LZ7BbNI25Yfag5dlSE9Hn1fiI+Q6Cucx/4jPC8QzBZ1XbbTCV+KPbra8yk/XDeT+9XVs/iH8EogS23rRgE8cw5A/wDp1KtW3KyWC3R6DwHvm7yO0QoaWG0jFT0jHGaz2mNaaY1bbfjNO3qFcmOhVHcCin5EdR+taBKgRWY6A4MA0ffNIHNKB4xSAViixzScnOaPdQABgHihRFQoBeelMCq+E2wt8xPX26ioZQ+02VMpDzY6HPIpM/USWG3BJYUEEZFVUG7SbmoohxFhodVnpULkjQWZRuN5bElIQxHSXnSrphPv+uK4NLvaNYeKs/UlwS45H83y4jXllYIztbR7dO3ua7Fdpblq8I9W3EKw78N8MlQ6gr9H/rFcEs0a4XDTjtogMOBmSE/ETmvUuMFubVlCPzqDbe7jpke9c7XPfVhS7L2n9kdPRLZSnV7vH7svI61W+SuYw1Jk2eBua8xrlxK+CspT1WlICk56jJxSVW1u/wAtV9tjrTqMjyI/+wlbAfvifyZJwBjqhKsVMTp1mFDajaVuz7jDzIU7HeUVKcCirK0r/Iognj3FMNvw13BmxabS3DUlBcUqMyE/DoSMepBPqwSAP9457UXGskRh1N21GqFCaXHmtEFbiHM5fQvekLH50DylZPzH0qxCJk2S7Z7stTBUgh9wKO3ecFKGlHovue4H1onGVMsW7TUJpEa5OICm7qk7UsoCk73VkdF9QE59SiAO+EKuTDEGdpq5K+1LzFWFPOJbUoLcdG4OlQz5ZAXk56JAFJATZPlSmRpS5xW41ojbGTdYbSVEbUJIbSPyLxwT0HOOSMMTZbKEOadgpQ7H+GQfiEM+mE0tWwLcA4SoJBUkjqQfmaQtF4tcORHsElq6IDRcUZSUoDC19FqV3Cju9PyGKK1uM6ftCxa5UmUZCgiW1JSFO+YkbXHlY6ADqjkcACjsFhy5REJhN6XaS2y2tCBEmbEgJbRgg4HVZ9Q/38n3OLfwkmmx+I9y0JcFKMC6tkNhRzhYTuQodslOR9QKgIEG1R3WbVZ2bpCfZQ4Uj73y19GnCrOduecDkbVEd6pbk5/h7XunbuLsudLbdbkOurxuKQsFJOOxGR+lUVpKm4VlzF/R4ZfRXiKVF919VwdLkOSWb0u3FspU04W1jtkHFbBhkKgob6cc1X6qQhjxDdQhAy6lLn7jH9wat2EeUwCrriu01Zs4gbTKEEIbHPc1IwkvhA6d6S0ttpClHvUUSChxShznpQInuueYrykq2pHU+9Z2VESbruPQHrWgZYKm/Mcxk87TUK4NpXHU40gDaOcUMETIrgWylKegGKfBxVPZJSXQpOeRxVwSAaaBgUSBTXqVSyvJIot22gQMYTk0AoEeriiCtwo9m/igBSsFOEmm8bUnmkrbUk+lX6U3vVuwRQMfAwMmhtJG89KQVk4FPFQ8opFADSQFZVXM/GHXqfD/AMOLlqDAW82PKjoV0U4rhI/uf0rpZVtawTgd680fxbwpcvwc89gKU3HmtuOgfy8jP6f50uWkQlykeLL/AKgu+p7/ACLze5rsuZIUVrccVn9B7D5VrYPgj4oXPQB1rB0uXrEI5lGWmZHGGx1VsLm/9MZrAAZUBkD5mvWfhf4bak8NPCnXmpNSzbYuxXXTYEKfFmBxla1E4b5wQrkcY/Wr0ibweS6Fe54fhzoRWh4SEaD0u7oZemDKkarUhv4tEzbkAPbt2c9qzmoLb4cWmV4VaUkaG0q1b7+yy5Pu7kQIkkBRxhwYxuOASQc5p7QueWIGjNS3PRFx1fBtanrLbnUsy5YcQA0tQyBtKtx69gaoq98ar0rcWfB3WmnpGiNMaSgO36KzbzFbQyzLY3JCXHtijnPTPBNQPEXwj0+z4S3Qv6L061dbZPiqYkWmzogBbBUkKOQ6tTyOSNytufajaFzwtWu0R4Ya68R1y0aLsSrmYYCn8SGmQ2D0yXFp/pXq7WWmdBz5viTo5nw60vb2rHYI1yiT4UFLMkOrTk5WO3HQYrnf8MSbKvwx8TkaikTY9rMBsSXoSUqeQjdyUhXGaLBc5TM8DvFWBrWHpKXpCQ3d5rSn4zHnslLqE9SHAvZx7bs1g5cSRAnvQpbRafZWW3EEg7VA4I4r3U5Y9Ov+KfhVoZm1/b2kY9mfeh3K5JQ8Jm5OcEYxlPtWZ0dpTw2v/hu14jT9NWJKNJifHusUxGwmW4k/cFxOMKPPf5UbRXPGtCvdukdFeF0zwast4i+HMXUEC4QnnrlLiW2It2O4ckgvOPNlnb2CRXKNdq0jo7+FTSki06C05Lm31UqOu6ToSTKaSlXpUlaT+PBxkk0to7nD9Da61B4fauj3+wTHGXG1DzGt3oeR3Qodwa+nGhdVRNY6GtmooZ+6msJeCf5SRyP0NfKGvo9/DbAmW/8Ah/0+1MSpKltF1IV1CVHIqEgZ2fv8qVjHNJHKfnRJK+h6VAQvIpJzngUe0dTSsjFMBOwkUAABSfMIVgCiJVnjNICEbZGfhpEtpCzj81E4hiJHDTTaG0AcBIwKlyh5rOGzgiqCY67nyHV/LNIZTatX8X4C6uba5KHWVfoHWyf7GuQ2QS4um4bthkoRLdS6uQHlFDTJBIDxXg7VbUpSE9+vbNdxtVr+07DqLTKiN1xhLS2T/OAQD+6gf0rhOlH5hdTZIkSMZiX1OPiYooaLKRylRH5txG3jjKj0Brl6xW1MJecWvk7nW0j3aaUV2lf5qxYWm32+zQVJiXgydRPvnzQ6vHxrwSV+WEflZG4qCh0BKqXPn26DDNiucKEm6yXy0wGVhDs5wjO9Lh9QAAKieo6c8ZTEZvMdMqHOQ3Ju6pJU1IhNlSEKWlSk/eYG0oQACk9to71FQZyNSSEGSxelok4mT0R0pRBQUD7tSuvARkpTk+sZxmn8RFk1apNptytNTy7KanM/6TdWFAFHq6rH5cZGzHHHyNQ3Fz7MxcLNpRsvkpC1zVLCltFw5Wpwn/WuAK3Yz0259jfMx0261Fu3uyL6xKAXILqUlbIUCpKyB+JAHRPXkYyDVHOR50yObRb3RYWnVO3Ucobc64De4ZWQvlY4BCffikm7ErJssrZYre7phlOi76w6hLYPxElanUzXAlJSvdn8WB9B07EVBmz48FDDOlYDVyu8hw+da4yzub5KnHHiCcBCjn55x3qaiyzZ0By4WGciLFcbVtjlACH8c7kY4Qc5SD708ZDMefDgaGtLMm5ygvqgspSyk5PmOjJ37zwOcknPFEcsjLCFxGBb4750TOak3AuH4iLLUGkJeHClkAeg9CEYx7dc1k9VN2hwWyHZ2UokJeeYkA8u+aFpBC1dzu3cdsnFb9OktUswTeHFWy132VH2vx5sxDKFq2YGR32nO1XXB5pgaH1DO8U9NvSbcg2lDyHHJEdxLrQKT5i0lQ68ADJ6n61TqqM5w2JctL6l2lqxhPe3wn9jpGr1oHiQ2oEbkMIBH7n/ADoplxmhkIaYz8yKpZk4XjxKuMtKsspd8pBHQhA25/pn9a0m4rjhtIzjvXbk7tnERAYlzVNZeR9MVZQU7k+Y6OlPRm0hnYQDUtCEBGMClYCNMXKkseVD9BAxvNUkgXOBDW00svrVwR1rQS5Pw7YQyApauOO1CPEAbSt45eVzn2oAz9iiyoQU7LGxS+dpq/Q6XOT0rP3Kc79rhg5CQcE1dw9q2hg5pIbJAUM0alDFDaM4FEU1IQpPSkvO+UeOppQOMUzIKVOZ7gUm7IjJ2E/FLCR5ifqadZebXyRzmmUgOjCqItJT0JH0qCkyvcx8kF7Ao3ErH4SabbB5Ip8KOATUy4ZUhZbJPFZvVGmIGpNPS7RcmQ9ElNFpxB7g/wCdalbwKSjHWmhjbgigjtTyfO7xF/ht11pO8Pu2K3PXy0lRLTkYbnUD2Ujrn5jNc+Og/EXy/KOjdTlA/L9nv4/8tfU1yG26PwjNMqtLeOECrNxK58t/8DeIga8r/B2p9n8n2e/j9ttEdBeIStu7Rmpjt/Dm3P8AH09NfUlNlYAyUCnPsdgjhAo3Bc+WitD+Iyk7V6P1QR7G3v8A/LQOiPEZQwrSGqCPnb3/APlr6kLs7W3hApv7Ha2cIGaNwXPlx/gjxBLix/hDUpWRhQ+z384+fpoJ0F4goSUo0XqVIV1Atz4z/wDLX0+NnZVdyFIALbIx89xP/L/epZs7SeiBTbsJSufLgaF8RBtxo7U428J/+z3+Pp6aIaD8QghSBozUwSrqkW5/B+vpr6kfY7JOdgofZDI52CluHc+XCdC+IiG9iNHanSn+UW98D/y0B4f+ITu1r/BepVAH0hVuewP3TxX1INoZI4QKNNoZH5RRuC54T8J/4ZNT6gv0e5a1grtdobUFmM4R50jH5cD8I988/KvdtotrVutzMWO0ltlpAQhCeAkAYAqS1CbZHCRUoDHAqLYgdKIugcd6NSTjikoRj8XWkAfmE9qLCuvancp24I5owRigBAUnHSnEqQRRFCTSCgCgCOogjYk4zVbcLahSCd53HvVq6wlMfdn1dqzsxq8qWotkbewzSY0V8R+XZr6xLQvelteSPdPQj9ia514t6XasWuBf4i3m7HfD5ino2AppZOVhJ7K/MPqR2rbzGbsiKtakZKeeKa0y8nUFim6S1bHK7VIOWJB/FHc7EH+v/wDtZtVQ8eG1Yksr4mrSV/Bnd5i8P4GFSp9Cm4Mea6dOI2BT7b+xa0KJPr4zgK2hSwc8/Wlj467B9rRwjw7KF/fuKUN7rgz5nw4wc7umVYwoE81BvlkvfhvqZiBemVTbQl0usLT/AKt8YOP1Gc7fcUlTNvbj3SZbb23bIpabecDRHw6gjAKnc8hbqiU7UflSO9YKNXdLbJWkuUdGrS2rdF3i+GWthTAQHoujJSxbWEpLqHnC855+AMbj3KU9Og2j3NKS/wDaVycftU1mRYIzh+0m1qKwpaSVlKMjIOdpcHsRjkmlxJsm8WJm4KdkadLCEI+EebSlUhakoPlqHXZuISCMKJz071SLszLu6mpTFx09JhKbJt8gpabmJJQRuPKVISvKCU+o/qBU23dsqSxYvJMW2u25c62XhFughSXHGWkhbCkglSsJOFJ3jGcY4AI609f9Vf4K0VaxaGDFv13jJlkuNhK4DCh6UgdlnnPcYqmuEZdzCbtdY69PBiOlxqGVpUuQokZQvHBCFbUhI59Q9xUTxpK0eM0xZTljyYymArkFHko/pndVOpqypUHOPLaXzv8A4L9LSjVrKMuEm/sU1t0zftUx3LvNuDUdhbnltyri8UpfdJGEJJ68kZPQUq06i1f4d6lKEOvxnWyPNiPHLbqeuCOhB9xXUzqC0X2wWmTctHWh0fYEy4NtkK2tGOVhKEjPAOwZ781jPFXUTVytunbc3ZYMQfZzE5LrQO9PmoJLeT+UH+wrDUoRow8WE/aVs5zf7G+nWlVn4c4Yd8YwdGgogTDA1FZklFuujZdDf/cOg4cb/Q9K1bIHlhtIyT3rl+h5j8LwHjKWCVuXtwMZ/wC78kbsf+LNaq2XSYnG9JPbntXoqFZ1KUZvlo8xqoeFVlCPCZsgluNGypQyahMuLfUSSduarZDcuYEqDhSOoHapltYksErfUny084q1O7M6ky1YjNoSXCnco+9FLuMOEkmQ8hGBkZNVE/WNuhBSUkLKeODXPbhLXfpi1tOqUVHoDRKVuCXJdX3UltnSswiQ4OpPQ1oNNzQ7BHmrAV8zWLh6LuC2fMSAnuCa0EazzIrCUvL+R21BSfIbuxrxIbK8JUFfQ0sr5GazcaHKYX5jDoVjoCatGJoc9D3pcFWKQlIsklB781GdAWsndSclAJSeSKaDoSr1Hk0pMjJ3HkpKRgGm8qLu0K/SlBeRxRxkhTpUcUlyRXJKaOG+RRhQIpSlIxtyKQkJ6CrC4AAUc4pKgkLFPBApgtKL+7NAEhtG7mngkZ5FIR6Egd6cGScnimIJSM/Sk4wMDvS1cDNNgqJyaAAoFIzTaVY5Ip4qTjBqFKe8phx0J3BCSrHvQld2Bu2WJQFSLg4+AAloeUMfmPBJ/Tp+9TM8cikRmPh4iW87lDJUr+ZROSf3JpeexpyecCisZEEHPFOJGe1DOO1NFagrAqIxzgKxSikAZpByUZHWkhal4B6UAKNDHpoHIogrPGKAFAY5oldc0odKBI70AGkgjmj2DPFIOAM5psuEHigCRtxSVpVxxTKnlcYFPJeSR6utAyKw98SS2oZCOfrVXd5im7ozGjJ3LOMgdqnRZTQSrywSo9OKEKEkuKlPgeYpRwTSAjXCMRAJH4+ArFUc1huPa0vkAJSjoO6q1chOHtquUOcfQ1mlxnX5hbfB8pCulDGiNb7gp2wqtOqYSLnbXc4adGVtA/ymshc/B6FNfMzQGoWSdwWLfMVhaSDkYJ64I7g1t7yqPAt7k1ZSUpT6U+59q5kymdcrkuUkOIJV6S2SMftVFfT0q1vEWfPv8zRQ1NSj7jx5diJOsPiLa7y1cbxpRydLjf8A3eTs37D/ADDaeT8yKiyLrrq4qktSNKyHvPIADkJZDaABtSMjoF5XnuT8hXW7ZctRwYLLablIPpzhZ3AfvUp/UuqinCJ2MdcIFZn099qrt+jNS6guXTV/1OQueHviPrBbC5FjREbYSkNPSMNpawQoqT3BJAJ+g9q0epNHnUembVZReoU3WNpjfDqQhePjGAfSkE8Fac4+fNXt9evs+N5ky6yi3jlBWQKxRSyXtzSyHUHKVpPqB981JaKkouE25X839ip9QqblKCSt5fuV0rxB1hZ1pgTLJboZZZXES05b0p2trzuQMjocn96NuHrDxOeiNO2uHEiQ0BBn/DBhtloDABV3AHQCtpaL1rV4eWuew8gDCFTI6Hj8uVCo8pvW10nFu8TVrgIOfIZSG2z89qeKz/y5t2nUbj5Gh9UjFXhTSl5lwU2st26xWck221NlplZ/2yycrcP1NX6IzcVoBwjKk5FV1isHxYDy8stJ4Tjqo1dRrYw9cTvfWsN9EKropLCSwceTcm2+SnVepUOTjyiptPyqHJvt21HPNvtkdbKT+JfYVqnzFE9EdbKDuOMYqZ59vgMPLCENJbHqwMZ5piMYrRTSEpakzit1R54rR2rSlutbH3Te5zruVTcIv3S6quK2yiMkEoB/NVhcrkIcNDvdfAHuaEgywXKXGh2/1upSrsPeqePdEusK8zPyzU1uElcJcyYgLWsZAV2rPFSUzVbhtSTxQ8DcWWzErzF7Ugj51LS0HVbFfj7KpiG2heCAnB7ipjSFJVuoINikhbCgHefY06tpDhCqT5qVrCT1+dKOQrbz+lAgnAUJ2jpQaBCPSDk04GFL5NPNM7CPlUkicYtchIjqPKzTyUhA4oLUd2KPOelTJhFZ7U40lR5IpsFKVc0v4gAYAoAfIA5NAHIqMXyo4ApSXccYpiHfUeCOKHI6U35xJxih5u3t+lABqSTxQU2gMkFIUCMEHvSgrdz0pRHUe9ICJb1kxvJWolbSi2c9Tg4BP1GD+tSlJGM1CfQtiYJiErUkp2OJT8jwrHy5H6/KpLMpp9vc2QpPuKnLPtIjB29lgoiR0704ee1JwCagSGwog/KlZSTxRnb0NBIA7UAGnkc0OM4osjNEQT0NACs4FIGSaHKRzQS4N1AwbDnmgdo4pzgnrTCwfNHtQADwvJ6UpO1RJ6UCncrApC0bTwaQAhJZQyXABnNOLWkPFo8BXINR4sdUaLtfVnd1x2NPuNpU42oHhI60wESFOYTlvO05Jqi1Fqaz2WMS/wCp5YztT2qZftRItaPLYZL7yugHQVl42kXb4+u8X1BShXqS10qLfkNLzM2J03VlxRDjpUGVq4FdBi2KJaYDbKUpKu6vc0LHbYEFuQ9CjhBQNqTUucpx1ll9vkA4UPY0krDbuGqGC6U7e1J+CSCFkDaBzmpqZTSUpLowrFV0yYZXmMspUgEcn3qVyJktRzEupWy0cgcYFZSDClfEJDccrJV7VrZMRhEkIHKiec1oG4cCFbw6ohK8Z6VBq43wUk6aiBbGm1QHG3cDlI4NT7fJddtqNqFAr4IIpplxc5/7xO5oHjNaNiOhLKdiRiolbfYadlNx5zUVJCAkAYqPIdU1dnlMA4B5pd5tDkrbMYJDg6iqn7SnYUwqES6o4KwPlimNZWCxtjKplzXMfOdvQe1S5ENq8SQ0pJDCFZXj8xpVrgvpg+rKVK61apjiO0lLYwM5NNRFZ3CQlLLQZDYSjG0AdqrpMJM25BLgw2wMJHuferZxBUhWT8xVTer7EsNuMmUjc4oYShPVVT4Jr0JCnG34iow4KeKz14hIFuXIZHLf4qzEbWV3kzluMW0pbUeOtX65rx0rKckNlC1ioXTQ2rFTp68qduwiFWQelbZRDbigTj2rlFhIYuPxhP4TXQ2JwnIDqemOaiuCuos3LJOwnceKcjrKpPPSoCS6o9PTVjHJxgIHTqaa5IEzfgkAUEq5yTSASBnFGkKPJGKtLhfCj1pKztTilAbeaSrKjgjikIaT6jzUhtCNvzqI8pLDDj61YbbGT/woQ58SYwVMvBCknCkuHFTjTk47ksEHUipbW8lilKEjoM0ClKh0phO5w+h1tR9knNKWp1HAGTS45J8jwbSkUAhO4qNMEyAncQMUnz1d0kUgJGBu4HSj3c8c0yJKAOQaWl9vrnFADUySIzBcWDgY6fM4FFBZKG3FupCVuLLhSOcZ7ZpTrsd30LAUD1BFVc4twlNyYalJSFgOoCiQocjv7Zz+lTjZq3chK6d+xc5zwkUFEBOaiNyXEJAWjmicfW4QAg1AsJHKzmjPtUfzHUYG00sOKIzigB7bx1pOfnTe9WMCh6s80AOj1DBptScKyKUMnpRKOOtAABJ70FjKcjrTYWlDgyeKQ+8W+QDikBIa4Tk9aPCV8k0wy+FJzQWopPpPWgZCuV9hRCqPjeQecVTf4qkvnyokJSuwOKl2LTziVqmXYhxxZ4Qeas4K46bm6y0ygbATwKWQIFttsiVLRLns7ceraqp1ylK+yn1Nn8KgCB7VLekEeW8nlJOFVGVHAkuoVyw8nqe1AD1uLBt7W0f6xPNVM51yTIDFuVs2Hke5pyLc4USGtlboUpsnYBTdlbw84+6MBRJBNACA3NSormpzxgEVAenojIX5qsEcpqxuVxjsqWS6EpHuaxzs2HeLoGW3R1x1pNjSG4V0RJv29fKAa0NyujUp1EVlHp6HNOQrNbYLe9xhJV1zmno1vjSJpdaTgUkmDZKgRkIZQhOM1bN4SAgduajoYSg4HBqQ2ChWSM1OxFpMkLSpTYIP6UhDbKXMlsE++KNClKc6cUTq0pcx0NMETE7duU0SshfyqIJ7DXoUobvalpnR1DlYzRcLEl1JWgbT3rn1/iqumqvJeUS2k7Uj5VrZ1/t0BQQ8+kKP5azsdxq4anMuMre1nOajIaJzNphQG0J2AVD1WgtaVdW0MJPFHdLml3UTMRtXAIzin9TEOaVdZQM4AJpPgTOYwn0ItSgo4WTxW20qouW4k+1Yq1xmpUr4Zw9+K6XaLe1FipQnGO9VxVxT8izjMqWgEe9TkpS2nBAz70lgBKMJp7YOqqtURbUNpPO0inhhX0ps7VHjtSVL2Dg1IYbzgBCRRAnGaQ2grXvV0p4bVuhPagZV31akWFwbgnetKeR15zj+lZAA5JNWd3uzk+SWkYDDajsA79sn/rvVaOlek0VF0qVpcnnNZWVWpePA9HlSIjvmR3VNq6ZFWw1PN+GIKW/O3Ahe3jGORj9qo6FXVKFOo7yVyqFadNWi7Fkq+3JcoPF/GPyAen9qs2tWfeHz4Y2Y4CDzn9azVCoT0lGas4k4aqrF3UjWuant5jpUllwuE8ox0/WpCJtskNBxMxKB3SrgisR0oZOOtZpdMpNYujRHqVVPNmblt22uPBtE1tSz0GaelR4jMFTshRShs79w6g/9Guf5UD1NSXZ86RGEd6S4toY9JPtVT6ZaScZYLV1NuLUo5NFH1TFShtp5lxW3CVOcc/PFWB1DaQhCvN/F2CeR9fasKE4oVfLp1J5V0UR6hVWOTbK1Ja1cBa/nlFSG1tvJC2FhaFAHI+dYGrzTU5EaeqMpA++wAonofb9azanp8Ywcoco0afqEpTUZ9zUBBSM0rbkUbitvCqZLuOlcg64tIINIUo+ZgiiQ8N1DeFOYpAJKPUD1o3U70BOKW4rYgGkpcAIJoGMqR5KeeKCVpUOtTZDKXo2RVWGikkA0ATLjNMO3yH9v4E+n61E09H2wfi3uXnyTz7Zpm5uLmXIQFDDQ9RqwjlHwgba/E12+VHcBSmw2VK6snlST+Ws9KusidGMOGClOcFfyqRe7oszPgWEncR6yKZS0GIaWmk4cPWkwISjZ7QwFSD5jvVQPNUN38SIsNktMRzgcDArQ3K2REQFPScKdI6GqKNpm3z0lb8dJGe4qLv2GrdzBzL/dNSSvhojbpKzwEitdpTSEy2pM+4ZJHO3uK3un7BabRGVJajMoOPxkDIqAbj513cS1y2Tgj3pKNssd/Iq35Tku4FmNu2DitBamHG07R1NPRLVFSoutpwpXNWTUdDB3Z5qaRG4EslsZWvJpxr1HBFNrCnHNxVxUhKRgEVIQ4otpTsJwT0NQJeVM+b0Wjg/OpjoSU4Izmq+Sh915DSUH5n3FDAhx4yXtzrq/Uo8ZPSqmW7/pS0R1FW3jIq4uNsdUxiLI2rx+GoUS2m3xj8R6nCc5qIzH3C3SJc7zXlKyelMlF1tCFqhqWARjIrWzwkqbKUd6skQ2HIm55AwBmo2HexktLwJkmZ8fOyDnvVxqq4ot2nXVKA3KGMe9OSp6mWSIjXoT7CsLqy8yJ7AZdZUEpPtUW7KxD3mVWl5K5l63pScA12CClYaB7VgtDx4nwLiw2kOHvW9t7ySraB0GDRAJP2i1aykZNOlwEYzUbcrJOCBS2kqWc1aMfTtA4pOwKPqpxLZPFLKAke9OwhpQAbwmoV0nC1QAtISp5w4Sknpx1/tU8jKwBWNv81E27lTRy22nywR37k/ua2aKgqtTPCMmsr+FTw8sqwOaVRDpR16M88ChQo8UAFQo8UVAAosUdDFAAxQo8UMCgAqB6UZFFQAmlNuLaeS62opWk5BHY0RFDBoa8wT8jSQNQrfmR48hkKCtrZV3Kum6r91jaCrGE+1c9SSlQUkkEHII7VtLXIdn2EHJCkDyzk5yR3/Y1w9fpowSnBYO1oNTKbcJu7JYSgjjrTZbUhRPvUJuUsOFJ6pOKf8AilLcANcs6g4oLxhXSmlnanrVgkJdaA71AlRl7Tg0MCdDd3NYJzxUCavyH8AcGm7Y+puR5ThqylsIcUkkZo5QFc24dwTOjlDmNodFR21PwLsUqVkL6exFNMarhXFhe5soQfwlVZbUepVSLuxEtayoNDaVD35qLaBI07zzSbuXVJBUrrVkw0l11T5HHas7Z4bsgIdlOEuHkg1o5kpiBE2BY3Y6CmgKeUgSp6vOPoT2qsuFxahsqaZUAflUO9X74RtSxwTVZZYb1+cVKWSWknJqLY0i5gPz1QlSHHFKa9jQtchUicpSGyBmrTzI7cYQ2QCnoRVhCt7EVgKQkZNNIB6Op3IA4NPuGWcJ6inG9qADilmRheSnFSEEyw6ohKlYqSWQk7Qo0wqakLGEkGnW3iSXFdKYh8ISEYPOe9JSfLCypQ46GodylKQwA0cbhwazjzN3cbUrcrarpik2BaSJjTl5KWnkkD2NSlSGnUhtWFGs3C0tOKjIfeKSo55Naa22ZEUhxxZcV86FcYw5a1OvIUAAnOalSowTEDahx0zU9xPGUHkVElSMMArHPzoaISVyAphlETyG0AlXyrIa2jRLfaAp9KAtR44rcxkAjzTzXF/FC8rumqPgWHMtR/QMHqe9VSwggs2LnRmH4TxaHI6Yrf2aC4gKW8nCj71nPDuz/A2RDzwyXBnBrdJUMdMVKC7j5kIcGVbAOKkNNbRTacbs1I/LxVgwZHQCkrylPvSh6U02t1DTS3nThCAVE/Ic0+RXsQbncEW6ESSfOcSQgDsfesMetS7lLMy4vP7ypJUdhPZOeP6VD716TSadUYer5PO6vUOtP0XAodKMCgBR1qMgKFChQAKFChQDBQoUKAQKFChQDBREUdCgQmhilUMUMkgsVrrOl1iystlJBdJX9B71k8VuY6g3bUIVgONtJQQPfvXJ6nK0FE6vTY3m5DS46A+pwD8VMIa2ygT0NPl3cjFFgqwUjkVxTsks/d7VDpTy0IdY3A1CU6VI8tfFORULCCndkUAVr6THkB1I4zU9qUX2wodqdebQpIQQKQY4jpAA4VQBmRpZK44jNq2ADGaQvS0CzsJcR631nPNWMzUMVhCWGFByQr27VWpXMkyg9Jc3Z6D2qOAJ3wrwih1C9q8dKy1zlvhaw4pWR3NaOXdPK2tOJxjuKyN8lCe6Y8blauMikxozT0pd0vKIZVu3HbXQPsuVZ7F5ER0MvEeoHvVLpvR6I1wEqY7tcxlGfenr/e7kqaza1MHckkeYO4zUVjLG8lvp+E+CXZatyq1TW3PPSoVohLTa2w7+MjNWojoZb3HmrEiLYE7SrJFLwg/ixikJdSRwKPG5XypiDKW1DKUAn3xTqUbWcEZBFPNoShoADrTYyytRUfSelMCqVAlyn8hQS0D0NWnkbGkbPy04kKDZGQDmkOr2dTgK7+xpAJMhC1hB4NSN4Ctg9qqpLbrqSpAw8jrj8w96ltOJ8tDzqwkoHqzQAbCipCytWNpzms9dLo5IllmM3lAPUd6E2+FSlx4iSdxxupVvjhlsKWAVLHftSbBu3IdyuarTpR2Wv0qSnIz71wGD8RdtTbjlanF5J/Wui+KGom0wUWhp0FXVeDWe0FDSZ4kKRnng1TJ3Y44TkdatTao9qZaGQUJx+verZt0OI44IHNQ2Wyhv1DrUphs4z0FTTaM6bWSW0jkU8UkdKaaXjgnOaeCsmrUy1SuJVnZVLqV9TNoQ0hWPNVhWDgkD/KrtZGOayGqH0u3ZDSSfumwCPYnn+2K2aGG+svTJl109lF+pSUQ60dDvXozzwY6UdAdKSetAkHkUM0VCgdg80eaTQ70CsKoVJbjNhht6XIRGQ64GWi5xvWegFMONradU24nCknBFRU4ttJk3BxSbQmizRHrQqREPNHSaVQKwY6UdEDRg0mSSH4kYypiGAcbjyfYdTWyfSCkbAM7c1lYESS66mS2ghts7is9DjsK1O1SNm4+rbyK4XUp3mknwdzp0LQba5KxbjiHMAGpsbzHUE9DRq8sr9WKls+WEkJIrmHRIExCvJBB9Qp6CpwxyD1pp4K+I29qnR2i0jcRxQgGHEvbgRzipSXkLQPMGCKB5UVgcUkoC+QKYGfgaTixB563CtR7qqFMCo8glP4R0q7nSQ01lSyEjoKzNxuKFIOwg0nZByVlzuaQCHMZ96gaYT8RqIvhHmIb9RBqluq5EuV5TWSSe1bjTcKPYrIlck4dWPMcJ7DHSoLLJcIf1PfbfCcba2lDpTkpHaodkmonzAXmwtI6FQ6VQeW7qnVjslacNbuB7DNbaDZkQ0jyxTWWDwW6luFQS1wntil+XI25WskVJiNgNbTyakFAA2mpkCJHTjORmpbbZKsq4pTTSQvgUp9W3bt6k0wHTtAyTxTC2w+oZOEg5FAuYeU2vgK6GiSS2ShXQ0XAZkLcjSyspKmV9cdqPzmpJLaVZCh/Wnd+4llYBV7fzCqy4Mot8Z2WFbU7eB86QE2IvY0Q84nCTwSaycu5OXC9LYYc+6BwcVS+VOnodWh9wJPzpdpiyoaiEpUtR6motkrGohQm0ufhzUqcP9Bf8pOFpScAUmGotsjzRtWexqYjyWwSsjKuuaHwVT7HAbtZJEm8uSZTiuVd66BoqAy1BykA81Ta2V5eoVoZRtaPIrR6BdS5AW0cEjnNVJZJzd4mxQNwyalJGU4HFMNkdKeBxUygPkU6l3YkA4poK9xSVH9aadgHnXUNR1vr5ShJWcewGawD77sl9TzyytaupP7Vb3q6rWpUJheGxwsg/iPt9KpK9F06g6cN8llnI1+oVSSiuEChQoV0TAGDQxQHSjoEFihijoUAFg0tpH3iCsHZuGTQbSFvJQTgKIGfaob94uaNYLablsiIzdGrZ9lqbGVtrSD5ueueSf0qmrU2YLqVPflgVZouqdSamtV1feRKYebENKFlIYa2AoWlPQ+rqaXZrhKvelUzJ7RbuERXw0rjhwjgLHvmrG8Wm03Ge5IbuUqJcbaUx3JMXhexQ3BCv5hg/pTKnG24LFvhhSIjCQlCVHJVj8yvcms1DdJpx4/Puaa9opqX5/wDBmhR4oYreYbhDrSqIiioEKoZPASkqJOAB3pNPw8KnNBTgbG4ZWTjb86rm7Jstgruxs4EZpqG016gGx0V37k/1pqSXjMOwZp9b7i1utjq2Rg1XuTHmZGSmvKSk27s9RGKSsgn48qS5tHoV2rPzbldLJNKJKFbOyuxrZRpCZC0qGAoVHu0aO7HLcxrzWVdD3T9Ki0TRmY+sIJIU+vBHarxjVltksgBwJ+tY+f4f/FPefbJW5snO1XBFNq0JdozQc8zcB2SeainJBZHSY8yNJaHkuJV9DSivkhJxiubQZM20TEpc34zg5rdMTmXIyHAQSoZNSTuJozt7uSZSlNM8beKxEp6QX/JbJJUcVo5oBVhsepVS7VpxDclEmXylXII7VF5JLBH0rp0oKptxGQnsasb8hNxjhqMkghO0kd6s50n4ZaIzKd2RjcnoRT8GKlseYtvOe1O3YVyksFp+DaOEYJ74rSMEoVhScinRtCvSjAp5pAJJIqSQrhNFIeKgrj2qUkJcG7P0qItv1nHApRWptnHemIfa3IdVuHFDPmP5x6ajtKkK6n0mpYKEoKR2GaAA+ylaRz6h0oBO9ohX4sVUm7bm94/IraalIucVQSrzUg+xNIBxTZ8pLn5kHr8qz09Mq+3b4dBKYqDyfetA4kyHBtVlpX8p61IDLDDOEJSgAUNDKlceNb4yIzDaeeOlFKft1thhbpQhR7d6guSg7dHF7wpCOmDVc1FVeLuXJJJaT0TSuBNj3BE4Lc5wOhpbDoD6lvqJSPepXwUeOjY03tSB2qBM8tKcg4FRkVyd2c117cvP1AQynCAMVf8AhstRQ6og81mNWSYr93wynoMH61tfDhhsWpbqjgA9arXJOXuG7YaJTuVTqlAKApDrwZbO1QJ4wKhSpzcWOqS7k8gBIPJPyq2MXJqMeTPJqKuywUtOOnNUN8uPlJEWO5hw/jKew9qiTL9IeWPhCplA+mTVScqUVKJJPJJ712dH05xkp1fl/k5mp1qacKfzCoUeKKuyc0FChQoAUOlCgOlDtQJBZpTaVOOpbQMqUQkD5mkU4w6WJLbwGShQVj6Une2CStfJIirj3L7QahxVhMJ/4VEjdn4hwfjGPkeKjXfTjFynR70t9233SLgJnRwHAcAgb0+4BPNRFWa4NvTWrXqlEK0zX1SXGvKy+0VnK0oV7E96OHaYFh17bYtockoafhvu3Bh10uAtgDYtWehKq5+6Sw/zz/Mo3KKfC/O35hkllhmDAXFalOy3nnTIkynRhTzmMDjsAB0ohR4oVvhBQVkYpycndgoUKGRUisI9KKjPPSioGgu9TLaw1JuCWXM8glOPcc8/LiomKn2dKvtRLiQfQCSR27f51m1LtTk/RmrTK9SK9UauM18GyvzVlxajkqNQ5m1XrTTxmIFzXHd6ZxTV0hraQX2CVI7ivLnpSA1JUh7LR5q3YcM1pTDw+h9qypk7HN44IPStDapjKgFKUAaSGwIS7bpqUEHaT1q2fStaQ62eR/UUavIkpAOM9jTjaFI9OcpqVhFdMgQZjOJDICj+YDoapVaYlhRDMw+X+XFassgq56e1EQED0d6VguZCNb48iUlvcAoe9WcxtmC2EBZSojhJ6GoD0QNtqlMKUQnrjtWbm3mfKubcdDa3AjhPFK9h8mojvFKvMfRgds1aR5jLisjgVBtlsmzGEuTxsQBwjvU974dghlLSR9BTQiaFNFO7cKJByvngVFLIUgFonFBSnk4QAce9SETnQAeKSpKVADFMIcV5gBz86dfWlUZRa/GO1ABhaW3AjIpK3kJcUNw5SarHG5LzHmNrw4n8p71SS5E2KCte7NJsYcNbj0uTFA/EagzLRLDql+cQB2zS7NcUKmrW6hQVnrir8j7QJQ3nPvUeR8GHVfL3Be8mM44Uj2qNcdRaglRvh9zg3dccV0FNmZjJytoKJ74plyzNOOBwtJA7UtrC6MtYIs2Kx58l1R3dQav7bKQq47GUkJJ5qc9bx8LtSMDpTtvtjcdsqH4lDINO1iMpWJ5Uws7dw596xmq50WM6mMh9IWeMZq9mLTEiuyCr1AGuM3dci76gcWtxQO7jmoSZCCuWN9iw2mEOrUPNPOc9a22gdjmmnRvASVhIrkE5uW5dERnHVKxhI5rs1psrlv0I02fu1K9alKOMdMUU47pJEqstsbgnXt9u5usxwja2rZuPO7HGajyJz85SC8RhI4AHHzNVDPKqntdK9Tp9NTp2cVk85WrznhvA6BgUdChWwyApJ60qiPWgYVChQoGKHShQHShQJBYqS7BkNtlRSDtxuCTkoyM8jt1qPUe9R31XW33CyOuRb9cFLSNqvuX0tp5LiTx0wOOaprVHCzXBdSpqd7j1SlzS55iyw0l91CW3H0pwtaR0BPtVfHuqJF3RZb5D+ybysZQB6mJHOMoV8z2qStCm3lNrGFJJSfqKIuNS11lBJSp8PAVChQq4qCPWioHrQoAA60qkjrSxQKwMVf2KEoRlyVJP3p8tP/uggk/0/pVGE1t46AzCZaCAjCSNoOcHArl9Sq2htXc6nTqe6e59ipmpQ5MW6g454qdBntuN/DvKTu6Dd3+VVEglCiTmoykIeCVJWUq+VcG52y1uFgadJej8Z7VCjW11lzBJ4qxgOSW0BCllY+dTMEvElNFgG2mX2kb0ZVin48tRUQoYNPR3fUpvoe1G402HdxAGakASniFhQ5zTvmKxwjNGhLRHGDSvwHGKYjMtKWw2XUKBQrqDVjb48RRVKEVpKuytveqOD5qlCO+k4rSpLLERLaz5aRzmooYqRNSw95fdQqpdClTMqOSaj3K4Nuy1LQhRQngK96EVTha+LeBCe2aLgXTKSyjBPWnN4UNo61XsyFyTlPTtViwyUpCldaYhXlDZk9ar3o0ltzzmV5xzirXOVBNIdSUOpIpgZ+TeoqcpkAsup7joadt627xnzEhSB3qZcI0P8UiOhW7vUyDGjxYgDDYQk0rDGEWiA0raiKnnvSiI8FwJS2EhXFSH5LbCkFZABqnusxDq0hHIT0NAiyeOACRuCqgKWtD6QBlsc1JiO+bGBd7CmnnEJSXEHIHBFJruQlHuG4vzow2H64ph+UiAhLjigEAc5NMJcEdZXv8AQoZxVLc2m74w4yJIQlIyQFYNQbIpXK6+amgSyttl4ADIIzWAYfaXdnHQRtGTVPqyEIUos22St0g8801Y4N0cSErbXlXHIqpvJeopI0lghm9ayZSlGR5gzXR9TT5bSmoaXQEYOUJ44+dR9D6f+zYy5jiMPbTjNR767IkX9wPggI9KAR+X/wDvr+tdLptO9S/kYNdU9ixCYSetT0DApllvGKkV6SKsjgvLFDpRGjHSiNTIsOiNAdKBoEFQoUKBih0oUB0oUCQptCnHUtoGVKIAHzpy5Whc63sJbnCLLgvlyJOa9aWl9FIWPY9CKXELqPiHo6A5JajuOMIP5nAk7R+9Z63W2X/hQau0teXF3B1r4idEfwWXlgZcQU/kUOf2rJqJ52muhDG4uGE6ifvkKff2LW2xb0OFDkdzcZC1DCcJ/KMgH9KBUVrKlHJJyT704V/EWiDOcjJivyW/NWwle4JB6EH2I5podanp4JLciFeTb2sOhQoj0rQZ2JJOaBNETzRHqKBix1pYpA6UoGoydiUUSom03BhKlbQVjn2HU1sysJWFHCkEEoI+dZuxMx3ZC35CN3lDj5ZqxW+ltCQD6R0rz/UKm6pt8jvaCntp38yYiKw+ShwDmqa42d5hwqj5UnqMU3dL0uHtdZSVAdSKZi6+hreSiSkjseK57aN+RmDf1w5vw8ptQwcc1s477L7IeSRgiqKaqzXVhD7TjZX7jg1Y2xLaIYaCgRTQMnqaQo+ag8illaFsjcMjoaYUh1tJ2cioqXJTRKgjcjqRTIkxUboppzH1oB9SFFDvUU2mQZDIU2ClQOFJo5LZWUKSecYNMDIsP3GE2NjYfCfwk88VZKuZmNLiT9rKlJyhXTB9qluIWYyUwWgQBg1TXS0XGegKKdhSO1RGOW9YfeEVeMA9T3qReZYbaTARjIPaqiPDuSWA2wg7muqu9SWbcoq8557es8nNIZd2tOGkJx25q6WoJbGOtVMQhDYSjrVo2glAKutTRFi2kH8R60pRTkBQoBY/CDg028tKFjNAilfdXcNQIiH0tNHJ+dXeUlranj/KqF6QiNqpA6bjzUmXcEwIE155WA2nj65qNyRUXKQ9cr+IzKiGWuOKtkwGkKRu9X1rL6au0Z9x+Q8rBJyK1USVHkoUvzkgDpk0LIMklKUENpHWo89kqbDQGEnuKii8xUzVArC9vtSk3Uy3sNxzgHihkWmEbfHcYDCysHpuFc58QLQmDFUiNKcZWocEHGa6aJCEkqcQfR3rgOvNSz79q1aGM+SghtCE1VIVNXZB0dZZsy/pbkqU82DkrPNdtgWuCJYKGEjbxwKpNEWhdu0/961iS7hXI5FbS3QlMo3rHJpwiSck3YlNshhYSBhBGKyt9gvG7uy9yS0QnGVcjjGMVsX8BnJFYm6pX9tPBSyrGMZ7AjOP610+nRbrYfY5+vSjTyRm04TSqNPAoGvQs4aEk0RNGetFTEwx0oHpRDilUCE0KGKFAxQ6UKA6UYBUcJBP0oEhMu72ywvR/jXJQfU2JKlMN70x2s4C1+wNLuWlLU/LfmhM+F53Ly7e7sbkJPOVJ6cjvUDUltu8+C7NsOxyS7ANulw14Bcbydq0Z/MMnjvmrGHNucyW5OkW2Xa4EeD8G1Hk4CnXCR6sZ6JA61z5OTkrnQioqNuwl5bai22w35bDTaWmm/5UJGAKQOtFRjrW+KUVZGGTbd2HRHpR0lVMQ2etCk96WBmkNoUOlKB5oqGaqqMspq5d2aSpUeVFDfKUAhQHUE5/41PYjNyAA4c/KquwvH7SQ0APV1Py9v6083KcjyBn8Oa87q1aqz0Okd6SLswIqMMvNJUg+4qkuui7O+S60Ph1np7Grzf8ZHGFc9qgtpku+bBkEkEZbV7GszNBi12KTBmlhb6ke2Dwa0lmEiK4G3FlQ96fMT4+L8NIOx9rhDh/saYgKeiTvhpqSMcAmorA2zXMuBSMA8028+3GXlXKT2HNQlvttMqKF849OKOLFKkhbxKieeamRHSQ4BIY9J7/ADqSy82tGXMBXfNJVHUlGGuntUB6O4pfqJSflTAkSwiFbUlHG0dfeoC5bkhpJaOB3NR9RzFfZiHGifLXx9DTdsc8y1bEfiNRuMfkzPs95p8Dc2sYVVEiW7JuClt8NE8Cr1xhtyIIa8KKj19qQxp6PbUFxUgqJ/LihgWVoa9O9XPFWSgQlSQrGehqHb0FDJz3HApl+4Fh/YsZQetPsIkvFxLHmL/Ekjn3FQbk4/sTIYBWgjPHannZLS2ikO5QaKOrYMNKKk+xHFAymdjyrnIE3ZsLWAR705qZtMzSjpR/rFlO4fSrWUs+WVRsJd6FI71UGQzGivN3JQQFA9ffFJhco9PW+KbaWiMOdyDVsbW4mKpDKjg1QWue2xclhDgUhR4INbOO5uaBzkGkhsrbfYG2FFbyiSfnVitTcJADSMd8ikuOKQ7kLJB9+1SF+U4zubwVY5FK5S5XRQarvrEDR8p9s4fcG1I7g1x7SEIztUIeeTuSlW85+tanxFmo4YQeM8pqHoKP58hxSR2qt5ZZFWjc6fFdSuQFJThIGBVyh8qIyOKr4MUIbSMfvVumOlKMkVdFWElYZcc8zCAKzF9QE3hQG7O1OcjA6dvetQ8tuK05IcHpbTuOO/yrHzZr06UXXVlQHCeMYH0rq9Mptzc+xzupVEoKHcYHSiPSgTRV3DiXCPWioz1oqABSu1EBR0AChgUCcUmgAzQfVcZN4Z09Z54t7iIomzZaWwtwBRIQ2kHvxk0Y6UmdBgXaSmY84/b7mhISi4xDheB0Ch0UPlVFeMmsF1CUU8jDku8WB9l28zm7xZnXUsrmhvypEVSjhJUB1TmrCah5qWth5xSyg4yTniqe8/4ok2N3T823s3BE9xphF0h/hA8xJy4j8pwOtXlzcS7dn1J6BW0fpx/lVVB+1b87f7LK/u/nr/ohUYoYo62GUFJX0pWaQs0ANU4jpSMGnECoobDoj1pRpBqiqy+kXWnm0GUp5SsKTwM9MYyf8qRMZdbZCu1Ow2zH0q7I2epawpJ/3c4P9U1NZQi62rYhWHE9q87qnuqM9BpltpogxZT6GRtPSpDdwe+LQVp79aqHBNguLbW0ogd8VYWeQmVJS06gg/Ss6LzTrjMPNB4+lSucikriMOtjzkhzHG8dRTgbUWyM8DoKZaUpp7aRwanYiG3AabWFEbk9s1KUjcn0nFOpCdgGaadbUBlBpiGtzzLiQs7kmnVAKOFDoahPPLS8gOHjNWCQlQz2PIxQNmdu9vSm2LaLiSkr3JT7UxES3Dhhe7imr1cYjsnaxMbVg9Aqo6VqfSlkjaPf3qAy3htmQ+l8HCfnUu7qbMQFLiSUnkA1BDTnw4ZbXgdyKguWp1LhdafUsjqjrTAuIcoOhtLajuHUU1elJZUHtuUnr8qp7a+6i6qSUlKcVNuN0iyXkMFaSVcKTmi+AJUB6HOjAbkJKT3qxecbaYAYKVEfy1z26ok21S0sFYSr8JFT9Pz5EZ1BkkqSrrupbuwWNbDb+/8AOdP6GsFriR8bezBZWdp4OK3zk62hspVLabKhxuUK59PbQzfDJcIXk5CveiXA48gh6RfgxW3g6Vg4Na+JGdbgpWFZOOlIgSN8VJ4UkjgVJZlIQ8Qr0p/tQkkKTwVMj496QUIH61W3aVeLLa3JLeF+nselX8uQqI+HmkFaTWF1xqF9EdLTrHk7h9AarZXFXZze53mVeLmUvpO5RrrWhLKIVsbcUCFLG6ueaYtTd1viXCnIzk4FdytsVMeOhCfwgDilBXZZN/0osWEBAAqUoZTimEfiyKU64ptouH+taEIqdQuyGIaCy+ltKsoWg4ysEY4/671lAcVaXO7IuTAQtgodbcO1Y5BT0/4ftVXXo9DTcKSUlZnndbUU6t4u6DzRE0M0K2GQHWjxQFHQIFCgTik5oAFCjAo8UDAOlCiPWgKBDrT7zCiWXVIJ/lNNd8mjoj0pWXI23wDNDNFQpgCiUKXSV9KAG6cRTRNOIPFRiSfAo004SlJI7DNOE8UkhClFLiglJGCfaqKnOS6nwaaHK32z7LlspQ4lAT9e9VyS7ap+9pR256UmUqKqMzKhzm3nkoSlaUL3HgYyaiPXAcefgfWvLz953PSw91WNL8azcI6stjdiottHkXMKLeBnrUGJIQW/MZWk/IGr+3Npea3KAzSWSTLjchSMpIphxKdu72o0tBAxmmcKU5gZKamRQ2Xn8ZTnFKTLdQoeYODUtKE46Cm3WAo8jigBqWy3KQFNq5qIlMyMNqVlQNSghLSjtNNGagKKVFPFIDENswJTKAlB8zuauWz8NGS08NySPSruKFCookybCU40rCzkHpU1DYUpRSrCqFCmhEGCUv3pTa0jI6mnrlDgx5AcVGTuP5hQoUdgK5y3/aD6VbstjnBqHcWPhvUnoKFCk+BmW1TdkOuR40cEOY5PSoUy2XliI3KW+CznGCrNChUObkuDT2iY8IDKCeeK1OxPwO8Y34oUKkuCufBVTLobZBcekI81jBJHcVxDUWol3+7lIBCArCQe1ChVUmOmu51HQenTAtaJS8b1DIwa3iUOEgJPFChV8VZC9Sc2ChAHeqvUj5bs5ZIB81QSPljnP9KFCtWjipVopmbVycaMmjKAekCiPWhQr055oFChQoGGKOhQoF3CNFQoUDFDpQoUKBBHrQFChQMOhQoUCYWKOhQoBApC6FCkS7jOecUtJoUKSGxRPFMv8xnf/cP9qFCqKnJfT4LC2xozFuiFpnZvaBVznPUZ/pUa6uRlNqbUghXYihQrzFX338T0lL3V8DL/AGrJhv8AlMdzW10xeJXmBMjkGhQqqLyWPg2SS5JHmfhR7e9SU4IAAxQoVcisUoUhW4p4NChQBEfSoJUrNY+5yX0S8NfrzQoVCQ0f/9k=',line:'data:image/jpeg;base64,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',conn:'data:image/jpeg;base64,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3sc7voAma52QQBjgPDggrNYkcyDQtl7htWoQcOPEbPHPVU2qwRy0NfdICSzVmlvpEcwwHkuhj7P1WmuZJ7cxrPa6DezZEeOQHDkt0ui05YrcTxLs25xPLh/HbGOXQeiOCCk1Ngr29WqxF4gj0j0WF5OOJ6+KxinfVuCxGMvi0JrmjzGF0FnSq1mexNLvNuxB3eTD8DYznh0K9i0urFO2YB5c2sK2HOyDGPAjqg5qtFqbqVS3Vq3jcOxI+eS20slH3stzjBHLA4KxqQfamqatJZnsNNWxuYBHK5gjAaDtYBwSSfHKlQdn6kG7Y2W06vE8PjrPmJjaRy4c8DpnC2WNErTXJbQlsxOmAE7IpS1soHD0h7uGQgj9i+PZmkSc8HHPX0irtV8GkVa9enXhMzY6km8iAk5njwd1HHkrBARERBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERARERREREEREBERAREQEREBERAREQEREUREQEREQREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERARFrnjE0MkTnOAe0tJacHB6IEc0UrntikY90Z2Xhrgdk9D0XlixDWjEliRsbC4MBd1JwB8Sqbs5XhqajrUFaMMiZPGGtH/AIYWztZ/2XF/5yv/APUCKukXOatqFhtm8INTex0Ay2KvUMoadnOJHYOM+WOC3VNUnfb0ySwWtq6jUDmtxwjlA2iM9CD/AAQXqLlZNct93rSGR0cd+1IIXsh3jo4WjgQ0DiTj4ZysjrFuOrqm7fNK2CtvoLE1YxuBzgtIIAPgcoOoRQ9Jba7o2S5Y30kwa8AMDRHkeqMcx5nitrbUTrj6gLt6yMSH0TjZJwOPI+5BskkZEx0kr2sY3m5xAA95WMFiGyzbrzRytzjajeHDPwWnUKUFyJhsQmcQP3jYifRc4cgRyPxXNMintTa22GsdPtz0g2OpyLxx/SZHDJ4t4ckHVQ26073MgsQyvZ6zWSBxHvAW5cc+xUa/Q+4UZa88VlkcmYDHsAtIcwkjjnyzyyr3tJcsUdHlsVHATNfE1pcMji9rTw9xQWiwmljgifLM9rI2Dac5xwGjqVQahftafaqadNdlLpWSSy2I6204AEANa1oOBk8z081X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'};
const TOUR_ICO = {
  verse: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><circle cx="10.5" cy="10.5" r="6"/><path d="M15 15l5.5 5.5"/><path d="M7.8 9.2h5.4M7.8 12h3.6" opacity=".6"/></svg>',
  dive: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><path d="M12 2 2 7l10 5 10-5-10-5Z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>',
  map: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z"/><circle cx="12" cy="10" r="2.3"/></svg>',
  time: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M3 19a6 11 0 0 1 12 0"/><path d="M9 19a6 7 0 0 1 12 0"/><path d="M3 19h18" opacity=".5"/></svg>'
};
const TOUR_RES = [
  { k: 'verse', op: '50% 18%', im: [['verse', 640, 609]], alt: 'The Verse Inspector open on Luke 2:2', t: 'Verse Inspector', s: 'Translations and commentary for any verse',
    d: 'Tap any verse to compare translations and read what commentators say.' },
  { k: 'dive', op: '50% 9%', im: [['dive', 640, 821]], alt: 'The Chapter Deep Dive overview for Luke 2', t: 'Chapter Deep Dive', s: 'Setting, history, customs and more',
    d: 'Put a whole chapter in context: its setting, history, customs and more.' },
  { k: 'map', op: '50% 6%', im: [['map', 397, 407]], alt: 'The map with Bible places pinned', t: 'Map', s: 'Where the story happened',
    d: 'See where it happened and follow the story across the land.' },
  { k: 'time', im: [['line', 640, 459]], alt: 'The Timeline, and the Connections arcs', t: 'Timeline and Connections', s: 'When it happened, and how it all connects',
    d: 'See when it happened and how the Bible connects to itself.' }
];
const tourMfOpen = (sel, only) => {
  try {
    mapFiltOpen(true);
    const body = document.querySelector('#mapFilters .mf-body');
    if (sel) {
      document.querySelectorAll('#mapFilters .mf-sec').forEach(x => x.classList.remove('open'));
      const sec = document.querySelector(sel); if (sec) sec.classList.add('open');
      setTimeout(() => { if (sec && body) body.scrollTop += sec.getBoundingClientRect().top - body.getBoundingClientRect().top - 6; }, 80);
    }
  } catch (e) {}
};
const TOUR_MAIN = [
  { kind: 'welcome' },
  { n: 1, t: 'What this app is for', res: true, pos: 'center',
    b: 'There are a number of helpful resources within this app that are aimed to engage an eager learner depending on what they are looking for:' },
  { n: 2, t: 'The five buttons below', target: '.bottom-nav', pos: 'above', next: 'Next', cls: 'five',
    b: '<ul><li><b>Read</b> lets you explore the Bible like normal.</li><li><b>Map</b> shows where it happened.</li><li><b>Deep Dive</b> provides context on a chapter including history, setting, customs, archaeology, and more.</li><li><b>Timeline</b> shows when it happened and the Bible’s deep interconnection.</li><li><b>Settings</b> holds options and this guide.</li></ul>' },
  { n: 3, t: 'Try Read', target: '#navBtnBook', pos: 'above', wait: 'screen:booknav', auto: () => goToScreen('booknav'),
    b: 'Tap <b>Read</b> to choose what to read.' },
  { n: 4, t: 'Pick a book, then a chapter', target: '#screen-booknav', pos: 'bottom', col: true, hint: 'Pick a book, then a chapter', wait: 'screen:read', auto: () => goToScreen('read'),
    b: 'Tap any book, then any chapter.' },
  { n: 5, t: 'Tap a verse', target: '#screen-read', pos: 'bottom', col: true, hint: 'Tap any verse', wait: 'sheet', auto: () => openSummary(1),
    b: 'Tap any verse to open its info.' },
  { n: 6, t: 'Verse Inspector', target: '#sheet', pos: 'top', fit: true, sm: true, col: true, explore: true, wait: 'screen:deepdive', hint: 'Explore, then tap Chapter Deep Dive',
    b: 'Explore the words, translations and commentary here, then tap <b>Chapter Deep Dive</b> when you are finished.' },
  { n: 7, t: 'Chapter Overview', target: ['#screen-deepdive', '#navBtnMap'], pos: 'dock', sm: true, col: true, explore: true, wait: 'screen:map', hint: 'Scroll around, then tap Map below',
    b: 'Here you will find a variety of information to put the chapter you are reading into context:<ul class="tbul"><li>The setting of the chapter</li><li>The history of what else is happening in the world</li><li>Cultural customs and norms that might be unfamiliar to the modern day reader</li><li>And much more</li></ul><span class="tnote">Once you want to move on, select the <b>Map</b> button below.</span>' },
  { n: 8, t: 'Want a guide for using the map?', ask: true, pos: 'center',
    enter: () => { try { mapFiltOpen(false); } catch (e) {} },
    b: 'Learn how to explore places, follow a story, and use the filters.' },
  { n: 9, t: 'Last stop', target: '#navBtnTimeline', pos: 'above', wait: 'screen:timeline', auto: () => goToScreen('timeline'),
    b: 'Tap <b>Timeline</b>.' },
  { n: 10, t: 'Timeline and Connections', target: '#tlViews', pos: 'dock', sm: true, col: true, free: true, explore: true, finish: true, hint: 'Try the three views, then Finish',
    b: '<b>Timeline</b> lays the whole Bible out in order. <b>Year by Year</b> lines up kings, prophets and world powers by date.<span class="tgap"></span><b>Connections</b> visualizes how the Bible is one connected story. Use the overlay filters to see cross-referencing, prophecy fulfilled, connected themes, and much more.' }
];
const TOUR_MAP = [
  { m: 1, t: 'Explore the map', pos: 'right', side: true, col: true, free: true, explore: true, next: 'Next', hint: 'Try the map, then tap Next',
    b: 'Each pin is a place from the Bible. Tap one to see its photos and the verses set there. Drag and pinch to move around. Go ahead and try it.' },
  { m: 2, t: 'Filters', target: '#mapFiltBtn', pos: 'right', side: true, col: true, free: true, explore: true, next: 'Next', hint: 'Next opens the filters',
    enter: () => { try { mapFiltOpen(false); } catch (e) {} },
    b: 'Everything on the map can be narrowed down from <b>Filters</b>. It opens a panel with five sections. Next, we will look at each one.' },
  { m: 3, t: 'Stories', target: '#mfStory', pos: 'right', side: true, col: true, free: true, explore: true, next: 'Next', hint: 'Try a story, then tap Next',
    enter: () => tourMfOpen('#mfStory'),
    b: 'Stories follow one life across the map, like Jesus. Pick one and its path and stops light up. You can then walk through it step by step, in full or as a short summary. Try one.' },
  { m: 4, t: 'Timeline', target: '#mfTime', pos: 'right', side: true, col: true, free: true, explore: true, next: 'Next', hint: 'Try a period, then tap Next',
    enter: () => tourMfOpen('#mfTime'),
    b: 'Narrow the map by when things happen. Tap a period such as Birth and childhood, Galilee ministry, or The final week, or drag the two handles to choose your own range.' },
  { m: 5, t: 'Bible', target: '#mfBible', pos: 'right', side: true, col: true, free: true, explore: true, next: 'Next', hint: 'Try a book, then tap Next',
    enter: () => tourMfOpen('#mfBible'),
    b: 'Show only one testament, one book, or even one chapter. Pick a chapter to see where it is set.' },
  { m: 6, t: 'Pins', target: '#mfPhotos', pos: 'right', side: true, col: true, free: true, explore: true, next: 'Next', hint: 'Try it, then tap Next',
    enter: () => tourMfOpen('#mfPhotos'),
    b: 'Choose photos or plain dots for the pins, and which kind of picture shows first: Art, Today, or Archaeology.' },
  { m: 7, t: 'Political Overlay', target: '#mfBorders', pos: 'right', side: true, col: true, free: true, explore: true, next: 'Next', hint: 'Try it, then tap Next',
    enter: () => tourMfOpen('#mfBorders'),
    b: 'Shade the map to see who ruled where, either at the birth of Jesus (4 BC) or during his ministry (AD 30).' },
  { m: 8, t: 'Reset and List', target: ['#mapFReset', '#mapListBtn'], pos: 'right', side: true, col: true, free: true, explore: true, next: 'Continue the tour', hint: 'Tap Continue when ready',
    enter: () => tourMfOpen(null),
    leave: () => { try { mapFiltOpen(false); mapResetFilters(); } catch (e) {} },
    b: '<b>Reset</b> clears every filter and takes the map back to its starting view. <b>List</b> shows the same places as a list you can scroll and tap.' }
];
let tour = null;
// If a guide picture is missing, fall back to the small drawn preview.
function tourImgFail(img, k) { const box = img.closest('.tprev'); if (box && TOUR_PREV[k] && !box.dataset.fb) { box.dataset.fb = '1'; box.innerHTML = TOUR_PREV[k]; } }

function tourMaybeStart() {
  let done = false;
  try { done = !!localStorage.getItem(TOUR_KEY); } catch (e) {}
  if (done) return;
  if (navigator.webdriver && !/[?&]tour=1/.test(location.search)) return;
  setTimeout(() => { if (!tour) tourStart(); }, 700);
}
function tourMarkDone() { try { localStorage.setItem(TOUR_KEY, '1'); } catch (e) {} }

function tourStart() {
  if (tour) tourEnd(false);
  try { backdrop.classList.remove('open'); sheet.classList.remove('open'); } catch (e) {}
  goToScreen('read');
  const phone = document.querySelector('.phone');
  const el = document.createElement('div');
  el.id = 'tour';
  el.innerHTML = '<div class="tdim"></div><div class="tblk"></div><div class="tholes"></div><div class="tcard" role="dialog" aria-live="polite"></div>';
  phone.appendChild(el);
  tour = { el, list: TOUR_MAIN.slice(), i: -1, timer: setInterval(tourPlace, 250), cur: null, min: false, peek: null, holes: 0 };
  tourGo(0);
}
function tourEnd(markDone) {
  if (!tour) return;
  clearInterval(tour.timer);
  const s = tour.cur;
  tour.el.remove();
  const t = tour; tour = null;
  try { if (s && s.leave) s.leave(); } catch (e) {}
  if (markDone !== false) tourMarkDone();
}
function tourGo(i) {
  if (!tour) return;
  const prev = tour.cur;
  try { if (prev && prev.leave) prev.leave(); } catch (e) {}
  if (i >= tour.list.length) { tourEnd(true); return; }
  tour.i = i; tour.cur = tour.list[i]; tour.min = false; tour.peek = null;
  try { if (tour.cur.enter) tour.cur.enter(); } catch (e) {}
  tourRender();
}
function tourNote(key) {
  if (!tour || !tour.cur || tour.cur.wait !== key) return;
  const at = tour.i;
  setTimeout(() => { if (tour && tour.i === at) tourGo(at + 1); }, 450);
}
function tourDots(s) {
  if (s.kind === 'welcome') return '';
  const total = s.m ? TOUR_MAP.length : 10, at = s.m || s.n;
  return '<div class="tdots">' + Array.from({ length: total }, (_, k) => `<i${k < at ? ' class="on"' : ''}></i>`).join('') + '</div>';
}
function tourRender() {
  const s = tour.cur, card = tour.el.querySelector('.tcard');
  card.className = 'tcard' + (tour.min ? ' min' : '') + (s.res ? ' res' : '') + (s.sm ? ' sm' : '') + (s.side ? ' side' : '') + (s.cls ? ' ' + s.cls : '');
  let html;
  if (s.kind === 'welcome') {
    html = '<p class="tk">WELCOME</p><h3>Want a quick guide?</h3><p>Learn how to navigate this app by walking through each section.</p><div class="tfoot"><button type="button" class="tskip" data-a="skip">Not now</button><button type="button" class="tgo" data-a="next">Yes, show me around</button></div>';
  } else if (tour.min) {
    const nx = s.next || s.finish ? `<button type="button" class="tgo sm" data-a="${s.finish ? 'finish' : 'next'}">${s.finish ? 'Finish' : (s.next === 'Continue the tour' ? 'Continue' : 'Next')}</button>` : '';
    html = `<div class="tpillrow"><button type="button" class="tpill" data-a="expand">${s.side ? 'Map guide' : (s.hint || s.t)}</button>${nx}</div>`;
  } else {
    let foot;
    if (s.ask) foot = '<div class="tfoot"><button type="button" class="tskip" data-a="nomap">No thanks</button><button type="button" class="tgo" data-a="yesmap">Yes, guide me</button></div>';
    else if (s.wait && s.col) foot = '<div class="tfoot"><button type="button" class="tskip" data-a="skip">Skip guide</button></div>';
    else if (s.wait) foot = '<div class="tfoot"><button type="button" class="tskip" data-a="skip">Skip guide</button><button type="button" class="tskip tdo" data-a="auto">Do it for me</button></div>';
    else foot = `<div class="tfoot"><button type="button" class="tskip" data-a="skip">Skip guide</button><button type="button" class="tgo" data-a="${s.finish ? 'finish' : 'next'}">${s.finish ? 'Finish' : (s.next || 'Next')}</button></div>`;
    const pk = tour.peek == null ? 0 : tour.peek, cr = TOUR_RES[pk];
    const list = s.res ? '<p class="tnote">Click on each one to learn about the different sections</p><div class="tres">' + TOUR_RES.map((r, k) =>
      `<button type="button" class="tic${k === pk ? ' on' : ''}" data-a="peek" data-i="${k}" aria-pressed="${k === pk}">${TOUR_ICO[r.k]}<span>${r.t}</span></button>`).join('') + '</div>' +
      `<div class="tresx" key="${cr.k}"><div class="tprev" style="--op:${cr.op || '50% 0%'}">${cr.im.map(([f, w, h]) => `<img src="${TOUR_IMG[f] || 'images/guide/' + f + '.jpg'}" width="${w}" height="${h}" alt="${cr.alt}" onerror="tourImgFail(this,'${cr.k}')">`).join('')}</div><p>${cr.d}</p></div>` : '';
    const minBtn = s.col ? '<button type="button" class="tmin" data-a="min" aria-label="Collapse this tip">&minus;</button>' : '';
    html = `${minBtn}<h3>${s.t}</h3><div class="tbody">${s.b}</div>${list}${foot}${tourDots(s)}`;
  }
  card.innerHTML = html;
  tourPlace();
}
function tourHoleOf(sel, pr) {
  const t = document.querySelector(sel);
  if (!t) return null;
  const r = t.getBoundingClientRect();
  if (r.width < 4 || r.height < 4) return null;
  const pad = r.width > pr.width * .8 && r.height > pr.height * .3 ? 0 : 5;
  const x = Math.max(0, r.left - pr.left - pad), y = Math.max(0, r.top - pr.top - pad);
  const x2 = Math.min(pr.width, r.right - pr.left + pad), y2 = Math.min(pr.height, r.bottom - pr.top + pad);
  if (x2 <= x || y2 <= y) return null;
  const cs = getComputedStyle(t);
  let rad = parseFloat(cs.borderTopLeftRadius) || 0;
  if (/%/.test(cs.borderTopLeftRadius)) rad = Math.min(r.width, r.height) * rad / 100;
  rad += pad;
  if (rad < 14) rad = 14;
  rad = Math.min(rad, (x2 - x) / 2, (y2 - y) / 2);
  return { x, y, w: x2 - x, h: y2 - y, r: rad };
}
function tourPlace() {
  if (!tour) return;
  const s = tour.cur, el = tour.el, phone = el.parentElement;
  const lm = document.getElementById('libModal');
  el.style.visibility = lm && !lm.hidden ? 'hidden' : '';
  const pr = phone.getBoundingClientRect(), W = pr.width, H = pr.height;
  const sels = !s.target ? [] : Array.isArray(s.target) ? s.target : [s.target];
  const holes = sels.map(q => tourHoleOf(q, pr)).filter(Boolean);
  // the dim layer, with a rounded cut-out for each highlighted area
  const dim = el.querySelector('.tdim').style;
  if (s.free) dim.display = 'none';
  else {
    dim.display = '';
    if (holes.length) {
      let d = `M0 0H${W}V${H}H0Z`;
      holes.forEach(o => {
        const { x, y, w, h, r } = o;
        d += `M${x + r} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w} ${y + r}V${y + h - r}A${r} ${r} 0 0 1 ${x + w - r} ${y + h}H${x + r}A${r} ${r} 0 0 1 ${x} ${y + h - r}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`;
      });
      dim.clipPath = `path(evenodd, "${d}")`;
    } else dim.clipPath = 'none';
  }
  // everything outside the highlighted areas takes the taps (plain rectangles, not the dim layer's clip-path, because
  // some phone browsers ignore clip-path when deciding what was touched, which left the highlighted area untouchable)
  {
    const bx = el.querySelector('.tblk');
    let sig = 'x';
    if (!s.free) {
      const xs = [0, W], ys = [0, H];
      holes.forEach(o => { xs.push(o.x, o.x + o.w); ys.push(o.y, o.y + o.h); });
      const ux = [...new Set(xs.map(v => Math.max(0, Math.min(W, Math.round(v)))))].sort((a, b) => a - b), uy = [...new Set(ys.map(v => Math.max(0, Math.min(H, Math.round(v)))))].sort((a, b) => a - b);
      const inH = (cx, cy) => holes.some(o => cx > o.x && cx < o.x + o.w && cy > o.y && cy < o.y + o.h);
      const rects = [];
      for (let j = 0; j < uy.length - 1; j++) {
        let run = null;
        for (let i = 0; i < ux.length - 1; i++) {
          const cx = (ux[i] + ux[i + 1]) / 2, cy = (uy[j] + uy[j + 1]) / 2;
          if (inH(cx, cy)) { if (run) { rects.push(run); run = null; } continue; }
          if (run) run[2] = ux[i + 1]; else run = [ux[i], uy[j], ux[i + 1], uy[j + 1]];
        }
        if (run) rects.push(run);
      }
      sig = rects.map(r => r.join(',')).join(';');
      if (bx.dataset.sig !== sig) bx.innerHTML = rects.map(r => `<div class="tb" style="left:${r[0]}px;top:${r[1]}px;width:${r[2] - r[0]}px;height:${r[3] - r[1]}px"></div>`).join('');
    } else if (bx.dataset.sig !== sig) bx.innerHTML = '';
    bx.dataset.sig = sig;
  }
  // rings (and tap-blockers over the highlighted area when it is look-only)
  const box = el.querySelector('.tholes');
  if (tour.holes !== holes.length) { box.innerHTML = holes.map(() => '<div class="thb"></div><div class="tring"></div>').join(''); tour.holes = holes.length; }
  const interactive = !!(s.wait || s.free);
  holes.forEach((o, k) => {
    const hb = box.children[k * 2].style, rg = box.children[k * 2 + 1].style;
    hb.display = interactive ? 'none' : '';
    [hb, rg].forEach(st => { st.left = o.x + 'px'; st.top = o.y + 'px'; st.width = o.w + 'px'; st.height = o.h + 'px'; st.borderRadius = o.r + 'px'; });
  });
  // the card
  const cardEl = el.querySelector('.tcard'), c = cardEl.style;
  // while the highlighted thing is not on screen yet (a screen is changing), keep the tip out of sight instead of letting it jump
  const missing = !!sels.length && !holes.length && !s.free;
  tour.miss = missing ? (tour.miss || 0) + 1 : 0;
  c.visibility = missing && tour.miss < 8 ? 'hidden' : '';
  cardEl.classList.remove('xs');
  c.top = c.bottom = c.left = c.right = ''; c.transform = 'translateX(-50%)'; c.maxHeight = (H - 24) + 'px';
  const u = holes.length ? { t: Math.min(...holes.map(o => o.y)), b: Math.max(...holes.map(o => o.y + o.h)) } : null;
  let pos = s.pos || 'center';
  if (s.fit && u && !tour.min) { // keep the tip above the highlighted panel, shrinking it if it has to
    c.maxHeight = Math.max(64, u.t - 20) + 'px';
    if (cardEl.scrollHeight > cardEl.clientHeight + 1) cardEl.classList.add('xs');
  }
  const ch = cardEl.offsetHeight;
  if (u) {
    if (pos === 'below' && u.b + 10 + ch > H - 10) pos = 'above';
    else if (pos === 'above' && u.t - 10 - ch < 10) pos = 'below';
  }
  const nav = document.querySelector('.bottom-nav');
  const navTop = nav ? nav.getBoundingClientRect().top - pr.top : H;
  if (pos === 'right') {
    // the map guide sits at the far right, in the middle, out of the way of the map and the filter panel
    const fp = document.getElementById('mapFilters');
    let lim = navTop - 70;
    if (fp && !fp.hidden) { const fr = fp.getBoundingClientRect(); if (fr.left - pr.left < W / 2 && fr.right - pr.left > W * .6) lim = Math.min(lim, fr.top - pr.top - 8); }
    c.left = 'auto'; c.right = '8px'; c.transform = 'none';
    c.top = Math.max(78, Math.min((navTop - ch) / 2, lim - ch)) + 'px';
  }
  else if (pos === 'center' || (!u && pos !== 'top' && pos !== 'dock')) { c.top = '50%'; c.transform = 'translate(-50%,-50%)'; }
  else if (pos === 'top') c.top = '12px';
  else if (pos === 'dock') c.bottom = Math.max(10, H - navTop + 10) + 'px';
  else if (pos === 'above') c.bottom = Math.max(10, H - u.t + 10) + 'px';
  else if (pos === 'below') c.top = Math.max(10, Math.min(H - ch - 10, u.b + 10)) + 'px';
  else c.bottom = Math.max(10, H - u.b + 10) + 'px';
  if (phone.scrollTop || phone.scrollLeft) { phone.scrollTop = 0; phone.scrollLeft = 0; }
}
document.addEventListener('click', e => {
  if (!tour) return;
  const a = e.target.closest && e.target.closest('#tour .tcard button');
  if (!a) return;
  const act = a.dataset.a, s = tour.cur;
  if (act === 'skip') tourEnd(true);
  else if (act === 'next') tourGo(tour.i + 1);
  else if (act === 'finish') tourEnd(true);
  else if (act === 'auto') { try { s.auto(); } catch (er) {} }
  else if (act === 'yesmap') { tour.list.splice(tour.i + 1, 0, ...TOUR_MAP); tourGo(tour.i + 1); }
  else if (act === 'nomap') tourGo(tour.i + 1);
  else if (act === 'peek') { const k = Number(a.dataset.i); if (tour.peek !== k) { tour.peek = k; tourRender(); } }
  else if (act === 'min') { tour.min = true; tourRender(); }
  else if (act === 'expand') { tour.min = false; tourRender(); }
}, true);
(function () {
  const b = document.getElementById('tourReplay');
  if (b) b.addEventListener('click', () => tourStart());
})();

init();
