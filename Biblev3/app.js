// ---------- State ----------
let manifest = null;
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

const ddBookTitle = document.getElementById('ddBookTitle');
const ddChapterSwitcher = document.getElementById('ddChapterSwitcher');
const folderTabs = document.querySelectorAll('.folder-tab');
const folderPanels = document.querySelectorAll('.tab-panel');
const folderContent = document.getElementById('folderContent');

const tabOrder = ['context', 'setting', 'timeline', 'translation', 'xref'];
let activeTabIndex = 0;

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
  const book = manifest.books.find(b => b.slug === currentBook);
  ddBookTitle.textContent = book.name;

  ddChapterSwitcher.innerHTML = '';
  book.availableChapters.forEach(n => {
    const btn = document.createElement('button');
    btn.className = 'dd-chapter-pill' + (n === currentChapterNum ? ' active' : '');
    btn.textContent = n;
    btn.addEventListener('click', async () => {
      currentChapterNum = n;
      await loadChapter();
      renderDeepDive();
    });
    ddChapterSwitcher.appendChild(btn);
  });

  renderFolderContent();
}

function renderFolderContent() {
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

// ---------- Folder tabs ----------
function setTab(index) {
  activeTabIndex = (index + tabOrder.length) % tabOrder.length;
  const name = tabOrder[activeTabIndex];
  folderTabs.forEach(b => b.classList.toggle('active', b.dataset.tab === name));
  folderPanels.forEach(p => p.classList.toggle('active', p.dataset.panel === name));
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
