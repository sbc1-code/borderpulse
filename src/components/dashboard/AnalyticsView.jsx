import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from 'recharts';
import { getAllHistory } from '@/components/utils/waitTimeHistory';

export default function AnalyticsView({ crossings, language, direction = 'northbound' }) {
  const byHour = useMemo(() => {
    const all = getAllHistory(direction);
    const buckets = Array.from({ length: 24 }, (_, h) => ({ hour: h, sum: 0, n: 0 }));
    for (const id in all) {
      for (const sample of all[id]) {
        const h = new Date(sample.t).getHours();
        buckets[h].sum += sample.wait;
        buckets[h].n += 1;
      }
    }
    return buckets.map((b) => ({
      hour: `${String(b.hour).padStart(2, '0')}:00`,
      avg: b.n ? Math.round(b.sum / b.n) : null,
    }));
  }, [direction]);

  const byDow = useMemo(() => {
    const all = getAllHistory(direction);
    const names = language === 'en'
      ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
      : ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const buckets = Array.from({ length: 7 }, () => ({ sum: 0, n: 0 }));
    for (const id in all) {
      for (const sample of all[id]) {
        const d = new Date(sample.t).getDay();
        buckets[d].sum += sample.wait;
        buckets[d].n += 1;
      }
    }
    return buckets.map((b, i) => ({ day: names[i], avg: b.n ? Math.round(b.sum / b.n) : null }));
  }, [language]);

  const peak = useMemo(() => {
    const vals = byHour.filter((b) => b.avg != null).map((b) => b.avg);
    if (!vals.length) return null;
    const max = Math.max(...vals);
    const bucket = byHour.find((b) => b.avg === max);
    return bucket ? `${bucket.hour} (${max}m)` : null;
  }, [byHour]);

  const totalSamples = useMemo(() => {
    const all = getAllHistory(direction);
    return Object.values(all).reduce((n, arr) => n + arr.length, 0);
  }, [direction]);

  if (totalSamples < 10) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-6 text-center text-sm text-slate-500">
            {language === 'en'
              ? 'Analytics populate as you use the app. Check back after a few visits.'
              : 'Los análisis se llenan conforme uses la app. Vuelve después de varias visitas.'}
          <div className="mt-2 text-[11px] text-slate-400">
            {language === 'en' ? 'Samples collected' : 'Muestras recolectadas'}: {totalSamples}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-slate-500 uppercase tracking-wide">
              {language === 'en' ? 'Peak hour' : 'Hora pico'}
            </div>
            <div className="text-2xl font-bold text-slate-900">{peak || '—'}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-slate-500 uppercase tracking-wide">
              {language === 'en' ? 'Samples' : 'Muestras'}
            </div>
            <div className="text-2xl font-bold text-slate-900">{totalSamples}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-slate-500 uppercase tracking-wide">
            {language === 'en' ? 'Crossings tracked' : 'Cruces monitoreados'}
          </div>
            <div className="text-2xl font-bold text-slate-900">{Object.keys(getAllHistory(direction)).length}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">
            {language === 'en' ? 'Average wait by hour' : 'Espera promedio por hora'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byHour}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="hour" interval={2} tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="avg" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">
            {language === 'en' ? 'Average wait by day' : 'Espera promedio por día'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byDow}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="avg" fill="#8a9a7b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
