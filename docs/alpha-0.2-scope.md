# 20: Alpha 0.2 Scope (Act II: The Pivot and the Boom)

*v1.0 (frozen), 27 Sep 2026. Built from 18-act-ii-design.md v1.0, the Act II content pack (19) and the owner's decisions of 27 Sep 2026 ([P1]–[P5] confirmed; the pilot earns the neocloud price with a utilisation penalty; ETH gets a price series).*
*This document is the single source of truth for Alpha 0.2, as doc 10 is for Alpha 0.1. Where it differs from doc 18, this document wins; the differences are listed in §8.*

---

## 1. What the alpha has to prove

**One question:** *Is turning energized megawatts into AI capacity a tense, readable ~50-minute run, where timing, tenant choice and leverage decide the outcome, and where the Act I company you built still matters?*

**Target:** 17 quarterly turns (2022Q4 → 2026Q4), 45–55 minutes, 3–6 meaningful decisions per turn. It continues from an Act I save or starts from the preset. Desktop browser.

---

## 2. In scope: what gets built

### 2.1 Turn structure (unchanged from Act I)
- **Plan phase → live quarter (13 weeks) → quarter report.** Seeded RNG; golden replays still hold.
- **Act transition:** Merge decision → Act I chapter report → **Act II intro screen** (what carried over, the head start, the lifeline if applied) → 2022Q4 Plan phase.
- **Autosave** at the act boundary as its own slot ("Start of Act II"), so a player can replay Act II without replaying Act I.
- 2026Q4 is a speculative "aftershock" quarter (its market values are estimates).

### 2.2 Resources
| Resource | Act II rule |
|---|---|
| Cash, debt, coin treasury (BTC and ETH) | Carried over from Act I as is. ETH keeps a market price all act (§2.3) |
| Bandwidth | **Base 4** (owner, 28 Sep 2026; was 3); +1 Chief of Staff (one hired in Act I carries over; no other Act I bonus carries); +1 at 50 MW energized; +1 at 200 MW; +1 Head of Development. **Max 8** |
| MW by use | Each site's MW split into mining / hosting / AI shell / AI cloud / idle |
| **Credit rating (new)** | **Corporate ratings run CCC− to BBB** [P4], recalculated each quarter from debt/EBITDA × backlog quality (doc 18 §7.2 matrix). A cash runway under 4 quarters lowers it one notch. Sets the rate and max leverage of new corporate debt. **"A" exists only on secured project debt with a strong backlog** (the CoreWeave B+ / A3 pattern). A rating never forecloses by itself (§2.7) |
| GPU know-how (new) | 0–3 (doc 18 §5.4) |
| Community Heat | Carried over per site; grievance resets at the act boundary. AI-project thresholds from 05 §3 (delays, lawsuits, moratoriums) |
| Ratepayer Anger (new, per region) | Rises with MW built in the region; feeds Heat and moratorium cards |
| Valuation | Σ(unit EBITDA × 4 × unit multiple) + cash + treasury − debt + **projects under construction at capex spent so far** (owner decision 27 Sep 2026; they stop counting at cost once live and earning) + credit-weighted backlog (tenant A/AA 15%, BBB 10%, AI lab 5%, spot 0%). The backlog shown on the top bar and dashboard is the **remaining contracted revenue, unweighted**; only the valuation applies the weights. Era multiples: doc 18 §8 table (AI infra 2026: 24 → 20 → 18 → 15). Pivot premium: mining multiple +2 from the quarter the first AI deal is signed |

### 2.3 Market (scripted, from `docs/act2-content/` market files)
- **BTC:** weekly price, difficulty, hashrate, fee share and hashprice. **Hashprice is derived** from price, subsidy, fees and hashrate, as in Act I. The halving is on **20 Apr 2024** (subsidy 3.125 from the week of 22 Apr).
- **ETH:** weekly price 2022Q4 → 2026Q4 from real month-end closes (it values the ETH treasury and ETH-backed loans; no ETH mining after the Merge).
- **GPU compute:** H100 hyperscaler / neocloud / spot / 1-year contract rental prices, H200 / B200 / GB200 rental and purchase prices (`market_quarterly.csv`, `gpus.json`), allocation lead times.
- **Build costs per MW** by conversion type, by quarter (`conversions.json`, doc 18 §5.3).
- **Financing:** SOFR, credit spreads by rating, DDTL spreads by tenant credit and era, cap rates (compress through 2026Q3, widen only in the 2026Q4 aftershock).
- **Era multiples:** mining and AI-infrastructure series (doc 18 §8).
- **AI demand index (0–100):** drives RFP frequency and quality (2022Q4 = 8 → 2026Q3 = 88).
- **Power prices by region** and the PJM capacity price.

