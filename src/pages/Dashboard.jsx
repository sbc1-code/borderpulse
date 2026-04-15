import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, ArrowUp, ArrowDown, Wifi, BarChart3, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import ExchangeRateWidget from '@/components/dashboard/ExchangeRateWidget';
import StatsOverview from '@/components/dashboard/StatsOverview';
import BorderCrossingCard from '@/components/dashboard/BorderCrossingCard';
import ShareModal from '@/components/dashboard/ShareModal';
import AnalyticsView from '@/components/dashboard/AnalyticsView';
import DepartureAlertBanner from '@/components/dashboard/DepartureAlertBanner';
import AboutFooter from '@/components/dashboard/AboutFooter';
import AdsterraBanner from '@/components/ads/AdsterraBanner';
import { dataService } from '@/components/utils/dataService';
import { recordSnapshot } from '@/components/utils/waitTimeHistory';
import { evaluate as evaluateNotify } from '@/components/utils/notifyService';

const REGIONS = [
  { code: 'ALL', label: { en: 'All', es: 'Todos' } },
  { code: 'CA', label: { en: 'California', es: 'California' } },
  { code: 'AZ', label: { en: 'Arizona', es: 'Arizona' } },
  { code: 'NM', label: { en: 'New Mexico', es: 'Nuevo México' } },
  { code: 'TX', label: { en: 'Texas', es: 'Texas' } },
];

