# Dev notes: where the build stands

The running record of where the build stands, the rules in force, open questions and what's next. It exists so
any Claude account or machine can pick up the work with no chat history. **Read `CLAUDE.md` first, then this
file.** The full history (every finished step, balance review, milestone and report, with the decisions in detail)
is in `docs/dev-notes-archive.md`: read it only when a task needs the history.

Last updated: 29 Sep 2026. Act I, Act II and the Prologue are all built and done; M9 closed with no playtest fixes needed. **Milestone M10
(the Act III walking skeleton) is DONE on branch `m10`:** plumbing only, no Act III game rules, and Act III stays completely
unreachable from play (no title-screen option, no menu, no console helper). See "Next" and the M10 section below.

## How the owner works

- The owner is a beginner programmer. Explain every change in plain language, say how to see or test it.
- Plans and design decisions come from a separate Claude chat (the "design thread", on the owner's personal
  Claude account, with the design docs as project files). The owner pastes tasks from there. When a task
  raises a design question, stop and give the owner a short report they can paste back into that thread.
- One small working step = one commit. **Never push:** `git push` is denied in `.claude/settings.json`; the owner
  pushes (Terminal panel: `git push origin m8`, and `main` after a merge).
- Ask before adding any dependency. Don't edit `docs/` unless asked (this file is the exception: keep it current).
- Never touch `staging/` (the owner's playtest snapshot) or run `npm run staging:build` unless asked.
- Only one Claude account works on the repo at a time. Start with `git pull`.

## Machine setup (new computer, e.g. a Mac)

1. Install Git and **Node.js 24** (`node --version` → `v24.x`). Node 24 runs the `.ts` tools directly.
2. `git clone https://github.com/tudorc44/garage-to-gigawatt.git`, then `cd garage-to-gigawatt`.
3. `npm install`, then `npm test` (should be all green) and `npm run dev`.
4. `npm run staging:build` once to make a local staging snapshot (it isn't in git).

Line endings are pinned to LF by `.gitattributes`, so the golden files match on Windows and macOS.

## Commands

See `CLAUDE.md` for the full list. The main ones:

- `npm run dev`: play in the browser at http://localhost:5173. Console helpers in every build (GitHub Pages
  too): `g2g.setCash(n)`, `g2g.state()`, `g2g.load(state)` (through the save loader, so old states load).
- `npm test`, `npm run lint`, `npm run build`: all three before calling anything done. `npm run format` (Prettier).
- `npm run play`: the terminal game (Act I, then Act II). `npm run sim`: bots × 50 seeds → `sim-output/`;
  `npm run sim -- --act2` also plays the Act II bots to 2026Q4 and prints the scope 0.2 §5 table (~5 min);
  `npm run sim -- --prologue` plays the 6 prologue bots and prints the scope 0.3 §5 table (~8 min). Add `--out <dir>`.
- `npm run content:market`: regenerate the market JSON files after editing a market CSV.
- Golden replays: accept intended changes with `npm test -- -u tests/golden-replay.test.ts`, and explain every one.

## Where the build stands

**Act I (Alpha 0.1): complete**, balance pass done, the 11 goldens unchanged. Playtests are postponed (owner).
**The Prologue (Alpha 0.3): complete** (Act 0, 2009–2016; economy, cards, wireframe screens P0-01…P0-08, handover).
**Act II (Alpha 0.2, scope frozen v1.0): complete** (details in the archive):
- Act boundary (one 40-quarter timeline, save v2/v3 migrations, Merge → Act II intro); MW by use; hosting; projects
  (AI shell, AI cloud, pilot; Power / Tenant / Capital slots; delays, GPU queue, take-or-pay, valuation); GPU contracts and
  resale; project debt, DDTLs, equipment loan, credit rating, equity / ATM, JV partner, backstop, foreclosure; head starts,
  lifeline, standalone preset; regions, policies, Anger; hires and Bandwidth; event deck and interrupts; rivals and league;
  chapter report; game-over causes; onboarding tips; bots and a §5 table. M7.0 = the owner's A1–A9 answers.
- **M8 (this milestone):** the Act II quarter report panel (MW before → after with a total row, backlog change, rating change
  with its reason, project milestones, tenants signed or lost); the GPU failure wave interrupt (`systems/gpuWave.ts`); "GPU
  know-how N of 3" on the Dashboard with a tooltip built from the rules, and the utilisation in use in the Deal builder;
  the Deal builder's return net of a JV partner; prologue auto-play starts at 2×; measurement decisions (below).

**Numbers (end of M8.7):** 721 tests pass; lint and build pass; the 11 Act I goldens and both prologue goldens unchanged.
Act II §5 (50 seeds): 9 PASS, 3 accepted MISS (good path, lifeline, preset), 1 MISS (overleveraged, accepted as a known design risk).
Prologue §5 (last run in M8, no prologue bot or content changed since): all PASS (296/300 runs reach 2026Q4; the other 4 end in the
prologue). Tables: `npm run sim -- --act2` / `--prologue`.

## Rules and decisions in force

### Working rules
- **Branches:** the current milestone branch (`m8`), made from `main`; `main` is the stable, deployable version (GitHub Pages).
  The owner reviews, pushes and merges. Never commit to `main`.
- **Batch mode** (CLAUDE.md): sub-steps `M<n>.<k>`, each lint + test + build → a short dev-notes update → one commit;
  small decisions labelled "(mine, reversible)"; blockers under "STOPPED"; change files only with the Edit / Write tools.
- **Content copies:** the game reads `src/content/`; the Act II files there are byte-for-byte copies of
  `docs/act2-content/` (a test checks it). Edit both, and note data changes in `docs/act2-content/README.md`.
  `regions.json`, `sites_act2.json` and `events_act2.json` are game copies (reshaped), edited in `src/content/` only.
- **Scope docs:** `docs/alpha-0.2-scope.md` and `docs/game-project-files/claude_20-alpha-0_2-scope.md` stay identical
  (`claude_26-alpha-0_3-scope.md` already differs from `alpha-0.3-scope.md`, which wins).
- **Saves:** `tests/fixtures/saves/v1-*.json` are real old saves: keep them forever, never reformat them. New state
  fields go in the save test's `ADDED_SINCE_V1` list with their new-game value.
- **Goldens** play Act I only (`playGame(seed, bot)` stops at the Act I chapter report); `{ through: 2 }` plays on.
- New Act II randomness uses its own `substream(seed, label)`, so Act I games never change.
- Every "(mine, reversible)" choice recorded in the archive stands until the owner says otherwise.

### Owner decisions: Act I (details: archive › "Decisions" and the balance reviews)
- Start: $10k, no rigs; machines earn from the quarter after purchase; 13-week quarters; the Merge in week 11 of 2022Q3.
- Prices exactly as in the market CSV; coins sold weekly; keep/sell % per coin; "Sell treasury coins" (1 BW).
- Power contracts, negotiation, Texas fixed / index and Winter Storm Uri (firm load) as specified by the design thread.
- Funding rounds (F&F, seed, Series A, IPO / SPAC) from `capital.json`; seed and Series A can be pitched.
- Hires, Read the market, Community Heat (50 rate hike / 70 moratorium / 90 shutdown), event cards, the failure wave,
  the Merge and chapter report, save / load, sound (`zzfx`), the left-nav screens and Settings.
- Balance pass: 2021 era multiples (Q1 35, Q2–Q3 22, Q4 20), IPO needs $3M quarterly EBITDA, the GPU cap on all GPU rigs
  (2020Q4–2022Q1, 250 kW a quarter), phased Texas (5 × 20 MW, 2-quarter phases, construction loans), transformer upgrade ($150K).
- Act I as built, confirmed (answer 18): `requires.min_mw` = a built, powered site big enough; equipment loan one at a time
  (era LTV, 8 quarters, early repay free); crypto loan 50% LTV, margin call 70%, liquidation 80%; distressed auctions a Plan action
  (2 BW, one sealed bid); curtailment (Texas, ≤ once per Q3, 35%); Heat 50 read at quarter end; a due power renewal left alone
  repeats for 4 quarters; the first Texas contract is fixed.

### Owner decisions: Act II (details: archive › "Act II readiness", the M2–M6 decisions)
- Scope 0.2 v1.0 frozen: take-or-pay 3% of the annual contract per late quarter; mining → hosting $0.1M/MW; pilot 0.5–2 MW;
  ratings CCC− to BBB; delays 15% a quarter. Pilot = neocloud price × utilisation from 70% (+5 at know-how 2, +10 at 3).
- Valuation counts projects under construction at capex spent; the top-bar backlog is unweighted; backlog weights A/AA 20%,
  backstopped 20%, BBB 15%, AI lab 8%, spot 0%; contracted AI floor 15× (never binds at 2026Q4, where the era multiple is 15×: intended).
- Hosting defaults in winter (15% in 2022Q4 / 2023Q1, else 5%), free re-letting; idle and building MW pay 25% of full-load power.
- GPU contracts (neocloud, AI-lab, enterprise cards; overflow at know-how 3); GPU resale 15%/year, floor 35%; the pilot waits 1 quarter.
- Equipment loan priced on the rating (BBB SOFR + 2.5% / 60% LTV … CCC + 9% / 25%); equity off the valuation; ATM equity 2 raises a
  quarter, 8–30% each; interest during construction capitalised; sub-BBB AI labs get project debt at 50% (+3 pts); AI-lab distress
  from 2026Q2; before an Act II game over: sell the smallest curing project (×0.85), else emergency equity at −50%, ≤ 30%.
- Lifeline: under 20 MW **and** under $5M cash; a 20 MW site for $6.5M on a bridge at 14%, 12 quarters, interest only for 4, then eighths.
- Head starts each have their own opening (guaranteed offers, distressed fleet, parked GPUs); the head-start check is judged on a
  GPU-heavy Act I. Act II Bandwidth base 4 (+1 Chief of Staff carries). Anger, regional policies, negotiation limits, the
  air-permit lawsuit, aggressive depreciation: as in the archive (M5 answers 1–19).
- **Design thread's answers to the M8 questions (M8.7):** head starts 3/4 distinct accepted; the hosting head start's cash reserve is bot
  behaviour, not a rule (a player may go all-in: a legitimate risk); the overleveraged target stays an accepted MISS with the scope §5
  note "known design risk: the most leveraged bot is also the best performer, so leverage may not bite enough; revisit after the owner
  has played Act II, not in bots"; other lifeline-taking bots' medians moving 10–16% (busts becoming small survivors) accepted; the GPU
  failure wave numbers confirmed (10% a quarter per qualifying project, 10,000-GPU threshold, run-short bill at the end of the next
  quarter; a silent resolve = replace now if the cash covers it, else run short); stabilized-IG EV/MW band $18–28M.
- **M8 answers (28 Sep 2026):** accepted MISSes (no tuning, no JV lever): good path $412M, lifeline 61/120, preset $181.9M;
  the overleveraged target counts an emergency raise; EV/MW skips "no mining left"; 15× floor stays; prologue: sale cap for prologue
  starts only, loan cap for all, automatic move back home (4 prologue busts left), offers stay until the next decision quarter,
  "Empty garage" wording stays, auto-play starts at 2×.
- **GPU failure wave (M8.4):** live full-stack cloud with ≥ 10,000 GPUs (13.3 MW), 10% a quarter, 0.5–1% of its GPUs (rounded up);
  replace now $30,000 each (default) or run short (out for the rest of the quarter and the next; a contracted tenant gets a 2× SLA
  credit; the bill is paid at the end of the next quarter); counts toward the 3 interrupts; with the cap full it resolves silently with
  the default. Numbers in `interrupts_act2.json › gpu_failure_wave`, both copies.

## Open questions for the design thread

None open. (The runway question was answered: yes, look ahead, queued as M9.0 below and not started.)

## STOPPED

Nothing. (Balance tuning stays stopped by the owner's A1 answer.)

## Small follow-ups

- An ear test of the sounds; the 4 sample fallbacks if a synth sound is wrong.
- (Done, 29 Sep 2026) The big JS chunk is split: `vite.config.ts` puts the market data, card text, other content JSON and
  libraries in their own files, and the prologue screens load only when a prologue game starts (`LazyPrologue` in `app.tsx`).
  Every file is under 500 KB (main 444 KB) and the Vite warning is gone.
- The ASIC $/TH tiers, SOFR and spread series are estimates (doc 18 §15): pull real data before final balance.
- Backlog idea (design thread): the pitch opening reacts to company performance (era EV/EBITDA × trailing EBITDA, ±30%).
- Power and capital project slots have no log line, so the report's "milestones" only show the tenant slot (mine, reversible).

## Next

**M11 is in progress on branch `m11` (M11.1 scenarios, M11.2 Signals, M11.3 the 16-quarter timeline and the end of Act III are done).**
Planned next, for the owner's OK: **M11.4** Act II's systems run in Act III against the scenario market (each `inActII` / `isActIIQuarter`
gate gets a deliberate yes or no; D17 boundary rules), **M11.5** the scenario event cards (`events_act3.json`, 37 cards) applying only
effects the engine supports, then D16 step 4 (contract calendar, renewals, F-1/F-2). Later: reading score and net-worth scoring (D14),
the Signals panel and chapter-report UI. The Act I playtests stay postponed.

## Milestone M10: the Act III walking skeleton — DONE (branch `m10`; the step log is in the archive › "Milestone M10")

Plumbing only: no Act III game system was built (no scenarios, Signals, renewals, density, nuclear, political capital or wildcards —
those wait for doc 28's content pack, not yet written). `isActIII` / `inActIII` (`state.ts`) sit next to M9.1's Act II helpers; the
40-quarter timeline extends with 2 placeholder quarters (2027Q1–Q2, `src/content/act3-stub.json`, clearly labelled STUB, Act II's real
last week cloned flat); save version 4; `advance()` plays both stub quarters (Plan → Live → report each) with no crash and **no new UI
or selector guard needed anywhere** — Act II's own `inActII`/`isActIIQuarter` gates already turn every business system off outside Act
II, which M10.4 confirmed rather than assumed. **Act III stays completely unreachable from play:** no title-screen option, no menu, no
console helper produces `act: 3`; only a test helper (`tests/sim/act3Helpers.ts`) and an opt-in sim-runner flag (`--act3stub`) can. The
Act II sim (`npm run sim -- --act2`, 50 seeds) is confirmed byte-identical to the pre-M10 baseline, printed output and all 1,302 CSVs;
`--act2 --act3stub` played all 527 runs that reached 2026Q4 through both stub quarters with 0 crashes. Tests: 741 (all 11 Act I
goldens, both prologue goldens, every Act II golden, and the new `act3-stub-golden` unchanged/passing). STUB points logged during
M10.1 (not decided; each a safe no-op today): Act III's Bandwidth rule (falls back to Act I's); what ends Act III (reaches the generic
`'chapter'` phase, since doc 27's real answer for this isn't wired). Full sub-step detail, the timeline-indexing decision (appended via
the existing `addAct()`, not a separate namespaced array — the lowest-risk option), and two incidents (a background-job read race
mistaken for a regression, caught before any code changed; two shell-rule slips, both harmless) are in the archive.

## Milestone M11 (branch `m11`, from `main`): Act III scenario engine, in progress

**M11.1 done:** `scenarioId` (s0–s3, absent in Acts I/II and the M10 stub) drawn by `toAct3()` from `substream(seed, "act3_scenario")` at 25/30/25/20 (`BALANCE.act3`); `marketWeek` / `previousMarketWeek` / `trueDirection` take an optional scenario (`scenarioOf(state)`, ignored before Act III) and the 8 `market_s*` / `market_weekly_s*` CSVs are loaded into `CONTENT.act3Scenarios` (byte copies of `docs/act3-content/`, own chunks in `vite.config.ts`); 757 tests. ETH price holds at Act II's last week in scenarios (mine, reversible).

**M11.2 done (Signals):** `READ_SIGNAL {indicator}` (Act III "Read the market": 1 BW flat, once a quarter, Plan phase, needs a scenario) logs to `act3SignalReads`; `signalsPanel(state)` returns label, displayed and arrow (current + past quarters) and sharp ranges only for quarters read; Act I's `READ_MARKET` is blocked in Act III (`error.market_read_act3`); Act III Bandwidth = Act II's rule (STUB 1 wired; "what ends Act III" still a STUB for M11.3). `signals_s0–s3.json` copied byte-identical (trigger `card_id`s fixed to `s{n}_c3`, see `docs/act3-content/README.md`); `CONTENT.signals` holds runtime fields only, the hidden view is `src/content/signalsHidden.ts` (tests and `tools/signals-oracle.ts` only, grep-tested). **act3-stub golden changed on purpose:** end-state `bandwidth` 3 → 4 (Act I's base 3 → Act II's base 4), nothing else. Oracle (trigger / signals start / decoy): s0 2028Q2 / 2027Q2 / lender_spreads 2027Q3–2028Q1 peak Q4; s1 2028Q1 / 2027Q2 / chip_lead_times 2027Q2–Q4 peak Q4; s2 2028Q3 / 2027Q3 / efficiency_index 2027Q3–2028Q2 peak 2028Q1; s3 2027Q4 / 2027Q1 / grid_reserve_margin 2027Q2–2028Q1 peak 2027Q3. All data checks pass; STOPPED: nothing. 776 tests.

**M11.3 done (timeline, end of Act III):** the working-tree WIP was my own start (a first split); reviewed against this spec and continued, with these changes: the flat-market fallback and the stub helper/field are gone. Act III is 2027Q1–2030Q4 (indices 40–55, labels from the scenario files, `market` itself stays 40 quarters, so an Act III read without a scenario throws). `act3-stub.json` and `docs/act3-content-stub/` removed; the save loader drops an old `act3Stub` key (no version bump). `toAct3(state, {scenario})` can force a scenario (test/tools only, grep-tested). After 2030Q4 `startNextQuarter` has an explicit act-3 branch: chapter phase plus `act3End` (scenario, name, trigger quarter, decoy, signal reads), built in `systems/act3End.ts`, the only file allowed to read the hidden view. Four goldens `act3-s0…s3-seed-1` replace the stub golden. Sim `--act3` (replaces `--act3stub`): 532 runs from 2027Q1 on their drawn scenario (s0 105, s1 211, s2 99, s3 117): 491 reached the chapter phase with the reveal, 41 ended in game over (known until M11.4, Act II systems are off so a bot can go broke), 0 crashed; the `--act2` table and all 1,302 CSVs are identical to the M11.2 baseline. No new STUB points; no reading score or UI yet. 798 tests.

**M11.4a done (Act III market-data layer; M11.4 = 4a data layer, 4b boundary D17, 4c gates):** `quarterInputs(quarter, scenario?)` (`content/index.ts`) returns `act2Quarter(q)` unchanged before Act III and, in Act III, the scenario's `market_sN.csv` row in Act II's shape (`CONTENT.act3Scenarios[id].inputs`); an Act III quarter without a scenario throws; no system reads it for Act III yet. DT 1 done: `mining_` and `ai_infra_ev_ebitda_mult` rescaled per scenario so 2027Q1 = Act II's 2026Q4 anchors (AI 15, mining 5), table in `docs/act3-content/README.md`, src copies byte-identical. Seam (2027Q1 vs 2026Q4, ±10%): all fields pass except two, listed and not fixed: `h200 hyperscaler rent` +18% to +26% and `hyperscaler capex $bn/q` +11% to +15% (all four scenarios; the test pins this list). All goldens (incl. act3-s*) and the `--act2` sim output identical. 806 tests.

## Milestones M8, M8.7, M8.8, M8.9 and M9 (finished; the step logs are in the archive)

M8 finished Act II (the report additions, the GPU failure wave, the know-how display, measurement decisions, the hosting head start,
the sell-as-mined bust). M8.7 did the follow-ups (EV/MW band $18–28M, the hosting bot's cost reserve, slot log lines, one report panel,
the bridge payment on the Plan and Capital screens). M8.8 audited what Act III could carry over (`docs/act3-carryover-audit.md`). M8.9
recorded the design thread's answers to that audit. **M9** (branch `m9`, in `main`): M9.0 the runway look-ahead (one figure on the
Dashboard, Plan and Capital screens; the rating rule unchanged; see `docs/act3-carryover-audit.md` and the archive for the sim numbers);
M9.1 the `inActII` / `isActIIQuarter` refactor (a pure refactor: the Act II sim's output was byte-identical before and after); M9.2 the
sim's great-path runway check now uses the same `runway()` function as the game, and the runway definition is in scope 0.2 §2.2 (both
copies). All design decisions from the M9.1 audit (7 questions) are accepted; see the archive for the full list.
