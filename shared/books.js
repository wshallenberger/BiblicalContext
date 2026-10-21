// The 66 books of the Bible, in order. Shared by the browser module (translations.js) and the server function (netlify/functions/bible.js).
// slug: the URL/file name the app uses (matthew, mark, luke, john are the app's own; the rest follow the same rule: lowercase name, spaces to hyphens)
// usfm: the 3-letter book code API.Bible uses for chapter ids (JHN.3). ch: number of chapters.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.BibleBooks = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const RAW = [
    ['Genesis', 'GEN', 50], ['Exodus', 'EXO', 40], ['Leviticus', 'LEV', 27], ['Numbers', 'NUM', 36], ['Deuteronomy', 'DEU', 34],
    ['Joshua', 'JOS', 24], ['Judges', 'JDG', 21], ['Ruth', 'RUT', 4], ['1 Samuel', '1SA', 31], ['2 Samuel', '2SA', 24],
    ['1 Kings', '1KI', 22], ['2 Kings', '2KI', 25], ['1 Chronicles', '1CH', 29], ['2 Chronicles', '2CH', 36], ['Ezra', 'EZR', 10],
    ['Nehemiah', 'NEH', 13], ['Esther', 'EST', 10], ['Job', 'JOB', 42], ['Psalms', 'PSA', 150], ['Proverbs', 'PRO', 31],
    ['Ecclesiastes', 'ECC', 12], ['Song of Solomon', 'SNG', 8], ['Isaiah', 'ISA', 66], ['Jeremiah', 'JER', 52], ['Lamentations', 'LAM', 5],
    ['Ezekiel', 'EZK', 48], ['Daniel', 'DAN', 12], ['Hosea', 'HOS', 14], ['Joel', 'JOL', 3], ['Amos', 'AMO', 9],
    ['Obadiah', 'OBA', 1], ['Jonah', 'JON', 4], ['Micah', 'MIC', 7], ['Nahum', 'NAM', 3], ['Habakkuk', 'HAB', 3],
    ['Zephaniah', 'ZEP', 3], ['Haggai', 'HAG', 2], ['Zechariah', 'ZEC', 14], ['Malachi', 'MAL', 4],
    ['Matthew', 'MAT', 28], ['Mark', 'MRK', 16], ['Luke', 'LUK', 24], ['John', 'JHN', 21], ['Acts', 'ACT', 28],
    ['Romans', 'ROM', 16], ['1 Corinthians', '1CO', 16], ['2 Corinthians', '2CO', 13], ['Galatians', 'GAL', 6], ['Ephesians', 'EPH', 6],
    ['Philippians', 'PHP', 4], ['Colossians', 'COL', 4], ['1 Thessalonians', '1TH', 5], ['2 Thessalonians', '2TH', 3], ['1 Timothy', '1TI', 6],
    ['2 Timothy', '2TI', 4], ['Titus', 'TIT', 3], ['Philemon', 'PHM', 1], ['Hebrews', 'HEB', 13], ['James', 'JAS', 5],
    ['1 Peter', '1PE', 5], ['2 Peter', '2PE', 3], ['1 John', '1JN', 5], ['2 John', '2JN', 1], ['3 John', '3JN', 1],
    ['Jude', 'JUD', 1], ['Revelation', 'REV', 22]
  ];
  const BOOKS = RAW.map((b, i) => ({ i, name: b[0], slug: b[0].toLowerCase().replace(/ /g, '-'), usfm: b[1], ch: b[2], testament: i < 39 ? 'Old' : 'New' }));
  const bySlug = {}; BOOKS.forEach(b => { bySlug[b.slug] = b; });
  return { BOOKS, bySlug, find: slug => bySlug[String(slug).toLowerCase()] || null };
});
