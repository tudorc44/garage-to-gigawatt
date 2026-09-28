# Dev notes: where the build stands

The running record of where the build stands, the rules in force, open questions and what's next. It exists so
any Claude account or machine can pick up the work with no chat history. **Read `CLAUDE.md` first, then this
file.** The full history (every finished step, balance review, milestone and report, with the decisions in detail)
is in `docs/dev-notes-archive.md`: read it only when a task needs the history.

Last updated: 29 Sep 2026. Act I, Act II and the Prologue are all built. `main` is at `12b80d1` (through M8.9, docs). **Branch `m9`
holds M9.0 (the runway look-ahead, a rating-relevant change) and M9.1 (the `inActII` refactor, no behaviour change)**, not yet merged: the
owner's staging snapshot (`a37ef1e`) is unaffected. M8.8 and M8.9 were docs only (the audit and the design thread's decisions):
`docs/act3-carryover-audit.md` says what Act III could reuse and records the design thread's decisions.

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

The owner plays Act II on the staging snapshot (built from `main` at `a37ef1e`, so it does NOT have M9) and brings back playtest notes.
**M9.0 (the runway look-ahead) and M9.1 (the `inActII` refactor) are done on branch `m9`**; the playtest fixes are the rest of the same
milestone and start when the owner brings the notes. The owner reviews and merges `m9`. Act III design is in progress in the design thread (doc 27, now v0.2, kept in the design project; the owner will add it to
`docs/game-project-files/` when it is frozen). **Act III is NOT started in the code.** The Act I playtests stay postponed.

The design thread's answers to the M8.8 audit questions (29 Sep 2026):
1. **`inActII` helper: yes**, the first Act III step, and a pure refactor (see M9.1 below).
2. **Order of the Act III build** (nothing of it starts yet): after M9.1, a **walking skeleton first**: the act 3 boundary, the save step
   3 → 4, quarters 40–41 of a stub scenario, act 3 in the sim's `through` option, and a new Act III golden. The timeline extension is
   the expensive and riskiest part and nothing can be played or tested without it, so it is NOT last. Then: the scenario data engine and
   Signals → the contract calendar and renewals → density and retrofit → nuclear, political capital and wildcards → presets, bots and
   full balance.
3. **Bots and the scenario:** player-like bots never receive the scenario id or read future weeks; they read only what a player sees
   (the Signals as displayed). Separate **"oracle" bots** may know the scenario id, for balance ceilings only: they live in `tools/`,
   are named as oracles, and are never used in game code.
4. **Shell-lease end of term is Act III only** (M9.0 stays a display change). **"Read the market" is NOT reused for Signals:** in
   Act III it becomes a new action that reveals an authored range for one chosen indicator from the scenario file; it must never read
   the market file.

## Milestones M8 and M8.7 (finished; the step logs are in the archive › "Milestones M8 and M8.7")

M8 finished Act II (the report additions, the GPU failure wave, the know-how display, measurement decisions, the hosting head start,
the sell-as-mined bust). M8.7 did the follow-ups (EV/MW band $18–28M, the hosting bot's cost reserve, slot log lines, one report panel,
the bridge payment on the Plan and Capital screens). Both are in `main`.

## Milestone M9 (branch `m9`, commit prefix `M9.k`): M9.0 runway look-ahead and M9.1 inActII refactor are DONE; the playtest fixes wait for the owner's notes

### M9.0 runway look-ahead

The design thread's answer to the runway question is **yes, the runway looks one quarter ahead, but only at contractual amounts**, made
AFTER the owner's playtest notes so the owner's numbers stay stable while playing. Shell-lease end of term stays out of it (Act III
only): M9.0 is a display change. Spec:
1. **Runway** = cash ÷ the average quarterly burn, where the burn is last quarter's operating burn plus next quarter's contractually
   scheduled obligations that are already fixed: the lifeline bridge payment (including its step from interest-only to amortising),
   project-debt amortisation (including the principal added by capitalised interest during construction), the equipment-loan
   schedule, and any scheduled DDTL payments. **No revenue forecast**, and **no** events that may or may not happen (take-or-pay
   damages, delays, distress).
2. **The rating rule stays as it is:** a runway under 4 quarters lowers the rating one notch (`rating.ts`). Only the runway figure changes.
3. **One figure on the Dashboard, the Plan screen and the Capital screen**, with a tooltip listing which scheduled items are included
   this quarter (read-only, text through `t()`).
4. **Acceptance:** run `npm run sim -- --act2` before and after and print both §5 tables; the 11 Act I goldens and both prologue goldens
   stay unchanged; the Act I sim output is identical; expect some lifeline and leveraged bots to drop a notch one quarter earlier and
   report by how much; a §5 result that moves from PASS to MISS is a question for the design thread, not a reason to change the rule.
