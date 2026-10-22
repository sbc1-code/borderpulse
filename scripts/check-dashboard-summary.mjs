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
  await checkSummaryConfidence(owner, context, baseUrl);
  console.log('[dashboard-summary] PASS: EN/ES closed-load budget, delayed first open, keyboard selection, retained state, current filters, menu actions/focus, failed asset isolation and recovery');
}

// Independent clocks/contexts keep expiry and offline fixtures out of the
// existing navigation checks. Numbers and source dates must survive the guard.
export async function checkSummaryConfidence(owner, context, baseUrl) {
  const source = JSON.parse(fs.readFileSync(new URL('../public/data/crossings.json', import.meta.url)));
  source.crossings = source.crossings.filter(c => ['250401', '250601'].includes(c.port_number));
  const waits = value => source.crossings.forEach((c, index) => {
    const wait = value === undefined ? [5, 10][index] : value;
    c.port_status = 'Open';
    c.current_wait_time = c.northbound_wait_time = wait;
    c.status = wait == null ? 'unknown' : 'good';
    c.lanes.passenger_standard = { status: wait == null ? 'Update Pending' : 'Delay', delay_minutes: wait, lanes_open: 1 };
  });
  for (const language of ['en', 'es']) {
    waits();
    const now = Date.now();
    source.fetched_at = new Date(now - 88 * 60_000).toISOString();
    const qa = await context.browser().newContext({ viewport: owner.viewportSize(), serviceWorkers: 'block', reducedMotion: 'reduce' });
    await qa.addInitScript(value => localStorage.setItem('borderPulse_language', value), language);
    await qa.route('**/*', route => new URL(route.request().url()).origin === baseUrl.origin ? route.continue() : route.abort('blockedbyclient'));
    let fail = false, release;
    const assetGate = new Promise(resolve => { release = resolve; });
    await qa.route(/\/assets\/DashboardSummary-[^/]+\.js$/, async route => {
      const response = await route.fetch();
      await assetGate;
      await route.fulfill({ response });
    });
    const feed = url => ['/data/crossings.json', '/api/public/crossings'].includes(url.pathname);
    await qa.route(feed, route => fail ? route.fulfill({ status: 503, body: 'fixture unavailable' })
      : route.fulfill({ contentType: 'application/json', body: JSON.stringify(source) }));
    const page = await qa.newPage();
    page.setDefaultTimeout(10_000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.clock.install({ time: now });
    const summary = page.getByTestId('dashboard-summary');
    const notice = page.getByTestId('summary-freshness');
    const panel = page.getByRole('region', { name: language === 'en' ? 'Commuter snapshot' : 'Resumen para commuters', exact: true });
    const chart = page.getByRole('region', { name: language === 'en' ? 'The border, west to east' : 'La frontera, de oeste a este', exact: true });
    const open = async () => {
      await page.getByRole('searchbox').waitFor();
      const disclosure = page.locator('summary').filter({ hasText: language === 'en' ? 'Show wait summary and border chart' : 'Ver resumen y mapa de esperas' });
      await disclosure.focus();
      await page.keyboard.press('Enter');
    };
    const trust = async value => page.waitForFunction(value => document.querySelector('[data-testid="dashboard-summary"]')?.dataset.trusted === String(value), value, { timeout: 2_000 });
    const neutral = async (hasMap = true) => {
      await trust(false);
      assert.doesNotMatch(await panel.innerText(), /Moving well|Heavy right now|Median wait now|Fluye bien|Pesado ahora|Espera mediana ahora/i);
      if (hasMap) {
        await chart.waitFor();
        assert.equal(await chart.locator('[stroke="var(--bp-good)"], [stroke="var(--bp-moderate)"], [stroke="var(--bp-heavy)"]').count(), 0, 'untrusted waits have neutral ticks');
        assert.doesNotMatch(await chart.locator('desc').textContent(), /currently reporting/i);
        assert.equal(await chart.getByRole('button').count(), 2, 'map interactions remain available');
      } else {
        assert.equal(await chart.count(), 0, 'rejected source data must not invent map readings');
      }
      if (typeof source.fetched_at === 'string' && Number.isFinite(Date.parse(source.fetched_at))) {
        await page.waitForFunction(value => document.querySelector('[data-testid="summary-freshness"] time')?.getAttribute('datetime') === value, source.fetched_at);
        assert.equal(await notice.locator('time').getAttribute('datetime'), source.fetched_at, 'retain the exact fetch timestamp');
      } else {
        await page.waitForFunction(() => !document.querySelector('[data-testid="summary-freshness"] time'));
      }
    };
    const refresh = async () => {
      source.fetched_at = new Date(await page.evaluate(() => Date.now())).toISOString();
      fail = false;
      await Promise.all([
        page.waitForResponse(response => feed(new URL(response.url()))),
        page.evaluate(() => window.dispatchEvent(new Event('online'))),
      ]);
      await trust(true);
      await panel.getByText(language === 'en' ? 'Moving well' : 'Fluye bien', { exact: true }).waitFor();
      assert.ok(await chart.locator('[stroke="var(--bp-good)"]').count() > 0, 'valid observations restore the colored chart');
    };
    try {
      await page.goto(baseUrl.href);
      await open();
      await page.getByRole('status').getByText(language === 'en' ? 'Loading…' : 'Cargando…', { exact: true }).waitFor();
      fail = true;
      await page.clock.fastForward(3 * 60_000);
      release();
      await neutral();
      await panel.getByText('8 min', { exact: true }).waitFor();
      await panel.getByText('5 min', { exact: true }).waitFor();
      await panel.getByText('10 min', { exact: true }).waitFor();
      await refresh();

      await qa.setOffline(true);
      await neutral();
      await notice.getByText(language === 'en' ? 'Offline. Reported values are retained for reference.' : 'Sin conexión. Conservamos los valores reportados como referencia.', { exact: true }).waitFor();
      const tick = chart.getByRole('button', { name: /^San Ysidro:/ });
      await tick.focus();
      await page.keyboard.press('Space');
      source.fetched_at = new Date(await page.evaluate(() => Date.now())).toISOString();
      await qa.setOffline(false);
      await trust(true);

      // Loaded content must age without a successful new response as well.
      source.fetched_at = new Date(await page.evaluate(() => Date.now()) - 89 * 60_000).toISOString();
      await page.goto(baseUrl.href); await open(); await trust(true);
      await page.waitForFunction(value => document.querySelector('[data-testid="summary-freshness"] time')?.getAttribute('datetime') === value, source.fetched_at);
      fail = true;
      await page.clock.fastForward(2 * 60_000);
      await neutral();
      await refresh();

      for (const value of [null, 'invalid', new Date(await page.evaluate(() => Date.now()) + 5 * 60_000).toISOString(), new Date(await page.evaluate(() => Date.now()) - 120 * 60_000).toISOString()]) {
        source.fetched_at = value;
        // Dashboard's existing validator rejects missing/invalid timestamps
        // before the summary sees any rows. Keep that guard and empty state.
        const accepted = typeof value === 'string' && Number.isFinite(Date.parse(value));
        await page.goto(baseUrl.href); await open(); await neutral(accepted);
        if (accepted) await panel.getByText('8 min', { exact: true }).waitFor();
      }
      waits(null); source.fetched_at = null;
      await page.goto(baseUrl.href); await open(); await neutral(false);
      await notice.getByText(language === 'en' ? 'Fetch time unknown' : 'Hora de consulta desconocida', { exact: true }).waitFor();
      assert.ok(await panel.getByText('—', { exact: true }).count() >= 3, 'missing waits remain missing');
      waits(0);
      await refresh();
      assert.ok(await panel.getByText('0 min', { exact: true }).count() >= 3, 'valid zero restores a genuine reading');
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      assert.deepEqual(errors, [], 'confidence fixtures must not crash the app');
    } finally {
      release();
      await qa.close();
    }
  }
  console.log('[summary-confidence] PASS: EN/ES delayed-open expiry, loaded expiry without response, offline/online, stale/missing/invalid/future timestamps, retained values/dates, missing waits and zero recovery');
}
