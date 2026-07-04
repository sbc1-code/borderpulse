import React, { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Copy, Share2, Check } from 'lucide-react';
import { getWaitMinutes } from '@/components/utils/crossingDirection';
import { nowInTz } from '@/components/utils/crossingMeta';
import { track } from '@/lib/analytics';

function formatHourCompact(h) {
  if (h == null) return '';
  const h12 = h % 12 || 12;
  return `${h12}${h < 12 ? 'a' : 'p'}`;
}

// Pull today's lightest hour for a slug from the aggregate, if loaded.
function lightestTodayFor(aggregate) {
  if (!aggregate?.by_hour?.length) return null;
  // Buckets are port-local; the aggregate carries its port's timezone.
  const today = aggregate.timezone ? nowInTz(aggregate.timezone).day : new Date().getDay();
  const candidates = aggregate.by_hour
    .filter((h) => h.day === today && typeof h.median === 'number' && (h.samples || h.sample_count || 0) >= 1)
    .sort((a, b) => a.median - b.median);
  return candidates[0] || null;
}

function buildStatusText(crossings, language, direction, portToSlug, aggregates) {
  const now = new Date();
  const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const directionLabel = direction === 'southbound'
    ? (language === 'en' ? 'To Mexico' : 'Hacia México')
    : (language === 'en' ? 'To USA' : 'Hacia EE.UU.');
  const header = language === 'en'
    ? `🚦 Border Wait Times ${directionLabel} (${time}):`
    : `🚦 Tiempos de Espera ${directionLabel} (${time}):`;
  const isNorthbound = direction !== 'southbound';
  const lines = crossings
    .filter((c) => getWaitMinutes(c, direction) != null)
    .slice(0, 17)
    .map((c) => {
      const wait = getWaitMinutes(c, direction);
      const slug = portToSlug?.[c.port_number];
      // "best at Xh" annotation only on northbound (aggregates are NB only)
      // and only when aggregate has loaded for this slug.
      let annotation = '';
      if (isNorthbound && slug && aggregates?.[slug]) {
        const best = lightestTodayFor(aggregates[slug]);
        if (best && best.hour != null) {
          annotation = language === 'en'
            ? ` (best ${formatHourCompact(best.hour)})`
            : ` (mejor ${formatHourCompact(best.hour)})`;
        }
      }
      return `${c.name} ${wait}min${annotation}`;
    });
  const footer = language === 'en'
    ? '📲 Real-time updates: borderpulse.com'
    : '📲 Actualizaciones en vivo: borderpulse.com';
  return [header, '', ...lines, '', footer].join('\n');
}

export default function ShareModal({ open, onOpenChange, crossings, language, direction = 'northbound', portToSlug }) {
  const [copied, setCopied] = useState(false);
  const [aggregates, setAggregates] = useState({});

  // Lazy-fetch aggregates for the top 17 NB crossings on open. Browser
  // cache already has most of these from BorderCrossingCard's per-card
  // fetch, so this is fast in practice. SB shares skip this since
  // aggregates are NB-only.
  useEffect(() => {
    if (!open || direction === 'southbound' || !portToSlug) return;
    const slugs = (crossings || [])
      .filter((c) => getWaitMinutes(c, direction) != null)
      .slice(0, 17)
      .map((c) => portToSlug[c.port_number])
      .filter(Boolean)
      .filter((s) => !aggregates[s]);
    if (!slugs.length) return;
    let cancelled = false;
    Promise.all(
      slugs.map((s) =>
        fetch(`/data/aggregates/${s}.json`)
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null)
          .then((agg) => [s, agg]),
      ),
    ).then((entries) => {
      if (cancelled) return;
      setAggregates((prev) => {
        const next = { ...prev };
        for (const [s, agg] of entries) {
          if (agg) next[s] = agg;
        }
        return next;
      });
    });
    return () => { cancelled = true; };
  }, [open, direction, crossings, portToSlug, aggregates]);

  const text = useMemo(
    () => buildStatusText(crossings || [], language, direction, portToSlug, aggregates),
    [crossings, language, direction, portToSlug, aggregates],
  );

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      track('share-status', { direction, method: 'copy' });
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
        track('share-status', { direction, method: 'native' });
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
