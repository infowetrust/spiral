const fs = require("node:fs"),
  path = require("node:path"),
  assert = require("node:assert/strict");
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
  fs.mkdirSync(path.resolve("test-results"), { recursive: true });
  const browser = await playwright.chromium.launch({
    headless: true,
    channel: "chrome",
  });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1100 },
    deviceScaleFactor: 1,
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(
    process.env.SF_TEST_URL || "file://" + path.resolve("index.html")
  );
  await page.waitForSelector(".cell");
  const windowDates = await page.evaluate(() => SF_DEBUG.dates);
  const checkYears = async () => {
    await page.evaluate(
      () =>
        new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve))
        )
    );
    assert.deepEqual(await page.locator(".year-label").allTextContents(), [
      windowDates[0].slice(0, 4),
      windowDates.at(-1).slice(0, 4),
    ]);
    assert.equal(
      await page.locator("#labels .summary-label, .date-label").count(),
      0
    );
    const clear = await page.evaluate(() => {
      const svg = document.querySelector("#spiral");
      const subtitleSize = parseFloat(
        getComputedStyle(document.querySelector(".center-unit")).fontSize
      );
      const cells = [...document.querySelectorAll(".cell")].map((cell) =>
        cell.getBoundingClientRect()
      );
      return [...document.querySelectorAll(".year-label")].every((label, i) => {
        const b = label.getBoundingClientRect();
        const endpoint = cells[i ? cells.length - 1 : 0];
        const gap = Math.hypot(
          Math.max(0, endpoint.left - b.right, b.left - endpoint.right),
          Math.max(0, endpoint.top - b.bottom, b.top - endpoint.bottom)
        );
        const fontSize =
          parseFloat(getComputedStyle(label).fontSize) * svg.getScreenCTM().a;
        return (
          !label.hasAttribute("transform") &&
          Math.abs(fontSize - subtitleSize) < 0.1 &&
          gap <= 12 &&
          cells.every(
            (cell) =>
              b.right <= cell.left ||
              b.left >= cell.right ||
              b.bottom <= cell.top ||
              b.top >= cell.bottom
          )
        );
      });
    });
    assert(
      clear,
      "Years must be horizontal, subtitle-sized, close to endpoints, and clear of daily marks"
    );
  };
  assert.equal(await page.locator(".cell").count(), windowDates.length);
  assert.equal(await page.locator("#summary-plot").count(), 0);
  for (const [width, height] of [
    [1440, 900],
    [1280, 720],
    [1920, 1080],
    [1024, 768],
  ]) {
    await page.setViewportSize({ width, height });
    await page.waitForFunction(() => {
      const stage = document.querySelector(".stage");
      return document.querySelector("#center-copy").parentElement === stage;
    });
    const wheel = await page.locator("#spiral").boundingBox();
    const sidebar = await page.locator(".sidebar").boundingBox();
    assert(
      wheel.y >= 0 && wheel.y + wheel.height <= height,
      `Wheel below fold at ${width}x${height}`
    );
    assert(wheel.x >= sidebar.x + sidebar.width, "Wheel overlaps sidebar");
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth
      ),
      false
    );
    assert(await page.locator("#center-copy h2").isVisible());
    assert.equal(
      await page.locator(".chart-panel #summary-caption").count(),
      0
    );
    await checkYears();
    await page.screenshot({
      path: `test-results/layout-${width}x${height}.png`,
    });
  }
  await page.screenshot({
    path: "test-results/temperature-desktop.png",
    fullPage: true,
  });
  await page.locator(".display-options > summary").click();
  await page.locator(".inspection-details > summary").click();
  for (const mode of [
    "tempHigh",
    "precipitation",
    "fogProxy",
    "windEnergy",
    "windMax",
    "solar",
    "air",
  ]) {
    await page.selectOption("#color-select", mode);
    assert.equal(
      await page.locator("#center-copy h2").getAttribute("aria-label"),
      await page.evaluate(() => SF_DEBUG.datasets[SF_DEBUG.state.mode].label)
    );
    for (const scheme of ["continuous", "quantile", "quantize"]) {
      await page.selectOption("#scheme-select", scheme);
      const result = await page.evaluate(() => {
        const d = SF_DEBUG,
          v = d.getDisplay(),
          s = d.getScale(),
          seen = new Map();
        let tieError = false;
        v.forEach((x) => {
          if (seen.has(x) && seen.get(x) !== s.color(x)) tieError = true;
          seen.set(x, s.color(x));
        });
        return {
          tieError,
          breaks: s.breaks,
          bins: document.querySelectorAll(".histogram-bin").length,
          emptyPath: [...document.querySelectorAll("path")].some((p) =>
            /NaN|undefined/.test(p.getAttribute("d") || "")
          ),
        };
      });
      assert.equal(result.tieError, false);
      assert.equal(result.emptyPath, false);
      if (scheme !== "continuous")
        assert.equal(result.bins, result.breaks.length + 1);
    }
  }
  await page.selectOption("#color-select", "windEnergy");
  await page.selectOption("#scheme-select", "continuous");
  await page.selectOption("#smooth-select", "21");
  await page.selectOption("#summary-select", "ribbon");
  assert(await page.isChecked("#sqrt-scale"));
  const mapping = () =>
    page.evaluate(() => {
      const s = SF_DEBUG.getScale();
      return {
        min: s.min,
        max: s.max,
        midpoint: s.position.invert(0.5),
        values: SF_DEBUG.getDisplay(),
        cells: [...document.querySelectorAll(".cell")].map((n) =>
          n.getAttribute("fill")
        ),
        ribbon: [...document.querySelectorAll(".summary-ribbon")].map((n) => ({
          d: n.getAttribute("d"),
          fill: n.getAttribute("fill"),
        })),
      };
    });
  const sqrtMapping = await mapping();
  assert(
    Math.abs(
      sqrtMapping.midpoint -
        ((Math.sqrt(sqrtMapping.min) + Math.sqrt(sqrtMapping.max)) / 2) ** 2
    ) < 1e-8
  );
  await page.uncheck("#sqrt-scale");
  const linearMapping = await mapping();
  assert(
    Math.abs(
      linearMapping.midpoint - (linearMapping.min + linearMapping.max) / 2
    ) < 1e-8
  );
  assert.deepEqual(linearMapping.values, sqrtMapping.values);
  assert.notDeepEqual(linearMapping.cells, sqrtMapping.cells);
  assert.deepEqual(
    linearMapping.ribbon.map((n) => n.d),
    sqrtMapping.ribbon.map((n) => n.d)
  );
  assert.notDeepEqual(
    linearMapping.ribbon.map((n) => n.fill),
    sqrtMapping.ribbon.map((n) => n.fill)
  );
  assert(
    (await page.locator("#legend .legend-foot").innerText()).startsWith(
      "Linear color scale."
    )
  );
  await page.screenshot({
    path: "test-results/wind-linear-toggle.png",
    fullPage: true,
  });
  await page.selectOption("#color-select", "tempHigh");
  assert(await page.locator("#sqrt-control").isHidden());
  await page.selectOption("#color-select", "windEnergy");
  assert.equal(await page.isChecked("#sqrt-scale"), false);
  await page.check("#sqrt-scale");
  for (const scheme of ["quantile", "quantize"]) {
    await page.selectOption("#scheme-select", scheme);
    assert(await page.locator("#sqrt-scale").isDisabled());
    assert.equal(await page.isChecked("#sqrt-scale"), false);
    assert(
      !(await page.locator("#legend .legend-foot").innerText()).includes(
        "Square-root"
      )
    );
  }
  await page.selectOption("#scheme-select", "continuous");
  assert(await page.isChecked("#sqrt-scale"));
  assert.deepEqual((await mapping()).cells, sqrtMapping.cells);
  await page.screenshot({
    path: "test-results/wind-sqrt-toggle.png",
    fullPage: true,
  });
  for (const mode of ["sports", "events", "month"]) {
    await page.selectOption("#color-select", mode);
    assert(await page.locator("#sqrt-control").isHidden());
  }
  await page.selectOption("#color-select", "precipitation");
  await page.selectOption("#smooth-select", "1");
  await page.selectOption("#scheme-select", "continuous");
  const raw = await page.evaluate(() => SF_DEBUG.getDisplay().slice());
  await page.selectOption("#smooth-select", "7");
  const smoothed = await page.evaluate(() => SF_DEBUG.getDisplay().slice());
  assert(raw.some((v, i) => v !== smoothed[i]));
  raw.forEach((v, i) => {
    if (v === null) assert.equal(smoothed[i], null);
  });
  await page.selectOption("#summary-select", "ribbon");
  const before = await page
    .locator(".summary-ribbon")
    .nth(0)
    .getAttribute("fill");
  await page.selectOption("#scheme-select", "quantile");
  const ribbonMatches = await page.evaluate(() => {
    const series = SpiralCore.seasonal(
      SF_DEBUG.dates,
      SF_DEBUG.datasets[SF_DEBUG.state.mode].values,
      21
    );
    return [...document.querySelectorAll(".summary-ribbon")].every(
      (p, i) => p.getAttribute("fill") === SF_DEBUG.getScale().color(series[i])
    );
  });
  assert(ribbonMatches);
  await page.screenshot({
    path: "test-results/rain-ribbon-desktop.png",
    fullPage: true,
  });
  await page.selectOption("#smooth-select", "1");
  await page.selectOption("#color-select", "sports");
  assert(await page.locator("#scheme-select").isDisabled());
  assert(await page.locator("#smooth-select").isDisabled());
  assert((await page.locator('.cell[fill^="url(#teams-"]').count()) > 0);
  assert((await page.locator(".post-marker").count()) > 0);
  for (const [team, name, color] of [
    ["warriors", "Warriors", "#1D428A"],
    ["valkyries", "Valkyries", "#AD96DC"],
    ["giants", "Giants", "#FD5A1E"],
  ]) {
    for (const id of ["warriors", "valkyries", "giants"])
      await page.locator(`#team-${id}`).setChecked(id === team);
    assert.equal(
      await page.locator("#center-copy h2").getAttribute("aria-label"),
      `${name} home games`
    );
    const fills = await page
      .locator(".cell")
      .evaluateAll((nodes) => [
        ...new Set(nodes.map((node) => node.getAttribute("fill"))),
      ]);
    assert(fills.includes(color));
    assert(
      fills.every((fill) =>
        [color, "transparent", "url(#missing)"].includes(fill)
      )
    );
    await page.screenshot({ path: `test-results/team-${team}.png` });
  }
  await page.uncheck("#team-giants");
  assert.equal(
    await page.locator("#center-copy h2").getAttribute("aria-label"),
    "No teams selected"
  );
  assert.equal(await page.locator(".post-marker").count(), 0);
  for (const id of ["warriors", "valkyries", "giants"])
    await page.check(`#team-${id}`);
  const point = await page.evaluate(() => SF_DEBUG.getGeometry().center(1250));
  await page.check("#reverse");
  await checkYears();
  const reversed = await page.evaluate(() =>
    SF_DEBUG.getGeometry().center(1250)
  );
  assert(Math.abs(point[0] + reversed[0] - 1000) < 1e-7);
  assert(Math.abs(point[1] - reversed[1]) < 1e-7);
  await page.screenshot({
    path: "test-results/sports-counterclockwise-desktop.png",
    fullPage: true,
  });
  await page.uncheck("#reverse");
  await page.locator("#inspect-date").fill("2022-06-13");
  await page.locator("#inspect-date").dispatchEvent("change");
  assert.match(await page.locator("#inspect-value").innerText(), /Warriors/);
  assert.match(
    await page.locator("#inspect-value").innerText(),
    /NBA Finals - Game 5/i
  );
  await page.locator('[data-view="necklace"]').click();
  await checkYears();
  assert.equal(await page.locator("circle.cell").count(), windowDates.length);
  await page.locator('[data-view="area"]').click();
  await page.locator("#export").click();
  for (const scope of ["wheel", "page"]) {
    await page.selectOption("#export-scope", scope);
    for (const format of ["svg", "png"]) {
      await page.selectOption("#export-format", format);
      const downloadPromise = page.waitForEvent("download");
      await page.locator("#export-save").click();
      const download = await downloadPromise;
      const filename = `test-results/export-${scope}.${format}`;
      await download.saveAs(filename);
      const data = fs.readFileSync(filename);
      if (format === "png") {
        assert.equal(data.toString("ascii", 1, 4), "PNG");
        const coloredPixels = await page.evaluate(async (dataUrl) => {
          const image = new Image();
          image.src = dataUrl;
          await image.decode();
          const canvas = document.createElement("canvas");
          canvas.width = canvas.height = 64;
          const context = canvas.getContext("2d");
          context.drawImage(image, 0, 0, 64, 64);
          const pixels = context.getImageData(0, 0, 64, 64).data;
          let count = 0;
          for (let i = 0; i < pixels.length; i += 4)
            if (
              Math.max(...pixels.slice(i, i + 3)) -
                Math.min(...pixels.slice(i, i + 3)) >
              40
            )
              count++;
          return count;
        }, `data:image/png;base64,${data.toString("base64")}`);
        assert(coloredPixels > 50, "PNG must contain colored chart pixels");
        if (scope === "wheel") {
          assert.equal(data.readUInt32BE(16), 2000);
          assert.equal(data.readUInt32BE(20), 2000);
        }
      } else {
        const source = data.toString();
        assert(!source.includes("foreignObject"));
        assert(!source.includes("127.0.0.1"));
        assert(source.includes("SF home games"));
        if (scope === "page") {
          assert(source.includes("Warriors"));
          assert(
            source.includes("Design &amp; visualization © 2026 RJ Andrews.")
          );
          assert(source.includes("data:image/svg+xml;base64,"));
        } else {
          assert(!source.includes("San Francisco, day by day"));
          assert(!source.includes("RJ Andrews"));
        }
      }
    }
  }
  await page.locator("#export-options").press("Escape");
  await page.selectOption("#color-select", "precipitation");
  await page.selectOption("#scheme-select", "continuous");
  await page.selectOption("#smooth-select", "21");
  await page.selectOption("#summary-select", "area");
  assert.equal(
    await page.locator(".summary-area").getAttribute("data-baseline-value"),
    "0"
  );
  await page.selectOption("#color-select", "windEnergy");
  const radiusCheck = await page.evaluate(() => {
    const series = SpiralCore.seasonal(
      SF_DEBUG.dates,
      SF_DEBUG.datasets.windEnergy.values,
      21
    );
    const p = document.querySelector(".summary-area").getPointAtLength(0);
    return {
      actual: Math.hypot(p.x, p.y),
      expected:
        159 +
        (39 * series[0]) /
          Math.max(...series.filter(Number.isFinite).map(Math.abs)),
    };
  });
  assert(Math.abs(radiusCheck.actual - radiusCheck.expected) < 0.002);
  await page.selectOption("#color-select", "tempHigh");
  assert.equal(await page.locator("#summary-select").inputValue(), "contour");
  assert.equal(await page.locator(".summary-area").count(), 0);
  await page.selectOption("#color-select", "precipitation");
  assert.equal(await page.locator("#summary-select").inputValue(), "area");
  const rainTicks = await page.locator(".ramp-tick").allTextContents();
  assert(rainTicks.includes("<0.01"));
  assert(rainTicks.every((label) => !/\.\d{3}|e[+-]/.test(label)));
  await page.screenshot({
    path: "test-results/precipitation-readable-legend.png",
  });
  await page.locator("#export").click();
  await page.selectOption("#export-scope", "page");
  const rainDownloadPromise = page.waitForEvent("download");
  await page.locator("#export-save").click();
  await (await rainDownloadPromise).saveAs("test-results/export-rain-page.png");
  await page.locator("#export-options").press("Escape");
  await page.selectOption("#color-select", "air");
  await page.selectOption("#scheme-select", "continuous");
  await page.selectOption("#summary-select", "contour");
  await page.screenshot({
    path: "test-results/air-desktop.png",
    fullPage: true,
  });
  for (const width of [320, 390, 768]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const mode of ["tempHigh", "sports", "fogProxy"]) {
      await page.selectOption("#color-select", mode);
      if (mode !== "sports")
        await page.selectOption("#scheme-select", "quantile");
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth
      );
      assert.equal(overflow, false, `${mode}: horizontal overflow at ${width}`);
      await checkYears();
      assert(await page.locator("#center-copy h2").isVisible());
      assert(
        await page
          .locator("#center-copy h2")
          .evaluate((node) => node.scrollWidth <= node.clientWidth),
        `${mode}: center title overflow at ${width}`
      );
      await page.screenshot({
        path: `test-results/${mode}-${width}.png`,
        fullPage: true,
      });
    }
  }
  assert.deepEqual(errors, []);
  await browser.close();
  console.log(
    "Browser checks passed: numeric scales, smoothing, zero-baseline area, temperature exception, ribbon mapping, team filters, overlap/postseason, reversal, inspection, necklace, SVG/PNG page/wheel exports, mobile/tablet overflow."
  );
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
