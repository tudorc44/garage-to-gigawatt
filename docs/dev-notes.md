# Dev notes: where the build stands

The running record of where the build stands, the rules in force, open questions and what's next. It exists so
any Claude account or machine can pick up the work with no chat history. **Read `CLAUDE.md` first, then this
file.** The full history (every finished step, balance review, milestone and report, with the decisions in detail)
is in `docs/dev-notes-archive.md`: read it only when a task needs it.

Last updated: 5 Oct 2026 (M26 merged at `209622e`; the Act IV run is stopped at step 0 on `m27`, doc 33 missing). The Prologue, Act I, Act II and
Act III are built and public on GitHub Pages; Act IV is not designed. See "Next", "Milestone M26" and "Milestone M18 close-out".

## How the owner works

- The owner is a beginner programmer. Explain every change in plain language, say how to see or test it.
- Plans and design decisions come from a separate Claude chat (the "design thread", on the owner's personal
  Claude account, with the design docs as project files). The owner pastes tasks from there. When a task
  raises a design question, stop and give the owner a short report they can paste back into that thread.
- One small working step = one commit. **Push only when the owner asks:** the `git push` deny rule was removed from
  `.claude/settings.json` (owner, 1 Oct 2026, to push from a remote session); the owner still decides every push and
  merges `main` (Terminal panel: `git push origin <branch>`, and `main` after a merge).
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
  Act III: `--act3` (the bots' Act III runs, ~55 min with `--act2`), `--act3-anchors` (~15 min), `--act3-presets`.
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
**Act III (doc 27 v1.2): built, balance pass closed** (M10–M18; D16 steps 1–7, scoring and the chapter report). The design record of
every change from the real sim is doc 27 §17 (`docs/game-project-files/claude_27-act-iii-design.md`).

**Numbers (end of M8.7):** 721 tests pass; lint and build pass; the 11 Act I goldens and both prologue goldens unchanged.
Act II §5 (50 seeds): 9 PASS, 3 accepted MISS (good path, lifeline, preset), 1 MISS (overleveraged, accepted as a known design risk).
Prologue §5 (last run in M8, no prologue bot or content changed since): all PASS (296/300 runs reach 2026Q4; the other 4 end in the
prologue). Tables: `npm run sim -- --act2` / `--prologue`. **End of M18:** 1,229 tests; Act I/II sim output byte-identical through M18.

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

### Closed decisions after M23 (design thread, 5 Oct 2026)
- **Act II project debt stays on the `lenders.json` rate path.** SOFR + HY + a premium is rejected: the implied premium (doc 18 §15, M23.2)
  isn't stable (−0.17 to +1.5 points).
- **S3's rate sensitivity is accepted** (0.96–1.04× across the M23.3 sweep, always ≥ 0.12 above S1); no watch item.

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

- **Doc 33 Q16 (M34.3, 9 Oct 2026):** "Jade Arc Constellation" has no name clash, but "Jade" codes the real-world bloc
  loudly. Kept for now; if the fictionalisation should hold, rename it Meridian Arc Constellation.
- **M34.3:** the sovereign tenant's new name is the build's own choice, Ironwall Sovereign Compute: both of the design
  thread's candidates clash (Rampart Technologies and Bulwark Dynamics are real defence companies). Confirm or replace.

The Act III balance pass is closed (design thread, 4 Oct 2026): no more mechanics rounds unless the owner asks.

None open from before: all five M11.4c questions below were answered by the design thread and built in M11.5a (1 scouting open, 2 ASIC prices from the scenario weekly files, 3 hashprice rebased, 4 hosting rate = region power price + Act II's margin, 5 accepted); kept here for the record:
1. **Scouting and site offers in Act III** (`scouting.ts`, `sites.ts`): Act II's site categories are dated windows; with scouting off a company can't buy new sites in 2027–2030 (the bots can't grow by sites). Open it, or does Act III use other content?
2. **ASIC purchase prices in Act III** (`market.ts` `act2Prices`): the scenario weekly files carry the $/TH tiers, but ASICs bought in Act III still price off Act I's 2022Q3 table (an S21, launched in 2024, has none). Read the scenario tiers?
3. **BTC hashprice seam:** the four scenarios open with hashprice $47.9–50.7/PH/day against Act II's last week at $43.7 (+10–16%), which lifts a pure miner's 2027Q1 valuation by 24–47% (48 of 49 texas-ipo runs). Same kind of data seam as the multiples' (rebased in M11.4a); other seam fields over 10%: H200 hyperscaler rent, hyperscaler capex.
4. **Hosting margin:** the hosting all-in rate stays at 2024's $0.060/kWh, so at the scenario's power prices a hosting-only company loses money (22 of 32 game overs).
5. Act III salaries hold at 2026Q4 (the file has no 2027+ series), and the small-shell cap rate moves with the scenario's hyperscale rate: both mine, reversible.
(The runway question was answered earlier: yes, look ahead, done in M9.0.)

## STOPPED

- ~~M13.2: the automated UI smoke test~~: unblocked in M15.2 (happy-dom and @testing-library/preact approved).
- Balance tuning stays stopped by the owner's A1 answer.
- ~~Act IV run stopped at step 0 (doc 33 not reachable)~~: resolved 5 Oct 2026, the owner put docs 31–34 and the cost model in the
  repo (M27.0); the run resumed at M27.1.

## Small follow-ups

- (Done, 6 Oct 2026) **Dialog hotfixes 1 and 2** (owner bug reports): on `hotfix-dialog` from `main` (`1ca4e6b`,
  `8c72e9a`), merged into `main` and pushed by the owner on 6 Oct 2026; cherry-picked onto `m32`. 1: `.dialog > *` keeps
  `flex-shrink: 0`, so a dialog taller than the window scrolls instead of squeezing its `.seg` switches to 0 px (they were
  3 px in a browser before, 39 px after). 2: `.deal-panel td.num-s` wraps, so the Deal builder fits its 760 px dialog (the
  longest notes measured 1,265 px before); the capex note joins its parts with " · ", the utilisation note ends with a full
  stop before the contract note, one year reads "1 yr" (`ui.deal.years_one`), a rating note reads "B+, rising". A sweep of
  every dialog this Act II save reaches (11) at 1024 and 1280 px also found the fleet dialog ("Your machines", 876 px):
  `.fleet-table` lets its batch name and working count wrap (mine, reversible). Tests: `tests/ui/dialogLayout.test.ts`
  (the CSS rules; happy-dom has no layout) and `tests/ui/dealBuilderText.test.tsx`. On `m32` an Act IV game's 12 dialogs
  (Read the market included) fit too. Not swept in a browser: the prologue's and Act I-only dialogs (coin sales, crypto
  loans, the auction, renewals) and Act IV's prospect report (four short columns).
- (Done, 6 Oct 2026) **New project dialog, shorter site list** (owner request): on `hotfix-dialog` (`c16f975`), cherry-picked
  onto `m32`. Sites sort by free power, largest first, and the dialog picks the first. Sites with less free power than the
  pilot's minimum size (`pilotSizes[0]`, the threshold: mine, reversible) fold under "Show N more sites" and can be shown
  or hidden again (hiding a picked small site moves the pick back to the largest). If no site reaches the threshold, every
  site shows and nothing folds (mine, reversible): the Act III presets are like that. UI only; test
  `tests/ui/openProjectSites.test.tsx`.
- An ear test of the sounds; the 4 sample fallbacks if a synth sound is wrong (owner task, DT C3 after M20).
- (Done, 29 Sep 2026) The big JS chunk is split: `vite.config.ts` puts the market data, card text, other content JSON and
  libraries in their own files, and the prologue screens load only when a prologue game starts (`LazyPrologue` in `app.tsx`).
  Every file is under 500 KB (main 444 KB) and the Vite warning is gone.
- The ASIC $/TH tiers, SOFR and spread series are estimates (doc 18 §15): pull real data before final balance.
- Backlog (deferred, DT C1 after M20): the pitch opening reacts to company performance (era EV/EBITDA × trailing EBITDA, ±30%).
- (Done, M8.7d and M21.3) Power and Capital slot log lines: in the report's milestones, nuclear included; card-bought rack pilots log both.

## Next

**Now: the owner playtests Act IV on `m32`** (staging built from `m32` on 6 Oct 2026). The Act IV run (M27–M32) is finished
(see "The Act IV run"): pushed on `m27`…`m32`, chained, none merged. After the playtest: a balance decision on the MISS
targets (B3 B4 B5 B6 B8 B9 B13, mainly orbital GPU clouds earning like ground ones), the owner's check of the fictional
names, then merging the chain into `main` (tag each `m<n>-done`, delete the branches).

**Act IV playtest findings** (fixed on `m32` unless marked open; the staging snapshot needs a rebuild to show a fix):
- (Fixed, 6 Oct 2026) Plan dashboard: a tall panel above it (Renewals due, also the wildcard and Act IV's alerts) squeezed
  Market / to-do / Signals into small scroll boxes. Now the columns keep 460 px (mine, reversible), the main area scrolls,
  and the news line with Start quarter stays pinned at its bottom; renewal cards are 640 px wide minimum, so the three
  choices sit on one row. Then a compact renewal card (`dcb5df1`): the details left, the choices right (about 165 px tall
  at 1440 px, was about 280), stacked as before on a narrow card; a negotiation spans the card. Both are on
  `hotfix-plan` from `main` (`8278b19`, `726c21b`, pushed) for the owner to merge, as Act III is public.
- (Done, 6 Oct 2026, owner request) `npm run staging` serves on the local network too (`--host`): open the printed Network
  URL on another device. Saves stay per browser (and per address); restart the server to pick it up.
- (Fixed, 6 Oct 2026) Orbit board and Moon page, window 1280 px and up: panels drawn over each other ("Launch manifest" and
  "Licences and registry" cut to their titles, "Links to the ground" over them; "Polar sites" on the Moon). A section is a
  grid with auto rows; a panel that scrolls sideways (`.panel:has(> table)`, M21.1) may shrink to 0 there, so in a page
  taller than the window its row fell to 24 px. Fix: `.section { grid-auto-rows: min-content; }`, as `.capital2` already
  has. `main` isn't affected (its table panels sit inside wrapper columns; checked in a browser, no overlap); a browser
  sweep of every Act IV page at 1440×800 shows no overlap now. Test: `tests/ui/dialogLayout.test.ts`.

**`main` = `726c21b`** (pushed 6 Oct 2026): M26, the dialog hotfixes 1 and 2 and the shorter site list (`hotfix-dialog`),
then the Plan dashboard fix and the compact renewal card (`hotfix-plan`); both hotfix branches are merged and deleted, and
the same commits are cherry-picked on `m32`. Earlier: M26 at
`209622e`, M25 at `f8cf61f`, M24 at `ebcda47`, M23 at `37a3535`, M22 at `6c623d3`, M21 / M21.6 at `48d16b4`, M19–M20 at
`7804dd0`, M16–M18 at `e0846d3`. Every finished milestone branch is tagged `m<n>-done` (m9 … m26, m21.6, prologue-done)
and deleted; the remote holds `main` and `m27`…`m32`. Still open: the owner's tasks (the Act III playtest, the Act I
playtests, the ear test of the sounds). (D15 resolved by the owner in M20.1.)

## Milestones M35-M36 (branch `m35`, from `m34` at `b194400`; energy options and ventures, doc 38 of 9 Oct 2026)

The design thread's handover of 9 Oct 2026: build doc 38 (`docs/game-project-files/claude_38-energy-ventures-design.md`;
evidence docs 36, 37 and `docs/act5-research/cost_curves.csv`); E-D1…E-D15 approved; Act V is not in scope. Act I-III
goldens and the `--act2 --act3` CSVs stay byte-identical (every feature is opt-in, with its own substreams; bots don't use
the early-era options). Data and every designed value: `docs/energy-content/README.md`. Split (mine, reversible):
- **M35.1 Data:** `market_energy.csv` (prices by year 2009-2040, one file for every act, not columns in each act's market
  files: the series are by year and the same in every scenario; mine) and `energy.json`, `energyContent.ts`.
- **M35.2 Early-era options:** rooftop solar, small wind, home battery (Prologue and Act I); special sites (hydro PUD,
  muni, Québec, Iceland, flare pads); on-site solar and wind, firmness with storage.
- **M35.3 Texas flexibility and batteries:** demand response, 4CP, the AI exclusion and the battery exit; utility battery
  (BESS) and iron-air; the Power options dialog, the Plan's special-site rows, the report's energy line.
- **M36.1 The venture mechanic** (Site, Offtake, Capital; diligence; overruns; three cash calls; slips; debt rules).
- **M36.2 The venture set** (EGS, LWR SMR, advanced fission, fusion, pumped storage, iron-air, the solar+BESS control,
  on-site gas's overrun and turbine slip in Act IV).
- **M36.3 Bots and the E-B1…E-B5 checks, new Act IV goldens, the end checks and the report.**

- M34.4 (closed here): the `--act2 --act3` CSVs are byte-identical to M33 (1,302 files, `bi-m34`), so M34 added no Act II/III
  rule beyond `acquiredQuarter`. The owner's 1b decision (fix the Ground Holder bot or relax B3/B5) is still open.
- M35.1-M35.3 built in one chunk (they share `energy.ts`, `en.json` and the site card). Every golden unchanged (91 checks).
  New: `systems/energy.ts`, `energyAssets.ts`, `texasPower.ts`, `specialSites.ts`, `overrun.ts`, `sim/energyViews.ts`,
  `ui/components/energyDialog.tsx`; tests `energy`, `texasPower`, `ui/energyDialog`. Vite splits `sim-energy`, `sim-space`.
- Decisions (mine, reversible): Texas requires any fixed contract (the game has no 8-year PPA); refusing a grid call while
  enrolled forfeits the year; 4CP at a site with AI halls needs a battery covering them; special sites lease like a
  warehouse (1 Bandwidth) from a warehouse up, and show in the Plan's to-do; a home battery covers its machines' outages
  fully; a battery fire costs 10% of capex (no offline week). The rest: `docs/energy-content/README.md`.
- **For the design thread:** doc 38 §5.1's lognormal parameters don't give its stated tail shares (nuclear σ 0.70 → ~25%
  at or under budget, not ~3%); built as written, E-B3 will report it.
- M36.1-M36.2 built (one chunk): `ventures.json`, `systems/ventures.ts`, `sim/ventureViews.ts`, `ui/screens/Ventures.tsx` (a
  Ventures page in Acts III-IV, lazy with the Act III panels); Act IV gas overrun and turbine slip (`power.ts`); tests
  `ventures` (E-B3, E-B4). Goldens unchanged. Mine: see the venture rows in `docs/energy-content/README.md`.
- M36.3: `npm run sim -- --energy` (tools/act4/energyRunner.ts), new goldens act4-energy-f2/f4, one venture per type. Run
  `energy-m36` (10 seeds, 960 runs): E-B1 MISS (only on busts: venture-free 5 of 120 vs fusion's 2; within 15% of best in
  all four futures), E-B2 PASS, E-B3 PASS on P(m>1.5) and the mean, P(m≤1) 25% not 3%, E-B4 PASS, E-B5 MISS (16-75 q).
- End checks: `--act2 --act3` byte-identical to M34 (1,302 files, `bi-m35`); lint, 1,559 tests, build pass.
- **M34.4 (design thread's answers of 9 Oct 2026, done on `m35`: no bot uses energy, ventures or gas, and every Act IV
  golden is unchanged, so `m35`'s Act IV balance equals `m34`'s):** the Ground Holder borrows first (debt ≤ 4× trailing
  EBITDA, inside the covenant), then raises (founder ≥ 50%), else skips; a company with no free MW buys one site ≤ 50% of
  its energized MW. Run `act4-m344`: **table identical to M34**; Fortress skipped 800 offers (founder already 49% at
  entry, so no equity; $17M EBITDA caps debt near $68M); Neocloud bought its site in all 40 runs but it never powered in
  time; Ridge ($14M cash, no EBITDA) did nothing. B3 MISS 1.08× vs 1.21×; B5 MISS as written (ground 1.03× vs 1.07×).
  The space-multiple knob is **not run**: the fix had no effect, so the owner decides first (report questions).
- **Design thread answers after M34.4 + doc 38 (9 Oct 2026; owner: 11a).** Split (mine, reversible): **M36.4** (9) Act IV's
  Power slot reads doc 33's waits; **M36.5** (1-3) Ground Holder: 15-point dilution budget, pro-forma leverage, powered
  sites only if offered; **M36.6** (4) the F2 space-multiple knob; **M36.7** (6, 7, 8, 10) overrun refit, E-B5 and E-B1
  redefined, Meridian Arc; **M36.8** (11a) ventures marked to milestones; **M36.9** runs and the report.
- M36.4: Act IV grid upgrades wait grid_wait_q × 0.8-1.2 (16-24; F4 8-12 at 10; spread mine), shifted by policies and
  hires as before; Act IV gas 6-10 q (replaces M36's 2-4 q slip; overrun kept). No golden changed (no golden script
  builds Act IV ground power). Test `act4PowerWaits`.
- M36.5 (tools only): Ground Holder dilution budget 15 points from the entry stake; pro-forma leverage on the project's
  own EBITDA ((debt + loan) ÷ (trailing EBITDA + project EBITDA) ≤ 4×, DSCR sizing, covenant); powered sites only.
  One seed: Fortress now builds 2 clouds (stake 49% → 35%); Act IV scouting offers no powered site, so Neocloud and Ridge renew only.
- M36.7: overruns refitted (nuclear 3% uniform 0.85-1.00 else 1 + X, X median 0.6 σ 1.0; pumped hydro 10%, X median 0.58
  σ 1.02, fitted by me): realised nuclear 2.4% / 57.2% / mean 1.93, pumped 10.4% / 48.8% / 9.7% at ≥ 3×. E-B1 (Fisher) and
  E-B5 (≤ 60 q from 2028, falling) redefined; Meridian Arc. act4-energy-f2/f4 goldens changed (the SMR's draws: licensed a quarter earlier, an $80M call in 2035).
- M36.8 (11a): ventures marked to milestones in the valuation (buy-in × 1.5 per milestone × 0.8 per slip, calls at par,
  offtake savings to the act's end at first power), shown as "Ventures (marked to milestones)" on Capital and both chapter
  reports. act4-energy goldens: ventures $512M → $934M, growth 0.90× → 1.32× (an operating EGS at ~4× its buy-in).
- M36.6 (4): knob search (F2 only, Ground and Sprinter, 10 seeds; Ground 1.030×): Sprinter 1.13 / 1.06 / 1.02 / 0.98 /
  0.95 / 0.91 / 0.88 / 0.85× at 0.95 … 0.60. B3 passes only at the floor, **× 0.60** (0.852 ≤ 0.858), written into
  `tools/act4/market.ts` (F2 only, from its 2033Q1 trigger). act4-f2 golden: the busy orbit script now goes bust in 2033Q1, as F3's does.

## Milestone M34 (branch `m34`, from `m33` at `1864da9`; the owner's answers after M33, 9 Oct 2026)

The owner's answers to the three open questions after M33 (Act IV balance, orbit rule gaps, site-name follow-ups) and
the names check. Chunks (CLAUDE.md: check once per chunk):
- **M34.1 Rules and bots** (one chunk, one Act IV run): 1a orbital cloud returns carry the cost premium (rent premium
  capped, orbital-only opex, true failure rate and useful life with zero residual, space multiple to ~6× F2 / ~8× F4 by
  2034; a payback test); 1b the Ground Holder bot builds ground clouds and renews; 1c F3's cascade 40–60% destroyed,
  shell shut 8 quarters, hard market on the rebuild; 1d the Lunar Bettor skips a pilot below breakeven; 1e B8/B9 reworded;
  1f B13 accepted; 2b a block's sale price on its run-rate until a quarter is booked; 2c licence halving floored at MW in
  use. Then `--act4 --seeds 10`, the 7×4 table and verdicts (relax B3/B5 as given if they still miss), new act4 goldens.
- **M34.2 Presentation:** 2a the exposure line includes take-or-pay penalties through a rebuild; 3b `site.acquiredQuarter`;
  3c project names "Own site 3 · AI 1"; 3d the dashboard's Fleet & sites panel capped from 6 sites; 3e site names linked
  in alerts, the log and to-do rows; 3f one eligible site opens the confirm; 3g "the" dropped before site names.
- **M34.3 Names:** Pallas → Dorado/Carrack (clash check), Aegis → Rampart/Bulwark; hire names checked against real
  people; Jade Arc kept, flagged as doc 33 Q16.
- **M34.4** End checks and the report.

- M34.1–M34.3 built, in one commit (the chunks share `en.json`, `orbitViews.ts`, `Act4Panels.tsx` and the goldens). Payback
  test: orbit 3.59 y vs ground 2.42 y × 1.58 (ratio 0.94). Act IV run, 10 seeds (`act4-m34`): ground 1.18/1.08/1.20/1.03,
  sprinter 2.27/1.21/1.51/0.80, diversified 1.67/1.23/1.53/1.03, lunar 1.23/1.32/1.42/1.07 (28% GO), balanced
  1.34/1.22/1.47/1.07, passive 1.09/1.01/1.11/0.98, perfect 1.54/1.01/1.10/0.98. PASS B1 B2 B7 B9–B12 B14; MISS B3 B4 B5
  B6 B8 B13 (accepted). **1b had no effect** (Ground row unchanged): the Fortress has 71 MW free and GPU offers but $14M
  cash (a 1 MW cloud needs ~$24M own); Neocloud and Ridge have no free MW. Owner's call before relaxing B3/B5 (report).
  Goldens: Act I–III ×17 identical apart from `acquiredQuarter`; act4-f1…f4 changed (rules, rename). Names: Carrack,
  Ironwall (mine); hires pass.

## Milestone M33 (branch `m33`, from `m32` at `bd22812`; telling sites apart, design thread's doc 35 of 9 Oct 2026)

The design thread's prompt calls it "M22"; that number is taken (`m22-done`), so it runs as **M33** on `m33`, from `m32`
since `m32` isn't merged (mine, reversible). Presentation only: no rule changes. Invariants: goldens and `npm run sim`
outputs byte-identical except the new stored serial (the goldens serialise state: their diff must be serial fields only,
plus the serial added to site log entries so logs can name a site); tests green; main bundle under 500 KB.
Sub-steps:
- **M33.1 Naming:** a stored `site.serial` and `state.siteSerials` counter, set when a site is acquired (never reused);
  a load-time migration; short names ("Own site 3", "Powered shell 2", "Garage") and long names ("Own site 3 · Georgia ·
  20 MW") everywhere a site is named, logs included; pickers and lists show free MW, a Heat chip, flag icons.
- **M33.2 SitePicker and grouped to-do rows:** one dialog component for one-action-many-sites (ground station, leave,
  buy machines, hosting, power renewal); Plan to-do rows grouped per action kind.
- **M33.3 Site card:** a drawer (≥ 1280 px) or dialog with a site's power, uses, money, Heat and actions.
- **M33.4 Long lists:** Fleet & Sites and New project grouped by type, with sorts and filter chips.
- **M33.5** End checks (byte-identity sim, browser check at 1024 and 1440 px with a 20-site save) and the report.

- M33.1 done: `systems/siteSerials.ts` (`addSite` at every acquisition, `numberUnnumbered` on load, `siteParams` on ~50 log
  lines and messages; `i18n/t.ts` renders `{tier}` with a number as the short name). Goldens: 21 changed, identical with the
  serial fields stripped. Sentences name a site in plain text; table cells and lists use `<SiteName>` (tooltip = long name)
  (mine, reversible). Prologue screens and the report's "Heat · site type" tile keep the type (reports store no site).
- M33.2 done: `components/sitePicker.tsx`, `screens/planPickers.tsx`. Pickers: ground station (Orbit), leave, renewal,
  transformer, talk, mitigation, hosting (a site with a contract stays pickable), Buy machines' site (fact: power price).
  One eligible site is named inline and acts at once (talk, mitigation) (mine, reversible); facts and labels mine.
- M33.3 done: `components/siteCard.tsx` (host mounted in `app.tsx`; `<SiteName>` is a link to it), `siteCardView`. No
  acquired quarter is stored, so the header says "powered since/from" (mine, reversible). Drawer 460 px from 1280 px.
- M33.4 done: `components/siteGroups.tsx`. Fleet & Sites shows the grouped list instead of the per-site cards with their
  Heat breakdown (now in the site card) (mine, reversible); New project groups in its free-power order, the picked
  site's group open whatever its size (mine, reversible). Folds: a module-level map, so "the session" = until reload.
- M33.5 done (9 Oct 2026): `npm run sim -- --act2 --act3` on `m32` (`bd22812`) and `m33`: all 1,302 CSVs byte-identical.
  Browser, a 20-site Act IV save at 1024 and 1440 px: Plan to-do (4 grouped rows), Orbit links (3 buttons, picker of 20),
  Fleet & Sites (7 groups), the card (drawer at 1440, dialog at 1024), New project: no sideways scroll anywhere. Tests 1,502.
- (Done, 9 Oct 2026) The design thread's Orbit launch-slot clarity fix, on `m33` after M33: `launchFit` in `orbitViews.ts`;
  the launch slot explains "nothing fits" (mass vs the most free, the largest size that fits and from when), counts the
  quarters left out for slots, and Open a block shows the mass and warns when too heavy. Test `tests/ui/launchFit.test.tsx`.
- **Next:** the owner's review of M33 and its questions (the M33 report), then the Act IV playtest goes on.

## Milestone M19 (branch `m19`, from `main` at `f2e2e24`; Heat relief: the Community Relations Manager and the yearly Community Deal)

Owner request via the design thread (4 Oct 2026), run in one go: M19.1 the hire (hires.json; −5 Heat at every site, outreach 0 BW, needs a
site beyond the garage); M19.2 the yearly Community Deal (Plan-phase offer every 4 quarters on the hottest site ≥ 30, Heat to 12, fades 5 a
quarter); M19.3 screens (Hires card, Heat breakdown lines, the Plan deal card), tests, the forced-hire run, a browser check. Invariants: no
bot hires her, so every golden and the `--act2 --act3` sim stay byte-identical.
**M19.1 done:** hires.json `community_relations` (effects heat_base −5, outreach_bw 0, community_deal, needs_site_beyond_garage); heat.json `community_deal`
block (schema); her −5 in base Heat, recalculated on hiring/firing her only; Acts II–III salary = 2021 × 1.08 (hires_act2.json is a frozen copy:
`BALANCE.act2Hires.act1FormulaOnly`, mine). Goldens unchanged. 1229 → 1234 tests.
**M19.2 done:** `systems/communityDeal.ts` (offer at the new quarter's start, END_PLAN lapses it; COMMUNITY_DEAL_SIGN / _DECLINE, unlogged moves);
`SiteHeat.dealOffset` added after the region scaling so Heat lands on 12 exactly, never raises Heat (mine); the fade in endQuarterHeat; two log
lines (the "faded" one is logged in the new quarter). Goldens unchanged. 1243 tests.
**M19.3 done:** People card (via hires.json + en.json); the Plan deal card (all acts, wildcard-card style, "Not this year" tagged Default); the game had no
Heat breakdown, so the Community dialog's site cell gains the two lines (mine). Forced-hire run (raise-climb × 10, from 2019Q1, every deal): Heat
2019 20→15, 2020 15→7.9, 2021 37.7→23.7, 2022 30→19.8; complaints/quarter 0.130→0.090; 19 deals; but 2 of 10 seeds go bust (salary + deals). 1244 tests.

## The Act IV run (M27–M32, the owner's unattended-run prompt of 5 Oct 2026: `docs/game-project-files/claude_34-act-iv-build-prompt.md`)

Scope and rules: `docs/act4-scope.md` (doc 33 approved with the owner's 16 defaults; milestone plan; B1–B14; cut order;
"Changes from doc 33"). Branches chain: `m27` from main, `m28` from `m27`, … (no merges during the run). Push after every
sub-step commit.

### Milestone M27 (branch `m27`, from main at `209622e`; setup and the walking skeleton)

Split: M27.0 the design docs committed; M27.1 `docs/act4-scope.md` and the CLAUDE.md updates; M27.2 the act-aware refactor
(act 4, `inActIV`, gates, save version 5 and its migration, the timeline to 2035Q4, `act4Seed`, `act4Entry`); M27.3
`docs/act4-content/` (README, the four quarterly and four weekly market files, schemas, loader, copy test, B14 test);
M27.4 the Act III → IV boundary (carry-over and drop rules, the future draw, the seam glide); M27.5 20 playable quarters
with the ground systems and a stub chapter report; M27.6 the screens (the light `orbit` theme, "Continue to Act IV",
A4-01, the test-build quick starts and `?future=`); M27.7 the byte-identity check and the M27 report.
- **M27.0 done** (`f01f142`): docs 31–34 and the cost model committed as the owner placed them.
- **M27.1 done.** `docs/act4-scope.md` written; CLAUDE.md: status, Act IV summary, key docs, scope guard, "Act IV rules that must hold".
- **M27.2 done.** `act: 4`, `isActIV`/`inActIV`, new `inAct3Rules` (Act III or IV, for the Act III systems that run on), `inAct2Rules` and `covenantBreached` cover act 4; `FUTURE_IDS`/`MarketKey`; state fields `futureId`, `futureForced`, `act4QuickStart`, `act4Seed` (`act4SeedOf`), `act4Entry`; save version 5 (4 → 5 changes nothing; Act IV saves need the Act IV span). The Act III goldens are compared at their stored format 4, as Act I's are at 2 (no golden file changed).
- **M27.3 done.** `tools/act4/market.ts` (`npm run content:act4`) generates `market_iv_f1–f4` + weekly into `docs/act4-content/` and `src/content/` (README flags every column); the loader adds 2031Q1–2035Q4 (56–75) and 16 glided markets keyed "s2.f3" via `scenarioOf`; `quarterRow`/`act4Row`; market params typed `MarketKey`; `logQuarterLabel` keeps Act I–III log text unchanged; Vite gives each future its own chunk. Tests: B14, the glide, copies. act4-scope §6 items 6–9.
- **M27.4 done.** `systems/act4Entry.ts` (`buildAct4Entry`, `enterAct4`: doc 33 §3.1 carries, §3.2 open renewals resolve by default, blend offers lapse, Act III-only state drops) and `toAct4`/`drawFuture` in state.ts (future on substream `act4_future`, weights in `BALANCE.act4`); needs an Act III scenario (the seam reads it). Tests: `act4Entry.test.ts`, helpers `act4Helpers.ts`.
- **M27.5 done.** Act IV plays 2031Q1–2035Q4 to the chapter phase (`act4End` stub, `systems/act4End.ts`; replay `through: 4`). **Gate review** (doc 33 §3.1): run on in Act IV via `inAct3Rules` — renewals, reopeners, blend-and-extend, the calendar and renewal wall (now the current act's span), density and retrofits, nuclear PPAs, political capital and lobbying, Anger, Act III hires, the covenant, the standby facility, lender cures, card payouts, capacity charges, hosting repricing, lab distress, "no random cards", "no Read the market" (Signals instead); **stay Act III-only** (`inActIII`) — Act III's wildcards, Signals panel and reads, move log, `act3End`/reveal, `act3Finished`. Act III spans extended to Act IV with an Act IV key: capacity charge, hosting rate, SOFR/HY project-debt and DDTL rates, the facility label; GPU contract rate × Act III's end value in Act IV (mine, reversible). An Act IV quarter read without an Act IV key finds nothing (Act III's behaviour kept). Goldens unchanged.
- **M27.6 done** (`M27.6a` + this): Act III panels that run on show in Act IV; `screens/Act4Entry.tsx` (lazy: A4-01 intro, chapter stub); test-build quick starts `act4QuickStart.ts` + `Act4Preview.tsx` (designed recipes, mine, reversible: fortress texas-shell 3/s0, neocloud sign-then-raise 1/s3, ridge lifeline-shell 19/s0; all survive Act III) and `?future=` with its tag and save guard; "Continue to Act IV" on the Act III chapter report; the light `orbit` theme; `averagePrice` reads the market key (an Act IV report crashed without it); intro boxes no longer squeeze (`flex: none`). Tests: gate, grep (`toAct4`, `futureId`), screens; layout notes in `docs/wireframes/act4/README.md`. Browser-checked at 1024 px: quick start → intro → 2031Q1 Plan → report, no sideways scroll.

### Milestone M32 (branch `m32`, from `m31`; scoring, finale, presets, bots, balance)

Split: M32.0 branch and split; M32.1 the Act IV move log (doc 33 §6.7's orbital-exposure signs), the reading score
(`readingScoreIv.ts`, the only reader of `reading_score_iv.json`) and `act4End`'s reveal (the future, the lunar grade and
what the prospects said, the reading score and title, the career and frontier titles, the rivals' fates); M32.2 the
chapter report A4-11 and its leak guards; M32.3 the campaign finale A4-12 (career ledger, multiple, megawatt line,
epilogue pools); M32.4 the three presets (generated by the sim), A4-13 "Start at Act IV" and Scenario Mode for Act IV;
M32.5 the seven bot archetypes, `npm run sim -- --act4` and the B1–B14 table; M32.6 the goldens `act4-f1..f4`; M32.7
the balance pass (at most 3 rounds, each recorded); M32.8 the byte-identity check and the run's final report.
- **M32.1 done.** `systems/act4Moves.ts` (the move log in `applyAction`: +1 capital committed / orbital debt / a launch booking / Orrery's blocks; −1 insurance, a block sold, a take-or-pay presale, a cancelled booking or block, an equity raise; 0 ground and lunar moves); `systems/readingScoreIv.ts` (Act III's rules on `reading_score_iv.json`, oracles; read only by `act4End`); `buildAct4End`'s reveal (future name, trigger, decoy, reads; lunar grade, each site's estimate beside its truth; the fleet's true failure rate and life beside your telemetry; reading score, marked moves, career, reading and frontier titles; rivals' fates) and `act4Outcome`. Tests `act4End.test.ts`; the hidden guard checks the reading score's importer.
- **M32.2 done.** `screens/Act4Reveal.tsx` (A4-11, in the Act4Entry chunk): the future (name, lead, trigger, decoy), the reading score and title with a 20-quarter timeline (ideal vs you), the ice and each site's estimate beside the truth, the fleet's true reliability beside your telemetry, net worth, growth, career and frontier titles, the rivals' fates, and "The finale →" (a stub until M32.3). The leak guards exempt `Act4Reveal.tsx` exactly as `Act3Reveal.tsx`. Render-tested (`act4Screens`); the browser check waits for a faster way to 2035Q4 (M32.4's presets).
- **M32.3 done.** `src/sim/finaleViews.ts` and `screens/Act4Finale.tsx` (A4-12, opened from the chapter report): the career ledger from stored records only (Act I: its 2022Q3 report when kept; Act II: `act3Entry`; Act III: `act4Entry` and `act3End`'s title; Act IV: the end), the start (bedroom $2,000 / 0.15 kW, garage $10,000 / 5 kW, or a preset), the career multiple, the megawatt line, the frontier title and a 2–5 line epilogue from authored pools (end state, the future, the ice, what comes after 2035; "scenario known" when the future or scenario was chosen). Test `tests/ui/act4Finale.test.tsx`.
- **M32.4 done.** `tools/act4/presets.ts` (`npm run content:act4-presets`, 189 runs, 3 min) picked the first fits in sim-runner's bot order × seeds 1–20 × scenarios: **Ground Fortress** texas-shell 1/s0 ($602.8M, 118 MW, no debt, BBB), **Orbit-Ready Neocloud** overleveraged 1/s0 ($19.8B, 121 MW of clouds, $462.9M debt, BB), **Last Ridge** asic-retirer 10/s0 ($14.0M, 0.1 MW, one site, no debt); `presets_act4.json` (both copies; `PRESETS_IV`); A4-13 "Start at Act IV (2031)" in every build (as Act III's), Act IV Scenario Mode unlocked by an Act IV finish (`act4Finished` setting; `act4ScenarioMode`, "scenario known" in the finale), `act4Preset` on the state. Browser-checked: Start at Act IV → Last Ridge → 20 quarters → A4-11 → A4-12 at 1024 px (fixed: the reveal's sections squeezed; the intro's "arrives in a later build" lines). Test `tests/ui/act4Start.test.tsx`.
- **M32.5 done.** `tools/act4/bots.ts` (Ground Holder, Orbit Sprinter, Orbit Diversified, Lunar Bettor, Balanced, Over-reactor, Passive, and the perfect reader for B8/B9; each tries its actions in order and keeps what succeeds; the ground side is the preset's own bot; a player's discipline: licence first, open only with licence room, fill slots only once the build is funded, raising equity in the space-equity window when short) and `tools/act4/runner.ts` (`npm run sim -- --act4 [--seeds N]`: 3 presets × 4 futures × 3 grades × 8 bots; bots that never touch the Moon are played once per future; `act4-runs.csv`, the B1–B14 table). **Baseline (1 seed):** the Sprinter is best in all 12 cells (F1 5.6×, F2 3.2×, F3 3.3×, F4 2.5× vs Ground 1.0–1.2×); PASS B2 B7 B9 (+ B10 B11 B12 B14 by tests); MISS B1 B3 B4 B5 B6 B8 B13. Diagnosis: orbital EBITDA on a 5-year asset valued at a 12–30× story multiple makes any block worth ~4–7× its capex in every future.
- **M32.6 done (3 rounds; values in the act4-content README).** R1: orbital rent $8.5M → $6.0M/MW-yr, GPU-hour $4.2 → $3.6, space multiple 22× → 14× with harsher F2/F4 paths; R2: F2 lower still, lunar $/t 2,000 → 3,000 (per future), cascade loss 40% → 70%; R3: F2/F4 GPU-hours fall from their triggers, F3 shell closed 8 q. 1-seed after R2: PASS B1 B2 B7 B9 (+ B10 B11 B12 B14 by tests); MISS B3 B4 B5 B6 B8 B13, chiefly because orbital clouds earn like the game's ground GPU clouds (payback ~2 years) while the Ground Holder builds none. **10 seeds after R3 (2,880 runs, 28 min):** medians F1/F2/F3/F4 — Ground 1.18/1.08/1.20/1.03×, Sprinter 2.51/1.15/1.66/0.80×, Diversified 1.67/1.23/1.66/1.03×, Lunar 1.21/1.27/1.40/1.02× (28% game overs), Balanced 1.34/1.22/1.47/1.07×, Passive 1.09/1.01/1.11/0.98×, Perfect 1.55/1.01/1.10/0.98×. PASS B1 B2 B7 (+ B10 B11 B12 B14 by tests); MISS B3 (1.08 vs 1.15), B4 (Div = Sprinter 1.66), B5 (Balanced 1.07 > Ground 1.03), B6 (rich 1.20 vs 1.23; dry go 28%), B8 (perfect ≥1.15× in 1/4), B9 (F3 perfect 1.10 < passive 1.11), B13 (bots 2.3 decisions/q). No rounds left: reported as MISS.
- **M32.7 done.** Goldens `act4-f1…f4` (a busy orbit + Moon strategy in high LEO; F3 ends in a game over after the cascade, by design of the strategy); Act I–III goldens unchanged.
- **M32.8 byte-identity: passed.** `npm run sim -- --act2 --act3` on `m32` vs `main` (`209622e`): all 1302 CSVs identical (`cmp`); the summary log differs only by 40 added rows listing Act IV's cards at 0% in the card-frequency table (they can't occur before 2031).
- **Run report (M27–M32)** is in the chat of 6 Oct 2026; the owner's playtest of `m32` via staging is next.
- (mine, reversible) M32's order: the balance pass (M32.6) before the goldens (M32.7), so the goldens capture the balanced game.
- (mine, reversible) The presets' descriptions as tests: Fortress no clouds, ≥ 40 MW, debt ≤ 25% of value, investment grade; Neocloud ≥ 5 MW of clouds, some debt, cash; Ridge one site, < $300M, debt ≤ 20%.
- (mine, reversible) Act I's row shows no MW or title (not stored; doc 33 §15.2 allows it); a preset start's ledger begins at the preset.
- (mine, reversible) Frontier titles: Selenian (a pilot processed water), Cislunar (a held lunar site and orbital MW), Orbital (≥ 10% of MW in orbit), else Earthbound; spot isn't a presale; arranging capital counts as committing the block.

### Milestone M31 (branch `m31`, from `m30`; money and rivals)

Split: M31.0 branch and split; M31.1 the content (`capital_iv.json`: export credit, orbital project debt and its
insurance covenant, sovereign co-funding, the space-equity window, lunar task orders, fire-sale haircuts;
`hires_iv.json`: the four hires; `rivals_iv.json`: the five fictional rivals per future, Orrery's failure and auction;
schemas, loader, README); M31.2 the orbital Capital slot (export credit, project debt with the insurance covenant and
its cure, co-funding; debt service at quarter end); M31.3 the space-equity window, lunar funding (task orders; no lunar
debt), fire-sale haircuts in the rescue; M31.4 the four hires and Bandwidth; M31.5 the rivals and the league (Act III's
retire; Orrery's auction); M31.6 the screens A4-09 (Capital) and A4-10 (quarter report additions); M31.7 tests and the
M31 report.
- **M31.1 done.** `tools/act4/money.ts` (`npm run content:act4-money`) writes `capital_iv.json`, `hires_iv.json`, `rivals_iv.json` (both copies; README section); zod and the rivals' per-quarter paths in `src/content/moneyContent.ts` (`MONEY`). Test `act4MoneyContent.test.ts` (rivals identical through 2032Q2; Orrery's failures).
- **M31.2 done.** `systems/orbitCapital.ts`: `ARRANGE_ORBITAL_CAPITAL` takes `capital` (cash default, export credit, project debt, co-funding); loans drawn as capex is paid (`payCapex`, `ownShare`), interest added during the build, equal principal once live (or after a loss), the insurance covenant (cure 2 q, then called); co-funding's revenue share and bloc strings; lender paid first from insurance and sales; orbital debt in `debtUsd`; a rebuild borrows afresh. Tests `act4OrbitCapital.test.ts`.
- **M31.3 done.** The space-equity window (`equity.ts`, Act IV only: `RAISE_EQUITY` shut below a 12× space multiple; blocks under way priced at capex × multiple ÷ 20); agency task orders (`ACCEPT_TASK_ORDER`, 0 BW: part-funds the next mission, Accords strings; never offered to a Station-aligned company; no lunar debt exists); `systems/fireSale.ts` in the rescue before the emergency raise (a live block × 0.4 on the space multiple, a lunar site × 0.2 or × 0.5 to a bloc that wants it; a `sold` claim status). Tests `act4Money.test.ts`.
- **M31.4 done.** The four hires in `allHires()` (Act IV only; `staffEffect`/`staffNumber`): Launch Procurement Lead (−10% launch $/kg, no bumps), Space Operations Chief (GPU failures × 0.75, telemetry noise × the hidden file's 0.5), Lunar Programme Director (+10 landing points, pilot −1 q, +1 BW), Chief Risk Officer (premiums × 0.8, capacity × 1.25); fictional names and bios in en.json. Tests `act4Hires.test.ts`.
- **M31.5 done.** `systems/rivalsIv.ts`: the league in Act IV is the five fictional rivals on the game's future (value, orbital MW, lunar sites landed; Orrery leaves after failing); the League's scale column shows ground / orbit / lunar sites; Orrery's failure news and its auction (`BUY_ORRERY_BLOCKS`, 1 BW, 50 MW live on spot with 12 quarters left, $6M/MW, two quarters), a panel on the Orbit board. Tests `act4Rivals.test.ts` (incl. B14 for the league).
- **M31.6 done.** `src/sim/act4MoneyViews.ts` and `screens/Act4Money.tsx` (lazy chunk, now 27 KB): the Capital screen's Act IV block (A4-09), the report's orbit and Moon panel (A4-10), the deal card's four ways to pay, the Valuation panel's orbital and lunar rows; layout in `docs/wireframes/act4/README.md`. Browser-checked at 1024 px. Test `tests/ui/act4Money.test.tsx`.
- **M31.7 done.** `act4Played.test.ts`: in every future a busy strategy (orbit on project debt or cash, insured, licences, launches; a lunar claim, missions, power, pilot, offtake) plays all 20 quarters to the chapter; every report's valuation equals the sum of its parts.
- **M31 report.** Commits `8dfc4ec` M31.0, `e194b85` M31.1, `14dfbde` M31.2, `a4947ed` M31.3, `711d6d2` M31.4, `1485425` M31.5, `3ac0ebc` M31.6, M31.7 (this commit). Act I–III goldens unchanged; 1451 tests; main bundle 214.2 KB, Act4Panels 27.5 KB. See it: `npm run dev`, an Act IV game → Capital (space and lunar capital), the Orbit board's Capital slot, People (four new hires), the report's League and "Orbit and Moon this quarter".
- (mine, reversible) Rivals' lunar sites count their scripted landings, whoever else holds the ridge; a bought Orrery block's life is the auction's stated 12 quarters (not the future's hidden life).
- (mine, reversible) Capital terms designed inside doc 33's ranges (README); export credit needs the Accords registry; co-funding takes 30% of capex for 30% of revenue; the space-equity window opens at a 12× space multiple.

### Milestone M30 (branch `m30`, from `m29`; the Moon)

Split: M30.0 branch and split; M30.1 the lunar content (`lunar_iv.json`: 8 polar sites, claims, missions, power, pilot,
production, offtake, dust; `lunar_claims_iv.json`: the rivals' and blocs' scripted claims per future; schemas, loader,
README); M30.2 claims, the landing clock and disputes; M30.3 prospect missions, landings and prospect reports (the
resource categories; `lunarGeology.ts` turns the truth into estimates); M30.4 lunar power (solar arrays; the reactor
lease not before 2034, the Reactor Delay wildcard), the pilot plant (output per doc 33 §9.4, dust and night), offtake,
the production decision (no output in the act), the Flag on the Pole, the lunar alerts, the lunar unit in the books;
M30.5 the screens A4-06 (Moon, with the "after 2035" panel) and A4-07 (prospect report); M30.6 tests (B11) and the M30
report. Act I–III state never gains a key.
- **M30.1 done.** `tools/act4/moon.ts` (`npm run content:act4-moon`) writes `lunar_iv.json` and `lunar_claims_iv.json` (both copies; README section); zod in `src/content/moonContent.ts` (`MOON`). Test `act4MoonContent.test.ts`: claims identical through 2032Q2, B11's pilot band from the data, no production output possible in the act.
- (mine, reversible) Lunar values designed inside doc 33's ranges (README lists each); an unprospected claim's estimate is one orbital figure (800,000 t) for every site and grade, so it can't hint at the grade.
- **M30.2 done.** `state.act4Moon` (optional); `systems/moon.ts`: claim (1 BW, $5M, 5 PC; land within 6 q or it lapses), the scripted claims (`otherClaims`, `rivalOn`), disputes (raised when you claim a claimed site or a scripted claim arrives on yours; hold 15 PC, align with the claimant's bloc, share = half the resource, withdraw; unanswered, the first to land holds). Tests `act4Moon.test.ts`.
- (mine, reversible) Disputes are answered in the Plan phase (a card), not as live alerts; an unanswered dispute stays open until someone lands.
- **M30.3 done.** Missions (`SEND_LUNAR_MISSION`: 1 BW, 2 t at the market's delivery $/kg + $60M, lead 3–5 q seeded); the `lunar_landing` alert in its arrival quarter (commit = the market's landing rate; abort = +1 q, $10M; a landing that never came up lands at the quarter's end); success holds the claim and adds a prospect report (`lunarGeology.prospectReport`: truth × exp(N(0, sd)), 90% band; first/second/pilot sds); categories inferred → indicated → measured. `SpaceAlertCard` in Live serves orbit and lunar alerts (`spaceAlertView`). Tests in `act4Moon.test.ts`.
- **M30.4 done.** `systems/moonOps.ts`: solar arrays (output × illumination), the reactor lease (2034Q1; never in the act after the Reactor Delay; aligns you with the Accords bloc), the 1 MWe contract; the pilot (gates, $300M + 8 t, 7 q, output per doc 33 §9.4, measured after 2 run quarters, dust −3%/q unless a $5M crew); offtake (an offer a quarter once you hold a site; 20% prepaid; water delivered in signing order); production (gates; $4B drawn over 24 q; first output 20–32 q on, after 2035); the Flag on the Pole's freeze; dust-fault alerts; the lunar unit (`lunarUnitUsd`) and lunar EBITDA (no multiple) in the report and valuation; the top strip's lunar kWe. Tests `act4MoonOps.test.ts`.
- **M30.5 done.** `src/sim/moonViews.ts` (read-only: your estimates and observed output, never the grade) and `screens/Act4Moon.tsx` (re-exported by `Act4Panels`, same lazy chunk, now 23 KB): nav "Moon" (Act IV only) with the polar sites, programme cards, disputes (also on Plan), offtake, the megawatt contract, "after 2035", and the A4-07 report modal; a moon icon drawn like the orbit one. Browser-checked at 1024 px. Tests `tests/ui/act4Moon.test.tsx`; the hidden guard covers `moonViews.ts`.
- **M30.6 done.** B11 test `act4B11.test.ts`, played at the first opportunity at the de Gerlache ridge (claim + mission 2031Q1, retry on failure, solar 100 kWe and the pilot on landing, crew on): the pilot runs from 2034Q1 and processes **Rich 27.5, Patchy 13.8, Dry 4.1 t a year** by 2035Q4 (bands 15–60, 5–30, 0–8); production decided 2034Q3 produces nothing in the act; launch prices never move with the Moon.
- **M30 report.** Commits `27c8792` M30.0, `2ff1a9a` M30.1, `696e5b8` M30.2, `e7e4c99` M30.3, `4258ef0` M30.4, `6ffda7f` M30.5, M30.6 (this commit). Act I–III goldens unchanged; 1421 tests; main bundle 213.6 KB, Act4Panels 23.2 KB. See it: `npm run dev`, an Act IV game → Moon in the left nav.
- (mine, reversible) Only landed (held) sites carry resource value (an unlanded claim adds nothing, so claiming isn't free paper value); offtake buys surface water only; a solar array per site, no upgrades.
- (mine, reversible) Prospect missions are capitalised (they don't hit EBITDA); `lunarGeology` builds e^x from a series (no `Math.exp`, as the rest of the sim avoids engine-dependent maths).

### Milestone M29 (branch `m29`, from `m28`; orbit)

Split: M29.0 branch and split; M29.1 the orbit content (`launch_providers.json`, `satellites_iv.json`, `shells_iv.json`,
`insurance_iv.json`, `licences_iv.json`, `tenants_iv.json`: schemas, loader, README); M29.2 orbital blocks and their
slots (open a block: kind, size, shell, generation; the Tenant slot's offers; the Capital slot, cash in M29, M31 adds the
rest), licences and the registry; M29.3 launch manifests (bookings, deposits, slips, the dominant launcher's bumps,
failures, rebooking), insurance and the hard market, congestion, debris losses, the closed shell; M29.4 live operation
(rent and GPU-hour revenue, opex, link units and optical ground stations, fleet telemetry from `orbit_truth_iv`, useful
life), the books (optional quarter fields, orbital EBITDA at the space multiple), the storm, grounding and export-clampdown
wildcards, the orbit interrupts; M29.5 the screens (A4-03 Orbit board, A4-04 Launch manifest, A4-05 the block's deal card,
A4-08 Licences and registries, A4-02's exposure warnings) in a lazy `Act4Panels` chunk; M29.6 tests (B10's cost ratios,
B12's single-failure rule) and the M29 report. Act I–III state never gains a key (new fields optional, set in Act IV only).
- **M29.1 done.** Six orbit files (README section: values and flags; `launch_providers.json` hand-written, the rest from `tools/act4/orbit.ts`), zod-checked in `src/content/orbitContent.ts` (`ORBIT`); B10 test `act4OrbitCost.test.ts` (the data's cost ratios match the model in 2031, 2033 and 2035).
- **M27.7 byte-identity: passed.** `npm run sim -- --act2 --act3` on `main` (`209622e`) and on `m27`: all 1302 CSVs identical (`cmp`), the logs equal apart from timings (Act III: 532 runs, 0 crashed, 489 chapter, 43 game over).
- **M29.2 done.** `state.act4Orbit` (optional: blocks, licences, registry, links, insurance market); `systems/orbit.ts`: open a block (0 BW; size, shell, available generation; mass t/MW × MW × shielding), tenant offers (2 a quarter, own stream per block), sign (prepay credited) or spot, Capital = cash (1 BW), licences (1 BW + $1M, 200 MW, approval 2 q + registry + F2's +2 from 2033Q1 via `approval_extra_from`; fast track 10 PC, −1 q), registry (free before the first filing), link units, ground stations (1 BW, $15M, +3 Heat, 4 units next quarter). Tests `act4Orbit.test.ts`.
- **M29.3 done.** `systems/orbitLaunch.ts`: bookings (1 BW, 15% deposit at the locked $/kg, 2–6 q ahead, capped by the quarter's slots less your other bookings; Kestrel ≤ 250 t; sovereign launcher waits for M31); the build at END_PLAN (cash, licence room; the launch waits for it); launches at quarter end (grounding, closed SSO, slips, Pallas bumps when slots < 1,000 t, then failures by provider year), live 2 quarters after launch; insurance (young/mature rates, capacity cap, payouts, the hard market); the clampdown's ×1.15 cloud capex. Debris moved to M29.4 with live operation. Tests `act4OrbitLaunch.test.ts`.
- **M29.4 done.** `systems/orbitOps.ts`: live 2 q after launch (true life from `fleetReliability`, hidden), term ends to spot, deorbit; quarter-end revenue (shell rent, spot 80%, cloud GPU-hours × utilisation × health; links for interactive work; safe mode −3/13), ops and link rent, prepayments credited, lateness 3% of ACV a quarter, telemetry (truth + noise × √(10/MW)), GPU wear, debris by congestion, the SSO cascade, the 2035Q2 licence milestone; alerts `orbit_conjunction` (manoeuvre/accept) and `orbit_storm` (safe mode/ride; climbing blocks −40%); `SELL_ORBITAL_BLOCK`; Bandwidth +1 once live, max 9; report and valuation carry the orbital unit at the space multiple (Act I–III reports unchanged). Tests `act4OrbitOps.test.ts`.
- **M29.5 done.** `src/sim/orbitViews.ts` (read-only views, blockers called directly) and `screens/Act4Panels.tsx` (lazy chunk via `components/act4Lazy.tsx`, 13 KB): nav "Orbit" (Act IV only) with the Orbit board, deal cards, manifest, licences and registry, links; the Plan screen's exposure warnings; `OrbitAlertCard` in Live; the top strip's orbit MW. Browser-checked at 1024 px (no sideways scroll). Layout in `docs/wireframes/act4/README.md`. Test `tests/ui/act4Orbit.test.tsx`; the hidden guard covers `orbitViews.ts`.
- **M29.6 done.** B12 test `act4B12.test.ts`: in every future, shell and cloud, Pallas and Northgate, a company inside the rule loses its launch with no forced sale, no covenant breach, no game over. The exposure view now checks all three of the rule's conditions (uninsured share > 15% of equity, cash after the launch bill, leverage after the loss against the covenant limit) and the warning shows them.
- **M29 report.** Commits `f17c563` M29.0, `a27182a` M29.1, `87c1ef7` M29.2, `cc86e54` M29.3, `5937dbb` M29.4, `1456848` M29.5, M29.6 (this commit). Act I–III goldens unchanged; 1390 tests; main bundle 213.4 KB, Act4Panels 13.4 KB. M27.7's byte-identity check passed (above); the next run is at the end of the Act IV run. See it: `npm run dev`, Act IV preview (test build) or a finished Act III → Continue to Act IV → Orbit in the left nav.
- (mine, reversible) An orbit icon drawn in the design system's line style (the bundle has none); equity for the 15% rule = the latest report's valuation.
- **Open question for M31:** a carried Act III company can have little cash (the seed-3 autosave: $6.6M) against a 5 MW block's $8M deposit and $72M build: orbit needs M31's capital (export credit, project debt, co-funding, equity) to be playable; check it in M32's bots.
- (mine, reversible) Orbit revenue settles once at the quarter's end (not weekly); `conjunction_accept_hit_share: 0.25` and `sale_share_of_value: 0.8` added to the content; a live block's sale price is its last quarter's EBITDA × 4 × the space multiple × 0.8.
- (mine, reversible) Launch slips and failures resolve at the quarter's end with a log line, not as live-quarter alerts (doc 33 §14.2 lists them as interrupts); a failed block goes back to "proposed" (tenant kept) to rebuild and rebook; insurance premiums count in orbital costs (EBITDA); `tight_below_slots_t_q: 1000` added to `launch_providers.json`.
- (mine, reversible) M29 cuts the orbital tenant negotiation: offers are accepted as drawn (0 BW); a block's licence MW counts from its build start until it leaves orbit.

### Milestone M28 (branch `m28`, from `m27` at `f5cc011`; the hidden future)

Split: M28.0 branch and split (and M27.7's byte-identity result, recorded here when the runs end); M28.1 the Signals data
(`signals_iv_f1–f4.json`, generated by `tools/act4/signals.ts`: six indicators, displayed values with seeded noise, one decoy
each, triggers 2032Q2–2033Q3), schema, loader, hidden view `signalsHiddenIv.ts`; M28.2 Signals in play (Act IV's Read the
market, the Signals panel and top strip; A4-02's three MW columns and the exposure-warning slot); M28.3 the lunar-grade
draw and the three hidden files (`lunar_truth.json`, `orbit_truth_iv.json`, `reading_score_iv.json` first pass) with
their guards; M28.4 `events_iv.json` (~45 cards) in the event engine; M28.5 `wildcards_iv.json` (2 of 6 drawn; the
storm, grounding, Flag on the Pole and reactor-delay effects land with M29/M30's systems); M28.6 the M28 report.
- **M28.1 done.** `tools/act4/signals.ts` (`npm run content:act4-signals`) writes `signals_iv_f1–f4.json` (README section; designed paths, decoys, triggers in `tools/act4/futures.ts`); `SIGNAL_IDS_IV`, `signalsIvFileSchema`, `CONTENT.signalsIv` (runtime fields only); hidden view `src/content/signalsHiddenIv.ts`; guard `tests/sim/act4Hidden.test.ts`; copy test extended.
- **M28.2 done.** `act4SignalReads`, `READ_SIGNAL_IV` (`systems/signalsIv.ts`, Act III's rule: 1 BW, once a quarter), `signalsPanelIv` (Act III's shape), `act4MwColumns` (ground from the sites; orbit and Moon 0 until M29/M30); the Signals panel, Read dialog and top strip serve Act IV (short labels LQ FR OC GP DG RC; the strip adds "MW · ground / orbit / moon"). The exposure warnings (A4-02) need launches: they come with M29. Browser-checked at 1024 px.
- **M28.3 done.** Hidden files `lunar_truth.json`, `orbit_truth_iv.json`, `reading_score_iv.json` (README: designed values); `systems/lunarGeology.ts` (zod-checked, `drawLunarGrade` on substream `act4_lunar_grade`, set at the boundary as hidden `state.lunarGrade`) and `systems/fleetReliability.ts` (`trueReliability`, for M29); guards in `act4Hidden.test.ts`; F3's decoy shortened to two quarters (mine, reversible).
- **M28.4 done.** `tools/act4/events.ts` (`npm run content:act4-events`) writes `events_iv.json` + `text_iv.en.json` (a third text table `t()` merges; textKeys test covers it); `content/act4Cards.ts` (schema, opaque `a4_` ids, Act III's effect translation, no deferred effect allowed); 40 cards in Act IV's deck, filtered by `future`. The 5 lunar cards wait for M30 (mine, reversible).
- **M28.5 done.** `wildcards_iv.json` (zod, `CONTENT.wildcardsIv`), `systems/wildcardsIv.ts`: 2 of 6 drawn at the boundary (`act4Wildcards`, stream `act4_wildcards`), each fires once at its quarter's start with a news line (also in the report's events block); the Bitcoin Supercycle doubles mining revenue for 3 quarters now; the storm, grounding and export clampdown get their effects in M29, the Flag and reactor delay in M30 (`wildcardFiredIv`).
- **M28 report.** Commits `4c298dc` M28.0, `d05691b` M28.1, `f59b1be` M28.2, `c206487` M28.3, `7b15516` M28.4, `bf8c58b` + `fd34d2f` M28.5 (the fix: Act IV test files take no time limit; `bf8c58b` was pushed with that one test timing out under sim load). Act I–III goldens unchanged; 1336 tests; main bundle 211.5 KB. M27.7's `--act2 --act3` byte-identity runs are still going (started detached at M27.6's end); their result is recorded at M29.0.

## Milestone M26 (branch `m26`, from main at `f8cf61f`; cleanup)

Split (DT spec, 5 Oct 2026): M26.0 housekeeping (m25 tagged m25-done and pushed, deleted locally; it never had a remote branch; the M25 merge
recorded); M26.1 remove the unused `p0.tooltip.*` keys; M26.2 the market fix log (skipped if the project file can't be reached); M26.3 a README
in `docs/game-project-files/` on the superseded v1 market files; M26.4 the "Retrofit done" / "Refit done" lines.
- **Closed (DT, M26.0):** the reading-score card keeps its own text (`term.act3.reading.*`) and no glossary link: the glossary is open during
  play, and any entry could hint at the hidden scenario.
- **M26.1 done.** Removed from `content.en.json` all six `p0.tooltip.*` keys (difficulty, solo_vs_pool, custody, backup, preorders, hodl_sell): no code, test or tool names them, and no dynamic key builds `p0.tooltip.` (the built prefixes are `tooltip.q1.`, `tooltip.act<n>.`, `p0.event/vendor/vanity/news/chapter_title.`). Nothing kept. The pack's own copy stays in `docs/prologue-content/text_prologue.en.json`.
- **M26.2 skipped (as the spec allows).** The design project's `claude/claude_act2-content_market-fixes.md` isn't in the repo, and the build thread can't reach the project's files (a search of this Mac found no copy). To add it: put the file anywhere in the repo, or paste its text, and it gets copied unchanged to `docs/act2-content/market-fixes.md` and linked from that README (and from `docs/game-project-files/README.md`).
- **M26.3 done.** New `docs/game-project-files/README.md`: the folder is the design project's read-only snapshot; its Act II market CSVs are the superseded v1; the build loads `docs/act2-content/` (v2, test-checked copies); the fix log is `docs/act2-content/README.md` (M26.2's `market-fixes.md` wasn't reachable). Nothing deleted.
- **M26.4 done: neither of the spec's cases.** No Act II action retrofits or refits (`RETROFIT` and `REFIT_GPUS` are Act III actions, M16.3, blocked elsewhere by `error.act3_only`), and the Act III lines are already logged at completion (`density.ts › finishDowntimes` builds `` `log.${kind}_done` ``; M25's report missed the runtime-built key). So the keys stay (removing them would break Act III's log); the only change is the sound, `energized` for both (mine, reversible), tested through `finishDowntimes`. No sim, content or golden change: no sim re-run needed.
- **M26 report.** Commits `fbaf25b` M26.0, `51aea59` M26.1, `fde56b1` M26.3, `9e42b7b` M26.4, M26.2 skipped (above). No `src/sim`, `src/content`, `tools` or golden file changed against `main`: every golden unchanged, sim output byte-identical by construction (sims not re-run). 1285 → 1286 tests (133 files); lint, build pass; one key once in both tables. Main bundle 209.3 → 209.4 KB. No screen changed (the new sound plays on an existing log line), so no browser check.

## Milestone M25 (branch `m25`, from main at `ebcda47`; glossary unification, Act II data audit, the rest of the Act III polish)

Split (DT spec, 5 Oct 2026): M25.0 housekeeping (m24 tagged m24-done and deleted, it never had a remote branch; the M24 merge recorded); M25.1
one key per term for the card and the glossary, a "More in the glossary" link, hashprice's halving clause; M25.2 the Act II market data audit (report
only); M25.3 Act III sparklines and sounds / animations. UI and text only: sim output and every golden byte-identical.

- **M25.1 done.** Every term card reads the glossary's keys (`glossary_term` / `glossary_short` card / `glossary` long; the 5 overlaps merged, 21 card-only terms moved in, `term.act*` keys gone) with a "More in the glossary" link that opens Settings at the entry; hashprice halves at each halving. (mine, reversible): the reading score stays out of the glossary (open during play, its line names misleading signals), the glossary is sorted by term, and it no longer shrinks to 9 px in a short window.
- **M25.2 done (audit, nothing changed).** The build loads `src/content/market_weekly_act2.json` (0 cells off its CSV), from `market_weekly_act2.csv` = byte-identical to `docs/act2-content/market_weekly.csv`, the **fixed v2** (the fixes are in `docs/act2-content/README.md`; no `claude_act2-content_market-fixes.md` exists in the repo), not the pack's v1 `docs/game-project-files/claude_act2-content_market_weekly.csv`. Weekly v1 → v2, 222 weeks, same weeks and quarters: `eth_usd` added; **`btc_usd`** every week (2022Q4 rebuilt, up to +24.5% on 24 Oct 2022; other quarters ≤ 2.9%, the ramp to the sourced close); **`btc_difficulty_T`** 11 weeks, 2022Q4 only (−11.0% to +4.1%); **`btc_block_subsidy`** 3 weeks (1–15 Apr 2024: 3.125 → 6.25, halving moved to 22 Apr); **`btc_hashrate_EHs`** every week (derived from difficulty; largest −24.2%, 30 Mar 2026); **`btc_hashprice` (TH and PH)** every week (derived; largest +75.5%, 1 Apr 2024, $65.72 → $115.36/PH/day). Unchanged: fee share, ASIC tiers, H100 rents, `estimate`.
  Quarterly v1 → loaded: multiples removed (B6), `eth_usd_close` and the 2 estimate flags added, hashrate and hashprice derived (largest +66% 2024Q1), H200 rents = H100 × 1.2 (−16 to −30%), SOFR 16 quarters (largest −15.8% 2022Q4) and HY 12 quarters (largest −19.7% 2026Q3) from FRED. **`npm run data:real` writes only the two quarterly copies**; the weekly file was last changed 27 Sep (`d08b9b9`), before M22.
- **M25.3 done.** Signals rows get a 64×16 ink sparkline (A3-03's "past quarters only"): `signalsPanel`'s history + this quarter's displayed value, fixed 0–100 scale, none before 2027Q2. Act III sounds through `soundsFor`, existing sounds only (mine, reversible): renewal / re-let / blend / PPA signed → deal-agreed, renewal walk → walk-away, lobby landed / backfired → auction-won / -lost, covenant breach → margin-call, forced sale / called → liquidation. The `rise` animation on renewal cards, wildcard cards, a read's band and the reveal (reduced motion stops it).
- **M25 report.** Commits: `f189f59` M25.0, `c98ff58` M25.1, `a26793b` M25.2, M25.3. No `src/sim`, `src/content`, `tools` or golden file changed against `main`: sim output byte-identical by construction (sims not re-run). 1278 → 1285 tests (133 files); lint and build pass. Main bundle 208.4 → 209.3 KB; chunks: term 4.1, Act3Entry 16.0, bots 19.7, Act3Panels 30.1 → 30.7, Prologue 43.1. Browser-checked at 1024 px (no sideways scroll): the top-bar Heat card → glossary link → Settings at Community Heat; the Act III Signals panel at 2027Q2. Open: the spec's `claude_act2-content_market-fixes.md` isn't in the repo (audited against the README's fix log instead); the content pack's unused `p0.tooltip.*` texts still repeat some term lines (difficulty, solo vs pool, custody), left as content-pack data.

## Milestone M24 (branch `m24`, from main at `37a3535`; onboarding across all acts, guard-test stability)

Split (DT spec, 5 Oct 2026): M24.0 housekeeping (m23 tagged m23-done and deleted, it never had a remote branch; the M23 merge and two closed
decisions recorded); M24.1 the leak-guard flake (no wall-clock time-out decides pass/fail; 20+ runs under five-sim load; same fix on any guard
test with the pattern); M24.2 onboarding tips for the Prologue and Act I; M24.3 rich tooltips for the Prologue, Act I and Act II core terms.
UI only: sim output and every golden byte-identical.
**M24.1 done:** the cause: the leak guard waited for the lazy Act III panels with `waitFor` (1 s default), and most sections weren't waited for at all
(checked half-rendered). Fix: `preloadAct3Panels()` (act3Lazy.tsx) in the test's `beforeAll`, so every screen is complete on its first render; no
`waitFor`; the guard tests take no time limit (0 = none). Under five parallel full sims (load 7–9 on 8 cores): 20 of 20 consecutive runs pass, and
the full suite passes (load 38). Other guard tests checked: the D15 guard (same file, synchronous) and the hidden-file guard (a text grep) had no
such pattern; nothing else to change.
**M24.2 done:** `Tip act={0|1}` (dismissed as `act0.<id>` / `act1.<id>`; the Settings reset covers every act). Prologue: rig, household (Plan),
mining (Plan › Solo or pool), coins (Coins screen), machines (Machines screen), live (Live screen). Act I (only when `act === 1`, as the panels are
shared with Act II): todo, market, fleet, sell (Plan), live (Live), report (Report › Notes). Tips sit at the top of their panel (mine). 1269 tests.
**M24.3 done:** `Term act={0|1|2}` (keys `term.act<n>.<id>`). Prologue: difficulty (top bar), solo_pool (Solo or pool), patience (Parents' patience),
wallet_exchange (Where your coins are), selling_limit (Coins). Act I: bandwidth, treasury, heat, valuation (top bar, so also in Acts II–III), hashprice
(Market), hodl (Sell). Act II: rating, backlog (top bar, Acts II–III), leverage (Capital › Debt / EBITDA), ddtl (Capital debt row), mw_uses (Where your
megawatts go). Skipped: J/TH, fee share, subsidy (not on any screen), halving (an event card only). 1271 tests.
**M24 report (5 Oct 2026):** commits `e3000e5` `26ce54f` `d48d7c2` + M24.3; no file under src/sim, src/content, tools or tests/golden changed (UI and
text only), so sim output and every golden are byte-identical by construction; browser at 1024 px: every touched screen (Prologue Plan / Coins /
Machines / Live, Act I Plan / Live / Report, Act II Plan / Capital) no sideways scroll, nothing outside its panel. Main 208.4 KB; term 3.7 KB (shared
chunk); Prologue 43.1; Act3Panels 30.1; Act3Entry 16.0; bots 19.7.

## Milestone M23 (branch `m23`, from main at `6c623d3`; rate robustness and Act III clarity polish)

Split (DT spec, 5 Oct 2026): M23.0 housekeeping (m22 tagged m22-done and deleted; it never had a remote branch; this note records the M22
merge); M23.1 SOFR 2026Q4 = the last FRED observation carried forward, the seam into 2027Q1, the sim vs M22; M23.2 the implied miner premium
table (doc 18 §15, report only); M23.3 the robustness sweep (SOFR ±100 bp in Act II, Act III scenario HY ±150 bp; report only, no retuning,
output outside committed files); M23.4 Act III clarity: the renewal-wall chart, rich tooltips, onboarding tips with a setting to show them again.
**M23.1 done:** `carryForward` in tools/data/real-market.ts: SOFR 2026Q4 = 3.87% (2026-10-01), still `sofr_estimate`; seam 2026Q4 → 2027Q1 +8 to +13 bp
(was −5 to 0). **M23.2:** the premium table in doc 18 §15 (+0.4…+1.5 pts through 2024, ≈ 0 in 2025, 2025Q2 −0.07, 2026Q4 −0.17). **M23.3a:**
knobs SOFR2 / HY3 and `--knobs` on the full sim (process only). **M23.4 done:** `renewalWallView` + the wall above Contracts (A3-04); `Term`
(fixed-position hover/focus card, 11 terms); `Tip act={3}` (6 tips, dismissed as `act3.<id>`); Settings › Onboarding tips › Show them again
(`resetDismissedTips`). Mine: GPU contracts count their project's MW; holdovers count this quarter; tips go below title rows; the reading-score
term id is `reading` (the hidden-file grep forbids `reading_score` in UI files). Act3Panels 28.2 → 30.1 KB. 1265 tests.

**M23.3 sweep (report only; 5 full `--act2 --act3` runs, output in the session scratchpad, nothing committed changed):**
- Baseline (M23.1 only) vs M22: every summary table identical; the only CSV change is 19 rows of `act2-valuation.csv` at 2026Q4 (debt-carrying
  bots end ~$0.13M richer: 2026Q4 SOFR 4.00 → 3.87%).

| Run | Game overs (S0/S1/S2/S3 = total) | C1 S0 / S1 / S2 / S3 | Covenant breaches S0 / S1 / S2 / S3 | Act II §5 |
|---|---|---|---|---|
| baseline | 5 / 17 / 15 / 6 = 43 | 1.01 / 0.84 / 1.80 / 0.97 PASS | 5 / 24 / 20 / 9 | 9 PASS, 4 MISS (as M22) |
| SOFR −100 bp (Act II) | 5 / 18 / 15 / 6 = 44 | 1.00 / 0.83 / 1.81 / 0.96 PASS | 6 / 24 / 21 / 8 | unchanged |
| SOFR +100 bp (Act II) | 5 / 19 / 15 / 6 = 45 | 1.02 / 0.85 / 1.77 / 1.04 PASS | 5 / 27 / 18 / 10 | unchanged |
| HY −150 bp (Act III) | 5 / 18 / 15 / 6 = 44 | 1.01 / 0.84 / 1.80 / 0.97 PASS | 5 / 24 / 20 / 8 | unchanged |
| HY +150 bp (Act III) | 5 / 17 / 15 / 6 = 43 | 1.01 / 0.84 / 1.80 / 0.97 PASS | 5 / 24 / 20 / 8 | unchanged |

Margins (baseline value · threshold · flipped by any run?): C1 "S1 lowest": S1 0.84 vs next-lowest S3 0.97 (margin 0.13; smallest 0.13
at SOFR −100) · no. §5 #0 gap 0.44 (≥ 0) · no; #1 17/42 · no; #3 peak $4.6B (band $4–8B) · no; #5 texas-ipo $300.4M ($100–400M) · no; #8 IRR gap
35 pts (≥ 30) · no; #9/#10 EV/MW in band · no; #11 3/4 · no; the accepted MISSes (#2, #4, #12) and #6 stay MISS. **S3:** 0.96–1.04× across the runs:
the most rate-sensitive scenario (it crosses 1.0× at SOFR +100), but always ≥ 0.12 above S1. The Act III HY knob barely moves anything: bots
rarely sign new project debt in Act III, the only thing priced on it.

## Milestone M22 (branch `m22`, from main at `48d16b4` plus the M21 notes fix `d7bab88`; real market data)

Split (DT spec, 5 Oct 2026): M22.0 housekeeping (m21 / m21.6 tagged and deleted; the "not merged" line fixed: `d7bab88`, made on the
branch first called m21.7, renamed m22, mine); M22.1 SOFR and the HY spread from FRED by a committed script over committed raw downloads; M22.2
the sim against the M21 baseline, no retuning; M22.3 the goldens the data touches.
**M22.1 done:** `tools/data/real-market.ts` (`npm run data:real`) + `tools/data/raw/fred_SOFR.csv`, `fred_BAMLH0A0HYM2.csv` (retrieved 5 Oct 2026) +
`tools/data/README.md`. SOFR real 2022Q4–2026Q3, HY 2023Q4–2026Q3 (FRED shows 3 years of the ICE series); a quarter is real only if fully covered
(mine); per-series flags `sofr_estimate` / `hy_spread_estimate` (schema); DDTL spread and ASIC tiers stay estimates (Luxor: Premium / paid API, no
workaround). Doc 18 §15 and the act2-content README updated. Two tests that pinned old SOFR values updated; new test recomputes from raw. 1257 tests.
**M22.2 (sim vs M21, no retuning):** Act I CSVs identical (1301 files); only `act2-valuation.csv` changed. Act III game overs 43 → 43 (s0 4 → 5, s1
18 → 17); C1 1.01/0.84/1.80/1.01× → 1.01/0.84/1.80/**0.97×** (still PASS); covenant s0 breaches in 4 → 5 runs (1 called), s1 26 → 24; Act II
texas-capital 2030Q4 median $1090.5M → $1052.0M, overleveraged 2026Q4 debt cost +$10M. Cause: SOFR alone (Act II prices equipment loans and DDTLs
at SOFR + spread; the HY spread is read only in Act III, from the unchanged scenario files): lower 2022Q4–23Q3, higher 2025Q3–Q4 shift the
debt-carrying bots' 2026Q4 cash and debt slightly, which moves marginal Act III runs. **M22.3:** no golden changed (Act I / prologue never read
these rates; the act3-s* companies hold no debt; Act II has no golden).

## Milestone M21 (branch `m21`, from `main` at `dceb047`; the design thread's answers after M20)

Split (run in one go): M21.0 A1 the M19 hire renamed Mae Holloway; A2 the deal card's "Leaves you $X" line and the cash check; M21.1 layout
from 1024 px (no sideways page scroll; the Plan screen reflows below 1280; the Act III chapter stats wrap); M21.2 the full Heat breakdown
(sums to the value; the thresholds line); M21.3 Power and Capital slot log lines; M21.4 CLAUDE.md brought up to date; M21.5 tags m10-done …
m20-done pushed, the merged remote branches m10 … m20 deleted (owner's go-ahead in the spec). Invariants: goldens and `--act2 --act3`
byte-identical (no rule changes), main bundle under 500 KB.
**M21.0 done:** hire renamed Mae Holloway; the deal card's "Leaves you $X" (loss colour below 0; the existing no-cash blocker greys Sign). Bug found and
fixed: en.json had repeated keys, the later silently winning: `ui.deal.title` (M19's card overwrote the Deal builder's title) → card keys now
`ui.cdeal.*`; `ui.plan.fleet` (the "Sell or repair" row showed the distressed-fleet text) → `ui.plan.distressed_fleet`; `error.no_renewal` (Act III
tenant renewals showed the power-contract text) → `error.no_tenant_renewal`. New test: no repeated keys in either string table. Goldens unchanged.
**M21.1 done (CSS only, game.css):** screen min-width 1280 → 1024; below 1280 the page scrolls down (not across), the Plan to-do spans the top with the
two side columns under it, the top bar packs tighter, sections / Capital / report / tiles / racks / prologue Plan reflow; every width: a panel holding a
too-wide table scrolls it (`:has`), chapter-report stat rows and rival fates wrap, the Act III intro's lines wrap. Browser sweep (dev) at 1024 / 1280 /
1440 over every screen and section of every act: no sideways page scroll, nothing truncated; only the fleet table scrolls inside its panel.
**M21.2 done:** `heatParts` (heat.ts, read-only) + `heatBreakdownView`; `components/heatBreakdown.tsx`: the list on the Sites screen (under each meter)
and in the Community dialog (replacing M19's two lines), the Plan meter's hover tooltip (mine: a tooltip, so the Plan stays compact); region shown as
"Region (×m)" with its ± effect; gas and the hire listed at face value (the region part carries their scaling, mine). Test: parts sum to the pre-clamp
Heat in Acts I–III, order, clamp, thresholds, read-only. Goldens unchanged.
**M21.3 done:** the slot lines already existed (M8.7d: `log.project_power_*`, `log.project_capital_*`); two gaps fixed: `log.project_power_nuclear` was
missing from the report's milestone keys, and a rack card's pilot (born live) logged neither slot, now both. Goldens unchanged (no golden plays a rack card).
**M21.4 done:** CLAUDE.md rewritten: all four acts' status (Act IV not designed), the current docs (27 v1.2, 28, 30, act3-content README, dev-notes),
the Act III rules (hidden files, leak guard, D15 guard, test-only forcing / quick starts, the gate test), the standing invariants, the 1024 px layout
rule, one-key-once text rule, and branches (one per milestone from main; the owner merges; done branches tagged `m<n>-done`).
**M21.5 done:** tags m11-done … m20-done (annotated, at each branch tip, verified on the remote) pushed; remote branches m11 … m20 deleted (each
fully merged into main first). m10 skipped: no branch exists locally or remotely. Left alone (not in the spec): remote `m9` and `prologue`, and the
local copies of m11 … m20.
**M21 report (5 Oct 2026):** commits `79d07a7` `5906943` `8ef6e79` `1e41f00` `a23993a` `35dd8c4`; tests 1247 → 1254; goldens all unchanged; `--act2
--act3`: all 1302 CSVs and the log byte-identical to M20 (timings aside; 43 game overs; C1 1.01/0.84/1.80/1.01×); main bundle 207 KB. Branch m21
not pushed (owner's call). Questions for the design thread: in the final report.
**M21.6 (housekeeping, DT 5 Oct 2026; branch `m21.6` from main):** (1) remote m9 and prologue both fully merged: tagged m9-done (42bdec2) and
prologue-done (fc8ce72), pushed, verified, remote branches deleted: the remote now holds only main. (2) local m11–m20 and prologue deleted with
`git branch -d` after their remote tags checked (local prologue was one commit, 6131d17, past its tag; that commit is in main, so -d allowed it).
(3) m10-done = 5af442f "M10.6: M10 report", the last of M10.1–M10.6 (the next commit, 96c1adf, is M11 groundwork), pushed. (4) Top bar at 1024:
it did switch during play (Act I 56 → 108 ↔ 118 px); below 1280 it now keeps room for two lines (min-height 118 px, CSS only): 79 Plan quarters
of Acts I–III measured, all 118 px. Tests 1254, lint and build pass; `--act2 --act3` byte-identical to M21 (all 1302 CSVs and the log).

## Milestone M20 (branch `m20`, from `m19` at `a4dd432`, since M19 isn't merged yet; the Act III public release)

Owner, 4 Oct 2026: release without waiting for the playtest; run unattended after M19. Split by the design thread: M20.1 D15 resolved by the
owner's decision (both s1 fates cleared, unchanged); M20.2 open the gate (production gets Act III; forcing and quick starts stay test-only;
the save guard and the gate test redefined); M20.3 checks (goldens, `--act2 --act3`, bundle sizes, a production browser check).
**M20.1 done:** `d15_cleared` + `d15_note` on s1 core_scientific and coreweave (both copies; fates unchanged; `d15_review` kept); the reveal's
"Rival fates are scenario illustrations, not predictions." line; `d15Withheld` guard kept and tested; a content test (every flagged fate or card is
cleared). **Golden act3-s1:** only its two rival fates' `withheld` true → false (the expected change). act3-content README logs it.
**M20.2 done:** `screens/Act3Entry.tsx` (lazy, every build: presets, Scenario Mode, Continue to Act III, intro, chapter report); Act3Preview.tsx keeps
only the quick starts (inline mode check); `act3PresetStart.ts` (the bots chunk ships: presets play them, mine); forcing + its top-bar tag inline-gated
(FORCING_MARKER); `act3QuickStart` save mark; save guard refuses forced/quick-start saves only; "Continue to Act III" in every build (mine); gate test
redefined; the toAct3 grep test keeps "one entry" without the gate (mine). Production: main 206 KB, Act3Entry 15.9, Act3Panels 28.2, bots 19.7.
**M20.3 done:** save/title labels "Act III" (no "(test)"); `.claude/launch.json` prod-preview (port 4174). Browser (production preview, `?scenario=s1`
ignored): New career → Start at Act III → Good → intro → 2 quarters → reload → autosave loads (Q3 2027); no forcing tag, no quick starts, no errors.
Test build: GPU-heavy quick start forced to s1, played to the end: both cleared s1 fates in full under the illustration line, nothing withheld.

**M19 + M20 report (4 Oct 2026, run unattended):** commits M19 `1e1fc84` `42fc002` `a4dd432`; M20 `83ffc65` `7b96386` `f4ba669`; branches m19, m20
pushed, main untouched. Tests 1229 → 1247, lint and build pass. Invariants: goldens unchanged except act3-s1's two `withheld` flags (M20.1, expected);
`--act2 --act3` on m19 and m20: all 1302 CSVs byte-identical to M18.13 and the log identical but for timings (43 game overs, C1 1.01/0.84/1.80/1.01×);
leak guard and hidden-file tests unchanged. "Mine" decisions: in the M19.1–M20.3 lines above. Questions for the design thread: in the final report.
Merge (owner, when approved; m20 contains m19, both fast-forward): `git checkout main`, `git merge --ff-only m19`, `git merge --ff-only m20`,
`git push origin main`, `git checkout m20`.

## Milestone M10: the Act III walking skeleton — DONE (branch `m10`; the step log is in the archive › "Milestone M10")

Plumbing only (`isActIII` / `inActIII`, save version 4, the timeline extended past 2026Q4); the stub content it used was replaced by
the real scenario files in M11.3.

## Milestone M18 close-out (branch `m18`; Act III step 7 and the balance pass) — DONE

**Act III balance pass closed (design thread, 4 Oct 2026).** The M15–M18 step logs are in the archive › "Milestones M15–M18"; every
change from M11–M18.13 is recorded in doc 27 v1.2 §17. M18 built: the corporate and standby facilities, the presets (real Act II
companies), A3-12 + Scenario Mode, the archetypes and the anchor harness (`--act3-anchors`), the tuning pass, then six rounds of design-thread
answers (M18.8–M18.13): carried-lease reopeners, S3's rebound, GPU contract walks and the lender cure, the contract-rate multiplier, the
leverage covenant.

**Final values** (`BALANCE.act3` and the content files):
- GPU contracts signed in Act III: × the contract-rate multiplier, glide 1.00 / 0.90 / 0.80 (2027Q1–Q3), then 0.55; Act II contracts
  renewing in Act III take it on their base. Contracted payback at 2027Q3: B200 2.03–2.12 yr, Rubin 2.38–2.52, Rubin Ultra 2.32–2.33.
- Rubin rents × 0.65, Rubin Ultra × 0.60 (K1); the Rubin Ultra rack +$4M in every quarter, all scenarios (2027Q3 $19M).
- Leverage covenant: LTV = debt ÷ the quarter report's valuation; limit max(75%, entry LTV + 5 points); a breach bars new debt and sweeps
  50% of (EBITDA − interest) into debt, highest rate first; cure to the limit − 10 points by the end of the 2nd quarter after; missed:
  forced sales × 0.85 (shells, then clouds/pilots at GPU residual), then the lenders call the rest, then the rescue and game-over rules.
- Standby liquidity facility: 1 Bandwidth, rating BB− or better, 20% of valuation capped at $500M, 1% upfront, 0.5% a year on the
  undrawn part, draws at SOFR + 350 bp, available 8 quarters, each draw an 8-quarter bullet.
- GPU contract walk: AI-lab / neocloud contracts in distress ≥ 2 quarters walk only when spot < half their pay; a walk on a DDTL project
  opens a 2-quarter lender cure. Carried Act II leases are reopenable from 12 quarters served; tenant reopeners on them only by AI labs and
  neoclouds at Band high < 0.75. S3 rents rebound from 2029Q1. Presets: Good $412.6M, Great ~$2.7B, Lifeline $155.7M.

**Final anchor table** (M18.13c, 30 seeds; Good preset shell-capital s9 and the GPU-heavy overleveraged s1):

| Anchor | Result | Numbers |
|---|---|---|
| A1 (Good, S1) hedged ≥ ignorer − 0.05 | PASS | 0.91 vs 0.85 (ignorer breached 30/30, all cured) |
| A1-gpu (GPU-heavy, S1) | information (DT) | 0.50 vs 0.98; no breach |
| A2 GPU-heavy ignorer punished in S1 | information (DT) | 0.98, 0 distress sales |
| A3 S2 long-locked ≥ 1.15 × passive | PASS | 2.41 vs 1.15 × 1.76 |
| A4 S3 flexible ≥ long-locked | retired (M18.9) | — |
| A5 S0 every archetype ≥ 0.85 | PASS | lowest over-reactor 0.94 |
| A6 over-reactor ≤ 0.97 × passive (S0–S2) | PASS | 0.94 / 0.74 / 1.63 vs 1.05 / 0.89 / 1.71 |
| A7 Good passive: no game over | PASS | 0 in every scenario |
| F7 hedged S1 ≥ 0.75 | PASS | 0.91 |
| C1 S1 lowest (population) | PASS | 1.01 / 0.84 / 1.80 / 1.01× |
| C2 Rubin, Ultra ≥ 2.3 yr and ≥ B200 (contracted) | PASS | see above |
| C3 S2 signing ahead; S3 within ±2% | PASS | 1.787 vs 1.759; 0.930 vs 0.922 |

Full sim (532 Act III runs, 0 crashes): 43 game overs (S1 18, S3 6); covenant breaches S0 5, S1 26, S2 20, S3 9; reading medians
75 / 50 / 56 / 50; the oracle unchanged; Act I/II byte-identical.

## Milestone M14 (branch `m14`, from `main` at `e364d54`; Act III scoring, doc 27 D14 + §5) — DONE

Split by the design thread, run in one go: `e191adf` docs (M10–M12 step logs to the archive); M14.1 the reading_score content file and
its hidden-file rule; M14.2 the move log (`act3Moves`); M14.3 the reading score (`readingScore.ts`); M14.4 the reveal record and the
chapter report; M14.5 the sim proof. Paths: the spec's `src/systems/` is `src/sim/systems/` in this repo (mine).

**M14.1 done:** `docs/act3-content/reading_score.json` committed and copied byte-identically to `src/content/` (content test); grep tests: the file is imported only by `sim/systems/readingScore.ts`, that only by `act3End.ts`, and `tools/bots.ts` imports no hidden view or reading score. en.json `act3.reveal.title.*` (five bands), `.description`, `.wording.high/mid/low`; `BALANCE.act3.readingTitles` (band minimums) and `readingWording` (DT: high ≥ 70, mid 40–69). 988 tests.

**M14.2 done (the move log):** `state.act3Moves` ({q, kind}[]; `enterAct3` starts it, the save loader defaults an old Act III save to []); `sim/systems/act3Moves.ts` (kinds, `MOVE_SIGN`, `moveOf`, `cardChoiceMove`), hooked once in `applyAction` after an action applies in Act III. Each Act III card choice carries `act3Effect` (only the effect keys the log reads, so a deferred choice keeps its values) and `act3Distressed` (s1_c6). Mine (questions in the M14 report): ASIC buys/sales neutral, GPU rigs count; a build start that draws debt logs `project_commit` only; card effects `gpu_rack` → gpu_buy, `capex_mw` → project_commit, `mw` > 0 → site_buy (distressed_buy for s1_c6), `debt_maturity_years`, retrofit and power options neutral; a deferred card choice is logged by its authored effect. Goldens: act3-s* gain only `act3Moves` (s0 card_lengthen q5; s1 none; s2 card_lengthen q6; s3 card_shorten q4, q7, project_commit q12), regenerated here and again in M14.4 (each commit must pass). 1005 tests.

**M14.3 done (the reading score):** `sim/systems/readingScore.ts` (hidden; pure): `computeReading(moves, scenario, lastQ)` → {score | null, base, penalty, perQuarter} per the file's formula; `markMoves` (✓ / ✗ / decoy / – per move, for M14.4) and `oracleLogs` (passive, perfect, opposite logs per scenario, for tools and tests). Every value in the spec's table reproduced (`tests/sim/act3ReadingScore.test.ts`). 1016 tests.

**M14.4 done (the reveal record and the chapter report):** `act3End` gains `reading` {score, base, penalty, perQuarter}, `triggerQ`, `careerTitleId` (Act II's valuation bands on the last valuation; "bust" at a game over) and `readingTitleId`; it is now also built at an Act III game over (`quarter.ts`), counting the reading to that quarter. `act3Outcome` adds the wording (DT thresholds) and the end quarter; `act3RevealDetails` adds each move with its quarter, timing against the trigger and its mark. The reveal (`Act3Reveal.tsx`) gains the bare-bones reading panel: score (or "—"), reading title, wording, description, career title, growth multiple (one decimal), "Survived to 2030Q4" / "Out of the game — {quarter}", the moves timeline (✓ / ✗ / ✗ reacted to the decoy / –), the decoy penalty line, or "You made no big moves." Mine: a move in the decoy window with the non-decoy sign where the ideal is 0 is "–". **Goldens:** the four act3-s* gain only the reading block, `triggerQ` and the two titles (s0 76 Signal Reader, s1 50 Steady Hand, s2 56 Steady Hand, s3 53 Steady Hand; career Contender in all; no penalty). The timeline test now expects the record's new keys and a reveal at a game over. Seen in the browser (dev): GPU-heavy on s1, reading 50 Steady Hand, no moves, the two D15 fates withheld. 1019 tests.

**M14.5 done (the sim proof):** `npm run sim -- --act3` prints the reading score per scenario × bot and per scenario (median, p10, p90, share null, median moves) and an oracle row (tools/ reads `readingScore.ts`: passive and perfect logs per scenario), which the sim asserts equals the M14.3 table (it does: passive 78/50/50/50, perfect 78/100/100/100). By scenario (all bots; median / p10 / p90 / null / median moves): s0 76 / 66 / 76 / 0% / 1; s1 50 / 24 / 50 / 1% / 1; s2 56 / 56 / 72 / 0% / 3; s3 53 / 11 / 53 / 0% / 5 (the bot-by-bot table is in the M14 report). The `--act2` output and all CSVs are identical to M13's; the existing `--act3` tables are unchanged. No balance targets (step 7). **M14 done:** 986 → 1019 tests; Act I, prologue and Act II goldens and `--act2` byte-identical; the act3-s* goldens changed only by `act3Moves` (M14.2) and the reading block, `triggerQ` and the titles (M14.4), regenerated in those two commits (the spec asked for one regeneration; each commit has to pass, so twice, each diff limited to the new fields).

## Milestone M13 (branch `m13`, from `m12` at `5add923`; a hidden route into Act III with bare-bones panels) — DONE

**The M13 report in short (what the owner can test now):** in `npm run dev` or the staging build, title → New career → "Act III
preview (test build)" → Growth company / GPU-heavy / Shell landlord (a bot plays 2017–2026 in about a second) → the Act III intro →
16 quarters with Signals, Renewals due, Contracts (reopen, blend-and-extend), idled rigs, greyed card choices and the report's Act III
block → the chapter report with the scenario reveal. Or finish your own Act II game and press "Continue to Act III (test build)".
`?scenario=s0…s3` forces a scenario (tagged in the top bar; leave it off for real playtests). From the iPad on the same Wi-Fi:
`npm run staging:build`, then `npm run staging -- --host`, open the printed address. Nothing of this is in the GitHub Pages build.
**Known gaps (M13 answer 6, left out on purpose):** layout polish; the renewal-wall chart, sparklines, the reveal timeline; rich
tooltips, onboarding tips, sounds, animations; A3-07 racks, A3-08 nuclear, A3-09 Government (steps 5–6); A3-12 presets and Scenario
Mode; the reading score. Also: the automated DOM click-through (STOPPED: needs a dependency).

Split by the design thread, run back to back (owner): `19ce271` docs commit (wireframes A3-01…A3-12, design-system grid theme, doc 30);
M13.1 the gate, the entry and the intro; M13.2 the panels; M13.3 the chapter report with the reveal.

**M13.1 done (the gate, the entry, the intro):** `src/platform/preview.ts`: `ACT3_PREVIEW = import.meta.env.MODE !== 'production'` (on in `npm run dev` and the staging build, off in `npm run build`), the save guard `guardTestBuildSave` (saves.ts decode/import/slots and `g2g.load`: an act-3 save outside a test build → "This save comes from a test build and can't be loaded here."), `forcedScenario` (`?scenario=s0…s3`, test builds only; `toAct3(…, {forced})` marks `scenarioForced`, and the top bar shows "Scenario forced (test)"). The app loads `screens/Act3Preview.tsx` (quick start, "Continue to Act III (test build)" on the Act II chapter report, the A3-01 intro, a stub chapter screen) with a dynamic import behind `import.meta.env.MODE !== 'production'` written inline in app.tsx (mine: reading the ACT3_PREVIEW constant left an orphan chunk in dist/), so production has no preview chunk, no bots and no marker: **the build check is a test** (`tests/ui/act3Gate.test.ts` builds production and staging into temp folders and greps for `PREVIEW_MARKER`). Quick starts (`src/ui/act3QuickStart.ts`): Growth = sign-then-raise 1, GPU-heavy = overleveraged 1, **Shell landlord = texas-shell seed 3** (mine, reversible: no shell-climb or texas-shell seed 1 has a shell lease ending in 2027–30; seed 3 is the lowest that does, 2030Q1); each plays in under a second. Grid theme ported; Act III uses it. Act II's panels now show in Act III (Plan MW panel, hosting/fleet/scouting rows, Capital, regions, league scale, the Projects nav: `inAct2Rules`); two crashes fixed on the way (`averagePrice` and `recentMarket` read Act I/II's weekly market only; now through `marketWeek` with the scenario), and the last report says "Finish Act III →". A quick-start GPU-heavy company played 2027Q1 → 2030Q4 in the browser (dev) with no error. **How to run it:** `npm run dev` → title → New career → "Act III preview (test build)"; or `npm run staging:build` then `npm run staging` → http://localhost:4173; from the iPad on the same Wi-Fi: `npm run staging -- --host`, open the address it prints. Add `?scenario=s2` to the address to force a scenario (leave it off for real playtests). The act3Signals grep test now allows exactly one `toAct3` call in src/ui/app.tsx, inside the gated `enterAct3`. Goldens unchanged. 970 tests.

**M13.2 done (the panels):** `src/ui/screens/Act3Panels.tsx`, loaded on demand by `components/act3Lazy.tsx` behind the same inline gate (so production carries no Act III panel code: the build test checks it, and the main bundle stays at 488 KB, under the 500 KB warning). Top bar: the Signals strip (six short labels, value, ▲ ▶ ▼ in ink) and "Contracts due: N in next 4 Q". Plan: **Renewals due** (one card per renewal: offer with Accept · Default / Counter 2 BW (the negotiation opens inside the card; `dealNegotiationView` and `NegotiationPanel` now handle the renewal side: a multiple of today's rent, negative asks allowed) / Re-let 1 BW or "Let it go to spot"; walked state with "Re-let · automatic · 0 BW · Default" and **"Keep the MW empty"**), and the **Signals panel** (six rows with a 0–100 bar, a read range as a band with its note, "Read the market · 1 BW" opening a radio chooser, "Your reads"); Act I's Read the market row is hidden in Act III. New nav section **Contracts** (A3-04 table; "Reopen · 1 BW · fee $X" in the row when eligible, with its reason; blend-and-extend offers below with Accept / Ignore · Default). Sites & Fleet: "N MW idle" with Turn back on. Event cards: blocked choices greyed with the reason. Report: "Contracts and events this quarter" (the quarter's renewal, reopener, blend and card log lines) and "Act III · the quarter's shape". **New engine action `RENEWAL_KEEP_EMPTY`** (0 BW, a walked shell only, once; one-way, mine): the tenant leaves at quarter end, no re-let RFP; fresh offers come next quarter. Selectors: `renewalsDue` gains walkChance, mw/gpus, reletEstimateUsd, startsQuarter, keepEmpty; `contractCalendar` gains reopenFeeUsd/reopenBlocked; new `act3ReportLines`, `contractsDueSoon`, `idleRigsView`, `blockedCardChoices`. `averagePrice` takes the state (src/ui no longer reads `scenarioId` anywhere). Tests (`tests/ui/act3Panels.test.ts`): the smoke path at action level (GPU-heavy → Act III → read a signal → accept a renewal → end the quarter → the report lists it), every button's action from its panel's view, keep-empty, a source check that each button sends its action, and a grep over src/ui (no scenarioId, scenario name, hidden view, act3End, role, decoy or phase words; the M13.3 reveal file is the only exception). Played in the browser (dev): GPU-heavy quick start, read Lender Spreads, countered and took Meridian Labs' GPU renewal in 2027Q2, report line shown, Contracts section. Goldens unchanged. 979+ tests.

**M13.3 done (the chapter report with the reveal):** `src/ui/screens/Act3Reveal.tsx` (in the test-build preview module; the one UI file allowed to show the scenario, grep-tested): "The market you played was: {name}", the title, what happened (the trigger quarter and the trigger card's title), the false alarm (decoy indicator, its window, its reason and tell), your signal reads, net worth at 2030Q4 vs the Act III entry (the growth multiple), valuation entry → end, survived or not, the rivals' fates with **D15-flagged fates shown as "Fate withheld pending review"**, "Reading score: coming in a later build", Back to title. The figures come from the new `act3Outcome(state)` and `act3RevealDetails(state)` in `sim/systems/act3End.ts` (still the only sim file reading the hidden views), worked out when shown so the stored `act3End` record and the act3-s* goldens don't change; the hidden signals view gained the decoy's `reason` and `tell`. Mine, reversible: the title uses Act II's bands on the 2030Q4 valuation (Act II's bands are by valuation, so "by growth" waits for D14's scoring); a game over in Act III also shows the reveal (built when shown), marked "Out of the game". Tests (`tests/ui/act3Reveal.test.ts`): a quick-start company played to 2030Q4 by its bot on each forced scenario, the reveal's figures and texts, a game over, D15 withholding, only the reveal file reads act3End. Seen in the browser (dev): a GPU-heavy company on Lift-Off (s2), 2.06× growth. 986 tests. **End of M13:** every golden unchanged through M13; `npm run sim -- --act2 --act3` output (CSVs and tables) identical to M12.4's apart from timings.

## Milestones M11 and M12 (DONE, merged into `main` with M13 at `e364d54`; the step logs are in the archive)

M11 built the Act III scenario engine (four scenarios s0–s3, Signals, the 16-quarter timeline and `act3End`, the scenario market
behind `quarterInputs`, the Act II → III boundary `enterAct3`, Act II's systems on the scenario market via `inAct2Rules`, rivals and
league, the 37 scenario cards). M12 built the contract calendar, renewals (walk roll, offers, accept / counter / re-let), the reopener,
the step-4 card effects (`systems/cardContracts.ts`) and blend-and-extend. Key rules still in force are listed in the archive per step.


## Milestones M8, M8.7, M8.8, M8.9 and M9 (finished; the step logs are in the archive)

M8 finished Act II (the report additions, the GPU failure wave, the know-how display, measurement decisions, the hosting head start,
the sell-as-mined bust). M8.7 did the follow-ups (EV/MW band $18–28M, the hosting bot's cost reserve, slot log lines, one report panel,
the bridge payment on the Plan and Capital screens). M8.8 audited what Act III could carry over (`docs/act3-carryover-audit.md`). M8.9
recorded the design thread's answers to that audit. **M9** (branch `m9`, in `main`): M9.0 the runway look-ahead (one figure on the
Dashboard, Plan and Capital screens; the rating rule unchanged; see `docs/act3-carryover-audit.md` and the archive for the sim numbers);
M9.1 the `inActII` / `isActIIQuarter` refactor (a pure refactor: the Act II sim's output was byte-identical before and after); M9.2 the
sim's great-path runway check now uses the same `runway()` function as the game, and the runway definition is in scope 0.2 §2.2 (both
copies). All design decisions from the M9.1 audit (7 questions) are accepted; see the archive for the full list.
