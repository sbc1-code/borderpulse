import { Link } from 'react-router-dom';

// Navigation does not establish current lane availability or resolve hours.
export default function SantaTeresaActions({ slug, language }) {
  const es = language === 'es';
  const linkClass = 'inline-flex min-h-11 items-center rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-emerald-700 underline underline-offset-4 dark:border-gray-700 dark:text-emerald-400';
  const officialLabel = es ? 'Reporte y horarios de CBP' : 'CBP report and hours';
  return (
    <nav aria-label={es ? 'Planifica tu cruce en Santa Teresa' : 'Plan your Santa Teresa crossing'}
      className="mb-4 grid grid-cols-2 gap-2">
      <Link to={`/walk-or-drive/${slug}/`} className={linkClass}>
        {es ? 'Compara a pie y en auto' : 'Compare walking and driving'}
      </Link>
      <a href="https://bwt.cbp.gov/details/06240801/POV" target="_blank" rel="noopener noreferrer"
        aria-label={`${officialLabel} (${es ? 'abre otra pestaña' : 'opens a new tab'})`} className={linkClass}>
        <span>{officialLabel} <span aria-hidden="true">↗</span></span>
      </a>
    </nav>
  );
}
