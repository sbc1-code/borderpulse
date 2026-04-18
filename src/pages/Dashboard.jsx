import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, ArrowUp, ArrowDown, Wifi, BarChart3, Share2, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import ExchangeRateWidget from '@/components/dashboard/ExchangeRateWidget';
import StatsOverview from '@/components/dashboard/StatsOverview';
import BorderCrossingCard from '@/components/dashboard/BorderCrossingCard';
import ShareModal from '@/components/dashboard/ShareModal';
import AnalyticsView from '@/components/dashboard/AnalyticsView';
import DepartureAlertBanner from '@/components/dashboard/DepartureAlertBanner';
import AboutFooter from '@/components/dashboard/AboutFooter';
import AdConsentCard from '@/components/ads/AdConsentCard';
import { dataService } from '@/components/utils/dataService';
import { recordSnapshot } from '@/components/utils/waitTimeHistory';
import { evaluate as evaluateNotify } from '@/components/utils/notifyService';
import { getWaitMinutes } from '@/components/utils/crossingDirection';

const REGIONS = [
  { code: 'ALL', label: { en: 'All', es: 'Todos' } },
  { code: 'CA', label: { en: 'California', es: 'California' } },
  { code: 'AZ', label: { en: 'Arizona', es: 'Arizona' } },
  { code: 'NM', label: { en: 'New Mexico', es: 'Nuevo México' } },
  { code: 'TX', label: { en: 'Texas', es: 'Texas' } },
];

const regionLabelFor = (code, lang) => {
  const r = REGIONS.find((x) => x.code === code);
  return r ? (r.label[lang] || r.label.en) : '';
};

