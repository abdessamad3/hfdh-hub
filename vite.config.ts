import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // The firebase chunk (auth + firestore) is ~660 kB on its own and is
    // needed before the login screen, so it can't be split further.
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        // Large libraries get their own long-cached chunks, so an app
        // update doesn't make users re-download them.
        manualChunks: {
          react: ['react', 'react-dom', 'react-dom/client', 'react-router-dom'],
          motion: ['motion/react'],
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore'],
        },
      },
    },
  },
});
