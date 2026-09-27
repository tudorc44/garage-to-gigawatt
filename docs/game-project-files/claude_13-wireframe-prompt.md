# 13: Claude Design Prompt: Act I Wireframes (Phase 1, step 5)

*Paste everything below the line into Claude Design (a Design artifact). It's self-contained.*

---

## Task

Create **low-fidelity wireframes** for **Act I of "Garage to Gigawatt"**, a turn-based, finance-first business sim played in a desktop browser. The player grows a crypto-mining company from a garage (Q1 2017) to the Ethereum Merge (Q3 2022) over 23 quarterly turns.

The wireframes exist to settle **layout, information hierarchy and flow** before any visual design. A developer (with Claude Code) will build the UI from them in Preact.

## Style rules (strict)

- **Greyscale only**: white, 3–4 greys and black. **One accent colour** (a single blue) only for the primary action on each screen (e.g. "End Quarter"). Red and green are allowed **only** for +/− money deltas.
- A system sans-serif font plus a monospace for numbers. No illustrations, logos or icons beyond simple placeholder boxes marked with an ×.
- **Real sample content, no lorem ipsum.** Use the example data below so the density is realistic.
- Desktop frame **1280 × 720** (the minimum target). Every screen must fit without page scroll; panels may scroll inside.
- Numbers use compact formatting: $2.4K, $1.5M, $2.0B, 180 MH/s, 13.5 TH/s, 1.2 MW.
- Put short **annotation notes** (small grey sticky-note style) next to anything non-obvious: interactions, states, what a number means.

## Persistent layout (every in-game screen)

- **Top bar:** date (e.g. "Q3 2018 · Turn 7 / 23") · Cash · Treasury (BTC + ETH, with $ value) · Bandwidth pips (e.g. ●●○ = 2 of 3 left) · BTC and ETH price with a small ▲▼ % · hashprice · the Settings button.
- **Left navigation:** Dashboard · Fleet & Sites · Capital · People · League · Log. Show the active tab.
- **Primary action:** an "End Quarter →" button, bottom-right, always visible in the Plan phase.

## Screens to draw (12 artboards)

### 1. Title / New game
Game title, "New career", "Continue", "Load save" (import a string), and an optional seed field. A one-line pitch: "Six graphics cards in a garage. Five years to the Merge."

### 2. Plan dashboard (the main screen, the one that matters most)
It must answer "what should I do this quarter?" at a glance:
- **KPI row:** hashrate (ETH MH/s and BTC TH/s), revenue last quarter, power cost, profit/day per machine type, cost per coin, company valuation.
- **Market panel:** sparklines for BTC price, ETH price and hashprice over the last 8 quarters, plus the "Read the market" hint card (1 BW).
- **HODL / sell slider:** "Sell 60% of mined coins this quarter".
- **Actions list** grouped by category (Operations, Sites & power, Capital, People, Community, Intel). Each action shows its **Bandwidth cost** as pips and its $ cost. Disabled actions show why (e.g. "IPO window opens 2021").
- **Sites strip:** each site as a small card (name, capacity used / total MW, power ¢/kWh, a Heat meter 0–100 with markers at 30/50/70/90).
- **News ticker:** 1–2 headlines for this quarter.

### 3. Fleet & Sites
- **A table of machines by site:** model, units, new/used, hashrate, power kW, profit/day each, status (running / switched off / degraded).
- **Buy/sell panel** for 4 models: GPU Rig Gen 1, GPU Rig Gen 2, Antminer S9, Antminer S19 Pro. Show new vs used price, lead time ("arrives Q1 2022"), and "earns from next quarter".
- **The site ladder** as a horizontal progression: Garage (5 kW) → Small unit (100 kW) → Warehouse (1 MW) → Own site (20 MW) → Texas site (100 MW). Locked tiers are greyed out with their unlock condition.
- **A scouting result drawer:** 2–3 site offers with a "hidden flaw: ?" badge.

### 4. Capital
- **The funding ladder** as steps: Savings → Friends & family → Seed → Series A → IPO/SPAC, with done, available and locked states.
- **Cap table:** a founder % bar.
- **Loans table:** equipment loan and crypto-backed loan, with an **LTV gauge** marked at 50% (max), 70% (margin call) and 80% (liquidation).
- A valuation breakdown: run-rate EBITDA × era multiple + cash + treasury − debt.

