import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { dataService } from '@/components/utils/dataService';
import { buildSlugMap } from '@/lib/slugs';
import { getWaitMinutes } from '@/components/utils/crossingDirection';
import { updatePageMeta, resetPageMeta } from '@/lib/seo';
import { usePersistentLanguage } from '@/lib/useLanguage';

// /compare/<slugA>-vs-<slugB> — side-by-side live wait + 30-day pattern.
// The pair is parsed from the single :pair param so we don't have to add a
// new dynamic-segment shape (and so the URL reads naturally as one slug).

const MIN_SAMPLES = 1;

function formatHour12(h, lang) {
  if (h == null) return '';
  const suffix = h >= 12 ? (lang === 'en' ? 'PM' : 'p. m.') : (lang === 'en' ? 'AM' : 'a. m.');
  return `${h % 12 || 12} ${suffix}`;
}

function parsePair(pair) {
  if (!pair || typeof pair !== 'string') return null;
  // Split on the literal "-vs-" separator — everything before is slugA,
  // everything after is slugB. Both halves can themselves contain dashes
  // (e.g. "el-paso-paso-del-norte-pdn"), so we use the unique " -vs- "
  // delimiter rather than a regex split on dashes.
  const idx = pair.indexOf('-vs-');
  if (idx <= 0 || idx + 4 >= pair.length) return null;
  const a = pair.slice(0, idx);
  const b = pair.slice(idx + 4);
  if (!a || !b || a === b) return null;
  return { a, b };
}

function todayLightest(byHour) {
  if (!Array.isArray(byHour) || !byHour.length) return null;
  const today = new Date().getDay();
  const todays = byHour
    .filter((h) => h.day === today && typeof h.median === 'number' && (h.samples || 0) >= MIN_SAMPLES)
    .sort((a, b) => a.median - b.median);
  if (todays.length) return todays[0];
  // Fall back to the overall lightest if today has no data.
  const loose = byHour.filter((h) => typeof h.median === 'number').sort((a, b) => a.median - b.median);
  return loose[0] || null;
}

