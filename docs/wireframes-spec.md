# 13: Act I wireframes: screen spec

*This is the brief the wireframes were drawn from (Design canvas "Garage to Gigawatt – Act I Wireframes", 12 screens plus a component sheet). The canvas itself is a claude.ai link Claude Code can't open, so this spec is the reference for layout and flow. Visual style comes from `docs/design-system/`, not from the greyscale wireframe rules.*

## Persistent layout (every in-game screen)

- **Top bar:** date (e.g. "Q3 2018 · Turn 7 / 23") · Cash · Treasury (BTC + ETH, with $ value) · Bandwidth pips (e.g. ●●○ = 2 of 3 left) · BTC and ETH price with a small ▲▼ % · hashprice · the Settings button.
- **Left navigation:** Dashboard · Fleet & Sites · Capital · People · League · Log. Show the active tab.
- **Primary action:** an "End Quarter →" button, bottom-right, always visible in the Plan phase.
- Desktop frame **1280 × 720** minimum. Every screen fits without page scroll; panels may scroll inside.

## Screens (flow order)

Flow: Title → Plan → Live quarter (with interrupts) → Report → next Plan … → Merge → Chapter report.

### 1. Title / New game
Game title, "New career", "Continue", "Load save" (import a string), and an optional seed field. One-line pitch: "Six graphics cards in a garage. Five years to the Merge."

### 2. Plan dashboard (the main screen)
It must answer "what should I do this quarter?" at a glance:
- **KPI row:** hashrate (ETH MH/s and BTC TH/s), revenue last quarter, power cost, profit/day per machine type, cost per coin, company valuation.
- **Market panel:** sparklines for BTC price, ETH price and hashprice over the last 8 quarters, plus the "Read the market" hint card (1 BW).
- **HODL / sell slider:** "Sell 60% of mined coins this quarter".
- **Actions list** grouped by category (Operations, Sites & power, Capital, People, Community, Intel). Each action shows its **Bandwidth cost** as pips and its $ cost. Disabled actions show why (e.g. "IPO window opens 2021").
- **Sites strip:** each site as a small card (name, capacity used / total, power ¢/kWh, a Heat meter 0–100 with markers at 30/50/70/90).
- **News ticker:** 1–2 headlines for this quarter.

### 3. Fleet & Sites
- **Machines by site table:** model, units, new/used, hashrate, power kW, profit/day each, status (running / switched off / degraded).
- **Buy/sell panel** for GPU Rig Gen 1, GPU Rig Gen 2, Antminer S9, Antminer S19 Pro: new vs used price, lead time ("arrives Q1 2022"), and "earns from next quarter".
- **Site ladder** as a horizontal progression: Garage (5 kW) → Small unit (100 kW) → Warehouse (1 MW) → Own site (20 MW) → Texas site (100 MW). Locked tiers show their unlock condition.
- **Scouting result drawer:** 2–3 site offers with a "hidden flaw: ?" badge.

### 4. Capital
- **Funding ladder:** Savings → Friends & family → Seed → Series A → IPO/SPAC, with done, available and locked states.
- **Cap table:** a founder % bar.
- **Loans table:** equipment loan and crypto-backed loan, with an **LTV gauge** marked at 50% (max), 70% (margin call) and 80% (liquidation).
- Valuation breakdown: run-rate EBITDA × era multiple + cash + treasury − debt.

### 5. Live quarter (overlay on the dashboard)
- A 13-week timeline showing the current week.
- A live price line (BTC or ETH, toggle), running revenue for the quarter, and machines on/off.
- Controls: Pause · 1× · 2× · Skip to report.
- A small "interrupt incoming" toast state.

### 6. Interrupt / event card (modal, Reigns-style)
Title, a 1–3 sentence body, 2–3 choice buttons each with a one-line consequence preview, and a "default if skipped" marker. Example: "Winter Storm Uri".

### 7. Negotiation modal
Three rounds of offer and counter-offer on a power contract: the utility's current offer (¢/kWh, term), your counter (a slider), a round counter and a "walk-away risk" indicator, Accept / Counter / Walk away, and a hint line when the Ex-Utility Exec is hired.

### 8. Distressed auction modal
The lot ("240 used Antminer S9 · list $150 each"), rival monogram tiles with names, your sealed-bid input, your cash, and "Bid" / "Pass".

### 9. Quarter report
Headline deltas (revenue, profit, cash, hashrate, Heat); a cost-per-coin vs coin price chart (bar vs line); the league table (you vs 4 rivals, by hashrate and valuation, with rank change ▲▼); events that happened this quarter; a "Continue to Q4 2018" button.

### 10. The Merge decision (Act I finale)
Four large option cards with a text preview and an Act II consequence each: Sell GPUs, keep BTC · Become a GPU cloud · Convert to hosting · Hold and wait. A context strip above: GPU fleet resale value, idle MW, cash, treasury.

### 11. Chapter report / Game over
- **Chapter report:** a net-worth line chart for 2017–2022, peak valuation, final founder net worth, rank, and 3 "key moments".
- **Game over:** "Out of cash in Q2 2019", what went wrong (3 bullets), "Try again with the same seed".

### 12. Settings
Sound on/off, default live-quarter speed, save / export / import, glossary link.

## Example data (dashboard at the start of Q3 2018)

- Cash $84K. Treasury 1.2 BTC + 40 ETH ($25.9K). Bandwidth 3.
- BTC $6,480 ▼9%. ETH $454 ▲11%. Hashprice $323/PH/day.
- Garage: 3.8 / 5 kW, 12¢, Heat 22. Small unit: 53 / 100 kW, 8¢, Heat 34, "neighbour complaint" badge.
- 4 × GPU Rig Gen 1 in the garage: 180 MH/s, 0.95 kW, +$2.82/day each. 40 × Antminer S9 in the small unit: 13.5 TH/s, 1.32 kW, +$1.83/day each.
- News: "New US tariffs hit Chinese-made mining machines".
- League (Q3 2018): Bitfarms 0.19 EH/s · Core Scientific 0.14 · Riot 0.12 · Marathon 0.04 · You (rank 5 of 5).
