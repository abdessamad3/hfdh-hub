import { CONFIG } from '../config.js';

// Similarity of two normalized words, 0..1 (1 = same).
export function wordSim(a, b) {
  if (a === b) return 1;
  const la = a.length, lb = b.length;
  const max = Math.max(la, lb);
  if (!max) return 1;
  if (Math.abs(la - lb) > max / 2) return 0;
  let prev = new Array(lb + 1);
  let cur = new Array(lb + 1);
  for (let j = 0; j <= lb; j++) prev[j] = j;
  for (let i = 1; i <= la; i++) {
    cur[0] = i;
    for (let j = 1; j <= lb; j++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, cur] = [cur, prev];
  }
  return Math.max(0, 1 - prev[lb] / max);
}

// Follows a recitation inside one surah.
// surah.words: [{ norm, verse }]; position = index of the last word judged recited.
export class Tracker {
  constructor(surah, startVerse = 1, opts = {}) {
    this.cfg = { ...CONFIG, ...opts };
    this.words = surah.words;
    this.setVerse(startVerse);
  }

  firstWordOf(verse) {
    const i = this.words.findIndex((w) => w.verse >= verse);
    return i < 0 ? this.words.length - 1 : i;
  }

  // Manual correction: put the highlight on the beginning of a verse.
  setVerse(verse) {
    this.pos = this.firstWordOf(verse) - 1;
    this.forced = verse; // the highlight shows this verse until the tracker moves on its own
    this.pending = null;
    this.misses = 0;
    this.started = false;
    return this.state();
  }

  state() {
    if (this.forced != null) return { pos: this.pos, verse: this.forced };
    const w = this.words[Math.max(0, this.pos)];
    return { pos: this.pos, verse: this.pos < 0 ? this.words[0]?.verse ?? 0 : w.verse };
  }

  // heard: array of normalized words from the model. Returns { moved, ... }.
  update(heard) {
    const cfg = this.cfg;
    const tail = heard.slice(-cfg.TAIL_WORDS);
    if (tail.length < cfg.MIN_TAIL_WORDS) return { moved: false, reason: 'too-few-words', ...this.state() };

    const whole = this.misses >= cfg.LOST_AFTER;
    const lo = whole ? 0 : Math.max(0, this.pos - 8);
    const hi = whole ? this.words.length - tail.length : Math.min(this.words.length - tail.length, this.pos + 45);
    let best = { score: 0, start: -1 };
    for (let p = lo; p <= hi; p++) {
      let sum = 0;
      for (let i = 0; i < tail.length; i++) {
        sum += wordSim(tail[i], this.words[p + i].norm);
        // cannot reach the pass line any more -> stop early
        if ((sum + (tail.length - 1 - i)) / tail.length < best.score) { sum = -1; break; }
      }
      if (sum < 0) continue;
      const score = sum / tail.length;
      // equal scores: prefer the place just after where we are
      const nearer = best.start >= 0 && Math.abs(p - (this.pos + 1)) < Math.abs(best.start - (this.pos + 1));
      if (score > best.score + 1e-9 || (Math.abs(score - best.score) < 1e-9 && nearer)) best = { score, start: p };
    }

    if (best.start < 0 || best.score < cfg.WEAK_SCORE) {
      this.misses++;
      this.pending = null;
      return { moved: false, reason: 'no-match', score: best.score, ...this.state() };
    }

    const end = best.start + tail.length - 1;
    const back = this.pos - end;
    // a jump far backwards (a repeated passage) needs stronger proof
    const needStrong = back > 8;
    const strong = best.score >= (needStrong ? 0.85 : cfg.STRONG_SCORE);
    let commit = strong;
    if (!strong) {
      // weaker match: wait for a second run that agrees
      const agrees = this.pending && Math.abs(this.pending.end - end) <= tail.length + 3;
      commit = !!agrees && !needStrong;
      this.pending = { end };
    } else {
      this.pending = null;
    }
    if (!commit) return { moved: false, reason: 'waiting', score: best.score, ...this.state() };

    this.misses = 0;
    const before = this.state();
    this.forced = null;
    this.pos = end;
    const after = this.state();
    return { moved: end !== before.pos, changedVerse: after.verse !== before.verse, score: best.score, reason: 'ok', ...after };
  }
}
