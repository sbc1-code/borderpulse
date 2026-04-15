#!/usr/bin/env node
/**
 * Pulls southbound (US -> MX) delay estimates for major passenger crossings
 * using Google Maps Distance Matrix and writes public/data/crossings-sb.json.
 *
 * Method:
 *   - Query a short driving segment that approaches the border crossing from
 *     the US side and ends just south of the port.
 *   - Subtract a calibrated free-flow baseline for that segment.
 *   - Treat the remainder as an estimated border delay.
 *
 * This is intentionally labeled as an estimate. There is no official,
 * nationwide US -> MX wait-time feed.
 */
import fs from 'node:fs/promises';
import path from 'node:path';

const API_URL = 'https://maps.googleapis.com/maps/api/distancematrix/json';
const OUT_PATH = path.join(process.cwd(), 'public', 'data', 'crossings-sb.json');

const ROUTES = [
  {
    port_number: '250401',
    name: 'San Ysidro',
    state: 'CA',
    origin: '32.5607,-117.0309',
    destination: '32.5360,-117.0284',
    origin_label: 'I-5 approach north of San Ysidro',
    destination_label: 'Tijuana Centro just past the border',
    free_flow_minutes: 6,
  },
  {
    port_number: '250601',
    name: 'Otay Mesa',
    state: 'CA',
    origin: '32.5698,-116.9440',
    destination: '32.5480,-116.9395',
    origin_label: 'Otay Mesa Road approach',
    destination_label: 'Mesa de Otay just south of the port',
    free_flow_minutes: 7,
  },
  {
    port_number: '250501',
    name: 'Tecate',
    state: 'CA',
    origin: '32.5848,-116.6240',
    destination: '32.5707,-116.6220',
    origin_label: 'Tecate Road approach',
    destination_label: 'Tecate town center just south of the port',
    free_flow_minutes: 4,
  },
  {
    port_number: '240201',
    name: 'El Paso - Bridge of the Americas (BOTA)',
    state: 'TX',
    origin: '31.7718,-106.4825',
    destination: '31.7564,-106.4842',
    origin_label: 'US approach to BOTA',
    destination_label: 'Ciudad Juarez side of BOTA',
    free_flow_minutes: 5,
  },
  {
    port_number: '240202',
    name: 'El Paso - Paso Del Norte (PDN)',
    state: 'TX',
    origin: '31.7855,-106.4878',
    destination: '31.7750,-106.4890',
    origin_label: 'US approach to PDN',
    destination_label: 'Ciudad Juarez side of PDN',
    free_flow_minutes: 4,
  },
  {
    port_number: '240203',
    name: 'El Paso - Ysleta',
    state: 'TX',
    origin: '31.6645,-106.3255',
    destination: '31.6500,-106.3235',
    origin_label: 'US approach to Ysleta',
    destination_label: 'Ciudad Juarez side of Ysleta',
    free_flow_minutes: 5,
  },
  {
    port_number: '240801',
    name: 'Santa Teresa - Santa Teresa Port of Entry',
    state: 'NM',
    origin: '31.7935,-106.6902',
    destination: '31.7816,-106.6922',
    origin_label: 'US approach to Santa Teresa',
    destination_label: 'San Jeronimo side of the port',
    free_flow_minutes: 5,
  },
  {
    port_number: '230401',
    name: 'Laredo - Bridge I',
    state: 'TX',
    origin: '27.5058,-99.4938',
    destination: '27.4933,-99.4946',
    origin_label: 'US approach to Gateway to the Americas',
    destination_label: 'Nuevo Laredo side of Bridge I',
    free_flow_minutes: 4,
  },
  {
    port_number: '230402',
    name: 'Laredo - Bridge II',
    state: 'TX',
    origin: '27.5072,-99.5060',
    destination: '27.4970,-99.5080',
    origin_label: 'US approach to Juarez-Lincoln Bridge',
    destination_label: 'Nuevo Laredo side of Bridge II',
    free_flow_minutes: 4,
  },
  {
    port_number: '230403',
    name: 'Laredo - Colombia Solidarity',
    state: 'TX',
    origin: '27.6665,-99.7890',
    destination: '27.6498,-99.7912',
    origin_label: 'US approach to Colombia Solidarity Bridge',
    destination_label: 'Nuevo Leon side of Colombia Solidarity Bridge',
    free_flow_minutes: 5,
  },
  {
    port_number: '230501',
    name: 'Hidalgo/Pharr - Hidalgo',
    state: 'TX',
    origin: '26.1080,-98.2615',
    destination: '26.0955,-98.2640',
    origin_label: 'US approach to Hidalgo',
    destination_label: 'Reynosa side of Hidalgo bridge',
    free_flow_minutes: 4,
  },
  {
    port_number: '535504',
    name: 'Brownsville - Gateway',
    state: 'TX',
    origin: '25.9070,-97.4965',
    destination: '25.8958,-97.4978',
    origin_label: 'US approach to Brownsville Gateway',
    destination_label: 'Matamoros side of Gateway bridge',
    free_flow_minutes: 4,
  },
  {
    port_number: '535502',
    name: 'Brownsville - Veterans International',
    state: 'TX',
    origin: '25.9485,-97.4705',
    destination: '25.9372,-97.4722',
    origin_label: 'US approach to Veterans International',
    destination_label: 'Matamoros side of Veterans bridge',
    free_flow_minutes: 5,
  },
  {
    port_number: '230901',
    name: 'Progreso - Progreso International Bridge',
    state: 'TX',
    origin: '26.0784,-97.9482',
    destination: '26.0660,-97.9468',
    origin_label: 'US approach to Progreso bridge',
    destination_label: 'Nuevo Progreso side of the bridge',
    free_flow_minutes: 4,
  },
  {
    port_number: '260401',
    name: 'Nogales - Deconcini',
    state: 'AZ',
    origin: '31.3448,-110.9387',
    destination: '31.3345,-110.9398',
    origin_label: 'US approach to DeConcini',
    destination_label: 'Nogales, Sonora side of DeConcini',
    free_flow_minutes: 4,
  },
  {
    port_number: '260402',
    name: 'Nogales - Mariposa',
    state: 'AZ',
    origin: '31.3475,-110.9258',
    destination: '31.3340,-110.9268',
    origin_label: 'US approach to Mariposa',
    destination_label: 'Nogales, Sonora side of Mariposa',
    free_flow_minutes: 5,
  },
];

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const secondsToMinutes = (value) => Math.round(value / 60);

