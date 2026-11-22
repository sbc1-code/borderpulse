import { Link } from 'react-router-dom';
import { ExternalLink, MessageCircle, MapPin } from 'lucide-react';
import { sponsorUrl, whatsappUrl, cityById, categoryById, offerFor } from '@/lib/sponsors';
import { track } from '@/lib/analytics';

// A labeled paid placement. Clicks log `sponsor-click` (sponsor id, placement,
// action) so each sponsor gets a monthly count. No free text is sent.
export default function SponsoredCard({ sponsor, placement, language = 'en' }) {
  if (!sponsor) return null;
  const es = language === 'es';
  const lang = es ? 'es' : 'en';
  const log = action => track('sponsor-click', { sponsor: sponsor.id, placement, action });
  const city = cityById(sponsor.city)?.name || sponsor.city;
  const category = categoryById(sponsor.category)?.[lang] || '';
  const services = sponsor.services?.[lang] || [];
  const offer = offerFor(sponsor);
  const wa = whatsappUrl(sponsor, language);
  return (
    <aside
      className="not-prose my-6 overflow-hidden rounded-xl border border-emerald-300 bg-emerald-50/60 shadow-sm dark:border-emerald-800 dark:bg-emerald-950/20"
      aria-label={es ? 'Anuncio patrocinado' : 'Sponsored listing'}
      data-sponsor={sponsor.id}
    >
      <div className="border-l-4 border-emerald-600 p-4 sm:p-5">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
          {es ? 'Patrocinado' : 'Sponsored'} · {category}
        </p>
        <p className="mt-1 text-lg font-bold leading-snug text-slate-950 dark:text-white">{sponsor.name}</p>
        <p className="mt-0.5 flex items-center gap-1 text-sm text-slate-700 dark:text-slate-300">
          <MapPin aria-hidden="true" className="h-3.5 w-3.5" />{city}
        </p>

        {services.length > 0 && (
          <div className="mt-3">
            <p className="text-xs text-slate-600 dark:text-slate-400">{es ? 'Servicios que anuncia el negocio:' : 'Services the business lists:'}</p>
            <ul className="mt-1.5 flex flex-wrap gap-1.5">
              {services.map(s => (
                <li key={s} className="rounded-full border border-emerald-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-800 dark:border-emerald-900 dark:bg-gray-900 dark:text-slate-100">{s}</li>
              ))}
            </ul>
          </div>
        )}

        {offer && (
          <p className="mt-3 text-sm font-medium text-slate-900 dark:text-white">{offer[lang]}</p>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          {wa && (
            <a
              href={wa}
              target="_blank"
              rel="sponsored noopener"
              onClick={() => log('whatsapp')}
              aria-label={`WhatsApp: ${sponsor.name}`}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
            >
              <MessageCircle aria-hidden="true" className="h-4 w-4" />{es ? 'Escribir por WhatsApp' : 'Message on WhatsApp'}
            </a>
          )}
          <a
            href={sponsorUrl(sponsor, placement)}
            target="_blank"
            rel="sponsored noopener"
            onClick={() => log('site')}
            aria-label={`${es ? 'Ver sitio' : 'Visit site'}: ${sponsor.name}`}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 dark:border-gray-700 dark:bg-gray-900 dark:text-slate-100 dark:hover:bg-gray-800"
          >
            {es ? 'Ver sitio' : 'Visit site'}<ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
          </a>
        </div>

        <p className="mt-3 text-xs text-slate-600 dark:text-slate-400">
          {es ? 'Espacio patrocinado. Border Pulse no ha evaluado la atención de este negocio.' : 'Sponsored placement. Border Pulse has not evaluated this business’s care.'}
          {' '}
          <Link to={es ? '/anunciate/' : '/feature-your-business/'} className="underline hover:text-slate-900 dark:hover:text-white">
            {es ? 'Anuncia tu negocio' : 'Feature your business'}
          </Link>
        </p>
      </div>
    </aside>
  );
}
