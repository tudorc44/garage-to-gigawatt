# Prologue wireframes (P0-01 … P0-08)

Exported 28 Sep 2026 from the "G2G Prologue – Wireframes" canvas (https://claude.ai/artifact/7Cu8Yy19rpbq9s8YrLWVqB). Each `.dc.html` is one 1280×720 artboard's markup (it references the canvas runtime `support.js`, so it won't render on its own: read it as a layout spec). `canvas.json` holds the canvas notes (sticky notes n01…n08) that explain each screen.

| File | Screen |
|---|---|
| Flow.dc.html | The flow: title → intro → Plan ×13 → live quarter/report (Act I screens reused) → auto-play cards → chapter report → handover → Act I |
| Main.dc.html | P0-01 Title: New career expands into "Start in 2009 (prologue)" / "Start in 2017"; saved careers carry a Prologue/Act I tag |
| P0-02-Intro.dc.html | P0-02 Intro card (copy from text_prologue.en.json) |
| P0-03-Plan.dc.html | P0-03 Plan dashboard, three columns: rig + household meters + solo/pool; market + coins + keep/sell; this quarter's actions + offers tray (max 2) |
| P0-04-Autoplay.dc.html | P0-04 Auto-play cards (~2 s each, timer bar, Pause here, 1×/2×/4×) and the interrupted state |
| P0-05-Coins.dc.html | P0-05 Coins & custody: balances, history, move coins, selling-limit line, backup, risks, lost-coins ledger |
| P0-06-Preorder.dc.html | P0-06 Pre-order and group-buy cards side by side, with odds bars |
| P0-07-Report.dc.html | P0-07 Prologue chapter report |
| P0-08-Handover.dc.html | P0-08 Handover to Act I (what carries over, growth-multiple scoring, vs a 2017 start) |
| Components.dc.html | Component sheet for the new Prologue components and their states |

## How to use them
- **Layout from the wireframes, look from the design system.** Wireframes are greyscale; their blue primary button, system fonts and red/green are wireframe conventions. Colours, type, buttons and icons come from `docs/design-system/` and the `bedroom` theme (primary action = ink).
- **Mechanics from the scope doc.** Where a wireframe's sample figures or labels disagree with `docs/alpha-0.3-scope.md` or the built rules, the scope and the built rules win. Known conflicts:
  1. Nav: use the wireframes' Dashboard · Machines & Rooms · Coins · Log. Move-out, conference and vanity sinks sit in "This quarter" on the Plan screen.
  2. Household load cap: the wireframe's "1.44 kW" is a sample; show the current site's capacity (bedroom 0.15 kW, home rig 1.5 kW).
  3. Selling limit: the mechanic stays the built weekly USD cap. Show it as the wireframe's sentence, in BTC at the current price, for what's left this quarter.
  4. The "Conference invitation (2011)" sample offer is wrong: conferences exist only in 2013Q2 and 2014Q2.
  5. Pre-order "promised delivery": show the tuned on-time delivery (ships 2013Q3), not "Q2 2013".
  6. Action costs (e.g. Move out drawn with 2 pips) follow the built Bandwidth rules.
  7. Offers: accept the canvas's proposal that unanswered offers expire at quarter end.
