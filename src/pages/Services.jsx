import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft, Check, Clock, Globe2, BarChart3, Truck, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { updatePageMeta, resetPageMeta } from '@/lib/seo';
import { usePersistentLanguage } from '@/lib/useLanguage';
import EmailCapture from '@/components/marketing/EmailCapture';

const STRIPE_LINK = import.meta.env.VITE_STRIPE_AUDIT_LINK || '';

const COPY = {
  en: {
    eyebrow: 'Cross-border digital ops',
    headline: 'A 10-day audit of your cross-border digital operation.',
    sub: '$1,500 flat. Bilingual (EN+ES) delivery. Built for freight, logistics, maquila operators, customs brokers, and US companies with Mexican supply chains.',
    primaryCta: 'Book the audit',
    primaryCtaSoon: 'Reserve a slot (opening soon)',
    secondaryCta: 'See what\'s included',
    includes: 'What the audit includes',
    audience: 'Who it\'s for',
    proof: 'Why trust this',
    faq: 'FAQ',
    backToData: 'All crossings',
    metrics: [
      { value: '10', label: 'business days end-to-end' },
      { value: '$1,500', label: 'flat. No retainer.' },
      { value: 'EN+ES', label: 'delivered in both' },
    ],
    includesItems: [
      { title: 'Analytics infrastructure review', body: 'GA4 / GTM / server-side events / consent. What\'s firing, what\'s missing, what\'s noisy. Cleanup spec, not just a list of problems.' },
      { title: 'Bilingual conversion path teardown', body: 'EN and ES funnels traced from ad to thank-you page. Drop-off points, translation gaps, broken hreflang, mismatched offers.' },
      { title: 'Freight + commercial UX scan', body: 'How carriers, brokers, and shippers actually use your site on mobile from a parked truck. Quote form friction, document upload paths, contact latency.' },
      { title: 'SEO + content map', body: 'What ranks in each language, what doesn\'t, and which two-language pillar pages would close the gap fastest.' },
      { title: 'Tech stack opinion', body: 'CMS, forms, chat, CRM. What\'s adding value and what\'s a tax. Concrete swap recommendations with budget.' },
      { title: '90-day action plan', body: 'Prioritized: what to fix this week, this month, this quarter. Owners and effort tags, so your team can execute without me.' },
    ],
    audienceItems: [
      { icon: Truck, title: 'Freight + logistics', body: 'US-based brokers, 3PLs, cross-border carriers. Quote-to-booking funnel, EN/ES parity, driver-facing UX.' },
      { icon: BarChart3, title: 'Maquila operators', body: 'Industrial parks, contract manufacturers, nearshoring assemblers. English-language site that lands US procurement buyers.' },
      { icon: Globe2, title: 'Customs brokers', body: 'NVOCC, licensed customs brokers on both sides. Document workflows, client portal friction, bilingual support.' },
      { icon: Clock, title: 'US companies w/ MX supply chains', body: 'Brands with MX production or distribution. Spanish-language careers, vendor, and partner experience.' },
    ],
    proofItems: [
      { value: '6 yr', body: 'analytics infrastructure at SeeScan Inc. — GA4/GTM owner across 250K+ annual sessions.' },
      { value: '281 leads', body: 'delivered for Los Bravos industrial parks. Built the bilingual lead system end-to-end.' },
      { value: 'This site', body: 'BorderPulse — built and shipped solo. ~43 crossings, ~25 bilingual posts, live CBP data, GA4-instrumented.' },
    ],
    faqItems: [
      { q: 'How does the 10 days work?', a: 'Day 1: kickoff call + access. Days 2-7: I work. Day 8: draft review with you. Days 9-10: revisions + final delivery (PDF report + Loom walkthrough + Notion handoff page).' },
      { q: 'Why $1,500 flat?', a: 'It\'s the right price for the audit scope. If the work that comes out of it warrants more, we scope that separately — no retainer trap.' },
      { q: 'Do you also implement?', a: 'The audit is the deliverable. If implementation is in scope, I either staff it from my network or hand the spec to your team. Pricing for execution is separate and based on the action plan.' },
      { q: 'Why bilingual?', a: 'Because the US-MX corridor is bilingual. Audits delivered in one language miss half the funnel. I grew up between EP-Juárez-SD; native EN+ES means the analysis doesn\'t lose anything in translation.' },
      { q: 'What if I just want a piece of this?', a: 'Reach out anyway. The audit has a fixed shape, but the underlying skills (GA4 setup, ES SEO, freight UX, conversion paths) are billed à la carte if the full audit isn\'t the fit.' },
    ],
    audit_now_unavailable: 'The audit calendar is opening. Drop your email and Sebastian will reach out within 24h with the next available start date.',
    backToTop: 'Back to top',
  },
  es: {
    eyebrow: 'Operaciones digitales transfronterizas',
    headline: 'Auditoría de 10 días para tu operación digital transfronteriza.',
    sub: '$1,500 plano. Entrega bilingüe (EN+ES). Hecho para transporte, logística, operadores de maquila, agencias aduanales y empresas de EE.UU. con cadenas de suministro en México.',
    primaryCta: 'Reservar auditoría',
    primaryCtaSoon: 'Reservar cupo (apertura próxima)',
    secondaryCta: 'Ver qué incluye',
    includes: 'Qué incluye la auditoría',
    audience: 'Para quién es',
    proof: 'Por qué confiar',
    faq: 'Preguntas frecuentes',
    backToData: 'Todos los cruces',
    metrics: [
      { value: '10', label: 'días hábiles de principio a fin' },
      { value: '$1,500', label: 'plano. Sin retainer.' },
      { value: 'EN+ES', label: 'entregable en ambos idiomas' },
    ],
    includesItems: [
      { title: 'Revisión de infraestructura analítica', body: 'GA4 / GTM / eventos server-side / consentimiento. Qué se dispara, qué falta, qué hace ruido. Spec de limpieza, no solo una lista de problemas.' },
      { title: 'Análisis bilingüe del funnel de conversión', body: 'Funnels EN y ES rastreados desde el anuncio hasta la página de agradecimiento. Puntos de caída, brechas de traducción, hreflang roto, ofertas inconsistentes.' },
      { title: 'Escaneo de UX para carga y comercial', body: 'Cómo los transportistas, agentes y embarcadores realmente usan tu sitio desde un celular en un trailer. Fricción en cotizaciones, rutas de carga de documentos, latencia de contacto.' },
      { title: 'Mapa SEO + contenido', body: 'Qué rankea en cada idioma, qué no, y qué páginas pilar bilingües cerrarían la brecha más rápido.' },
      { title: 'Opinión sobre tu stack', body: 'CMS, formularios, chat, CRM. Qué agrega valor y qué es impuesto. Recomendaciones concretas de cambio con presupuesto.' },
      { title: 'Plan de acción a 90 días', body: 'Priorizado: qué arreglar esta semana, este mes, este trimestre. Con responsables y esfuerzo, para que tu equipo ejecute sin mí.' },
    ],
    audienceItems: [
      { icon: Truck, title: 'Transporte + logística', body: 'Agentes en EE.UU., 3PLs, carriers transfronterizos. Funnel cotización-reserva, paridad EN/ES, UX para choferes.' },
      { icon: BarChart3, title: 'Operadores de maquila', body: 'Parques industriales, manufactureros por contrato, ensambladores nearshoring. Sitio en inglés que aterriza compradores en EE.UU.' },
      { icon: Globe2, title: 'Agencias aduanales', body: 'NVOCC, agentes aduanales licenciados de ambos lados. Flujos documentales, fricción en portales de cliente, soporte bilingüe.' },
      { icon: Clock, title: 'Empresas EE.UU. con cadena MX', body: 'Marcas con producción o distribución en México. Experiencia de carreras, proveedores y socios en español.' },
    ],
    proofItems: [
      { value: '6 años', body: 'infraestructura analítica en SeeScan Inc. — dueño de GA4/GTM con 250K+ sesiones anuales.' },
      { value: '281 leads', body: 'entregados para Los Bravos parques industriales. Sistema bilingüe de leads de punta a punta.' },
      { value: 'Este sitio', body: 'BorderPulse — construido y publicado en solo. ~43 cruces, ~25 posts bilingües, datos CBP en vivo, instrumentado con GA4.' },
    ],
    faqItems: [
      { q: '¿Cómo funcionan los 10 días?', a: 'Día 1: kickoff + accesos. Días 2-7: trabajo. Día 8: revisión de borrador contigo. Días 9-10: ajustes + entrega final (reporte PDF + walkthrough en Loom + página de handoff en Notion).' },
      { q: '¿Por qué $1,500 plano?', a: 'Es el precio correcto para el alcance. Si el trabajo que resulte amerita más, se scope aparte — sin trampa de retainer.' },
      { q: '¿También implementas?', a: 'La auditoría es el entregable. Si la implementación entra, la cubro con mi red o le paso el spec a tu equipo. La ejecución se cotiza aparte según el plan de acción.' },
      { q: '¿Por qué bilingüe?', a: 'Porque el corredor EE.UU.-MX es bilingüe. Auditorías en un idioma pierden la mitad del funnel. Crecí entre EP-Juárez-SD; EN+ES nativo significa que el análisis no se pierde en traducción.' },
      { q: '¿Y si solo quiero una parte?', a: 'Escríbeme igual. La auditoría tiene forma fija, pero las habilidades base (setup de GA4, SEO en ES, UX de carga, funnels) se cobran à la carte si la auditoría completa no es el fit.' },
    ],
    audit_now_unavailable: 'El calendario de auditorías está abriendo. Deja tu correo y Sebastián te escribe en menos de 24h con la próxima fecha disponible.',
    backToTop: 'Volver arriba',
  },
};

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-slate-200 last:border-0 dark:border-slate-800">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 py-3 text-left"
        aria-expanded={open}
      >
        <span className="text-sm font-medium text-slate-900 dark:text-white">{q}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <p className="pb-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{a}</p>
      )}
    </div>
  );
}

