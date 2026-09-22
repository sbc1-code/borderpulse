/**
 * dataService - prefers the cached official-data function on Vercel, then
 * falls back to the static JSON snapshot used by GitHub Pages. No auth, no
 * entity API, no LLM.
 */
import { buildSlugMap } from '@/lib/slugs';

const DATA_PATH = '/data/crossings.json';
const LIVE_DATA_PATH = '/api/public/crossings';
const FX_PATH = '/data/exchange-rate.json';
const SB_PATH = '/data/crossings-sb.json';

function mergeSouthbound(crossingsDoc, sbDoc) {
  const crossings = Array.isArray(crossingsDoc?.crossings) ? crossingsDoc.crossings : [];
  const southboundRows = Array.isArray(sbDoc?.crossings) ? sbDoc.crossings : [];
  const southboundByPort = new Map(
    southboundRows.map((row) => [String(row.port_number), row]),
  );
  const { portToSlug } = buildSlugMap(crossings);

  return crossings.map((crossing) => {
    const southbound = southboundByPort.get(String(crossing.port_number));
    const northboundWait = typeof crossing.current_wait_time === 'number'
      ? crossing.current_wait_time
      : null;

    return {
      ...crossing,
      slug: portToSlug[crossing.port_number] || null,
      northbound_wait_time: northboundWait,
      southbound_wait_time: typeof southbound?.southbound_wait_time === 'number'
        ? southbound.southbound_wait_time
        : null,
      southbound_status: southbound?.status || null,
      southbound_updated_at: southbound?.updated_at || sbDoc?.fetched_at || null,
      southbound_live_route_minutes: southbound?.live_route_minutes ?? null,
      southbound_free_flow_minutes: southbound?.free_flow_minutes ?? null,
      southbound_route_origin: southbound?.route_origin || null,
      southbound_route_destination: southbound?.route_destination || null,
      southbound_methodology: southbound?.methodology || sbDoc?.note || null,
    };
  });
}

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

  async fetchJson(path, { cacheBust = true } = {}) {
    const url = cacheBust ? `${path}?t=${Date.now()}` : path;
    const res = await fetch(url, { cache: cacheBust ? 'no-store' : 'default' });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${path}`);
    return res.json();
  }

  async fetchCrossingsDoc() {
    try {
      // Vercel caches this response at the CDN for five minutes. Do not append
      // a timestamp here: a cache-busting query would turn every visitor into
      // an upstream CBP request and defeat the reliability/cost design.
      return await this.fetchJson(LIVE_DATA_PATH, { cacheBust: false });
    } catch {
      // GitHub Pages has no Function route, and the static snapshot remains a
      // deliberate last-good fallback if Vercel or CBP is unavailable.
      return this.fetchJson(DATA_PATH);
    }
  }

  async getBorderData() {
    try {
      const [crossingsDoc, fxDoc, sbDoc] = await Promise.all([
        this.fetchCrossingsDoc(),
        this.fetchJson(FX_PATH).catch(() => null),
        this.fetchJson(SB_PATH).catch(() => null),
      ]);
      const crossings = mergeSouthbound(crossingsDoc, sbDoc);
      const payload = {
        success: true,
        crossings,
        exchange_rate: fxDoc || null,
        timestamp: crossingsDoc?.fetched_at || new Date().toISOString(),
        source: crossingsDoc?.source || 'CBP',
        southbound_source: sbDoc?.source || null,
        southbound_timestamp: sbDoc?.fetched_at || null,
        southbound_note: sbDoc?.note || null,
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
