import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Database, Mail, ShieldCheck, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { updatePageMeta, resetPageMeta } from '@/lib/seo';
import { usePersistentLanguage } from '@/lib/useLanguage';

export default function Privacy({ lang }) {
  const persistentLanguage = usePersistentLanguage();
  const language = lang || persistentLanguage;
  const es = language === 'es';

  useEffect(() => {
    const title = es ? 'Privacidad | Border Pulse' : 'Privacy | Border Pulse';
    const canonical = `https://borderpulse.com/${es ? 'privacidad' : 'privacy'}/`;
    const description = es
      ? 'Borrador de cómo Border Pulse maneja las preferencias públicas y los datos de cuenta de la beta Plus.'
      : 'Draft notice describing how Border Pulse handles public preferences and Plus beta account data.';
    updatePageMeta({ title, description, ogTitle: title, ogDescription: description, ogUrl: canonical, canonical });
    return () => resetPageMeta();
  }, [es]);

  const Section = ({ icon: Icon, title, children }) => (
    <section className="rounded-xl border border-slate-200 bg-white/80 p-4 dark:border-gray-700 dark:bg-gray-900/50 sm:p-5">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white"><Icon className="h-4 w-4 text-emerald-600" />{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-6 text-slate-700 dark:text-slate-300">{children}</div>
    </section>
  );

  return (
    <div className="mx-auto max-w-[900px] p-4 sm:p-6">
      <div className="mb-5"><Link to="/"><Button variant="ghost" size="sm" className="-ml-2 gap-1"><ArrowLeft className="h-3.5 w-3.5" />{es ? 'Todos los cruces' : 'All crossings'}</Button></Link></div>
      <header className="mb-6">
        <div className="mb-2 inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-900 dark:bg-amber-900/30 dark:text-amber-300">{es ? 'Borrador para revisión' : 'Draft for review'}</div>
        <h1 className="text-2xl font-bold text-slate-950 dark:text-white sm:text-3xl">{es ? 'Privacidad y datos' : 'Privacy and data'}</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{es ? 'Este aviso describe el diseño actual. Debe revisarse con la identidad legal, proveedores y jurisdicciones antes de activar cuentas o cobros.' : 'This notice describes the current design. It must be reviewed against the legal identity, vendors, and jurisdictions before accounts or billing are activated.'}</p>
      </header>

      <div className="space-y-4">
        <Section icon={Database} title={es ? 'Lo que usa el sitio público' : 'What the public site uses'}>
          <p>{es ? 'El panel público funciona sin cuenta. Puede guardar preferencias de idioma, tema y filtros en el almacenamiento local del navegador.' : 'The public dashboard works without an account. It may save language, theme, and filter preferences in the browser’s local storage.'}</p>
          <p>{es ? 'Los tiempos de espera provienen del feed público de U.S. Customs and Border Protection. Border Pulse no recibe documentos de viaje ni ubicación precisa.' : 'Wait times come from the public U.S. Customs and Border Protection feed. Border Pulse does not receive travel documents or precise location.'}</p>
        </Section>

        <Section icon={ShieldCheck} title={es ? 'Datos de una cuenta Plus propuesta' : 'Proposed Plus account data'}>
          <p>{es ? 'Si se activa la beta, la cuenta puede almacenar correo, idioma, zona horaria, cruces guardados, reglas de alerta y registros de entrega. Estos datos existen para sincronizar preferencias y enviar alertas solicitadas.' : 'If the beta is activated, the account may store email, language, timezone, saved crossings, alert rules, and delivery records. These data exist to sync preferences and send requested alerts.'}</p>
          <p>{es ? 'Supabase sería el proveedor de cuenta y almacenamiento; Stripe manejaría la suscripción; un proveedor transaccional de correo enviaría alertas. Ningún proveedor está conectado todavía.' : 'Supabase would provide account and storage; Stripe would handle subscriptions; a transactional email provider would send alerts. None is connected yet.'}</p>
        </Section>

        <Section icon={Mail} title={es ? 'Alertas y anuncios' : 'Alerts and advertising'}>
          <p>{es ? 'Las alertas serían opcionales y solo se evaluarían después de confirmar el consentimiento por correo. Se puede quitar el consentimiento desde la cuenta.' : 'Alerts would be opt-in and evaluated only after email consent is recorded. Consent can be removed from the account.'}</p>
          <p>{es ? 'Los anuncios públicos son opcionales y están desactivados por defecto. Plus se diseñó como una superficie sin anuncios.' : 'Public advertising is optional and disabled by default. Plus is designed as an ad-free surface.'}</p>
        </Section>

        <Section icon={Trash2} title={es ? 'Eliminación y retención' : 'Deletion and retention'}>
          <p>{es ? 'La cuenta incluirá una ruta para eliminarla. Antes de borrar una cuenta con una suscripción activa o en proceso, primero se debe cancelar la suscripción en el portal de facturación. La eliminación borra la cuenta y sus registros propios; Stripe puede conservar registros de transacciones cuando la ley lo exige.' : 'The account will include a deletion path. Before deleting an account with an active or processing subscription, the subscription must first be canceled in the billing portal. Deletion removes the account and its owned records; Stripe may retain transaction records when legally required.'}</p>
          <p>{es ? 'Los plazos exactos de retención, solicitudes de acceso, corrección y jurisdicciones son una puerta de revisión antes del lanzamiento.' : 'Exact retention periods, access and correction requests, and jurisdiction coverage remain launch-review gates.'}</p>
        </Section>
      </div>

      <p className="mt-6 text-xs text-slate-500 dark:text-slate-400">{es ? 'No es asesoría legal. Última revisión del borrador: 22 de septiembre de 2026.' : 'Not legal advice. Draft last reviewed: September 22, 2026.'}</p>
    </div>
  );
}
