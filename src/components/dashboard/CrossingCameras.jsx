import React, { useState } from 'react';
import { Camera } from 'lucide-react';
import { CAMERA_SOURCE, camerasFor } from '@/lib/cameras';
import { track } from '@/lib/analytics';

export default function CrossingCameras({ crossing, language }) {
  const [active, setActive] = useState(null);
  const cameras = camerasFor(crossing.port_number);
  if (!cameras.length) return null;
  const es = language === 'es';
  const selected = cameras.find(c => c.id === active);
  return (
    <section className="mb-6 rounded-xl border border-slate-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900" aria-label={es ? 'Cámaras del cruce' : 'Crossing cameras'}>
      <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white"><Camera className="h-5 w-5" />{es ? 'Mira la fila' : 'See the line'}</h2>
      <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">{es ? 'Vistas públicas del Fideicomiso de Puentes Fronterizos de Chihuahua. La orientación de la cámara no identifica tu carril; verifica la imagen y la hora en el reproductor. La transmisión puede estar fuera de servicio.' : 'Public views from Fideicomiso de Puentes Fronterizos de Chihuahua. Camera orientation does not identify your lane; check the image and time in the player. Streams may be unavailable.'}</p>
      <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label={es ? 'Seleccionar cámara' : 'Select camera'}>
        {cameras.map(camera => (
          <button key={camera.id} type="button" aria-pressed={camera.id === active} className="min-h-11 rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-900 dark:border-gray-600 dark:text-white hover:bg-slate-100 dark:hover:bg-gray-800" onClick={() => {
            setActive(camera.id);
            track('camera-open', { port: String(crossing.port_number), camera: camera.id });
          }}>{es ? camera.es : camera.en}</button>
        ))}
        {selected && <button type="button" className="min-h-11 px-3 text-sm underline text-slate-600 dark:text-slate-300" onClick={() => setActive(null)}>{es ? 'Cerrar cámara' : 'Close camera'}</button>}
      </div>
      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{es ? 'Seleccionar una vista carga el reproductor de YouTube y conecta tu navegador con ese servicio.' : 'Selecting a view loads the YouTube player and connects your browser to that service.'}</p>
      {selected && <div className="mt-3">
        <iframe key={selected.id} src={selected.embedUrl} title={`${crossing.name}: ${es ? selected.es : selected.en}`} className="aspect-video w-full rounded-lg border-0" allow="encrypted-media; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
        <a href={selected.watchUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex min-h-11 items-center text-sm text-emerald-700 underline dark:text-emerald-400">{es ? 'Si no carga, abrir en YouTube' : 'If playback fails, open on YouTube'}</a>
      </div>}
      <a href={CAMERA_SOURCE} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center text-xs text-emerald-700 underline dark:text-emerald-400">{es ? 'Ver directorio oficial de cámaras' : 'View the official camera directory'}</a>
    </section>
  );
}
