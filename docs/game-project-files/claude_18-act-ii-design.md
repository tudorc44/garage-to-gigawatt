# 18: Act II Design, "The Pivot and the Boom" (2022Q4 → 2026Q4)

*v1.1, 27 Sep 2026. All ⚙ placeholders replaced with values from the Act II content pack (`claude/act2-content/`, report `19-act-ii-content-pack.md`). Step 1 of 3 for Alpha 0.2 (design → content pack → scope freeze).*
*Where the research contradicted a design assumption, the change is listed in **§16 (decisions from the content pack)**. Items marked **[P1]–[P5]** are corrections where this doc pushes back on the pack; confirm or override them before the scope freeze.*
*This doc replaces the Deal Desk loop in 07 §3–4 and 05 §5 for Act II. Those docs stay as background, and so do the economics in 05 §1 and 01-02 §4.*

---

## 0. Decisions

### Locked (27 Sep 2026)
| # | Decision | Choice |
|---|---|---|
| D1 | Turn loop | **Hybrid.** Keep Act I's Plan phase, Bandwidth, live quarter, interrupts and quarter report. Deals become multi-quarter **projects** with Power / Tenant / Capital slots, moved forward with Bandwidth. No separate inbox or pipeline screens. |
| D2 | Entry state | **Carry the Act I state, with a floor.** Real cash, sites, MW, machines, stake and debt carry over. A floor keeps weak runs playable. Standalone preset start available. |
| D3 | BTC mining | **Stays a business unit.** The Act I mining sim keeps running on sites left as mining, including the Apr 2024 halving. |
| D4 | Merge choice | **Head start, not a path lock.** Every path stays open. The choice gives a starting advantage and makes the other paths cost more at first. |

The seven follow-up decisions are in §14; the content-pack decisions in §16.

---

## 1. What Act II has to prove

**One question:** *Is turning energized megawatts into AI capacity a tense, readable 45–50 minute run, where timing, tenant choice and leverage decide the outcome?*

