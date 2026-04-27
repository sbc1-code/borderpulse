import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Clock, MapPin, Activity, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import { getWaitMinutes } from '@/components/utils/crossingDirection';
import { getPortStatus, hasOperationalAdvisory } from '@/components/utils/crossingMeta';

// Status thresholds ALIGNED with scripts/fetch-cbp.mjs → statusFromDelay():
//   good    < 15 min
//   moderate 15..44
//   heavy   >= 45
// Null wait = CBP has no current report (closed lane, offline port). These
// are NOT counted as "0 min" — they're excluded from math and shown as the
// denominator-only contribution under "Open".
export default function StatsOverview({
  crossings,
  selectedDirection = 'northbound',
  language,
  theme,
  regionLabel,
  layout = 'grid', // 'grid' (4-col), 'strip' (single horizontal row), 'sidebar' (vertical stack)
}) {
  const reportingWaits = crossings
    .map((crossing) => getWaitMinutes(crossing, selectedDirection))
    .filter((t) => t !== null);
  const totalCrossings = crossings.length;
  const reportingCount = reportingWaits.length;
  const openCount = crossings.filter((crossing) => getPortStatus(crossing) === 'open').length;
  const advisoryCount = crossings.filter((crossing) => hasOperationalAdvisory(crossing)).length;

  const averageWaitTime = reportingCount
    ? Math.round(reportingWaits.reduce((sum, t) => sum + t, 0) / reportingCount)
    : null;

  const regionSuffix = regionLabel && regionLabel !== 'All' && regionLabel !== 'Todos'
    ? ` · ${regionLabel}`
    : '';

  const stats = [
    {
      icon: MapPin,
      label: (language === 'en' ? 'Wait times available' : 'Tiempos disponibles') + regionSuffix,
      value: totalCrossings === 0
        ? '—'
        : `${reportingCount}/${totalCrossings}`,
      color: 'text-blue-600',
      bg: 'bg-blue-100 dark:bg-blue-950/40',
      hint: language === 'en' ? 'current waits / total crossings' : 'tiempos actuales / cruces totales',
    },
    {
      icon: Clock,
      label: language === 'en' ? 'Open now' : 'Abiertos ahora',
      value: totalCrossings === 0 ? '—' : `${openCount}/${totalCrossings}`,
      color: 'text-indigo-600',
      bg: 'bg-indigo-100 dark:bg-indigo-950/40',
      hint: language === 'en' ? 'official port status' : 'estado oficial del puerto',
    },
    {
      icon: Activity,
      label: language === 'en' ? 'Average wait' : 'Espera promedio',
      value: averageWaitTime == null ? '—' : `${averageWaitTime} min`,
      color: 'text-emerald-600',
      bg: 'bg-emerald-100 dark:bg-emerald-950/40',
      hint: language === 'en' ? 'crossings with current waits' : 'cruces con tiempos actuales',
    },
    {
      icon: AlertTriangle,
      label: language === 'en' ? 'Advisories' : 'Avisos',
      value: totalCrossings === 0 ? '—' : advisoryCount,
      color: 'text-rose-600',
      bg: 'bg-rose-100 dark:bg-rose-950/40',
      hint: language === 'en' ? 'closures, notices, limits' : 'cierres, avisos, límites',
    },
  ];

  // Compact horizontal strip — placed AFTER the wait list begins. Single row, no Card wrapper.
  if (layout === 'strip') {
    return (
      <div className={`flex flex-wrap items-center gap-3 sm:gap-4 px-3 py-2 rounded-lg border ${
        theme === 'dark' ? 'bg-gray-800/60 border-gray-700' : 'bg-white border-slate-200'
      }`}>
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04 }}
            className="flex items-center gap-2 min-w-0"
          >
            <div className={`p-1 rounded-md ${stat.bg} flex-shrink-0`}>
              <stat.icon className={`w-3.5 h-3.5 ${stat.color}`} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wide leading-tight truncate">
                {stat.label}
              </p>
              <p className={`text-sm font-bold ${
                theme === 'dark' ? 'text-white' : 'text-slate-900'
              } leading-tight tabular-nums`}>
                {stat.value}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    );
  }

  // Vertical sidebar layout — stacked single-column cards for the right rail.
  if (layout === 'sidebar') {
    return (
      <div className="grid grid-cols-2 gap-2">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04 }}
          >
            <Card className={`${
              theme === 'dark'
                ? 'bg-gray-800/60 border-gray-700'
                : 'bg-white border-slate-200'
            } hover:shadow-md transition-all`}>
              <CardContent className="p-2.5 flex items-start gap-2">
                <div className={`p-1 rounded-md ${stat.bg} flex-shrink-0`}>
                  <stat.icon className={`w-3.5 h-3.5 ${stat.color}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wide truncate leading-tight">
                    {stat.label}
                  </p>
                  <p className={`text-sm font-bold ${
                    theme === 'dark' ? 'text-white' : 'text-slate-900'
                  } leading-tight tabular-nums mt-0.5`}>
                    {stat.value}
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    );
  }

  // Default 4-column grid (original layout, unchanged).
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-4">
      {stats.map((stat, index) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.04 }}
        >
          <Card className={`${
            theme === 'dark'
              ? 'bg-gray-800/60 border-gray-700'
              : 'bg-white/80 border-slate-200'
          } backdrop-blur-sm hover:shadow-md transition-all`}>
            <CardContent className="p-3 min-h-[70px] sm:min-h-[80px] flex items-start gap-2">
              <div className={`p-1.5 rounded-lg ${stat.bg} flex-shrink-0`}>
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate leading-tight">
                  {stat.label}
                </p>
                <p className={`text-lg sm:text-xl font-bold ${
                  theme === 'dark' ? 'text-white' : 'text-slate-900'
                } leading-tight mt-0.5 tabular-nums`}>
                  {stat.value}
                </p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate leading-tight mt-0.5">
                  {stat.hint}
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
