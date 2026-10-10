# 43: Act V design, "Firm" (2036 → 2040). v1.1, 10 Oct 2026 (v1.0 approved; v1.1 adds §0 after doc 45 and the M43.0 gate)

*Design thread. The recommended concept from doc 42 (Concept A, with B's exit and C's flexibility and Q-Day folded in), designed in the shape of doc 33. The owner approved doc 42's six recommendations on 10 Oct 2026 (V-D1 to V-D6 below). Built on doc 40 (second research pass, Part D), doc 37 (energy and 2040 dossier), doc 38 (energy ventures, especially §5-§6), doc 33 (Act IV as designed) and the game as built (dev-notes through M42, `main` = 71f36cb, `src/sim/state.ts`, `docs/energy-content/README.md`). The owner approved every recommendation in §21 on 10 Oct 2026 (V-D1 to V-D30). §22's open questions stay open; the design thread's recommendations on Q1 and Q2 are noted there. The content pack, scope doc and wireframe prompt come after approval, as for Acts III-IV.*

**How to read this doc.**
- Evidence grades (doc 36): **[A]** primary or official, **[B]** reputable reporting or company statement, **[C]** analyst, forecast or industry estimate, **[D]** inference or designed. Almost every 2036-2040 value is [C] or [D]. Every future is a scenario, not a forecast, and the game says so on its intro screen and in the chapter report.
- **⚙** marks a number or rule expected to change after the sim. The owner's playtests don't block the build, so ⚙ values are first-pass and the bots tune them.
- Numbers come in three kinds: **sourced** (docs 31, 37, 40), **derived** (computed from sourced values) and **designed** (invented for the game). Designed values are labelled.
- Decisions are numbered **V-D1 to V-D30**. "Act quarter" counts from 0 (2036Q1 = act quarter 0, 2040Q4 = 19). Timeline indices 76-95.
- Fictional names are placeholders; the content pack runs the name-clash check (doc 33's procedure, which caught "Meridian Arc" in M41).

| Term | Meaning |
|---|---|
| Firm MW | Power available on demand, whatever the weather: a plant that runs at a high capacity factor (nuclear, geothermal, gas) or renewables with long storage. |
| Flexible load | A load that agrees to cut its use when the grid asks (curtailable), in exchange for a faster connection or payments. |
| Queue position | A place in a grid operator's line of requests to connect; it moves with its site, not on its own. |
| Network upgrades | The grid work (lines, substations) a new connection triggers; under the 2025 DOE direction, charged 100% to the large load [B]. |
| Merchant | Selling power at the market price, with no long contract. |
| COD | Commercial operation date: when a plant starts selling power. |
| Infrastructure fund | An investor that buys operating plants for their long, steady cash flows. |
| Capacity factor (CF) | Actual output ÷ output at full power all year. |

---

## 0. v1.1 amendments (10 Oct 2026): doc 45 and the M43.0 gate

*Where this section and a later section disagree, this section wins. The later sections keep their v1.0 text so the history stays readable; the content pack applies §0.*

### 0.1 The gate failed, and why (M43.0)
Firm Holder ÷ Seller in a stub V1: 1.009 overall, 0 of 12 cells at 1.2. The cause was the gate's own definition (design thread's error): the two bots differed only in one 10-20% plant stake, about 1-4% of a 2035 company's value, while the jam (waits, demand) touched only new MW, which neither bot built. In doc 43 v1.0 nothing made scarcity reprice what a company already holds, and the "Seller" only sold plant stakes. The real V1 decision for a 2035 company is about its whole ground book: **lock it in at 2036 prices, or keep it open to the scarcity price.** v1.1 makes that the decision.

