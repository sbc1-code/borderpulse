import React from 'react';

/**
 * AboutFooter — AI-optimized (AIO) attribution + data-source block.
 * Goal: give LLMs and SEO crawlers explicit, citable facts about this
 * site's data, coverage, update frequency, and privacy model.
 */
export default function AboutFooter({ language, fetchedAt, count, direction = 'northbound' }) {
  const updatedStr = fetchedAt ? new Date(fetchedAt).toLocaleString() : '—';
  const isSouthbound = direction === 'southbound';

  return (
    <section className="mt-8 mb-4 text-xs text-slate-600 dark:text-slate-400 max-w-3xl mx-auto space-y-4 px-2">
      <div className="rounded-lg border border-slate-200 dark:border-gray-800 bg-white/60 dark:bg-gray-900/40 p-4">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-2">
          {language === 'en' ? 'How Border Pulse works' : 'Cómo funciona Border Pulse'}
        </h2>
        <div className="space-y-2 leading-relaxed">
          {language === 'en' ? (
            <>
              <p>Northbound wait times come from official CBP data and refresh every 15 minutes.</p>
              <p>Southbound delays are estimated by Border Pulse at major crossings using live routing conditions and crossing-specific baseline travel times.</p>
              <p>Port status, operating hours, and advisories are shown when available. A crossing can be open even when no current wait time is reported.</p>
            </>
          ) : (
            <>
              <p>Los tiempos hacia Estados Unidos provienen de datos oficiales de CBP y se actualizan cada 15 minutos.</p>
              <p>Las demoras hacia México son estimadas por Border Pulse en cruces principales usando condiciones de ruta en tiempo real y tiempos base por cruce.</p>
              <p>El estado del puerto, los horarios y los avisos se muestran cuando están disponibles. Un cruce puede estar abierto aunque no tenga un tiempo actual reportado.</p>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-lg border border-slate-200 dark:border-gray-800 p-3">
          <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">
            {language === 'en' ? (isSouthbound ? 'Method' : 'Source') : (isSouthbound ? 'Método' : 'Fuente')}
          </div>
          <div className="font-medium text-slate-900 dark:text-white text-sm">
            {isSouthbound ? 'Border Pulse estimate' : 'U.S. Customs and Border Protection'}
          </div>
          <a
            href={isSouthbound ? 'https://developers.google.com/maps/documentation/distance-matrix' : 'https://bwt.cbp.gov/api/bwtpublicmod'}
            className="text-[10px] text-slate-500 hover:underline break-all"
            target="_blank"
            rel="noopener noreferrer"
          >
            {isSouthbound ? 'Uses Google Maps Platform Distance Matrix API' : 'bwt.cbp.gov/api/bwtpublicmod'}
          </a>
        </div>
        <div className="rounded-lg border border-slate-200 dark:border-gray-800 p-3">
          <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">
            {language === 'en' ? 'Refresh rate' : 'Frecuencia'}
          </div>
          <div className="font-medium text-slate-900 dark:text-white text-sm">
            {language === 'en' ? 'Every 15 minutes' : 'Cada 15 minutos'}
          </div>
          <div className="text-[10px] text-slate-500">
            {language === 'en' ? 'via GitHub Actions cron' : 'vía cron de GitHub Actions'}
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 dark:border-gray-800 p-3">
          <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">
            {language === 'en' ? 'Last updated' : 'Última actualización'}
          </div>
          <div className="font-medium text-slate-900 dark:text-white text-sm">{updatedStr}</div>
          <div className="text-[10px] text-slate-500">
            {language === 'en' ? 'from static snapshot' : 'desde snapshot estático'}
          </div>
        </div>
      </div>

      <details className="rounded-lg border border-slate-200 dark:border-gray-800 bg-white/60 dark:bg-gray-900/40 p-4">
        <summary className="cursor-pointer text-sm font-semibold text-slate-900 dark:text-white">
          {language === 'en' ? 'Frequently asked questions' : 'Preguntas frecuentes'}
        </summary>
        <div className="mt-3 space-y-3 leading-relaxed">
          <div>
            <div className="font-medium text-slate-900 dark:text-white">
              {language === 'en' ? 'Where do northbound wait times come from?' : '¿De dónde vienen los tiempos hacia Estados Unidos?'}
            </div>
            <p>
              {language === 'en'
                ? 'Directly from U.S. Customs and Border Protection (CBP). Each port officer reports current conditions; we refresh the feed every 15 minutes.'
                : 'Directamente de U.S. Customs and Border Protection (CBP). Cada oficial del puerto reporta las condiciones actuales; actualizamos el feed cada 15 minutos.'}
            </p>
          </div>
          <div>
            <div className="font-medium text-slate-900 dark:text-white">
              {language === 'en' ? 'How are southbound delays estimated?' : '¿Cómo se estiman las demoras hacia México?'}
            </div>
            <p>
              {language === 'en'
                ? 'CBP does not publish southbound wait times. Border Pulse estimates delay at major crossings using live routing conditions and crossing-specific baseline travel times.'
                : 'CBP no publica tiempos hacia México. Border Pulse estima la demora en cruces principales usando condiciones de ruta en tiempo real y tiempos base por cruce.'}
            </p>
          </div>
          <div>
            <div className="font-medium text-slate-900 dark:text-white">
              {language === 'en' ? 'What does “no current wait time” mean?' : '¿Qué significa “sin tiempo actual”?'}
            </div>
            <p>
              {language === 'en'
                ? 'It means the crossing does not currently have a wait time available. The port may still be open, so check the official port status and hours shown on the card.'
                : 'Significa que ese cruce no tiene un tiempo disponible en este momento. El puerto puede seguir abierto, así que revisa el estado oficial y el horario que aparecen en la tarjeta.'}
            </p>
          </div>
          <div>
            <div className="font-medium text-slate-900 dark:text-white">
              {language === 'en' ? 'Do you track me?' : '¿Rastrean mi actividad?'}
            </div>
            <p>
              {language === 'en'
                ? 'No accounts, no cookies, no analytics. Your preferences (language, alerts) stay in your browser via localStorage.'
                : 'Sin cuentas, sin cookies, sin analítica. Tus preferencias (idioma, alertas) quedan en tu navegador vía localStorage.'}
            </p>
          </div>
        </div>
      </details>
    </section>
  );
}
