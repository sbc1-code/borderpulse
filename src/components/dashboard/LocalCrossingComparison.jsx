import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { LOCAL_LANES, corridorFor, localComparison } from '@/lib/corridors';
import { reportTimeLabel, freshnessOf, fetchLabel } from '@/lib/trustState';
import { camerasFor } from '@/lib/cameras';
import { crossingDisplayName } from '@/lib/crossingNames';

export default function LocalCrossingComparison({ crossings, corridorId, portToSlug, fetchedAt, language }) {
  const [lane, setLane] = useState('passenger_standard');
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);
  const corridor = corridorFor(corridorId);
  if (!corridor) return null;
  const es = language === 'es';
  const laneLabel = LOCAL_LANES.find(l => l.key === lane);
  const unavailable = {
    port_closed: es ? 'Cruce cerrado' : 'Crossing closed',
    outside_hours: es ? 'Fuera del horario' : 'Outside posted hours',
    hours_unknown: es ? 'Horario sin confirmar' : 'Hours unconfirmed',
    lane_closed: es ? 'Carril cerrado' : 'Lane closed',
    no_report: es ? `Sin reporte: ${laneLabel.es}` : `No ${laneLabel.en.toLowerCase()} report`,
  };
  const { rows, shortest } = localComparison(crossings, corridorId, lane, fetchedAt, now);
  const freshness = freshnessOf(fetchedAt, now);
  return (
    <section className="mb-5 rounded-xl border border-emerald-200 bg-white p-4 dark:border-emerald-900 dark:bg-gray-900 sm:p-5" aria-label={es ? 'Comparación local' : 'Local comparison'}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{corridor.name}</h2>
        <label className="text-xs font-medium text-slate-600 dark:text-slate-300">{es ? 'Tu carril' : 'Your lane'}
          <select value={lane} onChange={e => setLane(e.target.value)} className="ml-2 min-h-11 max-w-full rounded-lg border border-slate-300 bg-white px-2 text-sm text-slate-900 dark:border-gray-600 dark:bg-gray-900 dark:text-white">
            {LOCAL_LANES.map(l => <option key={l.key} value={l.key}>{es ? l.es : l.en}</option>)}
          </select>
        </label>
      </div>
      {lane === 'passenger_sentri' && <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">{es ? 'Solo compara SENTRI si cumples los requisitos de ese carril.' : 'Compare SENTRI only if you meet that lane’s requirements.'}</p>}
      {lane === 'passenger_ready' && <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">{es ? 'Ready Lane requiere documentos elegibles; verifica los requisitos con CBP.' : 'Ready Lane requires eligible documents; check the requirements with CBP.'}</p>}
      <p className="mt-3 text-sm font-medium text-emerald-800 dark:text-emerald-300" data-testid="local-comparison-summary">
        {shortest ? (es ? `Menor espera reportada entre los cruces comparables: ${crossingDisplayName(shortest.crossing, language)}, ${shortest.wait} min.` : `Shortest reported wait among comparable crossings: ${crossingDisplayName(shortest.crossing, language)}, ${shortest.wait} min.`)
          : (es ? 'Sin una comparación de menor espera disponible. Revisa los reportes y horarios de cada cruce.' : 'No shortest-wait comparison available. Check each crossing’s reports and hours.')}
      </p>
      <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">{es ? 'Hacia EE. UU. · mismo tipo de carril. Considera el trayecto adicional, tu destino y los requisitos. Estas cifras no comparan el tiempo total del viaje.' : 'Northbound · same lane type. Consider extra driving, your destination and eligibility. These figures do not compare total trip time.'}</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map(({ crossing, wait, reason }) => <div key={crossing.port_number} className="min-w-0 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-gray-700 dark:bg-gray-800">
          <Link to={`/crossing/${portToSlug[crossing.port_number]}/`} className="inline-flex min-h-11 items-center text-sm font-medium text-slate-900 underline dark:text-white">{crossingDisplayName(crossing, language)}</Link>
          <p className="text-xl font-semibold tabular-nums text-slate-900 dark:text-white">{wait == null ? unavailable[reason] : `${wait} min`}</p>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">{crossing.hours || (es ? 'Horario no disponible' : 'Hours unavailable')}</p>
          <p className="mt-1 break-words text-xs text-slate-600 dark:text-slate-400">{reportTimeLabel(crossing.lanes?.[lane]?.update_time, language)}</p>
          {camerasFor(crossing.port_number).length > 0 && <Link to={`/crossing/${portToSlug[crossing.port_number]}/#cameras`} className="inline-flex min-h-11 items-center text-xs text-emerald-700 underline dark:text-emerald-400">{es ? 'Ver cámaras' : 'View cameras'}</Link>}
        </div>)}
      </div>
      <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">{fetchLabel(freshness.state, freshness.age, language)}{es ? '. Cada carril puede tener una hora de reporte distinta. Cerrados, sin horario verificable o sin reporte quedan fuera de la comparación.' : '. Lane report times may differ. Closed crossings, unverifiable hours and missing reports are excluded from the comparison.'}</p>
    </section>
  );
}
