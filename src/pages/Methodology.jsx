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

const LAST_REVIEWED = '2026-05-16';

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
              modify the underlying numbers — every wait time on the site is what CBP last reported.
            </p>
          </>
        ),
      },
      {
        icon: MapIcon,
        title: 'Southbound is estimated, not measured.',
        body: (
          <>
            <p>
              CBP does not publish southbound wait times. Where Border Pulse shows a southbound
              number, it is derived from Google Maps drive-time deltas on the approach road versus a
              free-flow baseline for that segment. The number estimates queue delay, not the official
              inspection time, and only at crossings where the approach road has reliable map coverage.
            </p>
            <p>
              Southbound numbers are labeled as estimates everywhere they appear and should be treated
              as directional, not exact.
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
              A scheduled GitHub Action fetches the CBP feed and writes a new{' '}
              <code className="rounded bg-slate-100 dark:bg-gray-800 px-1 py-0.5 text-[12px]">/data/crossings.json</code>.
              GitHub's free cron can be delayed, so the site describes the cadence as regular
              rather than exact. We do not interpolate or smooth between refreshes.
            </p>
            <p>
              The same scheduled job rolls up snapshots into per-port aggregates and refreshes the
              public JSON files under{' '}
              <code className="rounded bg-slate-100 dark:bg-gray-800 px-1 py-0.5 text-[12px]">/data/</code>.
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
              Concrete example. Ten Sunday-evening observations at one port: <code className="rounded bg-slate-100 dark:bg-gray-800 px-1 py-0.5 text-[12px]">[55, 58, 60, 60, 61, 62, 65, 70, 75, 240]</code>.
              The mean is 81 minutes; the median is 61.5. A single 240-minute outlier moves the mean by
              20 minutes. It does not move the median. Median is closer to "what to expect on a normal
              Sunday."
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
              The historical patterns on every <code className="rounded bg-slate-100 dark:bg-gray-800 px-1 py-0.5 text-[12px]">/crossing/&lt;slug&gt;</code>{' '}
              and <code className="rounded bg-slate-100 dark:bg-gray-800 px-1 py-0.5 text-[12px]">/best-time/&lt;slug&gt;</code> page are computed across the last 30 days of stored snapshots,
              recomputed on every refresh. Yesterday's data is in; the data from 31 days ago is out.
              A holiday weekend three weeks ago is still in the window today; the same weekend will
              roll out next week.
            </p>
            <p>
              Some (day-of-week, hour) cells are sparse — a single observation, occasionally none.
              When a cell is empty, we fall back to the port's all-hours median rather than fabricate
              a number for that bucket.
            </p>
          </>
        ),
      },
      {
        icon: AlertTriangle,
        title: 'Anomaly callouts compare today to the port\'s own baseline.',
        body: (
          <>
            <p>
              A separate scheduled job compares each port's current hour-of-day pattern against its
              30-day median for the same (day-of-week, hour) cell. When the gap is large enough
              (configured per port), the port page renders an inline callout above the heatmap
              describing the surprise in plain language.
            </p>
            <p>
              Thresholds are tuned to surface real shifts, not normal day-to-day noise. The callout
              always links back to the official CBP page so you can verify in source.
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
            <li><a href="https://www.bts.gov/browse-statistical-products-and-data/border-crossing-data/border-crossingentry-data" target="_blank" rel="noopener noreferrer" className="underline">BTS Border Crossing/Entry Data</a>: annual port volume, used to weight network-wide aggregates</li>
            <li><a href="/data/crossings.json" className="underline">Current Border Pulse JSON snapshot</a></li>
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
              Border Pulse vuelve a jalar ese feed con una frecuencia fija y guarda cada snapshot. No
              modificamos los números — cada tiempo en el sitio es lo que CBP reportó por última vez.
            </p>
          </>
        ),
      },
      {
        icon: MapIcon,
        title: 'El sentido hacia México es estimado, no medido.',
        body: (
          <>
            <p>
              CBP no publica tiempos de espera hacia México. Donde Border Pulse muestra un número
              hacia el sur, se deriva de la diferencia de tiempos de manejo en Google Maps en el tramo
              de aproximación versus una línea base sin tráfico para ese tramo. El número estima la
              demora de la fila, no el tiempo oficial de inspección, y solo donde el tramo de
              aproximación tiene cobertura confiable en el mapa.
            </p>
            <p>
              Los números hacia México están etiquetados como estimaciones donde aparecen y deben
              tomarse como referencia, no como un valor exacto.
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
              Un GitHub Action programado jala el feed de CBP y escribe un
              nuevo{' '}
              <code className="rounded bg-slate-100 dark:bg-gray-800 px-1 py-0.5 text-[12px]">/data/crossings.json</code>.
              El cron gratuito de GitHub puede retrasarse, así que el sitio describe la cadencia
              como regular y no exacta. No interpolamos ni suavizamos entre refrescos.
            </p>
            <p>
              El mismo trabajo programado agrupa los snapshots en agregados por puerto y refresca los
              archivos JSON públicos bajo{' '}
              <code className="rounded bg-slate-100 dark:bg-gray-800 px-1 py-0.5 text-[12px]">/data/</code>.
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
              Ejemplo concreto. Diez observaciones de domingo por la tarde en un puerto: <code className="rounded bg-slate-100 dark:bg-gray-800 px-1 py-0.5 text-[12px]">[55, 58, 60, 60, 61, 62, 65, 70, 75, 240]</code>.
              El promedio es 81 minutos; la mediana es 61.5. Un outlier único de 240 minutos mueve el
              promedio 20 minutos. No mueve la mediana. La mediana se acerca más a "qué esperar en un
              domingo normal".
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
              Los patrones históricos en cada página{' '}
              <code className="rounded bg-slate-100 dark:bg-gray-800 px-1 py-0.5 text-[12px]">/crossing/&lt;slug&gt;</code>{' '}
              y <code className="rounded bg-slate-100 dark:bg-gray-800 px-1 py-0.5 text-[12px]">/best-time/&lt;slug&gt;</code> se calculan sobre los últimos 30 días de snapshots guardados, recalculados con
              cada refresco. Los datos de ayer entran; los de hace 31 días salen. Un fin de semana
              festivo de hace tres semanas sigue en la ventana hoy; ese mismo fin de semana saldrá la
              próxima semana.
            </p>
            <p>
              Algunas celdas (día de la semana, hora) están escasas — una sola observación, a veces
              ninguna. Cuando una celda está vacía, usamos la mediana general del puerto en lugar de
              inventar un número para ese bucket.
            </p>
          </>
        ),
      },
      {
        icon: AlertTriangle,
        title: 'Las alertas de anomalía comparan hoy con el patrón del propio puerto.',
        body: (
          <>
            <p>
              Un trabajo programado separado compara el patrón hora-por-hora actual de cada puerto
              contra su mediana de 30 días para la misma celda (día de la semana, hora). Cuando la
              diferencia es suficientemente grande (configurada por puerto), la página del puerto
              muestra una alerta inline arriba del heatmap describiendo la sorpresa en lenguaje plano.
            </p>
            <p>
              Los umbrales están afinados para resaltar cambios reales, no ruido diario. La alerta
              siempre enlaza a la página oficial de CBP para que verifiques en la fuente.
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
            <li><a href="https://www.bts.gov/browse-statistical-products-and-data/border-crossing-data/border-crossingentry-data" target="_blank" rel="noopener noreferrer" className="underline">BTS Border Crossing/Entry Data</a>: volumen anual por puerto, usado para ponderar agregados de la red</li>
            <li><a href="/data/crossings.json" className="underline">Snapshot JSON actual de Border Pulse</a></li>
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
      ? 'Cómo Border Pulse convierte datos de CBP y Google Maps en los números que ves en cada página: fuentes, cadencia programada, mediana sobre promedio, ventana rotativa de 30 días, y lo que deliberadamente no modelamos.'
      : 'How Border Pulse turns CBP and Google Maps data into the numbers on every page: sources, scheduled refreshes, median over mean, 30-day rolling window, and what we deliberately don\'t model.';
    const canonical = lang === 'es'
      ? 'https://borderpulse.com/metodologia'
      : 'https://borderpulse.com/methodology';
    updatePageMeta({
      title,
      description,
      ogTitle: title,
      ogDescription: description,
      ogUrl: canonical,
      canonical,
    });
    return () => resetPageMeta();
  }, [lang]);

  return (
    <div className="p-3 sm:p-4 lg:p-6 max-w-[900px] mx-auto" lang={lang}>
      <div className="mb-3">
        <Link to="/">
          <Button variant="ghost" size="sm" className="gap-1 h-8 -ml-2">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="text-xs">{t.backLabel}</span>
          </Button>
        </Link>
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
              <Icon className="w-4 h-4 mt-1 text-emerald-600 flex-shrink-0" />
              <span>{title}</span>
            </h2>
            <div className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed space-y-3 pl-6">
              {body}
            </div>
          </section>
        ))}
      </div>

      <footer className="mt-10 pt-3 border-t border-slate-200 dark:border-gray-700 text-xs text-slate-500 dark:text-slate-400">
        {t.lastReviewed} {LAST_REVIEWED}
      </footer>
    </div>
  );
}
