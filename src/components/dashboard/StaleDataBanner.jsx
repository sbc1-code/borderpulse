import { useState, useEffect } from 'react';
import { WifiOff, Clock } from 'lucide-react';
import { FRESHNESS, freshnessOf, formatAge } from '@/lib/trustState';

// Two distinct problems, two distinct messages:
//
//   offline  the browser cannot reach the network at all
//   stale    we are online but the deployed snapshot is older than normal
//            delivery, so the numbers on screen may not reflect the border
//
// An earlier version of this banner fired on time-since-fetch and was removed
// as noise, because it was keyed to the *configured* 15-minute cron rather
// than what GitHub actually delivers. Thresholds now come from measured
// snapshot gaps (see src/lib/trustState.js), so during healthy operation this
// stays silent and only speaks when something is genuinely wrong.
//
// `fetchedAt` was already being passed in by Dashboard and ignored.
export default function StaleDataBanner({ fetchedAt = null, language = 'en' }) {
  const [offline, setOffline] = useState(
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  );
  // Re-evaluate on a timer so a page left open crosses into stale on its own.
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const goOffline = () => setOffline(true);
    const goOnline = () => setOffline(false);
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    const tick = setInterval(() => setNow(Date.now()), 60_000);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
      clearInterval(tick);
    };
  }, []);

  const en = language === 'en';

  if (offline) {
    return (
      <div
        className="flex items-center gap-2 rounded-lg border border-red-300 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300 px-3 py-2 text-xs mb-3"
        role="status"
        aria-live="polite"
      >
        <WifiOff className="w-4 h-4 shrink-0" />
        <span>
          {en ? "You're offline — showing cached data." : 'Sin conexión — mostrando datos en caché.'}
        </span>
      </div>
    );
  }

  const { state, age } = freshnessOf(fetchedAt, now);
  if (state !== FRESHNESS.STALE) return null;

  const when = new Date(fetchedAt).toLocaleString(en ? 'en-US' : 'es-MX', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  return (
    <div
      className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200 px-3 py-2 text-xs mb-3"
      role="status"
      aria-live="polite"
    >
      <Clock className="w-4 h-4 shrink-0 mt-px" />
      <span>
        {en ? (
          <>
            These wait times are <strong>{formatAge(age, language)}</strong> and may not reflect the
            border right now. Last update {when}, from U.S. Customs and Border Protection.
          </>
        ) : (
          <>
            Estos tiempos son de <strong>{formatAge(age, language)}</strong> y podrían no reflejar la
            frontera ahora. Última actualización {when}, de la Aduana y Protección Fronteriza de
            EE. UU.
          </>
        )}
      </span>
    </div>
  );
}
