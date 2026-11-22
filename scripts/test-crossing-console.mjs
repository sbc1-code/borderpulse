import test from "node:test";
import assert from "node:assert/strict";
import {
  currentConsoleRows,
  currentConsoleTrust,
  parseExtraDrive,
  detourMath,
  selectConsoleHistory,
  replayConsoleRows,
  dayKey,
  CONSOLE_PORTS,
  projectConsolePoint,
} from "../src/lib/crossingConsole.js";
const now = Date.parse("2026-10-30T04:30:00Z");
const port = (id, standard, ready) => ({
  port_number: id,
  port_status: "Open",
  hours: "24 hrs/day",
  state: "CA",
  lanes: {
    passenger_standard: {
      status: "Delay",
      delay_minutes: standard,
      lanes_open: 2,
      update_time: "At 8:00 pm PDT",
    },
    passenger_ready:
      ready === null
        ? null
        : {
            status: "Delay",
            delay_minutes: ready,
            lanes_open: 2,
            update_time: "At 7:00 pm PDT",
          },
  },
});
const rows = [
  port("250401", 115, 45),
  port("250601", 60, null),
  port("250407", 0, 0),
];
test("current console uses canonical ports, chosen lane and unchanged report clocks", () => {
  const result = currentConsoleRows(
    rows,
    "passenger_ready",
    "2026-10-30T04:00:00Z",
    now,
  );
  assert.deepEqual(
    result.map((r) => r.wait),
    [45, null],
  );
  assert.equal(result[0].report, "At 7:00 pm PDT");
  assert.equal(result[1].reason, "no_report");
  assert.deepEqual(
    currentConsoleRows(
      rows.filter((r) => r.port_number !== "250401"),
      "passenger_standard",
      null,
      now,
    ).map((r) => r.wait),
    [null, 60],
  );
});
test("port closures, unknown hours and closed lanes suppress retained numeric waits", () => {
  for (const changed of [
    { ...rows[0], port_status: "Closed" },
    { ...rows[0], hours: "unknown" },
    {
      ...rows[0],
      lanes: {
        passenger_standard: {
          status: "Delay",
          lanes_open: 0,
          delay_minutes: 20,
        },
      },
    },
  ])
    assert.equal(
      currentConsoleRows([changed, rows[1]], "passenger_standard", null, now)[0]
        .wait,
      null,
    );
});
test("current arithmetic cannot use stale, future, failed, missing or fallback retrievals", () => {
  const valid = {
    success: true,
    timestamp: "2026-10-30T04:00:00Z",
    fromFallback: false,
  };
  assert.equal(currentConsoleTrust(valid, now).usable, true);
  for (const changed of [
    { ...valid, success: false },
    { ...valid, fromFallback: true },
    { ...valid, timestamp: null },
    { ...valid, timestamp: "invalid" },
    { ...valid, timestamp: "2026-10-30T05:00:00Z" },
    { ...valid, timestamp: "2026-10-30T02:00:00Z" },
  ])
    assert.equal(currentConsoleTrust(changed, now).usable, false);
});
test("drive arithmetic preserves zero, sign and exact break-even without rounding user input", () => {
  assert.equal(detourMath(115, 60, 20).net, 35);
  assert.equal(detourMath(115, 60, 55).net, 0);
  assert.equal(detourMath(115, 60, 70).net, -15);
  assert.equal(detourMath(0, 0, 0).net, 0);
  for (const value of ["", " ", "-1", "1.2", "1e2", "001", "181"])
    assert.equal(parseExtraDrive(value), null);
  assert.equal(parseExtraDrive("180"), 180);
  assert.equal(detourMath(115, null, 20), null);
  assert.equal(detourMath(null, 0, 0), null);
});
const observation = (iso, sy, otay, source = `commit:${"a".repeat(40)}`) => ({
  fetched_at: iso,
  source,
  crossings: [
    { port_number: "250401", current_wait_time: sy },
    { port_number: "250601", current_wait_time: otay },
  ],
});
test("history selects a past port-local day and never labels current-day or future snapshots replay", () => {
  const document = {
    snapshots: [
      observation("2026-10-29T05:00:00Z", 115, 60),
      observation("2026-10-29T06:00:00Z", 100, 70),
      observation("2026-10-29T12:00:00Z", 10, 20),
      observation("2026-10-30T05:00:00Z", 1, 2),
    ],
  };
  const selected = selectConsoleHistory(document, now);
  assert.equal(dayKey("2026-10-29T05:00:00Z"), "2026-10-28");
  assert.equal(selected.length, 2);
  assert.equal(selected[0].fetched_at, "2026-10-29T05:00:00Z");
  assert.deepEqual(
    replayConsoleRows(selected, 0, "passenger_standard").map((r) => r.wait),
    [115, 60],
  );
  for (const lane of [
    "passenger_ready",
    "passenger_sentri",
    "pedestrian_standard",
  ])
    for (const row of replayConsoleRows(selected, 0, lane)) {
      assert.equal(row.wait, null);
      assert.equal(row.reason, "not_retained");
      assert.equal(row.report, null);
      assert.equal(row.open, null);
    }
});
test("history rejects malformed times, duplicate port identities and unsafe provenance links", () => {
  const duplicatePort = observation(
    "2026-10-29T05:00:00Z",
    10,
    20,
    "javascript:alert(1)",
  );
  duplicatePort.crossings.push({ port_number: "250401", current_wait_time: 0 });
  const selected = selectConsoleHistory(
    {
      snapshots: [
        observation("bad", 10, 20),
        duplicatePort,
        observation("2026-10-29T06:00:00Z", 0, null),
        observation("2026-10-29T06:00:00Z", 90, 90),
      ],
    },
    now,
  );
  assert.equal(selected.length, 2);
  assert.equal(selected[0].source, null);
  assert.equal(selected[0].crossings[0].current_wait_time, null);
  assert.equal(selected[1].crossings[0].current_wait_time, 0);
  assert.equal(selected[1].crossings[1].current_wait_time, null);
  assert.deepEqual(selectConsoleHistory(null, now), []);
});
test("history is bounded and sampled only from actual observations, keeping endpoints", () => {
  const snapshots = Array.from({ length: 100 }, (_, i) =>
    observation(
      new Date(Date.parse("2026-10-28T12:00:00Z") + i * 300_000).toISOString(),
      [0, 47, 99].includes(i) ? null : i,
      [0, 47, 99].includes(i) ? null : 50,
    ),
  );
  const selected = selectConsoleHistory({ snapshots }, now);
  assert.equal(selected.length, 18);
  assert.ok(
    selected.every((s) =>
      snapshots.some((original) => original.fetched_at === s.fetched_at),
    ),
  );
  assert.equal(selected[0].fetched_at, snapshots[0].fetched_at);
  assert.equal(selected.at(-1).fetched_at, snapshots.at(-1).fetched_at);
  for (const index of [0, 8, 17])
    assert.ok(selected[index].crossings.every(row => row.current_wait_time === null));
  assert.ok(CONSOLE_PORTS[0].lng < CONSOLE_PORTS[1].lng);
  assert.ok(CONSOLE_PORTS[0].lat < CONSOLE_PORTS[1].lat);
});
test("map projection preserves coordinate registration in wide and compact layouts", () => {
  for (const compact of [false, true]) {
    const north = compact ? 32.69 : 32.66;
    assert.deepEqual(projectConsolePoint(-117.15, north, compact), { x: 0, y: 0 });
    const southeast = projectConsolePoint(-116.86, north - 0.24, compact);
    assert.ok(Math.abs(southeast.x - 100) < 1e-9);
    assert.ok(Math.abs(southeast.y - 100) < 1e-9);
    const sy = projectConsolePoint(CONSOLE_PORTS[0].lng, CONSOLE_PORTS[0].lat, compact);
    const otay = projectConsolePoint(CONSOLE_PORTS[1].lng, CONSOLE_PORTS[1].lat, compact);
    assert.ok(sy.x < otay.x && sy.y > otay.y);
  }
});
test("replay retains fully missing retrievals between reports and at day endpoints", () => {
  const snapshots = [
    observation("2026-10-28T16:00:00Z", null, null),
    observation("2026-10-28T17:00:00Z", 0, 20),
    { fetched_at: "2026-10-28T18:00:00Z", crossings: [] },
    observation("2026-10-28T19:00:00Z", 10, 30),
    observation("2026-10-28T20:00:00Z", null, null),
  ];
  const selected = selectConsoleHistory({ snapshots }, now);
  assert.deepEqual(selected.map(s => s.fetched_at), snapshots.map(s => s.fetched_at));
  for (const index of [0, 2, 4]) {
    const rows = replayConsoleRows(selected, index, "passenger_standard");
    assert.deepEqual(rows.map(row => [row.wait, row.reason]), [[null, "no_report"], [null, "no_report"]]);
    assert.equal(detourMath(rows[0].wait, rows[1].wait, 20), null);
  }
  assert.equal(replayConsoleRows(selected, 1, "passenger_standard")[0].wait, 0);
});
test("the latest recorded past day remains visible even when both ports have only gaps", () => {
  const selected = selectConsoleHistory({ snapshots: [
    observation("2026-10-27T16:00:00Z", 50, 20),
    observation("2026-10-27T17:00:00Z", 60, 30),
    observation("2026-10-28T16:00:00Z", null, null),
    observation("2026-10-28T17:00:00Z", null, null),
  ] }, now);
  assert.equal(selected.length, 2);
  assert.ok(selected.every(s => dayKey(s.fetched_at) === "2026-10-28"));
  assert.ok(selected.every(s => s.crossings.every(row => row.current_wait_time === null)));
});
