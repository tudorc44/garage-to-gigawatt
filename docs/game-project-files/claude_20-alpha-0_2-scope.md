# 20: Alpha 0.2 Scope (Act II: The Pivot and the Boom)

*Draft v0.9, 27 Sep 2026. Built from 18-act-ii-design.md v1.0.*
*Items marked **🔎 confirm after the pack** depend on the Act II content pack (19). One reconciliation pass after the pack arrives turns this into v1.0 and freezes it.*
*Once frozen, this document is the single source of truth for Alpha 0.2, as doc 10 is for Alpha 0.1.*

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

### 2.2 Resources
| Resource | Act II rule |
|---|---|
| Cash, debt, treasury | Carried over from Act I |
| Bandwidth | Base 3; +1 Chief of Staff; +1 at 50 MW energized; +1 at 200 MW; +1 Head of Development. **Max 8** |
| MW by use | Each site's MW split into mining / hosting / AI shell / AI cloud / idle |
| **Credit rating (new)** | CCC → A, recalculated each quarter from debt/EBITDA, backlog quality and cash runway. Sets debt rates and max leverage. 🔎 mapping thresholds |
| GPU know-how (new) | 0–3 (18 §5.4) |
| Community Heat | Carried over per site; grievance resets at the act boundary. AI-project thresholds from 05 §3 (delays, lawsuits, moratoriums) |
| Ratepayer Anger (new, per region) | Rises with MW built in the region; feeds Heat and moratorium cards |
| Valuation | Σ(unit EBITDA × 4 × unit multiple) + cash + treasury − debt + credit-weighted backlog (A/AA 15%, BBB 10%, AI lab 5%, spot 0%) |

### 2.3 Market (scripted plus seeded noise)
- **BTC:** weekly price, difficulty, hashprice. The Apr 2024 halving. (Same engine as Act I.)
- **GPU compute:** rental price series (contract and spot), GPU purchase prices, allocation lead times. 🔎 series
- **Build costs per MW** by conversion type, by quarter. 🔎
- **Financing:** base rate (SOFR), credit spreads by rating, cap rates. 🔎
- **Era multiples:** a mining series and an AI-infrastructure series. 🔎
- **AI demand index (0–100):** drives RFP frequency and quality. 🔎 method

### 2.4 Business units (the five MW uses)
| Use | In alpha | Notes |
|---|---|---|
| Mining | ✅ | Act I sim, simplified UI (fleet per site; the machine list gains S21-class 🔎) |
| Hosting | ✅ | Fixed $/kW/month, 4-quarter contracts, client default risk in winters 🔎 rates |
| AI shell lease | ✅ | Tenant brings GPUs. 5–15-year contracts |
| AI cloud (full stack) | ✅ | Player owns GPUs. Contracted or spot. Two GPU generations: **Hopper (H100/H200) → Blackwell (B200/GB200)** |
| Idle | ✅ | Pays power reservation + rent |

### 2.5 Projects (the core new system)
- A project converts N MW at one site (or a new site) to one target use, through **3 slots**: **Power** (existing MW / grid upgrade / on-site gas), **Tenant** (contract or spot), **Capital** (cash / project debt / GPU-backed DDTL / equity / JV / backstop).
- Lifecycle: `Proposed → Slots filled → Building (N quarters) → Live → Sold or Held`.
- Actions: open a project (1 BW), fill a slot (0–2 BW: accept = 0, negotiate = 2), start the build (1 BW), sell a live project (2 BW).
- **Take-or-pay:** a signed tenant sets a ready-by quarter. Each late quarter costs 1 quarter of contract revenue, and at 2 quarters late the tenant may walk (50%).
- **Projected return panel** in the Deal builder: capex, equity needed, annual revenue, payback, IRR ≈. Readable, not a spreadsheet.
- 🔎 **Smallest viable project** (MW and $). **If the pack shows a ~$15M, 20 MW company can't finance one in 2023, §2.10 (entry) is revised before the freeze.**

