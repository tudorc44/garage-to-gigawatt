# 27: Act III design, "Reckoning" (2027 → 2030). v1.1 (frozen), 29 Sep 2026

*Status: **frozen.** D1–D17 accepted in full by the owner on 29 Sep 2026. This document is the single source of truth for Act III design, the way doc 10 is for Alpha 0.1 and doc 20 for Alpha 0.2. It stays frozen until Alpha 0.4 (doc 29) is written and itself frozen; a change after that follows the same change rule as docs 10 and 20 (a new idea goes to the backlog and can only enter by replacing something of similar size, written into the frozen scope doc, not this one). Built on doc 08 (§4 scheduled future, §5 scenarios, §6 systems) and doc 07 (§2b). Post-2026 facts in doc 08 are speculative fiction built on published forecasts, not facts.*

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
- **Great preset: ~$4.5–5B** (already close to the accepted $4.6B peak; kept as delivered).
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
| D5 | Renewal repricing | S0 −20 to −30% · S1 −40 to −60% with tenant defaults · S2 incumbent cap 1.00–1.10×, new-RFP up to ~1.32× · S3 −30 to −40%, shorter terms, reopener from year 3 (mechanics revised in v1.1, F-1/F-2) |
| D6 | Density cliff | Two generations added (Rubin 2026H2, Rubin Ultra 2027H2), one retrofit project type; Feynman (2028) is an obsolescence card only; Rubin NVL144 compressed to mid density for gameplay (F-3) |
| D7 | Nuclear PPA | A Power-slot option from 2027H2 (higher price, no queue, fixed 15-year term), restricted to PJM/Ohio/Georgia/Nordics (F-8) |
| D8 | Political capital | A 0–100 meter, start 40, decay −2/q, earned by the Government Affairs Lead and lobbying actions, spent on cards |
| D9 | Stakeholder meters | Keep Heat and Ratepayer Anger; add only Political capital. No new meters |
| D10 | Wildcards | Pool of 4 (sovereign AI boom/grid emergency, chip export rule, local moratorium, fictional AI lab restructuring), 2 drawn per campaign |
| D11 | Rivals | Act II rivals continue; each scenario has a fate for at least two of them; S1's CoreWeave/Core Scientific fates reviewed, see §15 |
| D12 | Q-Day, orbital compute | Not in Act III (Act IV) |
| D13 | Presets | Good ~$400–450M, Great ~$4.5–5B, Lifeline ~$150M (corrected in v1.1, F-6), each a full 2026Q4 company fixture; plus continue-from-save |
| D14 | Scoring | Net worth at 2030Q4, survival, and the reading score; title bands like Act II |
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

Design is done for this pass. Code: M10 (the walking skeleton) continues or is complete; the next milestone is **D16 step 3, the scenario data engine and Signals**, built against doc 28's content pack as corrected by this section (F-1, F-2, F-6, F-7 must be reflected in the loaded content, not just in this document). F-9's verification pass and F-10's Act II cleanup are non-blocking side work.
