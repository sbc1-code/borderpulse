import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Database, Megaphone } from 'lucide-react';
import { updatePageMeta, resetPageMeta } from '@/lib/seo';

export default function Privacy({ lang = 'en' }) {
  const es = lang === 'es';

  useEffect(() => {
    const title = es ? 'Privacidad | Border Pulse' : 'Privacy | Border Pulse';
    const canonical = `https://borderpulse.com/${es ? 'privacidad' : 'privacy'}/`;
    const description = es
      ? 'Aviso sobre preferencias del navegador, analítica y anuncios de Adsterra en Border Pulse.'
      : 'Notice about browser preferences, analytics, and Adsterra advertising on Border Pulse.';
    updatePageMeta({ title, description, ogTitle: title, ogDescription: description, ogUrl: canonical, canonical });
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
        <div className="mb-2 inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-900 dark:bg-amber-900/30 dark:text-amber-300">
          {es ? 'Borrador para revisión' : 'Draft for review'}
        </div>
        <h1 className="text-2xl font-bold text-slate-950 dark:text-white sm:text-3xl">
          {es ? 'Privacidad y datos' : 'Privacy and data'}
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          {es
            ? 'Este aviso describe el funcionamiento actual y debe revisarse con la identidad legal y las jurisdicciones aplicables antes de tratarlo como aviso final.'
            : 'This notice describes current behavior and should be reviewed against the legal identity and applicable jurisdictions before being treated as final.'}
        </p>
      </header>

      <div className="space-y-4">
        <section className="rounded-xl border border-slate-200 bg-white/80 p-4 dark:border-gray-700 dark:bg-gray-900/50 sm:p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
            <Database className="h-4 w-4 text-emerald-600" />
            {es ? 'El sitio público' : 'The public site'}
          </h2>
          <div className="mt-3 space-y-3 text-sm leading-6 text-slate-700 dark:text-slate-300">
            <p>{es ? 'Border Pulse funciona sin cuenta. Las preferencias de idioma, tema y filtros pueden guardarse en el almacenamiento local del navegador. Los tiempos de espera provienen del feed público de U.S. Customs and Border Protection.' : 'Border Pulse works without an account. Language, theme, and filter preferences may be saved in your browser’s local storage. Wait times come from the public U.S. Customs and Border Protection feed.'}</p>
            <p>{es ? 'Las vistas de página se miden con Umami, una analítica sin cookies. Border Pulse no recibe documentos de viaje ni ubicación precisa.' : 'Page views are measured with Umami, a cookieless analytics service. Border Pulse does not receive travel documents or precise location.'}</p>
          </div>
        </section>

        <section id="advertising" className="rounded-xl border border-slate-200 bg-white/80 p-4 dark:border-gray-700 dark:bg-gray-900/50 sm:p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
            <Megaphone className="h-4 w-4 text-emerald-600" />
            {es ? 'Publicidad' : 'Advertising'}
          </h2>
          <div className="mt-3 space-y-3 text-sm leading-6 text-slate-700 dark:text-slate-300">
            <p>{es ? 'Border Pulse muestra anuncios de terceros para ayudar a mantener la plataforma. El panel carga el script publicitario de Adsterra; los anuncios pueden no mostrarse si el servicio o el navegador los bloquea.' : 'Border Pulse displays third-party ads to help support the platform. The dashboard loads Adsterra’s advertising script; ads may not appear if the service or browser blocks them.'}</p>
            <p>{es ? 'Cuando se carga el script, tu navegador se conecta directamente con Adsterra. Su aviso de privacidad indica que puede procesar datos técnicos como la dirección IP, información del navegador y dispositivo, detalles de anuncios y datos de uso. Adsterra también describe el uso de cookies y otras tecnologías; las tecnologías concretas pueden variar según el anuncio o la campaña.' : 'When the script loads, your browser connects directly to Adsterra. Its privacy notice says it may process technical data such as IP address, browser and device information, ad details, and usage data. Adsterra also describes its use of cookies and other technologies; the specific technologies may vary by ad or campaign.'}</p>
            <p className="flex flex-wrap gap-x-4 gap-y-1">
              <a className="text-emerald-700 underline dark:text-emerald-400" href="https://adsterra.com/privacy-policy-managed/" target="_blank" rel="noreferrer">{es ? 'Aviso de privacidad de Adsterra' : 'Adsterra Privacy Policy'}</a>
              <a className="text-emerald-700 underline dark:text-emerald-400" href="https://adsterra.com/cookies/" target="_blank" rel="noreferrer">{es ? 'Política de cookies de Adsterra' : 'Adsterra Cookies Policy'}</a>
            </p>
            <p>{es ? 'El sitio no incluye una opción para desactivar anuncios. La configuración del navegador o un bloqueador puede impedir que el anuncio se cargue; consulta las políticas de Adsterra para gestionar sus cookies y prácticas de datos.' : 'The site does not include an ad opt-out control. Browser settings or an ad blocker may prevent the ad from loading; see Adsterra’s policies for information about its cookies and data practices.'}</p>
          </div>
        </section>
      </div>

      <p className="mt-6 text-xs text-slate-500 dark:text-slate-400">
        {es ? 'No es asesoría legal. Borrador actualizado: 27 de septiembre de 2026.' : 'Not legal advice. Draft updated: September 27, 2026.'}
      </p>
    </div>
  );
}
