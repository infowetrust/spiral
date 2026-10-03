/* The page has no network dependency: data snapshots and D3 are bundled locally. */
(() => {
  "use strict";
  const C = SpiralCore,
    $ = (id) => document.getElementById(id),
    NS = "http://www.w3.org/2000/svg";
  const W = window.SF_WEATHER,
    S = window.SF_SPORTS;
  const E = window.SF_EVENTS || { categories: [], records: [] };
  const eventTypes = Object.fromEntries(
    E.categories.map((event) => [event.id, event])
  );
  const A = window.SF_AIR || {
    dates: [],
    values: [],
    start: "unavailable",
    end: "unavailable",
  };
  if (!W || !S) {
    $("meta").textContent =
      "A required data snapshot is missing. Run the update scripts listed in README.md.";
    return;
  }
  if (!window.SF_AIR) {
    const option = $("color-select").querySelector('[value="air"]');
    option.disabled = true;
    option.textContent = "Fine particles / snapshot unavailable";
  }
  const end = [W.end, S.end].sort().at(-1);
  const startDate = new Date(`${end}T00:00:00Z`);
  startDate.setUTCFullYear(startDate.getUTCFullYear() - 10);
  startDate.setUTCDate(startDate.getUTCDate() + 1);
  const start = C.iso(startDate),
    dates = C.datesBetween(start, end),
    n = dates.length;
  const state = {
    mode: "tempHigh",
    scheme: "continuous",
    sqrtByMode: {},
    window: 1,
    summary: "contour",
    view: "area",
    direction: 1,
    selected: null,
    pinned: false,
    teamIds: ["warriors", "valkyries", "giants"],
    eventIds: E.categories.map((event) => event.id),
    eventSymbols: true,
  };
  const months = [
    "#4e79a7",
    "#a0cbe8",
    "#59a14f",
    "#8cd17d",
    "#f28e2b",
    "#ffbe7d",
    "#e15759",
    "#ff9d9a",
    "#b07aa1",
    "#d4a6c8",
    "#9c755f",
    "#bab0ac",
  ];
  const teams = {
    warriors: { name: "Warriors", color: "#1D428A" },
    valkyries: { name: "Valkyries", color: "#AD96DC" },
    giants: { name: "Giants", color: "#FD5A1E" },
  };
  const gamesByDate = d3.group(S.games, (d) => d.date);
  const selectedTeams = () =>
    Object.keys(teams).filter((id) => state.teamIds.includes(id));
  const selectedGames = (date) =>
    (gamesByDate.get(date) || []).filter((g) => state.teamIds.includes(g.team));
  const sportsTitle = () => {
    const ids = selectedTeams();
    return ids.length === 3
      ? "SF home games"
      : ids.length === 0
      ? "No teams selected"
      : ids.map((id) => teams[id].name).join(" + ") + " home games";
  };
  const eventsByDate = new Map();
  E.records.forEach((event) => {
    C.datesBetween(event.start, event.end).forEach((date) => {
      if (!eventsByDate.has(date)) eventsByDate.set(date, []);
      eventsByDate.get(date).push(event);
    });
  });
  const selectedEvents = (date, includeInactive = false) =>
    (eventsByDate.get(date) || []).filter(
      (event) =>
        state.eventIds.includes(event.id) &&
        (includeInactive || event.status === "held")
    );
  const eventIdsAt = (date) =>
    E.categories
      .map((event) => event.id)
      .filter((id) => selectedEvents(date).some((event) => event.id === id));
  const eventsTitle = () =>
    state.eventIds.length === E.categories.length
      ? "SF's annual rhythms"
      : state.eventIds.length === 1
      ? eventTypes[state.eventIds[0]].name
      : state.eventIds.length
      ? `${state.eventIds.length} annual events`
      : "No events selected";
  const categoricalTitle = () =>
    state.mode === "sports"
      ? sportsTitle()
      : state.mode === "events"
      ? eventsTitle()
      : "Calendar months";
  const datasets = {
    tempHigh: {
      label: "High temperature",
      unit: "°F",
      precision: 1,
      stops: ["#2f6fad", "#f4edc7", "#b21f24"],
      pivot: 65,
      description:
        "Daily maximum air temperature at 2 m. A modeled grid point near central San Francisco, not a thermometer or a citywide average.",
    },
    windMax: {
      label: "Maximum wind",
      unit: "mph",
      precision: 1,
      stops: ["#e5f2f7", "#74add1", "#045a8d"],
      description:
        "Maximum modeled 10 m wind speed during each local day. This is sustained wind, not a gust measurement.",
    },
    windEnergy: {
      label: "Wind energy",
      unit: "Wh/m² per day",
      precision: 0,
      stops: ["#e9f3f8", "#9ecae1", "#3182bd", "#08306b"],
      sqrt: true,
      zero: true,
      description:
        "Daily integral of modeled kinetic wind-energy flux at 10 m: Σ ½ρv³Δt, with air density fixed at 1.225 kg/m³. Actual hourly intervals are summed. A windiness index, not turbine electricity production; cubing wind gives strong winds more weight.",
    },
    precipitation: {
      label: "Precipitation",
      unit: "inches per day",
      precision: 2,
      stops: ["#e8f2fa", "#c6dbef", "#6baed6", "#08519c"],
      sqrt: true,
      zero: true,
      description:
        "Modeled daily precipitation total, including rain and snow-water equivalent. Zero is unfilled; missing observations are hatched.",
    },
    solar: {
      label: "Solar radiation",
      unit: "MJ/m² per day",
      precision: 1,
      stops: ["#d7dde3", "#8ecae6", "#fee08b", "#f46d43"],
      zero: true,
      description:
        "Daily sum of surface shortwave solar radiation. Day length, cloud, and atmospheric conditions all affect it; it is not a direct fog measurement.",
    },
    fogProxy: {
      label: "Fog / marine-layer proxy",
      unit: "qualifying hours per day",
      precision: 0,
      stops: ["#fff7bc", "#d9f0a3", "#78c6a3", "#2b8cbe", "#253494"],
      zero: true,
      description:
        "Hours with modeled fog weather codes (45/48), or low cloud cover ≥80% together with relative humidity ≥90%. Low cloud may sit above the ground. One grid point cannot describe all SF neighborhoods or establish whether August is the foggiest month.",
    },
    air: {
      label: "Fine particles / PM2.5",
      unit: "µg/m³",
      precision: 1,
      stops: ["#eaf0ed", "#a3c6ba", "#438c80", "#234e5b", "#241f39"],
      sqrt: true,
      zero: true,
      description:
        "Measured daily mean fine-particle concentration at the Arkansas Street monitor (EPA site 06-075-0005, instrument POC 3). At least 18 hourly observations are required. Pollution-event days are retained. Large spikes can be consistent with wildfire smoke, but PM2.5 also includes other pollution; this series does not identify particle sources.",
    },
  };
  Object.entries(datasets).forEach(([key, ds]) => {
    ds.values =
      key === "air"
        ? C.align(dates, A.dates, A.values)
        : C.align(dates, W.dates, W.values[key]);
  });
  let geo,
    displayValues,
    scale,
    paths = [],
    seasonSeries = [];
  const el = (tag, attrs = {}, text, parent) => {
    const e = document.createElementNS(NS, tag);
    Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, v));
    if (text !== undefined) e.textContent = text;
    if (parent) parent.append(e);
    return e;
  };
  const html = (tag, text, className, parent) => {
    const e = document.createElement(tag);
    if (text !== undefined) e.textContent = text;
    if (className) e.className = className;
    if (parent) parent.append(e);
    return e;
  };
  const path = (p) =>
    "M" + p.map((v) => v.map((x) => x.toFixed(3)).join(",")).join("L") + "Z";
  const fmt = (v, ds = active()) =>
    !Number.isFinite(v)
      ? "No data"
      : v > 0 && v < 10 ** -(ds?.precision ?? 1)
      ? "<" + 10 ** -(ds?.precision ?? 1)
      : Number(v.toFixed(ds?.precision ?? 1)).toLocaleString("en-US");
  const tick = (v) => {
    const precision =
      state.mode === "fogProxy" && state.window > 1
        ? 1
        : active()?.precision ?? 1;
    const step = 10 ** -precision;
    if (v > 0 && v < step) return `<${step}`;
    if (v < 0 && v > -step) return `>-${step}`;
    return v.toLocaleString("en-US", { maximumFractionDigits: precision });
  };
  const active = () => datasets[state.mode];
  const isNumeric = () => Boolean(active());
  const usesSqrt = () =>
    isNumeric() &&
    !active().pivot &&
    state.scheme === "continuous" &&
    (state.sqrtByMode[state.mode] ?? Boolean(active().sqrt));
  const isPost = (g) =>
    /post|playoff|final|division|wild.?card|championship/i.test(g.phase || "");
  const isPlayIn = (g) => /play.?in/i.test(g.phase || "");

  function createScale(ds, values) {
    const valid = values.filter(
      (v) => Number.isFinite(v) && (!ds.zero || v !== 0)
    );
    const [min, max] = C.extent(valid),
      interpolate = d3.interpolateRgbBasis(ds.stops);
    let color,
      position,
      breaks = [],
      colors = [];
    if (state.scheme === "continuous") {
      if (ds.pivot && min < ds.pivot && max > ds.pivot) {
        color = d3
          .scaleLinear()
          .domain([min, ds.pivot, max])
          .range(ds.stops)
          .interpolate(d3.interpolateRgb)
          .clamp(true);
        position = d3
          .scaleLinear()
          .domain([min, ds.pivot, max])
          .range([0, 0.5, 1])
          .clamp(true);
      } else {
        position = (usesSqrt() ? d3.scaleSqrt() : d3.scaleLinear())
          .domain([min, max === min ? min + 1 : max])
          .range([0, 1])
          .clamp(true);
        color = (v) => interpolate(position(v));
      }
    } else {
      const count = 7;
      breaks =
        state.scheme === "quantile"
          ? d3.scaleQuantile().domain(valid).range(d3.range(count)).quantiles()
          : d3.range(1, count).map((i) => min + ((max - min) * i) / count);
      breaks = [...new Set(breaks)].filter((v) => v > min && v < max);
      colors = d3
        .range(breaks.length + 1)
        .map((i) => interpolate(breaks.length ? i / breaks.length : 0.5));
      color = d3.scaleThreshold().domain(breaks).range(colors);
      position = d3.scaleLinear().domain([min, max]).range([0, 1]);
    }
    return {
      min,
      max,
      breaks,
      colors,
      position,
      rawColor: color,
      color: (v) =>
        !Number.isFinite(v)
          ? "url(#missing)"
          : ds.zero && v === 0
          ? "transparent"
          : color(v),
    };
  }
  function patterns() {
    const defs = $("defs");
    defs.replaceChildren();
    const p = el(
      "pattern",
      {
        id: "missing",
        width: 5,
        height: 5,
        patternUnits: "userSpaceOnUse",
        patternTransform: "rotate(35)",
      },
      undefined,
      defs
    );
    el("rect", { width: 5, height: 5, fill: "#fcfcfa" }, undefined, p);
    el(
      "line",
      { x1: 0, y1: 0, x2: 0, y2: 5, stroke: "#b8c1bc", "stroke-width": 1 },
      undefined,
      p
    );
    const ids = Object.keys(teams);
    for (let mask = 1; mask < 8; mask++) {
      const selected = ids.filter((_, i) => mask & (1 << i));
      if (selected.length < 2) continue;
      const pp = el(
        "pattern",
        {
          id: "teams-" + selected.join("-"),
          width: selected.length * 3,
          height: 6,
          patternUnits: "userSpaceOnUse",
          patternTransform: "rotate(35)",
        },
        undefined,
        defs
      );
      selected.forEach((id, i) =>
        el(
          "rect",
          { x: i * 3, y: 0, width: 3, height: 6, fill: teams[id].color },
          undefined,
          pp
        )
      );
    }
    // Only create the event combinations that occur, rather than every possible subset.
    if (state.mode === "events") {
      const combinations = new Map(
        dates.map((date) => {
          const ids = eventIdsAt(date);
          return [ids.join("-"), ids];
        })
      );
      combinations.forEach((ids, name) => {
        if (ids.length < 2) return;
        const pattern = el(
          "pattern",
          {
            id: "events-" + name,
            width: ids.length * 3,
            height: 6,
            patternUnits: "userSpaceOnUse",
            patternTransform: "rotate(35)",
          },
          undefined,
          defs
        );
        ids.forEach((id, i) =>
          el(
            "rect",
            {
              x: i * 3,
              width: 3,
              height: 6,
              fill: eventTypes[id].color,
            },
            undefined,
            pattern
          )
        );
      });
    }
  }
  function eventsFill(date) {
    const ids = eventIdsAt(date);
    return ids.length > 1
      ? `url(#events-${ids.join("-")})`
      : ids.length
      ? eventTypes[ids[0]].color
      : "transparent";
  }
  function sportsFill(date) {
    const gs = selectedGames(date),
      ids = selectedTeams().filter((id) => gs.some((g) => g.team === id));
    if (ids.length)
      return ids.length > 1
        ? "url(#teams-" + ids.join("-") + ")"
        : teams[ids[0]].color;
    return sportsCovered(date) ? "transparent" : "url(#missing)";
  }
  function sportsCovered(date) {
    // Coverage is verified by the acquisition script; an unavailable request is not an off-day.
    if (date < S.start || date > S.end) return false;
    return selectedTeams().every((team) => {
      const records = S.coverage.filter(
        (c) => c.team === team && c.start <= date && date <= c.end
      );
      if (
        records.some((c) => c.phase === "all" && c.status === "not_applicable")
      )
        return true;
      const phases =
        team === "warriors"
          ? ["regular", "postseason", "play-in"]
          : ["regular", "postseason"];
      return phases.every((phase) => {
        const matches = records.filter((c) => c.phase === phase);
        return (
          matches.length > 0 &&
          matches.every(
            (c) =>
              ["complete", "no_sf_games"].includes(c.status) &&
              c.verifiedThrough != null &&
              date <= c.verifiedThrough
          )
        );
      });
    });
  }
  function colorAt(i) {
    return state.mode === "month"
      ? months[Number(dates[i].slice(5, 7)) - 1]
      : state.mode === "sports"
      ? sportsFill(dates[i])
      : state.mode === "events"
      ? eventsFill(dates[i])
      : scale.color(displayValues[i]);
  }
  function drawCells() {
    const group = $("cells"),
      posts = $("postseason");
    group.replaceChildren();
    posts.replaceChildren();
    paths = dates.map((_, i) => path(geo.polygon(i)));
    if (state.view === "necklace")
      el(
        "path",
        {
          class: "necklace-thread",
          d:
            "M" +
            dates.map((_, i) => geo.center(i, "necklace").join(",")).join("L"),
        },
        undefined,
        group
      );
    const fragment = document.createDocumentFragment();
    dates.forEach((date, i) => {
      const [x, y] = geo.center(i, state.view),
        attrs = { class: "cell", fill: colorAt(i), "data-index": i };
      const mark =
        state.view === "area"
          ? el("path", { ...attrs, d: paths[i] })
          : el("circle", { ...attrs, cx: x, cy: y, r: 2.05 });
      fragment.append(mark);
      if (state.mode === "sports") {
        const gs = selectedGames(date),
          post = gs.some(isPost),
          playIn = gs.some(isPlayIn);
        if (post || playIn) {
          const r =
            state.view === "area"
              ? geo.radius(i / C.YEAR + 0.38)
              : 215 + (i / (n - 1)) * 215;
          const [px, py] = geo.point(r, geo.angle(i));
          el(
            "path",
            {
              class: "post-marker",
              d: post
                ? `M${px},${py - 2.1}l2.1,2.1 -2.1,2.1 -2.1,-2.1Z`
                : `M${px},${py - 2.1}l2.1,4.2h-4.2Z`,
            },
            undefined,
            posts
          );
        }
      }
    });
    group.append(fragment);
  }
  function drawEventMarkers() {
    const group = $("event-markers");
    group.replaceChildren();
    if (state.mode !== "events" || !state.eventSymbols) return;
    const placed = [];
    E.records
      .filter(
        (event) =>
          event.status === "held" &&
          state.eventIds.includes(event.id) &&
          event.start <= end &&
          event.end >= start
      )
      .forEach((event) => {
        const first = dates.indexOf(event.start < start ? start : event.start);
        const last = dates.indexOf(event.end > end ? end : event.end);
        const i = Math.floor((first + last) / 2);
        const [x, y] = geo.center(i, state.view);
        // Symbols are secondary to the exact daily cells; omit a badge if it would collide.
        if (placed.some(([px, py]) => Math.hypot(px - x, py - y) < 15)) return;
        placed.push([x, y]);
        el(
          "text",
          {
            x,
            y,
            class: "event-marker",
            "text-anchor": "middle",
            "dominant-baseline": "central",
          },
          eventTypes[event.id].emoji,
          group
        );
      });
  }
  function drawLabels() {
    const g = $("labels");
    g.replaceChildren();
    const year = Number(end.slice(0, 4));
    for (let month = 0; month < 12; month++) {
      const a = (Date.UTC(year, month, 1) - Date.parse(start)) / C.DAY,
        b = (Date.UTC(year, month + 1, 1) - Date.parse(start)) / C.DAY;
      const angle = geo.angle((a + b) / 2),
        [x, y] = geo.point(466, angle),
        p = geo.point(440, geo.angle(a)),
        q = geo.point(451, geo.angle(a));
      el(
        "line",
        { class: "boundary", x1: p[0], y1: p[1], x2: q[0], y2: q[1] },
        undefined,
        g
      );
      let rotation = (angle * 180) / Math.PI + 90;
      rotation = ((rotation % 360) + 360) % 360;
      if (rotation > 90 && rotation < 270) rotation += 180;
      el(
        "text",
        {
          class: "month-label",
          x,
          y,
          "text-anchor": "middle",
          "dominant-baseline": "middle",
          transform: `rotate(${rotation} ${x} ${y})`,
        },
        C.MONTHS[month],
        g
      );
    }
    const scale = $("spiral").getBoundingClientRect().width / 1000;
    const fontSize =
      parseFloat(
        getComputedStyle(document.querySelector(".center-unit")).fontSize
      ) / scale;
    const gap = 4 / scale;
    [0, n - 1].forEach((i, k) => {
      const angle = geo.angle(i);
      // The oldest year occupies the empty side of the spiral's starting edge.
      const radius =
        state.view === "area" ? geo.radius(i / C.YEAR + 0.5) : k ? 430 : 215;
      const [x, y] = geo.point(radius, angle);
      const side = (k ? 1 : -1) * Math.sign(Math.cos(angle));
      el(
        "text",
        {
          class: "year-label",
          x: x + side * gap,
          y: k
            ? y
            : y - state.direction * Math.cos(angle) * (fontSize / 2 + gap),
          "text-anchor": side > 0 ? "start" : "end",
          "dominant-baseline": "central",
          "font-size": fontSize,
        },
        dates[i].slice(0, 4),
        g
      );
    });
  }
  function key(parent, label, color, cls = "") {
    const item = html("span", undefined, "key", parent),
      swatch = html("span", undefined, "swatch " + cls, item);
    if (color) swatch.style.background = color;
    html("span", label, undefined, item);
  }
  function renderLegend() {
    const root = $("legend"),
      keys = $("legend-keys");
    root.replaceChildren();
    keys.replaceChildren();
    const available = isNumeric()
      ? dates.filter((_, i) => Number.isFinite(active().values[i]))
      : [];
    if (available.length) {
      const note = html(
        "span",
        "Data through " + C.dateLabel(available.at(-1)),
        "legend-foot",
        keys
      );
      note.style.flexBasis = "100%";
    }
    if (!isNumeric()) {
      html("div", categoricalTitle(), "legend-title", root);
      const cats = html("div", undefined, "legend-categories", root);
      if (state.mode === "month")
        C.MONTHS.forEach((m, i) => key(cats, m, months[i]));
      else if (state.mode === "events") {
        key(keys, "No listed in-person event", null, "zero");
        html(
          "div",
          "Colors match the event toggles. Stripes mark overlapping events; each colored cell is one actual day.",
          "legend-foot",
          root
        );
        html(
          "div",
          "Curated dates, with archival gaps. Canceled and virtual editions are not colored.",
          "legend-foot",
          root
        );
      } else {
        const ids = selectedTeams();
        ids.forEach((id) => key(cats, teams[id].name, teams[id].color));
        if (ids.length > 1)
          key(
            cats,
            "Same-day teams",
            `repeating-linear-gradient(125deg,${teams[ids[0]].color} 0 4px,${
              teams[ids[1]].color
            } 4px 8px)`
          );
        html("span", "◆ Postseason   ▴ Play-in", "key", cats);
        key(keys, ids.length ? "No home game" : "Teams hidden", null, "zero");
        key(keys, "Not available", null, "missing");
      }
      return;
    }
    const ds = active(),
      title = html("div", ds.label, "legend-title", root);
    html("span", ds.unit, "legend-unit", title);
    if (state.scheme === "continuous") {
      const ramp = html("div", undefined, "ramp", root);
      ramp.style.background =
        "linear-gradient(to right," +
        d3
          .range(101)
          .map(
            (i) =>
              scale.rawColor(scale.position.invert(i / 100)) + " " + i + "%"
          )
          .join(",") +
        ")";
      const ticks = html("div", undefined, "ramp-ticks", root);
      const values = [scale.min, scale.position.invert(0.5), scale.max];
      values.forEach((v) => {
        const t = html("span", tick(v), "ramp-tick", ticks);
        t.title = `${v} ${ds.unit}`;
        t.style.left = scale.position(v) * 100 + "%";
      });
    } else {
      const bins = html("div", undefined, "bins", root),
        edges = [scale.min, ...scale.breaks, scale.max];
      let precision = ds.precision;
      while (
        precision < 6 &&
        (new Set(scale.breaks.map((v) => v.toFixed(precision))).size <
          scale.breaks.length ||
          scale.breaks.some(
            (v) => v !== 0 && Number(v.toFixed(precision)) === 0
          ))
      )
        precision++;
      const boundary = (v) =>
        v.toLocaleString("en-US", { maximumFractionDigits: precision });
      scale.colors.forEach((color, i) => {
        const b = html("div", undefined, "bin", bins);
        html("div", undefined, "bin-color", b).style.background = color;
        const label =
          scale.colors.length === 1
            ? boundary(scale.min)
            : i === 0
            ? `< ${boundary(edges[1])}`
            : i === scale.colors.length - 1
            ? `≥ ${boundary(edges[i])}`
            : `${boundary(edges[i])}–<${boundary(edges[i + 1])}`;
        html("div", label, "bin-label", b);
        b.title = `${i === 0 ? "-∞" : edges[i]} ≤ value < ${
          i === scale.colors.length - 1 ? "∞" : edges[i + 1]
        } ${ds.unit}${ds.zero ? "; zero is separate" : ""}`;
      });
    }
    if (ds.zero) key(keys, "Zero", null, "zero");
    key(keys, "Not available", null, "missing");
    let foot =
      state.scheme === "quantile"
        ? "Equal-count bins; tied values stay together."
        : state.scheme === "quantize"
        ? "Equal-width numeric intervals."
        : usesSqrt()
        ? "Square-root scale gives smaller values more contrast."
        : ds.pivot
        ? "Color midpoint: 65°F."
        : "Linear color scale.";
    if (state.scheme !== "continuous")
      foot += " Range labels are approximate; exact limits on hover.";
    if (state.window > 1)
      foot += ` Colors show ${state.window}-day means, including means on dry/zero days.`;
    html("div", foot, "legend-foot", root);
  }
  function drawSeason() {
    const g = $("seasonal");
    g.replaceChildren();
    if (!isNumeric() || state.summary === "off") {
      $("summary-caption").textContent =
        state.mode === "sports"
          ? "Home games only. Stripes preserve team identity on shared dates."
          : state.mode === "month"
          ? "A daily calendar, wrapped around the solar year."
          : "";
      return;
    }
    seasonSeries = C.seasonal(dates, active().values, 21);
    if (!seasonSeries.some(Number.isFinite)) {
      $("summary-caption").textContent =
        "No observations available for a seasonal summary.";
      return;
    }
    const filled = state.summary === "area" && state.mode !== "tempHigh";
    const [min, max] = C.extent(seasonSeries),
      r = d3
        .scaleLinear()
        .domain(
          filled
            ? [0, Math.max(Math.abs(min), Math.abs(max)) || 1]
            : [min, max === min ? min + 1 : max]
        )
        .range([159, 198]);
    const seasonAngle = (i) =>
      -Math.PI / 2 + (state.direction * 2 * Math.PI * i) / 365;
    const points = seasonSeries.map((v, i) =>
      Number.isFinite(v) ? geo.point(r(v), seasonAngle(i)) : null
    );
    el(
      "circle",
      { class: "summary-baseline", cx: 500, cy: 500, r: 159 },
      undefined,
      g
    );
    if (filled) {
      const series = seasonSeries.map((value, i) => ({
        value,
        angle: (state.direction * 2 * Math.PI * i) / 365,
      }));
      const closing = {
        value: seasonSeries[0],
        angle: state.direction * 2 * Math.PI,
      };
      const area = d3
        .areaRadial()
        .defined((d) => Number.isFinite(d.value))
        .angle((d) => d.angle)
        .innerRadius(159)
        .outerRadius((d) => r(d.value));
      el(
        "path",
        {
          class: "summary-area",
          d: area([...series, closing]),
          transform: "translate(500 500)",
          "data-baseline-value": 0,
          "data-baseline-radius": 159,
        },
        undefined,
        g
      );
      const line = d3.line().defined((point) => point !== null);
      el(
        "path",
        { class: "summary-line", d: line([...points, points[0]]) },
        undefined,
        g
      );
      el(
        "circle",
        { class: "summary-baseline", cx: 500, cy: 500, r: 159 },
        undefined,
        g
      );
    } else if (
      state.summary === "contour" ||
      (state.mode === "tempHigh" && state.summary === "area")
    ) {
      const line = d3.line().defined((point) => point !== null);
      el(
        "path",
        { class: "summary-line", d: line([...points, points[0]]) },
        undefined,
        g
      );
    } else {
      for (let i = 0; i < 365; i++) {
        const j = (i + 1) % 365;
        if (
          !Number.isFinite(seasonSeries[i]) ||
          !Number.isFinite(seasonSeries[j])
        )
          continue;
        const a = seasonAngle(i),
          b = seasonAngle(i + 1),
          poly = [
            geo.point(159, a),
            geo.point(r(seasonSeries[i]), a),
            geo.point(r(seasonSeries[j]), b),
            geo.point(159, b),
          ];
        el(
          "path",
          {
            class: "summary-ribbon",
            d: path(poly),
            fill: scale.color(seasonSeries[i]),
          },
          undefined,
          g
        );
      }
    }
    if (filled) {
      $(
        "summary-caption"
      ).textContent = `Seasonal filled area: calendar-day averages, smoothed over 21 days. The inner circle is zero; radial distance from it is proportional to the mean, with the outer scale at ${tick(
        Math.max(Math.abs(min), Math.abs(max))
      )} ${active().unit}. ${
        min < 0 ? "Negative values extend inward. " : ""
      }The gray fill is independent of color bins; filled area itself is not proportional to the value.`;
      return;
    }
    $("summary-caption").textContent = `Seasonal ${
      state.summary === "contour" ? "contour" : "ribbon"
    }: calendar-day averages, smoothed over 21 days. Radius spans ${tick(
      min
    )} to ${tick(max)} ${active().unit}; ${
      state.summary === "contour"
        ? "gray line is independent of color bins"
        : "color uses the same scale as the daily cells"
    }.`;
  }
  function summaryCopy() {
    const root = $("center-copy");
    root.replaceChildren();
    let heading, body, note;
    if (state.mode === "month") {
      heading = "Time, without compression";
      body =
        "Every day receives the same angle and the same area. Leap days take their full place. January 1 drifts slightly between turns.";
      note = "Older dates inside; recent dates outside.";
    } else if (state.mode === "events") {
      const editions = E.records.filter(
        (event) =>
          event.status === "held" &&
          state.eventIds.includes(event.id) &&
          event.start <= end &&
          event.end >= start
      );
      const eventDays = dates.filter((date) => selectedEvents(date).length);
      const overlaps = dates.filter(
        (date) => eventIdsAt(date).length > 1
      ).length;
      heading = "When the city gathers";
      body = `${editions.length} listed in-person editions across ${
        eventDays.length
      } days${overlaps ? `; ${overlaps} dates overlap` : ""}.`;
      note = state.eventIds.includes("burningMan")
        ? "And when it disperses: Burning Man takes place in Nevada, but draws San Franciscans out of town. These are event dates, not a measure of the exodus."
        : "Parades occupy their parade day; festivals span their full listed dates. Blank years may reflect cancellations or archival gaps.";
      if (!state.eventIds.length) {
        body = "All events are hidden.";
        note = "";
      }
    } else if (state.mode === "sports") {
      const games = S.games.filter(
          (g) =>
            g.date >= start && g.date <= end && state.teamIds.includes(g.team)
        ),
        overlaps = [...d3.group(games, (d) => d.date).values()].filter(
          (gs) => new Set(gs.map((g) => g.team)).size > 1
        ).length;
      heading =
        selectedTeams().length === 3
          ? "Three home seasons"
          : "Home in San Francisco";
      body = `${games.length.toLocaleString()} completed home games${
        selectedTeams().length > 1
          ? `; ${overlaps} dates with more than one selected team`
          : ""
      }. ${
        state.teamIds.includes("warriors")
          ? "Warriors begin at Chase Center in 2019. "
          : ""
      }${
        state.teamIds.includes("valkyries") ? "The Valkyries join in 2025." : ""
      }`;
      note = `${
        state.teamIds.includes("giants")
          ? "Giants doubleheaders remain one day. "
          : ""
      }Game details distinguish postseason and play-in.`;
      if (!selectedTeams().length) {
        body = "All three teams are hidden.";
        note = "";
      }
    } else {
      const ds = active(),
        stats = C.monthly(dates, ds.values)
          .filter((m) => m.value !== null)
          .sort((a, b) => b.value - a.value),
        top = stats[0],
        valid = ds.values
          .map((v, i) => ({ v, i }))
          .filter((d) => Number.isFinite(d.v)),
        peak = valid.reduce((a, b) => (a.v > b.v ? a : b), {
          v: -Infinity,
          i: 0,
        });
      if (!top) {
        heading = "No observations";
        body = "This dataset has no observations in the displayed period.";
        note = "Missing dates remain visible as hatching.";
      } else if (state.mode === "tempHigh") {
        heading = "A late warm season";
        const sept = C.monthly(dates, ds.values)[8].value,
          oct = C.monthly(dates, ds.values)[9].value,
          july = C.monthly(dates, ds.values)[6].value;
        body = `${
          C.MONTHS[top.month]
        } has the highest average daily high (${fmt(
          top.value
        )}°F). September averages ${fmt(sept)}°F; October ${fmt(
          oct
        )}°F; July ${fmt(july)}°F.`;
        const march = valid.filter((d) => dates[d.i].startsWith("2026-03")),
          mp = march.reduce((a, b) => (a.v > b.v ? a : b), {
            v: -Infinity,
            i: 0,
          });
        const earlier = valid.filter(
          (d) => dates[d.i].slice(5, 7) === "03" && dates[d.i] < "2026-01-01"
        );
        const delta =
          C.mean(march.map((d) => d.v)) - C.mean(earlier.map((d) => d.v));
        note = Number.isFinite(mp.v)
          ? `March 2026 averaged ${delta.toFixed(
              1
            )}°F warmer than the earlier Marches here; peak ${fmt(
              mp.v
            )}°F on ${C.dateLabel(
              dates[mp.i]
            )}. Modeled, not station-record highs.`
          : "March 2026 is not yet covered by this snapshot.";
      } else if (state.mode === "fogProxy") {
        heading = "Does “Fogust” hold up?";
        const aug = C.monthly(dates, ds.values)[7];
        body = `This proxy peaks in ${C.MONTHS[top.month]} (${top.value.toFixed(
          1
        )} h/day); August averages ${
          aug.value?.toFixed(1) ?? "no data"
        } h/day. That describes this grid and threshold, not all of San Francisco.`;
        note =
          "Low cloud and high humidity are not observed ground-level fog. This cannot settle the Fogust claim.";
      } else if (state.mode === "precipitation") {
        const zero = valid.filter((d) => d.v === 0).length;
        heading = "Rain comes in episodes";
        body = `${Math.round(
          (zero / valid.length) * 100
        )}% of covered days have no modeled precipitation. ${
          C.MONTHS[top.month]
        } has the highest daily average.`;
        note = `Largest daily total: ${fmt(peak.v)} inches on ${C.dateLabel(
          dates[peak.i]
        )}. Seven-day smoothing makes wet spells easier to follow.`;
      } else if (state.mode === "air") {
        heading = "Particles leave a trace";
        body = `The highest covered daily value is ${fmt(peak.v)} ${
          ds.unit
        }, on ${C.dateLabel(dates[peak.i])}. ${
          C.MONTHS[top.month]
        } has the highest monthly mean in this snapshot.`;
        note =
          "Spikes may include wildfire smoke, but particles alone do not establish their source. Hatched dates have no data.";
      } else if (state.mode === "windEnergy") {
        heading = "Wind, accumulated";
        body = `${
          C.MONTHS[top.month]
        } has the highest average wind-energy flux. The strongest integrated day is ${C.dateLabel(
          dates[peak.i]
        )}.`;
        note =
          "A day of persistent wind can exceed a day with one brief peak. The cubic calculation emphasizes stronger winds.";
      } else if (state.mode === "windMax") {
        heading = "The windy season";
        body = `${
          C.MONTHS[top.month]
        } has the highest average daily maximum (${fmt(
          top.value
        )} mph). The largest modeled maximum is ${fmt(
          peak.v
        )} mph on ${C.dateLabel(dates[peak.i])}.`;
        note =
          "At 10 m above the surface. Sheltered streets and exposed headlands can feel very different.";
      } else {
        heading = "Light across the year";
        body = `${
          C.MONTHS[top.month]
        } receives the most daily solar energy on average (${fmt(
          top.value
        )} MJ/m²). Dark interruptions reflect weather as well as the seasonal day-length cycle.`;
        note = "Radiation is not a direct measure of fog or sunshine duration.";
      }
    }
    $("summary-sidebar").replaceChildren();
    html(
      "h2",
      isNumeric() ? active().label : categoricalTitle(),
      undefined,
      root
    );
    html(
      "p",
      isNumeric()
        ? `${active().unit}${
            state.window > 1 ? ` · ${state.window}-day mean` : ""
          }`
        : "Ten years, day by day",
      "center-unit",
      root
    );
    const narrative = document.createElement("div");
    narrative.className = "narrative";
    html("h3", heading, undefined, narrative);
    html("p", body, undefined, narrative);
    html("p", note, "note", narrative);
    root.append(narrative);
    placeSummary();
  }
  function placeSummary() {
    if (typeof ResizeObserver === "undefined") return;
    const root = $("center-copy");
    const narrative = document.querySelector(".narrative");
    if (!narrative) return;
    root.appendChild(narrative);
    root.classList.add("with-narrative");
    if (root.scrollHeight > root.clientHeight) {
      $("summary-sidebar").appendChild(narrative);
      root.classList.remove("with-narrative");
    }
  }
  function renderSources() {
    const root = $("source-content");
    root.replaceChildren();
    const mode = state.mode,
      ds = active();
    if (mode === "events") {
      html("p", E.coverageNote, undefined, root);
      html(
        "p",
        "Local civil dates, inclusive. Marathon means race day; Pride and Chinese New Year mean the parade only. Fleet Week means the festival, not a guarantee that each air show flew. Emoji are mnemonic accents; toggles and date inspection supply the event names.",
        undefined,
        root
      );
      if (state.eventIds.includes("burningMan"))
        html("p", eventTypes.burningMan.note, undefined, root);
      html(
        "p",
        `Historical dates reviewed ${E.reviewedAt}. Each edition retains its source; select a day for direct links.`,
        undefined,
        root
      );
      html("a", "Event sources, scope & gaps", undefined, root).href =
        "docs/events-sources.md";
      return;
    }
    if (mode === "month") {
      html(
        "p",
        "Tropical-year geometry: 365.24219 days per revolution. The latest January 1 anchors the top. Month labels follow that reference year; older January boundaries drift. The seasonal summary uses a separate, closed Jan–Dec calendar.",
        undefined,
        root
      );
      return;
    }
    const source = mode === "sports" ? S : mode === "air" ? A : W;
    html(
      "p",
      mode === "sports"
        ? "Completed regular-season, postseason, and play-in home games played in San Francisco. Oakland Warriors games, neutral-site games, preseason, and unplayed postponements are excluded. A diamond marks postseason; a triangle marks play-in. Tooltips name the team and phase."
        : ds.description,
      undefined,
      root
    );
    const valid = ds
      ? ds.values.filter(Number.isFinite).length
      : dates.filter(sportsCovered).length;
    html(
      "p",
      `Retrieved ${
        source.fetchedAt?.slice(0, 10) || "see source notes"
      }. Source coverage: ${source.start} to ${
        source.end
      }. ${valid.toLocaleString()} of ${n.toLocaleString()} displayed days covered. ${
        mode === "air"
          ? "EPA days use local standard time (PST) all year, not daylight-saving civil time."
          : "Calendar dates use America/Los_Angeles."
      }`,
      undefined,
      root
    );
    if (mode !== "sports" && mode !== "air") {
      const provenance = W.metadata.metricSources?.[mode],
        grid = provenance?.returnedGrid;
      html(
        "p",
        `Provider: Open-Meteo / ECMWF / Copernicus. ${
          provenance
            ? `Model: ${
                provenance.model
              }. Returned grid: ${grid.latitude.toFixed(
                4
              )}, ${grid.longitude.toFixed(4)} (${
                provenance.nominalResolution
              }). ${
                mode === "tempHigh"
                  ? "SF land cell."
                  : "Western SF coastal cell; coarse enough to mix ocean and land conditions."
              }`
            : "Requested location 37.7749° N, 122.4194° W."
        } The model and cell are held fixed across all years. This revision changes the July prototype's best-match source, so differences are not just newly added days.`,
        undefined,
        root
      );
    }
    if (mode === "air")
      html(
        "p",
        `This monitor snapshot ends on ${C.dateLabel(source.end)}. ${
          source.end < end
            ? "Later observations are unavailable in the fetched archive; recent dates are hatched, not treated as clean air. "
            : ""
        }Negative source values, where present, are retained.`,
        undefined,
        root
      );
    const links = html("div", undefined, "source-links", root);
    const sources = Array.isArray(source.sources)
      ? source.sources.filter(
          (s) => s.role !== "availability_probe" && s.status !== "unavailable"
        )
      : [];
    if (mode === "sports") {
      const a = html("a", "MLB Giants schedule", undefined, links);
      a.href = "https://www.mlb.com/giants/schedule";
      const b = html("a", "ESPN Warriors schedule", undefined, links);
      b.href = "https://www.espn.com/nba/team/schedule/_/name/gs";
      const c = html("a", "ESPN Valkyries schedule", undefined, links);
      c.href = "https://www.espn.com/wnba/team/schedule/_/name/gsv";
    }
    (mode === "sports" ? [] : sources.slice(0, 3)).forEach((s) => {
      if (!s.url) return;
      const a = html(
        "a",
        s.name || s.title || s.label || "Source",
        undefined,
        links
      );
      a.href = s.url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
    });
    const a = html("a", "Methods & coverage notes", undefined, links);
    a.href = `docs/${
      mode === "sports" ? "sports" : mode === "air" ? "air" : "weather"
    }-sources.md`;
  }
  function inspectText(i) {
    if (state.mode === "month")
      return C.MONTHS[Number(dates[i].slice(5, 7)) - 1];
    if (state.mode === "events") {
      if (!state.eventIds.length) return "No events selected";
      const events = selectedEvents(dates[i], true);
      return events.length
        ? events
            .map((event) => {
              const type = eventTypes[event.id];
              return `${type.emoji} ${type.name}${
                event.status !== "held" ? ` · ${event.status}` : ""
              }\n${C.dateLabel(event.start)}${
                event.end !== event.start ? ` – ${C.dateLabel(event.end)}` : ""
              }${event.id === "burningMan" ? " · Nevada / SF exodus" : ""}${
                event.note ? "\n" + event.note : ""
              }`;
            })
            .join("\n\n")
        : "No listed in-person event for this date. This curated archive may have gaps.";
    }
    if (state.mode === "sports") {
      if (!selectedTeams().length) return "No teams selected";
      const gs = selectedGames(dates[i]);
      if (!sportsCovered(dates[i]) && !gs.length)
        return "Schedule coverage unavailable";
      return gs.length
        ? gs
            .map(
              (g) =>
                `${teams[g.team]?.name || g.team} vs ${g.opponent} · ${
                  g.phaseDetail || g.phase || "Regular season"
                }\n${g.venue || "San Francisco"}`
            )
            .join("\n") +
            (sportsCovered(dates[i])
              ? ""
              : "\nCoverage incomplete; additional games may be missing.")
        : "No completed home game for the selected teams in San Francisco";
    }
    const ds = active(),
      v = ds.values[i];
    let text = Number.isFinite(v)
      ? `${ds.label}: ${fmt(v)} ${ds.unit}`
      : "No data for this date";
    if (state.window > 1) {
      const half = Math.floor(state.window / 2),
        window = ds.values.slice(
          Math.max(0, i - half),
          Math.min(n, i + half + 1)
        );
      text += `\n${state.window}-day mean: ${
        Number.isFinite(displayValues[i])
          ? fmt(displayValues[i]) + " " + ds.unit
          : "unavailable"
      } (${window.filter(Number.isFinite).length}/${window.length} days)`;
    }
    return text;
  }
  function selectDay(i, highlight = true) {
    state.selected = i;
    state.pinned = highlight;
    $("inspect-date").value = dates[i];
    $("inspect-value").textContent =
      C.dateLabel(dates[i]) + "\n" + inspectText(i);
    $("inspect-links").replaceChildren();
    if (state.mode === "events")
      selectedEvents(dates[i], true).forEach((event) => {
        (event.sources || [event.source]).forEach((url, sourceIndex) => {
          const a = html(
            "a",
            eventTypes[event.id].name +
              " source" +
              (sourceIndex ? ` ${sourceIndex + 1}` : ""),
            undefined,
            $("inspect-links")
          );
          a.href = url;
          a.target = "_blank";
          a.rel = "noopener noreferrer";
        });
      });
    const g = $("selected");
    g.replaceChildren();
    if (!highlight) return;
    if (state.view === "area")
      el("path", { d: paths[i], class: "highlight" }, undefined, g);
    else {
      const [x, y] = geo.center(i, "necklace");
      el("circle", { cx: x, cy: y, r: 4, class: "highlight" }, undefined, g);
    }
  }
  function render() {
    geo = C.geometry(start, end, state.direction);
    patterns();
    if (isNumeric()) {
      displayValues = C.smooth(active().values, state.window);
      scale = createScale(active(), displayValues);
    }
    $("scheme-select").disabled = !isNumeric();
    $("sqrt-control").hidden = !isNumeric() || Boolean(active()?.pivot);
    $("sqrt-scale").disabled = !isNumeric() || state.scheme !== "continuous";
    $("sqrt-scale").checked = usesSqrt();
    $("sqrt-control").title =
      state.scheme === "continuous"
        ? "Square-root or linear color scaling"
        : "Available with the Continuous color scale";
    $("smooth-select").disabled = !isNumeric();
    $("summary-select").disabled = !isNumeric();
    $("summary-area").disabled = state.mode === "tempHigh";
    $("summary-select").value = state.summary;
    $("sports-teams").hidden = state.mode !== "sports";
    $("event-filters").hidden = state.mode !== "events";
    eventInputs.forEach(([id, input]) => {
      input.checked = state.eventIds.includes(id);
    });
    Object.keys(teams).forEach((id) => {
      $("team-" + id).checked = state.teamIds.includes(id);
    });
    $("meta").textContent = `${C.dateLabel(start)} – ${C.dateLabel(
      end
    )} · ${n.toLocaleString()} days · recent dates outside`;
    document
      .querySelectorAll("[data-view]")
      .forEach((b) =>
        b.setAttribute("aria-pressed", b.dataset.view === state.view)
      );
    drawCells();
    drawEventMarkers();
    renderLegend();
    drawSeason();
    summaryCopy();
    drawLabels();
    renderSources();
    $("tooltip").hidden = true;
    if (state.selected !== null) selectDay(state.selected, state.pinned);
    $("spiral-desc").textContent = `${
      isNumeric() ? active().label : categoricalTitle()
    }, ${start} to ${end}. Time flows ${
      state.direction === 1 ? "clockwise" : "counterclockwise"
    }. Older dates inside. ${
      state.view === "area"
        ? "Every daily cell has equal area."
        : "Every pearl is one day."
    }`;
  }
  [
    ["color-select", "mode"],
    ["scheme-select", "scheme"],
    ["smooth-select", "window"],
    ["summary-select", "summary"],
  ].forEach(([id, key]) =>
    $(id).addEventListener("change", (e) => {
      state[key] = key === "window" ? Number(e.target.value) : e.target.value;
      if (key === "mode") {
        if (state.mode === "tempHigh" && state.summary === "area")
          state.summary = "contour";
        else if (
          isNumeric() &&
          state.mode !== "tempHigh" &&
          state.summary === "contour"
        )
          state.summary = "area";
      }
      render();
    })
  );
  $("reverse").addEventListener("change", (e) => {
    state.direction = e.target.checked ? -1 : 1;
    render();
  });
  $("sqrt-scale").addEventListener("change", (e) => {
    state.sqrtByMode[state.mode] = e.target.checked;
    render();
  });
  document.querySelectorAll("[data-view]").forEach((b) =>
    b.addEventListener("click", () => {
      state.view = b.dataset.view;
      render();
    })
  );
  Object.keys(teams).forEach((id) =>
    $("team-" + id).addEventListener("change", (event) => {
      state.teamIds = event.target.checked
        ? [...state.teamIds, id]
        : state.teamIds.filter((team) => team !== id);
      render();
    })
  );
  const eventInputs = E.categories.map((event) => {
    const label = html("label", undefined, undefined, $("event-options"));
    const input = html("input", undefined, undefined, label);
    input.type = "checkbox";
    input.id = "event-" + event.id;
    input.checked = true;
    const swatch = html("span", undefined, "swatch", label);
    swatch.style.background = event.color;
    html("span", `${event.emoji} ${event.name}`, undefined, label);
    if (event.id === "burningMan") label.title = "Nevada event / SF exodus";
    input.addEventListener("change", () => {
      state.eventIds = input.checked
        ? [...state.eventIds, event.id]
        : state.eventIds.filter((id) => id !== event.id);
      render();
    });
    return [event.id, input];
  });
  $("events-all").addEventListener("click", () => {
    state.eventIds = E.categories.map((event) => event.id);
    render();
  });
  $("events-none").addEventListener("click", () => {
    state.eventIds = [];
    render();
  });
  $("event-symbols").addEventListener("change", (event) => {
    state.eventSymbols = event.target.checked;
    drawEventMarkers();
  });
  $("inspect-date").min = start;
  $("inspect-date").max = end;
  $("inspect-date").addEventListener("change", (e) => {
    const i = dates.indexOf(e.target.value);
    if (i >= 0) selectDay(i);
  });
  $("spiral").addEventListener("pointermove", (e) => {
    const mark = e.target.closest(".cell"),
      t = $("tooltip");
    if (!mark) {
      t.hidden = true;
      return;
    }
    const i = Number(mark.dataset.index);
    t.replaceChildren();
    html("strong", C.dateLabel(dates[i]), undefined, t);
    html("span", inspectText(i), undefined, t);
    t.hidden = false;
    t.style.left =
      Math.min(e.clientX + 14, window.innerWidth - t.offsetWidth - 10) + "px";
    t.style.top =
      Math.max(
        6,
        Math.min(e.clientY + 14, window.innerHeight - t.offsetHeight - 8)
      ) + "px";
  });
  $("spiral").addEventListener(
    "pointerleave",
    () => ($("tooltip").hidden = true)
  );
  $("spiral").addEventListener("click", (e) => {
    const mark = e.target.closest(".cell");
    if (mark) selectDay(Number(mark.dataset.index));
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (!$("export-options").hidden) {
        $("export-options").hidden = true;
        $("export").setAttribute("aria-expanded", "false");
        $("export").focus();
      }
      $("tooltip").hidden = true;
      $("selected").replaceChildren();
      state.pinned = false;
    }
  });
  $("export").addEventListener("click", () => {
    const panel = $("export-options");
    panel.hidden = !panel.hidden;
    $("export").setAttribute("aria-expanded", String(!panel.hidden));
    if (!panel.hidden) $("export-format").focus();
  });
  $("export-save").addEventListener("click", async () => {
    const button = $("export-save");
    button.disabled = true;
    $("export-status").textContent = "Preparing image...";
    try {
      const scope = $("export-scope").value;
      const format = $("export-format").value;
      await window.SF_EXPORT.download({
        scope,
        format,
        filename: `sf-${scope}-${state.mode}-${end}`,
        rampColors:
          isNumeric() && state.scheme === "continuous"
            ? d3
                .range(101)
                .map((i) => scale.rawColor(scale.position.invert(i / 100)))
            : [],
      });
      $("export-status").textContent = "Downloaded.";
    } catch (error) {
      $("export-status").textContent = "Download failed. Please try again.";
      console.error(error);
    } finally {
      button.disabled = false;
    }
  });
  render();
  if (typeof ResizeObserver !== "undefined") {
    const stage = document.querySelector(".stage");
    new ResizeObserver(() => {
      placeSummary();
      drawLabels();
    }).observe(stage);
  }
  const latest = dates.findLastIndex((_, i) =>
    Number.isFinite(active().values[i])
  );
  selectDay(latest >= 0 ? latest : n - 1, false);
  window.SF_DEBUG = {
    state,
    dates,
    datasets,
    getScale: () => scale,
    getGeometry: () => geo,
    getDisplay: () => displayValues,
    render,
  };
})();
