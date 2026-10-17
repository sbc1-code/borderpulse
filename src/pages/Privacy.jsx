import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Database, Megaphone } from 'lucide-react';
import { updatePageMeta, resetPageMeta } from '@/lib/seo';
import { privacyParagraphs } from '@/lib/privacyParagraphs';
import { googlePrivacyNotice } from '@/lib/googlePrivacyNotice';

export default function Privacy({ lang = 'en' }) {
  const es = lang === 'es';
  const google = googlePrivacyNotice(lang);
  const notice = privacyParagraphs(lang);

  useEffect(() => {
    const title = es ? 'Privacidad | Border Pulse' : 'Privacy | Border Pulse';
    const canonical = `https://borderpulse.com/${es ? 'privacidad' : 'privacy'}/`;
    const description = es
      ? 'Aviso sobre preferencias del navegador, analítica y publicidad de terceros en Border Pulse.'
      : 'Notice about browser preferences, analytics, and third-party advertising on Border Pulse.';
    updatePageMeta({ title, description, ogTitle: title, ogDescription: description, ogUrl: canonical, canonical, lang: es ? 'es' : 'en' });
    return () => resetPageMeta();
  }, [es]);

  return (
    <div className="mx-auto max-w-[900px] p-4 sm:p-6">
      <div className="mb-5">
        <Link to="/" className="-ml-2 inline-flex min-h-11 items-center gap-1 rounded-md px-3 text-sm font-medium hover:bg-slate-100 dark:hover:bg-gray-800">
          <ArrowLeft className="h-3.5 w-3.5" />
          {es ? 'Todos los cruces' : 'All crossings'}
        </Link>
      </div>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-slate-950 dark:text-white sm:text-3xl">
          {es ? 'Privacidad y datos' : 'Privacy and data'}
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          {es
            ? 'Este aviso describe los servicios y las preferencias que utiliza el sitio público de Border Pulse.'
            : 'This notice describes the services and preferences used by the public Border Pulse site.'}
        </p>
      </header>

      <div className="space-y-4">
        <section className="rounded-xl border border-slate-200 bg-white/80 p-4 dark:border-gray-700 dark:bg-gray-900/50">
          <h2 className="font-semibold text-slate-900 dark:text-white">{es ? 'Cámaras públicas' : 'Public cameras'}</h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{notice.cameras}</p>
          <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center text-sm text-emerald-700 underline dark:text-emerald-400">{es ? 'Aviso de privacidad de Google' : 'Google Privacy Policy'}</a>
        </section>
        <section className="rounded-xl border border-slate-200 bg-white/80 p-4 dark:border-gray-700 dark:bg-gray-900/50 sm:p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
            <Database className="h-4 w-4 text-emerald-600" />
            {es ? 'El sitio público' : 'The public site'}
          </h2>
          <div className="mt-3 space-y-3 text-sm leading-6 text-slate-700 dark:text-slate-300">
            <p>{notice.publicSite}</p>
            <p>{notice.analytics}</p>
          </div>
        </section>

        <section id="advertising" className="rounded-xl border border-slate-200 bg-white/80 p-4 dark:border-gray-700 dark:bg-gray-900/50 sm:p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
            <Megaphone className="h-4 w-4 text-emerald-600" />
            {es ? 'Publicidad' : 'Advertising'}
          </h2>
          <div className="mt-3 space-y-3 text-sm leading-6 text-slate-700 dark:text-slate-300">
            <p>{notice.adsterra}</p>
            <p>{notice.adsterraData}</p>
            <p className="flex flex-wrap gap-x-4 gap-y-1">
              <a className="text-emerald-700 underline dark:text-emerald-400" href="https://adsterra.com/privacy-policy-managed/" target="_blank" rel="noreferrer">{es ? 'Aviso de privacidad de Adsterra' : 'Adsterra Privacy Policy'}</a>
              <a className="text-emerald-700 underline dark:text-emerald-400" href="https://adsterra.com/cookies/" target="_blank" rel="noreferrer">{es ? 'Política de cookies de Adsterra' : 'Adsterra Cookies Policy'}</a>
            </p>
            <p>{notice.adsterraChoices}</p>
          </div>
        </section>
        <section id="google-advertising" className="rounded-xl border border-slate-200 bg-white/80 p-4 dark:border-gray-700 dark:bg-gray-900/50 sm:p-5">
          <h2 className="font-semibold text-slate-900 dark:text-white">{google.title}</h2>
          <div className="mt-3 space-y-3 text-sm leading-6 text-slate-700 dark:text-slate-300">
            {google.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
            <p className="flex flex-wrap gap-x-4 gap-y-1">{google.links.map(link => (
              <a key={link.href} className="inline-flex min-h-11 items-center text-emerald-700 underline dark:text-emerald-400" href={link.href} target="_blank" rel="noopener noreferrer">{link.label}</a>
            ))}</p>
          </div>
        </section>
      </div>

      <p className="mt-6 text-xs text-slate-500 dark:text-slate-400">
        {es ? 'Actualizado: 17 de octubre de 2026.' : 'Updated: October 17, 2026.'}
      </p>
    </div>
  );
}
