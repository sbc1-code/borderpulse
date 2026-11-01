import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight, History, LocateFixed, Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import BorderCrossingCard from './BorderCrossingCard';
import { borderHistorySnapshots, borderReportRows, cameraPoint, clusterBorderRows, fitBorderPoints, LOCATION_SOURCES, MAP_HEIGHT, MAP_WIDTH, projectBorderPoint, WHOLE_BORDER } from '@/lib/borderMap';
import { fetchLabel, reportTimeLabel } from '@/lib/trustState';
import { walkDriveFreshness } from '@/lib/walkDriveFreshness';
import { getStatusForWait } from '@/components/utils/crossingDirection';
import { getPortTimezone } from '@/components/utils/crossingMeta';
import { currentSearchParams } from '@/lib/queryState';
import { withLane, laneLabel } from '@/lib/laneContext';
import geography from './border-geography.json';
import './CrossingMapExplorer.css';
const countryPaths = geography.features.map(feature => ({
  ...feature.properties,
  path: feature.geometry.coordinates.map(poly => poly.map(ring => ring.map(([lng, lat], i) => {
    const p = projectBorderPoint(lng, lat);
    return `${i ? 'L' : 'M'}${p.x.toFixed(2)},${p.y.toFixed(2)}`;
  }).join(' ') + ' Z').join(' ')).join(' ')
}));
let archiveRequest;
function getArchive() {
  if (!archiveRequest) archiveRequest = fetch('/data/snapshot-history.json').then(r => {
    if (!r.ok) throw new Error('Archive unavailable');
    return r.json();
  }).then(borderHistorySnapshots).catch(error => {
    archiveRequest = null;
    throw error;
  });
  return archiveRequest;
}
const noSnapshot = {
  fetched_at: null,
  crossings: [],
  source: null
};
const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
// Interpolate the camera itself, so geometry, hit targets and inverse-sized
// labels use the same frame. A CSS scale tween with end-state label sizes
// makes markers briefly balloon when returning to the whole border.
function useSmoothCamera(target, direct) {
  const [painted, setPainted] = useState(target);
  const current = useRef(target);
  useEffect(() => {
    if (direct || reduced()) {
      current.current = target;
      setPainted(target);
      return;
    }
    const start = current.current;
    let frame, began;
    const paint = time => {
      began ??= time;
      const progress = Math.min(1, (time - began) / 180);
      const eased = reduced() ? 1 : 1 - (1 - progress) ** 3;
      const next = Object.fromEntries(['x', 'y', 'width', 'height'].map(key => [key, start[key] + (target[key] - start[key]) * eased]));
      current.current = next;
      setPainted(next);
      if (progress < 1 && eased < 1) frame = requestAnimationFrame(paint);
    };
    frame = requestAnimationFrame(paint);
    return () => cancelAnimationFrame(frame);
  }, [target, direct]);
  return direct || reduced() ? target : painted;
}
const clock = (value, language, zone = 'UTC') => value && Number.isFinite(Date.parse(value)) ? new Intl.DateTimeFormat(language === 'es' ? 'es-MX' : 'en-US', {
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  timeZone: zone,
  timeZoneName: 'short'
}).format(new Date(value)) : '—';
const labels = {
  en: {
    title: 'Explore the border',
    map: 'Border crossing map',
    list: 'Crossing results',
    latest: 'Latest reports',
    history: 'Recorded history',
    back: 'Back to results',
    all: 'All crossings',
    unlocated: 'Location not verified',
    approx: 'Facility overview · Approximate locations · Not directions',
    coverage: 'Sources and map coverage',
    noReport: 'No report',
    closed: 'Port closed',
    laneClosed: 'Lane closed',
    notRetained: 'Not recorded for this lane',
    minute: 'min',
    empty: 'No crossings match these filters.',
    historyNotice: 'Recorded observations · Not current conditions. Only Standard summary waits were retained; gaps remain missing.',
    clockMissing: 'The archive does not retain lane report clocks or lane counts.',
    failed: 'Recorded history unavailable.',
    retry: 'Retry history',
    loading: 'Loading recorded observations…'
  },
  es: {
    title: 'Explora la frontera',
    map: 'Mapa de cruces fronterizos',
    list: 'Resultados de cruces',
    latest: 'Últimos reportes',
    history: 'Historial registrado',
    back: 'Volver a resultados',
    all: 'Todos los cruces',
    unlocated: 'Ubicación no verificada',
    approx: 'Vista de recintos · Ubicaciones aproximadas · No son rutas',
    coverage: 'Fuentes y cobertura del mapa',
    noReport: 'Sin reporte',
    closed: 'Cruce cerrado',
    laneClosed: 'Carril cerrado',
    notRetained: 'No se registró este carril',
    minute: 'min',
    empty: 'No hay cruces con estos filtros.',
    historyNotice: 'Observaciones registradas · No son condiciones actuales. Solo se conservaron resúmenes de auto estándar; los datos faltantes siguen sin datos.',
    clockMissing: 'El archivo no conserva horas de reporte por carril ni número de carriles.',
    failed: 'Historial registrado no disponible.',
    retry: 'Reintentar historial',
    loading: 'Cargando observaciones registradas…'
  }
};
export default function CrossingMapExplorer({
  crossings,
  allCount,
  language,
  lane,
  fetchedAt,
  success,
  fromFallback,
  selectedPort,
  onSelect,
  onClose,
  onAll,
  onLaneChange,
  portToSlug,
  favoritesSet,
  onToggleFavorite,
  scopeKey,
  onDisplayChange,
  active = true
}) {
  const t = labels[language] || labels.en,
    es = language === 'es';
  const [params, setParams] = useSearchParams();
  const replay = params.get('mode') === 'history';
  const [history, setHistory] = useState({
      status: 'idle',
      rows: []
    }),
    [retry, setRetry] = useState(0);
  const [targetCamera, setCamera] = useState(WHOLE_BORDER),
    [size, setSize] = useState({
      width: 700,
      height: 430
    }),
    [dragging, setDragging] = useState(false);
  const camera = useSmoothCamera(targetCamera, dragging);
  const [offline, setOffline] = useState(() => !navigator.onLine),
    [, tick] = useState(0);
  const frameRef = useRef(null),
    svgRef = useRef(null),
    paneRef = useRef(null),
    backRef = useRef(null),
    returnFocus = useRef(null),
    previousSelection = useRef(undefined),
    selectionScope = useRef(scopeKey);
  const gesture = useRef({
    pointers: new Map()
  });
  const cssScale = Math.max(.1, Math.min(size.width / MAP_WIDTH, size.height / MAP_HEIGHT));
  const zoom = MAP_WIDTH / camera.width;
  useEffect(() => {
    const node = frameRef.current;
    if (!node) return;
    const measure = () => {
      const r = node.getBoundingClientRect();
      if (r.width && r.height) setSize({
        width: r.width,
        height: r.height
      });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const refresh = () => {
      setOffline(!navigator.onLine);
      tick(x => x + 1);
    };
    const timer = setInterval(refresh, 60000);
    window.addEventListener('online', refresh);
    window.addEventListener('offline', refresh);
    return () => {
      clearInterval(timer);
      window.removeEventListener('online', refresh);
      window.removeEventListener('offline', refresh);
    };
  }, []);
  useEffect(() => {
    if (!replay) return;
    let current = true;
    setHistory(s => ({
      ...s,
      status: 'loading'
    }));
    getArchive().then(rows => {
      if (current) setHistory({
        status: rows.length ? 'ready' : 'empty',
        rows
      });
    }, () => {
      if (current) setHistory({
        status: 'failed',
        rows: []
      });
    });
    return () => {
      current = false;
    };
  }, [replay, retry]);
  const index = history.rows.findIndex(row => row.fetched_at === params.get('at'));
  const unavailableInstant = replay && history.status === 'ready' && params.has('at') && index < 0;
  const selectedSnapshot = replay ? (params.get('at') ? history.rows[index] : history.rows.at(-1)) || noSnapshot : null;
  const activeIndex = selectedSnapshot ? Math.max(0, history.rows.indexOf(selectedSnapshot)) : 0;
  const rows = useMemo(() => borderReportRows(crossings, lane, selectedSnapshot), [crossings, lane, selectedSnapshot]);
  const selected = rows.find(row => row.id === selectedPort),
    hasRows = rows.length > 0;
  const mapped = rows.filter(row => row.point),
    reporting = rows.filter(row => row.wait != null).length;
  const freshness = walkDriveFreshness(fetchedAt);
  const trusted = !replay && freshness.usable && !offline && success !== false && !fromFallback;
  const locationLabel = location => ({
    'directory-target': es ? 'Punto aproximado de un enlace del directorio público; no es una entrada.' : 'Approximate target linked by the public directory; not an entrance.',
    'federal-facility': es ? 'Punto del recinto publicado en el Federal Register; no es una entrada.' : 'Facility point published in the Federal Register; not an entrance.',
    'gsa-facility': es ? `Recinto de EE.UU. aproximado según el inventario GSA (${location.locationAsset}); no es una entrada.` : `Approximate US facility from the GSA inventory (${location.locationAsset}); not an entrance.`,
    'contextual-limited': es ? 'Morley: posición contextual aproximada; revisión numérica limitada. Es un cruce distinto de DeConcini.' : 'Morley: approximate contextual position; numeric review is limited. This crossing is distinct from DeConcini.',
    'inherited-unverified': es ? 'Ubicación heredada del catálogo; sin verificación independiente.' : 'Inherited catalog location; not independently verified.'
  })[location.locationKind];
  const supportedLocations = mapped.filter(row => ['directory-target', 'federal-facility', 'gsa-facility'].includes(row.location.locationKind)).length;
  const limitedLocations = mapped.filter(row => row.location.locationKind === 'contextual-limited').length;
  const inheritedLocations = mapped.filter(row => row.location.locationKind === 'inherited-unverified').length;
  const stateLabel = row => row.reason === 'not_retained' ? t.notRetained : row.reason === 'port_closed' ? t.closed : row.reason === 'lane_closed' ? t.laneClosed : t.noReport;
  useEffect(() => {
    setCamera(scopeKey === 'ALL' || !rows.length ? WHOLE_BORDER : fitBorderPoints(rows.filter(r => r.point).map(r => r.point)));
  }, [scopeKey, hasRows]);
  useEffect(() => {
    if (!active) return;
    const changed = previousSelection.current !== selectedPort;
    if (changed && selectedPort) selectionScope.current = scopeKey;
    if (changed && selectedPort && selected?.point) setCamera(current => {
      const p = cameraPoint(selected.point, current);
      return p.x < 40 || p.x > MAP_WIDTH - 40 || p.y < 40 || p.y > MAP_HEIGHT - 40 ? fitBorderPoints([selected.point]) : current;
    });
    if (changed && selectedPort) requestAnimationFrame(() => {
      backRef.current?.focus({
        preventScroll: true
      });
      if (innerWidth < 900) paneRef.current?.scrollIntoView({
        block: 'nearest',
        behavior: reduced() ? 'instant' : 'smooth'
      });
    });
    if (changed && !selectedPort && previousSelection.current && selectionScope.current === scopeKey) requestAnimationFrame(() => {
      const origin = returnFocus.current;
      const replacement = origin?.id ? document.getElementById(origin.id) : null;
      if (origin?.isConnected) origin.focus({
        preventScroll: true
      });else if (replacement) replacement.focus({
        preventScroll: true
      });else frameRef.current?.focus({
        preventScroll: true
      });
    });
    previousSelection.current = selectedPort;
  }, [selectedPort, hasRows, active, scopeKey]);
  useEffect(() => {
    if (!active || !selectedPort) return;
    const escape = e => {
      if (e.key === 'Escape' && !document.querySelector('dialog[open]')) {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', escape);
    return () => window.removeEventListener('keydown', escape);
  }, [active, selectedPort, onClose]);
  const groups = clusterBorderRows(rows, camera, cssScale);
  const unit = 1 / (cssScale * zoom);
  function select(id, event) {
    returnFocus.current = event?.currentTarget;
    onSelect(id);
    if (id === selectedPort) backRef.current?.focus({
      preventScroll: true
    });
  }
  function bounded(next) {
    return {
      ...next,
      x: Math.max(-100, Math.min(MAP_WIDTH + 100 - next.width, next.x)),
      y: Math.max(-100, Math.min(MAP_HEIGHT + 100 - next.height, next.y))
    };
  }
  function zoomBy(factor) {
    setCamera(current => {
      const width = Math.max(.15, Math.min(MAP_WIDTH, current.width / factor)),
        height = width * MAP_HEIGHT / MAP_WIDTH;
      return bounded({
        x: current.x + (current.width - width) / 2,
        y: current.y + (current.height - height) / 2,
        width,
        height
      });
    });
  }
  function pointerDown(e) {
    if (e.target.closest('[role="button"]')) return;
    svgRef.current.setPointerCapture(e.pointerId);
    const g = gesture.current;
    g.pointers.set(e.pointerId, {
      x: e.clientX,
      y: e.clientY
    });
    g.camera = camera;
    g.start = {
      x: e.clientX,
      y: e.clientY
    };
    if (g.pointers.size === 2) {
      const [a, b] = [...g.pointers.values()];
      g.distance = Math.hypot(a.x - b.x, a.y - b.y);
    }
    setDragging(true);
  }
  function pointerMove(e) {
    const g = gesture.current;
    if (!g.pointers.has(e.pointerId)) return;
    g.pointers.set(e.pointerId, {
      x: e.clientX,
      y: e.clientY
    });
    if (g.pointers.size === 2) {
      const [a, b] = [...g.pointers.values()];
      const factor = Math.hypot(a.x - b.x, a.y - b.y) / g.distance;
      const width = Math.max(.15, Math.min(MAP_WIDTH, g.camera.width / factor)),
        height = width * MAP_HEIGHT / MAP_WIDTH;
      setCamera(bounded({
        x: g.camera.x + (g.camera.width - width) / 2,
        y: g.camera.y + (g.camera.height - height) / 2,
        width,
        height
      }));
    } else {
      const z = MAP_WIDTH / g.camera.width;
      setCamera(bounded({
        ...g.camera,
        x: g.camera.x - (e.clientX - g.start.x) / (cssScale * z),
        y: g.camera.y - (e.clientY - g.start.y) / (cssScale * z)
      }));
    }
  }
  function pointerUp(e) {
    const g = gesture.current;
    g.pointers.delete(e.pointerId);
    if (g.pointers.size === 1) {
      g.camera = camera;
      g.start = [...g.pointers.values()][0];
    }
    if (!g.pointers.size) setDragging(false);
  }
  function changeMode(next) {
    const query = currentSearchParams();
    if (next === 'history') {
      query.set('mode', 'history');
      if (history.rows.length) query.set('at', history.rows.at(-1).fetched_at);
    } else {
      query.delete('mode');
      query.delete('at');
    }
    setParams(query);
  }
  function nodeKey(event, group) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      activateGroup(group, event);
    } else if (['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
      event.stopPropagation();
      const nodes = [...svgRef.current.querySelectorAll('[data-map-node]')];
      let next = nodes.indexOf(event.currentTarget) + (event.key === 'ArrowLeft' ? -1 : 1);
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = nodes.length - 1;
      nodes[(next + nodes.length) % nodes.length]?.focus();
    }
  }
  function activateGroup(group, event) {
    if (group.rows.length === 1) select(group.rows[0].id, event);else {
      setCamera(fitBorderPoints(group.rows.map(row => row.point)));
      requestAnimationFrame(() => frameRef.current?.focus({
        preventScroll: true
      }));
    }
  }
  return <section className={`crossingExplorer ${replay ? 'is-history' : ''} ${trusted ? '' : 'is-retained'} ${dragging ? 'is-dragging' : ''}`} aria-label={t.map} data-testid="border-map-explorer">
    <div className="explorerHeading"><div><h2>{t.title}</h2><p>{es ? `${rows.length} de ${allCount} cruces · ${reporting} con reporte de este carril` : `${rows.length} of ${allCount} crossings · ${reporting} reporting this lane`}</p></div><div role="group" aria-label={es ? 'Vista de cruces' : 'Crossing view'}><Button size="sm" aria-pressed="true" className="min-h-11">{es ? 'Mapa' : 'Map'}</Button><Button variant="outline" size="sm" className="min-h-11" aria-pressed="false" onClick={() => onDisplayChange('list')}>{es ? 'Lista' : 'List'}</Button></div></div>
    <div className="explorerMode"><div role="group" aria-label={es ? 'Modo de datos' : 'Data mode'}><Button variant={!replay ? 'default' : 'outline'} size="sm" aria-pressed={!replay} onClick={() => changeMode('latest')}>{t.latest}</Button><Button variant={replay ? 'default' : 'outline'} size="sm" aria-pressed={replay} onClick={() => changeMode('history')}><History className="w-3.5 h-3.5" />{t.history}</Button></div>{scopeKey !== 'ALL' && <Button variant="ghost" size="sm" className="min-h-11" onClick={() => {
        onAll();
        setCamera(WHOLE_BORDER);
      }}>{t.all}</Button>}<span>{replay ? clock(selectedSnapshot?.fetched_at, language) : fetchLabel(freshness.state, freshness.age, language)}</span></div>
    {replay ? <div className="explorerNotice" role="status"><p>{t.historyNotice}</p>{history.status === 'idle' || history.status === 'loading' ? <p>{t.loading}</p> : history.status === 'failed' || history.status === 'empty' ? <p>{t.failed} <button onClick={() => setRetry(x => x + 1)}>{t.retry}</button></p> : <label className="archiveControl">{es ? 'Observación registrada' : 'Recorded observation'}<input type="range" min="0" max={Math.max(0, history.rows.length - 1)} value={activeIndex} onChange={e => {
          const q = currentSearchParams();
          const observation = history.rows[+e.target.value];
          if (!observation) return;
          q.set('at', observation.fetched_at);
          setParams(q, {
            replace: true
          });
        }} />{clock(selectedSnapshot?.fetched_at, language)}</label>}{unavailableInstant && <p>{es ? 'La observación solicitada no está en este archivo. Elige otra hora.' : 'The requested observation is absent from this archive. Choose another time.'}</p>}{lane !== 'passenger_standard' && <p>{t.notRetained}. <button onClick={() => onLaneChange('passenger_standard')}>{es ? 'Elegir auto estándar' : 'Choose Standard passenger'}</button></p>}</div> : !trusted && <div className="explorerNotice" role="status">{offline ? es ? 'Sin conexión. Conservamos reportes anteriores.' : 'Offline. Retained reports are shown.' : fromFallback ? es ? 'Datos de respaldo guardados. Las condiciones actuales no están verificadas.' : 'Saved fallback data. Current conditions are not verified.' : success === false ? es ? 'No se pudo actualizar. Conservamos la hora y los valores del último reporte.' : 'Refresh unavailable. The last report values and original time are retained.' : es ? 'Consulta desactualizada o de hora desconocida.' : 'Stale or unknown retrieval time.'} {clock(fetchedAt, language)}</div>}
    <div className="explorerWorkspace">
      <div ref={frameRef} className="explorerMap bp-line" tabIndex="0" aria-describedby="map-location-note" aria-label={es ? 'Mapa. Usa los botones para acercar o arrastra para mover.' : 'Map. Use zoom buttons or drag to pan.'} onKeyDown={e => {
        if (e.target !== e.currentTarget) return;
        if (e.key === '+' || e.key === '=') {
          e.preventDefault();
          zoomBy(1.8);
        }
        if (e.key === '-') {
          e.preventDefault();
          zoomBy(1 / 1.8);
        }
        if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
          e.preventDefault();
          setCamera(c => bounded({
            ...c,
            x: c.x + (e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0) * c.width * .15,
            y: c.y + (e.key === 'ArrowUp' ? -1 : e.key === 'ArrowDown' ? 1 : 0) * c.height * .15
          }));
        }
      }}>
        <a href="#map-crossing-results" className="mapSkip">{es ? 'Ir a los resultados' : 'Skip to crossing results'}</a>
        <svg ref={svgRef} viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`} role="group" aria-label={t.map} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp}>
          <g className="geographicLayer" style={{
            transform: `translate(${-camera.x * zoom}px,${-camera.y * zoom}px) scale(${zoom})`
          }}>
            {countryPaths.map(country => <path key={country.code} d={country.path} className={`country country-${country.code}`} vectorEffect="non-scaling-stroke" aria-hidden="true" />)}
            {[[es ? 'ESTADOS UNIDOS' : 'UNITED STATES', -108, 33.1], ['MÉXICO', -108, 27.2]].map(([name, lng, lat]) => {
              const p = projectBorderPoint(lng, lat);
              return <text key={name} x={p.x} y={p.y} className="countryName" fontSize={13 * unit} textAnchor="middle" aria-hidden="true">{name}</text>;
            })}
            {groups.map(group => {
              const single = group.rows.length === 1,
                row = group.rows[0],
                count = group.rows.length,
                selectedNode = group.rows.some(item => item.id === selectedPort);
              const name = single ? `${row.crossing.name}, ${row.wait == null ? stateLabel(row) : `${row.wait} ${t.minute}`}` : es ? `Acercar ${count} cruces` : `Zoom to ${count} crossings`;
              return <g key={group.rows.map(r => r.id).join('-')} data-map-node data-port={single ? row.id : undefined} role="button" tabIndex="0" aria-label={name} aria-pressed={selectedNode} className={`mapNode ${single ? getStatusForWait(row.wait) : 'cluster'} ${selectedNode ? 'selected' : ''}`} transform={`translate(${group.point.x},${group.point.y})`} onClick={e => activateGroup(group, e)} onKeyDown={e => nodeKey(e, group)}>
              <title>{name}</title><circle r={22 * unit} fill="transparent" className="hitTarget" /><circle r={(single ? 7 : 14) * unit} className="portDot" vectorEffect="non-scaling-stroke" />
              {!single ? <text y={4 * unit} textAnchor="middle" fontSize={11 * unit} className="clusterCount" aria-hidden="true">{count}</text> : zoom > 3 && <text x={12 * unit} y={4 * unit} fontSize={12 * unit} strokeWidth={3 * unit} className="portWait" aria-hidden="true">{row.wait == null ? '—' : row.wait}</text>}
            </g>;
            })}
          </g>
        </svg>
        <div className="mapTools"><Button variant="outline" size="icon" aria-label={es ? 'Acercar mapa' : 'Zoom in map'} onClick={() => zoomBy(1.8)}><Plus className="w-4 h-4" /></Button><Button variant="outline" size="icon" aria-label={es ? 'Alejar mapa' : 'Zoom out map'} onClick={() => zoomBy(1 / 1.8)}><Minus className="w-4 h-4" /></Button><Button variant="outline" size="icon" aria-label={es ? 'Ver toda la frontera' : 'Fit whole border'} onClick={() => setCamera(WHOLE_BORDER)}><LocateFixed className="w-4 h-4" /></Button></div>
        <p id="map-location-note" className="mapLocationNote">{t.approx}</p>
      </div>
      <div className="explorerPane" ref={paneRef} id="map-crossing-results" tabIndex="-1" aria-label={selectedPort ? es ? 'Reporte seleccionado' : 'Selected crossing report' : t.list}>
        {selectedPort ? <><Button ref={backRef} variant="ghost" size="sm" className="detailBack" onClick={onClose}><ArrowLeft className="w-4 h-4" />{t.back}</Button>{selected ? <>
          <p className="locationWarning" data-testid="location-evidence">{selected.location ? locationLabel(selected.location) : `${t.unlocated}. ${es ? 'Sin punto en el mapa mientras se revisa. El reporte sigue disponible.' : 'No map point while location review is pending. The report remains available.'}`} {selected.location?.locationSource && <a href={selected.location.locationSource} target="_blank" rel="noopener noreferrer" className="underline">{es ? 'Fuente de ubicación' : 'Location source'}</a>}</p>
          {replay ? <Card className="recordedReport"><CardContent className="p-4"><h3>{selected.crossing.name}</h3><p>{t.history} · {laneLabel(lane, language)}</p><strong className="recordedWait">{selected.wait == null ? '—' : selected.wait}<small>{t.minute}</small></strong><p>{selected.wait == null ? stateLabel(selected) : es ? 'Resumen registrado de auto estándar' : 'Recorded Standard summary'}</p><time dateTime={selectedSnapshot?.fetched_at || undefined}>{clock(selectedSnapshot?.fetched_at, language, getPortTimezone(selected.crossing))}</time><p>{t.clockMissing}</p>{selectedSnapshot?.source && <a href={`https://github.com/sbc1-code/borderpulse/blob/${selectedSnapshot.source.slice(7)}/public/data/crossings.json`} target="_blank" rel="noopener noreferrer">{es ? 'Ver observación original' : 'View source observation'}</a>}</CardContent></Card> : active && <BorderCrossingCard crossing={selected.crossing} language={language} selectedLane={lane} selectedDirection="northbound" snapshotAt={fetchedAt} slug={portToSlug[selected.id]} isFavorite={favoritesSet.has(selected.id)} onToggleFavorite={onToggleFavorite} index={0} />}
          <Link className="fullReportLink" to={withLane(`/crossing/${portToSlug[selected.id] || selected.crossing.slug}/`, lane)}>{es ? 'Abrir reporte completo y cámaras' : 'Open full report and cameras'}<ArrowUpRight className="w-4 h-4" /></Link>
        </> : <p role="status">{es ? 'Este cruce no aparece en la respuesta actual. No se muestra una espera supuesta.' : 'This crossing is absent from the current response. No wait is assumed.'}</p>}</> : <><div className="listHeading"><h3>{t.list}</h3><span>{rows.length}</span></div>{!rows.length ? <p className="emptyMap">{t.empty}</p> : <ol className="crossingResultList">{rows.map(row => <li key={row.id}><button id={`map-result-${row.id}`} onClick={e => select(row.id, e)} className={selectedPort === row.id ? 'active' : ''}><span><b>{row.crossing.name}</b><small>{row.crossing.state} · {replay ? t.history : row.report ? reportTimeLabel(row.report, language) : t.noReport}{!row.location && ` · ${t.unlocated}`}</small></span><strong className={trusted || replay ? getStatusForWait(row.wait) : 'retained'}>{row.wait == null ? '—' : row.wait}<small>{row.wait == null ? '' : t.minute}</small></strong></button></li>)}</ol>}</>}
      </div>
    </div>
    <div className="mapLegend"><span><i className="good" />{es ? 'Menos de 15 min' : 'Under 15 min'}</span><span><i className="moderate" />15–44 min</span><span><i className="heavy" />45+ min</span><span><i className="unknown" />{es ? 'Sin reporte de este carril' : 'No report for this lane'}</span></div>
    <details className="mapSources"><summary>{t.coverage}</summary>
      <p data-testid="map-location-coverage">{mapped.length} {es ? 'puntos aproximados' : 'approximate points'} · {rows.length - mapped.length} {es ? 'registros solo en la lista' : 'list-only records'}.</p>
      <p>{supportedLocations} {es ? 'puntos con referencia de ubicación primaria' : 'points supported by primary location references'} · {limitedLocations} {es ? 'aproximación contextual con revisión numérica limitada' : 'contextual approximation with limited numeric review'}{inheritedLocations > 0 && <> · {inheritedLocations} {es ? 'puntos heredados sin verificación independiente' : 'inherited points without independent verification'}</>}.</p>
      <p>{es ? 'Los puntos representan recintos de EE.UU. o ubicaciones enlazadas por un directorio, no entradas ni rutas. Morley conserva una aproximación contextual. Los reportes de espera de CBP no certifican coordenadas; los datos faltantes no significan cero.' : 'Points represent US facilities or directory-linked locations, not entrances or routes. Morley retains a contextual approximation. CBP wait reports do not certify coordinates; missing observations are not zero.'}</p>
      <p>{es ? 'Referencias de ubicación' : 'Location references'}: <a href={LOCATION_SOURCES.gsa} target="_blank" rel="noopener noreferrer">GSA IOLP</a> · <a href={LOCATION_SOURCES.directory} target="_blank" rel="noopener noreferrer">TABC</a> · <a href={LOCATION_SOURCES.federal} target="_blank" rel="noopener noreferrer">Federal Register</a> · <a href={LOCATION_SOURCES.morley} target="_blank" rel="noopener noreferrer">FHWA</a> · <a href="https://github.com/datasets/geo-countries/tree/ca3b7150caa5d3cc3fb108a87fc6e3d57bd97d99" target="_blank" rel="noopener noreferrer">Natural Earth / geo-countries</a></p>
      <p>{es ? 'San Luis II permanece solo en la lista por referencias de ubicación contradictorias. El registro agregado El Paso no representa un cruce físico separado.' : 'San Luis II remains list-only because location references conflict. Aggregate El Paso does not represent a separate physical crossing.'}</p>
    </details>
  </section>;
}
