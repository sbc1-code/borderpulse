import React, { useState } from 'react';
import { Camera } from 'lucide-react';
import { cameraSourceFor, camerasFor } from '@/lib/cameras';
import { track } from '@/lib/analytics';

export default function CrossingCameras({ crossing, language }) {
  const [active, setActive] = useState(null);
  const cameras = camerasFor(crossing.port_number);
  const source = cameraSourceFor(crossing.port_number);
  if (!cameras.length) return null;
  const es = language === 'es';
  const selected = cameras.find(c => c.id === active);
  return (
    <section className="mb-6 rounded-xl border border-slate-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900" aria-label={es ? 'Cámaras del cruce' : 'Crossing cameras'}>
      <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white"><Camera className="h-5 w-5" />{source.kind === 'approach' ? (es ? 'Cámaras de acceso vial' : 'Road approach cameras') : source.kind === 'external' ? (es ? 'Fuente oficial de cámaras' : 'Official camera source') : (es ? 'Mira la fila' : 'See the line')}</h2>
      <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">{source.kind === 'approach' ? (es ? 'Caltrans muestra vías del lado estadounidense cerca de este cruce. Estas vistas no muestran la fila de inspección hacia EE. UU. desde México.' : 'Caltrans shows U.S. roads near this crossing. These views do not show the inspection queue from Mexico into the U.S.') : source.kind === 'external' ? (es ? `Consulta las cámaras en la página de ${source.owner}. Se abre fuera de BorderPulse; el acceso y la disponibilidad dependen de la fuente.` : `View cameras on the ${source.owner} website. It opens outside BorderPulse; access and availability depend on the source.`) : (es ? `Vistas públicas de ${source.owner}. La orientación no identifica tu carril; verifica la imagen y la hora. La transmisión puede estar fuera de servicio.` : `Public views from ${source.owner}. Orientation does not identify your lane; check the image and time. Streams may be unavailable.`)}</p>
      <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label={es ? 'Seleccionar cámara' : 'Select camera'}>
        {cameras.map(camera => (
          camera.kind === 'external' ? <a key={camera.id} href={camera.watchUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center rounded-lg border border-slate-300 px-3 text-sm font-medium text-emerald-800 underline dark:border-gray-600 dark:text-emerald-300">{es ? camera.es : camera.en}</a> :
          <button key={camera.id} type="button" aria-pressed={camera.id === active} className="min-h-11 rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-900 dark:border-gray-600 dark:text-white hover:bg-slate-100 dark:hover:bg-gray-800" onClick={() => {
            setActive(camera.id);
            track('camera-open', { port: String(crossing.port_number), camera: camera.id });
          }}>{es ? camera.es : camera.en}</button>
        ))}
        {selected && <button type="button" className="min-h-11 px-3 text-sm underline text-slate-600 dark:text-slate-300" onClick={() => setActive(null)}>{es ? 'Cerrar cámara' : 'Close camera'}</button>}
      </div>
      {source.kind !== 'external' && <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{es ? `Seleccionar una vista carga el reproductor de ${source.provider} y conecta tu navegador con ese servicio.` : `Selecting a view loads the ${source.provider} player and connects your browser to that service.`}</p>}
      {selected && <div className="mt-3">
        <iframe key={selected.id} src={selected.embedUrl} title={`${crossing.name}: ${es ? selected.es : selected.en}`} className="aspect-video w-full rounded-lg border-0" allow="encrypted-media; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
        <a href={selected.watchUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex min-h-11 items-center text-sm text-emerald-700 underline dark:text-emerald-400">{es ? `Si no carga, abrir en ${source.provider}` : `If playback fails, open on ${source.provider}`}</a>
      </div>}
      {source.kind !== 'external' && <a href={source.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center text-xs text-emerald-700 underline dark:text-emerald-400">{es ? 'Ver directorio oficial de cámaras' : 'View the official camera directory'}</a>}
    </section>
  );
}
