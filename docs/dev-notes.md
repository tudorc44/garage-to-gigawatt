# Dev notes: where the build stands

The running record of where the build stands, the rules in force, open questions and what's next. It exists so
any Claude account or machine can pick up the work with no chat history. **Read `CLAUDE.md` first, then this
file.** The full history (every finished step, balance review and milestone, with the decisions in detail) is in
`docs/dev-notes-archive.md`: read it only when a task needs the history.

Last updated: 28 Sep 2026, milestone M6 in progress on `act2` (M5 merged into `main`; the owner pushes).

## How the owner works

- The owner is a beginner programmer. Explain every change in plain language, say how to see or test it.
- Plans and design decisions come from a separate Claude chat (the "design thread", on the owner's personal
  Claude account, with the design docs as project files). The owner pastes tasks from there. When a task
  raises a design question, stop and give the owner a short report they can paste back into that thread.
- One small working step = one commit. **Never push:** `git push` is denied in `.claude/settings.json`; the owner
  pushes (Terminal panel: `git push origin act2`, and `main` after a merge).
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
  `npm run sim -- --act2` also plays the Act II bots to 2026Q4 and prints the scope 0.2 §5 checks (~2.5 min).
- `npm run content:market`: regenerate the market JSON files after editing a market CSV.
- Golden replays: accept intended changes with `npm test -- -u tests/golden-replay.test.ts`, and explain every one.

## Where the build stands

