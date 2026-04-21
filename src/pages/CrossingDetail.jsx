import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { ArrowLeft, Clock, MapPin, RefreshCw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import BorderCrossingCard from '@/components/dashboard/BorderCrossingCard';
import { dataService } from '@/components/utils/dataService';
import { buildSlugMap } from '@/lib/slugs';
import { getHoursSummary } from '@/components/utils/crossingMeta';
import { getWaitMinutes } from '@/components/utils/crossingDirection';

const DAY_LABELS = {
  en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  es: ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'],
};

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
    .filter((h) => h.day === dayIdx && h.median != null)
    .sort((a, b) => a.median - b.median);
  return scored[0] || null;
}

function formatHour12(h, lang) {
  const suffix = h >= 12 ? (lang === 'en' ? 'PM' : 'p. m.') : (lang === 'en' ? 'AM' : 'a. m.');
  const h12 = h % 12 || 12;
  return `${h12} ${suffix}`;
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

export default function CrossingDetail() {
  const { slug } = useParams();
  const [state, setState] = useState({
    crossings: [],
    isLoading: true,
    source: null,
    fetchedAt: null,
  });
  const [aggregate, setAggregate] = useState(null);
  const language = usePersistentLanguage();

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

  useEffect(() => {
    if (!slug) return;
    fetch(`/data/aggregates/${slug}.json`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setAggregate)
      .catch(() => setAggregate(null));
  }, [slug]);

  const { crossing, portToSlug } = useMemo(() => {
    if (!state.crossings.length) return { crossing: null, portToSlug: {} };
    const { slugToPort, portToSlug } = buildSlugMap(state.crossings);
    const port = slugToPort[slug];
    const c = port ? state.crossings.find((x) => x.port_number === port) : null;
    return { crossing: c, portToSlug };
  }, [state.crossings, slug]);

  useEffect(() => {
    if (!crossing) return;
    const label = language === 'en' ? 'Border Pulse' : 'Border Pulse';
    document.title = `${crossing.name} wait times | ${label}`;
  }, [crossing, language]);

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

  const currentNb = getWaitMinutes(crossing, 'northbound');
  const hoursSummary = getHoursSummary(crossing, language);
  const faqs = faqItems(crossing, aggregate, language);

  const todayIdx = new Date().getDay();
  const todayHours = aggregate?.by_hour?.filter((h) => h.day === todayIdx && h.median != null) || [];
  const bestToday = pickBestHour(aggregate?.by_hour, todayIdx);

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
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
            {language === 'en'
              ? `Typical wait today (${DAY_LABELS.en[todayIdx]})`
              : `Espera típica hoy (${DAY_LABELS.es[todayIdx]})`}
          </h2>
          <p className="text-xs text-slate-500 mb-3">
            {language === 'en'
              ? `Median northbound wait by hour, last 30 days at ${crossing.name}.`
              : `Mediana de espera hacia EE.UU. por hora, últimos 30 días en ${crossing.name}.`}
          </p>
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="grid grid-cols-6 sm:grid-cols-12 gap-1">
                {Array.from({ length: 24 }, (_, h) => {
                  const slot = todayHours.find((x) => x.hour === h);
                  const val = slot?.median;
                  const isBest = bestToday && bestToday.hour === h;
                  const intensity = val == null ? 0 : Math.min(100, (val / 90) * 100);
                  return (
                    <div key={h} className="flex flex-col items-center gap-1">
                      <div
                        className={`w-full h-10 rounded ${isBest ? 'ring-2 ring-emerald-500' : ''}`}
                        style={{
                          background: val == null
                            ? 'rgb(241 245 249)'
                            : `rgb(${Math.round(239 - intensity * 0.5)}, ${Math.round(68 + (100 - intensity) * 1.5)}, ${Math.round(68 + (100 - intensity) * 0.5)})`,
                        }}
                        title={val == null ? '—' : `${val} min`}
                      />
                      <span className="text-[9px] text-slate-500 tabular-nums">{h}</span>
                    </div>
                  );
                })}
              </div>
              {bestToday && (
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-3">
                  {language === 'en'
                    ? `Best time to cross today: ${formatHour12(bestToday.hour, 'en')} (median ${bestToday.median} min).`
                    : `Mejor hora para cruzar hoy: ${formatHour12(bestToday.hour, 'es')} (mediana ${bestToday.median} min).`}
                </p>
              )}
            </CardContent>
          </Card>
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

      <footer className="text-xs text-slate-500 border-t border-slate-200 dark:border-gray-700 pt-3">
        {language === 'en' ? 'Source: ' : 'Fuente: '}
        <a href={state.source?.url || 'https://bwt.cbp.gov/'} className="underline" target="_blank" rel="noopener noreferrer">
          {state.source?.name || 'U.S. Customs and Border Protection'}
        </a>
      </footer>
    </div>
  );
}
