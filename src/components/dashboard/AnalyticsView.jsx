import React, { useMemo } from 'react';
import { Activity, AlertTriangle, Database, TrendingDown, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { getAllHistory } from '@/components/utils/waitTimeHistory';
import { getStorageKey } from '@/components/utils/crossingDirection';

// Auto-derived volume proxy: sum of CBP-published lanes_open across all lane
// types in the current snapshot. San Ysidro is ~42 lanes, Andrade ~3, etc. —
// tracks BTS port-volume rankings closely. CBP republishes lane counts every
// 15 min so the weight stays current with no manual table to maintain.
function portWeight(crossing) {
  const L = crossing?.lanes || {};
  let total = 0;
  for (const key in L) {
    const lane = L[key];
    if (lane && typeof lane.lanes_open === 'number') total += lane.lanes_open;
  }
  return total;
}

// Weighted median: walk sample-weight pairs sorted by value, return the value
// where cumulative weight first crosses half the total weight. Median (not
// mean) matches the rest of the codebase — a 240-min outlier won't drag the
// signal the way it does with a weighted mean.
function weightedMedian(pairs) {
  if (!pairs.length) return null;
  const sorted = [...pairs].sort((a, b) => a.v - b.v);
  const totalW = sorted.reduce((s, p) => s + p.w, 0);
  if (totalW <= 0) return null;
  const target = totalW / 2;
  let cum = 0;
  for (const p of sorted) {
    cum += p.w;
    if (cum >= target) return p.v;
  }
  return sorted[sorted.length - 1].v;
}

const WAIT_COLORS = {
  good: '#10b981',
  moderate: '#f59e0b',
  heavy: '#f43f5e',
  empty: '#cbd5e1',
};

function waitTier(wait) {
  if (wait == null) return 'empty';
  if (wait < 15) return 'good';
  if (wait < 45) return 'moderate';
  return 'heavy';
}

function formatHour(hour, language) {
  if (hour == null) return '';
  const suffix = hour >= 12 ? (language === 'en' ? 'p' : 'p') : (language === 'en' ? 'a' : 'a');
  return `${hour % 12 || 12}${suffix}`;
}

function formatWait(wait) {
  if (wait == null) return '—';
  return `${wait} min`;
}

function summaryLabel(tier, language) {
  const labels = {
    good: { en: 'Mostly quick', es: 'Mayormente rápido' },
    moderate: { en: 'Normal friction', es: 'Fricción normal' },
    heavy: { en: 'Heavy pattern', es: 'Patrón pesado' },
    empty: { en: 'Not enough data', es: 'Faltan datos' },
  };
  return labels[tier]?.[language] || labels.empty.en;
}

function MetricTile({ icon: Icon, label, value, detail, tone = 'slate' }) {
  const toneClass = {
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-200 dark:border-emerald-900',
    amber: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-200 dark:border-amber-900',
    rose: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-200 dark:border-rose-900',
    slate: 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-200 dark:border-slate-700',
  }[tone];

  return (
    <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 sm:text-[11px]">
              {label}
            </div>
            <div className="mt-1 truncate text-lg font-bold leading-tight text-slate-950 tabular-nums dark:text-white sm:text-2xl">
              {value}
            </div>
          </div>
          <span className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border sm:h-9 sm:w-9 ${toneClass}`}>
            <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </span>
        </div>
        {detail && (
          <div className="mt-1.5 truncate text-[11px] text-slate-500 dark:text-slate-400 sm:mt-2" title={detail}>
            {detail}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DistributionStrip({ counts, total, language }) {
  const denominator = Math.max(total, 1);
  const goodPct = (counts.good / denominator) * 100;
  const moderatePct = (counts.moderate / denominator) * 100;
  const heavyPct = (counts.heavy / denominator) * 100;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {language === 'en' ? 'Wait mix' : 'Mezcla de esperas'}
        </div>
        <div className="text-[11px] text-slate-500 dark:text-slate-400">
          {total} {language === 'en'
            ? (total === 1 ? 'sampled hour' : 'sampled hours')
            : (total === 1 ? 'hora muestreada' : 'horas muestreadas')}
        </div>
      </div>
      <div className="flex h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-900">
        <div className="bg-emerald-500" style={{ width: `${goodPct}%` }} />
        <div className="bg-amber-500" style={{ width: `${moderatePct}%` }} />
        <div className="bg-rose-500" style={{ width: `${heavyPct}%` }} />
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2 text-[11px] text-slate-500 dark:text-slate-400">
        <span><span className="font-semibold text-emerald-600">{counts.good}</span> {language === 'en' ? 'quick' : 'rápidas'}</span>
        <span><span className="font-semibold text-amber-600">{counts.moderate}</span> {language === 'en' ? 'typical' : 'normales'}</span>
        <span><span className="font-semibold text-rose-600">{counts.heavy}</span> {language === 'en' ? 'heavy' : 'pesadas'}</span>
      </div>
    </div>
  );
}

function WaitTooltip({ active, payload, label, language, mode }) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload;
  const wait = point?.avg;
  const title = mode === 'day'
    ? label
    : formatHour(point?.hour, language);
  const tier = waitTier(wait);
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg dark:border-slate-700 dark:bg-slate-950">
      <div className="font-semibold text-slate-900 dark:text-white">{title}</div>
      <div className="mt-1 flex items-center gap-2 text-slate-600 dark:text-slate-300">
        <span className="h-2 w-2 rounded-full" style={{ background: WAIT_COLORS[tier] }} />
        <span>{formatWait(wait, language)}</span>
      </div>
      {point?.n != null && (
        <div className="mt-1 text-[11px] text-slate-400">
          {point.n} {language === 'en' ? 'samples' : 'muestras'}
        </div>
      )}
    </div>
  );
}

function ChartLegend({ language }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400">
      <span className="inline-flex items-center gap-1">
        <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" />
        {language === 'en' ? '<15m quick' : '<15m rápido'}
      </span>
      <span className="inline-flex items-center gap-1">
        <span className="h-2.5 w-2.5 rounded-sm bg-amber-500" />
        {language === 'en' ? '15-44m typical' : '15-44m normal'}
      </span>
      <span className="inline-flex items-center gap-1">
        <span className="h-2.5 w-2.5 rounded-sm bg-rose-500" />
        {language === 'en' ? '45m+ heavy' : '45m+ pesado'}
      </span>
    </div>
  );
}

function crossingName(c) {
  return c?.name || c?.port_name || c?.crossing_name || (c?.port_number ? `Port ${c.port_number}` : 'Unknown crossing');
}

export default function AnalyticsView({ crossings, language, direction = 'northbound' }) {
  // Map storage key -> port weight from current CBP snapshot. Re-derived on
  // each crossings update; ports absent from the current feed are skipped
  // rather than down-weighted to 1, since that would re-introduce the
  // 43-equal-port flattening bug we're fixing here.
  const portWeights = useMemo(() => {
    const out = {};
    for (const c of crossings || []) {
      const id = getStorageKey(c.port_number || c.id, direction);
      if (!id) continue;
      const w = portWeight(c);
      if (w > 0) out[id] = w;
    }
    return out;
  }, [crossings, direction]);

  // Storage key -> display name for the crossing. Used to name the specific
  // crossing behind Peak/Lightest hour, since border-wide aggregates hide that
  // patterns are crossing-specific (San Ysidro 9a ≠ Laredo 9a).
  const keyToName = useMemo(() => {
    const m = new Map();
    for (const c of crossings || []) {
      const id = getStorageKey(c.port_number || c.id, direction);
      if (id) m.set(id, crossingName(c));
    }
    return m;
  }, [crossings, direction]);

  const byHour = useMemo(() => {
    const all = getAllHistory(direction);
    const buckets = Array.from({ length: 24 }, (_, h) => ({ hour: h, pairs: [], n: 0 }));
    for (const id in all) {
      const w = portWeights[id];
      if (!w) continue;
      for (const sample of all[id]) {
        const h = new Date(sample.t).getHours();
        buckets[h].pairs.push({ v: sample.wait, w });
        buckets[h].n += 1;
      }
    }
    return buckets.map((b) => ({
      hour: b.hour,
      hourLabel: formatHour(b.hour, language),
      avg: weightedMedian(b.pairs),
      n: b.n,
    }));
  }, [direction, language, portWeights]);

  const byDow = useMemo(() => {
    const all = getAllHistory(direction);
    const names = language === 'en'
      ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
      : ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const buckets = Array.from({ length: 7 }, () => ({ pairs: [], n: 0 }));
    for (const id in all) {
      const w = portWeights[id];
      if (!w) continue;
      for (const sample of all[id]) {
        const d = new Date(sample.t).getDay();
        buckets[d].pairs.push({ v: sample.wait, w });
        buckets[d].n += 1;
      }
    }
    return buckets.map((b, i) => ({
      day: names[i],
      avg: weightedMedian(b.pairs),
      n: b.n,
    }));
  }, [direction, language, portWeights]);

  // Crossing-grain pool: collapse hours, just rank crossings against each
  // other by median wait. "Busiest/Quietest crossing" is a location question
  // and gets a location answer. The time question ("peak hour at X") lives
  // on the individual crossing page where there's one crossing in scope.
  const crossingPoints = useMemo(() => {
    const all = getAllHistory(direction);
    const buckets = new Map();
    for (const id in all) {
      if (!keyToName.has(id)) continue;
      for (const sample of all[id]) {
        if (typeof sample?.wait !== 'number' || !sample.t) continue;
        let b = buckets.get(id);
        if (!b) {
          b = { storageKey: id, crossingName: keyToName.get(id), pairs: [], n: 0 };
          buckets.set(id, b);
        }
        // All samples within one crossing share the same port weight, so
        // weightedMedian here is just median. Keep the weighted shape for
        // consistency with the rest of the file.
        b.pairs.push({ v: sample.wait, w: 1 });
        b.n += 1;
      }
    }
    // Require >=3 samples so a single drive-by reading can't crown a port.
    return Array.from(buckets.values())
      .filter((b) => b.n >= 3)
      .map((b) => ({
        storageKey: b.storageKey,
        crossingName: b.crossingName,
        avg: weightedMedian(b.pairs),
        n: b.n,
      }))
      .filter((p) => p.avg != null);
  }, [direction, keyToName]);

  const summary = useMemo(() => {
    const populatedHours = byHour.filter((b) => b.avg != null);
    const populatedDays = byDow.filter((b) => b.avg != null);
    const totalSamples = populatedHours.reduce((sum, b) => sum + b.n, 0);

    // Overall median across all hour-bucket medians, weighted by raw sample
    // count per bucket. Keeps the headline consistent with the per-tile math.
    const overallPairs = populatedHours.map((b) => ({ v: b.avg, w: b.n }));
    const avg = weightedMedian(overallPairs);

    // Busiest/Quietest are crossing-grain (collapse hours, rank ports against
    // each other). Hour-of-day analytics live on the per-crossing page where
    // there's one crossing in scope, not here.
    const busiestCrossing = crossingPoints.length
      ? crossingPoints.reduce((max, item) => (item.avg > max.avg ? item : max), crossingPoints[0])
      : null;
    const quietestCrossing = crossingPoints.length
      ? crossingPoints.reduce((min, item) => (item.avg < min.avg ? item : min), crossingPoints[0])
      : null;
    const heaviestDay = populatedDays.length
      ? populatedDays.reduce((max, item) => (item.avg > max.avg ? item : max), populatedDays[0])
      : null;
    const counts = populatedHours.reduce((acc, item) => {
      acc[waitTier(item.avg)] += 1;
      return acc;
    }, { good: 0, moderate: 0, heavy: 0 });

    // If only one crossing qualified, busiest === quietest. Suppress both
    // rather than show the same crossing in both tiles (the noise case the
    // first iteration of this fix shipped with).
    const distinct = busiestCrossing && quietestCrossing
      && busiestCrossing.storageKey !== quietestCrossing.storageKey;

    return {
      avg,
      busiestCrossing: distinct ? busiestCrossing : null,
      quietestCrossing: distinct ? quietestCrossing : null,
      heaviestDay,
      totalSamples,
      populatedHourCount: populatedHours.length,
      counts,
      tier: waitTier(avg),
    };
  }, [byHour, byDow, crossingPoints]);

  const trackedCount = useMemo(() => {
    const all = getAllHistory(direction);
    return Object.keys(all).length || crossings?.length || 0;
  }, [crossings?.length, direction]);

  if (summary.totalSamples < 10) {
    return (
      <Card className="border-dashed border-slate-300 bg-white/80 dark:border-slate-700 dark:bg-slate-950/80">
        <CardContent className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
          <Database className="mx-auto mb-3 h-7 w-7 text-slate-300" />
          {language === 'en'
            ? 'Analytics populate as you use the app. Check back after a few visits.'
            : 'Los análisis se llenan conforme uses la app. Vuelve después de varias visitas.'}
          <div className="mt-2 text-[11px] text-slate-400">
            {language === 'en' ? 'Samples collected' : 'Muestras recolectadas'}: {summary.totalSamples}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="grid gap-0 lg:grid-cols-[0.95fr,2fr]">
          <div className="border-b border-slate-200 bg-slate-950 p-3 text-white sm:p-4 lg:border-b-0 lg:border-r lg:border-slate-800">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/10 px-2 py-0.5 text-[11px] font-semibold">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: WAIT_COLORS[summary.tier] }} />
              {summaryLabel(summary.tier, language)}
            </div>
            <div className="mt-2.5 flex items-end justify-between gap-3 sm:mt-3 sm:block">
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-wide text-slate-400">
                  {language === 'en' ? 'Recent average' : 'Promedio reciente'}
                </p>
                <p className="mt-0.5 text-3xl font-bold leading-none tabular-nums sm:text-4xl">
                  {formatWait(summary.avg, language)}
                </p>
              </div>
              <p className="shrink-0 text-right text-[11px] leading-tight text-slate-400 sm:mt-2 sm:text-left">
                {direction === 'southbound'
                  ? (language === 'en' ? 'Southbound estimates' : 'Estimaciones hacia México')
                  : (language === 'en' ? 'CBP wait samples' : 'Muestras CBP')}
                <span className="hidden sm:inline">
                  {' '}
                  {language === 'en' ? 'saved on this device' : 'guardadas en este dispositivo'}
                </span>
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2.5 p-3 sm:gap-3 sm:p-4 xl:grid-cols-4">
            <MetricTile
              icon={TrendingUp}
              label={language === 'en' ? 'Busiest crossing' : 'Cruce más pesado'}
              value={summary.busiestCrossing ? summary.busiestCrossing.crossingName : '—'}
              detail={summary.busiestCrossing
                ? `${formatWait(summary.busiestCrossing.avg, language)} · ${summary.busiestCrossing.n} ${language === 'en' ? 'samples' : 'muestras'}`
                : null}
              tone={summary.busiestCrossing?.avg >= 45 ? 'rose' : 'amber'}
            />
            <MetricTile
              icon={TrendingDown}
              label={language === 'en' ? 'Quietest crossing' : 'Cruce más ligero'}
              value={summary.quietestCrossing ? summary.quietestCrossing.crossingName : '—'}
              detail={summary.quietestCrossing
                ? `${formatWait(summary.quietestCrossing.avg, language)} · ${summary.quietestCrossing.n} ${language === 'en' ? 'samples' : 'muestras'}`
                : null}
              tone="emerald"
            />
            <MetricTile
              icon={AlertTriangle}
              label={language === 'en' ? 'Heaviest day' : 'Día más pesado'}
              value={summary.heaviestDay?.day || '—'}
              detail={summary.heaviestDay ? formatWait(summary.heaviestDay.avg, language) : null}
              tone={summary.heaviestDay?.avg >= 45 ? 'rose' : 'amber'}
            />
            <MetricTile
              icon={Database}
              label={language === 'en' ? 'Samples' : 'Muestras'}
              value={summary.totalSamples}
              detail={`${trackedCount} ${language === 'en' ? 'crossings tracked' : 'cruces monitoreados'}`}
              tone="slate"
            />
          </div>
        </div>
      </section>

      <DistributionStrip counts={summary.counts} total={summary.populatedHourCount} language={language} />

      <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <CardHeader className="space-y-2 pb-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-sm text-slate-950 dark:text-white">
              {language === 'en' ? 'Average wait by hour' : 'Espera promedio por hora'}
            </CardTitle>
            <ChartLegend language={language} />
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byHour} margin={{ top: 10, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis
                  dataKey="hour"
                  interval={2}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickFormatter={(hour) => formatHour(hour, language)}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value) => `${value}m`}
                />
                <ReferenceLine y={45} stroke="#f43f5e" strokeDasharray="4 4" strokeOpacity={0.5} />
                <Tooltip content={<WaitTooltip language={language} mode="hour" />} />
                <Bar dataKey="avg" radius={[5, 5, 0, 0]} minPointSize={2}>
                  {byHour.map((entry) => (
                    <Cell key={`hour-${entry.hour}`} fill={WAIT_COLORS[waitTier(entry.avg)]} opacity={entry.avg == null ? 0.25 : 1} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm text-slate-950 dark:text-white">
            <Activity className="h-4 w-4 text-slate-500" />
            {language === 'en' ? 'Average wait by day' : 'Espera promedio por día'}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byDow} margin={{ top: 10, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value) => `${value}m`}
                />
                <ReferenceLine y={45} stroke="#f43f5e" strokeDasharray="4 4" strokeOpacity={0.5} />
                <Tooltip content={<WaitTooltip language={language} mode="day" />} />
                <Bar dataKey="avg" radius={[5, 5, 0, 0]} minPointSize={2}>
                  {byDow.map((entry) => (
                    <Cell key={`dow-${entry.day}`} fill={WAIT_COLORS[waitTier(entry.avg)]} opacity={entry.avg == null ? 0.25 : 1} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
