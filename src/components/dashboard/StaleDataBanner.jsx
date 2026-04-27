import { useState, useEffect } from 'react';
import { WifiOff } from 'lucide-react';

// Banner now only shows when the user is actually offline. The previous
// time-since-fetch "stale" trigger was noise — the CBP refresh runs on
// GitHub Actions cron which is throttled in practice (often 60+ min vs.
// the requested 15 min), and there's nothing the user can do about it.
// Each card surfaces its own updated_at so freshness is visible without
// a top-level alert.
export default function StaleDataBanner({ language = 'en' }) {
  const [offline, setOffline] = useState(typeof navigator !== 'undefined' ? !navigator.onLine : false);

  useEffect(() => {
    const goOffline = () => setOffline(true);
    const goOnline = () => setOffline(false);
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, []);

  if (!offline) return null;

  const msg = language === 'en'
    ? 'You\'re offline — showing cached data.'
    : 'Sin conexión — mostrando datos en caché.';

  return (
    <div
      className="flex items-center gap-2 rounded-lg border border-red-300 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300 px-3 py-2 text-xs mb-3"
      role="status"
      aria-live="polite"
    >
      <WifiOff className="w-4 h-4 shrink-0" />
      <span>{msg}</span>
    </div>
  );
}
