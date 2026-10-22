import React, { useEffect, useState } from 'react';
import BorderLine from './BorderLine';
import CommuterSnapshot from './CommuterSnapshot';
import { walkDriveFreshness } from '@/lib/walkDriveFreshness';
import { fetchLabel } from '@/lib/trustState';

export default function DashboardSummary({ direction, regionLabel, fetchedAt, ...props }) {
  const [offline, setOffline] = useState(() => !navigator.onLine);
  const [, tick] = useState(0);
  useEffect(() => {
    const network = () => setOffline(!navigator.onLine);
    const timer = setInterval(() => tick(n => n + 1), 60_000);
    window.addEventListener('online', network);
    window.addEventListener('offline', network);
    return () => {
      clearInterval(timer);
      window.removeEventListener('online', network);
      window.removeEventListener('offline', network);
    };
  }, []);
  // Read the clock on every render: a new response must not be judged against
  // the previous minute's timer value, including after a delayed chunk load.
  const freshness = walkDriveFreshness(fetchedAt);
  const trusted = freshness.usable && !offline;
  const en = props.language === 'en';
  const timestamp = typeof fetchedAt === 'string' && Number.isFinite(Date.parse(fetchedAt))
    ? new Date(fetchedAt).toLocaleString(en ? 'en-US' : 'es-MX', { timeZoneName: 'short' })
    : null;
  return (
    <div data-testid="dashboard-summary" data-trusted={trusted}>
      <div className="py-3 text-sm" data-testid="summary-freshness">
        <p role="status">{!trusted && (offline
          ? (en ? 'Offline. Reported values are retained for reference.' : 'Sin conexión. Conservamos los valores reportados como referencia.')
          : (en ? 'Current conditions cannot be verified. Reported values are retained for reference.' : 'No se pueden verificar las condiciones actuales. Conservamos los valores reportados como referencia.'))}</p>
        <p>{fetchLabel(freshness.state, freshness.age, props.language)}{timestamp && <> · <time dateTime={fetchedAt}>{timestamp}</time></>}</p>
      </div>
      <CommuterSnapshot {...props} trusted={trusted} selectedDirection={direction} regionLabel={regionLabel} />
      <BorderLine {...props} trusted={trusted} direction={direction} />
    </div>
  );
}
