/**
 * dataService - reads static JSON snapshots published by the GitHub Action
 * fetch workflow (scripts/fetch-cbp.mjs). No auth, no entity API, no LLM.
 */
import { buildSlugMap } from '@/lib/slugs';

const DATA_PATH = '/data/crossings.json';
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

  async fetchJson(path) {
    const res = await fetch(`${path}?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${path}`);
    return res.json();
  }

  async getBorderData() {
    try {
      const [crossingsDoc, fxDoc, sbDoc] = await Promise.all([
        this.fetchJson(DATA_PATH),
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
