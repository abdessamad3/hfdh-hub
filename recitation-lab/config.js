// Settings for the recitation test page.
export const CONFIG = {
  // Quran-tuned Whisper (base) in ONNX format, runs inside the browser (Apache-2.0 per its model card).
  MODEL_ID: 'YunusZJ/whisper-base-ar-quran-ONNX',

  // Shared password gate. This is only the hash of the chosen password (never the password).
  // To change it: set this to '' and deploy; the page then shows a setup form that makes a new hash.
  PASSWORD_HASH: '5a1b9a4760e223f63ceea51eb98eca1b65372716e9a9f28e6eaf5074a5887f48',
  PASSWORD_SALT: 'hifd-recitation-lab-v1',
  PASSWORD_ITERATIONS: 150000,

  // Tracking knobs (tuned during testing).
  WINDOW_SECONDS: 10, // how much recent audio is sent to the model each time
  MIN_NEW_SECONDS: 1.0, // do not run again until this much new audio arrived
  MIN_START_SECONDS: 3, // wait for this much audio before the first run
  SILENCE_RMS: 0.006, // below this loudness the window is skipped (avoids made-up text)
  TAIL_WORDS: 6, // how many of the latest heard words are matched
  MIN_TAIL_WORDS: 3,
  STRONG_SCORE: 0.8, // move at once above this similarity
  WEAK_SCORE: 0.62, // between weak and strong: move only if two runs agree
  LOST_AFTER: 3, // misses in a row before searching the whole surah
};
