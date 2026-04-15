import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Clock, MapPin, Activity, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import { getWaitMinutes } from '@/components/utils/crossingDirection';

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
}) {
  const reportingWaits = crossings
    .map((crossing) => getWaitMinutes(crossing, selectedDirection))
    .filter((t) => t !== null);
  const totalCrossings = crossings.length;
  const reportingCount = reportingWaits.length;

  const averageWaitTime = reportingCount
    ? Math.round(reportingWaits.reduce((sum, t) => sum + t, 0) / reportingCount)
    : null;
  const goodCount = reportingWaits.filter((t) => t < 15).length;
  const heavyCount = reportingWaits.filter((t) => t >= 45).length;

  const regionSuffix = regionLabel && regionLabel !== 'All' && regionLabel !== 'Todos'
    ? ` · ${regionLabel}`
    : '';

  const stats = [
    {
      icon: MapPin,
      label: (language === 'en' ? 'Open' : 'Abiertos') + regionSuffix,
      value: totalCrossings === 0
        ? '—'
        : `${reportingCount}/${totalCrossings}`,
      color: 'text-blue-600',
      bg: 'bg-blue-100 dark:bg-blue-950/40',
      hint: language === 'en' ? 'reporting / total' : 'reportando / total',
    },
    {
      icon: Clock,
      label: language === 'en' ? 'Avg Wait' : 'Promedio',
      value: averageWaitTime == null ? '—' : `${averageWaitTime} min`,
      color: 'text-indigo-600',
      bg: 'bg-indigo-100 dark:bg-indigo-950/40',
      hint: language === 'en' ? 'passenger standard' : 'pasajeros estándar',
    },
    {
      icon: Activity,
      label: language === 'en' ? 'Good' : 'Bueno',
      value: reportingCount === 0 ? '—' : goodCount,
      color: 'text-emerald-600',
      bg: 'bg-emerald-100 dark:bg-emerald-950/40',
      hint: language === 'en' ? '< 15 min' : '< 15 min',
    },
    {
      icon: AlertTriangle,
      label: language === 'en' ? 'Heavy' : 'Pesado',
      value: reportingCount === 0 ? '—' : heavyCount,
      color: 'text-rose-600',
      bg: 'bg-rose-100 dark:bg-rose-950/40',
      hint: language === 'en' ? '≥ 45 min' : '≥ 45 min',
    },
  ];

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
