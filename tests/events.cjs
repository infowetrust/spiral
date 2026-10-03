const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const E = require("../data/events.json");
let playwright;
try {
  playwright = require("playwright");
} catch {
  playwright = require(path.join(
    require("node:os").homedir(),
    ".cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright"
  ));
}
assert.equal(E.categories.length, 11);
const ids = new Set(E.categories.map((e) => e.id));
for (const event of E.records) {
  assert(ids.has(event.id));
  assert(event.start <= event.end);
  assert(["held", "cancelled", "virtual"].includes(event.status));
  assert(new URL(event.source).hostname);
}
(async () => {
  const browser = await playwright.chromium.launch({
    headless: true,
    channel: "chrome",
  });
  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
      acceptDownloads: true,
    });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(
      process.env.SF_TEST_URL || "file://" + path.resolve("index.html")
    );
    await page.selectOption("#color-select", "events");
    const dayCount = await page.evaluate(() => SF_DEBUG.dates.length);
    assert.equal(
      await page.locator("#event-options input:checked").count(),
      11
    );
    assert(await page.locator("#smooth-select").isDisabled());
    assert(await page.locator("#summary-select").isDisabled());
    assert.equal(await page.locator("#seasonal path").count(), 0);
    const count = await page.locator(".cell:not([fill='transparent'])").count();
    assert(count > 100);
    assert((await page.locator(".event-marker").count()) > 50);
    const matches = await page.evaluate(() => {
      const { dates } = SF_DEBUG;
      return [...document.querySelectorAll(".cell")].every((cell, i) => {
        const held = SF_EVENTS.records.filter(
          (e) => e.status === "held" && e.start <= dates[i] && e.end >= dates[i]
        );
        return held.length
          ? cell.getAttribute("fill") !== "transparent"
          : cell.getAttribute("fill") === "transparent";
      });
    });
    assert(matches, "Only actual in-person event dates can be colored");
    await page.screenshot({
      path: "test-results/events-desktop.png",
      fullPage: true,
    });
    await page.click("#events-none");
    assert.equal(
      await page.locator(".cell:not([fill='transparent'])").count(),
      0
    );
    assert.equal(await page.locator(".event-marker").count(), 0);
    assert.equal(
      await page.locator("#center-copy h2").textContent(),
      "No events selected"
    );
    for (const event of E.categories) {
      await page.check("#event-" + event.id);
      assert.equal(
        await page.locator("#center-copy h2").textContent(),
        event.name
      );
      assert((await page.locator(`.cell[fill='${event.color}']`).count()) > 0);
      await page.uncheck("#event-" + event.id);
    }
    await page.check("#event-burningMan");
    const burn = E.records.find(
      (e) => e.id === "burningMan" && e.status === "held" && e.start >= E.start
    );
    await page.fill("#inspect-date", burn.start);
    await page.locator("#inspect-date").dispatchEvent("change");
    assert(
      (await page.locator("#inspect-value").textContent()).includes(
        "Nevada / SF exodus"
      )
    );
    assert.equal(
      await page.locator("#inspect-links a").getAttribute("href"),
      burn.source
    );
    const cancelled = E.records.find(
      (e) => e.id === "burningMan" && e.status !== "held" && e.start >= E.start
    );
    if (cancelled) {
      await page.fill("#inspect-date", cancelled.start);
      await page.locator("#inspect-date").dispatchEvent("change");
      assert(
        (await page.locator("#inspect-value").textContent()).includes(
          cancelled.status
        )
      );
    }
    await page.click("#events-all");
    assert((await page.locator(".cell[fill^='url(#events-']").count()) > 0);
    const original = await page
      .locator(".event-marker")
      .first()
      .getAttribute("x");
    await page.check("#reverse");
    assert.notEqual(
      await page.locator(".event-marker").first().getAttribute("x"),
      original
    );
    await page.click("[data-view='necklace']");
    assert.equal(await page.locator("circle.cell").count(), dayCount);
    await page.uncheck("#event-symbols");
    assert.equal(await page.locator(".event-marker").count(), 0);
    await page.check("#event-symbols");
    await page.click("[data-view='area']");
    for (const format of ["svg", "png"]) {
      await page.click("#export");
      await page.selectOption("#export-format", format);
      const downloadPromise = page.waitForEvent("download");
      await page.click("#export-save");
      const download = await downloadPromise;
      const file = `test-results/events-wheel.${format}`;
      await download.saveAs(file);
      assert(fs.statSync(file).size > 10000);
      await page.keyboard.press("Escape");
    }
    for (const width of [320, 390, 768]) {
      await page.setViewportSize({ width, height: 1000 });
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth
        )
      );
    }
    await page.screenshot({
      path: "test-results/events-mobile.png",
      fullPage: true,
    });
    assert.deepEqual(errors, []);
    console.log(
      "Events verified: dates/status, 11 filters, overlaps, inspection/source links, reversal, markers, necklace, mobile, SVG + PNG export."
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
