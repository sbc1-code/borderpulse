import assert from 'node:assert/strict';
import fs from 'node:fs';

// This fixture tests retained CBP lane values without hitting CBP or ad networks.
export async function checkWalkDriveAvailability(page, context, baseUrl) {
  const snapshot = JSON.parse(fs.readFileSync(new URL('../public/data/crossings.json', import.meta.url)));
  const crossing = snapshot.crossings.find(row => row.port_number === '250201');
  assert.ok(crossing, 'Andrade fixture must exist');
  crossing.hours = '6 am-10 pm';
  const lane = (delay_minutes, status = 'delay') => ({ delay_minutes, status, lanes_open: 1 });
  crossing.lanes = {
    passenger_standard: lane(15),
    passenger_ready: lane(5),
    passenger_sentri: lane(0, 'no delay'),
    pedestrian_standard: lane(0, 'no delay'),
    pedestrian_ready: null,
  };
  const feedMatcher = url => ['/data/crossings.json', '/api/public/crossings'].includes(url.pathname);
  const feedHandler = route => route.fulfill({ contentType: 'application/json', body: JSON.stringify(snapshot) });
  await context.route(feedMatcher, feedHandler);
  try {
    for (const lang of ['en', 'es']) {
      await page.evaluate(value => localStorage.setItem('borderPulse_language', value), lang);
      crossing.port_status = 'Closed';
      crossing.lanes.pedestrian_standard = lane(0, 'no delay');
      await page.goto(new URL('/walk-or-drive/andrade/', baseUrl).href);
      await page.getByRole('heading', { level: 1, name: lang === 'en' ? 'Andrade: closed now' : 'Andrade: cerrado ahora', exact: true }).waitFor();
      let content = await page.locator('#root').innerText();
      assert.ok(!/RIGHT NOW|Right now|Ahora mismo|15 min|0 min/.test(content), 'closure must hide old waits and verdicts');
      assert.ok(content.includes('6 am-10 pm'), 'posted hours remain available');
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'closure must fit viewport');
      // Navigate away and Back, then re-open after a real feed status change.
      await page.getByRole('link', { name: lang === 'en' ? 'Open Andrade live page' : 'Abrir página en vivo de Andrade', exact: true }).click();
      await page.waitForURL(url => url.pathname === '/crossing/andrade/');
      await page.goBack();
      await page.getByRole('heading', { level: 1, name: lang === 'en' ? 'Andrade: closed now' : 'Andrade: cerrado ahora', exact: true }).waitFor();
      crossing.port_status = 'Open';
      await page.reload();
      await page.getByRole('heading', { name: lang === 'en' ? 'Walk (standard)' : 'A pie (estándar)', exact: true }).waitFor();
      content = await page.locator('#root').innerText();
      assert.ok(content.includes('0 min'), 'a fresh zero wait must survive');
      assert.ok(content.includes(lang === 'en' ? "It's a wash." : 'Está parejo.'), 'open comparison returns');
      crossing.lanes.pedestrian_standard = lane(0, 'Update Pending');
      await page.reload();
      await page.getByRole('heading', { level: 1, name: lang === 'en' ? 'Andrade: no current pedestrian wait reported' : 'Andrade: sin espera peatonal actual reportada', exact: true }).waitFor();
      content = await page.locator('#root').innerText();
      assert.ok(!/RIGHT NOW|Right now|Ahora mismo|0 min/.test(content), 'pending wait must not support a recommendation');
    }
  } finally {
    await context.unroute(feedMatcher, feedHandler);
    await page.evaluate(() => localStorage.setItem('borderPulse_language', 'en'));
  }
  console.log('[walk-drive] PASS: EN/ES closed, Back, reopened zero-wait and pending-report states');
}
