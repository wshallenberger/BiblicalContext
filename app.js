
// John is a standalone Gospel: short notes for the Gospel Parallels block (shown on John chapters).
const JOHN_ALONE_WHY = 'Matthew, Mark and Luke tell much of the same story, often in the same order, which is why they are read side by side. John does not. Most of what he records is found only in his Gospel, and he says why: he chose certain signs "that you may believe that Jesus is the Christ, the Son of God" (20:30–31). He also writes as an eyewitness (19:35; 21:24) and presents Jesus through long conversations and "I am" sayings rather than short parables. Early church writers called it the "spiritual Gospel" and said John wrote last, knowing the others and filling in what they left out (Clement of Alexandria, quoted by Eusebius). Many scholars today think John wrote independently of the other three, and some think he knew one or more of them. Either way, his story stands on its own.';
const JOHN_ALONE = {
  3: 'Nicodemus, the new birth and "God so loved the world" appear only in John.',
  5: 'The healing at the pool of Bethesda and Jesus’ long answer to his critics appear only in John.',
  7: 'Jesus at the Feast of Tabernacles, and the debate over who he is, appear only in John. The other Gospels show almost nothing of his visits to Jerusalem before the last week.',
  8: 'The "light of the world" teaching and the argument with the leaders about Abraham appear only in John. The story of the woman caught in adultery (7:53–8:11) is missing from the oldest manuscripts, so it is marked in many Bibles.',
  9: 'The man born blind, and the leaders’ questioning of him, appear only in John.',
  10: 'The Good Shepherd teaching and the Feast of Dedication appear only in John. Luke 15 has a lost-sheep parable, but it is a different story.',
  11: 'The raising of Lazarus appears only in John. The other Gospels never mention it, even though John shows it leading to the plot to kill Jesus.',
  14: 'The Farewell Discourse (chapters 13–17) is found only in John. The other Gospels give the Last Supper, but not these long talks about the Spirit, the vine and the Father’s house.',
  15: 'The true vine and the command to love one another are part of the Farewell Discourse, found only in John.',
  16: 'Jesus’ promise of the Spirit and his warning about coming trouble are part of the Farewell Discourse, found only in John.',
  17: 'Jesus’ long prayer for himself, his disciples and all who will believe is found only in John.',
  21: 'The breakfast on the beach and the restoring of Peter appear only in John. Luke 5:1–11 has a similar huge catch of fish near the start of Jesus’ ministry.'
};
// ---------- State ----------
let manifest = null;
let timelineData = null;
let WW = { w: {}, k: {}, e: {} };
const wwP = fetch('data/word-world.json').then(r => (r.ok ? r.json() : null)).then(j => { if (j) WW = j; }).catch(() => {});
let SUM = {};
let ddFrom = null, ddFromNext = null;   // where the Deep Dive was opened from (a verse in the reader)
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
let navStep = 'hub'; // 'hub' | 'books' | 'chapters' | 'topics' | 'topic', used inside the booknav screen
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
        .setHTML('<b>' + pl.name + '</b><br><span style="font-size:11px">' + currentChapterData.book + ' ' + refs + '</span>' + (pl.note ? '<br><span style="font-size:11px;font-style:italic">' + escHtml(pl.note) + '</span>' : ''));
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
  goToScreen((window.Home && Home.startScreen()) || 'read');

  navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      // Study and Visualize are groups: they open the page you used last inside that group
      if (btn.dataset.screen === 'study' || btn.dataset.screen === 'visualize') { Home.nav(btn.dataset.screen); return; }
      // From a Deep Dive, the Read tab returns to the reader at the chapter being studied.
      if (btn.dataset.screen === 'booknav' && currentScreen === 'deepdive') {
        goToScreen('read');
        try { const sc = document.querySelector('#screen-read .scroll, #screen-read'); if (sc) sc.scrollTop = 0; } catch (e) {}
        return;
      }
      // the Deep Dive button opens the landing page; a book and chapter picked there open the study itself
      if (btn.dataset.screen === 'deepdive') { dhPick = null; goToScreen('divehome'); renderDiveHome(); const dh = document.getElementById('diveHome'); if (dh) { dh.scrollTop = 0; requestAnimationFrame(() => { dh.scrollTop = 0; }); } return; }
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
// Round 88: one searchable drop-down (bcpick.js) for every book and chapter choice
async function goPassage(slug, n) {
  currentBook = slug; currentChapterNum = n;
  await loadChapter();
  if (currentScreen === 'deepdive') { renderFolderContent(); ddToTop(); }
}
function openPassagePicker(anchor) { BCPick.open({ anchor, slug: currentBook, chapter: currentChapterNum, onPick: goPassage }); }
document.getElementById('ddPickBtn').addEventListener('click', ev => openPassagePicker(ev.currentTarget));
document.getElementById('readPick').addEventListener('click', ev => openPassagePicker(ev.currentTarget));
document.getElementById('pickX').addEventListener('click', () => { pickOverlay.hidden = true; });
pickBack.addEventListener('click', pickShowBooks);

function syncQuickNav() {
  const pb = document.getElementById('ddPickBtn');
  if (pb && manifest) {
    const bk = manifest.books.find(b => b.slug === currentBook);
    pb.firstChild.textContent = (bk ? bk.name : '') + ' ' + currentChapterNum + ' ';
  }
  const rl = document.getElementById('readPickLbl');
  if (rl && manifest) { const bk = manifest.books.find(b => b.slug === currentBook); rl.textContent = (bk ? bk.name : '') + ' ' + currentChapterNum; }
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
let dhOpen = null; // which groups are open on the Deep Dive landing
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
  const cur = currentChapterData;
  const resume = cur ? `<button type="button" class="dh-resume" data-go="resume"><span><em>PICK UP WHERE YOU LEFT OFF</em><b>${escHtml(cur.book)} ${cur.chapter}${cur.title ? ' · ' + escHtml(cur.title) : ''}</b></span><i>›</i></button>` : '';
  // Round 88: one search button and four short groups instead of 27 tiles and a shelf
  const grpOf = slug => (['matthew', 'mark', 'luke', 'john'].includes(slug) ? 'Gospels' : slug === 'acts' ? 'Acts' : slug === 'revelation' ? 'Revelation' : 'Letters');
  const GBLURB = { Gospels: 'The life of Jesus', Acts: 'The first church', Letters: 'Paul, Peter, John and others', Revelation: 'The end and the new beginning' };
  if (dhOpen === null) dhOpen = {};
  const groups = ['Gospels', 'Acts', 'Letters', 'Revelation'].map(g => {
    const bs = manifest.books.filter(b => grpOf(b.slug) === g);
    if (!bs.length) return '';
    const col = (TL_GROUPS.find(x => x.n === g) || {}).c || '#8a6d0b';
    const chips = bs.map(b => `<button type="button" class="dh-chip" data-b="${b.slug}" style="--c:${MAP_BOOK_COLORS[b.slug] || col}"><b>${escHtml(b.name)}</b><span>${b.availableChapters.length} ch.</span></button>`).join('');
    return `<details class="dh-g" data-g="${g}" style="--c:${col}"${dhOpen[g] ? ' open' : ''}><summary><b>${g}</b><span>${GBLURB[g]}</span><em>${bs.length}</em></summary><div class="dh-chips">${chips}</div></details>`;
  }).join('');
  box.innerHTML = `<p class="panel-eyebrow">DEEP DIVE</p>
    <h2 class="dh-title">Go deeper into the Word</h2>
    <p class="dh-intro">Explore the history, setting and customs behind any passage. Search for a book and chapter, or browse a book below.</p>
    <button type="button" class="rd-pass dh-find" id="dhFind" aria-haspopup="dialog" aria-expanded="false"><span>Find a book and chapter</span><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg></button>
    ${resume}
    <h3 class="dh-h">Browse by book <span>tap one for its overview and chapters</span></h3>
    <div class="dh-groups">${groups}</div>`;
}
(function wireDiveHome() {
  const box = document.getElementById('diveHome'); if (!box) return;
  box.addEventListener('toggle', ev => { const d = ev.target; if (d && d.dataset && d.dataset.g) { dhOpen = dhOpen || {}; dhOpen[d.dataset.g] = d.open ? 1 : 0; } }, true);
  box.addEventListener('click', ev => {
    const f = ev.target.closest('#dhFind');
    if (f) { BCPick.open({ anchor: f, slug: currentBook, chapter: currentChapterNum, onPick: (bk, n) => openPassage(bk, n, 1, true) }); return; }
    const c = ev.target.closest('[data-c]'), b = ev.target.closest('[data-b]'), g = ev.target.closest('[data-go]');
    if (g) { if (g.dataset.go === 'home') { dhPick = null; renderDiveHome(); box.scrollTop = 0; } else { goToScreen('deepdive'); ddToTop(); } return; }
    if (c && dhPick) { openPassage(dhPick, Number(c.dataset.c), 1, true); return; }
    if (b && !b.disabled) { dhPick = b.dataset.b; renderDiveHome(); box.scrollTop = 0; }
  });
})();

// ---------- Screen routing ----------
// Round 30: coming back to a screen from another tab puts it at the top again (Settings → Navigation turns this off).
function resetScreenPos(name) {
  const top = id => { const e = document.getElementById(id); if (e) e.scrollTop = 0; };
  if (name === 'read') top('reader');
  else if (name === 'deepdive') ddToTop();
  else if (name === 'divehome') top('diveHome');
  else if (name === 'booknav') { top('navBookList'); top('navChapterGrid'); }
  else if (name === 'settings') top('stWrap');
  else if (name === 'more') top('moreWrap');
  else if (name === 'music') top('muWrap');
  else if (name === 'saved') top('svWrap');
  else if (name === 'plans') top('plWrap');
  else if (name === 'search') top('seWrap');
  else if (name === 'parallels') top('paWrap');
  else if (name === 'genealogy') top('geWrap');
  else if (name === 'commentary') top('cmWrap');
  else if (name === 'glossary') top('glWrap');
  else if (name === 'home') top('hmWrap');
  else if (name === 'homecust') top('hcWrap');
}
function resetOn() { try { return !window.ViSettings || ViSettings.get().resetpos !== 'off'; } catch (e) { return true; } }
function goToScreen(name) {
  const prevScreen = currentScreen;
  currentScreen = name;
  tlApplyWide();
  screens.forEach(s => s.classList.toggle('active', s.id === `screen-${name}`));
  navReserve(name);
  try { Home.go(prevScreen, name); } catch (e) { /* ignore */ }

  document.querySelectorAll('.nav-btn, .nav-btn-center button').forEach(b => {
    b.classList.toggle('active', !!window.Home && b.dataset.nav === Home.group(name));
  });

  if (name === 'booknav') {
    navStep = 'hub';
    navBrowsingBook = null; navTopicId = null;
    renderBookNav();
  }
  if (name === 'deepdive') {
    if (prevScreen !== 'deepdive') { ddFrom = ddFromNext; }
    ddFromNext = null;
    renderDeepDive();
  }
  if (name === 'divehome') renderDiveHome();
  if (name === 'commentary') { try { Cm.render(); } catch (e) { /* ignore */ } }
  if (name === 'glossary') { try { Gl.render(); } catch (e) { /* ignore */ } }
  if (name === 'home') { try { Home.render(); } catch (e) { /* ignore */ } }
  if (name === 'homecust') { try { Home.renderCust(); } catch (e) { /* ignore */ } }
  if (name === 'saved') { try { Saved.render(); } catch (e) { /* ignore */ } }
  if (name === 'plans') { try { Plans.render(); } catch (e) { /* ignore */ } }
  if (name === 'search') { try { Search.render(); } catch (e) { /* ignore */ } }
  if (name === 'parallels') { try { if (prevScreen === 'more') Par.reset(); } catch (e) { /* ignore */ } try { Cmp.show(); } catch (e) { try { Par.render(); } catch (e2) { /* ignore */ } } }
  if (name === 'genealogy') { try { Gen.render(); } catch (e) { /* ignore */ } }
  if (name === 'timeline') {
    renderTimeline();
  }
  if (name === 'map') {
    showMapScreen(prevScreen !== 'map');
  }
  if (name !== 'timeline') tlClearSelection();
  tlApplyWide();
  if (prevScreen !== name && resetOn()) { resetScreenPos(name); requestAnimationFrame(() => resetScreenPos(name)); }
  tourNote('screen:' + name);
}

