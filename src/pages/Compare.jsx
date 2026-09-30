import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Clock, Copy, MessageCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { dataService } from '@/components/utils/dataService';
import { buildSlugMap } from '@/lib/slugs';
import { standardPassengerWait } from '@/lib/standardPassengerWait';
import { FRESHNESS, freshnessOf, formatAge } from '@/lib/trustState';
import { nowInTz } from '@/components/utils/crossingMeta';
import { updatePageMeta, resetPageMeta } from '@/lib/seo';
import { usePersistentLanguage } from '@/lib/useLanguage';
import { isSparseCell } from '@/lib/aggregates';
import { track } from '@/lib/analytics';

// /compare/<slugA>-vs-<slugB> — side-by-side live wait + 30-day pattern.
// The pair is parsed from the single :pair param so we don't have to add a
// new dynamic-segment shape (and so the URL reads naturally as one slug).

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

function todayLightest(byHour, timezone) {
  if (!Array.isArray(byHour) || !byHour.length) return null;
  // Buckets are port-local; the aggregate carries its port's timezone.
  const today = timezone ? nowInTz(timezone).day : new Date().getDay();
  const todays = byHour
    .filter((h) => h.day === today && !isSparseCell(h))
    .sort((a, b) => a.median - b.median);
  // No fallback. The old one dropped the sample floor *and* widened to every
  // day of the week, then rendered the result under a "Today's lightest"
  // label -- so a Tuesday cell with one observation could be presented as
  // Sunday's lightest hour. The card renders a dash when this returns null.
  return todays[0] || null;
}

