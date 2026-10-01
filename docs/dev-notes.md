# Dev notes: where the build stands

The running record of where the build stands, the rules in force, open questions and what's next. It exists so
any Claude account or machine can pick up the work with no chat history. **Read `CLAUDE.md` first, then this
file.** The full history (every finished step, balance review, milestone and report, with the decisions in detail)
is in `docs/dev-notes-archive.md`: read it only when a task needs the history.

Last updated: 30 Sep 2026. Act I, Act II and the Prologue are all built and done. Act III's engine is being built (M10 skeleton, M11
scenario engine, M12 contracts and renewals, **M13 a test-build route in with bare-bones panels: DONE on branch `m13`**). Act III
is reachable only in test builds (`npm run dev`, the staging build), never in the GitHub Pages build. See "Next" and the M13 section.

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

None open. The five M11.5c card questions (reveals, corporate debt, idle_mw / mining_revenue_mult, the cash formulas,
whole-choice deferral) were answered by the design thread in the M12.3 spec and built in M12.3 (`debt` waits for step 7's
corporate facility; `ppa_savings` step 6; the capex formulas step 5; the mapping table is in `docs/act3-content/README.md`).

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

## Small follow-ups

- An ear test of the sounds; the 4 sample fallbacks if a synth sound is wrong.
- (Done, 29 Sep 2026) The big JS chunk is split: `vite.config.ts` puts the market data, card text, other content JSON and
  libraries in their own files, and the prologue screens load only when a prologue game starts (`LazyPrologue` in `app.tsx`).
  Every file is under 500 KB (main 444 KB) and the Vite warning is gone.
- The ASIC $/TH tiers, SOFR and spread series are estimates (doc 18 §15): pull real data before final balance.
- Backlog idea (design thread): the pitch opening reacts to company performance (era EV/EBITDA × trailing EBITDA, ±30%).
- Power and capital project slots have no log line, so the report's "milestones" only show the tenant slot (mine, reversible).

## Next

**M15 is done on branch `m15`** (M14 is merged into `main`): the full A3-11 chapter report with the reveal timeline and the reading
score, the M14 classification answers, the new-lease index seam fix, component tests. Next: the step-5 spec (the design thread writes it
after the M15 report; the data notes are in the M15 section), the owner's staging playtest, then step 6, step 7 with A3-12, and later: steps 5–6 (density, Rubin, nuclear, political capital, wildcards), step 7
(the corporate facility for `debt`, balance F-6, F-7), the reading score and net-worth scoring (D14). The Act I playtests stay postponed.

## Milestone M10: the Act III walking skeleton — DONE (branch `m10`; the step log is in the archive › "Milestone M10")

Plumbing only (`isActIII` / `inActIII`, save version 4, the timeline extended past 2026Q4); the stub content it used was replaced by
the real scenario files in M11.3.

## Milestone M16 (branch `m16`, from `main` at `d5a753f`; Act III step 5: density tiers, retrofits, Rubin, new halls, A3-07)

