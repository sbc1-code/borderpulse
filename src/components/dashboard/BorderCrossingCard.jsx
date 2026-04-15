import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Clock, MapPin, TrendingUp, TrendingDown, Minus, AlertTriangle,
  Car, User, Truck, ChevronDown, ChevronUp, Bell, BellRing, BarChart3,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getHistoryForDirection, getPreviousWait } from '@/components/utils/waitTimeHistory';
import { getPrefForCrossing, setPref, permission, requestPermission } from '@/components/utils/notifyService';
import Sparkline from '@/components/charts/Sparkline';
import {
  getStatusForDirection,
  getUpdatedAtForDirection,
  getWaitMinutes,
} from '@/components/utils/crossingDirection';

const STATUS_STYLES = {
  good: { bar: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: { en: 'Good', es: 'Bueno' }, dot: 'bg-emerald-500' },
  moderate: { bar: 'bg-amber-500', badge: 'bg-amber-50 text-amber-700 border-amber-200', label: { en: 'Moderate', es: 'Moderado' }, dot: 'bg-amber-500' },
  heavy: { bar: 'bg-rose-500', badge: 'bg-rose-50 text-rose-700 border-rose-200', label: { en: 'Heavy', es: 'Pesado' }, dot: 'bg-rose-500' },
  unknown: { bar: 'bg-slate-300', badge: 'bg-slate-50 text-slate-600 border-slate-200', label: { en: 'No data', es: 'Sin datos' }, dot: 'bg-slate-300' },
};

function LaneRow({ icon: Icon, label, data, language }) {
  if (!data) return null;
  return (
    <div className="flex items-center justify-between py-1.5 text-xs">
      <div className="flex items-center gap-2 text-slate-600 min-w-0">
        <Icon className="w-3.5 h-3.5 flex-shrink-0" />
        <span className="truncate">{label[language] || label.en}</span>
      </div>
      <div className="flex items-center gap-2 font-medium text-slate-900 tabular-nums whitespace-nowrap">
        <span>{data.delay_minutes == null ? '—' : `${data.delay_minutes}m`}</span>
        <span className="text-slate-400 font-normal">
          · {data.lanes_open} {language === 'en' ? 'open' : 'abiertas'}
        </span>
      </div>
    </div>
  );
}

