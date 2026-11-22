import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { observeAdSlot } from '../src/lib/adSlotDiagnostics.js';

const originalWindow = globalThis.window;
afterEach(() => {
  if (originalWindow === undefined) delete globalThis.window;
  else globalThis.window = originalWindow;
});

function fixture({ observers = true } = {}) {
  const events = [];
  globalThis.window = { umami: { track: (event, data) => events.push({ event, data }) } };
  const mutations = [];
  const intersections = [];
  const sizes = [];
  const makeObserver = (instances) => class {
    constructor(callback, options) {
      this.callback = callback;
      this.options = options;
      this.disconnected = false;
      this.observations = [];
      instances.push(this);
    }
    observe(target, options) { this.observations.push({ target, options }); }
    unobserve() {}
    disconnect() { this.disconnected = true; }
  };
  const doc = new EventTarget();
  doc.visibilityState = 'visible';
  doc.defaultView = observers ? {
    MutationObserver: makeObserver(mutations),
    IntersectionObserver: makeObserver(intersections),
    ResizeObserver: makeObserver(sizes),
  } : {};
  const script = new EventTarget();
  const container = {
    ownerDocument: doc,
    tags: [],
    querySelector: () => container.tags.some((tag) => !['script', 'style', 'link'].includes(tag)),
  };
  const seen = new Set();
  const start = () => observeAdSlot(script, container, seen);
  const populate = (tags = ['iframe']) => {
    container.tags = tags;
    mutations.at(-1)?.callback([]);
  };
  const intersect = (overrides = {}) => intersections.at(-1).callback([{
    target: container, isIntersecting: true, intersectionRatio: 0.5,
    boundingClientRect: { width: 300, height: 100 }, ...overrides,
  }]);
  const states = () => events.map(({ data }) => data.state);
  return { events, script, container, doc, mutations, intersections, sizes, seen, start, populate, intersect, states };
}

test('script load/error diagnostics are fixed enums and capped independently', () => {
  const f = fixture();
  f.start();
  for (let i = 0; i < 5; i += 1) {
    f.script.dispatchEvent(new Event('load'));
    f.script.dispatchEvent(new Event('error'));
  }
  assert.deepEqual(f.events, [
    { event: 'ad-slot-diagnostic', data: { slot: 'dashboard-native', state: 'script-ready' } },
    { event: 'ad-slot-diagnostic', data: { slot: 'dashboard-native', state: 'script-error' } },
  ]);
});

test('empty and script/style-only containers do not count as populated or visible', () => {
  const f = fixture();
  f.start();
  f.populate(['script', 'style', 'link']);
  assert.deepEqual(f.states(), []);
  assert.equal(f.intersections.length, 0);
  f.populate();
  f.populate();
  assert.deepEqual(f.states(), ['container-populated']);
  assert.equal(f.mutations[0].disconnected, true);
  assert.deepEqual(f.intersections[0].options, { threshold: 0.5 });
});

test('visible requires populated positive-area geometry at 50% in a visible tab', () => {
  const f = fixture();
  f.start();
  f.populate();
  f.intersect({ intersectionRatio: 0.49 });
  f.intersect({ isIntersecting: false });
  f.intersect({ boundingClientRect: { width: 0, height: 100 } });
  f.intersect({ boundingClientRect: { width: 300, height: 0 } });
  f.intersect({ target: {} });
  f.doc.visibilityState = 'hidden';
  f.intersect();
  assert.deepEqual(f.states(), ['container-populated']);
  f.doc.visibilityState = 'visible';
  f.doc.dispatchEvent(new Event('visibilitychange'));
  assert.equal(f.intersections[0].observations.length, 2);
  f.intersect();
  f.intersect();
  assert.deepEqual(f.states(), ['container-populated', 'slot-visible']);
  assert.equal(f.intersections[0].disconnected, true);
});

