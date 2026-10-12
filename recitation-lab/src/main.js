import { CONFIG } from '../config.js';
import { SURAH_NAMES } from './surahs.js';
import { parseTanzil, buildSurah } from './quran.js';
import { normalizeText } from './normalize.js';
import { Tracker } from './match.js';
import { AudioBuffer16k, rms, startMic, startFile, encodeWav, SAMPLE_RATE } from './audio.js';
import { hashPassword, check, isConfigured } from './gate.js';

const $ = (id) => document.getElementById(id);
const show = (...ids) => ['gate', 'gateSetup', 'setup', 'session', 'results'].forEach((i) => $(i).classList.toggle('hidden', !ids.includes(i)));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const isLocal = ['localhost', '127.0.0.1'].includes(location.hostname);

$('modelName').textContent = CONFIG.MODEL_ID;

// ---------- password gate ----------
async function start() {
  if (!isConfigured()) {
    if (isLocal && !location.search.includes('setup')) return openLab(); // local development only
    show('gateSetup');
    $('setupForm').onsubmit = async (e) => {
      e.preventDefault();
      $('setupWait').textContent = 'جارٍ إنشاء الرمز...';
      try {
        $('setupHash').textContent = await hashPassword($('setupPw').value);
        $('setupWait').textContent = 'أرسل هذا الرمز إلى Claude (وليس كلمة المرور):';
      } catch (err) {
        $('setupWait').textContent = 'تعذّر إنشاء الرمز. تأكد أن الرابط يبدأ بـ https.';
      }
    };
    return;
  }
  if (sessionStorage.getItem('lab-ok') === CONFIG.PASSWORD_HASH) return openLab();
  show('gate');
  $('gateForm').onsubmit = async (e) => {
    e.preventDefault();
    $('gateMsg').textContent = 'جارٍ التحقق...';
    if (await check($('gatePw').value)) {
      sessionStorage.setItem('lab-ok', CONFIG.PASSWORD_HASH);
      openLab();
    } else {
      $('gateMsg').textContent = 'كلمة المرور غير صحيحة.';
    }
  };
}

// ---------- state ----------
const worker = new Worker(new URL('./asr.worker.js', import.meta.url), { type: 'module' });
let modelReady = false;
let quran = null; // parsed Tanzil data
let basmalaText = '';
let surah = null;
let tracker = null;
let ses = null;
const waiting = new Map();
let rid = 0;

worker.onmessage = (e) => {
  const m = e.data;
  if (m.type === 'progress') {
    $('modelBar').style.width = m.total ? `${Math.min(100, (m.loaded / m.total) * 100)}%` : '10%';
    $('modelInfo').textContent = `جارٍ التحميل: ${(m.loaded / 1048576).toFixed(0)} من ${(m.total / 1048576).toFixed(0)} ميغابايت`;
  } else if (m.type === 'ready') {
    modelReady = true;
    $('modelBar').style.width = '100%';
    $('modelInfo').textContent = `جاهز (${m.device}، ${m.dtype}) · زمن التحميل ${(m.loadMs / 1000).toFixed(1)} ث`;
    $('loadBtn').disabled = true;
    modelInfo = { device: m.device, dtype: m.dtype, loadMs: m.loadMs };
    updateStartable();
  } else if (m.type === 'result' || m.type === 'error') {
    const w = waiting.get(m.id);
    if (w) { waiting.delete(m.id); m.type === 'error' ? w.reject(new Error(m.message)) : w.resolve(m); }
    else if (m.type === 'error') { $('modelInfo').textContent = 'تعذّر تحميل النموذج: ' + m.message; $('loadBtn').disabled = false; }
  }
};
let modelInfo = {};
const transcribe = (audio) => new Promise((resolve, reject) => {
  const id = ++rid;
  waiting.set(id, { resolve, reject });
  worker.postMessage({ type: 'transcribe', id, audio }, [audio.buffer]);
});

// ---------- setup screen ----------
async function openLab() {
  show('setup');
  const sel = $('surahSel');
  SURAH_NAMES.forEach((n, i) => sel.add(new Option(`${i + 1}. ${n}`, i + 1)));
  sel.value = '1';
  try {
    const res = await fetch('data/quran-uthmani.txt');
    if (!res.ok) throw new Error(res.status);
    quran = parseTanzil(await res.text());
    basmalaText = quran.surahs.get(1)?.[0]?.text || '';
    $('notice').textContent = quran.notice || '—';
  } catch (err) {
    setupMsg('ملف نص القرآن غير موجود بعد (data/quran-uthmani.txt).');
  }
  $('loadBtn').onclick = () => {
    $('loadBtn').disabled = true;
    $('modelInfo').textContent = 'جارٍ البدء...';
    worker.postMessage({ type: 'load', modelId: CONFIG.MODEL_ID, device: $('gpuOpt').checked ? 'webgpu' : 'wasm' });
  };
  $('startMic').onclick = () => beginSession('mic');
  $('fileIn').onchange = () => { if ($('fileIn').files[0]) beginSession('file'); };
  updateStartable();
}
function setupMsg(t) { const m = $('setupMsg'); m.textContent = t; m.classList.toggle('hidden', !t); }
function updateStartable() { $('startMic').disabled = !(modelReady && quran); }

