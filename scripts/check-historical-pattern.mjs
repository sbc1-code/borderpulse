import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// Isolated page/context fixtures, never public data or the owner's browser.
export async function checkHistoricalPatterns(owner, context, baseUrl) {
  const clock = new Date('2026-10-21T20:00:00Z'); // Wednesday in California.
  const snapshot = JSON.parse(fs.readFileSync(new URL('../public/data/crossings.json', import.meta.url)));
  snapshot.fetched_at = clock.toISOString();
  const sunday = { type: 'sunday_spike', port_slug: 'calexico-east', detected_at: '2026-10-18T18:00:00Z', summary_en: 'Right now, choose this crossing.', summary_es: 'Ahora mismo, elige este cruce.', evidence: { peak_hour: 21, peak_median: 120, overall_median: 30, samples: 15, ratio: 4 } };
  const original = { generated_at: '2026-10-21T19:50:00Z', snapshot_at: '2026-10-21T19:45:00Z', active: [sunday] };
  const feedMatch = url => ['/data/crossings.json', '/api/public/crossings'].includes(url.pathname);
  const feedHandler = route => route.fulfill({ contentType: 'application/json', body: JSON.stringify(snapshot) });
  const errors = [];
  for (const language of ['en', 'es']) {
      // Clock installation affects a browser context. Isolate it from the
      // existing suite, including its owner page and refresh timers.
      const qa = await context.browser().newContext({ viewport: owner.viewportSize(), serviceWorkers: 'block', timezoneId: 'Asia/Tokyo' });
      await qa.route('**/*', route => new URL(route.request().url()).origin === baseUrl.origin ? route.continue() : route.abort('blockedbyclient'));
      await qa.route(feedMatch, feedHandler);
      const page = await qa.newPage();
      page.setDefaultTimeout(12_000);
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', msg => { if (msg.type() === 'error' && /ErrorBoundary|Uncaught|TypeError|ReferenceError/.test(msg.text())) errors.push(msg.text()); });
      let current = structuredClone(original);
      try {
        await page.clock.install({ time: clock });
        await page.addInitScript(language => {
          localStorage.setItem('borderPulse_language', language);
          localStorage.setItem('borderPulse_theme', 'light');
        }, language);
        await page.route('**/data/anomalies.json', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify(current) }));
        const reload = async () => {
          await page.goto(new URL('/crossing/calexico-east/', baseUrl).href);
          await page.getByTestId('historical-pattern').waitFor();
          assert.equal(await page.locator('html').getAttribute('lang'), language);
          return page.getByTestId('historical-pattern');
        };
        let panel = await reload();
        let text = await panel.innerText();
        assert.match(text, language === 'en' ? /Sunday.*120 min/ : /domingo.*120 min/);
        assert.doesNotMatch(text, /Today vs|Hoy vs|Right now|Ahora mismo|Last checked|Última verificación/);
        assert.match(text, /30 min/);
        assert.match(text, /15 (samples|muestras)/);
        assert.match(text, /not a live wait|no una espera en vivo/);
        assert.deepEqual(await panel.locator('time').evaluateAll(nodes => nodes.map(node => node.dateTime)), [original.snapshot_at, original.generated_at]);
        const expectedDate = await page.evaluate(({ stamp, language }) => new Date(stamp).toLocaleString(language === 'es' ? 'es-MX' : 'en-US', { timeZone: 'America/Los_Angeles', year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }), { stamp: original.snapshot_at, language });
        assert.equal(await panel.locator('time').first().innerText(), expectedDate, 'source dates use the port timezone');
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
        if (process.env.BP_PATTERN_CAPTURE_DIR) {
          fs.mkdirSync(process.env.BP_PATTERN_CAPTURE_DIR, { recursive: true });
          await panel.screenshot({ path: path.join(process.env.BP_PATTERN_CAPTURE_DIR, `pattern-${page.viewportSize().width}-${language}.png`) });
        }

        current = { ...original, active: [{ ...sunday, type: 'lowest_today', evidence: { day_of_week: 1, best_hour: 0, best_median: 0, overall_median: 30, samples: 2 } }] };
        panel = await reload();
        text = await panel.innerText();
        assert.match(text, language === 'en' ? /Monday/ : /lunes/);
        assert.match(text, /0 min/);
        assert.doesNotMatch(text, /Right now|Ahora mismo|Today vs|Hoy vs/);

        const badEvidence = structuredClone(original); badEvidence.active[0].evidence.peak_median = null;
        const unknownType = structuredClone(original); unknownType.active[0].type = 'unknown';
        const broken = [badEvidence, unknownType, { ...original, snapshot_at: null }, { ...original, generated_at: 'invalid' }, { ...original, snapshot_at: '2026-10-22T20:00:00Z' }];
        for (current of broken) {
          panel = await reload();
          text = await panel.innerText();
          assert.match(text, /cannot be verified|No se puede verificar/);
          assert.doesNotMatch(text, /120 min|Right now|Ahora mismo|Invalid Date/);
          assert.equal(await panel.locator('time').count(), 0);
          assert.equal(await panel.getByRole('link').getAttribute('href'), 'https://bwt.cbp.gov/');
        }
        // Restore evidence without a new API/schema and keep the card neutral
        // in dark mode; old historical data is still useful when dated.
        current = { ...structuredClone(original), generated_at: '2026-10-01T12:00:00Z' };
        panel = await reload();
        assert.match(await panel.innerText(), /120 min/);
        await page.getByRole('button', { name: 'Switch to dark mode', exact: true }).filter({ visible: true }).click();
        assert.ok(await page.locator('html').evaluate(node => node.classList.contains('dark')));
        assert.doesNotMatch(await panel.getAttribute('class'), /emerald|green/);
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
        await page.locator('#root a[href="/crossing/calexico-west/"]').first().click();
        await page.waitForFunction(() => location.pathname === '/crossing/calexico-west/');
        await page.getByRole('heading', { level: 1 }).waitFor();
        assert.equal(await page.getByTestId('historical-pattern').count(), 0, 'another port cannot inherit the pattern');
        await page.goBack();
        await page.getByTestId('historical-pattern').waitFor();
        assert.match(await page.getByTestId('historical-pattern').innerText(), /120 min/);
        current = null;
        await page.reload();
        await page.getByRole('heading', { level: 1 }).waitFor();
        assert.equal(await page.getByTestId('historical-pattern').count(), 0, 'missing feed leaves latest reports usable');
      } finally { await qa.close(); }
  }
  assert.deepEqual(errors, [], 'pattern fixtures must not crash the application');
  console.log('[historical-pattern] PASS: EN/ES weekday scope, zero wait, source timestamps, invalid/future/evidence fallback, recovery, dark mode and port navigation');
}
