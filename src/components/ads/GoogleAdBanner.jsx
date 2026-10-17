import React, { useEffect, useRef, useState } from 'react';
import { GOOGLE_PUBLISHER, GOOGLE_SLOT, requestGoogleAd, reopenGooglePrivacy } from '@/lib/googleAds';

export default function GoogleAdBanner({ language = 'en' }) {
  const slot = useRef(null);
  const [privacyReady, setPrivacyReady] = useState(false);
  useEffect(() => requestGoogleAd(slot.current, setPrivacyReady), []);
  const es = language === 'es';
  return (
    <aside aria-label={es ? 'Publicidad' : 'Advertisement'} className="w-full my-6 border-t border-slate-200 pt-4">
      <p className="mb-2 text-center text-[10px] uppercase tracking-wider text-slate-400">{es ? 'Publicidad' : 'Advertisement'}</p>
      <div className="mx-auto min-h-[280px] w-full max-w-[970px] overflow-hidden">
        <ins ref={slot} className="adsbygoogle" style={{ display: 'block' }}
          data-ad-client={GOOGLE_PUBLISHER} data-ad-slot={GOOGLE_SLOT}
          data-ad-format="auto" data-full-width-responsive="true" />
      </div>
      {privacyReady && <button type="button" onClick={reopenGooglePrivacy}
        className="mx-auto mt-4 block min-h-11 text-xs text-slate-500 underline underline-offset-2">
        {es ? 'Configuración de privacidad y cookies' : 'Privacy & cookie settings'}
      </button>}
    </aside>
  );
}
