// Offline checks for the matching logic. Needs a stand-in Quran file (not shipped):
//   FIXTURE_JSON=/path/to/quran-verses.min.json node tests/run.mjs
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { normalizeWord, normalizeText } from '../src/normalize.js';
import { wordSim, Tracker } from '../src/match.js';
import { buildSurah, parseTanzil } from '../src/quran.js';

let failed = 0;
const ok = (name, fn) => { try { fn(); console.log('PASS', name); } catch (e) { failed++; console.log('FAIL', name, '\n  ', e.message); } };

ok('normalize removes marks and unifies letters', () => {
  assert.equal(normalizeWord('ٱلرَّحْمَـٰنِ'), 'الرحمن');
  assert.equal(normalizeWord('إِيَّاكَ'), 'اياك');
  assert.equal(normalizeWord('ٱلْهُدَىٰ'), 'الهدي');
  assert.equal(normalizeWord('۞'), '');
  assert.deepEqual(normalizeText('الم ۖ ذَٰلِكَ'), ['الم', 'ذلك']);
});
ok('word similarity', () => {
  assert.equal(wordSim('الله', 'الله'), 1);
  assert.ok(wordSim('العالمين', 'العلمين') > 0.8);
  assert.ok(wordSim('الحمد', 'الضالين') < 0.4);
});
ok('tanzil parser keeps notice and verses', () => {
  const r = parseTanzil('1|1|بِسْمِ\n1|2|الْحَمْدُ\n\n#\n# Notice line\n');
  assert.equal(r.surahs.get(1).length, 2);
  assert.match(r.notice, /Notice line/);
});

const fx = process.env.FIXTURE_JSON;
if (!fx) {
  console.log('SKIP tracker simulation (set FIXTURE_JSON to a verses json)');
} else {
  const rows = JSON.parse(fs.readFileSync(fx, 'utf8'));
  const bySurah = (n) => rows.filter((r) => r.surah === n);
  const bas = rows[0].text;
  // With TANZIL_TXT set, the display/match text is the real Tanzil file (the heard text is still the stand-in).
  const tz = process.env.TANZIL_TXT ? parseTanzil(fs.readFileSync(process.env.TANZIL_TXT, 'utf8')) : null;
  const basT = tz ? tz.surahs.get(1)[0].text : bas;
  const mk = (n) => (tz ? buildSurah(n, tz.surahs.get(n), basT) : buildSurah(n, bySurah(n).map((r) => ({ ayah: r.ayah, text: r.text })), bas));

  // Seeded noise so the test is repeatable.
  let seed = 7;
  const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
  const garble = (w) => (rnd() < 0.12 && w.length > 3 ? w.slice(0, 1) + w.slice(2) : w);

  function simulate(surahNo, startVerse, endVerse) {
    const surah = mk(surahNo);
    const simple = bySurah(surahNo).filter((r) => r.ayah >= startVerse && r.ayah <= endVerse);
    // what the model would "hear": plain spelling, with some noise and dropped words
    const heardAll = [];
    for (const r of simple) {
      if (r.ayah === startVerse && surahNo !== 1 && surahNo !== 9) heardAll.push({ w: 'بسم', v: 0 }, { w: 'الله', v: 0 }, { w: 'الرحمن', v: 0 }, { w: 'الرحيم', v: 0 });
      for (const w of r.textSimple.split(/\s+/)) if (rnd() > 0.05) heardAll.push({ w: garble(normalizeWord(w) || w), v: r.ayah });
    }
    const tracker = new Tracker(surah, startVerse);
    const trail = [];
    let wrong = 0;
    // every step: the model has heard 4 more words; it sees the latest 10
    for (let end = 4; end <= heardAll.length + 3; end += 4) {
      const upto = Math.min(end, heardAll.length);
      const win = heardAll.slice(Math.max(0, upto - 10), upto).map((h) => h.w);
      const truth = heardAll[upto - 1].v;
      const res = tracker.update(win);
      trail.push({ truth, got: res.verse });
      if (res.reason === 'ok' && Math.abs(res.verse - truth) > 1) wrong++;
    }
    const last = trail[trail.length - 1];
    return { trail, wrong, last };
  }

  ok('real Tanzil text: basmala split from verse 1 of surah 2', () => {
    if (!tz) return;
    const sur = mk(2);
    assert.ok(sur.basmala.length > 0);
    assert.equal(sur.verses[0].text.split(/\s+/)[0].includes('ا'), true);
    assert.equal(sur.verses.length, 286);
    assert.equal(mk(9).basmala, '');
    assert.equal(mk(1).verses.length, 7);
  });
  for (const [s, a, b] of [[1, 1, 7], [2, 1, 20], [112, 1, 4], [36, 1, 30], [55, 1, 30]]) {
    ok(`tracks surah ${s} verses ${a}-${b}`, () => {
      const r = simulate(s, a, b);
      const within1 = r.trail.filter((t) => Math.abs(t.got - t.truth) <= 1).length / r.trail.length;
      console.log(`    steps=${r.trail.length} within-1-verse=${(within1 * 100).toFixed(0)}% wrongJumps=${r.wrong} end(truth=${r.last.truth}, got=${r.last.got})`);
      assert.ok(within1 >= 0.8, 'tracking too loose: ' + within1);
      assert.equal(r.wrong, 0);
      assert.ok(Math.abs(r.last.got - r.last.truth) <= 1);
    });
  }
}
if (failed) { console.log(`\n${failed} failed`); process.exit(1); }
console.log('\nall passed');
