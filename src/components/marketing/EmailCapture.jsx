import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Loader2, Check } from 'lucide-react';
import { subscribe, drainQueue } from '@/lib/buttondown';

// Minimum gap between submit attempts on the same form. A trivial speed bump
// to keep a human (or impatient script) from hammering the third-party
// endpoint from our page. Buttondown does their own rate-limiting upstream;
// this is just defense in depth on our side.
const MIN_SUBMIT_INTERVAL_MS = 2000;

const COPY = {
  inline: {
    en: {
      headline: 'Get the weekly Border Pulse',
      sub: 'US-MX crossing data + cross-border ops intel. One email a week.',
      placeholder: 'your@email.com',
      cta: 'Subscribe',
      success: "You're on the list. First issue lands soon.",
    },
    es: {
      headline: 'Recibe el Border Pulse semanal',
      sub: 'Datos de cruces EE.UU.-MX e inteligencia transfronteriza. Un correo a la semana.',
      placeholder: 'tu@correo.com',
      cta: 'Suscribirme',
      success: 'Ya estás en la lista. Primer envío pronto.',
    },
  },
  footer: {
    en: {
      headline: 'Stay in the loop',
      sub: 'Weekly Border Pulse: US-MX crossing data + cross-border ops intel.',
      placeholder: 'your@email.com',
      cta: 'Get the newsletter',
      success: 'Subscribed. Watch for the next issue.',
    },
    es: {
      headline: 'Mantente al tanto',
      sub: 'Border Pulse semanal: datos de cruces EE.UU.-MX e inteligencia operativa.',
      placeholder: 'tu@correo.com',
      cta: 'Recibir newsletter',
      success: 'Suscrito. Atento al próximo envío.',
    },
  },
  banner: {
    en: {
      headline: 'Weekly Border Pulse',
      sub: 'US-MX crossing data + ops intel, every Monday.',
      placeholder: 'your@email.com',
      cta: 'Subscribe',
      success: "You're in.",
    },
    es: {
      headline: 'Border Pulse semanal',
      sub: 'Datos de cruces EE.UU.-MX cada lunes.',
      placeholder: 'tu@correo.com',
      cta: 'Suscribirme',
      success: 'Listo.',
    },
  },
};

export default function EmailCapture({
  variant = 'inline',
  source = 'unknown',
  language = 'en',
  className = '',
}) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  // Honeypot: hidden field bots tend to fill. Humans never see/touch it.
  const [hpUrl, setHpUrl] = useState('');
  const lastSubmitRef = useRef(0);

  // Best-effort flush of any localStorage queue on mount. Runs at most once
  // per page load — harmless if the queue is empty.
  useEffect(() => {
    drainQueue();
  }, []);

  const copy = (COPY[variant] || COPY.inline)[language] || (COPY[variant] || COPY.inline).en;
  const isCompact = variant === 'banner';

  const onSubmit = async (e) => {
    e.preventDefault();
    if (status === 'loading') return;
    // Honeypot tripped — silently pretend success so bots don't learn anything.
    if (hpUrl) {
      setStatus('success');
      return;
    }
    const now = Date.now();
    if (now - lastSubmitRef.current < MIN_SUBMIT_INTERVAL_MS) return;
    lastSubmitRef.current = now;
    setError(null);
    setStatus('loading');
    const result = await subscribe(email, { source, language, variant });
    if (!result.ok) {
      setError(language === 'en' ? 'Enter a valid email.' : 'Ingresa un correo válido.');
      setStatus('idle');
      return;
    }
    try { localStorage.setItem('borderPulse_newsletterSubscribed_v1', '1'); } catch {}
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('borderPulse:subscribed', { detail: { source, variant } }));
    }
    setStatus('success');
  };

  if (status === 'success') {
    return (
      <div
        className={`flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200 ${className}`}
        role="status"
      >
        <Check className="h-4 w-4 shrink-0" />
        <span>{copy.success}</span>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className={`rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-4 ${className}`}
      aria-label={copy.headline}
    >
      {!isCompact ? (
        <div className="mb-2 flex items-start gap-2">
          <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
            <Mail className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-900 dark:text-white">{copy.headline}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">{copy.sub}</div>
          </div>
        </div>
      ) : (
        <div className="mb-2 flex items-center gap-2">
          <Mail className="h-4 w-4 shrink-0 text-emerald-600" />
          <div className="min-w-0">
            <span className="text-sm font-semibold text-slate-900 dark:text-white">{copy.headline}</span>
            <span className="ml-2 hidden text-xs text-slate-500 dark:text-slate-400 sm:inline">{copy.sub}</span>
          </div>
        </div>
      )}
      {/* Honeypot. Hidden from sighted users + assistive tech; bots see and fill it. */}
      <div aria-hidden="true" style={{ position: 'absolute', left: '-10000px', top: 'auto', width: 1, height: 1, overflow: 'hidden' }}>
        <label htmlFor={`hp-url-${variant}-${source}`}>Website</label>
        <input
          id={`hp-url-${variant}-${source}`}
          type="text"
          name="hp_url"
          tabIndex={-1}
          autoComplete="off"
          value={hpUrl}
          onChange={(ev) => setHpUrl(ev.target.value)}
        />
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <label className="sr-only" htmlFor={`email-${variant}-${source}`}>
          {copy.placeholder}
        </label>
        <input
          id={`email-${variant}-${source}`}
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          placeholder={copy.placeholder}
          value={email}
          onChange={(ev) => setEmail(ev.target.value)}
          className="h-10 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
        />
        <button
          type="submit"
          disabled={status === 'loading'}
          className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-[#0b0b0b] px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60 dark:bg-white dark:text-[#0b0b0b] dark:hover:bg-slate-200"
        >
          {status === 'loading' ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {copy.cta}
        </button>
      </div>
      {error && (
        <div className="mt-2 text-xs text-rose-600 dark:text-rose-400" role="alert">
          {error}
        </div>
      )}
      <div className="mt-2 text-[11px] text-slate-400 dark:text-slate-500">
        {language === 'en' ? (
          <>
            No spam. Unsubscribe in one click. Your email is sent to{' '}
            <a
              href="https://buttondown.com/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-slate-700 dark:hover:text-slate-300"
            >
              Buttondown
            </a>
            , which delivers the newsletter.{' '}
            <Link to="/about#newsletter" className="underline hover:text-slate-700 dark:hover:text-slate-300">
              Details
            </Link>
            .
          </>
        ) : (
          <>
            Sin spam. Cancela con un clic. Tu correo se envía a{' '}
            <a
              href="https://buttondown.com/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-slate-700 dark:hover:text-slate-300"
            >
              Buttondown
            </a>
            , que entrega el newsletter.{' '}
            <Link to="/about#newsletter" className="underline hover:text-slate-700 dark:hover:text-slate-300">
              Detalles
            </Link>
            .
          </>
        )}
      </div>
    </form>
  );
}
