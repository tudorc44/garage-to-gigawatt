# 27: Act III design, "Reckoning" (2027 → 2030). v1.2 (frozen), 4 Oct 2026

*Status: **frozen.** D1–D17 accepted in full by the owner on 29 Sep 2026. This document is the single source of truth for Act III design, the way doc 10 is for Alpha 0.1 and doc 20 for Alpha 0.2. It stays frozen until Alpha 0.4 (doc 29) is written and itself frozen; a change after that follows the same change rule as docs 10 and 20 (a new idea goes to the backlog and can only enter by replacing something of similar size, written into the frozen scope doc, not this one). Built on doc 08 (§4 scheduled future, §5 scenarios, §6 systems) and doc 07 (§2b). Post-2026 facts in doc 08 are speculative fiction built on published forecasts, not facts.*

*v1.1 → v1.2 (4 Oct 2026): the build (M10–M18) and the step-7 balance pass are done. What the real sim changed is recorded in §17: carried Act II leases can be reopened by weaker tenants in a bust; S3's rents rebound from 2029; Act III GPU contracts are priced as contracts; the S1 hedge instrument is a standby liquidity facility; a leverage covenant; nuclear PPA prices and take-or-pay resale; the presets are real Act II companies (Great is $2.7B, not $4.5–5B); the reading score and its titles. One anchor is retired (S3 flexible ≥ long-locked) and two are kept as information (A1 on the GPU-heavy company, A2). D1–D17 stand as decisions; §13's rows for D5, D13 and D14 are updated.*
*v1.0 → v1.1 (29 Sep 2026): doc 28 (the Act III content pack, `claude/act3-content/`) is delivered and reviewed. Ten design flags (F-1 to F-10) resolved; see §15. Changes to the frozen mechanics: the renewal wall is now keyed to the tenant's own contract rate rather than a fixed era anchor, with a separate incumbent-cap vs. new-RFP-index split and an S3 reopener clause (§6); the density cliff's Rubin NVL144 tier is confirmed as a deliberate gameplay compression (§7); D13's preset numbers are corrected to match Act II's own accepted results rather than the original aspirational targets (§8); S1 gets a new hedge instrument so a hedged player's worst case is meaningfully better than a bust (§15, F-7). Nothing in D1–D17 as a set of decisions changes; only the numbers/mechanics they specify are refined now that real content exists to check them against.*
*v0.2 → v1.0 (29 Sep 2026): all 17 decisions accepted as recommended, no changes. §8's table is now the record of what was decided, not a proposal.*
*v0.2 (28 Sep 2026): updated with the code thread's carry-over audit. Changes: D4 ("Read the market" cannot be reused as designed), D16 (build order starts with a walking skeleton), §13 (what the audit means for design and content), carry-over list checked in §3.*

## 1. What Act III has to prove

**One question:** *Can a player who built an AI-capacity business in Act II read weak signals, hedge, and survive or exploit a scenario nobody told them about, and does the 2030 renewal wall make the Act II contracts feel like their own decisions coming back?*

Act II asks "how do I build". Act III asks "what do I do when the world turns". The new skill is **reading**, not deal assembly: same Deal Desk, new pressure.

## 2. Shape

- 16 quarterly turns, 2027Q1 → 2030Q4, about 45 minutes, 3–6 meaningful decisions a turn (same as Act II).
- Continues from an Act II save (the 2026Q4 "aftershock" quarter is the last Act II quarter) or from a preset.
- Ends with the **Act III chapter report**, which includes the **scenario reveal**: what actually happened, and how many quarters ahead the player's moves showed they had read it.
- Same turn loop (Plan → 13 weekly ticks → report), same engine, same rules where Act II is silent.

## 3. What carries over from Act II (checked against the state by the code thread)