// ---------- session ----------
async function beginSession(kind) {
  if (!modelReady || !quran) { setupMsg('حمّل النموذج أولاً.'); return; }
  const sNo = Number($('surahSel').value);
  const total = quran.surahs.get(sNo).length;
  const from = Math.max(1, Math.min(total, Number($('fromV').value) || 1));
  const to = Math.max(from, Math.min(total, Number($('toV').value) || from));
  surah = buildSurah(sNo, quran.surahs.get(sNo), basmalaText);
  tracker = new Tracker(surah, from);
  const buf = new AudioBuffer16k($('saveWav').checked);
  ses = { kind, sNo, from, to, buf, active: true, t0: performance.now(), log: [], reached: new Map(), infer: [], manual: 0, wrong: 0, handle: null, ended: false };
  renderQuran();
  paint(tracker.state(), false);
  show('session');
  setStatus('جارٍ الاستماع...', true);

  const onChunk = (c) => buf.append(c);
  try {
    if (kind === 'mic') ses.handle = await startMic(onChunk);
    else ses.handle = await startFile($('fileIn').files[0], onChunk, () => { ses.ended = true; });
  } catch (err) {
    show('setup');
    setupMsg('تعذّر فتح الصوت: ' + err.message);
    ses.active = false;
    return;
  }
  ses.log.push({ t: 0, type: 'start', kind, surah: sNo, from, to, rate: ses.handle.actualRate, model: CONFIG.MODEL_ID, ...modelInfo, ua: navigator.userAgent });
  ses.timer = setInterval(() => { $('timer').textContent = fmt((performance.now() - ses.t0) / 1000); }, 500);
  loop();
}

async function loop() {
  let lastSecs = 0;
  const s = ses;
  while (s.active) {
    const secs = s.buf.seconds();
    const enough = secs >= CONFIG.MIN_START_SECONDS && secs - lastSecs >= CONFIG.MIN_NEW_SECONDS;
    if (!enough) {
      if (s.ended) { await finish(); return; }
      await sleep(150);
      continue;
    }
    lastSecs = secs;
    const win = s.buf.tail(CONFIG.WINDOW_SECONDS);
    const t = (performance.now() - s.t0) / 1000;
    const level = rms(win.subarray(Math.max(0, win.length - 3 * SAMPLE_RATE)));
    if (level < CONFIG.SILENCE_RMS) {
      s.log.push({ t: +t.toFixed(2), type: 'silence', level: +level.toFixed(4) });
      setStatus('صمت...', true);
      await sleep(250);
      continue;
    }
    setStatus('يفكّر...', true);
    let r;
    try { r = await transcribe(win); } catch (err) { s.log.push({ t: +t.toFixed(2), type: 'error', message: err.message }); setStatus('خطأ: ' + err.message, true); await sleep(1000); continue; }
    if (!s.active) break;
    const heard = normalizeText(r.text);
    const res = tracker.update(heard);
    const tNow = (performance.now() - s.t0) / 1000;
    s.infer.push(r.ms);
    s.log.push({ t: +tNow.toFixed(2), type: 'infer', ms: r.ms, audioSec: +(win.length / SAMPLE_RATE).toFixed(1), text: r.text, words: heard.length, ...pick(res) });
    $('heard').textContent = r.text ? `سمعتُ: ${r.text}` : '';
    if (res.reason === 'ok') {
      if (res.changedVerse) noteReach(res.verse, tNow);
      paint(res, true);
      setStatus('يتتبّع', true);
    } else if (res.reason === 'no-match') setStatus('ضاع المكان... يبحث', true);
    else setStatus('يتتبّع', true);
  }
}
const pick = (r) => ({ reason: r.reason, score: r.score != null ? +r.score.toFixed(2) : null, pos: r.pos, verse: r.verse });

function noteReach(verse, t) {
  if (verse > 0 && !ses.reached.has(verse)) ses.reached.set(verse, +t.toFixed(1));
  if (verse < ses.from - 1 || verse > ses.to + 1) ses.wrong++;
}

function setStatus(txt, rec) { $('statusTxt').textContent = txt; $('recDot').classList.toggle('on', !!rec); }