export default function Dashboard() {
  const [state, setState] = useState({
    crossings: [],
    exchangeRate: null,
    isLoading: true,
    isRefreshing: false,
    source: null,
    southboundSource: null,
    southboundFetchedAt: null,
    southboundNote: null,
    fetchedAt: null,
  });

  const [language, setLanguage] = useState(() => localStorage.getItem('borderPulse_language') || 'en');
  const [direction, setDirection] = useState(() => localStorage.getItem('borderPulse_direction') || 'northbound');
  const [region, setRegion] = useState(() => localStorage.getItem('borderPulse_region') || 'ALL');
  const [search, setSearch] = useState('');
  const [showWithoutCurrentWaits, setShowWithoutCurrentWaits] = useState(true);
  const [view, setView] = useState('live');
  const [shareOpen, setShareOpen] = useState(false);

  const load = async () => {
    setState((s) => ({ ...s, isRefreshing: true }));
    const data = await dataService.getBorderData();
    setState({
      crossings: data.crossings || [],
      exchangeRate: data.exchange_rate,
      isLoading: false,
      isRefreshing: false,
      source: data.source,
      southboundSource: data.southbound_source,
      southboundFetchedAt: data.southbound_timestamp,
      southboundNote: data.southbound_note,
      fetchedAt: data.timestamp,
    });
    try {
      recordSnapshot(data.crossings || [], 'northbound');
      recordSnapshot(data.crossings || [], 'southbound');
      evaluateNotify(data.crossings || [], language, 'northbound');
      evaluateNotify(data.crossings || [], language, 'southbound');
    } catch (e) {
      console.warn('[dashboard] snapshot/notify error', e);
    }
  };

  useEffect(() => {
    load();
    dataService.startAutoRefresh(15 * 60 * 1000);
    return () => dataService.stopAutoRefresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const changeLanguage = (lang) => {
    setLanguage(lang);
    localStorage.setItem('borderPulse_language', lang);
    window.dispatchEvent(new StorageEvent('storage', { key: 'borderPulse_language', newValue: lang }));
  };
  const changeDirection = (dir) => {
    setDirection(dir);
    localStorage.setItem('borderPulse_direction', dir);
  };
  const changeRegion = (r) => {
    setRegion(r);
    localStorage.setItem('borderPulse_region', r);
  };

  // Filter by region + search; then sort heaviest first, keep null waits last.
  const filteredCrossings = useMemo(() => {
    const q = search.trim().toLowerCase();
    return state.crossings.filter((c) => {
      if (region !== 'ALL' && c.state !== region) return false;
      if (!q) return true;
      const haystack = [c.name, c.port_name, c.crossing_name, c.state]
        .filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(q);
    });
  }, [state.crossings, region, search]);

  const sortedCrossings = useMemo(() => {
    return [...filteredCrossings].sort((a, b) => {
      const waitA = getWaitMinutes(a, direction);
      const waitB = getWaitMinutes(b, direction);
      if (waitA == null && waitB == null) return 0;
      if (waitA == null) return 1;
      if (waitB == null) return -1;
      return waitB - waitA;
    });
  }, [filteredCrossings, direction]);

  const reportingCrossings = useMemo(
    () => sortedCrossings.filter((c) => getWaitMinutes(c, direction) != null),
    [sortedCrossings, direction],
  );
  const offlineCrossings = useMemo(
    () => sortedCrossings.filter((c) => getWaitMinutes(c, direction) == null),
    [sortedCrossings, direction],
  );
  const visibleCrossings = showWithoutCurrentWaits ? sortedCrossings : reportingCrossings;

  if (state.isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-slate-400" />
          <p className="text-sm text-slate-500">
            {language === 'en' ? 'Loading border data…' : 'Cargando datos fronterizos…'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 lg:p-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <header className="mb-4 sm:mb-5">
        <motion.h1
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white"
        >
          {language === 'en' ? 'Border Crossing Intelligence' : 'Inteligencia de Cruces Fronterizos'}
        </motion.h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          {language === 'en'
            ? 'Official wait times to the U.S. · Estimated delays to Mexico · Updated every 15 min'
            : 'Tiempos oficiales hacia EE.UU. · Demoras estimadas hacia México · Actualizado cada 15 min'}
        </p>

        {/* Controls row — wraps cleanly on mobile */}
        <div className="flex items-center gap-2 flex-wrap mt-3">
          <div className="flex items-center gap-1 text-[11px] text-slate-500 mr-auto">
            <Wifi className="w-3 h-3 text-emerald-500" />
            <span>{language === 'en' ? 'Live' : 'En vivo'}</span>
          </div>
          <Button
            variant={view === 'analytics' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setView((v) => (v === 'analytics' ? 'live' : 'analytics'))}
            className="gap-1 h-8"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span className="text-xs">
              {view === 'analytics'
                ? (language === 'en' ? 'Live' : 'En vivo')
                : (language === 'en' ? 'Analytics' : 'Análisis')}
            </span>
          </Button>
          <div className="flex items-center bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg p-0.5">
            <Button variant={language === 'en' ? 'default' : 'ghost'} size="sm" onClick={() => changeLanguage('en')} className="text-xs px-2.5 h-7">EN</Button>
            <Button variant={language === 'es' ? 'default' : 'ghost'} size="sm" onClick={() => changeLanguage('es')} className="text-xs px-2.5 h-7">ES</Button>
          </div>
          <Button variant="outline" size="sm" onClick={() => setShareOpen(true)} className="gap-1 h-8">
            <Share2 className="w-3.5 h-3.5" />
            <span className="text-xs hidden sm:inline">
              {language === 'en' ? 'Share' : 'Compartir'}
            </span>
          </Button>
          <Button variant="outline" size="sm" onClick={load} disabled={state.isRefreshing} className="gap-1 h-8">
            <RefreshCw className={`w-3.5 h-3.5 ${state.isRefreshing ? 'animate-spin' : ''}`} />
            <span className="text-xs hidden sm:inline">
              {language === 'en' ? 'Refresh' : 'Actualizar'}
            </span>
          </Button>
        </div>
      </header>

      {/* Departure Alert hero */}
      <DepartureAlertBanner crossings={state.crossings} language={language} direction={direction} />

      {/* Direction toggle */}
      <div className="flex rounded-lg p-1 mb-3 max-w-md mx-auto bg-slate-100 dark:bg-gray-800">
        <Button
          variant={direction === 'northbound' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => changeDirection('northbound')}
          className="flex-1 gap-2 h-9"
        >
          <ArrowUp className="w-4 h-4" />
          {language === 'en' ? 'To US' : 'Hacia EE.UU.'}
        </Button>
        <Button
          variant={direction === 'southbound' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => changeDirection('southbound')}
          className="flex-1 gap-2 h-9"
          title={language === 'en' ? 'Estimated southbound delay at major crossings' : 'Demora estimada hacia México en cruces principales'}
        >
          <ArrowDown className="w-4 h-4" />
          {language === 'en' ? 'To MX' : 'Hacia MX'}
        </Button>
      </div>

      {direction === 'southbound' && (
        <div className="max-w-3xl mx-auto mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-900">
          {language === 'en'
            ? 'To MX uses Border Pulse estimates at major crossings. Official port status, hours, and advisories are shown when available.'
            : 'Hacia MX usa estimaciones de Border Pulse en cruces principales. El estado oficial del puerto, horarios y avisos se muestran cuando están disponibles.'}
        </div>
      )}

      {view === 'analytics' ? (
        <AnalyticsView crossings={state.crossings} language={language} direction={direction} />
      ) : (
        <>
          {/* Search + region filter */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mb-4 max-w-3xl mx-auto">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="search"
                inputMode="search"
                placeholder={language === 'en' ? 'Search crossing or city (San Ysidro, Laredo, Nogales…)' : 'Buscar cruce o ciudad…'}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-10 pl-9 pr-9 rounded-lg border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  aria-label="Clear search"
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-slate-100 dark:hover:bg-gray-800"
                >
                  <X className="w-3.5 h-3.5 text-slate-400" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-1.5 flex-wrap justify-center sm:justify-end">
              {REGIONS.map((r) => (
                <Button
                  key={r.code}
                  variant={region === r.code ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => changeRegion(r.code)}
                  className="text-xs h-8 px-3"
                >
                  {r.label[language] || r.label.en}
                </Button>
              ))}
            </div>
          </div>

          <StatsOverview
            crossings={filteredCrossings}
            selectedDirection={direction}
            language={language}
            theme="light"
            regionLabel={regionLabelFor(region, language)}
          />

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 lg:gap-6 mb-6 mt-4">
            <div className="xl:col-span-3 space-y-4">
              <ExchangeRateWidget exchangeRate={state.exchangeRate} language={language} theme="light" />
            </div>

            <div className="xl:col-span-9">
              {visibleCrossings.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="p-8 text-center text-sm text-slate-500">
                    {search
                      ? (language === 'en'
                        ? `No crossings match "${search}". Try a different name or clear the search.`
                        : `No hay cruces que coincidan con "${search}". Intenta otro nombre o limpia la búsqueda.`)
                      : offlineCrossings.length > 0
                        ? (language === 'en'
                          ? 'No crossings currently have published wait times in this region.'
                          : 'Ningún cruce tiene tiempos publicados en este momento en esta región.')
                        : (language === 'en'
                          ? 'No crossings in this region right now.'
                          : 'No hay cruces en esta región ahora.')}
                  </CardContent>
                </Card>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <p className="text-xs text-slate-500">
                      {language === 'en'
                        ? `Showing ${visibleCrossings.length} of ${reportingCrossings.length + offlineCrossings.length}`
                        : `Mostrando ${visibleCrossings.length} de ${reportingCrossings.length + offlineCrossings.length}`}
                      {region !== 'ALL' && ` · ${regionLabelFor(region, language)}`}
                      {search && ` · "${search}"`}
                    </p>
                    {offlineCrossings.length > 0 && (
                      <button
                        onClick={() => setShowWithoutCurrentWaits((value) => !value)}
                        className="text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white underline decoration-dotted"
                      >
                        {showWithoutCurrentWaits
                          ? (language === 'en'
                            ? `Hide ${offlineCrossings.length} without current waits`
                            : `Ocultar ${offlineCrossings.length} sin tiempo actual`)
                          : (language === 'en'
                            ? `Show ${offlineCrossings.length} without current waits`
                            : `Mostrar ${offlineCrossings.length} sin tiempo actual`)}
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3 gap-3 sm:gap-4">
                    {visibleCrossings.map((crossing, idx) => (
                      <BorderCrossingCard
                        key={crossing.id || crossing.port_number}
                        crossing={crossing}
                        language={language}
                        index={idx}
                        selectedDirection={direction}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          <AdConsentCard language={language} />

          <AboutFooter
            language={language}
            fetchedAt={direction === 'southbound' ? state.southboundFetchedAt : state.fetchedAt}
            count={state.crossings.length}
            direction={direction}
          />
        </>
      )}

      <ShareModal
        open={shareOpen}
        onOpenChange={setShareOpen}
        crossings={sortedCrossings}
        language={language}
        direction={direction}
      />
    </div>
  );
}
