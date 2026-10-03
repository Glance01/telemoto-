import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import './index.css';

// Google Maps Platform Quota Defense listener
(window as any).gm_authFailure = () => {
  window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
};
const origError = console.error;
console.error = (...args: unknown[]) => {
  origError.apply(console, args);
  const msg = args.map((a) => String(a)).join(' ');
  if (msg.includes('OverQuotaMapError') || msg.includes('QuotaExceededError')) {
    window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
  }
};

const origWarn = console.warn;
console.warn = (...args: unknown[]) => {
  const msg = args.map((a) => String(a)).join(' ');
  if (msg.includes('Could not reach Cloud Firestore backend') || (msg.includes('Firestore') && msg.includes('offline mode'))) {
    return;
  }
  origWarn.apply(console, args);
};

// Service Worker Registration for PWA (Only in Production to avoid dev caching conflicts)
if ('serviceWorker' in navigator) {
  if (import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js', { scope: '/' }).then((reg) => {
        reg.update();
      }).catch((err) => {
        console.warn('Service Worker registration failed:', err);
      });
    });
  } else {
    // In development mode, unregister any stale service workers to prevent blank screens
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const reg of registrations) {
        reg.unregister();
      }
    });
  }
}

// Global error listener to catch crashes before React mounts
window.onerror = (message, source, lineno, colno, error) => {
  const root = document.getElementById('root');
  if (root && (!root.innerHTML || root.innerHTML === '')) {
    root.innerHTML = `
      <div style="background: #171717; color: #ff4444; padding: 20px; font-family: sans-serif; min-height: 100vh;">
        <h1 style="font-size: 20px;">TeleMoto+ Fatal Error</h1>
        <p style="font-size: 14px; color: #888;">${message}</p>
        <pre style="font-size: 10px; background: #000; padding: 10px; border-radius: 8px;">${error?.stack || ''}</pre>
        <button onclick="window.location.reload()" style="background: #dc2626; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; cursor: pointer;">
          Recarregar App
        </button>
      </div>
    `;
  }
};

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);
