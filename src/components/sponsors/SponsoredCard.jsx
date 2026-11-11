import { ExternalLink, MessageCircle } from 'lucide-react';
import { sponsorUrl } from '@/lib/sponsors';
import { track } from '@/lib/analytics';

// A labeled paid placement. Clicks log `sponsor-click` (sponsor id, placement,
// action) so each sponsor gets a monthly count. No free text is sent.
export default function SponsoredCard({ sponsor, placement, language = 'en' }) {
  if (!sponsor) return null;
  const es = language === 'es';
  const log = action => track('sponsor-click', { sponsor: sponsor.id, placement, action });
  return (
    <aside
      className="not-prose my-6 rounded-xl border border-slate-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
      aria-label={es ? 'Anuncio patrocinado' : 'Sponsored listing'}
      data-sponsor={sponsor.id}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
        {es ? 'Patrocinado' : 'Sponsored'} · {sponsor.category[es ? 'es' : 'en']} · {sponsor.city}
      </p>
      <p className="mt-1 text-base font-semibold text-slate-900 dark:text-white">{sponsor.name}</p>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{sponsor.blurb[es ? 'es' : 'en']}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <a
          href={sponsorUrl(sponsor, placement)}
          target="_blank"
          rel="sponsored noopener"
          onClick={() => log('site')}
          aria-label={`${es ? 'Ver sitio' : 'Visit site'}: ${sponsor.name}`}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 dark:border-gray-700 dark:text-slate-100 dark:hover:bg-gray-800"
        >
          {es ? 'Ver sitio' : 'Visit site'}<ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
        </a>
        {sponsor.whatsapp && (
          <a
            href={`https://wa.me/${sponsor.whatsapp}${sponsor.whatsappText ? `?text=${encodeURIComponent(sponsor.whatsappText[es ? 'es' : 'en'])}` : ''}`}
            target="_blank"
            rel="sponsored noopener"
            onClick={() => log('whatsapp')}
            aria-label={`WhatsApp: ${sponsor.name}`}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-md border border-emerald-700 px-3 py-2 text-sm font-medium text-emerald-800 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950/40"
          >
            <MessageCircle aria-hidden="true" className="h-3.5 w-3.5" />WhatsApp
          </a>
        )}
      </div>
      <p className="mt-3 text-xs text-slate-600 dark:text-slate-400">
        {es ? 'Espacio patrocinado. Border Pulse no ha evaluado la atención de este negocio.' : 'Sponsored placement. Border Pulse has not evaluated this business’s care.'}
      </p>
    </aside>
  );
}
