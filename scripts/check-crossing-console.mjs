import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const geographicVertex = JSON.parse(readFileSync(new URL("../src/components/corridor/geography.json", import.meta.url))).features[0].geometry.coordinates[0][0][0];

async function checkMapThemePaint(page, dark, afterDraw = 0) {
  await page.evaluate(() => document.fonts.ready);
  // These interior ocean/US/Mexico patches avoid the grid and country strokes.
  // The corner is covered by an antialiased grid stroke and an early read can
  // precede the effect/ResizeObserver paint. Verify ready geometry and the real
  // palette instead of retaining that first corner pixel as a golden value.
  const palette = dark
    ? [[2, 6, 23, 255], [16, 31, 43, 255], [23, 43, 50, 255]]
    : [[244, 247, 249, 255], [237, 244, 240, 255], [227, 238, 233, 255]];
  const ready = await page.waitForFunction(({ dark, afterDraw, palette }) => {
    const canvas = document.querySelector("canvas.geography");
    if (!canvas || document.documentElement.classList.contains("dark") !== dark || !(canvas.mapDrawCount > afterDraw)) return false;
    const rect = canvas.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
    if (rect.width <= 0 || rect.height <= 0 || canvas.width !== Math.floor(rect.width * dpr) || canvas.height !== Math.floor(rect.height * dpr)) return false;
    const ctx = canvas.getContext("2d");
    const patches = [[.03, .83], [.65, .21], [.65, .83]].map(([x, y], index) => {
      const pixels = [...ctx.getImageData(Math.floor(canvas.width * x) - 2, Math.floor(canvas.height * y) - 2, 5, 5).data];
      return { rgba: pixels.slice(48, 52), matches: pixels.every((value, channel) => Math.abs(value - palette[index][channel % 4]) <= 1) };
    });
    if (!patches.every(patch => patch.matches)) return false;
    return { draws: canvas.mapDrawCount, css: [rect.width, rect.height], buffer: [canvas.width, canvas.height], dpr, palette: patches.map(patch => patch.rgba) };
  }, { dark, afterDraw, palette });
  const state = await ready.jsonValue();
  await ready.dispose();
  return state;
}

async function checkRetrievalWarningBlock(page, label, agePattern, warningPattern) {
  const warning = page.locator(".retrieval-status p > span").filter({ hasText: warningPattern });
  await warning.waitFor();
  await page.locator(".retrieval-status p").scrollIntoViewIfNeeded();
  const flow = await page.locator(".retrieval-status p").evaluate(paragraph => {
    const ageNode = [...paragraph.childNodes].find(node => node.nodeType === Node.TEXT_NODE && node.textContent.trim());
    const range = document.createRange();
    range.selectNodeContents(ageNode);
    const ageRects = [...range.getClientRects()].filter(rect => rect.width && rect.height);
    const warning = paragraph.querySelector(":scope > span");
    const box = warning.getBoundingClientRect();
    return {
      age: ageNode.textContent.trim(), warning: warning.textContent.trim(),
      ageTop: Math.min(...ageRects.map(rect => rect.top)),
      ageBottom: Math.max(...ageRects.map(rect => rect.bottom)),
      warningTop: box.top, warningBottom: box.bottom, warningWidth: box.width,
      paragraphLeft: paragraph.getBoundingClientRect().left, warningLeft: box.left,
      viewportHeight: innerHeight, fitsViewport: document.documentElement.scrollWidth <= innerWidth,
    };
  });
  assert.match(flow.age, agePattern, `${label}: retrieval age remains visible`);
  assert.match(flow.warning, warningPattern, `${label}: warning remains visible`);
  assert.ok(flow.warningWidth > 0 && flow.ageTop >= 0 && flow.warningBottom <= flow.viewportHeight, `${label}: both strings are in the viewport`);
  assert.ok(flow.warningTop >= flow.ageBottom - 0.5, `${label}: warning must start below the last age-text line, not concatenate with it`);
  assert.ok(Math.abs(flow.warningLeft - flow.paragraphLeft) < 1, `${label}: warning starts at the paragraph's left edge`);
  assert.equal(flow.fitsViewport, true, `${label}: warning fits the viewport`);
  assert.equal(await page.locator(".result-head").count(), 0, `${label}: warning state cannot present current detour arithmetic`);
  console.log(`[console-warning] PASS: ${page.viewportSize().width}px ${label}; age bottom ${flow.ageBottom.toFixed(1)}, warning top ${flow.warningTop.toFixed(1)}`);
}

