import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import esbuild from 'esbuild';
import React, { act } from 'react';

// Setup DOM shim for React 18 component testing in Node
class EventTargetShim {
  constructor() { this._listeners = {}; }
  addEventListener(type, listener) {
    if (!this._listeners[type]) this._listeners[type] = [];
    this._listeners[type].push(listener);
  }
  removeEventListener(type, listener) {
    if (this._listeners[type]) {
      this._listeners[type] = this._listeners[type].filter(l => l !== listener);
    }
  }
  dispatchEvent(event) {
    event.target = this;
    if (this._listeners[event.type]) {
      for (const listener of this._listeners[event.type]) listener(event);
    }
    return true;
  }
}

class ElementShim extends EventTargetShim {
  constructor(tagName) {
    super();
    this.tagName = tagName.toUpperCase();
    this.nodeName = this.tagName;
    this.nodeType = 1;
    this.children = [];
    this.childNodes = [];
    this.style = {};
    this.attributes = {};
    this.parentNode = null;
  }
  get firstChild() { return this.childNodes[0] || null; }
  get lastChild() { return this.childNodes[this.childNodes.length - 1] || null; }
  get nextSibling() {
    if (!this.parentNode) return null;
    const idx = this.parentNode.childNodes.indexOf(this);
    return idx >= 0 && idx < this.parentNode.childNodes.length - 1 ? this.parentNode.childNodes[idx + 1] : null;
  }
  get previousSibling() {
    if (!this.parentNode) return null;
    const idx = this.parentNode.childNodes.indexOf(this);
    return idx > 0 ? this.parentNode.childNodes[idx - 1] : null;
  }
  appendChild(child) {
    if (child.parentNode) child.parentNode.removeChild(child);
    this.children.push(child);
    this.childNodes.push(child);
    child.parentNode = this;
    return child;
  }
  removeChild(child) {
    this.children = this.children.filter(c => c !== child);
    this.childNodes = this.childNodes.filter(c => c !== child);
    child.parentNode = null;
    return child;
  }
  insertBefore(child, ref) {
    if (!ref) return this.appendChild(child);
    if (child.parentNode) child.parentNode.removeChild(child);
    const idx = this.childNodes.indexOf(ref);
    if (idx === -1) this.appendChild(child);
    else {
      this.childNodes.splice(idx, 0, child);
      this.children = this.childNodes.filter(c => c.nodeType === 1);
    }
    child.parentNode = this;
    return child;
  }
  replaceChild(newChild, oldChild) {
    this.insertBefore(newChild, oldChild);
    this.removeChild(oldChild);
    return oldChild;
  }
  setAttribute(name, val) { this.attributes[name] = String(val); }
  removeAttribute(name) { delete this.attributes[name]; }
  getAttribute(name) { return this.attributes[name] || this[name]; }
  get textContent() {
    return this.childNodes.map(c => c.textContent || c.nodeValue || '').join('');
  }
  set textContent(val) {
    this.childNodes = [];
    this.children = [];
    if (val) {
      const textNode = this.ownerDocument ? this.ownerDocument.createTextNode(val) : new ElementShim('#text');
      this.appendChild(textNode);
    }
  }
}

class DocumentShim extends EventTargetShim {
  constructor() {
    super();
    this.nodeType = 9;
    this.nodeName = '#document';
    this.documentElement = new ElementShim('html');
    this.body = new ElementShim('body');
    this.head = new ElementShim('head');
    this.documentElement.ownerDocument = this;
    this.body.ownerDocument = this;
    this.head.ownerDocument = this;
    this.documentElement.appendChild(this.head);
    this.documentElement.appendChild(this.body);
  }
  createElement(tag) {
    const el = new ElementShim(tag);
    el.ownerDocument = this;
    return el;
  }
  createElementNS(ns, tag) {
    const el = new ElementShim(tag);
    el.ownerDocument = this;
    return el;
  }
  createTextNode(text) {
    const el = new ElementShim('#text');
    el.nodeType = 3;
    el.nodeName = '#text';
    el.nodeValue = String(text);
    Object.defineProperty(el, 'textContent', {
      get() { return this.nodeValue; },
      set(v) { this.nodeValue = String(v); }
    });
    el.ownerDocument = this;
    return el;
  }
  createComment(text) {
    const el = new ElementShim('#comment');
    el.nodeType = 8;
    el.nodeName = '#comment';
    el.nodeValue = String(text);
    el.ownerDocument = this;
    return el;
  }
}

