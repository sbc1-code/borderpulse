import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Code as CodeIcon, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { updatePageMeta, resetPageMeta } from '@/lib/seo';

function usePersistentLanguage() {
  const [lang, setLang] = useState(() => localStorage.getItem('borderPulse_language') || 'en');
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === 'borderPulse_language' && e.newValue) setLang(e.newValue);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);
  return lang;
}

function CodeBlock({ children }) {
  return (
    <pre className="rounded-md border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-900 px-3 py-2 text-xs font-mono text-slate-800 dark:text-slate-200 overflow-x-auto whitespace-pre">
      {children}
    </pre>
  );
}

function Endpoint({ method = 'GET', path, title, desc, sample, anchor }) {
  return (
    <section id={anchor} className="border border-slate-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-900/40 mb-3 scroll-mt-6">
      <div className="flex items-baseline gap-2 mb-1 flex-wrap">
        <span className="text-[10px] font-bold tracking-wide px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300">
          {method}
        </span>
        <code className="text-sm font-mono text-slate-900 dark:text-slate-100 break-all">{path}</code>
      </div>
      <h3 className="text-sm font-semibold text-slate-900 dark:text-white mt-2">{title}</h3>
      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{desc}</p>
      {sample && (
        <div className="mt-3">
          <div className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1">Sample response</div>
          <CodeBlock>{sample}</CodeBlock>
        </div>
      )}
    </section>
  );
}

const ENDPOINTS = [
  {
    anchor: 'crossings',
    path: '/data/crossings.json',
    title: { en: 'All crossings + current wait times', es: 'Todos los cruces + tiempos actuales' },
    desc: {
      en: 'Every land port of entry on the U.S./Mexico border with the latest CBP wait time, lane breakdown, port hours, and any operational notice. Refreshed every 15 minutes.',
      es: 'Cada puerto terrestre de entrada en la frontera EE.UU./México con el tiempo de espera más reciente de CBP, desglose de carriles, horario y avisos operativos. Actualizado cada 15 minutos.',
    },
    sample: `{
  "source": "CBP Border Wait Times",
  "fetched_at": "2026-04-27T19:00:58Z",
  "count": 43,
  "crossings": [
    {
      "port_number": "250401",
      "name": "San Ysidro",
      "state": "CA",
      "border": "Mexican Border",
      "hours": "Open 24 hours",
      "port_status": "Open",
      "current_wait_time": 145,
      "status": "heavy",
      "lanes": { "passenger_standard": { ... }, ... },
      "updated_at": "4/27/2026 14:00:58"
    },
    ...
  ]
}`,
  },
  {
    anchor: 'aggregates',
    path: '/data/aggregates/{slug}.json',
    title: { en: 'Historical patterns per crossing (30-day rolling)', es: 'Patrones históricos por cruce (30 días)' },
    desc: {
      en: 'Median northbound wait by hour and day-of-week, plus an overall median and lightest-hour pick, for each port. Built from the 30-day rolling sample of /data/crossings.json snapshots.',
      es: 'Mediana del tiempo de espera hacia EE.UU. por hora y día de la semana, más una mediana general y la hora más ligera, por puerto. Calculada con muestras de los últimos 30 días.',
    },
    sample: `{
  "port_number": "250401",
  "name": "San Ysidro",
  "lookback_days": 30,
  "sample_count": 231,
  "overall_median": 125,
  "overall_best_hour": 1,
  "overall_best_median": 115,
  "by_hour": [
    { "day": 1, "hour": 0, "median": 175, "samples": 1 },
    { "day": 1, "hour": 1, "median": 115, "samples": 2 },
    ...
  ],
  "generated_at": "2026-04-27T16:36:37Z"
}`,
  },
  {
    anchor: 'timelines',
    path: '/data/timelines/{slug}.json',
    title: { en: 'Recent advisories + news per crossing', es: 'Avisos y noticias recientes por cruce' },
    desc: {
      en: 'Curated timeline of public news + government feed items relevant to the crossing. Not every crossing has an entry — see /data/timelines/index.json for the list of slugs that do.',
      es: 'Línea de tiempo curada con noticias públicas y avisos oficiales relevantes para el cruce. No todos los cruces tienen entradas — consulta /data/timelines/index.json para la lista de slugs disponibles.',
    },
    sample: `{
  "slug": "san-ysidro",
  "items": [
    {
      "title": "CBP officers seize fentanyl, heroin at San Ysidro POE",
      "source": "CBP Newsroom",
      "url": "https://...",
      "date": "2026-03-31"
    },
    ...
  ],
  "updated_at": "2026-04-27T15:00:00Z"
}`,
  },
  {
    anchor: 'timelines-index',
    path: '/data/timelines/index.json',
    title: { en: 'Index of crossings with timelines', es: 'Índice de cruces con líneas de tiempo' },
    desc: {
      en: 'Lightweight index telling you which slugs currently have a /data/timelines/{slug}.json file. Check this before requesting an individual timeline to avoid 404s.',
      es: 'Índice ligero que indica qué slugs tienen actualmente un archivo /data/timelines/{slug}.json. Consúltalo antes de pedir una línea de tiempo individual para evitar 404.',
    },
    sample: `{
  "generated_at": "2026-04-27T16:00:00Z",
  "count": 4,
  "slugs": ["hidalgo-pharr-hidalgo", "hidalgo-pharr-pharr", "otay-mesa", "san-ysidro"]
}`,
  },
  {
    anchor: 'blog',
    path: '/data/blog/index.json',
    title: { en: 'Blog post metadata', es: 'Metadatos del blog' },
    desc: {
      en: 'Title, slug, language, pillar, tags, hero image, and date for every post on /blog. Pair with /data/blog/tags.json for the canonical tag list.',
      es: 'Título, slug, idioma, pilar, tags, imagen y fecha de cada post en /blog. Combina con /data/blog/tags.json para la lista canónica de tags.',
    },
    sample: `{
  "posts": [
    {
      "title": "Best time to cross Nogales DeConcini...",
      "slug": "best-time-to-cross-nogales-deconcini",
      "lang": "en",
      "pillar": "data-analysis",
      "date": "2026-04-24",
      "tags": ["nogales", "deconcini", ...]
    },
    ...
  ]
}`,
  },
];

