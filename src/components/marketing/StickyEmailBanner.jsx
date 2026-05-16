import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import EmailCapture from './EmailCapture';
import { usePersistentLanguage } from '@/lib/useLanguage';

const DISMISS_KEY = 'borderPulse_newsletterDismissedAt_v1';
const SUBSCRIBED_KEY = 'borderPulse_newsletterSubscribed_v1';
const DISMISS_COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const SHOW_AFTER_MS = 25_000; // ~25s before nagging anyone

function readDismissedAt() {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    return raw ? Number(raw) : 0;
  } catch {
    return 0;
  }
}

function hasSubscribed() {
  try {
    return localStorage.getItem(SUBSCRIBED_KEY) === '1';
  } catch {
    return false;
  }
}

export default function StickyEmailBanner() {
  const language = usePersistentLanguage();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (hasSubscribed()) return;
    const dismissedAt = readDismissedAt();
    if (dismissedAt && Date.now() - dismissedAt < DISMISS_COOLDOWN_MS) return;
    const t = setTimeout(() => setVisible(true), SHOW_AFTER_MS);
    return () => clearTimeout(t);
  }, []);

  // Watch for a successful subscribe inside the banner so we hide it immediately.
  useEffect(() => {
    if (!visible) return;
    const handler = () => setVisible(false);
    window.addEventListener('borderPulse:subscribed', handler);
    return () => window.removeEventListener('borderPulse:subscribed', handler);
  }, [visible]);

  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch {}
    setVisible(false);
  };

  if (!visible) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 px-3 pb-3 sm:px-4 sm:pb-4">
      <div className="mx-auto max-w-3xl relative">
        <button
          type="button"
          onClick={dismiss}
          aria-label={language === 'en' ? 'Dismiss' : 'Cerrar'}
          className="absolute right-2 top-2 z-10 inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-slate-500 shadow-sm hover:text-slate-900 dark:bg-gray-900/90 dark:text-slate-400 dark:hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
        <EmailCapture variant="banner" source="sticky-banner" language={language} />
      </div>
    </div>
  );
}