### 2.4 Business units (the five MW uses)
| Use | In alpha | Notes |
|---|---|---|
| Mining | ✅ | Act I sim, simplified UI (fleet per site). ASIC price tiers from the market file |
| Hosting | ✅ | All-in $/kWh, power passed through ($0.085 → $0.075 → $0.060), 4-quarter contracts, client default risk in winters. **Mining → hosting on the same site: ~$0.1M/MW, ready next quarter** [P2] |
| AI shell lease | ✅ | Tenant brings GPUs. 5–15-year contracts, $1.5–2.0M/MW/yr |
| AI cloud (full stack) | ✅ | Player owns GPUs, contracted or spot. **750 GPUs per MW.** GPU generations: **H100, H200 (Hopper) → B200, GB200 NVL72 (Blackwell)** |
| Idle | ✅ | Pays power reservation + rent |

### 2.5 Projects (the core new system)
- A project converts N MW at one site (or a new site) to one target use, through **3 slots**: **Power** (existing MW / grid upgrade / on-site gas), **Tenant** (contract or spot), **Capital** (cash / project debt / GPU-backed DDTL / equity / JV / backstop).
- Lifecycle: `Proposed → Slots filled → Building (N quarters) → Live → Sold or Held`.
- Actions: open a project (1 BW), fill a slot (0–2 BW: accept = 0, negotiate = 2), start the build (1 BW), sell a live project (2 BW, at the cap rate).
- **Order rule:** financing needs a signed tenant or 100% own cash; building needs all 3 slots. Exception: the pilot cluster.
- **Take-or-pay** [P1]: a signed tenant sets a ready-by quarter (hyperscaler window 4–6 quarters, AI lab 3–5). Each late quarter costs **liquidated damages of 3% of annual contract value**. At **2 quarters late** the tenant may walk: **hyperscaler 5%, neocloud 10%, AI lab 20%**. The main cost of lateness stays the interest that runs while nothing earns.
- **Projected return panel** in the Deal builder: capex, equity needed, annual revenue, EBITDA, payback, IRR ≈, and the effect on the credit rating. Readable, not a spreadsheet.
- **Smallest viable projects (reconciled):**
  - **Pilot cluster** [P3]: full stack, **0.5–2 MW in 0.5 MW steps, spot-only (no tenant slot)**, from 2023Q1, 1 quarter build plus the GPU allocation queue. **Cost ≈ $31–33M per MW in 2023** (750 H100s ≈ $24–26M + retrofit ≈ $6.75M; before networking), so a 0.5 MW pilot ≈ $16M. **Financed by the Act I equipment loan, secured on the GPUs** (DDTLs need a rated tenant). **Revenue: the H100 neocloud price × utilisation, starting at 70% and rising with GPU know-how** (+5 pts at know-how 2, +10 at 3; tune in the sim).
  - **5 MW shell lease** with a tenant capex credit (up to $1.5M/MW) plus project debt: equity ≈ $7–8M. This is the realistic first AI step for lifeline and small runs.

### 2.6 Sites and regions
- Region tags: **Texas/ERCOT, Virginia/PJM, Ohio, Georgia, Arizona, Nordics**, each with a power price, a grid queue, a Heat modifier, Ratepayer Anger and policy events (`regions.json`, doc 18 §6).
- **A region panel** on the Sites screen. **No map.**
- Scouting (1 BW) returns 2–3 site offers with one hidden flaw: distressed miner sites (2022Q4–2023, ≈ $150–400K/MW), energized land (2024+), greenfield (`sites_act2.json`, 8 flaws).

### 2.7 Capital
| Instrument | Unlock | In alpha |
|---|---|---|
| Act I loans: equipment (now also secured on GPUs), crypto-backed | Equipment always; crypto-backed unavailable 2022Q4–2023Q2 (FTX) | ✅ |
| Project debt | 2023Q3, needs a tenant rated ≥ BBB | ✅ |
| GPU-backed DDTL | 2023Q3, needs a GPU contract with a rated tenant; spread by tenant credit and era | ✅ |
| Equity raise / at-the-market offering (if public) | Any quarter, 2 BW | ✅ |
| JV partner | 2025Q1, 100 MW+ projects | ✅ (**first to cut**) |
| Big-tech backstop | 2025Q3, tenants rated ≤ BB | ✅ (**second to cut**) |
| Refinancing | — | ❌ backlog |