export default function BorderCrossingCard({
  crossing,
  language,
  index = 0,
  selectedDirection = 'northbound',
}) {
  const [showLanes, setShowLanes] = useState(false);
  const [showTrends, setShowTrends] = useState(false);
  const [showNotify, setShowNotify] = useState(false);
  const [pref, setPrefState] = useState(() => getPrefForCrossing(crossing.port_number, selectedDirection));
  const [perm, setPerm] = useState(() => (typeof window !== 'undefined' ? permission() : 'default'));

  useEffect(() => {
    setPrefState(getPrefForCrossing(crossing.port_number, selectedDirection));
  }, [crossing.port_number, selectedDirection]);

  const status = getStatusForDirection(crossing, selectedDirection);
  const s = STATUS_STYLES[status] || STATUS_STYLES.unknown;
  const wait = getWaitMinutes(crossing, selectedDirection);
  const isHigh = typeof wait === 'number' && wait >= 45;
  const updatedAt = getUpdatedAtForDirection(crossing, selectedDirection);
  const isSouthbound = selectedDirection === 'southbound';

  const history = useMemo(
    () => getHistoryForDirection(crossing.port_number || crossing.id, selectedDirection),
    [crossing.port_number, crossing.id, selectedDirection, crossing.updated_at, crossing.southbound_updated_at]
  );
  const previousWait = useMemo(
    () => getPreviousWait(crossing.port_number || crossing.id, selectedDirection),
    [crossing.port_number, crossing.id, selectedDirection, crossing.updated_at, crossing.southbound_updated_at]
  );

  const trend = useMemo(() => {
    if (previousWait == null || wait == null) return 'flat';
    if (wait > previousWait + 2) return 'up';
    if (wait < previousWait - 2) return 'down';
    return 'flat';
  }, [wait, previousWait]);

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? 'text-rose-500' : trend === 'down' ? 'text-emerald-500' : 'text-slate-400';

  const lanes = crossing.lanes || {};

  const handleToggleNotify = async () => {
    if (pref) {
      setPref(crossing.port_number, null, selectedDirection);
      setPrefState(null);
      setShowNotify(false);
      return;
    }
    setShowNotify(true);
    if (perm !== 'granted') {
      const res = await requestPermission();
      setPerm(res === true ? 'granted' : res);
    }
  };

  const saveNotify = (kind, threshold) => {
    const newPref = { active: true, kind, threshold: Number(threshold) };
    setPref(crossing.port_number, newPref, selectedDirection);
    setPrefState(newPref);
    setShowNotify(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.02, 0.3) }}
    >
      <Card className="h-full flex flex-col overflow-hidden border-slate-200 bg-white hover:shadow-md transition-shadow">
        <div className={`h-1 ${s.bar}`} />
        <CardContent className="p-4 flex-1 flex flex-col">
          {/* Header */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 mb-0.5">
                <h3 className="text-sm font-semibold text-slate-900 truncate" title={crossing.name}>
                  {crossing.name || crossing.port_name}
                </h3>
                <span className="text-base leading-none">{isSouthbound ? '🇲🇽' : '🇺🇸'}</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-slate-500">
                <MapPin className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">
                  {isSouthbound
                    ? (language === 'en' ? 'To Mexico' : 'Hacia México')
                    : (language === 'en' ? 'To USA' : 'Hacia EE.UU.')}
                </span>
              </div>
            </div>
            <Badge variant="outline" className={`text-xs font-medium whitespace-nowrap ${s.badge}`}>
              {s.label[language] || s.label.en}
            </Badge>
          </div>

          {/* Wait time */}
          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-3xl font-bold text-slate-900 tabular-nums">
              {wait == null ? '—' : wait}
            </span>
            <span className="text-sm text-slate-500">
              {wait == null ? (language === 'en' ? 'no data' : 'sin datos') : 'min'}
            </span>
            {wait != null && (
              <TrendIcon className={`w-4 h-4 ${trendColor}`} />
            )}
          </div>
          <div className="flex items-center gap-1 text-[11px] text-slate-500 mb-3">
            <Clock className="w-3 h-3" />
            <span>
              {isSouthbound
                ? (language === 'en' ? 'Estimated border delay' : 'Demora estimada')
                : (language === 'en' ? 'Average wait time' : 'Tiempo promedio')}
            </span>
          </div>

          {/* Action buttons */}
          <div className="grid grid-cols-1 gap-2 mb-3">
            <Button
              variant={pref ? 'default' : 'outline'}
              size="sm"
              onClick={handleToggleNotify}
              className="gap-1.5 h-8 text-xs"
            >
              {pref ? <BellRing className="w-3.5 h-3.5" /> : <Bell className="w-3.5 h-3.5" />}
              {pref
                ? (language === 'en' ? `Alert ${pref.kind === 'below' ? '<' : '>'} ${pref.threshold}m` : `Alerta ${pref.kind === 'below' ? '<' : '>'} ${pref.threshold}m`)
                : (language === 'en' ? 'Notify Me' : 'Notificar')}
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowTrends((v) => !v)}
                className="gap-1.5 h-8 text-xs"
                disabled={history.length < 2}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                {language === 'en' ? 'Trends' : 'Tendencias'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowLanes((v) => !v)}
                className="gap-1.5 h-8 text-xs"
              >
                {showLanes ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                {isSouthbound
                  ? (language === 'en' ? 'Method' : 'Método')
                  : (language === 'en' ? 'Lanes' : 'Carriles')}
              </Button>
            </div>
          </div>

          {/* Notify inline form */}
          <AnimatePresence>
            {showNotify && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 mb-3">
                  <div className="text-[11px] text-slate-600 mb-2">
                    {perm === 'granted'
                      ? (language === 'en' ? 'Alert me when wait…' : 'Avísame cuando la espera…')
                      : perm === 'denied'
                        ? (language === 'en' ? 'Notifications blocked in browser settings' : 'Notificaciones bloqueadas en el navegador')
                        : (language === 'en' ? 'Allow notifications to enable' : 'Permite notificaciones para activar')}
                  </div>
                  {perm === 'granted' && (
                    <div className="grid grid-cols-2 gap-2">
                      <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => saveNotify('below', 30)}>
                        {language === 'en' ? '< 30 min' : '< 30 min'}
                      </Button>
                      <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => saveNotify('below', 15)}>
                        {language === 'en' ? '< 15 min' : '< 15 min'}
                      </Button>
                      <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => saveNotify('above', 60)}>
                        {language === 'en' ? '> 60 min' : '> 60 min'}
                      </Button>
                      <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setShowNotify(false)}>
                        {language === 'en' ? 'Cancel' : 'Cancelar'}
                      </Button>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Trends */}
          <AnimatePresence>
            {showTrends && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-slate-700">
                      {language === 'en' ? 'Recent history' : 'Historial reciente'}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {history.length} {language === 'en' ? 'samples' : 'muestras'}
                    </span>
                  </div>
                  <Sparkline points={history} width={220} height={44} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Lane details */}
          <AnimatePresence>
            {showLanes && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                {isSouthbound ? (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 mb-3 space-y-2 text-xs text-slate-700">
                    <div className="flex items-center justify-between">
                      <span>{language === 'en' ? 'Live drive segment' : 'Trayecto en vivo'}</span>
                      <span className="font-medium tabular-nums">
                        {crossing.southbound_live_route_minutes == null ? '—' : `${crossing.southbound_live_route_minutes}m`}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>{language === 'en' ? 'Free-flow baseline' : 'Línea base libre'}</span>
                      <span className="font-medium tabular-nums">
                        {crossing.southbound_free_flow_minutes == null ? '—' : `${crossing.southbound_free_flow_minutes}m`}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>{language === 'en' ? 'Estimated border delay' : 'Demora estimada'}</span>
                      <span className="font-medium tabular-nums">
                        {wait == null ? '—' : `${wait}m`}
                      </span>
                    </div>
                    <div className="pt-1 text-[11px] text-slate-500">
                      {crossing.southbound_route_origin && crossing.southbound_route_destination
                        ? `${crossing.southbound_route_origin} -> ${crossing.southbound_route_destination}`
                        : (crossing.southbound_methodology || (language === 'en' ? 'No route metadata yet.' : 'Sin metadata de ruta todavía.'))}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 mb-3 divide-y divide-slate-200">
                    <LaneRow icon={Car} label={{ en: 'Standard', es: 'Estándar' }} data={lanes.passenger_standard} language={language} />
                    <LaneRow icon={Car} label={{ en: 'Ready Lane', es: 'Ready Lane' }} data={lanes.passenger_ready} language={language} />
                    <LaneRow icon={Car} label={{ en: 'SENTRI', es: 'SENTRI' }} data={lanes.passenger_sentri} language={language} />
                    <LaneRow icon={User} label={{ en: 'Pedestrian', es: 'Peatones' }} data={lanes.pedestrian_standard} language={language} />
                    <LaneRow icon={Truck} label={{ en: 'Commercial', es: 'Comercial' }} data={lanes.commercial_standard} language={language} />
                    <LaneRow icon={Truck} label={{ en: 'FAST', es: 'FAST' }} data={lanes.commercial_fast} language={language} />
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Footer: live dot + updated + warning */}
          <div className="mt-auto pt-2 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100">
            <div className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${s.dot} animate-pulse`} />
              <span>{language === 'en' ? 'Live' : 'En vivo'}</span>
            </div>
            <span className="text-slate-400 truncate">{updatedAt}</span>
          </div>
          {isHigh && (
            <div className="mt-2 flex items-center gap-1.5 rounded-md bg-rose-50 px-2 py-1 text-[11px] text-rose-700">
              <AlertTriangle className="w-3 h-3 flex-shrink-0" />
              {language === 'en' ? 'High wait time' : 'Tiempo de espera alto'}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
