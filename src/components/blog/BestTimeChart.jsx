import { useEffect, useState } from 'react';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatHour12(h) {
  const suffix = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}${suffix}`;
}

function colorFor(val) {
  if (val == null) return 'rgb(241 245 249)';
  const intensity = Math.min(100, (val / 90) * 100);
  const r = Math.round(239 - intensity * 0.5);
  const g = Math.round(68 + (100 - intensity) * 1.5);
  const b = Math.round(68 + (100 - intensity) * 0.5);
  return `rgb(${r}, ${g}, ${b})`;
}

export default function BestTimeChart({ slug, title }) {
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
        No aggregate data available for {slug}.
      </div>
    );
  }
  if (!agg) {
    return (
      <div className="not-prose my-6 p-4 text-sm text-slate-500 border border-slate-200 dark:border-gray-700 rounded">
        Loading 30 day pattern...
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
                <th key={h} className="px-1 py-1 text-slate-500 font-normal text-center">
                  {h % 3 === 0 ? formatHour12(h) : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DAYS.map((day, di) => (
              <tr key={day}>
                <th className="pr-2 py-0.5 text-right text-slate-500 font-normal">{day}</th>
                {Array.from({ length: 24 }, (_, h) => {
                  const v = grid[`${di}-${h}`];
                  return (
                    <td key={h} className="px-0.5 py-0.5">
                      <div
                        className="w-5 h-5 rounded-sm"
                        style={{ background: colorFor(v) }}
                        title={v == null ? '—' : `${DAYS[di]} ${formatHour12(h)}: ${v} min`}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <figcaption className="text-xs text-slate-500 mt-2">
        Median northbound wait by hour and day, last 30 days. Darker red = longer wait. Source:{' '}
        <a
          href="https://bwt.cbp.gov/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          U.S. Customs and Border Protection
        </a>
        .
      </figcaption>
    </figure>
  );
}
