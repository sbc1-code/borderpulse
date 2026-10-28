import React from 'react';
import { Clock3 } from 'lucide-react';
import { historicalPatternFor } from '@/lib/historicalPattern';
import { getPortTimezone } from '@/components/utils/crossingMeta';

const DAYS = {
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  es: ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'],
};

export default function HistoricalPattern({ feed, slug, crossing, language }) {
  const pattern = historicalPatternFor(feed, slug);
  if (!pattern) return null;
  const es = language === 'es';
  const verified = pattern.state === 'historical';
  const locale = es ? 'es-MX' : 'en-US';
  const timeZone = getPortTimezone(crossing);
  const dateLabel = stamp => new Date(stamp).toLocaleString(locale, {
    timeZone, year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
  });
  const day = DAYS[es ? 'es' : 'en'][pattern.day];
  // Format the port-local bucket's clock number without converting its hour.
  const hour = verified ? new Intl.DateTimeFormat(locale, { hour: 'numeric', hour12: true, timeZone: 'UTC' })
    .format(new Date(Date.UTC(2000, 0, 1, pattern.hour))) : null;
  const sampleLabel = es ? (pattern.samples === 1 ? 'muestra' : 'muestras') : (pattern.samples === 1 ? 'sample' : 'samples');
  const summary = !verified ? null : pattern.type === 'sunday_spike'
    ? (es
      ? `En la muestra de 30 días, el pico del domingo tiene una mediana de ${pattern.median} min a las ${hour}, frente a la mediana general de ${pattern.baseline} min (${pattern.samples} ${sampleLabel}).`
      : `In the 30-day sample, Sunday's evening peak has a median of ${pattern.median} min at ${hour}, compared with the overall median of ${pattern.baseline} min (${pattern.samples} ${sampleLabel}).`)
    : (es
      ? `En la muestra de 30 días, la hora con menor mediana del ${day} es a las ${hour}: ${pattern.median} min, frente a la mediana general de ${pattern.baseline} min (${pattern.samples} ${sampleLabel}).`
      : `In the 30-day sample, ${day}'s lightest sampled hour is ${hour}: median ${pattern.median} min, compared with the overall median of ${pattern.baseline} min (${pattern.samples} ${sampleLabel}).`);

  return (
    <section data-testid="historical-pattern" aria-labelledby="historical-pattern-title" className="mb-6 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:p-4 dark:border-gray-700 dark:bg-gray-900">
      <div className="flex items-start gap-2">
        <Clock3 aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-slate-600 dark:text-slate-300" />
        <div className="min-w-0">
          <h2 id="historical-pattern-title" className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {es ? 'Patrón histórico de espera' : 'Historical wait pattern'}
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-slate-800 dark:text-slate-200">
            {summary || (es
              ? 'No se puede verificar este patrón con sus datos de origen. Consulta los últimos reportes por carril de arriba.'
              : 'This pattern cannot be verified from its source data. Check the latest lane reports above.')}
          </p>
          {verified && <>
            <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
              {es ? 'Auto estándar. Resumen histórico, no una espera en vivo ni un pronóstico. Consulta los últimos reportes de arriba.' : 'Standard passenger lane. Historical summary, not a live wait or a forecast. Check the latest reports above.'}
            </p>
            <dl className="mt-2 text-xs text-slate-600 dark:text-slate-300">
              <div><dt className="inline">{es ? 'Datos consultados: ' : 'Source snapshot: '}</dt><dd className="inline"><time dateTime={pattern.snapshotAt}>{dateLabel(pattern.snapshotAt)}</time></dd></div>
              <div><dt className="inline">{es ? 'Patrón generado: ' : 'Pattern generated: '}</dt><dd className="inline"><time dateTime={pattern.generatedAt}>{dateLabel(pattern.generatedAt)}</time></dd></div>
            </dl>
          </>}
          <a href="https://bwt.cbp.gov/" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center text-xs text-slate-700 underline dark:text-slate-300">
            {es ? 'Verificar en bwt.cbp.gov' : 'Verify on bwt.cbp.gov'}
          </a>
        </div>
      </div>
    </section>
  );
}
