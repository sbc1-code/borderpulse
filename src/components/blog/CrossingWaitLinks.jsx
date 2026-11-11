import { useContext } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { LangContext } from '@/lib/LangContext';
import { track } from '@/lib/analytics';
import SponsoredCard from '@/components/sponsors/SponsoredCard';
import { sponsorForGuide } from '@/lib/sponsors';

// Compact current-wait links near the top of a guide, for readers who skim.
// items: [[crossingSlug, label], ...]. Labels are display text only.
export default function CrossingWaitLinks({ items = [] }) {
  const lang = useContext(LangContext) || 'en';
  const { slug } = useParams();
  const es = lang === 'es';
  return (
    <>
    <aside className="not-prose my-6 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-900 dark:bg-emerald-950/20" aria-label={es ? 'Tiempos de espera actuales' : 'Current wait times'}>
      <p className="text-sm font-semibold text-slate-900 dark:text-white">{es ? '¿Cruzarás pronto? Tiempos de espera actuales:' : 'Crossing soon? Current wait times:'}</p>
      <ul className="mt-2 flex flex-wrap gap-2">
        {items.map(([crossing, label]) => (
          <li key={crossing}>
            <Link
              to={`/crossing/${crossing}/`}
              onClick={() => track('blog-to-waits', { slug, crossing, placement: 'top' })}
              className="inline-flex min-h-11 items-center gap-1 rounded-md border border-emerald-700 bg-white px-3 py-2 text-sm font-medium text-emerald-800 hover:bg-emerald-100 dark:bg-transparent dark:text-emerald-300 dark:hover:bg-emerald-950/40"
            >
              {label}<ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
            </Link>
          </li>
        ))}
      </ul>
    </aside>
    <SponsoredCard sponsor={sponsorForGuide(slug)} placement={`guide-${slug}`} language={lang} />
    </>
  );
}
