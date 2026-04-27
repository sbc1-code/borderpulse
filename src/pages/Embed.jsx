import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { dataService } from '@/components/utils/dataService';
import { crossingForSlug, buildSlugMap } from '@/lib/slugs';
import { getWaitMinutes } from '@/components/utils/crossingDirection';
import BorderPulseLogo from '@/components/BorderPulseLogo';

const FLAG = { CA: '🇺🇸', AZ: '🇺🇸', NM: '🇺🇸', TX: '🇺🇸' };

function formatRelative(ts, lang) {
  if (!ts) return '';
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return '';
  const minsAgo = Math.max(0, Math.round((Date.now() - d.getTime()) / 60000));
  if (minsAgo < 1) return lang === 'es' ? 'ahora' : 'just now';
  if (minsAgo < 60) return lang === 'es' ? `hace ${minsAgo} min` : `${minsAgo} min ago`;
  const hrs = Math.floor(minsAgo / 60);
  return lang === 'es' ? `hace ${hrs} h` : `${hrs} h ago`;
}

export default function Embed() {
  const { slug } = useParams();
  const [params] = useSearchParams();
  const theme = params.get('theme') === 'dark' ? 'dark' : 'light';
  const lang = params.get('lang') === 'es' ? 'es' : 'en';
  const direction = params.get('direction') === 'southbound' ? 'southbound' : 'northbound';
  const compact = params.get('compact') === 'true';

  const [crossings, setCrossings] = useState([]);
  const [aggregate, setAggregate] = useState(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    dataService.getBorderData()
      .then((doc) => {
        if (!cancelled) {
          setCrossings(doc?.crossings || []);
          setLoaded(true);
        }
      })
      .catch(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => { cancelled = true; };
  }, []);

  const crossing = useMemo(
    () => (crossings.length ? crossingForSlug(slug, crossings) : null),
    [crossings, slug],
  );
  const canonicalSlug = useMemo(() => {
    if (!crossing || !crossings.length) return slug;
    const { portToSlug } = buildSlugMap(crossings);
    return portToSlug[crossing.port_number] || slug;
  }, [crossing, crossings, slug]);

  useEffect(() => {
    if (!canonicalSlug || !crossing) return;
    let cancelled = false;
    fetch(`/data/aggregates/${canonicalSlug}.json`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (!cancelled) setAggregate(data); })
      .catch(() => { if (!cancelled) setAggregate(null); });
    return () => { cancelled = true; };
  }, [canonicalSlug, crossing]);

  const wait = crossing ? getWaitMinutes(crossing, direction) : null;
  const isSouthbound = direction === 'southbound';

  const typicalDelta = useMemo(() => {
    if (isSouthbound) return null;
    if (wait == null) return null;
    const byHour = aggregate?.by_hour;
    if (!Array.isArray(byHour) || byHour.length === 0) return null;
    const now = new Date();
    const day = now.getDay();
    const hour = now.getHours();
    const entry = byHour.find((h) => h.day === day && h.hour === hour);
    if (entry && typeof entry.median === 'number') {
      const samples = typeof entry.sample_count === 'number'
        ? entry.sample_count
        : (typeof entry.samples === 'number' ? entry.samples : 0);
      if (samples >= 1) return { delta: wait - entry.median };
    }
    if (typeof aggregate?.overall_median === 'number') {
      return { delta: wait - aggregate.overall_median };
    }
    return null;
  }, [aggregate, wait, isSouthbound]);

  const updatedAt = crossing
    ? (isSouthbound ? crossing.southbound_updated_at : crossing.updated_at)
    : null;

  const isDark = theme === 'dark';
  const bg = isDark ? 'bg-gray-900' : 'bg-white';
  const text = isDark ? 'text-slate-100' : 'text-slate-900';
  const subtext = isDark ? 'text-slate-400' : 'text-slate-500';
  const border = isDark ? 'border-gray-800' : 'border-slate-200';
  const cardLink = `https://borderpulse.com/crossing/${canonicalSlug}`;

  if (!loaded) {
    return (
      <div className={`min-h-screen w-full flex items-center justify-center ${bg} ${text}`}>
        <div className={`text-xs ${subtext}`}>{lang === 'es' ? 'Cargando…' : 'Loading…'}</div>
      </div>
    );
  }

  if (!crossing) {
    return (
      <div className={`min-h-screen w-full flex flex-col items-center justify-center ${bg} ${text} p-3`}>
        <div className="text-sm font-medium">{lang === 'es' ? 'Cruce no encontrado' : 'Crossing not found'}</div>
        <a href="https://borderpulse.com" target="_blank" rel="noopener" className={`mt-1 text-[11px] underline ${subtext}`}>
          borderpulse.com
        </a>
      </div>
    );
  }

  const directionLabel = isSouthbound
    ? (lang === 'es' ? 'Hacia México' : 'To Mexico')
    : (lang === 'es' ? 'Hacia EE.UU.' : 'To USA');

  const sourceLabel = isSouthbound
    ? (lang === 'es' ? 'Estimación' : 'Estimate')
    : 'CBP';

  const deltaText = (() => {
    if (!typicalDelta) return null;
    const d = Math.round(typicalDelta.delta);
    if (Math.abs(d) <= 15) {
      return { text: lang === 'es' ? '≈ normal' : '≈ typical', tone: 'neutral' };
    }
    if (d > 15) {
      return {
        text: lang === 'es' ? `+${d} min vs. lo normal` : `+${d} min vs. typical`,
        tone: 'high',
      };
    }
    return {
      text: lang === 'es' ? `−${Math.abs(d)} min vs. lo normal` : `−${Math.abs(d)} min vs. typical`,
      tone: 'low',
    };
  })();

  const deltaColor = deltaText
    ? (deltaText.tone === 'high'
        ? (isDark ? 'text-rose-400' : 'text-rose-600')
        : deltaText.tone === 'low'
          ? (isDark ? 'text-emerald-400' : 'text-emerald-600')
          : subtext)
    : '';

  const padding = compact ? 'p-2.5' : 'p-3';
  const waitSize = compact ? 'text-3xl' : 'text-4xl';

  return (
    <div
      className={`min-h-screen w-full ${bg} ${text} flex flex-col font-sans`}
      style={{ fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif' }}
    >
      <div className={`flex-1 ${padding} flex flex-col gap-1.5 min-w-0`}>
        <div className="flex items-center justify-between gap-2 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-[13px] font-semibold truncate">{crossing.name}</span>
            <span className="text-xs flex-shrink-0">{FLAG[crossing.state] || ''}</span>
          </div>
          <span className={`text-[10px] uppercase tracking-wide ${subtext} flex-shrink-0`}>
            {directionLabel}
          </span>
        </div>

        <div className="flex items-baseline gap-2 min-w-0">
          <span className={`${waitSize} font-bold leading-none tabular-nums`}>
            {wait != null ? wait : '—'}
          </span>
          <span className={`text-xs ${subtext}`}>min</span>
          <span className={`text-[10px] ml-auto ${subtext} flex-shrink-0`}>{sourceLabel}</span>
        </div>

        {!compact && deltaText && (
          <div className={`text-[11px] font-medium ${deltaColor}`}>{deltaText.text}</div>
        )}

        <div className={`mt-auto flex items-center justify-between gap-2 text-[10px] ${subtext}`}>
          <div className="flex items-center gap-1 min-w-0">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block flex-shrink-0" aria-hidden="true" />
            <span className="truncate">{lang === 'es' ? 'En vivo' : 'Live'} · {formatRelative(updatedAt, lang)}</span>
          </div>
        </div>
      </div>

      <a
        href={cardLink}
        target="_blank"
        rel="noopener"
        className={`flex items-center justify-between gap-2 px-2.5 py-1.5 border-t ${border} ${isDark ? 'hover:bg-gray-800/40' : 'hover:bg-slate-50'} transition-colors`}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <BorderPulseLogo size={16} />
          <span className={`text-[10px] font-medium ${subtext} truncate`}>
            {lang === 'es' ? 'Datos por Border Pulse' : 'Powered by Border Pulse'}
          </span>
        </div>
        <span className={`text-[10px] ${subtext} flex-shrink-0`}>borderpulse.com →</span>
      </a>
    </div>
  );
}
