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
  matthew: { written: 'Probably AD 60s–80s; date is debated', focus: 'Jesus as the promised Messiah-King who fulfills Israel’s Scriptures' },
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

const BASE_TABS = ['context', 'translation', 'xref', 'commentary', 'gallery', 'author', 'archaeology', 'discussion', 'notes'];
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

function ensureLiveMap() {
  if (liveMap || typeof maplibregl === 'undefined') return;
  liveMap = new maplibregl.Map({
    container: 'liveMap',
    style: 'https://tiles.openfreemap.org/styles/liberty',
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
  if (!liveMap || !coords) return;
  const setPos = () => {
    liveMap.jumpTo({ center: [coords.lng, coords.lat], zoom: coords.zoom || 12 });
    if (liveMapMarker) liveMapMarker.setLngLat([coords.lng, coords.lat]);
    const cc = currentChapterData && currentChapterData.context;
    if (cc && cc.biblePlaces) { bibleOnlyStyle(liveMap); if (liveMapMarker) liveMapMarker.remove(); }
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
function displayImageUrl(url) {
  if (url && url.includes('commons.wikimedia.org/wiki/Special:FilePath/') && !url.includes('?')) {
    return url + '?width=1000';
  }
  return url;
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

function renderAccordion(ctx) {
  accordionOpen = { setting: true, timeline: true };

  const sections = [];

  let settingBody = `<p class="accordion-place">${toTitleCase(ctx.mapLabel.split('—')[0].trim())}</p><p class="panel-text">${ctx.setting}</p>`;
  if (ctx.history) {
    settingBody += `<p class="ctx-subhead ctx-subhead-spaced">HISTORY</p><p class="panel-text">${ctx.history}</p>`;
  }
  settingBody += `<p class="ctx-subhead ctx-subhead-spaced">CUSTOMS</p><p class="panel-text">${ctx.custom}</p>`;
  sections.push({ id: 'setting', label: 'Setting and History', icon: 'setting', body: settingBody });

  sections.push({
    id: 'timeline',
    label: 'Timeline',
    icon: 'timeline',
    body: `<p class="panel-text">${ctx.timelineImmediate}</p>
           <p class="ctx-subhead ctx-subhead-spaced" style="margin-top:14px;">BIBLE-WIDE</p>
           <p class="panel-text">${ctx.timelineBible}</p>
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
    });
  });

  const link = document.getElementById('ctxTimelineLink');
  if (link) link.addEventListener('click', () => goToScreen('timeline'));
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
      goToScreen(btn.dataset.screen);
    });
  });
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
    if (currentScreen === 'deepdive') renderFolderContent();
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
  if (currentScreen === 'deepdive') renderFolderContent();
}

async function handleChapterChange(newNum) {
  currentChapterNum = Number(newNum);
  await loadChapter();
  if (currentScreen === 'deepdive') renderFolderContent();
}

readBookSelect.addEventListener('change', () => handleBookChange(readBookSelect.value));
readChapterSelect.addEventListener('change', () => handleChapterChange(readChapterSelect.value));
ddBookSelect.addEventListener('change', () => handleBookChange(ddBookSelect.value));
ddChapterSelect.addEventListener('change', () => handleChapterChange(ddChapterSelect.value));

document.getElementById('harmonyBackBtn').addEventListener('click', () => {
  goToScreen('deepdive');
});

document.querySelectorAll('.timeline-size-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.timeline-size-btn').forEach(b => b.classList.toggle('active', b === btn));
    const list = document.getElementById('timelineList');
    list.classList.remove('size-sm', 'size-md', 'size-lg');
    list.classList.add('size-' + btn.dataset.size);
  });
});

// ---------- Screen routing ----------
function goToScreen(name) {
  currentScreen = name;
  screens.forEach(s => s.classList.toggle('active', s.id === `screen-${name}`));

  document.querySelectorAll('.nav-btn, .nav-btn-center button').forEach(b => {
    b.classList.toggle('active', b.dataset.screen === name || (name === 'read' && b.dataset.screen === 'booknav'));
  });

  if (name === 'booknav') {
    navStep = 'books';
    navBrowsingBook = null;
    renderBookNav();
  }
  if (name === 'deepdive') {
    renderDeepDive();
  }
  if (name === 'timeline') {
    renderTimeline();
  }
}

// ---------- Timeline screen ----------
const timelineListEl = document.getElementById('timelineList');

async function renderTimeline() {
  try {
    if (!timelineData) {
      timelineData = await fetchJSON('data/timeline.json');
    }
    timelineListEl.innerHTML = '';
    timelineData.spine.forEach(item => {
      const btn = document.createElement('button');
      btn.className = 'timeline-item';
      btn.innerHTML = `
        <span class="timeline-dot"></span>
        <span class="timeline-item-body">
          <p class="timeline-event">${item.event}</p>
          <span class="timeline-ref">${getShortName(item.book)}${item.chapter}</span>
        </span>
      `;
      btn.addEventListener('click', async () => {
        currentBook = item.book;
        currentChapterNum = item.chapter;
        await loadChapter();
        goToScreen('read');
      });
      timelineListEl.appendChild(btn);
    });
  } catch (err) {
    timelineListEl.innerHTML = `<p class="empty-note">Couldn't load the timeline (${err.message}). Check that data/timeline.json has been deployed.</p>`;
  }
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
    ? `<span class="ov-aname">${escHtml(ov.author)}</span><span class="ov-sn ov-sn3 sh-def">${escHtml(ov.genre || '')}</span>`
    : `<span class="ov-sn ov-sn5">${escHtml(clipTo(ctx.author, 90))}</span>`;

  sheetGrid.innerHTML =
    tile('TRANSLATION', 'var(--gold)', 'translation', tr) +
    tile('SETTING', 'var(--verdigris)', 'context', setting, 'setting') +
    tile('TIMELINE', 'var(--blue)', 'context', timeline, 'timeline') +
    tile('AUTHOR', 'var(--verdigris)', 'author', author);

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
      (n ? `<div class="ln"><b>IN THIS CHAPTER</b>${n} time${n === 1 ? '' : 's'}</div>` : '');
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
function drawCommentary(box, entries, openFirst, showCredit) {
  const list = entries.slice(0, 4);
  const rawSum = e => SUM[e[4]] || null;
  const sumOf = e => { const x = rawSum(e); return x && x.s ? x : null; };
  const who = e => { const x = rawSum(e); return escHtml(x && x.by ? x.by : (cmShort[e[1]] || e[1])); };
  const isTitle = e => e[7] !== 'c' && (e[1] === 'John Piper' || e[1] === 'Charles Spurgeon' || e[7] === 't');
  box.innerHTML =
    `<div class="cm-grid">${list.map((e, i) => `<button class="cm-tile ${e[0]}" type="button" data-i="${i}">
        <span class="cm-who">${who(e)}</span>
        <span class="cm-work">${escHtml(e[2])}${e[5] ? ' · ' + escHtml(e[5]) : ''}</span>
        <span class="cm-prev${isTitle(e) ? ' t' : ''}">${escHtml(isTitle(e) && sumOf(e) ? sumOf(e).s : e[3])}</span>
      </button>`).join('')}</div>` +
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
  drawCommentary(box.querySelector('.cm-body'), ents, false);
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
// Overview: one small line naming the modern voices that appear in this chapter's commentary.
async function fillOvVoices(panel) {
  const blk = panel.querySelector('.ov-blk[data-go="commentary"]');
  if (!blk) return;
  const key = currentBook + '/' + currentChapterNum;
  const data = await loadCommentary(currentBook, currentChapterNum);
  if (key !== currentBook + '/' + currentChapterNum || !data || !data._s) return;
  const names = data._s.map(n => cmShort[n] || n).slice(0, 5);
  if (!names.length) return;
  const s = document.createElement('span');
  s.className = 'ov-vline';
  s.innerHTML = '<b>Modern voices:</b> ' + names.map(escHtml).join(' · ');
  blk.appendChild(s);
}

// "Learn more" pills in the verse sheet: jump to the matching Overview block (or tab).
function renderLearnMore(ch, verseNum) {
  const pills = [
    ['Setting', 'var(--verdigris)', 'SETTING', 'gallery'],
    ['History', 'var(--blue)', 'HISTORY', 'context'],
    ['Customs', 'var(--burgundy)', 'CUSTOMS', 'context'],
    ['Original words', 'var(--gold)', null, 'translation'],
    ['Commentary', 'var(--burgundy)', '__cm', 'commentary'],
    ['Archaeology', 'var(--blue)', 'ARCHAEOLOGY', 'archaeology'],
    ['Author', 'var(--verdigris)', 'AUTHOR', 'author'],
    ['Timeline', 'var(--blue)', 'TIMELINE', 'context']
  ];
  sheetGrid.innerHTML = '<p class="learn-h">LEARN MORE ABOUT THIS CHAPTER</p><div class="learn-row">' +
    pills.map((p, i) => `<button class="learn-pill" data-i="${i}" style="color:${p[1]}">${p[0]}<i>›</i></button>`).join('') + '</div>';
  sheetGrid.querySelectorAll('.learn-pill').forEach(btn => btn.addEventListener('click', () => {
    const p = pills[Number(btn.dataset.i)];
    backdrop.classList.remove('open');
    sheet.classList.remove('open');
    goToScreen('deepdive');
    if (p[2] === '__cm') {
      cmTabVerse = verseNum;
      setTab(tabOrder.indexOf('commentary'));
      renderCmTab();
      return;
    }
    if (!p[2]) {
      wbwTabVerse = verseNum;
      setTab(tabOrder.indexOf('translation'));
      renderWbwTab();
      return;
    }
    if (tabOrder[0] === 'overview') {
      setTab(0);
      setTimeout(() => {
        const blk = Array.from(document.querySelectorAll('[data-panel="overview"] .ov-blk')).find(b => {
          const hd = b.querySelector('.ov-h');
          return hd && hd.textContent.replace(/[›\s]+$/, '').trim() === p[2];
        });
        if (blk) {
          try { blk.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (e) {}
          blk.classList.remove('ov-flash'); void blk.offsetWidth; blk.classList.add('ov-flash');
        }
      }, 120);
    } else {
      setTab(tabOrder.indexOf(p[3]));
    }
  }));
}

function openSummary(verseNum) {
  const ch = currentChapterData;
  document.querySelectorAll('.verse').forEach(v =>
    v.classList.toggle('active', Number(v.dataset.verse) === verseNum)
  );

  const verseEntry = ch.verses.find(v => v.num === verseNum);
  sheetRef.textContent = `${ch.book.toUpperCase()} ${ch.chapter}:${verseNum}`;
  sheetVerseText.textContent = `"${verseEntry.text}"`;
  wbwTabVerse = verseNum;
  cmTabVerse = verseNum;
  renderLearnMore(ch, verseNum);
  renderWordStrip(verseNum);
  renderSheetCommentary(verseNum);
  if (document.getElementById('wbwVers') && document.getElementById('wbwVers').children.length) renderWbwTab();

  backdrop.classList.add('open');
  sheet.classList.add('open');
}

backdrop.addEventListener('click', () => {
  backdrop.classList.remove('open');
  sheet.classList.remove('open');
});

diveBtn.addEventListener('click', () => {
  backdrop.classList.remove('open');
  sheet.classList.remove('open');
  goToScreen('deepdive');
  if (tabOrder[0] === 'overview') setTab(0);
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

  document.getElementById('sparkNotesText').textContent = ctx.sparkNotes || '';

  carouselIndex = 0;
  renderCarousel();

  renderAccordion(ctx);
  document.getElementById('authorPanel').innerHTML = `
    <p class="panel-eyebrow">AUTHOR &amp; ORIGINAL WRITING</p>
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
      ${(() => { const w = worldFor(Object.assign({ _wk: currentBook + '/' + currentChapterNum + '|' + String(entry.english).toLowerCase() }, entry)); return w ? `<p class="kw-world"><b>IN THEIR WORLD</b>${escHtml(w)}</p>` : ''; })()}
      <div class="exp-extra">${usageBlock}</div>
      <span class="exp-more"><span class="exp-lbl">Read more</span><svg width="10" height="6" viewBox="0 0 10 6"><path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.6"/></svg></span>
    `;
    tList.appendChild(div);
  });
  tList.querySelectorAll('.word-usage-toggle').forEach(btn => {
    btn.addEventListener('click', () => toggleWordUsage(btn, ctx.translation[parseInt(btn.dataset.idx)]));
  });

  wireExpand(tList);
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
    c.classList.add('can');
    c.addEventListener('click', e => {
      if (e.target.closest('a, .word-usage-toggle, .word-usage-panel')) return;
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

function fillTemplateTabs(ctx) {
  const ov = ctx.overview || {};
  const arch = document.querySelector('[data-panel="archaeology"]');
  if (arch) {
    const img = ov.archaeologyImage;
    const items = Array.isArray(ov.archaeology) ? ov.archaeology : [];
    arch.innerHTML = '<p class="panel-eyebrow">ARCHAEOLOGY</p>' +
      (img && img.url ? `<div class="arch-photo"><img src="${displayImageUrl(img.url)}" alt="${escHtml(img.name || '')}" loading="lazy" decoding="async" onerror="this.parentNode.remove()"><span>${escHtml(img.name || '')}</span></div>` : '') +
      (items.length ? items.map(x => `<div class="au-row"><p class="ctx-subhead">${escHtml(x.h)}</p><p class="panel-text">${escHtml(x.t)}</p></div>`).join('') + '<p class="panel-text dim">Fuller write-ups coming soon.</p>'
        : '<div class="tpl-card"><p class="panel-text dim" style="margin:0;">Sites, digs and artifacts tied to this chapter. Coming soon.</p></div>');
  }
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
    const prev = n > 1 ? `<span class="tl-seg tl-side"><em>BEFORE · ${escHtml(nm)} ${n - 1}</em><span>${escHtml(ttl(n - 1))}</span></span>` : `<span class="tl-seg tl-side tl-edge"><em>BEFORE</em><span>The start of ${escHtml(bk ? bk.name : '')}’s Gospel</span></span>`;
    const next = n < total ? `<span class="tl-seg tl-side"><em>AFTER · ${escHtml(nm)} ${n + 1}</em><span>${escHtml(ttl(n + 1))}</span></span>` : `<span class="tl-seg tl-side tl-edge"><em>AFTER</em><span>The end of ${escHtml(bk ? bk.name : '')}’s Gospel</span></span>`;
    return prev + `<span class="tl-seg tl-mid"><em>NOW · ${escHtml(nm)} ${n}</em><span>${escHtml(currentChapterData.title)}</span></span>` + next;
  };
  const block = (cls, label, color, go, inner, section) =>
    `<button class="ov-blk ${cls}" data-go="${go}" ${section ? `data-section="${section}"` : ''}>
       <span class="ov-h" style="color:${color}">${label}<i>›</i></span>${inner}
     </button>`;

  panel.innerHTML = `
    <h2 class="ov-title">${escHtml(currentChapterData.title)}</h2>
    <div class="ov-grid">
      ${block('ov-full ov-sum', 'SUMMARY', 'var(--verdigris)', 'context', `<span class="ov-sumtext">${escHtml(ov.summary || ctx.sparkNotes)}</span>`, 'setting')}
      ${ctx.currentImage && ctx.currentImage.url
        ? `<button class="ov-blk ov-setblk" data-go="gallery" data-section="setting"><span class="ov-setphoto"><img src="${displayImageUrl(ctx.currentImage.url)}" alt="" loading="lazy" decoding="async" onerror="this.remove()"><span class="ov-artlabel" style="color:#fff">SETTING<i>›</i></span><span class="ov-placename">${escHtml(place)}</span></span><span class="ov-setdesc">${escHtml(ov.settingLine || '')}</span></button>`
        : block('', 'SETTING', 'var(--verdigris)', 'gallery', `<span class="ov-sn ov-sn3">${escHtml(place)}. ${escHtml(ov.settingLine || '')}</span>`, 'setting')}
      ${block('', 'HISTORY', 'var(--blue)', 'context', seg(ov.history, 'var(--verdigris)'), 'setting')}
      ${block('', 'CUSTOMS', 'var(--burgundy)', 'context', seg(ov.customs, 'var(--blue)'), 'setting')}
      ${block('', 'TRANSLATIONS', 'var(--gold)', 'translation', words)}
      ${img ? `<button class="ov-blk ov-full ov-artblk" data-go="gallery"><img src="${displayImageUrl(img.url)}" alt="${escHtml(img.caption)}" loading="lazy" decoding="async"><span class="ov-artlabel">ART<i>›</i></span><span class="ov-artcap">${escHtml(img.caption)}</span></button>` : block('ov-full', 'ART', 'var(--gold)', 'gallery', '<span class="ov-sn">Artwork coming soon.</span>')}
      ${block('', 'REFERENCES', 'var(--gold)', 'xref', refs)}
      ${block('', 'COMMENTARY', 'var(--burgundy)', 'commentary', voices)}
      ${ov.archaeologyImage && ov.archaeologyImage.url
        ? `<button class="ov-blk ov-setblk" data-go="archaeology"><span class="ov-setphoto"><img src="${displayImageUrl(ov.archaeologyImage.url)}" alt="" loading="lazy" decoding="async" onerror="this.remove()"><span class="ov-artlabel" style="color:#fff">ARCHAEOLOGY<i>›</i></span><span class="ov-placename">${escHtml(ov.archaeologyImage.name || '')}</span></span><span class="ov-setdesc">${escHtml(ov.archaeologyImage.desc || '')}</span></button>`
        : block('', 'ARCHAEOLOGY', 'var(--blue)', 'archaeology', ov.archaeology ? seg(ov.archaeology, 'var(--gold)') : '<span class="ov-sn ov-sn3">Sites, digs and artifacts tied to this chapter. Coming soon.</span>')}
      ${block('ov-top', 'AUTHOR', 'var(--verdigris)', 'author', `<span class="ov-aname">${escHtml(ov.author || clip(ctx.author, 70))}</span><span class="ov-kv"><span><em>GENRE</em>${escHtml(ov.genre || String(ctx.genre).split(/[,—.]/)[0])}</span><span><em>AUDIENCE</em>${escHtml(ov.audience || clip(ctx.audience, 60))}</span>${GOSPEL_FACTS[currentBook] ? `<span><em>WRITTEN</em>${escHtml(GOSPEL_FACTS[currentBook].written)}</span><span><em>FOCUS</em>${escHtml(GOSPEL_FACTS[currentBook].focus)}</span>` : ''}</span>`, 'writing')}
      ${block('ov-full ov-tlblk', 'TIMELINE', 'var(--blue)', 'context', `<span class="ov-tl3" id="ovTl3">${tl3Html()}</span><span class="ov-tlcap">IN THIS CHAPTER</span><span class="ov-rail">${tl}</span>`, 'timeline')}
      <button class="ov-blk ov-soon" data-go="discussion"><span class="ov-h" style="color:var(--verdigris)">DISCUSSION<i>›</i></span><span class="ov-sn ov-sn5">${escHtml(ov.discussionShort || ov.discussion || 'Theology and discussion questions. Coming soon.')}</span></button>
      <div class="ov-blk ov-soon"><span class="ov-h" style="color:var(--burgundy)">PEOPLE &amp; PLACES<i></i></span><ul class="ov-bul">${(ov.peoplePlaces || (ov.people || []).concat(ov.places || []).map(n => ({ n, d: '' }))).map(x => `<li><b>${escHtml(x.n)}</b>${x.d ? ' · ' + escHtml(x.d) : ''}</li>`).join('')}</ul></div>
      <button class="ov-blk ov-soon" data-go="notes"><span class="ov-h" style="color:var(--gold)">NOTES<i>›</i></span><span class="ov-sn ov-sn5">Write your own ideas and questions for this chapter.</span></button>
      <div class="ov-blk ov-soon"><span class="ov-h" style="color:var(--blue)">BOOK OVERVIEW<i></i></span><span class="ov-sn ov-sn5">${escHtml(ov.book || '')}</span></div>
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
  [300, 900, 2000].forEach(t => setTimeout(fitWords, t));
  initOvMap(ctx);
  fillOvVoices(panel);
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
function initOvMap(ctx) {
  if (ovMap) { try { ovMap.remove(); } catch (e) {} ovMap = null; }
  const el = document.getElementById('ovMapLive');
  if (!el || typeof maplibregl === 'undefined' || !ctx.mapCoords) return;
  try {
    ovMap = new maplibregl.Map({
      container: el,
      style: 'https://tiles.openfreemap.org/styles/liberty',
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
        const lngs = near.map(p => p.lng), lats = near.map(p => p.lat);
        ovMap.fitBounds([[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]], { padding: { left: 60, right: 60, top: 35, bottom: 25 }, maxZoom: 10.5, duration: 0 });
      }
    }
    ovMap.on('load', () => {
      if (ctx.biblePlaces) { bibleOnlyStyle(ovMap); return; }
      const dot = document.createElement('div');
      dot.style.cssText = 'width:12px;height:12px;border-radius:50%;background:#C9A227;border:2.5px solid #3A2E1F;';
      new maplibregl.Marker({ element: dot }).setLngLat([ctx.mapCoords.lng, ctx.mapCoords.lat]).addTo(ovMap);
    });
  } catch (e) { /* map unavailable; block stays a plain card */ }
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
  if (name === 'overview' && ovMap) setTimeout(() => { try { ovMap.resize(); } catch (e) {} }, 60);
  if (name === 'gallery') {
    if (chapterUsesLiveMap()) ensureLiveMap(); else ensureRegionMap();
  }
}

folderTabs.forEach(btn => {
  btn.addEventListener('click', () => setTab(tabOrder.indexOf(btn.dataset.tab)));
});

let touchStartX = null;
folderContent.addEventListener('touchstart', e => { touchStartX = e.target.closest('.tabbar') ? null : e.touches[0].clientX; }, { passive: true });
folderContent.addEventListener('touchend', e => {
  if (touchStartX === null) return;
  const dx = e.changedTouches[0].clientX - touchStartX;
  if (Math.abs(dx) > 50) {
    setTab(activeTabIndex + (dx < 0 ? 1 : -1));
  }
  touchStartX = null;
});

// ---------- Init ----------
init();
