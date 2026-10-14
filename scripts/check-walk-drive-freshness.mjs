import assert from 'node:assert/strict';
import fs from 'node:fs';

// Reuse the smoke context's external-request blocker; no CBP/ad traffic.
export async function checkWalkDriveFreshness(context, baseUrl) {
  const snapshot = JSON.parse(fs.readFileSync(new URL('../public/data/crossings.json', import.meta.url)));
  const crossing = snapshot.crossings.find(row => row.port_number === '250201');
  crossing.port_status = 'Open';
  const lane = (delay_minutes, update_time) => ({ delay_minutes, status: 'delay', lanes_open: 1, update_time });
  crossing.lanes = {
    passenger_standard: lane(90, 'At Midnight PDT'),
    passenger_ready: lane(15, 'At 1:00 am PST'),
    pedestrian_standard: lane(0, 'At 11:00 pm MST'),
    pedestrian_ready: lane(10, null),
  };
  const feedMatcher = url => ['/data/crossings.json', '/api/public/crossings'].includes(url.pathname);
  let fail = false;
  let requests = 0;
  const feedHandler = route => {
    requests++;
    return fail ? route.fulfill({ status: 503, body: 'fixture unavailable' })
      : route.fulfill({ contentType: 'application/json', body: JSON.stringify(snapshot) });
  };
  await context.route(feedMatcher, feedHandler);
  const page = await context.newPage();
  const now = Date.now();
  await page.clock.install({ time: now });
  try {
    for (const lang of ['en', 'es']) {
      await page.goto(baseUrl.href);
      await page.evaluate(value => localStorage.setItem('borderPulse_language', value), lang);
      await page.clock.setSystemTime(now);
      fail = false;
      snapshot.fetched_at = new Date(now - 90 * 60_000).toISOString();
      await page.goto(new URL('/walk-or-drive/andrade/', baseUrl).href);
      await page.getByText(lang === 'en' ? 'Recommended' : 'Recomendado', { exact: true }).waitFor();
      let content = await page.locator('#root').innerText();
      for (const text of ['0 min', 'At Midnight PDT', 'At 1:00 am PST', 'At 11:00 pm MST',
        lang === 'en' ? 'CBP report time unavailable' : 'Hora del reporte CBP no disponible']) assert.ok(content.includes(text), text);
      assert.ok(!/Right now|Ahora mismo|Live decision|Decisión en vivo/.test(content));
      // No new feed is required to expire advice while the page remains open.
      fail = true;
      await page.clock.runFor(61_000);
      await page.getByTestId('walk-drive-unavailable').waitFor();
      content = await page.locator('#root').innerText();
      assert.ok(!/Recommended|Recomendado|Walk\.|Camina\.|Drive\.|Maneja\.|It's a wash\.|Está parejo\./.test(content));
      const previousLabel = await page.getByTestId('walk-drive-fetch-time').innerText();
      const before = requests;
      const refreshFailed = page.waitForEvent('console', {
        predicate: message => message.text().includes('[dataService] fetch failed'),
        timeout: 10_000,
      });
      await page.evaluate(() => window.dispatchEvent(new Event('online')));
      await refreshFailed;
      assert.ok(requests > before, 'online refresh attempted and failed');
      assert.equal(await page.getByTestId('walk-drive-fetch-time').innerText(), previousLabel, 'failed refresh must not renew retrieval time');
      assert.ok(await page.getByTestId('walk-drive-unavailable').isVisible());
      // Recovery restores the recommendation using the new actual timestamp.
      fail = false;
      snapshot.fetched_at = new Date(now + 61_000).toISOString();
      await page.evaluate(() => window.dispatchEvent(new Event('online')));
      await page.getByText(lang === 'en' ? 'Recommended' : 'Recomendado', { exact: true }).waitFor();
      // Upstream allows small clock skew, but the page must not recommend from it.
      snapshot.fetched_at = new Date(now + 180_000).toISOString();
      await page.reload();
      await page.getByTestId('walk-drive-unavailable').waitFor();
      assert.equal(await page.getByTestId('walk-drive-fetch-time').innerText(), lang === 'en' ? 'Fetch time unknown' : 'Hora de consulta desconocida');
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    }
  } finally {
    await page.close();
    await context.unroute(feedMatcher, feedHandler);
  }
  console.log('[walk-drive] PASS: EN/ES raw clocks, aging, expiry, failed refresh, recovery and future retrievals');
}