- **Lose rule:** cash < 0 → forced sales → bust (as in Act I). **Added:** 2 quarters of missed debt service → foreclosure on that project's collateral.

### 2.8 People
- Keep the 5 Act I hires, with 2022–26 salaries (`hires_act2.json`).
- Add the **Head of Development** (+1 BW) and the **Capital Markets Lead** (better terms on new debt: spread −50 to −100 bps, stronger opening in lender negotiations).
- The **Government Affairs Lead** in the pack is **out** (lobbying is Act III; backlog).
- The Ex-Utility Exec's queue effect applies to grid upgrades; the BD Lead's effect applies to tenant RFPs.

### 2.9 Live quarter: interrupts and mini-games
- **Carried over:** price alert (+ GPU spot alert), curtailment (Texas; AI sites curtail only with an SLA penalty), neighbour complaint, failure wave (+ GPU clusters, basis: Meta's Llama 3 failure report), margin call, negotiation (now tenants and lenders), distressed auction.
- **New:** construction delay, GPU allocation (2023–24, 60% of GPU orders: pay 8% of capex or wait 1 quarter), spot price shock (scripted Jun 2025, then 15% random per quarter).
- **Construction delay** [P5]: **15% per building project per quarter** (39% of 3-quarter builds and 56% of 5-quarter builds slip at least once; real rate 30–50%). Choices: accelerate (10% of capex, no slip) / accept the slip (+1 quarter) / change contractor (+1 BW next quarter, then 50% no slip). It is the most common interrupt by frequency. When the 3-interrupt cap is full it **resolves silently as "accept the slip"** and is logged.
- **Tenant RFP** is an event card, not an interrupt.
- Cap stays at **3 counted interrupts per quarter**.

### 2.10 Entry into Act II
- **Carry-over** per doc 18 §2.1 (cash, debt, BTC and ETH treasury, sites, MW, power contracts, Heat base + load, ASICs, founder stake, cap table, IPO status, hires at Act II salaries).
- **Floor:** under 20 MW energized **and** under $5M cash (owner, 28 Sep 2026: both; a cash-short company at 20 MW+ uses the normal capital tools) → the **distressed lifeline card** (`ec03`): a bankrupt miner's **20 MW site for $6.5M**, bought with a **bridge loan at 14% for 8 quarters**, sized so the player also reaches $5M cash.
- **Merge head starts** per doc 18 §2.3, each with its own intended opening (owner, 28 Sep 2026):
  - **gpu_cloud:** $0.15/GPU-hr at 40%, know-how 1; plus a guaranteed neocloud offer in 2023Q2 scouting, and the first pilot skips the GPU allocation interrupt. Opening: an early pilot.
  - **hosting:** $0.075/kWh, shell-ready −25% capex / −1 quarter; plus a guaranteed A/AA hyperscaler shell-lease offer in 2023Q3 scouting. Opening: a shell lease.
  - **sell_gpus:** the GPUs' cash at the game's used price; plus a one-off distressed ASIC fleet offer in 2023Q1 (up to 10 MW of S19j Pro-class machines at 60% of that quarter's ASIC price). Opening: cheap mining expansion, pivot later.
  - **hold_and_wait:** GPUs parked (no power cost, no revenue, resale value keeps decaying on the normal curve), sellable at any later Plan phase with a +25% scarcity premium in 2023Q2–2023Q4; +1 Bandwidth in 2022Q4 and 2023Q1. Opening: keep focus and optionality.
  - Check: at least 3 of the 4 head starts have a different best bot, and the matching bots' 2026Q4 medians are within ±30% of each other.
- **Standalone preset:** "Q4 2022: a mid-size miner": 40 MW across 2 sites (20 MW owned + 20 MW Texas lease on fixed power), S19-class fleet at 70% of capacity, $12M cash, $25M equipment debt, 45% stake, no IPO. The player picks a Merge choice on the first screen. A "New career → Start at Act II" option on the title screen.

### 2.11 Rivals
- 5 scripted rivals: Core Scientific, IREN, Hut 8, Cipher, CoreWeave (benchmark), with quarterly curves 2022Q4–2026Q3 (`rivals_act2.json`; 2026Q4 held or extrapolated).
- They bid in auctions and compete for RFPs (a passed RFP can go to a rival, shown in the log).
- League table by MW (AI / mining) and valuation.

### 2.12 Events
- **Scripted timeline: the 22 entries in `events_act2.json`** (includes DeepSeek, 27 Jan 2025).
- **24 event cards:** 14 scripted (ec01, 02, 04, 06, 07, 08, 12, 13, 14, 15, 18, 20, 22, 23) and 10 conditional or random (ec03, 05, 09, 10, 11, 16, 17, 19, 21, 24).
- **DeepSeek** (`ec13`): AI demand −10 and AI multiple −3 for 2 quarters; choices: delay a marginal project / stay the course (default) / buy the dip (GPUs −10% next Plan phase, 1 BW).
- Same data format and engine as Act I (seeded stream, 1 random card per quarter max, defaults on skip).

### 2.13 End and score
- **End:** 2026Q4 quarter report → **Act II chapter report**: career graph 2017–2026, peak valuation and quarter, founder net worth, rank, key moments (projects built, tenants signed, delays, foreclosures, the halving, the price reset), and an Act III teaser.
- **Score:** founder net worth at the end of 2026Q4 + peak valuation + rank.
- **Title bands** (end valuation): < $100M Also-Ran · $100–400M Survivor · $0.4–1B Contender · $1–3B Developer · $3–10B Scale-Up · $10B+ Hyperscaler-Adjacent.

### 2.14 Screens
Act I screens stay. Changes and additions:
1. **Title:** add "Start at Act II"
2. **Act II intro** (new): carry-over summary, head start, lifeline
3. **Plan dashboard:** MW-by-use bar, credit rating badge, backlog, AI demand index, GPU price sparkline
4. **Sites & Fleet:** region tag + region panel, MW split per site, the fleet per site (mining and GPU)
5. **Projects** (new): project cards grouped by stage, with timeline, slots and ready-by (the pilot shows no tenant slot)
6. **Deal builder** (new, modal): the 3 slots + the projected return panel
7. **Capital:** the rating (corporate, max BBB) with its inputs, debt stack by instrument, backlog by tenant
8. **Tenant / lender negotiation:** reuse the negotiation modal
9. **Quarter report:** MW by use, backlog, rating change, project milestones
10. **Act II chapter report** (extends the Act I one)
11. **Game over:** add the foreclosure variant

Layout source: the Act II wireframes (`21-act-ii-wireframe-prompt.md` v1.0 → Claude Design).

### 2.15 Other must-haves
- **Save:** save version 2 with an `act` field; an autosave slot at the start of Act II. Act I saves load into Act II correctly (**migration test**).
- **Onboarding:** 6 tooltips in 2022Q4 (MW uses, projects, credit rating, backlog, tenants, pilot cluster). Tooltip `tt03` fixed to "CCC to BBB".
- **Sim bots** for Act II: good, great, pure-miner, overleveraged, cautious-shell, **pilot**, **hosting-switcher**. Sim runs 2017 → 2026 in one pass, and Act II alone from the preset.

---

## 3. Not in Alpha 0.2 (backlog)
- The map (region tags only)
- Lobbying, political capital, a Government meter, the Government Affairs Lead (Act III)
- SPVs and off-balance-sheet structures; refinancing
- The Bubble meter, the Signals panel, the hidden scenario draw (Act III)
- GPU generations after GB200: GB300 NVL72 and Rubin (Act III); the A100 (not buyable)
- Named tenant personalities beyond 3 types
- Stakeholder meters besides the credit rating
- Acts III–IV
- Board/investor quarterly goals (still the first add-back if play feels aimless)
- Achievements, Steam, mobile, translation, music

**Change rule (as in doc 10):** a new idea goes into the backlog, and can only enter the alpha by replacing something of similar size, written into this document.

---

## 4. Cut order if the schedule slips
1. JV partners
2. Big-tech backstops
3. On-site gas (power slot = existing MW or grid upgrade only)
4. GPU know-how levels → binary (none / has a live cluster)
5. The hosting unit (hosting MW behave as mining MW with a fixed fee)
6. The Capital Markets Lead

**Never cut:** projects with 3 slots, the five MW uses, the pilot cluster, take-or-pay penalties, the credit rating, the halving, the 2025 price reset, carry-over from Act I, the Act II chapter report.

---

## 5. Done when (the Alpha 0.2 exit checklist)

**Playable**
- [ ] Act II from 2022Q4 to 2026Q4 takes **45–55 minutes** for a first-time player
- [ ] Every quarter has **at least 3 meaningful decisions**
- [ ] 5 full Act I → Act II runs with no crash or stuck state; 5 preset runs likewise
- [ ] Save, reload and export/import work in Act II, including mid-quarter and across the act boundary

**Balance**
- [ ] Good path (20–40 MW entry) ends Act II at **~$1–3B**, with **≤ 10% of runs going bust in Act II** (added 28 Sep 2026); the top half of the band needs at least one sold or stabilized project
- [ ] Great path (100+ MW entry) peaks at **$10B+** in 2025 and survives 2026 with ≥ 12 months of runway
- [ ] Pure miner ends at **~$100–400M**, alive
- [ ] Overleveraged full stack (> 6× debt/EBITDA, AI-lab tenant, no backstop): **≥ 50% foreclosure** in 2026
- [ ] A 2-quarter delay costs **≥ 80%** of a full-stack project's profit
- [ ] A 2024 full-stack contract beats a post-Jun-2025 one by **≥ 30%** IRR (a floor, not a target)
- [ ] **Pilot timing:** a 1 MW pilot started in 2023Q3 returns **≥ 1.7×** its cost by 2026Q4 (operating margin + GPU resale on the residual curve), and at least 0.4× more than the same pilot started in 2025Q2 (revised 27 Sep 2026: the M4 sim gives 1.89× vs 1.39×)
- [ ] **Hosting isn't a free win:** switching mining MW to hosting doesn't beat staying in mining at 2026Q4 in more than ~60% of bot runs (hosting is meant to pay early and carry its risk over the full act; revised 27 Sep 2026 after the M3/M4 sims)
- [ ] A lifeline run (weak Act I) reaches at least one live AI project by 2024Q4 in ≥ 70% of runs (via the 5 MW shell path)
- [ ] Each Merge head start produces a different best opening strategy (checked by bot comparisons)
- [ ] **EV/MW sanity check:** pure mining ~$0.4–1.2M/MW, announced AI $3–12M/MW, stabilized IG-backed $18–27M/MW

**Quality**
- [ ] Golden replays pass for Act I, Act II alone and Act I → II
- [ ] Sim-runner: 1,000 full-career runs in under 2 minutes, CSV out
- [ ] All Act II content files pass schema validation
- [ ] The Act I → II save migration test passes

**People**
- [ ] 3–5 playtesters finish Act II and fill in the feedback form
- [ ] At least 2 of 3 say the pivot felt like "their" company, not a new game

**Go/no-go gate:** as in doc 10: go to Act III, fix Act II, or rethink.

---

## 6. Dependencies and order
1. **Act I playtests:** postponed by the owner until after Act II (27 Sep 2026). The Act II build does not wait for them.
2. **Content fixes** before the Act II loaders (§7).
3. **Wireframes:** done, on the Claude Design canvas https://claude.ai/artifact/LVnSiEH9RRHtU16Ld4C59S (example data from `21-act-ii-wireframe-prompt.md` v1.0). An Act II visual mockup like `docs/mockups/q4-2017.html` is optional.
4. **Build order (proposal for Claude Code):** act boundary (act field, save v2 + migration test, market extended to 2026Q4 with ETH, preset start, intro screen) → Act II market engine (GPU prices, rates, multiples, demand) → MW by use + hosting → projects + Deal builder (shell lease first, then full stack + pilot) → capital instruments + credit rating → interrupts and cards → rivals + league → chapter report → bots and balance.

---

## 7. Content fixes required before the build (from doc 18 §16.6, plus this freeze)
- `market_weekly.csv` / `market_quarterly.csv`: use the corrected copies in `docs/act2-content/` (done: derived hashprice, halving date, Q4 2022 bridge, quarter closes, ETH series).
- `capital_act2.json` › `era_multiple_ev_ebitda.ai_infra`: 2026Q1 24, Q2 20, Q3 18, Q4 15.
- `gpus.json`: `gpus_per_mw_it_load` for H100/H200 1,000 → **750**; mark GB300 and A100 out of scope for Alpha 0.2.
- `tenants.json` › `take_or_pay_terms`: 3% of annual contract value per late quarter; replace `termination_chance_at_2q_late` 0.50 with per-type `walk_chance_late_2q` (hyperscaler 0.05, neocloud 0.10, AI lab 0.20).
- `conversions.json`: add `mining_to_hosting_same_site` at $100K/MW, 0 build quarters; relabel the existing hosting entry as the GPU-hall conversion; add the **pilot cluster** tier (0.5–2 MW, spot-only, equipment-loan financeable, from 2023Q1, revenue = neocloud price × utilisation 70% + know-how bonus).
- `lenders.json` › `credit_rating_mapping`: the > 6× weak cell becomes CCC−; corporate cap BBB; add the "project debt can rate A" note and the runway notch.
- `interrupts_act2.json` › `construction_delay`: 15% per project per quarter, accelerate = 10% of capex, silent resolution when the cap is full.
- `events_act2.json` › `ec13`: add the "buy the dip" choice and the scripted AI demand and multiple effects.
- `hires_act2.json`: keep `government_affairs_lead` in the file but mark it Act III (not loaded in Alpha 0.2).
- `text_act2.en.json`: 10 more ticker headlines; `tt03` → "CCC to BBB" and "Act I had no such meter"; add a pilot-cluster tooltip.

---

## 8. Reconciliation record (v0.9 → v1.0)
1. **Smallest viable project** (was 🔎): the pilot cluster (0.5–2 MW, ≈ $31–33M/MW in 2023) for funded players; the 5 MW shell lease with a tenant capex credit (equity ≈ $7–8M) for lifeline and small runs. The lifeline/floor stands.
2. **JV and backstops:** kept, as cut #1 and #2 (content and cards `ec16`/`ec17` exist).
3. **Events:** 22-entry timeline + 24 cards (§2.12).
4. **Balance targets:** confirmed, with the good-path condition, the IRR floor wording, the revised pilot target, the hosting check and the EV/MW check added.
5. **All 🔎 values** replaced from the pack and doc 18.
6. **Pack design flags:** cap rates (compress, widen only in 2026Q4), construction delays ([P5]), GPU know-how (as is), minimum project ([P3]), 2026 AI multiple floor (15–18×): all accepted.
7. **Owner decisions 27 Sep 2026:** [P1]–[P5] confirmed; pilot revenue = neocloud price × utilisation penalty; pilot cost ≈ $31–33M/MW accepted; ETH price series added.
8. **Where this freeze corrects doc 18:**
   - §5.5 pilot cost "~$26M per MW" → ≈ $31–33M per MW (doc 18 counted 750 H100s at ~$20M; the pack's own 2023Q3 prices give $24–26M).
   - §5.5 "a 1 MW pilot could gross ~$25–30M in its first year" → ≈ $19–22M at the neocloud price and 70–80% utilisation (spot fell from $5 to $3.50 within a quarter).
   - §12 pilot anchor "pays back within 6 quarters on spot; a 2025Q2 pilot doesn't pay back within Act II" → replaced by the return-multiple comparison in §5 (at the neocloud price, a 2025Q2 pilot still recovers its cost, thanks to the 2026 "Hopper isn't dead yet" rebound).
   - §2.1 "coin treasury as is": ETH now has a price all act.
   - §8 valuation formula: adds projects under construction at capex spent, so a build doesn't erase its cost from the valuation until it goes live (owner decision, 27 Sep 2026).
9. §2.2 credit rating: sets the spread over SOFR and the max LTV of the equipment loan (the only corporate debt); no general corporate term loan (owner decision 27 Sep 2026).
10. §5 targets revised after the M3/M4 sims: hosting check judged at 2026Q4; pilot target as a margin over the 2025Q2 pilot. The switched-off-MW power reservation was tried and reverted (reservation applies to idle and under-construction MW only).
11. Owner answers to the M5 questions (28 Sep 2026): Act II Bandwidth base 4, an Act I Chief of Staff carries (§2.2); the lifeline floor needs both conditions (§2.10); each Merge head start gets its own mechanic and intended opening, and hold_and_wait parks the GPUs (§2.10, replacing doc 18 §2.3's "switched off, full burn on idle MW"); the §5 targets stay, and the good path also needs ≤ 10% of runs going bust in Act II.
