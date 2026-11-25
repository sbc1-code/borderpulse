import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  Building2,
  Check,
  Clock,
  Compass,
  Copy,
  ExternalLink,
  MapPin,
  RotateCcw,
  Star,
} from 'lucide-react';
import canadaFixture from '../../drafts/atlas-pilot/fixtures/canada.json';
import usFixture from '../../drafts/atlas-pilot/fixtures/us-lanes.json';
import mexicoFixture from '../../drafts/atlas-pilot/fixtures/mexico-directory.json';
import { subscribeToBorderData } from '@/lib/liveDataSubscription';
import { buildSlugMap } from '@/lib/slugs';
import { availableLaneWait } from '@/lib/crossingAvailability';
import { crossingDisplayName } from '@/lib/crossingNames';
import { getStatusForWait } from '@/components/utils/crossingDirection';
import { reportTimeLabel } from '@/lib/trustState';
import { readFavorites, readStorage, writeStorage } from '@/lib/browserStorage';
import { cityForPort } from '@/lib/sponsors';
import { updatePageMeta, resetPageMeta } from '@/lib/seo';
import { track } from '@/lib/analytics';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import styles from './Atlas.module.css';

const ATLAS_STATE_KEY = 'borderPulse_atlas_v1';
const RAD = Math.PI / 180;
const DEFAULT_VIEW = { lon: -99, lat: 36 };
const CA_VIEW = { lon: -122.7, lat: 49.0 };
const MX_VIEW = { lon: -105.0, lat: 30.0 };

const COPY = {
  en: {
    pageTitle: 'Crossing Atlas: US-Mexico & US-Canada Border Globe | Border Pulse',
    pageDesc:
      'Interactive two-country Crossing Atlas: live CBP US-Mexico wait times across 42 ports plus the Canada-US BC/Washington pilot.',
    h1: 'Crossing Atlas',
    subtitle: 'Explore US–Mexico live waits across 42 ports and the Washington–BC Canada pilot on one interactive globe.',
    allCrossings: 'All crossings',
    citiesLink: 'City directories',
    globeTitle: 'North America border globe',
    resetView: 'Reset view',
    dragHint: 'Drag or use arrow keys to rotate · Home resets · Tap any pin',
    sourceFoot: 'Natural Earth offline geometry · Zero passive API cost',
    savedLabel: 'Saved crossings',
    corridorLabel: 'Corridor',
    corridorMx: 'US – Mexico (42)',
    corridorCa: 'Canada – US (3 pilot)',
    crossingLabel: 'Select crossing',
    directionLabel: 'Direction',
    modeLabel: 'Vehicle / lane',
    intoCa: 'Into Canada',
    intoUs: 'Into United States',
    passenger: 'Passenger',
    commercial: 'Commercial',
    caCoverage: 'Three Washington–BC crossings paired across CBSA (Canada entry) and U.S. CBP (U.S. entry). Stale reports stay clearly labeled.',
    mxCoverage: '42 US–Mexico crossings backed by live CBP feeds (40 mapped pins; El Paso Downtown and San Luis II appear in the selector).',
    unknown: 'Unknown',
    noDelay: 'No delay (0–5m)',
    closed: 'Closed',
    na: 'Not applicable',
    old: 'old',
    liveLanes: 'Live northbound CBP lanes',
    standard: 'Standard',
    ready: 'Ready Lane',
    sentri: 'SENTRI',
    pedestrian: 'Pedestrian',
    noReport: 'No report',
    openFull: 'Open full report & cameras',
    bestTime: 'Best time to cross',
    localDir: (city) => `Local businesses in ${city}`,
    copyLink: 'Copy view link',
    copied: 'Link copied',
    openGmaps: 'Open in Google Maps',
    loadStreetMap: 'Load street-level approach map',
    mapsUnavailable: 'Street-level Google Maps unavailable right now; interactive globe remains active.',
    saveFav: (name) => `Save ${name} to favorites`,
    removeFav: (name) => `Remove ${name} from favorites`,
    caMarker: 'Canada – US',
    mxMarker: 'US – Mexico',
  },
  es: {
    pageTitle: 'Atlas de cruces: globo fronterizo EE.UU.-México y Canadá | Border Pulse',
    pageDesc:
      'Atlas interactivo de cruces en Norteamérica: esperas en vivo de CBP EE.UU.-México en 42 garitas y el piloto Canadá-EE.UU.',
    h1: 'Atlas de cruces',
    subtitle: 'Explora las esperas en vivo entre EE.UU. y México (42 garitas) y el piloto Canadá–EE.UU. en un solo globo interactivo.',
    allCrossings: 'Todos los cruces',
    citiesLink: 'Directorios por ciudad',
    globeTitle: 'Globo fronterizo de Norteamérica',
    resetView: 'Restablecer vista',
    dragHint: 'Arrastra o usa las flechas para rotar · Inicio restablece · Toca un punto',
    sourceFoot: 'Geografía sin conexión de Natural Earth · Costo pasivo de API $0',
    savedLabel: 'Cruces guardados',
    corridorLabel: 'Corredor',
    corridorMx: 'EE.UU. – México (42)',
    corridorCa: 'Canadá – EE.UU. (3 piloto)',
    crossingLabel: 'Elige un cruce',
    directionLabel: 'Dirección',
    modeLabel: 'Vehículo / carril',
    intoCa: 'Hacia Canadá',
    intoUs: 'Hacia Estados Unidos',
    passenger: 'Autos',
    commercial: 'Comercial',
    caCoverage: 'Tres cruces Washington–Columbia Británica con datos de CBSA (hacia Canadá) y CBP (hacia EE.UU.). Los reportes antiguos se etiquetan claro.',
    mxCoverage: '42 cruces entre EE.UU. y México con datos en vivo de CBP (40 pines en el globo; El Paso Downtown y San Luis II están en el selector).',
    unknown: 'Desconocido',
    noDelay: 'Sin demora (0–5m)',
    closed: 'Cerrado',
    na: 'No aplica',
    old: 'de antigüedad',
    liveLanes: 'Carriles CBP en vivo hacia EE.UU.',
    standard: 'Estándar',
    ready: 'Ready Lane',
    sentri: 'SENTRI',
    pedestrian: 'Peatones',
    noReport: 'Sin reporte',
    openFull: 'Abrir reporte completo y cámaras',
    bestTime: 'Mejor hora para cruzar',
    localDir: (city) => `Negocios locales en ${city}`,
    copyLink: 'Copiar enlace',
    copied: 'Enlace copiado',
    openGmaps: 'Abrir en Google Maps',
    loadStreetMap: 'Cargar mapa vial de acceso',
    mapsUnavailable: 'Mapa vial de Google Maps no disponible ahora; el globo sigue activo.',
    saveFav: (name) => `Guardar ${name} en favoritos`,
    removeFav: (name) => `Quitar ${name} de favoritos`,
    caMarker: 'Canadá – EE.UU.',
    mxMarker: 'EE.UU. – México',
  },
};

