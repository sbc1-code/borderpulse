import React from 'react';
import { Link } from 'react-router-dom';
import { Star } from 'lucide-react';
import { availableLaneWait } from '@/lib/crossingAvailability';

export default function SavedCrossingsBar({
  favorites,
  crossings,
  portToSlug,
  lane,
  crossingBase,
  language,
}) {
  if (!favorites?.length) return null;
  const favCrossings = favorites
    .map((port) => crossings.find((c) => c.port_number === port))
    .filter((c) => c && portToSlug[c.port_number]);
  if (!favCrossings.length) return null;
  return (
    <nav
      aria-label={language === 'es' ? 'Cruces guardados' : 'Saved crossings'}
      className="mb-3 flex flex-wrap items-center gap-2"
    >
      <span className="flex items-center gap-1 text-xs font-medium text-slate-600 dark:text-slate-300">
        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" aria-hidden="true" />
        {language === 'es' ? 'Guardados:' : 'Saved:'}
      </span>
      {favCrossings.map((c) => {
        const wait = availableLaneWait(c, lane);
        const slug = portToSlug[c.port_number];
        return (
          <Link
            key={c.port_number}
            to={`${crossingBase}/${slug}/${lane && lane !== 'passenger_standard' ? `?lane=${encodeURIComponent(lane)}` : ''}`}
            className="flex min-h-11 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white hover:underline"
          >
            <span>{c.name}</span>
            {wait != null && <span className="text-emerald-700 dark:text-emerald-400">· {wait} min</span>}
          </Link>
        );
      })}
    </nav>
  );
}
