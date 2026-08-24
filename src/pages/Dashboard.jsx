import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, Wifi, BarChart3, Share2, Search, X, Star, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import ExchangeRateWidget from '@/components/dashboard/ExchangeRateWidget';
import StatsOverview from '@/components/dashboard/StatsOverview';
import BorderCrossingCard from '@/components/dashboard/BorderCrossingCard';
import ShareModal from '@/components/dashboard/ShareModal';
const AnalyticsView = React.lazy(() => import('@/components/dashboard/AnalyticsView'));
import AboutFooter from '@/components/dashboard/AboutFooter';
import AdConsentCard from '@/components/ads/AdConsentCard';
import InstallPrompt from '@/components/dashboard/InstallPrompt';
import SkeletonCard from '@/components/dashboard/SkeletonCard';
import StaleDataBanner from '@/components/dashboard/StaleDataBanner';
import PopularCrossings from '@/components/dashboard/PopularCrossings';
import BorderLine from '@/components/dashboard/BorderLine';
import CommuterSnapshot from '@/components/dashboard/CommuterSnapshot';
import { dataService } from '@/components/utils/dataService';
import { recordSnapshot } from '@/components/utils/waitTimeHistory';
import { getWaitMinutes } from '@/components/utils/crossingDirection';
import { updatePageMeta } from '@/lib/seo';
import { buildSlugMap } from '@/lib/slugs';
import { track } from '@/lib/analytics';
import { findNearestCrossing, nearestCrossings } from '@/lib/geo';
import { usePersistentLanguage } from '@/lib/useLanguage';

const REGIONS = [
  { code: 'ALL', label: { en: 'All', es: 'Todos' } },
  { code: 'CA', label: { en: 'California', es: 'California' } },
  { code: 'AZ', label: { en: 'Arizona', es: 'Arizona' } },
  { code: 'NM', label: { en: 'New Mexico', es: 'Nuevo México' } },
  { code: 'TX', label: { en: 'Texas', es: 'Texas' } },
];

// Phones get the collapsed card list; the border spine is the orientation
// layer there. Matches Tailwind's `sm` breakpoint.
function useIsNarrow(breakpoint = 640) {
  const [narrow, setNarrow] = useState(
    () => (typeof window !== 'undefined' ? window.innerWidth < breakpoint : false)
  );
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const onChange = (e) => setNarrow(e.matches);
    setNarrow(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [breakpoint]);
  return narrow;
}

const regionLabelFor = (code, lang) => {
  const r = REGIONS.find((x) => x.code === code);
  return r ? (r.label[lang] || r.label.en) : '';
};

