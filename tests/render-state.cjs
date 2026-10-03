// Pure DOM-state regression checks without launching a browser.
const fs = require("node:fs");
const vm = require("node:vm");
const assert = require("node:assert/strict");
class Element {
  constructor(tag = "div") {
    this.tag = tag;
    this.children = [];
    this.attrs = {};
    this.dataset = {};
    this.style = { setProperty() {} };
    this.listeners = {};
    this.clientWidth = 1100;
  }
  append(...nodes) {
    this.children.push(...nodes);
  }
  replaceChildren(...nodes) {
    this.children = nodes;
  }
  setAttribute(k, v) {
    this.attrs[k] = String(v);
  }
  addEventListener(k, f) {
    this.listeners[k] = f;
  }
  getBoundingClientRect() {
    return { width: this.clientWidth };
  }
}
const markup = fs.readFileSync("index.html", "utf8");
const nodes = Object.fromEntries(
  [...markup.matchAll(/id="([^"]+)"/g)].map((m) => [m[1], new Element()])
);
const views = ["area", "necklace"].map((view) => {
  const e = new Element("button");
  e.dataset.view = view;
  return e;
});
const document = {
  getElementById: (id) => nodes[id],
  createElement: (tag) => new Element(tag),
  createElementNS: (_, tag) => new Element(tag),
  createDocumentFragment: () => new Element("fragment"),
  querySelector: () => new Element(),
  querySelectorAll: () => views,
  addEventListener() {},
};
const context = vm.createContext({
  window: {},
  document,
  console,
  getComputedStyle: () => ({ fontSize: "12px" }),
  d3: require("../vendor/d3.v7.min.js"),
});
for (const name of ["weather", "sports", "air", "events"])
  vm.runInContext(fs.readFileSync(`data/${name}.js`, "utf8"), context);
vm.runInContext(fs.readFileSync("core.js", "utf8"), context);
context.SpiralCore = context.window.SpiralCore;
vm.runInContext(fs.readFileSync("app.js", "utf8"), context);
const debug = context.window.SF_DEBUG;
const all = (node) => [node, ...node.children.flatMap(all)];
const invalid = () =>
  all(nodes.seasonal).filter((e) => /NaN|undefined/.test(e.attrs.d || ""));
const original = debug.datasets.precipitation.values;
debug.state.mode = "precipitation";
debug.datasets.precipitation.values = original.map(() => null);
debug.datasets.precipitation.values[100] = 10;
for (const summary of ["contour", "ribbon", "area"]) {
  debug.state.summary = summary;
  debug.render();
  assert.equal(invalid().length, 0);
  const paths = all(nodes.seasonal).filter((e) => e.tag === "path");
  assert(paths.length > 0);
  if (summary === "ribbon") assert(paths.length < 365);
}
debug.datasets.precipitation.values = original.map(() => null);
debug.render();
assert.equal(all(nodes.seasonal).filter((e) => e.tag === "path").length, 0);
debug.datasets.precipitation.values = original;
debug.state.scheme = "quantile";
debug.render();
const scale = debug.getScale();
for (const b of scale.breaks) {
  assert.equal(scale.color(b), scale.rawColor(b));
}
debug.state.mode = "sports";
debug.render();
assert(!nodes["inspect-value"].textContent.includes("High temperature"));
assert(
  nodes["inspect-value"].textContent.includes("home game") ||
    nodes["inspect-value"].textContent.includes("Giants")
);
console.log(
  "DOM-state checks passed: partial/all-missing seasonal paths, scale boundaries, inspection updates after switching data."
);
