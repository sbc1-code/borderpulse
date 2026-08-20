// Layout math for the Blueprint Border Line.
//
// Pure functions, no React, no DOM. Kept separate so it stays testable and so
// a Node context can import it without pulling in the component tree.
//
// The drawing's one non-negotiable claim is that ticks read west to east in
// true geographic order. Everything here protects that.

/**
 * Project a longitude onto a 0..1 axis position using the observed span of the
 * supplied set, with a small inset so end ticks are not flush against the edge.
 */
export function projectLongitudes(items, inset = 0.03) {
  if (!items.length) return [];
  const lngs = items.map((i) => i.lng);
  const min = Math.min(...lngs);
  const max = Math.max(...lngs);
  const span = max - min || 1;
  const usable = 1 - inset * 2;
  return items.map((item) => ({
    ...item,
    t: inset + ((item.lng - min) / span) * usable,
  }));
}

/**
 * Enforce a minimum gap between adjacent positions without ever reordering
 * them. Forward pass pushes crowded ticks right; if that overruns the end, a
 * backward pass pulls the tail back. Deterministic and stable between renders,
 * so a tick never moves out from under the user's thumb.
 *
 * @param positions ascending array of 0..1 positions
 * @param minGap    minimum separation in the same 0..1 units
 */
export function spreadMonotonic(positions, minGap) {
  const n = positions.length;
  if (n === 0) return [];
  if (n === 1) return [...positions];

  // Degenerate case: the gap cannot physically fit. Fall back to even spacing,
  // which still preserves order and is the most legible option.
  if (minGap * (n - 1) >= 1) {
    return positions.map((_, i) => i / (n - 1));
  }

  const out = [...positions];
  for (let i = 1; i < n; i += 1) {
    if (out[i] - out[i - 1] < minGap) out[i] = out[i - 1] + minGap;
  }
  const overrun = out[n - 1] - 1;
  if (overrun > 0) {
    for (let i = n - 1; i >= 0; i -= 1) {
      out[i] = Math.min(out[i], 1 - minGap * (n - 1 - i));
      if (i > 0 && out[i] - out[i - 1] < minGap) out[i - 1] = out[i] - minGap;
    }
    // Clamp anything the backward pass pushed below zero.
    const under = Math.min(...out);
    if (under < 0) for (let i = 0; i < n; i += 1) out[i] -= under;
  }
  return out;
}

/**
 * Tick length as a fraction of the available amplitude.
 *
 * Square-root compression: linear scaling lets a single 180-minute outlier
 * flatten every other tick into the axis, and log understates the difference
 * between a 10 and a 40 minute wait, which is the comparison people actually
 * make. Anything reporting a wait keeps a visible minimum stub so "0 min" and
 * "not reporting" never look the same.
 */
export function tickAmplitude(waitMinutes, ceiling = 120, floor = 0.06) {
  if (waitMinutes == null) return 0;
  const clamped = Math.max(0, Math.min(waitMinutes, ceiling));
  return floor + (1 - floor) * Math.sqrt(clamped / ceiling);
}

/**
 * Build the full tick model.
 *
 * @param crossings  merged crossing objects
 * @param opts.getCoords    (crossing) => {lat,lng} | null
 * @param opts.getWait      (crossing) => number | null
 * @param opts.getTypical   (crossing) => number | null   30-day median
 * @param opts.minGap       minimum separation, 0..1 units
 * @returns { ticks, skipped }  skipped = crossings with no coordinates
 */
export function buildTicks(crossings, opts) {
  const { getCoords, getWait, getTypical, minGap = 0.022 } = opts;

  const located = [];
  const skipped = [];
  for (const c of crossings) {
    const coords = getCoords(c);
    if (!coords || typeof coords.lng !== 'number') skipped.push(c);
    else located.push({ crossing: c, lng: coords.lng, lat: coords.lat });
  }

  const projected = projectLongitudes(located).sort((a, b) => a.t - b.t);
  const spread = spreadMonotonic(projected.map((p) => p.t), minGap);

  const ticks = projected.map((p, i) => {
    const wait = getWait(p.crossing);
    const typical = getTypical ? getTypical(p.crossing) : null;
    return {
      crossing: p.crossing,
      portNumber: p.crossing.port_number,
      t: spread[i],
      trueT: p.t,
      lng: p.lng,
      wait,
      typical,
      amplitude: tickAmplitude(wait),
      typicalAmplitude: typical == null ? null : tickAmplitude(typical),
      reporting: wait != null,
    };
  });

  return { ticks, skipped };
}

/** Anchor labels, placed at the nearest tick to each metro's longitude. */
export const REGION_ANCHORS = [
  { label: 'San Diego', lng: -117.0 },
  { label: 'Nogales', lng: -110.9 },
  { label: 'El Paso', lng: -106.5 },
  { label: 'Laredo', lng: -99.5 },
  { label: 'Brownsville', lng: -97.5 },
];

/**
 * Pick the tick nearest each anchor longitude, so anchor labels sit on real
 * geography rather than at arbitrary axis fractions. Returns at most one
 * anchor per tick.
 */
export function resolveAnchors(ticks, minLabelGap = 0.1) {
  const used = new Set();
  const found = [];
  for (const anchor of REGION_ANCHORS) {
    let best = null;
    let bestDist = Infinity;
    for (const tick of ticks) {
      if (used.has(tick.portNumber)) continue;
      const d = Math.abs(tick.lng - anchor.lng);
      if (d < bestDist) { bestDist = d; best = tick; }
    }
    // 1.5 degrees keeps a label from binding to an unrelated distant port.
    if (best && bestDist < 1.5) {
      used.add(best.portNumber);
      found.push({ ...anchor, t: best.t });
    }
  }
  // Anchor text is wide, and Laredo/Brownsville sit close enough to collide.
  // Stagger onto a second row rather than dropping one: every anchor is a
  // real geographic reference and losing the east terminus costs more than a
  // little extra height. Row alternates only while a collision persists.
  found.sort((a, b) => a.t - b.t);
  const out = [];
  for (const a of found) {
    const prev = out[out.length - 1];
    const collides = prev && a.t - prev.t < minLabelGap;
    out.push({ ...a, row: collides && prev.row === 0 ? 1 : 0 });
  }
  return out;
}
