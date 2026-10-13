# 43: Act V design, "Firm" (2036 → 2040). v1.2, 11 Oct 2026 (v1.0 approved; v1.1 adds §0 after doc 45, the M43.0 gate runs and the content pack; §0.11: the gate passes; v1.2 adds §0.12: doc 49, new chips; §0.13: after the overnight run; §0.14: after the second run; §0.15: after the third run; §0.16: after the fourth run; §0.17: mid-run answers; §0.18: the first Act V screen; §0.19: after M61-M62; §0.20: after M63; §0.21: after M64; §0.22: after M65)

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

### 0.7 After the second gate run (M43.0b, 10 Oct 2026)
**Finding:** V1 1.040, V3 1.024 against 1.2. A 2035 company in this game is mostly cash, orbit and spot GPU clusters: leases are 55% of the Ground Fortress start, about 10% of Neocloud and the firm-heavy start, 0% of Ridge, and the median company has no free energized MW. Lock-or-roll can only move the lease book, and only the part that renews before 2040. This is the same root as Act IV's B3 miss: the earlier acts don't produce ground-heavy companies.
**Changes (designed [D], anchored to doc 45's powered-land and EV-per-MW evidence [C]):**
1. **Scarcity moves what the market pays for ground MW, not only new rents.** In Act V the AI (ground) multiple = its market value × (1 + 0.5 × (`scarcity_index` − 1)): ×1.25 by 2040 in V1, ×0.90 in V3. Spot GPU rents move by the same factor.
2. **The Seller cashes out its ground book.** Besides §0.6 (locks every lease long, sells free MW and plant stakes), it sells every leased ground site in 2036Q1 at its value that quarter (EBITDA × multiple + free MW × powered value). It keeps sites that serve its own GPU clusters. The Holder is unchanged.
3. **V-B2 and V-B4 are judged on ground-heavy starts:** the Ground Fortress start and a Firm Builder start (leases ≥ 40% of act5Entry). Orbit- and cash-heavy starts are reported as information: a company with little ground isn't exposed to the hold-or-sell question, and that's an honest outcome.
4. **Stop rule:** the 1.2 target stays. If the ground-heavy starts land at 1.10-1.19, the owner chooses between a lower margin (1.10) and a recorded miss; no further tuning of V1 or V3.

### 0.8 After the third gate run (M43.0c), owner's option A (10 Oct 2026)
**Finding:** V1 passes on the ground-heavy starts (Holder ÷ Seller 1.40 Fortress, 1.57 Firm Builder); V3 fails (0.94-0.96). Two causes, both in the gate: the Seller's cash earned nothing (a five-year income loss in every future), and V-B4 asked a plateau to behave like a crash.
**Owner's decision (option A):**
- Sale proceeds first repay debt; the rest earns SOFR.
- A third archetype, the **Locker:** keeps every site and stake, locks every lease long at the 2036 rate, contracts 80% of plant output at market − 10%; sells nothing.
- **V-B2:** V1 Holder ≥ 1.2 × Seller and Holder ≥ Locker. **V-B4 (replaced):** V3 Locker ≥ 1.05 × Holder. "V3 Seller ≥ 1.2 × Holder" becomes information only.
- Judged on ground-heavy starts; the Firm Builder preset (§3.4) is made from the Fortress line, since no other line reaches leases ≥ 40% of value.
- **The intro shows exposure (§17, A5-01):** the share of the company the futures can move (leases, free MW, plants), so a cash- or orbit-heavy player knows the act's question barely touches them.
- M43.0d is a confirmation run (no tuning); its result goes back to the owner.

### 0.9 Content pack review (doc 47, 11 Oct 2026)
Checked by the design thread: the four market files carry every Act IV column; all 117 value columns are identical across the futures through 2036Q4; the 2040 ends match §0 (V1 scarcity 1.5, $500K, $300/kW, PJM 24 q, capacity +30%, 8.5x; V2 1.1, $150K, $25, fast lane 7 → 4 q at 180 h, capacity −20%, demand 135; V3 demand 105 flat, 0.8, $100K, capacity −50%, 6x, fund bid 0.88; V4 launch $100, 0.9, $200K). Decisions on doc 47's open questions:
1. **Carrack Compute** (the game's name since M34.3) is right; doc 43/46's "Pallas" was the design thread's slip.
2. **Scarcity-neutral columns:** confirmed. The build lists every carried system that reads rents, renewal and RFP indices, the AI multiple or the old demand index, and applies `scarcity_index` (rents) or 1 + 0.5 × (scarcity − 1) (the multiple, spot rents) in each.
3. **Capacity price baseline: option (a),** keep the game's own $432.7/MW-day and let pumped storage earn by the formula (≈ $114/kW-yr). Continuity with the game's prices beats matching one research figure; §0.6's flat $85 was a gate simplification. V-B6 judges the result.
4. **Re-run the gate on doc 47's files** after M43.0d (no tuning).
5. **Exit bids leave the market file:** the bid ranges move to `exit_v.json` (hidden part); the player sees only the drawn bid when it is offered in 2040Q3.
6. **CC and CT ratings flat at 0.78 and 0.70** (PJM's sourced values; §0.4's ramp was a misreading).
7. **Withdrawing a position scores 0** (usually a cost decision after a high study bill).
8. **V2 pays flexibility:** from V2's trigger, enrolled curtailable MW earn the PJM capacity price × 0.5 (a new column `flex_capacity_rating`, 0.5 in V2 from the trigger, blank otherwise). Basis: demand response already clears in PJM's capacity auctions [A]; the 0.5 rating is designed [D].
9. **Clean-credit cliff:** a card only; 45Y is not modelled.
10. **The seam glide skips** the block subsidy, hashprice and the capacity ratings.
11. **Orrery and presets:** presets carry the Act IV future of the run that made them; Orrery appears only after F1 or F3.
12. **Weekly files gain six power columns:** a loader schema change for the build.
13. **Megawatt titles** Firm, Flexible, Orbital, Landlord: kept.
14. **Lunar holding** = its 2035Q4 value × `lunar_value_index` only.
15. **Fusion pilot running costs** borrow the reactor lines [D]; a research gap.
16. **The $50/kW position security is a deposit,** returned on energisation (as Texas's financial security).
Also noted: GPU-hour rates and the newest generation stay at their 2036 values through 2040 (no new chip generation in Act V); acceptable because leases reprice through `scarcity_index`, but the build should confirm no system reads "newest generation" in a way that looks frozen to the player.

### 0.10 New chips: the accelerator venture and a mainstream generation (owner request, 11 Oct 2026)
*Designed values below were working numbers [D]; superseded where they differ by §0.12 (doc 49, v1.2).*
- **Why:** Act V had no new chip generation (doc 47 froze GPU rates and the newest generation at 2036 values). Better chips raise revenue per energized MW, which feeds Act V's question; an efficiency jump can also reduce how many MW the world needs, so a chip a player backs can help its clouds and hurt its landlord book.
- **Mainstream generation (every future, every game):** a generic next generation ("Gen 2037" ⚙) arrives in 2037 with better performance per watt, its own GPUs per MW, rent and price, so rates move whether or not the venture succeeds. No real product names (IV-D28).
- **The accelerator venture (new venture type, Act IV):** a fictional chip developer (name after a clash check), a calendar project from 2031Q1 like the energy ventures (doc 38, M36.10), offered through the venture dialog.
  - **Milestones:** design sent to the factory (2033 ⚙), first working silicon (2034 ⚙), qualification, volume (2036 ⚙). A failed first silicon means a respin: +3-4 quarters and a cash call. Slips and cancellation use a calibrated draw; working target P(volume by 2038Q4) ≈ 0.35 ⚙.
  - **Roles:** a stake (10/20/30/49%), and an **allocation reservation** instead of an offtake: a deposit (10% of the reserved GPUs' price ⚙) for priority in the GPU queue and a 10-15% price discount ⚙ on that allocation once volume starts. Cash calls in thirds per milestone: pay, dilute or walk (doc 38). No debt before volume.
  - **Value:** the milestone mark (×1.25 per milestone, ×0.8 per slip) until volume; then stake × the developer's EBITDA (units shipped × margin per unit, from the content files) × a chip-company multiple ⚙.
- **If it succeeds:** a new GPU class appears in Act V from the quarter after volume, for everyone, with better performance per watt than the mainstream generation ⚙; backers get the priority and discount above. In V3 and V4 a successful chip trims the MW the world needs by up to 5% from volume (a modifier on the demand path, designed ⚙); in V1 and V2 scarcity swamps it.
- **Reading score:** accelerator moves count 0 (judged by the money), as other venture moves.
- **Balance:** as E-B2: its expected contribution ≤ 1.5× the control; best case ≥ 3×; P(volume) reported against the researched base rate (honesty).
- **Build and cut:** it touches Act IV (offered there): Act IV energy goldens change; Acts I-III and non-energy games stay byte-identical. It sits second in the cut order (after wildcards). It doesn't affect the M43.0 gate (no GPUs modelled there).

### 0.11 The gate passes (M43.0d, 11 Oct 2026)
*Design thread decision (DT), answering the M43.0d report. Nothing was tuned in M43.0d (confirmation rule).*
- **Result:** 5 of 6 targets pass. V1 Holder ÷ Seller 1.295 (Fortress) / 1.398 (Firm Builder), target ≥ 1.2; V1 Holder ÷ Locker 1.122 / 1.131, target ≥ 1.0; V3 Locker ÷ Holder 1.061 on the Firm Builder start (pass) and **1.031 on Fortress (near-miss against 1.05)**.
- **Decision: the gate is passed** (V-D6 satisfied). V-B4 is judged on the Firm Builder start (§0.8), and it passes there. Fortress's 1.031 is recorded as a **near-miss**, not a failure: the sign is right (locking beats holding in V3), the gap is 0.019, and its cause is structural rather than a broken rule: the V3 rent fall (0.8 from 2037Q4) only reaches leases that renew after the trigger, and the ground multiple's ×0.90 hits Holder and Locker alike because both keep the sites.
- **Why not tune now:** the gate ran on stub markets. Tuning stubs to hit a threshold would be fitting noise; the real files (doc 47) may move the number either way.
- **Re-measure, twice:** (1) **M43.0e**, the gate re-run on doc 47's real market files (§0.9 item 4), still no tuning, reporting all six targets plus V3 Seller ÷ Holder; (2) the build's balance pass (§18). If Fortress is still below 1.05 at the balance pass, the levers in order ⚙: (a) the share of leases that renew inside the act (lease-term mix at act5Entry); (b) the V3 renewal rent factor 0.80 → 0.75; (c) the V3 merchant fall's timing (two quarters earlier). Constraint: every V1 target must still pass. The balance pass picks; no change to the rules.
- **Seller ≈ Holder in V3 (1.03-1.05):** accepted. V3 should reward hedging, and selling is a hedge; no target on it. On Fortress the Seller edges the Locker (1.034 vs 1.031); acceptable, both beat holding.
- **M43.0d's assumptions adopted as design** (tools/act5-gate/README.md, "M43.0d"): the Seller's proceeds repay all its debt first, the rest compounds at SOFR ÷ 4; the Locker locks every lease long at the 2036 rate and contracts 80% of its plant merchant output at the 2036Q1 price × 0.9, counted as contracted (10×), from first power for plants not yet running.
- **Doc 47 errata for the build (fix in the files and their generators, not here):**
  1. The raise rule. `reading_score_v.json` (`rules.raise` and the `equity_raise_unfollowed` row, −1), `events_v.json` `_meta.note`, and `generators/content.py` and `events.py` say "−1 if none follows (within 2 quarters)". The M41 rule stands: a raise takes the sign of the next scored move at any distance, and scores **0** if none follows before the act ends. The unfollowed row becomes 0.
  2. En dashes in the Signals notes (`signals_v_v1..v4.json`, `generators/signals.py`): replace with hyphens.
  3. The §0.9 items the build applies: exit bids out of the market files (item 5), `flex_capacity_rating` and the V2 flex payment (item 8), CC and CT ratings flat at 0.78 and 0.70 (item 6), withdrawing a position scores 0 (item 7), the weekly files' six power columns (item 12).
- **What's next:** M43.0e, then the build per §19 (M44 onward). The chips feature (§0.10) waits for doc 49; it touches Act IV and sits second in the cut order, so it slots in after the plants and queue milestones, not before.

### 0.12 Doc 49 adopted: new chips (v1.2, 11 Oct 2026)
*Doc 49 (research + content, `claude/act5-content/chips/`) corrects §0.10. Where this section and §0.10 disagree, this section wins. Owner decisions marked (O), design-thread decisions (DT).*
- **Names:** developer **Halyard Silicon**, its chip **Halyard Bowline**, mainstream generation **Gen 2037** (clash check passed; "H1" and "A1" rejected as Apple chip names).
- **Start (O): 2032Q1**, not 2031Q1. Sourced timelines (design to tape-out 18-30 months, tape-out to first silicon about a quarter, first silicon to volume 9-18 months) put a 2031 start's median volume in 2035Q2, inside Act IV, where the chip couldn't be bought. A year later lands the median around 2036Q2. Pitched milestones move with it: tape-out 2034Q1, first silicon 2034Q2, qualification 2035Q1, volume 2035Q3. The chip enters the market at max(volume + 1, 2036Q1), which now binds only for the early tail. The calibration target becomes **P(volume within 8 years of the start) = 0.30, i.e. by 2039Q4** (was 0.35 by 2038Q4), with outcome shares built 0.30 / acquired at a gain 0.15 / acquired at a loss 0.25 / cancelled 0.30. The generator is re-run and re-calibrated in the build (it keeps doc 49's shapes; only the start shifts). If volume still falls in Act IV, doc 49's assumption 1 applies (stake valued on EBITDA from volume, Act IV quarters at 2036Q1 market values).
- **Slips and respins (doc 49):** one slip draw per game scales every phase (median ×1.30, σ 0.30, floor 0.9, cap 2.5). Respin chance 0.5, a second one 0.2, each 1-2 quarters plus a cash call of 5% of the pitch, each counted as a slip in the mark (×0.8).
- **Hazards before volume (doc 49):** cancel 10.5%, acquired at a gain 5.5%, acquired at a loss 9% a year. A loss pays paid-in × U(0.3, 0.9) and can't be blocked. A gain pays the mark × U(1.5, 3.0) via the card "A Buyer for Halyard". Licence-and-hire deals are folded into "acquired at a gain" (DT; no fifth outcome).
- **Blocking a sale at a gain (O): only the 49% stake** (the lead stake carries protective provisions). Stakes of 10-30% are dragged along at the offer price. Doc 49 had 30% or more.
- **Money (doc 49):** pitch $800M; realised cost × a "semiconductor" overrun class (median 1.25, σ 0.35, cap 3.0); cash calls in thirds at tape-out, first silicon and volume; no debt before volume. Stakes priced as doc 38 (stake × pitch).
- **Allocation reservation (doc 49):** 10% deposit for a 10% discount, or 20% for 15%; blocks of 5, 10 or 25 MW; delivered in the first two quarters of volume and taken within 4 quarters; deposits credited at delivery, lost on cancellation, refunded at par on an acquisition.
- **Foundry allocation (doc 49, new):** a 35% chance at volume that the first 4 quarters ship at 50% of units; reservation holders are served first (the reservation is the hedge). No separate slip.
- **After volume (doc 49):** units ramp 25/50/75/100% to 8,000 a quarter (×1.1 V1, ×0.6 V3 after its trigger, ×0.85 V4 late); EBITDA 5% of the unit price in year 1, 15% in year 2, 25% from year 3; chip-company multiple 20× (V1/V2 rising to 22× by 2040, V3 15× from its trigger). Value = stake × max(mark at volume, EBITDA × 4 × multiple) for 4 quarters, then on EBITDA alone.
- **Generations (doc 49):** **Gen 2037** in every game from 2037Q1: 1.4× perf/W over the 2036 newest class, 1,150 GPUs/MW (was 1,050), top tier, 600 kW racks, revenue per MW 1.25× at launch. **Halyard Bowline** only on success: 1.3× perf/W over Gen 2037, same rack class, rent and list price 1.2× Gen 2037. Spot and 1-year rents use H100's ratios.
- **Rents after launch (DT): flat** (doc 47's scarcity-neutral rule; the engine applies `scarcity_index`). Ageing comes through the renewal GPU index at contract end, not by editing rents.
- **Demand trim (O): dropped.** §0.10's "trims the MW the world needs by up to 5%" is removed, and doc 49's 2%-in-V3 rule with it: one chip moves world demand by nothing measurable once rebound is counted, and a hidden rule that small isn't worth a leak risk. The chip's tension stays in the money: backers gain priority, a discount and a stake; everyone's GPU book meets Gen 2037. `demand_trim` is removed from `venture_accelerator.json` and the generator.
- **Stake premium (DT, deferred to the bots):** stakes stay at stake × pitch. If E-B2 finds the venture too rich (expected contribution > 1.5× the control; doc 49 estimates about 2.3× buy-in expected, 5-6× best case for a 49% stake), the fixes in order ⚙: (a) a ×1.5 entry premium on the stake price (the realism fix: real rounds price credible teams at 2-5× paid-in); (b) the multiple 20× → 15×; (c) full-ramp units 8,000 → 6,000.
- **V4 (DT):** keep doc 49's units ×0.85 late; no separate orbit rule.
- **Text fixes:** the epilogue line "The chip you backed in 2031 shipped" becomes "The chip you backed in 2032 shipped"; the venture's diligence line shows P(volume within 8 years) ≈ 0.30; the "Vote against the sale" choice requires a 49% stake.
- **Reading score:** every chips move and card logs 0 (§0.10, unchanged).
- **Build placement (DT):** two parts. **Gen 2037** (the mainstream generation's columns and GPU entry) touches only Act V and lands with the first Act V milestone that sells GPUs. **The accelerator venture** touches Act IV (offered there from 2032Q1): Act IV energy goldens change; Acts I-III and non-energy games stay byte-identical; it comes after the plants and queue milestones and stays second in the cut order (after wildcards). Neither part affects the M43.0 gate.

### 0.13 After the overnight run (M43.0e, M48, M49; 11 Oct 2026)
*Design-thread decisions (DT) on the run's four questions.*
- **M43.0e (the gate on doc 47's real files):** every V1 target passes (Holder ÷ Seller 1.311 Fortress / 1.463 Firm Builder; Holder ÷ Locker 1.137 / 1.142). V3 Locker ÷ Holder 1.074 on Firm Builder (pass) and 1.028 on Fortress (near-miss, was 1.031 on the stubs). The near-miss is stable across stubs and real files, which confirms §0.11's reading: it's structural. **The balance pass owns it**, with §0.11's levers in order; no tuning before then.
- **Presets (§3.4 amended):** the scan found only Orbital Landlord. Hand-making a company would break "values set by the sim", so the descriptions change and the scan widens; values stay unset by design.
  - **Firm Builder** becomes: a ground landlord with leases ≥ 40% of value (the gate's definition, so the preset is one of the companies V-B4 is judged on), at least one plant stake whose first power falls in 2035Q1-2038Q4 (a plant that has just switched on counts), offtake if its line has one, little orbit. The scan adds the recipes behind M43.0d/e's 475 Firm Builder runs, and may let the bot join one energy venture later (2032-33) so first power lands in Act V. Choosing recipes is allowed; choosing values isn't.
  - **Small Grid** becomes: a small survivor with one or two sites and a queue position; a battery only if it survives. The scan tries the Ridge line without a battery and with a queue position bought in Act IV, then the neocloud line. **If nothing survives to 2035Q4, Small Grid is cut and Act V ships with two presets** (it isn't on the never-cut list). V-B7 (Firm Builder never goes bust when played passively) still applies.
- **Generators stay in Python** (tools/act5/, `npm run content:act5`). Porting would only re-prove 21 byte-identical files. The game ships the committed outputs, so the site build never needs Python; the byte-identity test guards drift.
- **Order of the next run:** unchanged. §19 item (3) (futures engine, Signals, hidden files and guards, reading score), then (4) plants, (5) the queue, then chips part 2 (§0.12), with the preset rescan first, and the long sim runs re-run, since M49 touched Act IV's rule gates.
- **Live site:** the Act V entry points ("Continue to Act V", "Start at Act V") stay behind a dev flag until Act V is playable end to end; "Retire at 2035" and the rest of Act IV's chapter report ship as today. This lets the stacked PRs merge to main without exposing a skeleton act.

### 0.14 After the second unattended run (M50-M54; 11 Oct 2026)
*Design-thread decisions (DT) on the run's eight questions. Everything else in the run's "decisions I took" list is accepted as built.*
1. **Small Grid is cut; Act V ships with two presets** (Firm Builder, Orbital Landlord). The scan's match (0.1 MW, orbit 88% of value, a grid request with no build started) fits §0.13's wording but not its purpose, the cheap ground seat. §0.13 already allowed the cut; tightening the description again would only search for a company the Act IV economy doesn't produce. V-D24 and §3.4 read "two presets".
2. **The seam for operating plants:** the switch from milestone mark to earnings value at 2036Q1 is correct, but it isn't a result of play. **act5Entry is measured after the switch**, so Act V's growth multiple starts from the earnings value. Act IV's final numbers (act4End, Act IV's chapter report, "Retire at 2035") keep the mark, unchanged. The A5-01 intro and the Act V chapter report show the difference on one line, "Running plants revalued on earnings", so the drop is explained rather than hidden.
3. **Developer contracts keep the base contracted multiple (10×).** The sourced multiple already describes typical contracted plants with a mix of remaining terms; adding a term per class would mean inventing numbers to move 10× to 11×. The contract-tail multiples apply only to contracts the player signs.
4. **The fast lane's −0.5% output:** yes, 0.5% of the enrolled share's AI revenue, the reading of doc 45's basis (about 0.5% of annual energy curtailed). Add the other half: the curtailed energy isn't bought, so 0.5% of the enrolled share's energy cost is saved.
5. **Accelerator E-B2: not a miss as written, but a diagnosis is owed.** V-B6's 3× clause ("at least one venture beats the control by 3× in its best case") is across all ventures, not per venture; the energy ventures carry it, and the accelerator passes its own clause (expected ≤ 1.5× the control). But the measured economics sit far below doc 49's plausibility check (about 2.3× buy-in expected, 5-6× best case for a 49% stake): the run found −$9M expected at 2035Q4 and +$4M at 2040, best case $225M for a 20% stake. Ten seeds give only about three successes, so before any change: run ≥ 200 independent draws of the venture (decouple its draw from the game seed), and report per outcome the stake's 2040 value against buy-in plus calls, the bot's call behaviour (pay or dilute, and the stake left), and for the best built case the terms (units, EBITDA share, multiple, quarters since volume). Sanity target (DT ⚙): a built outcome with calls paid returns ≥ 3× buy-in plus calls by 2040. If it doesn't, report which term binds; don't tune.
6. **The accelerator stays behind the Act V dev flag until Act V ships.** Its payoff and Bowline exist only in Act V; offered live in Act IV, it would be a bet whose result a "Retire at 2035" player never sees (doc 38 §6's Moon problem).
7. **rivals_v.json is wired with build item 6** (orbit replacement, wildcards, rivals), as planned.
8. **Selling a site: add one whole-site sale** that bundles the existing pieces at their own prices (the leases at the lease-sale value, free energized MW and queue positions as M53's site power sale); no new pricing rule. Keep the piece-by-piece actions. Reason: the Seller archetype the gate passed sells whole sites (M43.0d: leased sites, free MW at $300K, plant stakes), and item 7's bots need the same action in the game.

### 0.15 After the third unattended run (M55-M57; 11 Oct 2026)
*Design-thread decisions (DT) on the run's eleven questions. Read the §18 table first: in V2-V4 every holding bot loses value, the Seller is flat (≈1.02) and best on the Firm Builder in three futures, and Orbital Landlord roughly halves in every future, V4 included. That isn't the design's shape (§6.2: V1 rewards holding, V2 flexibility, V3 selling or hedging, V4 orbit). The report itself names the likeliest common cause: lease renewal offers sit at 0.4-0.9 of the old rent even in V1, where §0.2 and §0.6 say renewals reprice up with `scarcity_index`. So the order is: fix what departs from the spec, wire what's missing, re-measure, and only then use balance levers. No ⚙ value changes before the re-measure.*

**Fixes (they depart from the spec or the gate as built):**
1. **Lease renewals (Q1).** Ground and shell leases (power and space rent) renew at the 2035Q4 rent × the file's `scarcity_index` path (the gate's §0.6 lock path), not at a GPU renewal index. GPU-hour contracts keep the GPU index. **Walks fall with scarcity** ⚙: the renewal walk chance is the Act IV base ÷ `scarcity_index` (fewer walks in V1, more in V3). The lease-lock cards keep their own terms (10 years where the card says ten; 8 for "a long extension"); the generic long lock stays 9 years.
2. **Cash earns SOFR in Act V (Q7).** The gate validated the design with the Seller's leftover proceeds earning SOFR; the game must match the gate. From 2036Q1, a positive cash balance earns the market file's SOFR ÷ 4 each quarter. Act V only, so Acts I-IV stay byte-identical.
3. **Enrol existing load as curtailable (Q2).** A new action, offered in every future from 2036Q1 (offering it only in V2 would reveal V2): enrol existing AI halls or miners as curtailable; they earn the flex payment where `flex_capacity_rating` > 0 (V2 after its trigger) and give up 0.5% of the enrolled share's AI revenue, minus the energy not bought. Reading sign −1 (`enrol_flexible`). The miners' halving card and "Enrol a test hall as flexible" use it.
4. **Wire every events_v.json card (Q8)**, the triggers' cards first, then signals, decoys, aftermaths, winners and the shared cards, with their reading signs. The futures' story, the decoys V-B8 measures and several bot choices (lock offers, fund bids, contract offers) run through these cards, so the table can't be read without them.
5. **End-of-life card bodies (Q9):** a neutral body before the future's trigger has fired ("One of your orbital blocks reaches the end of its design life. Replace it, run it another year, bring the compute home to a ground hall, or retire it."); the per-future body only after the trigger (by then the trigger card has told the story). Orbital Landlord's blocks retiring in 2036-37 will see the neutral one.
6. **Orbit Replacer bot (Q3):** its row is identical to the Holder's in every cell, so it isn't doing its job. Per §18 it replaces every retiring block **and adds orbit** (new launches when cash allows). Orbit valuation stays as built (cost until live, then earnings × the file's orbital multiple); no story multiple at launch (the B3 lesson).
7. **A Builder bot for V-B6 (Q10):** the Firm Holder plus every follow-on unit offered. The accelerator stays measured by its diagnosis and E-B2 (it's an Act IV decision; presets start at 2035Q4).

**Judging rules:**
8. **V-B5 is judged on the orbit-heavy start (Orbital Landlord)**, the mirror of V-B2 and V-B4 on ground-heavy starts. Firm Builder's V-B5 is information.
9. **V-B9 is judged on ground-heavy starts (Q5)**: the reading score measures scarcity exposure, and an 88%-orbit company has little. Orbital Landlord's is information, but the run reports one OL V3 seed's move list so a scoring bug can be ruled out (−21 is large).
10. **Orbital Landlord's halving needs a decomposition before any judgement:** its 2036→2040 change split into orbit blocks (live, retired, replaced), the lunar holding, the multiple, cash and debt, per future. V4 is meant to be orbit's future, so a 0.36 there needs an explanation, not a lever.

**Accepted as built:** the accelerator diagnosis (built median 3.91× buy-in plus calls, 31 of 41 pass the sanity target; the misses are mostly V3 doing its job; expected return about 1.7× capital), no change; the run's assumptions (9-year long lock, exit sale settles on the 2040Q4 valuation, the megawatt split, epilogue fit, Q-Day on mining revenue and the treasury mark, refit = a year's in-orbit insurance, bring-home to the site with the most free MW, the 10% diagnosis stake). Bots doing no ground growth is accepted for the targets (they're ratios), but absolute multiples are read with that in mind.

**Levers after the re-measure, in order, smallest step first (the balance pass may use only these; every V1 target must still pass):**
- V-B2, if V1 Holder ÷ Locker < 1.0 after fix 1: V1's merchant multiple after the trigger 8.5× → 10.5× ⚙ (merchant firm power at least as valuable as contracted when scarcity is rising; designed, [D]).
- V-B11, if FB V3 hold ÷ sell < 0.80: V3's bid top 1.10 → 1.08. The hidden outlook factors stay as they are.
- Fortress's V3 lock (§0.11) and the accelerator (§0.12) levers as before.
- V-B3, V-B4, V-B5, V-B8: no levers; report.

**Live site (Q11), owner's call; recommendation:** keep Act V behind the flag until the re-measured table meets the core targets (V-B1, B2, B4, B11) and the owner has played Act V once end to end. It's a 55-60 minute chapter no human has played yet.

### 0.16 After the fourth unattended run (M58-M59; 11 Oct 2026)
*Design-thread decisions (DT) on the run's seven questions, plus one finding of mine (item 1). The renewal fix did what §0.15 expected: holders now gain in V1 (Holder 1.63 on Firm Builder) and V2, and the core V1 targets pass. Accepted as built: the M58 fixes, the diagnostics, the perfect-reader rest fix, and the balance pass's one change (V3 `scarcity_index` end 0.80 → 0.75; since §0.15 renewals follow the index, this is §0.11's lever b, and it also lowers V3's ground multiple, which is consistent with V3).*

1. **Orbit blocks are valued on their remaining life from 2036Q1 (DT, new).** The decomposition shows Orbital Landlord's halving comes from five blocks that all retire inside the act while being carried at 2035Q4 at an EBITDA multiple of about 16×. A block with one to four years of design life left can't be worth 16 years of its earnings: that's the B3 lesson (orbital EBITDA at story multiples) carried into act5Entry. Rule: in Act V an orbital block's multiple is **min(the file's orbital multiple, its remaining design life in years)**, new blocks included (a fresh 5-year block caps at 5×). It switches at the seam like the plants (§0.14 item 2): act5Entry is measured after it, Act IV's numbers keep the old mark, and the intro and the Act V chapter report show "Orbital blocks revalued on remaining life". V4's orbit payoff then comes from earnings (cheaper launches, more blocks replaced), not from a multiple on wasting assets. Report Orbital Landlord's rows before and after; V-B5 is re-judged on the new values.
2. **Trigger cards (Q1): keep them as written.** A trigger card plays in the trigger quarter, when the future arrives; telling the player is the point, and the reading game is the quarters before it. Check that no trigger title or body is readable before its quarter (the guards should already cover this).
3. **V-B4 (Q2): restore the original form, with the Locker as a sign check.** §18's V-B4 was "V3: Seller ≥ 1.2 × Holder". §0.8 (owner's option A) replaced it with "Locker ≥ 1.05 × Holder" because the gate's Seller earned nothing on cash and V3 was being asked to behave like a crash. §0.15 fixed the cash, and the Seller now makes 1.32× the Holder in V3. **V-B4 becomes: V3 Seller ≥ 1.2 × Holder, and Locker > Holder** (1.039: the sign is right; the lock only protects leases that would renew after the trigger, a structural limit). No further step on the V3 index: 0.75 → 0.70 would also push V-B11 (hold ÷ sell, 0.81 against 0.80) into a miss. *This partly reverses the owner's §0.8 choice, so it stands unless the owner says otherwise.*
4. **V-B3 (Q3): diagnose the Flex bot before raising any rating.** V2's design payoff for flexibility is mainly connecting new load sooner through the fast lane (4-8 quarters against 20+), and the bots do no ground growth, so that payoff may never appear. Report the Flex Operator's fast-lane MW connected and leased, and the revenue from them. If it builds nothing, give it the growth the design assumes: it connects and leases new halls through the fast lane under the same cash guard the Orbit Replacer uses for new blocks. Only if V-B3 still misses after that: `flex_capacity_rating` in V2 after the trigger 0.5 → 0.75 ⚙ (one step; 1.0 would pay curtailable load like a generator).
5. **V-B8 (Q4): re-check V2's ideal stances; don't speed up V2's scarcity.** V2's index rises only to 1.07 by its trigger and keeps rising slowly to about 1.09; it never falls. So "+1 for 8 quarters" asks for a bet a 7% rise can't pay, and "−1 after the trigger" asks for less exposure while the index is still rising. Raising V2's early scarcity would help holders and worsen V-B3. **V2's ideal becomes 0 before the trigger and 0 for lease moves after it; after the trigger, −1 applies to flexibility moves only** (enrol, fast lane, flex capacity bids), which is what V2 rewards. Change it in the reading-score generator, regenerate, and re-check V-B8 and V-B9.
6. **V-B6 (Q5): Builder − Holder is the right Act V measure** (doc 38 §5.8's control can't connect inside Act V's queue waits), **but a follow-on that is always cancelled is not intended.** Doc 38's draws cancel some SMRs, not all (E-B4 asks for at least one cancellation in 30 seeds). Find why every follow-on SMR cancels (in all 240 runs), and why the Firm Builder isn't offered the EGS follow-on after egs2's first power (V-D13: EGS NOAK). Fix whichever is a bug, then re-measure. A follow-on that can't reach first power before 2040 is valued at its milestone mark, as other ventures are.
7. **The V4 launch-slot card (Q6): build a minimal system.** "Reserve replacement launch slots" (1 Bandwidth, a deposit of 15% of the next replacement's launch cost): the next replacement's lead time falls by one quarter; the deposit is credited against that launch; half is refunded if no replacement launches by 2040Q4. No price lock: in V4 launch prices fall, and a lock would turn the card into a trap.
8. **Live site (Q7):** with items 3-6 settled, the core targets (V-B1, B2, B4, B11) pass on the next re-measure or come back with a named cause. Act V stays behind the flag until then **and** until the owner has played it once end to end. The flag flips only on the owner's word.

**Assumptions accepted, with three changes:** (a) card effects that state a Bandwidth cost (e.g. the turbine slot, the flex study) charge it; the rest stay free, as built; (b) "Enrol a test hall as flexible" enrols the card's 10 MW, not the whole site; the plain action keeps whole-site enrolment and no un-enrolling; (c) fund and site bids: the player picks the stake or site in the UI; bots and the default take the largest stake and the most valuable site, as built. All other assumptions in the M59 report are accepted.

### 0.17 Mid-run answers (M60, fifth run; 11 Oct 2026)
*Design-thread decisions (DT) on the interim report's five questions. M60 is accepted as built (remaining-life orbit values, the V-B4 form, the Flex diagnosis, V2's stances, the act5Seed fix for Act V draws, the launch-slot card, the card rules, the trigger guard), with all six listed assumptions.*
1. **V-B5 stays on Orbital Landlord.** After the remaining-life rule no preset is orbit-heavy by value, because orbit's old value was mostly multiple. V-B5 tests the orbit decision (replace, extend, bring home, retire, add), and Orbital Landlord is the start where all five blocks retire inside the act, so it's where that decision is largest. "Orbit-heavy" for V-B5 means the orbital fleet that reaches end of life in the act, not the value share. V-B2 and V-B4 stay judged on Firm Builder; Orbital Landlord now meets §0.8's lease test too, so its V-B2 and V-B4 numbers are reported as information.
2. **Keep the two companies; reword the descriptions.** A re-scan on the new footing would pick both presets from the Fortress line and lose the second start's character. The scan keeps choosing on Act IV's 2035Q4 marks. New text: **Orbital Landlord**, "a ground-and-orbit company whose five orbital blocks all reach end of life inside the act: replacing them is its game"; **Firm Builder**, "a ground landlord whose first geothermal plant has just switched on" (unchanged in substance).
3. **V2's opposite oracle equal to Passive is acceptable.** Un-enrolling isn't built, and adding it only to give the oracle a +1 move would be a mechanic for a test's sake.
4. **The SMR follow-on is a bet carried past 2040**, as V-D13 and the V3 card ("first power after 2040") already say: licensing plus construction can't finish inside the act. It is valued at its milestone mark, and its fate is told in the finale. The offer dialog says so plainly: "First power expected after 2040; valued at its milestone mark until then."
5. **The launch-slot deposit estimate is fine as built.** The deposit is credited against the real launch, so the estimate only sizes it.

### 0.18 The owner's first Act V screen (11 Oct 2026)
*From the owner's first preset game (Orbital Landlord, 2036Q1). Design-thread findings (DT), checked against the code on main.*
- **The Moon tab is gone by design** (V-D4, §3: the Moon becomes one lunar holding). But the holding is only a line in Capital's valuation, and `sell_lunar_holding` has no button. Fix: a small **Lunar holding** panel (in Capital, or Ventures): 2035Q4 value, today's index and value, the first-tonnes outlook, and Sell.
- **The Orbit tab is missing by mistake.** `frame.tsx`'s nav shows `act4: true` items only when `act === 4`; M49 carried orbit's rules into Act V (`inAct4Rules`) but not its nav item. In Act V the player can't reach the Orbit board, so the replacement cycle (§9.1), the end-of-life Plan panels and the launch-slot booking are unreachable; V-B5 tests a decision no human can make. Fix: Orbit uses `inAct4Rules`; Moon stays Act IV-only.
- **The bots exercised the systems; the screens weren't built.** The dashboard is Act IV's (Mining / Hosting / AI shell / AI cloud strip), not A5-02's four MW columns with plants and queue at a glance; A5-03 (Plants board), A5-04 (Queue) and A5-06 (Capital additions) need checking. §17's list is the spec. Act I-II actions (friends-and-family raise, crypto-backed loan, Series A, IPO) show struck through in Act V's Plan: hide actions that can never unlock in the current act.
- **Header check:** cash shows $49.2B against a $7.1B valuation. Either a formatting or a valuation bug; find which. (The $7.1B also suggests a build from before M60, which cut this preset's entry value to $3.46B; restart the dev server on current main.)
- **Rule (new):** every Act V player action in `state.ts` has a reachable UI entry point; a test asserts it. The owner's playthrough waits for this milestone.

### 0.19 After M61-M62 (12 Oct 2026)
*Design-thread decisions (DT) on the report's eight questions. M61 and M62 are accepted as built, with the four listed assumptions.*
1. **Orbit's payoff (V-B1 on Firm Builder, V-B5): neither proposed option.** Valuing a new block at its full design life from launch only delays the write-down, and judging orbit on cash alone ignores what the blocks are still worth. Under the remaining-life rule a block launched today is worth up to 5 × its yearly EBITDA. If the Orbit Replacer still loses, then in V4 a new block costs more than about five years of its earnings: **it doesn't pay back over its life**, whatever the rule. That's a question about V4's content, not the valuation. Next step: a unit-economics table for a block launched in each quarter of 2037-2040, per future: capex (satellites, launch, insurance), yearly EBITDA, payback in years, and lifetime EBITDA ÷ capex over its design life (plus the one-year extension). If lifetime EBITDA ÷ capex in V4 after its trigger is below 1.0, V4's premise ("orbit's late parity pays", §6.2; parity around 2040 in doc 40/45's sources) isn't in the files. Then fix V4's post-trigger orbital cost path in doc 47's generator, so a block launched after the trigger returns about **1.3× its capex over its design life** ⚙ (designed, [D]), and re-measure. Other futures stay as they are.
2. **V-B3 is redefined by its purpose; the lever is reverted.** "Flex ≥ 1.15 × Holder" asked flexibility to beat holding by more than a ground landlord's flexible share can move the whole company. V-B1's spirit is that the future's own strategy wins it. **New V-B3: in V2, the Flex Operator is the best of the strategy archetypes** (Holder, Flex, Seller, Locker, Orbit Replacer, Builder). On M61's table it already is, on both presets (FB 1.311, OL 1.156). The 0.5 → 0.75 rating step moved V-B3 by 0.002, so it's reverted to 0.5 (no change without effect).
3. **V-B8: V4's decoy points the right way; replace it.** In V4 ground rents do soften (scarcity 1.0 → 0.9), so the SMR-wave decoy's "sell a site while ground is dear" is a correct hedge, not a trap, which is why the over-reactor wins. V4 gets a scarcity-up decoy instead, like V3's record auction: window 2037Q4, title **"Firm Power Runs Short"**, body "Three utilities file for emergency capacity after a hot summer, and the capacity auction clears at the cap. Brokers say ground power will be the scarcest thing of the decade.", choices "Note it" (0) and "Buy a queue-holding site before prices run" (+1, the wrong stance; effect as v_v3_c1's). V-D3 now reads: the SMR-wave decoy in V1 and V2, a record-auction decoy in V3 and V4. Note also that V-B8 misses more widely than V2: Perfect ÷ Passive reaches 1.15 only in V1 on Firm Builder (V3 1.10, V4 1.11). Re-measure after the decoy change and the orbit fix; the target stays as written until then.
4. **The owner's playthrough can start now** (staging, Start at Act V). V-B1 on Firm Builder and V-B5 are recorded misses with one named cause (item 1). The dev flag stays on until item 1's check is done and the owner has played.
5. **Block sales use the remaining-life multiple: confirmed.** A buyer pays for the earnings the block has left; selling at 16× would let the player cash out a value the game no longer recognises.
6. **The lunar distress sale is dropped.** The Moon is offstage in Act V (V-D4); one way out, the bloc sale at ×0.5, is enough.
7. **Hide the never-unlocking Act I-II rows in Acts III-IV too**, as long as it changes only the UI (goldens byte-identical).
8. **Split the shared content file** in the next milestone (load each act's content when its act starts) to get under Vite's 500 KB warning.

### 0.20 After M63 (12 Oct 2026; revised after the M64 pre-check)
*Design-thread decisions (DT) on the M63 report's five questions, revised the same day after a read-only check of the code (the "M64 pre-check" report). M63 is accepted as built: the orbit unit economics (no V4 cost change, since every future's block returns ≥ 1.1× capex and V4 after its trigger 3.5-5.1×), the Orbit Replacer's ground-link fix in the Act V bot, V-B3's §0.19 form, the flex rating back to 0.5, the V4 decoy card, the dropped lunar distress sale, hidden Act I-II rows, and the Act III/IV content chunks.*

**Findings (checked against the code):**
- **V3: the perfect reader's gap is timing, not moves.** It already plays the Seller's moves (tools/act5/bots.ts:221-227) in every −1 quarter. But V3's ideal is 0 until the trigger (act quarter 7, 2037Q4), so it waits 7 quarters while the Seller sells from quarter 0 (Perfect 1.141 against Seller 1.218, FB). The first draft of this section said otherwise; that was the design thread's error. The cause is in the ideal stance. V3's Signals start at act quarter 4 (2037Q1, `futures.py` SIGNAL_START), three quarters before the trigger. With a 0 ideal across those quarters, the score never rewards a player who reads V3 early, and reading early is the reading game (signals 2-4 quarters before a trigger).
- **V4: the perfect reader has M63's orbit bug.** Before act quarter 12 it only calls and replaces blocks through `replaceBlocks`, which never carries a block through (tenant, capital, launch) and never rents ground-link units.
- **Passive is a strong baseline in V2-V4, partly by design.** It matches every 0-ideal quarter by doing nothing, so the perfect reader can only pull ahead in −1 quarters. That is why the target says "3 of 4".
- **V2's ceiling is structural.** Flexibility moves a ground landlord's company by a few percent (§0.19 item 2), so V2 is the expected miss under "3 of 4".
- **The V4 decoy is half-built.** The card (`events.py:220`) and the reading file (`content.py:141`) name a capacity squeeze. `signals.py:57-61` still names `firm_buildout` and the SMR wave, and `signal_paths.py` still spikes V4's Firm Build-out at act quarters 6-8 (67, 78, 64). In 2037Q3-2038Q1 the player sees an orderbook spike while the displayed Capacity Market sits at 50, 51, 47. That is a defect.
- **The Act V preset scan runs on Act IV's bots** (`tools/act5/presetRun.ts:126`: `act4Archetypes(p.bot).balanced` → `orbitStep`). So does `act5-gate/states.ts`, and the chips diagnosis and E-B2 tools. Fixing Act IV's bots everywhere would move Act V's presets and every number in §18.

**Decisions:**
1. **V-B3 is judged on Firm Builder; Orbital Landlord's V2 is information (DT).** This matches the existing split: V-B2 and V-B4 on the ground-heavy start, V-B5 on the start whose fleet retires in the act (§0.17 item 1). On OL, replacing blocks pays in every future (M63's unit table), so orbit beating flexibility in V2 there is the economics working. Flex on OL is within 10% of the best in V2 (0.966). FB passes by 0.4% (1.308 against 1.303); report it every run. If it flips to a miss, report it; it is not a stop and not a lever trigger.
2. **V-B8: change V3's ideal stance and fix the V4 bot; keep the bar (DT).**
   - **V3's ideal stance becomes −1 from its Signals start** (act quarter 4, 2037Q1), not from the trigger (act quarter 7). Quarters 0-3 stay 0. Change it in `stance()` in `tools/act5/content.py` (it already reads TRIGGER; use `futures.py` SIGNAL_START["v3"]) and update WHY v3 to "Demand Plateau: calm until the Signals turn (2037Q1); defensive from then (lock leases long, contract output, sell to funds)." V3's decoy (the record auction, 2037Q1-Q2, wrong stance +1) already sits inside the new −1 window, so the decoy still tempts the wrong way. V1, V2 and V4 stances don't change.
   - **The V4 perfect reader gets orbit growth:** add `orbitGrowth` (bots.ts:150-163, which includes RENT_LINK_UNITS) to its V4 quarters, both calm and −1. Don't copy the whole Orbit Replacer recipe: its short renewals and network upgrades are +1 moves. **No equity raises in V4's calm quarters** (act quarters 0-11): orbit growth there runs on cash under the existing cash guard, because a raise would inherit the −1 of the first sale at quarter 12 and score as a −1 move in a 0 quarter. From quarter 12 the Seller's moves apply as now.
   - **The bar stays:** Perfect ≥ 1.15 × Passive in at least 3 of 4 futures. V2 is the expected miss. If V3 or V4 still falls short, report Perfect ÷ Seller and Perfect ÷ Orbit Replacer per future and stop there: no tuning, no new bar. V-B9 (Perfect's reading ≥ Passive − 2) must be re-checked, because Passive's V3 score changes with the stance.
3. **V4's Signals decoy matches the card (DT).** In `signals.py`, DECOY v4 becomes: indicator `capacity_market`; quarters 2037Q3, 2037Q4, 2038Q1; peak 2037Q4; name "The capacity squeeze"; wrong_reading `v1`.
   - reason: "A hot summer and three emergency capacity filings send the auction to the cap. It looks like Queue is King, but it is weather and timing; the new load is already booking launches."
   - tell: "The Capacity Market spikes while Launch Cadence climbs every quarter and AI Demand on the ground flattens. A real squeeze needs new ground load; this one fades as orbit takes the marginal gigawatt."
   - In `signal_paths.py`, V4's `capacity_market` takes act quarters 6-9 = 64, 76, 62, 52, and V4's `firm_buildout` takes act quarters 6-9 = 53, 53, 52, 51; every other value as now. **The whole V4 `firm_buildout` headline dict is removed**, the 2038Q3 geothermal line included (it would sit on a quarter with no move). New V4 `capacity_market` headlines (designed, [D]), added beside the existing 2039 ones:
     - 2037Q3: "Three utilities file for emergency capacity after a record heat wave."
     - 2037Q4: "The capacity auction clears at the cap; brokers call ground power the scarcest thing of the decade."
     - 2038Q1: "The next auction clears below the cap as summer demand fades."
     - 2038Q2: "Capacity prices settle back to their 2037 level."
   - The pre-check confirmed these values pass the generator's headline rule with no other quarter needing one. V-D3 now reads: the SMR-wave decoy in V1 and V2, a capacity-spike decoy in V3 (the record auction) and V4 (the capacity squeeze). V-B14 is unaffected (the changes start at act quarter 6).
4. **Per-act content loading: the chunk split is enough (DT).** It met §0.19 item 8's goal: every chunk is under 500 KB (largest `sim-energy`, 392 KB; the main bundle is 245 KB). Correction: M63 and the first draft of this section called 245 KB "the largest chunk"; it is the main bundle. No lazy-loading milestone. Measure one number: the sum of the gzip sizes Vite reports for the files `dist/index.html` references directly (entry script, modulepreload links, CSS). Reopen only if that sum is above 1 MB ⚙.
5. **Act IV's bots: fix the ground-link rental for the Act IV measurements only (DT).** A bot that can't do what a player can do mismeasures Act IV, and Act IV is public. But Act V's presets and numbers must not move as a side effect.
   - Mechanism: give Act IV's `orbitStep` an option (for example `rentLinks`), **default off**, so every existing caller behaves byte-identically. Turn it on only in the Act IV sim (`--act4`) and the energy runner (`--energy`). The preset scan, `act5-gate`, `chipsEb2` and `chipsDiagnosis` keep the default. One code path with a switch, not a frozen copy.
   - Gates: `presets_v.json` must regenerate byte-identical, and Acts I-IV goldens must not move (they use their own helper). The `--act4` and `--energy` outputs change by design; report Act IV's B-targets and E-B2 before and after. If an Act IV target flips from pass to miss, keep the fix, report the flip, and use no lever.
   - Re-basing Act V's presets on the fixed bots would reopen all of §18. That is the owner's call, not this run's.

**Accepted as built:** all M63 assumptions (the EBITDA-weighted orbit unit multiple, the scan on Act IV marks, card Bandwidth charged to the next Plan, the bid picker defaults, the perfect reader's V2 moves, the over-reactor reading the decoy's stance from the file).

**Levers allowed this run:** none for balance. The run fixes one content defect (item 3), changes one ideal stance (item 2), changes two bots (items 2 and 5) and measures. If V-B2, V-B4 or V-B11 flips to a miss, stop and report: none of these changes should move them.

**Playthrough and flag:** unchanged from §0.19 item 4. The owner can play Act V on staging now; the flag flips only on the owner's word.

### 0.21 After M64 (12 Oct 2026)
*Design-thread decisions (DT) on the M64 report's six questions. M64 is accepted as built: the V4 Signals decoy and its three-file consistency test, V3's ideal from act quarter 4, the V4 perfect reader's orbit growth with `noEquity`, Act IV's `rentLinks` (default off, on only for `--act4` and `--energy`), the load-size count, the housekeeping and the CLAUDE.md and dev-notes refresh, with all five listed assumptions.*

**Findings first:**
- **The perfect reader now beats Passive in every future on both presets** (FB 1.155 / 1.015 / 1.150 / 1.092; OL 1.061 / 1.014 / 1.116 / 1.292), and the over-reactor is at or below 0.97 × Passive everywhere. Reading pays, and the decoy costs, in every cell.
- **The 1.15 magnitude is out of reach for a structural reason, not a tuning one.** Passive matches every quarter whose ideal stance is 0, so the perfect reader only pulls ahead in −1 or +1 quarters. V2 has almost none that move money (flexibility is worth a few percent, §0.19 item 2), and V4 has 8 (from act quarter 12). §0.20 named this before M64 ran. The bar was set before the calm-quarter stances (§0.16, §0.20) existed.
- **V4 on Firm Builder:** growing orbit on cash costs a ground-heavy company more than it earns by 2040 (Perfect 1.311 → 1.284), while the orbit company gains (1.207 → 1.391). That is the content saying something true: orbit's late parity pays the company built for orbit.
- **Act IV's B1 flip is a finding about the public act,** not a bot artefact: with link rental, the Sprinter is best in 9 of 12 cells. It rests on 10 seeds, and Act IV's runner default is 30.

**Decisions:**
1. **V-B8's perfect-reader clause becomes a sign check (DT).** New V-B8: *Perfect > Passive in every future on both presets; Over-reactor ≤ 0.97 × Passive in every future.* It is the same move §0.16 made for the Locker in V-B4: keep the direction, drop a magnitude the structure can't produce. Reading as a skill is proven by V-B9 (the score) and the over-reactor clause (the decoy's cost); V-B8's job is to show that reading also pays, and it does in all 8 cells. On M64's table V-B8 **passes**. Report Perfect ÷ Passive every run; V2's margin is thin (1.014-1.015), and a V2 cell falling to 1.00 or below is a miss to report, not a stop. *This lowers a design target. It stands unless the owner says otherwise.*
2. **The V4 perfect reader stays as built (DT).** It plays the stance with every 0-sign orbit move available, whatever the company. Making its orbit growth depend on the preset would tune a test bot to the answer. Firm Builder's 1.092 is the right shape: a ground company that grows orbit on cash in 2037 earns less by 2040 than one that waits, and an orbit company earns more. Under decision 1, both pass.
3. **Act IV B1: no rewording yet; diagnose at 30 seeds (DT).** Act IV is public, so a dominant Sprinter matters to players, not only to a table. But 10 seeds and one bot fix are too thin a base to change a shipped act. Next run: `--act4` at 30 seeds with `rentLinks` off and on. Report the best archetype per cell, the Sprinter's 2035 value split (link-rental income, link cost, blocks live, launches), and the ground-link unit price and lease terms the Act IV content uses, against their source in `docs/act4-content/`. No change to Act IV content or rules in that run. If the Sprinter still wins 9 or more of 12 cells at 30 seeds, the design thread decides between an Act IV content fix (which moves public play and Act IV goldens, so the owner signs off) and recording the miss as B3-B13 were.
4. **Keep V-B11's floor at 0.80 (DT).** V4's 0.806 passes. A target's floor is not a margin to protect. A later change that drops V4 below 0.80 is a stop (§0.20 already lists it), and the run reports what moved it.
5. **Act V's production preload: remove it if it is a static-import fix, otherwise leave it (DT).** Act V is unreleased, so production shouldn't fetch its content. The fix is worth making only if it moves an existing static import behind the existing `Act5Entry` dynamic import, adding no new async step to the sim, saves or act transitions (§0.20 item 4's reason against lazy loading still holds). Acceptance: production's preload list has no Act V chunk, staging's Start at Act V still works, and the gate tests pass. If it needs more than that, leave it and report what it would take.
6. **Don't re-base the Act V presets (DT).** The presets are companies the Act IV economy produces, and the fixed bots would produce slightly different ones. But re-basing reopens all of §18 for a change in one bot habit, while every core target passes now. The owner's playthrough is the better test of whether the presets feel right. Revisit only if decision 3 leads to an Act IV content change, because that would change the Act IV economy the presets come from. *Owner's call to override.*

**Accepted as built:** all M64 assumptions. No Act V lever, content or rule changes this round.

**Levers allowed next run:** none. Measurement (decision 3) and one build tidy-up (decision 5) only.

**Playthrough and flag:** unchanged. The owner can play Act V on staging now (after PR #32 merges); the flag flips only on the owner's word.

### 0.22 After M65 (13 Oct 2026)
*Design-thread decisions (DT) on the M65 report's four questions and the post-M65 handover's fifth. M65 is accepted as built: V-B8 restated and passing on both presets (`tools/act5/verdicts.ts`, test `act5Verdicts`), the preload left as is with its cause recorded, the Act IV diagnosis and the runner's reporting columns, with all three listed assumptions. Correction: Act V's share of the production preload is 91.8 kB gzip, not 41 kB (M64's note and §0.21 decision 5).*

**Findings first:**
- **The Sprinter doesn't dominate Act IV.** At 30 seeds it wins 6 of 12 B1 cells with links on (8 of 12 by preset × future), under §0.21's 9-of-12 line. The 10-seed 9 was noise.
- **B1 flips for a reason unrelated to the Sprinter.** With links on, Balanced rises in f4 (1.07 → 1.11), which lifts the within-10% line to 0.999, and Ground sits at 0.98 in all three f4 cells. That's a miss by 0.019 on the "Ground within 10%" clause. The other two clauses still hold.
- **The link is a gate, not a cost.** Rent is about 1-2% of the revenue it unlocks (Neocloud $29M against $2.0B). The Sprinter's value is almost all orbit valuation (f1: $38.7B of $41.5B), so even a tenfold link price would barely touch the cells B1 measures. Every link value is designed ([D], `tenants_iv.json:52-61`, README 204-207); there's no source to move it toward.
- **Act IV's B8 fails even a sign check in F3:** Perfect ÷ Passive is 0.99 there. The structural argument behind §0.21 decision 1 doesn't carry over to Act IV unexamined.

**Decisions:**
1. **Act IV B1 is recorded as a miss, like B3-B13 (DT).** Its wording stays. Rewording a clause that misses by 0.019 to make it pass would be fitting the target to the result. The miss is a near-miss of the kind §0.11 described: the sign is right, the gap is small, and it has a named cause (a bot playing better, not a rule breaking). Add it to Act IV's recorded misses in `docs/act4-scope.md`'s balance notes and in dev-notes.
2. **No change to the link price (DT).** The link does its job as a gate: interactive tenants need it, and a player who forgets it loses the tenant's revenue, which was the bots' bug. Making it bite would mean inventing a number with no source, changing public play and the Act IV goldens, and it wouldn't change what B1 measures. Not proposed. The owner can still ask for it.
3. **Act IV B8 stays a recorded miss; no restatement (DT).** §0.21 restated Act V's V-B8 after diagnosing why the magnitude was out of reach. Act IV's F3 misses even the sign (0.99), so restating it would only relabel the miss. Act IV's balance pass is closed with its misses accepted (dev-notes, M35-M36), and one more recorded miss doesn't reopen it.
4. **Leave Act V's preload; no loader milestone (DT).** 91.8 kB sits inside the 785.4 kB sum, under §0.20's 1 MB line, and the fix needs the async seam §0.20 item 4 ruled out. Once the flag flips, Act V's content is part of the game anyway. Reopen only if the sum passes 1 MB.

5. **V-B11's floor: confirmed (DT).** §0.21 decision 4 stands: a run in which any Act V value change drops V4's hold ÷ sell below 0.80 on either preset stops, and reports which change moved it and by how much. 0.806 is a pass, not a margin to defend, and no lever exists to protect it.

**Status:** Act V's balance loop is closed for now. Every core target passes (V-B1, B2, B4, B11), and V-B3 (Firm Builder, 0.4% margin), V-B5, V-B7, V-B8 (new form), V-B9 and V-B10 pass. Recorded as information: V-B3 on OL, V-B5 on FB, V-B6. No balance run is scheduled. The next Act V input is the owner's playthrough on staging; the flag flips only on the owner's word.

**For the next run, whatever it is:** commit this section first (as §0.20 and §0.21 were), and record decisions 1 and 3 in the Act IV notes.

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
*Firm Builder amended in §0.13; Small Grid cut in §0.14 (two presets ship).*
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
