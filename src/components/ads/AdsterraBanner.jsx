import React, { useEffect, useRef } from 'react';

/**
 * AdsterraBanner — lazy-injects the Adsterra Native Banner script.
 * Container id + script URL come from the publisher dashboard at
 * https://beta.publishers.adsterra.com (account: sbecerra).
 *
 * Renders a stable <div id={containerId}> into which Adsterra's runtime
 * writes the ad. If the script is blocked (ad-blocker, network), the ad
 * simply doesn't render — nothing else breaks.
 */
// borderpulse.com Adsterra site 5724428, Native Banner placement 29055831.
const DEFAULT_CONTAINER = 'container-180a8c300ca7dd92be799ce6c11cd06a';
const DEFAULT_SCRIPT = 'https://pl29156330.profitableratecpmnetwork.com/180a8c300ca7dd92be799ce6c11cd06a/invoke.js';

export default function AdsterraBanner({
  containerId = DEFAULT_CONTAINER,
  scriptSrc = DEFAULT_SCRIPT,
  label = 'Advertisement',
  language = 'en',
}) {
  const hostRef = useRef(null);
  const injectedRef = useRef(false);

  useEffect(() => {
    if (injectedRef.current) return;
    if (!hostRef.current) return;
    injectedRef.current = true;

    const s = document.createElement('script');
    s.async = true;
    s.setAttribute('data-cfasync', 'false');
    s.src = scriptSrc;
    s.onerror = () => {
      // Silent fail — don't surface ad-network errors to users.
    };
    hostRef.current.appendChild(s);
  }, [scriptSrc]);

  return (
    <div className="w-full flex flex-col items-center my-6">
      <span className="text-[10px] uppercase tracking-wider text-slate-400 mb-1">{label}</span>
      <p className="mb-2 text-center text-[11px] text-slate-500">
        {language === 'en' ? 'Ads help support BorderPulse. Served by Adsterra.' : 'Los anuncios ayudan a mantener BorderPulse. Publicados por Adsterra.'}{' '}
        <a href={language === 'en' ? '/privacy/#advertising' : '/privacidad/#advertising'} className="underline underline-offset-2">
          {language === 'en' ? 'Privacy details' : 'Detalles de privacidad'}
        </a>
      </p>
      <div ref={hostRef} className="w-full flex justify-center">
        <div id={containerId} />
      </div>
    </div>
  );
}
