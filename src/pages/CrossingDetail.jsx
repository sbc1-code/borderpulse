import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { ArrowLeft, Clock, MapPin, RefreshCw, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import BorderCrossingCard from '@/components/dashboard/BorderCrossingCard';
import { dataService } from '@/components/utils/dataService';
import { buildSlugMap } from '@/lib/slugs';
import { getHoursSummary } from '@/components/utils/crossingMeta';
import { getWaitMinutes } from '@/components/utils/crossingDirection';
import { updatePageMeta, resetPageMeta } from '@/lib/seo';
import { nearestCrossings, kmToMiles } from '@/lib/geo';

const DAY_LABELS = {
  en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  es: ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'],
};

// Selector pill order Mon–Sun for ergonomics, but indices stay 0=Sun..6=Sat
// to match Date.getDay() and the aggregate `day` field.
const DAY_PILL_ORDER = [1, 2, 3, 4, 5, 6, 0];

// 30-day lookback gives ~4 samples per (day, hour) bucket at best, often
// just 1 due to refresh-cadence drift; treat any observation as signal.
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

function pickBestHour(hours, dayIdx) {
  if (!hours || !hours.length) return null;
  const scored = hours
    .filter((h) => h.day === dayIdx && h.median != null && (h.samples || 0) >= MIN_SAMPLES)
    .sort((a, b) => a.median - b.median);
  // Fall back to any hour if nothing meets the sample floor.
  if (scored.length) return scored[0];
  const loose = hours
    .filter((h) => h.day === dayIdx && h.median != null)
    .sort((a, b) => a.median - b.median);
  return loose[0] || null;
}

function formatHour12(h, lang) {
  const suffix = h >= 12 ? (lang === 'en' ? 'PM' : 'p. m.') : (lang === 'en' ? 'AM' : 'a. m.');
  const h12 = h % 12 || 12;
  return `${h12} ${suffix}`;
}

function formatDistance(km, lang) {
  if (km == null || !Number.isFinite(km)) return '';
  if (lang === 'es') {
    if (km < 10) return `${km.toFixed(1)} km`;
    return `${Math.round(km)} km`;
  }
  const mi = kmToMiles(km);
  if (mi == null) return '';
  if (mi < 10) return `${mi.toFixed(1)} mi`;
  return `${Math.round(mi)} mi`;
}

function faqItems(crossing, aggregate, lang) {
  const name = crossing.name;
  const hours = crossing.hours || (lang === 'en' ? 'check official CBP hours' : 'consultar horario oficial de CBP');
  const out = [];

  out.push({
    q: lang === 'en' ? `What are the current wait times at ${name}?` : `¿Cuáles son los tiempos de espera actuales en ${name}?`,
    a: lang === 'en'
      ? `Border Pulse pulls the latest wait time for ${name} from U.S. Customs and Border Protection every 15 minutes. Check the card above for the live number.`
      : `Border Pulse toma el tiempo de espera más reciente de ${name} de U.S. Customs and Border Protection cada 15 minutos. Consulta la tarjeta arriba para ver el número en vivo.`,
  });

  out.push({
    q: lang === 'en' ? `What hours is ${name} open?` : `¿En qué horario abre ${name}?`,
    a: lang === 'en'
      ? `Official hours posted by CBP: ${hours}. Hours can change on U.S. federal holidays.`
      : `Horario oficial publicado por CBP: ${hours}. El horario puede cambiar en días festivos federales de EE.UU.`,
  });

  if (aggregate && aggregate.by_hour && aggregate.by_hour.length) {
    const today = new Date().getDay();
    const best = pickBestHour(aggregate.by_hour, today);
    if (best) {
      out.push({
        q: lang === 'en' ? `What is the best time to cross at ${name} today?` : `¿Cuál es la mejor hora para cruzar en ${name} hoy?`,
        a: lang === 'en'
          ? `Based on the last 30 days of CBP data, the lightest typical wait at ${name} on ${DAY_LABELS.en[today]} is around ${formatHour12(best.hour, 'en')} (median ${best.median} min).`
          : `Según los últimos 30 días de datos de CBP, la espera típica más ligera en ${name} los ${DAY_LABELS.es[today]} es alrededor de ${formatHour12(best.hour, 'es')} (mediana ${best.median} min).`,
      });
    }
  }

  const laneList = [];
  const l = crossing.lanes || {};
  if (l.passenger_sentri) laneList.push(lang === 'en' ? 'SENTRI' : 'SENTRI');
  if (l.passenger_ready) laneList.push(lang === 'en' ? 'Ready Lane' : 'Ready Lane');
  if (l.pedestrian_standard || l.pedestrian_ready) laneList.push(lang === 'en' ? 'pedestrian' : 'peatonal');
  if (l.commercial_standard || l.commercial_fast) laneList.push(lang === 'en' ? 'commercial' : 'comercial');
  if (laneList.length) {
    out.push({
      q: lang === 'en' ? `What lanes are available at ${name}?` : `¿Qué carriles están disponibles en ${name}?`,
      a: lang === 'en'
        ? `${name} reports data for standard passenger plus: ${laneList.join(', ')}.`
        : `${name} reporta datos para pasajero estándar más: ${laneList.join(', ')}.`,
    });
  }

  return out;
}

// Find the median for a given day+hour out of an aggregate.by_hour list.
// Returns { median, samples } or null.
function lookupSlot(byHour, dayIdx, hour) {
  if (!Array.isArray(byHour)) return null;
  const slot = byHour.find((x) => x.day === dayIdx && x.hour === hour);
  if (!slot || slot.median == null) return null;
  return { median: slot.median, samples: slot.samples || 0 };
}

function CompareRow({ entry, language, slug }) {
  const { crossing, distanceKm, currentWait, vsTypical } = entry;

  let deltaLine = null;
  if (vsTypical && Number.isFinite(vsTypical.delta)) {
    const d = vsTypical.delta;
    if (Math.abs(d) < 5) {
      deltaLine = language === 'en'
        ? `near typical (median ${vsTypical.median} min)`
        : `cerca del típico (mediana ${vsTypical.median} min)`;
    } else if (d > 0) {
      deltaLine = language === 'en'
        ? `+${d} min vs typical (median ${vsTypical.median} min)`
        : `+${d} min vs. típico (mediana ${vsTypical.median} min)`;
    } else {
      deltaLine = language === 'en'
        ? `${d} min vs typical (median ${vsTypical.median} min)`
        : `${d} min vs. típico (mediana ${vsTypical.median} min)`;
    }
  }

  return (
    <Link
      to={`/crossing/${slug}`}
      className="block group"
    >
      <div className="flex items-center justify-between gap-3 p-3 rounded-md border border-slate-200 dark:border-gray-700 hover:bg-slate-50 dark:hover:bg-gray-800 transition-colors">
        <div className="min-w-0 flex-1">
          <div className="font-medium text-sm text-slate-900 dark:text-white truncate group-hover:underline">
            {crossing.name}
          </div>
          <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
            <span>{crossing.state}</span>
            <span aria-hidden="true">·</span>
            <span>{formatDistance(distanceKm, language)}</span>
            {deltaLine && (
              <>
                <span aria-hidden="true">·</span>
                <span className={
                  vsTypical && vsTypical.delta > 5
                    ? 'text-rose-600 dark:text-rose-400'
                    : vsTypical && vsTypical.delta < -5
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-slate-500'
                }>
                  {deltaLine}
                </span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="text-right">
            <div className="text-base font-semibold text-slate-900 dark:text-white tabular-nums">
              {currentWait == null ? '—' : currentWait}
            </div>
            <div className="text-[10px] uppercase tracking-wide text-slate-500">
              {currentWait == null
                ? (language === 'en' ? 'no data' : 'sin datos')
                : (language === 'en' ? 'min' : 'min')}
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200" />
        </div>
      </div>
    </Link>
  );
}

export default function CrossingDetail() {
  const { slug } = useParams();
  const [state, setState] = useState({
    crossings: [],
    isLoading: true,
    source: null,
    fetchedAt: null,
  });
  const [aggregate, setAggregate] = useState(null);
  const [timeline, setTimeline] = useState(null);
  const [nearbyAggregates, setNearbyAggregates] = useState({}); // { port_number: aggregate|null }
  const language = usePersistentLanguage();

  const todayIdx = useMemo(() => new Date().getDay(), []);
  const currentHour = useMemo(() => new Date().getHours(), []);
  const [selectedDay, setSelectedDay] = useState(todayIdx);

  useEffect(() => {
    (async () => {
      const data = await dataService.getBorderData();
      setState({
        crossings: data.crossings || [],
        isLoading: false,
        source: data.source,
        fetchedAt: data.timestamp,
      });
    })();
  }, []);

  const { crossing, portToSlug } = useMemo(() => {
    if (!state.crossings.length) return { crossing: null, portToSlug: {} };
    const { slugToPort, portToSlug } = buildSlugMap(state.crossings);
    const port = slugToPort[slug];
    const c = port ? state.crossings.find((x) => x.port_number === port) : null;
    return { crossing: c, portToSlug };
  }, [state.crossings, slug]);

  const canonicalSlug = crossing ? (portToSlug[crossing.port_number] || slug) : slug;

  // Reset selected day to today's day-of-week whenever the crossing changes.
  useEffect(() => {
    setSelectedDay(todayIdx);
  }, [canonicalSlug, todayIdx]);

  useEffect(() => {
    if (!slug || !crossing || !canonicalSlug) return;
    let cancelled = false;
    setAggregate(null);
    setTimeline(null);

    fetch(`/data/aggregates/${canonicalSlug}.json`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled) setAggregate(data);
      })
      .catch(() => {
        if (!cancelled) setAggregate(null);
      });

    fetch('/data/timelines/index.json')
      .then((r) => (r.ok ? r.json() : null))
      .then((index) => {
        if (cancelled) return null;
        const hasTimeline = Array.isArray(index?.slugs) && index.slugs.includes(canonicalSlug);
        if (!hasTimeline) return null;
        return fetch(`/data/timelines/${canonicalSlug}.json`);
      })
      .then((r) => (r?.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled) setTimeline(data);
      })
      .catch(() => {
        if (!cancelled) setTimeline(null);
      });

    return () => {
      cancelled = true;
    };
  }, [canonicalSlug, crossing, slug]);

  // Find the 2 nearest crossings (memoized) and fetch their aggregates.
  const nearestPicks = useMemo(() => {
    if (!crossing || !state.crossings.length) return [];
    return nearestCrossings(crossing, state.crossings, 2);
  }, [crossing, state.crossings]);

  useEffect(() => {
    if (!nearestPicks.length) {
      setNearbyAggregates({});
      return undefined;
    }
    let cancelled = false;
    setNearbyAggregates({});

    Promise.all(
      nearestPicks.map(async ({ crossing: c }) => {
        const s = portToSlug[c.port_number];
        if (!s) return [c.port_number, null];
        try {
          const r = await fetch(`/data/aggregates/${s}.json`);
          if (!r.ok) return [c.port_number, null];
          return [c.port_number, await r.json()];
        } catch {
          return [c.port_number, null];
        }
      }),
    ).then((entries) => {
      if (cancelled) return;
      setNearbyAggregates(Object.fromEntries(entries));
    });

    return () => {
      cancelled = true;
    };
  }, [nearestPicks, portToSlug]);

  useEffect(() => {
    if (!crossing) return;
    const hasHistoricalPattern = Array.isArray(aggregate?.by_hour) && aggregate.by_hour.length > 0;
    const title = language === 'en'
      ? `${crossing.name} Wait Times | Border Pulse`
      : `Tiempos de Espera en ${crossing.name} | Border Pulse`;
    const desc = language === 'en'
      ? `Live ${crossing.name} border wait times updated every 15 min. Official CBP data${hasHistoricalPattern ? ', historical trends, and best crossing times' : ', lane status, and port hours'}.`
      : `Tiempos de espera en ${crossing.name} actualizados cada 15 min. Datos oficiales de CBP${hasHistoricalPattern ? ', tendencias históricas y mejores horarios para cruzar' : ', estado de carriles y horarios del puerto'}.`;
    const url = `https://borderpulse.com/crossing/${canonicalSlug}`;
    updatePageMeta({ title, description: desc, ogTitle: title, ogDescription: desc, ogUrl: url, canonical: url });
    return () => resetPageMeta();
  }, [aggregate, canonicalSlug, crossing, language]);

  if (state.isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-slate-400" />
          <p className="text-sm text-slate-500">
            {language === 'en' ? 'Loading…' : 'Cargando…'}
          </p>
        </div>
      </div>
    );
  }

  if (!crossing) {
    return <Navigate to="/" replace />;
  }

  if (canonicalSlug && slug !== canonicalSlug) {
    return <Navigate to={`/crossing/${canonicalSlug}`} replace />;
  }

  const hoursSummary = getHoursSummary(crossing, language);
  const faqs = faqItems(crossing, aggregate, language);

  // Hourly chart data for the selected day.
  const dayHours = aggregate?.by_hour?.filter((h) => h.day === selectedDay) || [];
  const bestForSelected = pickBestHour(aggregate?.by_hour, selectedDay);
  const isViewingToday = selectedDay === todayIdx;

  // Build the 2 nearby compare entries with current wait + vs-typical delta.
  const compareEntries = nearestPicks.map(({ crossing: c, distanceKm }) => {
    const wait = getWaitMinutes(c, 'northbound');
    const agg = nearbyAggregates[c.port_number];
    const slot = lookupSlot(agg?.by_hour, todayIdx, currentHour);
    let vsTypical = null;
    if (slot && slot.samples >= MIN_SAMPLES && wait != null) {
      vsTypical = { median: slot.median, samples: slot.samples, delta: wait - slot.median };
    }
    return {
      crossing: c,
      distanceKm,
      currentWait: wait,
      vsTypical,
    };
  });

  return (
    <div className="p-3 sm:p-4 lg:p-6 max-w-[1100px] mx-auto">
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

      <header className="mb-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
          {crossing.name}
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1 flex items-center gap-3 flex-wrap">
          <span className="inline-flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5" />
            {crossing.state} · {crossing.border}
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {hoursSummary}
          </span>
        </p>
        <p className="text-xs text-slate-500 mt-2">
          {language === 'en'
            ? `Northbound wait times at ${crossing.name} are pulled from U.S. Customs and Border Protection every 15 minutes. Southbound estimates (where available) are derived from Google Maps drive times on the approach segment.`
            : `Los tiempos de espera hacia EE.UU. en ${crossing.name} se obtienen de U.S. Customs and Border Protection cada 15 minutos. Las estimaciones hacia México (cuando están disponibles) se derivan de tiempos de manejo de Google Maps en el tramo de aproximación.`}
        </p>
      </header>

      <div className="mb-6">
        <BorderCrossingCard
          crossing={crossing}
          language={language}
          index={0}
          selectedDirection="northbound"
          isFavorite={false}
          onToggleFavorite={() => {}}
        />
      </div>

      {aggregate && aggregate.by_hour && aggregate.by_hour.length > 0 && (
        <section className="mb-6">
          <div className="flex items-baseline justify-between gap-3 flex-wrap mb-2">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              {language === 'en'
                ? `Typical wait by hour (${DAY_LABELS.en[selectedDay]})`
                : `Espera típica por hora (${DAY_LABELS.es[selectedDay]})`}
            </h2>
            {bestForSelected && (
              <p className="text-xs sm:text-sm text-emerald-700 dark:text-emerald-400 font-medium">
                {isViewingToday
                  ? (language === 'en'
                    ? `Best time to cross today: ${formatHour12(bestForSelected.hour, 'en')} (median ${bestForSelected.median} min)`
                    : `Mejor hora para cruzar hoy: ${formatHour12(bestForSelected.hour, 'es')} (mediana ${bestForSelected.median} min)`)
                  : (language === 'en'
                    ? `Lightest hour on ${DAY_LABELS.en[selectedDay]}: ${formatHour12(bestForSelected.hour, 'en')} (median ${bestForSelected.median} min)`
                    : `Hora más ligera los ${DAY_LABELS.es[selectedDay]}: ${formatHour12(bestForSelected.hour, 'es')} (mediana ${bestForSelected.median} min)`)}
              </p>
            )}
          </div>
          <p className="text-xs text-slate-500 mb-3">
            {language === 'en'
              ? `Median northbound wait by hour, last 30 days at ${crossing.name}.`
              : `Mediana de espera hacia EE.UU. por hora, últimos 30 días en ${crossing.name}.`}
          </p>

          <div
            role="tablist"
            aria-label={language === 'en' ? 'Day of week' : 'Día de la semana'}
            className="flex flex-wrap gap-1.5 mb-3"
          >
            {DAY_PILL_ORDER.map((dIdx) => {
              const isActive = dIdx === selectedDay;
              const isToday = dIdx === todayIdx;
              return (
                <button
                  key={dIdx}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setSelectedDay(dIdx)}
                  className={[
                    'h-7 px-2.5 rounded-full text-xs font-medium border transition-colors',
                    isActive
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-white dark:bg-gray-900 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-gray-700 hover:bg-slate-50 dark:hover:bg-gray-800',
                  ].join(' ')}
                >
                  {DAY_LABELS[language][dIdx]}
                  {isToday && (
                    <span className="ml-1 text-[10px] opacity-80">
                      {language === 'en' ? '·today' : '·hoy'}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="grid grid-cols-6 sm:grid-cols-12 gap-1">
                {Array.from({ length: 24 }, (_, h) => {
                  const slot = dayHours.find((x) => x.hour === h);
                  const samples = slot?.samples || 0;
                  const sparse = !slot || slot.median == null || samples < MIN_SAMPLES;
                  const val = sparse ? null : slot.median;
                  const isBest = !sparse && bestForSelected && bestForSelected.hour === h;
                  const isCurrent = isViewingToday && h === currentHour;
                  const intensity = val == null ? 0 : Math.min(100, (val / 90) * 100);

                  // Color: light gray for sparse; otherwise heat-mapped red→amber.
                  const bg = sparse
                    ? 'rgb(241 245 249)'
                    : `rgb(${Math.round(239 - intensity * 0.5)}, ${Math.round(68 + (100 - intensity) * 1.5)}, ${Math.round(68 + (100 - intensity) * 0.5)})`;

                  // White text on filled bars (high contrast); slate on empty.
                  const textColor = sparse ? 'text-slate-400' : 'text-white';

                  // Ring layering: current hour (sky) wins; otherwise best (emerald).
                  const ringClass = isCurrent
                    ? 'ring-2 ring-offset-1 ring-sky-500 dark:ring-offset-gray-900'
                    : isBest
                    ? 'ring-2 ring-emerald-500'
                    : '';

                  const title = sparse
                    ? (language === 'en' ? 'Not enough data' : 'Datos insuficientes')
                    : `${formatHour12(h, language)} · ${language === 'en' ? 'median' : 'mediana'} ${val} min · n=${samples}`;

                  return (
                    <div key={h} className="flex flex-col items-center gap-1">
                      <div
                        className={`w-full h-10 rounded flex items-center justify-center ${ringClass}`}
                        style={{ background: bg }}
                        title={title}
                        aria-label={title}
                      >
                        <span className={`text-[10px] sm:text-xs font-semibold tabular-nums ${textColor}`}>
                          {sparse ? '' : val}
                        </span>
                      </div>
                      <span
                        className={`text-[9px] tabular-nums ${
                          isCurrent
                            ? 'text-sky-700 dark:text-sky-400 font-semibold'
                            : 'text-slate-500'
                        }`}
                      >
                        {h}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center gap-3 mt-3 text-[11px] text-slate-500">
                <span className="inline-flex items-center gap-1.5">
                  <span className="inline-block w-3 h-3 rounded ring-2 ring-sky-500" />
                  {language === 'en' ? 'Current hour' : 'Hora actual'}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="inline-block w-3 h-3 rounded ring-2 ring-emerald-500" />
                  {language === 'en' ? 'Lightest hour' : 'Hora más ligera'}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="inline-block w-3 h-3 rounded bg-slate-200 dark:bg-gray-700" />
                  {language === 'en' ? 'Not enough data' : 'Datos insuficientes'}
                </span>
              </div>
            </CardContent>
          </Card>
        </section>
      )}

      {timeline && timeline.entries && timeline.entries.length > 0 && (
        <section className="mb-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">
            {language === 'en' ? 'Recent at this crossing' : 'Reciente en este cruce'}
          </h2>
          <p className="text-xs text-slate-500 mb-3">
            {language === 'en'
              ? `Curated from public news and government feeds. ${timeline.entries.length} item${timeline.entries.length === 1 ? '' : 's'}.`
              : `Curado de noticias públicas y feeds gubernamentales. ${timeline.entries.length} entrada${timeline.entries.length === 1 ? '' : 's'}.`}
          </p>
          <div className="space-y-3">
            {timeline.entries.slice(0, 8).map((e) => (
              <Card key={e.id || e.url}>
                <CardContent className="p-4">
                  <div className="flex items-baseline justify-between gap-3 mb-1">
                    <span className="text-[11px] uppercase tracking-wide text-emerald-700 dark:text-emerald-400 font-semibold">
                      {e.source_name}
                    </span>
                    {e.published_at && (
                      <span className="text-[11px] text-slate-500 tabular-nums">
                        {new Date(e.published_at).toLocaleDateString(
                          language === 'es' ? 'es-MX' : 'en-US',
                          { year: 'numeric', month: 'short', day: 'numeric' },
                        )}
                      </span>
                    )}
                  </div>
                  <h3 className="font-medium text-sm text-slate-900 dark:text-white mb-1 leading-snug">
                    <a
                      href={e.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline"
                    >
                      {e.title}
                    </a>
                  </h3>
                  {e.summary && (
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      {e.summary}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      <section className="mb-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">
          {language === 'en' ? 'Frequently asked' : 'Preguntas frecuentes'}
        </h2>
        <div className="space-y-3">
          {faqs.map((f, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <h3 className="font-medium text-sm text-slate-900 dark:text-white mb-1">{f.q}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-300">{f.a}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {compareEntries.length > 0 && (
        <section className="mb-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">
            {language === 'en' ? 'Compare with nearby crossings' : 'Compara con cruces cercanos'}
          </h2>
          <p className="text-xs text-slate-500 mb-3">
            {language === 'en'
              ? 'Closest by straight-line distance. Northbound wait times.'
              : 'Más cercanos en línea recta. Tiempos de espera hacia EE.UU.'}
          </p>
          <div className="space-y-2">
            {compareEntries.map((entry) => {
              const s = portToSlug[entry.crossing.port_number];
              if (!s) return null;
              return (
                <CompareRow
                  key={entry.crossing.port_number}
                  entry={entry}
                  language={language}
                  slug={s}
                />
              );
            })}
          </div>
        </section>
      )}

      <footer className="text-xs text-slate-500 border-t border-slate-200 dark:border-gray-700 pt-3">
        {language === 'en' ? 'Source: ' : 'Fuente: '}
        <a href={state.source?.url || 'https://bwt.cbp.gov/'} className="underline" target="_blank" rel="noopener noreferrer">
          {state.source?.name || 'U.S. Customs and Border Protection'}
        </a>
      </footer>
    </div>
  );
}
