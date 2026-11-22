import React, { useEffect } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Plus } from 'lucide-react';
import { updatePageMeta, resetPageMeta } from '@/lib/seo';
import { track } from '@/lib/analytics';
import SponsoredCard from '@/components/sponsors/SponsoredCard';
import { CITIES, CATEGORIES, checkoutFor, cityById, sponsorFor } from '@/lib/sponsors';

// One page per border city: the crossings that serve it, then one section per
// business category. A category shows its sponsor (labeled) or an open spot.
// No network ad on these pages; the listings are the commercial content.

export function cityMeta(city, es) {
  const title = es
    ? `${city.name}: cruces y negocios locales | Border Pulse`
    : `${city.name}: border crossings and local businesses | Border Pulse`;
  const desc = es
    ? `Tiempos de espera de los cruces a ${city.name} desde ${city.from.es}, y negocios locales por categoría.`
    : `Wait times for the crossings into ${city.name} from ${city.from.en}, and local businesses by category.`;
  return { title, desc };
}

function checkoutHref(slot) {
  const u = new URL(checkoutFor(slot));
  u.searchParams.set('client_reference_id', slot);
  return u.toString();
}

export default function CityGuide({ lang = 'en' }) {
  const { city: cityId } = useParams();
  const city = cityById(cityId);
  const es = lang === 'es';
  const l = es ? 'es' : 'en';

  useEffect(() => {
    if (!city) return undefined;
    const { title, desc } = cityMeta(city, es);
    const canonical = `https://borderpulse.com/${es ? 'ciudad' : 'city'}/${city.id}/`;
    updatePageMeta({ title, description: desc, ogTitle: title, ogDescription: desc, ogUrl: canonical, canonical, lang: l });
    return () => resetPageMeta();
  }, [city, es, l]);

  if (!city) return <Navigate to="/" replace />;

  const section = 'rounded-xl border border-slate-200 bg-white/80 p-4 dark:border-gray-700 dark:bg-gray-900/50 sm:p-5';
  const others = CITIES.filter(c => c.id !== city.id);

  return (
    <div className="mx-auto max-w-[900px] p-4 sm:p-6">
      <div className="mb-5">
        <Link to={es ? '/es/' : '/'} className="-ml-2 inline-flex min-h-11 items-center gap-1 rounded-md px-3 text-sm font-medium hover:bg-slate-100 dark:hover:bg-gray-800">
          <ArrowLeft className="h-3.5 w-3.5" />{es ? 'Todos los cruces' : 'All crossings'}
        </Link>
      </div>

      <header className="mb-6">
        <h1 className="text-2xl font-bold text-slate-950 dark:text-white sm:text-3xl">
          {es ? `${city.name}: cruces y negocios locales` : `${city.name}: crossings and local businesses`}
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          {es
            ? `Revisa la espera antes de salir de ${city.from.es}, y encuentra negocios en ${city.name} por categoría.`
            : `Check the wait before you leave ${city.from.en}, and find businesses in ${city.name} by category.`}
        </p>
      </header>

      <div className="space-y-4">
        <section className={section} aria-labelledby="crossings">
          <h2 id="crossings" className="font-semibold text-slate-900 dark:text-white">
            {es ? 'Tiempos de espera ahora' : 'Wait times now'}
          </h2>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {city.crossings.map(([slug, label]) => (
              <li key={slug}>
                <Link
                  to={`/crossing/${slug}/`}
                  onClick={() => track('city-to-waits', { city: city.id, crossing: slug })}
                  className="flex min-h-11 items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:hover:bg-gray-800"
                >
                  {label}<ArrowRight aria-hidden="true" className="h-4 w-4" />
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {CATEGORIES.map(cat => {
          const sponsor = sponsorFor(city.id, cat.id);
          const slot = `${city.id}-${cat.id}`;
          return (
            <section key={cat.id} aria-labelledby={`cat-${cat.id}`}>
              <h2 id={`cat-${cat.id}`} className="font-semibold text-slate-900 dark:text-white">{cat[l]}</h2>
              {sponsor ? (
                <SponsoredCard sponsor={sponsor} placement={`city-${slot}`} language={l} />
              ) : !checkoutFor(slot) ? (
                <p className="mt-2 rounded-md border border-slate-200 px-3 py-3 text-sm text-slate-600 dark:border-gray-800 dark:text-slate-400">
                  {es ? 'Espacio reservado. El anuncio está en revisión.' : 'Spot reserved. The listing is in review.'}
                </p>
              ) : (
                <a
                  href={checkoutHref(slot)}
                  onClick={() => track('sponsor-checkout', { slot, placement: 'city' })}
                  className="mt-2 flex min-h-11 items-center gap-2 rounded-md border border-dashed border-slate-300 px-3 py-3 text-sm text-slate-700 hover:bg-slate-50 dark:border-gray-700 dark:text-slate-300 dark:hover:bg-gray-800"
                >
                  <Plus aria-hidden="true" className="h-4 w-4 shrink-0" />
                  {es
                    ? `Espacio libre: ${cat.es} en ${city.name}. Anúnciate aquí.`
                    : `Open spot: ${cat.en} in ${city.name}. Get listed here.`}
                </a>
              )}
            </section>
          );
        })}

        <p className="text-xs text-slate-600 dark:text-slate-400">
          {es
            ? 'Los negocios en esta página son anuncios patrocinados. Border Pulse no califica ni recomienda negocios. '
            : 'Businesses on this page are sponsored listings. Border Pulse does not rate or recommend businesses. '}
          <Link to={es ? '/anunciate/' : '/feature-your-business/'} className="underline">{es ? 'Cómo funciona' : 'How it works'}</Link>
        </p>

        <nav aria-label={es ? 'Otras ciudades' : 'Other cities'} className="flex flex-wrap gap-x-3 gap-y-1 text-sm">
          {others.map(c => (
            <Link key={c.id} to={`/${es ? 'ciudad' : 'city'}/${c.id}/`} className="inline-flex min-h-11 items-center underline">{c.name}</Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