function CrossingPanel({ crossing, slug, aggregate, language }) {
  const wait = standardPassengerWait(crossing);
  const overallMedian = aggregate?.overall_median;
  const lightest = todayLightest(aggregate?.by_hour, aggregate?.timezone);
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
              {language === 'en' ? 'Reported standard-passenger wait' : 'Espera reportada, auto estándar'}
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
            to={`/crossing/${slug}/`}
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
  const [state, setState] = useState({ crossings: [], isLoading: true, fetchedAt: null });
  const [aggA, setAggA] = useState(null);
  const [aggB, setAggB] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [copyState, setCopyState] = useState('idle');

  useEffect(() => {
    setFeedback(null);
    setCopyState('idle');
  }, [pair]);

  useEffect(() => {
    (async () => {
      const data = await dataService.getBorderData();
      setState({ crossings: data.crossings || [], isLoading: false, fetchedAt: data.timestamp });
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
      ? `${crossingA.name} vs ${crossingB.name}: reported waits | Border Pulse`
      : `${crossingA.name} vs ${crossingB.name}: esperas reportadas | Border Pulse`;
    const desc = language === 'en'
      ? `CBP-reported northbound standard-passenger waits, today's lightest hour, and 30-day patterns at ${crossingA.name} and ${crossingB.name} side by side.`
      : `Esperas reportadas por CBP para autos en carril estándar hacia EE. UU., hora más ligera de hoy y patrones de 30 días en ${crossingA.name} y ${crossingB.name}.`;
    const url = `https://borderpulse.com/compare/${aSlug}-vs-${bSlug}/`;
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

  const waitA = standardPassengerWait(crossingA);
  const waitB = standardPassengerWait(crossingB);
  const freshness = freshnessOf(state.fetchedAt);
  const compareUrl = `https://borderpulse.com/compare/${aSlug}-vs-${bSlug}/`;
  const shareText = language === 'en'
    ? `Compare ${crossingA.name} and ${crossingB.name} northbound waits on Border Pulse. Check the data time before you travel.`
    : `Compara las esperas hacia EE. UU. en ${crossingA.name} y ${crossingB.name} en Border Pulse. Revisa la hora de los datos antes de salir.`;
  const recordFeedback = (answer) => {
    if (feedback) return;
    setFeedback(answer);
    track('compare-feedback', { pair: `${aSlug}-vs-${bSlug}`, answer });
  };
  const copyCompareLink = async () => {
    try {
      await navigator.clipboard.writeText(compareUrl);
      setCopyState('copied');
      track('compare-share', { pair: `${aSlug}-vs-${bSlug}`, method: 'copy' });
    } catch {
      setCopyState('failed');
    }
  };
  const snapshotTime = state.fetchedAt && freshness.state !== FRESHNESS.UNKNOWN
    ? new Date(state.fetchedAt).toLocaleString(language === 'es' ? 'es-MX' : 'en-US', {
      timeZone: 'America/Los_Angeles', dateStyle: 'medium', timeStyle: 'short',
    })
    : null;

  let liveSummary = null;
  if (waitA != null && waitB != null) {
    if (waitA === waitB) {
      liveSummary = language === 'en'
        ? `Both ports report a ${waitA}-minute northbound standard-passenger wait. This does not compare total trip time.`
        : `Ambas garitas reportan ${waitA} minutos de espera hacia EE. UU. para autos en carril estándar. Esto no compara el tiempo total del viaje.`;
    } else {
      const shorter = waitA < waitB ? crossingA : crossingB;
      const delta = Math.abs(waitA - waitB);
      liveSummary = language === 'en'
        ? `${shorter.name} reports a northbound standard-passenger wait ${delta} minutes shorter (${Math.min(waitA, waitB)} vs ${Math.max(waitA, waitB)} min). This does not compare total trip time.`
        : `${shorter.name} reporta una espera hacia EE. UU. para autos en carril estándar ${delta} minutos menor (${Math.min(waitA, waitB)} vs ${Math.max(waitA, waitB)} min). Esto no compara el tiempo total del viaje.`;
    }
  } else if (waitA != null && waitB == null) {
    liveSummary = language === 'en'
      ? `${crossingB.name} has no reported standard-passenger wait. ${crossingA.name} reports ${waitA} min.`
      : `${crossingB.name} no tiene espera reportada para autos en carril estándar. ${crossingA.name} reporta ${waitA} min.`;
  } else if (waitB != null && waitA == null) {
    liveSummary = language === 'en'
      ? `${crossingA.name} has no reported standard-passenger wait. ${crossingB.name} reports ${waitB} min.`
      : `${crossingA.name} no tiene espera reportada para autos en carril estándar. ${crossingB.name} reporta ${waitB} min.`;
  }

  // Aggregate-based comparisons (only show when both have data)
  let typicalSummary = null;
  if (aggA?.overall_median != null && aggB?.overall_median != null) {
    const mA = aggA.overall_median;
    const mB = aggB.overall_median;
    if (mA === mB) {
      typicalSummary = language === 'en'
        ? `Over the last 30 days both have a ${mA}-minute overall median for reported waits.`
        : `En los últimos 30 días, ambas tienen una mediana general de ${mA} minutos de espera reportada.`;
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
            ? 'Reported northbound waits and 30-day patterns side by side.'
            : 'Esperas reportadas hacia EE. UU. y patrones de 30 días lado a lado.'}
        </p>
      </header>

      {liveSummary && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/40 px-4 py-3">
          <div className="text-[10px] uppercase tracking-wider text-emerald-800 dark:text-emerald-300 font-semibold mb-0.5">
            {language === 'en' ? 'Reported standard-passenger waits' : 'Esperas reportadas, auto estándar'}
          </div>
          <p className="text-sm text-slate-900 dark:text-white">{liveSummary}</p>
          <p className={`mt-2 text-xs ${freshness.state === FRESHNESS.STALE ? 'text-amber-700 dark:text-amber-400' : 'text-slate-600 dark:text-slate-300'}`}>
            {snapshotTime
              ? `${language === 'en' ? 'Data snapshot' : 'Consulta de datos'}: ${snapshotTime} PT · ${formatAge(freshness.age, language)}${freshness.state === FRESHNESS.STALE ? (language === 'en' ? ' · stale data' : ' · datos desactualizados') : ''}`
              : (language === 'en' ? 'Data time unknown' : 'Hora de los datos desconocida')}
          </p>
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

      <section className="mb-6 rounded-lg border border-slate-200 bg-white px-4 py-4 dark:border-gray-700 dark:bg-gray-900" aria-labelledby="compare-pilot-title">
        <h2 id="compare-pilot-title" className="text-base font-semibold text-slate-900 dark:text-white">
          {language === 'en' ? 'Share this comparison' : 'Comparte esta comparación'}
        </h2>
        <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
          {language === 'en'
            ? 'The link opens the latest available data. It does not preserve the waits shown right now.'
            : 'El enlace abre los datos más recientes disponibles. No guarda las esperas que ves ahora.'}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <a
            href={`https://wa.me/?text=${encodeURIComponent(`${shareText}\n${compareUrl}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => track('compare-share', { pair: `${aSlug}-vs-${bSlug}`, method: 'whatsapp' })}
            className="inline-flex min-h-11 items-center gap-2 rounded-md border border-emerald-600 px-3 py-2 text-sm font-medium text-emerald-800 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950/40"
          >
            <MessageCircle className="h-4 w-4" aria-hidden="true" /> WhatsApp
          </a>
          <button
            type="button"
            onClick={copyCompareLink}
            className="inline-flex min-h-11 items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 dark:border-gray-600 dark:text-slate-200 dark:hover:bg-gray-800"
          >
            {copyState === 'copied' ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
            {copyState === 'copied'
              ? (language === 'en' ? 'Link copied' : 'Enlace copiado')
              : (language === 'en' ? 'Copy link' : 'Copiar enlace')}
          </button>
        </div>
        {copyState === 'failed' && (
          <p className="mt-2 text-xs text-amber-700 dark:text-amber-400" role="status">
            {language === 'en' ? 'Copy failed. You can share this page from your browser.' : 'No se pudo copiar. Puedes compartir esta página desde tu navegador.'}
          </p>
        )}
        <div className="mt-4 border-t border-slate-200 pt-4 dark:border-gray-700">
          <p className="text-sm font-medium text-slate-900 dark:text-white">
            {language === 'en' ? 'Did this help you choose a crossing?' : '¿Te ayudó a elegir una garita?'}
          </p>
          {feedback ? (
            <p className="mt-2 text-sm text-emerald-800 dark:text-emerald-300" role="status">
              {language === 'en' ? 'Thanks for helping us improve Border Pulse.' : 'Gracias por ayudarnos a mejorar Border Pulse.'}
            </p>
          ) : (
            <div className="mt-2 flex flex-wrap gap-2">
              <button type="button" onClick={() => recordFeedback('yes')} className="min-h-11 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 hover:bg-slate-50 dark:border-gray-600 dark:text-slate-200 dark:hover:bg-gray-800">
                {language === 'en' ? 'Yes' : 'Sí'}
              </button>
              <button type="button" onClick={() => recordFeedback('no')} className="min-h-11 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 hover:bg-slate-50 dark:border-gray-600 dark:text-slate-200 dark:hover:bg-gray-800">
                No
              </button>
              <button type="button" onClick={() => recordFeedback('still-deciding')} className="min-h-11 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 hover:bg-slate-50 dark:border-gray-600 dark:text-slate-200 dark:hover:bg-gray-800">
                {language === 'en' ? 'Still deciding' : 'Aún decido'}
              </button>
            </div>
          )}
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            {language === 'en' ? 'Anonymous answer; no account needed.' : 'Respuesta anónima; no necesitas cuenta.'}
          </p>
        </div>
      </section>

      <section className="mb-6">
        <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-2">
          {language === 'en' ? 'How to read this' : 'Cómo leer esta comparación'}
        </h2>
        <ul className="text-sm text-slate-700 dark:text-slate-300 space-y-1.5 list-disc pl-5">
          <li>
            {language === 'en'
              ? 'Reported waits come from the most recent CBP snapshot. Ports may report at different times. The snapshot refreshes when the page loads.'
              : 'Las esperas reportadas provienen de la consulta más reciente de CBP. Cada garita puede reportar a distinta hora. La consulta se actualiza al cargar la página.'}
          </li>
          <li>
            {language === 'en'
              ? `Today’s lightest is the lowest median hour for today’s day-of-week, from the last 30 days at each port.`
              : `Hoy más ligero es la hora con mediana más baja para el día actual de la semana, en los últimos 30 días de cada garita.`}
          </li>
          <li>
            {language === 'en'
              ? '30-day median summarizes reported waits across hours and days. Neither figure includes total trip time.'
              : 'La mediana de 30 días resume las esperas reportadas de todas las horas y días. Ninguna cifra incluye el tiempo total del viaje.'}
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
