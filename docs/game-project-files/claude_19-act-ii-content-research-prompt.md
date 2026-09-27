# Deep research task: Act II content and data pack for "Garage to Gigawatt"

*(Paste everything below this line into a new thread attached to the "Game project" Project. It's written to run in one go.)*

---

## Your role and the goal

You are the research lead and content designer for a solo-developed, AI-assisted web game called **Garage to Gigawatt** (working title). It's a grounded, finance-first business simulation. **Act I (a crypto miner growing from a garage in 2017 to the Ethereum Merge in Sep 2022) is built and balanced.** The developer is now building **Alpha 0.2: Act II, "The Pivot and the Boom", 2022Q4 → 2026Q4 (17 quarters).** In Act II, a mining company turns its energized megawatts into AI data-center capacity, through the FTX winter, the ChatGPT shock, the H100 shortage, the megadeal era and the 2026 backlash.

Your job: **research the real 2022Q4–2026Q3 world of bitcoin mining, AI data centers, GPU clouds and their financing, and turn it into a complete, source-backed content and data pack** that a developer (working with Claude Code) can load straight into the game. That means real numbers, real history and ready-to-use event cards.

Work through the whole task in one go. Don't stop to ask clarifying questions. Where something is ambiguous, pick the most sensible option, state it as an assumption, and carry on.

---

## Step 0: Read the project docs first

Read these Project docs before researching, in this order:

1. `claude/18-act-ii-design.md`: **the Act II design (v1.0). It's the source of truth.** Everything you produce must fit it. Every value marked ⚙ or ≈ in it is a placeholder that you must confirm or replace.
2. `claude/05-systems-draft.md` §1: the economy model's deal results (base neocloud and shell deals, delay and default scenarios). These are the balance anchors.
3. `claude/01-02-industry-and-timeline.md`: industry research (unit economics §4, risks §5, timeline 2024–Sep 2026 §6, case studies §7). **Reuse and extend it; don't redo it.** Verify any number you carry over.
4. `claude/08-extended-universe-2017-2035.md` §1–4: the campaign arc and the Act I → Act II bridge.
5. `claude/act1-content/` (especially `11-act-i-content-pack.md`, `capital.json`, `sites.json`, `rivals.json`, `merge.json`, `market_quarterly.csv`): **Act I's file formats and conventions. Match them**, so the same loaders and schemas can be extended rather than rewritten.
6. `claude/10-alpha-0.1-scope.md`: how Act I's systems work (Plan phase, Bandwidth, live quarter, interrupts, Heat, negotiation).

---

## The game in brief (for context)

- **Loop (unchanged from Act I):** each quarter has a **Plan** phase (spend Bandwidth and money), a **live quarter** (13 weekly sub-steps with up to 3 interrupts), then a **quarter report**. Bandwidth: base 3, max 8 in Act II.
- **The core asset is energized megawatts.** Each MW at a site is in one use: **mining** (the Act I sim continues, including the Apr 2024 halving), **hosting** third-party ASICs, **AI shell lease** (the tenant brings GPUs), **AI cloud / full stack** (the player owns GPUs), or **idle**. Changing use costs capex and takes quarters.
- **Projects** convert MW to a new use. Each has 3 slots: **Power** (existing MW, grid upgrade, or on-site gas), **Tenant** (a contract, or spot for full stack), and **Capital** (cash, project debt, GPU-backed DDTL, equity, JV, backstop). Signed tenants set a ready-by date, with **take-or-pay** delay penalties.
- **Capital:** a new **credit rating** (CCC→A) sets rates and leverage. Valuation = Σ(unit EBITDA × 4 × unit multiple) + cash + treasury − debt + **credit-weighted contracted backlog** (A/AA 15%, BBB 10%, AI lab 5%, spot 0% of remaining contracted revenue).
- **Sites** have **region tags** (no map): Texas/ERCOT, Virginia/PJM, Ohio, Georgia, Arizona, Nordics. Community Heat carries over from Act I and scales with MW. A regional Ratepayer Anger rises with MW built.
- **Entry:** the player's Act I company carries over (cash, sites, MW, machines, stake, debt). Weak runs get a "distressed lifeline" (a bankrupt miner's 20 MW site, bought with a bridge loan, Dec 2022). The Merge choice (sell GPUs / GPU cloud / hosting / hold) gives a head start.
- **Rivals** follow scripted curves: Core Scientific, IREN, Hut 8, Cipher, and CoreWeave as the benchmark.
- **Tone:** grounded, lightly wry, never cartoonish. **Real company names are allowed; no real people in events; no logos.** Negative claims about real companies must be factual and sourced.