// ---------- Quran view ----------
function renderQuran() {
  const box = $('quran');
  box.textContent = '';
  if (surah.basmala) {
    const b = document.createElement('div');
    b.className = 'basmala'; b.dataset.verse = '0'; b.textContent = surah.basmala;
    box.append(b);
  }
  let wi = surah.words.filter((w) => w.verse === 0).length; // index of first word of verse 1
  for (const v of surah.verses) {
    const el = document.createElement('span');
    el.className = 'verse'; el.dataset.verse = v.n;
    const tokens = v.text.split(/\s+/);
    tokens.forEach((raw) => {
      const sp = document.createElement('span');
      sp.className = 'w'; sp.textContent = raw + ' ';
      if (surah.words[wi] && surah.words[wi].raw === raw) { sp.dataset.i = wi; wi++; }
      el.append(sp);
    });
    const num = document.createElement('span');
    num.className = 'num'; num.textContent = ` ﴿${v.n}﴾ `;
    el.append(num);
    el.onclick = () => manualSet(v.n);
    box.append(el);
  }
}

function paint(state, scroll) {
  const cur = state.verse;
  document.querySelectorAll('#quran .verse').forEach((el) => {
    const n = Number(el.dataset.verse);
    el.classList.toggle('current', n === cur);
    el.classList.toggle('done', n < cur);
  });
  document.querySelectorAll('#quran .w.cw').forEach((el) => el.classList.remove('cw'));
  const w = document.querySelector(`#quran .w[data-i="${state.pos}"]`);
  if (w) w.classList.add('cw');
  const target = document.querySelector(`#quran .verse[data-verse="${cur}"]`);
  if (scroll && target) target.scrollIntoView({ block: 'center', behavior: 'smooth' });
}

function manualSet(verse) {
  if (!ses || !ses.active) return;
  const v = Math.max(1, Math.min(surah.verses.length, verse));
  const st = tracker.setVerse(v);
  ses.manual++;
  ses.log.push({ t: +((performance.now() - ses.t0) / 1000).toFixed(2), type: 'manual', verse: v });
  noteReach(v, (performance.now() - ses.t0) / 1000);
  paint(st, true);
}
$('prevBtn').onclick = () => manualSet(tracker.state().verse - 1);
$('nextBtn').onclick = () => manualSet(tracker.state().verse + 1);
$('stopBtn').onclick = () => finish();

// ---------- results ----------
let wavBlob = null;
let lastReport = null;

async function finish() {
  const s = ses;
  if (!s || s.finished) return;
  s.finished = true;
  s.active = false;
  clearInterval(s.timer);
  try { await s.handle?.stop(); } catch {}
  setStatus('انتهت', false);
  const dur = (performance.now() - s.t0) / 1000;
  const sorted = [...s.infer].sort((a, b) => a - b);
  const q = (p) => (sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))] : 0);
  const expected = [];
  for (let v = s.from; v <= s.to; v++) expected.push(v);
  const reachedExpected = expected.filter((v) => s.reached.has(v));
  lastReport = {
    when: new Date().toISOString(), surah: s.sNo, from: s.from, to: s.to, kind: s.kind,
    durationSec: +dur.toFixed(1), inferences: s.infer.length,
    inferMs: { median: q(0.5), p90: q(0.9), max: sorted[sorted.length - 1] || 0 },
    manualCorrections: s.manual, wrongJumps: s.wrong,
    versesReached: reachedExpected.length, versesExpected: expected.length,
    reached: Object.fromEntries(s.reached), model: CONFIG.MODEL_ID, ...modelInfo, config: { ...CONFIG, PASSWORD_HASH: undefined, PASSWORD_SALT: undefined, PASSWORD_ITERATIONS: undefined },
    log: s.log,
  };
  const grid = [
    ['مدة الجلسة', fmt(dur)],
    ['آيات وصل إليها التتبّع', `${reachedExpected.length} من ${expected.length}`],
    ['تصحيحات يدوية', String(s.manual)],
    ['قفزات خاطئة', String(s.wrong)],
    ['زمن التفكير (وسيط)', `${(q(0.5) / 1000).toFixed(1)} ث`],
    ['زمن التفكير (الأبطأ 10٪)', `${(q(0.9) / 1000).toFixed(1)} ث`],
  ];
  $('statGrid').innerHTML = grid.map(([k, v]) => `<div class="stat"><span class="note">${k}</span><b>${v}</b></div>`).join('');
  $('reachTbl').innerHTML = '<tr><th>الآية</th><th>وصل إليها عند</th></tr>' + expected.map((v) => `<tr><td>${v}</td><td>${s.reached.has(v) ? fmt(s.reached.get(v)) : '—'}</td></tr>`).join('');
  wavBlob = s.buf.keepAll ? encodeWav(s.buf.all()) : null;
  $('dlWav').classList.toggle('hidden', !wavBlob);
  show('results');
}

function download(name, blob) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}
$('dlJson').onclick = () => download(`recitation-lab-${Date.now()}.json`, new Blob([JSON.stringify(lastReport, null, 1)], { type: 'application/json' }));
$('dlWav').onclick = () => wavBlob && download(`recitation-lab-${Date.now()}.wav`, wavBlob);
$('againBtn').onclick = () => { ses = null; show('setup'); updateStartable(); };

start();
