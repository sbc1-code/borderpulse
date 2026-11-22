import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const containerSelector = '[id="container-180a8c300ca7dd92be799ce6c11cd06a"]';
const mockCreative = `
(() => {
  const slot = document.querySelector(${JSON.stringify(containerSelector)});
  const fixture = document.createElement('div');
  fixture.dataset.testid = 'mock-ad-slot';
  fixture.textContent = 'Local diagnostic fixture';
  fixture.style.cssText = 'width:280px;height:120px;background:#e2e8f0;color:#334155;display:grid;place-items:center';
  slot.appendChild(fixture);
})();
`;

// All non-local traffic is intercepted. The provider script is either aborted
// or replaced with inert local text, never fetched; no live ads or clicks.
export async function checkAdSlotDiagnostics(browser, baseUrl) {
  for (const mobile of [false, true]) {
    for (const language of ['en', 'es']) {
      for (const outcome of ['ready', 'error']) {
        const context = await browser.newContext({
          viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 },
          isMobile: mobile, hasTouch: mobile, serviceWorkers: 'block',
        });
        let adRequests = 0;
        const pageErrors = [];
        try {
          await context.addInitScript((lang) => {
            localStorage.setItem('borderPulse_language', lang);
            window.adDiagnosticEvents = [];
            window.umami = { track: (event, data) => {
              if (event === 'ad-slot-diagnostic') window.adDiagnosticEvents.push(data);
            } };
          }, language);
          await context.route('**/*', async (route) => {
            const url = new URL(route.request().url());
            if (url.hostname === 'pl29156330.profitableratecpmnetwork.com') {
              adRequests += 1;
              if (outcome === 'ready') await route.fulfill({ contentType: 'text/javascript', body: mockCreative });
              else await route.abort('blockedbyclient');
            } else if (url.origin === baseUrl.origin) await route.continue();
            else await route.abort('blockedbyclient');
          });
          const page = await context.newPage();
          page.on('pageerror', (error) => pageErrors.push(error.message));
          await page.goto(new URL('/', baseUrl).href);
          await page.waitForFunction((state) => window.adDiagnosticEvents.some(e => e.state === state),
            outcome === 'ready' ? 'script-ready' : 'script-error');
          const slot = page.locator(containerSelector);
          const disclosure = page.getByRole('link', {
            name: language === 'en' ? 'Privacy details' : 'Detalles de privacidad', exact: true,
          });
          assert.equal(await disclosure.getAttribute('href'), language === 'en'
            ? '/privacy/#advertising' : '/privacidad/#advertising');
          assert.equal(await page.locator(`${containerSelector} + script`).count(), 1);
          if (outcome === 'ready') {
            await page.getByTestId('mock-ad-slot').waitFor();
            await slot.scrollIntoViewIfNeeded();
            await page.waitForFunction(() => window.adDiagnosticEvents.some(e => e.state === 'slot-visible'));
            // Mutations and repeated viewport transitions must not inflate the
            // lifetime's three structural diagnostics or reload the ad script.
            await page.evaluate((selector) => {
              document.querySelector(selector).appendChild(document.createElement('span'));
            }, containerSelector);
            await page.evaluate(() => window.scrollTo(0, 0));
            await slot.scrollIntoViewIfNeeded();
            await page.evaluate((lang) => window.dispatchEvent(new StorageEvent('storage', {
              key: 'borderPulse_language', newValue: lang === 'en' ? 'es' : 'en',
            })), language);
            await page.getByRole('link', {
              name: language === 'en' ? 'Detalles de privacidad' : 'Privacy details', exact: true,
            }).waitFor();
            await page.evaluate((lang) => window.dispatchEvent(new StorageEvent('storage', {
              key: 'borderPulse_language', newValue: lang,
            })), language);
            await disclosure.waitFor();
          } else {
            await disclosure.scrollIntoViewIfNeeded();
            assert.equal(await slot.locator('*').count(), 0);
          }
          await page.waitForTimeout(100);
          const expected = outcome === 'ready'
            ? ['container-populated', 'script-ready', 'slot-visible'] : ['script-error'];
          let events = await page.evaluate(() => window.adDiagnosticEvents);
          assert.deepEqual(events.map(e => e.state).sort(), expected.sort());
          assert.ok(events.every(e => Object.keys(e).sort().join(',') === 'slot,state'
            && e.slot === 'dashboard-native'), 'payload must contain only the two fixed enums');
          assert.equal(adRequests, 1, 'one original ad-script attempt per mount, no retries');
          assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
          if (process.env.AD_SLOT_QA_SCREENSHOTS) {
            fs.mkdirSync(process.env.AD_SLOT_QA_SCREENSHOTS, { recursive: true });
            await page.screenshot({ path: path.join(process.env.AD_SLOT_QA_SCREENSHOTS,
              `${mobile ? 'mobile' : 'desktop'}-${language}-${outcome}.png`) });
          }
          // Leaving and returning creates a new legitimate mount; callbacks
          // from the old detached script must not survive route cleanup.
          await page.evaluate((selector) => {
            window.detachedAdScript = document.querySelector(selector).nextElementSibling;
          }, containerSelector);
          await page.locator('a[href="/about/"]').filter({ visible: true }).first().click();
          await page.waitForURL(url => url.pathname === '/about/');
          await slot.waitFor({ state: 'detached' });
          await page.evaluate(() => {
            window.detachedAdScript.dispatchEvent(new Event('load'));
            window.detachedAdScript.dispatchEvent(new Event('error'));
          });
          assert.equal((await page.evaluate(() => window.adDiagnosticEvents)).length, expected.length);
          await page.goBack();
          await page.waitForFunction((state) => window.adDiagnosticEvents.filter(e => e.state === state).length === 2,
            outcome === 'ready' ? 'script-ready' : 'script-error');
          if (outcome === 'ready') {
            await page.locator(containerSelector).scrollIntoViewIfNeeded();
            await page.waitForFunction(() => window.adDiagnosticEvents.filter(e => e.state === 'slot-visible').length === 2);
          }
          events = await page.evaluate(() => window.adDiagnosticEvents);
          assert.deepEqual(events.map(e => e.state).sort(), [...expected, ...expected].sort());
          assert.equal(adRequests, 2, 'Back gets only the existing new-mount script attempt');
          assert.deepEqual(pageErrors, []);
        } finally {
          await context.close();
        }
      }
    }
  }
  console.log('[ad-slots] PASS: desktop/mobile EN/ES mocked success/error, fixed payloads, rerenders, cleanup and Back; all external traffic intercepted');
}
