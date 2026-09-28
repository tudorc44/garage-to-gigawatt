# Dev notes: where the build stands

The running record of where the build stands, the rules in force, open questions and what's next. It exists so
any Claude account or machine can pick up the work with no chat history. **Read `CLAUDE.md` first, then this
file.** The full history (every finished step, balance review, milestone and report, with the decisions in detail)
is in `docs/dev-notes-archive.md`: read it only when a task needs the history.

Last updated: 29 Sep 2026. **Milestone M8 (finish Act II) is done on branch `m8`** (made from `main`'s line: `main` +
the prologue dev-notes refresh + two Act II commits that were only on `act2`). Act I, Act II and the Prologue are all
built. **Next: the owner reviews `m8`, pushes it and merges it into `main`** (`act2` is stale and can be dropped).

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

**Numbers (end of M8):** 707 tests pass; lint and build pass; the 11 Act I goldens and both prologue goldens unchanged.
Act II §5 (50 seeds): 6 PASS, 3 accepted MISS, 2 MISS (overleveraged, EV/MW asic-retirer band edge). Prologue §5: all PASS
(296/300 runs reach 2026Q4; the other 4 end in the prologue). Tables: `npm run sim -- --act2` / `--prologue`, and the M8 report below.

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
- **M8 answers (28 Sep 2026):** accepted MISSes (no tuning, no JV lever): good path $412M, lifeline 61/120, preset $181.9M;
  the overleveraged target counts an emergency raise; EV/MW skips "no mining left"; 15× floor stays; prologue: sale cap for prologue
  starts only, loan cap for all, automatic move back home (4 prologue busts left), offers stay until the next decision quarter,
  "Empty garage" wording stays, auto-play starts at 2×.
- **GPU failure wave (M8.4):** live full-stack cloud with ≥ 10,000 GPUs (13.3 MW), 10% a quarter, 0.5–1% of its GPUs (rounded up);
  replace now $30,000 each (default) or run short (out for the rest of the quarter and the next; a contracted tenant gets a 2× SLA
  credit; the bill is paid at the end of the next quarter); counts toward the 3 interrupts; with the cap full it resolves silently with
  the default. Numbers in `interrupts_act2.json › gpu_failure_wave`, both copies.

## Open questions for the design thread

The M8 questions (with recommended answers) are in the M8 report below.

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

The owner reviews `m8` (npm run dev → Start at Act II; the sims), pushes it and merges it into `main`. Then: the design thread's
answers to the M8 questions; the Act I playtests (postponed until after Act II); Act III is not started.

## Milestone M8: finish Act II (branch `m8`, batch mode, 29 Sep 2026)

Split: M8.0 setup · M8.1 measurement decisions + the sell-as-mined bust · M8.2 the hosting head start · M8.3 quarter report
additions · M8.4 GPU failure wave · M8.5 GPU know-how display · M8.6 auto-play default, sims, scope docs, report.
- M8.0: the prompt said `main` = `prologue` (6131d17): it wasn't (`main` 96fd44a; 6131d17 only on the local `prologue`; `act2` had two
  commits `main` lacked). So `m8` = local `prologue` + those two cherry-picked (mine, reversible). CLAUDE.md updated.
- M8.1: accepted MISSes; overleveraged counts `log.rescue_equity` (still 0/50); EV/MW "n/a"; 15× sentence. Sell-as-mined bust = A5's
  amortising bridge vs a bot written for a bullet (all 6 were lifeline takers), NOT an AI build; bot fix raises equity for the next
  quarter's bridge service: busts 6 → 0. Other lifeline-taking bots also bust less (shell-climb 7 → 0, shell-capital 8 → 1); their
  medians moved 10–16% only because those runs now finish as small survivors. Bots that never take the lifeline are unchanged.
- M8.2: hosting head start $37.6M → $461.8M by a bot fix only (re-let MW after a winter client default; end free-to-end hosting from
  2023Q3 so shells get room). No data or rule change. The conversion still spends all cash (4/20 runs bust in 2022Q4–2023Q1).
