import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { buildTicks, resolveAnchors } from '@/lib/borderLineLayout';
import { getCrossingCoords } from '@/lib/geo';
import { getWaitMinutes, getStatusForDirection } from '@/components/utils/crossingDirection';

// The border drawn as an architect's elevation: one continuous line from the
// Pacific to the Gulf, every port a tick placed by true longitude, tick length
// the current wait. A faint ghost tick behind each one is the 30-day median,
// so "as-built vs as-designed" is readable at a glance.
//
// Inline SVG, no dependencies, no framer-motion. Users are on cellular at a
// bridge; 42 animated nodes on a low-end Android is a frame-rate problem, so
// motion is CSS transitions only and is dropped under prefers-reduced-motion.
//
// Colour follows the LIVE 15/45 scale from crossingDirection.js, deliberately
// not the 30/60 historical scale used by the heatmaps. The card directly below
// a tick colours the same number, and disagreeing across three inches of screen
// is how you teach people to distrust the data.

const STRINGS = {
  en: {
    title: 'The border, west to east',
    subtitle: 'Tick length is the current wait. The faint line behind it is the 30-day median.',
    subtitleSb: 'Tick length is the estimated delay into Mexico. Dashed marks are crossings we do not estimate.',
    northbound: 'To the U.S.',
    southbound: 'To Mexico',
    noData: 'not reporting',
    minutes: 'min',
    typical: 'typical',
    reporting: 'reporting',
    listLabel: 'All crossings, west to east',
    crossings: 'crossings',
    desc: (n, r) =>
      `${n} border crossings in geographic order from the Pacific to the Gulf. ${r} are currently reporting a wait.`,
    quick: 'Quick',
    moderate: 'Typical',
    heavy: 'Heavy',
  },
  es: {
    title: 'La frontera, de oeste a este',
    subtitle: 'El largo indica la espera actual. La línea tenue es la mediana de 30 días.',
    subtitleSb: 'El largo indica la demora estimada hacia México. Las marcas punteadas no se estiman.',
    northbound: 'Hacia EE. UU.',
    southbound: 'Hacia México',
    noData: 'sin datos',
    minutes: 'min',
    typical: 'típico',
    reporting: 'con datos',
    listLabel: 'Todos los cruces, de oeste a este',
    crossings: 'cruces',
    desc: (n, r) =>
      `${n} cruces fronterizos en orden geográfico del Pacífico al Golfo. ${r} reportan espera actualmente.`,
    quick: 'Rápido',
    moderate: 'Típico',
    heavy: 'Pesado',
  },
};

const STATUS_STROKE = {
  good: 'var(--bp-good)',
  moderate: 'var(--bp-moderate)',
  heavy: 'var(--bp-heavy)',
  unknown: 'var(--bp-line-soft)',
};

