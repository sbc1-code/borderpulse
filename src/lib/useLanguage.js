import { useEffect, useState } from 'react';
import { languageValue, readStorage } from './browserStorage.js';

// Retain a choice for this open document even when persistence is blocked.
let currentLanguage;

// Persistent language hook used by every page-level component. Reads the
// initial language from localStorage, then subscribes to storage events so
// pages stay in sync when the language toggle (in Layout's mobile header
// or desktop sidebar) dispatches one. Single source of truth — used to be
// inlined in 7+ pages, extracted 2026-05-09.
export function usePersistentLanguage() {
  const [lang, setLang] = useState(() => {
    if (typeof window === 'undefined') return 'en';
    currentLanguage ??= languageValue(readStorage('borderPulse_language'));
    return currentLanguage;
  });
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === 'borderPulse_language') {
        currentLanguage = languageValue(e.newValue);
        setLang(currentLanguage);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);
  return lang;
}