globalThis.window = globalThis;
globalThis.document = new DocumentShim();
globalThis.Node = ElementShim;
globalThis.Element = ElementShim;
globalThis.HTMLElement = ElementShim;
globalThis.HTMLIFrameElement = class HTMLIFrameElement extends ElementShim {};
globalThis.SVGElement = ElementShim;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// Keep generated modules out of the checkout while resolving the same React
// installation as this test (including clean CI installs without a .cache).
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bp-crossing-share-'));
fs.symlinkSync(path.resolve('node_modules'), path.join(tempDir, 'node_modules'), 'dir');
const tempFilesCreated = [];

function bundleSource(sourcePath) {
  const outFile = path.join(tempDir, `cs-bundle-${Date.now()}-${Math.random().toString(36).slice(2)}.mjs`);
  esbuild.buildSync({
    entryPoints: [sourcePath],
    outfile: outFile,
    bundle: true,
    format: 'esm',
    loader: { '.jsx': 'jsx' },
    alias: {
      '@': path.resolve('src')
    },
    external: ['react', 'react-dom', 'react-router-dom', 'lucide-react', 'react/jsx-runtime']
  });
  tempFilesCreated.push(outFile);
  return outFile;
}

const targetSourceFile = process.env.CROSSING_SHARE_SOURCE || path.resolve('src/components/dashboard/CrossingShare.jsx');
const currentBundlePath = bundleSource(targetSourceFile);

const { createRoot } = await import('react-dom/client');
const { MemoryRouter } = await import('react-router-dom');
const { default: CrossingShare } = await import(currentBundlePath);