- **Carries unchanged:** cash, treasury, founder stake, sites, machines, hosting, projects with their tenants, facilities, all debts, the rating, staff, the seed.
- **Boundary rule (D17, accepted):** Heat carries over (it does not reset, unlike Act I → II — the regions' politics are the point of Act III). Act II lasting effects that expire by 2026Q4 are dropped; longer ones carry. The head-start and lifeline flags are dropped after the act boundary. AI-lab distress flags carry until they end. Ratepayer Anger is not stored (worked out from energized MW), so it carries by itself.
- **Act II-only, dropped:** the per-quarter planning and interrupt fields.
- **Contracts:** stored on the project (tenant card, term, price, quarters served). A GPU contract that ends falls back to spot. A shell lease that ends does nothing in today's code, so **renewal is new behaviour**, not a display of something that exists (§6).
- The Act II rivals and league carry over as scripted data (§5, D11), extended one quarter past Act II's real 2026Q3 data to hand off cleanly at 2026Q4 (F-4, accepted as a minor, documented extrapolation).

## 4. New in Act III

1. **Hidden scenario draw + Signals panel** (the core; doc 08 §5).
2. **Contract calendar and the renewal wall.**
3. **Density cliff** (Rubin Ultra ~600 kW racks, H2 2027): halls have a rack-density rating; a **retrofit** project type.
4. **Nuclear PPAs** as a Power-slot option from H2 2027.
5. **Political capital** (lobbying, deferred from Act II) and a Government Affairs Lead.
6. **Wildcards** (2 per campaign from a pool of 4).
7. The leftover mining unit gets one more job: the April 2028 halving and, in a grid crisis, paid curtailment.

## 5. Scenarios in Act III (D2, D3, accepted)

Secret draw at the start of the act, from the campaign seed, on its own substream, weighted **S0 25% · S1 30% · S2 25% · S3 20%**: **S0 Muddle Through, S1 Great Repricing, S2 Lift-Off, S3 Efficiency Shock.** S4 Silicon Shock and S5 Grid Crisis wait for Act IV. A "Scenario Mode" picker for replays.

Each scenario is **data**: one market file (prices, spreads, occupancy, GPU rent, cap rates, power) plus its scripted cards with trigger windows, its rivals' fates and its **authored Signals**, like Act II's content files. The trigger lands in **2027Q3–2028Q4**; Signals start moving **2–4 quarters before it**. As delivered in doc 28: S0 triggers 2028Q2 ("The Digestion Quarter"), S1 2028Q1 ("The Round That Didn't Close"), S2 2028Q3 ("Compute Is Strategic"), S3 2027Q4 ("Open-Weights Week").

**Signals panel (D4, accepted):** six indicators, each 0–100 with a trend arrow: Revenue Gap, Lender Spreads, Chip Lead Times, Grid Reserve Margin, Efficiency Index, Bitcoin Hashprice. Each scenario moves two or three of them. **One decoy per campaign**: an indicator moves for a reason that isn't the scenario (a false alarm), so reading is a skill, not a lookup. As delivered: S0's decoy is Lender Spreads (2027Q3–2028Q1); S1's is Chip Lead Times (2027Q2–Q4); S2's is Efficiency Index (2027Q3–2028Q2); S3's is Grid Reserve Margin (2027Q2–2028Q1).

**Signals are authored, not derived, and must stay that way.** "Read the market" (1 Bandwidth) reveals the authored `sharp` range for one chosen indicator that quarter, from `signals_s*.json`. It must never read the market CSVs — doing so would leak the hidden scenario.

Score for reading: for each big move the player made (sold, hedged, shortened contracts, added leverage, bought distressed), the report shows how many quarters before/after the trigger it happened.

## 6. The renewal wall (D5, accepted; mechanics refined in v1.1 per F-1, F-2)

A **contract calendar**: every contract by end quarter, tenant, MW, price, with the market price for a comparable new contract shown next to it. The calendar is a read-only view computed from the projects. **Renewal itself is new behaviour:** a GPU contract ending falls back to spot today, and a lease ending does nothing, so Act III adds a renewal state (offer, negotiate with Act II's tenant negotiation, accept, walk, lapse to spot or empty).

**Renewal pricing (revised, F-1):** the original design keyed the repricing bands to a fixed 2025Q4 era anchor. Doc 28's real numbers showed Act II's own 2026Q4 rents are already above that anchor for several tenant types, which would make some "reprices down 20–30%" renewals price *above* what the tenant is currently paying — backwards. **The band is now keyed to the tenant's own contract rate at signing**, not an absolute era price. A renewal offer = (the tenant's signed rate) × (the scenario's repricing multiplier for that quarter), where the multiplier is what doc 28's `renewal_*` columns in the market files already compute.

**S2 incumbent vs. new-deal split (revised, F-2):** the original single "S2 flat to +10%" band made a locked incumbent look weak next to a hypothetical new deal, contradicting doc 08's own scenario matrix (pre-trigger contracts should be valuable in Lift-Off, not merely tied). The fix: an **incumbent renewal cap of 1.00–1.10×** the tenant's own rate (so a locked-in player's price never falls, and rises modestly) plus a **separate new-RFP index, up to ~1.32×**, for capacity signed fresh after the trigger. A locked player doesn't capture the new-deal upside, but is never worse off — which is the intended trade-off: you're protected, not enriched.

**S3 reopener clause (new, F-2):** without an exit option, a long-locked contract structurally dominates a flexible one in an efficiency shock, contradicting the "flexible does no worse" anchor. Every Act III lease signed from 2027Q1 on carries a **market-reopener clause**: either party may trigger a renegotiation at a stated exit fee (a fraction of one quarter's contract value), from the contract's third year. This gives flexibility real option value in S3 without making locked contracts worthless elsewhere.

Repricing table (as delivered, now keyed to the tenant's own rate per F-1): **S0 −20 to −30%** · **S1 −40 to −60%, with tenant defaults** · **S2 incumbent cap 1.00–1.10×, new-RFP up to ~1.32×** · **S3 −30 to −40%, shorter terms, reopener available from year 3**. Locking renewals early is a bet on the scenario. That is the mechanic: **the Act II contracts come back as decisions**.

## 7. Density cliff and retrofit (D6, accepted)

Each hall has a **kW per rack** rating. GPU generations gain a density requirement: H100/H200 fit older halls (low tier, 40–60 kW/rack), Blackwell and Rubin NVL144 need mid tier (~125–130 kW/rack), Rubin Ultra (H2 2027) needs the top tier (~600 kW/rack). **Rubin NVL144's real published density is over 190 kW/rack; doc 28 deliberately compresses it into the mid tier for gameplay (F-3, accepted as a documented simplification, not a factual claim about NVIDIA's roadmap).** A **retrofit** project upgrades a hall a tier at a time: low→mid $1.5M/MW over 10 weeks, mid→top priced per the market file, 26 weeks. Not retrofitting caps you to older chips and their falling rents. **Feynman (2028) stays a flavour-only obsolescence card, no new density tier**, as originally decided. In S4 (Act IV) older chips gain value again, which is why the choice has no single right answer.

## 8. Presets (D13, accepted; numbers corrected in v1.1 per F-6)

Three full "2026Q4 company" fixtures, plus continue-from-save. **The original targets (~$1B good, ~$5B great) were aspirational, set before Act II's own balance was finalized. Doc 28 built the good preset to ~$1B and flagged the mismatch (F-6) against Act II's actually-accepted results: the good path is $412M (accepted MISS, M8.1a) and the great path peaks at $4.6B (accepted, M7.0e).** The presets must represent real Act II end-states, not the pre-tuning aspiration, so:
- **Good preset: ~$400–450M** (matching the accepted good-path result, not $1B).
- **Great preset: the best great-path company at 2026Q4, ~$2.7B** (v1.2: the $4.6B great path was a 2025 peak; no great-path company is worth $4.5–5B at 2026Q4).
- **Lifeline preset: ~$150M** (kept as delivered; consistent with a small survivor company).

This also means the "good preset survives all four scenarios" balance check (doc 28 §L) needs re-running once the preset is corrected downward; it is not assumed to still hold and must be re-checked in the scenario-engine milestone.

## 9. Nuclear PPA (D7, accepted)

A Power-slot option from 2027H2: $98–165/MWh by scenario, 15-year fixed term, no grid queue, take-or-pay. **Regional restriction (F-8, accepted as a design choice):** available only in PJM, Ohio, Georgia and Nordics, grounded in the real Crane/Clinton/Susquehanna restart announcements doc 28 cites. Best value in S2 (power is scarce and valuable); a fixed cost burden for an already-leveraged player in S1; strandable (paid for, underused) if oversized in S3.

## 10. Political capital (D8, D9, accepted)

A 0–100 meter, starting at 40, decaying −2/quarter without upkeep. Earned by the Government Affairs Lead hire (+3/quarter) and lobbying actions. Spent on cards (moratorium override, permit fast-track, and similar). A low-capital penalty applies below 15. No other new stakeholder meters (Heat and Ratepayer Anger only, besides this).

## 11. Wildcards (D10, accepted)

Pool of 4, 2 drawn per campaign: a grid emergency, a chip export rule change, a local moratorium, and an AI lab restructuring (the lab is fictional — no real company named, so no D15 review needed for this one).

## 12. Rivals (D11, accepted)

The five Act II rivals (Core Scientific, IREN, Hut 8, Cipher, CoreWeave) continue, each scenario scripting a fate for at least two of them. **S1's fates for Core Scientific and CoreWeave are negative and use real company names (F-review, D15): see §15 for the review outcome.**

## 13. Decisions, as accepted (D1–D17, owner, 29 Sep 2026)

| # | Decision | Accepted |
|---|---|---|
| D1 | Span and length | 16 quarters, 2027Q1–2030Q4, ~45 min |
| D2 | Scenario pool for Act III | S0 25% · S1 30% · S2 25% · S3 20%; S4, S5 wait for Act IV |
| D3 | Scenario trigger window | Trigger in 2027Q3–2028Q4; signals start 2–4 quarters earlier |
| D4 | Signals | 6 indicators, authored per scenario and quarter, 1 decoy per campaign; a new Act III "Read the market" reveals one indicator's authored range |
| D5 | Renewal repricing | S0 −20 to −30% · S1 −40 to −60% with tenant defaults · S2 incumbent cap 1.00–1.10×, new-RFP up to ~1.32× · S3 −30 to −40%, shorter terms, reopener from year 3 (mechanics revised in v1.1, F-1/F-2; v1.2: carried Act II leases reopenable by AI-lab/neocloud tenants below Band 0.75, S3 rebound from 2029, §17) |
| D6 | Density cliff | Two generations added (Rubin 2026H2, Rubin Ultra 2027H2), one retrofit project type; Feynman (2028) is an obsolescence card only; Rubin NVL144 compressed to mid density for gameplay (F-3) |
| D7 | Nuclear PPA | A Power-slot option from 2027H2 (higher price, no queue, fixed 15-year term), restricted to PJM/Ohio/Georgia/Nordics (F-8) |
| D8 | Political capital | A 0–100 meter, start 40, decay −2/q, earned by the Government Affairs Lead and lobbying actions, spent on cards |
| D9 | Stakeholder meters | Keep Heat and Ratepayer Anger; add only Political capital. No new meters |
| D10 | Wildcards | Pool of 4 (sovereign AI boom/grid emergency, chip export rule, local moratorium, fictional AI lab restructuring), 2 drawn per campaign |
| D11 | Rivals | Act II rivals continue; each scenario has a fate for at least two of them; S1's CoreWeave/Core Scientific fates reviewed, see §15 |
| D12 | Q-Day, orbital compute | Not in Act III (Act IV) |
| D13 | Presets | Good ~$400–450M, Great = the best great-path company at 2026Q4 (~$2.7B, v1.2), Lifeline ~$150M (corrected in v1.1, F-6), each a real Act II company (bot + seed); plus continue-from-save |
| D14 | Scoring | Net worth at 2030Q4, survival, and the reading score; title bands like Act II (v1.2: the reading title is the headline, Act II's valuation bands give the career title, growth multiple on founder net worth, no combined score, §17) |
| D15 | Real names | Real names in data files, as decided; speculative events that make negative claims about real companies get a review before any public release — see §15 for the interim (internal-build) review |
| D16 | Build order | (1) `inActII`/`inActIII` helper refactor [done, M9.1]; (2) walking skeleton [in progress, M10]; (3) scenario data engine and Signals; (4) calendar and renewals; (5) density and retrofit; (6) nuclear, political capital, wildcards; (7) presets, bots, full balance |
| D17 | Boundary rules for carried state | Heat carries; Act II lasting effects expiring by 2026Q4 drop, longer ones carry; head-start/lifeline flags drop; AI-lab distress flags carry until they end |

## 14. Cut order and timeline events

Cut order unchanged: 1. Wildcards → 2. Political capital → 3. Nuclear PPA → 4. The decoy indicator → 5. Scenario Mode picker → 6. Rival fates beyond two per scenario. **Never cut:** the hidden scenario and Signals, the contract calendar and renewal wall, carry-over from Act II, the chapter report with the scenario reveal.

Timeline events (doc 08 §4, speculative): Early 2027 orbital-compute rumours (flavour) · H2 2027 Rubin Ultra ~600 kW racks · H2 2027 Crane restart for Microsoft (835 MW) → nuclear PPAs · 2028 Feynman generation · ~Apr 2028 fifth halving · ~2029–30 the renewal wall · 2030 IEA base case ~945 TWh.

## 15. Content pack review (29 Sep 2026): flags F-1 through F-10, resolved

Doc 28 (`claude/act3-content/28-act-iii-content-pack.md`) delivered the full content pack and raised 10 design flags without editing this doc. Resolutions:

- **F-1 (renewal bands vs. Act II's actual 2026Q4 rents): RESOLVED.** Bands now key to the tenant's own contract rate, not a fixed era anchor. See §6.
- **F-2 (S2 "locked" contradicts the pre-trigger-value anchor; S3 needs an exit): RESOLVED.** Incumbent cap + separate new-RFP index for S2; a market-reopener clause for all Act III leases from year 3, for S3. See §6.
- **F-3 (Rubin NVL144 density compressed vs. real spec): ACCEPTED as a documented simplification.** The game's density tiers are a gameplay abstraction, not a spec sheet; no player-facing claim states NVL144's exact kW/rack. See §7.
- **F-4 (Act II rivals data ends 2026Q3, one quarter extrapolated): ACCEPTED**, minor and already documented in doc 28.
- **F-5 (base shell rent $1.5M/MW-yr is a designed proxy): ACCEPTED as delivered.** Close enough to Act II's `tenants.json` rates for gameplay; no change needed before the build.
- **F-6 (Good preset ~$1B vs. Act II's own accepted good path $412M): RESOLVED.** Presets corrected to match Act II's real accepted results. See §8. The doc 28 balance check (§L) must be re-run against the corrected preset once the scenario engine exists — it is not assumed to still pass.
- **F-7 (S1 hedged player still loses ~54% of equity; is that "forgiving"?): RESOLVED — a new hedge instrument is required.** S1 needs a stronger hedge option: a **crisis liquidity facility** (available only if the player has been hedging: cash reserve above a threshold, or a pre-arranged backstop signed before the trigger) that caps the drawdown. Target for the scenario-engine milestone: a fully hedged S1 player's worst case should sit at **≥ 0.75× equity**, clearly better than the ignorer's negative outcome, rather than merely "less bad." This is a new content item for doc 28's author (or the code thread, if simple enough) to add to `market_s1.csv` / `presets_act3.json` before the scenario engine is built against it.
- **F-8 (nuclear region restriction): ACCEPTED as a design choice**, grounded in the real regional nuclear-restart announcements. See §9.
- **F-9 (no fresh web research this pass): ACCEPTED for the build, with a follow-up.** A short, narrowly-scoped verification pass (checking only the ~10 claims marked `grounded: true` — the NVIDIA roadmap dates, the named nuclear PPAs, the April 2028 halving) is commissioned as non-blocking follow-up work; it does not hold up the scenario-engine milestone.
- **F-10 (Act II data inconsistencies: hashprice vs. hashrate/price; BTC 88,000 quarterly vs. 85,890 weekly): FILED, not an Act III issue.** This is a small Act II content data-consistency cleanup for the code thread to fix opportunistically; it does not block Act III.

**D15 review of real-company negative claims (S1 CoreWeave and Core Scientific fates):** reviewed by the design thread. Both read as plausible, clearly fictionalized in-game outcomes (a scripted rival "fate" in a stated hidden scenario, not a claim about what will actually happen), consistent with how Act I and II already use real company names for scripted rivals. **Accepted for internal build and testing.** The requirement from D15 stands unchanged: **a final editorial/legal review of these two fates is required before any public release** of the game, and that requirement is not satisfied by this review — it is simply not a blocker for building and playtesting Act III privately.

## 16. Status: what happens next

*Updated 4 Oct 2026 (v1.2).* The Act III build is done: D16 steps 1–7 (M10–M18) plus the scoring and the full chapter report (M14, M15). It lives on branches m16 → m17 → m18 (each made from the one before), not yet merged into main. Act III stays unreachable in the public build. Still open, all owner decisions or side work:
1. **D15:** the final editorial/legal review of the two S1 rival fates (Core Scientific, CoreWeave), with counsel, before any public release. Until then they show "Fate withheld pending review".
2. **When to switch Act III on in the public build** (after 1 and the owner's playtests).
3. **The S3 tension (§17.9):** the reading score rewards caution early in S3, but a levered company ends ahead there.
4. **F-9:** the short verification pass on the ~10 `grounded: true` claims (non-blocking).
5. ~~**F-10:** the Act II data cleanup (non-blocking).~~ **Closed (10 Oct 2026, M42):** already fixed by the 27 Sep 2026
   rebuild of the live Act II files (`docs/act2-content/`): every weekly row follows the hashprice formula, and each
   quarterly BTC value is the sourced quarter close, equal to the weekly file's last week. The mismatch was only in the
   superseded v1 pack files. No `btc_usd_mean` column (the sim never reads quarterly BTC).

## 17. What the build and the balance pass changed (v1.2, 4 Oct 2026)

Recorded from the code thread's reports M11–M18.13 and the design thread's answers. Numbers marked *designed* are the design thread's, not sourced. The repo's `docs/dev-notes.md` and `docs/dev-notes-archive.md` hold the full step logs.

### 17.1 Scoring (D14; M14–M15)
- **Reading score**, 0–100, from the hidden file `reading_score.json`: an ideal stance per scenario and quarter (+1 offensive, −1 defensive, 0 none) with weights. Each quarter's stance is the sign of the sum of the player's logged big moves. A quarter scores 1.0 for a match, 0.7 when both are calm (1.0 inside the decoy window), 0.5 when exactly one is 0, and 0 when they're opposite. Each move reacting to the decoy costs 10, capped at 30. Check values: a passive player scores 78 / 50 / 50 / 50; a perfect reader 78 / 100 / 100 / 100.
- **Move log:** about 20 move kinds, signed (e.g. project commit, debt draw, GPU buy, retrofit, PPA lock: +1; voluntary sale, repayment, term shortening, equity raise, hedge, delay, cash reserve: −1). Forced moves (rescue sales, covenant sales, automatic draws) don't count. In S3, term shortening counts as 0 (v1.2, §17.9).
- **Titles:** the reading title is the headline (Bagholder 0–19, Weathervane 20–39, Steady Hand 40–59, Signal Reader 60–79, Cassandra with a Balance Sheet 80–100). The career title uses Act II's valuation bands on the 2030Q4 valuation. The growth multiple is founder net worth at 2030Q4 ÷ at the Act III entry. There is no combined score.
- **Chapter report (A3-11):** the scenario reveal; the trigger and the decoy with its tell; a reveal timeline of the player's moves against the trigger and the decoy window (✓ / ✗ / decoy / –); the score with its band; "How this was scored" (per-quarter strip and the player's signal reads); the stats; the rivals. A game over also gets the reveal, marked "Out of the game".

### 17.2 Signals and seams (M15–M16)
- Nothing before the reveal shows the scenario (guarded by tests over every play screen and every view object).
- **Seam fixes:** the new-lease index is identical in all four scenarios at 2027Q1 (0.88–1.04) and halved toward the authored values in 2027Q2. s2's H200 and GB200 rents match the others at 2027Q1. Every live price is within 3% across scenarios at 2027Q1.

### 17.3 Renewals and reopeners (§6, D5)
- **Act III leases:** reopener as in v1.1 (any tenant, Band high < 0.90, from 8 quarters served; player-triggered with the fee).
- **Carried Act II leases (new in v1.2):** a tenant may reopen only if it's an AI-lab or neocloud tenant and only while Band high < 0.75 (S1 from 2028Q2, S3 from 2027Q4 to 2029Q2, never S0). Hyperscalers honour their contracts. The player may reopen any carried lease from 12 quarters served, with the fee. *Why:* without this, the Act II book was untouchable; applied to every tenant at 0.90, it repriced whole books even in Muddle Through.
- **S3 rebound (data, designed):** S3's shell renewal band rises from 2029Q1 (0.62/0.74) to 2030Q4 (0.84/0.98), and the RFP index rises by the same amounts. 2028Q4 and earlier are unchanged.
- Shell rents by hall tier from 2027Q3: low ×0.85, mid ×1.00, top ×1.10 (designed), on new leases, re-lets and renewal offers.

### 17.4 Density, Rubin and new halls (§7, D6; M16)
- Each project (hall) has a tier. Carried projects get theirs from their GPU (H100/H200 low; B200/GB200 mid) or, for shells, from their start (2025Q1+ mid, else low). New halls are mid; "Build to top tier" adds 0.6 × the mid→top retrofit cost and one quarter. Denser halls host older chips.
- Retrofit (low→mid $1.5M/MW, 10 weeks; mid→top per the market file, 26 weeks) and GPU refits, with a weeks-based downtime rule.
- **Rubin:** 900 GPUs/MW, rent factor 0.65. **Rubin Ultra:** 1,050 GPUs/MW, 144 GPUs a rack, rack price +$4M ($19M at 2027Q3), rent factor 0.60, from 2027Q3. Act II's GPU counts per MW are unchanged.
- **Act III GPU contract pricing (new in v1.2):** contracts signed in Act III are priced at a multiplier that glides 1.00 (2027Q1), 0.90, 0.80, then 0.55 from 2027Q4, the same in every scenario. Act II's rule priced contracts off on-demand rates; real contracts sit well below on-demand. Payback of a contracted cloud started in 2027Q3: B200 2.0–2.1 years (~38–41% IRR over 5 years); Rubin 2.4–2.5; Rubin Ultra 2.3. Floor for the new generations: ≥ 2.3 years and ≥ B200.
- **GPU walks:** a distressed AI-lab or neocloud GPU contract walks after 2 distressed quarters only if spot is below its half pay (the tenant's rational choice). A walk on a project with a GPU-backed loan opens a 2-quarter lender cure (re-contract or repay, else foreclosure).

### 17.5 Nuclear PPA (§9, D7; M17)
- Prices −$15/MWh from doc 28's values (2027Q3: s0 100, s1 100, s2 103, s3 100; range $83–150), into nuclear.json's own analyst range.
- Take-or-pay at 90%; unused paid-for power is resold at 0.9 × the region's energy price (designed). Clouds and miners on PPA power pay the PPA price; shell tenants reimburse at market. Act II's regional adders apply to PPA power too.
- **PJM capacity charge (new):** sites in PJM and Ohio pay the change in the PJM capacity price since 2027Q1 (÷ 24 per MWh). This is S2's grid squeeze. Signed in 2027Q3, a PJM PPA works out (market − contract, $/MWh) at about S0 −12 → 0, S1 −11 → −23, S2 −9 → +47 and S3 −1 → −19 by 2030Q3.
- The shared 100 MW card needs 200 MW energized.

### 17.6 Political capital and wildcards (§10–11, D8–D10; M17)
- As in political_capital.json, with: lobbying actions limited to once every 4 quarters (the coalition once per act); the tariff-relief spend card not offered (no tariff mechanic to relieve); below 15 PC, the moratorium comes at Anger 40 instead of 50 and grid upgrades take one more quarter (designed). A company-wide Anger adjustment (−20…+20) carries the lobbying and card effects.
- Wildcards: 2 of 4 drawn at entry, each in a random quarter of its window. The AI-lab restructure wildcard's review flag is cleared (fictional lab). The water moratorium targets a building project, else a proposed one, else the most idle site.

### 17.7 Hedge, facilities and the covenant (F-7; M18)
- **Standby liquidity facility (the S1 hedge instrument; available in every scenario):** 20% of valuation (cap $500M), 1% upfront fee, 0.5% a year on the undrawn part, SOFR + 350 bp locked, 8 quarters, BB− or better to arrange. It draws even when lenders are frozen, and automatically before any forced sale. Arranging it logs as a hedge.
- **Corporate facility:** company-level debt for the two former parked card choices (s0_c2 revolver, s0_c4 extension); a 12-quarter bullet.
- **Leverage covenant (new in v1.2):** at each Act III quarter end, LTV = debt ÷ the quarter report's valuation. The limit is max(75%, entry LTV + 5). A breach bars new debt, sweeps 50% of (EBITDA − interest) into prepayment, and must be cured to the limit − 10 within 2 quarters. Otherwise forced sales at ×0.85, then the lenders call what's left, then the rescue and game-over rules. In the population it bites mostly in S1 (22 of 211 runs breached).

### 17.8 Presets and Scenario Mode (§8, D13; M18)
- **Good "Steady Builder":** shell-capital seed 9, $412.6M, 17.1 MW, BB+. **Great "Scale Winner":** asic-retirer seed 48, $2.70B, 121.1 MW, BB+. **Lifeline "Last Site Standing":** lifeline-shell seed 19, $155.7M, 8 MW, one site. All three are leased-shell landlords with no GPUs.
- **A3-12:** start at Act III from a preset. Scenario Mode unlocks after any Act III chapter report on that device, picks the scenario openly, and tags the run.

### 17.9 Balance anchors: outcome (M18.13, Good preset and GPU-heavy company, 30 seeds each)
- **Passed:** A1 on the Good preset in S1 (hedged 0.91 vs ignorer 0.85); A3 redefined as S2 long-locked ≥ 1.15 × passive (2.41 vs 1.76); A5 (S0, every archetype ≥ 0.85); A6 (decoy over-reactor ≤ 0.97 × passive in S0–S2); A7 (Good preset never busts); F7 (hedged S1 ≥ 0.75: 0.91); C1 (S1 is the population's worst scenario: 1.01 / 0.84 / 1.80 / 1.01×); C2 (new-generation payback floor); C3 (S2 PPA signing ends ahead; S3 decoy PPA within ±2%).
- **Retired:** A4 (S3 flexible ≥ long-locked). The real mechanics say locked leases beat shortened ones in S3 (shortening options carry an upfront rent cut, and the trough lasts five quarters). The reading score was aligned: term shortening counts as 0 in S3.
- **Kept as information (accepted 4 Oct 2026):** A1 on the GPU-heavy company and A2 (S1 ignorer ≤ 0.5 with distress sales). A moderately levered company whose GPU contracts were signed in Act II keeps its valuation through S1 and never reaches the covenant. That's a defensible outcome, and tuning the test bot to force a pass would test the bot, not the game.
- **Leverage outside S1:** the ignorer ends ahead in S0, S2 and S3 (contracted clouds at ~2-year payback beat the cost of debt). This is accepted as the game's economics: S0 punishes nobody, and S2 rewards boldness.
- **Open tension (owner):** in S3 the reading score's ideal is defensive for the first six quarters, yet a levered company ends ~2.3× its entry net worth against ~0.9× for a hedged one. Either S3's ideal stance changes or S3's economics get sharper. To be decided after the owner plays S3.
- **Full sim at close:** 532 Act III runs, 0 crashes, 43 game overs; reading medians 75 / 50 / 56 / 50.
