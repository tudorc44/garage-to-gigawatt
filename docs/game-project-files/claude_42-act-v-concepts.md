# 42: Act V concepts, 2036-2040. v0.1 draft, 10 Oct 2026

*Design thread. Built on doc 40 (the second research pass, Part D), doc 37 (energy and 2040 dossier), doc 38 §6 (the Act V premise: "go on the premise, hold on the authoring"), doc 33 (Act IV as designed) and the game as built (dev-notes through M41, main = 71f36cb). The owner approved starting the concepts on 10 Oct 2026. Nothing here is approved: the owner picks a concept, and the chosen one is designed in full in doc 43 (shaped like doc 33). Evidence grades as in doc 36: [A] primary or official, [B] reputable reporting, [C] analyst or forecast, [D] inference or designed. (DT) = design thread's call.*

## 0. What the research changes before any concept is chosen

1. **Almost everything after 2035 is a forecast or a design.** Doc 40 found sourced schedules for the bitcoin halvings [A], NIST's post-quantum dates [A/B] and announced energy deals [A/B]. Demand, launch prices, chips and orbit after 2035 are analyst cases [C]. Lunar production after 2035 has no sourced schedule at all [D]. Act V's futures must be presented to players as scenarios, not forecasts, more openly than Acts III-IV.
2. **The constraint of the 2030s is the queue, not the generator.** The US median interconnection wait is about 5 years [A, doc 37]. PJM's 2028/29 uncapped capacity price would have been 71% above its cap [C]. Every venture backed in Acts III-IV has its likely first power inside 2036-2040 (SMR 2035-37, advanced fission 2036+, pumped hydro 2037-39, fusion 2038+ in its one future; doc 38, [D]). This gives Act V its own question, distinct from Acts II-IV: **who has firm megawatts when the line is years long, and what are they worth?**
3. **The demand range is wide, and it decides everything.** IEA's 2035 cases run from about 700 to 1,700 TWh for data centres [C]. Chip efficiency gains slow from the mid-2030s (imec's roadmap ends around 2038 [C]; the slowdown is inference [D]), so in Act V power demand tracks compute demand more closely than before. That is a natural hidden variable.
4. **Reform could make flexibility, not firmness, the winning asset.** DOE's 2025 direction to FERC asks for 60-day studies for curtailable large loads [B]. SPP's large-load process is approved, and FERC issued show-cause orders to all six RTOs in June 2026 [A/B]. If reform works, a curtailable load connects in 1-3 years [D], and the company's oldest skill (switching miners off when the grid needs it) becomes valuable again.
5. **Bitcoin barely matters to the business by 2036, but it closes the arc.** The 2036 halving takes the block reward to 0.39 BTC [A]. Fees are 1-2% of miner revenue today [C]. NIST disallows today's signature schemes after 2035 [A/B], and experts put a cryptographically relevant quantum computer at 28-49% within 10 years [C]. That fits a wildcard and an epilogue, not a whole act's spine.
6. **Act IV's assets reach the end of their life inside Act V.** Orbital blocks launched 2031-35 have a 5-year life (doc 33), so they retire in 2036-40. Orbit's cost parity with the ground is estimated around 2040 [C], and launch below $200/kg around 2035 needs about 180 Starship launches a year [C]. Act V therefore has a natural orbital decision: replace the fleet or bring the compute home.

**A scope guard to settle first.** Doc 38 §6.4 said Act V waits if Act IV's balance run still misses B3 (in F2, the wall: Ground Holder ≥ 1.2 × Orbit Sprinter) or B5. B3 is a recorded miss (1.03× vs 1.05×), accepted on 10 Oct. That matters here beyond the guard: Act V's strongest future ("the queue is king") rests on the same claim as B3, that firm ground power beats speed when the grid is jammed. The owner has said go, which overrides the guard. Doc 43 must still show, with the bots, that firm MW actually wins in that future. If the Act IV economics can't produce that, Act V's spine is in doubt.

---

## Concept A: "Firm" (2036Q1-2040Q4, 20 quarters, about 55-60 minutes ⚙), recommended

**Core fantasy.** "For twenty years I chased cheap power. Now the plants I backed in the early 2030s are switching on, the grid queue is six years long, and every hyperscaler wants my megawatts. Do I hold them, lease them, sell them, or bet them on the next thing?"