### Balance anchors to confirm or correct (from 18 §12 and 05 §1)

| Check | Target |
|---|---|
| Good path: 20–40 MW, half converted to AI shell in 2023–24, one hyperscaler-quality tenant, one project sold | Ends Act II at **~$1–3B** valuation |
| Great path: 100+ MW, full stack from 2023, DDTLs | Peaks at **$10B+** in 2025, survives 2026 with ≥ 12 months of cash runway |
| Pure miner, never converts | Ends at **~$100–400M**, alive |
| Overleveraged full stack (> 6× debt/EBITDA, AI-lab tenant, no backstop) | **≥ 50% chance of foreclosure in 2026** |
| 2-quarter construction delay on a full-stack project | Costs **≥ 80%** of that project's profit |
| Full-stack contract signed in 2024 vs after Jun 2025 | 2024 wins by **≥ 30%** in project IRR |
| Base neocloud deal (100 MW, 5-year pre-sale ~$2.20/GPU-hr, 75% debt at 9.5%) | ~2.0× equity in 5 years, IRR ~18% |
| Base shell deal (100 MW, ~$1.8M/MW/yr lease, sold at a 6.25% cap rate) | ~3.85× equity; needs friction |

Compare these with the real pivot miners (Core Scientific, IREN, Cipher, TeraWulf, Hut 8) and CoreWeave, quarter by quarter. If real data contradicts an anchor, say so and propose a corrected value with the math.

---

## What to research

For every number, give a **source** and say whether it's **sourced** or an **estimate (≈)**. Where sources disagree, give the range and pick a game value. Research ends at **Sep 2026**. For **2026Q4** (the one speculative quarter, an "aftershock" after the Oracle force majeure), extrapolate conservatively and mark every value ≈.

### A. Market time series, 2022Q4 → 2026Q4 (quarterly; weekly only where noted)
1. **Bitcoin:** weekly BTC price, difficulty, network hashrate, subsidy (the Apr 2024 halving), fee share, **hashprice ($/PH/day)**, and the Hashrate Index ASIC price index ($/TH, by efficiency tier). Match the column format of Act I's `market_weekly.csv`.
2. **GPU compute prices:** H100 (then H200 and B200/GB200) **rental $/GPU-hr**: hyperscaler on-demand, neocloud on-demand, spot/marketplace, and long-term contract (1–3 and 5 years). Also A100 for 2022Q4–2023. Quarterly, with sources (e.g. Silicon Data, SemiAnalysis, company disclosures, trade press).
3. **GPU purchase prices and supply:** unit or system prices for A100, H100 (HGX, 8-GPU servers), H200 and B200/GB200 NVL72 by quarter. Allocation lead times (the 2023–24 shortage). Release dates of each generation. Resale and residual values of older generations.
4. **Build costs per MW (IT load):** mining-to-AI retrofit (liquid cooling, electrical), greenfield AI shell, full stack including GPUs, and hosting conversion. Build times for each. Use company disclosures (IREN, Cipher, TeraWulf, Core Scientific, Hut 8, Applied Digital, CoreWeave) where possible.
5. **Financing conditions:** SOFR / Fed funds, high-yield and private credit spreads, DDTL spreads (CoreWeave DDTL 1.0 → 5.5), project finance terms, and data-center **cap rates** by year.
6. **Valuation multiples:** EV/EBITDA and EV/MW of listed **miners** vs **AI infrastructure** names (including pivoting miners and CoreWeave after its IPO) by quarter, to set the two era-multiple series in 18 §8. Also note the "pivot premium" miners got when they announced AI deals.
7. **Power:** industrial power prices by region tag (ERCOT, PJM, Ohio, Georgia, Arizona, Nordics), the PJM capacity auction results, and ERCOT large-load rules (SB6). Grid interconnection queue times by region.
8. **AI demand indicators** (for a game "AI demand index"): hyperscaler capex by quarter, AI-lab revenue, announced data-center GW. Give a normalised 0–100 index per quarter with your method.

