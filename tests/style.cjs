const assert = require("node:assert/strict");
const path = require("node:path");
let playwright;
try {
  playwright = require("playwright");
} catch {
  playwright = require(path.join(
    require("node:os").homedir(),
    ".cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright"
  ));
}

(async () => {
  const browser = await playwright.chromium.launch({ channel: "chrome" });
  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 900 },
    });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("file://" + path.resolve("index.html"));
    await page.waitForSelector(".cell");
    assert(await page.locator("#summary-select").isHidden());
    assert(await page.locator("#inspect-date").isHidden());
    assert.equal(await page.locator(".legend-title").count(), 0);
    assert.equal(await page.locator(".toolbar .legend-section").count(), 1);
    assert.equal(
      await page.locator("#color-select").getAttribute("aria-label"),
      "Dataset"
    );
    assert.equal(await page.locator("#dataset-unit").innerText(), "°F");
    const sidebar = await page.locator(".sidebar").boundingBox();
    assert.equal(sidebar.width, 348, "Preserve the original sidebar width");
    assert(
      sidebar.y + sidebar.height <= 900,
      "Default sidebar and credit should fit a 900px viewport"
    );
    assert.equal(await page.locator(".comparisons dd").count(), 3);
    assert.equal(await page.locator(".season-scale-label").count(), 2);
    await page.screenshot({ path: "test-results/style-after.png" });

    for (const width of [1440, 1024, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      for (const mode of [
        "tempHigh",
        "precipitation",
        "fogProxy",
        "windEnergy",
        "sports",
        "events",
      ]) {
        await page.selectOption("#color-select", mode);
        assert.equal(
          await page.locator("#dataset-unit").isVisible(),
          !["sports", "events"].includes(mode)
        );
        await page.evaluate(() => new Promise(requestAnimationFrame));
        const layout = await page.evaluate(() => {
          const center = document.querySelector("#center-copy");
          const box = center.getBoundingClientRect();
          const children = [...center.children].filter(
            (node) => getComputedStyle(node).display !== "none"
          );
          return {
            overflow: document.documentElement.scrollWidth > innerWidth,
            centerFits: children.every((node) => {
              const b = node.getBoundingClientRect();
              return (
                node.scrollWidth <= node.clientWidth + 1 &&
                b.top >= box.top - 1 &&
                b.bottom <= box.bottom + 1
              );
            }),
          };
        });
        assert(!layout.overflow, `${mode}: page overflow at ${width}`);
        assert(layout.centerFits, `${mode}: center overflow at ${width}`);
        if ([1440, 390].includes(width))
          await page.screenshot({
            path: `test-results/style-${mode}-${width}.png`,
            fullPage: true,
          });
      }
    }
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.selectOption("#color-select", "precipitation");
    assert.equal(
      (await page.locator(".season-scale-label").allTextContents())[1],
      "0"
    );
    await page.locator(".display-options > summary").focus();
    await page.keyboard.press("Enter");
    assert(await page.locator("#summary-select").isVisible());
    await page.selectOption("#summary-select", "off");
    assert.equal(
      await page.locator(".season-scale-label, .center-season").count(),
      0
    );
    await page.locator(".inspection-details > summary").click();
    assert(await page.locator("#inspect-date").isVisible());
    assert.deepEqual(errors, []);
    console.log(
      `Compact style verified: ${sidebar.width}px sidebar, ${Math.round(
        sidebar.height
      )}px tall; six datasets at five viewport widths; keyboard disclosures and summary ruler.`
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
