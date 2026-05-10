import React, { useMemo } from 'react';
import { Activity, AlertTriangle, Clock, MapPin, TrendingDown } from 'lucide-react';
import { motion } from 'framer-motion';
import { getWaitMinutes } from '@/components/utils/crossingDirection';

function formatWait(wait, language) {
  if (wait == null) return '—';
  return language === 'en' ? `${wait} min` : `${wait} min`;
}

function getWaitTier(wait) {
  if (wait == null) return 'unknown';
  if (wait < 15) return 'good';
  if (wait < 45) return 'moderate';
  return 'heavy';
}

const TIER_META = {
  good: {
    label: { en: 'Moving well', es: 'Fluye bien' },
    chip: 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-900',
    bar: 'bg-emerald-500',
  },
  moderate: {
    label: { en: 'Typical delay', es: 'Demora normal' },
    chip: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-900',
    bar: 'bg-amber-500',
  },
  heavy: {
    label: { en: 'Heavy right now', es: 'Pesado ahora' },
    chip: 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-200 dark:border-rose-900',
    bar: 'bg-rose-500',
  },
  unknown: {
    label: { en: 'Sparse reports', es: 'Pocos reportes' },
    chip: 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-200 dark:border-slate-700',
    bar: 'bg-slate-300',
  },
};

