import assert from "node:assert/strict";

export async function checkCrossingConsole(browser, baseUrl, viewport) {
  const context = await browser.newContext({ viewport });
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
  } finally {
    await context.close();
  }
}
