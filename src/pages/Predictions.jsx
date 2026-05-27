import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, TrendingUp, Calendar, Clock, AlertTriangle, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import AdsterraBanner from '@/components/ads/AdsterraBanner';
import EmailCapture from '@/components/marketing/EmailCapture';
import { dataService } from '@/components/utils/dataService';
import { buildSlugMap } from '@/lib/slugs';
import { updatePageMeta, resetPageMeta } from '@/lib/seo';
import { usePersistentLanguage } from '@/lib/useLanguage';

// Top crossings to show predictions for. These have the most traffic and
// the most aggregate data to produce meaningful predictions.
const FEATURED_SLUGS = [
  'san-ysidro',
  'otay-mesa',
  'tecate',
  'calexico-east',
  'calexico-west',
  'el-paso-bridge-of-the-americas-bota',
  'el-paso-paso-del-norte-pdn',
  'el-paso-ysleta',
];

// US + MX holidays that affect border wait times.
const HOLIDAYS = [
  // US Federal
  { month: 1, day: 1, name: { en: "New Year's Day", es: 'Ano Nuevo' } },
  { month: 1, day: 20, name: { en: 'MLK Day', es: 'Dia de MLK' } },
  { month: 2, day: 17, name: { en: "Presidents' Day", es: 'Dia de los Presidentes' } },
  { month: 5, day: 26, name: { en: 'Memorial Day', es: 'Memorial Day' } },
  { month: 6, day: 19, name: { en: 'Juneteenth', es: 'Juneteenth' } },
  { month: 7, day: 4, name: { en: 'Independence Day (US)', es: 'Dia de la Independencia (EE.UU.)' } },
  { month: 9, day: 1, name: { en: 'Labor Day', es: 'Dia del Trabajo (EE.UU.)' } },
  { month: 11, day: 27, name: { en: 'Thanksgiving', es: 'Dia de Accion de Gracias' } },
  { month: 12, day: 25, name: { en: 'Christmas', es: 'Navidad' } },
  // MX
  { month: 2, day: 3, name: { en: 'Constitution Day (MX)', es: 'Dia de la Constitucion' } },
  { month: 3, day: 17, name: { en: "Benito Juarez's Birthday (MX)", es: 'Natalicio de Benito Juarez' } },
  { month: 5, day: 1, name: { en: 'Labor Day (MX)', es: 'Dia del Trabajo' } },
  { month: 5, day: 5, name: { en: 'Cinco de Mayo', es: 'Cinco de Mayo' } },
  { month: 9, day: 16, name: { en: 'Independence Day (MX)', es: 'Dia de la Independencia (MX)' } },
  { month: 11, day: 1, name: { en: 'Day of the Dead', es: 'Dia de los Muertos' } },
  { month: 11, day: 17, name: { en: 'Revolution Day (MX)', es: 'Dia de la Revolucion' } },
  { month: 12, day: 12, name: { en: 'Our Lady of Guadalupe', es: 'Virgen de Guadalupe' } },
];

function isHoliday(date) {
  const m = date.getMonth() + 1;
  const d = date.getDate();
  return HOLIDAYS.filter((h) => h.month === m && h.day === d);
}

function isNearHoliday(date, range = 2) {
  const results = [];
  for (let offset = -range; offset <= range; offset++) {
    const check = new Date(date);
    check.setDate(check.getDate() + offset);
    const hits = isHoliday(check);
    if (hits.length) {
      results.push(...hits.map((h) => ({ ...h, offset })));
    }
  }
  return results;
}

function tierFor(val) {
  if (val == null) return 'sparse';
  if (val < 30) return 'good';
  if (val < 60) return 'typical';
  return 'heavy';
}

const TIER_COLORS = {
  sparse: 'bg-slate-200 dark:bg-gray-700 text-slate-500',
  good: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200',
  typical: 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200',
  heavy: 'bg-rose-100 dark:bg-rose-900/40 text-rose-800 dark:text-rose-200',
};

const TIER_LABELS = {
  good: { en: 'Quick', es: 'Rapido' },
  typical: { en: 'Typical', es: 'Tipico' },
  heavy: { en: 'Heavy', es: 'Pesado' },
  sparse: { en: 'No data', es: 'Sin datos' },
};

function formatHour12(h, lang) {
  const suffix = h >= 12 ? (lang === 'en' ? 'PM' : 'p. m.') : (lang === 'en' ? 'AM' : 'a. m.');
  return `${h % 12 || 12} ${suffix}`;
}

