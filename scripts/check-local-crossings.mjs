import assert from 'node:assert/strict';
import fs from 'node:fs';

export async function checkLocalCrossings(page, context, baseUrl) {
  const fixture = JSON.parse(fs.readFileSync(new URL('../public/data/crossings.json', import.meta.url)));
  fixture.fetched_at = new Date().toISOString();
  for (const crossing of fixture.crossings) {
    if (!['240202', '240201', '240104', '240204', '240801', '240401'].includes(crossing.port_number)) continue;
    crossing.hours = '24 hrs/day';
    crossing.port_status = 'Open';
    crossing.lanes = {
      passenger_standard: { status: 'Delay', lanes_open: 1, delay_minutes: crossing.port_number === '240801' ? 0 : 30, update_time: '12:00 PM MDT' },
      passenger_sentri: { status: 'No Delay', lanes_open: 1, delay_minutes: 0, update_time: '12:00 PM MDT' },
    };
  }
  const dataPattern = '**/data/crossings.json';
  const apiPattern = '**/api/public/crossings';
  const feed = route => route.fulfill({ contentType: 'application/json', body: JSON.stringify(fixture) });
  await page.route(dataPattern, feed);
  await page.route(apiPattern, feed);
  try {
    for (const lang of ['en', 'es']) {
      await page.goto(new URL('/', baseUrl).href);
      await page.evaluate(value => {
        localStorage.setItem('borderPulse_language', value);
        localStorage.setItem('borderPulse_region', 'ALL');
        localStorage.removeItem('borderPulse_corridor');
      }, lang);
      await page.reload();
      const chooser = page.getByLabel(lang === 'es' ? 'Tu zona de cruce' : 'Your crossing area');
      await chooser.selectOption('el-paso-juarez');
      const panel = page.getByRole('region', { name: lang === 'es' ? 'Comparación local' : 'Local comparison', exact: true });
      await panel.waitFor();
      await panel.getByText(/Santa Teresa/).first().waitFor();
      await page.waitForFunction(() => document.querySelector('[data-testid="local-comparison-summary"]')?.textContent.includes('0 min'), null, { timeout: 5_000 });
      assert.equal(await panel.getByRole('link', { name: /San Ysidro/ }).count(), 0);
      assert.equal(await panel.getByRole('link', { name: lang === 'es' ? 'Ver cámaras' : 'View cameras', exact: true }).count(), 5);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'regional view must fit viewport');
      await page.reload();
      assert.equal(await chooser.inputValue(), 'el-paso-juarez');
      const lane = panel.getByLabel(lang === 'es' ? 'Tu carril' : 'Your lane');
      await lane.selectOption('passenger_sentri');
      await panel.getByText(lang === 'es' ? 'Solo compara SENTRI si cumples los requisitos de ese carril.' : 'Compare SENTRI only if you meet that lane’s requirements.', { exact: true }).waitFor();
      assert.ok(!(await panel.locator('[data-testid="local-comparison-summary"]').innerText()).includes('0 min'), 'ties cannot claim a shortest option');
      await lane.selectOption('pedestrian_standard');
      assert.equal(await panel.getByText(lang === 'es' ? 'No comparable' : 'Not comparable', { exact: true }).count(), 6);
      await page.evaluate(() => {
        const original = Storage.prototype.setItem;
        Storage.prototype.setItem = function(key, value) {
          if (key === 'borderPulse_corridor') throw new Error('storage denied');
          return original.call(this, key, value);
        };
      });
      await chooser.selectOption('san-diego-tijuana');
      await panel.getByRole('heading', { name: 'San Diego–Tijuana', exact: true }).waitFor();
      await page.reload();
      assert.equal(await chooser.inputValue(), 'el-paso-juarez', 'blocked write must not claim persistence');
      const cameraLink = panel.getByRole('link', { name: lang === 'es' ? 'Ver cámaras' : 'View cameras', exact: true }).first();
      await cameraLink.click();
      await page.waitForURL(url => url.hash === '#cameras');
      const cameraPanel = page.getByRole('region', { name: lang === 'es' ? 'Cámaras del cruce' : 'Crossing cameras', exact: true });
      await cameraPanel.waitFor();
      assert.equal(await cameraPanel.locator('iframe').count(), 0, 'no player loaded before selection');
      await cameraPanel.getByRole('button', { name: lang === 'es' ? 'Vista de norte a sur' : 'North to south view', exact: true }).click();
      const frame = cameraPanel.locator('iframe');
      await frame.waitFor();
      assert.match(await frame.getAttribute('src'), /^https:\/\/www\.youtube-nocookie\.com\/embed\/IcvugJWPXz8\?/);
      await cameraPanel.getByRole('button', { name: lang === 'es' ? 'Vista de sur a norte' : 'South to north view', exact: true }).click();
      assert.equal(await cameraPanel.locator('iframe').count(), 1);
      assert.match(await frame.getAttribute('src'), /0Pg3S6s76IE/);
      await cameraPanel.getByRole('button', { name: lang === 'es' ? 'Cerrar cámara' : 'Close camera', exact: true }).click();
      assert.equal(await cameraPanel.locator('iframe').count(), 0);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'camera panel must fit viewport');
      await page.goto(new URL('/', baseUrl).href);
      await page.getByRole('button', { name: 'California', exact: true }).click();
      assert.equal(await chooser.inputValue(), '');
      assert.equal(await page.getByRole('region', { name: lang === 'es' ? 'Comparación local' : 'Local comparison', exact: true }).count(), 0);
    }
  } finally {
    await page.unroute(dataPattern, feed);
    await page.unroute(apiPattern, feed);
    await page.evaluate(() => localStorage.removeItem('borderPulse_corridor'));
  }
  console.log('[local-crossings] PASS: EN/ES corridor persistence, lane eligibility, storage failure, camera navigation, deferred player, view switching and close');
}
