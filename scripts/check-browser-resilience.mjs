import assert from 'node:assert/strict';
import fs from 'node:fs';

// Synthetic data only; reuse the route suite's external-request blocker.
export async function checkBrowserResilience(owner, context, baseUrl) {
  const snapshot = JSON.parse(fs.readFileSync(new URL('../public/data/crossings.json', import.meta.url)));
  snapshot.fetched_at = new Date().toISOString();
  const keys = ['borderPulse_language', 'borderPulse_theme', 'borderPulse_region', 'borderPulse_favorites'];
  const saved = await owner.evaluate(keys => Object.fromEntries(keys.map(key => [key, localStorage.getItem(key)])), keys);
  const feedMatch = url => ['/data/crossings.json', '/api/public/crossings'].includes(url.pathname);
  const feedHandler = route => route.fulfill({ contentType: 'application/json', body: JSON.stringify(snapshot) });
  const errors = [];
  await context.route(feedMatch, feedHandler);
  const newPage = async () => {
    const page = await context.newPage();
    page.setDefaultTimeout(8_000);
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => {
      if (message.type() === 'error' && /ErrorBoundary|Uncaught|ReferenceError|TypeError|SyntaxError/.test(message.text())) errors.push(message.text());
    });
    return page;
  };
  try {
    for (const language of ['en', 'es']) {
      const searchName = language === 'en' ? 'Search crossings by name or city' : 'Buscar cruces por nombre o ciudad';
      const add = language === 'en' ? 'Add to favorites' : 'Agregar a favoritos';
      const failedMessage = language === 'en'
        ? 'Your browser could not save this change. Allow site storage and try again.'
        : 'Tu navegador no pudo guardar este cambio. Permite el almacenamiento del sitio e inténtalo de nuevo.';
      for (const failure of ['getter', 'quota']) {
        const page = await newPage();
        try {
          await page.addInitScript(({ failure, language }) => {
            localStorage.setItem('borderPulse_language', language);
            localStorage.setItem('borderPulse_favorites', '[]');
            window.resilienceEvents = [];
            window.umami = { track: (event, data) => window.resilienceEvents.push({ event, data }) };
            if (failure === 'getter') Object.defineProperty(window, 'localStorage', {
              configurable: true, get() { throw new DOMException('Fixture blocked storage', 'SecurityError'); },
            });
            else Storage.prototype.setItem = () => { throw new DOMException('Fixture quota', 'QuotaExceededError'); };
          }, { failure, language });
          await page.goto(baseUrl.href);
          if (language === 'es') await page.getByRole('button', { name: 'Cambiar a español', exact: true }).filter({ visible: true }).click();
          await page.getByRole('searchbox', { name: searchName, exact: true }).waitFor();
          assert.equal(await page.locator('html').getAttribute('lang'), language);
          await page.getByRole('button', { name: 'Switch to dark mode', exact: true }).filter({ visible: true }).click();
          assert.ok(await page.locator('html').evaluate(node => node.classList.contains('dark')));
          await page.getByRole('searchbox', { name: searchName, exact: true }).fill('San Ysidro');
          await page.getByRole('button', { name: add, exact: true }).first().click();
          await page.getByText(failedMessage, { exact: true }).waitFor();
          assert.equal(await page.evaluate(() => window.resilienceEvents.filter(event => event.event === 'favorite-toggle').length), 0, 'failed persistence must not emit success');
          await page.locator('#root a[href="/crossing/san-ysidro/"]').first().click();
          await page.locator('#root').getByRole('link', { name: language === 'en' ? 'All crossings' : 'Todos los cruces', exact: true }).waitFor();
          assert.equal(await page.locator('html').getAttribute('lang'), language);
          await page.locator('#root a[href="/compare/san-ysidro-vs-otay-mesa/"]').first().click();
          await page.getByTestId('compare-summary').waitFor();
          await page.getByTestId('compare-summary').getByText(language === 'en' ? 'Reported standard-passenger waits' : 'Esperas reportadas, auto estándar', { exact: true }).waitFor();
          assert.ok(!/Something went wrong/.test(await page.locator('#root').innerText()));
          assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
        } finally { await page.close(); }
      }

      const page = await newPage();
      try {
        await page.addInitScript(() => {
          if (sessionStorage.getItem('resilience-seeded')) return;
          sessionStorage.setItem('resilience-seeded', 'true');
          localStorage.setItem('borderPulse_favorites', '{}');
          localStorage.setItem('borderPulse_language', 'invalid');
          localStorage.setItem('borderPulse_theme', 'invalid');
          localStorage.setItem('borderPulse_region', 'invalid');
        });
        await page.goto(baseUrl.href);
        await page.getByRole('searchbox', { name: 'Search crossings by name or city', exact: true }).waitFor();
        assert.equal(await page.locator('html').getAttribute('lang'), 'en');
        assert.ok(!await page.locator('html').evaluate(node => node.classList.contains('dark')));
        if (language === 'es') await page.getByRole('button', { name: 'Cambiar a español', exact: true }).filter({ visible: true }).click();
        await page.getByRole('searchbox', { name: searchName, exact: true }).fill('San Ysidro');
        await page.getByRole('button', { name: add, exact: true }).first().click();
        assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem('borderPulse_favorites'))), ['250401']);
        await page.reload();
        await page.getByRole('button', { name: language === 'en' ? 'Remove from favorites' : 'Quitar de favoritos', exact: true }).first().waitFor();

        await page.goto(new URL('/crossing/san-ysidro/', baseUrl).href);
        const crossingCanonical = 'https://borderpulse.com/crossing/san-ysidro/';
        await page.waitForFunction(canonical => document.querySelector('link[rel="canonical"]')?.href === canonical, crossingCanonical);
        assert.ok(await page.locator(`script[data-route-canonical="${crossingCanonical}"]`).count() > 0, 'direct entry retains its generated schema');
        await page.locator('#root a[href="/compare/san-ysidro-vs-otay-mesa/"]').first().click();
        await page.getByTestId('compare-summary').waitFor();
        await page.waitForFunction(() => document.querySelector('link[rel="canonical"]')?.href.includes('/compare/'));
        assert.equal(await page.locator(`script[data-route-canonical="${crossingCanonical}"]`).count(), 0, 'crossing schema must not leak into Compare');
        for (const [twitter, og] of [['twitter:title', 'og:title'], ['twitter:description', 'og:description'], ['twitter:image', 'og:image']]) {
          assert.equal(await page.locator(`meta[name="${twitter}"]`).getAttribute('content'), await page.locator(`meta[property="${og}"]`).getAttribute('content'));
        }

        await page.reload();
        await page.getByTestId('compare-summary').waitFor();
        await page.keyboard.press('Tab');
        await page.keyboard.press('Enter');
        assert.equal(await page.evaluate(() => document.activeElement.id), 'main-content', 'skip link moves keyboard focus into main');
        if (page.viewportSize().width < 1024) {
          const menu = page.getByRole('button', { name: 'Open menu', exact: true });
          await menu.click();
          assert.equal(await page.getByRole('button', { name: 'Close menu', exact: true }).getAttribute('aria-controls'), 'mobile-navigation');
          await page.keyboard.press('Tab');
          await page.keyboard.press('Escape');
          assert.equal(await menu.getAttribute('aria-expanded'), 'false');
          assert.ok(await menu.evaluate(node => node === document.activeElement));
        }
        for (const route of ['/compare/san-ysidro-vs-otay-mesa/', '/crossing/san-ysidro/', '/best-time/', '/best-time/san-ysidro/', '/blog/san-ysidro-vs-otay-mesa/', '/about/', '/methodology/', '/metodologia/']) {
          await page.goto(new URL(route, baseUrl).href);
          const back = page.locator('main').getByRole('link', { name: /^(All crossings|Todos los cruces|All posts|Todos los posts)$/ }).first();
          await back.waitFor();
          assert.equal(await page.locator('#root a button, #root button a').count(), 0, `${route}: navigation has one interactive element`);
          assert.ok((await back.boundingBox()).height >= 44, `${route}: back link touch height`);
        }
      } finally { await page.close(); }
    }
    assert.deepEqual(errors, [], 'fixtures must not trigger an application error');
  } finally {
    await context.unroute(feedMatch, feedHandler);
    await owner.evaluate(values => Object.entries(values).forEach(([key, value]) => value == null ? localStorage.removeItem(key) : localStorage.setItem(key, value)), saved);
  }
  console.log('[browser-resilience] PASS: EN/ES blocked reads/writes, malformed preferences, failed/successful favorites, in-page language, keyboard navigation and route metadata');
}