### 2.6 Sites and regions
- Region tags: **Texas/ERCOT, Virginia/PJM, Ohio, Georgia, Arizona, Nordics**. Each has a power price, a grid queue, a Heat modifier, Ratepayer Anger and policy events. 🔎 values
- **A region panel** on the Sites screen. **No map.**
- Scouting (1 BW) returns 2–3 site offers with one hidden flaw: distressed miner sites (2022Q4–2023), energized land (2024+), greenfield. 🔎 prices and flaws

### 2.7 Capital
| Instrument | Unlock | In alpha |
|---|---|---|
| Act I loans (equipment, crypto-backed) | Always (crypto-backed paused 2022Q4–2023Q2 after FTX) | ✅ |
| Project debt | 2023Q3, needs a BBB+ tenant | ✅ |
| GPU-backed DDTL | 2023Q3 | ✅ |
| Equity raise / at-the-market offering (if public) | Any quarter, 2 BW | ✅ |
| JV partner | 2025, 100 MW+ projects | ✅ 🔎 (**first to cut**) |
| Big-tech backstop | 2025, weak tenants | ✅ 🔎 (**second to cut**) |
| Refinancing | — | ❌ backlog |

- **Lose rule:** cash < 0 → forced sales → bust (as in Act I). **Added:** 2 quarters of missed debt service → foreclosure on that project's collateral.

### 2.8 People
- Keep the 5 Act I hires, with 2022–26 salaries 🔎.
- Add the **Head of Development** (+1 BW) and **up to 1 more** 🔎 (e.g. a Capital Markets lead with better loan terms).
- The Ex-Utility Exec's queue effect applies to grid upgrades; the BD Lead's effect applies to tenant RFPs.

### 2.9 Live quarter: interrupts and mini-games
- **Carried over:** price alert (+ GPU spot alert), curtailment (Texas; AI sites curtail only with an SLA penalty), neighbour complaint, failure wave (+ GPU clusters), margin call, negotiation (now tenants and lenders), distressed auction.
- **New:** construction delay (rolled per building project), GPU allocation (2023–24), spot price shock (Jun 2025 + random).
- **Tenant RFP** is an event card, not an interrupt.
- Cap stays at **3 counted interrupts per quarter**. 🔎 construction-delay rate (30–50% of real projects slip)

