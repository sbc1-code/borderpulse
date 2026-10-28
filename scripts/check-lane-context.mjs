import assert from 'node:assert/strict';
import fs from 'node:fs';

export async function checkLaneContext(browser, baseUrl, viewport = { width: 390, height: 844 }) {
  for (const language of ['en', 'es']) {
    const context = await browser.newContext({ viewport, serviceWorkers: 'block' });
    const fixture = JSON.parse(fs.readFileSync(new URL('../public/data/crossings.json', import.meta.url)));
    fixture.fetched_at = new Date().toISOString();
    const sy = fixture.crossings.find(c => c.port_number === '250401');
    const otay = fixture.crossings.find(c => c.port_number === '250601');
    const tecate = fixture.crossings.find(c => c.port_number === '250501');
    const report = (wait, time) => ({ status: 'Delay', lanes_open: 2, delay_minutes: wait, update_time: time });
    for (const [crossing, standard, sentri] of [[sy, 115, 30], [otay, 60, 20], [tecate, 10, null]]) {
      crossing.hours = '24 hrs/day'; crossing.port_status = 'Open'; crossing.current_wait_time = standard;
      crossing.lanes = { passenger_standard: report(standard, '1:00 PM PDT'), passenger_sentri: sentri == null ? null : report(sentri, '2:00 PM PDT'), passenger_ready: { ...report(15, '2:10 PM PDT'), lanes_open: 0 }, pedestrian_standard: report(0, '2:15 PM PDT') };
    }
    await context.route('**/*', route => {
      const url = new URL(route.request().url());
      if (url.origin !== baseUrl.origin) return route.abort('blockedbyclient');
      if (['/data/crossings.json', '/api/public/crossings'].includes(url.pathname)) return route.fulfill({ contentType: 'application/json', body: JSON.stringify(fixture) });
      return route.continue();
    });
    await context.addInitScript(lang => {
      localStorage.setItem('borderPulse_language', lang);
      localStorage.setItem('borderPulse_geoConsent', 'denied');
      Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async text => { window.copied = text; } } });
      Object.defineProperty(navigator, 'share', { configurable: true, value: async data => { window.shared = data; } });
    }, language);
    const page = await context.newPage();
    page.setDefaultTimeout(10000);
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    const laneLabel = language === 'es' ? 'Tu carril' : 'Your lane';
    const lane = () => page.getByLabel(laneLabel, { exact: true });
    const primary = () => page.getByTestId('border-crossing-card').first();
    const waitForPrimary = async (label, value) => {
      await page.waitForFunction(({ label, value }) => document.querySelector('[data-testid="primary-lane"]')?.textContent === label && document.querySelector('[data-testid="primary-wait"]')?.textContent === value, { label, value });
    };
    const fits = async () => assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${language} ${viewport.width}: viewport fits`);
    try {
      await page.goto(new URL('/?area=san-diego-tijuana', baseUrl).href);
      await lane().selectOption('passenger_sentri');
      await page.waitForURL(url => url.searchParams.get('lane') === 'passenger_sentri');
      await waitForPrimary('SENTRI', '30');
      assert.ok((await primary().getByTestId('cbp-report-time').innerText()).includes('2:00 PM PDT'));
      assert.equal(await primary().getByText(/Steady|Estable|vs. typical|vs. lo normal/).count(), 0);
      await page.reload(); await waitForPrimary('SENTRI', '30');
      assert.equal(await lane().inputValue(), 'passenger_sentri');
      await fits();
      await page.getByRole('button', { name: language === 'es' ? 'Compartir' : 'Share', exact: true }).click();
      const dialog = page.getByRole('dialog');
      await dialog.getByRole('button', { name: language === 'es' ? 'Copiar para WhatsApp' : 'Copy for WhatsApp' }).click();
      assert.ok((await page.evaluate(() => window.copied)).includes('area=san-diego-tijuana&lane=passenger_sentri'));
      await dialog.getByRole('button', { name: language === 'es' ? 'Compartir' : 'Share', exact: true }).click();
      assert.ok((await page.evaluate(() => window.shared.url)).includes('lane=passenger_sentri'));
      await page.keyboard.press('Escape');
      const panel = page.getByRole('region', { name: language === 'es' ? 'Comparación local' : 'Local comparison', exact: true });
      assert.ok((await panel.getByRole('link', { name: language === 'es' ? 'Ver cámaras' : 'View cameras', exact: true }).first().getAttribute('href')).endsWith('?lane=passenger_sentri#cameras'));
      await panel.getByRole('link', { name: 'San Ysidro', exact: true }).click();
      await page.waitForURL(url => url.pathname === '/crossing/san-ysidro/');
      await waitForPrimary('SENTRI', '30'); await fits();
      await page.reload(); await waitForPrimary('SENTRI', '30');
      await page.getByRole('button', { name: language === 'es' ? 'Copiar enlace' : 'Copy link', exact: true }).click();
      const copied = await page.evaluate(() => window.copied);
      assert.equal(copied, 'https://borderpulse.com/crossing/san-ysidro/?lane=passenger_sentri');
      const whatsapp = await page.getByRole('link', { name: 'WhatsApp', exact: true }).getAttribute('href');
      assert.ok(decodeURIComponent(whatsapp).includes(copied));
      await lane().selectOption('passenger_ready');
      await waitForPrimary('Ready Lane', '—');
      await page.goBack(); await waitForPrimary('SENTRI', '30');
      await page.goForward(); await waitForPrimary('Ready Lane', '—');
      await lane().selectOption('pedestrian_standard');
      await waitForPrimary(language === 'es' ? 'Peatones' : 'Pedestrian', '0');
      await page.goto(new URL('/crossing/san-ysidro-pedwest/?lane=passenger_sentri#cameras', baseUrl).href);
      await page.waitForURL(url => url.pathname === '/crossing/san-ysidro/');
      await waitForPrimary('SENTRI', '30');
      assert.equal(new URL(page.url()).hash, '#cameras');
      await page.goto(new URL('/crossing/tecate/?lane=passenger_sentri', baseUrl).href);
      await waitForPrimary('SENTRI', '—');
      await page.goto(new URL('/crossing/san-ysidro/?lane=not-a-lane', baseUrl).href);
      await waitForPrimary(language === 'es' ? 'Auto estándar' : 'Standard passenger', '115');
      await page.goto(new URL('/crossing/san-ysidro/?lane=passenger_sentri#cameras', baseUrl).href);
      await lane().selectOption('pedestrian_standard');
      assert.equal(new URL(page.url()).hash, '#cameras');
      sy.port_status = 'Closed';
      await page.reload(); await waitForPrimary(language === 'es' ? 'Peatones' : 'Pedestrian', '—');
      await fits();
      assert.deepEqual(errors, []);
    } finally { await context.close(); }
  }
  console.log(`[lane-context] PASS: EN/ES at ${viewport.width}px: selection, reload, Back/Forward, direct/invalid/missing/closed URLs, report clock, copy/native/WhatsApp and camera anchor`);
}
