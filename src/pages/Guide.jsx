import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { ArrowLeft, Clock, MapPin, Car, User, Shield, BookOpen, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import BorderCrossingCard from '@/components/dashboard/BorderCrossingCard';
import AdsterraBanner from '@/components/ads/AdsterraBanner';
import EmailCapture from '@/components/marketing/EmailCapture';
import { dataService } from '@/components/utils/dataService';
import { buildSlugMap } from '@/lib/slugs';
import { getHoursSummary } from '@/components/utils/crossingMeta';
import { updatePageMeta, resetPageMeta } from '@/lib/seo';
import { usePersistentLanguage } from '@/lib/useLanguage';
import { GUIDE_PORTS } from '@/lib/guideData';

const DAY_LABELS = {
  en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  es: ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'],
};
const DAY_PILL_ORDER = [1, 2, 3, 4, 5, 6, 0];
const MIN_SAMPLES = 1;

function tierFor(val) {
  if (val == null) return 'sparse';
  if (val < 30) return 'good';
  if (val < 60) return 'typical';
  return 'heavy';
}

const TIER_BG = {
  sparse: 'rgb(241 245 249)',
  good: 'rgb(16 185 129)',
  typical: 'rgb(245 158 11)',
  heavy: 'rgb(244 63 94)',
};

function formatHour12(h, lang) {
  const suffix = h >= 12 ? (lang === 'en' ? 'PM' : 'p. m.') : (lang === 'en' ? 'AM' : 'a. m.');
  return `${h % 12 || 12} ${suffix}`;
}

function formatHourCompact(h) {
  const h12 = h % 12 || 12;
  return `${h12}${h < 12 ? 'a' : 'p'}`;
}

function pickBestHour(hours, dayIdx) {
  if (!hours || !hours.length) return null;
  const scored = hours
    .filter((h) => h.day === dayIdx && h.median != null && (h.samples || 0) >= MIN_SAMPLES)
    .sort((a, b) => a.median - b.median);
  if (scored.length) return scored[0];
  const loose = hours
    .filter((h) => h.day === dayIdx && h.median != null)
    .sort((a, b) => a.median - b.median);
  return loose[0] || null;
}

function FaqSection({ items, language }) {
  const [openIdx, setOpenIdx] = useState(null);

  return (
    <div className="space-y-2">
      {items.map((item, i) => {
        const isOpen = openIdx === i;
        return (
          <div key={i} className="rounded-lg border border-slate-200 dark:border-gray-800 overflow-hidden">
            <button
              type="button"
              onClick={() => setOpenIdx(isOpen ? null : i)}
              className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left text-sm font-medium text-slate-900 dark:text-white hover:bg-slate-50 dark:hover:bg-gray-800/60 transition-colors"
              aria-expanded={isOpen}
            >
              <span>{item.q}</span>
              {isOpen
                ? <ChevronUp className="w-4 h-4 shrink-0 text-slate-400" />
                : <ChevronDown className="w-4 h-4 shrink-0 text-slate-400" />}
            </button>
            {isOpen && (
              <div className="px-4 pb-3 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {item.a}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function HeatmapGrid({ byHour, selectedDay, todayIdx, currentHour, language }) {
  const dayHours = byHour?.filter((h) => h.day === selectedDay) || [];
  const bestForSelected = pickBestHour(byHour, selectedDay);
  const isViewingToday = selectedDay === todayIdx;

  return (
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
            const tier = tierFor(val);
            const bg = TIER_BG[tier];
            const textColor = sparse ? 'text-slate-400' : 'text-white';
            const ringClass = isCurrent
              ? 'ring-2 ring-offset-1 ring-sky-500 dark:ring-offset-gray-900'
              : isBest
              ? 'ring-2 ring-slate-900 dark:ring-white'
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
                    {sparse ? '' : `${val}m`}
                  </span>
                </div>
                <span className={`text-[9px] tabular-nums ${isCurrent ? 'text-sky-700 dark:text-sky-400 font-semibold' : 'text-slate-500'}`}>
                  {formatHourCompact(h)}
                </span>
              </div>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-3 text-[11px] text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded" style={{ background: TIER_BG.good }} />
            {language === 'en' ? 'Quick (under 30m)' : 'Rapido (menos de 30m)'}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded" style={{ background: TIER_BG.typical }} />
            {language === 'en' ? 'Typical (30 to 60m)' : 'Tipico (30 a 60m)'}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded" style={{ background: TIER_BG.heavy }} />
            {language === 'en' ? 'Heavy (60m+)' : 'Pesado (60m+)'}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Guide() {
  const { slug } = useParams();
  const language = usePersistentLanguage();
  const guideInfo = GUIDE_PORTS[slug];

  const [state, setState] = useState({ crossings: [], isLoading: true, fetchedAt: null });
  const [aggregate, setAggregate] = useState(null);
  const todayIdx = useMemo(() => new Date().getDay(), []);
  const currentHour = useMemo(() => new Date().getHours(), []);
  const [selectedDay, setSelectedDay] = useState(todayIdx);

  // Load crossings data
  useEffect(() => {
    (async () => {
      const data = await dataService.getBorderData();
      setState({ crossings: data.crossings || [], isLoading: false, fetchedAt: data.timestamp });
    })();
  }, []);

  // Load aggregate for heatmap
  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    setAggregate(null);
    fetch(`/data/aggregates/${slug}.json`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (!cancelled) setAggregate(data); })
      .catch(() => { if (!cancelled) setAggregate(null); });
    return () => { cancelled = true; };
  }, [slug]);

  // Reset day selector on slug change
  useEffect(() => { setSelectedDay(todayIdx); }, [slug, todayIdx]);

  const crossing = useMemo(() => {
    if (!state.crossings.length || !guideInfo) return null;
    return state.crossings.find((c) => c.port_number === guideInfo.portNumber) || null;
  }, [state.crossings, guideInfo]);

  const canonicalSlug = useMemo(() => {
    if (!crossing || !state.crossings.length) return slug;
    const { portToSlug } = buildSlugMap(state.crossings);
    return portToSlug[crossing.port_number] || slug;
  }, [crossing, state.crossings, slug]);

  // SEO
  useEffect(() => {
    if (!guideInfo) return;
    const titleEN = `${guideInfo.name} Border Crossing Guide | Border Pulse`;
    const titleES = `Guia de Cruce Fronterizo ${guideInfo.name} | Border Pulse`;
    const descEN = `Complete guide to crossing at ${guideInfo.name}. Live wait times, best hours, lanes, tips, and crossing requirements. Official CBP data.`;
    const descES = `Guia completa para cruzar en ${guideInfo.name}. Tiempos de espera en vivo, mejores horarios, carriles, tips y requisitos. Datos oficiales de CBP.`;
    const title = language === 'en' ? titleEN : titleES;
    const desc = language === 'en' ? descEN : descES;
    const url = `https://borderpulse.com/guide/${slug}`;
    updatePageMeta({ title, description: desc, ogTitle: title, ogDescription: desc, ogUrl: url, canonical: url });
    return () => resetPageMeta();
  }, [guideInfo, language, slug]);

  // Inject JSON-LD schema
  useEffect(() => {
    if (!guideInfo) return;
    const faqItems = guideInfo.faq[language] || guideInfo.faq.en;

    const placeSchema = {
      '@context': 'https://schema.org',
      '@type': 'Place',
      name: `${guideInfo.name} Port of Entry`,
      address: {
        '@type': 'PostalAddress',
        addressRegion: guideInfo.state,
        addressCountry: 'US',
      },
      geo: {
        '@type': 'GeoCoordinates',
        latitude: guideInfo.coords.lat,
        longitude: guideInfo.coords.lng,
      },
    };

    const faqSchema = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqItems.map((item) => ({
        '@type': 'Question',
        name: item.q,
        acceptedAnswer: {
          '@type': 'Answer',
          text: item.a,
        },
      })),
    };

    const placeEl = document.createElement('script');
    placeEl.type = 'application/ld+json';
    placeEl.textContent = JSON.stringify(placeSchema);
    placeEl.id = 'guide-place-schema';
    document.head.appendChild(placeEl);

    const faqEl = document.createElement('script');
    faqEl.type = 'application/ld+json';
    faqEl.textContent = JSON.stringify(faqSchema);
    faqEl.id = 'guide-faq-schema';
    document.head.appendChild(faqEl);

    // hreflang (this page only has one lang but alternates conceptually)
    const hrefEN = document.createElement('link');
    hrefEN.rel = 'alternate';
    hrefEN.hreflang = 'en';
    hrefEN.href = `https://borderpulse.com/guide/${slug}`;
    hrefEN.id = 'guide-hreflang-en';
    document.head.appendChild(hrefEN);

    const hrefES = document.createElement('link');
    hrefES.rel = 'alternate';
    hrefES.hreflang = 'es';
    hrefES.href = `https://borderpulse.com/guide/${slug}`;
    hrefES.id = 'guide-hreflang-es';
    document.head.appendChild(hrefES);

    return () => {
      document.getElementById('guide-place-schema')?.remove();
      document.getElementById('guide-faq-schema')?.remove();
      document.getElementById('guide-hreflang-en')?.remove();
      document.getElementById('guide-hreflang-es')?.remove();
    };
  }, [guideInfo, language, slug]);

  if (!guideInfo) {
    return <Navigate to="/" replace />;
  }

  const tips = guideInfo.tips[language] || guideInfo.tips.en;
  const faqItems = guideInfo.faq[language] || guideInfo.faq.en;
  const hoursSummary = crossing ? getHoursSummary(crossing, language) : guideInfo.hours;
  const bestForSelected = aggregate?.by_hour ? pickBestHour(aggregate.by_hour, selectedDay) : null;

  return (
    <div className="p-3 sm:p-4 lg:p-6 max-w-[860px] mx-auto">
      {/* Breadcrumb */}
      <nav className="mb-4 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        <Link to="/" className="hover:text-slate-900 dark:hover:text-white transition-colors inline-flex items-center gap-1">
          <ArrowLeft className="w-3 h-3" />
          {language === 'en' ? 'Dashboard' : 'Panel'}
        </Link>
        <span aria-hidden="true">/</span>
        {crossing && canonicalSlug && (
          <>
            <Link to={`/crossing/${canonicalSlug}`} className="hover:text-slate-900 dark:hover:text-white transition-colors">
              {guideInfo.name}
            </Link>
            <span aria-hidden="true">/</span>
          </>
        )}
        <span className="text-slate-700 dark:text-slate-200">
          {language === 'en' ? 'Guide' : 'Guia'}
        </span>
      </nav>

      {/* Header */}
      <header className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
          {language === 'en'
            ? `${guideInfo.name} Border Crossing Guide`
            : `Guia de Cruce Fronterizo ${guideInfo.name}`}
        </h1>
        <p className="text-sm text-slate-500 mt-2 flex items-center gap-3 flex-wrap">
          <span className="inline-flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5" />
            {guideInfo.state} · {language === 'en' ? 'US-Mexico Border' : 'Frontera EE.UU.-Mexico'}
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {hoursSummary}
          </span>
        </p>
        <p className="text-xs text-slate-500 mt-2 max-w-prose leading-relaxed">
          {language === 'en'
            ? `Everything you need to cross at ${guideInfo.name}: live wait times, typical wait patterns, lane options, tips from regular crossers, and answers to common questions. Data sourced from U.S. Customs and Border Protection.`
            : `Todo lo que necesitas para cruzar en ${guideInfo.name}: tiempos de espera en vivo, patrones tipicos, opciones de carriles, tips de cruzadores frecuentes, y respuestas a preguntas comunes. Datos obtenidos de U.S. Customs and Border Protection.`}
        </p>
      </header>

      {/* Live wait widget */}
      {crossing && (
        <section className="mb-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
            {language === 'en' ? 'Current wait time' : 'Tiempo de espera actual'}
          </h2>
          <BorderCrossingCard
            crossing={crossing}
            language={language}
            index={0}
            selectedDirection="northbound"
            isFavorite={false}
            onToggleFavorite={() => {}}
          />
          {state.fetchedAt && (
            <p className="text-[11px] text-slate-500 mt-2">
              {language === 'en' ? 'Last refreshed: ' : 'Ultima actualizacion: '}
              {new Date(state.fetchedAt).toLocaleString(language === 'es' ? 'es-MX' : 'en-US', { timeZone: guideInfo.timezone })}
              {' '}
              {language === 'en' ? '(Pacific)' : '(Pacifico)'}
            </p>
          )}
        </section>
      )}

      {/* Adsterra ad after live widget */}
      <AdsterraBanner label={language === 'en' ? 'Advertisement' : 'Publicidad'} />

      {/* Typical wait heatmap */}
      {aggregate && aggregate.by_hour && aggregate.by_hour.length > 0 && (
        <section className="mb-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">
            {language === 'en'
              ? `Typical wait by hour (${DAY_LABELS.en[selectedDay]})`
              : `Espera tipica por hora (${DAY_LABELS.es[selectedDay]})`}
          </h2>
          {bestForSelected && (
            <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium mb-2">
              {selectedDay === todayIdx
                ? (language === 'en'
                  ? `Best time to cross today: ${formatHour12(bestForSelected.hour, 'en')} (median ${bestForSelected.median} min)`
                  : `Mejor hora para cruzar hoy: ${formatHour12(bestForSelected.hour, 'es')} (mediana ${bestForSelected.median} min)`)
                : (language === 'en'
                  ? `Lightest hour on ${DAY_LABELS.en[selectedDay]}: ${formatHour12(bestForSelected.hour, 'en')} (median ${bestForSelected.median} min)`
                  : `Hora mas ligera los ${DAY_LABELS.es[selectedDay]}: ${formatHour12(bestForSelected.hour, 'es')} (mediana ${bestForSelected.median} min)`)
              }
            </p>
          )}
          <p className="text-xs text-slate-500 mb-3">
            {language === 'en'
              ? `Median northbound wait by hour, last 30 days at ${guideInfo.name}.`
              : `Mediana de espera hacia EE.UU. por hora, ultimos 30 dias en ${guideInfo.name}.`}
          </p>

          <div role="tablist" aria-label={language === 'en' ? 'Day of week' : 'Dia de la semana'} className="flex flex-wrap gap-1.5 mb-3">
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
                  {isToday && <span className="ml-1 text-[10px] opacity-80">{language === 'en' ? '·today' : '·hoy'}</span>}
                </button>
              );
            })}
          </div>

          <HeatmapGrid
            byHour={aggregate.by_hour}
            selectedDay={selectedDay}
            todayIdx={todayIdx}
            currentHour={currentHour}
            language={language}
          />

          <div className="mt-3">
            <Link
              to={`/best-time/${canonicalSlug}`}
              className="text-xs text-emerald-700 dark:text-emerald-400 font-medium hover:underline inline-flex items-center gap-1"
            >
              {language === 'en' ? 'Full best-time analysis →' : 'Analisis completo de mejor hora →'}
            </Link>
          </div>
        </section>
      )}

      {/* Available lanes */}
      <section className="mb-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
          {language === 'en' ? 'Available lanes' : 'Carriles disponibles'}
        </h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {guideInfo.lanes.map((lane) => {
            const icon = lane.includes('Pedestrian') ? User
              : lane.includes('SENTRI') || lane.includes('FAST') ? Shield
              : Car;
            const Icon = icon;
            return (
              <div key={lane} className="flex items-center gap-3 rounded-lg border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900/60 p-3">
                <Icon className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="text-sm font-medium text-slate-900 dark:text-white">{lane}</span>
              </div>
            );
          })}
        </div>
        {guideInfo.sentri && (
          <p className="text-xs text-slate-500 mt-2">
            {language === 'en'
              ? 'SENTRI cardholders consistently experience the shortest wait times at this port.'
              : 'Los portadores de tarjeta SENTRI experimentan consistentemente los tiempos de espera mas cortos en este puerto.'}
          </p>
        )}
      </section>

      {/* Crossing tips */}
      <section className="mb-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">
          <BookOpen className="w-5 h-5 inline mr-2 text-emerald-600 dark:text-emerald-400" />
          {language === 'en' ? 'Crossing tips' : 'Tips para cruzar'}
        </h2>
        <div className="space-y-2">
          {tips.map((tip, i) => (
            <div key={i} className="flex gap-3 items-start">
              <span className="mt-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 shrink-0 w-5 h-5 flex items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-950/40">
                {i + 1}
              </span>
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{tip}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Email capture */}
      <EmailCapture
        variant="inline"
        source={`guide:${slug}`}
        language={language}
        className="mb-6"
      />

      {/* FAQ */}
      <section className="mb-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">
          {language === 'en' ? 'Frequently asked questions' : 'Preguntas frecuentes'}
        </h2>
        <FaqSection items={faqItems} language={language} />
      </section>

      {/* Internal links */}
      <section className="mb-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
          {language === 'en' ? 'Related' : 'Relacionado'}
        </h2>
        <div className="flex flex-wrap gap-2">
          {crossing && canonicalSlug && (
            <Link to={`/crossing/${canonicalSlug}`}>
              <Button variant="outline" size="sm" className="text-xs">
                {language === 'en' ? `${guideInfo.name} live data` : `Datos en vivo de ${guideInfo.name}`}
              </Button>
            </Link>
          )}
          {crossing && canonicalSlug && (
            <Link to={`/best-time/${canonicalSlug}`}>
              <Button variant="outline" size="sm" className="text-xs">
                {language === 'en' ? 'Best time to cross' : 'Mejor hora para cruzar'}
              </Button>
            </Link>
          )}
          <Link to="/blog">
            <Button variant="outline" size="sm" className="text-xs">
              Blog
            </Button>
          </Link>
          <Link to="/alerts">
            <Button variant="outline" size="sm" className="text-xs">
              {language === 'en' ? 'Set up alerts' : 'Configurar alertas'}
            </Button>
          </Link>
        </div>
      </section>

      {/* Source attribution */}
      <footer className="text-xs text-slate-500 border-t border-slate-200 dark:border-gray-700 pt-3">
        {language === 'en' ? 'Source: ' : 'Fuente: '}
        <a href="https://bwt.cbp.gov/" className="underline" target="_blank" rel="noopener noreferrer">
          U.S. Customs and Border Protection
        </a>
      </footer>
    </div>
  );
}