**M9.0 DONE.** `src/sim/systems/runway.ts` (`scheduledObligations`, `runway`): the runway is cash ÷ (the coming quarter's fixed debt payments
− last quarter's EBITDA) when that is a burn. The coming quarter is the one after the report's: the equipment and construction loans'
weekly schedule simulated from today's balances (exactly like `payLoanWeek`), the bridge's `now` / `next` payment from `bridgeSchedule`
(the step from interest-only to amortising), and project debt and DDTLs of projects live by then (interest + the equal principal slice on
the balance that already includes capitalised interest; nothing while a project still builds). `ratingInputs` now reads it; its rule is unchanged
(under `runwayQuarters`, one notch). Shown by `Runway` (`ui/components/runway.tsx`) on the Dashboard, the Plan screen's Capital group and the
Capital screen's rating card, with a tooltip listing the included items and what is not counted. "Average quarterly burn" is read as the
burn of the coming quarter, not a two-quarter average (mine, reversible). `tests/sim/runway.test.ts` (6 tests).
Result (50 seeds, `npm run sim -- --act2`, before vs after): every printed table (§5 included) and all 1,302 CSVs are IDENTICAL, because nothing
in the bots reads the corporate rating. The ratings themselves DID move (30 seeds × 11 bots, one notch at most, never more): short-runway
quarters lifeline-shell 154 → 221 (60 quarters end one notch lower, all 30 runs), asic-retirer 17 → 47 (31, 27 runs), sign-then-raise 34 → 62
(28, 24 runs), texas-capital 43 → 70 (31, 25 runs), overleveraged 54 → 85 (20, 20 runs), shell-capital 38 → 54 (17, 17 runs), raise-climb 40 → 46 (6);
the runway got LONGER for hosting-switcher 49 → 40 short quarters, texas-ipo 32 → 24, shell-climb 28 → 25, texas-shell 72 → 68.

### M9.1 inActII refactor (the first step towards Act III)

A **pure refactor**: add `inActII(state)` (and later `inActIII`) and change the 38 `state.act === 2` / `!== 2` checks and the 32
`act2Quarter` calls to go through it, with **no behaviour change**. Proof required: all 11 Act I goldens, both prologue goldens, the
Act II sim output (`npm run sim -- --act2`, same seeds) and the Act I sim output identical before and after. Where a check needs a real
yes or no for Act III (for example "does this rule still apply in Act III"), do NOT decide it: list each one in the report as a question
with a recommended answer, and keep today's behaviour. See `docs/act3-carryover-audit.md` §4 and §10 for where the checks are.

**M9.1 DONE (branch `m9`, commit prefix `M9.k`).** `isActII(act)` / `inActII(state)` in `src/sim/state.ts` and `isActIIQuarter(quarter)` in
`src/content/index.ts` (the yes/no form of `act2Quarter`). All 46 `act === 2` / `!== 2` checks (sim, UI, tools) and the 16 yes/no
`act2Quarter` checks go through them (46, not the audit's 38: newer code added some). The other 14 `act2Quarter` calls READ Act II's
data (`?.field ?? default`), so they stay as they are (mine, reversible); Act III will need a scenario-aware accessor for those.
Proof: 725 tests (11 Act I goldens and both prologue goldens included) pass, and `npm run sim -- --act2` (same seeds) printed
output and all 1,302 CSVs are byte-identical before and after. `tests/sim/inActII.test.ts` checks the helpers against the old checks.

## Milestone M8.8 (branch `m9`, from `main` at a37ef1e; docs only)

- M8.8a: the runway answer recorded and queued as M9.0 above; "Next" and "Open questions" updated; the M8 / M8.7 logs moved to the archive.
- M8.8b: read-only audit of what Act III could carry over: `docs/act3-carryover-audit.md` (no game code, content or test changed).
  Summary: a hidden-scenario draw, a contract calendar, a nuclear PPA Power-slot option and wildcards are cheap; the scenario-dependent
  market, Signals panel, renewals, density retrofit, political capital and presets are medium; extending the timeline is expensive.

## Milestone M8.9 (branch `m9`, from `main` at effe2d4; docs only)

- M8.9a: the design thread's answers 1–4 recorded under "Next"; the queued entry renamed "M9 (after the owner's playtest)" with M9.0 and a
  new M9.1 (the `inActII` refactor). M8.9b: a "Design thread decisions" section in `docs/act3-carryover-audit.md` with the answers and the
  open Act III design decisions waiting for the owner (doc 27 v0.2). No game code, content or test changed.
