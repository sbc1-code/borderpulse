import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Car, User, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { dataService } from '@/components/utils/dataService';
import { buildSlugMap } from '@/lib/slugs';
import { updatePageMeta, resetPageMeta } from '@/lib/seo';
import { usePersistentLanguage } from '@/lib/useLanguage';

// Time it typically takes to park, walk the bridge, and reach a rideshare /
// transit / family pickup on the U.S. side. This isn't a guess — it's the
// observed default at San Ysidro PedWest from anecdotal commuter data
// (15-25 min). Other ports vary, but using one number keeps the math
// honest and the user can mentally adjust. Surface it explicitly in the
// recommendation so they know what's baked in.
const FOOT_OVERHEAD_MIN = 20;

// Threshold (minutes) below which we say "it's a wash" instead of
// recommending a switch. Below this gap, parking inconvenience usually
// dominates the wait-time savings.
const RECOMMEND_GAP_MIN = 15;

function laneWaitFromCrossing(crossing, key) {
  const lane = crossing?.lanes?.[key];
  if (!lane) return null;
  if (typeof lane.delay_minutes !== 'number') return null;
  return lane.delay_minutes;
}

function PanelCard({ icon: Icon, title, wait, sub, lang, recommendedLabel }) {
  return (
    <Card className={`h-full ${recommendedLabel ? 'border-emerald-400 dark:border-emerald-700 ring-1 ring-emerald-400 dark:ring-emerald-700' : ''}`}>
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <Icon className="w-4 h-4 text-slate-600 dark:text-slate-400" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{title}</h3>
          </div>
          {recommendedLabel && (
            <span className="inline-flex items-center rounded-full bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 dark:text-emerald-300">
              {recommendedLabel}
            </span>
          )}
        </div>
        <div className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tabular-nums">
          {wait == null ? '—' : `${wait} min`}
        </div>
        <p className="text-[11px] text-slate-500 mt-1">{sub}</p>
      </CardContent>
    </Card>
  );
}