// ---------- Bottom icons: five glass circles float over the screens; at the top of a screen they are bigger with names, anywhere else they shrink and huddle in the middle ----------
var NAV_RESERVE = ['map', 'timeline'];      // these screens pan and zoom, so they keep their own space above the bar
function navReserve(name) {
  const ph = document.querySelector('.phone'); if (!ph) return;
  ph.classList.toggle('nav-reserve', NAV_RESERVE.indexOf(name) >= 0);
  ph.dataset.screen = name;                   // lets the CSS style one screen's surroundings (Home's calm band under the circles)
  ph.classList.remove('nav-dock');
}
(function () {
  const ph = document.querySelector('.phone'), nav = document.querySelector('.bottom-nav'); if (!ph || !nav) return;
  ph.style.removeProperty('--navh');       // the space under the circles is fixed in the CSS, so it never changes while they animate
  const dock = on => { if (document.body.classList.contains('no-navhide') || ph.classList.contains('nav-reserve') || (typeof tour !== 'undefined' && tour && tour.cur && /navBtn|nav-btn|bottom-nav/.test(JSON.stringify(tour.cur.target || '')))) { ph.classList.remove('nav-dock'); return; } ph.classList.toggle('nav-dock', on); };
  document.addEventListener('scroll', ev => {
    const t = ev.target; if (!t || t === document || !t.closest || !t.closest('.screen-area')) return;
    if (t.closest('#hmFeed, .lc-vm, .sheet, .folder-tabs, #folderTabs, .vt-menu, .th-scroll')) return;
    if (t.scrollHeight - t.clientHeight < 90) return;                       // only real vertical scrollers
    const y = t.scrollTop;
    if (y > 30) dock(true); else if (y <= 10) dock(false);                  // off the top: small round icons; back at the top: the bar
  }, { capture: true, passive: true });
})();
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
  { const hd = document.querySelector('#screen-timeline .timeline-heading'); if (hd) hd.textContent = v === 'threads' ? 'Connections' : 'Timeline'; }
  try { Home.sync(); } catch (e) { /* ignore */ }
  document.querySelectorAll('#tlViews button').forEach(b => b.classList.toggle('on', b.dataset.v === v));
  document.querySelectorAll('#tlLevels button').forEach(b => b.classList.toggle('on', Number(b.dataset.l) === tlLv));
  tlEl('screen-timeline').classList.toggle('tl-lanebar-on', v === 'lanes' || v === 'threads');
  tlEl('tlLevels').hidden = v !== 'line';
  tlEl('tlThreadBar').hidden = v !== 'threads';
  tlEl('tlYear').hidden = v !== 'lanes';
  tlEl('tlYSub').hidden = v !== 'lanes';
  { const pp = tlEl('ybPop'); if (pp) pp.hidden = true; }
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
const YB_DRAG = 2; // the lanes slide this many pixels for each pixel the gold line is dragged
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
  const was = tlEl('ybPop'), wasOpen = !!(was && !was.hidden);
  const chips = TL.lanes.lanes.map(l => `<button type="button" class="th-chip${ybOn.includes(l.id) ? ' on' : ''}" data-yl="${l.id}" data-yid="${l.id}" style="--c:${l.color}"><i></i>${escHtml(YB_NAMES[l.id] || l.short)}</button>`).join('');
  box.innerHTML = `<div class="ys-chips" role="group" aria-label="Lanes to show">${chips}</div>` +
    `<button type="button" class="th-chip ys-lbtn" id="ybLbtn" aria-expanded="${wasOpen}" aria-haspopup="true">Lanes <u>${ybOn.length}</u> <em>&#9662;</em></button>` +
    `<button type="button" class="ys-more" id="ybLanesBtn" aria-expanded="${wasOpen}" aria-label="More lane options">&#8943;</button>` +
    `<div class="yb-pop" id="ybPop"${wasOpen ? '' : ' hidden'}><div class="ys-pchips th-chips" role="group" aria-label="Lanes to show">${chips}</div><button type="button" class="ys-auto${ybAuto ? ' on' : ''}" id="ybAutoBtn" data-yl="*auto" role="switch" aria-checked="${ybAuto}"><i></i><span>Shrink a lane to one row when nothing in it is on screen</span></button>` +
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
    if (ev.target.closest('#ybLanesBtn, #ybLbtn')) { pop.hidden = !pop.hidden; ['ybLanesBtn', 'ybLbtn'].forEach(i => { const b = tlEl(i); if (b) b.setAttribute('aria-expanded', String(!pop.hidden)); }); return; }
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
    if (pd.moved) { sc.scrollLeft += (ev.clientX - pd.last) * YB_DRAG; }   // twice as fast as the finger: the year changes with it
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
  const on = isWideEnv() && (currentScreen === 'timeline' || currentScreen === 'map' || currentScreen === 'parallels' || currentScreen === 'genealogy');
  ph.classList.toggle('wide', on);
  rotHint();
}
function rotHint() {
  const el = document.getElementById('rotHint'); if (!el) return;
  const portraitPhone = !isWideEnv() && window.innerWidth < 700;
  const want = portraitPhone && (currentScreen === 'timeline' || currentScreen === 'parallels') && !rotSeen[currentScreen] && !(tour && tour.cur);
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
  // a Connections filter drop-down closes when you tap anywhere outside it
  document.addEventListener('click', ev => {
    if (tlViewMode !== 'threads' || !tlThOpen.length) return;
    if (ev.composedPath().some(n => n.id === 'tlThreadTop' || (n.classList && n.classList.contains('th-scroll')))) return;   // (the tap may already have redrawn its own button, so look at the original path)
    tlThOpen.length = 0; try { tlThreadBarDraw(); } catch (e) {}
  });
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
let topicsP = null;
function loadTopics() { return topicsP || (topicsP = fetch('data/topics.json').then(r => (r.ok ? r.json() : null)).catch(() => null)); }
let navTopicId = null;     // the collection being read when navStep is 'topic'
let navOpen = null;        // which book groups are open on the Read the Word page
const NAV_GROUPS = ['Gospels', 'Acts', 'Letters', 'Revelation'];
const NAV_GBLURB = { Gospels: 'The life of Jesus', Acts: 'The first church', Letters: 'Paul, Peter, John and others', Revelation: 'The end and the new beginning' };
const navGroupOf = slug => (['matthew', 'mark', 'luke', 'john'].includes(slug) ? 'Gospels' : slug === 'acts' ? 'Acts' : slug === 'revelation' ? 'Revelation' : 'Letters');
const HUB_ICON = {
  word: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5.5C4 4.7 4.7 4 5.5 4H11v15H5.5A1.5 1.5 0 0 0 4 20.5v-15ZM20 5.5c0-.8-.7-1.5-1.5-1.5H13v15h5.5c.8 0 1.5.7 1.5 1.5v-15Z"/></svg>',
  time: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3.2 2"/></svg>'
};
let topicOpen = {};        // which groups are open on the A Time for Everything page (all closed at first)
const TOPIC_COL = { hard: '#8c4646', good: '#b8860b', topic: '#4d5f8f' };

function navSet(title, back) { navHeaderTitle.textContent = title; navBackBtn.style.visibility = back ? 'visible' : 'hidden'; const f = document.getElementById('navFindTop'); if (f) f.hidden = title !== 'Read'; }
function navOpenPicker(anchor) { BCPick.open({ full: true, anchor, slug: currentBook, chapter: currentChapterNum, onPick: async (b, n) => { currentBook = b; currentChapterNum = n; await loadChapter(); goToScreen('read'); } }); }
(function () { const f = document.getElementById('navFindTop'); if (f) f.addEventListener('click', () => navOpenPicker(f)); })();
function navRef(r) { const b = manifest.books.find(x => x.slug === r[0]); return (b ? b.name : r[0]) + ' ' + r[1] + ':' + r[2] + (r[3] > r[2] ? '–' + r[3] : ''); }

function renderBookNav() {
  const body = document.getElementById('navBody');
  navBookList.scrollTop = 0;
  if (navStep === 'chapters') {
    const book = manifest.books.find(b => b.slug === navBrowsingBook);
    navSet(book.name, true);
    navBookList.style.display = 'none';
    navChapterGrid.style.display = 'grid';
    try { Home.readQuick(false); } catch (e) { /* ignore */ }
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
    return;
  }
  navChapterGrid.style.display = 'none';
  navBookList.style.display = 'block';
  try { Home.readQuick(navStep === 'hub'); } catch (e) { /* ignore */ }
  if (navStep === 'hub') {
    navSet('Read', false);
    if (navOpen === null) navOpen = {};
    const groups = NAV_GROUPS.map(g => {
      const bs = manifest.books.filter(b => navGroupOf(b.slug) === g);
      if (!bs.length) return '';
      const col = (TL_GROUPS.find(x => x.n === g) || {}).c || '#8a6d0b';
      const rows = bs.map(b => `<div class="nav-item" data-bk="${b.slug}"><span class="nav-item-name">${escHtml(b.name)}</span><span class="nav-item-meta">${b.availableChapters.length} / ${b.totalChapters} ch.</span></div>`).join('');
      return `<details class="dh-g" data-g="${g}" style="--c:${col}"${navOpen[g] ? ' open' : ''}><summary><b>${g}</b><span>${NAV_GBLURB[g]}</span><em>${bs.length}</em></summary>${rows}</details>`;
    }).join('');
    body.innerHTML = `<button type="button" class="hub-card hub-time" data-step="topics"><span class="hub-ic">${HUB_ICON.time}</span><span class="hub-tx"><b>A Time for Everything…</b><span>Passages for what you are feeling or facing: in hard times, in good times, and by topic.</span></span><i class="hub-go">›</i></button>
      <h2 class="hub-sec">Read the Word</h2>
      <p class="hub-sub">All ${manifest.books.length} books of the New Testament</p>
      <button type="button" class="rd-pass nav-find" id="navFind" aria-haspopup="dialog" aria-expanded="false"><span>Find a book and chapter</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg></button>
      <div class="dh-groups">${groups}</div>`;
    return;
  }
  // 'topics' and 'topic' need the collections file
  body.innerHTML = '<p class="tp-intro">Loading…</p>';
  const want = navStep, wantId = navTopicId;
  loadTopics().then(d => {
    if (navStep !== want || navTopicId !== wantId || currentScreen !== 'booknav') return;
    if (!d) { body.innerHTML = '<p class="tp-intro">These passages could not be loaded. Check your connection and try again.</p>'; return; }
    if (want === 'topics') {
      navSet(d.title, true);
      body.innerHTML = `<p class="tp-intro">${escHtml(d.intro)}</p>` + d.groups.map(g => {
        const open = !!topicOpen[g.i], more = g.c.length > 4;
        return `<section class="tp-sec" data-tg="${g.i}" style="--c:${TOPIC_COL[g.i] || '#8a6d0b'}"><h3 class="tp-h"><b>${escHtml(g.t)}</b><span>${escHtml(g.s)}</span></h3><div class="tp-tiles${open ? ' all' : ''}">${g.c.map((c, k) => `<button type="button" class="tp-tile${k >= 4 ? ' tp-x' : ''}" data-topic="${c.i}"><b>${escHtml(c.t)}</b><span>${escHtml(c.b)}</span><i>${c.p.length} passages</i></button>`).join('')}</div>${more ? `<button type="button" class="tp-showall" data-showall="${g.i}">${open ? 'Show fewer' : 'Show all ' + g.c.length}</button>` : ''}</section>`;
      }).join('');
      return;
    }
    let col = null; d.groups.forEach(g => g.c.forEach(c => { if (c.i === wantId) col = c; }));
    if (!col) { navStep = 'topics'; renderBookNav(); return; }
    navSet(col.t, true);
    body.innerHTML = `<p class="tp-intro">${escHtml(col.in)}</p>` + col.p.map((p, k) =>
      `<article class="tp-card" data-k="${k}"><header><b>${escHtml(navRef(p.r))}</b><button type="button" class="tp-ctx" data-ctx="${p.r.join('|')}">Read in context ›</button></header><p class="tp-note">${escHtml(p.n)}</p><blockquote class="tp-txt">…</blockquote><button type="button" class="tp-more" hidden>More</button></article>`).join('');
    col.p.forEach((p, k) => {
      Home.verse(p.r).then(v => {
        const card = body.querySelector(`.tp-card[data-k="${k}"]`); if (!card || !v) return;
        const q = card.querySelector('.tp-txt'); q.textContent = v.text;
        requestAnimationFrame(() => { if (q.scrollHeight > q.clientHeight + 2) card.querySelector('.tp-more').hidden = false; });
      });
    });
  });
}

(function wireBookNav() {
  navBookList.addEventListener('toggle', ev => { const d = ev.target; if (!d || !d.dataset) return; if (d.dataset.g) { navOpen = navOpen || {}; navOpen[d.dataset.g] = d.open ? 1 : 0; } }, true);
  navBookList.addEventListener('click', ev => {
    const t = ev.target;
    const sa = t.closest('[data-showall]');
    if (sa) { const id = sa.dataset.showall; topicOpen[id] = topicOpen[id] ? 0 : 1; const g = sa.parentNode; g.querySelector('.tp-tiles').classList.toggle('all', !!topicOpen[id]); sa.textContent = topicOpen[id] ? 'Show fewer' : 'Show all ' + g.querySelectorAll('.tp-tile').length; return; }
    const st = t.closest('[data-step]'), tp = t.closest('[data-topic]'), bk = t.closest('[data-bk]'), cx = t.closest('[data-ctx]'), more = t.closest('.tp-more'), find = t.closest('#navFind');
    if (find) { navOpenPicker(find); return; }
    if (st) { navStep = st.dataset.step; renderBookNav(); return; }
    if (tp) { navTopicId = tp.dataset.topic; navStep = 'topic'; renderBookNav(); return; }
    if (bk) { navBrowsingBook = bk.dataset.bk; navStep = 'chapters'; renderBookNav(); return; }
    if (cx) { const r = cx.dataset.ctx.split('|'); openPassage(r[0], Number(r[1]), Number(r[2]), false); return; }
    if (more) { const q = more.parentNode.querySelector('.tp-txt'); const on = q.classList.toggle('open'); more.textContent = on ? 'Less' : 'More'; }
  });
})();

navBackBtn.addEventListener('click', () => {
  if (navStep === 'chapters') { navStep = 'hub'; navBrowsingBook = null; }
  else if (navStep === 'topic') { navStep = 'topics'; navTopicId = null; }
  else navStep = 'hub';
  renderBookNav();
});

// Extra keywords + Greek corrections live in one file, merged into each chapter as it loads.
let kwExtraP = null;
function loadKwExtra() {
  return kwExtraP || (kwExtraP = fetch('data/keywords-extra.json').then(r => (r.ok ? r.json() : null)).catch(() => null));
}
let placesExtraP = null;
function loadPlacesExtra() {
  return placesExtraP || (placesExtraP = fetch('data/places-extra.json').then(r => (r.ok ? r.json() : null)).catch(() => null));
}
// Extra place pins added after the OpenBible import (data/places-extra.json): merged into the chapter's biblePlaces once.
function applyPlacesExtra(ch, px) {
  if (!px || !ch || !ch.context || ch.context._plx) return;
  const x = px[currentBook + '/' + currentChapterNum];
  ch.context._plx = true;
  if (!x) return;
  const lst = ch.context.biblePlaces || (ch.context.biblePlaces = []);
  (x.add || []).forEach(e => {
    const ex = lst.find(p => p.name === e.name);
    if (ex) ex.verses = Array.from(new Set((ex.verses || []).concat(e.verses || []))).sort((m, n) => m - n);
    else lst.push(Object.assign({}, e));
  });
  if (!ch.context.biblePlacesRadius && x.radius) ch.context.biblePlacesRadius = x.radius;
  if (x.credit) ch.context.biblePlacesCredit = x.credit; else if (!ch.context.biblePlacesCredit) ch.context.biblePlacesCredit = 'Places: OpenBible.info (CC BY 4.0)';
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
// ---------- Red letter: where Jesus is speaking (data/redletter/<book>.json; character ranges in the BSB verse text) ----------
const RL_CACHE = {}, RL_FAILED = {};
async function loadRedLetter(book) {
  // a good load is kept for the visit; a failed one (a dropped connection, an update in progress) is tried again after 20 seconds instead of switching red letters off until the next reload
  if (RL_CACHE[book] !== undefined && !(RL_CACHE[book] === null && Date.now() - (RL_FAILED[book] || 0) > 20000)) return RL_CACHE[book];
  try { RL_CACHE[book] = await fetchJSON(`data/redletter/${book}.json`); delete RL_FAILED[book]; } catch (e) { RL_CACHE[book] = null; RL_FAILED[book] = Date.now(); }
  return RL_CACHE[book];
}
function rlSpans(book, ch, num) { const d = RL_CACHE[book]; return (d && d[ch] && d[ch][num]) || null; }
function rlFragment(book, ch, num, text) {
  const f = document.createDocumentFragment(), sp = rlSpans(book, ch, num);
  if (!sp) { f.appendChild(document.createTextNode(text)); return f; }
  let p = 0;
  sp.forEach(([a, b]) => {
    if (a > p) f.appendChild(document.createTextNode(text.slice(p, a)));
    const s = document.createElement('span'); s.className = 'wj'; s.textContent = text.slice(a, b); f.appendChild(s); p = b;
  });
  if (p < text.length) f.appendChild(document.createTextNode(text.slice(p)));
  return f;
}
// verse text as HTML for the verse sheet (adds the opening and closing quote marks it has always shown)
function rlHtml(book, ch, num, text, wrap) {
  const sp = rlSpans(book, ch, num) || [];
  let out = '', p = 0;
  sp.forEach(([a, b]) => { out += escHtml(text.slice(p, a)) + '<span class="wj">' + escHtml(text.slice(a, b)) + '</span>'; p = b; });
  out += escHtml(text.slice(p));
  return wrap && !/^["\u201c]/.test(text) ? '&quot;' + out + (/["\u201d]$/.test(text) ? '' : '&quot;') : out;
}
// the reader's verse text: drop everything after the number (and the saved-marks), then put the BSB text back
function rlClearText(p) { Array.from(p.childNodes).forEach(n => { if (!(n.nodeType === 1 && (n.classList.contains('verse-num') || n.classList.contains('vmk')))) p.removeChild(n); }); }
window.paintBsbVerse = function (p) {
  try {
    const num = Number(p.dataset.verse), e = currentChapterData.verses.find(v => v.num === num); if (!e) return;
    rlClearText(p); p.appendChild(rlFragment(currentBook, currentChapterNum, num, e.text)); delete p.dataset.ver; p.classList.remove('vt-missing');
  } catch (err) {}
};
// Red letters in the other versions: the red-letter data is written for the BSB text, so for another version the words are lined up with the BSB's
// (the words both share are anchors; the words in between are spread evenly) and the red span is moved onto the matching words. It is close, not exact.
function rlWords(t) { const out = [], re = /[A-Za-z0-9\u00C0-\u024F'\u2019]+/g; let m; while ((m = re.exec(t))) out.push({ a: m.index, b: m.index + m[0].length, k: m[0].toLowerCase().replace(/[\u2019']/g, '') }); return out; }
function rlAlign(bsb, spans, text) {
  const A = rlWords(bsb), B = rlWords(text), n = A.length, m = B.length;
  if (!n || !m || !spans || !spans.length) return [];
  const L = []; for (let i = 0; i <= n; i++) L.push(new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = A[i].k === B[j].k ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const pairs = []; { let i = 0, j = 0; while (i < n && j < m) { if (A[i].k === B[j].k) { pairs.push([i, j]); i++; j++; } else if (L[i + 1][j] >= L[i][j + 1]) i++; else j++; } }
  const map = w => {                       // a BSB word number -> a word number in the other text
    let pi = -1, pj = -1, ni = n, nj = m;
    for (let q = 0; q < pairs.length; q++) { if (pairs[q][0] === w) return pairs[q][1]; if (pairs[q][0] < w) { pi = pairs[q][0]; pj = pairs[q][1]; } else { ni = pairs[q][0]; nj = pairs[q][1]; break; } }
    return Math.max(0, Math.min(m - 1, Math.round(pj + (w - pi) * (nj - pj) / Math.max(1, ni - pi))));
  };
  const out = [];
  spans.forEach(([a, b]) => {
    let s = -1, e = -1;
    for (let i = 0; i < n; i++) { if (A[i].b > a && A[i].a < b) { if (s < 0) s = i; e = i; } }
    if (s < 0) return;
    let hit = 0; for (let q = 0; q < pairs.length; q++) if (pairs[q][0] >= s && pairs[q][0] <= e) hit++;
    if (hit < Math.ceil((e - s + 1) / 3)) return;      // hardly any of these words are in the other version, so there is nothing to line up
    let ts = map(s), te = Math.max(ts, map(e));
    let x = a <= 0 ? 0 : B[ts].a, y = b >= bsb.length ? text.length : B[te].b;
    // when both texts mark the speech with quotation marks, the red starts and ends at the other text's marks (the word match only gets close)
    const inc = /[\u201C"]/.test(bsb.charAt(a));      // the red starts on the quotation mark itself
    if (a > 0 && (inc || /[\u201C"]\s*$/.test(bsb.slice(0, a)))) {
      let bestQ = -1, bd = 46; for (let q = 0; q < text.length; q++) { const c = text[q]; if ((c === '\u201C' || (c === '"' && (q === 0 || /\s/.test(text[q - 1])))) && text[q + 1] && !/\s/.test(text[q + 1])) { const at = inc ? q : q + 1, d = Math.abs(at - x); if (d < bd) { bd = d; bestQ = at; } } }
      if (bestQ >= 0) x = bestQ;
    }
    if (b < bsb.length && /[\u201D"]$/.test(bsb.slice(0, b))) {
      let bestE = -1, bd = 46; for (let q = 0; q < text.length; q++) { const c = text[q]; if ((c === '\u201D' || (c === '"' && q > 0 && !/\s/.test(text[q - 1]))) && Math.abs(q + 1 - y) < bd) { bd = Math.abs(q + 1 - y); bestE = q + 1; } }
      if (bestE > x) { y = bestE; ts = -1; }
    }
    if (ts >= 0 && b > A[e].b && y < text.length) { const tail = /^[.,;:!?\u2026\u2014\u201D\u2019"')\]]+/.exec(text.slice(y)); if (tail) y += tail[0].length; }   // trailing punctuation goes with the words
    if (x < y) out.push([x, y]);
  });
  out.sort((p, q) => p[0] - q[0]);
  const fixed = []; out.forEach(r => { const l = fixed[fixed.length - 1]; if (l && r[0] <= l[1]) l[1] = Math.max(l[1], r[1]); else fixed.push(r); });
  return fixed;
}
function rlFragmentSpans(text, sp) {
  const f = document.createDocumentFragment();
  if (!sp || !sp.length) { f.appendChild(document.createTextNode(text)); return f; }
  let p = 0;
  sp.forEach(([a, b]) => {
    if (a > p) f.appendChild(document.createTextNode(text.slice(p, a)));
    const s = document.createElement('span'); s.className = 'wj'; s.textContent = text.slice(a, b); f.appendChild(s); p = b;
  });
  if (p < text.length) f.appendChild(document.createTextNode(text.slice(p)));
  return f;
}
function rlSpansFor(book, ch, num, bsbText, text) { const sp = rlSpans(book, ch, num); return sp ? rlAlign(bsbText, sp, text) : []; }
window.setVerseText = function (p, t, ver) {
  rlClearText(p);
  let sp = [];
  try { const num = Number(p.dataset.verse), e = currentChapterData.verses.find(v => v.num === num); if (e) sp = rlSpansFor(currentBook, currentChapterNum, num, e.text, t); } catch (err) {}
  p.appendChild(rlFragmentSpans(t, sp)); p.dataset.ver = ver || ''; p.classList.remove('vt-missing');
};
// the verse sheet's text in another version, with the red letters moved over
window.rlHtmlVer = function (book, ch, num, bsbText, text, wrap) {
  let sp = []; try { sp = rlSpansFor(book, ch, num, bsbText, text); } catch (e) {}
  let out = '', p = 0;
  sp.forEach(([a, b]) => { out += escHtml(text.slice(p, a)) + '<span class="wj">' + escHtml(text.slice(a, b)) + '</span>'; p = b; });
  out += escHtml(text.slice(p));
  return wrap && !/^["\u201c]/.test(text) ? '&quot;' + out + (/["\u201d]$/.test(text) ? '' : '&quot;') : out;
};
window.rlHtml = rlHtml;

async function loadChapter() {
  bookLabel.textContent = 'Loading…';
  verseListEl.innerHTML = '';

  try {
    currentChapterData = await fetchJSON(`data/${currentBook}/${currentChapterNum}.json`);
    applyKwExtra(currentChapterData, await loadKwExtra());
    applyPlacesExtra(currentChapterData, await loadPlacesExtra());
    await wwP;
    await loadRedLetter(currentBook);
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
    p.appendChild(rlFragment(currentBook, currentChapterNum, num, text));
    p.addEventListener('click', () => openSummary(num));
    verseListEl.appendChild(p);
  });
  try { if (window.Saved) Saved.decorate(); } catch (e) { /* saved verses are optional */ }
  try { if (window.VT) VT.afterRender(currentBook, currentChapterNum); } catch (e) { /* versions are optional */ }
  try { if (window.Plans) Plans.afterRender(currentBook, currentChapterNum); } catch (e) { /* plans are optional */ }
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
    ddMarkFromVerse();
    closeSheet();
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
  const chips = Array.from(box.querySelectorAll('.wbw-chip'));
  const sheetMode = !!box.closest('.sx-body');
  const pane = box.closest('.sx-pane');
  const row = box.querySelector('.wbw-row');
  if (pane) pane.classList.remove('gr-focus');
  if (sheetMode) row.insertAdjacentHTML('beforeend', '<button type="button" class="wbw-all">‹ All words</button>');
  const allBtn = row.querySelector('.wbw-all');
  const reduce = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fillCard = w => {
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
  };
  // Verse sheet: the tapped word glides to the top of the block and its card opens under it, the other words fade away.
  // Nothing scrolls. Tap the word again (or "All words") to bring them all back.
  let busy = false;
  const unfocus = () => {
    if (busy) return;
    chips.forEach(c => c.classList.remove('on'));
    box.classList.remove('wbw-focus');
    if (pane) pane.classList.remove('gr-focus');
    card.style.display = 'none';
    if (!reduce()) chips.forEach(c => c.animate && c.animate([{ opacity: 0, transform: 'scale(.94)' }, { opacity: 1, transform: 'none' }], { duration: 220, easing: 'ease-out' }));
  };
  const focusChip = chip => {
    if (busy) return;
    const w = words[Number(chip.dataset.i)];
    const others = chips.filter(c => c !== chip);
    const first = chip.getBoundingClientRect();
    const apply = () => {
      others.forEach(o => o.getAnimations && o.getAnimations().forEach(a => a.cancel()));
      chips.forEach(c => c.classList.toggle('on', c === chip));
      box.classList.add('wbw-focus');
      if (pane) pane.classList.add('gr-focus');
      fillCard(w);
      if (!reduce() && chip.animate) {
        const last = chip.getBoundingClientRect();
        chip.animate([{ transform: `translate(${first.left - last.left}px, ${first.top - last.top}px)` }, { transform: 'none' }], { duration: 300, easing: 'cubic-bezier(.2,.8,.2,1)' });
        card.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 280, delay: 80, easing: 'ease-out', fill: 'backwards' });
      }
      busy = false;
    };
    if (reduce() || !chip.animate || !others.length) return apply();
    busy = true;
    let n = 0;
    others.forEach(o => {
      const a = o.animate([{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(.94)' }], { duration: 150, easing: 'ease-in', fill: 'forwards' });
      a.onfinish = () => { if (++n === others.length) apply(); };
    });
  };
  chips.forEach(chip => chip.addEventListener('click', () => {
    const was = chip.classList.contains('on');
    if (sheetMode) { if (was) unfocus(); else focusChip(chip); return; }
    // Translation tab: tap a word to open its card, tap it again to close it
    chips.forEach(c => c.classList.toggle('on', c === chip && !was));
    if (was) { card.style.display = 'none'; return; }
    fillCard(words[Number(chip.dataset.i)]);
    revealIn(card);
  }));
  if (allBtn) allBtn.addEventListener('click', unfocus);
}
async function renderWordStrip(verseNum) {
  const box = document.getElementById('wbw');
  const seq = ++wbwSeq;
  box.innerHTML = '';
  const data = await loadWords(currentBook, currentChapterNum);
  if (seq !== wbwSeq) return;
  const words = data && data[String(verseNum)];
  if (!words || !words.length) {
    box.innerHTML = '<p class="sx-empty">No word-by-word data for this verse. Some verses appear only in later manuscripts and are left out of the earliest Greek text.</p>';
    return;
  }
  box.innerHTML = '<div class="wbw-body"></div>';
  drawWbw(box.querySelector('.wbw-body'), words, data, false);
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
  return cmCache[key].then(r => sumP.then(() => cmFilter(r)));
}
// Settings > Commentary voices: tiles from a voice the reader has switched off are left out (the data files are untouched)
function cmVoiceKey(who, kind) {
  if (kind === 'e') return 'early';
  const w = String(who || '');
  if (/Piper/.test(w)) return 'piper';
  if (/Keller/.test(w)) return 'keller';
  if (/Guzik/.test(w)) return 'guzik';
  if (/Henry/.test(w)) return 'henry';
  if (/Spurgeon/.test(w)) return 'spurgeon';
  if (/Lewis/.test(w)) return 'lewis';
  if (/Ryle/.test(w)) return 'ryle';
  if (/Joby|Eleven22/.test(w)) return 'joby';
  if (/Comer/.test(w)) return 'comer';
  if (/Mackie|BibleProject/.test(w)) return 'mackie';
  if (/Peterson/.test(w)) return 'peterson';
  if (/Mitchell|2819/.test(w)) return 'mitchell';
  if (/Howerton|Lakepointe/.test(w)) return 'lakepointe';
  if (/Solomon|BEMA/.test(w)) return 'bema';
  if (/Barclay/.test(w)) return 'barclay';
  if (/MacArthur/.test(w)) return 'macarthur';
  if (/Vander Laan/.test(w)) return 'vanderlaan';
  if (/Kramer|Expedition/.test(w)) return 'kramer';
  if (/Begg/.test(w)) return 'begg';
  if (/Stott/.test(w)) return 'stott';
  return '';
}
function cmHidden() { try { return (window.ViSettings && ViSettings.hidden) ? ViSettings.hidden() : []; } catch (e) { return []; } }
function cmFilter(r) {
  const hide = cmHidden();
  if (!r || !hide.length) return r;
  const out = {};
  Object.keys(r).forEach(v => { out[v] = Array.isArray(r[v]) ? r[v].filter(e => hide.indexOf(cmVoiceKey(e[1], e[0])) < 0) : r[v]; });
  return out;
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
  if (/gracegems/.test(u)) return 'Read Ryle on GraceGems ↗';
  if (/truthforlife/.test(u)) return 'Listen to the sermon ↗';
  if (/ivpress/.test(u)) return 'See the book ↗';
  if (/preceptaustin/.test(u)) return 'Read Spurgeon\'s commentary ↗';
  if (/spurgeon/.test(u)) return 'Read the sermon ↗';
  if (/gospelinlife/.test(u)) return /book-of-the-bible/.test(u) ? 'See his sermons on this chapter ↗' : 'Listen or read on Gospel in Life ↗';
  if (/coe22\.com/.test(u)) return 'Watch the sermon ↗';
  if (/petersonacademy/.test(u)) return 'See the course ↗';
  if (/youtube\.com\/watch/.test(u)) return 'Watch the video on YouTube ↗';
  if (/youtube\.com\/@ExpeditionBible/.test(u)) return 'Search Expedition Bible on YouTube ↗';
  if (/youtube\.com\/@/.test(u)) return 'Find the sermon on YouTube ↗';
  if (/bemadiscipleship/.test(u)) return 'Listen on the BEMA site ↗';
  if (/gty\.org\/sermons\/series/.test(u)) return 'See the series on Grace to You ↗';
  if (/gty\.org/.test(u)) return 'Open on Grace to You ↗';
  if (/studylight/.test(u)) return 'Read Barclay on StudyLight ↗';
  if (/thattheworldmayknow/.test(u)) return 'Open on That the World May Know ↗';
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
  if (list.some(e => /Barclay/.test(e[1]))) bits.push('Barclay’s tiles are short summaries of his Daily Study Bible, in our own words (the full text is copyrighted, so we link out)');
  if (list.some(e => /Kramer/.test(e[1]))) bits.push('Joel Kramer’s tiles are our own short notes on an archaeological find. Where we have confirmed a matching Expedition Bible video the link goes straight to it; otherwise it searches his channel on YouTube');
  if (list.some(e => /Stott/.test(e[1]))) bits.push('Stott’s tiles are short pointers to his books, in our own words, matched to the chapter of the book that covers the passage');
  if (list.some(e => /Vander Laan/.test(e[1]))) bits.push('Vander Laan’s tiles are short summaries of his articles and video lessons at That the World May Know (the video lessons may be rented or bought)');
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
    const series = parts.length > 2 && parts[1] && !/^all sermons/.test(parts[1]) ? ` from his “${parts[1]}” series` : '';
    if (sm && sm.by) return `A sermon by ${sm.by}, preached on ${r}.`;
    return `A full sermon by Keller${series}, preached on ${r}, unpacking the text and showing how it points to Christ.`;
  }
  if (who === 'Joby Martin' || who === 'Eleven22 Church') {
    const series = parts[1] ? `“${parts[1]}”` : 'a sermon series';
    const guest = (sm && sm.by) || (e[3].match(/·\s*(.+)$/) || [])[1];
    return guest ? `A sermon by guest preacher ${guest} in Eleven22’s ${series}, on ${r}.` : `A sermon by Joby Martin in Eleven22’s ${series}, on ${r}, in a conversational, story-driven style.`;
  }
  if (/Mitchell|2819/.test(who)) {
    const guest = (e[3].match(/·\s*(.+)$/) || [])[1];
    const tail = /youtube/.test(u) ? ' The link opens a search on the church’s YouTube channel.' : ' The link opens the episode on Spotify.';
    return guest ? `A sermon by ${guest} at 2819 Church, on ${r}.${tail}` : `A sermon by Philip Anthony Mitchell of 2819 Church, on ${r}.${tail}`;
  }
  if (/Howerton|Lakepointe/.test(who)) return `A sermon by Josh Howerton at Lakepointe Church, on ${r}. The link opens a search on the church’s YouTube channel.`;
  if (who === 'Alistair Begg') { const ser = parts.length > 2 && parts[1] ? ` in his “${parts[1]}” series` : ''; return `A sermon by Alistair Begg, pastor of Parkside Church and teacher on Truth for Life${ser}, on ${r}.`; }
  if (who === 'Marty Solomon') return `An episode of the BEMA Podcast with Marty Solomon, working through ${r} with its Jewish and cultural background.`;
  if (who === 'John MacArthur') return /series/.test(work) ? `A multi-part Grace to You series by John MacArthur on ${r}, preached verse by verse.` : `A verse-by-verse sermon by John MacArthur on ${r}, from the Grace to You library.`;
  if (who === 'Charles Spurgeon') {
    const n = (work.match(/#(\d+)/) || [])[1];
    return `Spurgeon’s own sermon${n ? ' no. ' + n : ''} preaching ${r}; vivid, Christ-centered Victorian preaching, opened ${/\.pdf$/.test(u) ? 'as a PDF' : 'on the web'}.`;
  }
  return '';
}
function drawCommentary(box, entries, openFirst, showCredit, cap, focus) {
  const list = entries.slice(0, 4);
  const shown = cap && list.length > cap ? cap : list.length;
  const rawSum = e => SUM[e[4]] || null;
  const sumOf = e => { const x = rawSum(e); return x && x.s ? x : null; };
  const who = e => { const x = rawSum(e); return escHtml(x && x.by ? x.by : (cmShort[e[1]] || e[1])); };
  const isTitle = e => e[7] !== 'c' && (e[1] === 'John Piper' || e[1] === 'Charles Spurgeon' || e[7] === 't');
  // A sermon or episode with only a title: say in a line what it is and which verses it covers
  const subOf = e => {
    if (!isTitle(e) || sumOf(e)) return '';
    const b = linkBlurb(e, rawSum(e)) || '';
    return b.replace(/\s*The link opens[^.]*\.?\s*$/, '').trim();
  };
  box.innerHTML =
    `<div class="cm-grid">${list.map((e, i) => `<button class="cm-tile ${e[0]}${i >= shown ? ' cm-extra' : ''}" type="button" data-i="${i}"${i >= shown ? ' hidden' : ''}>
        <span class="cm-who">${who(e)}</span>
        <span class="cm-work">${escHtml(e[2])}${e[5] ? ' · ' + escHtml(e[5]) : ''}</span>
        <span class="cm-prev${isTitle(e) ? ' t' : ''}${subOf(e) ? ' has-sub' : ''}">${escHtml(isTitle(e) && sumOf(e) ? sumOf(e).s : e[3])}</span>${subOf(e) ? `<span class="cm-sub">${escHtml(subOf(e))}</span>` : ''}${focus ? '<span class="cm-back">\u2039 All</span>' : ''}
      </button>`).join('')}</div>` +
    (shown < list.length ? `<button type="button" class="show-toggle cm-more">Show ${list.length - shown} more</button>` : '') +
    `<div class="cm-detail" style="display:none"></div>` +
    (showCredit && cmCredit(list) ? `<p class="cm-credit">${cmCredit(list)}</p>` : '');
  const detail = box.querySelector('.cm-detail');
  const tiles = box.querySelectorAll('.cm-tile');
  const fill = i => {
    const e = list[i];
    const body = e[6] && e[0] === 'm' && /Guzik/.test(e[1]) ? `<p class="cm-dtitle">${escHtml(e[6])}</p><p>${escHtml(e[3])}</p>` : isTitle(e) ? `<p class="cm-dtitle">${escHtml(e[3])}</p>` + (sumOf(e) ? `<p>${escHtml(sumOf(e).s)}</p>` : '') + (linkBlurb(e, rawSum(e)) ? `<p class="${sumOf(e) ? 'cm-dsrc' : 'cm-dblurb'}">${escHtml(linkBlurb(e, rawSum(e)))}</p>` : '') : `<p>${escHtml(e[3])}</p>`;
    detail.innerHTML = `<div class="cm-dh ${e[0]}"><b>${who(e)}</b><span>${escHtml(e[2])}${e[5] ? ' · ' + escHtml(e[5]) : ''}</span></div>${body}` +
      (e[4] ? `<a class="cm-link" href="${escHtml(e[4])}" target="_blank" rel="noopener">${cmLinkLabel(e)}</a>` : '');
    detail.style.display = '';
  };
  // Verse sheet: the tapped tile slides to the top-left and opens, the others fade away; tap it again to go back.
  let busy = false;
  const reduce = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const unfocus = () => {
    if (busy) return;
    tiles.forEach(t => t.classList.remove('on'));
    box.classList.remove('cm-focus');
    detail.style.display = 'none';
    cmFit();
    if (!reduce()) tiles.forEach(t => t.animate && t.animate([{ opacity: 0, transform: 'scale(.95)' }, { opacity: 1, transform: 'none' }], { duration: 220, easing: 'ease-out' }));
  };
  const focusTile = i => {
    if (busy) return;
    const t = tiles[i];
    const others = Array.from(tiles).filter(x => x !== t);
    const bd = box.closest('.sx-body');
    const first = t.getBoundingClientRect();
    const apply = () => {
      others.forEach(o => o.getAnimations && o.getAnimations().forEach(a => a.cancel()));
      tiles.forEach(x => x.classList.toggle('on', x === t));
      box.classList.add('cm-focus');
      fill(i);
      if (bd) bd.scrollTop = 0;
      cmFit();
      if (!reduce() && t.animate) {
        const last = t.getBoundingClientRect();
        t.animate([{ transform: `translate(${first.left - last.left}px, ${first.top - last.top}px)` }, { transform: 'none' }], { duration: 280, easing: 'cubic-bezier(.2,.8,.2,1)' });
        detail.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 280, delay: 70, easing: 'ease-out', fill: 'backwards' });
      }
      busy = false;
    };
    if (reduce() || !t.animate || !others.length) return apply();
    busy = true;
    let n = 0;
    others.forEach(o => {
      const a = o.animate([{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(.94)' }], { duration: 150, easing: 'ease-in', fill: 'forwards' });
      a.onfinish = () => { if (++n === others.length) apply(); };
    });
  };
  const pick = i => {
    const was = tiles[i].classList.contains('on');
    if (focus) { if (was) unfocus(); else focusTile(i); return; }
    tiles.forEach(t => t.classList.remove('on'));
    if (was) { detail.style.display = 'none'; return; }
    tiles[i].classList.add('on');
    fill(i);
    revealIn(detail);
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
  if (focus) requestAnimationFrame(cmFit);
}
async function renderSheetCommentary(verseNum) {
  const box = document.getElementById('cmSheet');
  const seq = ++cmSeq;
  box.innerHTML = '';
  const data = await loadCommentary(currentBook, currentChapterNum);
  if (seq !== cmSeq) return;
  const ents = data && data[String(verseNum)];
  if (!ents || !ents.length) {
    box.innerHTML = '<p class="sx-empty">No commentary is written for this exact verse yet. Open the Chapter Deep Dive for the notes on the whole chapter.</p>';
    return;
  }
  box.innerHTML = '<div class="cm-body"></div>';
  drawCommentary(box.querySelector('.cm-body'), ents, false, false, 0, true);
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

// ---------- Verse sheet v2: one block of one fixed size with three tabs (Commentary, Original Greek, Compare Translations); long content scrolls inside ----------
// Commentary block: make everything fit without scrolling. Tile previews give up lines (4 -> 2), and an opened note steps its text down a little (12px -> 10.5px).
function cmFit() {
  const bd = document.getElementById('sxMainBody'), box = document.querySelector('#cmSheet .cm-body');
  if (!bd || !box || bd.offsetParent === null || bd.clientHeight < 50) return;
  const pane = box.closest('.sx-pane'); if (!pane || pane.hidden) return;
  const over = () => bd.scrollHeight > bd.clientHeight + 1;
  box.style.removeProperty('--cm-lines'); box.style.removeProperty('--cm-fs'); box.classList.remove('cm-tight');
  if (!box.classList.contains('cm-focus')) {
    for (let n = 4; n >= 2 && over(); n--) box.style.setProperty('--cm-lines', String(n - 1 < 2 ? 2 : n - 1));
    if (over()) box.classList.add('cm-tight');
  } else {
    for (let fs = 11.5; fs >= 10 && over(); fs -= 0.5) box.style.setProperty('--cm-fs', fs + 'px');
    if (over()) box.classList.add('cm-tight');
  }
  sxFade();
}
window.addEventListener('resize', () => { clearTimeout(cmFit._t); cmFit._t = setTimeout(cmFit, 120); });
function sxFade() {
  const bd = document.getElementById('sxMainBody'); if (!bd) return;
  bd.classList.toggle('fade', bd.scrollHeight > bd.clientHeight + 3 && bd.scrollTop + bd.clientHeight < bd.scrollHeight - 3);
}
function sxMeasureAll() { sxFade(); }
function sxTab(p) {
  const main = document.getElementById('sxMain'); if (!main) return;
  main.querySelectorAll('.sx-tabs button').forEach(b => { const on = b.dataset.p === p; b.classList.toggle('on', on); b.setAttribute('aria-selected', String(on)); });
  main.querySelectorAll('.sx-pane').forEach(x => { x.hidden = x.dataset.p !== p; });
  const bd = document.getElementById('sxMainBody'); if (bd) bd.scrollTop = 0;
  if (p === 'cm') cmFit();
  sxFade();
}
function sxReset() {
  sheet.scrollTop = 0;
  sxTab('cm');
  const m = document.getElementById('sxVerMenu'); if (m) m.hidden = true;
}
(function () {
  sheet.addEventListener('click', ev => {
    const tab = ev.target.closest('.sx-tabs button');
    if (tab) sxTab(tab.dataset.p);
  });
  let t = 0;
  const bd = document.getElementById('sxMainBody');
  if (bd) {
    new MutationObserver(() => { clearTimeout(t); t = setTimeout(sxFade, 50); }).observe(bd, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden', 'style'] });
    bd.addEventListener('scroll', sxFade, { passive: true });
  }
})();

function openSummary(verseNum) {
  const ch = currentChapterData;
  document.querySelectorAll('.verse').forEach(v =>
    v.classList.toggle('active', Number(v.dataset.verse) === verseNum)
  );

  const verseEntry = ch.verses.find(v => v.num === verseNum);
  sheetRef.textContent = `${ch.book.toUpperCase()} ${ch.chapter}:${verseNum}`;
  sheetVerseText.innerHTML = rlHtml(currentBook, currentChapterNum, verseNum, verseEntry.text, true);
  try { if (window.VT) VT.onSheet(currentBook, currentChapterNum, verseNum, verseEntry.text); } catch (e) { /* versions are optional */ }
  try { if (window.Saved) Saved.onSheet(currentBook, currentChapterNum, verseNum, verseEntry.text); } catch (e) { /* saved verses are optional */ }
  try { if (window.Par) Par.mark(currentBook, currentChapterNum, verseNum); } catch (e) { /* parallels are optional */ }
  wbwTabVerse = verseNum;
  cmTabVerse = verseNum;
  renderLearnMore(ch, verseNum);
  renderWordStrip(verseNum);
  renderSheetCommentary(verseNum);
  if (document.getElementById('wbwVers') && document.getElementById('wbwVers').children.length) renderWbwTab();

  sxReset();
  backdrop.classList.add('open');
  sheet.classList.add('open');
  fitSheet();
  setTimeout(sxMeasureAll, 80);
  tourNote('sheet');
}
// Keep everything on one screen: if the sheet would still scroll, switch to the tight layout.
let _fitT = 0;
new MutationObserver(() => { clearTimeout(_fitT); _fitT = setTimeout(() => { if (sheet.classList.contains('open')) fitSheet(); }, 60); })
  .observe(sheet, { childList: true, subtree: true });
function fitSheet() {
  if (sheet.classList.contains('sx')) return;      // the new sheet keeps one size and scrolls inside its blocks
  sheet.classList.remove('tight');
  if (sheet.scrollHeight > sheet.clientHeight + 1) sheet.classList.add('tight');
}


// ---------- Round 30: safe scrolling, closing the verse sheet, swipes ----------
// scrollIntoView can also slide the whole phone frame up (the bottom bar then lands mid-screen). This only scrolls the nearest scrolling box.
// Verse sheet: a small, gentle scroll that puts the top of el just under the top of its block.
function revealTop(el, gap) {
  try {
    const bd = el.closest('.sx-body'); if (!bd) return;
    const to = bd.scrollTop + (el.getBoundingClientRect().top - bd.getBoundingClientRect().top) - (gap || 0);
    bd.scrollTo({ top: Math.max(0, to), behavior: 'smooth' });
  } catch (e) {}
}
function revealIn(el) {
  try {
    let p = el.parentElement;
    while (p && !p.classList.contains('phone') && p !== document.body) {
      const oy = getComputedStyle(p).overflowY;
      if ((oy === 'auto' || oy === 'scroll') && p.scrollHeight > p.clientHeight + 1) {
        const pr = p.getBoundingClientRect(), er = el.getBoundingClientRect();
        if (er.bottom > pr.bottom - 6) p.scrollBy({ top: er.bottom - pr.bottom + 12, behavior: 'smooth' });
        else if (er.top < pr.top + 6) p.scrollBy({ top: er.top - pr.top - 12, behavior: 'smooth' });
        return;
      }
      p = p.parentElement;
    }
  } catch (e) {}
}
(function () {
  const ph = document.querySelector('.phone'); if (!ph) return;
  const picking = () => { const a = document.activeElement; return !!(a && /^(SELECT|INPUT|TEXTAREA)$/.test(a.tagName)); };   // do not move the page while a drop-down or a text box is being used (that can close it)
  const back = () => { if (picking()) return; if (ph.scrollTop || ph.scrollLeft) { ph.scrollTop = 0; ph.scrollLeft = 0; } };
  ph.addEventListener('scroll', back, { passive: true });
  [document.documentElement, document.body].forEach(n => n && n.addEventListener && n.addEventListener('scroll', () => { if (picking()) return; if (window.scrollY) window.scrollTo(0, 0); }, { passive: true }));
})();

// One way to close the verse sheet: it also clears the highlighted verse.
function closeSheet() {
  backdrop.classList.remove('open');
  sheet.classList.remove('open');
  sheet.style.transform = ''; sheet.style.transition = '';
  document.querySelectorAll('#verseList .verse.active').forEach(v => v.classList.remove('active'));
  const vm = document.getElementById('sxVerMenu'); if (vm) vm.hidden = true;
}
backdrop.addEventListener('click', closeSheet);
// Tap the very top of the sheet (the grab bar) to close it; drag the sheet down to close it.
sheet.addEventListener('click', ev => {
  const r = sheet.getBoundingClientRect();
  if (ev.clientY - r.top < 34) closeSheet();
});
(function () {
  let y0 = 0, x0 = 0, t0 = 0, drag = false, ok = false, dy = 0;
  sheet.addEventListener('touchstart', ev => {
    if (ev.touches.length !== 1) { ok = false; return; }
    const t = ev.touches[0], r = sheet.getBoundingClientRect();
    y0 = t.clientY; x0 = t.clientX; t0 = Date.now(); drag = false; dy = 0;
    ok = (t.clientY - r.top < 44) || sheet.scrollTop <= 0;
    const inner = ev.target.closest && ev.target.closest('.sx-body, .sx-dots, .sx-vmenu, .sheet-verse-text');
    if (inner && inner.scrollHeight > inner.clientHeight + 1 && (t.clientY - r.top >= 44)) ok = false;
    if (ev.target.closest && ev.target.closest('.sx-dots')) ok = false;
  }, { passive: true });
  sheet.addEventListener('touchmove', ev => {
    if (!ok) return;
    const t = ev.touches[0], mx = t.clientX - x0; dy = t.clientY - y0;
    if (!drag) {
      if (dy > 10 && dy > Math.abs(mx) * 1.2 && sheet.scrollTop <= 0) { drag = true; sheet.style.transition = 'none'; }
      else if (dy < -10 || Math.abs(mx) > 14) { ok = false; return; }
      else return;
    }
    ev.preventDefault();
    sheet.style.transform = 'translateY(' + Math.max(0, dy) + 'px)';
  }, { passive: false });
  const end = () => {
    if (!drag) return;
    drag = false;
    const fast = dy / Math.max(1, Date.now() - t0) > 0.5;
    if (dy > 90 || (fast && dy > 30)) { sheet.style.transition = ''; closeSheet(); }
    else { sheet.style.transition = ''; sheet.style.transform = ''; }
  };
  sheet.addEventListener('touchend', end);
  sheet.addEventListener('touchcancel', end);
})();

// Swipe the reader sideways to change chapter: swipe left = next chapter, swipe right = previous (crosses into the next or previous book).
function adjacentChapter(dir) {
  if (!manifest) return null;
  const bi = manifest.books.findIndex(b => b.slug === currentBook); if (bi < 0) return null;
  const b = manifest.books[bi], av = b.availableChapters.slice().sort((x, y) => x - y);
  const i = av.indexOf(currentChapterNum);
  if (dir > 0) {
    if (i >= 0 && i < av.length - 1) return { book: b.slug, ch: av[i + 1] };
    for (let k = bi + 1; k < manifest.books.length; k++) if (manifest.books[k].availableChapters.length) return { book: manifest.books[k].slug, ch: Math.min.apply(null, manifest.books[k].availableChapters) };
  } else {
    if (i > 0) return { book: b.slug, ch: av[i - 1] };
    for (let k = bi - 1; k >= 0; k--) if (manifest.books[k].availableChapters.length) return { book: manifest.books[k].slug, ch: Math.max.apply(null, manifest.books[k].availableChapters) };
  }
  return null;
}
async function stepChapter(dir) {
  const n = adjacentChapter(dir); if (!n) return;
  currentBook = n.book; currentChapterNum = n.ch;
  const rd = document.getElementById('reader');
  if (rd) { rd.style.transition = 'none'; rd.style.opacity = '0.2'; rd.style.transform = 'translateX(' + (dir > 0 ? 28 : -28) + 'px)'; }
  await loadChapter();
  if (rd) { rd.scrollTop = 0; requestAnimationFrame(() => { rd.style.transition = 'opacity .2s ease, transform .2s ease'; rd.style.opacity = ''; rd.style.transform = ''; }); }
  const sc = document.querySelector('#screen-read .scroll'); if (sc) sc.scrollTop = 0;
}
(function () {
  const area = document.getElementById('screen-read'); if (!area) return;
  let x0 = 0, y0 = 0, t0 = 0, on = false;
  area.addEventListener('touchstart', ev => {
    on = ev.touches.length === 1 && !sheet.classList.contains('open') && !ev.target.closest('select, button, a, input, .vt-menuwrap');
    if (!on) return;
    x0 = ev.touches[0].clientX; y0 = ev.touches[0].clientY; t0 = Date.now();
  }, { passive: true });
  area.addEventListener('touchend', ev => {
    if (!on) return; on = false;
    const t = ev.changedTouches[0], dx = t.clientX - x0, dy = t.clientY - y0, dt = Date.now() - t0;
    if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 2 || dt > 650) return;
    if (window.getSelection && String(window.getSelection()).length) return;
    stepChapter(dx < 0 ? 1 : -1);
  }, { passive: true });
})();

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
// Where the Deep Dive was opened from (a verse in the reader): its back button returns there instead of the Deep Dive landing page.
function ddMarkFromVerse() {
  const a = document.querySelector('#verseList .verse.active');
  const v = a ? Number(a.dataset.verse) : (wbwTabVerse || 0);
  ddFromNext = v ? { book: currentBook, chap: currentChapterNum, verse: v } : null;
}
function ddSyncBack() {
  const b = document.getElementById('ddBack'); if (!b) return;
  if (ddFrom && (ddFrom.book !== currentBook || ddFrom.chap !== currentChapterNum)) ddFrom = null;
  b.innerHTML = ddFrom ? '&lsaquo; ' + escHtml(getShortName(ddFrom.book)) + ' ' + ddFrom.chap + ':' + ddFrom.verse : '&lsaquo; Deep Dive';
}
(function () {
  const b = document.getElementById('ddBack'); if (!b) return;
  b.addEventListener('click', ev => {
    if (!ddFrom) return;                         // no verse to return to: the normal back (Deep Dive landing page)
    ev.preventDefault(); ev.stopPropagation();
    const f = ddFrom; ddFrom = null;
    goToScreen('read');
    const show = () => {
      const el = document.querySelector(`#verseList .verse[data-verse="${f.verse}"]`);
      if (el) scrollToVerseIn(el);
    };
    setTimeout(show, 60); setTimeout(show, 200);
    setTimeout(() => { try { if (currentScreen === 'read' && currentBook === f.book && currentChapterNum === f.chap) { openSummary(f.verse); show(); } } catch (e) {} }, 260);
  });
})();
diveBtn.addEventListener('click', () => {
  ddMarkFromVerse();
  closeSheet();
  goToScreen('deepdive');
  ddToTop();
});

// ---------- Deep Dive screen ----------
function renderDeepDive() {
  syncQuickNav();
  renderFolderContent();
}

// Epistle chapters carry no hand-written chapter commentary, so it is drawn from the verse commentary (data/mix):
// for each text-bearing voice, its first full note in the chapter. Gospel chapters keep their own entries.
const CM_CH_PRI = ['guzik', 'barclay', 'henry', 'spurgeon', 'early', 'bema', 'stott'];
const CM_CH_YEAR = { guzik: 'Enduring Word', barclay: '1950s', henry: '1710', spurgeon: '1800s' };
function deriveChapterCommentary(data) {
  if (!data) return [];
  const best = {};
  Object.keys(data).map(Number).sort((a, b) => a - b).forEach(v => {
    (data[v] || []).forEach(e => {
      if (!Array.isArray(e) || e[7] === 't' || String(e[3] || '').length < 110) return;
      const k = cmVoiceKey(e[1], e[0]);
      if (!k || best[k] || CM_CH_PRI.indexOf(k) < 0) return;
      const last = String(e[2] || '').split(' · ').pop();
      best[k] = { source: cmShort[e[1]] || e[1], year: CM_CH_YEAR[k] || '', note: String(e[3]).replace(/<[^>]*>/g, ''), url: e[4] || '', plain: true, range: /^vv?\./.test(last) ? last : '' };
    });
  });
  return CM_CH_PRI.filter(k => best[k]).slice(0, 3).map(k => best[k]);
}
function ovVoicesHtml(ctx) {
  const firstSentence = s => { s = String(s).replace(/<[^>]*>/g, '').trim(); const m = s.match(/^(.+?)([.:])(\s|$)/); return m ? m[1] + '.' : s; };
  return (ctx.commentary || []).filter(c => cmHidden().indexOf(cmVoiceKey(c.source, 'm')) < 0).slice(0, 2).map((c, i) =>
    `<div class="ov-q"><b>${escHtml(c.source)}${c.range ? ' · ' + escHtml(c.range) : ''}</b><span class="ov-qt ov-qt${i}">${escHtml(i === 0 ? firstSentence(c.note) : String(c.note).replace(/<[^>]*>/g, ''))}</span></div>`).join('');
}
function drawChapterCommentaryList(ctx) {
  const cList = document.getElementById('commentaryList');
  if (ctx.commentary && ctx.commentary.length) {
    document.getElementById('cmChapSub').textContent = ctx.commentary.length + ' commentators';
    cList.innerHTML = ctx.commentary.map(entry => `
      <div class="commentary-card exp">
        <div><span class="commentary-source">${entry.plain ? escHtml(entry.source) : entry.source}${entry.range ? ' · ' + escHtml(entry.range) : ''}</span><span class="commentary-year">${entry.year}</span></div>
        <p class="commentary-note exp-body" style="margin-top:6px">${entry.plain ? escHtml(entry.note) : entry.note}</p>
        <div class="exp-extra">${entry.url ? `
          <a class="commentary-link" href="${entry.url}" target="_blank" rel="noopener">
            Read the full commentary
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 17L17 7M17 7H7M17 7V17"/></svg>
          </a>` : ''}
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
}
// Fill ctx.commentary from the verse commentary once, then refresh the Overview tile and the Commentary tab list in place.
function ensureChapterCommentary(ctx) {
  if (ctx.commentary && ctx.commentary.length) return;
  if (ctx._cmx) return;
  ctx._cmx = true;
  const book = currentBook, chap = currentChapterNum;
  loadCommentary(book, chap).then(data => {
    const list = deriveChapterCommentary(data);
    if (!list.length) return;
    ctx.commentary = list;
    if (book !== currentBook || chap !== currentChapterNum || currentChapterData.context !== ctx) return;
    const tile = document.querySelector('[data-panel="overview"] .ov-cmblk');
    if (tile) { const h = tile.querySelector('.ov-h'); tile.innerHTML = ''; if (h) tile.appendChild(h); tile.insertAdjacentHTML('beforeend', ovVoicesHtml(ctx)); fitOvCommentary(); }
    drawChapterCommentaryList(ctx);
  });
}

function renderFolderContent() {
  const ctx = currentChapterData.context;
  ddSyncBack();

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
  ensureChapterCommentary(ctx);
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

  drawChapterCommentaryList(ctx);
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
  if (currentBook === 'john') {
    const ownNote = JOHN_ALONE[currentChapterNum] || '';
    const subEl = document.getElementById('gpSub');
    if (!ctx.gospelParallels.length) subEl.textContent = 'John tells this on his own';
    const jc = document.createElement('div');
    jc.className = 'xref-card';
    const jr = document.createElement('div'); jr.className = 'xref-ref'; jr.textContent = ctx.gospelParallels.length ? 'John in his own voice' : 'Why John stands on his own';
    jc.appendChild(jr);
    [ownNote, JOHN_ALONE_WHY].filter(Boolean).forEach((t, i) => { const pn = document.createElement('p'); pn.className = 'xref-note'; if (i) pn.style.marginTop = '10px'; pn.textContent = t; jc.appendChild(pn); });
    gList.appendChild(jc);
  }
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
const LIB_BOOK = Bk.nameMap();            // book names and short names come from the manifest (books.js)
const LIB_BOOK_SHORT = Bk.map(Bk.short);
const CF_LABEL = { direct: 'Directly attested', site: 'Site identified', ctx: 'Background context', trad: 'Traditional site', recon: 'Reconstruction' };
const CF_HELP = { direct: 'An object or inscription that names a person or place from the text.', site: 'A place the text names that has been found and excavated.', ctx: 'A find that shows the world of the story without naming it.', trad: 'Honored for centuries, not proven by evidence.', recon: 'A modern reconstruction of what has been lost.' };
function curChKey() { return currentBook + ':' + currentChapterNum; }
function inThisChapter(x) { return !!(x.ch && x.ch.indexOf(curChKey()) >= 0); }
function parseRefs(r) {
  const out = []; let book = null;
  String(r || '').split(';').forEach(seg => {
    seg = seg.trim(); if (!seg) return;
    const m = seg.match(Bk.splitRe());
    const rest = m ? m[2] : seg;
    if (m) book = Bk.slugOf(m[1]);
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
    ${hasXY || x.eb ? `<div class="lib-acts">${hasXY ? `<button type="button" class="lib-btn" data-lib="map" data-la="${x.la}" data-ln="${x.ln}" data-z="13" data-name="${escHtml(x.n)}">See on map \u203a</button>` : ''}${(x.ebv || []).map(v => `<a class="lib-btn lib-eb" href="https://www.youtube.com/watch?v=${v[0]}" target="_blank" rel="noopener">\u25b6 ${escHtml(v[1])} \u2197</a>`).join('')}${x.eb ? `<a class="lib-btn lib-eb" href="https://www.youtube.com/@ExpeditionBible/search?query=${encodeURIComponent(x.eb)}" target="_blank" rel="noopener">${x.ebv ? 'More from Expedition Bible' : 'Expedition Bible videos'} \u2197</a>` : ''}</div>` : ''}
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
  try { closeSheet(); } catch (e) {}
  await openPassage(b, c, 1, true);
  const pick = () => { const i = tabOrder.indexOf(tab); if (i >= 0) setTab(i); };
  pick(); setTimeout(pick, 60); setTimeout(pick, 250);      // the screen change resets the tab on the next frame, so ask again once it has settled
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
  else if (a === 'chapread') { closeLibModal(); try { closeSheet(); } catch (e) {} openPassage(t.dataset.b, Number(t.dataset.c), 1, false); }
  else if (a === 'expand') { const row = t.parentNode; row.classList.add('open'); t.remove(); }
  else if (a === 'det') { const d = t.nextElementSibling; if (d) { d.hidden = !d.hidden; t.classList.toggle('on', !d.hidden); t.setAttribute('aria-expanded', String(!d.hidden)); } }
  else if (a === 'showmore') { const h = t.previousElementSibling; if (h) h.hidden = false; t.remove(); }
});

// ---------- Word usage counts (data/word-counts.json: Greek roots by Strong's number; data/word-index.json: English words in the BSB) ----------
let WC = null, wcP = null, WIDX = null, widxP = null, BOOKS = null, booksP = null;
function loadWC() { return wcP || (wcP = fetch('data/word-counts.json').then(r => (r.ok ? r.json() : null)).catch(() => null).then(j => { WC = j; return j; })); }
function loadWIDX() { return widxP || (widxP = fetch('data/word-index.json').then(r => (r.ok ? r.json() : null)).catch(() => null).then(j => { WIDX = j; return j; })); }
function loadBooks() { return booksP || (booksP = fetch('data/books.json').then(r => (r.ok ? r.json() : null)).catch(() => null).then(j => { BOOKS = j; return j; })); }
const fmtN = n => Number(n).toLocaleString('en-US');
// how many books the word files cover (Gospels = 4; Gospels + Acts = 5)
function WCN() { return (WC && WC.b && WC.b.length) || 4; }
function usageBars(counts) {
  const tot = counts.reduce((a, b) => a + b, 0), mx = Math.max.apply(null, counts) || 1;
  return `<div class="gu-bars">${counts.map((n, i) => `<div class="gu-row${Bk.slugs()[i] === currentBook ? ' cur' : ''}"><span class="gu-l">${LIB_BOOK_SHORT[Bk.slugs()[i]]}</span><span class="gu-bar"><i style="width:${Math.max(n ? 3 : 0, Math.round(n / mx * 100))}%"></i></span><span class="gu-n">${fmtN(n)}</span></div>`).join('')}</div>`;
}
function chapChips(list, act) {
  return (list || []).map(t => `<button type="button" class="lib-chip" data-lib="${act}" data-b="${Bk.slugs()[t[0]]}" data-c="${t[1]}">${LIB_BOOK_SHORT[Bk.slugs()[t[0]]]} ${t[1]}${t[2] > 1 ? ' · ' + t[2] + '×' : ''}</button>`).join('');
}
// "In the Gospels, Acts, Romans ...": the books counted so far, as a phrase. n = how many Gospel/book slots are counted (4 = the four Gospels, 5 adds Acts, and so on).
const WC_NAMES = ['Acts', 'Romans', '1 Corinthians', '2 Corinthians', 'Galatians', 'Ephesians', 'Philippians', 'Colossians', '1 Thessalonians', '2 Thessalonians', '1 Timothy', '2 Timothy', 'Titus', 'Philemon', 'Hebrews', 'James', '1 Peter', '2 Peter', '1 John', '2 John', '3 John', 'Jude', 'Revelation'];
const WCBK = { acts: 4, romans: 5, '1-corinthians': 6, '2-corinthians': 7, galatians: 8, ephesians: 9, philippians: 10, colossians: 11, '1-thessalonians': 12, '2-thessalonians': 13, '1-timothy': 14, '2-timothy': 15, titus: 16, philemon: 17, hebrews: 18, james: 19, '1-peter': 20, '2-peter': 21, '1-john': 22, '2-john': 23, '3-john': 24, jude: 25, revelation: 26 };
function wcBooksText(n, style) {
  if (n <= 4) return style === 'tot' ? 'four Gospels' : 'four Gospels';
  const list = WC_NAMES.slice(0, n - 4);
  const pair = (a, b, label) => { const i = list.indexOf(a); if (i >= 0 && list.indexOf(b) === i + 1) list.splice(i, 2, label); };
  pair('1 Corinthians', '2 Corinthians', style === 'tot' ? '1 and 2 Corinthians' : 'the Corinthian letters');
  pair('1 Thessalonians', '2 Thessalonians', style === 'tot' ? '1 and 2 Thessalonians' : 'the Thessalonian letters');
  pair('1 Timothy', '2 Timothy', style === 'tot' ? '1 and 2 Timothy' : 'the Timothy letters');
  // Titus follows as its own book
  const all = ['Gospels'].concat(list);
  const named = all.map((x, i) => (i === 0 && style === 'hdr') ? 'the ' + x : x);
  if (style === 'tot' && n <= 5) return 'Gospels and Acts';
  return named.length === 1 ? named[0] : named.slice(0, -1).join(', ') + ' and ' + named[named.length - 1];
}
function gospelUsageHTML(s) {
  const e = WC && WC.w && WC.w[s]; if (!e) return '';
  const nb = WCN(), counts = e.slice(0, nb), tot = counts.reduce((a, b) => a + b, 0);
  return `<div class="gu"><p class="gu-h">${nb > 4 ? ('IN ' + wcBooksText(nb, 'hdr').toUpperCase()) : 'IN THE FOUR GOSPELS'}<span>${fmtN(tot)} time${tot === 1 ? '' : 's'}</span></p>${usageBars(counts)}${e[nb] && e[nb].length ? `<div class="lib-chips"><span class="lib-chiplbl">Most in:</span>${chapChips(e[nb], 'chap')}</div>` : ''}</div>`;
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
    const tot = WC.w[s].slice(0, WCN()).reduce((x, y) => x + y, 0), mEl = card.querySelector('.word-meaning');
    if (mEl && !card.querySelector('.kw-tot')) mEl.insertAdjacentHTML('beforebegin', `<span class="kw-tot">${fmtN(tot)}\u00d7 in the ${WCN() > 4 ? wcBooksText(WCN(), 'tot') : 'four Gospels'}</span>`);
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
  box.innerHTML = `<p class="lib-intro">Type any English word to see how often it appears in each Gospel and in Acts (Berean Standard Bible).</p>
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
    if (!keys.length) { out.innerHTML = `<p class="lib-intro">“${escHtml(w)}” does not appear in the Gospels or Acts (or only once). Words that appear just once are not listed.</p>`; return; }
    const nb = (idx.b && idx.b.length) || 4, counts = new Array(nb).fill(0), merged = {};
    keys.forEach(k => { const e = idx.w[k]; for (let i = 0; i < nb; i++) counts[i] += e[i]; (e[nb] || []).forEach(t => { const kk = t[0] + ':' + t[1]; merged[kk] = (merged[kk] || 0) + t[2]; }); });
    const tops = Object.keys(merged).map(k => { const [b, c] = k.split(':').map(Number); return [b, c, merged[k]]; }).sort((a, b) => b[2] - a[2]).slice(0, 8);
    const tot = counts.reduce((a, b) => a + b, 0);
    const per = counts.map((n, i) => n ? (n / idx.n[i] * 10000).toFixed(1) : '0');
    out.innerHTML = `<div class="gu"><p class="gu-h">“${escHtml(keys.length > 1 ? w + '” and forms' : w + '”')}<span>${fmtN(tot)} time${tot === 1 ? '' : 's'}</span></p>${usageBars(counts)}
      <p class="wc-rate">Per 10,000 words: ${Bk.slugs().slice(0, nb).map((b, i) => `${LIB_BOOK_SHORT[b]} ${per[i]}`).join(' · ')}</p>
      ${keys.length > 1 ? `<p class="wc-rate">Forms counted: ${keys.map(k => `${escHtml(k)} ${fmtN(idx.w[k].slice(0, nb).reduce((a, b) => a + b, 0))}`).join(' · ')}</p>` : ''}
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
const NOTE_BOOK_ORDER = Bk.map(Bk.order);
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
    if (!Bk.keyRe().test(k)) return;
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
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'daily-butter-notes.json'; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
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
  const GOSPELS = ['matthew', 'mark', 'luke', 'john'], isGospel = GOSPELS.indexOf(currentBook) >= 0;
  const cmpHead = '<tr><th></th>' + GOSPELS.map(b => `<th class="${b === currentBook ? 'cur' : ''}">${LIB_BOOK_SHORT[b]}</th>`).join('') + '</tr>';
  const cmp = BOOKS.compare.map(r => { const mx = Math.max.apply(null, r.slice(1)); return `<tr><td>${escHtml(r[0])}</td>${r.slice(1).map((n, i) => `<td class="${GOSPELS[i] === currentBook ? 'cur' : ''}${n === mx && mx > 0 ? ' mx' : ''}">${n}</td>`).join('')}</tr>`; }).join('');
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
    ${sig ? bkSection('WORDS ' + B.name.toUpperCase() + ' FAVORS', `<ul class="bk-words fav">${sig.map(x => `<li><b>${escHtml(x.l)}</b> <span>${escHtml(x.g)}</span><em>${fmtN(x.n)}× here · ${fmtN(x.o)}× in the ${WCBK[currentBook] ? wcBooksText(WCBK[currentBook], 'fav') : 'other three'}</em></li>`).join('')}</ul>`) : ''}
    ${!isGospel ? '' : bkSection('COMPARE THE GOSPELS', `<div class="bk-tblwrap"><table class="bk-tbl">${cmpHead}${cmp}</table></div><p class="lib-intro">Counts of English words and phrases in the Berean Standard Bible. The highest count in each row is shaded.</p>`)}
    <details class="acc"><summary>WORD COUNTER</summary><div class="acc-body" id="wcBox"></div></details>`;
  renderWordCounter(panel.querySelector('#wcBox'));
}

function fillTemplateTabs(ctx) {
  const ov = ctx.overview || {};
  const arch = document.querySelector('[data-panel="archaeology"]');
  if (arch) arch.innerHTML = renderArchTab(ov);
  const ppl = document.querySelector('[data-panel="people"]');
  if (ppl) { ppl.innerHTML = '<p class="panel-eyebrow">GLOSSARY</p><p class="lib-intro">Opening the glossary…</p>'; try { Gl.fillTab(ppl).catch(() => { ppl.innerHTML = renderPeopleTab(ov); }); } catch (e) { ppl.innerHTML = renderPeopleTab(ov); } }
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

// Short picture label for the Overview: one sentence cut to a few words; the full description is in the Gallery (tap the picture).
function ovShortCap(s, n) {
  n = n || 46;
  s = String(s || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  const m = s.match(/^(.+?[.!?])(\s|$)/);
  if (m) s = m[1];
  s = s.replace(/[.!?]+$/, '');
  if (s.length > n) {
    const cut = s.slice(14).search(/[,;:\u2014(]| \u2013 /);
    if (cut >= 0 && cut + 14 <= n + 8) s = s.slice(0, cut + 14);
  }
  if (s.length > n) s = s.slice(0, n).replace(/[\s,;:]+\S*$/, '').replace(/(\s+(of|the|a|an|and|in|on|at|to|for|with|by|from|where))+$/i, '') + '\u2026';
  return s;
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
  const voices = ovVoicesHtml(ctx);
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
        ? `<button class="ov-blk ov-setblk" data-go="gallery" data-section="setting"><span class="ov-setphoto"><img src="${displayImageUrl(ctx.currentImage.url)}" alt="" loading="lazy" decoding="async" onerror="this.remove()"><span class="ov-artlabel" style="color:#fff">SETTING<i>›</i></span><span class="ov-placename">${escHtml(place)}</span></span><span class="ov-setdesc">${escHtml(ovShortCap(ov.settingLine || '', 44))}</span></button>`
        : block('', 'SETTING', 'var(--verdigris)', 'gallery', `<span class="ov-sn ov-sn3">${escHtml(place)}. ${escHtml(ov.settingLine || '')}</span>`, 'setting')}
      ${block('', 'HISTORY', 'var(--blue)', 'context', seg(ov.history, 'var(--verdigris)'), 'setting')}
      ${block('', 'CUSTOMS', 'var(--burgundy)', 'context', seg(ov.customs, 'var(--blue)'), 'setting')}
      ${block('', 'TRANSLATIONS', 'var(--gold)', 'translation', words)}
      ${img ? `<button class="ov-blk ov-full ov-artblk" data-go="gallery"><img src="${displayImageUrl(img.url)}" alt="${escHtml(img.caption)}" loading="lazy" decoding="async"><span class="ov-artlabel">ART<i>›</i></span><span class="ov-artcap">${escHtml(ovShortCap(img.caption))}</span></button>` : block('ov-full', 'ART', 'var(--gold)', 'gallery', '<span class="ov-sn">Artwork coming soon.</span>')}
      ${block('ov-refblk', 'REFERENCES', 'var(--gold)', 'xref', refs)}
      ${block('ov-cmblk', 'COMMENTARY', 'var(--burgundy)', 'commentary', voices)}
      ${arch
        ? `<button class="ov-blk ov-setblk${arch.img ? ' ov-setfit' : ''}" data-go="archaeology"><span class="ov-setphoto"><img src="${escHtml(displayImageUrl(arch.url))}" alt="" loading="lazy" decoding="async" onerror="this.remove()"><span class="ov-artlabel" style="color:#fff">ARCHAEOLOGY<i>›</i></span><span class="ov-placename">${escHtml(arch.name)}</span></span><span class="ov-setdesc">${escHtml(ovShortCap(arch.desc, 44))}</span></button>`
        : block('', 'ARCHAEOLOGY', 'var(--blue)', 'archaeology', ov.archaeology ? seg(ov.archaeology, 'var(--gold)') : '<span class="ov-sn ov-sn3">Sites, digs and artifacts tied to this chapter. Coming soon.</span>')}
      ${block('ov-top', 'ORIGINAL WRITING', 'var(--verdigris)', 'author', `<span class="ov-kv"><span><em>AUTHOR</em>${escHtml(ov.author || clip(ctx.author, 70))}</span><span><em>GENRE</em>${escHtml(ov.genre || String(ctx.genre).split(/[,—.]/)[0])}</span><span><em>AUDIENCE</em>${escHtml(ov.audience || clip(ctx.audience, 60))}</span>${GOSPEL_FACTS[currentBook] ? `<span><em>FOCUS</em>${escHtml(GOSPEL_FACTS[currentBook].focus)}</span>` : ''}</span>`, 'writing')}
      ${block('ov-full ov-tlblk', 'TIMELINE', 'var(--blue)', 'context', `<span class="ov-tl3" id="ovTl3">${tl3Html()}</span><span class="ov-tlcap">IN THIS CHAPTER</span><span class="ov-rail">${tl}</span>`, 'timeline')}
      <button class="ov-blk ov-soon" data-go="discussion"><span class="ov-h" style="color:var(--verdigris)">DISCUSSION<i>›</i></span><span class="ov-sn ov-sn5">${escHtml(ov.discussionShort || ov.discussion || 'Theology and discussion questions. Coming soon.')}</span></button>
      ${block('', 'GLOSSARY', 'var(--burgundy)', 'people', `<ul class="ov-bul">${(ov.peoplePlaces || (ov.people || []).concat(ov.places || []).map(n => ({ n, d: '' }))).map(x => `<li><b>${escHtml(x.n)}</b>${x.d ? ' · ' + escHtml(x.d) : ''}</li>`).join('')}</ul>`)}
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
const MAP_BOOK_COLORS = Bk.map(Bk.color);
const MAP_TST = Bk.map(Bk.testament);
let EVENTS = null, EV_BY_ID = {};
let mapMain = null, mapMainReady = false, mapStyleFailed = false;
let mapF = { tst: 'all', book: 'all', chapter: 'all', from: 1, to: 9999 };
let mapMaxI = 579;       // number of the last event (set when events load)
let mapStory = '';       // '' or a story id (see MAP_STORIES): draws the path and numbers the stops
// a story is never carried over from an earlier visit: the map always opens with no filters
// Stories follow one life through the events, in order. More can be added (Life of Paul comes with Acts).
const MAP_STORIES = [
  { id: 'jesus', name: 'Life of Jesus', color: '#8C4646', ready: true, match: e => typeof e.i === 'number' && e.i <= 110,
    // the full walk is 30 key moments (the rest still show on the map)
    key: [2, 5, 7, 9, 12, 14, 15, 17, 21, 23, 24, 25, 36, 42, 48, 49, 58, 59, 72, 81, 83, 85, 92, 95, 99, 102, 104, 105, 109, 110], // the full walk: 30 stops
    short: [2, 5, 14, 25, 36, 48, 83, 92, 102, 104, 110], // the short walk: 11 stops
    blurb: 'Every Gospel event from the angel’s visit to Mary to the Ascension, in order and joined by a path. Numbers show the order.' },
  { id: 'acts', name: 'The Book of Acts', color: '#3f6a55', ready: true, match: e => typeof e.i === 'number' && e.i > 110 && e.i <= 184 && !e.bg,
    key: [111, 113, 114, 116, 118, 120, 122, 123, 124, 127, 128, 129, 131, 136, 137, 140, 141, 142, 144, 145, 155, 158, 163, 164, 167, 173, 179, 181, 182, 184],
    short: [111, 113, 116, 124, 129, 131, 140, 142, 155, 167, 184],
    blurb: 'The church from the Ascension to Paul in Rome, in the order Luke tells it. Numbers show the order.' },
  { id: 'paul', name: 'Life of Paul', color: '#4d5f8f', ready: true, match: e => e.pa === 1,
    key: [125, 127, 131, 132, 133, 134, 135, 142, 145, 147, 149, 151, 155, 158, 159, 160, 163, 164, 167, 168, 170, 173, 175, 177, 179, 181, 182, 184],
    short: [131, 134, 142, 145, 155, 158, 163, 167, 173, 181, 184],
    blurb: 'From Tarsus and the Damascus road, through three journeys, the arrest in Jerusalem and the voyage to Rome. Numbers show the order.' },
  { id: 'romans', name: 'The Letter to the Romans', color: '#7a5a8a', ready: true, match: e => typeof e.i === 'number' && e.i > 184 && e.i <= 194 && !e.bg,
    key: [185, 186, 187, 188, 189, 190, 191, 192],
    short: [186, 187, 188, 189, 192],
    blurb: 'Where Paul had worked, where he wrote the letter, who carried it, and where it was going. Romans names no travel route, so these stops follow the clues in chapters 1, 13, 15 and 16.' },
  { id: '1cor', name: 'The First Letter to the Corinthians', color: '#a0643c', ready: true, match: e => typeof e.i === 'number' && e.i > 194 && e.i <= 213 && !e.bg,
    key: [195, 197, 198, 201, 204, 207, 208, 210, 211, 213],
    short: [195, 197, 201, 207, 208, 210],
    blurb: 'How the church in Corinth began, where Paul wrote, and the matters the letter answers: quarrels, lawsuits, idol food, the Lord’s Supper, spiritual gifts, and the resurrection. Numbers show the order.' },
  { id: '2cor', name: 'The Second Letter to the Corinthians', color: '#8a6f3c', ready: true, match: e => typeof e.i === 'number' && e.i > 213 && e.i <= 232 && !e.bg,
    key: [214, 216, 217, 219, 220, 224, 226, 229, 230, 232],
    short: [214, 216, 219, 220, 229, 232],
    blurb: 'The crisis in Asia, the painful visit and the tearful letter, Titus meeting Paul in Macedonia, the gift for Jerusalem, and the hardships Paul lists. Where Paul gives no place, the pin follows the clues in the letter. Numbers show the order.' },
  { id: 'gal', name: 'The Letter to the Galatians', color: '#7a6a2f', ready: true, match: e => typeof e.i === 'number' && e.i > 232 && e.i <= 249 && !e.bg,
    key: [233, 234, 235, 236, 238, 239, 240, 243, 246, 249],
    short: [233, 234, 236, 238, 239, 249],
    blurb: 'Paul tells his own story first: Damascus, Arabia, Jerusalem, Syria and Cilicia, the private meeting with the pillars, and the clash with Peter at Antioch. Then he turns to the churches of Galatia. Where Paul names no place, the pin follows the clues in the letter. Numbers show the order.' },
  { id: 'eph', name: 'The Letter to the Ephesians', color: '#3f6f8a', ready: true, match: e => typeof e.i === 'number' && e.i > 249 && e.i <= 264 && !e.bg,
    key: [250, 251, 252, 253, 254, 255, 257, 258, 263, 264],
    short: [250, 252, 253, 254, 257, 263],
    blurb: 'Ephesus and the world of Artemis, the Temple wall in Jerusalem, Paul in chains, the churches of the Lycus valley, the elders at Miletus, and the armor of a Roman guard. Ephesians names few places, so most pins follow the clues in the letter and in Acts. Numbers show the order.' },
  { id: 'phil', name: 'The Letter to the Philippians', color: '#7a4f6f', ready: true, match: e => typeof e.i === 'number' && e.i > 264 && e.i <= 282 && !e.bg,
    key: [265, 266, 267, 268, 269, 271, 272, 274, 275, 280, 282],
    short: [265, 266, 269, 272, 275, 280],
    blurb: 'The church in the Roman colony of Philippi, Paul in chains (Rome is the usual view), the hymn about Christ, Timothy and Epaphroditus, the credentials Paul gave up, the gift remembered from Thessalonica, and the household of Caesar. Philippians names few places, so most pins follow the clues in the letter and in Acts. Numbers show the order.' },
  { id: 'col', name: 'The Letter to the Colossians', color: '#4f7a6b', ready: true, match: e => typeof e.i === 'number' && e.i > 282 && e.i <= 303 && !e.bg,
    key: [283, 284, 286, 288, 289, 291, 294, 297, 299, 301, 302],
    short: [283, 284, 286, 289, 297, 302],
    blurb: 'The small church at Colossae in the Lycus Valley, Epaphras and his news, Paul in chains (Rome is the usual view), the hymn about the Son, the warning about empty philosophy, life raised with Christ, and the churches of Laodicea and Hierapolis. Colossians names few places, so most pins follow the clues in the letter and in Acts. Numbers show the order.' },
  { id: 'th1', name: 'The First Letter to the Thessalonians', color: '#6f7a3f', ready: true, match: e => typeof e.i === 'number' && e.i > 303 && e.i <= 319 && !e.bg,
    key: [304, 305, 306, 307, 309, 311, 312, 314, 316, 317, 319],
    short: [304, 305, 311, 312, 316, 317],
    blurb: 'The church in Thessalonica on the Via Egnatia, how the gospel came and the shame at Philippi, Paul alone in Athens, Timothy sent and back with good news, the call to holiness, the hope for those who sleep in death, and the Day of the Lord. The letter names few places, so some pins follow the clues in the letter and in Acts. Numbers show the order.' },
  { id: 'th2', name: 'The Second Letter to the Thessalonians', color: '#8a4f3f', ready: true, match: e => typeof e.i === 'number' && e.i > 319 && e.i <= 333 && !e.bg,
    key: [320, 321, 322, 324, 325, 327, 328, 329, 331, 333],
    short: [320, 322, 324, 325, 331, 333],
    blurb: 'A church still under pressure, the promise of relief when the Lord is revealed, a false report that the day has come, the rebellion and the man of lawlessness, the one who restrains, and the call to keep working. The letter names few places, so most pins follow the clues in the letter and in Acts. Numbers show the order.' },
  { id: 'tim1', name: 'The First Letter to Timothy', color: '#5f5f8a', ready: true, match: e => typeof e.i === 'number' && e.i > 333 && e.i <= 353 && !e.bg,
    key: [334, 335, 337, 339, 340, 341, 343, 344, 346, 348, 351, 352],
    short: [334, 335, 337, 341, 346, 352],
    blurb: 'Timothy left at Ephesus to deal with false teachers, Paul\'s own story of mercy, prayer for everyone and order in the assembly, overseers and deacons, the hymn about the mystery of godliness, widows and elders, money, and the final charge to guard what was entrusted. The letter names only Ephesus, Macedonia and Pilate, so most pins stand at Ephesus and a few follow clues. Numbers show the order.' },
  { id: 'tim2', name: 'The Second Letter to Timothy', color: '#6a4a6a', ready: true, match: e => typeof e.i === 'number' && e.i > 353 && e.i <= 374 && !e.bg,
    key: [354, 355, 356, 357, 359, 360, 361, 362, 364, 367, 369, 371, 373],
    short: [354, 357, 361, 367, 369, 373],
    blurb: 'Paul in chains at Rome writes to Timothy: the faith of Lois and Eunice, not being ashamed, guarding what was entrusted, the soldier, the athlete and the farmer, the last days, all Scripture, the final charge, the friends who left and the one who stayed, the cloak and the scrolls, and the first defense. Rome, Ephesus, Troas and Lystra carry most pins; Jannes and Jambres sit in Egypt. Numbers show the order.' },
  { id: 'titus', name: 'The Letter to Titus', color: '#4f6a5a', ready: true, match: e => typeof e.i === 'number' && e.i > 374 && e.i <= 389 && !e.bg,
    key: [375, 376, 377, 379, 381, 383, 384, 386, 387, 388],
    short: [375, 377, 379, 384, 386, 388],
    blurb: 'Paul writes to Titus, left on Crete to finish the work: elders in every town, rebellious talkers and the Cretan poet\'s saying, sound teaching for older and younger, slaves who adorn the teaching, the grace of God that has appeared, the washing of new birth, good deeds and a warning against quarrels, and travel plans for Nicopolis. The letter names only Crete and Nicopolis, so most pins stand on the island and one at Knossos for the poet. Numbers show the order.' },
  { id: 'philemon', name: 'The Letter to Philemon', color: '#8a6a4a', ready: true, match: e => typeof e.i === 'number' && e.i > 389 && e.i <= 399 && !e.bg,
    key: [390, 392, 393, 395, 396, 398],
    short: [390, 393, 395, 396],
    blurb: 'Paul writes from prison to Philemon, Apphia, Archippus and the church in their home: thanks for Philemon\'s love, an appeal rather than an order, Onesimus who was useless and is now useful, a slave who is more than a slave, a promise to repay, a guest room to prepare, and greetings from Paul\'s companions. Pins at Colossae mark Philemon\'s household and pins at Rome mark Paul, a placement scholars debate (Ephesus and Caesarea are also proposed). Numbers show the order.' },
  { id: 'hebrews', name: 'The Letter to the Hebrews', color: '#5a6a8a', ready: true, match: e => typeof e.i === 'number' && e.i > 399 && e.i <= 422 && !e.bg,
    key: [400, 404, 405, 407, 409, 410, 413, 415, 419, 421],
    short: [400, 404, 405, 407, 410, 419],
    blurb: 'An unnamed writer sends a word of exhortation to tired believers: the Son greater than the angels, Moses and the priests; the warning from the wilderness; the great high priest who knows weakness; Melchizedek; the new covenant; the one sacrifice; the list of the faithful; and the call to run, endure and go outside the camp. The letter names no place of its own, so the pins stand at the places its stories point to (the Temple, Gethsemane, Golgotha, Kadesh, Mamre, Jericho, Mount Zion) and at Rome for the readers, a placement scholars debate. Numbers show the order.' },
  { id: 'james', name: 'The Letter of James', color: '#6a7a4a', ready: true, match: e => typeof e.i === 'number' && e.i > 422 && e.i <= 441 && !e.bg,
    key: [423, 424, 429, 430, 433, 435, 438, 440],
    short: [423, 424, 429, 431, 433, 440],
    blurb: 'A letter from James to the twelve tribes of the Dispersion: joy in trials, wisdom from God, doers of the word and not hearers only, no favoritism toward the rich, faith that works, the tongue, the two wisdoms, pride and the world, the Lord\'s will, the warning to the rich, patience, oaths, and the prayer of faith. The letter names neither a place of writing nor its readers\' towns, so the pins stand at Jerusalem for the sender (the church tradition about James), at Antioch in Syria for the readers (a judgment call, based on Acts 11:19 and 15:23), and at Moriah, Jericho and Mount Carmel for the Old Testament scenes it recalls. Numbers show the order.' },
  { id: '1peter', name: 'The First Letter of Peter', color: '#7a5a6a', ready: true, match: e => typeof e.i === 'number' && e.i > 441 && e.i <= 461 && !e.bg,
    key: [442, 443, 444, 446, 448, 449, 452, 455, 458, 459, 461],
    short: [442, 443, 448, 455, 459, 461],
    blurb: 'A letter from Peter to the elect exiles scattered across northern Asia Minor: a living hope and an inheritance that cannot fade, gold tested by fire, the lamb without blemish, the living word, the living stone and the chosen people, honor to the king, servants and the example of Christ, wives and husbands, blessing instead of revenge, the reason for your hope, Noah and baptism, the fiery trial, the Chief Shepherd, the roaring lion, and greetings from Babylon. The letter names no town of its readers, so their pins stand at Ancyra in Galatia, a judgment call, since the first readers lived in five Roman provinces. Peter writes from Babylon, which most readers take as a code name for Rome, so the sender is pinned at Rome; some propose the literal Babylon or the Egyptian one. Pins at Zion, Sinai and Mount Ararat mark the Old Testament scenes the letter recalls. Numbers show the order.' },
  { id: '2peter', name: 'The Second Letter of Peter', color: '#6a5a7a', ready: true, match: e => typeof e.i === 'number' && e.i > 461 && e.i <= 481 && !e.bg,
    key: [462, 463, 465, 466, 468, 469, 471, 473, 475, 477, 478, 480],
    short: [462, 466, 468, 471, 478, 479],
    blurb: 'A short letter that Peter writes as his death draws near: everything for life and godliness, the ladder from faith to love, the eyewitnesses on the holy mountain, the word of the prophets, false teachers, the examples of the fallen angels, Noah, Sodom and Lot, the way of Balaam, the dog and the sow, scoffers who ask where the promise is, a day like a thousand years, a new heaven and a new earth, and Paul\'s letters. The letter names no place of writing and no town for its readers, so the sender is pinned at Rome, where church tradition says Peter died, and the readers at Ancyra in Galatia, following 1 Peter; both are judgment calls, and many scholars doubt that Peter himself wrote it. Pins at Mount Tabor (a traditional guess for the holy mountain), Ararat, the Dead Sea and the plains of Moab mark the scenes it recalls. Numbers show the order.' },
  { id: '1john', name: 'The First Letter of John', color: '#a0643c', ready: true, match: e => typeof e.i === 'number' && e.i > 481 && e.i <= 503 && !e.bg,
    key: [482, 483, 484, 486, 489, 491, 493, 494, 497, 501, 503],
    short: [482, 484, 489, 494, 497, 503],
    blurb: 'An anonymous letter that church tradition ascribes to John: what we have heard, seen and touched, God is light, if we confess our sins, an advocate and the atoning sacrifice, an old commandment that is new, do not love the world, the many antichrists, the anointing, children of God, Cain, laying down our lives, test the spirits, God is love, perfect love, the victory over the world, water and blood, and keep yourselves from idols. The letter names neither a place of writing nor its readers, so most pins stand at Ephesus, where early tradition places John in his last years, a judgment call; some scholars doubt that the apostle wrote it. Pins at the Temple Mount, the upper room, Golgotha, the Jordan and the Artemision mark the scenes and the city it recalls. Numbers show the order.' },
  { id: '2john', name: 'The Second Letter of John', color: '#a0643c', ready: true, match: e => typeof e.i === 'number' && e.i > 503 && e.i <= 510 && !e.bg,
    key: [504, 505, 506, 508, 509, 510],
    short: [504, 506, 509],
    blurb: 'A one-page letter from \u201cthe elder\u201d to a \u201cchosen lady and her children\u201d: truth and love, the commandment we have had from the beginning, many deceivers who refuse to confess Jesus Christ in the flesh, remaining in the teaching of Christ, a rule for the visitor at the door, and a hope to speak face to face. The letter names neither a place of writing nor a town for its readers, so the pins stand at Ephesus, where early tradition places John in his last years, a judgment call; the pin for the house stands at the terrace houses of Ephesus. Some scholars think \u201cthe elder\u201d was a John other than the apostle. Numbers show the order.' },
  { id: '3john', name: 'The Third Letter of John', color: '#3c7a6e', ready: true, match: e => typeof e.i === 'number' && e.i > 510 && e.i <= 517 && !e.bg,
    key: [511, 513, 514, 515, 516, 517],
    short: [511, 513, 514],
    blurb: 'A private note from \u201cthe elder\u201d to his friend Gaius, the shortest book in the New Testament: a prayer for his health, thanks for taking in traveling brothers who were strangers, a hard word about Diotrephes, who loves to be first and refuses them, a good word for Demetrius, and a hope to speak face to face. The letter names no place. Pins for the elder stand at Ephesus, where early tradition places John in his last years, and pins for Gaius and Diotrephes stand at Pergamum, where a list from about AD 380 puts a bishop named Gaius. Both are judgment calls, and the Pergamum tradition is late and uncertain. Numbers show the order.' },
  { id: 'jude', name: 'The Letter of Jude', color: '#7a4a3c', ready: true, match: e => typeof e.i === 'number' && e.i > 517 && e.i <= 527 && !e.bg,
    key: [518, 519, 520, 521, 522, 524, 526, 527],
    short: [519, 521, 524, 527],
    blurb: 'A short, urgent letter from Jude, a brother of James: contend for the faith, because people have crept in who turn grace into a license for sin. Jude sets them beside old examples of judgment (the wilderness generation, the angels, Sodom, Cain, Balaam and Korah), quotes the Book of Enoch, calls his readers to keep themselves in the love of God and show mercy to doubters, and ends with a hymn of praise. The letter names no place. Pins for Jude and his readers stand at Nazareth, the home of the family of Jesus, a judgment call; other pins mark places tied to the stories he uses: the Dead Sea plain, Mount Nebo, Deir \u2018Alla and Qumran. Numbers show the order.' },
  { id: 'revelation', name: 'Revelation', color: '#8a2f3d', ready: true, match: e => typeof e.i === 'number' && e.i > 527 && e.i <= 579 && !e.bg,
    key: [528, 530, 531, 532, 533, 534, 535, 536, 537, 538, 539, 540, 544, 550, 552, 555, 562, 564, 566, 570, 572, 574, 576, 579],
    short: [530, 531, 532, 533, 534, 535, 536, 537, 539, 562, 564, 576],
    blurb: 'The last book of the Bible: a letter, a prophecy and a series of visions given to John on the island of Patmos for seven churches in Roman Asia. Seven pins mark those churches, in the order a messenger would reach them. Most of the visions are set in heaven and have no place on a map, so their pins stand at Patmos, where John saw them. A few stand at places the book names or points to: the Euphrates, Megiddo (Armageddon), Jerusalem, and Rome and Babylon for the great city of chapters 17-18, which is a judgment call. The notes give the main ways Christians read each vision. Numbers show the order.' }
];
// number shown on a pin or list row: its place in the story that is switched on (the Gospel events keep their own numbers)
function mapNo(e) {
  const s = mapActiveStory(); if (!s || typeof e.i !== 'number') return e.i;
  if (!s._no) { s._no = {}; let k = 0; (EVENTS || []).filter(x => !x.chapterPin && s.match(x)).sort((a, b) => a.i - b.i).forEach(x => { s._no[x.i] = ++k; }); s._tot = k; }
  return s._no[e.i] || e.i;
}
// Story order (the Gospels, then Acts), not calendar dates: scholars still debate the years
const MAP_PERIODS = [
  { n: 'Birth and childhood', a: 1, b: 12 },
  { n: 'First signs', a: 13, b: 22 },
  { n: 'Galilee ministry', a: 23, b: 62 },
  { n: 'Toward Jerusalem', a: 63, b: 81 },
  { n: 'The final week', a: 82, b: 94 },
  { n: 'Arrest and cross', a: 95, b: 103 },
  { n: 'Risen', a: 104, b: 110 },
  { n: 'Acts: the church begins', a: 111, b: 127 },
  { n: 'Acts: spreading out', a: 128, b: 144 },
  { n: 'Acts: the first journey', a: 145, b: 155 },
  { n: 'Acts: the second journey', a: 156, b: 165 },
  { n: 'Acts: the third journey', a: 166, b: 172 },
  { n: 'Acts: arrest and trials', a: 173, b: 179 },
  { n: 'Acts: the voyage to Rome', a: 180, b: 184 },
  { n: 'Romans: the letter', a: 185, b: 194 },
  { n: '1 Corinthians: the letter', a: 195, b: 213 },
  { n: '2 Corinthians: the letter', a: 214, b: 232 },
  { n: 'Galatians: the letter', a: 233, b: 249 },
  { n: 'Ephesians: the letter', a: 250, b: 264 },
  { n: 'Philippians: the letter', a: 265, b: 282 },
  { n: 'Colossians: the letter', a: 283, b: 303 },
  { n: '1 Thessalonians: the letter', a: 304, b: 319 },
  { n: '2 Thessalonians: the letter', a: 320, b: 333 },
  { n: '1 Timothy: the letter', a: 334, b: 353 },
  { n: '2 Timothy: the letter', a: 354, b: 374 },
  { n: 'Titus: the letter', a: 375, b: 389 },
  { n: 'Philemon: the letter', a: 390, b: 399 },
  { n: 'Hebrews: the letter', a: 400, b: 422 },
  { n: 'James: the letter', a: 423, b: 441 },
  { n: '1 Peter: the letter', a: 442, b: 461 },
  { n: '2 Peter: the letter', a: 462, b: 481 },
  { n: '1 John: the letter', a: 482, b: 503 },
  { n: '2 John: the letter', a: 504, b: 510 },
  { n: '3 John: the letter', a: 511, b: 517 },
  { n: 'Jude: the letter', a: 518, b: 527 },
  { n: 'Revelation: the seven churches (1-3)', a: 528, b: 537 },
  { n: 'Revelation: the throne, seals and trumpets (4-11)', a: 538, b: 551 },
  { n: 'Revelation: the dragon, the beasts and Babylon (12-18)', a: 552, b: 568 },
  { n: 'Revelation: the King and the new Jerusalem (19-22)', a: 569, b: 579 }
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
  const nt = Bk.slugs();
  const chips = [`<button type="button" class="map-chip${mapF.book === 'all' ? ' on' : ''}" data-b="all"><i style="background:var(--gold)"></i>All books</button>`]
    .concat(nt.filter(b => (mapF.tst === 'all' || MAP_TST[b] === mapF.tst) && (!EVENTS || EVENTS.some(e => (e.r || []).some(r => r[0] === b)))).map(b => `<button type="button" class="map-chip${mapF.book === b ? ' on' : ''}" data-b="${b}"><i style="background:${MAP_BOOK_COLORS[b]}"></i>${mapBookName(b)}</button>`));
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
  el.innerHTML = full ? 'Showing the whole story, in order: the Gospels, then Acts. Drag either end to narrow it. Dates are circa, so the order is what we show.'
    : `From <b>${escHtml(a.t)}</b> (${a.i}) to <b>${escHtml(z.t)}</b> (${z.i}).`;
  const bar = mapEl('mapRBar'), span = Math.max(1, mapMaxI - 1);
  if (bar) { bar.style.left = ((mapF.from - 1) / span * 100) + '%'; bar.style.right = (100 - (Math.min(mapF.to, mapMaxI) - 1) / span * 100) + '%'; }
}
function renderMapFilterUI() {
  const st = mapEl('mapStories'); if (!st) return;
  const cur = mapActiveStory();
  st.innerHTML = MAP_STORIES.map(x => `<button type="button" class="mf-story${cur && cur.id === x.id ? ' on' : ''}" data-s="${x.id}" style="--c:${x.color}"${x.ready ? '' : ' disabled'}><i></i>${escHtml(x.name)}</button>`).join('');
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
  { id: 'jordan', name: 'Jordan River', la: 31.84, ln: 35.55, r: 3.0 },
  { id: 'caesarea', name: 'Caesarea', la: 32.50, ln: 34.892, r: 2.0 },
  { id: 'joppa', name: 'Joppa', la: 32.05, ln: 34.752, r: 2.0 },
  { id: 'damascus', name: 'Damascus', la: 33.51, ln: 36.31, r: 4.0 },
  { id: 'tarsus', name: 'Tarsus', la: 36.918, ln: 34.893, r: 3.0 },
  { id: 'antioch', name: 'Antioch', la: 36.202, ln: 36.16, r: 3.0 },
  { id: 'lystra', name: 'Lystra', la: 37.566, ln: 32.39, r: 3.0 },
  { id: 'troas', name: 'Troas', la: 39.755, ln: 26.156, r: 3.0 },
  { id: 'philippi', name: 'Philippi', la: 41.013, ln: 24.287, r: 3.0 },
  { id: 'ephesus', name: 'Ephesus', la: 37.94, ln: 27.342, r: 3.0 },
  { id: 'corinth', name: 'Corinth', la: 37.906, ln: 22.88, r: 3.0 },
  { id: 'thessalonica', name: 'Thessalonica', la: 40.6401, ln: 22.9444, r: 3.0 },
  { id: 'athens', name: 'Athens', la: 37.9715, ln: 23.7257, r: 3.0 },
  { id: 'rome', name: 'Rome', la: 41.9028, ln: 12.4964, r: 4.0 }
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
  ['33.56,35.37', 'Sidon', 'c', 7, 99], ['33.25,35.69', 'Caesarea Philippi', 'c', 8.5, 99], ['32.275,35.19', 'Sebaste', 'c', 9.5, 99], ['31.53,35.10', 'Hebron', 'c', 8.5, 99], ['30.3285,35.4444', 'Petra', 'c', 6.5, 99],
  ['31.50,34.47', 'Gaza', 'c', 7, 99], ['32.05,34.75', 'Joppa', 'c', 8, 99], ['33.51,36.29', 'Damascus', 'c', 6, 99], ['32.28,35.89', 'Gerasa', 'c', 8.5, 99], ['32.50,35.50', 'Scythopolis', 'c', 9, 99],
  ['32.82,35.59', 'Sea of Galilee', 'w', 8.2, 13.5], ['31.50,35.47', 'Dead Sea', 'w', 7.5, 13], ['32.18,35.55', 'Jordan River', 'w', 9.5, 13], ['33.0,34.3', 'Mediterranean Sea', 'w', 3.5, 9.5],
  ['31.62,35.0', 'JUDEA', 'r', 6.3, 9.3], ['32.30,35.22', 'SAMARIA', 'r', 6.3, 9.3], ['32.90,35.30', 'GALILEE', 'r', 6.3, 9.3], ['32.0,35.74', 'PEREA', 'r', 6.3, 9.3],
  ['32.60,35.95', 'DECAPOLIS', 'r', 6.3, 9.3], ['31.30,35.0', 'IDUMEA', 'r', 6.3, 9.3], ['33.45,35.45', 'PHOENICIA', 'r', 6.3, 9.3], ['30.5,31.0', 'EGYPT', 'r', 4, 9.3], ['33.9,36.3', 'SYRIA', 'r', 5, 9.3], ['27.8,34.4', 'Red Sea', 'w', 4.5, 7.5],
  ['36.202,36.16', 'Antioch', 'c', 4.5, 99, 'antioch'], ['36.918,34.893', 'Tarsus', 'c', 5, 99, 'tarsus'], ['37.94,27.342', 'Ephesus', 'c', 4.5, 99, 'ephesus'],
  ['37.906,22.88', 'Corinth', 'c', 4.5, 99, 'corinth'], ['37.8833,22.9833', 'Cenchreae', 'c', 8, 99], ['37.9085,23.005', 'Isthmia', 'c', 8, 99], ['43.5397,16.4833', 'Salona', 'c', 5, 99], ['41.1189,1.2445', 'Tarraco', 'c', 5, 99], ['40.0,-3.5', 'Spain', 'r', 3, 6], ['44.0,17.0', 'Illyricum', 'r', 4, 6], ['37.984,23.727', 'Athens', 'c', 4.5, 99], ['41.013,24.287', 'Philippi', 'c', 5, 99, 'philippi'], ['40.64,22.944', 'Thessalonica', 'c', 5, 99],
  ['41.903,12.496', 'Rome', 'c', 3.5, 99, 'rome'], ['39.755,26.156', 'Troas', 'c', 5.5, 99, 'troas'], ['38.305,31.189', 'Pisidian Antioch', 'c', 6, 99], ['37.871,32.485', 'Iconium', 'c', 6, 99],
  ['37.566,32.39', 'Lystra', 'c', 6.5, 99, 'lystra'], ['37.53,27.279', 'Miletus', 'c', 6, 99], ['35.185,33.9', 'Salamis', 'c', 6, 99], ['34.755,32.42', 'Paphos', 'c', 6, 99],
  ['40.823,14.119', 'Puteoli', 'c', 5.5, 99], ['35.95,14.41', 'Malta', 'c', 5, 99], ['36.26,29.985', 'Myra', 'c', 6, 99], ['35.0,33.2', 'CYPRUS', 'r', 4.5, 7], ['35.25,24.9', 'CRETE', 'r', 4.5, 7],
  ['39.6,32.5', 'GALATIA', 'r', 4.2, 7], ['38.4,28.3', 'ASIA', 'r', 4.2, 7], ['40.6,22.0', 'MACEDONIA', 'r', 4.2, 7], ['38.0,22.2', 'ACHAIA', 'r', 4.2, 7], ['42.8,12.5', 'ITALY', 'r', 4.2, 7],
  ['40.6401,22.9444', 'Thessalonica', 'c', 4.5, 99, 'thessalonica'], ['37.9715,23.7257', 'Athens', 'c', 4.5, 99, 'athens'], ['37.836,29.1075', 'Laodicea', 'c', 6.5, 99], ['37.925,29.126', 'Hierapolis', 'c', 6.5, 99], ['37.787,29.265', 'Colossae', 'c', 8, 99], ['38.6,25.0', 'Aegean Sea', 'w', 4.5, 8]
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
  const no = (!hub && n === 1 && story && typeof lead.i === 'number') ? String(mapNo(lead)) : '';
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
    stepBar = `<div class="mc-step"><span>Stop ${mapNo(e)} of ${story._tot || mapMaxI}</span><button type="button" data-step="-1"${k <= 0 ? ' disabled' : ''}>‹ Back</button><button type="button" data-step="1"${k < 0 || k >= seq.length - 1 ? ' disabled' : ''}>Next ›</button></div>`;
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
    evs.map(e => `<button type="button" class="mc-pick" data-i="${e.i}">${mapActiveStory() && typeof e.i === 'number' ? `<span class="no">${mapNo(e)}</span>` : ''}<span class="th">${evThumb(e, 80)}</span><span class="tx"><b>${escHtml(e.t)}</b><span>${escHtml(evRefs(e))}</span></span></button>`).join('');
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
  document.getElementById('mapListBody').innerHTML = list.length ? list.map(e => `<button type="button" class="map-li" data-i="${e.i}">${story && typeof e.i === 'number' ? `<span class="no">${mapNo(e)}</span>` : ''}<span class="th" style="--bc:${MAP_BOOK_COLORS[evPrimaryBook(e)]}">${evThumb(e, 80)}</span><div><b>${escHtml(e.t)}</b><span>${escHtml(evRefs(e))}${e.p ? ' · ' + escHtml(e.p) : ''}</span></div></button>`).join('') : '<p class="mc-sum">Nothing to list yet.</p>';
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
// Open a chapter at its top in the reader (used by reading plans)
window.openChapterTop = async function (book, ch) {
  currentBook = book; currentChapterNum = Number(ch);
  await loadChapter();
  goToScreen('read');
  const rd = document.getElementById('reader'); if (rd) rd.scrollTop = 0;
};
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
const TOUR_IMG = {};
const TOUR_ICO = {
  read: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"/></svg>',
  study: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><path d="M12 3 2.5 8 12 13l9.5-5L12 3Z"/><path d="M2.5 12.5 12 17.5l9.5-5"/><path d="M2.5 17 12 22l9.5-5" opacity=".55"/></svg>',
  vis: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="m15.8 8.2-2.1 5.5-5.5 2.1 2.1-5.5z"/></svg>',
  home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 11.5 12 3.5l9.5 8"/><path d="M5.5 10v10.5h13V10"/><path d="M10 20.5v-5.5h4v5.5"/></svg>'
};
const TOUR_RES = [
  { k: 'read', op: '50% 12%', im: [['g_read', 640, 408]], alt: 'The Verse Inspector open on a verse', t: 'Read', 
    d: 'Read the Bible, then tap any verse to open it up.<span class="tex">Try: compare translations · see the original Greek word by word · read commentary · follow a reading plan</span>' },
  { k: 'study', op: '50% 4%', im: [['g_study', 640, 408]], alt: 'The Chapter Deep Dive', t: 'Study',
    d: 'Put a chapter or a story in context.<span class="tex">Try: a Chapter Deep Dive for setting, history and customs · Compare Scripture: Gospel parallels, Bible versions and any two passages side by side · Commentary: learn from pastors, authors, teachers and early church writers · the Glossary: a library of people, places, parables, Greek words and more</span>' },
  { k: 'vis', op: '50% 0%', im: [['g_vis', 640, 408]], alt: 'The Timeline', t: 'Visualize',
    d: 'See the Bible, not just read it.<span class="tex">Try: the Timeline · the Map · Connections between books · the family tree of Jesus</span>' },
  { k: 'home', op: '50% 0%', im: [['g_home', 640, 408]], alt: 'The Home screen', t: 'Home',
    d: 'A fully customizable spot to make your own.<span class="tex">Try: the Bible Clock, or switch it to a verse of the day · continue reading · swipe “Learn something new” sideways · change the blocks with the pencil</span>' }
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
  { kind: 'welcome', cls: 'twelc' },
  { n: 1, t: 'What this app is for', res: true, pos: 'center',
    b: 'Four places to start, whatever you are looking for:' },
  { n: 2, t: 'The five round buttons', target: ['#navBtnBook', '#navBtnStudy', '.nav-btn-center', '#navBtnVisualize', '#navBtnMore'], pos: 'above', next: 'Next', cls: 'five',
    b: '<ul><li><b>Read</b> is the Bible text, with your reading plans.</li><li><b>Study</b> puts a chapter or a story in context.</li><li><b>Home</b> is a fully customizable spot to make your own.</li><li><b>Visualize</b> shows the Bible as a timeline, a map, connections and a family tree.</li><li><b>More</b> holds Music, Settings and this guide.</li></ul>' },
  { n: 3, t: 'Try Read', target: '#navBtnBook', pos: 'above', wait: 'screen:booknav', auto: () => goToScreen('booknav'),
    b: 'Tap <b>Read</b> to choose what to read.' },
  { n: 4, t: 'Pick a book, then a chapter', target: '#screen-booknav', pos: 'bottom', col: true, hint: 'Pick a book, then a chapter', wait: 'screen:read', auto: () => goToScreen('read'),
    b: 'Tap any book, then any chapter.' },
  { n: 5, t: 'Tap a verse', target: '#screen-read', pos: 'bottom', col: true, hint: 'Tap any verse', wait: 'sheet', auto: () => openSummary(1),
    b: 'Tap any verse to open its info.' },
  { n: 6, t: 'Verse Inspector', target: '#sheet', pos: 'top', fit: true, sm: true, col: true, explore: true, wait: 'screen:deepdive', hint: 'Explore, then tap Chapter Deep Dive',
    b: 'Explore the words, translations and commentary here, then tap <b>Chapter Deep Dive</b> when you are finished.' },
  { n: 7, t: 'Chapter Overview', target: ['#screen-deepdive', '#navBtnVisualize'], pos: 'dock', sm: true, col: true, explore: true, wait: 'screen:timeline', hint: 'Scroll around, then tap Visualize below',
    b: 'The setting, the history around it, and customs a modern reader might miss.<span class="tnote">When you are ready, tap <b>Visualize</b> below.</span>' },
  { n: 8, t: 'Visualize', target: '.screen.active .hubseg', pos: 'below', wait: 'screen:map', auto: () => goToScreen('map'),
    b: '<ul class="tbul"><li><b>Timeline</b>: the whole Bible in order</li><li><b>Map</b>: where it happened</li><li><b>Connections</b>: how the books link up</li><li><b>Family tree</b>: the ancestors of Jesus</li></ul>Tap <b>Map</b> to continue.' },
  { n: 9, t: 'Want a guide for using the map?', ask: true, pos: 'center',
    enter: () => { try { mapFiltOpen(false); } catch (e) {} },
    b: 'Learn how to explore places, follow a story, and use the filters.' },
  { n: 10, t: 'Try the other tabs', target: '.screen.active .hubseg', pos: 'below', sm: true, col: true, free: true, explore: true, finish: true, hint: 'Try the tabs, then Finish',
    b: 'Timeline, Connections and the Family tree are one tap away at the top. Look around, then tap <b>Finish</b>.' }
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
  try { closeSheet(); } catch (e) {}
  goToScreen('home');                      // the guide starts on Home
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
    html = '<p class="tk">WELCOME TO DAILY BUTTER</p><img class="tlogo" src="images/brand/logo.png" width="560" height="346" alt="Daily Butter: to add on to your daily bread"><p class="twel">God provides us with our daily bread. This Bible study companion is here to help you Read, Study and Visualize the Word in a way that draws you closer to Him.</p><h3 class="twq">Want a quick tour?</h3><p class="tsub">The tour takes about two minutes.</p><div class="tfoot"><button type="button" class="tskip" data-a="skip">Not now</button><button type="button" class="tgo" data-a="next">Yes, show me around</button></div>';
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
    const list = s.res ? '<p class="tnote">Tap each one to see what you can do there</p><div class="tres">' + TOUR_RES.map((r, k) =>
      `<button type="button" class="tic${k === pk ? ' on' : ''}" data-a="peek" data-i="${k}" aria-pressed="${k === pk}">${TOUR_ICO[r.k]}<span>${r.t}</span></button>`).join('') + '</div>' +
      `<div class="tresx" key="${cr.k}"><div class="tprev" style="--op:${cr.op || '50% 0%'}">${cr.im.map(([f, w, h]) => `<img src="${TOUR_IMG[f] || 'images/guide/' + f + '.jpg'}" width="${w}" height="${h}" alt="${cr.alt}" onerror="tourImgFail(this,'${cr.k}')">`).join('')}</div><p>${cr.d}</p></div>` : '';
    const minBtn = s.col ? '<button type="button" class="tmin" data-a="min" aria-label="Collapse this tip">&minus;</button>' : '';
    html = `${minBtn}<h3>${s.t}</h3><div class="tbody">${s.b}</div>${list}${foot}${tourDots(s)}`;
  }
  card.innerHTML = html;
  tourPlace();
}
// the space the round buttons take at the bottom of a screen (same probe Home uses)
function tourNavSpace() {
  const ph = document.querySelector('.phone'); if (!ph) return 0;
  let pr = document.getElementById('navProbe');
  if (!pr) { pr = document.createElement('div'); pr.id = 'navProbe'; pr.style.cssText = 'position:absolute;left:0;width:0;visibility:hidden;pointer-events:none;height:var(--navh)'; ph.appendChild(pr); }
  return pr.offsetHeight || 0;
}
function tourHoleOf(sel, pr) {
  const t = document.querySelector(sel);
  if (!t) return null;
  // a round bottom button: the spotlight is a circle exactly around its glass
  const gl = t.querySelector ? t.querySelector(':scope > .nav-glass') : null;
  const r = (gl || t).getBoundingClientRect();
  if (r.width < 4 || r.height < 4) return null;
  const pad = gl ? 3 : (r.width > pr.width * .8 && r.height > pr.height * .3 ? 0 : 5);
  const x = Math.max(0, r.left - pr.left - pad), y = Math.max(0, r.top - pr.top - pad);
  const x2 = Math.min(pr.width, r.right - pr.left + pad);
  let y2 = Math.min(pr.height, r.bottom - pr.top + pad);
  // a whole-screen highlight stops above the round buttons, which float over the bottom of every screen
  if (!gl && /^#screen-/.test(sel) && !document.querySelector('.phone.nav-reserve')) {
    const lim = pr.height - tourNavSpace();
    if (y2 > lim && lim - y > 60) y2 = lim;
  }
  if (x2 <= x || y2 <= y) return null;
  if (gl) { const d = Math.min(x2 - x, y2 - y); return { x, y, w: x2 - x, h: y2 - y, r: d / 2 }; }
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
  if (sels.some(q => /navBtn|nav-btn|bottom-nav/.test(q))) phone.classList.remove('nav-dock');   // the round buttons stay full size while the guide points at them
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