test('effect cleanup/replay retains the per-slot cap and resumes pending observation', () => {
  const f = fixture();
  const cleanup = f.start();
  f.script.dispatchEvent(new Event('load'));
  f.populate();
  cleanup();
  const stopAgain = f.start();
  f.script.dispatchEvent(new Event('load'));
  f.intersect();
  stopAgain();
  f.start();
  assert.deepEqual(f.states(), ['script-ready', 'container-populated', 'slot-visible']);
  assert.equal(f.intersections.length, 2);
});

test('a zero-area wrapper growing in-view requests fresh geometry and releases its size observer', () => {
  const f = fixture();
  const cleanup = f.start();
  f.populate(['div']);
  f.intersect({ intersectionRatio: 1, boundingClientRect: { width: 300, height: 0 } });
  assert.deepEqual(f.states(), ['container-populated']);
  f.sizes[0].callback([]);
  assert.equal(f.intersections[0].observations.length, 2);
  f.intersect({ intersectionRatio: 1 });
  assert.deepEqual(f.states(), ['container-populated', 'slot-visible']);
  assert.equal(f.sizes[0].disconnected, true);
  f.sizes[0].callback([]);
  cleanup();
  assert.equal(f.intersections[0].observations.length, 2);
});

test('cleanup detaches script/visibility listeners and ignores queued callbacks', () => {
  const f = fixture();
  const cleanup = f.start();
  f.populate();
  cleanup();
  f.script.dispatchEvent(new Event('load'));
  f.script.dispatchEvent(new Event('error'));
  f.doc.dispatchEvent(new Event('visibilitychange'));
  f.populate();
  f.intersect();
  assert.deepEqual(f.states(), ['container-populated']);
  assert.equal(f.mutations[0].disconnected, true);
  assert.equal(f.intersections[0].disconnected, true);
  assert.equal(f.sizes[0].disconnected, true);
  assert.equal(f.intersections[0].observations.length, 1);
});

test('missing observer APIs keep script diagnostics and already-populated detection', () => {
  const f = fixture({ observers: false });
  f.container.tags = ['div'];
  f.start();
  f.script.dispatchEvent(new Event('error'));
  assert.deepEqual(f.states(), ['container-populated', 'script-error']);
});

test('observer construction failures do not break script diagnostics', () => {
  const f = fixture();
  const BrokenObserver = class { constructor() { throw new Error('unsupported'); } };
  f.doc.defaultView.MutationObserver = BrokenObserver;
  f.doc.defaultView.IntersectionObserver = BrokenObserver;
  f.container.tags = ['div'];
  const cleanup = f.start();
  f.script.dispatchEvent(new Event('load'));
  cleanup();
  assert.deepEqual(f.states(), ['container-populated', 'script-ready']);
});

test('blocked or throwing analytics are no-ops, with no delayed retry', () => {
  const f = fixture();
  delete globalThis.window.umami;
  const cleanup = f.start();
  f.script.dispatchEvent(new Event('load'));
  globalThis.window.umami = { track() { throw new Error('analytics blocked'); } };
  f.populate();
  f.intersect();
  globalThis.window.umami = { track: (event, data) => f.events.push({ event, data }) };
  f.script.dispatchEvent(new Event('load'));
  f.populate();
  f.intersect();
  cleanup();
  assert.deepEqual(f.events, []);
  assert.equal(f.seen.size, 3);
});

test('a broken size observer retains ordinary intersection diagnostics', () => {
  const f = fixture();
  f.doc.defaultView.ResizeObserver = class { constructor() { throw new Error('unsupported'); } };
  const cleanup = f.start();
  f.populate();
  f.intersect();
  cleanup();
  assert.deepEqual(f.states(), ['container-populated', 'slot-visible']);
});

test('a genuinely new slot has a fresh bound; no persistent session or visitor state', () => {
  const f = fixture();
  const cleanup = f.start();
  f.script.dispatchEvent(new Event('load'));
  cleanup();
  const nextLifetime = new Set();
  observeAdSlot(f.script, f.container, nextLifetime);
  f.script.dispatchEvent(new Event('load'));
  assert.deepEqual(f.states(), ['script-ready', 'script-ready']);
});

test('missing DOM refs are harmless', () => {
  assert.doesNotThrow(() => observeAdSlot(null, null, new Set())());
});
