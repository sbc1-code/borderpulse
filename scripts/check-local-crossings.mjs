import assert from 'node:assert/strict';
import fs from 'node:fs';

export async function checkLocalCrossings(page, context, baseUrl) {
  const fixture = JSON.parse(fs.readFileSync(new URL('../public/data/crossings.json', import.meta.url)));
  fixture.fetched_at = new Date().toISOString();
  for (const crossing of fixture.crossings) {
    if (!['240202', '240201', '240104', '240204', '240801', '240401'].includes(crossing.port_number)) continue;
    crossing.hours = '24 hrs/day';
    crossing.port_status = 'Open';
    crossing.current_wait_time = crossing.port_number === '240801' ? 0 : 30;
    crossing.lanes = {
      passenger_standard: { status: 'Delay', lanes_open: 1, delay_minutes: crossing.port_number === '240801' ? 0 : 30, update_time: '12:00 PM MDT' },
      passenger_sentri: { status: 'No Delay', lanes_open: 1, delay_minutes: 0, update_time: '12:00 PM MDT' },
    };
  }
  const dataPattern = '**/data/crossings.json*';
  const apiPattern = '**/api/public/crossings*';
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
      await page.waitForURL(url => url.searchParams.get('area') === 'el-paso-juarez');
      const cameraHub = page.getByRole('region', { name: lang === 'es' ? 'Cámaras fronterizas' : 'Border cameras', exact: true });
      const cameraToggle = cameraHub.getByRole('button', { name: lang === 'es' ? 'Cámaras' : 'Camera feeds', exact: true });
      assert.equal(await cameraHub.locator('iframe').count(), 0);
      await cameraToggle.click();
      const bridgeChooser = cameraHub.getByRole('group', { name: lang === 'es' ? 'Elegir cruce' : 'Choose a crossing', exact: true });
      assert.equal(await bridgeChooser.getByRole('button').count(), 5);
      assert.equal(await cameraHub.locator('iframe').count(), 0, 'opening the camera hub alone must not load a provider');
      await cameraHub.getByRole('button', { name: lang === 'es' ? 'Vista de norte a sur' : 'North to south view', exact: true }).click();
      const inlineCamera = cameraHub.locator('iframe');
      await inlineCamera.waitFor();
      assert.match(await inlineCamera.getAttribute('src'), /IcvugJWPXz8/);
      await bridgeChooser.getByRole('button', { name: 'Zaragoza · Ysleta', exact: true }).click();
      assert.equal(await cameraHub.locator('iframe').count(), 0, 'switching bridges closes the previous player');
      await cameraHub.getByRole('button', { name: lang === 'es' ? 'Vista de norte a sur' : 'North to south view', exact: true }).click();
      assert.equal(await cameraHub.locator('iframe').count(), 1);
      assert.match(await inlineCamera.getAttribute('src'), /GC5RY3zipa4/);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'inline cameras must fit the viewport');
      const cameraArea = cameraHub.getByLabel(lang === 'es' ? 'Zona de cámaras' : 'Camera area');
      await cameraArea.selectOption('san-diego-tijuana');
      assert.equal(await cameraHub.locator('iframe').count(), 0, 'changing areas removes the previous player');
      assert.equal(await bridgeChooser.getByRole('button').count(), 2);
      await bridgeChooser.getByRole('button', { name: 'San Ysidro', exact: true }).click();
      await cameraHub.getByText(lang === 'es' ? /no muestran la fila de inspección/ : /do not show the inspection queue/).waitFor();
      await cameraHub.getByRole('button', { name: lang === 'es' ? 'I-5 · Via de San Ysidro (lado EE. UU.)' : 'I-5 · Via de San Ysidro (U.S. road)', exact: true }).click();
      assert.equal(new URL(await inlineCamera.getAttribute('src')).hostname, 'cwwp2.dot.ca.gov');
      assert.equal(new URL(page.url()).searchParams.get('area'), 'el-paso-juarez', 'camera selection must not silently change the wait-time area');
      await cameraArea.selectOption('eagle-pass');
      assert.equal(await cameraHub.locator('iframe').count(), 0);
      await cameraHub.getByRole('button', { name: lang === 'es' ? 'Vista 1 del Puente II' : 'Bridge II view 1', exact: true }).click();
      assert.match(await inlineCamera.getAttribute('src'), /^https:\/\/g1\.ipcamlive\.com\/player\/player.php\?alias=67231a475ead1$/);
      await cameraArea.selectOption('nogales');
      assert.equal(await cameraHub.locator('iframe').count(), 0);
      assert.equal(await cameraHub.getByRole('link', { name: lang === 'es' ? 'Abrir fuente oficial de cámaras' : 'Open official camera source', exact: true }).getAttribute('href'), 'https://heroicanogales.gob.mx/webcams-garitas');
      await cameraArea.selectOption('calexico-mexicali');
      await cameraHub.getByText(lang === 'es' ? /Aún no hay una cámara pública verificada/ : /No public camera has been verified/).waitFor();
      assert.equal(await cameraHub.locator('iframe').count(), 0);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'area selector and missing-camera state must fit the viewport');
      await cameraToggle.click();
      assert.equal(await cameraHub.locator('iframe').count(), 0, 'collapsing the camera hub stops the player');
      assert.equal(await bridgeChooser.count(), 0);
      await page.getByRole('button', { name: lang === 'es' ? 'Compartir' : 'Share', exact: true }).click();
      const dialog = page.getByRole('dialog');
      await dialog.getByRole('button', { name: lang === 'es' ? 'Copiar para WhatsApp' : 'Copy for WhatsApp', exact: true }).click();
      const shareText = await page.evaluate(() => window.copiedLink);
      assert.ok(shareText.includes('https://borderpulse.com/?area=el-paso-juarez'));
      assert.ok(!/\d+\s*min/.test(shareText), 'local sharing must not carry a cached wait claim');
      await page.keyboard.press('Escape');
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
      assert.equal(await panel.getByText(lang === 'es' ? 'Sin reporte: Peatones' : 'No pedestrian report', { exact: true }).count(), 6);
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
      assert.equal(await chooser.inputValue(), 'san-diego-tijuana', 'the URL remains usable when browser storage is blocked');
      assert.equal(await page.evaluate(() => localStorage.getItem('borderPulse_corridor')), 'el-paso-juarez', 'blocked storage does not claim a saved preference');
      await chooser.selectOption('el-paso-juarez');
      await panel.getByRole('heading', { name: 'El Paso–Juárez', exact: true }).waitFor();
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
      assert.equal(new URL(page.url()).searchParams.has('area'), false);
    }
  } finally {
    await page.unroute(dataPattern, feed);
    await page.unroute(apiPattern, feed);
    await page.evaluate(() => localStorage.removeItem('borderPulse_corridor'));
  }
  console.log('[local-crossings] PASS: EN/ES corridor persistence, lane eligibility, storage failure, camera navigation, deferred player, view switching and close');
}
