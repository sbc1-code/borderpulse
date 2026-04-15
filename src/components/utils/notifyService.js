/**
 * notifyService - per-crossing wait-time thresholds using the browser
 * Notification API. No backend, no SMS, no accounts. Persisted in
 * localStorage; evaluated on each data refresh from the Dashboard.
 */
const STORAGE_KEY = 'borderPulse_notifyPrefs_v1';
const LAST_FIRED_KEY = 'borderPulse_notifyFired_v1';
const COOLDOWN_MS = 60 * 60 * 1000; // 1 hour per (crossing, kind)

function read(key) {
  try { return JSON.parse(localStorage.getItem(key) || '{}'); } catch { return {}; }
}
function write(key, obj) {
  try { localStorage.setItem(key, JSON.stringify(obj)); } catch {}
}

export function getPrefs() { return read(STORAGE_KEY); }
export function getPrefForCrossing(id) { return read(STORAGE_KEY)[id] || null; }

export function setPref(id, pref) {
  const all = read(STORAGE_KEY);
  if (!pref) delete all[id]; else all[id] = pref;
  write(STORAGE_KEY, all);
}

export async function requestPermission() {
  if (!('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  return Notification.requestPermission();
}

export function permission() {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

function fire(id, kind, title, body) {
  const fired = read(LAST_FIRED_KEY);
  const key = `${id}:${kind}`;
  const last = fired[key] || 0;
  if (Date.now() - last < COOLDOWN_MS) return false;
  fired[key] = Date.now();
  write(LAST_FIRED_KEY, fired);
  try {
    new Notification(title, { body, icon: '/favicon.svg', tag: key });
  } catch (e) {
    console.warn('[notify] fire failed', e);
    return false;
  }
  return true;
}

export function evaluate(crossings, language = 'en') {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  const prefs = read(STORAGE_KEY);
  for (const c of crossings) {
    const id = c.port_number || c.id;
    const pref = prefs[id];
    if (!pref || !pref.active) continue;
    const wait = c.current_wait_time;
    if (wait == null) continue;

    if (pref.kind === 'below' && wait < pref.threshold) {
      fire(id, 'below',
        language === 'en' ? `${c.name}: wait dropped to ${wait} min` : `${c.name}: espera bajó a ${wait} min`,
        language === 'en' ? `Below your ${pref.threshold} min threshold` : `Bajo tu umbral de ${pref.threshold} min`);
    } else if (pref.kind === 'above' && wait > pref.threshold) {
      fire(id, 'above',
        language === 'en' ? `${c.name}: wait rose to ${wait} min` : `${c.name}: espera subió a ${wait} min`,
        language === 'en' ? `Above your ${pref.threshold} min threshold` : `Sobre tu umbral de ${pref.threshold} min`);
    }
  }
}
