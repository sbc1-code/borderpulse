import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { standardPassengerWait } from '@/lib/standardPassengerWait';
import { FRESHNESS, freshnessOf, formatAge } from '@/lib/trustState';
import { track } from '@/lib/analytics';

export default function SanYsidroDecision({ sanYsidro, otayMesa, fetchedAt, language }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const es = language === 'es';
  const freshness = freshnessOf(fetchedAt, now);
  const timestamp = fetchedAt && freshness.state !== FRESHNESS.UNKNOWN
    ? new Date(fetchedAt).toLocaleString(es ? 'es-MX' : 'en-US', {
      timeZone: 'America/Los_Angeles', dateStyle: 'medium', timeStyle: 'short',
    })
    : null;
  const values = [
    { name: 'San Ysidro', wait: standardPassengerWait(sanYsidro) },
    { name: 'Otay Mesa', wait: standardPassengerWait(otayMesa) },
  ];

  return (
    <section className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900 sm:p-5" aria-labelledby="san-ysidro-decision-title">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 id="san-ysidro-decision-title" className="text-base font-semibold text-slate-900 dark:text-white">
          {es ? 'Compara San Ysidro y Otay Mesa' : 'Compare San Ysidro and Otay Mesa'}
        </h2>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {es ? 'Hacia EE. UU. · auto, carril estándar' : 'Northbound · standard passenger lane'}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:gap-3">
        {values.map(({ name, wait }) => (
          <div key={name} className="min-w-0 rounded-lg bg-slate-50 px-3 py-3 dark:bg-gray-800">
            <p className="text-xs font-medium text-slate-600 dark:text-slate-300">{name}</p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-slate-900 dark:text-white sm:text-2xl">
              {wait == null ? (es ? 'Sin dato' : 'Unavailable') : `${wait} min`}
            </p>
          </div>
        ))}
      </div>
      <p className={`mt-3 text-xs ${freshness.state === FRESHNESS.STALE ? 'text-amber-700 dark:text-amber-400' : 'text-slate-500 dark:text-slate-400'}`}>
        {timestamp
          ? `${es ? 'Misma consulta de datos' : 'Same data snapshot'}: ${timestamp} PT · ${formatAge(freshness.age, language)}${freshness.state === FRESHNESS.STALE ? (es ? ' · datos desactualizados' : ' · stale data') : ''}`
          : (es ? 'Hora de los datos desconocida; verifica con CBP antes de salir.' : 'Data time unknown; check CBP before leaving.')}
      </p>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        {es ? 'Son esperas reportadas por CBP; los horarios de reporte de cada garita pueden variar. No incluyen el trayecto total.' : 'CBP-reported waits; each port may report at a different time. These do not include total trip time.'}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <Link
          to="/compare/san-ysidro-vs-otay-mesa/"
          onClick={() => track('compare-open', { slug: 'san-ysidro', source: 'decision-panel' })}
          className="inline-flex min-h-11 items-center gap-1 font-medium text-emerald-700 underline underline-offset-4 dark:text-emerald-400"
        >
          {es ? 'Ver comparación completa' : 'See the full comparison'} <ArrowRight className="h-4 w-4" />
        </Link>
        <Link to="/walk-or-drive/san-ysidro/" className="inline-flex min-h-11 items-center font-medium text-emerald-700 underline underline-offset-4 dark:text-emerald-400">
          {es ? '¿Cruzar a pie?' : 'Crossing on foot?'}
        </Link>
      </div>
    </section>
  );
}
