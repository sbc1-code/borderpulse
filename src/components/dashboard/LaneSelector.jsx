import React from 'react';
import { LOCAL_LANES } from '@/lib/laneContext';

export default function LaneSelector({ lane, onChange, language }) {
  const es = language === 'es';
  return <div className="min-w-0">
    <label className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">{es ? 'Tu carril' : 'Your lane'}
      <select aria-label={es ? 'Tu carril' : 'Your lane'} value={lane} onChange={e => onChange(e.target.value)} className="min-h-11 min-w-0 max-w-full rounded-lg border border-slate-300 bg-white px-2 text-sm text-slate-900 dark:border-gray-600 dark:bg-gray-900 dark:text-white">
        {LOCAL_LANES.map(l => <option key={l.key} value={l.key}>{es ? l.es : l.en}</option>)}
      </select>
    </label>
    {lane === 'passenger_sentri' && <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">{es ? 'Solo compara SENTRI si cumples los requisitos de ese carril.' : 'Compare SENTRI only if you meet that lane’s requirements.'}</p>}
    {lane === 'passenger_ready' && <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">{es ? 'Ready Lane requiere documentos elegibles; verifica los requisitos con CBP.' : 'Ready Lane requires eligible documents; check the requirements with CBP.'}</p>}
  </div>;
}
