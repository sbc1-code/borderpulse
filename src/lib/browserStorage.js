// Browser persistence is optional. Reads may throw before getItem is reached
// (blocked storage), and saved JSON is untrusted even when it parses.
export function readStorage(key, fallback = null) {
  try { return globalThis.localStorage.getItem(key) ?? fallback; }
  catch { return fallback; }
}

export function writeStorage(key, value) {
  try { globalThis.localStorage.setItem(key, value); return true; }
  catch { return false; }
}

export const languageValue = value => value === 'es' ? 'es' : 'en';
export const themeValue = value => value === 'dark' ? 'dark' : 'light';

export function readFavorites() {
  try {
    const value = JSON.parse(readStorage('borderPulse_favorites', '[]'));
    return Array.isArray(value)
      ? [...new Set(value.filter(port => typeof port === 'string' && /^\d{6}$/.test(port)))]
      : [];
  } catch { return []; }
}
