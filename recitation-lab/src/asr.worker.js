// Runs the speech model off the main thread so the page stays responsive.
import { pipeline, env } from '@huggingface/transformers';

env.allowLocalModels = false;
env.useBrowserCache = true;

let asr = null;

self.onmessage = async (e) => {
  const m = e.data;
  try {
    if (m.type === 'load') {
      const t0 = performance.now();
      const files = new Map();
      const progress_callback = (p) => {
        if (p.status === 'progress' && p.file) {
          files.set(p.file, { loaded: p.loaded, total: p.total });
          let loaded = 0, total = 0;
          files.forEach((f) => { loaded += f.loaded || 0; total += f.total || 0; });
          self.postMessage({ type: 'progress', loaded, total, file: p.file });
        }
      };
      const attempts = m.device === 'webgpu' ? [['webgpu', 'fp32']] : [['wasm', 'q8']];
      attempts.push(['wasm', 'q8']);
      let last;
      for (const [device, dtype] of attempts) {
        try {
          asr = await pipeline('automatic-speech-recognition', m.modelId, { device, dtype, progress_callback });
          self.postMessage({ type: 'ready', device, dtype, loadMs: Math.round(performance.now() - t0) });
          return;
        } catch (err) { last = err; }
      }
      throw last;
    }
    if (m.type === 'transcribe') {
      const t0 = performance.now();
      const out = await asr(m.audio, { language: 'arabic', task: 'transcribe', chunk_length_s: 30 });
      self.postMessage({ type: 'result', id: m.id, text: out.text || '', ms: Math.round(performance.now() - t0) });
    }
  } catch (err) {
    self.postMessage({ type: 'error', id: m.id, message: String(err && err.message ? err.message : err) });
  }
};
