import React, { useState, useCallback } from 'react';
import { Heart, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AdsterraBanner from './AdsterraBanner';

const SESSION_KEY = 'borderPulse_adConsent';

function getConsent() {
  try {
    return sessionStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

function setConsent(value) {
  try {
    sessionStorage.setItem(SESSION_KEY, value);
  } catch {
    // Private browsing or storage full - silent fail
  }
}

/**
 * AdConsentCard — opt-in ad experience.
 * Shows a support prompt; if the user enables ads, loads AdsterraBanner.
 * Consent is session-scoped (sessionStorage) so it resets each visit.
 * If dismissed, the prompt hides for the session.
 */
export default function AdConsentCard({ language = 'en' }) {
  const [status, setStatus] = useState(() => getConsent() || 'ask');

  const enable = useCallback(() => {
    setConsent('enabled');
    setStatus('enabled');
  }, []);

  const dismiss = useCallback(() => {
    setConsent('dismissed');
    setStatus('dismissed');
  }, []);

  // Dismissed: render nothing
  if (status === 'dismissed') return null;

  // Enabled: render the ad
  if (status === 'enabled') {
    return (
      <div className="w-full max-w-3xl mx-auto my-6">
        <AdsterraBanner
          label={language === 'en' ? 'Advertisement' : 'Publicidad'}
        />
        <div className="flex justify-center mt-1">
          <button
            onClick={dismiss}
            className="text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 underline decoration-dotted"
          >
            {language === 'en' ? 'Hide ads this session' : 'Ocultar anuncios esta sesión'}
          </button>
        </div>
      </div>
    );
  }

  // Default: show the opt-in prompt
  return (
    <div className="w-full max-w-3xl mx-auto my-6">
      <div className="relative rounded-lg border border-slate-200 dark:border-gray-800 bg-white/60 dark:bg-gray-900/40 px-4 py-3">
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          className="absolute top-2 right-2 p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-gray-800"
        >
          <X className="w-3.5 h-3.5" />
        </button>
        <div className="flex items-center gap-3 pr-6">
          <Heart className="w-5 h-5 text-slate-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-900 dark:text-white">
              {language === 'en' ? 'Support BorderPulse' : 'Apoya BorderPulse'}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              {language === 'en'
                ? 'Enable a single ad to help cover data and hosting costs. Safe for work, clearly labeled.'
                : 'Habilita un anuncio para cubrir costos de datos y hosting. Seguro, claramente marcado.'}
            </p>
          </div>
          <Button
            size="sm"
            onClick={enable}
            className="flex-shrink-0 text-xs h-8 px-4"
          >
            {language === 'en' ? 'Enable' : 'Habilitar'}
          </Button>
        </div>
      </div>
    </div>
  );
}
