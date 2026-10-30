/* genealogy.js — The family tree of Jesus (Timeline > Family tree, and More > Family tree).
 *
 * data/genealogy.json (built by tools/build_genealogy.py from the BSB text of Matthew 1:2–16 and Luke 3:23–38):
 *   nodes   every person: name, alias, note, women mentioned with him, and the verse he is named in (r.m = Matthew 1, r.l = Luke 3)
 *   m / l   each Gospel's list in order, oldest first (used for "son of" and "father of")
 *   segs    how the tree is drawn: single columns where the lists agree, two columns where they differ
 * Tap a name to see who he is, how each Gospel places him, and where to read it. On a wide screen the details stay open at the side.
 */
(function () {
  'use strict';
  var data = null, loading = null, prev = 'timeline', built = false, sel = null;
  var GN = { m: 'Matthew', l: 'Luke', b: 'Both Gospels' };
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function load() {
    if (data) return Promise.resolve(data);
    if (!loading) loading = fetch('data/genealogy.json').then(function (r) { if (!r.ok) throw 0; return r.json(); }).then(function (j) { data = j; return j; }).catch(function () { loading = null; return null; });
    return loading;
  }
  function nodeBtn(id) {
    var n = data.nodes[id], tag = n.r.m && n.r.l ? 'b' : n.r.m ? 'm' : 'l';
    var w = (n.w || []).map(function (x) { return '<span class="ge-w" data-w="' + esc(x.n) + '">♀ ' + esc(x.n) + '</span>'; }).join('');
    return '<li><button type="button" class="ge-n t-' + tag + '" data-id="' + id + '"><span class="ge-nm">' + esc(n.n) + '</span>' + (n.a ? '<small>' + esc(n.a) + '</small>' : '') + '</button>' + w + '</li>';
  }
  function colHtml(c) {
    var g = c.g;
    var items = c.ids.map(function (x) {
      if (typeof x === 'string') return nodeBtn(x);
      var f = x.fork; // two ways of naming the same stretch
      return '<li class="ge-fork"><div class="ge-forkc"><ol class="ge-col g-m">' + f.m.map(nodeBtn).join('') + '</ol><ol class="ge-col g-l">' + f.l.map(nodeBtn).join('') + '</ol></div></li>';
    }).join('');
    return '<div class="ge-cwrap g-' + g + '">' + (c.lab ? '<div class="ge-lab">' + esc(c.lab) + '</div>' : '') + '<ol class="ge-col">' + items + '</ol></div>';
  }
  var FORK_SVG = '<svg class="ge-ff" viewBox="0 0 100 22" preserveAspectRatio="none" aria-hidden="true"><path d="M50 0V7M50 7H25V22M50 7H75V22" fill="none" stroke="currentColor" stroke-width="1.6" vector-effect="non-scaling-stroke"/></svg>';
  var JOIN_SVG = '<svg class="ge-ff" viewBox="0 0 100 22" preserveAspectRatio="none" aria-hidden="true"><path d="M25 0V15H75V0M50 15V22" fill="none" stroke="currentColor" stroke-width="1.6" vector-effect="non-scaling-stroke"/></svg>';
  function build() {
    var w = $('geTree'); if (!w || !data) return;
    var h = '';
    data.segs.forEach(function (s, i) {
      var two = s.c.length === 2;
      h += '<section class="ge-seg k-' + s.k + (two ? ' two' : '') + '"><header class="ge-sh"><b>' + esc(s.t) + '</b><span>' + esc(s.s) + '</span></header>' + (two ? '<div class="ge-fj">' + FORK_SVG + '</div>' : '') + '<div class="ge-cols">' + s.c.map(colHtml).join('') + '</div></section>';
      if (two) h += '<div class="ge-fj">' + JOIN_SVG + '</div>';
    });
    w.innerHTML = h;
    var it = $('geIntro');
    if (it && !it.dataset.done) {
      it.dataset.done = '1';
      it.innerHTML = '<p class="ge-ip g-m"><b>Matthew</b>' + esc(data.intro.m) + '</p><p class="ge-ip g-l"><b>Luke</b>' + esc(data.intro.l) + '</p><p class="ge-ip g-b"><b>Why they differ</b>' + esc(data.intro.why) + '</p><p class="ge-ip"><button type="button" class="ge-lnk" id="geParLnk">Compare the two lists in Gospel parallels ›</button></p>';
    }
    built = true;
  }
  function rel(seq, id) {
    var i = seq.indexOf(id); if (i < 0) return null;
    return { son: i > 0 ? data.nodes[seq[i - 1]].n : null, fat: i < seq.length - 1 ? data.nodes[seq[i + 1]].n : null };
  }
  function ref(book, ch, v) { return '<button type="button" class="ge-ref" data-b="' + book + '" data-c="' + ch + '" data-v="' + v + '">' + (book === 'matthew' ? 'Matthew 1:' : 'Luke 3:') + v + ' ›</button>'; }
  function showNode(id) {
    var n = data.nodes[id]; if (!n) return;
    sel = id;
    Array.prototype.forEach.call(document.querySelectorAll('#geTree .ge-n'), function (b) { b.classList.toggle('sel', b.dataset.id === id); });
    var det = $('geDet'), tag = n.r.m && n.r.l ? 'b' : n.r.m ? 'm' : 'l';
    var h = '<button type="button" class="ge-x" id="geX" aria-label="Close">×</button><div class="ge-dt g-' + tag + '"><i>' + GN[tag] + (tag === 'b' ? '' : ' only') + '</i><h3>' + esc(n.n) + (n.a ? ' <small>(' + esc(n.a) + ')</small>' : '') + '</h3></div>';
    if (n.note) h += '<p class="ge-dn">' + esc(n.note) + '</p>';
    var rows = '';
    var rm = n.r.m ? rel(data.m, id) : null, rl = n.r.l ? rel(data.l, id) : null;
    function relLine(k, r) {
      var parts = [];
      if (r.son) parts.push('son of ' + esc(r.son)); else parts.push('start of the list');
      if (r.fat) parts.push('father of ' + esc(r.fat));
      return '<p class="g-' + k + '"><b>' + GN[k] + '</b> ' + parts.join(' · ') + '</p>';
    }
    if (rm) rows += relLine('m', rm);
    if (rl) rows += relLine('l', rl);
    if (rows) h += '<div class="ge-rel">' + rows + '</div>';
    (n.w || []).forEach(function (x) { h += '<div class="ge-wc"><b>♀ ' + esc(x.n) + '</b><p>' + esc(x.note) + '</p></div>'; });
    var rf = ''; if (n.r.m) rf += ref('matthew', 1, n.r.m); if (n.r.l) rf += ref('luke', 3, n.r.l);
    if (rf) h += '<div class="ge-refs">' + rf + '</div>';
    det.innerHTML = h; det.hidden = false; det.classList.add('on');
  }
  function closeNode() { sel = null; var det = $('geDet'); if (det) { det.hidden = true; det.classList.remove('on'); } Array.prototype.forEach.call(document.querySelectorAll('#geTree .ge-n'), function (b) { b.classList.remove('sel'); }); }

  document.addEventListener('click', function (e) {
    var t = e.target; if (!t.closest) return;
    var o = t.closest('[data-genea]'); if (o) { e.preventDefault(); Gen.open(); return; }
    if (!t.closest('#screen-genealogy')) return;
    var b;
    if ((b = t.closest('#geBack'))) { goToScreen(prev && prev !== 'genealogy' ? prev : 'timeline'); return; }
    if ((b = t.closest('.ge-n'))) { showNode(b.dataset.id); return; }
    if ((b = t.closest('.ge-w'))) { var host = b.parentNode.querySelector('.ge-n'); if (host) showNode(host.dataset.id); return; }
    if ((b = t.closest('#geX'))) { closeNode(); return; }
    if ((b = t.closest('.ge-ref'))) { openPassage(b.dataset.b, +b.dataset.c, +b.dataset.v, false); return; }
    if ((b = t.closest('#geParLnk'))) { try { Par.open('genealogy', 'list'); } catch (x) {} return; }
  });
  window.Gen = {
    open: function (forcePrev) {
      var cur = null; try { cur = currentScreen; } catch (e) {}
      if (cur && cur !== 'genealogy') prev = cur;
      if (forcePrev) prev = forcePrev;
      goToScreen('genealogy');
    },
    from: function () { return prev; },
    render: function () {
      var b = $('geBack'), LB = { parallels: 'Parallels', home: 'Home', read: 'Read', saved: 'Saved', divehome: 'Study', more: 'More' };
      if (b) { b.style.display = LB[prev] ? '' : 'none'; b.textContent = '‹ ' + (LB[prev] || ''); }
      closeNode();
      load().then(function (d) { if (!d) { $('geTree').innerHTML = '<p class="se-none">The family tree could not load. Check your connection and try again.</p>'; return; } if (!built) build(); });
    }
  };
})();
