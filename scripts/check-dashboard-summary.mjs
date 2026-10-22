import assert from 'node:assert/strict';
import fs from 'node:fs';

// A cold module request is held until the test releases it. This proves the
// report list works during loading, instead of hiding a first-open regression.
export async function checkDashboardSummary(owner, context, baseUrl) {
  const snapshot = JSON.parse(fs.readFileSync(new URL('../public/data/crossings.json', import.meta.url)));
  snapshot.fetched_at = new Date().toISOString();
  const port = snapshot.crossings.find(row => row.port_number === '250401');
  port.current_wait_time = 60;
  port.lanes.passenger_standard = { status: 'Delay', delay_minutes: 60, lanes_open: 1 };
  const errors = [];
  for (const language of ['en', 'es']) {
    const qa = await context.browser().newContext({ viewport: owner.viewportSize(), serviceWorkers: 'block', reducedMotion: 'reduce' });
    await qa.addInitScript(value => {
      localStorage.setItem('borderPulse_language', value);
      window.summaryEvents = [];
      window.umami = { track: (event, data) => window.summaryEvents.push({ event, data }) };
    }, language);
    await qa.route('**/*', route => new URL(route.request().url()).origin === baseUrl.origin ? route.continue() : route.abort('blockedbyclient'));
    await qa.route(url => ['/data/crossings.json', '/api/public/crossings'].includes(url.pathname), route => route.fulfill({ contentType: 'application/json', body: JSON.stringify(snapshot) }));
    let requests = 0, fail = false, release;
    const pending = new Promise(resolve => { release = resolve; });
    const asset = /\/assets\/DashboardSummary-[^/]+\.js$/;
    await qa.route(asset, async route => {
      requests++;
      if (fail) return route.abort('failed');
      const response = await route.fetch();
      await pending;
      await route.fulfill({ response });
    });
    const page = await qa.newPage();
    page.setDefaultTimeout(10_000);
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error' && /ErrorBoundary|Uncaught|TypeError|ReferenceError/.test(message.text())) errors.push(message.text()); });
    const search = page.getByRole('searchbox', { name: language === 'en' ? 'Search crossings by name or city' : 'Buscar cruces por nombre o ciudad', exact: true });
    const summary = page.locator('summary').filter({ hasText: language === 'en' ? 'Show wait summary and border chart' : 'Ver resumen y mapa de esperas' });
    const chart = page.getByRole('region', { name: language === 'en' ? 'The border, west to east' : 'La frontera, de oeste a este', exact: true });
    try {
      await page.goto(baseUrl.href);
      await search.waitFor();
      assert.equal(requests, 0, 'closed disclosure must not request the summary chunk');
      assert.equal(await chart.count(), 0, 'closed summary must not render hidden chart work');
      await summary.focus();
      await page.keyboard.press('Enter');
      await page.getByRole('status').getByText(language === 'en' ? 'Loading…' : 'Cargando…', { exact: true }).waitFor();
      await search.fill('San Ysidro');
      await page.locator('#root a[href="/crossing/san-ysidro/"]').first().waitFor();
      release();
      await chart.waitFor();
      assert.equal(requests, 1);
      assert.match(await chart.getByRole('list').innerText(), /San Ysidro: 60 min/);
      const tick = chart.getByRole('button', { name: /^San Ysidro:/ });
      await tick.focus();
      await page.keyboard.press('Enter');
      assert.equal(await page.evaluate(() => window.summaryEvents.filter(event => event.event === 'borderline-select' && event.data.port === '250401').length), 1);
      await page.evaluate(() => { window.retainedSummary = document.querySelector('section.bp-line'); });
      await summary.click();
      await summary.click();
      assert.ok(await page.evaluate(() => window.retainedSummary === document.querySelector('section.bp-line')), 'reopening keeps chart state and DOM');
      assert.equal(requests, 1, 'reopening must reuse the loaded module');
      await search.fill('Otay Mesa');
      await chart.getByRole('button', { name: /^Otay Mesa:/ }).waitFor();
      assert.equal(await chart.getByRole('button', { name: /^San Ysidro:/ }).count(), 0, 'loaded summary follows current filters');
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));

      // The menu wrappers that are used must retain keyboard/focus and actions.
      const menu = page.getByRole('button', { name: language === 'en' ? 'More options' : 'Más opciones', exact: true }).first();
      await menu.focus();
      await page.keyboard.press('ArrowDown');
      const lane = page.getByRole('menuitem', { name: /^(Show lanes|Hide lanes|Ver carriles|Ocultar carriles)$/ });
      const label = await lane.innerText();
      await lane.click();
      await menu.click();
      assert.notEqual(await lane.innerText(), label, 'lane menu action still toggles');
      await page.keyboard.press('Escape');
      assert.ok(await menu.evaluate(node => node === document.activeElement), 'Escape restores trigger focus');
      await menu.click();
      await page.getByRole('menuitem', { name: language === 'en' ? 'Best time to cross' : 'Mejor hora para cruzar', exact: true }).click();
      await page.waitForURL(url => url.pathname === '/best-time/otay-mesa/');
      await page.goBack();
      await search.waitFor();

      // A failed chunk must not replace the crossing list with ErrorBoundary.
      fail = true;
      await page.reload();
      await search.waitFor();
      await summary.click();
      await page.getByRole('status').getByText(language === 'en' ? 'Summary unavailable. Reload the page to retry.' : 'Resumen no disponible. Recarga la página para reintentar.', { exact: true }).waitFor();
      await search.fill('San Ysidro');
      await page.locator('#root a[href="/crossing/san-ysidro/"]').first().click();
      await page.waitForURL(url => url.pathname === '/crossing/san-ysidro/');
      await page.getByRole('heading', { level: 1 }).waitFor();
      fail = false;
      await page.goto(baseUrl.href);
      await search.waitFor();
      await summary.click();
      await chart.waitFor();
      assert.ok(!/Something went wrong/.test(await page.locator('#root').innerText()));
    } finally {
      release();
      await qa.close();
    }
  }
  assert.deepEqual(errors, [], 'summary loading/failure/recovery must not crash the app');
  console.log('[dashboard-summary] PASS: EN/ES closed-load budget, delayed first open, keyboard selection, retained state, current filters, menu actions/focus, failed asset isolation and recovery');
}
