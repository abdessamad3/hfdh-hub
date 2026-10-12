import { defineConfig } from 'vite';

// Separate small build for the recitation test page. Output goes to ./dist.
export default defineConfig({
  base: './',
  build: { target: 'es2022', chunkSizeWarningLimit: 2000 },
  worker: { format: 'es' },
});
