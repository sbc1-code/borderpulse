import assert from 'node:assert/strict';
import fs from 'node:fs';

// Run against the built app with external requests blocked by the route suite.
export async function checkGrowthInteractions(page, context, baseUrl) {
  const posts = JSON.parse(fs.readFileSync(new URL('../public/data/blog/index.json', import.meta.url))).posts;
  await context.addInitScript(() => {
    window.testEvents = [];
    window.umami = { track: (event, data) => window.testEvents.push({ event, data }) };
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: async (value) => {
        if (window.failCopy) throw new Error('clipboard denied');
        window.copiedLink = value;
      } },
    });
  });
  for (const lang of ['en', 'es']) {
    await page.evaluate((value) => {
      localStorage.setItem('borderPulse_language', value);
      localStorage.setItem('borderPulse_favorites', '[]');
      localStorage.setItem('borderPulse_region', 'ALL');
    }, lang);
    const add = lang === 'en' ? 'Add to favorites' : 'Agregar a favoritos';
    const remove = lang === 'en' ? 'Remove from favorites' : 'Quitar de favoritos';
    await page.goto(new URL('/crossing/san-ysidro/', baseUrl).href);
    await page.getByRole('button', { name: add, exact: true }).click();
    await page.getByRole('button', { name: remove, exact: true }).waitFor();
    assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem('borderPulse_favorites'))), ['250401']);
    assert.equal(await page.evaluate(() => window.testEvents.filter(e => e.event === 'favorite-toggle' && e.data.action === 'add').length), 1);
    // Follow the actual client-side route back to the dashboard.
    await page.getByRole('link', { name: lang === 'en' ? 'All crossings' : 'Todos los cruces', exact: true }).click();
    await page.getByRole('button', { name: remove, exact: true }).waitFor();
    await page.reload();
    await page.getByRole('button', { name: remove, exact: true }).waitFor();
    await page.goto(new URL('/crossing/san-ysidro/', baseUrl).href);
    await page.getByRole('button', { name: remove, exact: true }).click();
    assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem('borderPulse_favorites'))), []);
    await page.evaluate(() => {
      const original = Storage.prototype.setItem;
      Storage.prototype.setItem = function(key, value) {
        if (key === 'borderPulse_favorites') throw new Error('storage denied');
        return original.call(this, key, value);
      };
    });
    await page.getByRole('button', { name: add, exact: true }).click();
    await page.getByText(lang === 'en'
      ? 'Your browser could not save this change. Allow site storage and try again.'
      : 'Tu navegador no pudo guardar este cambio. Permite el almacenamiento del sitio e inténtalo de nuevo.', { exact: true }).waitFor();
    assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem('borderPulse_favorites'))), []);

    const pair = 'san-ysidro-vs-otay-mesa';
    await page.goto(new URL(`/compare/${pair}/`, baseUrl).href);
    await page.getByRole('button', { name: lang === 'en' ? 'Copy link' : 'Copiar enlace', exact: true }).click();
    assert.equal(await page.evaluate(() => window.copiedLink), `https://borderpulse.com/compare/${pair}/`);
    await page.getByRole('button', { name: lang === 'en' ? 'Yes' : 'Sí', exact: true }).click();
    assert.deepEqual(await page.evaluate(() => window.testEvents.filter(e => e.event === 'compare-feedback')), [
      { event: 'compare-feedback', data: { pair, answer: 'yes' } },
    ]);
    await page.evaluate(() => { window.failCopy = true; });
    await page.getByRole('button', { name: lang === 'en' ? 'Link copied' : 'Enlace copiado', exact: true }).click();
    await page.getByText(lang === 'en'
      ? 'Copy failed. You can share this page from your browser.'
      : 'No se pudo copiar. Puedes compartir esta página desde tu navegador.', { exact: true }).waitFor();

    const post = posts.find(p => p.lang === lang);
    await page.goto(new URL(`/blog/${post.slug}/`, baseUrl).href);
    await page.getByRole('button', { name: lang === 'en' ? 'Copy guide link' : 'Copiar enlace de la guía', exact: true }).click();
    assert.equal(await page.evaluate(() => window.copiedLink), `https://borderpulse.com/blog/${post.slug}/?utm_source=copy&utm_medium=share&utm_campaign=guide`);
    const whatsapp = new URL(await page.getByRole('link', { name: 'WhatsApp', exact: true }).getAttribute('href'));
    assert.ok(whatsapp.searchParams.get('text').includes(`https://borderpulse.com/blog/${post.slug}/?utm_source=whatsapp&utm_medium=share&utm_campaign=guide`));
    assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'), `https://borderpulse.com/blog/${post.slug}/`);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'guide must fit viewport');
    await page.getByRole('link', { name: lang === 'en' ? 'Current wait times' : 'Tiempos de espera actuales', exact: true }).click();
    await page.waitForURL(url => url.pathname === '/');
    assert.equal(await page.evaluate(() => window.testEvents.filter(e => e.event === 'blog-to-waits').length), 1);
  }
  await checkCompareFreshness(context, baseUrl);
  console.log('[growth] PASS: EN/ES favorites, storage failure, sharing, feedback, guide-to-waits and attribution');
}