**How it plays.** The same loop and one balance sheet. Three things are new:
- **Ventures deliver.** The calendar ventures from Acts III-IV reach first power (or don't) on their hidden draws, already running since 2027. A finished plant becomes an operating asset: output at its capacity factor, running cost, PPA or merchant sales, and for the first time project debt after first power (doc 38 said "no debt before first power"). Finished plants are valued on their earnings, which replaces the milestone mark (×1.25 per milestone) and is where the recorded E-B2 miss gets fixed.
- **The queue as a position.** Interconnection becomes a visible queue: each site holds a place, which can be paid up (network upgrades charged to the large load, as DOE proposed [B]), traded or sold with the site, or skipped by co-location or curtailable status where reform allows. New mechanic, small screen: one table and a picker.
- **The exit.** Late in the act the founder's last decision: sell the company, sell plants to an infrastructure fund (the Goldendale precedent: a fund bought a licensed project [B]), take it public or private, or hold. The finale reads the outcome.

Carried systems: ground renewals and Heat, the Deal Desk, energy assets and ventures, Finances, political capital. Orbit continues as a replacement decision (blocks retire, replace or bring the compute home). The Moon carries as a marked asset (decision 4 below).

**Main tension.** Firm power is scarce and dear, but demand could plateau and reform could let flexible loads jump the queue. The player bets on what kind of megawatt the late 2030s pay for: firm, flexible, orbital, or none.

**Hidden future.** Act III's scenario engine, reused a third time: one of four futures drawn in secret, read through six Signals with one decoy, revealed at the end. From doc 40 §D8 (DT):
- **V1 "Queue is king":** demand at the high end, waits stay above 5 years, self-supplied firm MW wins.
- **V2 "Flexible lane":** large-load reform works; curtailable or co-located loads connect in 1-3 years; flexibility is paid, firmness less so. Old mining-style curtailment skills pay again.
- **V3 "Demand plateau":** demand at the low end; capacity prices fall; late plants become stranded. The precedent is ERCOT battery revenue falling from $192 to $55 per kW-yr between 2023 and 2024 as the market saturated [C].
- **V4 "Up and out":** launch falls below about $200/kg; orbital compute takes the marginal gigawatt; ground prices soften.
- **Decoy: "The SMR wave"** (DT). Multi-GW orderbooks are announced to great fanfare and point toward cheap firm power (V3-like), but by the end they have delivered a handful of units. Basis: the 2026 deals disclose no funding amounts, and one took an FID without funding [A/B]. The fusion "net electric" headline stays as a wildcard rather than a second decoy.
- **Wildcards** (2 of 4 drawn, as Act III): a Q-Day scare (coin holdings and any remaining mining marked down; a post-quantum migration event), a fusion net-electric headline, a dry year for hydro and pumped storage, a large-load moratorium in one region.

**How a run ends.** 2040Q4: the Act V chapter report (the reveal, the reading score, the plants' fates), then the **campaign finale, moved from 2035 to 2040**, with the founder's exit as its last line. "Retire at 2035" stays available on Act IV's chapter report and plays today's finale, so nobody is forced into Act V.

**Scoring.** As Acts III-IV: founder net worth at 2040Q4, the growth multiple on Act V entry, the reading title, the career multiple from the campaign start. One new title for the kind of megawatts you ended with (firm, flexible, orbital).

**Pros.**
- Gives the ventures feature its payoff inside play instead of an epilogue line, the reason doc 38 gave for building Act V at all.
- The central question (firm MW in a jammed grid) is the one the research supports best, with [A] evidence on the queue and [C] on demand.
- Highest reuse: scenario engine, Signals, decoy, reading score with the M40-41 rules, ventures, energy assets, Finances, presets, Scenario Mode.
- The exit decision lands the arc in finance terms: the garage miner decides what the empire is worth and who gets it.

**Cons.**
- The finished-plant valuation, the queue and the exit are three new systems.
- Every 2036-40 number is [C] or [D]; the act leans on labelled design more than any before it.
- Depends on Act IV's ground economics (the B3 point above).
- Moves the campaign end, which doc 07, doc 08 and the marketing page set at 2035.

**Fit with Acts I-IV.** Strong. The megawatt thread continues, the finance frame deepens (operating assets, refinancing, exits), and the reading skill is reused on new futures.

---

## Concept B: "The Harvest" (2036Q1-2040Q4, 10 decision quarters + 10 auto-played, about 30 minutes ⚙)

**Core fantasy.** "The building is done. Now I run what I built and decide when to cash out."

**How it plays.** A short epilogue act using the Prologue's mechanism: a full Plan phase every other quarter, the rest auto-played as summary cards. No new hidden future: the plants deliver on their draws, the market follows one base path, and the act is about operating and exiting. Finished-plant valuation and the exit (as in A) are its only new systems; the queue is not built.

**Main tension.** Hold for more value or sell before something breaks, with the plants' real outcomes arriving one by one.

**How a run ends.** 2040Q4 with the finale and the exit, as A.

**Pros.**
- About a third of A's build: two new systems, no new future, no Signals.
- Pays off the ventures and lands the arc with the least new content.
- The least invention: one base path labelled [D], with no four-way scenario set to defend.

**Cons.**
- No reading skill and no hidden future: it breaks the pattern that makes Acts III-IV replayable.
- Auto-play makes the last act the thinnest one, an odd shape for a finale.
- Most of the energy feature's interesting variance (the queue, reform, demand) never shows.

**Fit.** Good mechanically (the Prologue proves the pacing); weak as a climax.

---

## Concept C: "Full Circle" (2036Q1-2040Q4, 20 quarters, about 50 minutes ⚙)

**Core fantasy.** "I started by mining bitcoin in my bedroom. In 2040 the network itself is in question, and my company's flexible megawatts are what the grid needs."

**How it plays.** Bitcoin and flexibility are the spine. The 2036 and 2040 halvings, the fee market and the post-quantum migration are the hidden variable (fees mature; a security scare; a Q-Day event). The company's curtailable load (mining, interruptible AI training) earns from grid programmes; the player decides how much of the business to keep flexible, and whether to hold coins through the migration.

**Main tension.** The arc's original asset against its newest risk.

**Pros.**
- The strongest narrative echo of the Prologue.
- Flexibility as a mechanic is grounded in reform [A/B] and Act I's curtailment system already exists.

**Cons.**
- Bitcoin is a rounding error in a 2036 AI-infrastructure company's revenue [C]: the act would be about the smallest part of the business.
- Quantum timelines are survey estimates [C]; a whole act on them is the hype doc 36's rules warn against.
- Leaves the ventures and the queue unused.

**Fit.** Narratively strong, mechanically narrow. Best used as material for A (V2 and the Q-Day wildcard), not as an act.

---

## Comparison

| | A: Firm | B: The Harvest | C: Full Circle |
|---|---|---|---|
| Span | 20 quarters, all decisions | 10 decision + 10 auto | 20 quarters |
| Session | about 55-60 min ⚙ | about 30 min ⚙ | about 50 min ⚙ |
| Hidden future | 4 futures + decoy + wildcards | none | 3 crypto futures |
| Ventures pay off in play | yes | yes | no |
| New systems | plant operations and valuation, the queue, the exit | plant valuation, the exit | fee market, PQ migration, flexibility income |
| Evidence fit | queue [A], demand [C], futures [D] | base path [D] | halvings [A], quantum [C], business weight weak |
| Reuse | highest | high | medium |
| Campaign end | 2040 (2035 retire option) | 2040 (2035 retire option) | 2040 (2035 retire option) |

## Recommendation

**Concept A, with two pieces of the others folded in:** C's flexibility idea lives in V2 and its Q-Day as a wildcard; B's exit is A's last decision. A is the only concept that uses what Acts III-IV built (the ventures, the energy assets, the reading engine) for the purpose they were built for, on the question the research supports best. B is the fallback if the build budget for Act V is small: it pays off the ventures and ends the campaign cleanly, at the cost of the replayability that defines the later acts.

## Decisions for the owner (before doc 43)

1. **Concept:** A (recommended), B or C.
2. **Campaign end:** move the finale to 2040, with "Retire at 2035" kept on Act IV's chapter report (recommended), or keep 2035 as the only ending and make Act V a separate "extended campaign" entry.
3. **Futures:** V1-V4 with the SMR-wave decoy (recommended), or three futures (drop V4, which leans hardest on [C] launch projections).
4. **The Moon in Act V:** (a) offstage: carried as a marked asset, and the production plant's fate told in the finale (recommended; no sourced post-2035 schedule exists); (b) one in-act event: a plant decided by 2034 may reach first tonnes in 2039-40 on a hidden draw, labelled [D]; (c) a full lunar operations layer (not recommended).
5. **Should the Act IV future influence the Act V draw?** Independent draws, as Act III to Act IV (recommended, fairest), or weighted (for example, F4's cheap ground power makes V2 likelier).
6. **The B3 dependency:** accept that doc 43 must prove, with the bots, that firm MW wins in V1, before any Act V build starts (recommended).

⚙ marks values expected to change after playtests.
