import { useEffect, useState } from 'react';

// Persistent language hook used by every page-level component. Reads the
// initial language from localStorage, then subscribes to storage events so
// pages stay in sync when the language toggle (in Layout's mobile header
// or desktop sidebar) dispatches one. Single source of truth — used to be
// inlined in 7+ pages, extracted 2026-05-09.
export function usePersistentLanguage() {
  const [lang, setLang] = useState(() => {
    if (typeof window === 'undefined') return 'en';
    return localStorage.getItem('borderPulse_language') || 'en';
  });
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === 'borderPulse_language' && e.newValue) setLang(e.newValue);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);
  return lang;
}