export default function Services({ forceLanguage }) {
  const persisted = usePersistentLanguage();
  const location = useLocation();
  const language = forceLanguage || persisted;

  // /servicios forces ES at mount; /services forces EN at mount.
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
      ? 'Servicios — Auditoría digital transfronteriza ($1,500, 10 días, EN+ES) | Border Pulse'
      : 'Services — Cross-border digital ops audit ($1,500, 10 days, EN+ES) | Border Pulse';
    const description = isEs
      ? 'Auditoría digital transfronteriza de 10 días para transporte, maquila, aduanales y empresas EE.UU. con cadena MX. Entregable bilingüe EN+ES, $1,500 plano.'
      : 'A 10-day cross-border digital operations audit for freight, maquila, customs brokers, and US companies with Mexican supply chains. Bilingual EN+ES delivery. $1,500 flat.';
    const canonical = `https://borderpulse.com${isEs ? '/servicios' : '/services'}`;
    updatePageMeta({
      title,
      description,
      ogTitle: title,
      ogDescription: description,
      ogUrl: canonical,
      canonical,
    });
    return () => resetPageMeta();
  }, [language, location.pathname]);

  const t = COPY[language] || COPY.en;
  const stripeAvailable = Boolean(STRIPE_LINK);

  return (
    <div className="p-3 sm:p-4 lg:p-6 max-w-[960px] mx-auto">
      <div className="mb-3">
        <Link to="/">
          <Button variant="ghost" size="sm" className="gap-1 h-8 -ml-2">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="text-xs">{t.backToData}</span>
          </Button>
        </Link>
      </div>

      <header className="mb-8 rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-5 sm:p-7 dark:border-slate-800 dark:from-slate-900 dark:to-slate-950">
        <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
          {t.eyebrow}
        </div>
        <h1 className="mt-2 text-3xl font-bold leading-tight text-slate-900 dark:text-white sm:text-4xl">
          {t.headline}
        </h1>
        <p className="mt-3 max-w-2xl text-base text-slate-600 dark:text-slate-300">
          {t.sub}
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          {stripeAvailable ? (
            <a
              href={STRIPE_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 items-center justify-center rounded-lg bg-[#0b0b0b] px-5 text-sm font-semibold text-white hover:bg-slate-800 dark:bg-white dark:text-[#0b0b0b] dark:hover:bg-slate-200"
            >
              {t.primaryCta}
            </a>
          ) : (
            <a
              href="#reserve"
              className="inline-flex h-11 items-center justify-center rounded-lg bg-[#0b0b0b] px-5 text-sm font-semibold text-white hover:bg-slate-800 dark:bg-white dark:text-[#0b0b0b] dark:hover:bg-slate-200"
            >
              {t.primaryCtaSoon}
            </a>
          )}
          <a
            href="#includes"
            className="inline-flex h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {t.secondaryCta}
          </a>
        </div>
        <div className="mt-6 grid grid-cols-3 gap-3">
          {t.metrics.map((m) => (
            <div key={m.label} className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
              <div className="text-xl font-bold text-slate-900 tabular-nums dark:text-white sm:text-2xl">{m.value}</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 sm:text-xs">{m.label}</div>
            </div>
          ))}
        </div>
      </header>

      <section id="includes" className="mb-10">
        <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">{t.includes}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {t.includesItems.map((item) => (
            <div key={item.title} className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
              <div className="flex items-start gap-2.5">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-white">{item.title}</div>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{item.body}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-10">
        <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">{t.audience}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {t.audienceItems.map((item) => (
            <div key={item.title} className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                <item.icon className="h-4 w-4 text-emerald-600" />
                {item.title}
              </div>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-10">
        <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">{t.proof}</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {t.proofItems.map((p) => (
            <div key={p.body} className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
              <div className="text-2xl font-bold text-slate-900 tabular-nums dark:text-white">{p.value}</div>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="reserve" className="mb-10">
        <h2 className="mb-3 text-lg font-semibold text-slate-900 dark:text-white">
          {language === 'en' ? 'Reserve a slot' : 'Reservar un cupo'}
        </h2>
        {!stripeAvailable && (
          <p className="mb-3 text-sm text-slate-600 dark:text-slate-300">{t.audit_now_unavailable}</p>
        )}
        <EmailCapture variant="audit" source="services-reserve" language={language} />
      </section>

      <section className="mb-10">
        <h2 className="mb-2 text-lg font-semibold text-slate-900 dark:text-white">{t.faq}</h2>
        <div className="rounded-lg border border-slate-200 bg-white px-4 dark:border-slate-800 dark:bg-slate-950">
          {t.faqItems.map((item) => (
            <FaqItem key={item.q} q={item.q} a={item.a} />
          ))}
        </div>
      </section>

      <footer className="border-t border-slate-200 pt-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
        <p>
          {language === 'en'
            ? 'Border Pulse is an independent project. Wait time data is sourced from U.S. Customs and Border Protection.'
            : 'Border Pulse es un proyecto independiente. Los datos provienen de U.S. Customs and Border Protection.'}
        </p>
      </footer>
    </div>
  );
}
