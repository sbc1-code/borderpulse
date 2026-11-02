import assert from 'node:assert/strict';
import fs from 'node:fs';

// A cold module request is held until the test releases it. This proves the
// report list works during loading, instead of hiding a first-open regression.
export async function checkDashboardSummary(owner, context, baseUrl) {
  const snapshot = JSON.parse(fs.readFileSync(new URL('../public/data/crossings.json', import.meta.url)));
  snapshot.fetched_at = new Date().toISOString();
  const port = snapshot.crossings.find(row => row.port_number === '250401');
  port.current_wait_time = 60;
  port.lanes.passenger_standard = { status: 'Delay', delay_minutes: 60, lanes_open: 1 };
  const errors = [];
  for (const language of ['en', 'es']) {
    const qa = await context.browser().newContext({ viewport: owner.viewportSize(), serviceWorkers: 'block', reducedMotion: 'reduce' });
    await qa.addInitScript(value => {
      localStorage.setItem('borderPulse_language', value);
      window.summaryEvents = [];
      window.umami = { track: (event, data) => window.summaryEvents.push({ event, data }) };
    }, language);
    await qa.route('**/*', route => new URL(route.request().url()).origin === baseUrl.origin ? route.continue() : route.abort('blockedbyclient'));
    await qa.route(url => ['/data/crossings.json', '/api/public/crossings'].includes(url.pathname), route => route.fulfill({ contentType: 'application/json', body: JSON.stringify(snapshot) }));
    let requests = 0, fail = false, release;
    const pending = new Promise(resolve => { release = resolve; });
    const asset = /\/assets\/DashboardSummary-[^/]+\.js$/;
    await qa.route(asset, async route => {
      requests++;
      if (fail) return route.abort('failed');
      const response = await route.fetch();
      await pending;
      await route.fulfill({ response });
    });
    const page = await qa.newPage();
    page.setDefaultTimeout(10_000);
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error' && /ErrorBoundary|Uncaught|TypeError|ReferenceError/.test(message.text())) errors.push(message.text()); });
    const search = page.getByRole('searchbox', { name: language === 'en' ? 'Search crossings by name or city' : 'Buscar cruces por nombre o ciudad', exact: true });
    const summary = page.locator('summary').filter({ hasText: language === 'en' ? 'Show wait summary and border chart' : 'Ver resumen y mapa de esperas' });
    const chart = page.getByRole('region', { name: language === 'en' ? 'The border, west to east' : 'La frontera, de oeste a este', exact: true });
    try {
      await page.goto(new URL('/?display=list', baseUrl).href);
      await search.waitFor();
      assert.equal(requests, 0, 'closed disclosure must not request the summary chunk');
      assert.equal(await chart.count(), 0, 'closed summary must not render hidden chart work');
      await summary.focus();
      await page.keyboard.press('Enter');
      await page.getByRole('status').getByText(language === 'en' ? 'Loading…' : 'Cargando…', { exact: true }).waitFor();
      await search.fill('San Ysidro');
      await page.locator('#root a[href="/crossing/san-ysidro/"]').first().waitFor();
      release();
      await chart.waitFor();
      assert.equal(requests, 1);
      assert.match(await chart.getByRole('list').innerText(), /San Ysidro: 60 min/);
      const tick = chart.getByRole('button', { name: /^San Ysidro:/ });
      await tick.focus();
      await page.keyboard.press('Enter');
      assert.equal(await page.evaluate(() => window.summaryEvents.filter(event => event.event === 'borderline-select' && event.data.port === '250401').length), 1);
      await page.evaluate(() => { window.retainedSummary = document.querySelector('section.bp-line'); });
      await summary.click();
      await summary.click();
      assert.ok(await page.evaluate(() => window.retainedSummary === document.querySelector('section.bp-line')), 'reopening keeps chart state and DOM');
      assert.equal(requests, 1, 'reopening must reuse the loaded module');
      await search.fill('Otay Mesa');
      await page.locator('[data-testid="border-crossing-card"][data-port-number="250601"]').waitFor();
      await chart.getByRole('button', { name: /^Otay Mesa:/ }).waitFor();
      await search.fill('Brownsville - Gateway');
      await chart.getByRole('button', { name: /^Brownsville - Gateway:/ }).waitFor();
      assert.equal(await chart.getByRole('button', { name: /^San Ysidro:/ }).count(), 0, 'loaded summary follows current filters');
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));

      // The menu wrappers that are used must retain keyboard/focus and actions.
      const menu = page.getByRole('button', { name: language === 'en' ? 'More options' : 'Más opciones', exact: true }).first();
      await menu.focus();
      await page.keyboard.press('ArrowDown');
      const lane = page.getByRole('menuitem', { name: /^(Show lanes|Hide lanes|Ver carriles|Ocultar carriles)$/ });
      const label = await lane.innerText();
      await lane.click();
      await menu.click();
      assert.notEqual(await lane.innerText(), label, 'lane menu action still toggles');
      await page.keyboard.press('Escape');
      assert.ok(await menu.evaluate(node => node === document.activeElement), 'Escape restores trigger focus');
      await menu.click();
      await page.getByRole('menuitem', { name: language === 'en' ? 'Best time to cross' : 'Mejor hora para cruzar', exact: true }).click();
      await page.waitForURL(url => url.pathname === '/best-time/brownsville-gateway/');
      await page.goBack();
      await search.waitFor();

      // A failed chunk must not replace the crossing list with ErrorBoundary.
      fail = true;
      await page.reload();
      await search.waitFor();
      await summary.click();
      await page.getByRole('status').getByText(language === 'en' ? 'Summary unavailable. Reload the page to retry.' : 'Resumen no disponible. Recarga la página para reintentar.', { exact: true }).waitFor();
      await search.fill('San Ysidro');
      await page.locator('#root a[href="/crossing/san-ysidro/"]').first().click();
      await page.waitForURL(url => url.pathname === '/crossing/san-ysidro/');
      await page.getByRole('heading', { level: 1 }).waitFor();
      fail = false;
      await page.goto(new URL('/?display=list', baseUrl).href);
      await search.waitFor();
      await summary.click();
      await chart.waitFor();
      assert.ok(!/Something went wrong/.test(await page.locator('#root').innerText()));
    } finally {
      release();
      await qa.close();
    }
  }
  assert.deepEqual(errors, [], 'summary loading/failure/recovery must not crash the app');
  await checkSummaryConfidence(owner, context, baseUrl);
  await checkSummaryLanes(owner, context, baseUrl);
  console.log('[dashboard-summary] PASS: EN/ES closed-load budget, delayed first open, keyboard selection, retained state, current filters, menu actions/focus, failed asset isolation and recovery');
}

