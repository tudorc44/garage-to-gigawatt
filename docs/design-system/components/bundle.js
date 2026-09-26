/* @ds-bundle: {"format":4,"namespace":"G2G","components":[{"name":"Button"},{"name":"Segmented"},{"name":"Stat"},{"name":"Delta"},{"name":"KpiTile"},{"name":"Pips"},{"name":"ActionRow"},{"name":"HeatMeter"},{"name":"SiteCard"},{"name":"LtvGauge"},{"name":"LadderStep"},{"name":"LeagueTable"},{"name":"Sparkline"},{"name":"WeekTimeline"},{"name":"EventCard"},{"name":"Toast"},{"name":"NewsTicker"},{"name":"Tag"},{"name":"MergeOption"},{"name":"Logo"},{"name":"Mark"},{"name":"Icon"}]} */
(function () {
  var React = window.React;
  var h = React.createElement;
  var MINUS = "−";

  function cx() {
    var out = [];
    for (var i = 0; i < arguments.length; i++) { if (arguments[i]) out.push(arguments[i]); }
    return out.join(" ");
  }

  /* ---------- number formatting (the spec in README § Numbers) ---------- */
  function trim(n, dp) {
    var s = n.toFixed(dp);
    return s;
  }
  function money(v, opts) {
    opts = opts || {};
    var neg = v < 0, a = Math.abs(v), s;
    if (opts.exact) {
      s = "$" + a.toLocaleString("en-US", { minimumFractionDigits: opts.dp || 0, maximumFractionDigits: opts.dp || 0 });
    } else if (a >= 1e9) s = "$" + trim(a / 1e9, 1) + "B";
    else if (a >= 1e6) s = "$" + trim(a / 1e6, 1) + "M";
    else if (a >= 1e4) s = "$" + trim(a / 1e3, 1) + "K";
    else if (a >= 1e3) s = "$" + a.toLocaleString("en-US", { maximumFractionDigits: 0 });
    else if (a < 10 && a !== Math.round(a)) s = "$" + a.toFixed(2);
    else s = "$" + Math.round(a);
    return (neg ? MINUS : "") + s;
  }
  function crypto(v, coin) {
    var a = Math.abs(v), dp = a >= 100 ? 0 : a >= 1 ? 1 : 4;
    return (v < 0 ? MINUS : "") + a.toFixed(dp).replace(/\.0$/, "") + " " + coin;
  }
  function hash(v, unit) {
    var ladder = unit === "MH" ? ["MH/s", "GH/s", "TH/s"] : ["TH/s", "PH/s", "EH/s"];
    var i = 0, a = v;
    while (a >= 1000 && i < ladder.length - 1) { a = a / 1000; i++; }
    var dp = a >= 100 ? 0 : a >= 10 ? 1 : a >= 1 ? 2 : 4;
    var t = a.toFixed(dp); if (t.indexOf(".") >= 0) t = t.replace(/0+$/, "").replace(/\.$/, ""); return t + " " + ladder[i];
  }
  function power(kw) {
    if (kw >= 1000) return (kw / 1000).toFixed(kw >= 10000 ? 0 : 1).replace(/\.0$/, "") + " MW";
    return (kw >= 10 || kw % 1 === 0 ? Math.round(kw) : kw.toFixed(1)) + " kW";
  }
  function cents(usdPerKwh) { return (usdPerKwh * 100).toFixed(usdPerKwh * 100 % 1 ? 1 : 0) + "¢/kWh"; }
  function pct(v, dp) { return (v < 0 ? MINUS : "") + Math.abs(v * 100).toFixed(dp || 0) + "%"; }
  function delta(v, kind, opts) {
    var arrow = v > 0 ? "▲" : v < 0 ? "▼" : "=";
    var body = kind === "money" ? money(Math.abs(v), opts) : kind === "pct" ? pct(Math.abs(v), opts && opts.dp) : String(Math.abs(v));
    return v === 0 ? "= flat" : arrow + body;
  }
  function signed(v, opts) { return (v > 0 ? "+" : v < 0 ? MINUS : "") + money(Math.abs(v), opts); }
  function quarter(q, week) { var m = /^(\d{4})Q(\d)$/.exec(q); var s = m ? "Q" + m[2] + " " + m[1] : q; return week ? s + " · week " + week : s; }
  var fmt = { money: money, crypto: crypto, hash: hash, power: power, cents: cents, pct: pct, delta: delta, signed: signed, quarter: quarter };

  /* ---------- components ---------- */
  function Button(p) {
    var v = p.variant || "secondary";
    var disabled = !!p.disabledReason || p.disabled;
    return h("button", {
      type: "button", className: cx("g-btn", "g-btn-" + v, p.size === "l" && "g-btn-l", p.className),
      disabled: disabled, title: p.disabledReason || undefined, "aria-label": p.ariaLabel, onClick: p.onClick
    }, p.children, p.disabledReason ? h("span", { className: "g-btn-reason" }, p.disabledReason) : null);
  }

  function Segmented(p) {
    var opts = p.options || [];
    return h("div", { className: "g-seg", role: "group", "aria-label": p.label },
      opts.map(function (o) {
        var on = o === p.value;
        return h("button", { key: o, type: "button", className: cx("g-seg-item", on && "is-on"), "aria-pressed": on, onClick: p.onChange ? function () { p.onChange(o); } : undefined }, o);
      }));
  }

  function Delta(p) {
    var v = p.value || 0;
    var tone = p.invert ? (v > 0 ? "loss" : v < 0 ? "gain" : "flat") : (v > 0 ? "gain" : v < 0 ? "loss" : "flat");
    return h("span", { className: cx("g-delta", "g-" + tone) }, delta(v, p.kind || "pct", p) + (p.suffix ? " " + p.suffix : ""));
  }

  function Stat(p) {
    return h("div", { className: "g-stat" },
      h("div", { className: "g-label" }, p.label),
      h("div", { className: cx("g-num", p.strong && "g-strong") }, p.value, p.delta != null ? h("span", null, " ", h(Delta, { value: p.delta, kind: "pct" })) : null));
  }

  function KpiTile(p) {
    return h("div", { className: "g-panel g-kpi" },
      h("div", { className: "g-label" }, p.label),
      h("div", { className: "g-num-kpi" }, p.value),
      p.sub ? h("div", { className: cx("g-num-s", p.subTone ? "g-" + p.subTone : "g-muted") }, p.sub) : null);
  }

  function Pips(p) {
    var total = p.total || p.cost || 0, filled = p.filled != null ? p.filled : total;
    var dots = [];
    for (var i = 0; i < total; i++) dots.push(h("span", { key: i, className: cx("g-pip", i < filled && "is-on", p.unaffordable && "is-short") }));
    return h("span", { className: "g-pips", role: "img", "aria-label": p.cost ? "Costs " + p.cost + " Bandwidth" : filled + " of " + total + " Bandwidth left" }, dots);
  }

  function ActionRow(p) {
    var dis = !!p.disabledReason;
    return h("div", { className: cx("g-action", dis && "is-disabled") },
      h("span", { className: "g-action-label" }, p.label),
      dis ? h("span", { className: "g-num-s" }, p.disabledReason)
        : h(React.Fragment, null,
          p.cost ? h(Pips, { cost: p.cost, unaffordable: p.unaffordable }) : h("span", { className: "g-num-s g-muted" }, "free"),
          p.price ? h("span", { className: "g-num-s g-action-price" }, p.price) : null));
  }

  function heatStep(v) { return v >= 90 ? 5 : v >= 70 ? 4 : v >= 50 ? 3 : v >= 30 ? 2 : 1; }
  function HeatMeter(p) {
    var v = Math.max(0, Math.min(100, p.value || 0)), s = heatStep(v);
    return h("div", { className: "g-heat", role: "meter", "aria-valuemin": 0, "aria-valuemax": 100, "aria-valuenow": v, "aria-label": "Heat " + v },
      p.hideLabel ? null : h("div", { className: "g-label" }, "Heat " + v),
      h("div", { className: "g-heat-track" },
        h("div", { className: cx("g-heat-fill", "g-heat-" + s), style: { width: v + "%" } }),
        [30, 50, 70, 90].map(function (m) { return h("span", { key: m, className: cx("g-heat-mark", m >= 70 && "is-danger"), style: { left: m + "%" } }); })));
  }

  function SiteCard(p) {
    var pctUsed = p.capacity ? Math.min(100, (p.used / p.capacity) * 100) : 0;
    return h("div", { className: "g-panel g-site" },
      h("div", { className: "g-row-between" }, h("span", { className: "g-site-name" }, p.name), h("span", { className: "g-num-s" }, p.price)),
      h("div", { className: "g-row-between" }, h("span", { className: "g-num-s" }, power(p.used) + " / " + power(p.capacity)), p.tag ? h(Tag, { tone: p.tagTone || "tape" }, p.tag) : null),
      h("div", { className: "g-cap-track" }, h("div", { className: "g-cap-fill", style: { width: pctUsed + "%" } })),
      h(HeatMeter, { value: p.heat }));
  }

  function LtvGauge(p) {
    var v = Math.max(0, Math.min(1, p.ltv || 0));
    var zone = v >= 0.8 ? "Liquidation" : v >= 0.7 ? "Margin call" : v > 0.5 ? "Warning zone" : "Healthy";
    return h("div", { className: "g-ltv" },
      h("div", { className: "g-row-between" }, h("span", { className: "g-label" }, p.label || "Loan-to-value"), h("span", { className: cx("g-num", v > 0.5 && (v >= 0.7 ? "g-loss" : "g-warn")) }, pct(v) + " · " + zone)),
      h("div", { className: "g-ltv-track", role: "meter", "aria-valuenow": Math.round(v * 100), "aria-valuemin": 0, "aria-valuemax": 100, "aria-label": "Loan-to-value" },
        h("div", { className: cx("g-ltv-fill", v >= 0.7 ? "is-danger" : v > 0.5 ? "is-warn" : null), style: { width: v * 100 + "%" } }),
        h("span", { className: "g-ltv-mark", style: { left: "50%" } }),
        h("span", { className: "g-ltv-mark is-danger", style: { left: "70%" } }),
        h("span", { className: "g-ltv-mark is-danger", style: { left: "80%" } })),
      h("div", { className: "g-ltv-scale g-num-s" }, h("span", { style: { left: "50%" } }, "50 max"), h("span", { style: { left: "70%" } }, "70 call"), h("span", { style: { left: "80%" } }, "80 liq.")));
  }

  function LadderStep(p) {
    var st = p.state || "available";
    return h("div", { className: cx("g-step", "is-" + st) },
      h("div", { className: "g-step-title" }, p.title, st === "done" ? " ✓" : ""),
      p.detail ? h("div", { className: "g-num-s" }, p.detail) : null,
      p.note ? h("div", { className: "g-step-note" }, p.note) : null);
  }

  function Mono(p) { return h("span", { className: cx("g-mono", p.you && "is-you"), "aria-hidden": "true" }, p.code); }

  function LeagueTable(p) {
    var rows = p.rows || [];
    return h("table", { className: "g-table" },
      h("thead", null, h("tr", null, ["#", "Company", "Hashrate", "Value", "Δ"].map(function (c) { return h("th", { key: c, scope: "col" }, c); }))),
      h("tbody", null, rows.map(function (r) {
        return h("tr", { key: r.name, className: r.you ? "is-you" : undefined },
          h("td", { className: "g-num" }, r.rank),
          h("td", null, h(Mono, { code: r.code, you: r.you }), r.name),
          h("td", { className: "g-num g-right" }, r.hashrate),
          h("td", { className: "g-num g-right" }, r.value),
          h("td", { className: "g-num g-right" }, r.delta ? h(Delta, { value: r.delta, kind: "count" }) : "–"));
      })));
  }

  function Sparkline(p) {
    var pts = p.points || [], w = p.width || 160, ht = p.height || 44, pad = 3;
    var min = Math.min.apply(null, pts), max = Math.max.apply(null, pts), rng = max - min || 1;
    var d = pts.map(function (v, i) { return (i * (w / Math.max(1, pts.length - 1))).toFixed(1) + "," + (pad + (ht - 2 * pad) * (1 - (v - min) / rng)).toFixed(1); }).join(" ");
    var last = d.split(" ").pop().split(",");
    var series = p.series || "btc";
    return h("figure", { className: "g-spark" },
      h("figcaption", { className: "g-label" }, p.label || series.toUpperCase()),
      h("svg", { width: w, height: ht, viewBox: "0 0 " + w + " " + ht, role: "img", "aria-label": (p.label || series) + " trend" },
        h("polyline", { points: d, className: "g-spark-line g-series-" + series, fill: "none" }),
        h("circle", { cx: last[0], cy: last[1], r: 2.8, className: "g-spark-end g-series-" + series })));
  }

  function WeekTimeline(p) {
    var cur = p.current || 1, alerts = p.interrupts || [], cells = [];
    for (var i = 1; i <= 13; i++) {
      var st = i < cur ? "done" : i === cur ? "now" : "future";
      cells.push(h("span", { key: i, className: cx("g-week", "is-" + st, alerts.indexOf(i) >= 0 && "has-alert"), "aria-current": i === cur ? "step" : undefined }, i));
    }
    return h("div", { className: "g-weeks", role: "list", "aria-label": "Weeks of the quarter" }, cells);
  }

  function EventCard(p) {
    return h("article", { className: "g-event" },
      h("div", { className: "g-row-between" }, h("span", { className: "g-label" }, p.eyebrow), p.stamp ? h(Tag, { tone: "tape" }, p.stamp) : null),
      h("div", { className: "g-event-art" }, p.illustration || "Illustration"),
      h("h2", { className: "card-title g-event-title" }, p.title),
      h("p", { className: "g-event-body" }, p.body),
      h("div", { className: "g-event-choices" }, (p.choices || []).map(function (c, i) {
        return h("button", { key: i, type: "button", className: cx("g-choice", c.isDefault && "is-default") },
          h("span", { className: "g-row-between" }, h("span", { className: "g-choice-label" }, c.label), c.isDefault ? h("span", { className: "g-default" }, "Default") : null),
          h("span", { className: "g-num-s g-choice-effect" }, c.effect));
      })),
      p.source ? h("div", { className: "g-event-source" }, p.source) : null);
  }

  function Toast(p) {
    return h("div", { className: "g-toast", role: "status" },
      h("div", { className: "g-label" }, p.eyebrow),
      h("div", { className: "g-toast-title" }, p.title),
      p.detail ? h("div", { className: "g-num-s g-muted" }, p.detail) : null);
  }

  function NewsTicker(p) {
    return h("div", { className: "g-panel g-news" }, h("span", { className: "g-news-mast" }, p.masthead || "The Ledger"), h("span", { className: "g-news-text" }, p.text));
  }

  function Tag(p) { return h("span", { className: cx("g-tag", "g-tag-" + (p.tone || "neutral")) }, p.children); }

  function MergeOption(p) {
    return h("div", { className: cx("g-merge", p.selected && "is-selected") },
      h("div", { className: "g-row-between" }, h("span", { className: "g-label" }, "Option " + p.letter), p.hint ? h(Tag, { tone: "tape" }, p.hint) : null),
      h("h3", { className: "g-merge-title" }, p.title),
      h("p", { className: "g-merge-text" }, p.text),
      h("div", { className: "g-merge-preview" }, h("b", null, "Act II: "), p.preview),
      h(Button, { variant: p.selected ? "primary" : "secondary" }, p.selected ? "Chosen" : "Choose"));
  }

  function Logo(p) {
    var size = p.size || 64, layout = p.layout || "stacked", tone = p.tone || "black";
    var lines = layout === "horizontal" ? ["Garage to Gigawatt"] : ["Garage to", "Gigawatt"];
    return h("div", { className: cx("g-logo", "is-" + layout, "is-" + tone), style: { fontSize: size + "px" }, role: "img", "aria-label": "Garage to Gigawatt" },
      lines.map(function (t) { return h("span", { key: t, className: "g-logo-line" }, t); }),
      h("span", { className: "g-logo-stripe" }));
  }

  var markSeq = 0;
  var MARK_G = "M10 6H54V18H22V40H42V34H33V26H54V52H10Z", MARK_BOLT = "M20 2 8 30h9L11 56l17-30h-9l7-24z";
  var MARK_G_S = "M8 5H56V18H21V43H43V35H33V27H56V56H8Z", MARK_BOLT_S = "M20 1 6 32h10L10 60l18-33h-10l8-26z";
  function Mark(p) {
    var size = p.size || 64, small = size <= 32, band = p.band != null ? p.band : !small;
    var id = "g2g-band-" + (++markSeq), kids = [
      h("rect", { key: "bg", width: 64, height: 64, fill: "var(--brand-yellow)" }),
      h("path", { key: "g", d: small ? MARK_G_S : MARK_G, fill: "var(--brand-black)" }),
      h("path", { key: "b", d: small ? MARK_BOLT_S : MARK_BOLT, fill: "var(--brand-yellow)" })];
    if (band && !small) {
      var bars = [];
      for (var i = -4; i < 12; i++) { var x = i * 12; bars.push(h("path", { key: i, d: "M" + x + " 64L" + (x + 8) + " 56h6L" + (x + 6) + " 64z", fill: "var(--brand-yellow)" })); }
      kids.push(h("clipPath", { key: "cp", id: id }, h("rect", { x: 0, y: 56, width: 64, height: 8 })));
      kids.push(h("g", { key: "band", clipPath: "url(#" + id + ")" }, h("rect", { x: 0, y: 56, width: 64, height: 8, fill: "var(--brand-black)" }), bars));
    }
    return h("svg", { className: "g-mark", width: size, height: size, viewBox: "0 0 64 64", role: "img", "aria-label": p.label || "Garage to Gigawatt mark" }, kids);
  }

  /* ---------- icons: 20px grid, 1.5px stroke, currentColor ---------- */
  var ICONS = {"cash":"<rect x=\"2.5\" y=\"5.5\" width=\"15\" height=\"9\" rx=\"1.5\"/><circle cx=\"10\" cy=\"10\" r=\"2.2\"/><path d=\"M5 8v4M15 8v4\"/>","treasury":"<path d=\"M3 8.5 10 4l7 4.5\"/><path d=\"M4.5 9v6M8 9v6M12 9v6M15.5 9v6\"/><path d=\"M3 16h14\"/>","bandwidth":"<circle cx=\"5\" cy=\"10\" r=\"2\"/><circle cx=\"10\" cy=\"10\" r=\"2\"/><circle cx=\"15\" cy=\"10\" r=\"2\"/>","btc":"<circle cx=\"10\" cy=\"10\" r=\"7.5\"/><path d=\"M8 6.5v7M8 6.5h3a1.7 1.7 0 0 1 0 3.4H8M8 9.9h3.4a1.8 1.8 0 0 1 0 3.6H8M9.3 5.2v1.3M9.3 13.5v1.3\"/>","eth":"<path d=\"M10 2.5 5 10.2 10 13l5-2.8z\"/><path d=\"M5 11.6 10 17.5l5-5.9L10 14.4z\"/>","hashrate":"<path d=\"M2.5 14.5h3l2-7 3 9 2-5h5\"/>","power":"<path d=\"M11 2.5 5 11h4.5L8.5 17.5 15 9h-4.5z\"/>","heat":"<path d=\"M10 17.5c3 0 5-2 5-4.8 0-3.2-2.6-4.4-3.3-7.7C9.8 6.3 9 8 9.2 9.6 7.8 9 7.3 7.6 7.3 7.6 5.9 9 5 10.6 5 12.7c0 2.8 2 4.8 5 4.8z\"/>","site":"<path d=\"M2.5 16.5h15\"/><path d=\"M3.5 16.5V8l4-2.5V8l4-2.5V8l4-2.5v11\"/><path d=\"M6 13h1.5M10 13h1.5M14 13h1\"/>","machine":"<rect x=\"3\" y=\"5\" width=\"14\" height=\"10\" rx=\"1\"/><circle cx=\"7\" cy=\"10\" r=\"2.3\"/><circle cx=\"13\" cy=\"10\" r=\"2.3\"/>","loan":"<path d=\"M4 3.5h8l4 4v9H4z\"/><path d=\"M12 3.5v4h4\"/><path d=\"M7 11h6M7 14h4\"/>","rival":"<circle cx=\"7\" cy=\"7.5\" r=\"2.5\"/><circle cx=\"13.5\" cy=\"7.5\" r=\"2.5\"/><path d=\"M2.5 16c.6-2.5 2.3-4 4.5-4s3.9 1.5 4.5 4M9.5 13.2c.9-.8 2.1-1.2 4-1.2 2.2 0 3.9 1.5 4 4\"/>","news":"<rect x=\"2.5\" y=\"4\" width=\"12\" height=\"12\" rx=\"1\"/><path d=\"M14.5 7h3v7.5a1.5 1.5 0 0 1-3 0\"/><path d=\"M5 7h7M5 10h7M5 13h4\"/>","settings":"<circle cx=\"10\" cy=\"10\" r=\"2.5\"/><path d=\"M10 2.5v2M10 15.5v2M2.5 10h2M15.5 10h2M4.7 4.7l1.4 1.4M13.9 13.9l1.4 1.4M4.7 15.3l1.4-1.4M13.9 6.1l1.4-1.4\"/>","pause":"<path d=\"M7.5 5v10M12.5 5v10\"/>","speed":"<path d=\"M3.5 5l6 5-6 5zM10.5 5l6 5-6 5z\"/>","skip":"<path d=\"M4.5 5l7 5-7 5zM15.5 5v10\"/>","warning":"<path d=\"M10 3 2.5 16.5h15z\"/><path d=\"M10 8v4M10 14.3v.2\"/>","dashboard":"<rect x=\"3\" y=\"3\" width=\"6\" height=\"6\" rx=\"1\"/><rect x=\"11\" y=\"3\" width=\"6\" height=\"4\" rx=\"1\"/><rect x=\"11\" y=\"9\" width=\"6\" height=\"8\" rx=\"1\"/><rect x=\"3\" y=\"11\" width=\"6\" height=\"6\" rx=\"1\"/>","fleet":"<rect x=\"3.5\" y=\"3\" width=\"13\" height=\"6\" rx=\"1\"/><rect x=\"3.5\" y=\"11\" width=\"13\" height=\"6\" rx=\"1\"/><circle cx=\"6\" cy=\"6\" r=\".9\" fill=\"currentColor\" stroke=\"none\"/><circle cx=\"6\" cy=\"14\" r=\".9\" fill=\"currentColor\" stroke=\"none\"/><path d=\"M9 6h5M9 14h5\"/>","capital":"<ellipse cx=\"10\" cy=\"5\" rx=\"6\" ry=\"2\"/><path d=\"M4 5v3.5c0 1.1 2.7 2 6 2s6-.9 6-2V5\"/><path d=\"M4 8.5V12c0 1.1 2.7 2 6 2s6-.9 6-2V8.5\"/><path d=\"M4 12v3.5c0 1.1 2.7 2 6 2s6-.9 6-2V12\"/>","people":"<rect x=\"7.5\" y=\"2.5\" width=\"5\" height=\"4\" rx=\"1\"/><rect x=\"2.5\" y=\"13.5\" width=\"5\" height=\"4\" rx=\"1\"/><rect x=\"12.5\" y=\"13.5\" width=\"5\" height=\"4\" rx=\"1\"/><path d=\"M10 6.5V10M5 13.5V10h10v3.5\"/>","league":"<path d=\"M2.5 17h15\"/><path d=\"M7 17V8h6v9\"/><path d=\"M2.5 17v-5H7M13 13.5h4.5V17\"/><path d=\"M10 5.5V3\"/>","log":"<circle cx=\"4.5\" cy=\"6\" r=\".9\" fill=\"currentColor\" stroke=\"none\"/><circle cx=\"4.5\" cy=\"10\" r=\".9\" fill=\"currentColor\" stroke=\"none\"/><circle cx=\"4.5\" cy=\"14\" r=\".9\" fill=\"currentColor\" stroke=\"none\"/><path d=\"M8 6h8.5M8 10h8.5M8 14h5.5\"/>","gpu-rig":"<rect x=\"2.5\" y=\"5\" width=\"15\" height=\"10\" rx=\"1\"/><circle cx=\"6\" cy=\"10\" r=\"1.8\"/><circle cx=\"10\" cy=\"10\" r=\"1.8\"/><circle cx=\"14\" cy=\"10\" r=\"1.8\"/><path d=\"M4.5 15v2M15.5 15v2\"/>","asic":"<rect x=\"4\" y=\"3\" width=\"12\" height=\"14\" rx=\"1\"/><circle cx=\"10\" cy=\"8.5\" r=\"3.5\"/><circle cx=\"10\" cy=\"8.5\" r=\".9\" fill=\"currentColor\" stroke=\"none\"/><path d=\"M7 14h6\"/>","garage":"<path d=\"M2.5 9 10 3.5 17.5 9\"/><path d=\"M4 8v8.5h12V8\"/><path d=\"M6.5 16.5v-6h7v6M6.5 12.5h7M6.5 14.5h7\"/>","small-unit":"<path d=\"M3 16.5V6.5h14v10\"/><path d=\"M2 16.5h16\"/><path d=\"M8 16.5v-5h4v5\"/><path d=\"M5 8.5h3\"/>","warehouse":"<path d=\"M2.5 16.5V9l3.75-3v3l3.75-3v3l3.75-3v3l3.75-3v10.5\"/><path d=\"M1.5 16.5h17\"/><path d=\"M5 16.5v-3h3v3M12 16.5v-3h3v3\"/>","own-site":"<rect x=\"7.5\" y=\"5\" width=\"5\" height=\"6.5\" rx=\".5\"/><path d=\"M8.8 5V3.3M11.2 5V3.3\"/><path d=\"M2.5 17h15\"/><path d=\"M3.5 17v-3.5M7 17v-3.5M13 17v-3.5M16.5 17v-3.5M3.5 14.5h13\"/>","texas-site":"<path d=\"M4.5 17.5 7 3.5l2.5 14\"/><path d=\"M4.5 6.5h5M5.4 12.5h3.2M6 9.5h2\"/><path d=\"M11.5 17.5v-5h6v5\"/><path d=\"M2.5 17.5h15.5\"/>","buy":"<path d=\"M10 2.5h7.5V10l-8 8-7-7z\"/><circle cx=\"14\" cy=\"6\" r=\"1\"/><path d=\"M6.5 10.5h4M8.5 8.5v4\"/>","sell":"<path d=\"M10 2.5h7.5V10l-8 8-7-7z\"/><circle cx=\"14\" cy=\"6\" r=\"1\"/><path d=\"M6.5 10.5h4\"/>","scout":"<circle cx=\"5.8\" cy=\"13\" r=\"3.2\"/><circle cx=\"14.2\" cy=\"13\" r=\"3.2\"/><path d=\"M3.5 10.8 5.5 5h2.5l1 5.5M16.5 10.8 14.5 5H12l-1 5.5M9 11.5h2\"/>","negotiate":"<path d=\"M2.5 7h10M9.5 4l3 3-3 3\"/><path d=\"M17.5 13h-10M10.5 10l-3 3 3 3\"/>","pitch":"<rect x=\"3\" y=\"3\" width=\"14\" height=\"9\" rx=\"1\"/><path d=\"M5.5 10l3-3 2 2 4-3.5\"/><path d=\"M7 12l-2 5.5M13 12l2 5.5M10 12v3\"/>","hire":"<circle cx=\"8\" cy=\"7\" r=\"3\"/><path d=\"M2.5 17c.5-3 2.7-5 5.5-5s5 2 5.5 5\"/><path d=\"M15.5 5v5M13 7.5h5\"/>","outreach":"<path d=\"M3 4.5h14v9H9l-4 3v-3H3z\"/><circle cx=\"7\" cy=\"9\" r=\".9\" fill=\"currentColor\" stroke=\"none\"/><circle cx=\"10\" cy=\"9\" r=\".9\" fill=\"currentColor\" stroke=\"none\"/><circle cx=\"13\" cy=\"9\" r=\".9\" fill=\"currentColor\" stroke=\"none\"/>","read-market":"<path d=\"M2.5 13.5l3-3.5 2.5 2 2.5-3\"/><circle cx=\"13\" cy=\"11\" r=\"3.5\"/><path d=\"M15.5 13.5 18 16\"/>","bid":"<path d=\"M7 6l3.5-3.5 4 4L11 10z\"/><path d=\"M8.8 8.2 3 14\"/><path d=\"M11 17.5h6.5M12 17.5v-2h4.5v2\"/>","price-alert":"<path d=\"M6 14V9a4 4 0 0 1 8 0v5l1.5 1.5h-11z\"/><path d=\"M8.5 17.2a1.6 1.6 0 0 0 3 0\"/><path d=\"M10 3.5V5\"/>","curtail":"<path d=\"M7 8h6v3a3 3 0 0 1-6 0z\"/><path d=\"M8.5 8V4.5M11.5 8V4.5M10 14v3.5\"/><path d=\"M3.5 3.5l13 13\"/>","failure":"<rect x=\"5\" y=\"5\" width=\"10\" height=\"10\" rx=\"1\"/><path d=\"M8 5V3M12 5V3M8 17v-2M12 17v-2M5 8H3M5 12H3M17 8h-2M17 12h-2\"/><path d=\"M10.5 5.5 9 8.5l2 2-2 2 1 2\"/>","complaint":"<path d=\"M3 4.5h14v9h-6l-4 3v-3H3z\"/><path d=\"M10 6.5V10\"/><circle cx=\"10\" cy=\"12\" r=\".9\" fill=\"currentColor\" stroke=\"none\"/>","margin-call":"<path d=\"M3.5 14a6.5 6.5 0 0 1 13 0\"/><path d=\"M10 14l4-4\"/><circle cx=\"10\" cy=\"14\" r=\".9\" fill=\"currentColor\" stroke=\"none\"/><path d=\"M14.6 7.6l1.4-1.4M3.5 14h2M14.5 14h2\"/>","locked":"<rect x=\"4.5\" y=\"9\" width=\"11\" height=\"8.5\" rx=\"1.5\"/><path d=\"M7 9V6.5a3 3 0 0 1 6 0V9\"/><path d=\"M10 12.5v2\"/>","in-transit":"<path d=\"M2.5 12.5h15l-2 4h-11z\"/><path d=\"M4.5 12.5v-4h4v4M8.5 12.5v-4h4v4\"/><path d=\"M13.5 12.5V6.5h2v6\"/>","degraded":"<path d=\"M4 16.5v-3M8 16.5v-6M12 16.5v-9\"/><path d=\"M16 16.5v-12\" stroke-dasharray=\"1.5 2\"/>","seed":"<path d=\"M10 17.5V9\"/><path d=\"M10 11C10 7.5 7.5 5.5 4 5.5c0 3.5 2.5 5.5 6 5.5z\"/><path d=\"M10 9c0-3 2-5 5.5-5 0 3-2 5-5.5 5z\"/><path d=\"M5.5 17.5h9\"/>","ipo":"<path d=\"M6.5 11a3.5 3.5 0 0 1 7 0v1.5h-7z\"/><path d=\"M10 7.5v-1.5\"/><path d=\"M4 12.5h12M5.5 12.5v5M14.5 12.5v5M3.5 17.5h13\"/>","cap-table":"<circle cx=\"10\" cy=\"10\" r=\"7\"/><path d=\"M10 10V3M10 10l6.1 3.5M10 10l-6.1 3.5\"/>","close":"<path d=\"M5 5l10 10M15 5 5 15\"/>","info":"<circle cx=\"10\" cy=\"10\" r=\"7.5\"/><path d=\"M10 9v5\"/><circle cx=\"10\" cy=\"6.5\" r=\".9\" fill=\"currentColor\" stroke=\"none\"/>","check":"<path d=\"M4 10.5l4 4 8-8\"/>","chevron-right":"<path d=\"M8 4.5l5.5 5.5L8 15.5\"/>","save":"<path d=\"M4 3.5h9.5l3 3v10H4z\"/><path d=\"M7 3.5v4h6v-4\"/><path d=\"M7 16.5V12h6v4.5\"/>","export":"<path d=\"M10 13V3.5M6.5 7 10 3.5 13.5 7\"/><path d=\"M3.5 12v4.5h13V12\"/>","import":"<path d=\"M10 3.5V13M6.5 9.5 10 13l3.5-3.5\"/><path d=\"M3.5 12v4.5h13V12\"/>","sound-on":"<path d=\"M3.5 8h3l4-3.5v11l-4-3.5h-3z\"/><path d=\"M13.5 7.5a3.5 3.5 0 0 1 0 5M15.5 5.5a6.4 6.4 0 0 1 0 9\"/>","sound-off":"<path d=\"M3.5 8h3l4-3.5v11l-4-3.5h-3z\"/><path d=\"M13.5 8l4 4M17.5 8l-4 4\"/>","glossary":"<path d=\"M10 5.5C8.5 4.2 6 3.8 2.5 4v11.5c3.5-.2 6 .2 7.5 1.5 1.5-1.3 4-1.7 7.5-1.5V4c-3.5-.2-6 .2-7.5 1.5z\"/><path d=\"M10 5.5V17\"/>"};
  function Icon(p) {
    var body = ICONS[p.name];
    if (!body) return null;
    var size = p.size || 20;
    return h("svg", { className: cx("g-icon", p.className), width: size, height: size, viewBox: "0 0 20 20", fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round", role: p.label ? "img" : undefined, "aria-label": p.label, "aria-hidden": p.label ? undefined : "true", focusable: "false", dangerouslySetInnerHTML: { __html: body } });
  }

  window.G2G = Object.assign(window.G2G || {}, {
    Button: Button, Segmented: Segmented, Stat: Stat, Delta: Delta, KpiTile: KpiTile, Pips: Pips, ActionRow: ActionRow,
    HeatMeter: HeatMeter, SiteCard: SiteCard, LtvGauge: LtvGauge, LadderStep: LadderStep, LeagueTable: LeagueTable,
    Sparkline: Sparkline, WeekTimeline: WeekTimeline, EventCard: EventCard, Toast: Toast, NewsTicker: NewsTicker,
    Tag: Tag, MergeOption: MergeOption, Logo: Logo, Mark: Mark, Icon: Icon, iconNames: Object.keys(ICONS), fmt: fmt, heatStep: heatStep
  });
})();