export default function Api() {
  const language = usePersistentLanguage();

  useEffect(() => {
    const title = language === 'en'
      ? 'Border Pulse API | Public JSON endpoints for border wait times'
      : 'Border Pulse API | Endpoints JSON públicos de tiempos de espera';
    const description = language === 'en'
      ? 'Free public JSON feeds for U.S.-Mexico border wait times, historical patterns, and per-crossing advisories. No auth, no key, refreshed every 15 minutes.'
      : 'Endpoints JSON públicos y gratuitos para tiempos de espera en la frontera EE.UU.-México, patrones históricos y avisos por cruce. Sin autenticación, sin API key, actualizados cada 15 minutos.';
    updatePageMeta({
      title,
      description,
      ogTitle: title,
      ogDescription: description,
      ogUrl: 'https://borderpulse.com/api',
      canonical: 'https://borderpulse.com/api',
    });
    return () => resetPageMeta();
  }, [language]);

  return (
    <div className="p-3 sm:p-4 lg:p-6 max-w-[900px] mx-auto">
      <div className="mb-3">
        <Link to="/">
          <Button variant="ghost" size="sm" className="gap-1 h-8 -ml-2">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="text-xs">
              {language === 'en' ? 'All crossings' : 'Todos los cruces'}
            </span>
          </Button>
        </Link>
      </div>

      <header className="mb-5">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <CodeIcon className="w-6 h-6 text-emerald-600" />
          {language === 'en' ? 'Border Pulse API' : 'API de Border Pulse'}
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
          {language === 'en'
            ? 'Free public JSON feeds for U.S.-Mexico border wait times. No auth, no API key, refreshed every 15 minutes. Built on top of the same data we use to render borderpulse.com.'
            : 'Endpoints JSON públicos y gratuitos para tiempos de espera en la frontera EE.UU.-México. Sin autenticación, sin API key, actualizados cada 15 minutos. Construido sobre los mismos datos que usamos para renderizar borderpulse.com.'}
        </p>
      </header>

      <section className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-lg border border-slate-200 dark:border-gray-700 p-3 bg-white dark:bg-gray-900/40">
          <div className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {language === 'en' ? 'Base URL' : 'URL base'}
          </div>
          <code className="text-xs font-mono text-slate-900 dark:text-slate-100">https://borderpulse.com</code>
        </div>
        <div className="rounded-lg border border-slate-200 dark:border-gray-700 p-3 bg-white dark:bg-gray-900/40">
          <div className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {language === 'en' ? 'Refresh cadence' : 'Frecuencia de actualización'}
          </div>
          <span className="text-xs text-slate-900 dark:text-slate-100">
            {language === 'en' ? 'Every 15 minutes (CBP feed cadence)' : 'Cada 15 minutos (cadencia de CBP)'}
          </span>
        </div>
        <div className="rounded-lg border border-slate-200 dark:border-gray-700 p-3 bg-white dark:bg-gray-900/40">
          <div className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {language === 'en' ? 'Auth' : 'Autenticación'}
          </div>
          <span className="text-xs text-slate-900 dark:text-slate-100">
            {language === 'en' ? 'None — open data, CORS-enabled' : 'Ninguna — datos abiertos, CORS habilitado'}
          </span>
        </div>
        <div className="rounded-lg border border-slate-200 dark:border-gray-700 p-3 bg-white dark:bg-gray-900/40">
          <div className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {language === 'en' ? 'Source of record' : 'Fuente original'}
          </div>
          <a
            href="https://bwt.cbp.gov/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-emerald-700 dark:text-emerald-400 hover:underline inline-flex items-center gap-1"
          >
            CBP <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </section>

      <h2 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wide mb-2">
        {language === 'en' ? 'Endpoints' : 'Endpoints'}
      </h2>

      {ENDPOINTS.map((e) => (
        <Endpoint
          key={e.anchor}
          anchor={e.anchor}
          path={e.path}
          title={e.title[language] || e.title.en}
          desc={e.desc[language] || e.desc.en}
          sample={e.sample}
        />
      ))}

      <footer className="mt-8 pt-3 border-t border-slate-200 dark:border-gray-700 text-xs text-slate-500 dark:text-slate-400">
        {language === 'en'
          ? 'Wait time data is sourced from U.S. Customs and Border Protection. Border Pulse is an independent project, not affiliated with CBP.'
          : 'Los datos provienen de U.S. Customs and Border Protection. Border Pulse es un proyecto independiente, no afiliado a CBP.'}
      </footer>
    </div>
  );
}