const statusFromDelay = (minutes) => {
  if (minutes == null) return 'unknown';
  if (minutes < 15) return 'good';
  if (minutes < 45) return 'moderate';
  return 'heavy';
};

async function writePayload(payload) {
  await fs.mkdir(path.dirname(OUT_PATH), { recursive: true });
  await fs.writeFile(OUT_PATH, JSON.stringify(payload, null, 2));
}

async function fetchRoute(route, apiKey, fetchedAt) {
  const url = new URL(API_URL);
  url.searchParams.set('origins', route.origin);
  url.searchParams.set('destinations', route.destination);
  url.searchParams.set('departure_time', 'now');
  url.searchParams.set('mode', 'driving');
  url.searchParams.set('traffic_model', 'best_guess');
  url.searchParams.set('units', 'imperial');
  url.searchParams.set('key', apiKey);

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'borderpulse.com/1.0 (static-fetch)',
    },
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  const doc = await res.json();
  if (doc.status !== 'OK') {
    throw new Error(`Distance Matrix status ${doc.status}`);
  }

  const element = doc.rows?.[0]?.elements?.[0];
  if (!element || element.status !== 'OK') {
    throw new Error(`Element status ${element?.status || 'missing'}`);
  }

  const liveSeconds = element.duration_in_traffic?.value ?? element.duration?.value;
  if (!Number.isFinite(liveSeconds)) {
    throw new Error('Missing duration value');
  }

  const liveRouteMinutes = secondsToMinutes(liveSeconds);
  const freeFlowMinutes = route.free_flow_minutes;
  const estimatedDelay = clamp(liveRouteMinutes - freeFlowMinutes, 0, 180);

  return {
    port_number: route.port_number,
    name: route.name,
    state: route.state,
    southbound_wait_time: estimatedDelay,
    status: statusFromDelay(estimatedDelay),
    updated_at: fetchedAt,
    live_route_minutes: liveRouteMinutes,
    free_flow_minutes: freeFlowMinutes,
    distance_meters: element.distance?.value ?? null,
    route_origin: route.origin_label,
    route_destination: route.destination_label,
    methodology: 'Estimated as live drive time minus a calibrated free-flow baseline on the southbound approach segment.',
  };
}

async function main() {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  const fetchedAt = new Date().toISOString();

  const empty = {
    source: 'Google Maps Distance Matrix (estimated southbound queue delay)',
    source_url: 'https://developers.google.com/maps/documentation/distance-matrix',
    fetched_at: fetchedAt,
    coverage: 'Major passenger crossings only',
    count: 0,
    crossings: [],
    note: apiKey
      ? 'GOOGLE_MAPS_API_KEY was set, but no southbound estimates were produced'
      : 'GOOGLE_MAPS_API_KEY env var not set — no southbound estimates ingested yet',
  };

  if (!apiKey) {
    await writePayload(empty);
    console.log('No GOOGLE_MAPS_API_KEY set — wrote empty southbound snapshot.');
    return;
  }

  const successes = [];
  const errors = [];

  for (const route of ROUTES) {
    try {
      const result = await fetchRoute(route, apiKey, fetchedAt);
      successes.push(result);
      console.log(`Fetched ${route.name}: ${result.southbound_wait_time} min`);
    } catch (error) {
      errors.push({
        port_number: route.port_number,
        name: route.name,
        error: error instanceof Error ? error.message : String(error),
      });
      console.warn(`Failed ${route.name}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  const payload = {
    source: 'Google Maps Distance Matrix (estimated southbound queue delay)',
    source_url: 'https://developers.google.com/maps/documentation/distance-matrix',
    fetched_at: fetchedAt,
    coverage: 'Major passenger crossings only',
    count: successes.length,
    crossings: successes,
    errors,
    note: 'Southbound values are Border Pulse estimates based on live routing conditions near the border, not an official government wait-time feed.',
  };

  await writePayload(payload);
  console.log(`Wrote ${successes.length} southbound estimates (${errors.length} failed) -> ${OUT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