Split by the design thread, run in one go: M16.0 fixes before step 5 (move-log kinds project_delay / project_accelerate /
cash_reserve, the s2 GPU-rent seam data, the chapter-report answers 2/5/6, D15 cards don't fire, the leak-guard addition);
M16.1 content and generations (gpus_act3.json copied, Rubin and Rubin Ultra buyable in Act III, `BALANCE.act3.density`); M16.2
hall tiers (state, entry, new halls, fit rule, shell rent by tier); M16.3 RETROFIT and REFIT_GPUS with the downtime rule; M16.4 the
step-5 card effects; M16.5 the A3-07 screen; M16.6 tests and the sim proof (payback table, retrofitter row).

**M16.0 done:** kinds `project_delay` (−1), `project_accelerate` (+1), `cash_reserve` (−1, a card choice of only debt + the same cash: s0_c2's revolver); s2 2027Q1/Q2 H200 and GB200 rents set (the seam test passes, no pins); chapter report: reads list and description inside "How this was scored", "Not enough quarters played" headline; a D15-flagged card doesn't fire (the withheld display stays as a safety net); leak guard with played history to 2028Q2 (mine: the trigger card's title may show, nothing else). Goldens unchanged. 1049 tests.

**M16.1 done:** `gpus_act3.json` copied (content test); `CONTENT.act3Gpus` (Rubin 900 / Rubin Ultra 1,050 GPUs/MW, tier rack sizes, low→mid $1.5M/MW 10 wk, mid→top 26 wk) and each scenario row's `act3` extras (Rubin prices and rents, lead time, mid→top $/MW); Rubin buyable from 2027Q1, Rubin Ultra from its first priced quarter (rack ÷ 144), rents and contracts and the renewal index on the B200's channels; `gpuLeadTimeWeeks` (mine: Rubin takes the B200's 6 weeks once Rubin Ultra is newest); `BALANCE.act3.density`. Goldens unchanged. 1055 tests.

**M16.2 done:** `Project.tier` (Act III only; `systems/density.ts`): carried tiers at entry and for old Act III saves, new halls mid / GPU tier / top ("Build to top tier", PROJECT_OPEN `topTier`, from 2027Q3, not pilots: + 0.6 × mid→top $/MW × MW and +1 build quarter; mine: Rubin Ultra makes a hall top by itself), the fit rule, shell rent × tier from 2027Q3 on new leases, re-lets, renewal offers (mine: also the renewal counter's limit and a card's rolling spot lease). Goldens unchanged (no golden company has a project); act3Rules' passive company now ends S3 $347.8M < S1 $355.8M (all-low shells, never retrofitted): test adjusted, reported. 1068 tests.

## Milestone M15 (branch `m15`, from `main` at `baf9dd3`; the Act III chapter report, full screen A3-11) — DONE

Split by the design thread, run in one go: M15.0 the A1/A3/A5 move classifications; M15.1 the new-lease index seam fix (data);
M15.2 the test dependencies (approved by the owner pasting the spec); M15.3 the reveal record additions; M15.4 the screen; M15.5 tests.
**Design-thread answers (1 Oct 2026):** A2, A4, A6–A8 confirmed as built (deferred card choices log by their authored effect; a default
choice the player or bot picks is logged). **D2 → step-7 checklist:** doc 28 anchor 4 (S3 flexible ≥ long-locked) must hold with the
default card choices; if it fails, fix the reopener and re-let pricing, not the cards. **E (D15):** the owner does the editorial review
with legal counsel before any public release of Act III; until then the two s1 fates stay withheld in every build. **Order after M15:**
step 5, step 6, then step 7 with A3-12. **Step-5 data already in the files (owner, 1 Oct 2026):** low→mid retrofit $1.5M/MW over 10 weeks
(`gpus_act3.json › density_rules`); mid→top per quarter and scenario in the market CSVs (`capex_retrofit_density_mid_to_top_usd_mw`,
$6.58–7.0M/MW early), 26 weeks; rack density Hopper 40 kW (low), Blackwell 125 kW (mid), Rubin NVL144 190 kW (mid), Rubin Ultra 600 kW
(top); GPUs per MW 650 / 760 / 900 / 1,050; Rubin NVL144 rack $4.4M at 2027Q1, $61k per unit, Rubin rent columns; Rubin Ultra rack
$15M from 2027Q3 (blank before = not available); new-hall capex from the Act II capex columns (greenfield shell $18.7–19.0M/MW at 2027Q1).

**M15.0 done (move classifications, A1/A3/A5):** new kinds `asic_buy` (+1), `retrofit` (+1), `power_lock` (+1, a nuclear or fixed
PPA card choice), `hedge` (−1, a backstop); ASIC sales and player treasury sales → `sale_voluntary`; a won auction → `site_buy` (a lost
bid: nothing). Labels in en.json. Goldens unchanged (the golden scripts make none of these moves). 1021 tests.

**M15.1 done (the new-lease index seam, data only):** `rfp_new_lease_index_low/high` 2027Q1 = 0.88 / 1.04 in all four scenarios, 2027Q2
halved toward it (s0 0.885/1.045, s1 0.85/1.01, s2 0.925/1.085, s3 0.87/1.03), docs and src copies byte-identical, JSON regenerated
(`npm run content:market`), provenance note, the wireframe README's conflict 2 marked fixed, `docs/act3-content/README.md` logs it.
The 3% seam test (`tests/sim/act3Seam.test.ts`, (max − min) / mean at 2027Q1): **fails, pinned for the step-7 checklist:**
`gpu_h200_hyperscaler_usd_hr` 5.9%, `gpu_h200_neocloud_usd_hr` 5.9%, `gpu_gb200nvl72_blended_usd_hr` 3.1% (all s2 high); everything else
within 3% (blank columns skipped: A100, Rubin Ultra, nuclear at 2027Q1). Goldens unchanged (no golden company signs a new lease). 1023 tests.

**M15.2 done (test dependencies, owner-approved):** dev dependencies `happy-dom` 20.14.5 and `@testing-library/preact` 3.2.4, nothing
else. Component tests are `tests/**/*.test.tsx` with `// @vitest-environment happy-dom` per file (every other test keeps node);
`tsconfig.tools.json` gains `jsx` (preact) and the DOM lib; `tests/ui/happyDom.test.tsx` proves the setup. 1025 tests.

**M15.3 + M15.4 done (one commit: the screen is the record's only reader):** the reveal record gains `trigger` {q, cardId},
`decoy.fromQ/toQ`, `moves` [{q, kind, sign, mark}] (marked in `act3End.ts` from the hidden file), and `withheld` on each rival fate
(d15_review and not `d15_cleared`; `rivalsHidden.ts` and event cards accept an optional `d15_cleared`, none set; an event card with
d15_review would show "Withheld pending review" in play). `act3RevealDetails` is gone: the narratives are in en.json as
`act3.reveal.s0–s3.{trigger,decoy_reason,decoy_tell}` (a test keeps them word for word with the signals files). The chapter report
(`Act3Reveal.tsx`) is rebuilt to A3-11: header (or "Out of the game · {quarter}") and the scenario name; the reading title as the
headline; what happened (trigger line + narrative); the false alarm (indicator, window, reason, tell); the reveal timeline (inline SVG:
16 ticks, labels 27Q1/28Q1/29Q1/30Q4, the trigger rule and label, the hatched decoy band, move markers stacked per quarter with ✓ / ✗ /
hatched ✗ / – glyphs, labels only with ≤ 4 moves, a game over greys later ticks with an "Out" marker and "(after you left)" on a later
trigger, "You made no big moves." when empty; `aria-hidden` inside a figure labelled "{n} moves; {m} matched") with the moves list under
it; the reading score ("/ 100" or "—" with the not-enough line, the base and penalty line only with a penalty, the five band chips with
ranges and the player's filled, the wording in quotes, the description, and the collapsed "How this was scored" 16-cell strip of
stance over ideal shaded by points, weight-0 cells "not scored" and after a game over "not played"); the stats (net worth, at entry,
growth ×/▲▼, survival, career title); the rivals; "The story continues…" + Continue. Mine: the M13 "your signal reads" list is not on
the new screen (not in A3-11 or the spec). **Goldens:** the four act3-s* gain only `trigger`, `decoy.fromQ/toQ`, `moves` and the
`withheld` flags. Component tests (`tests/ui/act3Report.test.tsx`, happy-dom): the s1 golden record, s0 with a penalty, s1 out at
2027Q3, s2 out at 2027Q2 (null score), no moves, 12 moves, ≤ 4 moves. 1036 tests.

**M15.5 done (tests and the browser run):** the leak guard (`tests/ui/act3Leak.test.tsx`: Plan with the Act III panels, every
left-nav section, Live, Report and the intro, at 2028Q2 in each scenario, contain no scenario name, trigger title, decoy reason or tell,
nor "decoy" / "false alarm"; the fixture has no played history, because a trigger is also an event card the player sees when it fires)
and the D15 guard (an event card flagged for review shows "Withheld pending review" in play; the rivals' flags are in the reveal tests;
nothing carries `d15_cleared`). `tsconfig.tools.json` includes `src/ui/audio/zzfx.d.ts` (the tests now import the Live screen). Browser
run (dev server, not staging: `npm run staging:build` is still denied for me; same test-build gate): Growth on s0 (76, Signal Reader,
1 move), GPU-heavy on s1 (50, no moves, both D15 fates withheld), Shell landlord on s2 (56, a ✓ in the trigger quarter), Growth on s3
(53, ✓ ✗ –). Two layout fixes from it (mine): unscored cells in "How this was scored" show "–" (the legend says so; "not scored" is
the hover text) instead of overflowing, and every other timeline label sits a row higher. **Sim** (`--act2` CSVs and table identical):
`--act3` 41 game overs (was 40: texas-capital +1 foreclosure in s1, from the new-lease index change); reading by scenario (median / p10 /
p90 / null / median moves): s0 75 / 62 / 76 / 0% / 1; s1 50 / 24 / 50 / 1% / 1; s2 56 / 53 / 66 / 0% / 3; s3 53 / 11 / 53 / 0% / 5; the
oracle (78/50/50/50, 78/100/100/100) holds. **M15 done:** 1025 → 1041 tests.

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
