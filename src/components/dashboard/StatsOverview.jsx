import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Clock, MapPin, Activity, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';

// Math fix: a crossing with null wait_time has NO DATA; it must not be
// treated as "0 min" in the average or "< 15" as Good. Thresholds also
// aligned with statusFromDelay() in scripts/fetch-cbp.mjs: good < 15,
// heavy >= 45.
export default function StatsOverview({ crossings, selectedDirection = 'northbound', language, theme }) {
  const getWaitTime = (crossing) => {
    if (selectedDirection === 'southbound') {
      return typeof crossing.southbound_wait_time === 'number' ? crossing.southbound_wait_time : null;
    }
    const nb = crossing.northbound_wait_time ?? crossing.current_wait_time;
    return typeof nb === 'number' ? nb : null;
  };

  const reportingWaits = crossings.map(getWaitTime).filter((t) => t !== null);
  const totalCrossings = crossings.length;
  const reportingCount = reportingWaits.length;

  const averageWaitTime = reportingCount
    ? Math.round(reportingWaits.reduce((sum, t) => sum + t, 0) / reportingCount)
    : null;
  const goodCount = reportingWaits.filter((t) => t < 15).length;
  const heavyCount = reportingWaits.filter((t) => t >= 45).length;

  const stats = [
    {
      icon: MapPin,
      label: language === 'en' ? 'Open' : 'Abiertos',
      value: `${reportingCount}/${totalCrossings}`,
      color: 'text-blue-600',
      bg: 'bg-blue-100',
      hint: language === 'en' ? 'reporting / total' : 'reportando / total',
    },
    {
      icon: Clock,
      label: language === 'en' ? 'Avg Wait' : 'Promedio',
      value: averageWaitTime == null
        ? '—'
        : `${averageWaitTime} min`,
      color: 'text-indigo-600',
      bg: 'bg-indigo-100',
      hint: language === 'en' ? 'across open crossings' : 'entre cruces abiertos',
    },
    {
      icon: Activity,
      label: language === 'en' ? 'Good' : 'Bueno',
      value: goodCount,
      color: 'text-emerald-600',
      bg: 'bg-emerald-100',
      hint: language === 'en' ? '< 15 min' : '< 15 min',
    },
    {
      icon: AlertTriangle,
      label: language === 'en' ? 'Heavy' : 'Pesado',
      value: heavyCount,
      color: 'text-rose-600',
      bg: 'bg-rose-100',
      hint: language === 'en' ? '≥ 45 min' : '≥ 45 min',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
      {stats.map((stat, index) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
        >
          <Card className={`${
            theme === 'dark'
              ? 'bg-gray-800/60 border-gray-700'
              : 'bg-white/80 border-slate-200'
          } backdrop-blur-sm transition-all duration-300 hover:shadow-md`}>
            <CardContent className="p-3">
              <div className="flex items-start gap-2">
                <div className={`p-1.5 rounded-lg ${stat.bg} flex-shrink-0`}>
                  <stat.icon className={`w-3.5 h-3.5 ${stat.color}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider truncate">
                    {stat.label}
                  </p>
                  <p className={`text-base sm:text-lg font-bold ${
                    theme === 'dark' ? 'text-white' : 'text-slate-900'
                  } leading-tight`}>
                    {stat.value}
                  </p>
                  <p className="text-[10px] text-slate-400 truncate">{stat.hint}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
