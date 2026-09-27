# 21: Claude Design Prompt: Act II Wireframes

*v1.0, 27 Sep 2026 (matches the frozen scope, 20 v1.0). Paste everything below the line into Claude Design, as a new canvas or added to the existing "Garage to Gigawatt – Act I Wireframes" canvas. The example numbers come from the corrected Act II market data (`docs/act2-content/`).*

---

## Task

Create **low-fidelity wireframes** for **Act II of "Garage to Gigawatt"**, a turn-based, finance-first business sim in a desktop browser. In Act II (Q4 2022 → Q4 2026, 17 quarterly turns), the player's crypto-mining company turns its energized megawatts into AI data-center capacity: signing tenants, raising debt and building projects through the H100 shortage, the megadeal boom and the 2026 backlash.

**Act I wireframes already exist** (top bar, left nav, Plan dashboard, Fleet & Sites, Capital, live quarter, event card, negotiation, auction, quarter report, Merge, chapter report, settings). **Reuse their layout and components.** Draw only the new and changed screens below. The goal is to settle **layout, information hierarchy and flow** before visual design.

## Style rules (same as Act I, strict)

- **Greyscale** plus **one blue accent** for the primary action per screen. Red/green only for +/− deltas.
- System sans-serif plus monospace for numbers. No illustrations or logos; placeholder boxes with ×.
- **Real sample content** (below), no lorem ipsum.
- Desktop **1280 × 720**, no page scroll (panels may scroll inside).
- Compact numbers: $2.4K, $1.5M, $2.0B, 20 MW, $2.10/GPU-hr, 8.5%.
- Grey sticky-note **annotations** on anything non-obvious.

## Persistent layout changes

- **Top bar:** add a **credit rating badge** (e.g. "BB ▲"; company ratings run CCC− to BBB) and **backlog** ("Backlog $412M"). Keep date, cash, treasury, Bandwidth pips (now up to 8), BTC price and hashprice. Add a **GPU spot price** chip ("H100 spot $2.40/hr ▼").
- **Left nav:** Dashboard · **Projects** (new) · Sites & Fleet · Capital · People · League · Log.

## Screens to draw (10 artboards)

### 1. Title (changed)
Add "Start at Act II (Q4 2022, preset company)" under "New career". Show an "Act II" tag on saves that are in Act II.

### 2. Act II intro (new, shown once after the Merge)
"Q4 2022. Ethereum no longer pays miners. ChatGPT launches next month." Three blocks:
- **What you carried over:** sites and MW, cash, debt, fleet, founder stake.
- **Your head start** (from the Merge choice): e.g. "GPU cloud: first AI tenant card arrives Q1 2023; first cluster builds 1 quarter faster".
- **Lifeline** (variant, only for weak runs): "A bankrupt miner's 20 MW site is up for auction. Bridge loan offered: $6M at 14%."
- A "Begin Act II →" button.

### 3. Plan dashboard (changed, the most important screen)
Answer "where should my megawatts go this quarter?" at a glance:
- **MW-by-use bar** (stacked, per company): mining / hosting / AI shell / AI cloud / idle / under construction.
- **KPI row:** EBITDA last quarter, valuation, credit rating, backlog, cash runway (quarters).
- **Market panel:** sparklines for BTC hashprice, H100 contract and spot price, and the **AI demand index** (0–100).
- **Projects strip:** the 2–3 active projects as mini cards (stage, next step, ready-by).
- **Actions list** grouped as in Act I, plus a **Projects** group ("Open a project" 1 BW). Disabled actions show why.
- **Inbox tray:** 1–2 waiting cards (tenant RFP, site offer) with a "Review" link.
- **News ticker.**

### 4. Projects (new)
- **Columns by stage:** Proposed · Slots filling · Building · Live · Sold.
- **Project card:** name ("Pecos AI Hall 1"), site + region tag, MW, target use, three **slot chips** (Power ✓ / Tenant ◐ / Capital ○), timeline (quarters to go), **ready-by** date with a warning state when late, and the projected IRR.
- A **pilot cluster** card: full stack, 0.5–2 MW, **spot-only, so it has only two slot chips (Power, Capital)** and shows utilisation instead of a tenant ("Pecos Pilot · 1 MW · 750 H100s · 70% utilised · $4.00/GPU-hr").
- A late project card showing the take-or-pay penalty ("Late 1Q: −$1.0M (3% of annual contract) · AI-lab tenant may walk at 2Q late (20%)").
- An empty-state column with guidance ("Open a project from Dashboard or Sites").

### 5. Deal builder (new, modal: the heart of Act II)
One project, three slot panels side by side:
- **Power:** use existing MW (instant) / grid upgrade (queue timer) / on-site gas (fast, +Heat). Show MW available at the site.
- **Tenant:** 2–3 offer cards (type, rating, price, term, prepayment, ready-by, walk-away chance if 2 quarters late). Buttons: "Accept" (0 BW) / "Negotiate" (2 BW) / "Leave on spot" (full stack only). For a pilot cluster this panel is replaced by a note: "Spot-only: earns the neocloud price × utilisation".
- **Capital:** a stack builder: own cash / equipment loan (on GPUs) / project debt / DDTL / equity / JV / backstop. Each shows amount, rate, and its requirement (e.g. "needs a tenant rated BBB or better", "DDTL: needs a rated tenant"). A **debt vs equity bar**.
- **Projected return panel** along the bottom: capex, equity needed, revenue/yr, EBITDA/yr, payback, IRR, and **the effect on the credit rating** ("BB → BB−").
- Primary action: "Start build (1 BW)". Disabled until all slots are filled, with the reason.

