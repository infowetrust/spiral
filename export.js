/* Vector export of this page's visible layout, without foreignObject or remote assets. */
(() => {
  "use strict";
  const NS = "http://www.w3.org/2000/svg";
  const background = "#fcfcfa";
  const graphicStyles = [
    "fill",
    "stroke",
    "stroke-width",
    "stroke-dasharray",
    "stroke-linejoin",
    "stroke-linecap",
    "font-family",
    "font-size",
    "font-weight",
    "font-style",
    "paint-order",
    "text-anchor",
    "opacity",
  ];
  const make = (tag, attributes, parent, text) => {
    const node = document.createElementNS(NS, tag);
    Object.entries(attributes).forEach(([key, value]) =>
      node.setAttribute(key, value)
    );
    if (text !== undefined) node.textContent = text;
    parent?.append(node);
    return node;
  };

  function capture(scope, rampColors) {
    const target = document.querySelector(
      scope === "wheel" ? ".stage" : "main"
    );
    const origin = target.getBoundingClientRect();
    const width = Math.ceil(origin.width);
    const height = scope === "wheel" ? width : Math.ceil(origin.height);
    const svg = make("svg", {
      xmlns: NS,
      width,
      height,
      viewBox: `0 0 ${width} ${height}`,
    });
    const defs = make("defs", {}, svg);
    make("rect", { width, height, fill: background }, svg);
    const context = document.createElement("canvas").getContext("2d");
    let serial = 0;
    const box = (node) => {
      const r = node.getBoundingClientRect();
      return {
        x: r.left - origin.left,
        y: r.top - origin.top,
        width: r.width,
        height: r.height,
      };
    };
    const text = (value, r, style, parent = svg) => {
      context.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      const metrics = context.measureText(value);
      const ascent =
        metrics.fontBoundingBoxAscent ?? parseFloat(style.fontSize) * 0.85;
      const descent =
        metrics.fontBoundingBoxDescent ?? parseFloat(style.fontSize) * 0.15;
      make(
        "text",
        {
          x: r.x,
          y:
            r.y +
            ascent +
            (r.height === undefined ? 0 : (r.height - ascent - descent) / 2),
          fill: style.color,
          "font-family": style.fontFamily,
          "font-size": style.fontSize,
          "font-weight": style.fontWeight,
          "font-style": style.fontStyle,
          "xml:space": "preserve",
        },
        parent,
        value
      );
    };
    const textNode = (node) => {
      const style = getComputedStyle(node.parentElement);
      const range = document.createRange();
      let line;
      // Range measurements preserve the browser's actual wrapping and spacing.
      for (let i = 0; i < node.length; i++) {
        range.setStart(node, i);
        range.setEnd(node, i + 1);
        const r = range.getBoundingClientRect();
        if (!r.width || !r.height) continue;
        if (
          line &&
          Math.abs(line.top - r.top) < 0.5 &&
          Math.abs(line.right - r.left) < 2
        ) {
          line.value += node.textContent[i];
          line.right = r.right;
        } else {
          if (line) text(line.value, line, style);
          line = {
            value: node.textContent[i],
            top: r.top,
            right: r.right,
            x: r.left - origin.left,
            y: r.top - origin.top,
          };
        }
      }
      if (line) text(line.value, line, style);
    };
    const visit = (node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        if (node.textContent.trim()) textNode(node);
        return;
      }
      if (
        node.nodeType !== Node.ELEMENT_NODE ||
        node.matches("#export, #export-options, .tooltip, noscript, script")
      )
        return;
      const style = getComputedStyle(node);
      if (style.display === "none" || style.visibility === "hidden") return;
      const r = box(node);
      if (node.tagName.toLowerCase() === "svg") {
        const copy = node.cloneNode(true);
        const originals = [node, ...node.querySelectorAll("*")];
        const copies = [copy, ...copy.querySelectorAll("*")];
        originals.forEach((original, i) => {
          const css = getComputedStyle(original);
          copies[i].removeAttribute("class");
          copies[i].removeAttribute("style");
          graphicStyles.forEach((key) => {
            const value = css
              .getPropertyValue(key)
              .replace(/url\(["']?[^"')]*#([^"')]+)["']?\)/g, "url(#$1)");
            copies[i].style.setProperty(key, value);
          });
        });
        copy.setAttribute("x", r.x);
        copy.setAttribute("y", r.y);
        copy.setAttribute("width", r.width);
        copy.setAttribute("height", r.height);
        svg.append(copy);
        return;
      }
      if (r.width && r.height) {
        let fill = style.backgroundColor;
        if (node.matches(".ramp") && rampColors.length) {
          const id = `export-ramp-${serial++}`;
          const gradient = make("linearGradient", { id }, defs);
          rampColors.forEach((color, i) =>
            make(
              "stop",
              {
                offset: `${(100 * i) / (rampColors.length - 1)}%`,
                "stop-color": color,
              },
              gradient
            )
          );
          fill = `url(#${id})`;
        } else if (
          node.matches(".swatch") &&
          style.backgroundImage !== "none"
        ) {
          const id = `export-pattern-${serial++}`;
          const colors = style.backgroundImage.match(/rgba?\([^)]+\)/g) || [
            "#d9ddda",
            background,
          ];
          const pattern = make(
            "pattern",
            {
              id,
              width: 8,
              height: 8,
              patternUnits: "userSpaceOnUse",
              patternTransform: "rotate(45)",
            },
            defs
          );
          make("rect", { width: 8, height: 8, fill: colors.at(-1) }, pattern);
          make(
            "rect",
            {
              width: node.matches(".missing") ? 1 : 4,
              height: 8,
              fill: colors[0],
            },
            pattern
          );
          fill = `url(#${id})`;
        }
        if (fill !== "rgba(0, 0, 0, 0)" && fill !== "transparent")
          make(
            "rect",
            { ...r, rx: parseFloat(style.borderRadius) || 0, fill },
            svg
          );
        ["Top", "Right", "Bottom", "Left"].forEach((side, i) => {
          const weight = parseFloat(style[`border${side}Width`]);
          if (!weight || style[`border${side}Style`] === "none") return;
          const points = [
            [r.x, r.y, r.x + r.width, r.y],
            [r.x + r.width, r.y, r.x + r.width, r.y + r.height],
            [r.x, r.y + r.height, r.x + r.width, r.y + r.height],
            [r.x, r.y, r.x, r.y + r.height],
          ][i];
          make(
            "line",
            {
              x1: points[0],
              y1: points[1],
              x2: points[2],
              y2: points[3],
              stroke: style[`border${side}Color`],
              "stroke-width": weight,
            },
            svg
          );
        });
        if (node.matches(".swatch.zero"))
          make(
            "rect",
            { ...r, fill: "none", stroke: "#b4b9b7", "stroke-width": 1 },
            svg
          );
        if (node.matches(".ramp-tick")) {
          const parent = box(node.parentElement);
          const x =
            parent.x + (parent.width * parseFloat(node.style.left)) / 100;
          make(
            "line",
            {
              x1: x,
              x2: x,
              y1: parent.y,
              y2: parent.y + 4,
              stroke: style.color,
            },
            svg
          );
        }
        if (node.matches("select, input[type=date]")) {
          const value =
            node.tagName === "SELECT"
              ? node.selectedOptions[0].textContent
              : node.value;
          text(
            value,
            {
              x:
                r.x +
                parseFloat(style.borderLeftWidth) +
                parseFloat(style.paddingLeft),
              y: r.y,
              height: r.height,
            },
            style
          );
          if (node.tagName === "SELECT")
            make(
              "path",
              {
                d: `M${r.x + r.width - 17},${r.y + r.height / 2 - 2}l4,4l4,-4`,
                fill: "none",
                stroke: style.color,
                "stroke-width": 1.5,
              },
              svg
            );
          return;
        }
        if (node.matches("input[type=checkbox]")) {
          make(
            "rect",
            {
              ...r,
              rx: 2,
              fill: node.checked ? "#23635b" : background,
              stroke: "#646b6c",
            },
            svg
          );
          if (node.checked)
            make(
              "path",
              {
                d: `M${r.x + 3},${r.y + 8}l3,3l7,-8`,
                fill: "none",
                stroke: "white",
                "stroke-width": 2,
              },
              svg
            );
          return;
        }
        if (node.tagName === "SUMMARY")
          make(
            "path",
            {
              d: node.parentElement.open
                ? `M${r.x},${r.y + 8}h8l-4,6z`
                : `M${r.x},${r.y + 7}l6,4l-6,4z`,
              fill: style.color,
            },
            svg
          );
      }
      if (node.tagName === "DETAILS" && !node.open) {
        visit(node.querySelector("summary"));
        return;
      }
      node.childNodes.forEach(visit);
    };
    visit(target);
    return { svg, width, height };
  }

  async function download({ scope, format, filename, rampColors }) {
    await document.fonts.ready;
    const { svg, width, height } = capture(scope, rampColors);
    const source = new XMLSerializer().serializeToString(svg);
    let blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
    if (format === "png") {
      const url = URL.createObjectURL(blob);
      try {
        const image = new Image();
        image.src = url;
        await image.decode();
        const canvas = document.createElement("canvas");
        const factor = scope === "wheel" ? 2000 / width : 2;
        canvas.width = Math.round(width * factor);
        canvas.height = Math.round(height * factor);
        canvas
          .getContext("2d")
          .drawImage(image, 0, 0, canvas.width, canvas.height);
        blob = await new Promise((resolve) =>
          canvas.toBlob(resolve, "image/png")
        );
        if (!blob) throw new Error("PNG encoding failed");
      } finally {
        URL.revokeObjectURL(url);
      }
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filename}.${format}`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  window.SF_EXPORT = { download };
})();