function PredictionCard({ slug, name, aggregate, now, language }) {
  const dayIdx = now.getDay();
  const currentHour = now.getHours();
  const byHour = aggregate?.by_hour || [];

  // Next 6 hours of predictions
  const predictions = [];
  for (let offset = 0; offset < 6; offset++) {
    const h = (currentHour + offset) % 24;
    const futureDay = offset === 0 ? dayIdx : new Date(now.getTime() + offset * 3600000).getDay();
    const slot = byHour.find((x) => x.day === futureDay && x.hour === h);
    const median = slot?.median ?? null;
    const samples = slot?.samples ?? 0;
    predictions.push({ hour: h, median, samples, offset });
  }

  // Best hour in next 6
  const bestPred = predictions
    .filter((p) => p.median != null)
    .sort((a, b) => a.median - b.median)[0];

  const nearHolidays = isNearHoliday(now);

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="flex items-center justify-between gap-3 p-4 border-b border-slate-200 dark:border-gray-800">
          <div className="min-w-0">
            <Link
              to={`/crossing/${slug}`}
              className="text-sm font-semibold text-slate-900 dark:text-white hover:underline truncate block"
            >
              {name}
            </Link>
            {nearHolidays.length > 0 && (
              <div className="mt-1 flex items-center gap-1 text-[11px] text-amber-700 dark:text-amber-300">
                <Calendar className="w-3 h-3 shrink-0" />
                <span>
                  {nearHolidays[0].offset === 0
                    ? (language === 'en' ? 'Holiday today: ' : 'Dia festivo hoy: ')
                    : (language === 'en' ? 'Near holiday: ' : 'Cerca de festivo: ')}
                  {nearHolidays[0].name[language] || nearHolidays[0].name.en}
                </span>
              </div>
            )}
          </div>
          {bestPred && (
            <div className="text-right shrink-0">
              <div className="text-[11px] text-slate-500">
                {language === 'en' ? 'Best window' : 'Mejor ventana'}
              </div>
              <div className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 tabular-nums">
                {formatHour12(bestPred.hour, language)}
              </div>
              <div className="text-[11px] text-slate-500 tabular-nums">
                ~{bestPred.median} min
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-6 divide-x divide-slate-200 dark:divide-gray-800">
          {predictions.map((p) => {
            const tier = tierFor(p.median);
            const isNow = p.offset === 0;
            return (
              <div
                key={p.hour}
                className={`flex flex-col items-center py-3 px-1 ${isNow ? 'bg-slate-50 dark:bg-gray-800/60' : ''}`}
              >
                <span className={`text-[10px] font-medium ${isNow ? 'text-sky-600 dark:text-sky-400' : 'text-slate-500'}`}>
                  {isNow ? (language === 'en' ? 'Now' : 'Ahora') : formatHour12(p.hour, language).replace(' ', '\n')}
                </span>
                <span className={`mt-1 text-sm font-bold tabular-nums ${TIER_COLORS[tier]} rounded-full px-2 py-0.5`}>
                  {p.median != null ? `${p.median}` : '—'}
                </span>
                <span className="mt-0.5 text-[9px] text-slate-400">
                  {p.median != null ? (language === 'en' ? 'min' : 'min') : ''}
                </span>
              </div>
            );
          })}
        </div>

        {nearHolidays.length > 0 && (
          <div className="px-4 py-2 bg-amber-50 dark:bg-amber-950/20 border-t border-amber-200 dark:border-amber-900">
            <p className="text-[11px] text-amber-700 dark:text-amber-300">
              <AlertTriangle className="w-3 h-3 inline mr-1" />
              {language === 'en'
                ? 'Holiday traffic may cause longer waits than these historical patterns suggest.'
                : 'El trafico de dias festivos puede causar esperas mas largas que estos patrones historicos.'}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function Predictions() {
  const language = usePersistentLanguage();
  const [crossings, setCrossings] = useState([]);
  const [aggregates, setAggregates] = useState({});
  const [loading, setLoading] = useState(true);

  const now = useMemo(() => new Date(), []);

  useEffect(() => {
    (async () => {
      const data = await dataService.getBorderData();
      setCrossings(data.crossings || []);
    })();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const fetches = FEATURED_SLUGS.map(async (slug) => {
      try {
        const r = await fetch(`/data/aggregates/${slug}.json`);
        if (!r.ok) return [slug, null];
        return [slug, await r.json()];
      } catch {
        return [slug, null];
      }
    });
    Promise.all(fetches).then((entries) => {
      if (cancelled) return;
      setAggregates(Object.fromEntries(entries.filter(([, v]) => v)));
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const slugMap = useMemo(() => {
    if (!crossings.length) return {};
    const { portToSlug } = buildSlugMap(crossings);
    return portToSlug;
  }, [crossings]);

  const crossingsByPort = useMemo(() => {
    const map = {};
    for (const c of crossings) map[c.port_number] = c;
    return map;
  }, [crossings]);

  // SEO
  useEffect(() => {
    const title = language === 'en'
      ? 'Border Wait Predictions | Border Pulse'
      : 'Predicciones de Espera Fronteriza | Border Pulse';
    const desc = language === 'en'
      ? 'Predicted border wait times for the next 6 hours based on 30-day historical patterns. US-Mexico crossings.'
      : 'Predicciones de tiempos de espera fronteriza para las proximas 6 horas basadas en patrones historicos de 30 dias. Cruces EE.UU.-Mexico.';
    updatePageMeta({
      title, description: desc, ogTitle: title, ogDescription: desc,
      ogUrl: 'https://borderpulse.com/predictions',
      canonical: 'https://borderpulse.com/predictions',
    });
    return () => resetPageMeta();
  }, [language]);

  const nearHolidays = isNearHoliday(now);

  return (
    <div className="p-3 sm:p-4 lg:p-6 max-w-[960px] mx-auto">
      <nav className="mb-4">
        <Link to="/" className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors">
          <ArrowLeft className="w-3 h-3" />
          {language === 'en' ? 'Dashboard' : 'Panel'}
        </Link>
      </nav>

      <header className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <TrendingUp className="w-6 h-6 text-emerald-600" />
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
            {language === 'en' ? 'Wait time predictions' : 'Predicciones de tiempos de espera'}
          </h1>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-300 max-w-prose">
          {language === 'en'
            ? 'Predicted wait times for the next 6 hours based on 30-day historical patterns at each crossing. These are typical values, not guarantees.'
            : 'Tiempos de espera predichos para las proximas 6 horas basados en patrones historicos de 30 dias en cada cruce. Son valores tipicos, no garantias.'}
        </p>
        <p className="text-xs text-slate-500 mt-2 flex items-center gap-2">
          <Clock className="w-3.5 h-3.5" />
          {language === 'en' ? 'As of ' : 'Al '}
          {now.toLocaleString(language === 'es' ? 'es-MX' : 'en-US')}
        </p>
      </header>

      {nearHolidays.length > 0 && (
        <div className="mb-4 rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 p-3 flex items-start gap-2">
          <Calendar className="w-4 h-4 mt-0.5 text-amber-700 dark:text-amber-400 shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
              {language === 'en' ? 'Holiday alert' : 'Alerta de dia festivo'}
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
              {nearHolidays.map((h) => h.name[language] || h.name.en).join(', ')}
              {' — '}
              {language === 'en'
                ? 'expect higher-than-typical wait times at most crossings.'
                : 'espera tiempos de espera mas altos de lo tipico en la mayoria de los cruces.'}
            </p>
          </div>
        </div>
      )}

      {/* Methodology note */}
      <div className="mb-6 rounded-lg border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900/60 p-3">
        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          <span className="font-semibold text-slate-900 dark:text-white">
            {language === 'en' ? 'How predictions work: ' : 'Como funcionan las predicciones: '}
          </span>
          {language === 'en'
            ? 'Each prediction shows the median northbound wait observed at this crossing for this day of the week and hour, over the last 30 days of CBP data. On holidays and near-holiday periods, actual waits are frequently higher. These values reflect patterns, not real-time conditions.'
            : 'Cada prediccion muestra la mediana de espera hacia EE.UU. observada en este cruce para este dia de la semana y hora, durante los ultimos 30 dias de datos de CBP. En festivos y periodos cercanos, las esperas reales son frecuentemente mayores. Estos valores reflejan patrones, no condiciones en tiempo real.'}
        </p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-sm text-slate-500">
          {language === 'en' ? 'Loading predictions...' : 'Cargando predicciones...'}
        </div>
      ) : (
        <div className="space-y-4">
          {FEATURED_SLUGS.map((slug) => {
            const agg = aggregates[slug];
            if (!agg) return null;

            // Find crossing name
            const c = crossings.find((x) => {
              const s = slugMap[x.port_number];
              return s === slug;
            });
            const name = c?.name || agg.name || slug;

            return (
              <PredictionCard
                key={slug}
                slug={slug}
                name={name}
                aggregate={agg}
                now={now}
                language={language}
              />
            );
          })}
        </div>
      )}

      <AdsterraBanner label={language === 'en' ? 'Advertisement' : 'Publicidad'} />

      <EmailCapture
        variant="inline"
        source="predictions"
        language={language}
        className="mt-6 mb-6"
      />

      {/* Links */}
      <div className="flex flex-wrap gap-2 mb-6">
        <Link to="/best-time">
          <Button variant="outline" size="sm" className="text-xs gap-1">
            {language === 'en' ? 'Best time to cross' : 'Mejor hora para cruzar'}
            <ArrowRight className="w-3 h-3" />
          </Button>
        </Link>
        <Link to="/alerts">
          <Button variant="outline" size="sm" className="text-xs gap-1">
            {language === 'en' ? 'Set up alerts' : 'Configurar alertas'}
            <ArrowRight className="w-3 h-3" />
          </Button>
        </Link>
      </div>

      <footer className="text-xs text-slate-500 border-t border-slate-200 dark:border-gray-700 pt-3">
        {language === 'en' ? 'Source: ' : 'Fuente: '}
        <a href="https://bwt.cbp.gov/" className="underline" target="_blank" rel="noopener noreferrer">
          U.S. Customs and Border Protection
        </a>
        {' · '}
        <Link to="/methodology" className="underline">
          {language === 'en' ? 'Methodology' : 'Metodologia'}
        </Link>
      </footer>
    </div>
  );
}
