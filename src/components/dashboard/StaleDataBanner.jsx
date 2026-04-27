import { useState, useEffect } from 'react';
import { WifiOff, Clock } from 'lucide-react';

const STALE_THRESHOLD_MS = 20 * 60 * 1000; // 20 min — data refreshes every 15

export default function StaleDataBanner({ fetchedAt, language = 'en' }) {
  const [offline, setOffline] = useState(!navigator.onLine);
  const [stale, setStale] = useState(false);

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

  useEffect(() => {
    if (!fetchedAt) return;
    const check = () => {
      const age = Date.now() - new Date(fetchedAt).getTime();
      setStale(age > STALE_THRESHOLD_MS);
    };
    check();
    const id = setInterval(check, 30_000);
    return () => clearInterval(id);
  }, [fetchedAt]);

  if (!offline && !stale) return null;

  const icon = offline
    ? <WifiOff className="w-4 h-4 shrink-0" />
    : <Clock className="w-4 h-4 shrink-0" />;

  const msg = offline
    ? (language === 'en'
      ? 'You\'re offline — showing cached data.'
      : 'Sin conexión — mostrando datos en caché.')
    : (language === 'en'
      ? 'Data may be stale — last update was over 20 minutes ago.'
      : 'Datos posiblemente desactualizados — última actualización hace más de 20 minutos.');

  const colors = offline
    ? 'border-red-300 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300'
    : 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300';

  return (
    <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs mb-3 ${colors}`}
         role="status" aria-live="polite">
      {icon}
      <span>{msg}</span>
    </div>
  );
}
