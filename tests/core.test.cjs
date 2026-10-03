const assert = require("node:assert/strict");
const C = require("../core.js");
const g = C.geometry("2016-09-27", "2026-09-26"),
  rev = C.geometry("2016-09-27", "2026-09-26", -1);
const dates = C.datesBetween("2016-09-27", "2026-09-26");
assert.equal(dates.length, 3652);
assert(dates.includes("2020-02-29") && dates.includes("2024-02-29"));
function area(p) {
  return (
    Math.abs(
      p.reduce((s, v, i) => {
        const w = p[(i + 1) % p.length];
        return s + v[0] * w[1] - v[1] * w[0];
      }, 0)
    ) / 2
  );
}
const areas = [];
for (let i = 0; i < g.n; i++) {
  const polygon = g.polygon(i).map((p) => p.map((v) => Number(v.toFixed(3))));
  areas.push(area(polygon));
  const p = g.center(i),
    q = rev.center(i);
  assert(Math.abs(p[0] + q[0] - 1000) < 1e-8);
  assert(Math.abs(p[1] - q[1]) < 1e-8);
  for (const [x, y] of g.polygon(i)) {
    const r = Math.hypot(x - 500, y - 500);
    assert(r >= 215 - 1e-8 && r <= 430 + 1e-8);
  }
}
assert((Math.max(...areas) - Math.min(...areas)) / g.cellArea < 0.001);
const jan2025 = dates.indexOf("2025-01-01"),
  jan2026 = dates.indexOf("2026-01-01");
assert(
  Math.abs(g.angle(jan2026) - g.angle(jan2025) - (365 / C.YEAR) * 2 * Math.PI) <
    1e-9
);
assert(Math.abs(g.angle(jan2026) - g.angle(jan2025) - 2 * Math.PI) > 0.001);
assert.deepEqual(C.smooth([0, 0, 7, 0, 0], 3), [0, 7 / 3, 7 / 3, 7 / 3, 0]);
assert.equal(C.smooth([1, null, 3, 4, 5], 3)[1], null);
assert.deepEqual(C.align(["2026-01-01", "2026-01-02"], ["2026-01-02"], [0]), [
  null,
  0,
]);
assert.equal(C.seasonIndex("2024-02-29"), null);
assert.equal(C.seasonIndex("2024-03-01"), C.seasonIndex("2023-03-01"));
assert(C.seasonal(["2026-01-01"], [10]).some((v) => v === null));
console.log(
  `Core checks passed: ${g.n} tiles, polygon area spread ${(
    ((Math.max(...areas) - Math.min(...areas)) / g.cellArea) *
    100
  ).toFixed(4)}%, bounds, reversal, leap drift, smoothing, nulls.`
);
