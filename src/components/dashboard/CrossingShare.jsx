import React, { useState, useLayoutEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Copy, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DEFAULT_LANE, laneLabel, withLane } from '@/lib/laneContext';
import { track } from '@/lib/analytics';

const getShareApi = () => {
  try {
    if (typeof navigator === 'undefined') return null;
    const fn = navigator.share;
    return typeof fn === 'function' ? fn.bind(navigator) : null;
  } catch {
    return null;
  }
};

const getClipboardWriteText = () => {
  try {
    if (typeof navigator === 'undefined') return null;
    const clip = navigator.clipboard;
    if (!clip) return null;
    const fn = clip.writeText;
    return typeof fn === 'function' ? fn.bind(clip) : null;
  } catch {
    return null;
  }
};

export default function CrossingShare({ name, slug, language = 'en', lane = DEFAULT_LANE }) {
  const es = language === 'es';
  const [status, setStatus] = useState('');
  const url = `https://borderpulse.com${withLane(`/crossing/${slug}/`, lane)}`;
  const text = es
    ? `Consulta los tiempos de espera y horarios de ${name} (${laneLabel(lane, language)}) en BorderPulse.`
    : `Check ${name} (${laneLabel(lane, language)}) wait times and crossing hours on BorderPulse.`;

  const contextKey = `${slug}|${lane}|${language}|${name}|${url}|${text}`;
  const contextTokenRef = useRef(null);
  const pendingRef = useRef(false);

  useLayoutEffect(() => {
    const token = {};
    contextTokenRef.current = token;
    pendingRef.current = false;
    setStatus('');

    return () => {
      contextTokenRef.current = null;
      pendingRef.current = false;
    };
  }, [contextKey]);

  const performCopy = async (activeToken, targetUrl, isEs, targetSlug) => {
    try {
      const writeText = getClipboardWriteText();
      if (!writeText) {
        throw new Error('Clipboard API unavailable');
      }
      await writeText(targetUrl);
      if (contextTokenRef.current !== activeToken) return;
      setStatus(isEs ? 'Enlace copiado.' : 'Link copied.');
      track('crossing-share', { slug: targetSlug, method: 'copy' });
    } catch {
      if (contextTokenRef.current !== activeToken) return;
      setStatus(isEs ? 'Copia el enlace desde la barra de direcciones.' : 'Copy the link from your address bar.');
    }
  };

  const copy = async () => {
    if (pendingRef.current) return;
    const activeToken = contextTokenRef.current;
    if (!activeToken) return;
    pendingRef.current = true;
    try {
      await performCopy(activeToken, url, es, slug);
    } finally {
      if (contextTokenRef.current === activeToken) {
        pendingRef.current = false;
      }
    }
  };

  const share = async () => {
    if (pendingRef.current) return;
    const activeToken = contextTokenRef.current;
    if (!activeToken) return;
    pendingRef.current = true;

    try {
      const shareFn = getShareApi();
      if (!shareFn) {
        await performCopy(activeToken, url, es, slug);
        return;
      }
      try {
        await shareFn({ title: `${name} | BorderPulse`, text, url });
        if (contextTokenRef.current !== activeToken) return;
        setStatus('');
        track('crossing-share', { slug, method: 'native' });
      } catch (error) {
        if (contextTokenRef.current !== activeToken) return;
        if (error?.name !== 'AbortError') {
          await performCopy(activeToken, url, es, slug);
        }
      }
    } catch {
      if (contextTokenRef.current === activeToken) {
        await performCopy(activeToken, url, es, slug);
      }
    } finally {
      if (contextTokenRef.current === activeToken) {
        pendingRef.current = false;
      }
    }
  };

  return (
    <section aria-label={es ? 'Comparte este cruce' : 'Share this crossing'} className="mb-6 rounded-xl border border-blue-100 bg-blue-50/60 p-4 dark:border-blue-900 dark:bg-blue-950/20 sm:p-5">
      <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
        {es ? '¿Alguien más va a cruzar?' : 'Someone else making the crossing?'}
      </h2>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
        {es ? 'Comparte esta página para que consulten el reporte antes de salir.' : 'Send them this page so they can check the report before leaving.'}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button onClick={share} className="min-h-11 gap-2"><Share2 aria-hidden="true" className="h-4 w-4" />{es ? 'Compartir cruce' : 'Share crossing'}</Button>
        <Button asChild variant="outline" className="min-h-11">
          <a href={`https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`} target="_blank" rel="noopener noreferrer" onClick={() => track('crossing-share', { slug, method: 'whatsapp' })}>WhatsApp</a>
        </Button>
        <Button onClick={copy} variant="ghost" className="min-h-11 gap-2"><Copy aria-hidden="true" className="h-4 w-4" />{es ? 'Copiar enlace' : 'Copy link'}</Button>
      </div>
      <p role="status" className="mt-2 text-xs text-slate-600 dark:text-slate-300">{status}</p>
      <Link to={`/best-time/${slug}/`} onClick={() => track('best-time-open', { slug, source: 'crossing-share' })} className="mt-2 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-blue-700 underline underline-offset-4 dark:text-blue-300">
        {es ? `Planea tu cruce por ${name}` : `Plan your crossing at ${name}`}<ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0" />
      </Link>
    </section>
  );
}
