import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLang } from '@/lib/LangContext';

const STRINGS = {
  en: {
    loading: 'Loading the live ranking...',
    error: 'Ranking data is not available right now.',
    rank: '#',
    crossing: 'Crossing',
    typical: 'Typical wait',
    lightest: 'Lightest hour',
    min: 'min',
    caption: (n) => `Typical northbound wait, median over the last ${n} days. Source:`,
    source: 'U.S. Customs and Border Protection',
    updated: 'Updated',
    note: 'Ranked busiest to fastest. Crossings without enough recent CBP history are left out.',
  },
  es: {
    loading: 'Cargando la clasificación en vivo...',
    error: 'La clasificación no está disponible en este momento.',
    rank: '#',
    crossing: 'Cruce',
    typical: 'Espera típica',
    lightest: 'Hora más ligera',
    min: 'min',
    caption: (n) => `Espera típica hacia EE.UU., mediana de los últimos ${n} días. Fuente:`,
    source: 'U.S. Customs and Border Protection',
    updated: 'Actualizado',
    note: 'De más concurrido a más rápido. Se omiten los cruces sin suficiente historial reciente de CBP.',
  },
};

// Median-wait color scale: matches the 30/60 minute thresholds the site uses
// for typical (median) waits elsewhere.
function colorFor(val) {
  if (val == null) return 'rgb(148 163 184)'; // slate-400
  if (val < 30) return 'rgb(16 185 129)';     // emerald-500, quick
  if (val < 60) return 'rgb(245 158 11)';     // amber-500, typical
  return 'rgb(244 63 94)';                     // rose-500, heavy
}

function formatHour12(h, lang) {
  if (h == null) return '-';
  const suffix = h >= 12 ? (lang === 'es' ? 'p. m.' : 'PM') : (lang === 'es' ? 'a. m.' : 'AM');
  const h12 = h % 12 || 12;
  return `${h12} ${suffix}`;
}

function formatDate(iso, lang) {
  try {
    return new Date(iso).toLocaleDateString(lang === 'es' ? 'es-MX' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '';
  }
}

export default function CrossingRankings({ title }) {
  const lang = useLang();
  const t = STRINGS[lang] || STRINGS.en;
  const [data, setData] = useState(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    fetch('/data/rankings.json')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d || !Array.isArray(d.crossings)) setErr(true);
        else setData(d);
      })
      .catch(() => setErr(true));
  }, []);

  if (err) {
    return (
      <div className="not-prose my-6 p-4 text-sm text-slate-500 border border-slate-200 dark:border-gray-700 rounded">
        {t.error}
      </div>
    );
  }
  if (!data) {
    return (
      <div className="not-prose my-6 p-4 text-sm text-slate-500 border border-slate-200 dark:border-gray-700 rounded">
        {t.loading}
      </div>
    );
  }

  const rows = data.crossings;
  const maxMedian = Math.max(1, ...rows.map((c) => c.overall_median || 0));

  return (
    <figure className="not-prose my-6">
      {title && (
        <figcaption className="text-xs uppercase tracking-wide text-slate-500 mb-2">
          {title}
        </figcaption>
      )}
      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <table className="w-full text-sm tabular-nums">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-slate-500 border-b border-slate-200 dark:border-gray-700">
              <th className="py-2 pl-3 pr-2 font-medium w-8">{t.rank}</th>
              <th className="py-2 px-2 font-medium">{t.crossing}</th>
              <th className="py-2 px-2 font-medium">{t.typical}</th>
              <th className="py-2 px-2 font-medium hidden sm:table-cell">{t.lightest}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c, i) => (
              <tr
                key={c.slug}
                className="border-b border-slate-100 dark:border-gray-800 last:border-0 hover:bg-slate-50 dark:hover:bg-gray-800/40"
              >
                <td className="py-2 pl-3 pr-2 text-slate-400 font-medium">{i + 1}</td>
                <td className="py-2 px-2">
                  <Link
                    to={`/crossing/${c.slug}`}
                    className="text-emerald-700 dark:text-emerald-400 hover:underline font-medium"
                  >
                    {c.name}
                  </Link>
                  {c.state && <span className="text-slate-400 ml-1.5 text-xs">{c.state}</span>}
                </td>
                <td className="py-2 px-2">
                  <div className="flex items-center gap-2">
                    <span className="w-12 text-right font-semibold text-slate-900 dark:text-slate-100">
                      {c.overall_median} {t.min}
                    </span>
                    <span className="block flex-1 min-w-[40px] max-w-[120px] h-2 rounded-full bg-slate-100 dark:bg-gray-800 overflow-hidden">
                      <span
                        className="block h-full rounded-full"
                        style={{
                          width: `${Math.max(4, (c.overall_median / maxMedian) * 100)}%`,
                          background: colorFor(c.overall_median),
                        }}
                      />
                    </span>
                  </div>
                </td>
                <td className="py-2 px-2 text-slate-500 hidden sm:table-cell">
                  {formatHour12(c.best_hour, lang)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <figcaption className="text-xs text-slate-500 mt-2">
        {t.caption(data.lookback_days)}{' '}
        <a href="https://bwt.cbp.gov/" target="_blank" rel="noopener noreferrer" className="underline">
          {t.source}
        </a>
        . {data.generated_at && <span>{t.updated} {formatDate(data.generated_at, lang)}.</span>} {t.note}
      </figcaption>
    </figure>
  );
}
