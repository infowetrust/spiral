/* Shared numerical rules, usable in the browser and in node checks. */
(function (root) {
  const DAY = 86400000,
    YEAR = 365.24219;
  const MONTHS = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const iso = (ms) => new Date(ms).toISOString().slice(0, 10);
  const dateLabel = (s) =>
    `${s.slice(8, 10)} ${MONTHS[Number(s.slice(5, 7)) - 1]} ${s.slice(0, 4)}`;
  const mean = (a) => {
    const b = a.filter(Number.isFinite);
    return b.length ? b.reduce((x, y) => x + y, 0) / b.length : null;
  };
  const extent = (a) => {
    const b = a.filter(Number.isFinite);
    return b.length ? [Math.min(...b), Math.max(...b)] : [0, 1];
  };
  function datesBetween(start, end) {
    const a = [];
    for (let ms = Date.parse(start); ms <= Date.parse(end); ms += DAY)
      a.push(iso(ms));
    return a;
  }
  function align(dates, sourceDates, values) {
    const byDate = new Map(sourceDates.map((d, i) => [d, values[i]]));
    return dates.map((d) =>
      Number.isFinite(byDate.get(d)) ? byDate.get(d) : null
    );
  }
  function smooth(values, window) {
    if (window === 1) return values.slice();
    const half = Math.floor(window / 2);
    return values.map((value, i) => {
      if (!Number.isFinite(value)) return null;
      const a = values.slice(
        Math.max(0, i - half),
        Math.min(values.length, i + half + 1)
      );
      return a.filter(Number.isFinite).length >= Math.ceil(a.length * 0.8)
        ? mean(a)
        : null;
    });
  }
  // A non-leap calendar is used only for climatology, never for daily geometry.
  function seasonIndex(s) {
    if (s.slice(5) === "02-29") return null;
    return Math.round(
      (Date.parse(`2001-${s.slice(5)}`) - Date.UTC(2001, 0, 1)) / DAY
    );
  }
  function seasonal(dates, values, window = 21) {
    const buckets = Array.from({ length: 365 }, () => []);
    dates.forEach((d, i) => {
      const j = seasonIndex(d);
      if (j !== null && Number.isFinite(values[i])) buckets[j].push(values[i]);
    });
    const daily = buckets.map(mean),
      half = Math.floor(window / 2);
    return daily.map((_, i) =>
      mean(
        Array.from(
          { length: window },
          (_, k) => daily[(i + k - half + 365) % 365]
        )
      )
    );
  }
  function monthly(dates, values) {
    const buckets = Array.from({ length: 12 }, () => []);
    dates.forEach((d, i) => {
      if (Number.isFinite(values[i]))
        buckets[Number(d.slice(5, 7)) - 1].push(values[i]);
    });
    return buckets.map((v, i) => ({
      month: i,
      value: mean(v),
      count: v.length,
    }));
  }
  function geometry(start, end, direction = 1) {
    const startMs = Date.parse(start),
      anchor = Date.UTC(Number(end.slice(0, 4)), 0, 1);
    const n = Math.round((Date.parse(end) - startMs) / DAY) + 1;
    const minTurn = -0.5 - 0.5 / YEAR,
      maxTurn = (n - 0.5) / YEAR + 0.5;
    const slope = (430 ** 2 - 215 ** 2) / (maxTurn - minTurn);
    const radius = (t) => Math.sqrt(215 ** 2 + (t - minTurn) * slope);
    const angle = (i) =>
      -Math.PI / 2 +
      (direction * 2 * Math.PI * ((startMs - anchor) / DAY + i)) / YEAR;
    const point = (r, a) => [500 + r * Math.cos(a), 500 + r * Math.sin(a)];
    const center = (i, view = "area") =>
      point(
        view === "area"
          ? radius(i / YEAR)
          : 215 + (i / Math.max(1, n - 1)) * 215,
        angle(i)
      );
    const polygon = (i) => {
      const p = [];
      for (let k = 0; k <= 4; k++) {
        const j = i - 0.5 + k / 4;
        p.push(point(radius(j / YEAR + 0.5), angle(j)));
      }
      for (let k = 4; k >= 0; k--) {
        const j = i - 0.5 + k / 4;
        p.push(point(radius(j / YEAR - 0.5), angle(j)));
      }
      return p;
    };
    return {
      n,
      radius,
      angle,
      point,
      center,
      polygon,
      cellArea: (Math.PI * slope) / YEAR,
    };
  }
  const api = {
    DAY,
    YEAR,
    MONTHS,
    iso,
    dateLabel,
    mean,
    extent,
    datesBetween,
    align,
    smooth,
    seasonIndex,
    seasonal,
    monthly,
    geometry,
  };
  root.SpiralCore = api;
  if (typeof module !== "undefined") module.exports = api;
})(typeof window === "undefined" ? globalThis : window);