- M8.3: the report panel reads the previous report for "before" (no extra snapshot field); the rating's reason is stored in the report.
- M8.4 / M8.5: see "Where the build stands" and the rules above. M8.6: auto-play 2×; scope 0.2 §8 item 13 and scope 0.3 §7 updated.

The full M8 report (built, commits, how to see it, §5 tables, questions) is the last message of the M8 run; the design thread has it.

## Milestone M8.7: the small follow-ups from the M8 report (branch `m8`, from `main` at bf316f6, batch mode)

Split: M8.7a the act2 check · M8.7b the EV/MW band · M8.7c the hosting bot's reserve · M8.7d slot log lines · M8.7e one report
panel · M8.7f the bridge payment on the Plan screen · M8.7g docs, sims, report. No game rule changes (bots, tools, read-only UI,
log text and docs only). `m8` had been deleted after the M8 merge and was recreated from `main`.
- M8.7a: `git cherry m8 ef6c43e` (act2's old tip; the branch itself was already deleted by the owner): both commits `-` (already in
  `m8`), so nothing is left on act2 and there is no question to ask.
- M8.7b: the stabilized-IG EV/MW band is $18–28M (was $27M): tools/sim-runner.ts, tools/valuation-breakdown.ts comment, both scope
  0.2 copies (with the reason: asic-retirer's $27.1M is a 0.4% measurement edge). Announced-AI ($3–15M) and mining ($0.4–1.2M) unchanged.
- M8.7c: the hosting bot keeps a reserve of one quarter of costs (`quarterCostsUsd` in tools/bots.ts: salaries, power reservation and loan
  service from the sim's own weekly functions on a copy of the state, ×13, plus rent). The Merge's conversion spends all cash (a game rule,
  unchanged), so the bot rebuilds the reserve in its first Plan phases with an equity raise, "at least the reserve" because a raise is ≥ 8%
  (mine, reversible). 20 runs: busts 4 → 2 (1 inside 2022Q4–2023Q1), median $474.5M; full sim: matching bot $469M (others' median $375.3M,
  within 30%), 3/4 distinct best openings, no other bot changed. A human can choose the same reserve or go all-in (a legitimate risk: rule stays).
- M8.7d: log lines when the Power slot is filled (`log.project_power_existing/grid/gas`, written as the project opens) and the Capital slot
  (`log.project_capital_cash/project_debt/ddtl/jv/backstop`, written in the reducer via `logProjectCapital` with the amount from `debtPlan`);
  equity is the company's raise, so `log.equity_raised` joins the milestones (no project name) (mine, reversible). Read-only; text via t().
  `tests/sim/slotLog.test.ts` covers the three power and all capital types.
- M8.7e: only one `Act2Panel` ever existed (M8.3 edited 7eda74e's panel in place), one block each. One real duplicate: a signed tenant showed under
  both "milestones" and "tenants signed or lost"; it is now under tenants only. A test checks each block once and no line in two blocks.
- M8.7f: a lifeline taker did NOT see the bridge payment coming (the Capital screen had a generic note, the Plan screen nothing). Added
  `bridgeSchedule` (`systems/lifeline.ts`, pure, a test plays `payBridgeWeek` and matches it every quarter) → `bridgePaymentView`
  → `BridgePayment` (`ui/components/bridge.tsx`) on the Plan screen's Capital group and in the Capital screen's debt stack: this
  quarter's and next quarter's payment, interest only vs amortising, quarters left, "the payment steps up", "raise cash a quarter early"
  when cash < next quarter's payment; a tooltip says the payment turns amortising after the first 4 quarters (read from balance.ts).
  Runway (rating.ts) already counts the bridge as PAID LAST QUARTER (report interest + principal) but not the coming step-up, and the
  RATING rule uses runway (−1 notch under 4 quarters): not changed, reported as a question.
