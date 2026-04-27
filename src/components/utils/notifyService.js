/**
 * notifyService - per-crossing wait-time thresholds using the browser
 * Notification API via ServiceWorker. No backend, no SMS, no accounts.
 * Persisted in localStorage; evaluated on each data refresh from Dashboard.
 *
 * Uses ServiceWorkerRegistration.showNotification() for mobile compatibility
 * (new Notification() is blocked on most mobile browsers).
 */
import { getStorageKey, getWaitMinutes } from '@/components/utils/crossingDirection';

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
export function getPrefForCrossing(id, direction = 'northbound') {
  const key = getStorageKey(id, direction);
  return key ? read(STORAGE_KEY)[key] || null : null;
}

export function setPref(id, pref, direction = 'northbound') {
  const key = getStorageKey(id, direction);
  if (!key) return;
  const all = read(STORAGE_KEY);
  if (!pref) delete all[key]; else all[key] = pref;
  write(STORAGE_KEY, all);
}

export async function requestPermission() {
  if (!('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  const result = await Notification.requestPermission();
  return result;
}

export function permission() {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

/**
 * Get active service worker registration for sending notifications.
 * Falls back to null if SW isn't available.
 */
async function getSwRegistration() {
  if (!('serviceWorker' in navigator)) return null;
  try {
    return await navigator.serviceWorker.ready;
  } catch {
    return null;
  }
}

/**
 * Show a notification via ServiceWorker (mobile-compatible) with fallback
 * to new Notification() for desktop browsers without SW.
 */
async function showNotification(title, options) {
  const reg = await getSwRegistration();
  if (reg) {
    try {
      await reg.showNotification(title, options);
      return true;
    } catch (e) {
      console.warn('[notify] SW showNotification failed, trying fallback', e);
    }
  }
  // Fallback for desktop without SW
  try {
    new Notification(title, options);
    return true;
  } catch (e) {
    console.warn('[notify] fallback Notification() also failed', e);
    return false;
  }
}

/**
 * Fire a notification for a crossing threshold event.
 * IMPORTANT: cooldown is only written AFTER the notification succeeds,
 * so a failed send won't silently block retries for the cooldown period.
 */
async function fire(id, kind, title, body) {
  const fired = read(LAST_FIRED_KEY);
  const key = `${id}:${kind}`;
  const last = fired[key] || 0;
  if (Date.now() - last < COOLDOWN_MS) return false;

  const sent = await showNotification(title, {
    body,
    icon: '/favicon.svg',
    tag: key,
    badge: '/favicon.svg',
    vibrate: [200, 100, 200],
    data: { crossingId: id, kind },
  });

  // Only record cooldown if the notification actually sent
  if (sent) {
    fired[key] = Date.now();
    write(LAST_FIRED_KEY, fired);
  }
  return sent;
}

/**
 * Evaluate all crossings against user prefs and fire notifications.
 * Called on each data refresh from Dashboard.
 */
export async function evaluate(crossings, language = 'en', direction = 'northbound') {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  const prefs = read(STORAGE_KEY);
  const prefKeys = Object.keys(prefs);
  if (prefKeys.length === 0) return; // no alerts configured, skip

  for (const c of crossings) {
    const id = getStorageKey(c.port_number || c.id, direction);
    const pref = id ? prefs[id] : null;
    if (!pref || !pref.active) continue;
    const wait = getWaitMinutes(c, direction);
    if (wait == null) continue;

    if (pref.kind === 'below' && wait < pref.threshold) {
      await fire(id, 'below',
        language === 'en' ? `${c.name}: wait dropped to ${wait} min` : `${c.name}: espera bajó a ${wait} min`,
        language === 'en' ? `Below your ${pref.threshold} min threshold` : `Bajo tu umbral de ${pref.threshold} min`);
    } else if (pref.kind === 'above' && wait > pref.threshold) {
      await fire(id, 'above',
        language === 'en' ? `${c.name}: wait rose to ${wait} min` : `${c.name}: espera subió a ${wait} min`,
        language === 'en' ? `Above your ${pref.threshold} min threshold` : `Sobre tu umbral de ${pref.threshold} min`);
    }
  }
}

/**
 * Get summary of active alerts for debugging / UI display.
 */
export function getActiveAlerts() {
  const prefs = read(STORAGE_KEY);
  return Object.entries(prefs)
    .filter(([, v]) => v && v.active)
    .map(([key, v]) => ({ key, ...v }));
}
