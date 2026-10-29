import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Database,
  Map as MapIcon,
  Clock,
  LineChart,
  Calendar,
  AlertTriangle,
  EyeOff,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { updatePageMeta, resetPageMeta } from '@/lib/seo';

// Review of this explanation, not freshness of any report.
const LAST_REVIEWED = '2026-10-29';

const COPY = {
  en: {
    backLabel: 'All crossings',
    title: 'Methodology',
    lastReviewed: 'Last reviewed',
    sections: [
      {
        icon: Database,
        title: 'Northbound waits come from CBP directly.',
        body: (
          <>
            <p>
              U.S. Customs and Border Protection publishes a live wait-time feed at{' '}
              <a href="https://bwt.cbp.gov/" target="_blank" rel="noopener noreferrer" className="underline">bwt.cbp.gov</a>.
              Officers at each port update the conditions; the feed exposes the latest reported delay,
              lanes open, and operational status per lane type (standard, SENTRI, Ready Lane,
              pedestrian, commercial).
            </p>
            <p>
              Border Pulse re-fetches that feed on a schedule and stores each snapshot. We do not
              change the reported lane waits. Historical medians and comparisons are derived from stored reports; they are not new CBP measurements.
            </p>
          </>
        ),
      },
      {
        icon: MapIcon,
        title: 'Southbound estimates are paused.',
        body: (
          <>
            <p>
              CBP does not publish southbound wait times. Border Pulse previously estimated them from
              Google Maps drive-time deltas, but that paid feed is disabled and the live product now
              presents official northbound CBP data only.
            </p>
            <p>
              Retained historical southbound files are not presented as current conditions.
            </p>
          </>
        ),
      },
      {
        icon: Clock,
        title: 'Data refreshes on a scheduled job.',
        body: (
          <>
            <p>
              The dashboard requests the latest available BorderPulse snapshot. If the current-data
              endpoint is unavailable, it can use a dated bundled snapshot. The original retrieval
              time is retained; refreshing a page does not make an old report new.
            </p>
            <p>
              “Fetched” describes the snapshot retrieval. “CBP reported” is the separate clock for a
              lane and may be older. Current waits and historical files update separately and can
              have different source dates. Read the displayed age, stale warnings and unavailable states.
            </p>
          </>
        ),
      },
      {
        icon: LineChart,
        title: 'We use the median, not the mean.',
        body: (
          <>
            <p>
              When a page says "typical wait" or "median wait," it is the median of stored samples —
              the middle observation when the samples are sorted — not the arithmetic mean.
            </p>
            <p>
              Synthetic example, not measured crossing data: <code className="rounded bg-slate-100 dark:bg-gray-800 px-1 py-0.5 text-[12px]">[55, 58, 60, 60, 61, 62, 65, 70, 75, 240]</code>.
              The mean is 80.6 minutes; the median is 61.5. Published aggregate medians are rounded
              to whole minutes. A median describes the stored sample; it does not predict your next wait.
            </p>
          </>
        ),
      },
      {
        icon: Calendar,
        title: '"30-day rolling" is the lookback window.',
        body: (
          <>
            <p>
              Historical patterns on <code className="rounded bg-slate-100 dark:bg-gray-800 px-1 py-0.5 text-[12px]">/crossing/&lt;slug&gt;</code>{' '}
              and <code className="rounded bg-slate-100 dark:bg-gray-800 px-1 py-0.5 text-[12px]">/best-time/&lt;slug&gt;</code> page are computed across the last 30 days of stored snapshots,
              recomputed when historical files are published. The source dates and sample coverage
              can differ from current reports. A 30-day window does not guarantee complete daily coverage.
            </p>
            <p>
              Sample coverage varies by crossing, weekday and hour. Each cell can pool observations
              from a window centred on that hour,
              widened to at most two hours either side, and only as far as it needs to go. Cells with
              enough observations of their own keep their exact hourly value. Hover any cell to see
              the sample count and the span it was drawn from.
            </p>
            <p>
              Pooling stays within the same local weekday. Cells with fewer than five observations
              remain unavailable. The lightest-hour answer describes the full local weekday,
              including hours already passed. It is not advice for the hours remaining today or a forecast.
            </p>
            <p>
              Best-time recommendations are also limited to the crossing's official operating
              hours from CBP. The chart may retain historical observations outside those hours for
              transparency, but a closed or ambiguous hour is never selected as the recommended
              time. When CBP does not provide an unambiguous schedule, the page shows the pattern
              without publishing a best-hour answer.
            </p>
          </>
        ),
      },
      {
        icon: AlertTriangle,
        title: 'Callouts describe stored historical patterns.',
        body: (
          <>
            <p>
              Historical callouts compare sampled weekday/hour medians with the crossing’s overall
              median. They show source-snapshot and pattern-generation dates. They are not live
              anomaly alerts or forecasts. If source evidence cannot be verified, the page says so.
            </p>
            <p>
              On Standard passenger cards, “vs. typical” uses a matching weekday/hour cell with
              enough samples, or the crossing’s overall median if that cell is sparse. It is not
              shown for another selected lane. Check the latest lane reports before leaving.
            </p>
          </>
        ),
      },
      {
        icon: EyeOff,
        title: 'What we don\'t model.',
        body: (
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>Lane closures and construction notices</strong> beyond what CBP publishes. CBP
              includes a free-text <code className="rounded bg-slate-100 dark:bg-gray-800 px-1 py-0.5 text-[11px]">construction_notice</code> field; we show it
              verbatim and do not try to predict its impact.
            </li>
            <li>
              <strong>Commercial broker queue position.</strong> CBP publishes commercial lane delay
              and lanes-open count, but not which broker accounts are ahead of yours. That data is not
              in the public feed.
            </li>
            <li>
              <strong>Holiday or special-event multipliers.</strong> Holidays change CBP staffing and
              traffic in ways the 30-day median cannot anticipate. Posted hours and per-port
              advisories take precedence on those days.
            </li>
            <li>
              <strong>First-time-crosser advisories.</strong> Travel safety guidance is the State
              Department's job. We link the canonical advisory; we do not summarize or paraphrase it.
            </li>
          </ul>
        ),
      },
      {
        icon: ExternalLink,
        title: 'Sources.',
        body: (
          <ul className="list-disc pl-5 space-y-1.5">
            <li><a href="https://bwt.cbp.gov/" target="_blank" rel="noopener noreferrer" className="underline">CBP Border Wait Times feed</a>: bwt.cbp.gov</li>
            <li><a href="https://www.cbp.gov/travel/trusted-traveler-programs/sentri" target="_blank" rel="noopener noreferrer" className="underline">CBP SENTRI program</a></li>
            <li><a href="https://www.cbp.gov/travel/clearing-customs/ready-lanes" target="_blank" rel="noopener noreferrer" className="underline">CBP Ready Lane program</a></li>
            <li><a href="https://travel.state.gov/en/international-travel/travel-advisories/mexico.html" target="_blank" rel="noopener noreferrer" className="underline">U.S. Department of State Mexico travel advisory</a></li>

            <li><a href="/data/crossings.json" className="underline">Bundled JSON snapshot; check its fetched_at date</a></li>
          </ul>
        ),
      },
    ],
  },
  es: {
    backLabel: 'Todos los cruces',
    title: 'Metodología',
    lastReviewed: 'Última revisión',
    sections: [
      {
        icon: Database,
        title: 'Los tiempos hacia EE.UU. vienen de CBP directamente.',
        body: (
          <>
            <p>
              U.S. Customs and Border Protection publica un feed en vivo de tiempos de espera en{' '}
              <a href="https://bwt.cbp.gov/" target="_blank" rel="noopener noreferrer" className="underline">bwt.cbp.gov</a>.
              Los oficiales en cada puerto actualizan las condiciones; el feed expone la demora más
              reciente, los carriles abiertos y el estatus operativo por tipo de carril (estándar,
              SENTRI, Ready Lane, peatonal, comercial).
            </p>
            <p>
              Border Pulse consulta ese feed con regularidad y guarda cada snapshot. No
              modificamos las esperas reportadas por carril. Las medianas y comparaciones históricas se calculan con reportes guardados; no son mediciones nuevas de CBP.
            </p>
          </>
        ),
      },
      {
        icon: MapIcon,
        title: 'Las estimaciones hacia México están pausadas.',
        body: (
          <>
            <p>
              CBP no publica tiempos de espera hacia México. Border Pulse antes los estimaba con
              diferencias de tiempos de manejo de Google Maps, pero ese feed de pago está desactivado
              y el producto en vivo ahora presenta solo datos oficiales de CBP hacia EE.UU.
            </p>
            <p>
              Los archivos históricos retenidos no se presentan como condiciones actuales.
            </p>
          </>
        ),
      },
      {
        icon: Clock,
        title: 'Los datos se refrescan con un trabajo programado.',
        body: (
          <>
            <p>
              El panel solicita la versión más reciente disponible en BorderPulse. Si el servicio de
              datos actuales no responde, puede usar una copia incluida con el sitio. Conserva su
              hora de consulta original; recargar la página no convierte un reporte viejo en uno nuevo.
            </p>
            <p>
              “Datos consultados” indica cuándo se obtuvo esa versión. “CBP reportó” es la hora
              independiente de cada carril y puede ser anterior. Las esperas actuales y los archivos
              históricos se actualizan por separado. Revisa sus fechas, antigüedad y estados sin datos.
            </p>
          </>
        ),
      },
      {
        icon: LineChart,
        title: 'Usamos la mediana, no el promedio.',
        body: (
          <>
            <p>
              Cuando una página dice "espera típica" o "mediana", es la mediana de las muestras
              guardadas — la observación de en medio cuando se ordenan — no el promedio aritmético.
            </p>
            <p>
              Ejemplo sintético, no datos medidos de un cruce: <code className="rounded bg-slate-100 dark:bg-gray-800 px-1 py-0.5 text-[12px]">[55, 58, 60, 60, 61, 62, 65, 70, 75, 240]</code>.
              El promedio es 80.6 minutos; la mediana es 61.5. Las medianas publicadas se redondean
              a minutos enteros. Describen la muestra guardada; no predicen tu próxima espera.
            </p>
          </>
        ),
      },
      {
        icon: Calendar,
        title: '"30 días rotativos" es la ventana de retroceso.',
        body: (
          <>
            <p>
              Los patrones históricos en las páginas{' '}
              <code className="rounded bg-slate-100 dark:bg-gray-800 px-1 py-0.5 text-[12px]">/crossing/&lt;slug&gt;</code>{' '}
              y <code className="rounded bg-slate-100 dark:bg-gray-800 px-1 py-0.5 text-[12px]">/best-time/&lt;slug&gt;</code> se calculan sobre los últimos 30 días de snapshots guardados, recalculados al publicar los archivos históricos. Las fechas de origen y la cobertura
              pueden diferir de los reportes actuales. Esa ventana no garantiza cobertura diaria completa.
            </p>
            <p>
              La cobertura varía por cruce, día y hora. Cada celda puede reunir observaciones
              de una ventana centrada en esa hora, ampliada como máximo dos horas hacia
              cada lado, y solo lo necesario: las celdas con suficientes observaciones propias
              conservan su valor exacto. Pasa el cursor sobre cualquier celda para ver el número de
              muestras y el rango del que salió.
            </p>
            <p>
              Las muestras se agrupan dentro del mismo día local de la semana. Las celdas con menos
              de cinco observaciones siguen sin valor disponible. La menor mediana describe el día
              completo, incluidas horas que ya pasaron; no aconseja sobre el resto de hoy ni es un pronóstico.
            </p>
          </>
        ),
      },
      {
        icon: AlertTriangle,
        title: 'Los recuadros describen patrones históricos guardados.',
        body: (
          <>
            <p>
              Los recuadros comparan medianas por día y hora con la mediana general del propio cruce.
              Muestran las fechas de consulta y generación del patrón. No son alertas en vivo ni
              pronósticos. Si la evidencia de origen no se puede verificar, la página lo indica.
            </p>
            <p>
              En las tarjetas de auto estándar, “vs. lo normal” usa la celda del mismo día y hora
              con suficientes muestras, o la mediana general si esa celda tiene pocos datos. No se
              muestra al elegir otro carril. Revisa los reportes más recientes antes de salir.
            </p>
          </>
        ),
      },
      {
        icon: EyeOff,
        title: 'Lo que no modelamos.',
        body: (
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>Cierres de carriles y avisos de obra</strong> más allá de lo que CBP publica.
              CBP incluye un campo libre <code className="rounded bg-slate-100 dark:bg-gray-800 px-1 py-0.5 text-[11px]">construction_notice</code>;
              lo mostramos textualmente y no tratamos de predecir su impacto.
            </li>
            <li>
              <strong>Posición en cola para brokers comerciales.</strong> CBP publica la demora del
              carril comercial y carriles abiertos, pero no qué cuentas de broker están adelante de la
              tuya. Ese dato no está en el feed público.
            </li>
            <li>
              <strong>Multiplicadores por feriados o eventos especiales.</strong> Los feriados cambian
              la dotación de CBP y el tráfico de formas que la mediana de 30 días no puede anticipar.
              Los horarios y avisos por puerto tienen prioridad esos días.
            </li>
            <li>
              <strong>Guías para quien cruza por primera vez.</strong> La orientación de seguridad de
              viaje es responsabilidad del Departamento de Estado. Enlazamos el aviso canónico; no lo
              resumimos ni parafraseamos.
            </li>
          </ul>
        ),
      },
      {
        icon: ExternalLink,
        title: 'Fuentes.',
        body: (
          <ul className="list-disc pl-5 space-y-1.5">
            <li><a href="https://bwt.cbp.gov/" target="_blank" rel="noopener noreferrer" className="underline">Feed de Border Wait Times de CBP</a>: bwt.cbp.gov</li>
            <li><a href="https://www.cbp.gov/travel/trusted-traveler-programs/sentri" target="_blank" rel="noopener noreferrer" className="underline">Programa SENTRI de CBP</a></li>
            <li><a href="https://www.cbp.gov/travel/clearing-customs/ready-lanes" target="_blank" rel="noopener noreferrer" className="underline">Programa Ready Lane de CBP</a></li>
            <li><a href="https://travel.state.gov/en/international-travel/travel-advisories/mexico.html" target="_blank" rel="noopener noreferrer" className="underline">Departamento de Estado de EE.UU. Aviso de viaje a México</a></li>

            <li><a href="/data/crossings.json" className="underline">Copia JSON incluida con el sitio; revisa su fecha fetched_at</a></li>
          </ul>
        ),
      },
    ],
  },
};