export default function Dashboard() {
  const [state, setState] = useState({
    crossings: [],
    exchangeRate: null,
    isLoading: true,
    isRefreshing: false,
    source: null,
    fetchedAt: null,
  });

  const [language, setLanguage] = useState(() => localStorage.getItem('borderPulse_language') || 'en');
  const [direction, setDirection] = useState(() => localStorage.getItem('borderPulse_direction') || 'northbound');
  const [region, setRegion] = useState(() => localStorage.getItem('borderPulse_region') || 'ALL');
  const [view, setView] = useState('live'); // 'live' | 'analytics'
  const [shareOpen, setShareOpen] = useState(false);

  const load = async () => {
    setState((s) => ({ ...s, isRefreshing: true }));
    const data = await dataService.getBorderData();
    const normalized = (data.crossings || []).map((c) => ({
      ...c,
      northbound_wait_time: c.current_wait_time,
      southbound_wait_time: null,
    }));
    setState({
      crossings: normalized,
      exchangeRate: data.exchange_rate,
      isLoading: false,
      isRefreshing: false,
      source: data.source,
      fetchedAt: data.timestamp,
    });
    // Record snapshot + evaluate notifications (post-render)
    try {
      recordSnapshot(normalized);
      evaluateNotify(normalized, language);
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

  const filteredCrossings = useMemo(() => {
    if (region === 'ALL') return state.crossings;
    return state.crossings.filter((c) => c.state === region);
  }, [state.crossings, region]);

  const sortedCrossings = useMemo(() => {
    return [...filteredCrossings].sort((a, b) => {
      if (a.current_wait_time == null) return 1;
      if (b.current_wait_time == null) return -1;
      return b.current_wait_time - a.current_wait_time; // heaviest first — matches live site
    });
  }, [filteredCrossings]);

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
      <div className="mb-4 sm:mb-6">
        <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
          <div>
            <motion.h1
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white"
            >
              {language === 'en' ? 'Border Crossing Intelligence' : 'Inteligencia de Cruces Fronterizos'}
            </motion.h1>
            <p className="text-xs sm:text-sm text-slate-500">
              {language === 'en'
                ? 'Real-time border crossing data · Official CBP feed · 15 min updates'
                : 'Datos de cruces en tiempo real · Feed oficial CBP · Actualizado cada 15 min'}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 text-xs text-slate-500">
              <Wifi className="w-3 h-3 text-emerald-500" />
              <span>{language === 'en' ? 'Live' : 'En vivo'}</span>
            </div>
            <Button
              variant={view === 'analytics' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setView((v) => (v === 'analytics' ? 'live' : 'analytics'))}
              className="gap-1"
            >
              <BarChart3 className="w-3 h-3" />
              <span className="hidden sm:inline text-xs">
                {view === 'analytics'
                  ? (language === 'en' ? 'Live view' : 'Vista en vivo')
                  : (language === 'en' ? 'Analytics' : 'Análisis')}
              </span>
            </Button>
            <div className="flex items-center bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg p-0.5">
              <Button variant={language === 'en' ? 'default' : 'ghost'} size="sm" onClick={() => changeLanguage('en')} className="text-xs px-2 py-1 h-7">EN</Button>
              <Button variant={language === 'es' ? 'default' : 'ghost'} size="sm" onClick={() => changeLanguage('es')} className="text-xs px-2 py-1 h-7">ES</Button>
            </div>
            <Button variant="outline" size="sm" onClick={() => setShareOpen(true)} className="gap-1">
              <Share2 className="w-3 h-3" />
              <span className="hidden sm:inline text-xs">
                {language === 'en' ? 'Share' : 'Compartir'}
              </span>
            </Button>
            <Button variant="outline" size="sm" onClick={load} disabled={state.isRefreshing} className="gap-1">
              <RefreshCw className={`w-3 h-3 ${state.isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline text-xs">
                {language === 'en' ? 'Refresh' : 'Actualizar'}
              </span>
            </Button>
          </div>
        </div>
      </div>

      {/* Departure Alert hero */}
      <DepartureAlertBanner crossings={state.crossings} language={language} />

      {/* Direction toggle */}
      <div className="flex rounded-lg p-1 mb-3 max-w-md mx-auto bg-slate-100 dark:bg-gray-800">
        <Button
          variant={direction === 'northbound' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => changeDirection('northbound')}
          className="flex-1 gap-2"
        >
          <ArrowUp className="w-4 h-4" />
          {language === 'en' ? 'To US' : 'Hacia EE.UU.'}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled
          className="flex-1 gap-2 opacity-60 cursor-not-allowed"
          title={language === 'en' ? 'CBP does not publish southbound wait times' : 'CBP no publica tiempos hacia México'}
        >
          <ArrowDown className="w-4 h-4" />
          {language === 'en' ? 'To MX (soon)' : 'Hacia MX (pronto)'}
        </Button>
      </div>

      {/* Region filter */}
      <div className="flex items-center gap-1.5 flex-wrap mb-4 justify-center">
        {REGIONS.map((r) => (
          <Button
            key={r.code}
            variant={region === r.code ? 'default' : 'outline'}
            size="sm"
            onClick={() => changeRegion(r.code)}
            className="text-xs h-7 px-3"
          >
            {r.label[language] || r.label.en}
          </Button>
        ))}
      </div>

      {view === 'analytics' ? (
        <AnalyticsView crossings={state.crossings} language={language} />
      ) : (
        <>
          <StatsOverview
            crossings={state.crossings}
            selectedDirection={direction}
            language={language}
            theme="light"
          />

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 lg:gap-6 mb-6 mt-4">
            <div className="xl:col-span-3 space-y-4">
              <ExchangeRateWidget exchangeRate={state.exchangeRate} language={language} theme="light" />
            </div>

            <div className="xl:col-span-9">
              {sortedCrossings.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="p-8 text-center text-sm text-slate-500">
                    {language === 'en' ? 'No crossings available right now.' : 'No hay cruces disponibles en este momento.'}
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3 gap-4">
                  {sortedCrossings.map((crossing, idx) => (
                    <BorderCrossingCard
                      key={crossing.id || crossing.port_number}
                      crossing={crossing}
                      language={language}
                      index={idx}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          <AdsterraBanner label={language === 'en' ? 'Advertisement' : 'Publicidad'} />

          <AboutFooter
            language={language}
            fetchedAt={state.fetchedAt}
            count={state.crossings.length}
          />
        </>
      )}

      <ShareModal open={shareOpen} onOpenChange={setShareOpen} crossings={sortedCrossings} language={language} />
    </div>
  );
}