export async function checkCrossingConsole(browser, baseUrl, viewport) {
  const context = await browser.newContext({ viewport });
  // Observe a real canvas vertex rather than trusting projection metadata. Its
  // painted position and DOM port centers must agree across live resizes.
  await context.addInitScript(() => {
    const clear = CanvasRenderingContext2D.prototype.clearRect;
    CanvasRenderingContext2D.prototype.clearRect = function (...args) {
      if (this.canvas.classList.contains("geography")) {
        this.canvas.firstMapPoint = null;
        this.canvas.mapDrawCount = (this.canvas.mapDrawCount || 0) + 1;
      }
      return clear.apply(this, args);
    };
    const move = CanvasRenderingContext2D.prototype.moveTo;
    CanvasRenderingContext2D.prototype.moveTo = function (x, y) {
      if (this.canvas.classList.contains("geography") && !this.canvas.firstMapPoint) this.canvas.firstMapPoint = { x, y };
      return move.call(this, x, y);
    };
  });
  await context.route('**/*', route => new URL(route.request().url()).origin === baseUrl.origin ? route.continue() : route.abort('blockedbyclient'));
  const page = await context.newPage();
  const enterFromNavigation = async (name) => {
    if (viewport.width < 1024) await page.getByRole("button", { name: "Open menu", exact: true }).click();
    const navigation = page.locator(viewport.width < 1024 ? "#mobile-navigation" : "aside");
    const entry = navigation.getByRole("link", { name, exact: true });
    assert.equal(await entry.count(), 1, "one region-qualified entry in the visible main navigation");
    await entry.click();
    if (viewport.width < 1024) assert.equal(await page.locator("#mobile-navigation").count(), 0, "choosing the map closes the mobile menu");
  };
  const enterFromCrossing = async (slug, key, label, heading) => {
    await page.goto(new URL(`/crossing/${slug}/?lane=${key}`, baseUrl).href);
    const mapEntry = page.locator("main").getByRole("link", { name: label, exact: true });
    await mapEntry.waitFor();
    assert.equal(await mapEntry.count(), 1, "each relevant crossing has one contextual map link");
    const layout = await mapEntry.evaluate(link => {
      const style = getComputedStyle(link);
      return {
        afterReport: link.getBoundingClientRect().top >= document.querySelector('[data-testid="border-crossing-card"]').getBoundingClientRect().bottom,
        height: link.getBoundingClientRect().height,
        border: style.borderTopWidth,
        background: style.backgroundColor,
        fits: document.documentElement.scrollWidth <= innerWidth,
      };
    });
    assert.deepEqual(layout, { afterReport: true, height: 44, border: "0px", background: "rgba(0, 0, 0, 0)", fits: true }, "contextual link stays after the primary report, touch sized and free of button/card chrome");
    await mapEntry.click();
    await page.getByRole("heading", { name: heading, exact: true }).waitFor();
    assert.equal(new URL(page.url()).searchParams.get("lane"), key);
  };
  const clock = Date.parse("2026-10-30T04:15:00Z");
  await page.clock.install({ time: clock });
  const row = (port, standard, ready, sentri, walking) => ({
    port_number: port,
    name: port === "250401" ? "San Ysidro" : "Otay Mesa",
    state: "CA",
    hours: "24 hrs/day",
    port_status: "Open",
    current_wait_time: standard,
    lanes: Object.fromEntries(
      [
        ["passenger_standard", standard],
        ["passenger_ready", ready],
        ["passenger_sentri", sentri],
        ["pedestrian_standard", walking],
      ].map(([key, value]) => [
        key,
        value === null
          ? null
          : {
              status: "Delay",
              delay_minutes: value,
              lanes_open: 2,
              update_time: "At 8:00 pm PDT",
            },
      ]),
    ),
  });
  const fixture = {
    source: "Synthetic browser test fixture",
    fetched_at: "2026-10-30T04:00:00Z",
    crossings: [row("250401", 120, 45, 15, 10), row("250601", 60, 30, null, 5)],
  };
  let failed = false, apiFallback = false, apiRequests = 0,
    historyCalls = 0;
  const reports = (route) => {
    const api = new URL(route.request().url()).pathname === "/api/public/crossings";
    if (api) apiRequests++;
    return route.fulfill({
      status: failed || (apiFallback && api) ? 503 : 200,
      contentType: "application/json",
      body: JSON.stringify(fixture),
    });
  };
  await context.route("**/data/crossings.json*", reports);
  await context.route("**/api/public/crossings*", reports);
  await context.route("**/data/snapshot-history.json", (route) => {
    historyCalls++;
    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        snapshots: [
          {
            fetched_at: "2026-10-28T17:00:00Z",
            crossings: [
              { port_number: "250401", current_wait_time: 130 },
              { port_number: "250601", current_wait_time: 70 },
            ],
          },
          {
            fetched_at: "2026-10-28T18:00:00Z",
            crossings: [
              { port_number: "250401", current_wait_time: 110 },
              { port_number: "250601", current_wait_time: 60 },
            ],
          },
          {
            fetched_at: "2026-10-28T18:30:00Z",
            crossings: [
              { port_number: "250401", current_wait_time: null },
              { port_number: "250601", current_wait_time: null },
            ],
          },
          {
            fetched_at: "2026-10-28T19:00:00Z",
            crossings: [
              { port_number: "250401", current_wait_time: null },
              { port_number: "250601", current_wait_time: 50 },
            ],
          },
        ],
      }),
    });
  });
  try {
    await page.goto(
      new URL("/?lane=passenger_ready", baseUrl).href,
    );
    await page.getByRole("searchbox", { name: "Search crossings by name or city", exact: true }).waitFor();
    assert.equal(await page.locator('main a[href*="/corridor/"]').count(), 0, "dashboard waits have no redundant map promotion");
    await enterFromNavigation("San Diego map");
    const laneSelect = page.getByRole("combobox", { name: "Your lane", exact: true });
    await laneSelect.waitFor();
    assert.equal(await laneSelect.inputValue(), "passenger_ready");
    const markerKey = page.getByRole("group", { name: "Port markers", exact: true });
    assert.match(await markerKey.innerText(), /San Ysidro[\s\S]*Otay Mesa[\s\S]*Colors identify the crossing/);
    assert.equal(await page.locator(".port-node").evaluateAll(nodes => nodes.every(node => {
      const style = getComputedStyle(node);
      return style.borderTopColor === style.borderRightColor && style.borderTopWidth === style.borderRightWidth;
    })), true, "map cards have neutral borders; marker colors are port identity, not wait categories");
    const values = () =>
      page
        .locator(".corridorConsole .port-node .wait-number > span")
        .allTextContents();
    const expectValues = async (expected) => {
      await page.waitForFunction(
        (expected) =>
          [...document.querySelectorAll(".port-node .wait-number > span")]
            .map((node) => node.textContent)
            .join(",") === expected.join(","),
        expected,
      );
      assert.deepEqual(await values(), expected);
    };
    await page.waitForFunction(
      () =>
        [...document.querySelectorAll(".port-node .wait-number > span")]
          .map((n) => n.textContent)
          .join(",") === "45,30",
    );
    assert.equal(await page.locator("h1").evaluate(node => getComputedStyle(node).fontFamily), await page.locator("body").evaluate(node => getComputedStyle(node).fontFamily), "map inherits the site's typeface");
    assert.ok(await page.locator("h1").evaluate(node => parseFloat(getComputedStyle(node).fontSize) <= 32), "map heading uses the site's normal page scale");
    const lightPaint = await checkMapThemePaint(page, false);
    await expectValues(["45", "30"]);
    await page.getByRole("button", { name: "Switch to dark mode", exact: true }).click();
    const darkPaint = await checkMapThemePaint(page, true, lightPaint.draws);
    await expectValues(["45", "30"]);
    await page.getByRole("button", { name: "Switch to light mode", exact: true }).click();
    const returnedLightPaint = await checkMapThemePaint(page, false, darkPaint.draws);
    await expectValues(["45", "30"]);
    console.log(`[console-theme] PASS: ${viewport.width}px light/dark/light paints ${JSON.stringify({ lightPaint, darkPaint, returnedLightPaint })}; waits remain 45,30`);
    for (const width of [1440, 1024, 900, 820, 780, 748, 720, 701, 700, 699, 640, 390, 320, 720, 900]) {
      await page.setViewportSize({ width, height: 900 });
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      const map = await page.evaluate(() => {
        const canvas = document.querySelector("canvas.geography");
        const rect = canvas.getBoundingClientRect();
        return {
          width: rect.width, height: rect.height, firstPoint: canvas.firstMapPoint,
          ports: [...document.querySelectorAll(".port-position")].map(node => {
            const box = node.getBoundingClientRect();
            return { x: box.x + box.width / 2 - rect.x, y: box.y + box.height / 2 - rect.y };
          }),
          waits: [...document.querySelectorAll(".wait-position")].map(node => Number.parseFloat(getComputedStyle(node).top)),
          headingClear: [...document.querySelectorAll(".port-node")].every(node => {
            const a = document.querySelector(".map-heading").getBoundingClientRect();
            const b = node.getBoundingClientRect();
            return a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top;
          }),
        };
      });
      const north = width <= 700 ? 32.69 : 32.66;
      assert.equal(map.headingClear, true, `source timestamp clear of port controls at ${width}px`);
      const point = ([lng, lat]) => ({ x: ((lng + 117.15) / 0.29) * map.width, y: ((north - lat) / 0.24) * map.height });
      const expectedVertex = point(geographicVertex);
      assert.ok(map.firstPoint, `canvas drawn at ${width}px`);
      for (const axis of ["x", "y"]) assert.ok(Math.abs(map.firstPoint[axis] - expectedVertex[axis]) < 0.6, `canvas ${axis} co-registration at ${width}px / ${map.width}px canvas`);
      for (const [index, coordinates] of [[-117.02972, 32.54333], [-116.938187, 32.550602]].entries()) {
        const expected = point(coordinates);
        for (const axis of ["x", "y"]) assert.ok(Math.abs(map.ports[index][axis] - expected[axis]) < 0.6, `port ${index} ${axis} co-registration at ${width}px / ${map.width}px canvas`);
        assert.ok(Math.abs(map.waits[index] - expected.y) < 0.6, `wait anchor ${index} y at ${width}px`);
      }
      if (width === 720 || width === 390) {
        await page.locator(".map-stage").scrollIntoViewIfNeeded();
        assert.equal(await page.locator(".port-node").evaluateAll(nodes => nodes.every(node => {
          const rect = node.getBoundingClientRect();
          return document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2)?.closest("button") === node;
        })), true, `both port controls unobscured after normal scroll at ${width}px`);
      }
    }
    await page.setViewportSize(viewport);
    assert.equal(
      new URL(page.url()).searchParams.get("lane"),
      "passenger_ready",
    );
    assert.equal(historyCalls, 0);
    await page.evaluate(() => document.fonts.ready);
    for (const [key, expected] of [
      ["passenger_standard", ["120", "60"]],
      ["passenger_ready", ["45", "30"]],
      ["passenger_sentri", ["15", "—"]],
      ["passenger_standard", ["120", "60"]],
    ]) {
      await laneSelect.selectOption(key);
      await expectValues(expected);
    }
    await page.goBack();
    assert.equal(
      new URL(page.url()).searchParams.get("lane"),
      "passenger_sentri",
    );
    await expectValues(["15", "—"]);
    await page.goForward();
    await expectValues(["120", "60"]);
    assert.equal(await page.locator(".result-number").innerText(), "40");
    const drive = page.getByLabel("Your extra drive via Otay Mesa");
    await drive.fill("60");
    assert.equal(await page.locator(".result-number").innerText(), "0");
    await drive.fill("70");
    assert.match(await page.locator(".result-head").innerText(), /min more/);
    await drive.fill("");
    assert.equal(await drive.getAttribute("aria-invalid"), "true");
    assert.equal(await page.locator(".result-head").count(), 0);
    await drive.fill("20");
    await page.getByRole("button", { name: /San Ysidro, 120 min/ }).click();
    await page
      .getByRole("region", { name: "San Ysidro report details" })
      .waitFor();
    assert.match(
      await page.locator(".port-detail").innerText(),
      /At 8:00 pm PDT/,
    );
    assert.match(await page.locator(".port-detail").innerText(), /9:00 PM PDT/);
    await page.keyboard.press("Escape");
    await page.waitForFunction(() =>
      document.activeElement
        ?.getAttribute("aria-label")
        ?.includes("San Ysidro"),
    );
    assert.match(
      await page.evaluate(
        () => document.activeElement?.getAttribute("aria-label") || "",
      ),
      /San Ysidro/,
    );
    await page.getByRole("button", { name: "Replay day", exact: true }).click();
    const scrub = page.getByRole("slider", { name: "Historical snapshot" });
    await scrub.waitFor();
    assert.equal(historyCalls, 1);
    await expectValues(["130", "70"]);
    assert.match(await page.locator(".map-heading").innerText(), /Not live/);
    await scrub.focus();
    await page.keyboard.press("End");
    await expectValues(["—", "50"]);
    assert.equal(await page.locator(".result-head").count(), 0);
    await page.keyboard.press("ArrowLeft");
    await expectValues(["—", "—"]);
    assert.equal(await page.locator(".result-head").count(), 0);
    assert.match(await page.locator(".replay-readout").innerText(), /11:30 AM/);
    await page.keyboard.press("ArrowLeft");
    await expectValues(["110", "60"]);
    await laneSelect.selectOption("passenger_ready");
    await expectValues(["—", "—"]);
    assert.match(
      await page.locator(".replay-footnote").innerText(),
      /retains Standard only/,
    );
    await page
      .getByRole("button", { name: "Current reports", exact: true })
      .click();
    await expectValues(["45", "30"]);
    assert.equal(historyCalls, 1);
    await laneSelect.selectOption("pedestrian_standard");
    await expectValues(["10", "5"]);
    assert.equal(await drive.isDisabled(), true);
    assert.equal(await page.locator(".result-head").count(), 0);
    await laneSelect.selectOption("passenger_standard");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.evaluate(
      () =>
        new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        ),
    );
    await page.getByRole("button", { name: /San Ysidro, 120 min/ }).click();
    const panel = page.getByRole("region", {
      name: "San Ysidro report details",
    });
    await panel.waitFor();
    const first = await panel.boundingBox();
    await page.waitForTimeout(350);
    const last = await panel.boundingBox();
    for (const field of ["x", "y", "width", "height"])
      assert.ok(Math.abs(first[field] - last[field]) < 1);
    await page.keyboard.press("Escape");
    await page
      .getByRole("button", { name: "Sources & notes", exact: true })
      .click();
    await page
      .getByRole("dialog", { name: "Reports, with context." })
      .waitFor();
    for (let i = 0; i < 15; i++) await page.keyboard.press("Tab");
    assert.equal(
      await page.evaluate(() =>
        document.querySelector("dialog").contains(document.activeElement),
      ),
      true,
    );
    await page.keyboard.press("Escape");
    assert.match(
      await page.evaluate(() => document.activeElement?.textContent || ""),
      /Sources/,
    );
    await page.getByRole("button", { name: "Cambiar a español" }).click();
    assert.match(await page.locator("h1").innerText(), /Mapa de cruces San Ysidro–Otay/);
    assert.equal(await page.locator("html").getAttribute("lang"), "es");
    assert.match(await page.locator(".ocean").innerText(), /OCÉANO\s+PACÍFICO/);
    assert.match(await page.getByRole("group", { name: "Marcadores de cruces", exact: true }).innerText(), /Los colores identifican el cruce/);
    assert.equal(
      await page.getByRole("combobox", { name: "Tu carril", exact: true }).inputValue(),
      "passenger_standard",
    );
    assert.equal(
      await page.locator('link[rel="canonical"]').getAttribute("href"),
      "https://borderpulse.com/corridor/san-diego-tijuana/",
    );
    await page.clock.fastForward(2 * 60 * 60_000);
    await page.waitForFunction(() =>
      document
        .querySelector(".retrieval-status")
        ?.textContent.includes("desactualizada"),
    );
    await checkRetrievalWarningBlock(page, "ES stale", /^Consulta/, /desactualizada/);
    await page.getByRole("button", { name: "Switch to English" }).click();
    await checkRetrievalWarningBlock(page, "EN stale", /\bFetched\b/, /snapshot is stale/);
    await page.getByRole("button", { name: "Cambiar a español" }).click();
    assert.equal(await page.locator(".result-head").count(), 0);
    await expectValues(["120", "60"]);
    await page.clock.setSystemTime(clock);
    // The production build uses the live endpoint, whose static fallback can
    // succeed. Pages builds do not use that endpoint; stale/error checks above
    // and below still exercise the same text-flow guard in either build mode.
    if (apiRequests) {
      apiFallback = true;
      await page.getByRole("button", { name: "Actualizar reportes", exact: true }).click();
      await checkRetrievalWarningBlock(page, "ES bundled fallback", /^Consulta/, /Datos de respaldo/);
      await page.getByRole("button", { name: "Switch to English" }).click();
      await checkRetrievalWarningBlock(page, "EN bundled fallback", /\bFetched\b/, /Bundled fallback/);
      await page.getByRole("button", { name: "Cambiar a español" }).click();
      apiFallback = false;
    }
    failed = true;
    await page
      .getByRole("button", { name: "Actualizar reportes", exact: true })
      .click();
    await page.waitForFunction(() =>
      document
        .querySelector(".retrieval-status")
        ?.textContent.includes("No se pudo actualizar"),
    );
    await checkRetrievalWarningBlock(page, "ES failed refresh", /^Consulta/, /No se pudo actualizar/);
    assert.equal(await page.locator(".result-head").count(), 0);
    await expectValues(["120", "60"]);
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
    );
    await page.getByRole("button", { name: "Switch to English" }).click();
    await checkRetrievalWarningBlock(page, "EN failed refresh", /\bFetched\b/, /Refresh unavailable/);
    await page
      .getByRole("link", { name: "All crossings", exact: true })
      .click();
    await page.getByRole("searchbox", { name: "Search crossings by name or city", exact: true }).waitFor();
    assert.equal(new URL(page.url()).pathname, "/");
    assert.equal(
      await page.locator("h1").filter({ hasText: "San Ysidro–Otay crossing map" }).count(),
      0,
    );
    failed = false;
    for (const [slug, key] of [["san-ysidro", "passenger_sentri"], ["otay-mesa", "passenger_ready"]]) {
      await enterFromCrossing(slug, key, "San Ysidro–Otay map", "San Ysidro–Otay crossing map");
    }
    if (viewport.width < 1024) {
      await page.getByRole("button", { name: "Open menu", exact: true }).click();
      const link = page.locator("#mobile-navigation").getByRole("link", { name: "San Diego map", exact: true });
      assert.equal(await link.getAttribute("aria-current"), "page");
      await link.click();
      assert.equal(await page.locator("#mobile-navigation").count(), 0, "mobile navigation closes after choosing the map");
      assert.equal(new URL(page.url()).searchParams.get("lane"), "passenger_ready", "global map navigation retains the chosen lane");
    } else {
      const navLink = page.locator("aside").getByRole("link", { name: "San Diego map", exact: true });
      assert.equal(await navLink.getAttribute("aria-current"), "page");
      assert.match(await navLink.getAttribute("href"), /lane=passenger_ready/);
    }
    await page.goto(new URL("/?lane=passenger_ready", baseUrl).href);
    await page.getByRole("button", { name: "Cambiar a español", exact: true }).click();
    assert.equal(await page.locator('main a[href*="/corridor/"]').count(), 0, "Spanish dashboard also avoids duplicated map promotion");
    await enterFromNavigation("Mapa San Diego");
    await page.getByRole("heading", { name: "Mapa de cruces San Ysidro–Otay", exact: true }).waitFor();
    assert.equal(new URL(page.url()).searchParams.get("lane"), "passenger_ready");
    if (viewport.width < 1024) {
      await page.getByRole("button", { name: "Open menu", exact: true }).click();
      await page.locator("#mobile-navigation").getByRole("link", { name: "Mapa San Diego", exact: true }).waitFor();
      await page.keyboard.press("Escape");
    } else {
      await page.locator("aside").getByRole("link", { name: "Mapa San Diego", exact: true }).waitFor();
    }
    for (const [slug, key] of [["san-ysidro", "passenger_sentri"], ["otay-mesa", "passenger_ready"]]) {
      await enterFromCrossing(slug, key, "Mapa San Ysidro–Otay", "Mapa de cruces San Ysidro–Otay");
    }
    console.log(`[crossing-console] PASS: ${viewport.width}px lean regional EN/ES navigation, no dashboard promotion, subtle both-port links after primary reports, lane preservation, neutral cards/marker identity legend, native theme/font, 15 live map resizes, missing replay, keyboard and reduced motion`);
  } finally {
    await context.close();
  }
}