export default function WalkOrDrive() {
  const { slug } = useParams();
  const language = usePersistentLanguage();
  const [state, setState] = useState({ crossings: [], isLoading: true });

  useEffect(() => {
    (async () => {
      const data = await dataService.getBorderData();
      setState({ crossings: data.crossings || [], isLoading: false });
    })();
  }, []);

  const { crossing, canonicalSlug } = useMemo(() => {
    if (!state.crossings.length || !slug) return { crossing: null, canonicalSlug: null };
    const { slugToPort, portToSlug } = buildSlugMap(state.crossings);
    const port = slugToPort[slug];
    const c = port ? state.crossings.find((x) => x.port_number === port) : null;
    return { crossing: c, canonicalSlug: c ? portToSlug[c.port_number] : null };
  }, [state.crossings, slug]);

  const veh = laneWaitFromCrossing(crossing, 'passenger_standard');
  const vehReady = laneWaitFromCrossing(crossing, 'passenger_ready');
  const vehSentri = laneWaitFromCrossing(crossing, 'passenger_sentri');
  const ped = laneWaitFromCrossing(crossing, 'pedestrian_standard');
  const pedReady = laneWaitFromCrossing(crossing, 'pedestrian_ready');

  // Best foot wait considering Ready Lane availability for pedestrians.
  const bestFootWait = useMemo(() => {
    const candidates = [];
    if (typeof ped === 'number') candidates.push({ via: 'standard', minutes: ped });
    if (typeof pedReady === 'number') candidates.push({ via: 'ready', minutes: pedReady });
    if (!candidates.length) return null;
    return candidates.reduce((acc, c) => (c.minutes < acc.minutes ? c : acc));
  }, [ped, pedReady]);

  // Recommendation: compare best vehicle option (standard for the lay default)
  // against best foot option PLUS the foot overhead. Walking only wins if the
  // adjusted foot total still beats the vehicle by more than the threshold.
  const recommendation = useMemo(() => {
    if (veh == null || bestFootWait == null) return null;
    const footTotal = bestFootWait.minutes + FOOT_OVERHEAD_MIN;
    const gap = veh - footTotal;
    if (gap >= RECOMMEND_GAP_MIN) {
      return {
        verdict: 'walk',
        savings: gap,
        footTotal,
        via: bestFootWait.via,
      };
    }
    if (gap <= -RECOMMEND_GAP_MIN) {
      return {
        verdict: 'drive',
        savings: -gap,
        footTotal,
        via: bestFootWait.via,
      };
    }
    return { verdict: 'wash', gap, footTotal, via: bestFootWait.via };
  }, [veh, bestFootWait]);

  useEffect(() => {
    if (!crossing || !canonicalSlug) return;
    const title = language === 'en'
      ? `Walk or drive across ${crossing.name}? Live decision based on CBP data | Border Pulse`
      : `¿Cruzar a pie o en auto en ${crossing.name}? Decisión en vivo con datos de CBP | Border Pulse`;
    const desc = language === 'en'
      ? `Compare live pedestrian and vehicle wait times at ${crossing.name} from CBP. See whether walking saves enough minutes to be worth parking.`
      : `Compara tiempos en vivo a pie y en vehículo en ${crossing.name} con datos de CBP. Ve si caminar te ahorra suficiente tiempo para que valga estacionar.`;
    const url = `https://borderpulse.com/walk-or-drive/${canonicalSlug}`;
    updatePageMeta({ title, description: desc, ogTitle: title, ogDescription: desc, ogUrl: url, canonical: url });
    return () => resetPageMeta();
  }, [crossing, canonicalSlug, language]);

  if (state.isLoading) {
    return <div className="p-6 text-sm text-slate-500">Loading…</div>;
  }
  if (!crossing) return <Navigate to="/" replace />;

  // No pedestrian data at this crossing — gracefully redirect users to the
  // crossing detail page. Don't pretend we have an answer when CBP doesn't
  // publish ped data here.
  if (ped == null && pedReady == null) {
    return (
      <div className="p-3 sm:p-4 lg:p-6 max-w-[1100px] mx-auto">
        <div className="mb-3">
          <Link to="/" className="inline-flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white">
            <ArrowLeft className="w-3.5 h-3.5" />
            {language === 'en' ? 'All crossings' : 'Todos los cruces'}
          </Link>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-3">
          {language === 'en' ? `${crossing.name}: pedestrian data not published` : `${crossing.name}: sin datos peatonales publicados`}
        </h1>
        <p className="text-sm text-slate-700 dark:text-slate-300 mb-4">
          {language === 'en'
            ? `CBP doesn't publish a pedestrian wait time for ${crossing.name}, so the walk-vs-drive question can't be answered from data. Some ports don't have pedestrian lanes; others have them but don't report. Check the live page for what is published.`
            : `CBP no publica tiempo de espera peatonal para ${crossing.name}, así que la pregunta caminar-vs-manejar no se puede responder con datos. Algunos puertos no tienen carriles peatonales; otros sí pero no reportan. Revisa la página en vivo para ver lo que sí se publica.`}
        </p>
        <Link to={`/crossing/${canonicalSlug}`} className="inline-flex items-center gap-1 text-sm font-medium text-emerald-700 dark:text-emerald-400 hover:underline">
          {language === 'en' ? `Open ${crossing.name} live page` : `Abrir página en vivo de ${crossing.name}`} <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  const verdictLabel = (v) => {
    if (v === 'walk') return language === 'en' ? 'Walk' : 'A pie';
    if (v === 'drive') return language === 'en' ? 'Drive' : 'En auto';
    return language === 'en' ? "It's a wash" : 'Está parejo';
  };

  return (
    <div className="p-3 sm:p-4 lg:p-6 max-w-[1100px] mx-auto">
      <div className="mb-3">
        <Link to="/" className="inline-flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white">
          <ArrowLeft className="w-3.5 h-3.5" />
          {language === 'en' ? 'All crossings' : 'Todos los cruces'}
        </Link>
      </div>

      <header className="mb-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
          {language === 'en'
            ? `Walk or drive across ${crossing.name}?`
            : `¿Cruzar a pie o en auto en ${crossing.name}?`}
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1 inline-flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" />
          {language === 'en'
            ? `Live wait times from CBP, plus ${FOOT_OVERHEAD_MIN} min added to the foot total to cover parking and walking the bridge. Northbound only.`
            : `Tiempos en vivo de CBP, más ${FOOT_OVERHEAD_MIN} min al total a pie para cubrir estacionar y cruzar el puente. Solo hacia EE.UU.`}
        </p>
      </header>

      {recommendation && (
        <div className={`mb-4 rounded-lg border px-4 py-3 ${
          recommendation.verdict === 'walk'
            ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/40'
            : recommendation.verdict === 'drive'
              ? 'border-sky-300 bg-sky-50 dark:border-sky-800 dark:bg-sky-950/40'
              : 'border-slate-300 bg-slate-50 dark:border-gray-700 dark:bg-gray-900/40'
        }`}>
          <div className={`text-[10px] uppercase tracking-wider font-semibold mb-0.5 ${
            recommendation.verdict === 'walk' ? 'text-emerald-800 dark:text-emerald-300'
              : recommendation.verdict === 'drive' ? 'text-sky-800 dark:text-sky-300'
              : 'text-slate-600 dark:text-slate-400'
          }`}>
            {language === 'en' ? 'Right now' : 'Ahora mismo'}
          </div>
          <p className="text-sm text-slate-900 dark:text-white">
            {(() => {
              const r = recommendation;
              if (r.verdict === 'walk') {
                const laneEn = r.via === 'ready' ? 'Ready Lane pedestrian' : 'standard pedestrian';
                const laneEs = r.via === 'ready' ? 'peatonal Ready Lane' : 'peatonal estándar';
                return language === 'en'
                  ? `Walk. The ${laneEn} wait plus ${FOOT_OVERHEAD_MIN} min for parking and the bridge totals ${r.footTotal} min, vs ${veh} min driving. You save about ${r.savings} min.`
                  : `Camina. La espera ${laneEs} más ${FOOT_OVERHEAD_MIN} min de estacionar y cruzar el puente suma ${r.footTotal} min, contra ${veh} min manejando. Ahorras unos ${r.savings} min.`;
              }
              if (r.verdict === 'drive') {
                return language === 'en'
                  ? `Drive. Vehicle wait is ${veh} min vs ${r.footTotal} min on foot (including ${FOOT_OVERHEAD_MIN} min parking + bridge). Driving saves about ${r.savings} min.`
                  : `Maneja. La espera en auto es de ${veh} min vs ${r.footTotal} min a pie (incluyendo ${FOOT_OVERHEAD_MIN} min de estacionar + puente). Manejar ahorra unos ${r.savings} min.`;
              }
              return language === 'en'
                ? `It's a wash. Vehicle wait is ${veh} min, foot total ${r.footTotal} min (within ±${RECOMMEND_GAP_MIN}). Pick whichever is more convenient for your destination on the U.S. side.`
                : `Está parejo. Espera en auto: ${veh} min, total a pie: ${r.footTotal} min (dentro de ±${RECOMMEND_GAP_MIN}). Elige lo más conveniente para tu destino del lado de EE.UU.`;
            })()}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4">
        <PanelCard
          icon={Car}
          title={language === 'en' ? 'Drive (standard)' : 'En auto (estándar)'}
          wait={veh}
          sub={vehReady != null
            ? (language === 'en' ? `Ready Lane: ${vehReady} min · SENTRI: ${vehSentri ?? '—'} min` : `Ready Lane: ${vehReady} min · SENTRI: ${vehSentri ?? '—'} min`)
            : (language === 'en' ? 'CBP standard passenger lane' : 'Carril estándar de pasajero CBP')}
          lang={language}
          recommendedLabel={recommendation?.verdict === 'drive' ? (language === 'en' ? 'Recommended' : 'Recomendado') : null}
        />
        <PanelCard
          icon={User}
          title={language === 'en' ? 'Walk (standard)' : 'A pie (estándar)'}
          wait={ped}
          sub={language === 'en'
            ? `Add ~${FOOT_OVERHEAD_MIN} min for parking + bridge`
            : `Agrega ~${FOOT_OVERHEAD_MIN} min por estacionar + puente`}
          lang={language}
          recommendedLabel={recommendation?.verdict === 'walk' && recommendation?.via === 'standard' ? (language === 'en' ? 'Recommended' : 'Recomendado') : null}
        />
        <PanelCard
          icon={User}
          title={language === 'en' ? 'Walk (Ready Lane)' : 'A pie (Ready Lane)'}
          wait={pedReady}
          sub={language === 'en'
            ? `Requires RFID document. Add ~${FOOT_OVERHEAD_MIN} min for parking + bridge`
            : `Requiere documento con RFID. Agrega ~${FOOT_OVERHEAD_MIN} min por estacionar + puente`}
          lang={language}
          recommendedLabel={recommendation?.verdict === 'walk' && recommendation?.via === 'ready' ? (language === 'en' ? 'Recommended' : 'Recomendado') : null}
        />
      </div>

      <section className="mb-6">
        <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-2">
          {language === 'en' ? 'Things this calculation does not include' : 'Cosas que este cálculo no incluye'}
        </h2>
        <ul className="text-sm text-slate-700 dark:text-slate-300 space-y-1.5 list-disc pl-5">
          <li>
            {language === 'en'
              ? 'Parking cost on the Mexico side and time to find a spot. Plan on $5-10 USD/day at major ports.'
              : 'Costo de estacionamiento del lado mexicano y tiempo para encontrar lugar. Calcula $5-10 USD/día en puertos grandes.'}
          </li>
          <li>
            {language === 'en'
              ? 'Rideshare or transit cost on the U.S. side once you cross. At San Ysidro the trolley is $2.50 and rideshare to downtown SD is $15-25.'
              : 'Costo de Uber o transporte del lado de EE.UU. al cruzar. En San Ysidro el trolley son $2.50 y Uber al centro de SD son $15-25.'}
          </li>
          <li>
            {language === 'en'
              ? 'Whether you actually need your car on the U.S. side. If your destination is far from transit, walking can save wait time but cost you more elsewhere.'
              : 'Si realmente necesitas tu auto del lado de EE.UU. Si tu destino está lejos del transporte público, caminar te ahorra espera pero te puede costar más en otros lados.'}
          </li>
          <li>
            {language === 'en'
              ? 'Pedestrian-lane operating hours and Ready Lane staffing. Verify before committing.'
              : 'Horario del carril peatonal y personal del Ready Lane. Verifica antes de comprometerte.'}
          </li>
        </ul>
      </section>

      <div className="mb-6 flex flex-wrap gap-3 text-sm">
        <Link
          to={`/crossing/${canonicalSlug}`}
          className="inline-flex items-center gap-1 font-medium text-emerald-700 dark:text-emerald-400 hover:underline"
        >
          {language === 'en' ? `${crossing.name} live page` : `Página en vivo de ${crossing.name}`} <ArrowRight className="w-4 h-4" />
        </Link>
        <Link
          to={`/best-time/${canonicalSlug}`}
          className="inline-flex items-center gap-1 font-medium text-emerald-700 dark:text-emerald-400 hover:underline"
        >
          {language === 'en' ? `Best time to cross ${crossing.name}` : `Mejor hora para cruzar ${crossing.name}`} <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      <footer className="text-xs text-slate-500 border-t border-slate-200 dark:border-gray-700 pt-3">
        {language === 'en' ? 'Source: ' : 'Fuente: '}
        <a href="https://bwt.cbp.gov/" className="underline" target="_blank" rel="noopener noreferrer">
          U.S. Customs and Border Protection
        </a>
      </footer>
    </div>
  );
}
