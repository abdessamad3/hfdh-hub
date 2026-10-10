import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './i18n';

// After a deploy, an open tab may request page chunks that no longer exist.
// Reload to pick up the new build instead of showing a blank page, but at
// most once every 10 seconds so a truly broken chunk can't cause a loop.
window.addEventListener('vite:preloadError', (event) => {
  try {
    const last = Number(sessionStorage.getItem('chunk-reload-at') || 0);
    if (Date.now() - last < 10_000) return;
    sessionStorage.setItem('chunk-reload-at', String(Date.now()));
  } catch {
    return;
  }
  event.preventDefault();
  window.location.reload();
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