// Helper for deferred promise control
function deferred() {
  let resolve, reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

// React element inspection helpers
function findReactProps(node) {
  const keys = Object.keys(node);
  const reactPropsKey = keys.find(k => k.startsWith('__reactProps$'));
  return reactPropsKey ? node[reactPropsKey] : null;
}

function findElements(node, filter, acc = []) {
  const props = findReactProps(node);
  if (props && filter(node, props)) acc.push({ node, props });
  for (const child of node.children || []) findElements(child, filter, acc);
  return acc;
}

function findDomNodes(node, filter, acc = []) {
  if (filter(node)) acc.push(node);
  for (const child of node.childNodes || []) findDomNodes(child, filter, acc);
  return acc;
}

function getStatusText(container) {
  const statusEl = findDomNodes(container, n => n.tagName === 'P' && (n.role === 'status' || n.attributes?.role === 'status' || (n.attributes?.class && n.attributes.class.includes('text-xs'))))[0];
  return statusEl ? statusEl.textContent : '';
}

function getButtons(container) {
  const buttons = findElements(container, (node, props) => node.tagName === 'BUTTON' && props.onClick);
  return {
    shareBtn: buttons[0]?.props,
    copyBtn: buttons[1]?.props
  };
}

function getLinks(container) {
  const links = findElements(container, (node) => node.tagName === 'A');
  return {
    whatsappLink: links[0]?.props,
    bestTimeLink: links[1]?.props
  };
}

// Global navigator / umami setup helpers
let analyticsEvents = [];
function setupMocks(options = {}) {
  const { clipboardWriteText, nativeShare } = options;
  analyticsEvents = [];
  globalThis.window.umami = {
    track: (event, data) => analyticsEvents.push({ event, data })
  };

  if (Object.hasOwn(options, 'navObj')) {
    Object.defineProperty(globalThis, 'navigator', {
      value: options.navObj,
      writable: true,
      configurable: true
    });
    return;
  }

  const nav = { userAgent: 'Mozilla/5.0' };
  if (clipboardWriteText !== undefined) {
    nav.clipboard = {
      writeText: function(url) {
        if (this !== nav.clipboard) throw new TypeError("Failed to execute 'writeText' on 'Clipboard': Illegal invocation");
        return clipboardWriteText(url);
      }
    };
  }
  if (nativeShare !== undefined) {
    nav.share = function(payload) {
      if (this !== nav) throw new TypeError("Failed to execute 'share' on 'Navigator': Illegal invocation");
      return nativeShare(payload);
    };
  }

  Object.defineProperty(globalThis, 'navigator', {
    value: nav,
    writable: true,
    configurable: true
  });
}

test.after(() => {
  for (const f of tempFilesCreated) {
    try { fs.unlinkSync(f); } catch {}
  }
  fs.rmSync(tempDir, { recursive: true, force: true });
});

test('EN/ES rendering, WhatsApp payload, and best-time link formatting across all lane keys', { timeout: 5000 }, async () => {
  setupMocks();
  const container = document.createElement('div');
  const root = createRoot(container);

  const testCases = [
    { lane: 'passenger_standard', expectedUrl: 'https://borderpulse.com/crossing/san-ysidro/', labelEn: 'Standard passenger', labelEs: 'Auto estándar' },
    { lane: 'passenger_ready', expectedUrl: 'https://borderpulse.com/crossing/san-ysidro/?lane=passenger_ready', labelEn: 'Ready Lane', labelEs: 'Ready Lane' },
    { lane: 'passenger_sentri', expectedUrl: 'https://borderpulse.com/crossing/san-ysidro/?lane=passenger_sentri', labelEn: 'SENTRI', labelEs: 'SENTRI' },
    { lane: 'pedestrian_standard', expectedUrl: 'https://borderpulse.com/crossing/san-ysidro/?lane=pedestrian_standard', labelEn: 'Pedestrian', labelEs: 'Peatones' },
  ];

  for (const tc of testCases) {
    // EN
    act(() => {
      root.render(
        React.createElement(MemoryRouter, null,
          React.createElement(CrossingShare, { name: 'San Ysidro', slug: 'san-ysidro', language: 'en', lane: tc.lane })
        )
      );
    });

    const linksEn = getLinks(container);
    assert.equal(linksEn.bestTimeLink.href, '/best-time/san-ysidro/');
    assert.equal(
      linksEn.whatsappLink.href,
      'https://wa.me/?text=' + encodeURIComponent(`Check San Ysidro (${tc.labelEn}) wait times and crossing hours on BorderPulse.\n${tc.expectedUrl}`)
    );

    // ES
    act(() => {
      root.render(
        React.createElement(MemoryRouter, null,
          React.createElement(CrossingShare, { name: 'San Ysidro', slug: 'san-ysidro', language: 'es', lane: tc.lane })
        )
      );
    });

    const linksEs = getLinks(container);
    assert.equal(linksEs.bestTimeLink.href, '/best-time/san-ysidro/');
    assert.equal(
      linksEs.whatsappLink.href,
      'https://wa.me/?text=' + encodeURIComponent(`Consulta los tiempos de espera y horarios de San Ysidro (${tc.labelEs}) en BorderPulse.\n${tc.expectedUrl}`)
    );
  }

  act(() => { root.unmount(); });
});

test('React StrictMode mount/cleanup/replay behavior allows current actions', { timeout: 5000 }, async () => {
  const copied = [];
  setupMocks({
    clipboardWriteText: async (url) => { copied.push(url); }
  });

  const container = document.createElement('div');
  const root = createRoot(container);

  act(() => {
    root.render(
      React.createElement(React.StrictMode, null,
        React.createElement(MemoryRouter, null,
          React.createElement(CrossingShare, { name: 'San Ysidro', slug: 'san-ysidro', language: 'en' })
        )
      )
    );
  });

  const { copyBtn } = getButtons(container);
  await act(async () => {
    await copyBtn.onClick();
  });

  assert.deepEqual(copied, ['https://borderpulse.com/crossing/san-ysidro/']);
  assert.equal(getStatusText(container), 'Link copied.');
  assert.deepEqual(analyticsEvents, [{ event: 'crossing-share', data: { slug: 'san-ysidro', method: 'copy' } }]);

  act(() => { root.unmount(); });
});

test('Copy link success sets feedback and emits crossing-share event', { timeout: 5000 }, async () => {
  const copied = [];
  setupMocks({
    clipboardWriteText: async (url) => { copied.push(url); }
  });

  const container = document.createElement('div');
  const root = createRoot(container);

  act(() => {
    root.render(
      React.createElement(MemoryRouter, null,
        React.createElement(CrossingShare, { name: 'San Ysidro', slug: 'san-ysidro', language: 'en', lane: 'passenger_standard' })
      )
    );
  });

  const { copyBtn } = getButtons(container);
  await act(async () => {
    await copyBtn.onClick();
  });

  assert.deepEqual(copied, ['https://borderpulse.com/crossing/san-ysidro/']);
  assert.equal(getStatusText(container), 'Link copied.');
  assert.deepEqual(analyticsEvents, [{ event: 'crossing-share', data: { slug: 'san-ysidro', method: 'copy' } }]);

  act(() => { root.unmount(); });
});

test('Native share success clears status and emits crossing-share native event', { timeout: 5000 }, async () => {
  const shared = [];
  setupMocks({
    nativeShare: async (payload) => { shared.push(payload); }
  });

  const container = document.createElement('div');
  const root = createRoot(container);

  act(() => {
    root.render(
      React.createElement(MemoryRouter, null,
        React.createElement(CrossingShare, { name: 'San Ysidro', slug: 'san-ysidro', language: 'en' })
      )
    );
  });

  const { shareBtn } = getButtons(container);
  await act(async () => {
    await shareBtn.onClick();
  });

  assert.deepEqual(shared, [{
    title: 'San Ysidro | BorderPulse',
    text: 'Check San Ysidro (Standard passenger) wait times and crossing hours on BorderPulse.',
    url: 'https://borderpulse.com/crossing/san-ysidro/'
  }]);
  assert.equal(getStatusText(container), '');
  assert.deepEqual(analyticsEvents, [{ event: 'crossing-share', data: { slug: 'san-ysidro', method: 'native' } }]);

  act(() => { root.unmount(); });
});

test('Exhaustive missing, non-function, and throwing getter/method API failures handle errors honestly without crashing', { timeout: 5000 }, async () => {
  // Failures expect error status ('Copy the link from your address bar.')
  const failureScenarios = [
    { navObj: undefined },
    { navObj: {} },
    { navObj: { clipboard: {} } },
    { navObj: { clipboard: { writeText: 'not-a-function' } } },
    { navObj: Object.defineProperty({}, 'share', { get() { throw new Error('Share accessor denied'); }, configurable: true }) },
    { navObj: Object.defineProperty({}, 'clipboard', { get() { throw new Error('Clipboard accessor denied'); }, configurable: true }) },
    { navObj: { clipboard: Object.defineProperty({}, 'writeText', { get() { throw new Error('writeText getter denied'); }, configurable: true }) } },
    { navObj: { clipboard: { writeText: () => { throw new Error('writeText sync throw'); } } } },
    { navObj: { clipboard: { writeText: async () => { throw new Error('writeText async rejection'); } } } },
    { navObj: { share: () => { throw new Error('share sync throw'); }, clipboard: { writeText: async () => { throw new Error('fallback fail'); } } } },
  ];

  for (const sc of failureScenarios) {
    setupMocks({ navObj: sc.navObj });
    const container = document.createElement('div');
    const root = createRoot(container);

    act(() => {
      root.render(
        React.createElement(MemoryRouter, null,
          React.createElement(CrossingShare, { name: 'San Ysidro', slug: 'san-ysidro', language: 'en' })
        )
      );
    });

    const { copyBtn, shareBtn } = getButtons(container);

    await act(async () => {
      await copyBtn.onClick();
    });

    assert.equal(getStatusText(container), 'Copy the link from your address bar.');
    assert.deepEqual(analyticsEvents, [], 'No analytics event emitted on failure');

    await act(async () => {
      await shareBtn.onClick();
    });

    assert.equal(getStatusText(container), 'Copy the link from your address bar.');
    assert.deepEqual(analyticsEvents, [], 'No analytics event emitted on share fallback failure');

    act(() => { root.unmount(); });
  }

  // Success scenario: share is non-function but clipboard.writeText works -> falls back to copy and succeeds!
  const copied = [];
  const validClipboardNav = {
    share: 'not-a-function',
    clipboard: {
      writeText: function(url) {
        if (this !== validClipboardNav.clipboard) throw new TypeError('Illegal invocation');
        copied.push(url);
      }
    }
  };

  setupMocks({ navObj: validClipboardNav });
  const container2 = document.createElement('div');
  const root2 = createRoot(container2);

  act(() => {
    root2.render(
      React.createElement(MemoryRouter, null,
        React.createElement(CrossingShare, { name: 'San Ysidro', slug: 'san-ysidro', language: 'en' })
      )
    );
  });

  const { shareBtn: shareBtn2 } = getButtons(container2);
  await act(async () => {
    await shareBtn2.onClick();
  });

  assert.deepEqual(copied, ['https://borderpulse.com/crossing/san-ysidro/']);
  assert.equal(getStatusText(container2), 'Link copied.', 'Non-function share with working clipboard falls back to copy success');
  assert.deepEqual(analyticsEvents, [{ event: 'crossing-share', data: { slug: 'san-ysidro', method: 'copy' } }]);

  act(() => { root2.unmount(); });
});

test('AbortError native share cancellation remains silent without copying or setting status', { timeout: 5000 }, async () => {
  const copied = [];
  setupMocks({
    clipboardWriteText: async (url) => { copied.push(url); },
    nativeShare: async () => {
      const err = new Error('Share cancelled');
      err.name = 'AbortError';
      throw err;
    }
  });

  const container = document.createElement('div');
  const root = createRoot(container);

  act(() => {
    root.render(
      React.createElement(MemoryRouter, null,
        React.createElement(CrossingShare, { name: 'San Ysidro', slug: 'san-ysidro', language: 'en' })
      )
    );
  });

  const { shareBtn } = getButtons(container);
  await act(async () => {
    await shareBtn.onClick();
  });

  assert.deepEqual(copied, []);
  assert.equal(getStatusText(container), '');
  assert.deepEqual(analyticsEvents, []);

  act(() => { root.unmount(); });
});

test('Current native non-Abort error falls back to copy on current context', { timeout: 5000 }, async () => {
  const copied = [];
  setupMocks({
    clipboardWriteText: async (url) => { copied.push(url); },
    nativeShare: async () => {
      const err = new Error('NotAllowedError');
      err.name = 'NotAllowedError';
      throw err;
    }
  });

  const container = document.createElement('div');
  const root = createRoot(container);

  act(() => {
    root.render(
      React.createElement(MemoryRouter, null,
        React.createElement(CrossingShare, { name: 'San Ysidro', slug: 'san-ysidro', language: 'en' })
      )
    );
  });

  const { shareBtn } = getButtons(container);
  await act(async () => {
    await shareBtn.onClick();
  });

  assert.deepEqual(copied, ['https://borderpulse.com/crossing/san-ysidro/']);
  assert.equal(getStatusText(container), 'Link copied.');
  assert.deepEqual(analyticsEvents, [{ event: 'crossing-share', data: { slug: 'san-ysidro', method: 'copy' } }]);

  act(() => { root.unmount(); });
});

test('Stale native share rejection before fallback is ignored on context change', { timeout: 5000 }, async () => {
  const copied = [];
  const shareDef = deferred();
  setupMocks({
    clipboardWriteText: async (url) => { copied.push(url); },
    nativeShare: () => shareDef.promise
  });

  const container = document.createElement('div');
  const root = createRoot(container);

  act(() => {
    root.render(
      React.createElement(MemoryRouter, null,
        React.createElement(CrossingShare, { name: 'San Ysidro', slug: 'san-ysidro', language: 'en' })
      )
    );
  });

  const { shareBtn } = getButtons(container);
  let sharePromise;
  act(() => {
    sharePromise = shareBtn.onClick();
  });

  // Rerender for different crossing
  act(() => {
    root.render(
      React.createElement(MemoryRouter, null,
        React.createElement(CrossingShare, { name: 'Otay Mesa', slug: 'otay-mesa', language: 'en' })
      )
    );
  });

  // Reject the old native share with a non-Abort error
  const err = new Error('Native share failed');
  err.name = 'NotAllowedError';
  await act(async () => {
    shareDef.reject(err);
    await sharePromise.catch(() => {});
  });

  assert.deepEqual(copied, []);
  assert.equal(getStatusText(container), '');
  assert.deepEqual(analyticsEvents, []);

  act(() => { root.unmount(); });
});

test('Independent context field changes (slug, lane, language, name) each reset status and invalidate pending copy requests', { timeout: 5000 }, async () => {
  const fieldChanges = [
    { field: 'slug', initial: { name: 'San Ysidro', slug: 'san-ysidro', language: 'en', lane: 'passenger_standard' }, next: { name: 'San Ysidro', slug: 'otay-mesa', language: 'en', lane: 'passenger_standard' } },
    { field: 'lane', initial: { name: 'San Ysidro', slug: 'san-ysidro', language: 'en', lane: 'passenger_standard' }, next: { name: 'San Ysidro', slug: 'san-ysidro', language: 'en', lane: 'passenger_sentri' } },
    { field: 'language', initial: { name: 'San Ysidro', slug: 'san-ysidro', language: 'en', lane: 'passenger_standard' }, next: { name: 'San Ysidro', slug: 'san-ysidro', language: 'es', lane: 'passenger_standard' } },
    { field: 'name', initial: { name: 'San Ysidro', slug: 'san-ysidro', language: 'en', lane: 'passenger_standard' }, next: { name: 'San Ysidro Land Port', slug: 'san-ysidro', language: 'en', lane: 'passenger_standard' } },
  ];

  for (const tc of fieldChanges) {
    const copyDef = deferred();
    const copied = [];
    setupMocks({
      clipboardWriteText: (url) => {
        copied.push(url);
        return copyDef.promise;
      }
    });

    const container = document.createElement('div');
    const root = createRoot(container);

    act(() => {
      root.render(
        React.createElement(MemoryRouter, null,
          React.createElement(CrossingShare, tc.initial)
        )
      );
    });

    const { copyBtn } = getButtons(container);
    let p1;
    act(() => {
      p1 = copyBtn.onClick();
    });

    // Change context field
    act(() => {
      root.render(
        React.createElement(MemoryRouter, null,
          React.createElement(CrossingShare, tc.next)
        )
      );
    });

    assert.equal(getStatusText(container), '', `Status must reset when ${tc.field} changes`);

    await act(async () => {
      copyDef.resolve();
      await p1;
    });

    assert.equal(getStatusText(container), '', `Stale copy result must be ignored when ${tc.field} changed`);
    assert.deepEqual(analyticsEvents, [], `No analytics event emitted for stale ${tc.field} change`);

    act(() => { root.unmount(); });
  }
});

test('Rapid A -> B -> A context switch invalidates the first A request', { timeout: 5000 }, async () => {
  const reqA1 = deferred();
  const reqB = deferred();
  const reqA2 = deferred();

  const copied = [];
  setupMocks({
    clipboardWriteText: (url) => {
      copied.push(url);
      if (url.includes('san-ysidro') && copied.filter(u => u.includes('san-ysidro')).length === 1) return reqA1.promise;
      if (url.includes('otay-mesa')) return reqB.promise;
      return reqA2.promise;
    }
  });

  const container = document.createElement('div');
  const root = createRoot(container);

  const propsA = { name: 'San Ysidro', slug: 'san-ysidro', language: 'en', lane: 'passenger_standard' };
  const propsB = { name: 'Otay Mesa', slug: 'otay-mesa', language: 'en', lane: 'passenger_standard' };

  // Mount A and start request A1
  act(() => {
    root.render(React.createElement(MemoryRouter, null, React.createElement(CrossingShare, propsA)));
  });

  let pA1;
  act(() => {
    pA1 = getButtons(container).copyBtn.onClick();
  });

  // Switch to B and start request B
  act(() => {
    root.render(React.createElement(MemoryRouter, null, React.createElement(CrossingShare, propsB)));
  });

  let pB;
  act(() => {
    pB = getButtons(container).copyBtn.onClick();
  });

  // Switch back to A
  act(() => {
    root.render(React.createElement(MemoryRouter, null, React.createElement(CrossingShare, propsA)));
  });

  // Resolve request A1 from first A
  await act(async () => {
    reqA1.resolve();
    await pA1;
  });

  assert.equal(getStatusText(container), '', 'Request 1 from first A must be ignored after A->B->A switch');
  assert.deepEqual(analyticsEvents, []);

  // Trigger new request on A (A2)
  let pA2;
  act(() => {
    pA2 = getButtons(container).copyBtn.onClick();
  });

  // Resolve reqB and reqA2
  await act(async () => {
    reqB.resolve();
    reqA2.resolve();
    await pB;
    await pA2;
  });

  assert.equal(getStatusText(container), 'Link copied.');
  assert.deepEqual(analyticsEvents, [{ event: 'crossing-share', data: { slug: 'san-ysidro', method: 'copy' } }]);

  act(() => { root.unmount(); });
});

test('Overlapping paired deferred requests: old request settling does not clear or corrupt latest active request status or pending guard', { timeout: 5000 }, async () => {
  const reqA = deferred();
  const reqB = deferred();

  const copied = [];
  setupMocks({
    clipboardWriteText: (url) => {
      copied.push(url);
      if (url.includes('san-ysidro')) return reqA.promise;
      return reqB.promise;
    }
  });

  const container = document.createElement('div');
  const root = createRoot(container);

  // Mount A
  act(() => {
    root.render(React.createElement(MemoryRouter, null, React.createElement(CrossingShare, { name: 'San Ysidro', slug: 'san-ysidro', language: 'en' })));
  });

  let pA;
  act(() => {
    pA = getButtons(container).copyBtn.onClick();
  });

  // Switch to B
  act(() => {
    root.render(React.createElement(MemoryRouter, null, React.createElement(CrossingShare, { name: 'Otay Mesa', slug: 'otay-mesa', language: 'en' })));
  });

  // Click Copy on B
  let pB;
  act(() => {
    pB = getButtons(container).copyBtn.onClick();
  });

  // Old request A settles first
  await act(async () => {
    reqA.resolve();
    await pA;
  });

  assert.equal(getStatusText(container), '', 'Settling old request A must not alter B status');

  // Request B settles second
  await act(async () => {
    reqB.resolve();
    await pB;
  });

  assert.equal(getStatusText(container), 'Link copied.');
  assert.deepEqual(analyticsEvents, [{ event: 'crossing-share', data: { slug: 'otay-mesa', method: 'copy' } }]);

  act(() => { root.unmount(); });
});

test('Unmount invalidation during native share and fallback copy requests', { timeout: 5000 }, async () => {
  // Scenario 1: Unmount during native share
  const shareDef = deferred();
  setupMocks({
    nativeShare: () => shareDef.promise
  });

  const container = document.createElement('div');
  const root = createRoot(container);

  act(() => {
    root.render(React.createElement(MemoryRouter, null, React.createElement(CrossingShare, { name: 'San Ysidro', slug: 'san-ysidro' })));
  });

  let pShare;
  act(() => {
    pShare = getButtons(container).shareBtn.onClick();
  });

  act(() => { root.unmount(); });

  await act(async () => {
    shareDef.resolve();
    await pShare;
  });

  assert.deepEqual(analyticsEvents, []);

  // Scenario 2: Unmount during fallback copy
  const copyDef = deferred();
  setupMocks({
    clipboardWriteText: () => copyDef.promise,
    nativeShare: async () => { throw new Error('Native share failed'); }
  });

  const container2 = document.createElement('div');
  const root2 = createRoot(container2);

  act(() => {
    root2.render(React.createElement(MemoryRouter, null, React.createElement(CrossingShare, { name: 'San Ysidro', slug: 'san-ysidro' })));
  });

  let pFallback;
  act(() => {
    pFallback = getButtons(container2).shareBtn.onClick();
  });

  act(() => { root2.unmount(); });

  await act(async () => {
    copyDef.resolve();
    await pFallback;
  });

  assert.deepEqual(analyticsEvents, []);
});

test('Pending rapid clicks are guarded synchronously and retries work after completion', { timeout: 5000 }, async () => {
  let copyCallCount = 0;
  const copyDef = deferred();
  setupMocks({
    clipboardWriteText: () => {
      copyCallCount++;
      return copyDef.promise;
    }
  });

  const container = document.createElement('div');
  const root = createRoot(container);

  act(() => {
    root.render(
      React.createElement(MemoryRouter, null,
        React.createElement(CrossingShare, { name: 'San Ysidro', slug: 'san-ysidro', language: 'en' })
      )
    );
  });

  const { copyBtn } = getButtons(container);

  // Synchronous rapid clicks
  let p1, p2;
  act(() => {
    p1 = copyBtn.onClick();
    p2 = copyBtn.onClick();
  });

  assert.equal(copyCallCount, 1, 'Only one copy request should be initiated while pending');

  // Resolve the first request
  await act(async () => {
    copyDef.resolve();
    await p1;
    await p2;
  });

  assert.equal(getStatusText(container), 'Link copied.');

  // Retry click on completed request
  const retryDef = deferred();
  setupMocks({
    clipboardWriteText: () => {
      copyCallCount++;
      return retryDef.promise;
    }
  });

  let p3;
  act(() => {
    p3 = copyBtn.onClick();
  });

  assert.equal(copyCallCount, 2, 'Retry click should initiate a new request when no longer pending');

  await act(async () => {
    retryDef.resolve();
    await p3;
  });

  act(() => { root.unmount(); });
});