**Act I (Alpha 0.1): complete.** Every system in its scope is built and the balance pass is DONE (every scope §5
anchor passes in the sim). The Act I playtests are **postponed until after Act II** (owner). GitHub Pages
publishes `main` (https://tudorc44.github.io/garage-to-gigawatt/), which now includes Act II up to M5.

**Act II (Alpha 0.2, scope frozen v1.0): built on `act2`, milestones M2–M5 done** (details in the archive):
- **Step 1, the act boundary:** one 40-quarter timeline (Act I = quarters 0–22, Act II = 23–39); `act` field;
  save version 2 with step-by-step migrations; Merge → Act I chapter report → Act II intro → 2022Q4; Act I values
  held after 2022Q3 until Act II content replaces them; the "Start of Act II" save slot.
- **M2, market engine + MW by use:** Act II market data and multiples; MW by use per site (mining, hosting, AI
  shell, AI cloud, building, idle); the hosting unit; Act II dashboard, top bar and hosting dialog; `campus` theme.
- **M3, projects:** regions for Act I sites, the power reservation, winter hosting defaults, Act II ASIC prices and
  the S21; projects (AI shell, AI cloud, pilot) with Power / Tenant / Capital slots, the build, delays and the GPU
  queue, take-or-pay, the sum-of-the-parts valuation, selling a shell; the Projects page and the Deal builder.
- **M4, owner answers + capital:** GPU contracts, GPU resale, the pilot's 1-quarter wait, AI Heat at half, H200
  rent; project debt, GPU-backed DDTLs, the equipment loan on GPUs, the credit rating, equity / ATM, the JV
  partner, the big-tech backstop, foreclosure; the Capital screen and the Deal builder's capital stack.
- **M5, owner answers + entry and the world:** rating → equipment-loan terms, equity off the current valuation;
  Merge head starts, lifeline + bridge loan, standalone preset ("Start at Act II"); Act II scouting, regions and
  policies, grid upgrades / on-site gas; Act II hires and Bandwidth; the Act II event deck and interrupts.

**Numbers (M5.10):** 588 tests pass; lint and build pass. 11 golden replays (Act I only). Act II sims (50 seeds,
2026Q4 medians of alive runs): pilot 1.78× / 0.44× gap ✓; hosting ahead 11/40 ✓; good path (`sign-then-raise`)
$331M, all runs $187M, 13 busts ✗; great path (`asic-retirer`) 2025 peak $3.7B ✗; lifeline 57/117 ✗ (bot suspect);
preset ≈ $20M in every head start ✗.

**Not built yet in Act II** (scope 0.2 §6.4 order): rivals and the league, the Act II chapter report, the
foreclosure game over, onboarding tooltips, the GPU failure wave's interrupt form, GPU know-how display beyond the
Projects header, the Act II quarter report additions. M6 covers the first four.

## Rules and decisions in force

### Working rules
- **Branches:** Act II is built on `act2`; `main` is the stable, deployable version. The owner merges after
  reviewing a milestone (M5 was merged by fast-forward on 28 Sep 2026).
- **Batch mode** (CLAUDE.md): sub-steps `M<n>.<k>`, each lint + test + build → a short dev-notes update → one
  commit; small decisions labelled "(mine, reversible)"; blockers under "STOPPED"; change files only with the
  Edit / Write tools.
- **Content copies:** the game reads `src/content/`; the Act II files there are byte-for-byte copies of
  `docs/act2-content/` (a test checks it). Edit both, and note data changes in `docs/act2-content/README.md`.
  `regions.json`, `sites_act2.json` and `events_act2.json` are game copies (reshaped), edited in `src/content/` only.
- **Scope doc:** `docs/alpha-0.2-scope.md` and `docs/game-project-files/claude_20-alpha-0_2-scope.md` stay identical.
- **Saves:** `tests/fixtures/saves/v1-*.json` are real old saves: keep them forever, never reformat them
  (`tests/fixtures` and `.claude` are in `.prettierignore`). New state fields go in the save test's
  `ADDED_SINCE_V1` list with their new-game value.
- **Goldens** play Act I only (`playGame(seed, bot)` stops at the Act I chapter report); `{ through: 2 }` plays on.
- New Act II randomness uses its own `substream(seed, label)`, so Act I games never change.
- Every "(mine, reversible)" choice recorded in the archive stands until the owner says otherwise.

### Owner decisions: Act I (details: archive › "Decisions" and the balance reviews)
- Start: $10k, no rigs; machines earn from the quarter after purchase; 13-week quarters; the Merge in week 11 of 2022Q3.
- Prices exactly as in the market CSV; coins sold weekly; keep/sell % per coin; "Sell treasury coins" (1 BW).
- Power contracts, negotiation, Texas fixed / index and Winter Storm Uri (firm load) as specified by the design thread.
- Funding rounds (F&F, seed, Series A, IPO / SPAC) from `capital.json`; seed and Series A can be pitched.
- Hires, Read the market, Community Heat (50 rate hike / 70 moratorium / 90 shutdown), event cards, the failure
  wave, the Merge and chapter report, save / load, sound (`zzfx`), the left-nav screens and Settings.
- Balance pass: 2021 era multiples (Q1 35, Q2–Q3 22, Q4 20), IPO needs $3M quarterly EBITDA, the GPU cap on all
  GPU rigs (2020Q4–2022Q1, 250 kW a quarter), phased Texas (5 × 20 MW, 2-quarter phases, construction loans),
  the transformer upgrade ($150K).
- The real CoinMetrics data swap is **not** for Alpha 0.2 (answer 19): revisit at Alpha 0.3 (the 2009–2016 prologue).

### Owner decisions: Act II (details: archive › "Act II readiness", "Owner decisions on the M2 / M3 questions")
- Scope 0.2 v1.0 frozen; P1–P5 confirmed: take-or-pay 3% of the annual contract per late quarter and walk chance
  by tenant type; mining → hosting $0.1M/MW; pilot 0.5–2 MW; corporate ratings CCC− to BBB; delays 15% a quarter.
- Pilot: neocloud price × utilisation from 70% (+5 at know-how 2, +10 at 3), ~$31–33M/MW; spot only.
- Valuation counts projects under construction at capex spent; the top-bar backlog is unweighted.
- A1 hosting defaults in winter (15% in 2022Q4 / 2023Q1, else 5%), free re-letting. A2 power reservation: idle and
  building MW pay 25% of full-load power (not switched-off machines: tried in M4, reverted in M5).
- B3 regions: Texas → ERCOT; own site, small unit, warehouse → Georgia (+ small-load premium); garage none.
- B4 hosted machines add Heat. B5 2026 mining multiples 6, 6, 6, 5. B6 no multiple columns in the market file.
- B7 ASIC prices from the $/TH tiers (S9 old, S19 Pro new); the S21 (200 TH, 3,500 W) from 2024Q1.
- GPU contracts for clouds: neocloud, AI-lab and enterprise cards (overflow at know-how 3); price = H100 1-year
  contract × term factor (1 y 100%, 2 y 85%, 3 y 70%), H200 × 1.2; take-or-pay on every GPU; back to spot after.
- Pilot waits 1 quarter in the GPU queue. GPU resale: price × (1 − 15%/year), floor 35%; "Sell GPUs" (1 BW).
- Deal builder IRR for clouds and pilots: 5 years + the year-5 residual. Live AI MW count half of mining's Heat load.
- M4 answers: the equipment loan is the only corporate debt, priced on the rating (BBB SOFR + 2.5% / 60% LTV, BB
  + 4.0% / 50%, B + 6.0% / 40%, CCC + 9.0% / 25%, 8 quarters); equity priced off the valuation including this
  quarter's signed contracts; the M4 choices approved. All M5 "mine" choices confirmed (answers 12–15).

### Owner answers to the M5 questions (28 Sep 2026; the report is in the archive › "Milestone M5 report")
1. **Keep the targets; tune in order, sims after each step:** (a) valuation breakdown + EV/MW per category in the
   sim output, and the land price (16b); (b) backlog weights A/AA 25%, backstopped 20%, BBB 15%, AI lab 8%, spot
   0%, and contracted AI EBITDA with an A/AA or backstopped tenant and ≥ 5 years left at max(era AI multiple, 18×);
   (c) only if `sign-then-raise` < $700M at 2026Q4: project-debt LTC A/AA or backstopped 75%, BBB 65%, AI lab 50%
   (keep higher bands), capex credit cap $1.5M → $2.0M/MW. Tenant prices and targets fixed. **STOP rule:** still
   > 2× short after (c) → report the breakdown. Good path also needs ≤ 10% Act II busts. EV/MW bands must hold
   (pure mining $0.4–1.2M, announced AI $3–12M, stabilized IG $18–27M); if (b) pushes announced AI > $12M, A/AA → 20%.
2. **Head starts made distinct**, each with an intended-opening bot (check: ≥ 3 of 4 have a different best bot;
   the matching bots within ±30%): gpu_cloud + a guaranteed neocloud offer in 2023Q2 scouting, first pilot skips the
   allocation interrupt; hosting + a guaranteed A/AA hyperscaler shell-lease offer in 2023Q3; sell_gpus + a one-off
   distressed ASIC fleet in 2023Q1 (≤ 10 MW S19j Pro-class at 60% of the market price); hold_and_wait: GPUs parked
   (no power, no revenue, resale decays), sellable any Plan phase, +25% resale in 2023Q2–Q4, +1 BW in 2022Q4–2023Q1.
3. **Preset stays** the 40 MW mid-size miner, a good-path entry: its best bot should reach the good band; check it.
4. **Lifeline: under 20 MW AND under $5M cash.** Fix the lifeline bot; the ≥ 70% check counts once it survives ≥ half.
5. **Act II Bandwidth base 4**; an Act I Chief of Staff carries (+1); nothing else carries; max 8.
6. **Ratepayer Anger** = floor(energized MW in the region ÷ 10 × anger modifier) + bumps (PJM regions VA/OH +20
   from 2024Q4; +10 everywhere from 2026Q1), cap 100; adds floor(Anger ÷ 5) Heat at the region's sites; ec21 at
   ≥ 50; local Heat actions don't lower it; shown on the region panel.
7. Georgia cost shift 2026Q1: +$0.005/kWh. AEP Ohio 2026Q2: +$0.005/kWh, and Ohio projects started from 2026Q2 pay
   85% of normal power as the idle/building reservation. Arizona pause 2026Q2: +5% capex on projects started then on.
8. **Negotiation:** tenant limit over the card price hyperscaler +5%, neocloud +8%, AI lab +12%; lender limit card
   spread −75 bps, floor SOFR + 1.5%; opening = card terms; asking past the limit in round 3: 15% walk (offer gone
   this quarter).
9. **Air-permit lawsuit:** gas plant shut 2 quarters, project waits; if live, grid power at the regional price if it
   has a grid connection, else that capacity curtails; $1M legal cost once.
10. PJM shock card hits PJM regions only (Virginia, Ohio), not Georgia.
11. **Aggressive depreciation:** 10% audit chance each Q4 → restatement, −1 notch and equity −10% for 2 quarters;
    shown in its tooltip.
12–15. Confirmed; SB6 per site at 75 MW+ energized from 2026Q1; FTX −1 notch 2022Q4–2023Q1; SVB no new debt 2023Q2
    (existing facilities still draw); DeepSeek 2025Q1–Q2.
16. 70% of Act II offers flawed (30% clean); energized land $0.8M/MW 2023, $1.2M 2024, $1.6M 2025, $2.0M 2026,
    Virginia +25%, Nordics −25%, ±15%; voided zoning doubling confirmed.
17. Seed round needs "operated at least 1 quarter" (any site), not "still at the 100 kW site".
18. The six Act I readings confirmed as built (written out under M6.0m). 19. No data swap for Alpha 0.2.

## Open questions for the design thread

None open (all 19 answered 28 Sep 2026). New ones from M6 will go in the M6 report.

## STOPPED

- **Balance tuning (M6.0c, answer 1's stop rule):** after steps (a)–(c) the good path is ~5× short (`sign-then-raise`
  2026Q4 median $198M, 17/50 bust) and the great path ~3× short (`asic-retirer` 2025 peak $3.5B). Step (c) raised busts
  (more leverage, bigger builds). No further tuning until the design thread decides; the breakdown goes in the M6 report.

(M5's four STOPPED items were answered: 6, 7, 8, 9 above, built in M6.0.)

## Small follow-ups

- An ear test of the sounds; the 4 sample fallbacks if a synth sound is wrong.
- The main JS chunk is over Vite's 500 KB warning (card text): split it later.
- The ASIC $/TH tiers, SOFR and spread series are estimates (doc 18 §15): pull real data before final balance.
- Backlog idea (design thread): the pitch opening reacts to company performance (era EV/EBITDA × trailing EBITDA,
  clamped to ±30% of the `capital.json` terms).
- The Deal builder's projected return doesn't net out a JV partner's share yet.

## Milestone M6 (in progress): M5 answers, fix-all, rivals, chapter report, foreclosure, tooltips, bots

- **M6.0** the M5 answers: **a** records + scope edits, valuation breakdown / EV/MW in the sim, land price and 70%
  flaws, sims (tuning step 1); **b** backlog weights + 18× floor, sims; **c** LTC / capex credit (only if needed),
  sims; **d** lifeline AND + the lifeline and preset bots; **e** Bandwidth base 4; **f** head starts + their bots;
  **g** Ratepayer Anger; **h** GA / OH / AZ policies + the PJM card target; **i** tenant / lender negotiation;
  **j** air-permit lawsuit; **k** aggressive-depreciation audit + the confirmed dates; **l** seed-round condition
  (Act I goldens); **m** the Act I as-built readings (answer 18).
- **M6.1** "Fix all" on the Dashboard + `g2g.bandwidth(n?)`. **M6.2** rivals and the league (A2-08). **M6.3** the
  Act II chapter report (A2-09). **M6.4** the foreclosure game over (A2-10). **M6.5** onboarding tooltips. **M6.6** the
  Act II bots (scope §2.15's 7 + the head-start bots) and the §5 balance report. **M6.7** the milestone report.

### M6 progress
- M6.0a: land $/MW by year × region ±15%, 70% flawed offers; `tools/valuation-breakdown.ts` → `sim-output/act2-valuation.csv` +
  table. Sims ≈ M5 (bots buy no land): sign-then-raise $187M all runs, 13/50 bust, 15 AI MW; asic-retirer peak $3.7B. EV/MW
  2026Q4: announced AI $13M (above band already), stabilized IG $26M ✓ (2025 peak $50M: 2025 AI multiple); texas-capital mining $1.7–5.2M ✗.
- M6.0b: weights A/AA 25% → announced AI $14.8M/MW, so A/AA 20% (rule); BBB 15%, AI lab 8%, backstop 20%; 18× floor (`aiFloorEbitdaUsd`).
  Sims at 20%: sign-then-raise $358M all runs, 12/50 bust, 17.5 AI MW; asic-retirer peak $3.5B, end $2.6B; announced AI still $14M,
  stabilized IG $31M (> $27M: the floor) at 2026Q4. Capital screen's weight note now reads the weights.
- M6.0c: project-debt LTC A/AA-backstopped 75%, BBB 65% (AI lab 50% recorded; project debt still needs BBB+: open question); capex
  credit cap $2.0M/MW. Worse: sign-then-raise $198M all runs, 17/50 bust; asic-retirer peak $3.5B, 18/50 bust, 32/50 ≥ 4 q runway.
  **Still > 2× short → tuning STOPPED** (answer 1's rule); breakdown in the M6 report.
- M6.0d: lifeline floor = under 20 MW **and** under $5M. Bot bugs fixed (tools/bots.ts › aiProjects): the lifeline bot never paid its
  bridge bullet (now raises equity and repays it from the quarter before); the preset bot filled its free MW with S19s and never built
  (AI bots buy no machines in Act II); sizing reserves the equipment loan's payments too (the preset's shells were foreclosed).
- M6.0e: Act II Bandwidth base 4 (balance.ts › act2Bandwidth); the Chief of Staff already carried (staff persist), nothing else does.
- M6.0f: head starts (headStarts.ts; balance.ts › headStarts): guaranteed offers (mine: in the project's tenant offers, until signed),
  gpu_cloud's first pilot skips allocation, sell_gpus' 2023Q1 fleet (BUY_DISTRESSED_FLEET, Dashboard row), hold_and_wait +25% / +1 BW; all
  Act II GPU rigs resell on the 15%/yr curve (mine). Bots `open-*` (tools/bots.ts); AI bots mine only until their AI phase (M6.0d fix).
- M6.0g: Ratepayer Anger (`anger.ts`, balance.ts › act2Regions.anger): Heat + floor(Anger ÷ 5), region panel row; ec21 (bypass card from
  2026Q2, the angriest region ≥ 50): wait = 4-quarter regional moratorium on opening/starting projects, lobby = −2 BW next and 2 quarters (mine).
- M6.0h: regions.json effects: Georgia +$0.005 (2026Q1); Ohio +$0.005 and `project_reservation_share` 0.85 (building MW of projects started
  from 2026Q2; mine: not idle MW, not grid/gas-powered builds); Arizona `project_capex_mult` 1.05 (all of capex). ec10 hits Virginia + Ohio only.
- M6.0i: `dealNegotiation.ts` (DEAL_NEGOTIATE_START/COUNTER/ACCEPT/WALK; "Negotiate · 2 BW" on Deal-builder offers and debt rows + panel).
  Mine: fixed limits (no random draw); a GPU contract's $/GPU-hr × the won multiple; lender walk = that debt off this quarter.
