import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Check } from 'lucide-react';
import { updatePageMeta, resetPageMeta } from '@/lib/seo';
import { track } from '@/lib/analytics';
import SponsoredCard from '@/components/sponsors/SponsoredCard';
import { CITIES, CATEGORIES, checkoutFor, LISTING_PRICE_USD, SPONSORS, slotTaken } from '@/lib/sponsors';

const COPY = {
  en: {
    title: 'Feature your business | Border Pulse',
    desc: 'A labeled spot on Border Pulse crossing pages for one business per category in each border city. $99 a month.',
    back: 'All crossings',
    h1: 'Put your business in front of people crossing the border',
    lead: 'Border Pulse shows official CBP wait times for the U.S.-Mexico border in English and Spanish. People check it right before they cross. A featured listing puts your business on your city’s crossing pages, below the wait times.',
    proof: '51.1K Google search impressions in 28 days (Search Console, through Nov 10, 2026).',
    getTitle: 'What you get',
    get: [
      'A labeled card on your city’s crossing pages, below the wait times. It replaces the ad there.',
      'Buttons to your WhatsApp and your website. WhatsApp opens with a message saying the customer found you on Border Pulse.',
      'One business per category per city. When a city has several sponsors, they take turns on its crossing pages by day.',
      'A monthly count of clicks on your card, and visits tagged from Border Pulse.',
    ],
    price: `$${LISTING_PRICE_USD} a month`,
    priceNote: 'Billed monthly through Stripe.',
    pickTitle: 'Pick your city and category',
    available: 'Available',
    taken: 'Taken',
    stepsTitle: 'How it works',
    steps: [
      'Pick an open spot and pay through Stripe. You enter your business name, website or Instagram, and WhatsApp.',
      'We review the listing. If it is not approved, the payment is refunded.',
      'We email you before it goes live.',
    ],
    rulesTitle: 'The rules',
    rules: [
      'Every listing is labeled Sponsored.',
      'A sponsor never sits above the wait times, and a page never shows a sponsor and an ad together.',
      'Your card shows facts you give us: name, city, the services you list, links. Border Pulse does not rate or recommend businesses.',
    ],
    exampleTitle: 'Example',
  },
  es: {
    title: 'Anuncia tu negocio | Border Pulse',
    desc: 'Un espacio patrocinado en las páginas de cruces de Border Pulse para un negocio por categoría en cada ciudad fronteriza. $99 dólares al mes.',
    back: 'Todos los cruces',
    h1: 'Pon tu negocio frente a quienes cruzan la frontera',
    lead: 'Border Pulse muestra los tiempos de espera oficiales de CBP en la frontera entre EE. UU. y México, en inglés y español. La gente lo revisa justo antes de cruzar. Un anuncio destacado pone tu negocio en las páginas de los cruces de tu ciudad, debajo de los tiempos de espera.',
    proof: '51.1 mil impresiones en búsquedas de Google en 28 días (Search Console, hasta el 10 de nov. de 2026).',
    getTitle: 'Qué incluye',
    get: [
      'Una tarjeta marcada como patrocinada en las páginas de los cruces de tu ciudad, debajo de los tiempos de espera. Reemplaza el anuncio de esa página.',
      'Botones a tu WhatsApp y a tu sitio. WhatsApp se abre con un mensaje que dice que el cliente te encontró en Border Pulse.',
      'Un negocio por categoría en cada ciudad. Si una ciudad tiene varios patrocinadores, se turnan por día en sus páginas de cruces.',
      'Un conteo mensual de clics en tu tarjeta y de visitas que llegan desde Border Pulse.',
    ],
    price: `$${LISTING_PRICE_USD} dólares al mes`,
    priceNote: 'Cobro mensual con Stripe.',
    pickTitle: 'Elige tu ciudad y categoría',
    available: 'Disponible',
    taken: 'Ocupado',
    stepsTitle: 'Cómo funciona',
    steps: [
      'Elige un espacio libre y paga con Stripe. Ahí escribes el nombre de tu negocio, tu sitio o Instagram y tu WhatsApp.',
      'Revisamos el anuncio. Si no se aprueba, se reembolsa el pago.',
      'Te escribimos por correo antes de publicarlo.',
    ],
    rulesTitle: 'Las reglas',
    rules: [
      'Todo anuncio dice Patrocinado.',
      'Un patrocinador nunca va arriba de los tiempos de espera, y una página nunca muestra un patrocinador y un anuncio al mismo tiempo.',
      'Tu tarjeta muestra los datos que nos das: nombre, ciudad, los servicios que anuncias y tus enlaces. Border Pulse no califica ni recomienda negocios.',
    ],
    exampleTitle: 'Ejemplo',
  },
};

