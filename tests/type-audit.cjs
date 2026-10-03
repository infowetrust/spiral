const path = require("node:path");
const fs = require("node:fs");
let chromium;
try {
  ({ chromium } = require("playwright"));
} catch {
  ({ chromium } = require(path.join(
    require("node:os").homedir(),
    ".cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright"
  )));
}

// Count rendered text styles, not inherited declarations on empty containers.
function audit() {
  const styles = new Map();
  for (const node of document.querySelectorAll("body *")) {
    if (node.closest("script, style, option, title, desc, noscript")) continue;
    const text = node.matches("select")
      ? node.selectedOptions[0].textContent
      : [...node.childNodes]
          .filter((n) => n.nodeType === Node.TEXT_NODE)
          .map((n) => n.textContent.trim())
          .join("")
          .trim();
    if (!text || !node.getClientRects().length || !node.checkVisibility())
      continue;
    const css = getComputedStyle(node);
    const matrix =
      node instanceof SVGGraphicsElement ? node.getScreenCTM() : null;
    const size =
      parseFloat(css.fontSize) * (matrix ? Math.hypot(matrix.a, matrix.b) : 1);
    const key = [
      css.fontFamily,
      Math.round(size * 10) / 10,
      css.fontWeight,
      css.fontStyle,
    ].join(" | ");
    if (!styles.has(key)) styles.set(key, []);
    const samples = styles.get(key);
    if (samples.length < 4) samples.push(text.slice(0, 65));
  }
  return [...styles].map(([style, samples]) => ({ style, samples }));
}
module.exports = { audit };
if (require.main === module)
  (async () => {
    const browser = await chromium.launch({ channel: "chrome" });
    try {
      const page = await browser.newPage({
        viewport: { width: 1440, height: 900 },
      });
      await page.goto("file://" + path.resolve("index.html"));
      await page.waitForSelector(".cell");
      const result = await page.evaluate(audit);
      fs.mkdirSync(path.resolve("test-results"), { recursive: true });
      fs.writeFileSync(
        path.resolve("test-results", process.argv[2] || "type-audit.json"),
        JSON.stringify(result, null, 2)
      );
      console.log(
        JSON.stringify({ count: result.length, styles: result }, null, 2)
      );
    } finally {
      await browser.close();
    }
  })().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
