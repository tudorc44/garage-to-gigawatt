/* @ds-bundle: {"format":4,"namespace":"G2G","components":[{"name":"Button"},{"name":"Segmented"},{"name":"Stat"},{"name":"Delta"},{"name":"KpiTile"},{"name":"Pips"},{"name":"ActionRow"},{"name":"HeatMeter"},{"name":"SiteCard"},{"name":"LtvGauge"},{"name":"LadderStep"},{"name":"LeagueTable"},{"name":"Sparkline"},{"name":"WeekTimeline"},{"name":"EventCard"},{"name":"Toast"},{"name":"NewsTicker"},{"name":"Tag"},{"name":"MergeOption"},{"name":"Logo"},{"name":"Mark"},{"name":"Icon"},{"name":"MachineCard"}]} */
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
  var ICONS = {"cash":"<rect x=\"2.5\" y=\"5.5\" width=\"15\" height=\"9\" rx=\"1.5\"/><circle cx=\"10\" cy=\"10\" r=\"2.2\"/><path d=\"M5 8v4M15 8v4\"/>","treasury":"<path d=\"M3 8.5 10 4l7 4.5\"/><path d=\"M4.5 9v6M8 9v6M12 9v6M15.5 9v6\"/><path d=\"M3 16h14\"/>","bandwidth":"<circle cx=\"5\" cy=\"10\" r=\"2\"/><circle cx=\"10\" cy=\"10\" r=\"2\"/><circle cx=\"15\" cy=\"10\" r=\"2\"/>","btc":"<circle cx=\"10\" cy=\"10\" r=\"7.5\"/><path d=\"M8 6.5v7M8 6.5h3a1.7 1.7 0 0 1 0 3.4H8M8 9.9h3.4a1.8 1.8 0 0 1 0 3.6H8M9.3 5.2v1.3M9.3 13.5v1.3\"/>","eth":"<path d=\"M10 2.5 5 10.2 10 13l5-2.8z\"/><path d=\"M5 11.6 10 17.5l5-5.9L10 14.4z\"/>","hashrate":"<path d=\"M2.5 14.5h3l2-7 3 9 2-5h5\"/>","power":"<path d=\"M11 2.5 5 11h4.5L8.5 17.5 15 9h-4.5z\"/>","heat":"<path d=\"M10 17.5c3 0 5-2 5-4.8 0-3.2-2.6-4.4-3.3-7.7C9.8 6.3 9 8 9.2 9.6 7.8 9 7.3 7.6 7.3 7.6 5.9 9 5 10.6 5 12.7c0 2.8 2 4.8 5 4.8z\"/>","site":"<path d=\"M2.5 16.5h15\"/><path d=\"M3.5 16.5V8l4-2.5V8l4-2.5V8l4-2.5v11\"/><path d=\"M6 13h1.5M10 13h1.5M14 13h1\"/>","machine":"<rect x=\"3\" y=\"5\" width=\"14\" height=\"10\" rx=\"1\"/><circle cx=\"7\" cy=\"10\" r=\"2.3\"/><circle cx=\"13\" cy=\"10\" r=\"2.3\"/>","loan":"<path d=\"M4 3.5h8l4 4v9H4z\"/><path d=\"M12 3.5v4h4\"/><path d=\"M7 11h6M7 14h4\"/>","rival":"<circle cx=\"7\" cy=\"7.5\" r=\"2.5\"/><circle cx=\"13.5\" cy=\"7.5\" r=\"2.5\"/><path d=\"M2.5 16c.6-2.5 2.3-4 4.5-4s3.9 1.5 4.5 4M9.5 13.2c.9-.8 2.1-1.2 4-1.2 2.2 0 3.9 1.5 4 4\"/>","news":"<rect x=\"2.5\" y=\"4\" width=\"12\" height=\"12\" rx=\"1\"/><path d=\"M14.5 7h3v7.5a1.5 1.5 0 0 1-3 0\"/><path d=\"M5 7h7M5 10h7M5 13h4\"/>","settings":"<circle cx=\"10\" cy=\"10\" r=\"2.5\"/><path d=\"M10 2.5v2M10 15.5v2M2.5 10h2M15.5 10h2M4.7 4.7l1.4 1.4M13.9 13.9l1.4 1.4M4.7 15.3l1.4-1.4M13.9 6.1l1.4-1.4\"/>","pause":"<path d=\"M7.5 5v10M12.5 5v10\"/>","speed":"<path d=\"M3.5 5l6 5-6 5zM10.5 5l6 5-6 5z\"/>","skip":"<path d=\"M4.5 5l7 5-7 5zM15.5 5v10\"/>","warning":"<path d=\"M10 3 2.5 16.5h15z\"/><path d=\"M10 8v4M10 14.3v.2\"/>","dashboard":"<rect x=\"3\" y=\"3\" width=\"6\" height=\"6\" rx=\"1\"/><rect x=\"11\" y=\"3\" width=\"6\" height=\"4\" rx=\"1\"/><rect x=\"11\" y=\"9\" width=\"6\" height=\"8\" rx=\"1\"/><rect x=\"3\" y=\"11\" width=\"6\" height=\"6\" rx=\"1\"/>","fleet":"<rect x=\"3.5\" y=\"3\" width=\"13\" height=\"6\" rx=\"1\"/><rect x=\"3.5\" y=\"11\" width=\"13\" height=\"6\" rx=\"1\"/><circle cx=\"6\" cy=\"6\" r=\".9\" fill=\"currentColor\" stroke=\"none\"/><circle cx=\"6\" cy=\"14\" r=\".9\" fill=\"currentColor\" stroke=\"none\"/><path d=\"M9 6h5M9 14h5\"/>","capital":"<ellipse cx=\"10\" cy=\"5\" rx=\"6\" ry=\"2\"/><path d=\"M4 5v3.5c0 1.1 2.7 2 6 2s6-.9 6-2V5\"/><path d=\"M4 8.5V12c0 1.1 2.7 2 6 2s6-.9 6-2V8.5\"/><path d=\"M4 12v3.5c0 1.1 2.7 2 6 2s6-.9 6-2V12\"/>","people":"<rect x=\"7.5\" y=\"2.5\" width=\"5\" height=\"4\" rx=\"1\"/><rect x=\"2.5\" y=\"13.5\" width=\"5\" height=\"4\" rx=\"1\"/><rect x=\"12.5\" y=\"13.5\" width=\"5\" height=\"4\" rx=\"1\"/><path d=\"M10 6.5V10M5 13.5V10h10v3.5\"/>","league":"<path d=\"M2.5 17h15\"/><path d=\"M7 17V8h6v9\"/><path d=\"M2.5 17v-5H7M13 13.5h4.5V17\"/><path d=\"M10 5.5V3\"/>","log":"<circle cx=\"4.5\" cy=\"6\" r=\".9\" fill=\"currentColor\" stroke=\"none\"/><circle cx=\"4.5\" cy=\"10\" r=\".9\" fill=\"currentColor\" stroke=\"none\"/><circle cx=\"4.5\" cy=\"14\" r=\".9\" fill=\"currentColor\" stroke=\"none\"/><path d=\"M8 6h8.5M8 10h8.5M8 14h5.5\"/>","gpu-rig":"<rect x=\"2.5\" y=\"5\" width=\"15\" height=\"10\" rx=\"1\"/><circle cx=\"6\" cy=\"10\" r=\"1.8\"/><circle cx=\"10\" cy=\"10\" r=\"1.8\"/><circle cx=\"14\" cy=\"10\" r=\"1.8\"/><path d=\"M4.5 15v2M15.5 15v2\"/>","asic":"<rect x=\"4\" y=\"3\" width=\"12\" height=\"14\" rx=\"1\"/><circle cx=\"10\" cy=\"8.5\" r=\"3.5\"/><circle cx=\"10\" cy=\"8.5\" r=\".9\" fill=\"currentColor\" stroke=\"none\"/><path d=\"M7 14h6\"/>","garage":"<path d=\"M2.5 9 10 3.5 17.5 9\"/><path d=\"M4 8v8.5h12V8\"/><path d=\"M6.5 16.5v-6h7v6M6.5 12.5h7M6.5 14.5h7\"/>","small-unit":"<path d=\"M3 16.5V6.5h14v10\"/><path d=\"M2 16.5h16\"/><path d=\"M8 16.5v-5h4v5\"/><path d=\"M5 8.5h3\"/>","warehouse":"<path d=\"M2.5 16.5V9l3.75-3v3l3.75-3v3l3.75-3v3l3.75-3v10.5\"/><path d=\"M1.5 16.5h17\"/><path d=\"M5 16.5v-3h3v3M12 16.5v-3h3v3\"/>","own-site":"<rect x=\"7.5\" y=\"5\" width=\"5\" height=\"6.5\" rx=\".5\"/><path d=\"M8.8 5V3.3M11.2 5V3.3\"/><path d=\"M2.5 17h15\"/><path d=\"M3.5 17v-3.5M7 17v-3.5M13 17v-3.5M16.5 17v-3.5M3.5 14.5h13\"/>","texas-site":"<path d=\"M4.5 17.5 7 3.5l2.5 14\"/><path d=\"M4.5 6.5h5M5.4 12.5h3.2M6 9.5h2\"/><path d=\"M11.5 17.5v-5h6v5\"/><path d=\"M2.5 17.5h15.5\"/>","buy":"<path d=\"M10 2.5h7.5V10l-8 8-7-7z\"/><circle cx=\"14\" cy=\"6\" r=\"1\"/><path d=\"M6.5 10.5h4M8.5 8.5v4\"/>","sell":"<path d=\"M10 2.5h7.5V10l-8 8-7-7z\"/><circle cx=\"14\" cy=\"6\" r=\"1\"/><path d=\"M6.5 10.5h4\"/>","scout":"<circle cx=\"5.8\" cy=\"13\" r=\"3.2\"/><circle cx=\"14.2\" cy=\"13\" r=\"3.2\"/><path d=\"M3.5 10.8 5.5 5h2.5l1 5.5M16.5 10.8 14.5 5H12l-1 5.5M9 11.5h2\"/>","negotiate":"<path d=\"M2.5 7h10M9.5 4l3 3-3 3\"/><path d=\"M17.5 13h-10M10.5 10l-3 3 3 3\"/>","pitch":"<rect x=\"3\" y=\"3\" width=\"14\" height=\"9\" rx=\"1\"/><path d=\"M5.5 10l3-3 2 2 4-3.5\"/><path d=\"M7 12l-2 5.5M13 12l2 5.5M10 12v3\"/>","hire":"<circle cx=\"8\" cy=\"7\" r=\"3\"/><path d=\"M2.5 17c.5-3 2.7-5 5.5-5s5 2 5.5 5\"/><path d=\"M15.5 5v5M13 7.5h5\"/>","outreach":"<path d=\"M3 4.5h14v9H9l-4 3v-3H3z\"/><circle cx=\"7\" cy=\"9\" r=\".9\" fill=\"currentColor\" stroke=\"none\"/><circle cx=\"10\" cy=\"9\" r=\".9\" fill=\"currentColor\" stroke=\"none\"/><circle cx=\"13\" cy=\"9\" r=\".9\" fill=\"currentColor\" stroke=\"none\"/>","read-market":"<path d=\"M2.5 13.5l3-3.5 2.5 2 2.5-3\"/><circle cx=\"13\" cy=\"11\" r=\"3.5\"/><path d=\"M15.5 13.5 18 16\"/>","bid":"<path d=\"M7 6l3.5-3.5 4 4L11 10z\"/><path d=\"M8.8 8.2 3 14\"/><path d=\"M11 17.5h6.5M12 17.5v-2h4.5v2\"/>","price-alert":"<path d=\"M6 14V9a4 4 0 0 1 8 0v5l1.5 1.5h-11z\"/><path d=\"M8.5 17.2a1.6 1.6 0 0 0 3 0\"/><path d=\"M10 3.5V5\"/>","curtail":"<path d=\"M7 8h6v3a3 3 0 0 1-6 0z\"/><path d=\"M8.5 8V4.5M11.5 8V4.5M10 14v3.5\"/><path d=\"M3.5 3.5l13 13\"/>","failure":"<rect x=\"5\" y=\"5\" width=\"10\" height=\"10\" rx=\"1\"/><path d=\"M8 5V3M12 5V3M8 17v-2M12 17v-2M5 8H3M5 12H3M17 8h-2M17 12h-2\"/><path d=\"M10.5 5.5 9 8.5l2 2-2 2 1 2\"/>","complaint":"<path d=\"M3 4.5h14v9h-6l-4 3v-3H3z\"/><path d=\"M10 6.5V10\"/><circle cx=\"10\" cy=\"12\" r=\".9\" fill=\"currentColor\" stroke=\"none\"/>","margin-call":"<path d=\"M3.5 14a6.5 6.5 0 0 1 13 0\"/><path d=\"M10 14l4-4\"/><circle cx=\"10\" cy=\"14\" r=\".9\" fill=\"currentColor\" stroke=\"none\"/><path d=\"M14.6 7.6l1.4-1.4M3.5 14h2M14.5 14h2\"/>","locked":"<rect x=\"4.5\" y=\"9\" width=\"11\" height=\"8.5\" rx=\"1.5\"/><path d=\"M7 9V6.5a3 3 0 0 1 6 0V9\"/><path d=\"M10 12.5v2\"/>","in-transit":"<path d=\"M2.5 12.5h15l-2 4h-11z\"/><path d=\"M4.5 12.5v-4h4v4M8.5 12.5v-4h4v4\"/><path d=\"M13.5 12.5V6.5h2v6\"/>","degraded":"<path d=\"M4 16.5v-3M8 16.5v-6M12 16.5v-9\"/><path d=\"M16 16.5v-12\" stroke-dasharray=\"1.5 2\"/>","seed":"<path d=\"M10 17.5V9\"/><path d=\"M10 11C10 7.5 7.5 5.5 4 5.5c0 3.5 2.5 5.5 6 5.5z\"/><path d=\"M10 9c0-3 2-5 5.5-5 0 3-2 5-5.5 5z\"/><path d=\"M5.5 17.5h9\"/>","ipo":"<path d=\"M6.5 11a3.5 3.5 0 0 1 7 0v1.5h-7z\"/><path d=\"M10 7.5v-1.5\"/><path d=\"M4 12.5h12M5.5 12.5v5M14.5 12.5v5M3.5 17.5h13\"/>","cap-table":"<circle cx=\"10\" cy=\"10\" r=\"7\"/><path d=\"M10 10V3M10 10l6.1 3.5M10 10l-6.1 3.5\"/>","close":"<path d=\"M5 5l10 10M15 5 5 15\"/>","info":"<circle cx=\"10\" cy=\"10\" r=\"7.5\"/><path d=\"M10 9v5\"/><circle cx=\"10\" cy=\"6.5\" r=\".9\" fill=\"currentColor\" stroke=\"none\"/>","check":"<path d=\"M4 10.5l4 4 8-8\"/>","chevron-right":"<path d=\"M8 4.5l5.5 5.5L8 15.5\"/>","save":"<path d=\"M4 3.5h9.5l3 3v10H4z\"/><path d=\"M7 3.5v4h6v-4\"/><path d=\"M7 16.5V12h6v4.5\"/>","export":"<path d=\"M10 13V3.5M6.5 7 10 3.5 13.5 7\"/><path d=\"M3.5 12v4.5h13V12\"/>","import":"<path d=\"M10 3.5V13M6.5 9.5 10 13l3.5-3.5\"/><path d=\"M3.5 12v4.5h13V12\"/>","sound-on":"<path d=\"M3.5 8h3l4-3.5v11l-4-3.5h-3z\"/><path d=\"M13.5 7.5a3.5 3.5 0 0 1 0 5M15.5 5.5a6.4 6.4 0 0 1 0 9\"/>","sound-off":"<path d=\"M3.5 8h3l4-3.5v11l-4-3.5h-3z\"/><path d=\"M13.5 8l4 4M17.5 8l-4 4\"/>","glossary":"<path d=\"M10 5.5C8.5 4.2 6 3.8 2.5 4v11.5c3.5-.2 6 .2 7.5 1.5 1.5-1.3 4-1.7 7.5-1.5V4c-3.5-.2-6 .2-7.5 1.5z\"/><path d=\"M10 5.5V17\"/>","pc-tower":"<rect x=\"6\" y=\"2.5\" width=\"8\" height=\"15\" rx=\"1\"/><path d=\"M8 5.5h4M8 7.5h4M8 9.5h4\"/><circle cx=\"10\" cy=\"14\" r=\".9\" fill=\"currentColor\" stroke=\"none\"/>","gpu-card":"<path d=\"M2.5 4.5v12\"/><path d=\"M2.5 6.5h15v6h-15\"/><circle cx=\"7.5\" cy=\"9.5\" r=\"2\"/><path d=\"M11.5 8.5h4M11.5 10.5h4M8 12.5v2.5h7v-2.5\"/>","fpga-board":"<rect x=\"2.5\" y=\"3\" width=\"15\" height=\"14\" rx=\"1\"/><rect x=\"7.5\" y=\"6.5\" width=\"5\" height=\"5\"/><path d=\"M7.5 8H6M7.5 10H6M12.5 8H14M12.5 10H14\"/><path d=\"M5.5 14.5h0M8 14.5h0M10.5 14.5h0M13 14.5h0M15.5 14.5h0\"/>","asic-early":"<rect x=\"2.5\" y=\"8\" width=\"10.5\" height=\"7\" rx=\"1\"/><path d=\"M13 9.5h3.5v4H13\"/><path d=\"M5 8V5M7.5 8V5M10 8V5\"/>","solo":"<rect x=\"2.5\" y=\"7.5\" width=\"10\" height=\"10\" rx=\"1\"/><path d=\"M15 2.2l.9 1.9 2 .3-1.45 1.4.35 2-1.8-.95-1.8.95.35-2-1.45-1.4 2-.3z\"/>","pool":"<circle cx=\"4\" cy=\"4\" r=\"1.5\"/><circle cx=\"10\" cy=\"3.5\" r=\"1.5\"/><circle cx=\"16\" cy=\"4\" r=\"1.5\"/><path d=\"M5 5.2l4 6.3M10 5v6.5M15 5.2l-4 6.3\"/><rect x=\"6.5\" y=\"11.5\" width=\"7\" height=\"6\" rx=\"1\"/>","wallet":"<rect x=\"2.5\" y=\"5.5\" width=\"12.5\" height=\"11\" rx=\"1.5\"/><path d=\"M15 9h-3.5a1.75 1.75 0 0 0 0 3.5H15\"/><circle cx=\"11.8\" cy=\"10.75\" r=\".5\" fill=\"currentColor\" stroke=\"none\"/><path d=\"M14 5.5l2-2\"/><circle cx=\"17\" cy=\"2.8\" r=\"1.1\"/>","exchange":"<path d=\"M3 4.5h12M12.5 2l2.5 2.5-2.5 2.5\"/><path d=\"M17 9.5H5M7.5 7 5 9.5 7.5 12\"/><path d=\"M3 14.5h14M3 17h9\"/>","backup":"<circle cx=\"9\" cy=\"9\" r=\"6.5\"/><circle cx=\"9\" cy=\"9\" r=\"1.5\"/><path d=\"M12.5 15.2l1.8 1.8 3.5-3.8\"/>","lost-key":"<circle cx=\"5.5\" cy=\"10\" r=\"3\"/><path d=\"M8.5 10H11M13.5 10h4M16 10v2.5M17.5 10v2\"/><path d=\"M11.5 8l.8 1.2M12.5 12l.8-1.2\"/>","pre-order":"<path d=\"M2.5 10.5 9.5 3.5H16a1 1 0 0 1 1 1v6.5l-7 7z\"/><circle cx=\"14.2\" cy=\"6.3\" r=\".8\" fill=\"currentColor\" stroke=\"none\"/><circle cx=\"10.8\" cy=\"11\" r=\"2.6\"/><path d=\"M10.8 9.6V11l.9.7\"/>","group-buy":"<circle cx=\"4\" cy=\"4.5\" r=\"1.5\"/><circle cx=\"10\" cy=\"3.5\" r=\"1.5\"/><circle cx=\"16\" cy=\"4.5\" r=\"1.5\"/><path d=\"M1.8 9.5a2.2 2.2 0 0 1 4.4 0M7.8 8.5a2.2 2.2 0 0 1 4.4 0M13.8 9.5a2.2 2.2 0 0 1 4.4 0\"/><rect x=\"5.5\" y=\"11.5\" width=\"9\" height=\"6\" rx=\".5\"/><path d=\"M5.5 13.5h9\"/>","move-out":"<path d=\"M2.5 17.5v-15h6v15\"/><circle cx=\"7\" cy=\"10\" r=\".6\" fill=\"currentColor\" stroke=\"none\"/><path d=\"M5 6h12M14.5 3.5 17 6l-2.5 2.5\"/><rect x=\"11\" y=\"11.5\" width=\"6.5\" height=\"6\" rx=\".5\"/><path d=\"M11 13.5h6.5\"/>","conference":"<path d=\"M6.5 2.5c0 3 1.2 5 3.5 6.5 2.3-1.5 3.5-3.5 3.5-6.5\"/><rect x=\"5.5\" y=\"9\" width=\"9\" height=\"8.5\" rx=\"1.5\"/><path d=\"M8 12.5h4M8 14.8h2.5\"/>","vanity":"<circle cx=\"10\" cy=\"10\" r=\"4.5\"/><path d=\"M7.5 6.2 8 2.5h4l.5 3.7M7.5 13.8 8 17.5h4l.5-3.7\"/><path d=\"M10 8v2l1.5 1\"/>","household":"<path d=\"M2 9l6-5.5L14 9v8.5H2z\"/><path d=\"M6.8 9.5V11M9.2 9.5V11M5.8 11h4.4v1.5a2.2 2.2 0 0 1-4.4 0zM8 14.7v2.8\"/><circle cx=\"16\" cy=\"13\" r=\"2.3\"/><path d=\"M16 13l1-1\"/>","auto-play":"<path d=\"M2.5 17.5v-15a15 15 0 0 1 15 15z\"/><path d=\"M5.5 9.5l3 3-3 3M9.5 9.5l3 3-3 3\"/>"};
  function Icon(p) {
    var body = ICONS[p.name];
    if (!body) return null;
    var size = p.size || 20;
    return h("svg", { className: cx("g-icon", p.className), width: size, height: size, viewBox: "0 0 20 20", fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round", role: p.label ? "img" : undefined, "aria-label": p.label, "aria-hidden": p.label ? undefined : "true", focusable: "false", dangerouslySetInnerHTML: { __html: body } });
  }

  var MACHINES = {"pc-tower-2009":"<path d=\"M16 152H224\" stroke-dasharray=\"2 5\" stroke-width=\"1.25\"/><path class=\"t\" d=\"M80 40h60v105H80z\"/><path d=\"M80 40l30-18h60l-30 18M140 145l30-18V22\"/><path d=\"M88 52h44M88 62h44M90 120h40M90 126h40M90 132h40\"/><circle cx=\"110\" cy=\"84\" r=\"5\"/><path d=\"M146 50l18-10v36l-18 10zM146 96l18-10M146 104l18-10M150 118l12-7\"/><ellipse cx=\"155\" cy=\"62\" rx=\"5\" ry=\"8\"/><path d=\"M186 60l24-14v92l-24 14z\" stroke-dasharray=\"5 4\"/><path d=\"M192 70l12-7M192 132l12-7\"/>","gpu-card-2010":"<path d=\"M16 152H224\" stroke-dasharray=\"2 5\" stroke-width=\"1.25\"/><path class=\"t\" d=\"M40 90h130v22H40z\"/><path d=\"M40 90l40-24h130l-40 24M170 112l40-24V66\"/><ellipse cx=\"78\" cy=\"78\" rx=\"17\" ry=\"8\"/><ellipse cx=\"78\" cy=\"78\" rx=\"4\" ry=\"2\"/><path d=\"M100 90l40-24M186 72h12l-4 3h-12z\"/><path d=\"M48 95v12M54 95v12M60 95v12M66 95v12\"/><path d=\"M34 86v44M34 86l6 4M34 130h6\"/><path d=\"M96 112v6h48v-6\"/>","fpga-board-2011":"<path d=\"M16 152H224\" stroke-dasharray=\"2 5\" stroke-width=\"1.25\"/><path class=\"t\" d=\"M30 110l60-36h120l-60 36z\"/><path d=\"M30 110v6h120v-6M150 116l60-36v-6\"/><path d=\"M104 96l16-10h28l-16 10zM104 96V82l16-10h28v14M104 82h28l16-10M132 82v14M110 82v12M116 82v12M122 82v12M126 82v12\"/><path d=\"M44 104l2-1.2M52 104l2-1.2M60 104l2-1.2M68 104l2-1.2M76 104l2-1.2M84 104l2-1.2\"/><path d=\"M70 86l12-7M74 92l12-7\"/><path d=\"M186 82l10-6h8l-10 6z\"/><path d=\"M200 80c26 6 22 50-6 56-24 5-50 8-80 6\"/>","asic-preorder-2013":"<path d=\"M16 152H224\" stroke-dasharray=\"2 5\" stroke-width=\"1.25\"/><path class=\"t\" d=\"M80 60h80v70H80z\"/><path d=\"M80 60l30-18h80l-30 18M160 130l30-18V42\"/><circle cx=\"120\" cy=\"95\" r=\"26\"/><circle cx=\"120\" cy=\"95\" r=\"6\"/><path d=\"M120 89c6-8 14-8 18-2M126 95c8 6 8 14 2 18M120 101c-6 8-14 8-18 2M114 95c-8-6-8-14-2-18\"/><circle cx=\"86\" cy=\"66\" r=\"1.2\"/><circle cx=\"154\" cy=\"66\" r=\"1.2\"/><circle cx=\"86\" cy=\"124\" r=\"1.2\"/><circle cx=\"154\" cy=\"124\" r=\"1.2\"/><path d=\"M170 88l10-6v10l-10 6z\"/><path d=\"M120 50l20-12M132 50l20-12\"/>","asic-box-2014":"<path d=\"M16 152H224\" stroke-dasharray=\"2 5\" stroke-width=\"1.25\"/><path class=\"t\" d=\"M50 70h110v55H50z\"/><path d=\"M50 70l30-18h110l-30 18M160 125l30-18V52\"/><circle cx=\"80\" cy=\"97\" r=\"19\"/><circle cx=\"80\" cy=\"97\" r=\"4\"/><circle cx=\"130\" cy=\"97\" r=\"19\"/><circle cx=\"130\" cy=\"97\" r=\"4\"/><path d=\"M92 64l20-12M104 64l20-12M116 64l20-12M128 64l20-12\"/><path d=\"M166 108l18-11M166 114l18-11\"/>","asic-box-2016":"<path d=\"M16 152H224\" stroke-dasharray=\"2 5\" stroke-width=\"1.25\"/><path class=\"t\" d=\"M40 76h50v54H40z\"/><path d=\"M40 76l84-50h50l-84 50M90 130l84-50V26\"/><circle cx=\"65\" cy=\"103\" r=\"20\"/><circle cx=\"65\" cy=\"103\" r=\"4\"/><ellipse cx=\"149\" cy=\"53\" rx=\"10\" ry=\"18\" stroke-dasharray=\"3 4\"/><path d=\"M100 88l64-38M100 98l64-38M100 108l64-38\"/><path d=\"M92 56l30-18h26l-30 18zM92 56v8l30-18v-8\"/>","gpu-rig-open-frame":"<path d=\"M16 152H224\" stroke-dasharray=\"2 5\" stroke-width=\"1.25\"/><path class=\"t\" d=\"M48 124l24-14h110l-24 14z\"/><path d=\"M30 130h150M30 130V60M180 130V60M30 60h150M30 130l30-18h150l-30 18M60 112V42M210 112V42M60 42h150M30 60l30-18M180 60l30-18\"/><path d=\"M54 60V28l14-8v32M76 60V28l14-8v32M98 60V28l14-8v32M120 60V28l14-8v32M142 60V28l14-8v32M164 60V28l14-8v32\"/><circle cx=\"61\" cy=\"40\" r=\"4\"/><circle cx=\"83\" cy=\"40\" r=\"4\"/><circle cx=\"105\" cy=\"40\" r=\"4\"/><circle cx=\"127\" cy=\"40\" r=\"4\"/><circle cx=\"149\" cy=\"40\" r=\"4\"/><circle cx=\"171\" cy=\"40\" r=\"4\"/><path d=\"M60 60v10M82 60v10M104 60v10M126 60v10M148 60v10M170 60v10\"/><path d=\"M76 118h24v-10\"/>","asic-box-2020":"<path d=\"M16 152H224\" stroke-dasharray=\"2 5\" stroke-width=\"1.25\"/><path class=\"t\" d=\"M50 50h60v90H50z\"/><path d=\"M50 50l60-36h60l-60 36M110 140l60-36V14\"/><circle cx=\"80\" cy=\"95\" r=\"24\"/><circle cx=\"80\" cy=\"95\" r=\"5\"/><path d=\"M62 71h36M62 119h36\"/><ellipse cx=\"140\" cy=\"59\" rx=\"12\" ry=\"22\" stroke-dasharray=\"3 4\"/><path d=\"M118 118l46-28M118 126l46-28M118 134l46-28\"/><path d=\"M118 40l12-7h20M128 33v-6h20v6\"/>","gpu-server-8x":"<path d=\"M16 152H224\" stroke-dasharray=\"2 5\" stroke-width=\"1.25\"/><path class=\"t\" d=\"M30 100h150v28H30z\"/><path d=\"M30 100l30-18h150l-30 18M180 128l30-18V82\"/><path d=\"M58 97l8-5h22l-8 5zM88 97l8-5h22l-8 5zM118 97l8-5h22l-8 5zM148 97l8-5h22l-8 5z\"/><path d=\"M66 89l8-5h22l-8 5zM96 89l8-5h22l-8 5zM126 89l8-5h22l-8 5zM156 89l8-5h22l-8 5z\"/><path d=\"M40 108v12M46 108v12M52 108v12M58 108v12M160 108h12M160 114h12M160 120h12\"/><path d=\"M30 104h-6v20h6M180 104h4\"/><path d=\"M66 128v6M148 128v6\"/>","gpu-rack-liquid":"<path d=\"M16 152H224\" stroke-dasharray=\"2 5\" stroke-width=\"1.25\"/><path class=\"t\" d=\"M70 20h70v130H70z\"/><path d=\"M70 20l30-18h70l-30 18M140 150l30-18V2\"/><path d=\"M76 32h58M76 44h58M76 56h58M76 68h58M76 86h58M76 98h58M76 110h58M76 122h58M76 134h58\"/><path d=\"M80 74h50v6H80z\"/><path d=\"M152 14v124M162 8v124\" stroke-width=\"2.25\"/><path d=\"M140 38h12M140 50h12M140 62h12M140 92h12M140 104h12M140 116h12M140 128h12\"/><circle cx=\"152\" cy=\"38\" r=\"1.6\"/><circle cx=\"152\" cy=\"62\" r=\"1.6\"/><circle cx=\"152\" cy=\"104\" r=\"1.6\"/><circle cx=\"152\" cy=\"128\" r=\"1.6\"/><path d=\"M152 138c0 8 10 8 10 0M162 8c0-6 10-6 14 0v18\"/>"};
  function MachineCard(p) {
    var body = MACHINES[p.name];
    if (!body) return null;
    var draw = h("svg", { className: "g-mc-draw", viewBox: "0 0 240 160", fill: "none", stroke: "currentColor", strokeWidth: 1.75, strokeLinecap: "round", strokeLinejoin: "round", role: "img", "aria-label": p.caption || p.name, focusable: "false", dangerouslySetInnerHTML: { __html: body } });
    return h("figure", { className: cx("g-mc", p.compact && "is-compact", p.className) }, draw,
      p.compact ? null : h("figcaption", { className: "g-mc-cap" }, h("span", { className: "g-mc-name" }, p.caption || p.name), p.era ? h("span", { className: "g-mc-era" }, p.era) : null));
  }

  window.G2G = Object.assign(window.G2G || {}, {
    Button: Button, Segmented: Segmented, Stat: Stat, Delta: Delta, KpiTile: KpiTile, Pips: Pips, ActionRow: ActionRow,
    HeatMeter: HeatMeter, SiteCard: SiteCard, LtvGauge: LtvGauge, LadderStep: LadderStep, LeagueTable: LeagueTable,
    Sparkline: Sparkline, WeekTimeline: WeekTimeline, EventCard: EventCard, Toast: Toast, NewsTicker: NewsTicker,
    Tag: Tag, MergeOption: MergeOption, Logo: Logo, Mark: Mark, Icon: Icon, iconNames: Object.keys(ICONS), MachineCard: MachineCard, machineNames: Object.keys(MACHINES), fmt: fmt, heatStep: heatStep
  });
})();