function checkoutHref(slot) {
  const u = new URL(checkoutFor(slot));
  u.searchParams.set('client_reference_id', slot);
  return u.toString();
}

export default function FeatureBusiness({ lang = 'en' }) {
  const es = lang === 'es';
  const t = COPY[es ? 'es' : 'en'];
  const example = SPONSORS[0];

  useEffect(() => {
    const canonical = `https://borderpulse.com/${es ? 'anunciate' : 'feature-your-business'}/`;
    updatePageMeta({ title: t.title, description: t.desc, ogTitle: t.title, ogDescription: t.desc, ogUrl: canonical, canonical, lang: es ? 'es' : 'en' });
    return () => resetPageMeta();
  }, [es, t]);

  const section = 'rounded-xl border border-slate-200 bg-white/80 p-4 dark:border-gray-700 dark:bg-gray-900/50 sm:p-5';

  return (
    <div className="mx-auto max-w-[900px] p-4 sm:p-6">
      <div className="mb-5">
        <Link to={es ? '/es/' : '/'} className="-ml-2 inline-flex min-h-11 items-center gap-1 rounded-md px-3 text-sm font-medium hover:bg-slate-100 dark:hover:bg-gray-800">
          <ArrowLeft className="h-3.5 w-3.5" />{t.back}
        </Link>
      </div>

      <header className="mb-6">
        <h1 className="text-2xl font-bold text-slate-950 dark:text-white sm:text-3xl">{t.h1}</h1>
        <p className="mt-3 text-base leading-6 text-slate-700 dark:text-slate-300">{t.lead}</p>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{t.proof}</p>
      </header>

      <div className="space-y-4">
        <section className={section}>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-semibold text-slate-900 dark:text-white">{t.getTitle}</h2>
            <p className="text-lg font-bold text-slate-950 dark:text-white">{t.price}</p>
          </div>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-700 dark:text-slate-300">
            {t.get.map(item => (
              <li key={item} className="flex gap-2"><Check aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 text-emerald-700" />{item}</li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-slate-600 dark:text-slate-400">{t.priceNote}</p>
        </section>

        <section className={section} aria-labelledby="pick-slot">
          <h2 id="pick-slot" className="font-semibold text-slate-900 dark:text-white">{t.pickTitle}</h2>
          <div className="mt-3 space-y-4">
            {CITIES.map(city => (
              <div key={city.id}>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  <Link to={`/${es ? 'ciudad' : 'city'}/${city.id}/`} className="underline">{city.name}</Link>
                </h3>
                <ul className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {CATEGORIES.map(cat => {
                    const slot = `${city.id}-${cat.id}`;
                    const label = cat[es ? 'es' : 'en'];
                    if (slotTaken(city.id, cat.id)) {
                      return (
                        <li key={slot} className="flex min-h-11 items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600 dark:border-gray-800 dark:bg-gray-900 dark:text-slate-400">
                          <span>{label}</span><span className="text-xs">{t.taken}</span>
                        </li>
                      );
                    }
                    return (
                      <li key={slot}>
                        <a
                          href={checkoutHref(slot)}
                          onClick={() => track('sponsor-checkout', { slot })}
                          aria-label={`${label}, ${city.name}: ${t.available}`}
                          className="flex min-h-11 items-center justify-between rounded-md border border-emerald-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 hover:bg-emerald-50 dark:border-emerald-800 dark:bg-gray-900 dark:text-white dark:hover:bg-emerald-950/40"
                        >
                          <span>{label}</span><span className="text-xs text-emerald-800 dark:text-emerald-300">{t.available}</span>
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section className={section}>
          <h2 className="font-semibold text-slate-900 dark:text-white">{t.stepsTitle}</h2>
          <ol className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-slate-700 dark:text-slate-300">
            {t.steps.map(s => <li key={s}>{s}</li>)}
          </ol>
        </section>

        <section className={section}>
          <h2 className="font-semibold text-slate-900 dark:text-white">{t.rulesTitle}</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-slate-700 dark:text-slate-300">
            {t.rules.map(r => <li key={r}>{r}</li>)}
          </ul>
        </section>

        {example && (
          <section aria-labelledby="example">
            <h2 id="example" className="font-semibold text-slate-900 dark:text-white">{t.exampleTitle}</h2>
            <SponsoredCard sponsor={example} placement="feature-page-example" language={es ? 'es' : 'en'} />
          </section>
        )}
      </div>
    </div>
  );
}