function SnapshotMetric({ icon: Icon, label, value, detail, tone = 'slate' }) {
  const toneClass = {
    emerald: 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900',
    amber: 'text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-200 dark:bg-amber-950/30 dark:border-amber-900',
    rose: 'text-rose-700 bg-rose-50 border-rose-200 dark:text-rose-200 dark:bg-rose-950/30 dark:border-rose-900',
    slate: 'text-slate-700 bg-slate-50 border-slate-200 dark:text-slate-200 dark:bg-slate-900/70 dark:border-slate-700',
  }[tone];

  return (
    <div className="min-w-0 border-l border-slate-200 pl-2.5 first:border-l-0 first:pl-0 dark:border-slate-800 sm:pl-3">
      <div className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400 sm:gap-1.5 sm:text-[11px]">
        <span className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-md border sm:h-5 sm:w-5 ${toneClass}`}>
          <Icon className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
        </span>
        <span className="truncate">{label}</span>
      </div>
      <div className="mt-0.5 truncate text-base font-bold leading-tight text-slate-950 tabular-nums dark:text-white sm:mt-1 sm:text-lg">
        {value}
      </div>
      {detail && (
        <div className="mt-0.5 truncate text-[10px] text-slate-500 dark:text-slate-400 sm:text-[11px]" title={detail}>
          {detail}
        </div>
      )}
    </div>
  );
}

export default function CommuterSnapshot({
  crossings,
  selectedDirection = 'northbound',
  language = 'en',
  regionLabel,
}) {
  const stats = useMemo(() => {
    const rows = (crossings || []).map((crossing) => ({
      crossing,
      wait: getWaitMinutes(crossing, selectedDirection),
    }));
    const reporting = rows.filter((row) => row.wait != null);
    const total = rows.length;

    if (!reporting.length) {
      return {
        total,
        reportingCount: 0,
        avg: null,
        fastest: null,
        slowest: null,
        counts: { good: 0, moderate: 0, heavy: 0 },
        overallTier: 'unknown',
      };
    }

    const sorted = [...reporting].sort((a, b) => a.wait - b.wait);
    const avg = Math.round(reporting.reduce((sum, row) => sum + row.wait, 0) / reporting.length);
    const counts = reporting.reduce((acc, row) => {
      acc[getWaitTier(row.wait)] += 1;
      return acc;
    }, { good: 0, moderate: 0, heavy: 0 });

    return {
      total,
      reportingCount: reporting.length,
      avg,
      fastest: sorted[0],
      slowest: sorted[sorted.length - 1],
      counts,
      overallTier: getWaitTier(avg),
    };
  }, [crossings, selectedDirection]);

  const tier = TIER_META[stats.overallTier] || TIER_META.unknown;
  const scopeLabel = regionLabel && !['All', 'Todos'].includes(regionLabel)
    ? regionLabel
    : (language === 'en' ? 'all crossings' : 'todos los cruces');
  const directionLabel = selectedDirection === 'southbound'
    ? (language === 'en' ? 'to Mexico' : 'hacia México')
    : (language === 'en' ? 'to the U.S.' : 'hacia EE.UU.');

  const totalReporting = Math.max(stats.reportingCount, 1);
  const goodPct = (stats.counts.good / totalReporting) * 100;
  const moderatePct = (stats.counts.moderate / totalReporting) * 100;
  const heavyPct = (stats.counts.heavy / totalReporting) * 100;

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-4 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950"
      aria-label={language === 'en' ? 'Commuter snapshot' : 'Resumen para commuters'}
    >
      <div className="grid gap-0 lg:grid-cols-[1.1fr,2fr]">
        <div className="border-b border-slate-200 bg-slate-950 p-3 text-white sm:p-4 lg:border-b-0 lg:border-r lg:border-slate-800">
          <div className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${tier.chip}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${tier.bar}`} />
            {tier.label[language] || tier.label.en}
          </div>
          <div className="mt-2.5 flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-wide text-slate-400">
                {language === 'en' ? 'Right now' : 'Ahora'}
              </p>
              <p className="mt-0.5 text-3xl font-bold leading-none tabular-nums sm:text-4xl">
                {formatWait(stats.avg, language)}
              </p>
            </div>
            <div className="shrink-0 text-right text-[11px] leading-tight text-slate-400">
              <p className="truncate">{scopeLabel}</p>
              <p>{directionLabel}</p>
            </div>
          </div>
          <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-slate-800">
            <div className="bg-emerald-500" style={{ width: `${goodPct}%` }} />
            <div className="bg-amber-500" style={{ width: `${moderatePct}%` }} />
            <div className="bg-rose-500" style={{ width: `${heavyPct}%` }} />
          </div>
          <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400">
            <span>{stats.reportingCount}/{stats.total} {language === 'en' ? 'reporting' : 'reportando'}</span>
            <span>{stats.counts.good} / {stats.counts.moderate} / {stats.counts.heavy}</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 p-3 sm:gap-3 sm:p-4">
          <SnapshotMetric
            icon={AlertTriangle}
            label={language === 'en' ? 'Longest wait' : 'Mayor espera'}
            value={formatWait(stats.slowest?.wait, language)}
            detail={stats.slowest?.crossing?.name || (language === 'en' ? 'No current report' : 'Sin reporte actual')}
            tone={stats.slowest?.wait >= 45 ? 'rose' : stats.slowest?.wait >= 15 ? 'amber' : 'slate'}
          />
          <SnapshotMetric
            icon={TrendingDown}
            label={language === 'en' ? 'Quickest option' : 'Opción más rápida'}
            value={formatWait(stats.fastest?.wait, language)}
            detail={stats.fastest?.crossing?.name || (language === 'en' ? 'No current report' : 'Sin reporte actual')}
            tone="emerald"
          />
          <SnapshotMetric
            icon={Clock}
            label={language === 'en' ? 'Heavy crossings' : 'Cruces pesados'}
            value={`${stats.counts.heavy}`}
            detail={language === 'en'
              ? `${stats.counts.moderate} typical, ${stats.counts.good} quick`
              : `${stats.counts.moderate} normales, ${stats.counts.good} rápidos`}
            tone={stats.counts.heavy ? 'rose' : 'emerald'}
          />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-slate-200 bg-slate-50 px-4 py-2 text-[11px] text-slate-500 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
        <span className="inline-flex items-center gap-1">
          <Activity className="h-3 w-3 text-emerald-500" />
          {language === 'en' ? 'Quick under 15m' : 'Rápido bajo 15m'}
        </span>
        <span className="inline-flex items-center gap-1">
          <MapPin className="h-3 w-3 text-amber-500" />
          {language === 'en' ? 'Typical 15-44m' : 'Normal 15-44m'}
        </span>
        <span className="inline-flex items-center gap-1">
          <AlertTriangle className="h-3 w-3 text-rose-500" />
          {language === 'en' ? 'Heavy 45m+' : 'Pesado 45m+'}
        </span>
      </div>
    </motion.section>
  );
}
