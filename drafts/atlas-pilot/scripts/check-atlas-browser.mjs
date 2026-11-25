import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from 'playwright-core';

const file = new URL('../atlas.html', import.meta.url);
const screenshots = process.env.ATLAS_SCREENSHOT_DIR;
if (screenshots) await mkdir(screenshots, { recursive: true });
const browser = await chromium.launch({
  channel: process.env.CHROME_BIN ? undefined : 'chrome',
  executablePath: process.env.CHROME_BIN,
  headless: true,
});
const expected = {
  'pacific-highway': ['5 min', '5 min', '5 min', '5 min'],
  douglas: ['5 min', 'Not applicable', '5 min', 'Not applicable'],
  'abbotsford-huntingdon': ['5 min', 'No delay', 'Unknown', 'Unknown'],
};
const cases = [['CA', 'traveler'], ['CA', 'commercial'], ['US', 'traveler'], ['US', 'commercial']];
try {
  for (const [size, width, height] of [['desktop', 1440, 900], ['mobile', 390, 844], ['narrow', 320, 700]]) {
    const page = await browser.newPage({ viewport: { width, height } });
    const errors = [], network = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => {
      if (/^https?:/.test(request.url())) network.push(request.url());
    });
    await page.goto(file.href);
    await page.waitForFunction(() => typeof pixels !== 'undefined' && pixels && sphereSamples && !frame);
    assert.equal(await page.locator('#value').innerText(), '5 min');
    assert.match(await page.locator('#reading-time').innerText(), /07:20 UTC.*00:20 PDT.*07:40 UTC/);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth === innerWidth), true);
    if (screenshots) await page.screenshot({ path: join(screenshots, size + '.png'), fullPage: true });

    for (const [id, readings] of Object.entries(expected)) {
      await page.selectOption('#crossing', id);
      for (const [index, [direction, mode]] of cases.entries()) {
        await page.selectOption('#direction', direction);
        await page.selectOption('#mode', mode);
        assert.equal(await page.locator('#value').innerText(), readings[index], [id, direction, mode].join('/'));
      }
    }
    assert.match(await page.locator('#reading-note').innerText(), /0 min.*161 minutes old/);
    assert.match(await page.locator('#reading-time').innerText(), /05:00 UTC.*9:00.*PM PST/i);

    // Check Sumas two-direction glance bar before switching direction, then switch via one tap
    await page.selectOption('#crossing', 'abbotsford-huntingdon');
    await page.selectOption('#direction', 'CA');
    await page.selectOption('#mode', 'traveler');
    assert.equal(await page.locator('#direction-glance').isVisible(), true);
    assert.equal(await page.locator('#glance-ca-val').innerText(), '5 min');
    assert.equal(await page.locator('#glance-us-val').innerText(), 'Unknown · 161m old');
    await page.click('#glance-us');
    assert.equal(await page.locator('#direction').inputValue(), 'US');
    assert.equal(await page.locator('#value').innerText(), 'Unknown');
    await page.click('#glance-ca');
    assert.equal(await page.locator('#direction').inputValue(), 'CA');
    assert.equal(await page.locator('#value').innerText(), '5 min');

    await page.click('#marker-mx');
    assert.equal(await page.locator('#direction-glance').isHidden(), true);
    assert.equal(await page.locator('#crossing option').count(), 42);
    await page.selectOption('#crossing', '250401');
    assert.equal(await page.locator('#guide').getAttribute('href'), 'https://borderpulse.com/crossing/san-ysidro/');
    await page.click('#marker-ca');
    assert.equal(await page.locator('#direction-glance').isVisible(), true);
    assert.equal(await page.locator('#crossing option').count(), 3);

    await page.focus('#globe');
    const before = await page.evaluate(() => projection.lon);
    await page.keyboard.press('ArrowRight');
    assert.notEqual(await page.evaluate(() => projection.lon), before);
    await page.click('#reset');
    assert.equal(await page.evaluate(() => projection.lon), before);
    const box = await page.locator('#globe').boundingBox();
    const x = box.x + box.width * .5, y = box.y + box.height * .7;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + 36, y + 6, { steps: 6 });
    await page.mouse.up();
    assert.notEqual(await page.evaluate(() => projection.lon), before);
    assert.deepEqual(errors, []);
    assert.deepEqual(network, []);
    console.log(size + ' passed at ' + width + '×' + height + ' with 12 readings, 42 directory options and no HTTP requests');
    await page.close();
  }
} finally {
  await browser.close();
}
