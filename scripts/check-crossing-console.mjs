import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const geographicVertex = JSON.parse(readFileSync(new URL("../src/components/corridor/geography.json", import.meta.url))).features[0].geometry.coordinates[0][0][0];

export async function checkCrossingConsole(browser, baseUrl, viewport) {
  const context = await browser.newContext({ viewport });
  // Observe a real canvas vertex rather than trusting projection metadata. Its
  // painted position and DOM port centers must agree across live resizes.
  await context.addInitScript(() => {
    const clear = CanvasRenderingContext2D.prototype.clearRect;
    CanvasRenderingContext2D.prototype.clearRect = function (...args) {
      if (this.canvas.classList.contains("geography")) this.canvas.firstMapPoint = null;
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
  let failed = false,
    historyCalls = 0;
  const reports = (route) =>
    route.fulfill({
      status: failed ? 503 : 200,
      contentType: "application/json",
      body: JSON.stringify(fixture),
    });
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
      new URL("/?area=san-diego-tijuana&lane=passenger_ready", baseUrl).href,
    );
    const entry = page.getByRole("link", {
      name: "Explore the San Ysidro–Otay corridor",
    });
    await entry.waitFor();
    await entry.click();
    await page
      .getByRole("button", { name: "Ready Lane", exact: true })
      .waitFor();
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
    await page.evaluate(() => document.fonts.ready);
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
    for (const [name, expected] of [
      ["Standard", ["120", "60"]],
      ["Ready Lane", ["45", "30"]],
      ["SENTRI", ["15", "—"]],
      ["Standard", ["120", "60"]],
    ]) {
      await page.getByRole("button", { name, exact: true }).click();
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
    await page.getByRole("button", { name: "Ready Lane", exact: true }).click();
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
    await page.getByRole("button", { name: "Walking", exact: true }).click();
    await expectValues(["10", "5"]);
    assert.equal(await drive.isDisabled(), true);
    assert.equal(await page.locator(".result-head").count(), 0);
    await page.getByRole("button", { name: "Standard", exact: true }).click();
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
    assert.match(await page.locator("h1").innerText(), /Dos cruces/);
    assert.equal(await page.locator("html").getAttribute("lang"), "es");
    assert.match(await page.locator(".ocean").innerText(), /OCÉANO\s+PACÍFICO/);
    assert.equal(
      await page
        .getByRole("button", { name: "Estándar", exact: true })
        .getAttribute("aria-pressed"),
      "true",
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
    assert.equal(await page.locator(".result-head").count(), 0);
    await expectValues(["120", "60"]);
    await page.clock.setSystemTime(clock);
    failed = true;
    await page
      .getByRole("button", { name: "Actualizar reportes", exact: true })
      .click();
    await page.waitForFunction(() =>
      document
        .querySelector(".retrieval-status")
        ?.textContent.includes("No se pudo actualizar"),
    );
    assert.equal(await page.locator(".result-head").count(), 0);
    await expectValues(["120", "60"]);
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
    );
    await page.getByRole("button", { name: "Switch to English" }).click();
    await page
      .getByRole("link", { name: "All crossings", exact: true })
      .click();
    await page.getByRole("searchbox", { name: "Search crossings by name or city", exact: true }).waitFor();
    assert.equal(new URL(page.url()).pathname, "/");
    assert.equal(
      await page.locator("h1").filter({ hasText: "Two crossings." }).count(),
      0,
    );
    console.log(`[crossing-console] PASS: ${viewport.width}px interactions, 15 live map co-registration resizes, all-missing replay gap, Spanish ocean, keyboard and reduced motion`);
  } finally {
    await context.close();
  }
}
