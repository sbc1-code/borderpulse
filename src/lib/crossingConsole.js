import { localComparison } from "./corridors.js";
import { walkDriveFreshness } from "./walkDriveFreshness.js";

export const CONSOLE_PATH = "/corridor/san-diego-tijuana/";
export const CONSOLE_CANONICAL = `https://borderpulse.com${CONSOLE_PATH}`;
export const CONSOLE_PORTS = [
  {
    id: "250401",
    name: "San Ysidro",
    slug: "san-ysidro",
    lat: 32.54333,
    lng: -117.02972,
    color: "var(--sand)",
  },
  {
    id: "250601",
    name: "Otay Mesa",
    slug: "otay-mesa",
    lat: 32.550602,
    lng: -116.938187,
    color: "var(--mint)",
  },
];
export const CONSOLE_TIMEZONE = "America/Los_Angeles";
const localDay = new Intl.DateTimeFormat("en-CA", {
  timeZone: CONSOLE_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
export function dayKey(iso) {
  const time = Date.parse(iso);
  if (!Number.isFinite(time)) return null;
  const parts = Object.fromEntries(
    localDay
      .formatToParts(new Date(time))
      .map((part) => [part.type, part.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}
export function currentConsoleRows(
  crossings,
  lane,
  fetchedAt,
  now = Date.now(),
) {
  const comparison = localComparison(
    Array.isArray(crossings) ? crossings : [],
    "san-diego-tijuana",
    lane,
    fetchedAt,
    now,
  );
  return CONSOLE_PORTS.map((port) => {
    const row = comparison.rows.find(
      (item) => String(item.crossing.port_number) === port.id,
    );
    const sourceLane = row?.crossing.lanes?.[lane];
    return {
      ...port,
      wait: row?.wait ?? null,
      reason: row?.reason || (row ? null : "no_report"),
      report:
        typeof sourceLane?.update_time === "string"
          ? sourceLane.update_time
          : null,
      open: Number.isFinite(sourceLane?.lanes_open)
        ? sourceLane.lanes_open
        : null,
    };
  });
}
export function currentConsoleTrust(data, now = Date.now()) {
  const freshness = walkDriveFreshness(data?.timestamp, now);
  return {
    ...freshness,
    usable: freshness.usable && data?.success === true && !data?.fromFallback,
  };
}
export function parseExtraDrive(value) {
  return /^(0|[1-9]\d{0,2})$/.test(String(value)) && Number(value) <= 180
    ? Number(value)
    : null;
}
export function detourMath(sy, otay, extra) {
  if (
    ![sy, otay, extra].every(
      (value) =>
        typeof value === "number" && Number.isFinite(value) && value >= 0,
    )
  )
    return null;
  return {
    difference: sy - otay,
    viaOtay: otay + extra,
    net: sy - otay - extra,
    breakEven: Math.max(0, sy - otay),
  };
}

// The collector's explicit archive retains Standard summary waits, not lane
// clocks or lane counts. Select a past port-local day; never manufacture those
// omitted fields or fill a missing observation with another lane or port.
export function selectConsoleHistory(document, now = Date.now()) {
  if (!Array.isArray(document?.snapshots)) return [];
  const today = dayKey(new Date(now).toISOString());
  const byDay = new Map();
  const seen = new Set();
  for (const snapshot of document.snapshots.slice(-10_000)) {
    if (typeof snapshot?.fetched_at !== "string") continue;
    const time = Date.parse(snapshot.fetched_at);
    if (
      !Number.isFinite(time) ||
      time > now ||
      seen.has(time) ||
      !Array.isArray(snapshot.crossings)
    )
      continue;
    const day = dayKey(snapshot.fetched_at);
    if (!day || day >= today) continue;
    const rows = CONSOLE_PORTS.map((port) => {
      const matches = snapshot.crossings.filter(
        (row) => String(row?.port_number) === port.id,
      );
      const value = matches.length === 1 ? matches[0].current_wait_time : null;
      return {
        port_number: port.id,
        current_wait_time: Number.isFinite(value) && value >= 0 ? value : null,
      };
    });
    if (!rows.some((row) => row.current_wait_time !== null)) continue;
    seen.add(time);
    const item = {
      fetched_at: snapshot.fetched_at,
      source:
        typeof snapshot.source === "string" &&
        /^commit:[a-f0-9]{40}$/.test(snapshot.source)
          ? snapshot.source
          : null,
      crossings: rows,
    };
    if (!byDay.has(day)) byDay.set(day, []);
    byDay.get(day).push(item);
  }
  const eligible = [...byDay.entries()]
    .filter(([, rows]) => rows.length >= 2)
    .sort(([a], [b]) => b.localeCompare(a));
  if (!eligible.length) return [];
  const observations = eligible[0][1].sort(
    (a, b) => Date.parse(a.fetched_at) - Date.parse(b.fetched_at),
  );
  if (observations.length <= 18) return observations;
  return Array.from(
    { length: 18 },
    (_, index) =>
      observations[Math.round((index * (observations.length - 1)) / 17)],
  );
}
export function replayConsoleRows(snapshots, index, lane) {
  return CONSOLE_PORTS.map((port) => {
    const value = snapshots[index]?.crossings.find(
      (row) => row.port_number === port.id,
    )?.current_wait_time;
    const retained = lane === "passenger_standard";
    return {
      ...port,
      wait: retained && Number.isFinite(value) && value >= 0 ? value : null,
      reason: retained
        ? Number.isFinite(value) && value >= 0
          ? null
          : "no_report"
        : "not_retained",
      report: null,
      open: null,
    };
  });
}
export function separationKm(a = CONSOLE_PORTS[0], b = CONSOLE_PORTS[1]) {
  const r = Math.PI / 180;
  const x =
    Math.sin(((b.lat - a.lat) * r) / 2) ** 2 +
    Math.cos(a.lat * r) *
      Math.cos(b.lat * r) *
      Math.sin(((b.lng - a.lng) * r) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(x));
}
