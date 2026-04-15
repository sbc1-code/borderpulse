/**
 * dataService - reads static JSON snapshots published by the GitHub Action
 * fetch workflow (scripts/fetch-cbp.mjs). No auth, no entity API, no LLM.
 */
const DATA_PATH = '/data/crossings.json';
const FX_PATH = '/data/exchange-rate.json';

class DataService {
  constructor() {
    this.listeners = new Set();
    this.cache = null;
    this.refreshTimer = null;
  }

  addListener(fn) { this.listeners.add(fn); }
  removeListener(fn) { this.listeners.delete(fn); }
  notify(payload) {
    for (const fn of this.listeners) {
      try { fn(payload); } catch (e) { console.warn('listener failed', e); }
    }
  }

  async fetchJson(path) {
    const res = await fetch(`${path}?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${path}`);
    return res.json();
  }

  async getBorderData() {
    try {
      const [crossingsDoc, fxDoc] = await Promise.all([
        this.fetchJson(DATA_PATH),
        this.fetchJson(FX_PATH).catch(() => null),
      ]);
      const crossings = Array.isArray(crossingsDoc?.crossings) ? crossingsDoc.crossings : [];
      const payload = {
        success: true,
        crossings,
        exchange_rate: fxDoc || null,
        timestamp: crossingsDoc?.fetched_at || new Date().toISOString(),
        source: crossingsDoc?.source || 'CBP',
        fromFallback: false,
      };
      this.cache = payload;
      this.notify(payload);
      return payload;
    } catch (err) {
      console.warn('[dataService] fetch failed', err);
      const fallback = { success: false, crossings: [], exchange_rate: null, timestamp: new Date().toISOString(), source: 'fallback', fromFallback: true };
      this.notify(fallback);
      return fallback;
    }
  }

  async refreshBorderData() { return this.getBorderData(); }
  getFallbackData() { return { success: false, crossings: [], exchange_rate: null, timestamp: new Date().toISOString(), source: 'fallback', fromFallback: true }; }

  startAutoRefresh(intervalMs = 15 * 60 * 1000) {
    if (this.refreshTimer) return;
    this.refreshTimer = setInterval(() => this.getBorderData(), intervalMs);
  }
  stopAutoRefresh() {
    if (this.refreshTimer) { clearInterval(this.refreshTimer); this.refreshTimer = null; }
  }
}

export const dataService = new DataService();
