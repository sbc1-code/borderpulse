import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Clock, MapPin, TrendingUp, TrendingDown, Minus, AlertTriangle,
  Car, User, Truck, Bell, BellRing, Star, MoreHorizontal,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getPreviousWait } from '@/components/utils/waitTimeHistory';
import { getPrefForCrossing, setPref, permission, requestPermission } from '@/components/utils/notifyService';
import {
  getStatusForDirection,
  getUpdatedAtForDirection,
  getWaitMinutes,
} from '@/components/utils/crossingDirection';
import {
  getAdvisoryType,
  getHoursSummary,
  getOperationalNotice,
  getPortStatus,
  hasOperationalAdvisory,
} from '@/components/utils/crossingMeta';

const STATUS_STYLES = {
  good: { bar: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: { en: 'Good', es: 'Bueno' }, dot: 'bg-emerald-500' },
  moderate: { bar: 'bg-amber-500', badge: 'bg-amber-50 text-amber-700 border-amber-200', label: { en: 'Moderate', es: 'Moderado' }, dot: 'bg-amber-500' },
  heavy: { bar: 'bg-rose-500', badge: 'bg-rose-50 text-rose-700 border-rose-200', label: { en: 'Heavy', es: 'Pesado' }, dot: 'bg-rose-500' },
  unknown: { bar: 'bg-slate-300', badge: 'bg-slate-50 text-slate-600 border-slate-200', label: { en: 'No wait', es: 'Sin tiempo' }, dot: 'bg-slate-300' },
};

const PORT_STATUS_STYLES = {
  open: { badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: { en: 'Open now', es: 'Abierto ahora' } },
  closed: { badge: 'bg-rose-50 text-rose-700 border-rose-200', label: { en: 'Closed now', es: 'Cerrado ahora' } },
  unknown: { badge: 'bg-slate-50 text-slate-600 border-slate-200', label: { en: 'Status unavailable', es: 'Estado no disponible' } },
};

function summarizeNotice(text) {
  if (!text) return null;
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean) return null;
  const firstSentence = clean.split(/(?<=[.!?])\s+/)[0];
  if (firstSentence.length <= 160) return firstSentence;
  return `${firstSentence.slice(0, 157)}...`;
}

function formatUpdatedAt(value, language) {
  if (!value) return '';
  if (typeof value === 'string' && /T.*Z$/.test(value)) {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleTimeString(language === 'en' ? 'en-US' : 'es-MX', {
        hour: 'numeric',
        minute: '2-digit',
      });
    }
  }
  return String(value);
}

