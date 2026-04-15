import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Bell, ChevronRight } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { setPref, requestPermission, permission as getPermission } from '@/components/utils/notifyService';

/**
 * Hero CTA inspired by Base44's "Get Alerted When to Leave" banner.
 * No SMS backend — uses the browser Notification API. Persists prefs
 * in localStorage; the Dashboard evaluates them on each data refresh.
 */
export default function DepartureAlertBanner({ crossings, language }) {
  const [open, setOpen] = useState(false);
  const [crossingId, setCrossingId] = useState('');
  const [condition, setCondition] = useState('below');
  const [threshold, setThreshold] = useState(30);
  const [perm, setPerm] = useState(() => (typeof window !== 'undefined' ? getPermission() : 'default'));
  const [saved, setSaved] = useState(false);

  const handleOpen = async () => {
    setSaved(false);
    setOpen(true);
    if (perm !== 'granted') {
      const res = await requestPermission();
      setPerm(res === true ? 'granted' : res);
    }
  };

  const handleSave = () => {
    if (!crossingId) return;
    setPref(crossingId, { active: true, kind: condition, threshold: Number(threshold) });
    setSaved(true);
    setTimeout(() => setOpen(false), 900);
  };

  const selected = crossings.find((c) => c.port_number === crossingId);

  return (
    <>
      <motion.button
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={handleOpen}
        className="w-full group relative overflow-hidden rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 text-white p-4 sm:p-5 text-left shadow-md hover:shadow-lg transition-shadow mb-4 sm:mb-6"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
              <Bell className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-sm sm:text-base font-semibold">
                {language === 'en' ? 'Get Alerted When to Leave' : 'Recibe una Alerta Cuándo Salir'}
              </div>
              <div className="text-[11px] sm:text-xs text-white/80">
                {language === 'en'
                  ? 'Pick a crossing + threshold. We ping you when conditions hit.'
                  : 'Elige un cruce + umbral. Te avisamos cuando se cumpla.'}
              </div>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 flex-shrink-0 group-hover:translate-x-0.5 transition-transform" />
        </div>
      </motion.button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {language === 'en' ? 'Set a smart alert' : 'Configura una alerta'}
            </DialogTitle>
          </DialogHeader>

          {perm !== 'granted' && (
            <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
              {perm === 'denied'
                ? (language === 'en'
                  ? 'Notifications are blocked in your browser. Enable them in site settings to receive alerts.'
                  : 'Las notificaciones están bloqueadas en tu navegador. Habilítalas en los ajustes del sitio.')
                : (language === 'en'
                  ? 'Allow notifications when prompted so we can ping you.'
                  : 'Permite notificaciones cuando se te solicite.')}
            </div>
          )}

          <div className="space-y-3">
            <div>
              <Label htmlFor="crossing" className="text-xs">
                {language === 'en' ? 'Crossing' : 'Cruce'}
              </Label>
              <Select value={crossingId} onValueChange={setCrossingId}>
                <SelectTrigger id="crossing">
                  <SelectValue placeholder={language === 'en' ? 'Pick a crossing…' : 'Elige un cruce…'} />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {crossings
                    .filter((c) => c.name)
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((c) => (
                      <SelectItem key={c.port_number} value={c.port_number}>
                        {c.name} {c.state ? `· ${c.state}` : ''}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="condition" className="text-xs">
                {language === 'en' ? 'Alert me when wait is' : 'Avísame cuando la espera sea'}
              </Label>
              <Select value={condition} onValueChange={setCondition}>
                <SelectTrigger id="condition">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="below">
                    {language === 'en' ? 'Less than threshold' : 'Menor al umbral'}
                  </SelectItem>
                  <SelectItem value="above">
                    {language === 'en' ? 'Greater than threshold' : 'Mayor al umbral'}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="threshold" className="text-xs">
                {language === 'en' ? 'Threshold (minutes)' : 'Umbral (minutos)'}
              </Label>
              <Input
                id="threshold"
                type="number"
                min="5"
                max="180"
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
              />
            </div>

            {selected && (
              <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
                {language === 'en' ? 'Current wait at' : 'Espera actual en'} <span className="font-medium">{selected.name}</span>:{' '}
                <span className="font-semibold">
                  {selected.current_wait_time == null ? '—' : `${selected.current_wait_time} min`}
                </span>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button onClick={handleSave} disabled={!crossingId || perm !== 'granted'} className="flex-1">
                {saved
                  ? (language === 'en' ? 'Saved ✓' : 'Guardado ✓')
                  : (language === 'en' ? 'Save Alert' : 'Guardar alerta')}
              </Button>
              <Button variant="outline" onClick={() => setOpen(false)} className="flex-1">
                {language === 'en' ? 'Cancel' : 'Cancelar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
