// Runs the speech model off the main thread so the page stays responsive.
import { pipeline, env } from '@huggingface/transformers';

env.allowLocalModels = false;
env.backends.onnx.wasm.wasmPaths = new URL('../ort/', import.meta.url).href; // served by this site, see vite.config.js
env.useBrowserCache = true;

let asr = null;

self.onmessage = async (e) => {
  const m = e.data;
  try {
    if (m.type === 'load') {
      const t0 = performance.now();
      const files = new Map();
      // Several threads need the page to be cross-origin isolated (see the hosting headers).
      const cores = self.navigator.hardwareConcurrency || 2;
      env.backends.onnx.wasm.numThreads = self.crossOriginIsolated ? (m.threads || Math.min(4, cores)) : 1;
      const progress_callback = (p) => {
        if (p.status === 'progress' && p.file) {
          files.set(p.file, { loaded: p.loaded, total: p.total });
          let loaded = 0, total = 0;
          files.forEach((f) => { loaded += f.loaded || 0; total += f.total || 0; });
          self.postMessage({ type: 'progress', loaded, total, file: p.file });
        }
      };
      // The repo's 8-bit files do not work (the encoder uses an unsupported ConvInteger op and the
      // decoder is ~315 MB), so both parts use the 4-bit files (~160 MB in total).
      // Fallback: full-precision encoder (~82 MB) with the 4-bit decoder.
      const attempts = m.device === 'webgpu' ? [['webgpu', 'fp32']] : [];
      attempts.push(['wasm', 'q4'], ['wasm', { encoder_model: 'fp32', decoder_model_merged: 'q4' }]);
      let last;
      for (const [device, dtype] of attempts) {
        files.clear();
        try {
          asr = await pipeline('automatic-speech-recognition', m.modelId, { device, dtype, progress_callback });
          self.postMessage({ type: 'ready', threads: env.backends.onnx.wasm.numThreads, device, dtype: typeof dtype === 'string' ? dtype : 'enc-fp32/dec-q4', loadMs: Math.round(performance.now() - t0) });
          return;
        } catch (err) {
          last = err;
          self.postMessage({ type: 'note', message: `محاولة ${device}/${typeof dtype === 'string' ? dtype : 'enc-fp32+dec-q4'} فشلت: ${String(err && err.message ? err.message : err).slice(0, 300)}` });
        }
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