export default function Dashboard() {
  const [state, setState] = useState({
    crossings: [],
    exchangeRate: null,
    isLoading: true,
    isRefreshing: false,
    source: null,
    fetchedAt: null,
  });

  const language = usePersistentLanguage();
  const direction = 'northbound';
  const [region, setRegion] = useState(() => {
    // Stored region preference takes precedence; otherwise check the geolocation default.
    const stored = localStorage.getItem('borderPulse_region');
    if (stored) return stored;
    const geoDefault = localStorage.getItem('borderPulse_defaultRegion');
    if (geoDefault) return geoDefault;
    return 'ALL';
  });
  const [search, setSearch] = useState('');
  const [showWithoutCurrentWaits, setShowWithoutCurrentWaits] = useState(true);
  const [view, setView] = useState('live');
  const [focusedPort, setFocusedPort] = useState(null);
  const [showAllCards, setShowAllCards] = useState(false);
  const [typicalByPort, setTypicalByPort] = useState(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [showGeoPrompt, setShowGeoPrompt] = useState(false);
  const [geoLocating, setGeoLocating] = useState(false);
  const [favorites, setFavorites] = useState(() => {
    try {
      const stored = localStorage.getItem('borderPulse_favorites');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const toggleFavorite = useCallback((portNumber) => {
    setFavorites((prev) => {
      const next = prev.includes(portNumber)
        ? prev.filter((p) => p !== portNumber)
        : [...prev, portNumber];
      localStorage.setItem('borderPulse_favorites', JSON.stringify(next));
      // Analytics deliberately does NOT live in here. A state updater must be
      // safe to call more than once (StrictMode, concurrent re-render), and a
      // double-invoked updater would double-count the event.
      return next;
    });
  }, []);

  const handleToggleFavorite = useCallback((portNumber) => {
    const adding = !favoritesSetRef.current.has(portNumber);
    toggleFavorite(portNumber);
    track('favorite-toggle', { action: adding ? 'add' : 'remove' });
  }, [toggleFavorite]);

  const favoritesSet = useMemo(() => new Set(favorites), [favorites]);
  const favoritesSetRef = useRef(favoritesSet);
  useEffect(() => { favoritesSetRef.current = favoritesSet; }, [favoritesSet]);

  // 30-day medians for the ghost "typical" tick. One 8.6 KB request for all
  // ranked crossings, deliberately not 42 per-crossing aggregate fetches.
  useEffect(() => {
    let cancelled = false;
    fetch('/data/rankings.json')
      .then((r) => (r.ok ? r.json() : null))
      .then((doc) => {
        if (cancelled || !doc?.crossings) return;
        const byPort = {};
        for (const c of doc.crossings) {
          if (typeof c.overall_median === 'number') byPort[c.port_number] = c.overall_median;
        }
        setTypicalByPort(byPort);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const load = async () => {
    setState((s) => ({ ...s, isRefreshing: true }));
    const data = await dataService.getBorderData();
    setState({
      crossings: data.crossings || [],
      exchangeRate: data.exchange_rate,
      isLoading: false,
      isRefreshing: false,
      source: data.source,
      fetchedAt: data.timestamp,
    });
    try {
      recordSnapshot(data.crossings || [], 'northbound');
    } catch (e) {
      console.warn('[dashboard] snapshot error', e);
    }
  };

  useEffect(() => {
    load();
    dataService.startAutoRefresh(15 * 60 * 1000);
    return () => dataService.stopAutoRefresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Geolocation prompt for first-visit users (#7).
  // Skip if the user has explicitly denied, already chose a default region,
  // or already saved a region preference. Geolocation is only requested on
  // explicit click (one-tap consent), not silently.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const denied = localStorage.getItem('borderPulse_geoConsent') === 'denied';
    const defaultRegion = localStorage.getItem('borderPulse_defaultRegion');
    const savedRegion = localStorage.getItem('borderPulse_region');
    if (denied || defaultRegion || savedRegion) return;
    if (!('geolocation' in navigator)) return;
    setShowGeoPrompt(true);
  }, []);

  const dismissGeoPrompt = useCallback(() => {
    localStorage.setItem('borderPulse_geoConsent', 'denied');
    setShowGeoPrompt(false);
  }, []);

  const acceptGeoPrompt = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setShowGeoPrompt(false);
      return;
    }
    setGeoLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        // Keep a coarse fix so the collapsed mobile list can show "nearest".
        // Rounded to ~1km, stays in localStorage, never transmitted.
        try {
          localStorage.setItem(
            'borderPulse_geoCoords',
            JSON.stringify({ lat: Math.round(latitude * 100) / 100, lng: Math.round(longitude * 100) / 100 })
          );
        } catch { /* storage may be unavailable */ }
        const nearest = findNearestCrossing(state.crossings, latitude, longitude);
        if (nearest && nearest.state) {
          localStorage.setItem('borderPulse_defaultRegion', nearest.state);
          localStorage.setItem('borderPulse_region', nearest.state);
          setRegion(nearest.state);
        }
        setGeoLocating(false);
        setShowGeoPrompt(false);
      },
      () => {
        // Treat geolocation errors / user cancellation as a denial so we don't re-prompt.
        localStorage.setItem('borderPulse_geoConsent', 'denied');
        setGeoLocating(false);
        setShowGeoPrompt(false);
      },
      { timeout: 10000, maximumAge: 600000 },
    );
  }, [state.crossings]);

  useEffect(() => {
    const title = language === 'en'
      ? 'Border Pulse | Real-Time US-Mexico Border Wait Times'
      : 'Border Pulse | Tiempos de Espera Frontera EE.UU.-México en Tiempo Real';
    const description = language === 'en'
      ? 'Live wait times at US-Mexico border crossings. Official CBP data, refreshed regularly via a scheduled job. Bilingual EN/ES.'
      : 'Tiempos de espera en cruces fronterizos EE.UU.-México. Datos oficiales de CBP, actualizados con regularidad mediante un job programado. Bilingüe EN/ES.';
    updatePageMeta({
      title,
      description,
      ogTitle: title,
      ogDescription: description,
      ogUrl: 'https://borderpulse.com/',
      canonical: 'https://borderpulse.com/',
    });
  }, [language]);

  const changeRegion = (r) => {
    setRegion(r);
    localStorage.setItem('borderPulse_region', r);
    track('region-filter', { region: r });
  };

  // Map port_number → slug for /crossing/{slug} links and /data/aggregates/{slug}.json fetches.
  const portToSlug = useMemo(() => {
    if (!state.crossings.length) return {};
    return buildSlugMap(state.crossings).portToSlug;
  }, [state.crossings]);

  // Filter by region + search; then sort heaviest first, keep null waits last.
  const filteredCrossings = useMemo(() => {
    const q = search.trim().toLowerCase();
    return state.crossings.filter((c) => {
      if (region !== 'ALL' && c.state !== region) return false;
      if (!q) return true;
      const haystack = [c.name, c.port_name, c.crossing_name, c.state]
        .filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(q);
    });
  }, [state.crossings, region, search]);

  const sortedCrossings = useMemo(() => {
    return [...filteredCrossings].sort((a, b) => {
      const aFav = favoritesSet.has(a.port_number) ? 1 : 0;
      const bFav = favoritesSet.has(b.port_number) ? 1 : 0;
      if (aFav !== bFav) return bFav - aFav;
      const waitA = getWaitMinutes(a, direction);
      const waitB = getWaitMinutes(b, direction);
      if (waitA == null && waitB == null) return 0;
      if (waitA == null) return 1;
      if (waitB == null) return -1;
      return waitB - waitA;
    });
  }, [filteredCrossings, direction, favoritesSet]);

  const reportingCrossings = useMemo(
    () => sortedCrossings.filter((c) => getWaitMinutes(c, direction) != null),
    [sortedCrossings, direction],
  );
  const offlineCrossings = useMemo(
    () => sortedCrossings.filter((c) => getWaitMinutes(c, direction) == null),
    [sortedCrossings, direction],
  );
  const visibleCrossings = showWithoutCurrentWaits ? sortedCrossings : reportingCrossings;

  // On phones the full card list is ~18,000px of scroll AND one aggregate
  // fetch per card (BorderCrossingCard fetches its own). The spine above is
  // the orientation layer, so default to favorites + nearest + the heaviest
  // few and let the user opt into the rest.
  const isNarrow = useIsNarrow();
  const nearestPorts = useMemo(() => {
    if (!isNarrow) return [];
    let coords = null;
    try {
      const raw = localStorage.getItem('borderPulse_geoCoords');
      if (raw) coords = JSON.parse(raw);
    } catch { /* ignore malformed */ }
    if (!coords || typeof coords.lat !== 'number') return [];
    const self = { port_number: '__me__', lat: coords.lat, lng: coords.lng };
    return nearestCrossings(self, sortedCrossings, 3).map((n) => n.crossing.port_number);
  }, [isNarrow, sortedCrossings]);

  const cardCrossings = useMemo(() => {
    if (!isNarrow || showAllCards) return visibleCrossings;
    const keep = new Set(nearestPorts);
    if (focusedPort) keep.add(focusedPort);
    const picked = visibleCrossings.filter(
      (c) => favoritesSet.has(c.port_number) || keep.has(c.port_number)
    );
    for (const c of visibleCrossings) {
      if (picked.length >= 5) break;
      if (!picked.includes(c)) picked.push(c);
    }
    return picked;
  }, [isNarrow, showAllCards, visibleCrossings, favoritesSet, nearestPorts, focusedPort]);

  const hiddenCardCount = visibleCrossings.length - cardCrossings.length;

  // Tapping a tick pins that crossing's card and scrolls to it.
  const handleTickSelect = useCallback((portNumber) => {
    setFocusedPort(portNumber);
    track('borderline-select', { port: portNumber });
    requestAnimationFrame(() => {
      const el = document.getElementById(`crossing-${portNumber}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }, []);

  if (state.isLoading) {
    return (
      <div className="mx-auto w-full max-w-[1600px] overflow-x-hidden p-3 sm:p-4 lg:p-6 space-y-3">
        <div className="flex items-center gap-2 mb-4">
          <RefreshCw className="w-4 h-4 animate-spin text-slate-400" />
          <p className="text-sm text-slate-500">
            {language === 'en' ? 'Loading border data…' : 'Cargando datos fronterizos…'}
          </p>
        </div>
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1600px] overflow-x-hidden p-3 sm:p-4 lg:p-6">
      {/* Header */}
      <header className="mb-4 sm:mb-5">
        <motion.h1
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white"
        >
          {language === 'en' ? 'Border Crossing Intelligence' : 'Inteligencia de Cruces Fronterizos'}
        </motion.h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          {language === 'en'
            ? 'Official wait times to the U.S. · Historical patterns · Live CBP data'
            : 'Tiempos oficiales hacia EE.UU. · Patrones históricos · Datos en vivo de CBP'}
        </p>

        {/* Controls row — wraps cleanly on mobile */}
        <div className="flex items-center gap-2 flex-wrap mt-3">
          <div className="flex items-center gap-1 text-[11px] text-slate-500 mr-auto">
            <Wifi className="w-3 h-3 text-emerald-500" />
            <span>{language === 'en' ? 'Live' : 'En vivo'}</span>
          </div>
          <Button
            variant={view === 'analytics' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setView((v) => (v === 'analytics' ? 'live' : 'analytics'))}
            className="gap-1 h-9"
            aria-pressed={view === 'analytics'}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span className="text-xs">
              {view === 'analytics'
                ? (language === 'en' ? 'Live' : 'En vivo')
                : (language === 'en' ? 'Analytics' : 'Análisis')}
            </span>
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShareOpen(true)} className="gap-1 h-9">
            <Share2 className="w-3.5 h-3.5" />
            <span className="text-xs hidden sm:inline">
              {language === 'en' ? 'Share' : 'Compartir'}
            </span>
          </Button>
          <Button variant="outline" size="sm" onClick={load} disabled={state.isRefreshing} className="gap-1 h-9">
            <RefreshCw className={`w-3.5 h-3.5 ${state.isRefreshing ? 'animate-spin' : ''}`} />
            <span className="text-xs hidden sm:inline">
              {language === 'en' ? 'Refresh' : 'Actualizar'}
            </span>
          </Button>
        </div>
      </header>

      {/* Offline / stale data warning */}
      <StaleDataBanner fetchedAt={state.fetchedAt} language={language} />

      {view === 'analytics' ? (
        <Suspense
          fallback={
            <div className="flex items-center justify-center h-[40vh]">
              <div className="text-center">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-slate-400" />
                <p className="text-xs text-slate-500">
                  {language === 'en' ? 'Loading analytics...' : 'Cargando analisis...'}
                </p>
              </div>
            </div>
          }
        >
          <AnalyticsView crossings={filteredCrossings} language={language} direction={direction} />
        </Suspense>
      ) : (
        <>
          {/* Geolocation prompt — first-visit only (#7). One-tap consent. */}
          {showGeoPrompt && (
            <div className="mx-auto mb-3 flex w-full max-w-[calc(100vw-1.5rem)] flex-col gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 sm:max-w-3xl sm:flex-row sm:items-center sm:justify-between sm:gap-3">
              <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-700 min-w-0">
                <MapPin className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <span className="truncate">
                  {language === 'en'
                    ? '📍 Show crossings near you?'
                    : '📍 ¿Mostrar cruces cerca de ti?'}
                </span>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <Button
                  size="sm"
                  variant="default"
                  className="h-9 text-xs px-2.5"
                  onClick={acceptGeoPrompt}
                  disabled={geoLocating}
                >
                  {geoLocating
                    ? (language === 'en' ? 'Locating…' : 'Ubicando…')
                    : (language === 'en' ? 'Yes' : 'Sí')}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-9 text-xs px-2.5"
                  onClick={dismissGeoPrompt}
                >
                  {language === 'en' ? 'Not now' : 'Ahora no'}
                </Button>
              </div>
            </div>
          )}

          {/* Search + region filter */}
          <div className="mx-auto mb-4 flex w-full max-w-[calc(100vw-1.5rem)] flex-col items-stretch gap-2 sm:max-w-3xl sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="search"
                inputMode="search"
                placeholder={language === 'en' ? 'Search crossing or city (San Ysidro, Laredo, Nogales…)' : 'Buscar cruce o ciudad…'}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label={language === 'en' ? 'Search crossings by name or city' : 'Buscar cruces por nombre o ciudad'}
                className="w-full h-10 pl-9 pr-9 rounded-lg border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  aria-label="Clear search"
                  className="tap-44 absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-slate-100 dark:hover:bg-gray-800"
                >
                  <X className="w-3.5 h-3.5 text-slate-400" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-1.5 flex-wrap justify-center sm:justify-end">
              {REGIONS.map((r) => (
                <Button
                  key={r.code}
                  variant={region === r.code ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => changeRegion(r.code)}
                  className="h-11 shrink-0 px-3 text-xs"
                  aria-pressed={region === r.code}
                >
                  {r.label[language] || r.label.en}
                </Button>
              ))}
            </div>
          </div>

          <CommuterSnapshot
            crossings={filteredCrossings}
            selectedDirection={direction}
            language={language}
            regionLabel={regionLabelFor(region, language)}
          />

          {/* The border drawn to scale. Primary orientation layer: on small
              screens the card list below collapses behind it. */}
          <BorderLine
            crossings={filteredCrossings}
            direction={direction}
            language={language}
            favoritesSet={favoritesSet}
            typicalByPort={typicalByPort}
            focusedPort={focusedPort}
            onSelect={handleTickSelect}
          />

          {/* Wait list (left) + sidebar (right): stats + USD/MXN + alert banner. */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 lg:gap-6 mb-6">
            <div className="xl:col-span-9">
              {visibleCrossings.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="p-8 text-center text-sm text-slate-500">
                    {search
                      ? (language === 'en'
                        ? `No crossings match "${search}". Try a different name or clear the search.`
                        : `No hay cruces que coincidan con "${search}". Intenta otro nombre o limpia la búsqueda.`)
                      : offlineCrossings.length > 0
                        ? (language === 'en'
                          ? 'No crossings currently have published wait times in this region.'
                          : 'Ningún cruce tiene tiempos publicados en este momento en esta región.')
                        : (language === 'en'
                          ? 'No crossings in this region right now.'
                          : 'No hay cruces en esta región ahora.')}
                  </CardContent>
                </Card>
              ) : (
                <>
                  <div className="flex flex-col gap-1.5 mb-2 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
                    <p className="text-xs text-slate-500">
                      {language === 'en'
                        ? `Showing ${cardCrossings.length} of ${reportingCrossings.length + offlineCrossings.length}`
                        : `Mostrando ${cardCrossings.length} de ${reportingCrossings.length + offlineCrossings.length}`}
                      {region !== 'ALL' && ` · ${regionLabelFor(region, language)}`}
                      {search && ` · "${search}"`}
                    </p>
                    {offlineCrossings.length > 0 && (
                      <button
                        onClick={() => setShowWithoutCurrentWaits((value) => !value)}
                        className="self-start py-1.5 text-left text-xs text-slate-500 underline decoration-dotted hover:text-slate-900 dark:hover:text-white sm:self-auto sm:text-right"
                      >
                        {showWithoutCurrentWaits
                          ? (language === 'en'
                            ? `Hide ${offlineCrossings.length} without current waits`
                            : `Ocultar ${offlineCrossings.length} sin tiempo actual`)
                          : (language === 'en'
                            ? `Show ${offlineCrossings.length} without current waits`
                            : `Mostrar ${offlineCrossings.length} sin tiempo actual`)}
                      </button>
                    )}
                  </div>
                  {(() => {
                    const favCrossings = cardCrossings.filter((c) => favoritesSet.has(c.port_number));
                    const restCrossings = cardCrossings.filter((c) => !favoritesSet.has(c.port_number));
                    // Insert the compact "Get Alerted" banner after the first batch of cards
                    // so the first wait card is above the fold while the alert CTA still has prominence.
                    const INTERSTITIAL_AFTER = 6;
                    const restBeforeAlert = restCrossings.slice(0, INTERSTITIAL_AFTER);
                    const restAfterAlert = restCrossings.slice(INTERSTITIAL_AFTER);
                    return (
                      <>
                        {favCrossings.length > 0 && (
                          <>
                            <div className="flex items-center gap-2 mb-2 mt-1">
                              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                              <span className="text-xs font-medium text-slate-600">
                                {language === 'en' ? 'Favorites' : 'Favoritos'}
                              </span>
                              <div className="flex-1 h-px bg-slate-200" />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3 gap-3 sm:gap-4 mb-4">
                              {favCrossings.map((crossing, idx) => (
                                <div
                                  key={crossing.id || crossing.port_number}
                                  id={`crossing-${crossing.port_number}`}
                                  className="scroll-mt-24"
                                >
                                  <BorderCrossingCard
                                    crossing={crossing}
                                    language={language}
                                    index={idx}
                                    selectedDirection={direction}
                                    isFavorite={true}
                                    onToggleFavorite={handleToggleFavorite}
                                    slug={portToSlug[crossing.port_number] || crossing.slug}
                                    snapshotAt={state.fetchedAt}
                                  />
                                </div>
                              ))}
                            </div>
                          </>
                        )}
                        {favCrossings.length > 0 && restCrossings.length > 0 && (
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs font-medium text-slate-600">
                              {language === 'en' ? 'All crossings' : 'Todos los cruces'}
                            </span>
                            <div className="flex-1 h-px bg-slate-200" />
                          </div>
                        )}
                        <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3 gap-3 sm:gap-4">
                          {restBeforeAlert.map((crossing, idx) => (
                            <div
                              key={crossing.id || crossing.port_number}
                              id={`crossing-${crossing.port_number}`}
                              className="scroll-mt-24"
                            >
                              <BorderCrossingCard
                                crossing={crossing}
                                language={language}
                                index={idx}
                                selectedDirection={direction}
                                isFavorite={false}
                                onToggleFavorite={handleToggleFavorite}
                                slug={portToSlug[crossing.port_number] || crossing.slug}
                                snapshotAt={state.fetchedAt}
                              />
                            </div>
                          ))}
                        </div>
                        {restAfterAlert.length > 0 && (
                          <>
                            <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3 gap-3 sm:gap-4">
                              {restAfterAlert.map((crossing, idx) => (
                                <div
                                  key={crossing.id || crossing.port_number}
                                  id={`crossing-${crossing.port_number}`}
                                  className="scroll-mt-24"
                                >
                                  <BorderCrossingCard
                                    crossing={crossing}
                                    language={language}
                                    index={idx + INTERSTITIAL_AFTER}
                                    selectedDirection={direction}
                                    isFavorite={false}
                                    onToggleFavorite={handleToggleFavorite}
                                    slug={portToSlug[crossing.port_number] || crossing.slug}
                                    snapshotAt={state.fetchedAt}
                                  />
                                </div>
                              ))}
                            </div>
                          </>
                        )}
                      </>
                    );
                  })()}
                  {isNarrow && hiddenCardCount > 0 && (
                    <button
                      onClick={() => { setShowAllCards(true); track('show-all-crossings'); }}
                      className="mt-3 w-full rounded-lg border border-slate-200 dark:border-gray-700 py-3 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-gray-800"
                    >
                      {language === 'en'
                        ? `Show all ${visibleCrossings.length} crossings`
                        : `Ver los ${visibleCrossings.length} cruces`}
                    </button>
                  )}
                </>
              )}
            </div>

            {/* Sidebar: USD/MXN + stats. xl: shown to the right; mobile: stacked below. */}
            <aside className="xl:col-span-3 space-y-3">
              <ExchangeRateWidget exchangeRate={state.exchangeRate} language={language} theme="light" compact />
              <StatsOverview
                crossings={filteredCrossings}
                selectedDirection={direction}
                language={language}
                theme="light"
                regionLabel={regionLabelFor(region, language)}
                layout="sidebar"
              />
            </aside>
          </div>

          <PopularCrossings crossings={state.crossings} language={language} />

          <InstallPrompt language={language} />
          <AdConsentCard language={language} />

          <AboutFooter
            language={language}
            fetchedAt={state.fetchedAt}
            count={state.crossings.length}
            direction={direction}
          />
        </>
      )}

      <ShareModal
        open={shareOpen}
        onOpenChange={setShareOpen}
        crossings={sortedCrossings}
        language={language}
        direction={direction}
        portToSlug={portToSlug}
      />
    </div>
  );
}