function advisoryLabel(type, language) {
  const labels = {
    closure: { en: 'Closure', es: 'Cierre' },
    construction: { en: 'Construction', es: 'Obras' },
    hours: { en: 'Hours notice', es: 'Aviso de horario' },
    lane: { en: 'Lane notice', es: 'Aviso de carriles' },
    notice: { en: 'Advisory', es: 'Aviso' },
  };
  const item = labels[type] || labels.notice;
  return item[language] || item.en;
}

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
  isFavorite = false,
  onToggleFavorite,
  slug,
}) {
  const [showLanes, setShowLanes] = useState(false);
  const [showNotify, setShowNotify] = useState(false);
  const [pref, setPrefState] = useState(() => getPrefForCrossing(crossing.port_number, selectedDirection));
  const [perm, setPerm] = useState(() => (typeof window !== 'undefined' ? permission() : 'default'));
  const [aggregate, setAggregate] = useState(null);

  const cardSlug = slug || crossing.slug || null;

  useEffect(() => {
    setPrefState(getPrefForCrossing(crossing.port_number, selectedDirection));
  }, [crossing.port_number, selectedDirection]);

  // Fetch the per-crossing historical aggregate to power the "vs. typical" line.
  useEffect(() => {
    if (!cardSlug) {
      setAggregate(null);
      return;
    }
    let cancelled = false;
    fetch(`/data/aggregates/${cardSlug}.json`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled) setAggregate(data);
      })
      .catch(() => {
        if (!cancelled) setAggregate(null);
      });
    return () => {
      cancelled = true;
    };
  }, [cardSlug]);

  const status = getStatusForDirection(crossing, selectedDirection);
  const s = STATUS_STYLES[status] || STATUS_STYLES.unknown;
  const wait = getWaitMinutes(crossing, selectedDirection);
  const isHigh = typeof wait === 'number' && wait >= 45;
  const updatedAt = getUpdatedAtForDirection(crossing, selectedDirection);
  const isSouthbound = selectedDirection === 'southbound';
  const portStatus = getPortStatus(crossing);
  const portStatusStyle = PORT_STATUS_STYLES[portStatus] || PORT_STATUS_STYLES.unknown;
  const sourceLabel = isSouthbound
    ? (language === 'en' ? 'Border Pulse estimate' : 'Estimación de Border Pulse')
    : (language === 'en' ? 'Official CBP' : 'CBP oficial');
  const waitMetaLabel = wait == null
    ? (language === 'en'
      ? (isSouthbound ? 'Estimate not available yet' : 'No current wait time reported')
      : (isSouthbound ? 'La estimación todavía no está disponible' : 'No hay tiempo actual reportado'))
    : (isSouthbound ? (language === 'en' ? 'Estimated delay' : 'Demora estimada') : (language === 'en' ? 'Official wait time' : 'Tiempo oficial'));
  const hoursLabel = getHoursSummary(crossing, language);
  const advisoryText = summarizeNotice(getOperationalNotice(crossing));
  const hasAdvisory = hasOperationalAdvisory(crossing);
  const advisoryType = getAdvisoryType(crossing);

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

  // "vs. typical" comparison vs. the historical median for this day-of-week + hour.
  // Only compute for northbound (CBP-backed) data; southbound waits are estimates
  // without a comparable aggregate in /data/aggregates.
  const typicalDelta = useMemo(() => {
    if (isSouthbound) return null;
    if (wait == null) return null;
    const byHour = aggregate?.by_hour;
    if (!Array.isArray(byHour) || byHour.length === 0) return null;
    const now = new Date();
    const day = now.getDay();
    const hour = now.getHours();
    const entry = byHour.find((h) => h.day === day && h.hour === hour);
    if (entry && typeof entry.median === 'number') {
      const samples = typeof entry.sample_count === 'number'
        ? entry.sample_count
        : (typeof entry.samples === 'number' ? entry.samples : 0);
      if (samples >= 1) return { delta: wait - entry.median, median: entry.median };
    }
    // Fallback: use the all-hours overall_median when this hour-bucket is empty
    // or single-sample. Aggregates have ~30 days of lookback so individual
    // (day, hour) buckets are sparse; the overall median is a stable reference.
    if (typeof aggregate?.overall_median === 'number') {
      return { delta: wait - aggregate.overall_median, median: aggregate.overall_median };
    }
    return null;
  }, [aggregate, wait, isSouthbound]);

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
        <CardContent className="p-3 flex-1 flex flex-col">
          {/* Header */}
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 mb-0.5">
                <h3 className="text-sm font-semibold text-slate-900 truncate" title={crossing.name}>
                  {cardSlug ? (
                    <Link to={`/crossing/${cardSlug}`} className="hover:underline">
                      {crossing.name || crossing.port_name}
                    </Link>
                  ) : (
                    crossing.name || crossing.port_name
                  )}
                </h3>
                <span className="text-base leading-none">{isSouthbound ? '🇲🇽' : '🇺🇸'}</span>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-slate-500">
                <MapPin className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">
                  {isSouthbound
                    ? (language === 'en' ? 'To Mexico' : 'Hacia México')
                    : (language === 'en' ? 'To USA' : 'Hacia EE.UU.')}
                </span>
              </div>
              <div className="flex flex-wrap gap-1 mt-1.5">
                <Badge variant="outline" className={`text-[10px] font-medium whitespace-nowrap py-0 ${portStatusStyle.badge}`}>
                  {portStatusStyle.label[language] || portStatusStyle.label.en}
                </Badge>
                <Badge variant="outline" className="text-[10px] font-medium whitespace-nowrap py-0 bg-slate-50 text-slate-700 border-slate-200">
                  {sourceLabel}
                </Badge>
                {hasAdvisory && (
                  <Badge variant="outline" className="text-[10px] font-medium whitespace-nowrap py-0 bg-amber-50 text-amber-700 border-amber-200">
                    {advisoryLabel(advisoryType, language)}
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <Badge variant="outline" className={`text-[11px] font-medium whitespace-nowrap py-0 ${s.badge}`}>
                {s.label[language] || s.label.en}
              </Badge>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFavorite?.(crossing.port_number);
                }}
                aria-label={isFavorite
                  ? (language === 'en' ? 'Remove from favorites' : 'Quitar de favoritos')
                  : (language === 'en' ? 'Add to favorites' : 'Agregar a favoritos')}
                className="p-1 rounded-md hover:bg-slate-100 transition-colors"
              >
                <Star
                  className={`w-4 h-4 transition-colors ${
                    isFavorite
                      ? 'fill-amber-400 text-amber-400'
                      : 'text-slate-300 hover:text-slate-400'
                  }`}
                />
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    aria-label={language === 'en' ? 'More options' : 'Más opciones'}
                    className="p-1 rounded-md hover:bg-slate-100 transition-colors"
                  >
                    <MoreHorizontal className="w-4 h-4 text-slate-400" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  {cardSlug ? (
                    <DropdownMenuItem asChild>
                      <Link to={`/crossing/${cardSlug}`} className="cursor-pointer">
                        {language === 'en' ? 'View trends' : 'Ver tendencias'}
                      </Link>
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem disabled>
                      {language === 'en' ? 'View trends' : 'Ver tendencias'}
                    </DropdownMenuItem>
                  )}
                  {cardSlug && (
                    <DropdownMenuItem asChild>
                      <Link to={`/best-time/${cardSlug}`} className="cursor-pointer">
                        {language === 'en' ? 'Best time to cross' : 'Mejor hora para cruzar'}
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onSelect={() => setShowLanes((v) => !v)}>
                    {showLanes
                      ? (language === 'en' ? 'Hide lanes' : 'Ocultar carriles')
                      : (isSouthbound
                        ? (language === 'en' ? 'Show method' : 'Ver método')
                        : (language === 'en' ? 'Show lanes' : 'Ver carriles'))}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Wait time */}
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 tabular-nums leading-none">
              {wait == null ? '—' : wait}
            </span>
            <span className="text-xs text-slate-500">
              {wait == null
                ? (language === 'en'
                  ? (isSouthbound ? 'no estimate' : 'not reported')
                  : (isSouthbound ? 'sin estimación' : 'sin reporte'))
                : 'min'}
            </span>
            {wait != null && (
              <TrendIcon className={`w-3.5 h-3.5 ${trendColor}`} />
            )}
          </div>

          {/* "vs. typical" comparison line */}
          {typicalDelta && (
            <div className="mt-1 text-[11px] tabular-nums">
              {typicalDelta.delta > 15 && (
                <span className="text-rose-600 font-medium">
                  {language === 'en'
                    ? `+${typicalDelta.delta} min vs. typical`
                    : `+${typicalDelta.delta} min vs. lo normal`}
                </span>
              )}
              {typicalDelta.delta < -15 && (
                <span className="text-emerald-600 font-medium">
                  {language === 'en'
                    ? `−${Math.abs(typicalDelta.delta)} min vs. typical`
                    : `−${Math.abs(typicalDelta.delta)} min vs. lo normal`}
                </span>
              )}
              {typicalDelta.delta >= -15 && typicalDelta.delta <= 15 && (
                <span className="text-slate-500">
                  {language === 'en' ? '≈ typical' : '≈ normal'}
                </span>
              )}
            </div>
          )}

          <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-1.5">
            <Clock className="w-3 h-3" />
            <span className="truncate">{waitMetaLabel}</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5 truncate">{hoursLabel}</div>
          {advisoryText && (
            <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5 text-[11px] text-amber-900">
              <span className="font-medium">{language === 'en' ? 'Advisory:' : 'Aviso:'}</span>{' '}
              {advisoryText}
            </div>
          )}

          {/* Primary CTA: Notify Me only */}
          <div className="mt-2.5">
            <Button
              variant={pref ? 'default' : 'outline'}
              size="sm"
              onClick={handleToggleNotify}
              className="w-full gap-1.5 h-8 text-xs"
            >
              {pref ? <BellRing className="w-3.5 h-3.5" /> : <Bell className="w-3.5 h-3.5" />}
              {pref
                ? (language === 'en' ? `Alert ${pref.kind === 'below' ? '<' : '>'} ${pref.threshold}m` : `Alerta ${pref.kind === 'below' ? '<' : '>'} ${pref.threshold}m`)
                : (language === 'en' ? 'Notify Me' : 'Notificar')}
            </Button>
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
                <div className="mt-2 rounded-md border border-slate-200 bg-slate-50 p-2.5">
                  <div className="text-[11px] text-slate-600 mb-1.5">
                    {perm === 'granted'
                      ? (language === 'en' ? 'Alert me when wait…' : 'Avísame cuando la espera…')
                      : perm === 'denied'
                        ? (language === 'en' ? 'Notifications blocked in browser settings' : 'Notificaciones bloqueadas en el navegador')
                        : (language === 'en' ? 'Allow notifications to enable' : 'Permite notificaciones para activar')}
                  </div>
                  {perm === 'granted' && (
                    <div className="grid grid-cols-2 gap-1.5">
                      <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => saveNotify('below', 30)}>
                        {language === 'en' ? '< 30 min' : '< 30 min'}
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => saveNotify('below', 15)}>
                        {language === 'en' ? '< 15 min' : '< 15 min'}
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => saveNotify('above', 60)}>
                        {language === 'en' ? '> 60 min' : '> 60 min'}
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => setShowNotify(false)}>
                        {language === 'en' ? 'Cancel' : 'Cancelar'}
                      </Button>
                    </div>
                  )}
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
                  <div className="mt-2 rounded-md border border-slate-200 bg-slate-50 p-2.5 space-y-1.5 text-xs text-slate-700">
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
                  <div className="mt-2 rounded-md border border-slate-200 bg-slate-50 p-2.5 divide-y divide-slate-200">
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
          <div className="mt-auto pt-1.5 flex items-center justify-between text-[10px] text-slate-500 border-t border-slate-100 mt-2">
            <div className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${s.dot} animate-pulse`} />
              <span>{language === 'en' ? 'Live' : 'En vivo'}</span>
            </div>
            <span className="text-slate-400 truncate">{formatUpdatedAt(updatedAt, language)}</span>
          </div>
          {isHigh && (
            <div className="mt-1.5 flex items-center gap-1.5 rounded-md bg-rose-50 px-2 py-0.5 text-[10px] text-rose-700">
              <AlertTriangle className="w-3 h-3 flex-shrink-0" />
              {language === 'en' ? 'High wait time' : 'Tiempo de espera alto'}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
