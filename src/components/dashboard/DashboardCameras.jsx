import React, { useEffect, useState } from 'react';
import { Camera, ChevronDown } from 'lucide-react';
import CrossingCameras from '@/components/dashboard/CrossingCameras';
import { CORRIDORS, corridorFor } from '@/lib/corridors';
import { camerasFor } from '@/lib/cameras';
import { crossingDisplayName } from '@/lib/crossingNames';

export default function DashboardCameras({ crossings, language, corridorId }) {
  const [open, setOpen] = useState(false);
  const [areaId, setAreaId] = useState(() => corridorFor(corridorId)?.id || 'el-paso-juarez');
  const [port, setPort] = useState('240202');
  useEffect(() => {
    if (corridorFor(corridorId)) { setAreaId(corridorId); setPort(''); }
  }, [corridorId]);
  const area = corridorFor(areaId);
  const cameraCrossings = area.ports
    .map(id => crossings.find(c => String(c.port_number) === id))
    .filter(c => c && camerasFor(c.port_number).length > 0);
  const selected = cameraCrossings.find(c => String(c.port_number) === port) || cameraCrossings[0];
  const es = language === 'es';
  return (
    <section className="mb-5 rounded-xl border border-emerald-200 bg-white dark:border-emerald-900 dark:bg-gray-900" aria-label={es ? 'Cámaras fronterizas' : 'Border cameras'}>
      <button type="button" aria-labelledby="dashboard-cameras-label" aria-describedby="dashboard-cameras-coverage" aria-expanded={open} aria-controls="dashboard-camera-panel" onClick={() => setOpen(value => !value)} className="flex min-h-14 w-full items-center gap-3 rounded-xl p-4 text-left text-emerald-800 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-gray-800">
        <Camera className="h-5 w-5 shrink-0" aria-hidden="true" />
        <span className="flex-1"><span id="dashboard-cameras-label" className="block text-base font-semibold">{es ? 'Cámaras' : 'Camera feeds'}</span><span id="dashboard-cameras-coverage" className="block text-xs">{es ? 'Elige una zona · la cobertura varía' : 'Choose an area · coverage varies'}</span></span>
        <ChevronDown className={`h-5 w-5 shrink-0 ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      {open && <div id="dashboard-camera-panel" className="px-4 pb-1">
        <label className="mb-3 block text-sm font-medium text-slate-700 dark:text-slate-300">{es ? 'Zona de cámaras' : 'Camera area'}
          <select value={areaId} onChange={event => { setAreaId(event.target.value); setPort(''); }} className="ml-2 min-h-11 max-w-full rounded-lg border border-slate-300 bg-white px-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white">
            {CORRIDORS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <p className="mb-3 text-xs text-slate-600 dark:text-slate-400">{selected ? (es ? `${cameraCrossings.length} cruces con reproductor o enlace a la fuente oficial.` : `${cameraCrossings.length} crossings with a player or official source link.`) : (es ? 'Aún no hay una cámara pública verificada para esta zona. Los tiempos de espera siguen disponibles en el panel.' : 'No public camera has been verified for this area yet. Wait times are still available on the dashboard.')}</p>
        <div role="group" aria-label={es ? 'Elegir cruce' : 'Choose a crossing'} className="mb-3 flex flex-wrap gap-2">
          {cameraCrossings.map(c => <button key={c.port_number} type="button" aria-pressed={c.port_number === selected.port_number} onClick={() => setPort(String(c.port_number))} className={`min-h-11 max-w-full rounded-lg border px-3 py-2 text-sm ${c.port_number === selected.port_number ? 'border-emerald-700 bg-emerald-50 text-emerald-900 dark:border-emerald-500 dark:bg-emerald-950 dark:text-emerald-200' : 'border-slate-300 text-slate-900 dark:border-gray-600 dark:text-white'}`}>{crossingDisplayName(c, language)}</button>)}
        </div>
        {selected && <CrossingCameras key={selected.port_number} crossing={selected} language={language} />}
      </div>}
    </section>
  );
}
