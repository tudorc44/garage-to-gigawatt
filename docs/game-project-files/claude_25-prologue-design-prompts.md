# 25: Prologue design prompts — era theme, icons, machine spec cards, wireframes

*Draft v1.0, 27 Sep 2026. Two prompts for the Prologue (Act 0, "Bedroom to Garage", 2009–2016; design in doc 23 v1.0, data in `claude/prologue-content/`).*
- *Prompt A can run now, in the "Garage to Gigawatt" design system. It doesn't touch code.*
- *Prompt B runs with the Alpha 0.3 scope, after Act II's M6, on a Claude Design canvas like the Act II wireframes.*

---

## Prompt A: Design system additions (run in the design system)

*(Paste between the lines. If you run it from this project thread, Claude applies it to the "Garage to Gigawatt" design system: https://claude.ai/artifact/Dpe6457JUTj3z71zV1R9aa)*

---

Extend the **"Garage to Gigawatt"** design system for a new optional chapter, the **Prologue (Act 0), "Bedroom to Garage", Jan 2009 → Dec 2016**. A tech student mines bitcoin on a gaming PC from the genesis block, moves up through GPUs, FPGAs and early ASICs, and ends in the garage where Act I begins. Three deliverables. **Keep everything inside the existing system:** same fonts, spacing, radii, components and number formats; the "Engineer's ledger" direction stays.

### 1. A new era theme: `bedroom` (2009–2016)
- Like `garage`, `industrial` and `campus`, it **overrides only a small set of tokens**: accent, surface tint, border style, illustration treatment, and maybe the display face weight.
- **Mood:** a student's desk and an early forum era. Think graph-paper notebook, a CRT-era beige-and-cream palette, a single muted accent (e.g. a phosphor green or an old-link blue), hand-noted tape labels (Caveat) used a little more than in `garage`. **Grounded, not retro-kitsch:** no pixel fonts, no fake terminal screens, no neon.
- It must hand over cleanly to `garage` in 2017: side by side, the two should look like the same notebook a few years apart.
- Keep all colour-blind rules: gain teal-blue, loss brick red, every delta also carries ▲▼ or +/−, hatching for danger states. Check contrast of text and data-viz colours on the new surface (a table like the existing one).
- Deliver the `[data-theme="bedroom"]` token block, add it to `tokens.css` / `tokens.json`, and show the **Plan dashboard in `bedroom` next to `garage`**.

### 2. New icons (the Icons asset group)
Match the existing 61 exactly: 20×20 viewBox, 1.5px stroke, round caps and joins, no fills (except a small dot where needed), single ink via `currentColor`, ~2px padding, readable at 16px.

Draw these, filenames in kebab-case:
- **Machines:**
  - `pc-tower`: a desktop tower with a vent grille
  - `gpu-card`: a single graphics card with one fan (clearly different from the existing `gpu-rig`)
  - `fpga-board`: a bare circuit board with a chip and pin headers
  - `asic-early`: a small boxy unit with a USB-stick shape or single heatsink (clearly different from `asic`)
- **Mining and custody:**
  - `solo`: a single pick or a single block with a star (the lottery)
  - `pool`: three small nodes joined to one block
  - `wallet`: a simple billfold with a key tag
  - `exchange`: two arrows swapping over a small order book
  - `backup`: a disk with a check mark
  - `lost-key`: a key with a break in the stem
- **Prologue actions and life:**
  - `pre-order`: a tag with a clock
  - `group-buy`: three small person outlines sharing one box (head and shoulders only, no faces)
  - `move-out`: a box with an arrow leaving a door
  - `conference`: a lanyard badge
  - `vanity`: a small sports car outline or a watch
  - `household`: a house with a plug and a meter
  - `auto-play`: a fast-forward chevron inside a quarter-circle clock

**Rules:** no real logos (no Bitcoin "₿" symbol, no exchange or maker marks), no coin logos, no faces, no text inside icons, no emoji shapes. Similar concepts must stay distinct in silhouette: `gpu-card` vs `gpu-rig`, `asic-early` vs `asic`, `wallet` vs `exchange`, `backup` vs `save`. Upload each SVG to the Icons group after the existing ones, update the Iconography section of the README (where each icon is used), and add a preview row at 20px and 16px.

### 3. Machine spec cards (new asset group: "Machines")
Larger line drawings, one per machine, **for the whole campaign**, not just the prologue. They appear on the buy dialog, pre-order and group-buy cards, and failure pop-ups.
- **Style:** the icon language scaled up: 1.5–2px strokes, no fills or only one flat surface tint, `currentColor` ink so each era's theme recolours them. A three-quarter view, drawn like an engineer's sketch on the ledger paper. No shading gradients, no photos, no 3D renders.
- **Size:** 240×160 viewBox, with room for a small caption strip below (model name, era) that the component fills in.
- **Generic, never a real product's design:** draw a machine class, not a copy of any brand's shape. No logos, labels, model numbers or maker marks on the drawings.
- **The set, in order:**
  1. `pc-tower-2009`: a student's gaming tower with a side panel off
  2. `gpu-card-2010`: a 2010-era dual-slot graphics card with a blower fan
  3. `fpga-board-2011`: a bare FPGA board with a heatsink and USB cable
  4. `asic-preorder-2013`: a small early ASIC unit, a boxy case with one fan
  5. `asic-box-2014`: an ASIC in a compact metal box, two fans (early S-class era)
  6. `asic-box-2016`: a longer ASIC chassis with fans at both ends (the 2016–2020 workhorse class)
  7. `gpu-rig-open-frame`: an open-frame rig with 6 cards (Act I's GPU rig)
  8. `asic-box-2020`: a heavier, taller ASIC chassis (the 2020–22 class)
  9. `gpu-server-8x`: an 8-GPU server tray (Act II's H100/H200 class)
  10. `gpu-rack-liquid`: a liquid-cooled GPU rack with manifold pipes (Act II's GB200 class)
- Add a **MachineCard** component to the bundle: `<MachineCard name="gpu-card-2010" caption="Gaming GPU · 2010" />`, with a preview of all ten in `bedroom`, `garage` and `campus`.
- Update the README with a "Machines" section: the list, where each is used, and the no-real-product rule.

---

## Prompt B: Prologue wireframes (run on a Claude Design canvas, after the Alpha 0.3 scope)

*(Paste between the lines into Claude Design, as a new canvas or added to the Act II canvas: https://claude.ai/artifact/LVnSiEH9RRHtU16Ld4C59S. Update the example data from the frozen Alpha 0.3 scope first if anything changed.)*

---

## Task
Create **low-fidelity wireframes** for the **Prologue (Act 0) of "Garage to Gigawatt"**, a turn-based, finance-first business sim in a desktop browser. In the prologue (Jan 2009 → Dec 2016, played in 10–15 minutes), a tech student mines bitcoin on a gaming PC from the genesis block, then GPUs, FPGAs and early ASICs, and ends in the garage where Act I begins. About 13 **decision quarters** get a Plan phase; the quarters between them **auto-play** as one fast summary card.

**Act I and Act II wireframes already exist** (top bar, left nav, Plan dashboard, Fleet & Sites, Capital, live quarter, event card, negotiation, quarter report, chapter report, settings). **Reuse their layout and components.** Draw only the new and changed screens below. The goal is to settle layout, information hierarchy and flow.

## Style rules (same as Acts I–II, strict)
- **Greyscale** plus **one blue accent** for the primary action per screen. Red/green only for +/− deltas.
- System sans-serif plus monospace for numbers. No illustrations or logos; placeholder boxes with × (the machine spec cards will replace them later).
- **Real sample content** (below), no lorem ipsum.
- Desktop **1280 × 720**, no page scroll (panels may scroll inside).
- Compact numbers: $1.2K, $3.7M, 4,200 BTC, 780 MH/s, 494 GH/s, $0.75.
- Grey sticky-note **annotations** on anything non-obvious.

## Persistent layout changes (prologue only)
- **Top bar:** date · cash · **coins: wallet / exchange split** ("Wallet 4,200 BTC · Exchange 300 BTC") · BTC price · network difficulty · Bandwidth pips (base 2). No rating, no backlog, no valuation.
- **Left nav:** Dashboard · Machines & Rooms · Coins (custody) · Log. (No Projects, Capital, People or League in the prologue.)

## Screens to draw (8 artboards)

### 1. Title (changed)
"New career" opens a choice: **"Start in 2009 (prologue)"** or **"Start in 2017"**, with a one-line note under each ("Mine from the genesis block. 10–15 minutes." / "Start in the garage with $10K."). Prologue saves show a "Prologue" tag.

### 2. Prologue intro (new)
A short story screen dated **3 Jan 2009**: the genesis block, your gaming PC, $2K savings, a part-time job. One button: "Start mining →". (Text comes from `text_prologue.en.json`; use a 3-line placeholder paraphrase.)

### 3. Prologue Plan dashboard (new, the most important screen)
Answer "what do I mine with, where do my coins sit, and do I sell?" at a glance:
- **Your rig** panel: machines owned with hashrate and power; the room and its limit (household power, a patience meter).
- **Solo vs pool** toggle with the odds in plain words ("Solo: about 1–2 blocks a week at your share" vs "Pool: ≈ 78 BTC a week, −2% fee").
- **Coins panel:** wallet vs exchange balances, a "Move" control, a **Backup** action (1 BW) with its status, and the risk line for each ("Exchange: hack and collapse risk" / "Wallet: 3%/yr lost-key risk, ≈0.5% with a backup").
- **Keep / sell** slider (BTC; ETH appears from Aug 2015).
- **Market strip:** BTC price and difficulty sparklines.
- **Actions list** (Bandwidth pips): buy machine, move out, go to a conference, backup, pre-order / group buy (in its window).
- **Offers tray:** 1–2 waiting cards (a forum buyer's offer in the no-price era; a pre-order in 2012–13).
- **News ticker.**

### 4. Auto-played quarter card (new)
A single compact card over the dashboard, shown for ~2 seconds per skipped quarter: "Q3 2012 · mined 41 BTC · BTC $11 ▲ · difficulty +39%". Controls: "Pause here" and a speed toggle. Show a stack of 3 in sequence, and the variant where an **event card interrupts** the auto-play.

### 5. Coins & custody (new)
- Balances by location (wallet / exchange) with their history.
- The backup status and what it protects.
- A plain-language explainer of each risk.
- The "lost coins" ledger (coins lost to exchange hacks or lost keys) with dates.
- The **selling limit** line: "You can sell up to 1,850 BTC this quarter (share of real exchange volume); big sales push the price down."

### 6. Pre-order and group-buy cards (new, modal)
Two cards side by side:
- **Pre-order:** invented vendor (names from `preorders.json`), one early ASIC unit, **$1,300**, promised delivery Q1 2013, with the delivery odds shown as a simple bar (45% on time / 35% 2–3 quarters late / 15% 4+ late / 5% never) and "Paid upfront. Late delivery usually means a loss."
- **Group buy:** half a unit, **$650**, shared with invented forum friends, slightly worse delivery odds.
Buttons: "Order (0 BW)" / "Pass".

### 7. Prologue chapter report (new)
- Net worth at Dec 2016 and its parts (cash, BTC, ETH, machines).
- Coins mined over the prologue, coins sold, **coins lost** (e.g. "300 BTC lost in the Mt Gox collapse, Feb 2014").
- A career graph 2009 → 2016 (log scale) with markers for the halvings, the 2011 and 2013 bubbles and Mt Gox.
- A title band and a "What your 2010 coins would be worth in 2021" teaser.
- Button: "Continue to Act I (2017) →".

### 8. Handover to Act I (new)
What carries into Act I:
- the sites you built (e.g. the garage)
- your machines
- cash
- coins in wallet and on exchange
- a note that Act I is scored by **growth multiple** for prologue starts ("Your Act I rank is judged by how much you grow from here")

## Example data (use it)
Show the dashboard at the **start of Q2 2011** (plan phase, the bubble is coming):
- Cash **$1,150**. Part-time income **$1,200/quarter**. Bandwidth **2 of 2**. Living at home: household load **0.6 kW of 1.44 kW**, patience **72%**.
- BTC **$0.75**. Difficulty **68,978**. Network **494 GH/s**.
- Machines: your PC's CPU (**4 MH/s**, 90 W) + **2 gaming GPUs** (**390 MH/s** each, 200 W each). Total **784 MH/s ≈ 0.16%** of the network.
- Coins: **Wallet 4,200 BTC** (backup ✓) · **Exchange 300 BTC**.
- Mining mode: **Solo** ("about 1–2 blocks a week at your share").
- Offers tray: "A forum buyer offers $0.70/BTC for 500 BTC" · "Conference invitation (2011)".
- News: "Mt Gox passes $1 again · A forum thread asks: is $10 possible?"

Auto-play card: "Q3 2012 · mined 41 BTC · BTC $11 ▲ · difficulty +39%".
Chapter report: net worth **≈ $3.9M** (3,900 BTC × $960 + $120K cash + machines), 300 BTC lost at Mt Gox, 1,200 BTC sold over the years.

## Deliverable
- One board with the **8 artboards** in flow order, titled "P0-01 Title" … "P0-08 Handover".
- A **flow strip:** Title → Prologue intro → Plan (decision quarter) → Live quarter → Report → Auto-play cards → … → Prologue chapter report → Handover → Act I Plan (2017Q1).
- A **component sheet** with the new components: solo/pool toggle with odds, custody panel (wallet/exchange/backup), selling-limit line, household meter, auto-play card (+ interrupted state), pre-order card, group-buy card, offer card, lost-coins ledger row.
