import assert from 'node:assert/strict';
import fs from 'node:fs';

export async function checkHistoricalHourLabels(browser, baseUrl, viewport) {
  for (const language of ['en', 'es']) {
    // Wednesday in the browser, Tuesday afternoon at California ports.
    const now = '2026-10-28T00:45:00Z';
    const context = await browser.newContext({ viewport, timezoneId: 'UTC', serviceWorkers: 'block' });
    const fixture = JSON.parse(fs.readFileSync(new URL('../public/data/crossings.json', import.meta.url)));
    fixture.fetched_at = now;
    fixture.crossings = fixture.crossings.filter(c => ['250201', '250401', '250601'].includes(c.port_number));
    for (const c of fixture.crossings) {
      c.hours = '6 am-10 pm'; c.port_status = 'Open'; c.current_wait_time = 20;
      c.lanes = { passenger_standard: { delay_minutes: 20, status: 'Delay', lanes_open: 2, update_time: '5:00 PM PDT' } };
    }
    const original = {
      timezone: 'America/Los_Angeles', sample_count: 50, overall_median: 20,
      by_hour: [
        { day: 2, hour: 5, median: 0, samples: 10 }, // Closed hour must remain excluded.
        { day: 2, hour: 7, median: 1, samples: 4 }, // Sparse hour must remain excluded.
        { day: 2, hour: 8, median: 10, samples: 10 }, // Historical winner, already passed.
        { day: 2, hour: 18, median: 30, samples: 10 },
        { day: 3, hour: 9, median: 99, samples: 10 },
      ],
    };
    let aggregate = structuredClone(original);
    await context.route('**/*', route => {
      const url = new URL(route.request().url());
      if (url.origin !== baseUrl.origin) return route.abort('blockedbyclient');
      if (['/data/crossings.json', '/api/public/crossings'].includes(url.pathname)) return route.fulfill({ contentType: 'application/json', body: JSON.stringify(fixture) });
      if (url.pathname.startsWith('/data/aggregates/')) return route.fulfill({ contentType: 'application/json', body: JSON.stringify(aggregate) });
      return route.continue();
    });
    await context.addInitScript(language => {
      localStorage.setItem('borderPulse_language', language);
      localStorage.setItem('borderPulse_geoConsent', 'denied');
      Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async value => { window.copied = value; } } });
    }, language);
    const page = await context.newPage();
    page.setDefaultTimeout(10000);
    await page.clock.install({ time: new Date(now) });
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    const en = language === 'en';
    const summary = () => page.getByTestId('historical-hour-summary');
    const fits = async () => assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${language} ${viewport.width}: page fits`);
    try {
      await page.goto(new URL('/best-time/andrade/', baseUrl).href);
      await summary().getByText(en ? '8 AM' : '8 a. m.', { exact: true }).waitFor();
      assert.match(await summary().innerText(), en ? /Historical lightest hour \(Tue\)/i : /Hora histórica más ligera \(Mar\)/i);
      assert.match(await summary().innerText(), en ? /include hours already passed.*not a recommendation/s : /incluyen horas que ya pasaron.*no es una recomendación/s);
      assert.match(await summary().innerText(), /10 min/);
      await fits();
      const currentLink = summary().getByRole('link', { name: en ? 'See current wait time at Andrade' : 'Ver tiempo de espera actual en Andrade' });
      assert.equal(await currentLink.getAttribute('href'), '/crossing/andrade/');
      await currentLink.click();
      await page.waitForURL(url => url.pathname === '/crossing/andrade/');
      const historicalResult = page.getByText(en ? /Historical lightest hour \(Tue\): 8 AM/ : /Hora histórica más ligera \(Mar\): 8 a\. m\./);
      await historicalResult.waitFor();
      assert.equal(await page.getByText(/Best time to cross today:|Mejor hora para cruzar hoy:/).count(), 0);
      await page.getByRole('tab', { name: en ? 'Wed' : 'Mié', exact: true }).click();
      await page.getByText(en ? /Historical lightest hour \(Wed\): 9 AM/ : /Hora histórica más ligera \(Mié\): 9 a\. m\./).waitFor();
      await page.goBack(); await summary().waitFor();
      await page.reload(); await summary().getByText(en ? '8 AM' : '8 a. m.', { exact: true }).waitFor();
      aggregate = { ...original, by_hour: original.by_hour.map(h => ({ ...h, samples: 1 })) };
      await page.reload();
      await summary().getByText(en ? /No eligible historical hour/ : /Sin una hora histórica elegible/).waitFor();
      assert.equal(await summary().getByRole('link').count(), 1, 'current report remains available without historical data');
      await fits();
      aggregate = structuredClone(original);
      fixture.crossings.forEach(c => { c.hours = 'not published'; });
      await page.reload();
      await summary().getByText(en ? /No eligible historical hour/ : /Sin una hora histórica elegible/).waitFor();
      fixture.crossings.forEach(c => { c.hours = '6 am-10 pm'; });
      await page.goto(new URL('/best-time/', baseUrl).href);
      const row = page.getByRole('row').filter({ has: page.getByRole('link', { name: 'Andrade', exact: true }) });
      await row.getByText(en ? '8 AM · Tue' : '8 a. m. · Mar', { exact: true }).waitFor();
      assert.doesNotMatch(await page.getByRole('heading', { level: 1 }).innerText(), /today|hoy|Wed|Mié/);
      assert.match(await page.locator('meta[name="description"]').getAttribute('content'), en ? /Historical.*Not a forecast/ : /histórica.*No es un pronóstico/);
      await fits();
      await page.goto(new URL('/', baseUrl).href);
      await page.getByRole('link', { name: en ? /30-day pattern: 8 AM/ : /Patrón de 30 días: 8 a\. m\./ }).first().waitFor();
      await page.getByRole('button', { name: en ? 'Share' : 'Compartir', exact: true }).click();
      const dialog = page.getByRole('dialog');
      await dialog.getByText(en ? /30-day pattern 8a/ : /patrón de 30 días 8a/).waitFor();
      await dialog.getByRole('button', { name: en ? 'Copy for WhatsApp' : 'Copiar para WhatsApp' }).click();
      assert.match(await page.evaluate(() => window.copied), en ? /full local weekday.*not a forecast/ : /todo el día local.*no son un pronóstico/);
      await page.keyboard.press('Escape'); await dialog.waitFor({ state: 'hidden' });
      await fits();
      assert.deepEqual(errors, []);
    } finally { await context.close(); }
  }
  console.log(`[historical-hour-labels] PASS: EN/ES ${viewport.width}px past-hour honesty, local weekday, sparse/unknown-hours fallback, current-report CTA, Back/reload, selected weekday and sharing`);
}
