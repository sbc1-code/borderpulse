import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Smartphone, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const DISMISS_KEY = 'borderPulse_installDismissed';
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function isDismissed() {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const ts = Number(raw);
    return Date.now() - ts < THIRTY_DAYS_MS;
  } catch {
    return false;
  }
}

function setDismissed() {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch {
    // Private browsing or storage full
  }
}

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  );
}

/**
 * InstallPrompt — PWA install banner.
 * Captures the `beforeinstallprompt` event and shows a dismissable card
 * inviting the user to add BorderPulse to their home screen.
 * Hidden for 30 days after dismiss/install, and never shown in standalone mode.
 */
export default function InstallPrompt({ language = 'en' }) {
  const deferredPrompt = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Never show if already installed or recently dismissed
    if (isStandalone() || isDismissed()) return;

    const handler = (e) => {
      e.preventDefault();
      deferredPrompt.current = e;
      setVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = useCallback(async () => {
    const prompt = deferredPrompt.current;
    if (!prompt) return;

    prompt.prompt();
    const result = await prompt.userChoice;

    // Whether accepted or dismissed, hide and record timestamp
    deferredPrompt.current = null;
    setVisible(false);
    setDismissed();

    if (result.outcome === 'accepted') {
      console.log('[InstallPrompt] App installed');
    }
  }, []);

  const handleDismiss = useCallback(() => {
    setVisible(false);
    setDismissed();
    deferredPrompt.current = null;
  }, []);

  if (!visible) return null;

  return (
    <div className="w-full max-w-3xl mx-auto my-6">
      <div className="relative rounded-lg border border-slate-200 dark:border-gray-800 bg-white/60 dark:bg-gray-900/40 px-4 py-3">
        <button
          onClick={handleDismiss}
          aria-label="Dismiss"
          className="absolute top-2 right-2 p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-gray-800"
        >
          <X className="w-3.5 h-3.5" />
        </button>
        <div className="flex items-center gap-3 pr-6">
          <Smartphone className="w-5 h-5 text-slate-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-900 dark:text-white">
              {language === 'en'
                ? 'Add BorderPulse to your home screen'
                : 'Agrega BorderPulse a tu pantalla de inicio'}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              {language === 'en'
                ? 'Quick access to real-time border wait times, no app store needed.'
                : 'Acceso rapido a tiempos de espera en la frontera, sin tienda de apps.'}
            </p>
          </div>
          <Button
            size="sm"
            onClick={handleInstall}
            className="flex-shrink-0 text-xs h-8 px-4"
          >
            {language === 'en' ? 'Install' : 'Instalar'}
          </Button>
        </div>
      </div>
    </div>
  );
}
