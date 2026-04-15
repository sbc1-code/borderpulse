import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, DollarSign, Banknote } from "lucide-react";
import { motion } from "framer-motion";

export default function ExchangeRateWidget({ exchangeRate, language, theme }) {
  const isPositive = exchangeRate?.change_percentage > 0;
  
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

            {/* 24h Change */}
            {exchangeRate?.change_percentage !== undefined && (
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
                  {language === 'en' ? '24h change' : 'cambio 24h'}
                </span>
              </div>
            )}

            {/* Previous Rate */}
            {exchangeRate?.previous_rate && (
              <div className="text-center pt-2 border-t border-gray-200">
                <div className="text-sm text-gray-500">
                  {language === 'en' ? 'Previous:' : 'Anterior:'} ${exchangeRate.previous_rate.toFixed(4)}
                </div>
              </div>
            )}

            {/* Last Updated */}
            {exchangeRate?.last_updated && (
              <div className="text-center">
                <span className="text-xs text-gray-400">
                  {language === 'en' ? 'Updated' : 'Actualizado'} {
                    new Date(exchangeRate.last_updated).toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })
                  }
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}