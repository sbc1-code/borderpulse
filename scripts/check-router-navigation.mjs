import assert from 'node:assert/strict';

export async function checkCrossingSearch(page, baseUrl, language) {
  const home = language === 'es' ? '/es/' : '/';
  await page.goto(new URL(home + '?notrack&lane=passenger_ready', baseUrl).href, { waitUntil: 'domcontentloaded' });
  const input = page.getByRole('searchbox');
  const clear = page.getByRole('button', { name: language === 'es' ? 'Borrar búsqueda' : 'Clear search', exact: true });
  const lane = page.getByRole('combobox', { name: language === 'es' ? 'Tu carril' : 'Your lane', exact: true });
  for (const name of ['Paso del Norte', 'Otay Mesa']) {
    await input.pressSequentially(name);
    assert.equal(await input.inputValue(), name, 'fast typing preserves the full crossing name');
    await page.waitForURL(url => url.searchParams.get('q') === name && url.searchParams.get('lane') === 'passenger_ready');
    await page.locator('#map-crossing-results').getByRole('button', { name: new RegExp(name, 'i') }).first().waitFor();
    await clear.click();
    await page.waitForURL(url => !url.searchParams.has('q'));
    assert.equal(await input.inputValue(), '');
  }
  await input.fill('Otay Mesa');
  await lane.selectOption('passenger_standard');
  await page.waitForURL(url => url.searchParams.get('q') === 'Otay Mesa' && url.searchParams.get('lane') === 'passenger_standard');
  await clear.click();
  await page.waitForURL(url => !url.searchParams.has('q'));
  await page.goBack();
  await page.waitForURL(url => url.searchParams.get('q') === 'Otay Mesa' && url.searchParams.get('lane') === 'passenger_ready');
  await page.waitForFunction(() => document.querySelector('input[type="search"]')?.value === 'Otay Mesa');
  await page.reload({ waitUntil: 'domcontentloaded' });
  assert.equal(await input.inputValue(), 'Otay Mesa', 'opening the shared URL restores the query');
  await page.goForward();
  await page.waitForURL(url => !url.searchParams.has('q'));
  await page.waitForFunction(() => document.querySelector('input[type="search"]')?.value === '');
}

export async function checkRouterNavigation(owner, context, baseUrl) {
  const errors = [], external = [];
  for (const language of ['en', 'es']) {
    const qa = await context.browser().newContext({ viewport: owner.viewportSize(), serviceWorkers: 'block' });
    await qa.route('**/*', route => {
      const request = route.request();
      const url = new URL(request.url());
      if (url.origin === baseUrl.origin) return route.continue();
      if (request.isNavigationRequest() && request.frame().parentFrame() === null) external.push(url.origin);
      return route.abort('blockedbyclient');
    });
    await qa.addInitScript(value => localStorage.setItem('borderPulse_language', value), language);
    const page = await qa.newPage();
    page.setDefaultTimeout(12_000);
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error' && /ErrorBoundary|Uncaught|TypeError|ReferenceError/.test(message.text())) errors.push(message.text()); });
    try {
      await checkCrossingSearch(page, baseUrl, language);
      await page.goto(new URL('/crossing/san-ysidro/', baseUrl).href);
      await page.locator('#root').getByRole('link', { name: language === 'en' ? 'All crossings' : 'Todos los cruces', exact: true }).waitFor();
      await page.locator('#root a[href="/best-time/san-ysidro/"]').first().click();
      await page.waitForURL(url => url.pathname === '/best-time/san-ysidro/');
      await page.getByRole('heading', { level: 1 }).waitFor();
      await page.goBack();
      await page.waitForURL(url => url.pathname === '/crossing/san-ysidro/');
      await page.locator('#root a[href="/compare/san-ysidro-vs-otay-mesa/"]').first().click();
      await page.getByTestId('compare-summary').waitFor();
      await page.goBack();
      await page.waitForURL(url => url.pathname === '/crossing/san-ysidro/');
      await page.goForward();
      await page.getByTestId('compare-summary').waitFor();
      assert.equal(await page.locator('html').getAttribute('lang'), language);
      assert.equal(new URL(page.url()).origin, baseUrl.origin);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      // Unknown targets are either rejected by the host (404) or handled by
      // the app's existing Navigate-to-home fallback, never a foreign origin.
      for (const input of ['/crossing/not-a-port-for-router-test/', '/crossing/%5C%5Cbp-router.invalid/', '/crossing/%2F%5Cbp-router.invalid/', '/%5C', '/not-a-route?returnTo=https%3A%2F%2Fbp-router.invalid']) {
        const url = new URL(input, baseUrl);
        assert.equal(url.origin, baseUrl.origin);
        const response = await page.goto(url.href);
        assert.ok([200, 404].includes(response.status()), `${input}: unexpected server status`);
        if (response.status() === 200) {
          await page.waitForURL(url => url.pathname === '/');
          await page.getByRole('searchbox', { name: language === 'en' ? 'Search crossings by name or city' : 'Buscar cruces por nombre o ciudad', exact: true }).waitFor();
        }
        assert.equal(new URL(page.url()).origin, baseUrl.origin);
      }
    } finally { await qa.close(); }
  }
  assert.deepEqual(external, [], 'no fixture can send the main frame to an external origin');
  assert.deepEqual(errors, [], 'routing fixtures must not crash the app');
  console.log('[router-navigation] PASS: EN/ES internal links, nested routes, Back/Forward, unknown/encoded-separator fallback and no external navigation');
}