### B. Sites, regions and conversions
1. **Region profiles** for the 6 region tags: power price, queue time, typical land and shell costs, political climate, community sensitivity, and notable moratoriums or incentives (with dates).
2. **Distressed miner sites 2022Q4–2023:** real auctions and asset sales (Core Scientific Chapter 11, Compute North, Celsius mining, Greenidge, Argo's Helios sale to Galaxy, etc.) with $/MW paid. These set the "lifeline" card and the Act II auction prices.
3. **Energized land and powered shells 2024–26:** $/MW paid for sites with power (e.g. CoreWeave's offers for Core Scientific, the Galaxy Helios lease, IREN/Microsoft, Cipher/Fluidstack). This is the "your MW are gold" evidence.
4. **Conversion reality:** which parts of a mining site carry over to AI (substation, land, permits) and which don't (cooling, density, redundancy, fibre). Typical conversion timelines from announcement to energised AI capacity.
5. **Hidden flaws for Act II site offers:** 6–10 with a real basis (queue position lost, water limits, fibre distance, air permit for gas, zoning challenge, tenant-unfit power quality).

### C. Tenants and contracts
1. **Tenant types** (hyperscaler, AI lab, enterprise/other neocloud) with credit profile, typical price, term, prepayment %, SLA and penalty terms, and real default or renegotiation behaviour.
2. **Real contracts** as calibration points, with MW, term, total value, $/MW/yr or $/GPU-hr, and backstop details. Candidates: Core Scientific–CoreWeave (2024), Cipher–Fluidstack (Google backstop), TeraWulf–Fluidstack, IREN–Microsoft, Hut 8, Applied Digital–CoreWeave, Galaxy–CoreWeave, CoreWeave–Microsoft/OpenAI/Meta, Nebius–Microsoft, Oracle–OpenAI.
3. **Take-or-pay and delay terms:** real ready-by dates, liquidated damages and termination rights. How often deliveries slipped.
4. **Hosting market 2022–24:** hosting rates ($/kWh all-in or $/kW/month) and client defaults in the winter.

### D. Capital
1. **Project debt and DDTLs:** LTV, rate, tenor, covenants (DSCR), and what collateral was needed. CoreWeave's 2023 $2.3B GPU-backed facility is the unlock event.
2. **Equity:** miner at-the-market offerings and convertible notes (2023–25) with sizes and discounts; private rounds for neoclouds.
3. **JV and backstops:** Blue Owl structures, Google's backstops with warrants (size, % equity), Meta Hyperion SPV.
4. **Credit ratings:** real ratings for the players where they exist, and a simple mapping from leverage and backlog to a CCC→A scale for the game.
5. **Distress:** bankruptcies and restructurings 2022Q4–2026Q3 (miners and data-center developers), with what triggered each, as calibration for the foreclosure rule.

### E. Scripted history: the Act II timeline
For each event in 18 §11 (FTX, ChatGPT, Core Scientific Chapter 11, SVB, the H100 shortage, CoreWeave's 2023 debt, BTC ETFs, the 4th halving, the Core Scientific–CoreWeave deal, the 2024 scarcity peak, Warrenton and the PJM capacity spike, Stargate, the CoreWeave IPO, the AWS −30% price cut, the Google backstops / Hyperion / depreciation debate, the 2026 blocked projects and PJM shortfall, Gallup and the moratoriums, the DDTL spread widening, Oracle's force majeure), give:
- the exact date(s)
- the magnitude (price moves, $, MW, bps)
- a one-line mechanical effect in game terms
Correct or add events if the research shows something important is missing (e.g. DeepSeek, Jan 2025).

### F. Rivals
For **Core Scientific, IREN, Hut 8, Cipher and CoreWeave**, quarterly 2022Q4–2026Q3:
- MW energized and MW contracted
- the split of those MW between mining and AI
- EH/s
- revenue and EBITDA
- market cap or valuation
- debt
- key moves
Interpolate gaps and mark them ≈. These become the scripted rival curves. Continue Act I rivals (Riot, Marathon, Bitfarms) only as a short note on how they pivoted or didn't.

### G. People and operations
1. **Act II hires:** keep the 5 Act I hires (updated salaries 2022–26) and add the **Head of Development** (+1 Bandwidth) plus up to 2 more that fit 18's systems (e.g. a Capital Markets lead who improves loan terms; a Government Affairs hire kept for Act III). Give real salary ranges.
2. **Operating costs** for AI shell and full-stack sites: staff per MW, maintenance, insurance, PUE, SLA penalties (≈).
3. **GPU failure rates** and replacement costs (e.g. Meta's Llama 3 training reports), for failure waves on GPU clusters.

---

## What to write (the content)

1. **~24 event cards:** re-time the 20 cards from 07 §7 to the Act II calendar and merge them with the 18 §11 scripted events. Aim for **12 scripted + 12 random**. Use Act I's `events.json` format. For each card:
   - `id`, `title`, trigger (date or condition), weight if random
   - body ≤ 60 words in the game's tone
   - 2–3 choices with effects in game variables (`cash`, `heat`, `grievance`, `bandwidth`, `delay_quarters`, `credit_notch`, `spot_price_mult`, `tenant_walk_chance`, …)
   - a default choice
   - the real basis in one line, with a source
2. **Interrupt definitions** for the new types in 18 §9 (construction delay, tenant RFP, GPU allocation, spot price shock) plus updates to the carried-over ones (GPU failure wave, curtailment for AI sites, tenant/lender negotiation).
3. **Tenant cards:** 8–12 tenant offers (fictional names per type, or real names where the contract is public and factual). Each has type, credit rating, price, term, prepayment, ready-by window, and walk-away behaviour.
4. **Lender cards:** 6–8 (bank, private credit, DDTL lender, JV partner, backstop provider) with terms by credit rating and era.
5. **The four Merge head starts** (18 §2.3): confirm or correct each ⚙ number (legacy GPU cloud revenue, hosting rates, conversion discounts) with sources.
6. **The distressed lifeline card** and **the standalone preset company** (18 §2.2, §2.4): final numbers.
7. **Rival profiles** for the 5 rivals (2 lines + style).
8. **Text:**
   - onboarding tooltips for Act II's first quarter (5–6: projects, MW uses, credit rating, backlog)
   - ~20 new glossary terms (DDTL, take-or-pay, cap rate, backstop, powered shell, neocloud, GPU-hr, PUE, SLA, …)
   - ~35 news-ticker headlines (1–2 per quarter)
   - chapter-report titles for the new score bands

---

## Output format

Produce **one research report plus a set of data files.** Save them to the Project under `claude/act2-content/` (or return them as files if you can't write to the Project).

| File | Content |
|---|---|
| `19-act-ii-content-pack.md` | Executive summary; findings per section A–G; **balance-anchor check** (each anchor: confirmed/corrected, with math); **design flags** (where 18 is unrealistic, with a fix); assumptions; open questions; full sources |
| `market_weekly.csv` | A.1 (BTC, weekly), same columns as Act I |
| `market_quarterly.csv` | A.1–A.8 quarterly (BTC, GPU rental and purchase prices, build costs, SOFR, spreads, cap rates, multiples, power by region, AI demand index) |
| `gpus.json` | GPU generations: specs, kW per GPU, GPUs per MW, quarterly prices, lead times, residual curves |
| `conversions.json` | Each MW use change: capex/MW, build quarters, what carries over |
| `regions.json` | 6 region tags with quarterly power price, queue, Heat and anger modifiers, policy events |
| `sites_act2.json` | Act II site offers (distressed, energized land, greenfield) with flaws |
| `tenants.json` | Tenant types + tenant cards |
| `lenders.json` | Instruments + lender cards + rating mapping |
| `capital_act2.json` | Era multiples (mining, AI infra), backlog weights, equity/ATM rules, lifeline and preset numbers |
| `rivals_act2.json` | 5 rivals with quarterly curves |
| `events_act2.json` | The event cards |
| `interrupts_act2.json` | New and updated interrupts |
| `hires_act2.json` | Hires with 2022–26 salaries and effects |
| `merge_headstarts.json` | Final numbers for the four head starts |
| `text_act2.en.json` | Tooltips, glossary, ticker, titles |

**Data conventions (same as Act I):**
- Quarters as `2023Q1`. Weeks as ISO Monday dates.
- USD nominal. Power in MW (IT load unless stated).
- Every real number gets `source` and `estimate: true/false`.
- Real company names only in rival, tenant and event data, and only for factual, sourced claims. No real people.
- At the top of the report, a **JSON schema sketch** per file. Reuse Act I field names wherever a concept is the same.

---

## Quality bar

- **Accuracy first.** Prefer primary sources: 10-K/10-Q/8-K/F-1/S-1 filings, earnings decks, ERCOT/PJM/EIA data, court filings for bankruptcies. Use trade press (DCD, The Information, SemiAnalysis, Hashrate Index, The Block, Bloomberg) to fill gaps.
- **Ranges, then a game value.** Show the range, pick one, say why.
- **Playability over precision.** Smooth noisy series and keep the real value alongside.
- **Scale check.** Act II runs from a ~$15M, 20 MW company to potential $10B+ companies. Flag anywhere the numbers make the small-company start unplayable (e.g. the minimum viable AI project is too big to finance), and propose the smallest realistic project size (e.g. a 5 MW H100 cluster, early 2023).
- **Flag design problems.** If the research shows an 18 mechanic is unrealistic, say so in "Design flags" with a fix. Don't silently change the design.
- **Completeness check at the end:** a table listing each file and section with its status (done / partial / missing and why).
