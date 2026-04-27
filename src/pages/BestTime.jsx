import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Clock, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { dataService } from '@/components/utils/dataService';
import { buildSlugMap } from '@/lib/slugs';
import { updatePageMeta, resetPageMeta } from '@/lib/seo';
import { nearestCrossings } from '@/lib/geo';

const DAY_LABELS = {
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  es: ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'],
};
const DAY_SHORT = {
  en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  es: ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'],
};

const MIN_SAMPLES = 1;

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

function formatHour12(h, lang) {
  const suffix = h >= 12 ? (lang === 'en' ? 'PM' : 'p. m.') : (lang === 'en' ? 'AM' : 'a. m.');
  return `${h % 12 || 12} ${suffix}`;
}

function lightestHourFor(byHour, day) {
  if (!Array.isArray(byHour) || !byHour.length) return null;
  const candidates = byHour
    .filter((h) => h.day === day && typeof h.median === 'number' && (h.samples || 0) >= MIN_SAMPLES)
    .sort((a, b) => a.median - b.median);
  if (candidates.length) return candidates[0];
  // Fallback: ignore the sample floor
  const loose = byHour.filter((h) => h.day === day && typeof h.median === 'number').sort((a, b) => a.median - b.median);
  return loose[0] || null;
}

function dayMedianFor(byHour, day) {
  if (!Array.isArray(byHour) || !byHour.length) return null;
  const day_entries = byHour.filter((h) => h.day === day && typeof h.median === 'number');
  if (!day_entries.length) return null;
  const sum = day_entries.reduce((acc, h) => acc + h.median, 0);
  return Math.round(sum / day_entries.length);
}

