// Turns Arabic text (Uthmani script with marks, or the model's output) into a plain
// comparable form. Used only for matching; the page always displays the original text.

const MARKS = /[ؐ-ًؚ-ٰٟۖ-ۜ۟-۪ۨ-ۭ࣓-ࣿـ]/g;

export function normalizeWord(w) {
  return w
    .replace(MARKS, '')
    .replace(/[ٱآأإٲٳ]/g, 'ا') // alef variants -> alef
    .replace(/ى/g, 'ي') // alef maqsura -> ya
    .replace(/ة/g, 'ه') // ta marbuta -> ha
    .replace(/ؤ/g, 'و') // hamza on waw -> waw
    .replace(/ئ/g, 'ي') // hamza on ya -> ya
    .replace(/ء/g, '') // lone hamza
    .replace(/[^؀-ۿ]/g, '') // anything that is not Arabic (digits, latin, punctuation)
    .replace(/[،؛؟٪-٭۔۝۞۩]/g, '');
}

export function normalizeText(s) {
  return s
    .split(/\s+/)
    .map(normalizeWord)
    .filter(Boolean);
}
