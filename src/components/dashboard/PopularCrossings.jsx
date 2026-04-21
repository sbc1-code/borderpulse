import React from 'react';
import { Link } from 'react-router-dom';

const POPULAR_PORTS = [
  '250401', // San Ysidro
  '250601', // Otay Mesa
  '250302', // Calexico - West
  '250501', // Tecate
  '260401', // Nogales - Deconcini
  '260402', // Nogales - Mariposa
  '240201', // El Paso - Bridge of the Americas (BOTA)
  '240202', // El Paso - Paso Del Norte (PDN)
  '240203', // El Paso - Ysleta
  '230401', // Laredo - Bridge I
  '230404', // Laredo - World Trade Bridge
  '230501', // Hidalgo/Pharr - Hidalgo
];

export default function PopularCrossings({ crossings, language = 'en' }) {
  if (!crossings || !crossings.length) return null;
  const byPort = new Map(crossings.map((c) => [c.port_number, c]));
  const items = POPULAR_PORTS.map((p) => byPort.get(p)).filter((c) => c && c.slug);
  if (!items.length) return null;

  return (
    <section className="mt-6 mb-4 border-t border-slate-200 dark:border-gray-700 pt-4">
      <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
        {language === 'en' ? 'Popular border crossings' : 'Cruces fronterizos populares'}
      </h2>
      <p className="text-xs text-slate-500 mb-3">
        {language === 'en'
          ? 'Live wait times, historical patterns, and best times to cross at each port.'
          : 'Tiempos de espera en vivo, patrones históricos y mejores horas para cruzar en cada puerto.'}
      </p>
      <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-1.5">
        {items.map((c) => (
          <li key={c.port_number} className="text-xs">
            <Link
              to={`/crossing/${c.slug}`}
              className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:underline"
            >
              {language === 'en' ? `${c.name} wait times` : `${c.name} tiempos de espera`}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