// Like check-walk-drive-freshness: use the real subscription, a controlled feed
// and the browser clock. The route suite runs this in desktop and mobile contexts.
export async function checkCompareFreshness(context, baseUrl) {
  const snapshot = JSON.parse(fs.readFileSync(new URL('../public/data/crossings.json', import.meta.url)));
  const ports = ['250401', '250601'].map(port => snapshot.crossings.find(row => row.port_number === port));
  const setWaits = (a, b) => ports.forEach((crossing, index) => {
    crossing.port_status = 'Open';
    crossing.lanes.passenger_standard = { status: 'delay', delay_minutes: [a, b][index], lanes_open: 1 };
  });
  const feedMatcher = url => ['/data/crossings.json', '/api/public/crossings'].includes(url.pathname);
  const aggregateMatcher = /\/data\/aggregates\/(san-ysidro|otay-mesa)\.json/;
  let fail = false;
  let requests = 0;
  const feedHandler = route => {
    requests++;
    return fail ? route.fulfill({ status: 503, body: 'fixture unavailable' })
      : route.fulfill({ contentType: 'application/json', body: JSON.stringify(snapshot) });
  };
  const aggregateHandler = route => route.fulfill({ contentType: 'application/json', body: JSON.stringify({
    overall_median: route.request().url().includes('san-ysidro') ? 35 : 45, sample_count: 12, by_hour: [],
  }) });
  await context.route(feedMatcher, feedHandler);
  await context.route(aggregateMatcher, aggregateHandler);
  const page = await context.newPage();
  page.setDefaultTimeout(10_000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error' && /Uncaught|ErrorBoundary|ReferenceError|TypeError|SyntaxError/.test(message.text())) errors.push(message.text());
  });
  const now = Date.now();
  await page.clock.install({ time: now });
  const pair = 'san-ysidro-vs-otay-mesa';
  const comparison = page.getByTestId('compare-summary');
  const fetchTime = page.getByTestId('compare-fetch-time');
  const claim = /30 minutes shorter|30 minutos menor|Both ports report|Ambas garitas reportan/;
  const checkNeutral = async () => {
    const text = await comparison.innerText();
    assert.doesNotMatch(text, claim, 'untrusted snapshot must not support advantage or tie');
    assert.match(await comparison.getAttribute('class'), /bg-slate-50/);
    assert.doesNotMatch(await comparison.getAttribute('class'), /emerald/);
    assert.match(text, /comparison is unavailable|No se pueden comparar/);
  };
  try {
    for (const lang of ['en', 'es']) {
      await page.clock.setSystemTime(now);
      fail = false;
      setWaits(60, 30);
      snapshot.fetched_at = new Date(now - 10 * 60_000).toISOString();
      await page.goto(baseUrl.href);
      await page.evaluate(value => localStorage.setItem('borderPulse_language', value), lang);
      await page.goto(new URL(`/compare/${pair}/`, baseUrl).href);
      await comparison.waitFor();
      assert.equal(new URL(page.url()).pathname, `/compare/${pair}/`);
      assert.match(await page.title(), /vs/);
      assert.match(await comparison.innerText(), claim);
      assert.match(await comparison.getAttribute('class'), /bg-emerald-50/);
      await page.getByText('35 min', { exact: true }).waitFor();
      await page.getByText('45 min', { exact: true }).waitFor();

      for (const minutes of [46, 90, 91, 120, -2]) {
        snapshot.fetched_at = new Date(now - minutes * 60_000).toISOString();
        await page.reload();
        await comparison.waitFor();
        if (minutes >= 0 && minutes <= 90) assert.match(await comparison.innerText(), claim);
        else await checkNeutral();
        const label = await fetchTime.innerText();
        const date = new Date(snapshot.fetched_at).toLocaleString(lang === 'en' ? 'en-US' : 'es-MX', {
          timeZone: 'America/Los_Angeles', dateStyle: 'medium', timeStyle: 'short',
        });
        assert.ok(label.includes(date), 'original date remains visible, including future dates');
        if (minutes < 0) {
          assert.match(label, /time unknown|hora desconocida/);
          assert.doesNotMatch(label, /just now|ahora mismo/);
        }
        for (const value of ['60 min', '30 min', '35 min', '45 min']) await page.getByText(value, { exact: true }).waitFor();
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'comparison fits viewport');
      }

      // Missing/invalid responses are rejected by dataService. Retain the last
      // stale snapshot and its time, rather than renewing it on a failed refresh.
      snapshot.fetched_at = new Date(now - 120 * 60_000).toISOString();
      await page.reload();
      await comparison.waitFor();
      const previousLabel = await fetchTime.innerText();
      const refresh = async () => {
        const failed = page.waitForEvent('console', { predicate: message => message.text().includes('[dataService] fetch failed') });
        await page.getByRole('button', { name: lang === 'en' ? 'Refresh waits' : 'Actualizar esperas', exact: true }).click();
        await failed;
        await checkNeutral();
        assert.equal(await fetchTime.innerText(), previousLabel);
      };
      for (const stamp of [null, undefined, 'invalid']) {
        snapshot.fetched_at = stamp;
        await refresh();
      }
      snapshot.fetched_at = new Date(now - 90 * 60_000).toISOString();
      await page.reload();
      await comparison.waitFor();
      assert.match(await comparison.innerText(), claim);
      fail = true;
      const before = requests;
      await page.clock.runFor(61_000);
      assert.equal(requests, before, 'expiry requires no new response');
      await checkNeutral();
      assert.match(await fetchTime.innerText(), /stale data|datos desactualizados/);
      const expiredLabel = await fetchTime.innerText();
      const failed = page.waitForEvent('console', { predicate: message => message.text().includes('[dataService] fetch failed') });
      await page.evaluate(() => window.dispatchEvent(new Event('online')));
      await failed;
      assert.equal(await fetchTime.innerText(), expiredLabel);
      await checkNeutral();

      fail = false;
      snapshot.fetched_at = new Date(now + 61_000).toISOString();
      await page.getByRole('button', { name: lang === 'en' ? 'Refresh waits' : 'Actualizar esperas', exact: true }).click();
      await comparison.getByText(lang === 'en' ? /30 minutes shorter/ : /30 minutos menor/).waitFor();
      assert.match(await fetchTime.innerText(), /just now|ahora mismo/);

      setWaits(0, 0);
      await page.reload();
      await comparison.getByText(lang === 'en' ? /Both ports report a 0-minute/ : /Ambas garitas reportan 0 minutos/).waitFor();
      snapshot.fetched_at = new Date(now - 120 * 60_000).toISOString();
      await page.reload();
      await comparison.waitFor();
      await checkNeutral();
      assert.equal(await page.getByText('0 min', { exact: true }).count(), 2, 'retained zero values remain visible');

      setWaits(null, null);
      for (const stamp of [new Date(now + 61_000).toISOString(), new Date(now - 120 * 60_000).toISOString()]) {
        snapshot.fetched_at = stamp;
        await page.reload();
        await comparison.waitFor();
        await checkNeutral();
        assert.match(await fetchTime.innerText(), /Data snapshot|Consulta de datos/);
      }
      const whatsapp = new URL(await page.getByRole('link', { name: 'WhatsApp', exact: true }).getAttribute('href'));
      assert.ok(whatsapp.searchParams.get('text').includes(`https://borderpulse.com/compare/${pair}/`));
      await page.getByRole('link', { name: lang === 'en' ? 'Open full page' : 'Abrir página completa', exact: true }).first().click();
      await page.waitForURL(url => url.pathname === '/crossing/san-ysidro/');
      await page.goBack();
      await comparison.waitFor();
      await checkNeutral();
      assert.equal(await page.locator('vite-error-overlay').count(), 0);
    }
    assert.deepEqual(errors, [], 'no application errors');
  } finally {
    await page.close();
    await context.unroute(feedMatcher, feedHandler);
    await context.unroute(aggregateMatcher, aggregateHandler);
  }
  console.log('[compare] PASS: EN/ES fresh/aging, stale/future, missing/invalid refresh, expiry, recovery, zero ties, missing waits, history and navigation');
}
