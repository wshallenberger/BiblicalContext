/* Study > Commentary: learn from pastors, authors, teachers and early church writers.
 *   home    blocks, one per voice, grouped (Pastors and preachers, Authors and scholars, Teachers, Early church)
 *   voice   a short bio, then everything we have from that voice, Gospel by Gospel and chapter by chapter
 *   search  under the heading: Book, Chapter and (optionally) Verse; the matching commentary from every voice loads right underneath, on the same page
 * Data: data/mix/<book>.json (chapter -> verse -> entries), summaries in SUM (app.js).
 *   Cm.render()  Cm.home()  Cm.open(book, chapter)  Cm.voices()  Cm.openVoice(key)
 */
(function () {
  'use strict';
  var st = { view: 'home', k: '', gb: '', b: '', c: 0, v: 0, f: 'all', more: {} };
  var $ = function (id) { return document.getElementById(id); };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function bookName(slug) { try { var b = manifest.books.filter(function (x) { return x.slug === slug; })[0]; if (b) return b.name; } catch (e) {} return slug.charAt(0).toUpperCase() + slug.slice(1); }
  function chapters(slug) { try { var b = manifest.books.filter(function (x) { return x.slug === slug; })[0]; return (b.availableChapters && b.availableChapters.length) ? b.availableChapters : Array.apply(null, Array(b.totalChapters)).map(function (_, i) { return i + 1; }); } catch (e) { return [1]; } }

  // The voices, in the order they show on the page. g = group.
  var GROUPS = [['p', 'Pastors and preachers', 'Sermons and teaching, preached to a congregation.'], ['a', 'Authors and scholars', 'Books and commentaries written for readers.'],
    ['t', 'Teachers', 'Teachers who open up the world of the Bible: its culture, geography and history.'], ['e', 'Early church writers', 'The first centuries of Christian reading.']];
  var VOICES = [
    { k: 'piper', g: 'p', n: 'John Piper', r: 'Pastor and author', m: 'JP', pv: 'Pastor for 33 years at Bethlehem Baptist in Minneapolis and founder of Desiring God. Teaches that God is most glorified when we are most satisfied in him.', bio: 'Pastor of Bethlehem Baptist Church in Minneapolis for 33 years, founder of Desiring God and chancellor of Bethlehem College and Seminary. He teaches that God is most glorified in us when we are most satisfied in him. Here: sermons, articles and devotionals from Desiring God, plus pointers to his books.' },
    { k: 'keller', g: 'p', n: 'Tim Keller', r: 'Pastor and author (1950–2023)', m: 'TK', pv: 'Founding pastor of Redeemer Presbyterian in New York City and author of The Reason for God. Known for meeting modern doubts with the gospel.', bio: 'Founding pastor of Redeemer Presbyterian Church in New York City and author of The Reason for God. He was known for showing how the gospel meets modern doubts and connects to every part of life. Here: sermons from Gospel in Life, shown as short summaries with a link.' },
    { k: 'spurgeon', g: 'p', n: 'Charles Spurgeon', r: 'Baptist preacher (1834–1892)', m: 'CS', pv: 'The “Prince of Preachers” of Victorian London, who filled the Metropolitan Tabernacle for decades. Warm, vivid and centered on Christ.', bio: 'Called the Prince of Preachers, Spurgeon filled the Metropolitan Tabernacle in London for decades, and his sermons were printed every week. Vivid, warm and centered on Christ. Here: his sermons on Gospel passages, plus short summaries of his commentary.' },
    { k: 'guzik', g: 'p', n: 'David Guzik', r: 'Pastor and Bible teacher', m: 'DG', pv: 'Pastor behind the free Enduring Word commentary, which walks verse by verse through every book in plain language.', bio: 'A pastor whose free Enduring Word commentary walks through every book of the Bible verse by verse in plain language. Here: our own short summaries of his notes, with a link to the full text.' },
    { k: 'joby', g: 'p', n: 'Joby Martin', r: 'Pastor, Eleven22 Church', m: 'JM', pv: 'Pastor of Eleven22 Church in Jacksonville, Florida, known for conversational, story-driven preaching.', bio: 'Pastor of Eleven22 Church in Jacksonville, Florida, known for conversational, story-driven preaching. Here: sermons from the church, some by guest preachers, with a link to watch.' },
    { k: 'macarthur', g: 'p', n: 'John MacArthur', r: 'Pastor-teacher, Grace to You', m: 'JM', pv: 'Longtime pastor-teacher of Grace Community Church in California and the voice of Grace to You, known for verse-by-verse preaching.', bio: 'Longtime pastor-teacher of Grace Community Church in Sun Valley, California, and the voice of Grace to You. Known for preaching verse by verse through the whole New Testament. Here: sermons and series on passages in the Gospels, Acts and the letters, with a link.' },
    { k: 'begg', g: 'p', n: 'Alistair Begg', r: 'Pastor, Parkside Church, and Truth for Life', m: 'AB', pv: 'Scottish-born pastor of Parkside Church in Ohio and the voice of Truth for Life, known for clear, verse-by-verse Bible teaching.', bio: 'Scottish-born pastor of Parkside Church in Cleveland, Ohio, and the teacher on the Truth for Life radio program. Known for clear, steady preaching through whole books of the Bible. Here: sermons matched to Gospel passages, with a link to each one.' },
    { k: 'mitchell', g: 'p', n: 'Philip Anthony Mitchell', r: 'Pastor, 2819 Church', m: 'PM', pv: 'Pastor of 2819 Church. Sermons on Gospel passages, found through the church’s YouTube channel.', bio: 'Pastor of 2819 Church. Here: sermons on Gospel passages. The link searches the church’s YouTube channel for the message.' },
    { k: 'lakepointe', g: 'p', n: 'Josh Howerton', r: 'Pastor, Lakepointe Church', m: 'JH', pv: 'Pastor of Lakepointe Church in the Dallas area of Texas. Sermons on Gospel and Acts passages, found through the church’s YouTube channel.', bio: 'Pastor of Lakepointe Church in the Dallas area of Texas. Here: sermons on Gospel and Acts passages. The link searches the church’s YouTube channel.' },
    { k: 'lewis', g: 'a', n: 'C.S. Lewis', r: 'Author and scholar (1898–1963)', m: 'CL', pv: 'Oxford and Cambridge literature scholar who wrote Mere Christianity and the Chronicles of Narnia. Notes on where his books touch the Gospels.', bio: 'Literature scholar at Oxford and Cambridge and author of Mere Christianity and The Chronicles of Narnia. Here: short notes, in our own words, on where his books touch a Gospel passage.' },
    { k: 'henry', g: 'a', n: 'Matthew Henry', r: 'Minister and commentator (1662–1714)', m: 'MH', pv: 'English Presbyterian minister whose Exposition became one of the most-read commentaries in history. Public-domain excerpts.', bio: 'An English Presbyterian minister whose Exposition of the Old and New Testaments became one of the most widely read commentaries in history. Here: excerpts from the public-domain Concise Commentary, with a link to the full text.' },
    { k: 'stott', g: 'a', n: 'John Stott', r: 'Pastor and author (1921–2011)', m: 'JS', pv: 'Longtime rector of All Souls Church in London and author of Basic Christianity and The Cross of Christ. Known for careful, readable Bible exposition.', bio: 'Longtime rector of All Souls Church, Langham Place, in London, and author of Basic Christianity, The Cross of Christ and The Message of the Sermon on the Mount. Known for careful, readable exposition. Here: short pointers, in our own words, to the chapters or sections of his books that cover Gospel passages and parts of Romans, Galatians and Ephesians, with a link to each book.' },
    { k: 'ryle', g: 'a', n: 'J.C. Ryle', r: 'Bishop of Liverpool (1816–1900)', m: 'JR', pv: 'First Anglican bishop of Liverpool. His Expository Thoughts on the Gospels is known for its direct, plain style.', bio: 'The first Anglican bishop of Liverpool. His Expository Thoughts on the Gospels is known for its direct, plain style. Here: short summaries of his sections on all four Gospels, with a link to the full text.' },
    { k: 'barclay', g: 'a', n: 'William Barclay', r: 'Scottish minister and professor (1907–1978)', m: 'WB', pv: 'Glasgow professor whose Daily Study Bible opened up Greek words and first-century customs for ordinary readers.', bio: 'Professor at the University of Glasgow whose Daily Study Bible made the background of Greek words and first-century customs available to ordinary readers. Here: short summaries of his sections, with a link to read him.' },
    { k: 'peterson', g: 'a', n: 'Jordan Peterson', r: 'Psychologist and author', m: 'JP', pv: 'Canadian psychologist and author who lectures on the stories of the Bible. A pointer to his paid course at Peterson Academy.', bio: 'Canadian psychologist and author who lectures on the stories of the Bible. Here: a pointer to his Sermon on the Mount course at Peterson Academy, which is a paid course with a preview.' },
    { k: 'mackie', g: 't', n: 'Tim Mackie', r: 'BibleProject', m: 'TM', pv: 'Hebrew Bible scholar and co-founder of BibleProject, whose videos and podcast trace themes across the whole Bible.', bio: 'Hebrew Bible scholar and co-founder of BibleProject, whose videos and podcast trace themes across the whole Bible. Here: pointers to podcast episodes with verse ranges.' },
    { k: 'comer', g: 't', n: 'John Mark Comer', r: 'Pastor and author', m: 'JC', pv: 'Pastor and author of The Ruthless Elimination of Hurry, and founder of Practicing the Way. Teaching on the Sermon on the Mount and solitude.', bio: 'Pastor and author of The Ruthless Elimination of Hurry, and founder of Practicing the Way. Here: short summaries of his teaching on the Sermon on the Mount and on solitude.' },
    { k: 'bema', g: 't', n: 'Marty Solomon', r: 'BEMA Podcast', m: 'MS', pv: 'Teacher and host of the BEMA Podcast, who reads the Gospels and Paul’s letters in the Jewish world of the first century.', bio: 'Teacher and host of the BEMA Podcast, who reads the Gospels, Acts and Paul’s letters in the Jewish world of the first century. Here: episodes matched to passages, with a link to listen. BEMA gives no passage list, so the passage is our match from each episode’s title and description.' },
    { k: 'vanderlaan', g: 't', n: 'Ray Vander Laan', r: 'Teacher of Bible history', m: 'RV', pv: 'Teacher of biblical history and culture and founder of That the World May Know. Free articles on life in Jesus’ time.', bio: 'Teacher of the history and culture of the biblical world and founder of That the World May Know. Here: short summaries of his free articles on life in Jesus’ time and of his video lessons on Paul’s journeys.' },
    { k: 'kramer', g: 't', n: 'Joel Kramer', r: 'Expedition Bible', m: 'JK', pv: 'Teacher behind the Expedition Bible channel, exploring the archaeology and history around the Bible.', bio: 'The teacher behind the Expedition Bible YouTube channel, which looks at the archaeology and history around the Bible. Here: our own short notes on a find, with a link to his video or channel.' },
    { k: 'early', g: 'e', n: 'Early church writers', r: 'Church fathers, 2nd to 13th centuries', m: 'EC', pv: 'Augustine, Chrysostom, Origen, Jerome, Ambrose and Bede, gathered in Thomas Aquinas’s Catena Aurea in the 13th century.', bio: 'Church fathers and medieval writers such as Augustine, Chrysostom, Origen, Jerome, Ambrose and Bede, whose comments on the Gospels were gathered in the Catena Aurea (Thomas Aquinas, 13th century). For Acts and Romans the excerpts come from their own homilies and commentaries, such as Chrysostom’s Homilies on Acts and on Romans, Origen’s Commentary on Romans and Bede’s Commentary on Acts. Here: excerpts in public-domain translations, with a link to the full text.' }
  ];
  var VBY = {}; VOICES.forEach(function (v) { VBY[v.k] = v; });
  // a line about each early church writer, shown over their excerpts
  var WRITERS = { 'Cyril of Jerusalem': 'Bishop of Jerusalem, known for his lectures to new believers, died 386', 'Augustine of Hippo': 'Bishop in North Africa, 354–430', 'John Chrysostom': 'Archbishop of Constantinople, famed preacher, died 407', 'Jerome': 'Translator of the Latin Vulgate, died 420', 'Origen of Alexandria': 'Scholar and teacher in Alexandria and Caesarea, died about 253', 'Ambrose of Milan': 'Bishop of Milan, died 397', 'Hilary of Poitiers': 'Bishop in Gaul, died about 367', 'Tertullian': 'Latin writer in Carthage, about 155–220', 'Cyril of Alexandria': 'Patriarch of Alexandria, died 444', 'Gregory the Dialogist': 'Pope Gregory the Great, about 540–604', 'Oecumenius': 'Byzantine commentator on Acts, Revelation and the letters, 6th to 10th century', 'Gregory of Nazianzus': 'Archbishop of Constantinople and theologian, died about 390', 'Pseudo-Clement': 'Writings in the name of Clement of Rome, 3rd to 4th century', 'Ambrosiaster': 'Anonymous Latin commentator on Paul’s letters, 4th century', 'Cyprian': 'Bishop of Carthage, martyred in 258', 'Theophilus of Antioch': 'Bishop of Antioch, 2nd century', 'Hippolytus of Rome': 'Roman teacher and writer, died about 235', 'Ignatius of Antioch': 'Bishop of Antioch, martyred about 107', 'Clement of Alexandria': 'Teacher in Alexandria, died about 215', 'Methodius of Olympus': 'Bishop and writer, died about 311', 'Bede': 'English monk and historian, about 673–735', 'Irenaeus': 'Bishop of Lyon, about 130–202', 'Alcuin of York': 'Scholar at Charlemagne’s court, about 735–804', 'Rabanus Maurus': 'Archbishop of Mainz, about 780–856', 'Theophylact of Ohrid': 'Byzantine archbishop, 11th century', 'Basil of Caesarea': 'Bishop in Cappadocia, died 379', 'Remigius of Rheims': 'Bishop and teacher, 9th century', 'Pseudo-Chrysostom': 'An unknown author whose work was once credited to Chrysostom' };

  var libP = null, lib = null;       // lib.v[key] = { n: pieces, b: { book: { chapter: [ {e, v} ] } } }
  function hidden() { try { return cmHidden(); } catch (e) { return []; } }
  function loadLib() {
    return libP || (libP = Promise.all(Bk.slugs().map(function (b) { return fetch('data/mix/' + b + '.json').then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }); }).concat([sumP])).then(function (r) {
      var v = {};
      Bk.slugs().forEach(function (b, i) {
        var d = r[i]; if (!d) return;
        Object.keys(d).forEach(function (ch) {
          var seen = {};
          Object.keys(d[ch]).filter(function (k) { return /^\d+$/.test(k); }).sort(function (a, b2) { return a - b2; }).forEach(function (vk) {
            (d[ch][vk] || []).forEach(function (e) {
              if (!Array.isArray(e)) return;
              var key = cmVoiceKey(e[1], e[0]); if (!key) return;
              var id = e[1] + '|' + e[4] + '|' + e[2]; if (seen[id]) return; seen[id] = 1;
              var o = v[key] || (v[key] = { n: 0, u: {}, b: {} });
              if (!o.u[id]) { o.u[id] = 1; o.n++; }
              ((o.b[b] || (o.b[b] = {}))[ch] || (o.b[b][ch] = [])).push({ e: e, v: Number(vk) });
            });
          });
        });
      });
      lib = v; return v;
    }));
  }

  function range(e) { var m = String(e[2] || '').match(/(vv?\.[^·]+)$/); return (e[5] && /^vv?\./.test(e[5]) ? e[5] : (m ? m[1].trim() : '')); }
  function firstVerse(rg) { var m = /(\d+)/.exec(rg || ''); return m ? Number(m[1]) : 0; }
  function isTitleOnly(e) { return e[7] !== 'c' && (e[1] === 'John Piper' || e[1] === 'Charles Spurgeon' || e[7] === 't'); }
  var uid = 0;
  function itemHtml(it, b, c, who) {
    var e = it.e, sm = null; try { sm = SUM[e[4]] || null; } catch (x) {}
    var sum = sm && sm.s ? sm.s : '', rg = range(e), v = firstVerse(rg) || it.v;
    var work = String(e[2] || '').split(' · ').filter(function (p) { return p && !/^vv?\./.test(p.trim()); }).join(' · ');
    var title = '', text = '';
    if (e[0] === 'e') { text = e[3]; title = (who ? e[1] + ' · ' : '') + work; }
    else if (isTitleOnly(e) && !sum) { title = e[3]; try { text = (linkBlurb(e, sm) || '').replace(/\s*The link opens[^.]*\.?\s*$/, '').trim(); } catch (x) {} }
    else { text = sum || e[3]; title = isTitleOnly(e) ? e[3] : work; }
    var long = text.length > 230, id = 'cmt' + (++uid), label = 'Open ↗'; try { label = cmLinkLabel(e); } catch (x) {}
    return '<article class="cmx-it"><div class="cmx-top">' + (title ? '<span class="cmx-wk">' + esc(title) + '</span>' : '<span></span>') +
      '<button type="button" class="cmx-v" data-cm="verse" data-b="' + b + '" data-c="' + c + '" data-v="' + v + '">' + esc(rg || ('v.' + v)) + '</button></div>' +
      '<p class="cmx-tx' + (long ? ' clamp' : '') + '" id="' + id + '">' + esc(text) + '</p>' +
      '<div class="cmx-act">' + (long ? '<button type="button" class="cmx-more" data-cm="more" data-t="' + id + '">Read more</button>' : '<span></span>') +
      (e[4] ? '<a class="cmx-lk" href="' + esc(e[4]) + '" target="_blank" rel="noopener">' + esc(label) + '</a>' : '') + '</div></article>';
  }
  function plural(n) { return n + (n === 1 ? ' piece' : ' pieces'); }
  function setBack(on) { var b = $('cmBack'); if (b) b.hidden = !on; }

  // ---------- home: the search, then either the results or the voices ----------
  var vmaxCache = {};
  function verseMax(b, c) {
    var k = b + ':' + c;
    if (!vmaxCache[k]) vmaxCache[k] = Promise.resolve().then(function () { return VT.chapter('bsb', b, c); }).then(function (r) { var n = 0; if (r && r.map) Object.keys(r.map).forEach(function (x) { n = Math.max(n, +x); }); return n || 30; }).catch(function () { return 30; });
    return vmaxCache[k];
  }
  // one passage picker: tap it, pick a book, and the chapters open straight away (the verse stays its own drop-down)
  var pop = '', popB = '';
  function popHtml() {
    if (!pop) return '';
    if (pop === 'book') return '<div class="cmx-pop" id="cmPop"><p class="cmx-pop-h">Choose a book</p><div class="cmx-pop-books">' + Bk.slugs().map(function (b) { return '<button type="button" class="cmx-pb' + (b === st.b ? ' on' : '') + '" data-cm="pbook" data-b="' + b + '">' + esc(bookName(b)) + '</button>'; }).join('') + '</div></div>';
    return '<div class="cmx-pop" id="cmPop"><p class="cmx-pop-h"><button type="button" class="cmx-pback" data-cm="pback">&lsaquo; Books</button><b>' + esc(bookName(popB)) + '</b><span>Choose a chapter</span></p><div class="cmx-pop-grid">' +
      chapters(popB).map(function (c) { return '<button type="button" class="cmx-pc' + (popB === st.b && c === st.c ? ' on' : '') + '" data-cm="pchap" data-c="' + c + '">' + c + '</button>'; }).join('') + '</div></div>';
  }
  function pickerHtml() {
    var lab = st.b && st.c ? bookName(st.b) + ' ' + st.c : 'Book and chapter';
    return '<div class="cmx-pick cmx-search"><button type="button" class="quick-nav-select cmx-pass' + (pop ? ' open' : '') + '" id="cmPass" data-cm="pass" aria-haspopup="true" aria-expanded="' + (pop ? 'true' : 'false') + '">' + esc(lab) + '</button>' +
      '<select class="quick-nav-select" id="cmVer" aria-label="Verse"' + (st.c ? '' : ' disabled') + '><option value="">' + (st.c ? 'All verses' : 'Verse') + '</option></select></div>' + popHtml();
  }
  function fillVerses() {
    var sel = $('cmVer'); if (!sel || !st.b || !st.c) return;
    var b = st.b, c = st.c;
    verseMax(b, c).then(function (n) {
      var el = $('cmVer'); if (!el || st.b !== b || st.c !== c) return;
      var h = '<option value="">All verses</option>'; for (var i = 1; i <= n; i++) h += '<option value="' + i + '"' + (i === st.v ? ' selected' : '') + '>Verse ' + i + '</option>';
      el.innerHTML = h;
    });
  }
  function renderHome() {
    setBack(false);
    var h = '<h2 class="cmx-h lead">Learn from pastors, authors, teachers and early church writers</h2>' + pickerHtml();
    if (st.b && st.c) h += '<div id="cmRes"></div>';
    else {
      h += '<p class="st-hint">Tap a voice for a short bio and everything we have from them, book by book.</p>';
      GROUPS.forEach(function (g) {
        var vs = VOICES.filter(function (v) { return v.g === g[0] && hidden().indexOf(v.k) < 0; }); if (!vs.length) return;
        h += '<section class="cmx-grp"><h3>' + esc(g[1]) + '</h3><p class="cmx-gd">' + esc(g[2]) + '</p><div class="cmx-grid">' + vs.map(function (v) {
          return '<button type="button" class="cmx-blk cmx-g' + v.g + '" data-cm="voice" data-k="' + v.k + '"><span class="cmx-mono">' + esc(v.m) + '</span><b>' + esc(v.n) + '</b><i>' + esc(v.r) + '</i><p>' + esc(v.pv) + '</p><u data-count="' + v.k + '"> </u></button>';
        }).join('') + '</div></section>';
      });
    }
    $('cmMain').innerHTML = h;
    fillVerses();
    if (st.b && st.c) { renderResults(); return; }
    loadLib().then(function (v) {
      Array.prototype.forEach.call(document.querySelectorAll('[data-count]'), function (el) { var o = v[el.dataset.count]; el.textContent = o ? plural(o.n) : ''; });
    });
  }

  // ---------- one voice ----------
  function renderVoice() {
    setBack(true);
    var v = VBY[st.k]; if (!v) { st.view = 'home'; return renderHome(); }
    var main = $('cmMain');
    main.innerHTML = '<header class="cmx-vh"><span class="cmx-mono big cmx-g' + v.g + '">' + esc(v.m) + '</span><div><h2 class="cmx-h sm">' + esc(v.n) + '</h2><p class="cmx-role">' + esc(v.r) + '</p></div></header><p class="cmx-bio">' + esc(v.bio) + '</p><p class="cmx-load">Gathering the library…</p>';
    loadLib().then(function (L) {
      if (st.view !== 'voice' || st.k !== v.k) return;
      var o = L[v.k];
      if (!o) { main.querySelector('.cmx-load').textContent = 'Nothing from this voice is in the library yet.'; return; }
      var books = Bk.slugs().filter(function (b) { return o.b[b]; });
      if (books.indexOf(st.gb) < 0) st.gb = books[0];
      var cnt = {}; books.forEach(function (b) { cnt[b] = Object.keys(o.b[b]).reduce(function (n, c) { return n + o.b[b][c].length; }, 0); });
      var h = '<header class="cmx-vh"><span class="cmx-mono big cmx-g' + v.g + '">' + esc(v.m) + '</span><div><h2 class="cmx-h sm">' + esc(v.n) + '</h2><p class="cmx-role">' + esc(v.r) + '</p></div></header><p class="cmx-bio">' + esc(v.bio) + '</p>' +
        '<p class="cmx-stat">' + plural(o.n) + ' in our library</p><div class="cmx-filters">' + books.map(function (b) {
          return '<button type="button" class="cmx-chip' + (st.gb === b ? ' on' : '') + '" data-cm="gospel" data-b="' + b + '">' + esc(bookName(b)) + ' · ' + cnt[b] + '</button>';
        }).join('') + '</div>';
      var chs = Object.keys(o.b[st.gb]).map(Number).sort(function (a, b) { return a - b; });
      chs.forEach(function (c) {
        var key = st.gb + '|' + c, list = o.b[st.gb][c], open = !!st.more[key];
        h += '<section class="cmx-ch"><button type="button" class="cmx-chh' + (open ? ' on' : '') + '" data-cm="ch" data-k="' + key + '"><span>' + esc(bookName(st.gb)) + ' ' + c + '</span><em>' + plural(list.length) + '</em><i>›</i></button><div class="cmx-chb" id="chb-' + key.replace('|', '-') + '"' + (open ? '' : ' hidden') + '>' + (open ? chBody(list, st.gb, c, v.k === 'early') : '') + '</div></section>';
      });
      main.innerHTML = h;
    });
  }
  function chBody(list, b, c, early) {
    var out = '';
    if (early) {                                    // group the writers, with a line about each
      var by = {}, order = [];
      list.forEach(function (it) { var w = it.e[1]; if (!by[w]) { by[w] = []; order.push(w); } by[w].push(it); });
      order.forEach(function (w) { out += '<h4 class="cmx-ew">' + esc(w) + (WRITERS[w] ? '<span>' + esc(WRITERS[w]) + '</span>' : '') + '</h4>'; by[w].forEach(function (it) { out += itemHtml(it, b, c, false); }); });
      return out;
    }
    list.forEach(function (it) { out += itemHtml(it, b, c, false); });
    return out;
  }

  // ---------- the results: every voice on the chosen chapter (or verse), under the search ----------
  var seq = 0;
  function covers(it, v) {
    var rg = range(it.e), n = rg ? rg.match(/\d+/g) : null;
    if (n && n.length) return v >= Number(n[0]) && v <= Number(n[n.length - 1]);
    return it.v === v;
  }
  function renderResults() {
    var box = $('cmRes'); if (!box) return;
    var my = ++seq, ref = bookName(st.b) + ' ' + st.c + (st.v ? ':' + st.v : '');
    box.innerHTML = '<div class="cmx-rh"><button type="button" class="cmx-nav" data-cm="prev" aria-label="Previous chapter">&lsaquo;</button><h3 class="cmx-h sm">' + esc(ref) + '</h3><button type="button" class="cmx-nav" data-cm="next" aria-label="Next chapter">&rsaquo;</button></div><div class="cmx-filters" id="cmFilters"></div><div id="cmBody"><p class="cmx-load">Gathering what the teachers said…</p></div>';
    loadCommentary(st.b, st.c).then(function (data) {
      if (my !== seq || !$('cmRes')) return;
      var modern = {}, early = {}, order = [], seen = {}, V = st.v;
      Object.keys(data || {}).filter(function (k) { return /^\d+$/.test(k); }).sort(function (a, b) { return a - b; }).forEach(function (vk) {
        (data[vk] || []).forEach(function (e) {
          if (!Array.isArray(e)) return;
          var id = e[1] + '|' + e[4] + '|' + e[2]; if (seen[id]) return; seen[id] = 1;
          var who = String(e[1] || '').replace(/ · BibleProject$/, ''), it = { e: e, v: Number(vk) };
          if (V && !covers(it, V)) return;
          if (e[0] === 'e') (early[who] || (early[who] = [])).push(it);
          else { if (!modern[who]) { modern[who] = []; order.push(who); } modern[who].push(it); }
        });
      });
      var sOrder = (data && data._s) || [];
      var voices = order.slice().sort(function (a, b) { var ia = sOrder.indexOf(a), ib = sOrder.indexOf(b); if (ia < 0) ia = 99; if (ib < 0) ib = 99; return ia !== ib ? ia - ib : modern[b].length - modern[a].length; });
      var eWho = Object.keys(early), eCount = eWho.reduce(function (n, w) { return n + early[w].length; }, 0);
      var body = $('cmBody'); if (!body) return;
      if (!voices.length && !eCount) { body.innerHTML = '<p class="cmx-load">' + (V ? 'Nothing is written for that verse. Try “All verses” to see the whole chapter.' : 'No commentary is written for this chapter yet.') + '</p>'; $('cmFilters').innerHTML = ''; return; }
      var chips = [['all', 'Everyone'], ['modern', 'Modern teachers']].concat(eCount ? [['early', 'Early church']] : []).concat(voices.map(function (w) { return ['v:' + w, w]; }));
      if (!chips.some(function (c) { return c[0] === st.f; })) st.f = 'all';
      $('cmFilters').innerHTML = chips.map(function (c) { return '<button type="button" class="cmx-chip' + (st.f === c[0] ? ' on' : '') + '" data-cm="filter" data-f="' + esc(c[0]) + '">' + esc(c[1]) + '</button>'; }).join('');
      var html = '', f = st.f;
      function section(name, list) {
        var key = st.b + st.c + ':' + V + name, shown = st.more[key] ? list.length : Math.min(list.length, 4), vk = '';
        try { vk = cmVoiceKey(name, 'm'); } catch (e) {}
        var h = '<section class="cmx-sec cmx-m"><header><h3>' + esc(name) + '</h3>' + (VBY[vk] ? '<button type="button" class="cmx-about" data-cm="voice" data-k="' + vk + '">About ›</button>' : '<span class="cmx-n">' + plural(list.length) + '</span>') + '</header>';
        for (var i = 0; i < shown; i++) h += itemHtml(list[i], st.b, st.c, false);
        if (list.length > shown) h += '<button type="button" class="cmx-all" data-cm="all" data-k="' + esc(key) + '">Show all ' + list.length + '</button>';
        return h + '</section>';
      }
      if (f === 'all' || f === 'modern' || f.indexOf('v:') === 0) voices.forEach(function (w) { if (f === 'all' || f === 'modern' || f === 'v:' + w) html += section(w, modern[w]); });
      if ((f === 'all' || f === 'early') && eCount) {
        html += '<section class="cmx-sec cmx-e"><header><h3>Early church writers</h3><button type="button" class="cmx-about" data-cm="voice" data-k="early">About ›</button></header>';
        eWho.forEach(function (w) { html += '<h4 class="cmx-ew">' + esc(w) + (WRITERS[w] ? '<span>' + esc(WRITERS[w]) + '</span>' : '') + '</h4>'; early[w].forEach(function (it) { html += itemHtml(it, st.b, st.c, false); }); });
        html += '</section>';
      }
      body.innerHTML = html || '<p class="cmx-load">Nothing from that voice here.</p>';
    });
  }

  function render() {
    var w = $('cmMain'); if (!w) return;
    if (st.view === 'voice') renderVoice(); else renderHome();
  }
  function top() { var w = $('cmWrap'); if (w) w.scrollTop = 0; }
  function home() { pop = ''; st.view = 'home'; st.f = 'all'; st.b = ''; st.c = 0; st.v = 0; }     // a fresh visit starts with an empty search
  function open(b, c) { pop = ''; if (Bk.slugs().indexOf(b) >= 0) { st.b = b; st.c = Number(c) || 1; st.v = 0; } st.view = 'home'; st.f = 'all'; goToScreen('commentary'); }

  document.addEventListener('change', function (e) {
    var t = e.target; if (!t || !t.closest || !t.closest('#cmMain')) return;
    if (t.id === 'cmVer') { st.v = Number(t.value) || 0; st.f = 'all'; renderResults(); var h = document.querySelector('#cmRes .cmx-h'); if (h) h.textContent = bookName(st.b) + ' ' + st.c + (st.v ? ':' + st.v : ''); }
  });
  document.addEventListener('click', function (e) {
    var t = e.target && e.target.closest ? e.target.closest('[data-cm],#cmBack') : null; if (!t) return;
    if (t.id === 'cmBack') { st.view = 'home'; st.f = 'all'; render(); top(); return; }
    var a = t.dataset.cm;
    if (a === 'pass') { pop = ''; BCPick.open({ anchor: t, slug: st.b, chapter: st.c, onPick: function (b, c) { st.b = b; st.c = c; st.v = 0; st.f = 'all'; pop = ''; renderHome(); } }); return; }
    if (a === 'pbook') { popB = t.dataset.b; pop = 'chap'; renderHome(); return; }
    if (a === 'pback') { pop = 'book'; renderHome(); return; }
    if (a === 'pchap') { st.b = popB; st.c = Number(t.dataset.c) || 1; st.v = 0; st.f = 'all'; pop = ''; renderHome(); return; }
    if (a === 'voice') { st.view = 'voice'; st.k = t.dataset.k; st.gb = ''; render(); top(); }
    else if (a === 'gospel') { st.gb = t.dataset.b; render(); }
    else if (a === 'ch') {
      var key = t.dataset.k, box = $('chb-' + key.replace('|', '-')), parts = key.split('|');
      if (!box) return;
      var on = box.hidden; box.hidden = !on; t.classList.toggle('on', on); st.more[key] = on ? 1 : 0;
      if (on && !box.innerHTML && lib && lib[st.k] && lib[st.k].b[parts[0]]) box.innerHTML = chBody(lib[st.k].b[parts[0]][parts[1]] || [], parts[0], Number(parts[1]), st.k === 'early');
    }
    else if (a === 'filter') { st.f = t.dataset.f; renderResults(); }
    else if (a === 'all') { st.more[t.dataset.k] = 1; renderResults(); }
    else if (a === 'more') { var p = $(t.dataset.t); if (p) { var c = p.classList.toggle('clamp'); t.textContent = c ? 'Read more' : 'Show less'; } }
    else if (a === 'verse') { try { openPassage(t.dataset.b, Number(t.dataset.c), Number(t.dataset.v), false); } catch (x) {} }
    else if (a === 'prev' || a === 'next') {
      var ch = chapters(st.b), i = ch.indexOf(st.c) + (a === 'next' ? 1 : -1);
      if (i >= 0 && i < ch.length) st.c = ch[i];
      else { var bi = Bk.slugs().indexOf(st.b) + (a === 'next' ? 1 : -1); if (bi >= 0 && bi < Bk.slugs().length) { st.b = Bk.slugs()[bi]; var c2 = chapters(st.b); st.c = a === 'next' ? c2[0] : c2[c2.length - 1]; } }
      st.v = 0; st.f = 'all'; renderHome(); 
    }
  });
  function openVoice(k) { if (VBY[k]) { st.view = 'voice'; st.k = k; st.gb = ''; } goToScreen('commentary'); }
  window.Cm = { render: render, open: open, home: home, voices: function () { return VOICES; }, openVoice: openVoice };
})();
