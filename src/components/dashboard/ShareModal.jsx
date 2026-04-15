import React, { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Copy, Share2, Check } from 'lucide-react';
import { getWaitMinutes } from '@/components/utils/crossingDirection';

function buildStatusText(crossings, language, direction) {
  const now = new Date();
  const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const directionLabel = direction === 'southbound'
    ? (language === 'en' ? 'To Mexico' : 'Hacia México')
    : (language === 'en' ? 'To USA' : 'Hacia EE.UU.');
  const header = language === 'en'
    ? `🚦 Border Wait Times ${directionLabel} (${time}):`
    : `🚦 Tiempos de Espera ${directionLabel} (${time}):`;
  const lines = crossings
    .filter((c) => getWaitMinutes(c, direction) != null)
    .slice(0, 17)
    .map((c) => `${c.name} ${getWaitMinutes(c, direction)}min`);
  const footer = language === 'en'
    ? '📲 Real-time updates: borderpulse.com'
    : '📲 Actualizaciones en vivo: borderpulse.com';
  return [header, '', ...lines, '', footer].join('\n');
}

export default function ShareModal({ open, onOpenChange, crossings, language, direction = 'northbound' }) {
  const [copied, setCopied] = useState(false);
  const text = useMemo(
    () => buildStatusText(crossings || [], language, direction),
    [crossings, language, direction],
  );

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (e) {
      console.warn(e);
    }
  };

  const nativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Border Pulse', text, url: 'https://borderpulse.com' });
      } catch {}
    } else {
      copy();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {language === 'en' ? 'Share current status' : 'Compartir estado actual'}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-xs font-mono whitespace-pre-wrap text-slate-800 max-h-64 overflow-auto">
            {text}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={copy} variant="outline" className="gap-2">
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied
                ? (language === 'en' ? 'Copied' : 'Copiado')
                : (language === 'en' ? 'Copy for WhatsApp' : 'Copiar para WhatsApp')}
            </Button>
            <Button onClick={nativeShare} className="gap-2">
              <Share2 className="w-4 h-4" />
              {language === 'en' ? 'Share' : 'Compartir'}
            </Button>
          </div>
          <p className="text-[11px] text-slate-500 text-center">
            {language === 'en'
              ? 'Paste into WhatsApp, iMessage, or anywhere else.'
              : 'Pega en WhatsApp, iMessage, o donde quieras.'}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