function HourBar({ entry, max, lang, isCurrentHour, isLightestHour }) {
  const median = entry?.median;
  const sparse = !entry || median == null || (entry.samples || 0) < MIN_SAMPLES;
  const widthPct = sparse || max === 0 ? 0 : Math.max(8, Math.round((median / max) * 100));
  const filledColor = sparse
    ? 'bg-slate-200 dark:bg-gray-700'
    : median < 30
      ? 'bg-emerald-500'
      : median < 60
        ? 'bg-amber-500'
        : 'bg-rose-500';
  const ringClass = isLightestHour
    ? 'ring-2 ring-emerald-500'
    : isCurrentHour
      ? 'ring-2 ring-sky-500'
      : '';

  return (
    <div className="flex items-center gap-2">
      <div className="w-12 text-[11px] text-slate-500 dark:text-slate-400 tabular-nums flex-shrink-0">
        {entry ? formatHour12(entry.hour, lang) : ''}
      </div>
      <div className={`flex-1 h-5 rounded-md bg-slate-100 dark:bg-gray-800 overflow-hidden ${ringClass}`}>
        <div className={`h-full ${filledColor} flex items-center justify-end pr-1.5`} style={{ width: `${widthPct}%` }}>
          {!sparse && (
            <span className="text-[10px] font-bold text-white tabular-nums">
              {median}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function BestTime() {
  const { slug } = useParams();
  const language = usePersistentLanguage();
  const [crossings, setCrossings] = useState([]);
  const [aggregate, setAggregate] = useState(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    dataService.getBorderData()
      .then((doc) => {
        if (!cancelled) {
          setCrossings(doc?.crossings || []);
          setLoaded(true);
        }
      })
      .catch(() => { if (!cancelled) setLoaded(true); });
    return () => { cancelled = true; };
  }, []);

  const { crossing, portToSlug, canonicalSlug } = useMemo(() => {
    if (!crossings.length) return { crossing: null, portToSlug: {}, canonicalSlug: slug };
    const { slugToPort, portToSlug } = buildSlugMap(crossings);
    const port = slugToPort[slug];
    const c = port ? crossings.find((x) => x.port_number === port) : null;
    return { crossing: c, portToSlug, canonicalSlug: c ? portToSlug[c.port_number] : slug };
  }, [crossings, slug]);

  useEffect(() => {
    if (!canonicalSlug || !crossing) return;
    let cancelled = false;
    fetch(`/data/aggregates/${canonicalSlug}.json`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (!cancelled) setAggregate(data); })
      .catch(() => { if (!cancelled) setAggregate(null); });
    return () => { cancelled = true; };
  }, [canonicalSlug, crossing]);

  useEffect(() => {
    if (!crossing) return;
    const title = language === 'en'
      ? `Best time to cross ${crossing.name} | Border Pulse`
      : `Mejor hora para cruzar ${crossing.name} | Border Pulse`;
    const description = language === 'en'
      ? `Lightest typical hour to cross ${crossing.name} based on the last 30 days of CBP wait time data, hour by hour, every day of the week.`
      : `Hora típica más ligera para cruzar ${crossing.name} basado en los últimos 30 días de tiempos de espera de CBP, hora por hora, cada día de la semana.`;
    const url = `https://borderpulse.com/best-time/${canonicalSlug}`;
    updatePageMeta({
      title,
      description,
      ogTitle: title,
      ogDescription: description,
      ogUrl: url,
      canonical: url,
    });
    return () => resetPageMeta();
  }, [crossing, language, canonicalSlug]);

  const today = new Date().getDay();
  const currentHour = new Date().getHours();
  const todayLight = aggregate ? lightestHourFor(aggregate.by_hour, today) : null;
  const todayMedian = aggregate ? dayMedianFor(aggregate.by_hour, today) : null;

  const todayHours = useMemo(() => {
    if (!aggregate?.by_hour) return [];
    const map = new Map(aggregate.by_hour.filter((h) => h.day === today).map((h) => [h.hour, h]));
    const out = [];
    for (let h = 0; h < 24; h++) out.push(map.get(h) || { hour: h, day: today, median: null, samples: 0 });
    return out;
  }, [aggregate, today]);

  const max = useMemo(() => {
    if (!todayHours.length) return 0;
    return todayHours.reduce((acc, h) => (typeof h.median === 'number' && h.median > acc ? h.median : acc), 0);
  }, [todayHours]);

  const weekSummary = useMemo(() => {
    if (!aggregate?.by_hour) return [];
    return [0, 1, 2, 3, 4, 5, 6].map((d) => ({
      day: d,
      light: lightestHourFor(aggregate.by_hour, d),
      median: dayMedianFor(aggregate.by_hour, d),
    }));
  }, [aggregate]);

  const nearby = useMemo(() => {
    if (!crossing || !crossings.length) return [];
    return nearestCrossings(crossing, crossings, 3);
  }, [crossing, crossings]);

  if (loaded && !crossing) {
    return <Navigate to="/" replace />;
  }

  if (!loaded || !crossing) {
    return (
      <div className="p-6 max-w-[900px] mx-auto">
        <div className="text-sm text-slate-500">{language === 'en' ? 'Loading…' : 'Cargando…'}</div>
      </div>
    );
  }

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

      <header className="mb-5">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
          {language === 'en'
            ? `Best time to cross ${crossing.name}`
            : `Mejor hora para cruzar ${crossing.name}`}
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
          {language === 'en'
            ? `Based on the last 30 days of U.S. Customs and Border Protection wait time data at ${crossing.name}. Times reflect typical northbound passenger waits by hour and day-of-week. Patterns shift around U.S. federal holidays.`
            : `Basado en los últimos 30 días de datos de tiempos de espera de U.S. Customs and Border Protection en ${crossing.name}. Los tiempos reflejan esperas típicas hacia EE.UU. por hora y día de la semana. Los patrones cambian en días festivos federales de EE.UU.`}
        </p>
      </header>

      {/* Today's headline answer */}
      <section className="mb-6 rounded-lg border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-900/20 p-4">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <h2 className="text-sm font-semibold text-emerald-900 dark:text-emerald-200 uppercase tracking-wide">
            {language === 'en' ? `Lightest hour today (${DAY_SHORT.en[today]})` : `Hora más ligera hoy (${DAY_SHORT.es[today]})`}
          </h2>
        </div>
        {todayLight ? (
          <>
            <div className="text-3xl font-bold text-emerald-900 dark:text-emerald-100">
              {formatHour12(todayLight.hour, language)}
            </div>
            <p className="text-sm text-emerald-800 dark:text-emerald-200 mt-1">
              {language === 'en'
                ? `Median wait at this hour: ${todayLight.median} min. Day average: ${todayMedian != null ? `${todayMedian} min` : 'n/a'}.`
                : `Mediana de espera a esta hora: ${todayLight.median} min. Promedio del día: ${todayMedian != null ? `${todayMedian} min` : 'n/d'}.`}
            </p>
          </>
        ) : (
          <p className="text-sm text-emerald-800 dark:text-emerald-200">
            {language === 'en'
              ? `Not enough sampled data for ${DAY_LABELS.en[today]} yet. Try the live wait times instead.`
              : `Aún no hay suficientes datos muestreados para ${DAY_LABELS.es[today]}. Consulta los tiempos en vivo.`}
          </p>
        )}
      </section>

      {/* Today's hour-by-hour */}
      <section className="mb-6">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wide mb-3">
          {language === 'en' ? `Hour by hour today (${DAY_LABELS.en[today]})` : `Hora por hora hoy (${DAY_LABELS.es[today]})`}
        </h2>
        <div className="rounded-lg border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-900/40 p-3 space-y-1.5">
          {todayHours.map((h) => (
            <HourBar
              key={h.hour}
              entry={h}
              max={max}
              lang={language}
              isCurrentHour={h.hour === currentHour}
              isLightestHour={todayLight && h.hour === todayLight.hour}
            />
          ))}
        </div>
        <div className="flex flex-wrap gap-3 mt-2 text-[10px] text-slate-500 dark:text-slate-400">
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            {language === 'en' ? '< 30 min' : '< 30 min'}
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            {language === 'en' ? '30–59 min' : '30–59 min'}
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            {language === 'en' ? '60+ min' : '60+ min'}
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-gray-600" />
            {language === 'en' ? 'Not enough data' : 'Sin datos suficientes'}
          </span>
        </div>
      </section>

      {/* Week summary */}
      <section className="mb-6">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wide mb-3">
          {language === 'en' ? 'Lightest hour by day of week' : 'Hora más ligera por día'}
        </h2>
        <div className="rounded-lg border border-slate-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-gray-900 text-slate-600 dark:text-slate-300 text-[11px] uppercase tracking-wide">
              <tr>
                <th className="text-left px-3 py-2 font-medium">{language === 'en' ? 'Day' : 'Día'}</th>
                <th className="text-left px-3 py-2 font-medium">{language === 'en' ? 'Lightest hour' : 'Hora más ligera'}</th>
                <th className="text-right px-3 py-2 font-medium">{language === 'en' ? 'Median (min)' : 'Mediana (min)'}</th>
                <th className="text-right px-3 py-2 font-medium hidden sm:table-cell">{language === 'en' ? 'Day avg (min)' : 'Prom. día (min)'}</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900/40 divide-y divide-slate-200 dark:divide-gray-800">
              {weekSummary.map((row) => (
                <tr key={row.day} className={row.day === today ? 'bg-emerald-50 dark:bg-emerald-900/10' : ''}>
                  <td className="px-3 py-2 text-slate-900 dark:text-slate-100">
                    {DAY_LABELS[language][row.day]}
                    {row.day === today && (
                      <span className="ml-1.5 text-[10px] text-emerald-600 dark:text-emerald-400">·{language === 'en' ? 'today' : 'hoy'}</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-slate-900 dark:text-slate-100">
                    {row.light ? formatHour12(row.light.hour, language) : '—'}
                  </td>
                  <td className="px-3 py-2 text-right text-slate-900 dark:text-slate-100 tabular-nums">
                    {row.light?.median ?? '—'}
                  </td>
                  <td className="px-3 py-2 text-right text-slate-900 dark:text-slate-100 tabular-nums hidden sm:table-cell">
                    {row.median ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* See current wait CTA */}
      <section className="mb-6">
        <Link
          to={`/crossing/${canonicalSlug}`}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-900/40 px-4 py-3 text-sm font-medium text-slate-900 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-gray-800 transition-colors"
        >
          <Clock className="w-4 h-4 text-emerald-600" />
          {language === 'en'
            ? `See current wait time at ${crossing.name}`
            : `Ver tiempo de espera actual en ${crossing.name}`}
          <ArrowRight className="w-4 h-4 ml-1" />
        </Link>
      </section>

      {/* Nearby crossings */}
      {nearby.length > 0 && (
        <section className="mb-6">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wide mb-3">
            {language === 'en' ? 'Compare nearby crossings' : 'Compara cruces cercanos'}
          </h2>
          <div className="space-y-2">
            {nearby.map(({ crossing: c }) => {
              const s = portToSlug[c.port_number];
              if (!s) return null;
              return (
                <Link
                  key={c.port_number}
                  to={`/best-time/${s}`}
                  className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-900/40 px-3 py-2 hover:bg-slate-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="text-sm font-medium text-slate-900 dark:text-slate-100">{c.name}</div>
                  <ArrowRight className="w-4 h-4 text-slate-400" />
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <footer className="text-xs text-slate-500 border-t border-slate-200 dark:border-gray-700 pt-3">
        {language === 'en' ? 'Source: ' : 'Fuente: '}
        <a href="https://bwt.cbp.gov/" className="underline" target="_blank" rel="noopener noreferrer">
          U.S. Customs and Border Protection
        </a>
        {language === 'en'
          ? ' · Patterns derived from 30-day rolling sample.'
          : ' · Patrones derivados de muestra rotativa de 30 días.'}
      </footer>
    </div>
  );
}