### 5. Live quarter (overlay on the dashboard)
- A 13-week timeline scrubber showing the current week.
- A live price line (BTC or ETH, toggle), running revenue for the quarter, and machines on/off.
- Controls: ⏸ Pause · 1× · 2× · Skip to report.
- A small "interrupt incoming" toast state.

### 6. Interrupt / event card (modal, Reigns-style)
A card with the title, a 1–3 sentence body, 2–3 choice buttons each with a one-line consequence preview, and a "default if skipped" marker. Use the example: **"Winter Storm Uri"**.

### 7. Negotiation modal
Three rounds of offer and counter-offer on a power contract. Show:
- The utility's current offer (¢/kWh, term)
- Your counter (a slider)
- A round counter and a "walk-away risk" indicator
- Accept / Counter / Walk away buttons
- A hint line when the Ex-Utility Exec is hired

### 8. Distressed auction modal
- The lot: "240 used Antminer S9 · list $150 each".
- Rival logos as placeholder boxes with names (Riot, Marathon, Core Scientific, Bitfarms).
- Your sealed-bid input, your cash, and "Bid" / "Pass".

### 9. Quarter report
- Headline deltas: revenue, profit, cash, hashrate, Heat.
- A cost-per-coin vs coin price chart (bar vs line).
- The **league table**: you vs 4 rivals, by hashrate and valuation, with rank change ▲▼.
- Events that happened this quarter, as a list.
- A "Continue to Q4 2018" button.

### 10. The Merge decision (Act I finale)
Four large option cards with a text preview and an Act II consequence each:
- Sell GPUs, keep BTC
- Become a GPU cloud
- Convert to hosting
- Hold and wait

A context strip above them: GPU fleet resale value, idle MW, cash, treasury.

### 11. Chapter report / Game over (two variants side by side)
- **Chapter report:** a net-worth line chart for 2017–2022, peak valuation, final founder net worth, rank, and 3 "key moments".
- **Game over:** "Out of cash in Q2 2019", what went wrong (3 bullets), "Try again with the same seed".

### 12. Settings
Sound on/off, default live-quarter speed, save / export / import, glossary link.

## Example data (use it)

Show the dashboard (screen 2) at the **start of Q3 2018** (plan phase) with:
- Cash **$84K**. Treasury **1.2 BTC + 40 ETH ($25.9K)**. Bandwidth **3**.
- BTC **$6,480 ▼9%**. ETH **$454 ▲11%**. Hashprice **$323 /PH/day** (changes vs last quarter's close).
- Sites:
  - **Garage:** 3.8 / 5 kW, 12¢, Heat 22
  - **Small unit:** 53 / 100 kW, 8¢, Heat 34, "neighbour complaint" badge
- Fleet:
  - 4 × GPU Rig Gen 1 in the garage: **180 MH/s, 0.95 kW, +$2.82/day each**
  - 40 × Antminer S9 in the small unit: **13.5 TH/s, 1.32 kW, +$1.83/day each**
- News: "New US tariffs hit Chinese-made mining machines".

Rivals on the league table (Q3 2018): Bitfarms 0.19 EH/s · Core Scientific 0.14 EH/s · Riot 0.12 EH/s · Marathon 0.04 EH/s · You 0.0005 EH/s (rank 5 of 5).

Uri card text: "Texas freezes. Grid prices hit the $9,000/MWh cap. The grid operator asks large loads to shut down. At your contract price, the power you are not using is worth more than the bitcoin you would mine." Assume 40 MW of S19 Pros running at the Texas site. Choices: "Curtail and sell the power back: +$6.3M, offline 1 week" · "Keep mining: +$2.5M mining revenue, Heat +15".

## Deliverable

- One board with the **12 artboards in flow order**, left to right, titled "01 Title" … "12 Settings".
- A **flow strip** at the top: Title → Plan → Live quarter (with interrupts) → Report → next Plan … → Merge → Chapter report.
- A small **component sheet** artboard: top bar, action row with BW pips, site card with Heat meter, KPI tile, event card, primary/secondary buttons, LTV gauge.

---

*Executed 26 Sep 2026: the result is the Design canvas "Garage to Gigawatt – Act I Wireframes" (13 artboards: the 12 screens plus a component sheet).*
