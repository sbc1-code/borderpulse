import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, DollarSign, Banknote, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";

const STALE_WARN_MS = 2 * 60 * 60 * 1000;
const STALE_ERROR_MS = 6 * 60 * 60 * 1000;

function getStaleness(fetchedAt) {
  if (!fetchedAt) return null;
  const ts = Date.parse(fetchedAt);
  if (!Number.isFinite(ts)) return null;
  const ageMs = Date.now() - ts;
  if (ageMs >= STALE_ERROR_MS) return { level: 'error', ageMs };
  if (ageMs >= STALE_WARN_MS) return { level: 'warn', ageMs };
  return { level: 'fresh', ageMs };
}

function formatAge(ageMs, language) {
  const hours = Math.floor(ageMs / 3_600_000);
  const minutes = Math.floor((ageMs % 3_600_000) / 60_000);
  if (hours > 0) return language === 'en' ? `${hours}h ${minutes}m ago` : `hace ${hours}h ${minutes}m`;
  return language === 'en' ? `${minutes}m ago` : `hace ${minutes}m`;
}

export default function ExchangeRateWidget({ exchangeRate, language, theme }) {
  const isPositive = exchangeRate?.change_percentage > 0;
  const staleness = getStaleness(exchangeRate?.fetched_at || exchangeRate?.last_updated);
  const previousAgeHours = exchangeRate?.previous_rate_age_hours;
  const previousLabel = previousAgeHours
    ? (language === 'en' ? `${previousAgeHours.toFixed(0)}h ago:` : `hace ${previousAgeHours.toFixed(0)}h:`)
    : (language === 'en' ? 'Previous:' : 'Anterior:');
  const changeLabel = previousAgeHours
    ? (language === 'en' ? `vs ${previousAgeHours.toFixed(0)}h ago` : `vs hace ${previousAgeHours.toFixed(0)}h`)
    : (language === 'en' ? '24h change' : 'cambio 24h');

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.2 }}
    >
      <Card className={`${
        theme === 'dark' 
          ? 'bg-gradient-to-br from-gray-800/50 to-gray-900/50 border-gray-700' 
          : 'bg-gradient-to-br from-white/90 to-blue-50/50 border-slate-200'
      } backdrop-blur-sm transition-all duration-300 hover:shadow-xl`}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <div className="flex items-center gap-1">
              <DollarSign className="w-5 h-5 text-green-600" />
              <span className="text-gray-400">/</span>
              <Banknote className="w-5 h-5 text-red-600" />
            </div>
            <span className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>
              USD/MXN
            </span>
          </CardTitle>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-4">
            {/* Current Rate */}
            <div className="text-center">
              <div className={`text-3xl font-bold ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                ${exchangeRate?.rate?.toFixed(4) || '---'}
              </div>
              <p className="text-sm text-gray-500 mt-1">
                {language === 'en' ? 'Current Rate' : 'Tipo de Cambio Actual'}
              </p>
            </div>

            {/* Change vs prior reference rate */}
            {exchangeRate?.change_percentage !== null && exchangeRate?.change_percentage !== undefined && (
              <div className="flex items-center justify-center gap-2">
                <Badge
                  variant={isPositive ? "default" : "destructive"}
                  className="flex items-center gap-1"
                >
                  {isPositive ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : (
                    <TrendingDown className="w-3 h-3" />
                  )}
                  {Math.abs(exchangeRate.change_percentage).toFixed(2)}%
                </Badge>
                <span className="text-sm text-gray-500">
                  {changeLabel}
                </span>
              </div>
            )}

            {/* Previous Rate */}
            {exchangeRate?.previous_rate && (
              <div className="text-center pt-2 border-t border-gray-200">
                <div className="text-sm text-gray-500">
                  {previousLabel} ${exchangeRate.previous_rate.toFixed(4)}
                </div>
              </div>
            )}

            {/* Last Updated + staleness */}
            {exchangeRate?.last_updated && staleness && (
              <div className="text-center flex items-center justify-center gap-1.5">
                {staleness.level !== 'fresh' && (
                  <AlertTriangle
                    className={`w-3 h-3 ${staleness.level === 'error' ? 'text-red-500' : 'text-amber-500'}`}
                  />
                )}
                <span
                  className={`text-xs ${
                    staleness.level === 'error'
                      ? 'text-red-500'
                      : staleness.level === 'warn'
                      ? 'text-amber-500'
                      : 'text-gray-400'
                  }`}
                >
                  {language === 'en' ? 'Updated' : 'Actualizado'} {formatAge(staleness.ageMs, language)}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}