const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const { audit } = require("./type-audit.cjs");
let chromium;
try {
  ({ chromium } = require("playwright"));
} catch {
  ({ chromium } = require(path.join(
    require("node:os").homedir(),
    ".cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright"
  )));
}
(async () => {
  const browser = await chromium.launch({ channel: "chrome" });
  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 900 },
    });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("file://" + path.resolve("index.html"));
    await page.waitForSelector(".cell");
    assert.equal((await page.evaluate(audit)).length, 4);
    assert.equal(
      await page.locator("#smooth-select option[value='1']").textContent(),
      "None (daily)"
    );
    assert.equal(await page.locator("h1 span").textContent(), "Spiral Almanac");
    for (const mode of [
      "tempHigh",
      "precipitation",
      "fogProxy",
      "windEnergy",
      "air",
    ]) {
      await page.selectOption("#color-select", mode);
      for (const window of ["1", "21"]) {
        await page.selectOption("#smooth-select", window);
        for (const scheme of ["quantile", "quantize"]) {
          await page.selectOption("#scheme-select", scheme);
          assert.equal(await page.locator(".histogram-bin text").count(), 0);
          assert.equal(
            await page
              .locator(".histogram-bin rect:not(.bin-column):not(.bin-hit)")
              .count(),
            0
          );
          const result = await page.evaluate(() => {
            const scale = SF_DEBUG.getScale();
            const ds = SF_DEBUG.datasets[SF_DEBUG.state.mode];
            const values = SF_DEBUG.getDisplay().filter(
              (v) => Number.isFinite(v) && !(ds.zero && v === 0)
            );
            const bins = [...document.querySelectorAll(".histogram-bin")];
            const width =
              document.querySelector(".bin-chart").viewBox.baseVal.width;
            return {
              count: values.length,
              sum: bins.reduce((n, bin) => n + Number(bin.dataset.count), 0),
              allCorrect: bins.every((bin, i) => {
                const bar = bin.querySelector(".bin-column");
                const expected = values.filter(
                  (v) => d3.bisectRight(scale.breaks, v) === i
                ).length;
                const expectedWidth =
                  scale.max === scale.min
                    ? width
                    : (width *
                        (Number(bin.dataset.high) - Number(bin.dataset.low))) /
                      (scale.max - scale.min);
                const maxCount = Math.max(
                  ...bins.map((b) => Number(b.dataset.count)),
                  1
                );
                return (
                  Math.abs(
                    Number(bar.getAttribute("y")) +
                      Number(bar.getAttribute("height")) -
                      80
                  ) < 1e-6 &&
                  Number(bin.dataset.count) === expected &&
                  Math.abs(Number(bar.getAttribute("width")) - expectedWidth) <
                    1e-6 &&
                  Math.abs(
                    Number(bar.getAttribute("height")) -
                      (70 * expected) / maxCount
                  ) < 1e-6 &&
                  bar.getAttribute("fill") === scale.colors[i]
                );
              }),
            };
          });
          assert.equal(result.sum, result.count);
          assert(
            result.allCorrect,
            `${mode} ${window} ${scheme}: bin count, width, height or color mismatch`
          );
        }
      }
    }
    await page.selectOption("#color-select", "tempHigh");
    await page.selectOption("#smooth-select", "1");
    for (const width of [1440, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      for (const scheme of ["quantile", "quantize"]) {
        await page.selectOption("#scheme-select", scheme);
        await page.evaluate(() => new Promise(requestAnimationFrame));
        assert.equal((await page.evaluate(audit)).length, 4);
        const chart = await page.locator(".bin-chart").boundingBox();
        const legend = await page.locator("#legend").boundingBox();
        assert(Math.abs(chart.width - legend.width) < 1);
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth > innerWidth
          ),
          false
        );
        await page.locator(".histogram-bin").first().focus();
        assert.match(await page.locator(".bin-detail").textContent(), /days$/);
        await page
          .locator(".histogram-bin")
          .first()
          .evaluate((e) => e.blur());
        await page.locator(".toolbar").screenshot({
          path: `test-results/histogram-${scheme}-${width}.png`,
        });
      }
    }
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.locator("#export").click();
    await page.selectOption("#export-scope", "page");
    for (const format of ["svg", "png"]) {
      await page.selectOption("#export-format", format);
      const pending = page.waitForEvent("download");
      await page.locator("#export-save").click();
      const filename = `test-results/histogram-export.${format}`;
      await (await pending).saveAs(filename);
      const data = fs.readFileSync(filename);
      if (format === "svg") {
        assert(data.toString().includes("data-count="));
        assert(data.toString().includes("Spiral Almanac"));
      } else assert.equal(data.toString("ascii", 1, 4), "PNG");
    }
    assert.deepEqual(errors, []);
    console.log(
      "Histogram verified: bin counts, proportional numeric widths, count heights, colors, exclusions, smoothing, resize, keyboard details, four type styles, SVG/PNG exports."
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
