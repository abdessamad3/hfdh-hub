import fs from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'vite';

// The speech runtime (WebAssembly) ships inside @huggingface/transformers. Serve it from this
// site (under /ort/) instead of a CDN, so the test page works without any third-party host.
const ORT_DIR = path.resolve('node_modules/@huggingface/transformers/dist');
const ORT_FILES = ['ort-wasm-simd-threaded.jsep.mjs', 'ort-wasm-simd-threaded.jsep.wasm'];

function serveOrtLocally() {
  return {
    name: 'serve-ort-locally',
    generateBundle() {
      for (const f of ORT_FILES) {
        this.emitFile({ type: 'asset', fileName: `ort/${f}`, source: fs.readFileSync(path.join(ORT_DIR, f)) });
      }
    },
    configureServer(server) {
      server.middlewares.use('/ort/', (req, res, next) => {
        const f = path.basename((req.url || '').split('?')[0]);
        if (!ORT_FILES.includes(f)) return next();
        res.setHeader('Content-Type', f.endsWith('.wasm') ? 'application/wasm' : 'text/javascript');
        res.end(fs.readFileSync(path.join(ORT_DIR, f)));
      });
    },
  };
}

// Separate small build for the recitation test page. Output goes to ./dist.
export default defineConfig({
  base: './',
  plugins: [serveOrtLocally()],
  build: { target: 'es2022', chunkSizeWarningLimit: 2000 },
  worker: { format: 'es' },
});
