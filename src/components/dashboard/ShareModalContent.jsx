import React, { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Copy, Share2, Check, Download } from 'lucide-react';
import { getWaitMinutes } from '@/components/utils/crossingDirection';
import { nowInTz } from '@/components/utils/crossingMeta';
import { track } from '@/lib/analytics';
import { pickLightestHour } from '@/lib/recommendations';
import { DEFAULT_LANE, laneLabel, withLane } from '@/lib/laneContext';
import { availableLaneWait } from '@/lib/crossingAvailability';
import { corridorFor } from '@/lib/corridors';

function formatHourCompact(h) {
  if (h == null) return '';
  const h12 = h % 12 || 12;
  return `${h12}${h < 12 ? 'a' : 'p'}`;
}

// Pull today's lightest hour for a slug from the aggregate, if loaded.
function lightestTodayFor(crossing, aggregate) {
  if (!aggregate?.by_hour?.length) return null;
  // Buckets are port-local; the aggregate carries its port's timezone.
  const today = aggregate.timezone ? nowInTz(aggregate.timezone).day : new Date().getDay();
  return pickLightestHour(crossing, aggregate.by_hour, today);
}

function buildStatusText(crossings, language, direction, portToSlug, aggregates, corridorId, fetchedAt, lane) {
  const corridor = corridorFor(corridorId);
  if (corridor) return `${corridor.name} · ${laneLabel(lane, language)}\n${language === 'es' ? 'Compara los reportes de CBP por carril antes de salir.' : 'Compare CBP lane reports before leaving.'}\nhttps://borderpulse.com${withLane(`/?area=${corridor.id}`, lane)}`;
  const time = fetchedAt && Number.isFinite(Date.parse(fetchedAt))
    ? new Date(fetchedAt).toLocaleString(language === 'es' ? 'es-MX' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' })
    : (language === 'es' ? 'hora de consulta desconocida' : 'retrieval time unknown');
  const directionLabel = direction === 'southbound'
    ? (language === 'en' ? 'To Mexico' : 'Hacia México')
    : (language === 'en' ? 'To USA' : 'Hacia EE.UU.');
  const header = language === 'en'
    ? `🚦 Reported Border Waits ${directionLabel} · ${laneLabel(lane, language)} (data fetched ${time}):`
    : `🚦 Esperas Reportadas ${directionLabel} · ${laneLabel(lane, language)} (datos consultados ${time}):`;
  const isNorthbound = direction !== 'southbound';
  let hasHistoricalHour = false;
  const lines = crossings
    .filter((c) => (direction === 'southbound' ? getWaitMinutes(c, direction) : availableLaneWait(c, lane)) != null)
    .slice(0, 17)
    .map((c) => {
      const wait = (direction === 'southbound' ? getWaitMinutes(c, direction) : availableLaneWait(c, lane));
      const slug = portToSlug?.[c.port_number];
      // "best at Xh" annotation only on northbound (aggregates are NB only)
      // and only when aggregate has loaded for this slug.
      let annotation = '';
      if (isNorthbound && lane === DEFAULT_LANE && slug && aggregates?.[slug]) {
        const best = lightestTodayFor(c, aggregates[slug]);
        if (best && best.hour != null) {
          hasHistoricalHour = true;
          annotation = language === 'en'
            ? ` (30-day pattern ${formatHourCompact(best.hour)})`
            : ` (patrón de 30 días ${formatHourCompact(best.hour)})`;
        }
      }
      return `${c.name} ${wait}min${annotation}`;
    });
  const historicalNote = !hasHistoricalHour ? '' : language === 'en'
    ? 'Historical hours cover the full local weekday and may have passed; not a forecast.\n'
    : 'Las horas históricas incluyen todo el día local y pueden haber pasado; no son un pronóstico.\n';
  const footer = language === 'en'
    ? `${historicalNote}📲 Check reports: https://borderpulse.com${withLane('/', lane)}`
    : `${historicalNote}📲 Consultar reportes: https://borderpulse.com${withLane('/', lane)}`;
  return [header, '', ...lines, '', footer].join('\n');
}

export default function ShareModal({ open, onOpenChange, crossings, language, direction = 'northbound', portToSlug, corridorId, fetchedAt, lane = DEFAULT_LANE }) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const [imageStatus, setImageStatus] = useState('');
  const [aggregates, setAggregates] = useState({});

  // Lazy-fetch aggregates for the top 17 NB crossings on open. Browser
  // cache already has most of these from BorderCrossingCard's per-card
  // fetch, so this is fast in practice. SB shares skip this since
  // aggregates are NB-only.
  useEffect(() => {
    if (!open || lane !== DEFAULT_LANE || corridorFor(corridorId) || direction === 'southbound' || !portToSlug) return;
    const slugs = (crossings || [])
      .filter((c) => (direction === 'southbound' ? getWaitMinutes(c, direction) : availableLaneWait(c, lane)) != null)
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
  }, [open, direction, crossings, portToSlug, aggregates, corridorId, lane]);

  const text = useMemo(
    () => buildStatusText(crossings || [], language, direction, portToSlug, aggregates, corridorId, fetchedAt, lane),
    [crossings, language, direction, portToSlug, aggregates, corridorId, fetchedAt, lane],
  );

  useEffect(() => { setCopied(false); setCopyError(false); }, [text]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      track('share-status', { direction, method: 'copy' });
      setCopied(true);
      setCopyError(false);
      setTimeout(() => setCopied(false), 1800);
    } catch (e) {
      setCopied(false);
      setCopyError(true);
    }
  };

  const nativeShare = async () => {
    if (navigator.share) {
      try {
        const area = corridorFor(corridorId);
        await navigator.share({ title: 'Border Pulse', text, url: `https://borderpulse.com${withLane(area ? `/?area=${area.id}` : '/', lane)}` });
        track('share-status', { direction, method: 'native' });
      } catch {}
    } else {
      copy();
    }
  };

  const downloadImageSummary = () => {
    const es = language === 'es';
    const area = corridorFor(corridorId);
    const items = (crossings || [])
      .map((c) => ({
        c,
        wait: direction === 'southbound' ? getWaitMinutes(c, direction) : availableLaneWait(c, lane),
      }))
      .filter((item) => item.wait != null)
      .slice(0, 8);
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1350;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setImageStatus(es ? 'No se pudo generar la imagen.' : 'Could not create the image.');
      return;
    }
    const grad = ctx.createLinearGradient(0, 0, 0, 1350);
    grad.addColorStop(0, '#0f172a');
    grad.addColorStop(1, '#020617');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1080, 1350);
    ctx.fillStyle = '#10b981';
    ctx.fillRect(0, 0, 1080, 14);

    ctx.font = '700 32px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillStyle = '#f8fafc';
    ctx.fillText('Border Pulse · CBP Waits', 64, 96);

    ctx.font = '700 44px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(area ? `${area.name} · ${laneLabel(lane, language)}` : laneLabel(lane, language), 64, 168);

    const time = fetchedAt && Number.isFinite(Date.parse(fetchedAt))
      ? new Date(fetchedAt).toLocaleString(es ? 'es-MX' : 'en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' })
      : (es ? 'Hora de consulta desconocida' : 'Retrieval time unknown');
    ctx.font = '500 26px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(time, 64, 218);

    let y = 278;
    for (const { c, wait } of items) {
      const bar = wait < 30 ? '#10b981' : wait < 60 ? '#f59e0b' : '#e11d48';
      ctx.fillStyle = '#111827';
      ctx.fillRect(64, y, 952, 98);
      ctx.fillStyle = bar;
      ctx.fillRect(64, y, 10, 98);

      ctx.font = '700 30px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.fillStyle = '#f8fafc';
      ctx.fillText(String(c.name || '').slice(0, 34), 96, y + 60);

      const val = `${wait} min`;
      ctx.font = '800 34px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.fillStyle = bar;
      const vw = ctx.measureText(val).width;
      ctx.fillText(val, 984 - vw, y + 62);
      y += 116;
    }

    ctx.font = '700 28px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillStyle = '#34d399';
    ctx.fillText(`borderpulse.com${es ? '/es/' : '/'}`, 64, 1288);

    canvas.toBlob((blob) => {
      if (!blob) {
        setImageStatus(es ? 'No se pudo generar la imagen.' : 'Could not create the image.');
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `borderpulse-${area ? area.id : 'waits'}-${lane}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setImageStatus(es ? 'Imagen PNG descargada.' : 'Status PNG downloaded.');
    }, 'image/png');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {corridorFor(corridorId)
              ? (language === 'en' ? 'Share this crossing area' : 'Compartir esta zona de cruce')
              : (language === 'en' ? 'Share reported waits' : 'Compartir esperas reportadas')}
          </DialogTitle>
          <DialogDescription>{language === 'en' ? 'Check lane eligibility and report times before leaving.' : 'Verifica los requisitos del carril y las horas de reporte antes de salir.'}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-xs font-mono whitespace-pre-wrap text-slate-800 max-h-64 overflow-auto">
            {text}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={copy} variant="outline" className="gap-2 min-h-11">
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied
                ? (language === 'en' ? 'Copied' : 'Copiado')
                : (language === 'en' ? 'Copy for WhatsApp' : 'Copiar para WhatsApp')}
            </Button>
            <Button onClick={nativeShare} className="gap-2 min-h-11">
              <Share2 className="w-4 h-4" />
              {language === 'en' ? 'Share' : 'Compartir'}
            </Button>
          </div>
          <Button onClick={downloadImageSummary} variant="outline" className="w-full gap-2 min-h-11">
            <Download className="w-4 h-4" />
            {language === 'en' ? 'Download status image (PNG)' : 'Descargar imagen de esperas (PNG)'}
          </Button>
          {imageStatus && <p role="status" className="text-xs text-emerald-700 dark:text-emerald-400 text-center">{imageStatus}</p>}
          {copyError && <p role="status" className="text-xs text-amber-700 dark:text-amber-300">{language === 'en' ? 'Copy failed. You can share the page URL from your browser.' : 'No se pudo copiar. Puedes compartir la URL desde tu navegador.'}</p>}
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