### 2.10 Entry into Act II
- **Carry-over** per 18 §2.1.
- **Floor:** below 20 MW energized + $5M cash → the **distressed lifeline card** (a bankrupt miner's 20 MW site at the Dec 2022 auction, bridge loan at 14% for 8 quarters). 🔎 $/MW and loan size
- **Merge head starts** per 18 §2.3. 🔎 numbers
- **Standalone preset:** "Q4 2022: a mid-size miner" (40 MW across 2 sites, S19 fleet, $12M cash, $25M debt, 45% stake). A "New career → Start at Act II" option on the title screen. 🔎 numbers

### 2.11 Rivals
- 5 scripted rivals: Core Scientific, IREN, Hut 8, Cipher, CoreWeave (benchmark). 🔎 curves
- They bid in auctions and compete for RFPs (a passed RFP can go to a rival, shown in the log).
- League table by MW (AI / mining) and valuation.

### 2.12 Events
- **~24 cards: ~12 scripted + ~12 random** 🔎 final list. Re-timed from 07 §7 and merged with the 18 §11 timeline.
- Same data format and engine as Act I (seeded stream, 1 random card per quarter max, defaults on skip).

### 2.13 End and score
- **End:** 2026Q4 quarter report → **Act II chapter report**: career graph 2017–2026, peak valuation and quarter, founder net worth, rank, key moments (projects built, tenants signed, delays, foreclosures, the halving, the price reset), and an Act III teaser.
- **Score:** founder net worth at the end of 2026Q4 + peak valuation + rank. Title bands extended: "Developer" ($1–10B), "Hyperscaler-adjacent" ($10B+). 🔎 band thresholds

### 2.14 Screens
Act I screens stay. Changes and additions:
1. **Title:** add "Start at Act II"
2. **Act II intro** (new): carry-over summary, head start, lifeline
3. **Plan dashboard:** MW-by-use bar, credit rating badge, backlog, AI demand index, GPU spot sparkline
4. **Sites & Fleet:** region tag + region panel, MW split per site, the fleet per site (mining and GPU)
5. **Projects** (new): project cards grouped by stage, with timeline, slots and ready-by
6. **Deal builder** (new, modal): the 3 slots + the projected return panel
7. **Capital:** add the rating, debt stack by instrument, backlog by tenant
8. **Tenant / lender negotiation:** reuse the negotiation modal
9. **Quarter report:** MW by use, backlog, rating change, project milestones
10. **Act II chapter report** (extends the Act I one)
11. **Game over:** add the foreclosure variant

### 2.15 Other must-haves
- **Save:** an autosave slot at the start of Act II; the act number in the save. Act I saves load into Act II correctly (**migration test**).
- **Onboarding:** 5–6 tooltips in 2022Q4 (MW uses, projects, credit rating, backlog, tenants).
- **Sim bots** for Act II: good, great, pure-miner, overleveraged, cautious-shell. Sim runs 2017 → 2026 in one pass, and Act II alone from the preset.

---

## 3. Not in Alpha 0.2 (backlog)
- The map (region tags only)
- Lobbying, political capital, a Government meter (Act III)
- SPVs and off-balance-sheet structures; refinancing
- The Bubble meter, the Signals panel, the hidden scenario draw (Act III)
- GPU generations after Blackwell (Rubin arrives in Act III)
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
6. The second extra hire

**Never cut:** projects with 3 slots, the five MW uses, take-or-pay penalties, the credit rating, the halving, the 2025 price reset, carry-over from Act I, the Act II chapter report.

---

## 5. Done when (the Alpha 0.2 exit checklist)

**Playable**
- [ ] Act II from 2022Q4 to 2026Q4 takes **45–55 minutes** for a first-time player
- [ ] Every quarter has **at least 3 meaningful decisions**
- [ ] 5 full Act I → Act II runs with no crash or stuck state; 5 preset runs likewise
- [ ] Save, reload and export/import work in Act II, including mid-quarter and across the act boundary

**Balance** 🔎 (all targets confirmed or corrected by the pack)
- [ ] Good path (20–40 MW entry) ends Act II at **~$1–3B**
- [ ] Great path (100+ MW entry) peaks at **$10B+** in 2025 and survives 2026 with ≥ 12 months of runway
- [ ] Pure miner ends at **~$100–400M**, alive
- [ ] Overleveraged full stack: **≥ 50% foreclosure** in 2026
- [ ] A 2-quarter delay costs **≥ 80%** of a full-stack project's profit
- [ ] A 2024 full-stack contract beats a post-Jun-2025 one by **≥ 30%** IRR
- [ ] A lifeline run (weak Act I) can reach at least one live AI project by 2024Q4 in ≥ 70% of runs
- [ ] Each Merge head start produces a different best opening strategy (checked by bot comparisons)

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

## 6. Dependencies
- **The Act II content pack (19):** needed before the build starts. Every 🔎 above.
- **Wireframes:** `21-act-ii-wireframe-prompt.md` → a Claude Design canvas for the new and changed screens.
- **The Act I balance fixes** (Texas construction loan, GPU shortage cap, transformer upgrade) are merged before Act II work starts, since Act II inherits Act I's end states.

---

## 7. Reconciliation checklist (v0.9 → v1.0, after the pack)
1. Smallest viable AI project: size, cost, financing. Does the lifeline/floor still work? (§2.5, §2.10)
2. JV and backstops: keep or move to backlog? (§2.7)
3. Final event list and count (§2.12)
4. Balance targets: confirmed or corrected (§5)
5. All 🔎 values replaced; schema sketch matches the Act I loaders
6. Any "Design flags" from the pack: accept, change, or backlog each
