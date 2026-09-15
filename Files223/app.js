// ---------- State ----------
let manifest = null;
let currentBook = null;
let currentChapterNum = null;
let currentChapterData = null;

// ---------- DOM refs ----------
const bookSelect = document.getElementById('bookSelect');
const chapterSwitcher = document.getElementById('chapterSwitcher');
const reader = document.getElementById('reader');
const bookLabel = document.getElementById('bookLabel');
const chapterTitle = document.getElementById('chapterTitle');
const verseListEl = document.getElementById('verseList');
const backdrop = document.getElementById('backdrop');
const sheet = document.getElementById('sheet');
const detail = document.getElementById('detail');
const diveBtn = document.getElementById('diveBtn');
const backBtn = document.getElementById('backBtn');
const tabBtns = document.querySelectorAll('.tab-btn');
const panels = document.querySelectorAll('.tab-panel');
const detailBody = document.getElementById('detailBody');
const detailHeaderTitle = document.getElementById('detailHeaderTitle');

const sheetRef = document.getElementById('sheetRef');
const sheetVerseText = document.getElementById('sheetVerseText');
const sheetAuthor = document.getElementById('sheetAuthor');
const sheetTranslation = document.getElementById('sheetTranslation');
const sheetSetting = document.getElementById('sheetSetting');
const sheetTimeline = document.getElementById('sheetTimeline');

const tabOrder = ['context', 'setting', 'timeline', 'translation', 'xref'];
let activeTabIndex = 0;

// ---------- Boot ----------
async function init() {
  manifest = await fetchJSON('data/manifest.json');
  currentBook = manifest.books[0].slug;

  bookSelect.innerHTML = '';
  manifest.books.forEach(b => {
    const opt = document.createElement('option');
    opt.value = b.slug;
    opt.textContent = b.name;
    bookSelect.appendChild(opt);
  });
  bookSelect.addEventListener('change', () => {
    currentBook = bookSelect.value;
    const book = manifest.books.find(b => b.slug === currentBook);
    currentChapterNum = book.availableChapters[0];
    loadChapter();
  });

  const book = manifest.books.find(b => b.slug === currentBook);
  currentChapterNum = book.availableChapters[0];
  loadChapter();
}

async function fetchJSON(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
  return res.json();
}

// ---------- Chapter switcher ----------
function renderSwitcher() {
  const book = manifest.books.find(b => b.slug === currentBook);
  chapterSwitcher.innerHTML = '';
  book.availableChapters.forEach(n => {
    const btn = document.createElement('button');
    btn.className = 'chapter-pill' + (n === currentChapterNum ? ' active' : '');
    btn.textContent = n;
    btn.addEventListener('click', () => {
      currentChapterNum = n;
      loadChapter();
    });
    chapterSwitcher.appendChild(btn);
  });
}

// ---------- Load + render a chapter ----------
async function loadChapter() {
  renderSwitcher();
  bookLabel.textContent = 'Loading…';
  verseListEl.innerHTML = '';

  try {
    currentChapterData = await fetchJSON(`data/${currentBook}/${currentChapterNum}.json`);
  } catch (err) {
    bookLabel.textContent = '';
    chapterTitle.textContent = '';
    verseListEl.innerHTML = `<p class="empty-note">This chapter hasn't been drafted yet.</p>`;
    return;
  }

  renderChapter();
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

  renderDetailContent();
  detailHeaderTitle.textContent = `${ch.book} ${ch.chapter}`;
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
  detail.classList.add('open');
});

backBtn.addEventListener('click', () => {
  detail.classList.remove('open');
});

// ---------- Detail (Chapter Deep Dive) ----------
function renderDetailContent() {
  const ctx = currentChapterData.context;

  document.getElementById('ctxHeading').textContent = currentChapterData.title;
  document.getElementById('ctxAuthorText').textContent = ctx.author + '. ' + ctx.setting;
  document.getElementById('ctxGenre').textContent = ctx.genre;
  document.getElementById('ctxAudience').textContent = ctx.audience;

  document.getElementById('settingHeading').textContent = ctx.mapLabel.split('—')[0].trim();
  document.getElementById('settingMapLabel').textContent = ctx.mapLabel;
  document.getElementById('settingText').textContent = ctx.setting;
  document.getElementById('settingCustom').textContent = ctx.custom;

  document.getElementById('timelineImmediate').textContent = ctx.timelineImmediate;
  document.getElementById('timelineBible').textContent = ctx.timelineBible;

  document.getElementById('translationHeading').textContent =
    `Key words across ${currentChapterData.book} ${currentChapterData.chapter}`;
  const tList = document.getElementById('translationList');
  tList.innerHTML = '';
  ctx.translation.forEach(entry => {
    const div = document.createElement('div');
    div.className = 'word-card';
    div.innerHTML = `
      <div class="word-head">
        <span class="word-english">"${entry.english}"</span>
        <span class="word-greek">${entry.greek}</span>
        <span class="word-verseref">${entry.verseRef}</span>
      </div>
      <p class="word-meaning">${entry.meaning}</p>
    `;
    tList.appendChild(div);
  });

  const gList = document.getElementById('gospelParallelsList');
  gList.innerHTML = '';
  ctx.gospelParallels.forEach(entry => {
    const div = document.createElement('div');
    div.className = 'xref-card';
    div.innerHTML = `<span class="xref-ref">${entry.ref}</span><span class="xref-note">${entry.note}</span>`;
    gList.appendChild(div);
  });

  const oList = document.getElementById('otBackgroundList');
  oList.innerHTML = '';
  ctx.otBackground.forEach(entry => {
    const div = document.createElement('div');
    div.className = 'xref-card';
    div.innerHTML = `<span class="xref-ref">${entry.ref}</span><span class="xref-note">${entry.note}</span>`;
    oList.appendChild(div);
  });
}

// ---------- Tabs ----------
function setTab(index) {
  activeTabIndex = (index + tabOrder.length) % tabOrder.length;
  const name = tabOrder[activeTabIndex];
  tabBtns.forEach(b => b.classList.toggle('active', b.dataset.tab === name));
  panels.forEach(p => p.classList.toggle('active', p.dataset.panel === name));
}

tabBtns.forEach(btn => {
  btn.addEventListener('click', () => setTab(tabOrder.indexOf(btn.dataset.tab)));
});

let touchStartX = null;
detailBody.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; }, { passive: true });
detailBody.addEventListener('touchend', e => {
  if (touchStartX === null) return;
  const dx = e.changedTouches[0].clientX - touchStartX;
  if (Math.abs(dx) > 50) {
    setTab(activeTabIndex + (dx < 0 ? 1 : -1));
  }
  touchStartX = null;
});

// ---------- Init ----------
init();
