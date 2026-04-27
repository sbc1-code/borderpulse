import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Database, Lock, RefreshCw, BookOpen, Code as CodeIcon, ExternalLink } from 'lucide-react';
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

function StatCard({ value, label, sub }) {
  return (
    <div className="rounded-lg border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-900/40 p-4">
      <div className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tabular-nums">{value}</div>
      <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 mt-1">{label}</div>
      {sub && <div className="text-[11px] text-slate-500 dark:text-slate-500 mt-1">{sub}</div>}
    </div>
  );
}

export default function About() {
  const language = usePersistentLanguage();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/data/stats.json')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!cancelled) setStats(d); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const title = language === 'en'
      ? 'About Border Pulse | The U.S.-Mexico border wait time tracker'
      : 'Acerca de Border Pulse | Rastreador de tiempos de espera en la frontera EE.UU.-México';
    const description = language === 'en'
      ? 'Border Pulse is an independent, bilingual project that tracks every U.S.-Mexico land port of entry using official CBP data, every 15 minutes, with a 30-day rolling history. No login, no personal data collected.'
      : 'Border Pulse es un proyecto independiente y bilingüe que rastrea cada puerto terrestre de entrada EE.UU.-México usando datos oficiales de CBP, cada 15 minutos, con un historial rotativo de 30 días. Sin inicio de sesión, sin datos personales recopilados.';
    updatePageMeta({
      title,
      description,
      ogTitle: title,
      ogDescription: description,
      ogUrl: 'https://borderpulse.com/about',
      canonical: 'https://borderpulse.com/about',
    });
    return () => resetPageMeta();
  }, [language]);

  const statTiles = useMemo(() => {
    if (!stats) return [];
    return [
      {
        value: stats.crossings ?? 43,
        label: language === 'en' ? 'Land ports tracked' : 'Puertos rastreados',
      },
      {
        value: stats.total_samples ? stats.total_samples.toLocaleString() : '—',
        label: language === 'en' ? 'Wait-time samples' : 'Muestras de espera',
        sub: language === 'en'
          ? `${stats.lookback_days || 30}-day rolling`
          : `Rotativa ${stats.lookback_days || 30} días`,
      },
      {
        value: `${stats.refresh_minutes ?? 15} min`,
        label: language === 'en' ? 'Refresh cadence' : 'Frecuencia',
        sub: language === 'en' ? 'CBP feed driven' : 'Según el feed CBP',
      },
      {
        value: stats.blog_posts ?? 12,
        label: language === 'en' ? 'Blog posts' : 'Posts del blog',
        sub: language === 'en'
          ? `${stats.blog_posts_en ?? 0} EN · ${stats.blog_posts_es ?? 0} ES`
          : `${stats.blog_posts_en ?? 0} EN · ${stats.blog_posts_es ?? 0} ES`,
      },
    ];
  }, [stats, language]);

  return (
    <div className="p-3 sm:p-4 lg:p-6 max-w-[900px] mx-auto">
      <div className="mb-3">
        <Link to="/">
          <Button variant="ghost" size="sm" className="gap-1 h-8 -ml-2">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="text-xs">{language === 'en' ? 'All crossings' : 'Todos los cruces'}</span>
          </Button>
        </Link>
      </div>

      <header className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
          {language === 'en' ? 'About Border Pulse' : 'Acerca de Border Pulse'}
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
          {language === 'en'
            ? 'An independent, bilingual project that tracks every U.S.-Mexico land port of entry using official CBP data. Fast, clear, no login wall.'
            : 'Un proyecto independiente y bilingüe que rastrea cada puerto terrestre de entrada EE.UU.-México usando datos oficiales de CBP. Rápido, claro, sin muro de inicio de sesión.'}
        </p>
      </header>

      {/* Public stats */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wide mb-3">
          {language === 'en' ? 'By the numbers' : 'En números'}
        </h2>
        {stats ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {statTiles.map((t) => (
              <StatCard key={t.label} value={t.value} label={t.label} sub={t.sub} />
            ))}
          </div>
        ) : (
          <div className="text-xs text-slate-500">{language === 'en' ? 'Loading stats…' : 'Cargando estadísticas…'}</div>
        )}
        {stats?.generated_at && (
          <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-2">
            {language === 'en' ? 'Snapshot generated ' : 'Snapshot generado '}
            {new Date(stats.generated_at).toLocaleString(language === 'es' ? 'es-MX' : 'en-US')}
          </div>
        )}
      </section>

      {/* Methodology */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wide mb-3 flex items-center gap-2">
          <Database className="w-4 h-4 text-emerald-600" />
          {language === 'en' ? 'How the data works' : 'Cómo funcionan los datos'}
        </h2>
        <div className="space-y-3 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
          <p>
            {language === 'en'
              ? 'Northbound passenger wait times come directly from U.S. Customs and Border Protection (CBP), refreshed every 15 minutes. Each refresh writes a snapshot to /data/crossings.json — the same file the dashboard reads. Snapshots roll up into per-crossing aggregates with a 30-day lookback that power "vs. typical" comparisons and the lightest-hour predictions on every /best-time page.'
              : 'Los tiempos de espera hacia EE.UU. vienen directamente de U.S. Customs and Border Protection (CBP), actualizados cada 15 minutos. Cada actualización escribe un snapshot en /data/crossings.json — el mismo archivo que lee el panel. Los snapshots se agregan en datos por cruce con un retroceso de 30 días que alimentan las comparaciones "vs. lo normal" y las predicciones de hora más ligera en cada página /best-time.'}
          </p>
          <p>
            {language === 'en'
              ? 'Southbound estimates (where shown) are derived from Google Maps drive-time deltas on the approach segment vs. a free-flow baseline. They are estimates, not official. We label them clearly.'
              : 'Las estimaciones hacia México (cuando se muestran) se derivan de tiempos de manejo de Google Maps en el tramo de aproximación vs. una línea base sin tráfico. Son estimaciones, no oficiales. Las etiquetamos claramente.'}
          </p>
          <p>
            {language === 'en'
              ? 'The historical bucketing is sparse — a 30-day rolling window often gives only one or two samples per (day-of-week, hour) bucket — so we treat any observation as signal and fall back to the all-hours overall median when an hour-bucket is empty.'
              : 'El bucketing histórico es escaso — una ventana rotativa de 30 días a menudo da solo una o dos muestras por bucket (día de la semana, hora) — así que tratamos cualquier observación como señal y volvemos a la mediana general cuando un bucket de hora está vacío.'}
          </p>
        </div>
      </section>

      {/* Privacy */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wide mb-3 flex items-center gap-2">
          <Lock className="w-4 h-4 text-emerald-600" />
          {language === 'en' ? 'Privacy' : 'Privacidad'}
        </h2>
        <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300 list-disc pl-5">
          <li>
            {language === 'en'
              ? 'No login. No email. No account.'
              : 'Sin inicio de sesión. Sin email. Sin cuenta.'}
          </li>
          <li>
            {language === 'en'
              ? 'Anonymous page-view analytics via Umami (privacy-first, cookieless, no individual tracking). No ad pixels, no behavioral fingerprinting.'
              : 'Analítica anónima de vistas vía Umami (respetuosa, sin cookies, sin rastreo individual). Sin píxeles de anuncios, sin huella digital de comportamiento.'}
          </li>
          <li>
            {language === 'en'
              ? 'Ads only load if you opt in, per session. Off by default.'
              : 'Los anuncios solo cargan si los habilitas, por sesión. Desactivados por defecto.'}
          </li>
          <li>
            {language === 'en'
              ? 'Geolocation (when you tap "Show crossings near you") is processed in your browser — coordinates never leave your device. Only the resulting state filter (e.g., "California") is saved to localStorage.'
              : 'La geolocalización (cuando tocas "Mostrar cruces cerca de ti") se procesa en tu navegador — las coordenadas nunca salen de tu dispositivo. Solo se guarda el filtro de estado resultante (p.ej., "California") en localStorage.'}
          </li>
          <li>
            {language === 'en'
              ? 'Notification preferences (per-crossing thresholds) live in your browser\'s localStorage. They never get sent anywhere.'
              : 'Las preferencias de notificación (umbrales por cruce) viven en localStorage de tu navegador. Nunca se envían a ningún lado.'}
          </li>
          <li>
            {language === 'en'
              ? 'No data sale. No targeted advertising.'
              : 'Sin venta de datos. Sin publicidad dirigida.'}
          </li>
        </ul>
      </section>

      {/* Quick links */}
      <section className="mb-8 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Link
          to="/best-time"
          className="rounded-lg border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-900/40 p-3 hover:bg-slate-50 dark:hover:bg-gray-800 transition-colors"
        >
          <div className="flex items-center gap-2 text-sm font-medium text-slate-900 dark:text-white">
            <RefreshCw className="w-4 h-4 text-emerald-600" />
            {language === 'en' ? 'Best time to cross' : 'Mejor hora para cruzar'}
            <ArrowRight className="w-3.5 h-3.5 ml-auto text-slate-400" />
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {language === 'en' ? '43 crossings, hour by hour' : '43 cruces, hora por hora'}
          </div>
        </Link>
        <Link
          to="/api"
          className="rounded-lg border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-900/40 p-3 hover:bg-slate-50 dark:hover:bg-gray-800 transition-colors"
        >
          <div className="flex items-center gap-2 text-sm font-medium text-slate-900 dark:text-white">
            <CodeIcon className="w-4 h-4 text-emerald-600" />
            {language === 'en' ? 'Public API' : 'API pública'}
            <ArrowRight className="w-3.5 h-3.5 ml-auto text-slate-400" />
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {language === 'en' ? 'Free JSON feeds, no key' : 'JSON gratis, sin key'}
          </div>
        </Link>
        <Link
          to="/blog"
          className="rounded-lg border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-900/40 p-3 hover:bg-slate-50 dark:hover:bg-gray-800 transition-colors"
        >
          <div className="flex items-center gap-2 text-sm font-medium text-slate-900 dark:text-white">
            <BookOpen className="w-4 h-4 text-emerald-600" />
            {language === 'en' ? 'Blog' : 'Blog'}
            <ArrowRight className="w-3.5 h-3.5 ml-auto text-slate-400" />
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {language === 'en' ? 'Crossing data + program guides' : 'Datos de cruces + guías de programas'}
          </div>
        </Link>
      </section>

      {/* Disclaimer */}
      <footer className="text-xs text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-gray-700 pt-3">
        <p>
          {language === 'en'
            ? 'Border Pulse is an independent project. Not affiliated with U.S. Customs and Border Protection or any government agency. Wait time data is sourced from CBP\'s public feed at '
            : 'Border Pulse es un proyecto independiente. No afiliado a U.S. Customs and Border Protection ni a ninguna agencia gubernamental. Los datos provienen del feed público de CBP en '}
          <a href="https://bwt.cbp.gov/" target="_blank" rel="noopener noreferrer" className="underline inline-flex items-center gap-1">
            bwt.cbp.gov <ExternalLink className="w-3 h-3" />
          </a>
          .
        </p>
      </footer>
    </div>
  );
}
