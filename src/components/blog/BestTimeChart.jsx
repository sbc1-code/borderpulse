import { useEffect, useState } from 'react';
import { useLang } from '@/lib/LangContext';

const DAYS = {
  en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  es: ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'],
};

const STRINGS = {
  en: {
    noData: (slug) => `No aggregate data available for ${slug}.`,
    loading: 'Loading 30 day pattern...',
    cell: (day, hour, val) => `${day} ${hour}: ${val} min`,
    caption: 'Median northbound wait by hour and day, last 30 days. Source:',
    sourceLabel: 'U.S. Customs and Border Protection',
    legendQuick: 'Quick (under 30m)',
    legendTypical: 'Typical (30 to 60m)',
    legendHeavy: 'Heavy (60m+)',
    legendNoData: 'Not enough data',
  },
  es: {
    noData: (slug) => `No hay datos agregados para ${slug}.`,
    loading: 'Cargando el patrón de los últimos 30 días...',
    cell: (day, hour, val) => `${day} ${hour}: ${val} min`,
    caption: 'Mediana de espera hacia EE.UU. por hora y día, últimos 30 días. Fuente:',
    sourceLabel: 'U.S. Customs and Border Protection',
    legendQuick: 'Rápido (menos de 30m)',
    legendTypical: 'Típico (30 a 60m)',
    legendHeavy: 'Pesado (60m+)',
    legendNoData: 'Datos insuficientes',
  },
};

function formatHour12(h) {
  const suffix = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}${suffix}`;
}

// Compact AM/PM label for tight chart cells: "12a", "1a", "12p", "1p", etc.
function formatHourCompact(h) {
  const h12 = h % 12 || 12;
  return `${h12}${h < 12 ? 'a' : 'p'}`;
}

// Three-tier semantic color for the heatmap. Matches the per-hour bar
// scheme used in BestTime.jsx and the heatmap on /crossing/:slug so the
// visual language is consistent across surfaces. Lay readers should be
// able to skim and see green = quick without reading the legend.
function colorFor(val) {
  if (val == null) return 'rgb(241 245 249)'; // slate-100
  if (val < 30) return 'rgb(16 185 129)';     // emerald-500 — quick
  if (val < 60) return 'rgb(245 158 11)';     // amber-500 — typical
  return 'rgb(244 63 94)';                    // rose-500 — heavy
}

export default function BestTimeChart({ slug, title }) {
  const lang = useLang();
  const days = DAYS[lang] || DAYS.en;
  const t = STRINGS[lang] || STRINGS.en;
  const [agg, setAgg] = useState(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    if (!slug) return;
    fetch(`/data/aggregates/${slug}.json`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) setErr(true);
        else setAgg(d);
      })
      .catch(() => setErr(true));
  }, [slug]);

  if (err) {
    return (
      <div className="not-prose my-6 p-4 text-sm text-slate-500 border border-slate-200 dark:border-gray-700 rounded">
        {t.noData(slug)}
      </div>
    );
  }
  if (!agg) {
    return (
      <div className="not-prose my-6 p-4 text-sm text-slate-500 border border-slate-200 dark:border-gray-700 rounded">
        {t.loading}
      </div>
    );
  }

  const grid = {};
  for (const slot of agg.by_hour || []) {
    grid[`${slot.day}-${slot.hour}`] = slot.median;
  }

  return (
    <figure className="not-prose my-6">
      {title && (
        <figcaption className="text-xs uppercase tracking-wide text-slate-500 mb-2">
          {title}
        </figcaption>
      )}
      <div className="overflow-x-auto rounded border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-3">
        <table className="text-[10px] tabular-nums">
          <thead>
            <tr>
              <th className="w-10"></th>
              {Array.from({ length: 24 }, (_, h) => (
                <th key={h} className="px-0.5 py-1 text-slate-500 font-normal text-center">
                  {h % 2 === 0 ? formatHourCompact(h) : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {days.map((day, di) => (
              <tr key={day}>
                <th className="pr-2 py-0.5 text-right text-slate-500 font-normal">{day}</th>
                {Array.from({ length: 24 }, (_, h) => {
                  const v = grid[`${di}-${h}`];
                  return (
                    <td key={h} className="px-0.5 py-0.5">
                      <div
                        className="w-5 h-5 rounded-sm"
                        style={{ background: colorFor(v) }}
                        title={v == null ? '—' : t.cell(days[di], formatHour12(h), v)}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-2 text-[11px] text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded" style={{ background: 'rgb(16 185 129)' }} />
          {t.legendQuick}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded" style={{ background: 'rgb(245 158 11)' }} />
          {t.legendTypical}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded" style={{ background: 'rgb(244 63 94)' }} />
          {t.legendHeavy}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded bg-slate-200 dark:bg-gray-700" />
          {t.legendNoData}
        </span>
      </div>
      <figcaption className="text-xs text-slate-500 mt-2">
        {t.caption}{' '}
        <a
          href="https://bwt.cbp.gov/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          {t.sourceLabel}
        </a>
        .
      </figcaption>
    </figure>
  );
}
