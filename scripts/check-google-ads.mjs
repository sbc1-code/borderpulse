import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/lib/googleAds.js', import.meta.url), 'utf8');
const ads = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
assert.equal(ads.GOOGLE_ADS_ENABLED, false, 'Preparation must not activate Google ads');
const production = new URL('https://borderpulse.com/');
assert.equal(ads.googleAdsAllowed(production), false);
assert.equal(ads.googleAdsAllowed(production, true), true);
for (const url of ['https://example.vercel.app/tools/test', 'http://localhost:3000/tools/test', 'https://digito.technology/play', 'https://digito.technology/play/touchline', 'https://borderpulse.com/crossing/san-ysidro']) {
  assert.equal(ads.googleAdsAllowed(new URL(url), true), false, url);
}

const scripts = [];
const requests = [];
const tcfCalls = [];
const privacyStates = [];
let tcfListener;
let reopened = 0;
globalThis.window = {
  location: production,
  adsbygoogle: { push: (request) => requests.push(request) },
  __tcfapi: (command, version, callback, id) => {
    tcfCalls.push([command, version, id]);
    if (command === 'addEventListener') tcfListener = callback;
  },
};
globalThis.document = {
  getElementById: (id) => scripts.find((script) => script.id === id),
  createElement: () => ({}),
  head: { appendChild: (script) => scripts.push(script) },
};
const element = { dataset: {} };
ads.requestGoogleAd(element, (value) => privacyStates.push(value));
assert.equal(scripts.length, 0);
assert.equal(window.googlefc, undefined, 'Disabled means no CMP bootstrap either');
const cleanup = ads.requestGoogleAd(element, (value) => privacyStates.push(value), true);
assert.equal(scripts.length, 1);
assert.equal(scripts[0].crossOrigin, 'anonymous');
assert.match(scripts[0].src, /client=ca-pub-7889422382615234$/);
assert.equal(requests.length, 1);
window.googlefc.showRevocationMessage = () => { reopened += 1; };
window.googlefc.callbackQueue.shift().CONSENT_API_READY();
tcfListener({ gdprApplies: false, listenerId: 7 }, true);
tcfListener({ gdprApplies: true, listenerId: 7 }, true);
assert.deepEqual(privacyStates, [false, true]);
assert.equal(window.googlefc.usstatesoptout, undefined, 'Keep Google’s default US opt-out link');
cleanup();
tcfListener({ gdprApplies: true, listenerId: 7 }, true);
assert.equal(privacyStates.length, 2, 'Unmounted components must not update');
assert.deepEqual(tcfCalls.at(-1), ['removeEventListener', 0, 7]);
ads.requestGoogleAd(element, () => {}, true)();
assert.equal(scripts.length, 1, 'Load SDK once');
assert.equal(requests.length, 1, 'Effect replay must not refresh the ad');
window.googlefc.callbackQueue.length = 0;
const pendingCleanup = ads.requestGoogleAd({ dataset: {} }, () => assert.fail('late callback'), true);
window.googlefc.callbackQueue.shift().CONSENT_API_READY();
pendingCleanup();
tcfListener({ gdprApplies: true, listenerId: 8 }, true);
assert.deepEqual(tcfCalls.at(-1), ['removeEventListener', 0, 8], 'Detach a delayed initial TCF callback after unmount');
ads.reopenGooglePrivacy();
window.googlefc.callbackQueue.shift().CONSENT_API_READY();
assert.equal(reopened, 1, 'Withdrawal uses the supported Google callback');
window.location = new URL('https://example.vercel.app/tools/test');
ads.requestGoogleAd({ dataset: {} }, () => {}, true);
assert.equal(requests.length, 2, 'No preview ad requests');
delete globalThis.window;
delete globalThis.document;
console.log('Google ad preparation: inactive default, production/route boundaries, singleton SDK, no refresh and native privacy controls passed.');
