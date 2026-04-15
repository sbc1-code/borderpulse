import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Clock, MapPin, Activity, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";

export default function StatsOverview({ crossings, selectedDirection = 'northbound', language, theme }) {
  const totalCrossings = crossings.length;
  
  // Get wait times based on selected direction
  const getWaitTime = (crossing) => {
    if (selectedDirection === 'southbound') {
      return crossing.southbound_wait_time ?? 0;
    }
    return crossing.northbound_wait_time ?? crossing.current_wait_time ?? 0;
  };

  const waitTimes = crossings.map(getWaitTime);
  const averageWaitTime = waitTimes.length > 0 
    ? Math.round(waitTimes.reduce((sum, time) => sum + time, 0) / waitTimes.length)
    : 0;
  
  const goodCrossings = waitTimes.filter(time => time < 20).length;
  const alertCrossings = waitTimes.filter(time => time > 45).length;

  const stats = [
    {
      icon: MapPin,
      label: language === 'en' ? 'Crossings' : 'Cruces',
      value: totalCrossings,
      color: 'text-blue-600',
      bg: 'bg-blue-100'
    },
    {
      icon: Clock,
      label: language === 'en' ? 'Avg Wait' : 'Promedio',
      value: selectedDirection === 'southbound' && averageWaitTime === 0 
        ? (language === 'en' ? 'No Wait' : 'Sin Espera')
        : `${averageWaitTime}min`,
      color: 'text-indigo-600',
      bg: 'bg-indigo-100'
    },
    {
      icon: Activity,
      label: language === 'en' ? 'Good' : 'Bueno',
      value: goodCrossings,
      color: 'text-green-600',
      bg: 'bg-green-100'
    },
    {
      icon: AlertTriangle,  
      label: language === 'en' ? 'Heavy' : 'Pesado',
      value: alertCrossings,
      color: 'text-red-600',
      bg: 'bg-red-100'
    }
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
      {stats.map((stat, index) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <Card className={`${
            theme === 'dark' 
              ? 'bg-gray-800/50 border-gray-700' 
              : 'bg-white/80 border-slate-200'
          } backdrop-blur-sm transition-all duration-300 hover:shadow-md`}>
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-lg ${stat.bg} flex-shrink-0`}>
                  <stat.icon className={`w-3 h-3 ${stat.color}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-gray-500 uppercase tracking-wide truncate">
                    {stat.label}
                  </p>
                  <p className={`text-sm font-bold ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  } truncate`} title={stat.value.toString()}>
                    {stat.value}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}