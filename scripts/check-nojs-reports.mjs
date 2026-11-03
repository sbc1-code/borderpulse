import assert from 'node:assert/strict';
import fs from 'node:fs';
import { snapshotDocument } from './lib/crossing-snapshot-html.mjs';

// This is a no-JavaScript visitor, not a special Googlebot response.
export async function checkNoJsReports(browser, baseUrl) {
  const context = await browser.newContext({ javaScriptEnabled: false,
    viewport: { width: 375, height: 812 }, serviceWorkers: 'block' });
  await context.route('**/*', route => new URL(route.request().url()).origin === baseUrl.origin
    ? route.continue() : route.abort('blockedbyclient'));
  // vite preview does not execute Vercel functions. For an API-mode artifact,
  // emulate only the function's bundled fallback; endpoint timing/cache tests
  // separately exercise the actual handler. Pages artifacts use their real file.
  if (!fs.existsSync(new URL('../dist/snapshot/index.html', import.meta.url))) {
    const bundled = JSON.parse(fs.readFileSync(new URL('../public/data/crossings.json', import.meta.url)));
    await context.route(url => url.origin === baseUrl.origin && /^\/snapshot\/(es\/)?$/.test(url.pathname), route =>
      route.fulfill({ contentType: 'text/html', body: snapshotDocument(bundled, {
        lang: new URL(route.request().url()).pathname.includes('/es/') ? 'es' : 'en', framed: true,
      }) }));
  }
  const page = await context.newPage();
  try {
    await page.goto(new URL('/', baseUrl).href);
    const frame = page.frameLocator('iframe[title="Published snapshot of reported border waits"]');
    const report = frame.locator('[data-prerender="crossing-snapshot"]');
    await report.getByRole('heading', { name: 'US–Mexico border wait times', exact: true }).waitFor();
    assert.equal(await report.locator('tbody tr').count(), 42);
    await report.getByText(/published snapshot, not a live feed/).waitFor();
    assert.ok(await report.getByRole('link', { name: 'El Paso–Juárez', exact: true }).isVisible());
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'no-JS homepage must fit mobile viewport');
    await report.getByRole('link', { name: 'Santa Fe · Paso del Norte', exact: true }).click();
    await page.getByRole('heading', { name: 'Santa Fe · Paso del Norte border wait times', exact: true }).waitFor();
    const crossing = page.locator('[data-prerender="crossing-snapshot"]');
    assert.equal(await crossing.locator('tbody tr').count(), 1);
    assert.ok(await crossing.getByRole('link', { name: 'View official camera sources: Fideicomiso de Puentes Fronterizos de Chihuahua', exact: true }).isVisible());
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'no-JS crossing must fit mobile viewport');
    await page.goto(new URL('/es/', baseUrl).href);
    const spanishFrame = await page.locator('iframe[src="/snapshot/es/"]').count() > 0;
    const spanish = spanishFrame ? page.frameLocator('iframe[src="/snapshot/es/"]') : page;
    await spanish.getByRole('heading', { name: 'Tiempos de espera en la frontera EE.UU.-México', exact: true }).waitFor();
    await spanish.getByText(/instantánea publicada, no un feed en vivo/).waitFor();
    assert.equal(await spanish.locator('tbody tr').count(), 42);
  } finally { await context.close(); }
  console.log('[nojs-reports] PASS: mobile homepage → crossing → official camera path, visible reports, original timestamps and viewport fit without app JavaScript');
}
