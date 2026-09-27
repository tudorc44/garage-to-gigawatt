# 14: Claude Design Prompt: Design System (Phase 1, step 6)

*Two prompts, run in order in Claude Design.*
- **Part 1** explores three visual directions on the same screens.
- **Part 2** builds the full design system on the direction you pick.

*Both are self-contained. The wireframes they refer to are the Design canvas "Garage to Gigawatt – Act I Wireframes".*

---

## Part 1: Three visual directions

*(Paste everything between the lines.)*

---

You are the art director for **"Garage to Gigawatt"**, a turn-based, finance-first business sim for desktop browsers (and later Steam). The player grows a crypto-mining company from a garage in 2017 to the Ethereum Merge in 2022 (Act I). Later acts turn it into an AI data-center developer (2022–2035).

**Tone:** grounded and lightly wry, like a good business-newsletter writer. Never cartoonish, never "crypto bro". The fantasy: *"I started with six graphics cards humming in my garage and turned an empty field and a phone call into a gigawatt."*

**Genre references:** Venture Capital Tycoon, Game Dev Tycoon, Reigns (event cards), Mini Metro (clean systems). The UI is 90% panels, numbers and cards. There's no map in Act I.

**The job:** create **three distinct visual directions** and apply each one to the same **three screens** from the approved wireframes. The layouts are approved: keep them. Change only the look.

The three screens:
1. **Plan dashboard** at Q3 2018:
   - Top bar: date, cash $84.0K, treasury, Bandwidth pips, BTC $6,480 ▼9%, ETH $454 ▲11%, hashprice $323/PH/d
   - Left nav, a 6-tile KPI row, a market panel with 3 sparklines, a HODL/sell slider
   - Two site cards with Heat meters marked at 30/50/70/90
   - An actions list with Bandwidth-cost pips, a news ticker, and an "End Quarter →" button
2. **Event card:** "Winter Storm Uri", a Reigns-style modal with an illustration slot and two choices. "Curtail and sell the power back: +$6.3M, offline 1 week, Heat −5" is the default. "Keep mining: +$2.5M, Heat +15".
3. **Quarter report:** 5 delta tiles, a cost-per-coin vs price chart, a league table (Bitfarms, Core Scientific, Riot, Marathon, You), and a "This quarter" event list.

**Directions to explore** (these are starting points, so push each one to be clearly its own thing):
- **A · Trading terminal:** dark, dense, monospace-forward. Amber/phosphor accents, Bloomberg-terminal energy, and a lot of data at a glance.
- **B · Engineer's ledger:** warm paper, ink, blueprint grid lines and hand-labelled tape. It feels like a founder's notebook that grows up over time.
- **C · Industrial signage:** high contrast, a safety-yellow accent, a condensed display face, stencil-like labels. It feels like power infrastructure and warehouses.

**For each direction, deliver:**
- The 3 screens at **1280 × 720**.
- A small swatch strip: the palette with role names, the 2–3 typefaces, and the number style.
- A one-line **era note:** how this direction could shift between *Garage (2017–19) → Industrial (2020–22) → Campus (Act II)* while staying one system.

**Rules for every direction:**
- **Fonts:** open-licence fonts only (Google Fonts / OFL), because the game will ship commercially. Not Inter, Roboto or Arial. Numbers must use **tabular figures**.
- **Colour:** gains and losses always carry ▲▼ or +/− as well as colour (colour-blind safe). BTC and ETH series must differ in lightness, not only hue. Text contrast is at least 4.5:1.
- **Branding:** no real company logos. Rivals appear as neutral monogram tiles (RI, MA, CS, BF).
- **Illustrations:** labelled placeholders only, but give each direction a one-line illustration style note for the event cards.
- **Theme:** one theme per direction (no light/dark pairs).

**Layout on the canvas:** one row per direction (A, B, C), with the 3 screens and the swatch strip in each row, and a title above each row.

---

## Part 2: The full design system (after you pick a direction)

*(Replace `[DIRECTION]` with A, B or C, plus any tweaks you want, e.g. "B, but with A's density". Paste everything between the lines.)*

---

Build the **complete design system** for "Garage to Gigawatt" in direction **[DIRECTION]** from the exploration canvas. Make it as a **Design System** artifact, so its tokens can be installed on the wireframe canvas and exported for the code.

**How it will be used:** a solo developer working with Claude Code builds the UI in **Preact with plain CSS custom properties**, with no CSS framework. The tokens must therefore export cleanly as **`tokens.css` (CSS variables)** and **`tokens.json`**, with names a developer can type without looking them up.

### 1. Tokens

Use one naming scheme throughout, e.g. `--color-surface-1`, `--color-text-muted`, `--space-3`, `--radius-2`, `--font-num`.

- **Colour roles, not hex names.** Include:
  - Surfaces (canvas, panel, raised, overlay scrim), borders and text (primary / secondary / muted / inverse)
  - Primary action; focus ring
  - **gain / loss / warning / danger**
  - **Heat scale** (0–100, with steps at 30 / 50 / 70 / 90)
  - Disabled
