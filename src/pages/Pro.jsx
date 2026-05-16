import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Bell, Download, Truck, LineChart, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { updatePageMeta, resetPageMeta } from '@/lib/seo';
import { usePersistentLanguage } from '@/lib/useLanguage';
import EmailCapture from '@/components/marketing/EmailCapture';

const COPY = {
  en: {
    eyebrow: 'Coming soon',
    headline: 'BorderPulse Pro',
    sub: 'The data you already use here, plus the alerts, history, and freight tooling teams have been asking for. Same CBP source. Built for operators.',
    backToData: 'All crossings',
    features: 'What\'s coming',
    waitlist: 'Get first access',
    waitlistSub: 'Join the waitlist. We\'ll email when each piece is live and you\'ll get a 30-day free run on launch.',
    items: [
      { icon: Bell, title: 'Custom alerts', body: 'SMS + email when a crossing crosses your threshold. Per-crossing, per-direction, per-time-of-day. Quiet hours.' },
      { icon: Download, title: 'Historical CSV exports', body: '30/90/365-day wait time CSV per crossing. Per-hour or raw. Plug into your BI or scheduling models.' },
      { icon: Truck, title: 'Freight API', body: 'JSON API tuned for dispatch and TMS integration. Higher rate limits, advisories included, signed webhooks for status flips.' },
      { icon: LineChart, title: 'Fleet dashboard', body: 'Multi-crossing watchlist with rolling baseline, day-over-day deltas, and a single "where should I send the truck right now" view.' },
    ],
  },
  es: {
    eyebrow: 'Próximamente',
    headline: 'BorderPulse Pro',
    sub: 'Los datos que ya usas, más las alertas, el histórico y las herramientas para carga que los equipos han pedido. Misma fuente CBP. Hecho para operadores.',
    backToData: 'Todos los cruces',
    features: 'Qué viene',
    waitlist: 'Acceso anticipado',
    waitlistSub: 'Únete a la lista. Te avisamos cuando cada pieza entre en vivo y te damos 30 días gratis al lanzamiento.',
    items: [
      { icon: Bell, title: 'Alertas personalizadas', body: 'SMS + correo cuando un cruce pase tu umbral. Por cruce, por dirección, por hora del día. Horas silenciosas.' },
      { icon: Download, title: 'Exportes CSV históricos', body: 'CSV de tiempos de espera de 30/90/365 días por cruce. Por hora o crudo. Conecta con tu BI o modelos de scheduling.' },
      { icon: Truck, title: 'API para carga', body: 'API JSON afinada para despacho e integración con TMS. Mayores límites, advisories incluidos, webhooks firmados para cambios de estado.' },
      { icon: LineChart, title: 'Panel para flotillas', body: 'Watchlist de varios cruces con baseline rotativo, deltas día a día y una vista única de "a dónde mando el trailer ahora".' },
    ],
  },
};

export default function Pro({ forceLanguage }) {
  const persisted = usePersistentLanguage();
  const language = forceLanguage || persisted;

  useEffect(() => {
    if (!forceLanguage) return;
    try {
      localStorage.setItem('borderPulse_language', forceLanguage);
      window.dispatchEvent(new StorageEvent('storage', { key: 'borderPulse_language', newValue: forceLanguage }));
    } catch {}
  }, [forceLanguage]);

  useEffect(() => {
    const isEs = language === 'es';
    const title = isEs
      ? 'BorderPulse Pro — alertas, histórico y API para carga (lista de espera) | Border Pulse'
      : 'BorderPulse Pro — alerts, history, and freight API (waitlist) | Border Pulse';
    const description = isEs
      ? 'Alertas personalizadas, exportes CSV históricos, API para carga y panel para flotillas. Únete a la lista de espera y recibe 30 días gratis al lanzamiento.'
      : 'Custom alerts, historical CSV exports, a freight API, and a fleet dashboard. Join the waitlist and get a 30-day free run at launch.';
    const canonical = `https://borderpulse.com${isEs ? '/pro-es' : '/pro'}`;
    updatePageMeta({
      title,
      description,
      ogTitle: title,
      ogDescription: description,
      ogUrl: canonical,
      canonical,
    });
    return () => resetPageMeta();
  }, [language]);

  const t = COPY[language] || COPY.en;

  return (
    <div className="p-3 sm:p-4 lg:p-6 max-w-[900px] mx-auto">
      <div className="mb-3">
        <Link to="/">
          <Button variant="ghost" size="sm" className="gap-1 h-8 -ml-2">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="text-xs">{t.backToData}</span>
          </Button>
        </Link>
      </div>

      <header className="mb-8 rounded-2xl border border-slate-200 bg-gradient-to-br from-[#0b0b0b] to-slate-800 p-5 text-white sm:p-7">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide">
          <Sparkles className="h-3 w-3" />
          {t.eyebrow}
        </div>
        <h1 className="mt-3 text-3xl font-bold leading-tight sm:text-4xl">{t.headline}</h1>
        <p className="mt-3 max-w-2xl text-base text-slate-200">{t.sub}</p>
      </header>

      <section className="mb-10">
        <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">{t.features}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {t.items.map((it) => (
            <div key={it.title} className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                  <it.icon className="h-4 w-4" />
                </span>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{it.title}</h3>
              </div>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{it.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-10">
        <h2 className="mb-1 text-lg font-semibold text-slate-900 dark:text-white">{t.waitlist}</h2>
        <p className="mb-3 text-sm text-slate-600 dark:text-slate-300">{t.waitlistSub}</p>
        <EmailCapture variant="waitlist" source="pro-waitlist" language={language} />
      </section>

      <footer className="border-t border-slate-200 pt-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
        <p>
          {language === 'en'
            ? 'Pricing and launch timing TBD. Pro is built on the same CBP data source as the free Border Pulse dashboard.'
            : 'Precio y fecha de lanzamiento por definir. Pro se construye sobre la misma fuente CBP del panel gratuito de Border Pulse.'}
        </p>
      </footer>
    </div>
  );
}
