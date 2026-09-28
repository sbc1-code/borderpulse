import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Copy, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { track } from '@/lib/analytics';

export default function CrossingShare({ name, slug, language = 'en' }) {
  const es = language === 'es';
  const [status, setStatus] = useState('');
  const url = `https://borderpulse.com/crossing/${slug}/`;
  const text = es
    ? `Consulta los tiempos de espera y horarios de ${name} en BorderPulse.`
    : `Check ${name} wait times and crossing hours on BorderPulse.`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setStatus(es ? 'Enlace copiado.' : 'Link copied.');
      track('crossing-share', { slug, method: 'copy' });
    } catch {
      setStatus(es ? 'Copia el enlace desde la barra de direcciones.' : 'Copy the link from your address bar.');
    }
  };

  const share = async () => {
    if (!navigator.share) return copy();
    try {
      await navigator.share({ title: `${name} | BorderPulse`, text, url });
      setStatus('');
      track('crossing-share', { slug, method: 'native' });
    } catch (error) {
      if (error.name !== 'AbortError') await copy();
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