// Names are built for cards, not for a 160px label column.
function shortName(name) {
  return String(name || '')
    .replace(/\s*-\s*/g, ' · ')
    .replace(/\s*\(.*?\)\s*/g, ' ')
    .replace(/International Bridge/i, '')
    .replace(/Port of Entry/i, '')
    .replace(/\bInternational\b/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function useIsWide(breakpoint = 768) {
  const [wide, setWide] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= breakpoint : true
  );
  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${breakpoint}px)`);
    const onChange = (e) => setWide(e.matches);
    setWide(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [breakpoint]);
  return wide;
}

export default function BorderLine({
  crossings = [],
  direction = 'northbound',
  language = 'en',
  favoritesSet,
  typicalByPort,
  focusedPort = null,
  onSelect,
}) {
  const t = STRINGS[language] || STRINGS.en;
  const isWide = useIsWide();
  const [hovered, setHovered] = useState(null);
  const liveRef = useRef(null);

  // rankings.json medians are built from current_wait_time, which is the
  // NORTHBOUND reading. Showing them behind a southbound tick would be a
  // silent apples-to-oranges comparison, so the ghost is northbound only.
  const showTypical = direction !== 'southbound';

  const { ticks } = useMemo(
    () =>
      buildTicks(crossings, {
        getCoords: getCrossingCoords,
        getWait: (c) => getWaitMinutes(c, direction),
        getTypical: (c) =>
          showTypical && typicalByPort ? typicalByPort[c.port_number] ?? null : null,
        // Desktop has room for true longitude. Mobile rows are 24 units tall
        // for tap-target reasons, which nearly saturates the axis; order and
        // the anchor labels carry the geography there instead of exact spacing.
        minGap: isWide ? 0.009 : 0.023,
      }),
    [crossings, direction, typicalByPort, isWide, showTypical]
  );

  const anchors = useMemo(() => (isWide ? resolveAnchors(ticks) : []), [ticks, isWide]);
  const reportingCount = ticks.filter((k) => k.reporting).length;

  const handleSelect = useCallback(
    (tick) => {
      onSelect?.(tick.portNumber);
      if (liveRef.current) {
        const w = tick.wait == null ? t.noData : `${tick.wait} ${t.minutes}`;
        liveRef.current.textContent = `${tick.crossing.name}: ${w}`;
      }
    },
    [onSelect, t]
  );

  const onKey = useCallback(
    (e, tick) => {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        handleSelect(tick);
      }
    },
    [handleSelect]
  );

  if (!ticks.length) return null;

  const strokeFor = (tick) =>
    STATUS_STROKE[getStatusForDirection(tick.crossing, direction)] || STATUS_STROKE.unknown;

  // ---------------------------------------------------------------- desktop
  const W = 1000;
  const H = 262;
  const southbound = direction === 'southbound';
  // The axis sits low for northbound (ticks grow up toward the U.S.) and high
  // for southbound (ticks grow down toward Mexico), so the drawing physically
  // flips with travel direction and never reserves an empty half.
  const AXIS_Y = southbound ? 72 : 182;
  const AMP = 122;
  const dir = southbound ? 1 : -1;

  const desktop = (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="bp-line-svg w-full"
      role="img"
      aria-labelledby="bp-line-title bp-line-desc"
      preserveAspectRatio="xMidYMid meet"
    >
      <title id="bp-line-title">{t.title}</title>
      <desc id="bp-line-desc">
        {t.desc(ticks.length, reportingCount)}
      </desc>

      {/* drafting grid */}
      <g className="bp-grid">
        {Array.from({ length: 11 }, (_, i) => (
          <line key={i} x1={(i / 10) * W} y1={28} x2={(i / 10) * W} y2={H - 34} />
        ))}
      </g>

      {/* the border itself */}
      <line className="bp-axis" x1={0} y1={AXIS_Y} x2={W} y2={AXIS_Y} />

      {ticks.map((tick) => {
        const x = tick.t * W;
        const isFocus = focusedPort === tick.portNumber || hovered === tick.portNumber;
        const isFav = favoritesSet?.has?.(tick.portNumber);
        const len = tick.amplitude * AMP;
        const ghost = tick.typicalAmplitude == null ? null : tick.typicalAmplitude * AMP;
        const label = shortName(tick.crossing.name);
        return (
          <g
            key={tick.portNumber}
            role="button"
            tabIndex={0}
            aria-label={`${tick.crossing.name}: ${
              tick.wait == null ? t.noData : `${tick.wait} ${t.minutes}`
            }${tick.typical != null ? `, ${t.typical} ${tick.typical}` : ''}`}
            className={`bp-tick ${isFocus ? 'is-focus' : ''}`}
            onClick={() => handleSelect(tick)}
            onKeyDown={(e) => onKey(e, tick)}
            onMouseEnter={() => setHovered(tick.portNumber)}
            onMouseLeave={() => setHovered(null)}
            onFocus={() => setHovered(tick.portNumber)}
            onBlur={() => setHovered(null)}
          >
            {/* hit area: generous vertically, neighbour-safe horizontally */}
            <rect x={x - 5} y={28} width={10} height={H - 62} fill="transparent" />
            {ghost != null && (
              <line className="bp-ghost" x1={x} y1={AXIS_Y} x2={x} y2={AXIS_Y + dir * ghost} />
            )}
            {tick.reporting ? (
              <line
                className="bp-stem"
                x1={x}
                y1={AXIS_Y}
                x2={x}
                y2={AXIS_Y + dir * len}
                stroke={strokeFor(tick)}
              />
            ) : (
              <line className="bp-stem bp-stem-none" x1={x} y1={AXIS_Y} x2={x} y2={AXIS_Y + dir * 12} />
            )}
            <circle className="bp-node" cx={x} cy={AXIS_Y} r={isFocus ? 3.4 : 2} />
            {isFav && !isFocus && (
              <circle className="bp-fav" cx={x} cy={AXIS_Y + dir * (len + 9)} r={2.6} />
            )}
            {isFocus && (
              <g className="bp-callout">
                <line x1={x} y1={AXIS_Y + dir * (len + 8)} x2={x} y2={AXIS_Y + dir * (len + 26)} />
                <text
                  x={x}
                  y={AXIS_Y + dir * (len + 32) + (southbound ? 8 : 0)}
                  textAnchor={x < 90 ? 'start' : x > W - 90 ? 'end' : 'middle'}
                  className="bp-callout-name"
                >
                  {label.toUpperCase()}
                </text>
                <text
                  x={x}
                  y={AXIS_Y + dir * (len + 32) + (southbound ? 8 : 0) + 15}
                  textAnchor={x < 90 ? 'start' : x > W - 90 ? 'end' : 'middle'}
                  className="bp-callout-val"
                >
                  {tick.wait == null
                    ? t.noData.toUpperCase()
                    : `${tick.wait} ${t.minutes.toUpperCase()}`}
                  {tick.typical != null && ` · ${t.typical.toUpperCase()} ${tick.typical}`}
                </text>
              </g>
            )}
          </g>
        );
      })}

      {/* geography anchors below the line */}
      {anchors.map((a) => (
        <g key={a.label} className="bp-anchor">
          <line
            x1={a.t * W}
            y1={AXIS_Y}
            x2={a.t * W}
            y2={AXIS_Y - dir * (a.row ? 26 : 14)}
          />
          <text
            x={a.t * W}
            y={AXIS_Y - dir * (a.row ? 38 : 26) + (southbound ? 0 : 4)}
            textAnchor={a.t < 0.08 ? 'start' : a.t > 0.92 ? 'end' : 'middle'}
          >
            {a.label.toUpperCase()}
          </text>
        </g>
      ))}

      {/* title block */}
      <g className="bp-titleblock">
        <text x={12} y={22}>
          {`${ticks.length} ${t.crossings.toUpperCase()} · ${reportingCount} ${t.reporting.toUpperCase()}`}
        </text>
        <text x={W - 12} y={22} textAnchor="end">
          {(direction === 'southbound' ? t.southbound : t.northbound).toUpperCase()}
        </text>
      </g>
    </svg>
  );

  // ----------------------------------------------------------------- mobile
  const MW = 360;
  // 26 viewBox units, not 24: the svg scales down to ~341px inside a 375px
  // viewport (iPhone SE/mini), so 24 units rendered as 23 CSS px and missed
  // the WCAG 2.2 AA 24x24 floor on the narrowest common phone.
  const ROW = 26;
  const TOP = 34;
  const MH = TOP + ticks.length * ROW + 18;
  // The label column must actually fit a name. At 96 units it silently clipped
  // the left of every long one ("Nogales - Mariposa" rendered as "ales - Mariposa"),
  // because the text is end-anchored at the spine and overflowed the viewBox.
  const SPINE_X = 146;
  const BAR_MAX = 140;
  const NAME_MAX = 22;

  const mobile = (
    <svg
      viewBox={`0 0 ${MW} ${MH}`}
      className="bp-line-svg w-full"
      role="img"
      aria-labelledby="bp-line-title-m bp-line-desc-m"
      preserveAspectRatio="xMidYMid meet"
    >
      <title id="bp-line-title-m">{t.title}</title>
      <desc id="bp-line-desc-m">
        {t.desc(ticks.length, reportingCount)}
      </desc>

      <line className="bp-axis" x1={SPINE_X} y1={TOP - 10} x2={SPINE_X} y2={MH - 12} />

      <g className="bp-titleblock">
        <text x={12} y={18}>
          {`${ticks.length} ${t.crossings.toUpperCase()} · ${reportingCount} ${t.reporting.toUpperCase()}`}
        </text>
        <text x={MW - 12} y={18} textAnchor="end">
          {(direction === 'southbound' ? t.southbound : t.northbound).toUpperCase()}
        </text>
      </g>

      {ticks.map((tick, i) => {
        const y = TOP + i * ROW + ROW / 2;
        const isFocus = focusedPort === tick.portNumber || hovered === tick.portNumber;
        const isFav = favoritesSet?.has?.(tick.portNumber);
        const len = tick.amplitude * BAR_MAX;
        const ghost = tick.typicalAmplitude == null ? null : tick.typicalAmplitude * BAR_MAX;
        return (
          <g
            key={tick.portNumber}
            role="button"
            tabIndex={0}
            aria-label={`${tick.crossing.name}: ${
              tick.wait == null ? t.noData : `${tick.wait} ${t.minutes}`
            }${tick.typical != null ? `, ${t.typical} ${tick.typical}` : ''}`}
            className={`bp-tick ${isFocus ? 'is-focus' : ''}`}
            onClick={() => handleSelect(tick)}
            onKeyDown={(e) => onKey(e, tick)}
            onFocus={() => setHovered(tick.portNumber)}
            onBlur={() => setHovered(null)}
          >
            {/* full-width row: 360 x 24 viewBox units renders well past the
                24x24 CSS px floor at any phone width */}
            <rect x={0} y={y - ROW / 2} width={MW} height={ROW} fill="transparent" />
            {isFocus && (
              <rect className="bp-row-focus" x={0} y={y - ROW / 2} width={MW} height={ROW} />
            )}

            <text x={SPINE_X - 8} y={y + 3.5} textAnchor="end" className="bp-row-name">
              {(() => {
                const n = shortName(tick.crossing.name);
                return n.length > NAME_MAX ? `${n.slice(0, NAME_MAX - 1)}…` : n;
              })()}
            </text>

            {ghost != null && (
              <line className="bp-ghost" x1={SPINE_X} y1={y} x2={SPINE_X + ghost} y2={y} />
            )}
            {tick.reporting ? (
              <line
                className="bp-stem"
                x1={SPINE_X}
                y1={y}
                x2={SPINE_X + len}
                y2={y}
                stroke={strokeFor(tick)}
              />
            ) : (
              <line className="bp-stem bp-stem-none" x1={SPINE_X} y1={y} x2={SPINE_X + 10} y2={y} />
            )}
            <circle className="bp-node" cx={SPINE_X} cy={y} r={isFocus ? 3 : 1.8} />
            {isFav && <circle className="bp-fav" cx={SPINE_X - 3} cy={y - 7} r={2.2} />}

            <text x={MW - 10} y={y + 3.5} textAnchor="end" className="bp-row-val">
              {tick.wait == null ? '—' : `${tick.wait}`}
            </text>
          </g>
        );
      })}
    </svg>
  );

  return (
    <section
      className="bp-line rounded-xl border overflow-hidden mb-4"
      aria-label={t.title}
      data-direction={direction}
    >
      <div className="flex items-baseline justify-between gap-3 px-4 pt-3">
        <h2 className="bp-line-h">{t.title}</h2>
        <span className="bp-line-legend">
          <i className="bp-sw bp-sw-good" /> {t.quick}
          <i className="bp-sw bp-sw-mod" /> {t.moderate}
          <i className="bp-sw bp-sw-heavy" /> {t.heavy}
        </span>
      </div>
      <p className="bp-line-sub px-4">{showTypical ? t.subtitle : t.subtitleSb}</p>
      <div className="px-1 pb-2">{isWide ? desktop : mobile}</div>

      {/* Accessible equivalent. Also the only copy a text-mode crawler sees,
          since prerender.mjs does not execute React. */}
      <ul className="sr-only" aria-label={t.listLabel}>
        {ticks.map((tick) => (
          <li key={tick.portNumber}>
            {`${tick.crossing.name}: ${
              tick.wait == null ? t.noData : `${tick.wait} ${t.minutes}`
            }${tick.typical != null ? `, ${t.typical} ${tick.typical} ${t.minutes}` : ''}`}
          </li>
        ))}
      </ul>
      <span ref={liveRef} className="sr-only" aria-live="polite" />
    </section>
  );
}