### 0.2 Scarcity reprices what you hold (new §8.4; replaces the "jam only on new MW" reading)
- **Leases follow a scarcity index.** New leases, re-lets and renewal offers in Act V price off `scarcity_index` = the AI demand index × a queue factor (market column per future ⚙; V1 rises to about 1.5 by 2040, V2 about 1.1, V3 about 0.8 after the trigger, V4 about 1.0 then 0.9 late). Act III's renewal system and its blend-and-extend offers carry the price.
- **Lock or roll.** At each renewal or blend-and-extend offer the player chooses **long** (8-10 years at today's rate) or **short** (2 years, then back at market). Long is −1 in the reading score, short +1 (replaces "ground lease renewals 0" in §6.7).
- **Energized MW you hold but don't use are worth the powered-land price.** Valuation adds free energized MW × `powered_value_usd_mw` (market column): $300K/MW in 2036 [C, doc 45 §Q3], V1 rising to $500K by 2040, V2 falling to $150K, V3 to $100K, V4 to $200K (paths designed ⚙). **Sell a site** pays its leases' value plus free MW × the powered value (−1).
- **No jump at the seam:** `act5Entry` (the growth multiple's base) is measured with the powered-value term included, so a company with idle MW doesn't show fake growth on day one; Acts II-IV valuation is unchanged.
- **Queue positions** (not yet energized) keep doc 45's premium: $100/kW in 2036, rising to $300 (V1), falling to $25 (V2, V3); holding one costs $50/kW of security (Texas's rule [B]).

### 0.3 Archetypes, redefined (replaces §18's Firm Holder and Seller)
- **Firm Holder:** keeps every site, renews short, keeps free MW, holds plant stakes merchant.
- **Seller:** in 2036 takes every blend-and-extend and renewal long at the 2036 rate, sells free energized MW (sites) at the powered value, sells plant stakes to funds and contracts plant output.
V-B2 (V1: Holder ≥ 1.2 × Seller) and V-B4 (V3: Seller ≥ 1.2 × Holder) are now tested together, so the fix can't simply tilt everything toward holding.

### 0.4 Doc 45's corrections, adopted
| Where | v1.0 | v1.1 (doc 45) |
|---|---|---|
| §11.3 plant multiples | 12x contracted / 7x merchant | **10x contracted (8x with ≤ 8 years of contract left, 11x with ≥ 15) / 7.5x merchant (V1 8.5x after the trigger, V3 6x)** [A/B/C] |
| §11.1 fund bid | 0.90-1.15 | **0.95-1.15; V3 0.85-1.00 after the trigger** [B/C] |
| §11.1 plant debt | ≤ 60%; SOFR + 250 / + 400; 15 y | **Contracted: ≤ 65%, SOFR + 200, 15-18 y sculpted to DSCR 1.30. Merchant: ≤ 40%, SOFR + 275, 7 y, 1%/yr + 50% cash sweep** [A/C] |
| §11.4 plant default | lenders take the plant after 2 q below DSCR 1.0 | **Lock-up below 1.15 (no distributions); below 1.0 for 4 q → restructure (stake ×0.5); for 8 q → lenders take the plant** [C] |
| §7.1 reactor costs | $40 / $30 per MWh plus fixed ⚙ | **Fixed $107/kW-yr (×1.3 for a single unit) + $9/MWh variable and fuel; no separate all-in figure.** EGS $20/MWh all-in, fixed 0. Gas CC $15/kW-yr + $2.5/MWh, CT $10 + $5, plus fuel [A/B] |
| §7.1 contracted share at COD | ⚙ | **SMR, advanced fission, EGS, fusion 90%; storage 80%; pumped hydro 50% [D]** [B] |
| §7.1 capacity ratings | ⚙ | **Nuclear 0.95; gas CC 0.76 → 0.78; CT 0.62 → 0.70; 8 h storage 0.62; 10 h 0.72** [A] |
| §7.3 pumped storage | capacity $110/kW-yr + spread | **Capacity × 10-h rating (≈ $85/kW-yr at the cap) + a 10-hour spread of $30/MWh (V1 $45, V3 $20) × 0.80** [A/D] |
| §8.2 network upgrades | pay $150/kW for −⅓ of the wait (+1) | **The study names a bill (median $100/kW ERCOT and SPP, $150 PJM and MISO; 20% chance of a $400-600 tail): pay to keep the position, or withdraw. Paying buys no speed** [A]. Speed comes only from co-location or the fast lane. Paying stays +1 |
| §8.1 waits | 24 q in 2036 | **PJM 20 q, ERCOT 12 q, other regions 16 q in 2036; the futures' directions kept; rivals' positions withdraw 15%/yr (V3 30%)** [A/C] |
| §8.2 fast lane | 4-8 q; 200 h; −2.3% | **4-8 q; up to 180 h a year; −0.5% output; 24-hour notice** [B/C] |
| §6.2 demand | V2 130; V3 95 | **V2 135; V3 100 → 105, then flat (the plateau is [D])** [A/C] |
| §10 halvings | ~2036Q2, ~2040Q2 | **2036Q1 and 2040Q1** [A/D] |
| §15.2 exit bid | 0.95-1.15 | **1.05-1.25 (V1 1.15-1.30; V3 0.95-1.10)** [A/B/C] |
| §14.3 Head of Grid Strategy | −2 q on upgraded positions | **Upgrade bills −25% and the $400-600 tail halved** (paying no longer buys speed) |
| §6.6 wildcards | moratorium 4 q, > 20 MW; transformers +2 q | **Moratorium 2-8 q, > 50 MW; transformers +2 q, 40% of draws +4 q** [B/C] |
| Known timeline (§19) | - | **No federal clean credit for any project starting construction after 2035; plants started by 2033 keep theirs** [A/B]; **a "licensing clock" card (−2 q on SMR licences) in every future** [A/B] |

### 0.5 The gate's other questions (answered 10 Oct 2026)
- **Measure on the plant unit alone?** No. Thermal plants already pass there (1.27-1.46x), but V-B2 is about the player's company. The plant-unit ratio stays in the report as information.
- **Firm-heavy starts?** Yes, as one of the starts (the Firm Builder preset, §3.4), alongside the three Act IV presets; not as the fix.
- **Pumped storage:** it keeps doc 38's overrun calls (the real record) and gets the capacity + spread revenue above; a held pumped stake that loses money in most runs is an honest outcome, judged by V-B6 in expectation.

### 0.6 The gate's rules in detail (M43.0b; answers to the build thread, 10 Oct 2026)
These define the sim-only prototype. Where the full game later needs more, the content pack decides; the prototype follows this list.
1. **Renewals and re-lets.**
   - Each existing lease keeps its current rent and remaining term in both bots; long or short applies only from its own end date.
   - **Market rent** at a quarter = the lease's class rate in the 2035Q4 market data (the new-lease rate for its hall tier, or the GPU contract rate for its class, as Act III's new-lease index does) × `scarcity_index` that quarter. Orbital blocks are unchanged.
   - **Holder:** at each end date, renews for 2 years at that quarter's market rent, and repeats.
   - **Seller:** in 2036Q1 extends every lease: from its end date it runs 9 more years at the 2036Q1 market rent (scarcity 1.0). No blending is needed for the gate; this is the effect of a blend-and-extend.
   - Walks use the market file's walk probabilities at each end date; a walked lease re-lets after 1 quarter of vacancy at the market rent (Seller's walked leases re-let at market too).