function pilotName(c) {
  if (c.id === 'douglas') return 'Douglas / Peace Arch';
  if (c.id === 'abbotsford-huntingdon') return 'Abbotsford-Huntingdon / Sumas';
  return c.name;
}

function formatCaObs(obs, fetchedAt, t) {
  if (!obs) return t.unknown;
  const ageMin = obs.reportedAt ? Math.round((Date.parse(fetchedAt) - Date.parse(obs.reportedAt)) / 60000) : null;
  if (obs.state === 'stale') {
    const mins = ageMin != null ? ` · ${ageMin}m ${t.old}` : '';
    return `${t.unknown}${mins}`;
  }
  if ((obs.state === 'wait' || obs.state === 'reported_wait') && Number.isFinite(obs.minutes)) {
    return `${obs.minutes} min`;
  }
  if (obs.state === 'no_delay') return t.noDelay;
  if (obs.state === 'closed') return t.closed;
  if (obs.state === 'not_applicable') return t.na;
  return t.unknown;
}

function slugFromMxUrl(url) {
  const m = String(url || '').match(/\/crossing\/([^/]+)\/?$/);
  return m ? m[1] : null;
}

function waitBadgeClass(status) {
  if (status === 'good') return 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300';
  if (status === 'moderate') return 'bg-amber-50 text-amber-900 border-amber-200 dark:bg-gray-800 dark:text-amber-300';
  if (status === 'heavy') return 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-gray-800 dark:text-rose-300';
  return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-gray-800 dark:text-slate-300 dark:border-gray-700';
}