- **Length:** 17 quarters (2022Q4 → 2026Q4), ~50 minutes.
- **Fantasy:** "Everyone else sold their power when the Merge hit. I kept mine, and in 2024 it was the scarcest thing in America."
- **The core tension, from 05 §1:** time is the enemy (a 6-month delay wipes out ~85% of a deal's profit), the price you lock in decides the deal, and tenant quality is the second axis.
- **The emotional arc:**
  - 2022Q4–2023: a cold, cash-starved winter where the AI signal is faint.
  - 2024: a scramble for megawatts.
  - 2025: megadeals and leverage.
  - 2026: backlash, then a late, sharp credit repricing in the 2026Q4 aftershock (§7.3), a preview of Act III.
- **The value ladder the player climbs (sourced, the pack's best finding):** a site is worth **~$0.4–1M/MW** as pure mining, **$3–12M/MW** with an announced AI deal, and **$20–27M/MW** once delivered and backed by an investment-grade tenant. The Argo → Galaxy Helios site went from a ~$65M distressed sale (Dec 2022) to an AI campus with ~$15B of contracted lease revenue. That arc is the whole game; surface it to the player (intro screen and chapter report).

---

## 2. Entry: from the Merge into Act II

### 2.1 What carries over (D2)
| Carries over | Notes |
|---|---|
| Cash, debt, coin treasury | As is |
| Sites + energized MW + power contracts | As is: the core asset of the whole game. Each site gets a region tag (§6) |
| Heat per site | Grievance resets to 0; base + load stay |
| ASIC fleet | As is (S9s are near scrap; S19s still work) |
| GPU fleet | Depends on the Merge choice (§2.3) |
| Founder stake, cap table | As is. IPO status carries over (public companies can use at-the-market offerings; §7) |
| Hires | As is, with salaries at Act II rates (`hires_act2.json`) |
| Rivals | Continue on new Act II scripts (§10) |

### 2.2 The floor
A player must own at least **20 MW energized and $5M cash** to play Act II normally.
- Below the floor, Act II opens with the **distressed lifeline card** (`ec03_lifeline_auction`): a bankrupt miner's **20 MW site for $6.5M** (≈ $325K/MW, from the Argo → Galaxy Helios distressed-sale ratio), bought with a **bridge loan at 14% APR for 8 quarters**, sized so the player also reaches **$5M cash**. Historical hook: Core Scientific's Chapter 11 (20 Dec 2022) and Compute North (Sep 2022).
- The chapter report still records the weak Act I result. The floor only keeps the run playable.
- The preset company (§2.4) is only for standalone starts.

### 2.3 Merge choice head starts (D4)
| Merge choice | Immediate effect | Head start | Handicap |
|---|---|---|---|
| **sell_gpus_keep_btc** | GPUs sold at Oct-2022 resale prices (merge.json: 3060 Ti ~$300, RX 580 ~$80) → cash | Mining unit: −10% power cost for 4 quarters (lean ops) | First AI project: +1 quarter build and no GPU know-how until the first cluster is live |
| **gpu_cloud** | GPUs kept as a **legacy cloud** (RTX-class): **$0.15/GPU-hr at 40% utilisation** | **GPU know-how 1** (§5.4): the first AI tenant card arrives in 2023Q1 (others: 2023Q3), and the first cluster builds −1 quarter | 2023 cash burn: legacy cloud barely covers its power |
| **hosting** | GPU halls converted to host third-party ASICs at **$0.075/kWh** all-in (2022Q4; the hosting rate then follows 0.075 in 2023 → 0.060 in 2024) | Hosted sites are **shell-ready**: conversion to AI shell −25% capex and −1 quarter (confirmed) | Hosting contracts run 4 quarters; ending them early costs 1 quarter of fees |
| **hold_and_wait** | GPUs switched off (resale keeps falling: 3060 Ti $800 → $400 → $300 through 2022); sites stay energized and idle | Idle MW convert with **no re-energise delay**, and 2024 BTC recovery upside if mining is restarted | Full power and rent burn on idle MW until used |

Basis: CoreWeave's own history (an ETH miner that pivoted to GPU rental in 2019) supports gpu_cloud; the "hold energized MW and wait" strategy is the Galaxy Helios pattern.

### 2.4 Standalone preset (start Act II without Act I), confirmed
"Q4 2022: a mid-size miner" (roughly IREN/Cipher pre-IPO scale).
- **Sites:** 40 MW across 2 sites: one 20 MW own site, one 20 MW Texas lease on fixed power.
- **Fleet:** S19-class at 70% of capacity.
- **Balance sheet:** $12M cash, $25M equipment debt, founder stake 45%, no IPO.
- The player picks a Merge choice on the first screen.

---

## 3. Turn loop (D1: hybrid)

Unchanged from Act I: **Plan phase → live quarter (13 weeks) → quarter report.**

| Element | Act II rule |
|---|---|
| Bandwidth | Base 3. +1 Chief of Staff, +1 at 50 MW energized, +1 at 200 MW, +1 Head of Development (new Act II hire). **Max 8** (up from 6), because projects add actions. |
| Interrupts | Max 3 counted per quarter, as in Act I. New types in §9. |
| Quarter report | Adds: contracted backlog ($), MW by use (mining / hosting / AI shell / AI cloud / idle), credit rating, and project timelines. |
| Screens | Act I screens stay. New: **Projects** (the pipeline as a list/board of project cards) and **Deal builder** (modal). The **map** is still out: sites stay a list, with a region tag (§6). |

---

## 4. Business units

Every MW at a site is in exactly one use. Changing use takes time and money (§5).

| Unit | Revenue model | Revenue per MW per year | Main risk |
|---|---|---|---|
| **Mining** (carried over) | Hashprice × hashrate − power | Falls structurally all act: hashprice < $50/PH/day after the Apr 2024 halving, a five-year low of **$38.20** in Nov 2025, despite BTC rising ~5× | Hashprice, halving, machine obsolescence |
| **Hosting** (ASICs of others) | All-in $/kWh (power passed through): **$0.085 (2022) → $0.075 (2023) → $0.060 (2024)** | ~$0.5–0.75M gross, thin margin | Client defaults in winters (Compute North: fixed-rate hosting couldn't pass through the 2022 power spike) |
| **AI shell lease** (tenant brings GPUs) | $/MW/year, 5–15-year contract | **$1.5–2.0M** (Cipher–Fluidstack ≈ $1.79M; Core Scientific–CoreWeave ≈ $1.96M; Hut 8 Beacon Point ≈ $1.86M), 80–85% margin | Build delays, tenant credit |
| **AI cloud / full stack** (you own GPUs) | $/GPU-hr × GPUs × utilisation, contracted or spot | **~$11–22M gross** (≈ 750 GPUs/MW × $2–4/hr × ~85% utilisation); GPUs cost ~$18–30M/MW | GPU price resets, generation shifts, tenant default |
| **Idle** | 0 (still pays power reservation + rent) | Negative | Burn |

**Design intent:** mining is the cash cow you slowly give up. Hosting is a stepping stone. Shell is safe and financeable. Full stack is the big swing. The player's portfolio across these four is Act II's main strategy.

**GPU rental is not a straight decline (sourced; don't smooth it):** the H100 1-year contract price went from **$8.0/hr (2023Q3) to $2.8 (2024Q4) and $1.9 (2025Q2)**, then **rose again to $2.35–2.6 in 2026H1** as demand outran the Blackwell ramp. Hopper hardware kept 35–65% of its value into 2026. The "Hopper isn't dead yet" rebound is a playable beat (§11).

---

## 5. Projects (the Deal Desk, folded into the hybrid loop)

### 5.1 Project card
A project converts N MW at one site (or a new site) to one target use. It has **3 slots**:
- **Power:** existing energized MW (instant), a grid upgrade (queue timer), or on-site gas (fast, +Heat, air-permit risk).
- **Tenant:** a tenant contract (`tenants.json`: 3 types, 9 cards), or "spot" (full stack only: sell capacity at the spot index).
- **Capital:** own cash, project debt, GPU-backed debt (DDTL), equity, a JV partner, or a backstop (§7).

### 5.2 Lifecycle (compressed from 07 §4)
`Proposed → Slots filled → Building (N quarters) → Live → (Sold / Held)`

| Step | BW | Rule |
|---|---|---|
| Open a project (pick site, MW, target use) | 1 | Shows a projected return (the "mini spreadsheet") |
| Fill a slot | 0–2 | Tenant = a negotiation (2 BW) or accept the offer (0). Capital = a lender pitch (2) or accept (0). Power from existing MW = 0 BW |
| Start building | 1 | Needs all 3 slots. Capital is drawn at the start |
| Sell a live project | 2 | Sold at the cap rate (§7.3) |

- **Order rule (from 07 §4):** financing needs a signed tenant or 100% own cash. Building needs all 3 slots. **Exception:** the pilot cluster (§5.5) needs no tenant.
- **Take-or-pay both ways [P1]:** a signed tenant sets a **ready-by quarter** (each tenant card has a window, e.g. 4–6 quarters for a hyperscaler, 3–5 for an AI lab).
  - Each quarter late costs **liquidated damages of 3% of annual contract value** (top of the 1–3% market range).
  - At **2 quarters late**, the tenant may walk. The chance is by tenant type: **hyperscaler 5%, neocloud 10%, AI lab 20%** (tenant cards range 2–28%).
  - Real basis: no public case of a hyperscaler terminating a miner-turned-AI-host for delay through Sep 2026, so termination is a tail event and damages are the common case.
  - The real cost of lateness is interest accruing with no revenue (§12 anchor), not the penalty.

### 5.3 Build times and costs (`conversions.json`)
| Conversion | Capex per MW (2022Q4 → 2026Q3) | Build time |
|---|---|---|
| Mining → hosting (same ASIC site) **[P2]** | **~$0.1M** | Next quarter |
| GPU hall / non-ASIC space → hosting | $1.5M → $3.0M | 1 quarter (paid by the Merge choice at no extra cost) |
| Mining/idle → AI shell (retrofit, liquid cooling) | **$6M → $10M** (cheapest real case: Riot Rockdale $3.6M; IREN $6–7M) | 3 quarters |
| New AI shell (greenfield, energized land) | **$10M → $18M** | 5 quarters |
| Shell → full stack (add owned GPUs) | **+$18M → +$30M** (weakest-sourced line; tune in playtesting) | +1 quarter, plus the GPU allocation queue in 2023–24 |
| Grid upgrade (+MW at a site) | **$0.75M** | By region: Texas 3–8 quarters · Virginia/PJM 20–32 · Ohio 8–16 · Georgia 8–16 · Arizona 6–12 · Nordics 4–12 |
| On-site gas | **$1.5M** | 2 quarters, Heat +20, air-permit lawsuit risk (the xAI Memphis pattern) |

Carries over in a retrofit: substation, land, permits, some transformers. Doesn't: cooling (air → liquid), rack density and redundancy, fibre. PUE rises from < 1.05 (mining) to 1.35–1.40 (AI).

### 5.4 GPU know-how (confirmed)
A simple 0–3 level for the full-stack path, representing the CoreWeave learning curve.
- **0:** full stack costs +10% and GPU allocation waits +1 quarter.
- **1:** normal. Reached with the gpu_cloud Merge choice, or when a first cluster goes live (a pilot counts).
- **2:** at 2 live clusters: +5% utilisation on spot.
- **3:** at 100 MW full stack: the hyperscaler overflow tenant (`tc_hyperscaler_overflow`, the Microsoft–CoreWeave pattern) becomes available.

### 5.5 Pilot cluster: the small-player entry point (new) [P3]
The pack found that the cheapest real AI build is too big for a small Act II company to finance. Its proposed 5 MW pilot at $18M counts only the shell. Adding GPUs, 5 MW costs **~$120M+**. The right entry point is much smaller:
- **Size:** 0.5–2 MW, in 0.5 MW steps. Full stack, **spot-only** (no tenant slot).
- **Cost (2023):** ~$26M per MW all-in (retrofit ~$6.5M + ~750 H100s at ~$20M), so a 0.5 MW pilot is ~$13M.
- **Financing:** the Act I **equipment loan** extends to GPUs, secured on the GPUs themselves. DDTLs still need a rated tenant contract, so they're unavailable to spot-only pilots.
- **Available** from 2023Q1, subject to the GPU allocation queue. Build: 1 quarter plus the queue.
- **Why it's the bet:** 2023Q3 spot ran ~$5/GPU-hr (1-year contracts $8). A 1 MW pilot could gross ~$25–30M in its first year, then far less as spot fell to ~$1.5–2 by 2025. Early and small is how CoreWeave started.
- **For lifeline and small runs,** the realistic first AI step is a **5 MW shell lease** with a tenant that funds part of the capex (`tc_realname_coreweave_style`: capex credit up to $1.5M/MW) plus project debt. Equity needed ≈ $7M. The scope's check "a lifeline run reaches a live AI project by 2024Q4 in ≥ 70% of runs" tests this path.

---

## 6. Sites and regions (`regions.json`, `sites_act2.json`)

- **No map yet.** Every site gets one of six **region tags**. Power prices are ≈ estimates; the ranking between regions is sourced.

| Region | Industrial power $/kWh (2022Q4 → 2026Q4) | Grid queue | Heat mod | Anger mod | Key policy events |
|---|---|---|---|---|---|
| Texas (ERCOT) | 0.033 → 0.055 | 12–24 months | 0.9 | 1.0 | SB6 large-load reform (20 Jun 2025; curtailment equipment mandatory after 31 Dec 2025); **Abbott halts new ERCOT connections (3 Aug 2026)** |
| Virginia (PJM) | 0.045 → 0.085 (fastest rising) | **60–96 months** | 1.3 | 1.4 | Warrenton election losses (Nov 2024); $0.011/kWh large-load tax (Jun 2026); PW Digital Gateway exits (Jul 2026) |
| Ohio (PJM/AEP) | 0.042 → 0.065 | 24–48 months | 1.05 | 1.1 | AEP Ohio data-center tariff (Apr 2026): **cost allocation, not a moratorium** |
| Georgia | 0.040 → 0.060 | 24–48 months | 1.0 | 1.05 | Georgia PSC cost-shift rule (Mar 2026) |
| Arizona | 0.036 → 0.055 | 18–36 months | 1.1 | 1.15 | 3-year incentive pause (13 Jun 2026) |
| Nordics | 0.030 → 0.045 (flattest) | 12–36 months | 0.7 | 0.6 | Welcoming (Nebius Finland build-out); no moratorium |

- Policy events hit differently. **Moratoriums block new projects**; **cost-allocation tariffs raise power costs and Anger**; **incentive pauses raise opex**.
- **Non-region state actions** appear as news or cards, not as region tags: NY's statewide hyperscale moratorium (EO 62, 14 Jul 2026), NJ Fair Share Act, the Illinois incentive pause.
- **Scouting** (1 BW, 2–3 offers, one hidden flaw from 8 in `sites_act2.json`) offers **distressed miner sites** (2022Q4–2023, ≈ $150–400K/MW), **energized land** (2024+, $3–12M/MW once an AI deal is announced) and greenfield.
- **Community Heat carries over,** scaled by the region's Heat modifier. The 05 §3 thresholds (lawsuits, voided zoning, moratoriums) replace Act I's moratorium and shutdown rules for AI projects. **Ratepayer Anger** rises with MW built in a region, × the anger modifier; PJM starts climbing in 2024Q4 with the capacity-price spike ($28.92 → $269.92/MW-day).

---

## 7. Capital (`lenders.json`, `capital_act2.json`)

### 7.1 Instruments
| Instrument | Available | Terms | Needs |
|---|---|---|---|
| Act I loans (equipment, crypto-backed) | Equipment: always (now also secured on GPUs). Crypto-backed: **unavailable 2022Q4–2023Q2** (FTX) | As in Act I | As in Act I |
| **Project debt** | 2023Q3+ | 60–75% of capex. Rate **10.5% (2023Q3) → 8.5% (2024Q4) → 7.0% (2025Q4) → 7.5% (2026Q3)**. Tenor = contract term. DSCR covenant ≥ 1.12× | A signed tenant rated ≥ BBB |
| **GPU-backed DDTL** | 2023Q3+ (CoreWeave's $2.3B facility, 3 Aug 2023) | 50–70% of GPU cost. **Spread by tenant credit and era:** SOFR + ~900 bps (2023) → +550 (2024Q4) → +420 (2025Q4); **+225 with IG tenants from 2026Q1** (DDTL 4.0, rated A3); **+450–475 with non-IG tenants in 2026Q2–Q4** (DDTL 5.0/5.5) | A GPU contract with any rated tenant |
| **Equity raise** | Private: any quarter. Public: at-the-market offering or convertible notes (coupon 0–2.5%, conversion premium 25–40%) | Priced at the valuation (§8); **dilution 8–20% of the raise**, shown before confirming | 2 BW |
| **JV partner** | 2025Q1+ | Funds 50–80% of equity for 50–80% of the project (Blue Owl pattern; TeraWulf–Fluidstack hybrid) | 100 MW+ project |
| **Big-tech backstop** | 2025Q3+ (Google–Cipher, 25 Sep 2025) | Guarantees ~47% of the lease; takes **3–6% of the company as warrants** (Google: $1.4B backstop for 5.4%). Expensive, bankable credit enhancement | Tenant rated ≤ BB (neocloud or AI lab) |

**Base rate (SOFR / Fed funds, sourced shape):** 4.30% (2022Q4) → **5.33% peak (2023Q4–2024Q3)** → 4.25–4.50% (Dec 2024) → 3.50–3.75% (Dec 2025) → **a hike back to 3.75–4.00% in Sep 2026**, which carries into the 2026Q4 aftershock.

### 7.2 Credit rating [P4]
One rating, recalculated each quarter from **debt/EBITDA × backlog quality**. It sets the rate and max leverage for new corporate debt. Heat stays the community system; no other meters.

| Debt / EBITDA | Weak backlog | Mixed | Strong backlog |
|---|---|---|---|
| < 2× | B+ | BB | **BBB** |
| 2–4× | CCC+ | B+ | BB+ |
| 4–6× | CCC− | CCC+ | B |
| > 6× | CCC− (foreclosure risk, §7.4) | CCC | CCC+ |

- **Backlog quality:**
  - weak = mostly AI-lab or unrated tenants, no backstop
  - strong = mostly hyperscaler/IG tenants, or backstopped
  - mixed = in between
- **A cash runway under 4 quarters** lowers the rating by one notch.
- **Corporate ratings top out at BBB.** The design's "A" lives at the **project level** instead: secured debt on a strong-backlog project prices as A, even when the company is B+. That's the CoreWeave pattern: B+ corporate, A3 on DDTL 4.0.
- **Scripted notches:** FTX gives −1 notch to all miners for 2 quarters. The SVB card's "ride it out" choice costs −1 notch.

### 7.3 Selling a project: cap rates
Live shell projects can be sold at the cap rate for their tier. Selling recycles capital into bigger deals (the 05 §1 "package and sell" loop). Hyperscale leases with 100 MW+ sell at the NNN rate; smaller powered shells at the shell rate.

| Tier | 2023 | 2024 | 2025 | 2026Q1–Q3 | **2026Q4 aftershock** |
|---|---|---|---|---|---|
| Hyperscale NNN (100 MW+) | 7.0% | 6.25% | 5.25% | 5.25% | **6.25%** |
| Powered shell (stabilized) | 7.5% | 6.75% | 6.0% | 5.75% | **6.5%** |

- Real cap rates **compressed** through 2026Q3 as the asset class matured. Early, credit-backed builders are rewarded with rising sale values; that is realistic and a good incentive.
- The repricing lands in **2026Q4**, tied to three real events: Oracle's force majeure on Project Jupiter (25 Sep 2026), the DDTL 5.0/5.5 spread widening (May–Aug 2026), and the Sep 2026 rate hike.
- The squeeze **before** 2026Q4 comes through **Heat, moratoriums and wider spreads for weak-tenant debt**, not through cap rates.

### 7.4 Lose condition
As in Act I (cash < 0 → forced sales → bust). **Added:** missing debt service for 2 quarters → the lender forecloses on that project's collateral. No real AI-infrastructure foreclosure happened through Sep 2026 (the realized distress was Compute North and Core Scientific in 2022), so the ≥ 50% overleverage anchor (§12) is a design choice, not a calibrated rate.

---

## 8. Valuation and score

**Sum of the parts** (it extends valuation.ts; the formula stays EV/EBITDA):

`valuation = Σ(unit EBITDA × 4 × unit multiple) + cash + treasury − debt + contracted backlog value`

| Quarter | Mining multiple | AI infra multiple |
|---|---|---|
| 2022Q4 | 4 | 10 |
| 2023Q4 | 8 | 20 |
| 2024Q4 | 9 | 26 |
| 2025Q4 | 7 | 30 (peak around the CoreWeave IPO, Mar 2025) |
| 2026Q1 | 6 | 24 |
| 2026Q2 | 6 | 20 |
| 2026Q3 | 6 | 18 |
| 2026Q4 | 5 | **15** (aftershock floor; CoreWeave's real LTM multiple compressed to 15.0× from 38.8×) |

- Interpolate linearly between the listed quarters (2022Q4 → 2023Q4, and so on).
- The 2026 AI-infra path (24 → 20 → 18 → 15) replaces the pack's 24/20 and applies the confirmed 15–18× floor. **`capital_act2.json` › `era_multiple_ev_ebitda.ai_infra` must be updated to match.**
- **Pivot premium:** a miner that announces an AI deal gets **mining multiple +2** from the quarter it signs (the 2024Q2 Core Scientific–CoreWeave re-rating).
- **Sanity check, not a formula:** the sim should report EV/MW per company. It should land in the pack's bands: pure mining ~$0.4–1.2M/MW, announced AI $3–12M/MW, stabilized IG-backed $18–27M/MW. A miss means the multiples or the backlog weights need tuning.
- **Contracted backlog value** = a share of remaining take-or-pay revenue, weighted by tenant credit: **A/AA 15%, BBB 10%, AI lab 5%, spot 0%** (confirmed). It rewards signing long contracts before they turn a profit, as the market did.
- **Score at the end of Act II:** founder net worth + peak valuation + rank against rivals (same as Act I).
- **Title bands** (by end valuation, `text_act2.en.json`):
  - < $100M: Also-Ran
  - $100–400M: Survivor
  - $0.4–1B: Contender
  - $1–3B: Developer
  - $3–10B: Scale-Up
  - $10B+: Hyperscaler-Adjacent

---

## 9. Live quarter: interrupts and mini-games (`interrupts_act2.json`)

**Carried over:**
- **Price alert:** BTC, plus a new GPU spot alert.
- **Curtailment:**
  - Texas mining sites can still profit from curtailment.
  - **AI sites that curtail pay an SLA credit of 15% of the monthly charge** (capped at 50%).
  - From 2026Q1, ERCOT can curtail sites of 75 MW+ directly (SB6).
- **Neighbour complaint.**
- **Failure wave (mining and GPUs).** GPU clusters of 10,000+ GPUs lose 0.5–1% of the cluster per wave (Meta's Llama 3 run: 466 interruptions in 54 days, ~50% GPU/HBM). Repair costs ~$30K per replaced GPU; most incidents are short.
- **Margin call.**
- **Negotiation:** same 3-round mini-game, now for tenants and lenders, with hidden limits from `tenants.json` / `lenders.json`.
- **Distressed auction.**

**New:**
| Interrupt | Trigger | Choices |
|---|---|---|
| **Construction delay** [P5] | **15% per building project per quarter** (→ 39% of 3-quarter builds and 56% of 5-quarter builds slip at least once; real rate 30–50%) | **Accelerate:** pay 10% of the project's capex, no slip · **Accept the slip:** +1 quarter · **Change contractor:** +1 BW next quarter, then a 50% chance of no slip |
| **Tenant RFP** | Scripted and random, weighted by the AI demand index (higher in 2024–25) | Bid now (opens a negotiation, 2 BW) / pass. A passed RFP can go to a rival. Counts as a card, not an interrupt |
| **GPU allocation** | 2023–24, any full-stack project ordering GPUs (60%) | **Pay a premium of 8% of project capex** for no delay / **wait 1 quarter** (lead times: 26 weeks in 2023Q2 → 4 weeks in 2024Q4) |
| **Spot price shock** | Scripted Jun 2025 (AWS −30–45%), then 15% random per quarter | Lock uncontracted capacity into a contract at the new price / stay on spot |

**Construction delay rule [P5]:**
- The design wants delays to be the most common interrupt, and this rate makes them so by frequency. No extra weight tuning is needed.
- A delay roll counts toward the 3-interrupt cap. When the cap is full, the delay **resolves silently as "accept the slip"** and is logged.
- A player with several builds is under constant pressure, but never gets a quarter of back-to-back pop-ups.

---

## 10. Rivals (`rivals_act2.json`)
The league table continues with 5 scripted rivals. Each has quarterly curves 2022Q4–2026Q3: MW energized and contracted, the mining/AI split, EH/s, revenue, EBITDA, market cap and debt. Sourced anchors are marked `verified`; the rest is interpolated.

| Rival | Style | Real arc the curve follows |
|---|---|---|
| **Core Scientific** | Landlord | Chapter 11 (Dec 2022) → emerges Jan 2024 → hosts CoreWeave (200 → 382 MW). EBITDA stays negative (−$29.7M FY2025). Rejects CoreWeave's ~$9B takeover (30 Oct 2025). "The tenant makes money; the landlord doesn't always." |
| **IREN** | Builder | $9.7B / 200 MW / 5-year Microsoft deal with 20% prepayment. AI still ~3% of revenue: backlog, not yet earnings |
| **Hut 8** | Treasury-heavy | 2024 profit was mostly BTC fair-value gains, which reversed in 2025. Beacon Point: 352 MW / 15 years / $9.8B |
| **Cipher** | Backstopped | Fluidstack leases with Google backstops (168 + 56 MW); site valued at $2.9M/MW (Jun 2026) |
| **CoreWeave** | Benchmark | FY2025 revenue $5.1B, debt $21.4B, backlog $66.8B. Always ranks above the player unless the player is on the great path |

Riot, Marathon and Bitfarms (Act I rivals) appear only in news: they pivoted partly and late.

---

## 11. Timeline: scripted events 2022Q4 → 2026Q4 (`events_act2.json`)

| Quarter | Event (date) | Game effect |
|---|---|---|
| 2022Q4 | FTX collapse (11 Nov) | BTC −25%. Crypto-backed loans unavailable until 2023Q3. −1 credit notch for 2 quarters |
| 2022Q4 | **ChatGPT launches (30 Nov)** | News card. AI demand index starts at 8 |
| 2022Q4 | Core Scientific Chapter 11 (20 Dec) | Distressed site auctions; the lifeline card (§2.2) |
| 2023Q1 | SVB collapse (10 Mar) | **No new debt for 1 quarter.** Card `ec04`: move cash (−$20K) or ride it out (−1 notch). Deposits were made whole, so no cash is lost |
| 2023Q2–Q4 | H100 shortage | GPU allocation interrupt active. H100 1-year contract **$8.0/hr (2023Q3) → $6.0 (2023Q4)**; spot $5.0 → $3.5 |
| 2023Q3 | CoreWeave's $2.3B GPU-backed facility (3 Aug) | Unlocks the DDTL; project debt also opens |
| 2023Q4 | Ordinals fee spike (Dec) | Card `ec06`: +8% mining revenue this quarter |
| 2024Q1 | BTC ETFs approved (10 Jan) | BTC rally; mining relief before the halving |
| 2024Q2 | **4th halving (block 840,000, Apr)** | Mining revenue per hash halves; hashprice < $50/PH/day. Old ASICs switch off |
| 2024Q2 | Core Scientific–CoreWeave hosting deal (Jun) | "Miner pivots to AI" becomes the story: pivot premium +2 on the mining multiple (§8) |
| 2024 | Scarcity peak | H100 1-year contract $4.2 (2024Q2) → $2.8 (2024Q4). Best time to lock in contracts |
| 2024Q4 | Warrenton, VA election losses (5 Nov); PJM capacity ×9 ($28.92 → $269.92/MW-day) | PJM Ratepayer Anger rises; Heat events start |
| 2025Q1 | Stargate announced (21 Jan) | Megadeal RFPs unlock |
| 2025Q1 | **DeepSeek shock (27 Jan)** (added) | Nvidia −~$589B in a day. **AI demand index −10 and AI multiple −3 for 2 quarters**, then recovery. Dedicated card `ec13` (§16.4) |
| 2025Q1 | CoreWeave IPO (28 Mar) | AI multiple peaks through 2025 |
| 2025Q2 | AWS cuts H100 prices ~30% (Jun); ERCOT SB6 signed (20 Jun) | Spot price shock (§9); Texas large-load rules |
| 2025Q3–Q4 | Google-backstopped miner leases (25 Sep); Meta Hyperion SPV (Oct); CoreWeave's rejected bid for Core Scientific (30 Oct); GPU depreciation debate (Nov); hashprice five-year low $38.20 (Nov) | Backstops (2025Q3) and JVs (2025Q1) available; a depreciation card; a mining squeeze |
| 2025Q4–2026Q2 | **Hopper rebound** (added) | H100 1-year contract rises $1.9 → $2.6. Hopper holders get a second wind |
| 2026Q1 | 75+ projects / $130B blocked; PJM 2027/28 auction short 6.6 GW; difficulty and hashrate start falling (miner capitulation) | Heat everywhere +10; PJM queue +4 quarters |
| 2026Q2 | Gallup: 71% oppose (13 May); DDTL 5.0 at SOFR + 450 for non-IG tenants (18 May); Arizona pause (13 Jun) | Regional moratorium and tariff cards; wider DDTL spreads for weak tenants |
| 2026Q3 | NY moratorium EO 62 (14 Jul); **ERCOT connections halted (3 Aug)**; DDTL 5.5 wider still (Aug); Fed hike (Sep); **Oracle force majeure on Project Jupiter (25 Sep)** | No new Texas grid upgrades for 2 quarters; a tenant force-majeure card; non-IG spreads +25 bps |
| 2026Q4 | **Aftershock** (speculative) | Cap rates +1.0 pt (hyperscale) / +0.75 pt (shell); AI multiple 15; lender spreads +100 bps for all ratings below BBB. Chapter report teases Act III and the 2030 renewal wall |

The event deck (`events_act2.json`) has **24 cards (12 scripted, 12 random)**. It replaces 07 §7's 20 cards for Act II.

---

## 12. Balance anchors (targets for the Act II sim)

Checked against real 2022–26 companies in the pack:
- **Good path:** carries ~20–40 MW, converts half to AI shell in 2023–24, signs a hyperscaler-quality tenant, sells one project. Ends Act II at **~$1–3B**. Real EV/MW puts a 20–40 MW portfolio with *announced* deals at $0.3–1.5B, so **the top half of the band requires at least one sold or stabilized project**, not just signed deals. That's intended: it rewards finishing builds.
- **Great path:** carries 100+ MW from the Texas + IPO route, goes full stack in 2023 at know-how 1, uses DDTLs. Reaches **$10B+** at the 2025 peak and survives 2026 with ≥ 12 months of cash runway. Confirmed: CoreWeave's own shape.
- **Pure miner:** never converts. Ends at **~$100–400M**, alive. Confirmed.
- **Overleveraged full stack:** > 6× debt/EBITDA with an AI-lab tenant and no backstop. **≥ 50% chance of foreclosure in 2026.** A design choice; there's no real base rate yet.
- **A 2-quarter construction delay** on a full-stack project costs **≥ 80% of that project's profit** (05 anchor, mechanical: interest runs, revenue doesn't).
- **Contract timing:** a full-stack contract signed in 2024 beats one signed after Jun 2025 by **at least 30% in project IRR**. This is a floor; the real gap is likely larger (H100 contract prices fell > 70% at the trough).
- **Pilot cluster (new):** a 1 MW pilot started in 2023Q3 pays back within 6 quarters on spot. The same pilot started in 2025Q2 does not pay back within Act II.
- **EV/MW sanity check (new):** each company type lands in its pack band (§8).

---

## 13. Scope for Alpha 0.2 (draft for the step 3 freeze)

**In:** everything above except the items below.
**Out (backlog):**
- The map (region tags only)
- Lobbying and political capital (Act III)
- SPVs and off-balance-sheet structures
- The Bubble meter and the hidden scenario draw (Act III)
- GPU generations beyond Hopper (H100/H200) → Blackwell (B200/GB200). GB300 and Rubin arrive in Act III
- Named tenant personalities beyond 3 types
- Refinancing (only selling is in)

**Cut order if it slips:**
1. JV partners
2. Backstops
3. On-site gas
4. GPU know-how levels (make it binary)
5. Hosting unit (merge into "mining")

**Never cut:** projects with 3 slots, the five MW uses, the pilot cluster, take-or-pay delay penalties, credit rating, the halving, the 2025 price reset.

---

## 14. Decisions resolved (27 Sep 2026)

1. **Floor (§2.2):** the lifeline card. A bankrupt miner's 20 MW site ($6.5M) at the Dec 2022 auction, with a bridge loan (14%, 8 quarters) sized to reach 20 MW + $5M. The preset company is only for standalone starts.
2. **Bandwidth (§3):** cap 8, earned. Base 3; +1 Chief of Staff; +1 at 50 MW energized; +1 at 200 MW; +1 from a new Act II hire, the **Head of Development**.
3. **Meters (§7.2):** credit rating only. Heat stays the community system. A Government meter arrives with lobbying in Act III.
4. **Backlog (§8):** yes, weighted by tenant credit. Share of remaining take-or-pay revenue counted: 15% for A/AA tenants, 10% for BBB, 5% for AI labs, 0% for spot.
5. **Regions (§6):** region tags plus a region panel on the Sites screen. No map in Alpha 0.2.
6. **Targets (§12):** good path ~$1–3B at the end of Act II; great path $10B+ at the 2025 peak; pure miner ~$100–400M.
7. **Act length:** ends at 2026Q4 (17 quarters). 2026Q4 is a speculative "aftershock" quarter (§7.3, §11), and the chapter report teases Act III.

---

## 15. Open questions (not resolved; tune or research later)

1. **ASIC price index by efficiency tier ($/TH):** the pack's weakest-sourced series. The tier bands are sourced, but the $/TH values in `market_weekly.csv` are directional. Pull `data.hashrateindex.com/asic-index-data/price-index` before locking mining balance.
   - *M22 (5 Oct 2026, retrieval attempt):* Luxor's Hashrate Index ASIC Price Index is not freely downloadable: the history sits behind the site's Premium tier and its paid data API (checked `hashrateindex.com/rigs` and `data.hashrateindex.com`, 5 Oct 2026). Per the design thread, no workaround: the four tiers (`asic_price_usd_th_old/mid/new/latest` in `market_weekly_act2.csv`) **stay estimates**, flagged by the row's `estimate`. The intended mapping, if a licence is obtained: the index's efficiency bands (> 38 J/TH, 25–38, 19–25, < 19) → old / mid / new / latest.
2. **Full-stack incremental build cost ($18–30M/MW):** triangulated, not observed. The first thing to tune in playtesting.
   - A related inconsistency: `gpus.json` uses 1,000 H100s/MW (chip TDP only), but real all-in draw is ~1.2–1.4 kW per GPU, i.e. **~750 GPUs/MW** (01-02 §4a).
   - Use 750 for revenue and cost per MW, and fix `gpus.json`.
3. **SOFR and high-yield spread series:** shape-accurate but not checked against FRED cell by cell. Pull the FRED CSVs before the final balance lock.
   - *Resolved in M22 (5 Oct 2026):* replaced with FRED data by a committed script (`tools/data/real-market.ts`, `npm run data:real`) from committed raw downloads (`tools/data/raw/`), retrieved 5 Oct 2026, last observation 2026-10-01.
     - **SOFR:** FRED series `SOFR` (daily, %) → `sofr_pct` = the quarter's average of daily values, 2 dp. Real for 2022Q4–2026Q3 (16 quarters).
     - **High-yield spread:** FRED series `BAMLH0A0HYM2` (ICE BofA US High Yield OAS, daily, %) → `hy_spread_bps` = the quarter's average × 100, whole bps. FRED shows only the last 3 years of this licensed series (from 2023-10-03), so it is real for 2023Q4–2026Q3 (12 quarters).
     - A quarter is real only when the download covers all of it (an observation within its first and last 7 days); the rest **stay estimates**: SOFR 2026Q4, HY 2022Q4–2023Q3 and 2026Q4.
     - *M23.1:* SOFR 2026Q4 = the last FRED observation carried forward (3.87% on 2026-10-01; was the 4.0% estimate), still flagged an estimate. Seam into Act III: 2026Q4 3.87% → 2027Q1 3.95% (s0, s1, s3) / 4.00% (s2), +8 to +13 bp (was −5 to 0 bp).
     - Per-row flags `sofr_estimate` and `hy_spread_estimate` say which values are real; the row's `estimate` stays True while any column in it is an estimate.
     - **Still estimated:** the DDTL spread (`ddtl_spread_bps`, no public series), the ASIC tiers (item 1), and every Act III scenario series (2027+, forecasts by design).
4. **Liquidated-damages rate (3%/quarter):** a design default; real contracts don't disclose it.
5. **West Virginia pre-emption law** (mentioned in 01-02) couldn't be re-confirmed; left out of `regions.json`.
6. **News ticker:** 25 of ~35 headlines written; 10 more needed (a text-only follow-up).

---

## 16. Decisions from the content pack (27 Sep 2026)

### 16.1 Accepted as researched
- **Merge head starts:**
  - gpu_cloud corrected to $0.15/GPU-hr at 40%
  - hosting corrected to $0.075/kWh
  - sell_gpus and hold_and_wait confirmed
- **Lifeline card** ($6.5M, 20 MW, 14%, 8 quarters, $5M floor) and **standalone preset**: confirmed.
- **Backlog weights** 15/10/5/0: confirmed.
- **Era multiples:** pack values adopted. **2026 AI-infra floor lowered to 15–18×** (path 24 → 20 → 18 → 15).
- **GPU know-how, hosting-to-shell discount (−25% / −1 quarter), build costs and times, region profiles, tenant cards, lender instruments, GPU allocation and spot-shock interrupts:** adopted as in the pack.

### 16.2 Design flag 1: cap rates. Reframe confirmed
- Cap rates compress through 2026Q3 (to 5.25% hyperscale / 5.75% shell).
- The widening lands only in the **2026Q4 aftershock** (+1.0 / +0.75 pt), tied to Oracle's force majeure, DDTL 5.0/5.5 and the Sep 2026 hike.
- Additional point: the 2026 "squeeze" before Q4 is **credit-tier-specific** (non-IG DDTL spreads widen from May 2026; Heat and moratoriums bite). Strong-tenant builders keep getting cheaper money all year, which is what really happened.

### 16.3 Design flag 2: construction delays. Agreed, with a rule [P5]
- Delays become the most common interrupt **by frequency, not by weight**: a flat 15% per project per quarter, giving 39–56% of builds a slip, matching the real 30–50%.
- When the interrupt cap is full, the slip resolves silently. Acceleration costs 10% of capex.
- **Paired with [P1]:** because delays are now common, the lateness penalty is 3% of annual contract value per quarter (not the earlier "1 quarter of revenue", which was ~8× higher). Walk-away chance is set by tenant type.
- Delays still hurt mostly through interest, which keeps the ≥ 80% anchor.

### 16.4 DeepSeek: timeline + dedicated card
- Added to §11 with a real market effect: AI demand −10 and AI multiple −3 for 2 quarters.
- Card `ec13` gets a third choice so it's a real decision:
  - **Delay a marginal project** (+1 quarter; avoids spot exposure)
  - **Stay the course** (default)
  - **Buy the dip:** GPUs −10% in the next Plan phase, 1 BW
- The pack's note that demand rebounds within ~2 quarters rewards the bold choice. That's historically right, and players can't know it in advance.

### 16.5 Pushbacks on the pack (confirm or override)
- **[P1] Take-or-pay:** 3% of annual contract value per late quarter, and walk-away chance by tenant type (5/10/20%). Replaces the flat 50% walk chance and the "1 quarter of revenue" penalty. Basis: the pack's own finding that terminations are a tail event.
- **[P2] Mining → hosting capex:** ~$0.1M/MW, not the pack's $1.5–3M. Hosting ASICs on a site already built for ASICs needs almost no work. The pack's figure applies to converting GPU halls, which the Merge "hosting" choice covers.
- **[P3] Pilot cluster sizing:** 0.5–2 MW, not 5 MW. The pack's $18M for 5 MW counts only the shell; with GPUs, 5 MW costs ~$120M+. A pilot is ~$26M per MW, spot-only, financed by the equipment loan on GPUs. Small players' realistic first AI step is a 5 MW shell with a tenant capex credit.
- **[P4] Credit rating range:** corporate ratings run CCC− to BBB (the pack's matrix). "A" exists only on secured project debt with a strong backlog (the CoreWeave B+ / A3 pattern). The matrix's "D (foreclosure)" cell becomes CCC− plus the §7.4 foreclosure rule, so a rating never forecloses by itself.
- **[P5] Construction delay rate:** a 15% per-quarter roll, not a 30–50% per-quarter roll. A per-quarter rate of 30–50% would make ~80% of builds slip.

### 16.6 Content-file fixes needed (for Claude Code or a data pass)
- `capital_act2.json` › `era_multiple_ev_ebitda.ai_infra`: 2026Q1 24, Q2 20, Q3 18, Q4 15.
- `gpus.json` › `gpus_per_mw_it_load` for H100/H200: 1,000 → **750**.
- `tenants.json` › `take_or_pay_terms`: penalty 3% of annual contract value per quarter; replace `termination_chance_at_2q_late` 0.50 with the per-type `walk_chance_late_2q`.
- `conversions.json`: add `mining_to_hosting_same_site` at $100K/MW, 0 build quarters; relabel the existing entry as the GPU-hall conversion.
- `conversions.json` or `sites_act2.json`: add the **pilot cluster** project tier (0.5–2 MW, spot-only, equipment-loan financeable, from 2023Q1).
- `lenders.json` › `credit_rating_mapping`: the > 6× weak cell becomes CCC−; add the "project debt can rate A" note and the runway notch.
- `interrupts_act2.json` › `construction_delay`: 15% per project per quarter, accelerate = 10% of capex, silent resolution when the cap is full.
- `events_act2.json` › `ec13`: add the "buy the dip" choice and the scripted AI demand and multiple effects.
- `text_act2.en.json`: 10 more ticker headlines. The tooltip `tt03` says "CCC to A" and "replaces four Act I stakeholder meters": change it to "CCC to BBB" and "Act I had no such meter".

---

## 17. Next steps
1. **Tudor confirms or overrides [P1]–[P5]** (§16.5).
2. **Step 3:** reconcile `20-alpha-0.2-scope.md` v0.9 → v1.0 against this doc and freeze it (its §7 checklist). Update `21-act-ii-wireframe-prompt.md`'s example data: the pilot cluster, the rating capped at BBB, 2024Q2 prices.
3. Apply the §16.6 content-file fixes, then Claude Code builds Act II in batches, as with Act I.
