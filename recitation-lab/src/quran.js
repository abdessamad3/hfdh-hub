import { normalizeWord } from './normalize.js';

const BASMALA_NORM = ['بسم', 'الله', 'الرحمن', 'الرحيم'];

// Parses Tanzil's text format: lines "surah|ayah|text"; lines starting with # are the notice.
export function parseTanzil(raw) {
  const surahs = new Map();
  const notice = [];
  for (const line of raw.split(/\r?\n/)) {
    if (!line.trim()) continue;
    if (line.startsWith('#')) { notice.push(line.replace(/^#\s?/, '')); continue; }
    const m = line.match(/^(\d+)\|(\d+)\|(.*)$/);
    if (!m) continue;
    const s = Number(m[1]);
    if (!surahs.has(s)) surahs.set(s, []);
    surahs.get(s).push({ ayah: Number(m[2]), text: m[3] });
  }
  return { surahs, notice: notice.join('\n') };
}

// Builds what the page and the tracker need for one surah.
// verses[]: { n, text (original, for display), basmala (original basmala shown as a header) }
// words[]: only the words used for matching: { norm, verse, raw }
export function buildSurah(surahNo, ayat, basmalaText = '') {
  const verses = [];
  const words = [];
  for (const a of ayat) {
    let text = a.text;
    let basmala = '';
    if (a.ayah === 1 && surahNo !== 1 && surahNo !== 9) {
      const parts = text.split(/\s+/);
      const head = parts.slice(0, 4);
      if (head.length === 4 && head.every((w, i) => normalizeWord(w) === BASMALA_NORM[i]) && parts.length > 4) {
        basmala = head.join(' ');
        text = parts.slice(4).join(' ');
      }
    }
    verses.push({ n: a.ayah, text, basmala });
  }
  // Reciters say the basmala before every surah except Fatiha (where it is verse 1) and Tawba.
  let basmala = verses[0]?.basmala || '';
  if (surahNo !== 1 && surahNo !== 9) {
    basmala = basmala || basmalaText;
    BASMALA_NORM.forEach((w) => words.push({ norm: w, verse: 0, raw: w }));
  } else {
    basmala = '';
  }
  for (const v of verses) {
    for (const raw of v.text.split(/\s+/)) {
      const norm = normalizeWord(raw);
      if (norm) words.push({ norm, verse: v.n, raw });
    }
  }
  return { surahNo, verses, words, basmala };
}