- **Data-viz palette:** BTC, ETH, hashprice, *you*, 4 rivals and a neutral "benchmark" line. All must be distinguishable in greyscale and for the common colour-vision deficiencies. Include a check table showing the contrast of each against the surface it sits on.
- **Typography:** a display face, a UI face and a numeric/mono face, with a type scale of 6–7 steps (size / line height / weight / letter spacing). Label style (the small uppercase labels) and number styles (big KPI, table number, delta).
- **Spacing:** a 4 px base with 8–10 steps. **Radii:** 3–4 steps. **Elevation:** panel, raised card, modal. **Borders.**
- **Motion:** durations and easings for the modal open, the live-quarter week tick, number count-ups and toasts. Everything must have a `prefers-reduced-motion` fallback.
- **Layout:** 1280 × 720 minimum, and a note on 1280 × 800 (Steam Deck later). Also the top bar height, nav width and grid gutters, taken from the wireframes.

### 2. Era themes

- The system stays one system. Each era overrides **only a small set of tokens**: accent, surface tint, border style, illustration treatment and maybe the display face weight.
- Define **Garage (2017–19)** and **Industrial (2020–22)** fully.
- Define **Campus (Act II, AI era)** as a preview.
- Deliver the overrides as `[data-era="garage"]`-style token blocks, and show the Plan dashboard in both Act I eras side by side.

### 3. Number formatting spec

Written rules, with examples, for:
- **Currency:** $950 · $2.4K · $1.5M · $2.0B. Say when to show decimals.
- **Crypto amounts:** 1.2 BTC · 40 ETH · 0.0269 BTC/day.
- **Hashrate:** MH/s · TH/s · PH/s · EH/s, with the auto-scaling rule.
- **Power:** kW / MW; ¢/kWh.
- **Percent and deltas:** ▲12% / ▼9%; +$2.82/day / −$0.33/day; use the real minus sign "−".
- **Dates:** "Q3 2018", "Q3 2018 · week 6", "Turn 7/23".
- **Tabular alignment in tables:** right-aligned numbers, unit columns.

### 4. Components

Every component from the wireframes' component sheet and screens, each with **all states**: default, hover, focus-visible, pressed, selected, disabled-with-reason, and warning/danger where relevant.

- **Chrome:** top bar (with its stat groups), left nav item, phase indicator
- **Buttons:** primary ("End Quarter →"), secondary, ghost, icon-only (with aria-label); segmented control (1× / 2× / BTC–ETH toggle)
- **Stat tiles:** KPI tile (value + delta + caption); stat block inside the top bar
- **Actions:** action row with **Bandwidth pips** (cost 1–3, affordable / unaffordable / used states); Bandwidth meter (e.g. 2 of 3 left)
- **Sites and machines:** site card with capacity bar and **Heat meter**; site ladder step (owned / available / locked-with-reason); machine buy/sell card (new vs used price, lead time)
- **Capital:** funding-ladder step; **LTV gauge** (max 50 / call 70 / liquidation 80); cap-table bar
- **Tables:** data table (machines, loans); **league table row** with a highlighted "You" row and a rank delta
- **Charts:** sparkline; line chart; bar + line chart (cost per coin vs price); week timeline scrubber (13 weeks: done / current / future / interrupt marker)
- **Cards and modals:**
  - **Event card** (Reigns-style): illustration slot, title, body, 2–3 choice buttons with a consequence line and a "Default" tag
  - Modal shell (negotiation, auction, settings)
  - Toast ("Interrupt incoming")
  - News ticker
- **Inputs:** slider (HODL %, negotiation counter); text/number input with label; badge/tag ("Neighbour complaint", "Hidden flaw: ?", "Degraded ×0.9")
- **Other:** Merge option card; empty and loading states for panels

### 5. Iconography and illustration

- **Icons:** a small icon set in one stroke style, 20 px and 16 px, covering: cash, treasury, bandwidth, BTC, ETH, hashrate, power, heat, site, machine, loan, rival, news, settings, pause, speed, skip, warning. Original drawings only; no coin brand logos. BTC and ETH are shown as neutral lettered glyphs.
- **Illustration direction** for event-card art: style, palette, framing and do/don't examples as placeholders. Keep it achievable for a solo developer with AI-assisted art, with one consistent style across 20+ cards.

### 6. Proof screens

Re-skin these wireframe screens with the finished system, **1280 × 720**:
- Plan dashboard (in both Act I eras)
- Event card
- Quarter report
- The Merge decision

### 7. Accessibility checklist

A short table:
- Text contrast (4.5:1; 3:1 for large text)
- Focus-visible on every interactive element
- Hit targets ≥ 44 px for primary actions
- Colour never the only signal (▲▼, +/−, patterns on the Heat and LTV thresholds)
- Reduced motion
- Readable at 100% zoom on 1280 × 720

### Rules

- Open-licence fonts only (Google Fonts / OFL). Not Inter, Roboto or Arial.
- No real company logos or brand marks. Rivals are monogram tiles.
- Keep the approved wireframe layouts. If a layout change would clearly help, add it as a note instead of making it.
- Use real sample content from the game (the Q3 2018 numbers above), never lorem ipsum.
- Name tokens consistently and export **`tokens.css` and `tokens.json`**. A developer will import them unchanged into `src/ui/styles/`.

---

## After Part 2

1. Install the design system on the wireframe canvas (Theme menu), so the wireframes pick up the tokens.
2. Copy `tokens.css` / `tokens.json` into the repo as the first UI commit (`src/ui/styles/tokens.css`).
3. Add a "UI rules" section to `CLAUDE.md`: use tokens only, no raw hex values in components, and number formatting through one shared `format.ts` that implements §3.
