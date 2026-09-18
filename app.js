// ---------- State ----------
let manifest = null;
let timelineData = null;
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
const sheetAuthor = document.getElementById('sheetAuthor');
const sheetTranslation = document.getElementById('sheetTranslation');
const sheetSetting = document.getElementById('sheetSetting');
const sheetTimeline = document.getElementById('sheetTimeline');

const navBackBtn = document.getElementById('navBackBtn');
const navHeaderTitle = document.getElementById('navHeaderTitle');
const navBookList = document.getElementById('navBookList');
const navChapterGrid = document.getElementById('navChapterGrid');

const folderTabs = document.querySelectorAll('.folder-tab');
const folderPanels = document.querySelectorAll('.tab-panel');
const folderContent = document.getElementById('folderContent');

const tabOrder = ['context', 'translation', 'xref', 'commentary', 'gallery'];
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

let liveMapMarker = null;

function updateLiveMap(coords, placeName) {
  ensureLiveMap();
  if (!liveMap || !coords) return;
  const setPos = () => {
    liveMap.jumpTo({ center: [coords.lng, coords.lat], zoom: coords.zoom || 12 });
    if (liveMapMarker) liveMapMarker.setLngLat([coords.lng, coords.lat]);
  };
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

function renderImageSlide(slideId, imageData, placeholderText) {
  const slide = document.getElementById(slideId);
  if (imageData && imageData.url) {
    slide.innerHTML = `<img src="${imageData.url}" alt="${imageData.caption || ''}" loading="lazy">`;
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
  accordionOpen = { setting: true, timeline: true, writing: true };

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

  sections.push({
    id: 'writing',
    label: 'Original Writing',
    icon: 'author',
    body: `<p class="ctx-subhead">AUTHOR</p>
           <p class="panel-text">${ctx.author}</p>
           <p class="ctx-subhead ctx-subhead-spaced">GENRE</p>
           <p class="panel-text">${ctx.genre}</p>
           <p class="ctx-subhead ctx-subhead-spaced">AUDIENCE</p>
           <p class="panel-text">${ctx.audience}</p>`
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

  await loadChapter();
  goToScreen('read');

  navButtons.forEach(btn => {
    btn.addEventListener('click', () => goToScreen(btn.dataset.screen));
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

function syncQuickNav() {
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
    b.classList.toggle('active', b.dataset.screen === name);
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

// ---------- Load + render a chapter (Read screen) ----------
async function loadChapter() {
  bookLabel.textContent = 'Loading…';
  verseListEl.innerHTML = '';

  try {
    currentChapterData = await fetchJSON(`data/${currentBook}/${currentChapterNum}.json`);
  } catch (err) {
    bookLabel.textContent = '';
    chapterTitle.textContent = '';
    verseListEl.innerHTML = `<p class="empty-note">This chapter hasn't been drafted yet.</p>`;
    syncQuickNav();
    return;
  }

  renderChapter();
  syncQuickNav();
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

function openSummary(verseNum) {
  const ch = currentChapterData;
  document.querySelectorAll('.verse').forEach(v =>
    v.classList.toggle('active', Number(v.dataset.verse) === verseNum)
  );

  const verseEntry = ch.verses.find(v => v.num === verseNum);
  sheetRef.textContent = `${ch.book.toUpperCase()} ${ch.chapter}:${verseNum}`;
  sheetVerseText.textContent = `"${verseEntry.text}"`;
  sheetAuthor.textContent = ch.context.author;
  sheetSetting.textContent = ch.context.mapLabel + ' — ' + ch.context.setting.split('.')[0] + '.';

  const t = findTranslationEntry(verseNum);
  if (t) {
    sheetTranslation.innerHTML = `"${t.english}" — <span class="greek">${t.greek.split(' ')[0]}</span> — ${t.meaning}`;
  } else {
    sheetTranslation.innerHTML = `See the Translation tab for this chapter's keywords — no single term is spotlighted for this specific verse.`;
  }
  sheetTimeline.textContent = ch.context.timelineImmediate.split(' — ')[0] || ch.context.timelineImmediate;

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

  document.getElementById('translationHeading').textContent =
    `Key words across ${currentChapterData.book} ${currentChapterData.chapter}`;
  const tList = document.getElementById('translationList');
  tList.innerHTML = '';
  ctx.translation.forEach((entry, idx) => {
    const div = document.createElement('div');
    div.className = 'word-card';
    const hasOcc = entry.occurrences && entry.occurrences.total;
    const usageBlock = hasOcc ? `
      <button class="word-usage-toggle" data-idx="${idx}">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 18l6-6-6-6"/></svg>
        Used ${entry.occurrences.total}\u00d7 in the New Testament
      </button>
      <div class="word-usage-panel" id="wordUsage${idx}"></div>
    ` : '';
    div.innerHTML = `
      <div class="word-title-row">
        <span class="word-english">${entry.english}</span>
        <span class="word-verseref">${entry.verseRef}</span>
      </div>
      <span class="word-greek">${entry.greek}</span>
      <p class="word-meaning">${entry.meaning}</p>
      ${usageBlock}
    `;
    tList.appendChild(div);
  });
  tList.querySelectorAll('.word-usage-toggle').forEach(btn => {
    btn.addEventListener('click', () => toggleWordUsage(btn, ctx.translation[parseInt(btn.dataset.idx)]));
  });

  const cList = document.getElementById('commentaryList');
  if (ctx.commentary && ctx.commentary.length) {
    cList.innerHTML = ctx.commentary.map(entry => `
      <div class="commentary-card">
        <p class="commentary-source">${entry.source}</p>
        <p class="commentary-year">${entry.year}</p>
        <p class="commentary-note">${entry.note}</p>
        <a class="commentary-link" href="${entry.url}" target="_blank" rel="noopener">
          Read the full commentary
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 17L17 7M17 7H7M17 7V17"/></svg>
        </a>
      </div>
    `).join('');
  } else {
    cList.innerHTML = `<p class="panel-text dim">No commentary added for this chapter yet.</p>`;
  }

  const gList = document.getElementById('gospelParallelsList');
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

// ---------- Folder tabs ----------
function setTab(index) {
  activeTabIndex = (index + tabOrder.length) % tabOrder.length;
  const name = tabOrder[activeTabIndex];
  folderTabs.forEach(b => b.classList.toggle('active', b.dataset.tab === name));
  folderPanels.forEach(p => p.classList.toggle('active', p.dataset.panel === name));
  if (name === 'gallery') {
    if (chapterUsesLiveMap()) ensureLiveMap(); else ensureRegionMap();
  }
}

folderTabs.forEach(btn => {
  btn.addEventListener('click', () => setTab(tabOrder.indexOf(btn.dataset.tab)));
});

let touchStartX = null;
folderContent.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; }, { passive: true });
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
