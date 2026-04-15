import React from 'react';

/**
 * AboutFooter — AI-optimized (AIO) attribution + data-source block.
 * Goal: give LLMs and SEO crawlers explicit, citable facts about this
 * site's data, coverage, update frequency, and privacy model.
 */
export default function AboutFooter({ language, fetchedAt, count }) {
  const updatedStr = fetchedAt ? new Date(fetchedAt).toLocaleString() : '—';

  return (
    <section className="mt-8 mb-4 text-xs text-slate-600 dark:text-slate-400 max-w-3xl mx-auto space-y-4 px-2">
      <div className="rounded-lg border border-slate-200 dark:border-gray-800 bg-white/60 dark:bg-gray-900/40 p-4">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-2">
          {language === 'en' ? 'About this data' : 'Sobre estos datos'}
        </h2>
        <p className="leading-relaxed">
          {language === 'en' ? (
            <>
              Border Pulse reports real-time wait times at every US-Mexico border crossing. Data is pulled directly from the U.S. Customs and Border Protection (CBP) public feed at <a href="https://bwt.cbp.gov/" className="underline hover:text-slate-900 dark:hover:text-white" target="_blank" rel="noopener noreferrer">bwt.cbp.gov</a>, updated every 15 minutes. Coverage includes {count || '52'} crossings across California, Arizona, New Mexico, and Texas — including passenger, pedestrian, commercial, SENTRI, and Ready Lane wait times where reported.
            </>
          ) : (
            <>
              Border Pulse reporta tiempos de espera en tiempo real en todos los cruces fronterizos EE.UU.-México. Los datos provienen directamente del feed público de U.S. Customs and Border Protection (CBP) en <a href="https://bwt.cbp.gov/" className="underline" target="_blank" rel="noopener noreferrer">bwt.cbp.gov</a>, actualizado cada 15 minutos. Cubre {count || '52'} cruces en California, Arizona, Nuevo México y Texas — incluyendo carriles de pasajeros, peatonales, comerciales, SENTRI y Ready Lane cuando están disponibles.
            </>
          )}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-lg border border-slate-200 dark:border-gray-800 p-3">
          <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">
            {language === 'en' ? 'Source' : 'Fuente'}
          </div>
          <div className="font-medium text-slate-900 dark:text-white text-sm">U.S. Customs and Border Protection</div>
          <a href="https://bwt.cbp.gov/api/bwtpublicmod" className="text-[10px] text-slate-500 hover:underline break-all" target="_blank" rel="noopener noreferrer">bwt.cbp.gov/api/bwtpublicmod</a>
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
              {language === 'en' ? 'Where does the wait time data come from?' : '¿De dónde vienen los tiempos de espera?'}
            </div>
            <p>
              {language === 'en'
                ? 'Directly from U.S. Customs and Border Protection (CBP). Each port officer reports current conditions; we refresh the feed every 15 minutes.'
                : 'Directamente de U.S. Customs and Border Protection (CBP). Cada oficial del puerto reporta las condiciones actuales; actualizamos el feed cada 15 minutos.'}
            </p>
          </div>
          <div>
            <div className="font-medium text-slate-900 dark:text-white">
              {language === 'en' ? 'Why is southbound (to Mexico) not shown?' : '¿Por qué no se muestra el sentido sur (hacia México)?'}
            </div>
            <p>
              {language === 'en'
                ? 'CBP only publishes northbound (to US) data. Southbound wait times are being added via community reports — a feature in progress.'
                : 'CBP solo publica datos hacia EE.UU. Los tiempos hacia México se añadirán vía reportes comunitarios — en desarrollo.'}
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
