# Act III carry-over audit (M8.8b, 29 Sep 2026)

A read-only look at the code as it stands (`main` at a37ef1e) to see what Act III could reuse and what it would cost. Nothing in the
game was changed to write this. File and line references are to that commit; "not found" means I looked and there is nothing.
Act III itself is not started in the code, and its design (doc 27) is still a draft in the design thread.

## 1. State at the end of Act II (2026Q4)

`GameState` is one plain object (`src/sim/state.ts:363`). Grouped by what Act III would have to do with each field:

**Carries over unchanged** (the company is the same company)
- `cash`, `treasury`, `hodlPct`, `founderStake`, `raisesDone` (`state.ts:389–397`): money, coins, the cap table.
- `sites` (`:398`, the `Site` type at `:25`), `machines` (`:399`), `hosting` (`:408`): the physical company.
- `projects` (`:410`, `Project` at `:233`, with its `tenant` and `power`), `facilities` (`:418`), `equipmentLoan` (`:402`),
  `constructionLoans` (`:404`), `bridgeLoan` (`:406`), `cryptoLoan` (`:422`): the assets and every debt.
- `creditRating` (`:420`), `staff` and `firedQuarter` (`:434–436`), `firstAiDealQuarter` (`:416`, the pivot premium's start).
- `seed`, `rng` (`:380–382`): Act III should draw from its own `substream(seed, label)`, as Act II does, so old games never change.
- `reports` (`:468`) and `log` (`:470`): the history the chapter reports read. They grow with the timeline (40 → 56 reports).

**Would need a reset or a rule at the act boundary**
- `siteHeat` (`:424`, `SiteHeat` at `heat.ts:23`): Heat carries, but grievance was reset at the Act I → II boundary (scope 0.2 §2.2);
  Act III needs its own rule. Anger is not stored: `regionAnger` (`anger.ts:16`) is worked out from MW each time, so it carries by itself.
- `events` (`EventState`, `eventEffects.ts:33`): the `fired` list (Act II cards play once a game), `flags`, and the lasting effects with
  an "until" quarter (`creditNotch`, `valuationMult`, `ebitdaMult`, `spreadAddBps`, `aiLabRevenueMult`, `gpuLockQuarter`, `taxPlan`,
  `regionMoratorium`, `auditPenalty`). Most should be cleared; `aiLabRevenueMult` and `spreadAddBps` are "from then on" and need a decision.
- `act2Entry` (`:442`, `Act2Entry` at `:113`): the Merge head start and the lifeline flag. Its effects live on other objects
  (`MachineLot.legacyCloud` at `:106`, shell-ready sites in `Act2Entry.shellReadySites`), so dropping it needs a check of `headStarts.ts`.
- Per-project flags: `ProjectTenant.distressedQuarter` (`:225`), `Project.emptyUntil` (`:254`): the AI-lab distress. These are contract
  state (they carry), but the rule that sets them is Act II's 2026 stress.
- `mergeChoice` (`:440`) and `preset` (`:444`): history flags; harmless to keep, useless in Act III.
- Rescue flags: **not found**. `rescueBeforeGameOver` (`rescue.ts:26`) keeps no state, it only logs. It is guarded by `state.act !== 2`.

**Act II-only (drop or ignore)**: `projectEvents` (`:412`), `spotShock` (`:414`), `failureWaves` (`:448`), `marketRead` (`:438`),
`negotiation`/`dealNegotiation` (`:426–428`), `pitch` (`:430`), `complaint`, `curtailment`, `auction`, `interrupt`,
`interruptsThisQuarter`, `quarterStats`: all per-quarter, rebuilt each quarter.

## 2. Contracts

Stored on the project, not in a list of their own. `ProjectTenant` (`state.ts:209`) has the tenant `card` (id into `tenants.json`),
`signedQuarter`, `readyByQuarter`, an optional `gpu` block (`gpus`, `priceUsdHr`, `termQuarters`), `servedQuarters`, `priceMult` (a
negotiated rent) and `distressedQuarter`.
- **Term:** `contractQuarters(p)` (`projects.ts:261`): a GPU contract's `termQuarters`, or a shell lease's `card.termYears × 4`
  (`tenants.json` gives 5–15 years).
- **Price:** a lease is `annualContractUsd(p)` (`projects.ts:186`, card price × MW × `priceMult`); a GPU contract is `gpu.priceUsdHr`.
- **End:** for a live project the end quarter is `quarter + contractQuarters − servedQuarters` (see `remainingContractUsd`, `:1381`);
  for a building one it is `readyQuarter + contractQuarters`.
- **Renewal state:** **not found for leases.** When a GPU contract runs out the tenant is cleared and the project goes back to spot
  (`projects.ts:871–876`, log `log.gpu_contract_ended`); when a shell lease runs out nothing happens in the code (no end handling).
- **A contract calendar** (every contract by end quarter, tenant, MW, price) can be computed by a selector from the state with no new
  state: every input above is already on `Project`. Only "renewal state" would be new.

## 3. Rack density and GPU generation requirements

- **In the code: not found.** No per-site or per-hall field for kW per rack, and no rule that a hall must suit a GPU generation.
- **In the data:** `gpus.json:100` has `kw_per_rack` (120 for the GB200 NVL72), but the loader only reads the per-unit generations
  h100/h200/b200 (`GpuGeneration`, `content/index.ts:169`, with `gpusPerMw` only). The GB200 is not loaded at all (its per-MW figures
  are not derived; see `docs/act2-content/README.md`).
- **Cheapest place to add it:** (a) a `kwPerRack` on `GpuGeneration` (content only); (b) an optional `rackKw?` on `Site` (`state.ts:25`,
  next to `category` and `kw`, seeded from `sites_act2.json`); (c) a check in `openBlocker` (`projects.ts:431`). A retrofit project can copy
  the transformer upgrade: `Site.upgradeReadyQuarter` (`state.ts:43`) plus its view in `selectors.ts` (`transformerViews`).

## 4. The timeline (Act II = quarters 23–39 on one 40-quarter timeline)

Where the code assumes the end is index 39 / 2026Q4:
- **Acts and quarters:** `addAct(1…)`, `addAct(2, 'market_weekly_act2')` build one `quarters` and `market` array
  (`content/index.ts:739–783`); `actLastQuarter` (`:1689`), `actOfQuarter` (`:1659`) and the `act: 0 | 1 | 2` union (`state.ts:370`).
- **Quarter-indexed Act II data:** `act2Quarter(q)` (`:1654`) reads `CONTENT.act2Market[q − 23]`. It has 32 call sites in `src` and
  `tools`; `anger.ts:28` even uses `act2Quarter(quarter)!`. Past quarter 39 it returns `undefined`, so anything without a guard would crash.
  `sites.ts:141` and `finance.ts:53` index `act2Market` directly.
- **Values that stop at 2026Q4:** cap rates and multiples (`finance.ts:49–53`, `projects.ts:~1441`, `balance.ts:144`, the era
  multiples in `capital_act2.json`, which the loader checks must anchor the first and last Act II quarter, `content/index.ts:~850`).
- **The end of the game:** `startNextQuarter` (`quarter.ts:198–204`) goes to phase `chapter` after `actLastQuarter(state.act)`;
  the Act II chapter report and its end-of-game text (`selectors.ts:1340`, `End.tsx:98`); the last-quarter button (`Report.tsx:79`);
  `restoreSave`'s `actFitsQuarter` (`save.ts:57`); the sim's `through: 0 | 1 | 2` (`replay.ts:52–58`); the "Turn N of 17" counter.
- **What adding quarters 40–55 needs:** market data for 16 quarters (weekly and quarterly), an `act: 3` (and every `state.act === 2`
  check, 38 places, decided one by one: does Act III inherit it?), the `act2Quarter` guards, a chapter report that no longer ends the
  game, a save step, and new goldens for Act III only (Act I/II goldens stay as they are).

## 5. Market data and a scenario-specific market

- **How it loads:** the weekly files become `CONTENT.market[quarterIndex][week]` (13 weeks; `content/index.ts:739–783`). The engine
  reads a week with `marketWeek(quarter, week)` (`systems/market.ts:49`): **40 call sites in 11 files**, plus 7 direct reads of
  `CONTENT.market[...]` (`readMarket.ts:22`, `selectors.ts:226/451`, `curtailment.ts:145`, `market.ts:50/63/67`, `mining.ts:150`).
  Quarterly Act II data (`market_quarterly_act2.json`: GPU prices, capex, power by region, spreads) is read by `act2Quarter`.
- **The problem:** all of this is a module-level global keyed by quarter only, so it cannot differ per game. A scenario has to come in
  as a parameter or through the state.
- **Cheapest design that leaves Act I and II alone:** one JSON per scenario (weekly and quarterly, quarters 40–55), loaded lazily; a
  `scenario: string | null` on `GameState` (null for every Act I / II game, listed in `ADDED_SINCE_V1` so old saves load); the id drawn at
  the act boundary from its own `substream(seed, 'scenario')`; and `marketWeek(quarter, week, scenario?)` and `act2Quarter(quarter,
  scenario?)` with the scenario as an optional last argument, so every existing call keeps its result. Only Act III callers pass it.
  Act I and II results and goldens cannot change because their calls never pass a scenario. The cost is the ~50 call sites to thread it
  through in Act III paths (mostly mechanical, since `advance` already hands the week `w` down to most systems).
- **The Merge draw already shows the pattern** for a hidden choice keyed off the seed: prologue rolls use `rollStream`, Act II uses
  `substream(seed, label)`.

## 6. Reusing negotiation, the credit rating and "Read the market"

- **Tenant negotiation (Deal builder):** `dealNegotiation.ts` bargains for up to 3 rounds over a tenant offer on a *proposed* project,
  with a hidden limit per tenant type (`state.ts:428`). For renewals it needs a way to start from an existing signed tenant at its term
  end (a `renewal` offer built from `ProjectTenant`), and the limits in `balance.ts` for renewals. The engine (rounds, walk chance,
  Bandwidth cost) is reusable as it is.
- **Credit rating:** `ratingInputs(state, report)` (`rating.ts:69`) works from the state and a report, so it is reusable unchanged. A
  renewal price could read the rating with a small table (medium: content only).
- **"Read the market":** `readMarket.ts:21` (`trueDirection`) looks at the **real future** in `CONTENT.market` and then blurs it. For a
  hidden scenario that would leak the answer. A Signals panel needs authored per-scenario, per-quarter hints (content), not this
  function. What is reusable: the once-a-quarter Plan action, its Bandwidth cost and the accuracy roll.

## 7. Save format

`SAVE_VERSION` is **3** (`save.ts:27`). Migrations are a table of step functions (`MIGRATIONS`, `save.ts:32`), one per version; the
last one (`2 → 3`) is `(data) => ({ ...data, version: 3 })`. A `3 → 4` step for Act III fits that pattern exactly. Two other things
change: `actFitsQuarter` (`save.ts:57`) needs an `act === 3` branch, and new fields go into `ADDED_SINCE_V1` in
`tests/sim/save.test.ts:110` with their new-game value (`scenario: null`). The old-save fixtures (`tests/fixtures/saves/v1-*.json`)
keep working as they are.

## 8. Rivals and the league

Scripted per quarter in data: `rivals_act2.json` has, for each of the five companies, series keyed by quarter label (`mw_energized`,
AI MW, mining MW, hashrate, value, debt); the quarters of their key moves point at texts `rival_move.<id>.<quarter>` in
`src/i18n/en.json`. `activeRivals(quarter)` (`rivals.ts:85`) takes only the quarter. So Act III could script each rival's fate per
scenario with a `rivals_act3.json` keyed by scenario then quarter, and `activeRivals(quarter, scenario?)`. The league table itself
(`leagueTable`) reads whatever `activeRivals` returns. Cheap-to-medium: data plus one optional parameter.

## 9. Bandwidth, hires and the Government Affairs Lead

- The hire is **out** of Act II: `hires_act2.json:23` has `"in_alpha_0_2": false` and the loader skips it (`content/index.ts:1024`,
  `if (!h.in_alpha_0_2) continue`). It is kept in the file for Act III.
- **Bandwidth:** `bandwidthForQuarter` (`bandwidth.ts:14`) is a number rebuilt each quarter from base, MW steps and hire bonuses.
- **Political capital next to Heat and Anger:** Heat is state per site (`siteHeat`, `heat.ts:23`); Anger is a pure function of MW
  (`anger.ts:16`) with no state. A political-capital meter would be one new number on `GameState` (like `bandwidth`) with content-driven
  gains and spends, plus a UI meter. The number is cheap; the effects (what it buys, how lobbying interacts with Anger and
  moratoriums, `regionMoratorium` in `EventState`) are the medium part.

## 10. Other risks for a 16-quarter Act III with a hidden scenario

1. **`state.act === 2` and `act !== 2` (38 places)** decide behaviour (rescue, bandwidth, valuation, rating, report). Every one needs a
   yes/no for Act III; missing one is a silent bug, not a crash. Suggest a helper such as `inActII(state)` first, then extend it.
2. **Guards on `act2Quarter`:** `anger.ts:28` uses `!` and several callers assume a value; past 2026Q4 they would throw.
3. **Sim time and goldens:** `npm run sim -- --act2` takes ~5 minutes for 11 bots; 16 more quarters plus 4 scenarios × bots is roughly
   3–4× that. Act III needs its own §5 checks and goldens, and the bots need Act III play (they stop at 2026Q4 today).
4. **Balance under a hidden scenario:** the bots only read the current Plan-phase week (`tools/bots.ts:478`, `marketWeek(s.quarter, 0)`),
   which is what a player sees, so they do not peek at the future today. The one function that does is `trueDirection` (`readMarket.ts:21`).
   To test "decisions, not luck" under a hidden scenario, bots must never read the scenario id or later weeks; keep it that way.
5. **Save size:** `log` and `reports` are unbounded arrays inside the save; 16 more quarters is about +40%. Fine for now, worth a cap.
6. **Chapter report and game-over text** are written for "the end of Act II = the end of the game" (`End.tsx:98`, `selectors.ts:1340`).
7. **Act II's tuning is unsettled:** the accepted MISSes (good path, lifeline, preset, overleveraged) and the queued runway change (M9.0)
   mean Act III would inherit numbers that may still move after the playtest.

## Summary: how hard is each Act III candidate on the current code?

| Candidate | Rating | Why |
|---|---|---|
| Hidden scenario draw | cheap | one `substream(seed, 'scenario')` at the boundary and one `scenario` field (`null` for old games) |
| Scenario-dependent market and content | medium | the market is a global keyed by quarter; needs an optional scenario argument through ~50 call sites |
| Signals panel | medium | `readMarket` reads the true future; needs authored hints per scenario and quarter, plus a new panel |
| Contract calendar | cheap | a selector over `Project.tenant` (term, price, tenant, served quarters); no new state |
| Renewal wall | medium | no renewal state or event for leases; GPU contracts already fall back to spot; negotiation engine is reusable |
| Density cliff and retrofit project | medium | no density data in code; a `Site` field, a generation `kwPerRack`, an `openBlocker` check, and a retrofit modelled on the transformer upgrade |
| Nuclear PPA as a Power-slot option | cheap | `PowerSource` is `'grid' \| 'gas'` (`state.ts:78`) with cost and queue rules in `power.ts`; add a value plus content and a blocker |
| Political capital | medium | one number is easy; its effects and the lobbying rules with Heat, Anger and moratoriums are the work |
| Wildcards | cheap | event cards are data (`events_act2.json`) on an engine that already schedules scripted and random cards |
| Extending the timeline (quarters 40–55) | expensive | touches the act union, ~40 `act === 2` checks, 32 `act2Quarter` calls, 40 `marketWeek` calls, the chapter report, the save loader, sims and goldens |
| Presets (start Act III without playing Acts I–II) | medium | the Act II preset (`preset.ts`) is a hand-built state; an Act III one needs a full 2026Q4 company, best made by a bot run and stored as a fixture |