export async function checkSummaryLanes(owner, context, baseUrl) {
  let checkedApiFallback = false;
  const ids = ['230201','230301','230302','230401'];
  const original = JSON.parse(fs.readFileSync(new URL('../public/data/crossings.json', import.meta.url)));
  const spec = [
    ['passenger_standard', [0,60,90], 3,50,60], ['passenger_sentri', [0,12,null], 2,6,6],
    ['passenger_ready', [3,27,9], 2,15,15], ['pedestrian_standard', [5,25,45], 3,25,25]
  ];
  for (const language of ['en','es']) {
    const es = language === 'es';
    const source = {...original,fetched_at:new Date().toISOString(),crossings:ids.map((id,i)=>{
      const row=structuredClone(original.crossings.find(c=>c.port_number===id));
      row.port_status=i===3?'Closed':'Open'; row.current_wait_time=row.northbound_wait_time=999;
      for(const [key,values] of spec) {const value=values[i]??(i===3?180:null);row.lanes[key]={status:value==null?'Update Pending':value===0?'No Delay':'Delay',delay_minutes:value,lanes_open:key==='passenger_ready'&&i===2?0:1};}
      return row;
    })};source.count=source.crossings.length;
    const qa=await context.browser().newContext({viewport:owner.viewportSize(),serviceWorkers:'block',reducedMotion:'reduce'});
    await qa.addInitScript(language=>localStorage.setItem('borderPulse_language',language),language);
    let apiFailed=false,apiRequests=0,statsFailed=false;
    await qa.route('**/*',route=>{
      const u=new URL(route.request().url());if(u.origin!==baseUrl.origin)return route.abort();
      if(statsFailed&&/\/assets\/StatsOverview-[^/]+\.js$/.test(u.pathname))return route.abort('failed');
      if(['/data/crossings.json','/api/public/crossings'].includes(u.pathname)) {
        if(u.pathname.startsWith('/api/')) {apiRequests++;if(apiFailed)return route.fulfill({status:503,body:'fixture unavailable'});}
        return route.fulfill({contentType:'application/json',body:JSON.stringify(source)});
      }
      if(u.pathname==='/data/rankings.json')return route.fulfill({contentType:'application/json',body:JSON.stringify({crossings:ids.map(port_number=>({port_number,overall_median:40}))})});
      if(u.pathname==='/data/snapshot-history.json')return route.fulfill({contentType:'application/json',body:JSON.stringify({snapshots:[{fetched_at:'2026-10-30T10:00:00Z',crossings:ids.map(port_number=>({port_number,current_wait_time:120}))}]})});
      return route.continue();
    });
    const page=await qa.newPage();page.setDefaultTimeout(10000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
    const open=async()=>{await page.getByTestId('stats-overview').waitFor();await page.locator('summary').filter({hasText:es?'Ver resumen y mapa de esperas':'Show wait summary and border chart'}).click();await page.getByTestId('dashboard-summary').waitFor();};
    const panel=()=>page.getByRole('region',{name:es?'Resumen para commuters':'Commuter snapshot',exact:true});
    const check=async(count,mean,median)=>{
      await page.waitForFunction(({count,mean})=>{const s=document.querySelector('[data-testid="stats-overview"]')?.innerText||'';return s.includes(`${count}/4`)&&s.includes(mean==null?'—':`${mean} min`);},{count,mean});
      const text=await page.getByTestId('stats-overview').innerText();
      assert.match(text,new RegExp(`${es?'Tiempos disponibles':'Wait times available'}[^\\n]*\\s+${count}/4`,'i'));
      assert.match(text,new RegExp(`${es?'Espera promedio':'Average wait'}\\s+${mean==null?'—':`${mean} min`}`,'i'));
      assert.match(text,new RegExp(`${es?'Abiertos ahora':'Open now'}\\s+3/4`,'i'),'official port openness remains distinct from selected-lane report availability');
      assert.match(await panel().innerText(),new RegExp(`${count}/4 ${es?'reportando':'reporting'}`));
      await panel().getByText(median==null?'—':`${median} min`,{exact:true}).first().waitFor();
    };
    try {
      await page.goto(new URL('/?region=TX&display=list',baseUrl).href);await open();
      for(const [key,,count,mean,median] of spec) {
        await page.getByLabel(es?'Tu carril':'Your lane',{exact:true}).selectOption(key);await check(count,mean,median);
        const chart=page.getByRole('region',{name:es?'La frontera, de oeste a este':'The border, west to east',exact:true});
        if(key==='passenger_standard')await page.waitForFunction(()=>document.querySelectorAll('.bp-ghost').length>0);
        else assert.equal(await chart.locator('.bp-ghost').count(),0,'Standard history cannot be drawn as the selected lane baseline');
        await panel().getByText(median>=45?(es?'Pesado ahora':'Heavy right now'):median>=15?(es?'Demora normal':'Typical delay'):(es?'Fluye bien':'Moving well'),{exact:true}).waitFor();
        if(key==='passenger_sentri') {
          const tick=chart.getByRole('button',{name:/^Del Rio:/});assert.match(await tick.getAttribute('aria-label'),/0 min/);
          const paint=await tick.locator('.bp-stem').evaluate(n=>({stroke:getComputedStyle(n).stroke,good:getComputedStyle(document.querySelector('.bp-sw-good')).backgroundColor}));
          assert.equal(paint.stroke,paint.good,'zero SENTRI paint follows the lane, not the heavy Standard summary status');
        }
      }
      await page.goto(new URL('/?region=TX&lane=passenger_sentri&mode=history',baseUrl).href);
      await page.locator('.archiveControl input').waitFor();
      await page.getByRole('group',{name:es?'Vista de cruces':'Crossing view',exact:true}).getByRole('button',{name:es?'Lista':'List',exact:true}).click();
      assert.equal(new URL(page.url()).searchParams.has('mode'),false,'List intentionally returns to labeled latest reports');
      assert.equal(new URL(page.url()).searchParams.has('at'),false);await open();await check(2,6,6);
      source.crossings.forEach(c=>c.lanes.passenger_sentri={status:'Update Pending',delay_minutes:null,lanes_open:1});
      await page.reload();await open();await check(0,null,null);
      source.crossings.forEach(c=>c.lanes.passenger_sentri={status:'No Delay',delay_minutes:0,lanes_open:1});
      await page.reload();await open();await check(3,0,0);
      if(apiRequests) {checkedApiFallback=true;apiFailed=true;await page.reload();await open();await page.waitForFunction(()=>document.querySelector('[data-testid="dashboard-summary"]')?.dataset.trusted==='false');assert.doesNotMatch(await panel().innerText(),/Moving well|Heavy right now|Median wait now|Fluye bien|Pesado ahora|Espera mediana ahora/);}
      statsFailed=true;await page.reload();
      await page.locator('aside').last().getByText(es?'Resumen no disponible. Recarga la página para reintentar.':'Summary unavailable. Reload the page to retry.',{exact:true}).waitFor();
      assert.equal(await page.getByTestId('border-crossing-card').count(),4,'a failed summary asset leaves the real crossing list usable');
      assert.doesNotMatch(await page.locator('#root').innerText(),/Something went wrong|Border Pulse encountered an error/);
      statsFailed=false;apiFailed=false;await page.reload();await open();await check(3,0,0);
      assert.deepEqual(errors,[]);
    } finally {await qa.close();}
  }
  console.log(`[summary-lanes] PASS ${owner.viewportSize().width}px: EN/ES all lanes, mean/median/count/tier, zero/missing/closed overrides, Standard-only historical ghosts, history-to-latest List, summary-asset failure/recovery; ${checkedApiFallback ? 'API fallback neutrality' : 'Pages mode (API fallback not applicable)'}`);
}

// Independent clocks/contexts keep expiry and offline fixtures out of the
// existing navigation checks. Numbers and source dates must survive the guard.
export async function checkSummaryConfidence(owner, context, baseUrl) {
  const source = JSON.parse(fs.readFileSync(new URL('../public/data/crossings.json', import.meta.url)));
  source.crossings = source.crossings.filter(c => ['250401', '250601'].includes(c.port_number));
  const waits = value => source.crossings.forEach((c, index) => {
    const wait = value === undefined ? [5, 10][index] : value;
    c.port_status = 'Open';
    c.current_wait_time = c.northbound_wait_time = wait;
    c.status = wait == null ? 'unknown' : 'good';
    c.lanes.passenger_standard = { status: wait == null ? 'Update Pending' : 'Delay', delay_minutes: wait, lanes_open: 1 };
  });
  for (const language of ['en', 'es']) {
    waits();
    const now = Date.now();
    source.fetched_at = new Date(now - 88 * 60_000).toISOString();
    const qa = await context.browser().newContext({ viewport: owner.viewportSize(), serviceWorkers: 'block', reducedMotion: 'reduce' });
    await qa.addInitScript(value => localStorage.setItem('borderPulse_language', value), language);
    await qa.route('**/*', route => new URL(route.request().url()).origin === baseUrl.origin ? route.continue() : route.abort('blockedbyclient'));
    let fail = false, release;
    const assetGate = new Promise(resolve => { release = resolve; });
    await qa.route(/\/assets\/DashboardSummary-[^/]+\.js$/, async route => {
      const response = await route.fetch();
      await assetGate;
      await route.fulfill({ response });
    });
    const feed = url => ['/data/crossings.json', '/api/public/crossings'].includes(url.pathname);
    await qa.route(feed, route => fail ? route.fulfill({ status: 503, body: 'fixture unavailable' })
      : route.fulfill({ contentType: 'application/json', body: JSON.stringify(source) }));
    const page = await qa.newPage();
    page.setDefaultTimeout(10_000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.clock.install({ time: now });
    const summary = page.getByTestId('dashboard-summary');
    const notice = page.getByTestId('summary-freshness');
    const panel = page.getByRole('region', { name: language === 'en' ? 'Commuter snapshot' : 'Resumen para commuters', exact: true });
    const chart = page.getByRole('region', { name: language === 'en' ? 'The border, west to east' : 'La frontera, de oeste a este', exact: true });
    const open = async () => {
      await page.getByRole('searchbox').waitFor();
      const disclosure = page.locator('summary').filter({ hasText: language === 'en' ? 'Show wait summary and border chart' : 'Ver resumen y mapa de esperas' });
      await disclosure.focus();
      await page.keyboard.press('Enter');
    };
    const trust = async value => page.waitForFunction(value => document.querySelector('[data-testid="dashboard-summary"]')?.dataset.trusted === String(value), value, { timeout: 2_000 });
    const neutral = async (hasMap = true) => {
      await trust(false);
      assert.doesNotMatch(await panel.innerText(), /Moving well|Heavy right now|Median wait now|Fluye bien|Pesado ahora|Espera mediana ahora/i);
      if (hasMap) {
        await chart.waitFor();
        assert.equal(await chart.locator('[stroke="var(--bp-good)"], [stroke="var(--bp-moderate)"], [stroke="var(--bp-heavy)"]').count(), 0, 'untrusted waits have neutral ticks');
        assert.doesNotMatch(await chart.locator('desc').textContent(), /currently reporting/i);
        assert.equal(await chart.getByRole('button').count(), 2, 'both source-backed facility interactions remain available');
        assert.equal(await chart.getByRole('button', { name: /^San Ysidro:/ }).count(), 1);
        assert.equal(await chart.getByRole('button', { name: /^Otay Mesa:/ }).count(), 1, 'Otay has a source-backed US facility representative');
        assert.equal(await page.locator('[data-testid="border-crossing-card"]').count(), 2, 'both reports remain available regardless of location evidence');
      } else {
        assert.equal(await chart.count(), 0, 'rejected source data must not invent map readings');
      }
      if (typeof source.fetched_at === 'string' && Number.isFinite(Date.parse(source.fetched_at))) {
        await page.waitForFunction(value => document.querySelector('[data-testid="summary-freshness"] time')?.getAttribute('datetime') === value, source.fetched_at);
        assert.equal(await notice.locator('time').getAttribute('datetime'), source.fetched_at, 'retain the exact fetch timestamp');
      } else {
        await page.waitForFunction(() => !document.querySelector('[data-testid="summary-freshness"] time'));
      }
    };
    const refresh = async () => {
      source.fetched_at = new Date(await page.evaluate(() => Date.now())).toISOString();
      fail = false;
      await Promise.all([
        page.waitForResponse(response => feed(new URL(response.url()))),
        page.evaluate(() => window.dispatchEvent(new Event('online'))),
      ]);
      await trust(true);
      await panel.getByText(language === 'en' ? 'Moving well' : 'Fluye bien', { exact: true }).waitFor();
      assert.ok(await chart.locator('[stroke="var(--bp-good)"]').count() > 0, 'valid observations restore the colored chart');
    };
    try {
      await page.goto(new URL('/?display=list', baseUrl).href);
      await open();
      await page.getByRole('status').getByText(language === 'en' ? 'Loading…' : 'Cargando…', { exact: true }).waitFor();
      fail = true;
      await page.clock.fastForward(3 * 60_000);
      release();
      await neutral();
      await panel.getByText('8 min', { exact: true }).waitFor();
      await panel.getByText('5 min', { exact: true }).waitFor();
      await panel.getByText('10 min', { exact: true }).waitFor();
      await refresh();

      await qa.setOffline(true);
      await neutral();
      await notice.getByText(language === 'en' ? 'Offline. Reported values are retained for reference.' : 'Sin conexión. Conservamos los valores reportados como referencia.', { exact: true }).waitFor();
      const tick = chart.getByRole('button', { name: /^San Ysidro:/ });
      await tick.focus();
      await page.keyboard.press('Space');
      source.fetched_at = new Date(await page.evaluate(() => Date.now())).toISOString();
      await qa.setOffline(false);
      await trust(true);

      // Loaded content must age without a successful new response as well.
      source.fetched_at = new Date(await page.evaluate(() => Date.now()) - 89 * 60_000).toISOString();
      await page.goto(new URL('/?display=list', baseUrl).href); await open(); await trust(true);
      await page.waitForFunction(value => document.querySelector('[data-testid="summary-freshness"] time')?.getAttribute('datetime') === value, source.fetched_at);
      fail = true;
      await page.clock.fastForward(2 * 60_000);
      await neutral();
      await refresh();

      for (const value of [null, 'invalid', new Date(await page.evaluate(() => Date.now()) + 5 * 60_000).toISOString(), new Date(await page.evaluate(() => Date.now()) - 120 * 60_000).toISOString()]) {
        source.fetched_at = value;
        // Dashboard's existing validator rejects missing/invalid timestamps
        // before the summary sees any rows. Keep that guard and empty state.
        const accepted = typeof value === 'string' && Number.isFinite(Date.parse(value));
        await page.goto(new URL('/?display=list', baseUrl).href); await open(); await neutral(accepted);
        if (accepted) await panel.getByText('8 min', { exact: true }).waitFor();
      }
      waits(null); source.fetched_at = null;
      await page.goto(new URL('/?display=list', baseUrl).href); await open(); await neutral(false);
      await notice.getByText(language === 'en' ? 'Fetch time unknown' : 'Hora de consulta desconocida', { exact: true }).waitFor();
      assert.ok(await panel.getByText('—', { exact: true }).count() >= 3, 'missing waits remain missing');
      waits(0);
      await refresh();
      assert.ok(await panel.getByText('0 min', { exact: true }).count() >= 3, 'valid zero restores a genuine reading');
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      assert.deepEqual(errors, [], 'confidence fixtures must not crash the app');
    } finally {
      release();
      await qa.close();
    }
  }
  console.log('[summary-confidence] PASS: EN/ES delayed-open expiry, loaded expiry without response, offline/online, stale/missing/invalid/future timestamps, retained values/dates, missing waits and zero recovery');
}