export default function Methodology({ lang = 'en' }) {
  const t = COPY[lang] || COPY.en;

  useEffect(() => {
    const title = lang === 'es'
      ? 'Metodología | Border Pulse'
      : 'Methodology | Border Pulse';
    const description = lang === 'es'
      ? 'Cómo Border Pulse convierte datos oficiales de CBP en los números que ves: fuentes, cadencia programada, mediana sobre promedio y ventana rotativa de 30 días.'
      : 'How Border Pulse turns official CBP data into the numbers you see: sources, scheduled refreshes, median over mean, and a 30-day rolling window.';
    const canonical = lang === 'es'
      ? 'https://borderpulse.com/metodologia/'
      : 'https://borderpulse.com/methodology/';
    updatePageMeta({
      title,
      description,
      ogTitle: title,
      ogDescription: description,
      ogUrl: canonical,
      canonical,
      lang,
    });
    return () => resetPageMeta();
  }, [lang]);

  return (
    <div className="p-3 sm:p-4 lg:p-6 max-w-[900px] mx-auto" lang={lang}>
      <div className="mb-3">
        <Button asChild variant="ghost" size="sm" className="gap-1 min-h-11 -ml-2">
          <Link to="/">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="text-xs">{t.backLabel}</span>
          </Link>
        </Button>
      </div>

      <header className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
          {t.title}
        </h1>
      </header>

      <div className="space-y-8">
        {t.sections.map(({ icon: Icon, title, body }) => (
          <section key={title}>
            <h2 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white mb-2 flex items-start gap-2">
              <Icon className="w-4 h-4 mt-1 text-emerald-600 shrink-0" />
              <span>{title}</span>
            </h2>
            <div className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed space-y-3 pl-6">
              {body}
            </div>
          </section>
        ))}
      </div>

      <footer className="mt-10 pt-3 border-t border-slate-200 dark:border-gray-700 text-xs text-slate-500 dark:text-slate-400">
        {t.lastReviewed} <time dateTime={LAST_REVIEWED}>{LAST_REVIEWED}</time>. {lang === 'es' ? 'Esta revisión del método no indica la actualidad de los reportes; revisa sus propias horas y fechas.' : 'This method review does not establish report freshness; check each report’s own clocks and dates.'}
      </footer>
    </div>
  );
}
