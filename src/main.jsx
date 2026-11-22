import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '@/App.jsx';
import '@/index.css';

// Owner opt-out: open any page once with ?notrack to stop Umami counting this
// browser (sets Umami's documented umami.disabled flag); ?track undoes it.
// Per browser and per device. Runs before the deferred Umami script.
try {
  const q = new URLSearchParams(window.location.search);
  if (q.has('notrack')) window.localStorage.setItem('umami.disabled', '1');
  if (q.has('track')) window.localStorage.removeItem('umami.disabled');
} catch {
  // Storage blocked: nothing to do.
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);

// Register service worker in production for offline access and faster repeat loads
if ('serviceWorker' in navigator && window.location.hostname !== 'localhost') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Registration failed, app still works without it
    });
  });
}