export default function Atlas({ lang = 'en' }) {
  const es = lang === 'es';
  const t = COPY[es ? 'es' : 'en'];
  const [searchParams, setSearchParams] = useSearchParams();

  const savedInitial = useMemo(() => {
    try {
      const raw = readStorage(ATLAS_STATE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }, []);

  const [corridor, setCorridor] = useState(() => {
    const q = searchParams.get('corridor');
    if (q === 'ca' || q === 'mx') return q;
    return savedInitial.corridor === 'ca' ? 'ca' : 'mx';
  });
  const [mxId, setMxId] = useState(() => {
    const q = searchParams.get('port');
    if (q && mexicoFixture.crossings.some((c) => c.id === q)) return q;
    if (savedInitial.mxId && mexicoFixture.crossings.some((c) => c.id === savedInitial.mxId)) return savedInitial.mxId;
    return '250401';
  });
  const [caId, setCaId] = useState(() => {
    const q = searchParams.get('port');
    if (q && canadaFixture.crossings.some((c) => c.id === q)) return q;
    if (savedInitial.caId && canadaFixture.crossings.some((c) => c.id === savedInitial.caId)) return savedInitial.caId;
    return 'abbotsford-huntingdon';
  });
  const [caDir, setCaDir] = useState(() => (savedInitial.caDir === 'US' ? 'US' : 'CA'));
  const [caMode, setCaMode] = useState(() => (savedInitial.caMode === 'commercial' ? 'commercial' : 'traveler'));

  const [liveData, setLiveData] = useState({ crossings: [], fetchedAt: null });
  const [favorites, setFavorites] = useState(readFavorites);
  const [copyMessage, setCopyMessage] = useState('');
  const [gmapsState, setGmapsState] = useState('idle'); // idle | loading | ready | error

  const canvasRef = useRef(null);
  const gmapContainerRef = useRef(null);
  const projectionRef = useRef({ ...(corridor === 'ca' ? CA_VIEW : MX_VIEW) });
  const animRef = useRef(0);
  const hitPointsRef = useRef([]);
  const markerCaRef = useRef(null);
  const markerMxRef = useRef(null);
  const textureRef = useRef(null);
  const diskRef = useRef(null);
  const samplesRef = useRef(null);
  const imageDataRef = useRef(null);
  const dragRef = useRef(null);

  useEffect(() => {
    const canonical = es ? 'https://borderpulse.com/es/atlas/' : 'https://borderpulse.com/atlas/';
    updatePageMeta({
      title: t.pageTitle,
      description: t.pageDesc,
      ogTitle: t.pageTitle,
      ogDescription: t.pageDesc,
      ogUrl: canonical,
      canonical,
      lang: es ? 'es' : 'en',
    });
    return () => resetPageMeta();
  }, [es, t.pageDesc, t.pageTitle]);

  useEffect(() => subscribeToBorderData((data) => {
    setLiveData({ crossings: data.crossings || [], fetchedAt: data.timestamp || null });
  }), []);

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === 'borderPulse_favorites') setFavorites(readFavorites());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  useEffect(() => {
    writeStorage(ATLAS_STATE_KEY, JSON.stringify({ corridor, mxId, caId, caDir, caMode }));
    const next = new URLSearchParams(searchParams);
    next.set('corridor', corridor);
    next.set('port', corridor === 'ca' ? caId : mxId);
    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true });
    }
  }, [corridor, mxId, caId, caDir, caMode, searchParams, setSearchParams]);

  const { portToSlug } = useMemo(
    () => (liveData.crossings.length ? buildSlugMap(liveData.crossings) : { portToSlug: {} }),
    [liveData.crossings],
  );
  const liveByPort = useMemo(
    () => new Map(liveData.crossings.map((c) => [String(c.port_number), c])),
    [liveData.crossings],
  );

  const selectedMx = useMemo(
    () => mexicoFixture.crossings.find((c) => c.id === mxId) || mexicoFixture.crossings[0],
    [mxId],
  );
  const selectedCa = useMemo(
    () => canadaFixture.crossings.find((c) => c.id === caId) || canadaFixture.crossings[0],
    [caId],
  );
  const selectedUs = useMemo(
    () => usFixture.crossings.find((c) => c.id === selectedCa.id) || null,
    [selectedCa.id],
  );

  const liveMx = liveByPort.get(String(selectedMx?.id));
  const mxSlug = portToSlug[selectedMx?.id] || slugFromMxUrl(selectedMx?.url);
  const mxCity = cityForPort(selectedMx?.id);
  const mxBasePath = es ? '/cruce' : '/crossing';
  const mxDetailHref = mxSlug ? `${mxBasePath}/${mxSlug}/` : null;
  const isFav = favorites.includes(String(selectedMx?.id));

  const savedMxItems = useMemo(() => {
    const byId = new Map(mexicoFixture.crossings.map((c) => [c.id, c]));
    return favorites.map((id) => byId.get(String(id))).filter(Boolean);
  }, [favorites]);

  const toggleFavorite = (portNumber) => {
    const id = String(portNumber);
    const exists = favorites.includes(id);
    const next = exists ? favorites.filter((p) => p !== id) : [...favorites, id];
    writeStorage('borderPulse_favorites', JSON.stringify(next));
    setFavorites(next);
    track('favorite-toggle', { port: id, action: exists ? 'remove' : 'add', source: 'atlas' });
  };

  const drawGlobe = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (!width || !height) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const targetW = Math.round(width * dpr);
    const targetH = Math.round(height * dpr);
    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const r = Math.min(height * 0.44, width * 0.39);
    const cx = width * 0.5;
    const cy = height * 0.5;
    const view = { width, height, r, cx, cy };

    const size = Math.max(120, Math.min(520, Math.ceil(r * 2 * Math.min(dpr, 1.3))));
    if (!diskRef.current) diskRef.current = document.createElement('canvas');
    const disk = diskRef.current;
    const diskCtx = disk.getContext('2d');
    if (disk.width !== size || !samplesRef.current) {
      disk.width = size;
      disk.height = size;
      imageDataRef.current = diskCtx.createImageData(size, size);
      const samples = [];
      const edge = size / 2;
      for (let py = 0; py < size; py++) {
        const y = 1 - (py + 0.5) / edge;
        for (let px = 0; px < size; px++) {
          const x = (px + 0.5) / edge - 1;
          const z2 = 1 - x * x - y * y;
          if (z2 <= 0) continue;
          const z = Math.sqrt(z2);
          const shade = 0.69 + 0.29 * z + 0.15 * y - 0.12 * x;
          samples.push([4 * (py * size + px), x, y, z, shade]);
        }
      }
      samplesRef.current = samples;
    }

    const proj = projectionRef.current;
    const project = (lon, lat) => {
      const phi = lat * RAD;
      const center = proj.lat * RAD;
      const delta = (lon - proj.lon) * RAD;
      const cosLat = Math.cos(phi);
      const sinLat = Math.sin(phi);
      const local = cosLat * Math.cos(delta);
      return {
        x: view.cx + view.r * cosLat * Math.sin(delta),
        y: view.cy - view.r * (Math.cos(center) * sinLat - Math.sin(center) * local),
        visible: Math.sin(center) * sinLat + Math.cos(center) * local > 0.025,
      };
    };

    ctx.strokeStyle = 'rgba(148,163,184,0.28)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, r + 5, 0, Math.PI * 2);
    ctx.stroke();

    const tex = textureRef.current;
    if (tex && samplesRef.current && imageDataRef.current) {
      const cLat = proj.lat * RAD;
      const cosC = Math.cos(cLat);
      const sinC = Math.sin(cLat);
      const out = imageDataRef.current.data;
      const { pixels, w: pw, h: ph } = tex;
      for (const [idx, x, y, z, shade] of samplesRef.current) {
        const y2 = y * cosC + z * sinC;
        const z2 = z * cosC - y * sinC;
        const pLat = Math.asin(Math.max(-1, Math.min(1, y2))) / RAD;
        let pLon = proj.lon + Math.atan2(x, z2) / RAD;
        pLon = ((pLon + 540) % 360) - 180;
        const u = Math.min(pw - 1, Math.max(0, Math.floor(((pLon + 180) / 360) * pw)));
        const v = Math.min(ph - 1, Math.max(0, Math.floor(((90 - pLat) / 180) * ph)));
        const s = 4 * (v * pw + u);
        out[idx] = Math.min(255, pixels[s] * shade);
        out[idx + 1] = Math.min(255, pixels[s + 1] * shade);
        out[idx + 2] = Math.min(255, pixels[s + 2] * shade);
        out[idx + 3] = 255;
      }
      diskCtx.putImageData(imageDataRef.current, 0, 0);
      ctx.drawImage(disk, cx - r, cy - r, r * 2, r * 2);
    } else {
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();

    const hits = [];
    for (const port of mexicoFixture.crossings) {
      if (!Number.isFinite(port.lat) || !Number.isFinite(port.lon)) continue;
      const pt = project(port.lon, port.lat);
      if (!pt.visible) continue;
      hits.push({ ...pt, id: port.id });
      const active = corridor === 'mx' && mxId === port.id;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, active ? 5.2 : 2.3, 0, Math.PI * 2);
      ctx.fillStyle = active ? '#34d399' : '#f1f5f9';
      ctx.fill();
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    hitPointsRef.current = hits;

    const centers = [
      ['ca', CA_VIEW, markerCaRef.current],
      ['mx', MX_VIEW, markerMxRef.current],
    ];
    for (const [, center, node] of centers) {
      if (!node) continue;
      const pt = project(center.lon, center.lat);
      node.hidden = !pt.visible;
      if (pt.visible) {
        const flip = pt.x + 120 > width;
        node.style.left = `${pt.x}px`;
        node.style.top = `${pt.y}px`;
        node.style.flexDirection = flip ? 'row-reverse' : 'row';
        node.style.transform = flip ? 'translate(calc(-100% + 7px), -50%)' : 'translate(-7px, -50%)';
      }
    }
  }, [corridor, mxId]);

  const animateTo = useCallback((targetLon, targetLat) => {
    cancelAnimationFrame(animRef.current);
    const reduce = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      projectionRef.current = { lon: targetLon, lat: targetLat };
      drawGlobe();
      return;
    }
    const start = { ...projectionRef.current };
    const startTs = performance.now();
    const step = (now) => {
      const p = Math.min(1, (now - startTs) / 360);
      const ease = 1 - (1 - p) ** 3;
      projectionRef.current = {
        lon: start.lon + (targetLon - start.lon) * ease,
        lat: start.lat + (targetLat - start.lat) * ease,
      };
      drawGlobe();
      if (p < 1) animRef.current = requestAnimationFrame(step);
    };
    animRef.current = requestAnimationFrame(step);
  }, [drawGlobe]);

  useEffect(() => {
    let active = true;
    const img = new Image();
    img.onload = () => {
      if (!active) return;
      const off = document.createElement('canvas');
      off.width = img.width;
      off.height = img.height;
      const octx = off.getContext('2d');
      octx.drawImage(img, 0, 0);
      const imgData = octx.getImageData(0, 0, off.width, off.height);
      textureRef.current = { pixels: imgData.data, w: off.width, h: off.height };
      drawGlobe();
    };
    img.src = '/atlas-globe.png';
    return () => {
      active = false;
      cancelAnimationFrame(animRef.current);
    };
  }, [drawGlobe]);

  useEffect(() => {
    drawGlobe();
  }, [drawGlobe]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(() => drawGlobe());
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [drawGlobe]);

  const rotateBy = (dLon, dLat) => {
    cancelAnimationFrame(animRef.current);
    const cur = projectionRef.current;
    projectionRef.current = {
      lon: ((cur.lon + dLon + 540) % 360) - 180,
      lat: Math.max(-84, Math.min(84, cur.lat + dLat)),
    };
    drawGlobe();
  };

  const selectCorridor = (next) => {
    setCorridor(next);
    setGmapsState('idle');
    animateTo(next === 'ca' ? CA_VIEW.lon : MX_VIEW.lon, next === 'ca' ? CA_VIEW.lat : MX_VIEW.lat);
    track('atlas-corridor', { corridor: next });
  };

  const handleSelectMx = (id) => {
    setMxId(id);
    setCorridor('mx');
    setGmapsState('idle');
    const port = mexicoFixture.crossings.find((c) => c.id === id);
    if (port && Number.isFinite(port.lat) && Number.isFinite(port.lon)) {
      animateTo(port.lon, port.lat);
    }
  };

  const copyCurrentLink = async () => {
    const base = `https://borderpulse.com${es ? '/es/atlas/' : '/atlas/'}?corridor=${corridor}&port=${encodeURIComponent(corridor === 'ca' ? caId : mxId)}`;
    try {
      await navigator.clipboard?.writeText(base);
      setCopyMessage(t.copied);
      setTimeout(() => setCopyMessage(''), 2500);
      track('atlas-copy-link', { corridor });
    } catch {
      setCopyMessage(base);
    }
  };

  const loadStreetMap = () => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!apiKey || !Number.isFinite(selectedMx?.lat) || !Number.isFinite(selectedMx?.lon)) {
      setGmapsState('error');
      return;
    }
    setGmapsState('loading');
    const render = () => {
      try {
        const container = gmapContainerRef.current;
        if (!container || !window.google?.maps?.Map) throw new Error('Maps SDK missing');
        const center = { lat: selectedMx.lat, lng: selectedMx.lon };
        const map = new window.google.maps.Map(container, { center, zoom: 14, mapTypeControl: false, streetViewControl: false });
        new window.google.maps.Marker({ position: center, map, title: selectedMx.name });
        setGmapsState('ready');
      } catch {
        setGmapsState('error');
      }
    };
    if (window.google?.maps?.Map) {
      render();
      return;
    }
    const existing = document.getElementById('bp-gmaps-sdk');
    if (existing) {
      existing.addEventListener('load', render, { once: true });
      existing.addEventListener('error', () => setGmapsState('error'), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.id = 'bp-gmaps-sdk';
    script.async = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}`;
    script.onload = render;
    script.onerror = () => setGmapsState('error');
    document.head.appendChild(script);
  };

  const laneRows = useMemo(() => {
    if (!liveMx) return [];
    return [
      ['passenger_standard', t.standard],
      ['passenger_ready', t.ready],
      ['passenger_sentri', t.sentri],
      ['pedestrian_standard', t.pedestrian],
      ['commercial_standard', t.commercial],
    ].map(([key, label]) => {
      const wait = availableLaneWait(liveMx, key);
      const laneObj = liveMx.lanes?.[key];
      const status = wait == null ? 'unknown' : getStatusForWait(wait);
      return { key, label, wait, laneObj, status };
    });
  }, [liveMx, t]);

  const gmapsEnabled = Boolean(import.meta.env.VITE_GOOGLE_MAPS_API_KEY);
  const coordsUrl = Number.isFinite(selectedMx?.lat) && Number.isFinite(selectedMx?.lon)
    ? `https://www.google.com/maps/search/?api=1&query=${selectedMx.lat},${selectedMx.lon}`
    : null;

  return (
    <div className="mx-auto max-w-[1100px] p-3 sm:p-4 lg:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="ghost" size="sm" className="min-h-11 -ml-2">
            <Link to={es ? '/es/' : '/'}>{t.allCrossings}</Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="min-h-11 gap-1.5">
            <Link to={es ? '/ciudad/tijuana/' : '/city/tijuana/'}>
              <Building2 className="h-4 w-4" aria-hidden="true" />
              {t.citiesLink}
            </Link>
          </Button>
        </div>
        <Button variant="outline" size="sm" onClick={copyCurrentLink} className="min-h-11 gap-1.5">
          {copyMessage === t.copied ? <Check className="h-4 w-4 text-emerald-600" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
          <span>{copyMessage === t.copied ? t.copied : t.copyLink}</span>
        </Button>
      </div>
      {copyMessage && <p role="status" className="sr-only">{copyMessage}</p>}

      <header className="mb-5">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Compass className="h-6 w-6 text-emerald-700 dark:text-emerald-400 shrink-0" aria-hidden="true" />
          <span>{t.h1}</span>
        </h1>
        <p className={`mt-1.5 text-sm text-slate-600 dark:text-slate-300 ${styles.subtitle}`}>{t.subtitle}</p>
      </header>

      {savedMxItems.length > 0 && (
        <section className="mb-4" aria-label={t.savedLabel}>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" aria-hidden="true" />
              {t.savedLabel}:
            </span>
            {savedMxItems.map((item) => {
              const live = liveByPort.get(item.id);
              const w = live ? availableLaneWait(live, 'passenger_standard') : null;
              const active = corridor === 'mx' && mxId === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectMx(item.id)}
                  aria-pressed={active}
                  className={`inline-flex min-h-11 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                    active
                      ? styles.activeChip
                      : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50 dark:border-gray-700 dark:bg-gray-900 dark:text-slate-200 dark:hover:bg-gray-800'
                  }`}
                >
                  <span>{item.name}</span>
                  {w != null && (
                    <span className={`tabular-nums ${styles.mutedVal}`}>· {w}m</span>
                  )}
                </button>
              );
            })}
          </div>
        </section>
      )}

      <div className={styles.workspace}>
        <section className={`rounded-xl overflow-hidden border border-slate-200 dark:border-gray-800 shadow-xs ${styles.globeCard}`}>
          <div className="flex items-center justify-between px-4 pt-3.5 pb-1 gap-2">
            <h2 className="text-sm font-semibold text-white">{t.globeTitle}</h2>
            <button
              type="button"
              onClick={() => animateTo(DEFAULT_VIEW.lon, DEFAULT_VIEW.lat)}
              className={`inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-emerald-500 ${styles.resetBtn}`}
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              {t.resetView}
            </button>
          </div>

          <div className={styles.stage}>
            <canvas
              ref={canvasRef}
              tabIndex={0}
              role="img"
              aria-label={t.globeTitle}
              className={`${styles.canvas} focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-emerald-500`}
              onPointerDown={(e) => {
                if (e.button !== 0 || dragRef.current) return;
                dragRef.current = { id: e.pointerId, x: e.clientX, y: e.clientY, startX: e.clientX, startY: e.clientY, moved: false };
                e.currentTarget.setPointerCapture(e.pointerId);
              }}
              onPointerMove={(e) => {
                const d = dragRef.current;
                if (!d || d.id !== e.pointerId) return;
                const dx = e.clientX - d.x;
                const dy = e.clientY - d.y;
                if (Math.hypot(e.clientX - d.startX, e.clientY - d.startY) > 4) d.moved = true;
                if (d.moved) {
                  const r = Math.max(80, Math.min(e.currentTarget.clientHeight * 0.44, e.currentTarget.clientWidth * 0.39));
                  rotateBy((-dx * 65) / r, (dy * 65) / r);
                }
                d.x = e.clientX;
                d.y = e.clientY;
              }}
              onPointerUp={(e) => {
                const d = dragRef.current;
                if (!d || d.id !== e.pointerId) return;
                const moved = d.moved;
                dragRef.current = null;
                if (moved) return;
                const rect = e.currentTarget.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                let nearest = null;
                let best = 14;
                for (const pt of hitPointsRef.current) {
                  const dist = Math.hypot(x - pt.x, y - pt.y);
                  if (dist < best) {
                    best = dist;
                    nearest = pt;
                  }
                }
                if (nearest) handleSelectMx(nearest.id);
              }}
              onPointerCancel={() => { dragRef.current = null; }}
              onLostPointerCapture={() => { dragRef.current = null; }}
              onKeyDown={(e) => {
                const moves = { ArrowLeft: [-12, 0], ArrowRight: [12, 0], ArrowUp: [0, 10], ArrowDown: [0, -10] };
                if (moves[e.key]) {
                  e.preventDefault();
                  rotateBy(...moves[e.key]);
                } else if (e.key === 'Home') {
                  e.preventDefault();
                  animateTo(DEFAULT_VIEW.lon, DEFAULT_VIEW.lat);
                }
              }}
            />

            <button
              ref={markerCaRef}
              type="button"
              onClick={() => selectCorridor('ca')}
              aria-pressed={corridor === 'ca'}
              className="absolute flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap bg-transparent border-0 p-0 focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-emerald-500"
            >
              <span className={`w-3 h-3 rounded-full border-2 ${styles.dotBase} ${corridor === 'ca' ? styles.activeDot : 'bg-white'}`} />
              <span className={`rounded-md border px-2 py-1 shadow-xs ${corridor === 'ca' ? styles.activeChip : styles.inactiveMarker}`}>
                {t.caMarker}
              </span>
            </button>

            <button
              ref={markerMxRef}
              type="button"
              onClick={() => selectCorridor('mx')}
              aria-pressed={corridor === 'mx'}
              className="absolute flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap bg-transparent border-0 p-0 focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-emerald-500"
            >
              <span className={`w-3 h-3 rounded-full border-2 ${styles.dotBase} ${corridor === 'mx' ? styles.activeDot : 'bg-white'}`} />
              <span className={`rounded-md border px-2 py-1 shadow-xs ${corridor === 'mx' ? styles.activeChip : styles.inactiveMarker}`}>
                {t.mxMarker}
              </span>
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-xs text-slate-300 border-t border-gray-800">
            <span>{t.dragHint}</span>
            <span>{t.sourceFoot}</span>
          </div>
        </section>

        <Card className="border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          <CardContent className="p-4 sm:p-5 space-y-4">
            <div>
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">{t.corridorLabel}</p>
              <div className="grid grid-cols-2 gap-1.5 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-100 dark:bg-gray-800 p-1">
                <button
                  type="button"
                  aria-pressed={corridor === 'mx'}
                  onClick={() => selectCorridor('mx')}
                  className={`min-h-11 rounded-lg px-3 py-2 text-xs sm:text-sm font-semibold transition-colors ${
                    corridor === 'mx'
                      ? styles.activeChip
                      : 'text-slate-700 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-gray-800'
                  }`}
                >
                  {t.corridorMx}
                </button>
                <button
                  type="button"
                  aria-pressed={corridor === 'ca'}
                  onClick={() => selectCorridor('ca')}
                  className={`min-h-11 rounded-lg px-3 py-2 text-xs sm:text-sm font-semibold transition-colors ${
                    corridor === 'ca'
                      ? styles.activeChip
                      : 'text-slate-700 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-gray-800'
                  }`}
                >
                  {t.corridorCa}
                </button>
              </div>
              <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
                {corridor === 'ca' ? t.caCoverage : t.mxCoverage}
              </p>
            </div>

            {corridor === 'mx' ? (
              <div className="space-y-4">
                <div>
                  <label htmlFor="atlas-mx-select" className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    {t.crossingLabel}
                  </label>
                  <select
                    id="atlas-mx-select"
                    value={mxId}
                    onChange={(e) => handleSelectMx(e.target.value)}
                    className="w-full min-h-11 rounded-lg border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm font-medium text-slate-900 dark:text-slate-100"
                  >
                    {mexicoFixture.crossings.map((port) => (
                      <option key={port.id} value={port.id}>
                        {port.name} ({port.state})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="rounded-xl border border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-gray-800 p-3.5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug">
                        {liveMx ? crossingDisplayName(liveMx, lang) : selectedMx.name}
                      </h3>
                      <p className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                          {selectedMx.state}
                        </span>
                        {liveMx?.hours && (
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                            {liveMx.hours}
                          </span>
                        )}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleFavorite(selectedMx.id)}
                      aria-pressed={isFav}
                      aria-label={isFav ? t.removeFav(selectedMx.name) : t.saveFav(selectedMx.name)}
                      className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:bg-slate-100 dark:hover:bg-gray-800"
                    >
                      <Star className={`h-4 w-4 ${isFav ? 'fill-amber-400 text-amber-400' : 'text-slate-500 dark:text-slate-300'}`} />
                    </button>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2">{t.liveLanes}</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {laneRows.map((row) => (
                        <div key={row.key} className={`rounded-lg border px-2.5 py-2 ${waitBadgeClass(row.status)}`}>
                          <div className="text-[11px] font-medium truncate">{row.label}</div>
                          <div className="text-sm font-bold tabular-nums">
                            {row.wait == null ? '—' : `${row.wait} min`}
                          </div>
                        </div>
                      ))}
                    </div>
                    {liveMx?.lanes?.passenger_standard?.update_time && (
                      <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                        CBP: {reportTimeLabel(liveMx.lanes.passenger_standard, lang)}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  {mxDetailHref && (
                    <Button asChild className={`w-full min-h-11 justify-between ${styles.activeChip}`}>
                      <Link to={mxDetailHref} onClick={() => track('crossing-open', { slug: mxSlug, source: 'atlas' })}>
                        <span>{t.openFull}</span>
                        <ArrowRight className="h-4 w-4" aria-hidden="true" />
                      </Link>
                    </Button>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {mxSlug && (
                      <Button asChild variant="outline" size="sm" className="min-h-11 flex-1">
                        <Link to={`/best-time/${mxSlug}/`}>{t.bestTime}</Link>
                      </Button>
                    )}
                    {mxCity && (
                      <Button asChild variant="outline" size="sm" className="min-h-11 flex-1">
                        <Link to={`/${es ? 'ciudad' : 'city'}/${mxCity.id}/`}>{t.localDir(mxCity.name)}</Link>
                      </Button>
                    )}
                  </div>
                </div>

                {(coordsUrl || gmapsEnabled) && (
                  <div className="border-t border-slate-200 dark:border-gray-800 pt-3 space-y-2">
                    <div className="flex flex-wrap gap-2">
                      {gmapsEnabled && gmapsState === 'idle' && (
                        <Button type="button" variant="outline" size="sm" onClick={loadStreetMap} className="min-h-11 flex-1">
                          {t.loadStreetMap}
                        </Button>
                      )}
                      {coordsUrl && (
                        <Button asChild variant="ghost" size="sm" className="min-h-11 flex-1">
                          <a href={coordsUrl} target="_blank" rel="noopener noreferrer">
                            <span>{t.openGmaps}</span>
                            <ExternalLink className="h-3.5 w-3.5 ml-1.5" aria-hidden="true" />
                          </a>
                        </Button>
                      )}
                    </div>
                    {gmapsState === 'error' && (
                      <p role="status" className="text-xs text-slate-600 dark:text-slate-400">{t.mapsUnavailable}</p>
                    )}
                    <div
                      ref={gmapContainerRef}
                      hidden={gmapsState !== 'ready'}
                      className={`${styles.streetMap} rounded-lg border border-slate-200 dark:border-gray-700 overflow-hidden`}
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label htmlFor="atlas-ca-select" className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    {t.crossingLabel}
                  </label>
                  <select
                    id="atlas-ca-select"
                    value={caId}
                    onChange={(e) => setCaId(e.target.value)}
                    className="w-full min-h-11 rounded-lg border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm font-medium text-slate-900 dark:text-slate-100"
                  >
                    {canadaFixture.crossings.map((port) => (
                      <option key={port.id} value={port.id}>{pilotName(port)}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">{t.directionLabel}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      ['CA', t.intoCa, selectedCa.flows?.CA?.[caMode], canadaFixture.fetchedAt],
                      ['US', t.intoUs, selectedUs?.[caMode], usFixture.fetchedAt],
                    ].map(([code, label, obs, stamp]) => {
                      const active = caDir === code;
                      return (
                        <button
                          key={code}
                          type="button"
                          aria-pressed={active}
                          onClick={() => setCaDir(code)}
                          className={`min-h-11 rounded-xl border p-2.5 text-left transition-colors ${
                            active
                              ? 'border-emerald-700 bg-emerald-50 dark:border-emerald-500 dark:bg-emerald-900/30'
                              : 'border-slate-200 bg-white hover:bg-slate-50 dark:border-gray-700 dark:bg-gray-900 dark:hover:bg-gray-800'
                          }`}
                        >
                          <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">{label}</div>
                          <div className={`text-sm font-bold mt-0.5 ${obs?.state === 'stale' ? 'text-amber-700 dark:text-amber-400' : 'text-slate-900 dark:text-white'}`}>
                            {formatCaObs(obs, stamp, t)}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">{t.modeLabel}</p>
                  <div className="grid grid-cols-2 gap-1.5 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-100 dark:bg-gray-800 p-1">
                    {[
                      ['traveler', t.passenger],
                      ['commercial', t.commercial],
                    ].map(([val, label]) => (
                      <button
                        key={val}
                        type="button"
                        aria-pressed={caMode === val}
                        onClick={() => setCaMode(val)}
                        className={`min-h-11 rounded-lg px-3 py-1.5 text-xs font-semibold ${
                          caMode === val
                            ? styles.activeChip
                            : 'text-slate-700 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-gray-800'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-gray-800 p-3.5 text-xs text-slate-700 dark:text-slate-300 space-y-1">
                  <div className="font-semibold text-slate-900 dark:text-white">{selectedCa.location}</div>
                  <div>{caDir === 'CA' ? `CBSA (${selectedCa.rawTimestamp})` : `U.S. CBP · ${usFixture.laneType}`}</div>
                  <div className="text-slate-500 dark:text-slate-400">
                    {formatCaObs(caDir === 'CA' ? selectedCa.flows?.CA?.[caMode] : selectedUs?.[caMode], caDir === 'CA' ? canadaFixture.fetchedAt : usFixture.fetchedAt, t)}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