### 6. Sites & Fleet (changed)
- **Site list** with a **region tag** and, per site, an MW split bar (mining / hosting / AI / idle).
- **Region panel** (side drawer) for the selected site's region: power price, grid queue, Heat modifier, **Ratepayer Anger** meter, active policy (e.g. "PJM: capacity price ×9 — anger rising").
- **Fleet tables** for the site: ASICs (as in Act I) and GPU clusters (generation, GPUs, utilisation, contracted vs spot).
- **Scouting result drawer:** 2–3 offers with type badges (Distressed / Energized land / Greenfield) and a hidden-flaw "?".

### 7. Capital (changed)
- **Credit rating** card with the three inputs (debt/EBITDA, backlog quality, runway) and what the next notch up or down would change. Annotation: "Company ratings stop at BBB; debt secured on a strong-tenant project can rate A".
- **Debt stack table** by instrument (project debt, DDTL, equipment, bridge), with rate, maturity, covenant status (DSCR).
- **Backlog by tenant** table (tenant, rating, remaining $, weight %, value counted).
- **Valuation breakdown:** mining EBITDA × mining multiple + AI EBITDA × AI multiple + cash + treasury − debt + backlog value.
- Equity: cap table bar; "Raise equity / ATM offering" action.

### 8. Quarter report (changed)
Add: MW by use (before → after), backlog change, rating change, project milestones this quarter, tenants signed or lost. League table by **MW (AI / mining) and valuation**, with CoreWeave shown as a benchmark row.

### 9. Act II chapter report (extends Act I's)
Career graph **2017 → 2026** with the Merge marked, peak valuation and quarter, founder net worth, title band, rank, 4–5 key moments ("Signed a 10-year lease with a hyperscaler, Q2 2024"), and an **Act III teaser** ("2027: the renewal wall is coming").

### 10. Game over: foreclosure variant
"Lenders foreclosed on Pecos AI Hall 1 in Q3 2026", what went wrong (3 bullets: leverage, tenant, delay), "Replay Act II from its start".

## Example data (use it)

Show the dashboard at the **start of Q3 2024** (plan phase, just after the halving):
- Cash **$38M**. Debt **$214M**. Rating **BB ▲**. Backlog **$412M**. Bandwidth **5 of 6**. Runway **5 quarters**.
- BTC **$62,700** ▼12%. Hashprice **$48/PH/day** ▼57% (the April halving). H100 1-year contract **$4.20/hr**, neocloud **$4.00/hr**, spot **$2.50/hr** ▼. AI demand index **32 ▲**.
- MW by use (60 MW total): mining 21 · hosting 0 · AI shell 20 live + 18 building · AI cloud 1 (pilot, live) · idle 0.
- Sites:
  - **Pecos, TX** (ERCOT), 40 MW: mining 21, AI shell 18 (under construction), pilot cluster 1 MW live, Heat 18
  - **Loudoun-adjacent, VA** (PJM), 20 MW: AI shell 20 live, Heat 41, Ratepayer Anger 58
- Projects:
  - "Loudoun Hall A": 20 MW AI shell, **Live**, tenant: hyperscaler (AA), 10 years, $1.7M/MW/yr
  - "Pecos AI Hall 1": 18 MW AI shell, **Building**, 1 quarter left, tenant: AI lab (BB), ready-by Q4 2024
  - "Pecos Pilot": 1 MW full stack, **Live**, spot-only, 750 H100s, 70% utilised
  - "Pecos Cluster": 8 MW full stack H100 (converting 8 of Pecos's mining MW), **Slots filling**: Power ✓, Tenant ◐ (negotiating), Capital ○
- News: "Halving: miners' revenue per hash cut in half overnight".

League (Q3 2024, illustrative): CoreWeave (benchmark) · Core Scientific · IREN · Hut 8 · Cipher · You.

Deal builder example: "Pecos Cluster", 8 MW, **6,000 H100s** (750 per MW), capex ≈ **$250M** (GPUs ≈ $190M + retrofit ≈ $60M). Tenant offer: "Enterprise AI (BBB), **$2.40/GPU-hr, 3 years**, no prepayment, walks at 2Q late: 10%". Capital: DDTL 65% at SOFR + 7%, equity 35%. Projected IRR **26%** (project, before debt), payback **2.3 years**, rating effect **BB → BB−**.

## Deliverable
- One board with the **10 artboards** in flow order, titled "A2-01 Title" … "A2-10 Game over (foreclosure)".
- A **flow strip**: Merge → Act I chapter report → Act II intro → Plan → (Deal builder / Projects) → Live quarter → Report → … → Act II chapter report.
- A **component sheet** with the new components: MW-by-use bar, project card (all 5 stages + late state + the spot-only pilot variant), slot chip (empty/partial/done), rating badge, backlog chip, region tag, Ratepayer Anger meter, tenant offer card, capital stack row, projected-return panel.