function CrossingPanel({ crossing, slug, aggregate, language }) {
  const wait = getWaitMinutes(crossing, 'northbound');
  const overallMedian = aggregate?.overall_median;
  const lightest = todayLightest(aggregate?.by_hour);
  const sampleCount = aggregate?.sample_count;

  return (
    <Card className="h-full">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-baseline justify-between gap-2 mb-3">
          <h2 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white">
            {crossing.name}
          </h2>
          <span className="text-[11px] text-slate-500">{crossing.state}</span>
        </div>

        <div className="space-y-3">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-0.5">
              {language === 'en' ? 'Live wait' : 'Espera en vivo'}
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tabular-nums">
              {wait == null ? '—' : `${wait} min`}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-0.5">
                {language === 'en' ? 'Today’s lightest' : 'Hoy más ligero'}
              </div>
              <div className="text-sm font-medium text-slate-900 dark:text-white">
                {lightest
                  ? `${formatHour12(lightest.hour, language)} · ${lightest.median} min`
                  : (language === 'en' ? '—' : '—')}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-0.5">
                {language === 'en' ? '30-day median' : 'Mediana 30 días'}
              </div>
              <div className="text-sm font-medium text-slate-900 dark:text-white">
                {overallMedian != null ? `${overallMedian} min` : '—'}
              </div>
            </div>
          </div>

          {sampleCount != null && (
            <div className="text-[11px] text-slate-500">
              {language === 'en'
                ? `Based on ${sampleCount} samples`
                : `Con base en ${sampleCount} muestras`}
            </div>
          )}

          <Link
            to={`/crossing/${slug}`}
            className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:underline"
          >
            {language === 'en' ? 'Open full page' : 'Abrir página completa'} <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Compare() {
  const { pair } = useParams();
  const language = usePersistentLanguage();

  const parsed = useMemo(() => parsePair(pair), [pair]);
  const [state, setState] = useState({ crossings: [], isLoading: true });
  const [aggA, setAggA] = useState(null);
  const [aggB, setAggB] = useState(null);

  useEffect(() => {
    (async () => {
      const data = await dataService.getBorderData();
      setState({ crossings: data.crossings || [], isLoading: false });
    })();
  }, []);

  const { aSlug, bSlug, crossingA, crossingB } = useMemo(() => {
    if (!parsed || !state.crossings.length) {
      return { aSlug: null, bSlug: null, crossingA: null, crossingB: null };
    }
    const { slugToPort, portToSlug } = buildSlugMap(state.crossings);
    const portA = slugToPort[parsed.a];
    const portB = slugToPort[parsed.b];
    const cA = portA ? state.crossings.find((c) => c.port_number === portA) : null;
    const cB = portB ? state.crossings.find((c) => c.port_number === portB) : null;
    return {
      aSlug: cA ? portToSlug[cA.port_number] : null,
      bSlug: cB ? portToSlug[cB.port_number] : null,
      crossingA: cA,
      crossingB: cB,
    };
  }, [parsed, state.crossings]);

  useEffect(() => {
    if (!aSlug || !bSlug) return;
    let cancelled = false;
    setAggA(null);
    setAggB(null);
    fetch(`/data/aggregates/${aSlug}.json`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!cancelled) setAggA(d); })
      .catch(() => {});
    fetch(`/data/aggregates/${bSlug}.json`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!cancelled) setAggB(d); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [aSlug, bSlug]);

  useEffect(() => {
    if (!crossingA || !crossingB) return;
    const title = language === 'en'
      ? `${crossingA.name} vs ${crossingB.name}: which is faster | Border Pulse`
      : `${crossingA.name} vs ${crossingB.name}: cuál es más rápida | Border Pulse`;
    const desc = language === 'en'
      ? `Live wait times, today's lightest hour, and 30-day patterns at ${crossingA.name} and ${crossingB.name} side by side. Pick the faster crossing right now.`
      : `Tiempos en vivo, hora más ligera de hoy y patrones de 30 días en ${crossingA.name} y ${crossingB.name} lado a lado. Elige la garita más rápida ahora.`;
    const url = `https://borderpulse.com/compare/${aSlug}-vs-${bSlug}`;
    updatePageMeta({ title, description: desc, ogTitle: title, ogDescription: desc, ogUrl: url, canonical: url });
    return () => resetPageMeta();
  }, [crossingA, crossingB, aSlug, bSlug, language]);

  if (!parsed) {
    return <Navigate to="/" replace />;
  }
  if (state.isLoading) {
    return <div className="p-6 text-sm text-slate-500">Loading…</div>;
  }
  if (!crossingA || !crossingB) {
    return <Navigate to="/" replace />;
  }

  const waitA = getWaitMinutes(crossingA, 'northbound');
  const waitB = getWaitMinutes(crossingB, 'northbound');

  let liveSummary = null;
  if (waitA != null && waitB != null) {
    if (waitA === waitB) {
      liveSummary = language === 'en'
        ? `Right now both ports report ${waitA} minutes. Either is fine.`
        : `Ahora mismo las dos garitas reportan ${waitA} minutos. Cualquiera está bien.`;
    } else {
      const faster = waitA < waitB ? crossingA : crossingB;
      const delta = Math.abs(waitA - waitB);
      liveSummary = language === 'en'
        ? `Right now, ${faster.name} is ${delta} minutes faster (${Math.min(waitA, waitB)} min vs ${Math.max(waitA, waitB)} min northbound).`
        : `Ahora mismo, ${faster.name} está ${delta} minutos más rápida (${Math.min(waitA, waitB)} min vs ${Math.max(waitA, waitB)} min hacia EE.UU.).`;
    }
  } else if (waitA != null && waitB == null) {
    liveSummary = language === 'en'
      ? `${crossingB.name} has no current wait time published. ${crossingA.name} is reporting ${waitA} min.`
      : `${crossingB.name} no tiene tiempo actual publicado. ${crossingA.name} reporta ${waitA} min.`;
  } else if (waitB != null && waitA == null) {
    liveSummary = language === 'en'
      ? `${crossingA.name} has no current wait time published. ${crossingB.name} is reporting ${waitB} min.`
      : `${crossingA.name} no tiene tiempo actual publicado. ${crossingB.name} reporta ${waitB} min.`;
  }

  // Aggregate-based comparisons (only show when both have data)
  let typicalSummary = null;
  if (aggA?.overall_median != null && aggB?.overall_median != null) {
    const mA = aggA.overall_median;
    const mB = aggB.overall_median;
    if (mA === mB) {
      typicalSummary = language === 'en'
        ? `Over the last 30 days both have run a ${mA}-minute overall median. The day and hour matter more than the port choice.`
        : `En los últimos 30 días las dos han corrido con mediana general de ${mA} minutos. El día y la hora importan más que la garita.`;
    } else {
      const fasterTypical = mA < mB ? crossingA : crossingB;
      const delta = Math.abs(mA - mB);
      typicalSummary = language === 'en'
        ? `Typically, ${fasterTypical.name} runs ${delta} minutes lighter on the 30-day median (${Math.min(mA, mB)} min vs ${Math.max(mA, mB)} min).`
        : `Típicamente, ${fasterTypical.name} corre ${delta} minutos más ligera en la mediana de 30 días (${Math.min(mA, mB)} min vs ${Math.max(mA, mB)} min).`;
    }
  }

  return (
    <div className="p-3 sm:p-4 lg:p-6 max-w-[1100px] mx-auto">
      <div className="mb-3">
        <Link to="/">
          <button className="inline-flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white">
            <ArrowLeft className="w-3.5 h-3.5" />
            {language === 'en' ? 'All crossings' : 'Todos los cruces'}
          </button>
        </Link>
      </div>

      <header className="mb-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
          {language === 'en'
            ? `${crossingA.name} vs ${crossingB.name}`
            : `${crossingA.name} vs ${crossingB.name}`}
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1 inline-flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" />
          {language === 'en'
            ? 'Live wait times and 30-day patterns side by side. Northbound only.'
            : 'Tiempos en vivo y patrones de 30 días lado a lado. Solo hacia EE.UU.'}
        </p>
      </header>

      {liveSummary && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/40 px-4 py-3">
          <div className="text-[10px] uppercase tracking-wider text-emerald-800 dark:text-emerald-300 font-semibold mb-0.5">
            {language === 'en' ? 'Right now' : 'Ahora mismo'}
          </div>
          <p className="text-sm text-slate-900 dark:text-white">{liveSummary}</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4">
        <CrossingPanel crossing={crossingA} slug={aSlug} aggregate={aggA} language={language} />
        <CrossingPanel crossing={crossingB} slug={bSlug} aggregate={aggB} language={language} />
      </div>

      {typicalSummary && (
        <div className="mb-6 rounded-lg border border-slate-200 dark:border-gray-700 px-4 py-3">
          <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-0.5">
            {language === 'en' ? 'Typically' : 'Típicamente'}
          </div>
          <p className="text-sm text-slate-700 dark:text-slate-200">{typicalSummary}</p>
        </div>
      )}

      <section className="mb-6">
        <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-2">
          {language === 'en' ? 'How to read this' : 'Cómo leer esta comparación'}
        </h2>
        <ul className="text-sm text-slate-700 dark:text-slate-300 space-y-1.5 list-disc pl-5">
          <li>
            {language === 'en'
              ? 'Live wait reflects the most recent CBP report. Refreshes when the page loads.'
              : 'La espera en vivo refleja el reporte más reciente de CBP. Se actualiza al cargar la página.'}
          </li>
          <li>
            {language === 'en'
              ? `Today’s lightest is the lowest median hour for today’s day-of-week, from the last 30 days at each port.`
              : `Hoy más ligero es la hora con mediana más baja para el día actual de la semana, en los últimos 30 días de cada garita.`}
          </li>
          <li>
            {language === 'en'
              ? '30-day median is the typical wait across all hours and days. Lower is generally better, but the hour you cross matters more than the port choice.'
              : 'La mediana de 30 días es la espera típica considerando todas las horas y días. Más bajo es mejor en general, pero la hora a la que cruzas importa más que la garita.'}
          </li>
        </ul>
      </section>

      <footer className="text-xs text-slate-500 border-t border-slate-200 dark:border-gray-700 pt-3">
        {language === 'en' ? 'Source: ' : 'Fuente: '}
        <a href="https://bwt.cbp.gov/" className="underline" target="_blank" rel="noopener noreferrer">
          U.S. Customs and Border Protection
        </a>
      </footer>
    </div>
  );
}
