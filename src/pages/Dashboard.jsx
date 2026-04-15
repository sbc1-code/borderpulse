import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, ArrowUp, ArrowDown, Clock, Wifi, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import ExchangeRateWidget from '@/components/dashboard/ExchangeRateWidget';
import StatsOverview from '@/components/dashboard/StatsOverview';
import { dataService } from '@/components/utils/dataService';

const statusStyles = {
  good: { bar: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: { en: 'Good', es: 'Bueno' } },
  moderate: { bar: 'bg-amber-500', badge: 'bg-amber-50 text-amber-700 border-amber-200', label: { en: 'Moderate', es: 'Moderado' } },
  heavy: { bar: 'bg-rose-500', badge: 'bg-rose-50 text-rose-700 border-rose-200', label: { en: 'Heavy', es: 'Pesado' } },
  unknown: { bar: 'bg-slate-300', badge: 'bg-slate-50 text-slate-600 border-slate-200', label: { en: 'No data', es: 'Sin datos' } },
};

function CrossingCard({ crossing, language, index }) {
  const s = statusStyles[crossing.status] || statusStyles.unknown;
  const wait = crossing.current_wait_time;

  const lanes = crossing.lanes || {};
  const laneRows = [
    { key: 'passenger_standard', label: { en: 'Passenger (Standard)', es: 'Pasajeros (Estándar)' }, data: lanes.passenger_standard },
    { key: 'passenger_ready', label: { en: 'Ready Lane', es: 'Ready Lane' }, data: lanes.passenger_ready },
    { key: 'passenger_sentri', label: { en: 'SENTRI', es: 'SENTRI' }, data: lanes.passenger_sentri },
    { key: 'pedestrian_standard', label: { en: 'Pedestrian', es: 'Peatones' }, data: lanes.pedestrian_standard },
    { key: 'commercial_standard', label: { en: 'Commercial', es: 'Comercial' }, data: lanes.commercial_standard },
    { key: 'commercial_fast', label: { en: 'FAST (Commercial)', es: 'FAST (Comercial)' }, data: lanes.commercial_fast },
  ].filter((r) => r.data);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
    >
      <Card className="h-full flex flex-col overflow-hidden border-slate-200 bg-white">
        <div className={`h-1 ${s.bar}`} />
        <CardContent className="p-4 flex-1 flex flex-col">
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-slate-900 truncate" title={crossing.name}>
                {crossing.name || crossing.port_name}
              </h3>
              <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                <MapPin className="w-3 h-3" />
                <span className="truncate">{crossing.port_name}</span>
              </div>
            </div>
            <Badge variant="outline" className={`text-xs font-medium whitespace-nowrap ${s.badge}`}>
              {s.label[language] || s.label.en}
            </Badge>
          </div>

          <div className="flex items-baseline gap-1 mb-3">
            <span className="text-3xl font-bold text-slate-900">
              {wait == null ? '—' : wait}
            </span>
            <span className="text-sm text-slate-500">
              {wait == null ? (language === 'en' ? 'no data' : 'sin datos') : (language === 'en' ? 'min wait' : 'min espera')}
            </span>
          </div>

          {laneRows.length > 0 && (
            <div className="space-y-1 text-xs">
              {laneRows.map((row) => (
                <div key={row.key} className="flex items-center justify-between text-slate-600">
                  <span className="truncate">{row.label[language] || row.label.en}</span>
                  <span className="font-medium text-slate-900 tabular-nums whitespace-nowrap">
                    {row.data.delay_minutes == null ? '—' : `${row.data.delay_minutes}m`}
                    <span className="text-slate-400"> · {row.data.lanes_open} {language === 'en' ? 'open' : 'abiertas'}</span>
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="mt-auto pt-3 flex items-center gap-1 text-[10px] text-slate-400">
            <Clock className="w-3 h-3" />
            <span>{crossing.updated_at}</span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function Dashboard() {
  const [state, setState] = useState({
    crossings: [],
    exchangeRate: null,
    isLoading: true,
    isRefreshing: false,
    source: null,
    fetchedAt: null,
  });

  const [language, setLanguage] = useState(
    () => localStorage.getItem('borderPulse_language') || 'en'
  );
  const [direction, setDirection] = useState(
    () => localStorage.getItem('borderPulse_direction') || 'northbound'
  );

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
  };

  useEffect(() => {
    load();
    dataService.startAutoRefresh(15 * 60 * 1000);
    return () => dataService.stopAutoRefresh();
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

  const sortedCrossings = useMemo(() => {
    return [...state.crossings].sort((a, b) => {
      if (a.current_wait_time == null) return 1;
      if (b.current_wait_time == null) return -1;
      return a.current_wait_time - b.current_wait_time;
    });
  }, [state.crossings]);

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

  const theme = 'light';

  return (
    <div className="p-3 sm:p-4 lg:p-6 max-w-[1600px] mx-auto">
      <div className="mb-4 sm:mb-6">
        <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
          <motion.h1
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900"
          >
            {language === 'en' ? 'Border Intelligence' : 'Inteligencia Fronteriza'}
          </motion.h1>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1">
              <Wifi className="w-3 h-3 text-emerald-500" />
              <span className="text-xs text-slate-500">
                {language === 'en' ? 'Live' : 'En vivo'}
              </span>
            </div>

            <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5">
              <Button variant={language === 'en' ? 'default' : 'ghost'} size="sm" onClick={() => changeLanguage('en')} className="text-xs px-2 py-1 h-7">EN</Button>
              <Button variant={language === 'es' ? 'default' : 'ghost'} size="sm" onClick={() => changeLanguage('es')} className="text-xs px-2 py-1 h-7">ES</Button>
            </div>

            <Button variant="outline" size="sm" onClick={load} disabled={state.isRefreshing} className="gap-1">
              <RefreshCw className={`w-3 h-3 ${state.isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline text-xs">
                {language === 'en' ? 'Refresh' : 'Actualizar'}
              </span>
            </Button>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-slate-500">
          {language === 'en'
            ? 'Official CBP wait times for all US-Mexico crossings. Updated every 15 minutes.'
            : 'Tiempos de espera oficiales CBP para todos los cruces EE.UU.-México. Actualizado cada 15 minutos.'}
        </p>
      </div>

      <div className="flex rounded-lg p-1 mb-4 max-w-sm mx-auto shadow-sm bg-slate-100">
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

      <StatsOverview
        crossings={state.crossings}
        selectedDirection={direction}
        language={language}
        theme={theme}
      />

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 lg:gap-6 mb-6 mt-4">
        <div className="xl:col-span-3 space-y-4">
          <ExchangeRateWidget
            exchangeRate={state.exchangeRate}
            language={language}
            theme={theme}
          />
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
                <CrossingCard
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

      <div className="text-center text-xs text-slate-400 mt-6">
        {language === 'en' ? 'Source:' : 'Fuente:'} {state.source}
        {' · '}
        {language === 'en' ? 'Fetched:' : 'Actualizado:'} {new Date(state.fetchedAt).toLocaleString()}
      </div>
    </div>
  );
}
