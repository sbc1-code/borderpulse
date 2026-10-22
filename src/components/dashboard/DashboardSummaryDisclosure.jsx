import React, { useEffect, useState } from 'react';

// The chart is hidden behind the existing native disclosure. Load it only
// on request, then keep it mounted so closing/reopening preserves its state.
// An asset failure stays local: the current crossing reports remain usable.
export default function DashboardSummaryDisclosure(props) {
  const [state, setState] = useState('closed');
  const Summary = typeof state === 'function' ? state : null;
  const es = props.language === 'es';

  useEffect(() => {
    if (state !== 'loading') return;
    let active = true;
    import('./DashboardSummary').then(
      module => { if (active) setState(() => module.default); },
      () => { if (active) setState('failed'); },
    );
    return () => { active = false; };
  }, [state]);

  return (
    <details onToggle={event => {
      if (event.currentTarget.open && state === 'closed') setState('loading');
    }} className="mb-4 rounded-lg border border-slate-200 bg-white/70 p-3 dark:border-gray-700 dark:bg-gray-900/70">
      <summary className="min-h-11 cursor-pointer text-sm font-medium text-slate-700 dark:text-slate-300">
        {es ? 'Ver resumen y mapa de esperas' : 'Show wait summary and border chart'}
      </summary>
      {Summary ? <Summary {...props} /> : state !== 'closed' && (
        <p role="status" className="py-3 text-sm">
          {state === 'failed'
            ? (es ? 'Resumen no disponible. Recarga la página para reintentar.' : 'Summary unavailable. Reload the page to retry.')
            : (es ? 'Cargando…' : 'Loading…')}
        </p>
      )}
    </details>
  );
}
