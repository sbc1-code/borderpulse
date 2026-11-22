import test from 'node:test';
import assert from 'node:assert/strict';
import { readStorage, writeStorage, languageValue, themeValue, readFavorites } from '../src/lib/browserStorage.js';

test('blocked storage getter does not prevent default preferences or empty favorites', () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new Error('blocked storage'); } });
  try {
    assert.equal(readStorage('borderPulse_language', 'en'), 'en');
    assert.deepEqual(readFavorites(), []);
    assert.equal(writeStorage('borderPulse_theme', 'dark'), false);
  } finally {
    if (previous) Object.defineProperty(globalThis, 'localStorage', previous);
    else delete globalThis.localStorage;
  }
});

test('favorites accept only unique canonical port identifiers from a JSON array', () => {
  const previous = globalThis.localStorage;
  let value;
  globalThis.localStorage = { getItem: () => value };
  try {
    for (value of ['{}', 'null', '42', '"250401"', 'invalid', null]) assert.deepEqual(readFavorites(), []);
    value = '["250401",null,250601,{},"<script>","250401","250601"]';
    assert.deepEqual(readFavorites(), ['250401', '250601']);
  } finally {
    if (previous) globalThis.localStorage = previous;
    else delete globalThis.localStorage;
  }
});

test('preference values stay in the supported language and theme sets', () => {
  assert.equal(languageValue('es'), 'es');
  assert.equal(themeValue('dark'), 'dark');
  for (const value of [null, undefined, '', {}, 'invalid']) {
    assert.equal(languageValue(value), 'en');
    assert.equal(themeValue(value), 'light');
  }
});

test('write success is distinguishable from a quota failure without throwing', () => {
  const previous = globalThis.localStorage;
  const writes = [];
  globalThis.localStorage = { setItem: (...args) => writes.push(args) };
  try {
    assert.equal(writeStorage('borderPulse_theme', 'dark'), true);
    assert.deepEqual(writes, [['borderPulse_theme', 'dark']]);
    globalThis.localStorage.setItem = () => { throw new Error('quota'); };
    assert.equal(writeStorage('borderPulse_theme', 'light'), false);
  } finally {
    if (previous) globalThis.localStorage = previous;
    else delete globalThis.localStorage;
  }
});
