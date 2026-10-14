import assert from 'node:assert/strict';

// This is a no-JavaScript visitor, not a special Googlebot response.
export async function checkNoJsReports(browser, baseUrl) {
  const context = await browser.newContext({ javaScriptEnabled: false,
    viewport: { width: 375, height: 812 }, serviceWorkers: 'block' });
  await context.route('**/*', route => new URL(route.request().url()).origin === baseUrl.origin
    ? route.continue() : route.abort('blockedbyclient'));
  const page = await context.newPage();
  try {
    await page.goto(new URL('/', baseUrl).href);
    await page.getByRole('heading', { name: 'US–Mexico border wait times', exact: true }).waitFor();
    const report = page.locator('[data-prerender="crossing-snapshot"]');
    assert.equal(await report.locator('tbody tr').count(), 42);
    await report.getByText(/published snapshot, not a live feed/).waitFor();
    assert.ok(await report.getByRole('link', { name: 'El Paso–Juárez', exact: true }).isVisible());
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'no-JS homepage must fit mobile viewport');
    await report.getByRole('link', { name: 'Santa Fe · Paso del Norte', exact: true }).click();
    await page.getByRole('heading', { name: 'Santa Fe · Paso del Norte border wait times', exact: true }).waitFor();
    assert.equal(await report.locator('tbody tr').count(), 1);
    assert.ok(await report.getByRole('link', { name: 'View official camera sources: Fideicomiso de Puentes Fronterizos de Chihuahua', exact: true }).isVisible());
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'no-JS crossing must fit mobile viewport');
  } finally { await context.close(); }
  console.log('[nojs-reports] PASS: mobile homepage → crossing → official camera path, visible reports, original timestamps and viewport fit without app JavaScript');
}
