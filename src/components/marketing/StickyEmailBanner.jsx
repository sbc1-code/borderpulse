import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { X, Mail } from 'lucide-react';
import EmailCapture from './EmailCapture';

const DISMISS_KEY = 'borderPulse_newsletterBanner_dismissedAt';
// Reappear after 30 days. Keeps the banner from being permanent visual debt
// while still nudging returning visitors who haven't signed up.
const SUPPRESS_MS = 30 * 24 * 60 * 60 * 1000;

function shouldShow(pathname) {
  if (pathname.startsWith('/embed/')) return false;
  if (pathname.startsWith('/status/')) return false;
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return true;
    const ts = Number(raw);
    if (!Number.isFinite(ts)) return true;
    return Date.now() - ts > SUPPRESS_MS;
  } catch {
    return true;
  }
}

export default function StickyEmailBanner({ language = 'en' }) {
  const location = useLocation();
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    // Defer first-paint so the LCP isn't blocked by the banner.
    const id = window.setTimeout(() => {
      if (shouldShow(location.pathname)) setVisible(true);
    }, 1500);
    return () => window.clearTimeout(id);
  }, [location.pathname]);

  if (!visible) return null;

  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch {}
    setVisible(false);
  };

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur-md shadow-lg dark:border-slate-800 dark:bg-slate-950/95"
      role="region"
      aria-label={language === 'en' ? 'Newsletter signup' : 'Suscripción al boletín'}
    >
      <div className="mx-auto flex max-w-[1100px] items-center gap-3 px-3 py-2 sm:px-4 sm:py-3">
        <Mail className="hidden h-4 w-4 shrink-0 text-emerald-600 sm:block" />
        <div className="min-w-0 flex-1">
          {!expanded ? (
            <p className="truncate text-xs text-slate-700 dark:text-slate-200 sm:text-sm">
              {language === 'en'
                ? 'Get the weekly Border Pulse: US-MX crossing data + cross-border ops intel.'
                : 'Recibe el Border Pulse semanal: datos de cruces EE.UU.-MX e inteligencia operativa.'}
            </p>
          ) : (
            <EmailCapture variant="banner" source="sticky-banner" language={language} compact />
          )}
        </div>
        {!expanded && (
          <button
            onClick={() => setExpanded(true)}
            className="shrink-0 rounded-lg bg-[#0b0b0b] px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-white dark:text-[#0b0b0b] dark:hover:bg-slate-200 sm:text-sm"
          >
            {language === 'en' ? 'Subscribe' : 'Suscribirme'}
          </button>
        )}
        <button
          onClick={dismiss}
          aria-label={language === 'en' ? 'Dismiss' : 'Cerrar'}
          className="shrink-0 rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