2. **Powered value.**
   - **Free energized MW** = the site's free MW as the game already computes it: energized and not used by any lease, project, hosting client or own machine.
   - `powered_value_usd_mw` is both the valuation term (every quarter, including 2040Q4) and the sale price: the Seller sells its free MW in 2036Q1 at $300K/MW.
   - **act5Entry** (the base for both bots' multiples) = the 2035Q4 valuation + free MW × $300K.
3. **Archetypes.**
   - Both keep their offtake (it supplies their own sites).
   - **Seller** sells every plant stake in 2036Q1: operating plants at plant value × 1.0, ventures before first power at their milestone mark × 1.0 (so it pays no later calls). No output contracting is needed (it owns no output after the sale).
   - **Holder** keeps every stake, sells output merchant except the developer's contracted share (§0.4), and pays calls (dilutes only if cash runs short).
4. **§0.4 items in the gate.**
   - Plant debt: neither bot borrows.
   - Upgrades: neither bot opens a new grid request, so neither pays; the jam acts through `scarcity_index` and the powered value.
   - Reactor single-unit ×1.3 applies to the fixed $107/kW-yr only, not to the $9/MWh.
   - Pumped storage capacity: $85/kW-yr flat in its regions (doc 45: $325/MW-day × 0.72 × 365) plus the 10-hour spread margin; not $110 × 0.72.
5. **Stub paths.**
   - **V1:** trigger fixed at 2037Q4. `scarcity_index` 1.0 → 1.1 at the trigger (straight line), then → 1.5 at 2040Q4; powered value $300K → $500K (straight line over the act); merchant plant multiple 7.5x, 8.5x from the trigger.
   - **V3:** trigger fixed at 2037Q4. `scarcity_index` 1.0 to the trigger, then → 0.8 at 2039Q4 and flat; powered value $300K to the trigger, then → $100K at 2040Q4; merchant plant multiple 7.5x, 6x from the trigger; capacity prices −50% and merchant power −30% from the trigger.
6. **Firm-heavy start:** the same Balanced bot and cash guard, joining two ventures in 2031Q1 (EGS and SMR, 20% stakes, 50% offtake each). If two joins don't fit, the top quartile of the existing runs by plant value share.

---

## 1. What Act V has to prove

**One question:** *When the grid queue is years long and the plants you backed a decade earlier finally switch on, can you tell what kind of megawatt the late 2030s will pay for (firm, flexible, orbital or none) and position the company before the world shows its hand, then decide what the whole thing is worth and who gets it?*

Act II asked "how do I build", Act III "what do I do when the world turns", Act IV "how far do I reach". Act V asks **"what is a megawatt worth now, and when do I cash out?"** It reuses the reading skill a third time, on four new futures, and closes the campaign with the founder's exit.

It is also the act that pays off the ventures feature (doc 38): without Act V, backing a reactor in 2028 ends as an epilogue line, which doc 38 §6 called the only reason to build Act V, and a sufficient one.

## 2. Shape

- **Span:** 20 quarterly turns, 2036Q1 → 2040Q4 (indices 76-95). All decision quarters, no auto-play. About 55-60 minutes ⚙, 3-6 meaningful decisions a turn.
- **Loop:** unchanged. Plan phase → live quarter of 13 weekly ticks with up to 3 interrupts → quarter report. Seeded RNG; Act V randomness on its own substreams (`act5Seed`), so no earlier act changes.
- **Entry:** Act IV's chapter report offers **"Continue to Act V"** or **"Retire at 2035"** (V-D2). Retiring plays today's finale unchanged. Also **"Start at Act V"** with one of three bot-made presets (§3.4).
- **Exit:** the Act V chapter report with the reveal, then the **campaign finale moved to 2040** (§15), then the title screen.
- **Screens:** desktop at 1024 px and up; Act V's screens load as their own lazy chunk (main bundle under 500 KB).
- **Era theme:** a seventh theme, working name `firm`: a light "dispatch room" ledger (paper ledger look kept, unlike Act IV's open question about dark paper) ⚙, design-system work after approval.

## 3. Carry-over from Act IV, and the Act IV → V boundary

### 3.1 What carries, unchanged
The build re-checks this list against `state.ts` at its first milestone, as M27 did.
- **Money and ownership:** `cash`, treasury (BTC and any ETH), `founderStake`, `raisesDone`, the Finances ledger (doc 39) with its closed-quarter history.
- **Ground:** `sites` with serials (doc 35), power contracts, `projects`, hosting, energy assets (batteries, on-site solar and wind, iron-air, gas), Texas enrolment, special sites still held.
- **Energy ventures:** every stake, offtake and prepayment, and each calendar developer project's hidden state (its draws keep running; they were keyed by type from 2027 and are not redrawn).
- **Debt and ratings:** every loan and facility, `creditRating`, the leverage covenant, an open breach with its cure deadline, the standby facility if inside its window.
- **Act III-IV systems:** nuclear PPAs (terms to 2042+), political capital and its decay, `angerAdj`, `siteHeat`, staff, lasting events.
- **Orbit:** `act4Orbit` (blocks, licences, registry, links, insurance), which keeps running (§9.1).
- **Records:** `seed`, `act3Seed`, `act4Seed`, presets and Scenario Mode flags, `act2Entry`…`act4Entry`, `act3End`, `act4End`, `reports`.
- **New at the boundary:** `act: 5`, save `version: 6`, `act5Entry` (shaped like `act4Entry`), `act5Seed`, the future draw in hidden-state form (§6.8), `act5Moves`, `act5Queue` (§8), `act5Plants` (§7).

### 3.2 Boundary rules
- Heat, Anger, covenant state and political capital carry.
- **The Moon goes offstage (V-D4):** `act4Moon` converts to one **lunar holding** (§9.2). Claims, prospects, pilots and production decisions stop being playable.
- Open Act IV offers (tenant offers, unanswered interrupts) resolve by their defaults.
- **Act IV-only state is dropped** into `act4End`: `act4Moves`, `act4Wildcards`, `act4SignalReads`, the last market read.
- **Act IV's future does not continue (V-D5):** Act V draws its own, independently.
- Gates: `inAct2Rules` and `covenantBreached` extend to act 5; every other Act IV-only gate is reviewed one by one and its answer written in dev-notes.

### 3.3 The market seam and the common 2036 baseline
As doc 33 §3.3, made general a second time:
- **Common baseline:** every Act V market series is identical across the four futures in 2036Q1-Q2 and within ±3% through 2036Q4 ⚙, asserted by a test (V-B14).
- **Seam glide:** quarter 0 of each series = the player's Act IV future value at 2035Q4, closing the gap to the common baseline in equal steps over 4 quarters. Launch prices are the widest gap (F1 $150/kg vs F2 $600/kg at 2035): the baseline is $300/kg ⚙, so an F1 player sees launch get dearer for a year and an F2 player cheaper, neither of which reveals the Act V future.
- **Carried columns:** the Act V market files continue every column the Act II-IV systems read, to 2040Q4 (renewal bands, RFP index, GPU prices and rents, nuclear PPA prices, PJM capacity prices, retrofit costs, launch and orbital columns, `grid_wait_q`, `gas_wait_q`), and `market_energy.csv` already runs to 2040.

### 3.4 Presets (bot-made, values set by the sim, not targeted)
Three 2035Q4 companies, each a real bot + seed + Act IV future played from an Act IV preset:
- **Firm Builder:** ground landlord with offtake from at least one venture that reaches first power in 2036-38, little orbit.
- **Orbital Landlord:** an orbit-heavy company whose first blocks retire in 2036-37.
- **Small Grid:** a small survivor with one site, a battery and a queue position: the cheap seat.

## 4. New in Act V

1. **Plants switch on:** venture projects reach first power (or fail) on their carried draws and become operating plants with output, costs and earnings (§7).
2. **Valuation on earnings** for operating plants, replacing the milestone mark at first power (fixes the recorded E-B2 miss, §11.3).
3. **Plant finance:** project debt after first power, sale of a stake to an infrastructure fund (§11.1).
4. **The queue:** each grid request holds a visible position; pay network upgrades, co-locate at a plant, take the flexible fast lane where reform allows, or sell the position with its site (§8).
5. **Follow-on units:** a class that reached first power offers a next unit at a lower cost (§7.4).
6. **A new hidden future** (four futures, six Signals, a decoy, a reading score on "scarcity exposure") reusing Act III's engine a third time (§6).
7. **Orbit's replacement cycle:** blocks from 2031-35 retire; replace, extend or bring the compute home (§9.1).
8. **The founder's exit,** the campaign's last decision (§15.2).
9. **The finale at 2040,** with "Retire at 2035" kept (§15.3).

## 5. The megawatt line

The top bar's MW strip shows four columns in Act V:

| Column | What a megawatt is | Why it's scarce or not |
|---|---|---|
| **Firm** | MW from your operating plants (your stake × output, or your offtake) plus grid MW under firm contracts | The queue (16-32 quarters in most futures ⚙; LBNL median about 5 years [A]) and plant slips |
| **Flexible** | Load you have enrolled as curtailable (miners, interruptible training, battery-backed halls) | Reform: valuable in V2, a cost elsewhere |
| **Orbital** | IT MW on live satellites | Replacement cost, launch price, life |
| **Lunar** | kWe on your lunar holding (display only) | Offstage; told in the finale |

The finale draws the line from 0.15 kW in a bedroom to 2040's firm megawatts.

## 6. The hidden future

### 6.1 The draw (reuses Act III's engine, V-D10)
At the Act IV → V boundary a secret draw on `substream(act5Seed, "act5_future")` picks one of four futures. Each is data: one quarterly market file, authored Signals with a decoy and a trigger, event cards, rivals' curves and fates. All four share the 2036 baseline. The trigger lands **2037Q2-2038Q3** (act quarters 5-10) ⚙; Signals move 2-4 quarters before it, never before 2036Q3. Scenario Mode unlocks after one Act V finish.

### 6.2 The four futures (V-D3, approved)

| | V1 **Queue is King** | V2 **Flexible Lane** | V3 **Demand Plateau** | V4 **Up and Out** |
|---|---|---|---|---|
| Weight ⚙ | 30% | 25% | 25% | 20% |
| One line | Demand keeps climbing, reform stalls, waits stay above 5 years; whoever owns firm MW sets the price | Large-load reform works: curtailable and co-located loads connect in 1-3 years; flexibility is paid, firmness less | AI demand flattens near the low case; capacity prices fall; late plants and merchant MW strand | Launch falls below about $200/kg and toward $100; orbital compute takes the marginal gigawatt; ground prices soften late |
| AI demand index (2036 → 2040) ⚙ | 100 → 145 | 100 → 130 | 100 → 95 | 100 → 125 (a growing share in orbit) |
| Grid wait, firm request (quarters) ⚙ | 24 → 28 | 24 → 20 | 24 → 14 (queue clears as projects withdraw) | 24 → 22 |
| Fast lane for curtailable load ⚙ | none | from the trigger: 4-8 q | none | none |
| PJM capacity price vs the cap ⚙ | at the cap; the cap lifted 30% after the trigger | falls 20% after the trigger | falls 50% after the trigger | falls 25% late |
| Merchant power (vs 2036) ⚙ | +25% | +5% | −30% | −10% |
| Launch, LEO $/kg (2036 → 2040) ⚙ | 300 → 250 | 300 → 250 | 300 → 280 | 300 → 100 |
| Orbit vs ground cost by 2040 (designed, anchored to SemiAnalysis's ~2040 parity [C]) ⚙ | ~1.3x | ~1.3x | ~1.4x (ground cheap) | ~0.9x |
| Who it rewards | Firm plants held and kept merchant or re-contracted late; queue positions paid up early | Flexible loads; co-location; selling firmness forward at the 2036-37 price | Sellers: plants sold to funds before the trigger, long fixed contracts signed early; low debt | Orbit replacers; ground sold or contracted long before the late softening |
| Who it punishes | Sellers who cashed out early; companies short of firm MW | Paying for upgrades that reform makes pointless | Merchant exposure, plant debt, late follow-on units | A fleet left to retire; late ground buyers |
| Evidence | IEA high case ~1,700 TWh by 2035 [C]; LBNL wait [A]; PJM uncapped 59% then 71% above the cap [C] | DOE's 2025 direction to FERC (60-day studies for curtailable loads) [B]; SPP's large-load process, FERC's June 2026 show-cause orders [A/B]; the 1-3 year connection is [D] | IEA low case ~700 TWh [C]; ERCOT battery revenue $192 → $55/kW-yr 2023→2024 as the precedent for saturation [C] | Launch below $200/kg around 2035 needs ~180 Starship launches a year [C]; ~$100/kg competitive (Forethought) [C]; parity ~2040 (SemiAnalysis) [C] |

Notes:
- **Day one looks the same in every future** (§3.3).
- **Every future rewards something different and punishes something else**, so no single stance wins all four (V-B1).
- **V1 is not a free win for holders:** a holder who never re-contracts or adds MW gets the scarcity price only on what is already built. And V1 carries the B3 dependency (V-D6): the bots must show firm MW beats speed here before the build starts (§19).
- **Fusion:** in every future the fusion venture follows its own calendar draw; nothing delivers before 2038 (the honesty rule). Fusion is not tied to a future.

### 6.3 Signals (six new indicators, same panel and rules)
Each 0-100 with a trend arrow, authored per future and quarter; "Read the market" reveals the authored sharp range.
1. **Grid Queue:** median waits, withdrawals, upgrade cost news.
2. **Capacity Market:** auction results against the cap.
3. **AI Demand:** hyperscaler capex and AI revenue (Act III's Revenue Gap, continued).
4. **Reform Docket:** large-load rules: filed, approved, applied, energised.
5. **Launch Cadence:** launches a year, $/kg quotes.
6. **Firm Build-out:** announced vs delivered firm MW (SMR, geothermal, gas).

### 6.4 The decoy (V-D3, approved: the SMR wave)
**The SMR wave:** headline orderbooks for "dozens of reactors" and a government fast-track move the Firm Build-out signal sharply up, telling the player that firm power is about to be abundant (sell scarcity). By 2040 a handful of units have delivered. Basis: the 2026 deals disclose no funding amounts, and one took an FID without funding [A/B]. It is the decoy in **V1, V2 and V4**, where it points the wrong way. **In V3 it can't be a decoy** (falling prices point the same way), so V3's decoy is a **record capacity auction** that tempts the V1 reading, then relief (designed).

### 6.5 Plant truth (no new hidden file)
The venture draws already exist (doc 38 §5, M36.10: per-type hidden draws from 2027). Act V adds no hidden plant file: an operating plant's realised capacity factor (weak field for EGS, the 0.80 → 0.92 ramp for reactors) is visible as it runs. The player learns a plant's quality from its output, as fleet telemetry did in Act IV.

### 6.6 Wildcards (2 of 5 drawn at entry, V-D11)
1. **Q-Day scare:** a credible demonstration against a pre-quantum signature scheme; BTC −40% for 2 quarters, then a post-quantum migration event; mining revenue and coin holdings marked down. Basis: NIST disallows today's schemes after 2035 [A/B]; experts put a cryptographically relevant quantum computer at 28-49% within 10 years [C]; magnitude designed [D].
2. **Fusion "net electric" headline:** a rival's pilot reports net electricity; the space and AI multiples lift for 2 quarters, then a correction when availability stays low [D].
3. **Dry year:** hydro and pumped storage output −25% for a year in one region [D, designed magnitude].
4. **Large-load moratorium:** one region pauses new connections over 20 MW for 4 quarters (doc 31's 2026 opposition data [A], magnitude designed).
5. **Transformer shortage:** new energy assets and upgrades take +2 quarters for a year (lead times for large transformers [B], magnitude designed).

### 6.7 The reading score (reuses `readingScore.ts`, new hidden file)
Same mechanics as Acts III-IV, including the M40-41 rules (a build's own hedges and debt count 0 in its quarter; a raise takes the sign of the next scored move). The stance in Act V measures **scarcity exposure**: a bet that firm ground power stays scarce and dear.
- **+1:** paying network upgrades, buying a queue position (with a site), committing a follow-on unit or a new firm asset (gas, long storage), buying a plant stake, letting a contract roll to merchant, drawing plant debt.
- **−1:** selling a plant stake to a fund, selling a site with its position, signing a long fixed-price sale of plant output, enrolling load as curtailable, an equity raise not followed by a + move (M41 rule).
- **0** (logged, not scored): orbit moves and the lunar holding (the money judges them), ground lease renewals.
- **Ideal stances**, to author in the content pack ⚙: V1 offensive throughout; V2 offensive before the trigger, defensive after; V3 calm before the trigger, defensive after; V4 calm, defensive from 2039.
- The perfect and passive oracle values are computed and asserted by the sim (V-B8, V-B9).

### 6.8 Hidden files and the leak guard (V-D29)
- **Hidden:** `reading_score_v.json`, read only by `readingScore.ts` and `act5End.ts`; the future draw and the exit's post-2040 outlook factors (§15.2), read only by `act5End.ts` and the exit system.
- **Read in play:** `market_v_v1..v4.csv`, the weekly files (current and past rows only), `signals_v_v1..v4.json` (displayed range; sharp range after Read the market).
- The leak-guard and hidden-file tests add these files; nothing before the reveal shows the future.

## 7. Plants: from venture to operating asset

### 7.1 First power
A calendar venture that reaches first power in Act V (or did in Act IV) becomes an **operating plant**:
- **Output** each quarter: nameplate MW × its CF that quarter (reactors 0.80 for 8 quarters then 0.92; EGS 0.9, or 0.6 under a weak field until fixed; pumped storage dispatches against peak prices, §7.3; fusion pilot 0.3 ⚙ [D]).
- **Sales:** the offtake shares at their PPA prices (the player's offtake delivers to the player's sites, as M40.2), the rest at the developer's contracts (a share contracted per class ⚙) or merchant.
- **Costs:** running cost per MWh (reactors $40 for a single unit, $30 from unit 3; EGS $20; doc 40 §Q9), plus a fixed $/kW-yr ⚙.
- **Capacity revenue** where the region pays it (PJM, with the 4-hour battery's ELCC path for storage and a firm-class rating for thermal plants ⚙).
- Plant EBITDA belongs to its owners pro rata; the player's share is stake × EBITDA.

### 7.2 Slips and failures in Act V
The carried draws decide: a project may still be licensing, building, slipping, cancelled (SMR undersubscription rule), folded (fusion) or done. Calls continue in thirds as in doc 38 (pay, dilute or walk). Act V adds nothing new here: it plays out what was drawn in 2027.

### 7.3 Pumped storage and long storage
A finished pumped-storage plant (likely 2037-39 in its draw) earns capacity revenue ($110/kW-yr, doc 38, designed) plus a peak-spread margin: 10 hours a day at the region's peak-off-peak spread × 0.80 round trip (doc 40 §Q7) ⚙. Iron-air (from 2031, 100 h) keeps its role of firming renewables (90%).

### 7.4 Follow-on units (V-D13)
When a class's first project reaches first power, its developer offers a **next unit** from the next quarter: EGS at the NOAK cost ($4,000/kW by 2035, doc 40 §Q9 [D]; 7 quarters), SMR unit 2 at ×0.85 of unit 1's realised cost ⚙ (a designed learning rate [D]), advanced fission and fusion none in-act. Same roles (stake, offtake, prepay) and calls as doc 38. Most follow-on SMRs can't finish before 2040; their value at 2040 is the milestone mark (§11.3). A follow-on unit is a +1 move.

### 7.5 New firm assets on the ground
As Act IV: on-site gas (6-10 quarters, thermal overrun, Heat), batteries (2/4/8 h), on-site solar and wind, iron-air. Grid-connected assets join the queue (§8); behind-the-meter assets don't.

## 8. The queue (V-D14)

### 8.1 Positions
Every request for new grid MW at a site (a new site, an expansion, a grid-connected asset) is a **queue position**: region, MW, request quarter, and an expected energization quarter = request + the future's `grid_wait_q` for that region × U(0.8, 1.2) (as Act IV's grid upgrades). Existing Act IV grid upgrades in progress become positions at the boundary. The Queue screen lists them in one table (doc 35's SitePicker pattern).

### 8.2 What you can do with a position
- **Pay network upgrades:** pay $/kW (market column `upgrade_usd_kw` by region ⚙; LBNL publishes interconnection cost studies by region [A], to be sourced in the content pack) to cut the remaining wait by a third (designed). +1 move.
- **Co-locate:** a site that takes offtake from an operating plant in its region connects behind the plant with no wait, up to the delivered firm MW (already true for ventures since M36; Act V names it on the Queue screen).
- **Take the fast lane (V2 after the trigger only):** accept curtailment up to 200 hours a year (−2.3% output ⚙, designed from the 2019 Québec block's 300 h [A] and DOE's principles [B]) and connect in 4-8 quarters. −1 move (enrolling as flexible).
- **Sell the position with its site:** a position moves only with its site (designed simplification of how positions transfer with projects [D]). The buyer pays the site's value plus a position premium per MW from the market file (`queue_premium_usd_kw` ⚙: rising in V1, falling in V2 and V3). −1 move.
- **Withdraw:** free, frees Bandwidth, refunds nothing.

### 8.3 Why it matters
In V1 a paid-up position is worth more each year; in V2 the fast lane makes upgrade payments a waste; in V3 waits shorten as speculative projects withdraw, so paying up was pointless and selling early was right; in V4 ground demand softens late.

## 9. Orbit and the Moon in Act V

### 9.1 Orbit: the replacement cycle (V-D15)
Blocks keep their Act IV rules (life, failures, insurance, tenants). Blocks launched 2031-35 reach end of life in 2036-40. At end of life a block **retires** (deorbit, no value) unless the player:
- **Replaces it** through the Deal Desk with the current generation (launch, satellite cost and mass from the Act V market file);
- **Extends it** by one year at rising failures (+50% failure rate ⚙) for a small refit cost;
- **Brings the compute home:** moves the tenant to a ground site with free firm MW (keeps the tenant, needs ground capacity: the scarce thing in V1).
Orbit moves are 0 in the reading score; the money judges them. V4 rewards replacers.

### 9.2 The Moon offstage (V-D4, approved)
At the boundary `act4Moon` becomes one **lunar holding**:
- **Value:** its 2035Q4 value from doc 33 §11.3, then × a lunar value index per future (flat ±10% across futures, designed, since no post-2035 lunar schedule exists [D]).
- **Income:** a running pilot's sales continue at their 2035Q4 rate ⚙.
- **One action:** sell the holding (to a bloc at ×0.5 of value, or to a rival at ×0.3 in distress), 1 Bandwidth.
- **The production plant's fate**, if decided in Act IV: a hidden draw at the boundary (first tonnes 2039-43 per doc 31's 5-8 years) told only in the finale's epilogue, never in play or valuation beyond the stage factor.

## 10. The ground game in Act V

- Everything from Acts II-IV continues: projects, renewals priced off Act V's indices, Heat, Anger, moratoria, nuclear PPAs, political capital, Texas DR and 4CP ($60K/MW-yr from 2026, doc 41), ERCOT battery income ($50K/MW-yr), PJM capacity (the ELCC path to 0.25 by 2035, doc 41).
- **Ground demand:** the AI demand index drives new-lease rents and RFPs, as Act III's index did.
- **The bitcoin coda:** the 2036 halving (0.390625 BTC, ~2036Q2 [A for the schedule]) and the 2040 halving (0.1953125, ~2040Q2) halve leftover miners' revenue. Miners matter mainly as flexible load in V2 (curtailment pays). The Q-Day wildcard is the only other bitcoin event.

## 11. Capital, valuation and covenants

### 11.1 Instruments (V-D16)

| Instrument | Terms ⚙ | Basis |
|---|---|---|
| **Plant project debt** (after first power only; "no debt before first power" carries) | Up to 60% of plant value; SOFR + 250 bp if ≥ 70% of output is contracted, SOFR + 400 bp otherwise; 15-year amortising; non-recourse (the player's valuation subtracts stake × plant debt) | Shape of operating-asset project finance [C]; values designed, to be sourced in the content pack |
| **Sale to an infrastructure fund** | Sell all or part of a plant stake at stake × plant value × the future's `infra_bid_index` (0.9-1.15) | Goldendale: a fund bought the licensed project (2020) [B]; index designed |
| **Contract a plant's output** | Sell up to 80% of your share forward for 10-15 years at the current market price − 10% ⚙ | Long PPAs as in doc 40 §Q8 [A/B] |
| Equity, corporate facility, standby facility | As Act IV (the space-equity window closes into an ordinary equity raise at the AI multiple) | Built |

### 11.2 Contracts
Ground tenants, hosting and orbital tenants as before. Contracted plant output raises the plant multiple (§11.3) and removes merchant exposure.

### 11.3 Valuation (V-D17)
Σ(unit EBITDA × 4 × unit multiple) + cash + treasury − debt + under construction at capex spent + weighted backlog (Acts II-IV), with one new unit:
- **Operating plant:** stake × plant EBITDA × 4 × the **plant multiple** = contracted share × `plant_mult_contracted` + merchant share × `plant_mult_merchant` (market columns, per future ⚙; working values 12x and 7x, designed; infrastructure transaction multiples to be sourced in the content pack), − stake × plant debt.
- **Venture before first power:** the Act IV milestone mark (buy-in × 1.25 per milestone × 0.8 per slip, scaled by dilution), unchanged; at first power it switches to the operating-plant formula.
- This is where **E-B2** is re-measured: the operating-plant unit values a plant on what it earns, so a reactor's value at 2040 follows its output and contracts, not its cost (V-B10).
- Orbital units: EBITDA × space multiple (a market column per future; V4 high, others compressing). Lunar holding: §9.2.

### 11.4 Rating and covenants
Rating and the leverage covenant continue. Plant debt is non-recourse: a plant that breaks its own debt service (DSCR < 1.0 ⚙) hands its cash flow to lenders until cured; two quarters below → the lenders take the plant (stake to 0). The player's corporate covenant counts only stake × plant debt.

### 11.5 Losing
Act III's game-over rules. Fire-sale haircuts: plant stakes ×0.6 ⚙ (operating assets sell better than orbital blocks), sites with positions ×0.7, orbital and lunar as Act IV.

## 12. Rivals

Act IV's fictional rivals carry into the league with Act V curves and fates per future (Pallas Compute, Northgate, Cratermark, Lantern Arc; Orrery Compute only if it survived Act IV's script) ⚙. Add one fictional **firm-power developer** rival (working name "Basalt Power" ⚙, clash check pending) whose fate tells the SMR-wave story: announced orderbook, few units.

## 13. The stakes: failure modes and hedges

| Failure mode | Where it bites | Hedge |
|---|---|---|
| Merchant exposure when prices fall | V3, V4 late | Contract output early (§11.1) |
| Plant debt on a merchant plant | V3 | Debt only on contracted plants |
| Paying upgrades that reform makes pointless | V2 | Wait for the Reform Docket; co-locate |
| Selling scarcity too early | V1 | Sell part, keep part; watch Firm Build-out against delivered MW (the decoy) |
| Letting the orbital fleet retire | V4 | Replace on time |
| Late follow-on units | V3 | Commit only before the trigger, or with an offtaker |
| Venture calls in a downturn | all | Walk or dilute (doc 38) |

## 14. The core loop

### 14.1 Plan actions (new in Act V; Act II-IV actions remain except lunar)

| Action | Bandwidth | Money ⚙ | Score |
|---|---|---|---|
| Pay network upgrades on a position | 1 | $/kW | +1 |
| Request grid MW (opens a position) | 1 | study fee | 0 |
| Take the fast lane (V2, after the trigger) | 1 | - | −1 |
| Sell a site with its position | 1 | - | −1 |
| Commit a follow-on unit (stake / offtake / prepay) | 2 | buy-in | +1 |
| Arrange plant debt | 1 | fees | +1 |
| Sell a plant stake to a fund | 1 | - | −1 |
| Contract a plant's output | 1 | - | −1 |
| Replace, extend or bring home an orbital block | 1 | capex or refit | 0 |
| Sell the lunar holding | 1 | - | 0 |
| Read the market | 1 | - | as Act III |
| The founder's exit (2040Q3-Q4 only) | 0 | - | not scored (§15.2) |

### 14.2 Interrupts (up to 3 a quarter, each with a default)
Plant trip (a week offline: pay to restart early or accept) · venture cash call (pay, dilute, walk) · grid call (curtail when enrolled, or refuse and forfeit) · queue study result (accept the upgrade cost or withdraw) · block end of life (replace, extend, retire) · plus the ground and orbital interrupts of Acts II-IV.

### 14.3 Bandwidth and hires (V-D18)
Base 4 plus the existing bonuses, +1 when your first plant (your stake or offtake) reaches first power; maximum 9 ⚙. Two new hires:
- **Head of Grid Strategy:** −2 quarters on positions with upgrades paid ⚙.
- **Head of Power Trading:** +5% on merchant sales; can contract output at market − 5% instead of − 10% ⚙.

## 15. Scoring, the chapter report and the finale (V-D19)

### 15.1 The Act V chapter report
Like Act IV's: the future revealed (name, trigger, decoy and its tell), the reveal timeline of your moves, the reading score and title, each venture's fate (built, slipped, cancelled, folded; your stake's value), founder net worth (after the exit) and the growth multiple on the Act V entry, the valuation band, the rivals' fates, and a **megawatt title** for what you ended with (working names: *Firm*, *Flexible*, *Orbital*, *Landlord* ⚙).

### 15.2 The founder's exit (V-D20)
In the Plan phase of 2040Q3 or 2040Q4 the player chooses:
1. **Sell the company:** a strategic buyer's bid = valuation × a bid factor (0.95-1.15, drawn per future and shown, designed ⚙). Net worth = founder stake × bid.
2. **Sell the plants, keep the platform:** plant stakes sold to funds (§11.1); the rest held.
3. **Hold:** net worth = founder stake × valuation × the future's **post-2040 outlook factor** (V1 1.15, V2 1.00, V3 0.85, V4 0.95 ⚙ [D]; hidden until the reveal, §6.8).
So the exit is a last reading decision: a known bid against an unknown outlook. It is not part of the reading score (the money judges it). The finale says plainly that the outlook factor is the game's assumption, not a forecast. Default (no choice): hold.

### 15.3 The campaign finale, moved to 2040 (V-D2, approved)
As doc 33 §15.2, with:
- **The career ledger** gains an Act V row; the career multiple uses 2040Q4 founder net worth after the exit.
- **The megawatt line** ends in 2040 with firm, flexible and orbital MW.
- **The epilogue** adds pools for the four futures, the exit choice, each venture's fate, the lunar production plant's fate (§9.2) and the bitcoin coda (the 2040 halving). Text only; no 2045 projection.
- **Retire at 2035** keeps today's finale with Act IV as the last row, labelled "retired in 2035".

## 16. The data Act V needs (the content pack's job, after approval)

| File | Contents | Provenance |
|---|---|---|
| `market_v_v1..v4.csv` (20 rows) | Every carried column (Act II-IV systems) to 2040Q4, plus: AI demand index; `grid_wait_q` by region; fast-lane wait; `upgrade_usd_kw` by region; `queue_premium_usd_kw`; capacity prices; merchant prices by region; peak-off-peak spread; `plant_mult_contracted`, `plant_mult_merchant`; `infra_bid_index`; launch and orbital columns; space multiple; lunar value index; BTC, difficulty, subsidy (2036 and 2040 halvings), fee share, hashprice | Common 2036 baseline; IEA cases [C]; LBNL waits and upgrade costs [A]; PJM [A/C]; designed paths labelled |
| `market_weekly_v_*.csv` | Weekly BTC, hashprice, power and rent paths | Derived |
| `signals_v_v1..v4.json` | Six indicators, sharp ranges, decoys, triggers | Authored (designed) |
| `reading_score_v.json` (hidden) | Ideal stances, weights, oracle values | Designed; asserted by the sim |
| `plants_v.json` | Operating rules per class: fixed costs, contracted share, capacity ratings, follow-on terms | Doc 40 §Q8-Q9 [A/B]; designed where noted |
| `exit_v.json` (hidden part) | Bid factors, outlook factors | Designed [D] |
| `events_v.json` (~40 cards: 8 per future, ~8 shared), `wildcards_v.json` (5) | Cards | Designed; basis noted per card |
| `rivals_v.json` | 5-6 rivals × 4 futures × 20 quarters, fates | Designed |
| `hires_v.json`, `presets_v.json` | Two hires; three bot-made companies | Designed; generated by the sim |
| `text_v.en.json`, `epilogue.json` (extended) | UI text, glossary, headlines, titles, epilogue pools | Written |

**Research to close before the content pack** (a short third pass, doc 36 rules): infrastructure-fund transaction multiples for contracted and merchant power plants; operating-plant project-finance terms (leverage, spreads, tenor) for nuclear and geothermal; LBNL interconnection upgrade costs by region ($/kW); how queue positions transfer with projects in PJM, ERCOT and SPP; demand cases beyond 2035 (IEA stops at 2035; anything later is [D] extrapolation); climate and clean-credit policy after 2035 (doc 40 gap); community opposition trends after 2026; capacity accreditation for firm thermal plants.

## 17. Screens (a list; wireframes in a separate prompt)

- **A5-01 Act V intro:** what you carry in, the four MW columns, what's new, "these futures are scenarios".
- **A5-02 Plan dashboard:** the MW strip in four columns, Signals, plants at a glance, queue at a glance.
- **A5-03 Plants board:** ventures and operating plants: stage, CF, output, contracts, value, debt.
- **A5-04 Queue:** positions table with actions (SitePicker pattern).
- **A5-05 Deal builder, follow-on unit** (extends the venture dialog).
- **A5-06 Capital additions:** plant debt, fund sale, contract output.
- **A5-07 Quarter report additions:** plants and queue panels; Finances already carries the money (doc 39).
- **A5-08 Chapter report with the reveal.**
- **A5-09 The founder's exit** (dialog).
- **A5-10 Campaign finale** (extended).
- **A5-11 Start at Act V** (presets) and Scenario Mode.
- **Act IV chapter report:** "Continue to Act V" / "Retire at 2035".
Reused: Signals panel, Contracts, Sites & Fleet, site card, Orbit board, Finances, League, Settings.

## 18. Balance plan (what the bots must prove)

**Archetypes** (three presets × four futures, 30 seeds ⚙): **Firm Holder** (keeps plants, pays upgrades, stays merchant) · **Flex Operator** (enrols curtailable load, sells firmness forward, co-locates) · **Seller** (sells plants to funds and contracts output early, low debt) · **Orbit Replacer** (replaces every retiring block, adds orbit) · **Balanced** · **Over-reactor** (chases the decoy) · **Passive** · the **perfect reader**.

**Targets** (founder net worth multiple 2040Q4 ÷ Act V entry, medians, before the exit unless stated ⚙):

| # | Target | Why |
|---|---|---|
| V-B1 | No archetype is best in every future; Firm Holder, Flex Operator, Seller and Orbit Replacer are each best, or within 10%, in at least one | No single strategy wins (doc 08) |
| V-B2 | **V1: Firm Holder ≥ 1.2 × Seller** (the gate, §19) | Scarcity pays when the grid is jammed (the B3 lesson) |
| V-B3 | V2: Flex Operator ≥ 1.15 × Firm Holder | Reform rewards flexibility |
| V-B4 | V3: Seller ≥ 1.2 × Firm Holder; Firm Holder's game-over rate ≤ 30% | Selling at the top pays; holding is punished but survivable |
| V-B5 | V4: Orbit Replacer ≥ 1.15 × Firm Holder | Orbit's late parity pays |
| V-B6 | Ventures: no venture's expected net-worth contribution at 2040 beats the control by more than 1.5x; at least one beats it by 3x in its best case | E-B2, re-measured on earnings |
| V-B7 | The Firm Builder preset, played passively, never goes bust | Doc 27's A7, carried |
| V-B8 | Perfect reader ≥ 1.15 × passive in at least 3 of 4 futures; over-reactor ≤ 0.97 × passive in every future | Reading is a skill; the decoy costs |
| V-B9 | In every future and preset, Perfect's reading ≥ Passive − 2 (the M41 target) | Stance and economics agree |
| V-B10 | Honesty: no fusion output before 2038; venture P(first power by 2040) reported per class against doc 38's targets; grid waits within the future's band | The game stays honest |
| V-B11 | The exit: in each future, hold vs sell differ by ≤ 25% at the median (neither dominates) | A real last decision |
| V-B12 | No single plant trip or cash call forces a sale for a company inside the covenant | Decisions, not luck |
| V-B13 | ≤ 20 Plan phases, 3-6 decisions each; about 55-60 min | Pacing |
| V-B14 | Day one is the same in every future (identical 2036Q1-Q2, ±3% through 2036Q4) | The future can't be read from the first screen |

**Invariants:** Act I-IV goldens and the `--act2 --act3 --act4 --energy` outputs byte-identical (Act V adds no rule to earlier acts; "Retire at 2035" is the old ending); new goldens `act5-v1..v4`; main bundle under 500 KB.

## 19. Build order, the gate, cut order and the known timeline

**M43.0, the gate (V-D6, approved): prove V1 before building Act V.** A sim-only prototype, no UI: extend Act IV's engine with a stub 2036-40 V1 market (waits 24 → 28 q, demand +45%, capacity at the cap) and the operating-plant valuation (§11.3), then run Firm Holder against Seller from the three Act IV presets' 2035Q4 states, 30 seeds. Pass: V-B2 (≥ 1.2×). If it fails, the report says why (as B3's did: orbital EBITDA at story multiples), and the design thread revises V1's economics or the plant valuation before anything else is built. Act IV's B3 miss stays recorded either way.

**Build order (V-D27), after the gate:** (1) act-aware refactor for act 5 (`act: 5`, `isActV`, gates, save v6, timeline to 2040Q4, the Retire-at-2035 path, carry-over re-checked against `state.ts`); (2) walking skeleton (Act IV → V boundary, stub market, presets stubbed, the lunar holding); (3) futures engine, Signals, hidden files and guards, the common baseline and seam glide; (4) plants: operations, valuation, plant debt, fund sale, contracted output, follow-on units; (5) the queue; (6) orbit replacement, wildcards, rivals; (7) the exit, scoring, chapter report, finale, presets, bots and the balance pass.

**Cut order (V-D28):** 1. Wildcards → 2. Follow-on units → 3. Selling sites with positions (keep upgrades, co-location and the fast lane) → 4. Orbit "extend" and "bring home" (blocks replace or retire) → 5. Plant debt (keep fund sales) → 6. The V3 auction decoy (keep the SMR wave). **Never cut:** the hidden future and Signals, plant operations and valuation, the queue's wait and upgrades, the exit, the finale, carry-over.

**Known-future timeline events** (every future, fictionalised in game text): the 2036 and 2040 halvings (~Q2 each [A, schedule]); post-quantum migration deadlines passing (NIST's 2035 [A/B]); fusion's honesty line (nothing before 2038, doc 38); the end of the chip roadmaps' published horizon (~2038 [C], shown as "no announced generation after 2038"); first pumped-storage and SMR CODs follow the carried draws, not the calendar.

## 20. Deliberately out of scope

Lunar operations (V-D4); Mars; asteroid mining; fusion output before 2038; Q-Day as an act-long mechanic (one wildcard only); a 2045 projection or any number after 2040; trading queue positions apart from their sites; new stakeholder meters; new real company, agency or country names in game text; more than four futures; chips made in space; achievements; music.

## 21. Decisions for the owner (V-D1 to V-D30)

| # | Decision | Recommendation |
|---|---|---|
| V-D1 | Concept | **A, "Firm"**, with B's exit and C's flexibility and Q-Day folded in. *Approved 10 Oct 2026* |
| V-D2 | Campaign end | **Finale moves to 2040; "Retire at 2035" kept on Act IV's chapter report.** *Approved* |
| V-D3 | Futures and decoy | **V1-V4; the SMR-wave decoy** (V3 uses a record-auction decoy, §6.4). *Approved* |
| V-D4 | The Moon | **Offstage: one lunar holding; the production plant's fate told in the finale.** *Approved* |
| V-D5 | Act IV → V draw | **Independent.** *Approved* |
| V-D6 | The B3 dependency | **M43.0 gate: Firm Holder ≥ 1.2 × Seller in V1 before the build.** *Approved* |
| V-D7 | Span and length | 2036Q1-2040Q4, 20 decision quarters, about 55-60 min ⚙. *Approved (V-D7 to V-D30 approved together, 10 Oct 2026)* |
| V-D8 | Act title | **"Firm"** (doc 38's working title). Alternative: "The Long Line" |
| V-D9 | Weights and triggers | V1 30 / V2 25 / V3 25 / V4 20 ⚙; triggers 2037Q2-2038Q3 |
| V-D10 | Reuse | Scenario engine, Signals (six new), Read the market, decoy, reading score with the M40-41 rules, guards, Scenario Mode |
| V-D11 | Wildcards | 2 of 5 (Q-Day scare, fusion headline, dry year, large-load moratorium, transformer shortage) |
| V-D12 | Plants | Ventures become operating plants at first power: output at CF, contracted/merchant sales, running and fixed costs, capacity revenue |
| V-D13 | Follow-on units | Offered after a class's first power: EGS NOAK, SMR unit 2 at ×0.85; none for advanced fission or fusion in-act |
| V-D14 | The queue | Visible positions; pay upgrades (−⅓ wait), co-locate, fast lane in V2 only, sell only with the site |
| V-D15 | Orbit | Replacement cycle: replace, extend a year, bring home, or retire |
| V-D16 | Finance | Plant debt after first power (≤ 60%, non-recourse), fund sales at an index, contracted output |
| V-D17 | Valuation | Operating plants on EBITDA × a plant multiple (contracted vs merchant); ventures before first power keep the milestone mark |
| V-D18 | Bandwidth and hires | +1 at your first plant's first power; max 9; two hires |
| V-D19 | Scoring | Net worth after the exit, growth multiple, reading title, career title, megawatt title |
| V-D20 | The exit | Sell (known bid), sell plants, or hold (hidden outlook factor) in 2040Q3-Q4; default hold; outlook factors labelled [D] |
| V-D21 | Reading stance | Scarcity exposure (+1 adds, −1 sells or hedges; orbit and lunar 0) |
| V-D22 | Rivals | Act IV's five carry; add one fictional firm-power developer |
| V-D23 | Losing | Act III's rules; plant stakes ×0.6, sites with positions ×0.7 |
| V-D24 | Presets | Three bot-made 2035Q4 companies (Firm Builder, Orbital Landlord, Small Grid) |
| V-D25 | Names | No new real names in game text; generic generations; real names only in provenance |
| V-D26 | Era theme | A light `firm` theme (keeps the paper ledger) |
| V-D27 | Build order | As §19, after the gate |
| V-D28 | Cut order | As §19 |
| V-D29 | Hidden files | Reading score and exit outlook hidden; markets and Signals read in play |
| V-D30 | Research | A short third research pass (§16 list) before the content pack: brief in doc 44, results expected as doc 45 |

## 22. Open questions (not settled here)

1. **The gate's fallback.** If M43.0 fails, which do you prefer: sharpen V1 (higher capacity prices, longer waits), revalue plants (a scarcity premium on firm MW), or drop V1 to three futures? *Design thread recommends: sharpen V1 first, within the research's ranges; drop V1 only if that can't pass.*
2. **The exit's outlook factor** is the least grounded number in the game. Keep it (it makes the exit a decision), or make "hold" simply equal the valuation (then selling is a coin-flip on the bid)? *Design thread recommends: keep it, labelled [D] in the finale.*
3. **Scenario Mode carry-over:** may an Act IV Scenario Mode run continue into Act V, and how is the finale labelled?
4. **Standalone Act V:** open from the start, or after an Act IV finish?
5. **Session length:** the full campaign from the bedroom to 2040 is now about 5-6 hours ⚙. Is that the intended shape, or should the Prologue or Act V offer more auto-play?
6. **Bitcoin's weight:** mining is nearly gone by 2036. Is the coda (halvings, Q-Day wildcard, miners as flexible load in V2) enough of a farewell to the garage?
7. **The marketing page** says the campaign ends in 2035; update it after approval.
8. **Queue position sales:** positions move only with their sites here. If the third research pass finds RTOs that allow transfers on their own, revisit.

⚙ marks values expected to change after the sim.
