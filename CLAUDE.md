# CLAUDE.md — Garage to Gigawatt

## Project summary

Garage to Gigawatt is a turn-based, finance-first business sim played in a desktop browser (1024 px wide and up).
A career runs from a bedroom in 2009 to an AI-campus operator in 2030, in acts of quarterly turns. Each turn is
Plan phase → Live quarter (13 weekly ticks, pausable, up to 3 interrupts) → Quarter report; each act ends in a
chapter report. Money, debt, power, Heat and rivals are simulated; prices and events follow scripted data.

**Status (10 Oct 2026): the Prologue, Act I, Act II, Act III and Act IV are built and merged into `main` (public on
GitHub Pages). Act IV ("The Race to Orbit", doc 33 with the owner's defaults in `docs/act4-scope.md`) came in M27–M34;
the energy options and ventures (doc 38, `docs/energy-content/`) in M35–M36. Act IV's balance targets B3, B4, B6, B8,
B13 and the energy target E-B2 are recorded misses, accepted by the design thread (dev-notes, "Milestones M35-M36").**
- **The Prologue** (Alpha 0.3, Act 0, "Bedroom to Garage"): 32 quarters, 2009 → 2016, optional from the title screen,
  handing over to Act I. Scope in `docs/alpha-0.3-scope.md`.
- **Act I** (Alpha 0.1, "Garage to Hashrate"): 23 quarters, 2017Q1 → 2022Q3. $10k and an empty garage; machines,
  a site ladder (garage → 100 kW → 1 MW → 20 MW → Texas 100 MW), HODL/sell, loans (crypto-backed ones can
  margin-call), hires, community Heat, fundraising, 4 scripted rivals; ends at the Merge decision.
- **Act II** (Alpha 0.2, "The Pivot and the Boom"): 17 quarters, 2022Q4 → 2026Q4, from an Act I save or a preset. The
  miner turns its energized MW into AI data-center capacity through projects (power, tenant and capital slots), a credit
  rating and five MW uses. Scope **frozen (v1.0)** in `docs/alpha-0.2-scope.md`.
- **Act III** ("Reckoning"): 16 quarters, 2027Q1 → 2030Q4, from a finished Act II or one of three preset companies,
  on one of four hidden market scenarios; scored on net worth and a reading score, revealed in the chapter report;
  Scenario Mode unlocks after one finish. Design: doc 27 v1.2 (its §17 records every change from the build); balance
  pass closed (4 Oct 2026); public since M20.
- **Act IV** ("The Race to Orbit"): 20 quarters, 2031Q1 → 2035Q4 (quarters 56–75), from a finished Act III or one of
  three preset companies, on one of four hidden futures plus a hidden lunar grade. Three theatres on one balance sheet:
  Ground, Orbit (compute blocks launched on scarce manifests) and the Moon (claim, prospect, pilot). Ends in a chapter
  report with the reveal, then the campaign finale. Scope: `docs/act4-scope.md`; design: doc 33.
- Playtests: the owner's Act III playtest and the Act I playtests are still to come.

## Commands

```bash
npm run dev       # play in the browser: start the dev server and open the printed localhost URL
npm run build     # type-check (tsc -b) and build to dist/ (the production build GitHub Pages serves)
npm run preview   # serve the built dist/ locally
npm run staging:build  # the owner's snapshot: build the game into staging/ (only the owner runs this); keeps g2g
npm run staging   # play the staging snapshot at http://localhost:4173, or from the local network at the printed Network URL
npm test          # Vitest: unit tests per system, component tests, golden replays
npm run lint      # ESLint (also enforces the pure-sim rules below)
npm run play      # the terminal game (Act I, then Act II; options: -- --seed 42 --fast)
npm run sim       # sim-runner: bots × 50 seeds → CSVs + summary in sim-output/; add --out <dir>
npm run sim -- --act2 --act3   # also Act II to 2026Q4 and every Act III run (~55 min); the byte-identity check
npm run sim -- --act3-anchors  # Act III archetypes × scenarios × 30 seeds, the anchor table (~15 min)
npm run sim -- --prologue      # the prologue bots and the scope 0.3 §5 table
npm run sim -- --act4 --seeds 10  # Act IV archetypes × presets × futures × lunar grades, the B1-B14 table (~30 min)
npm run content:market  # regenerate the market JSON files after editing a market CSV
```

## Key docs (read before bigger tasks)

- `docs/dev-notes.md`: **read this first in a new session.** Where the build stands, the rules and decisions in
  force, open questions, STOPPED items and what's next. The finished history (every step, balance review and
  milestone in detail) is in `docs/dev-notes-archive.md`: read it only when a task needs it.
- **Act I:** `docs/alpha-0.1-scope.md` (scope), `docs/content-pack-review.md` (its §4 amendments A1–A9 override the
  scope doc where they differ), `docs/player-actions-and-pacing.md`, `docs/act-i-content-pack.md`, `docs/act1-content/`
  (the original pack; the game's live copies are in `src/content/`).
- **Act II:** `docs/alpha-0.2-scope.md` (scope, v1.0 frozen; its §8 lists where it corrects doc 18). Reference copies in
  `docs/game-project-files/` (read-only): `claude_18-act-ii-design.md`, `claude_20-alpha-0_2-scope.md` (kept identical to
  the scope doc), `claude_21-act-ii-wireframe-prompt.md`, `claude_act2-content_*`. Corrected data in `docs/act2-content/`
  (it replaces the game-project-files copy where a file exists; see its README). Wireframes:
  https://claude.ai/artifact/LVnSiEH9RRHtU16Ld4C59S.
- **Act III:** `docs/game-project-files/claude_27-act-iii-design.md` (doc 27 v1.2: the design, decisions D1–D17, §17
  the build's changes), `claude_28-act-iii-content-pack.md` (doc 28), `claude_30-act-iii-wireframe-prompt.md` (doc 30),
  `docs/act3-content/` and its **README** (the source files; every data change is logged there), `docs/wireframes/act3/`
  (A3-01 … A3-12), `docs/act3-carryover-audit.md`.
- **The Prologue:** `docs/alpha-0.3-scope.md` (wins over `claude_26-alpha-0_3-scope.md`), `docs/prologue-content/`,
  `docs/wireframes/prologue/`.
- **Act IV:** `docs/act4-scope.md` (**source of truth for Act IV scope**: the owner's approval, defaults, milestone plan,
  targets B1–B14, cut order and "Changes from doc 33"); `docs/game-project-files/claude_33-act-iv-design.md` (doc 33, the
  design, IV-D1–IV-D33), `claude_31-act-iv-research-dossier.md` (doc 31, the evidence), `claude_32-act-iv-concepts.md`
  (doc 32), `claude_34-act-iv-build-prompt.md` (the owner's run prompt); `docs/act4-research/` (the cost model and its
  results); `docs/act4-content/` and its **README** (the source files; every value flagged sourced, derived or designed);
  `docs/wireframes/act4/README.md` (the layout notes; no wireframes exist).
- **Architecture and style:** `docs/tech-stack.md`; `docs/design-system/README.md` and `docs/design-system/tokens.css`
  (**source of truth for UI style**: tokens, era themes, fonts, colours, components; `docs/design-system.md` records
  the decisions); `docs/wireframes-spec.md` (**source of truth for screen layout and flow**); `docs/mockups/q4-2017.html`
  (the approved visual target for the Plan, Live and Report screens); `docs/design-brief.md` (vision and the four acts,
  background only).
- `src/ui/audio/` holds the sound code (`docs/audio/audio-notes.md` stays as the reference).

## Architecture rules (non-negotiable)

### Simulation core: `src/sim/`
- **Pure TypeScript.** No DOM, no `window`/`document`, no timers (`setTimeout`, `setInterval`,
  `requestAnimationFrame`), no `Date.now()`, no `Math.random`.
- **Never imports from `src/ui/`** (or `src/platform/`). Dependencies only point inward: ui → sim, never sim → ui.
- **All randomness comes from a seeded RNG stored in the game state** (`src/sim/rng.ts`; new randomness gets its own
  `substream(seed, label)` so older games never change). Same seed + same actions must always produce the same game.
- State is one plain, serializable `GameState` object. Player decisions are action objects applied by a reducer.
  Time advances via `advance(state) → state` (one week per call, 13 per quarter).
- Money is plain numbers in dollars. Formatting ("$1.24B") belongs in the UI, not the sim.
- Must be runnable in Node (tests, the sim-runner, the terminal game).

### Content: `src/content/`
- **All game content is data**: machines, sites, events, hires, rivals, price paths, balance constants.
  Don't hardcode numbers or event text in sim or UI logic; read them from content files.
- Content files are validated against Zod schemas (`src/content/schemas.ts`) when the game loads.
- Copies that must stay byte-identical (a test checks): the Act II files in `src/content/` and `docs/act2-content/`, the
  Act III files and `docs/act3-content/`. Edit both, and log data changes in that folder's README.

### UI: `src/ui/`
- Preact components. The UI reads state and dispatches actions; it never computes game rules itself
  (`src/sim/selectors.ts` holds the read-only views it uses).
- Styling uses CSS custom properties (design tokens), with no CSS framework. Era themes via `data-theme`.
- From 1024 px wide up: no sideways page scroll, no value cut off (M21.1); wide tables scroll inside their panel.
- Act III's screens load lazily in their own chunks; the main bundle stays under Vite's 500 KB warning.

### Text: `src/i18n/`
- **All player-facing text goes through `t('key')`** backed by a string table (`en.json`). No raw English
  strings in components or sim output. English only for the alpha.
- Every key appears once (a test checks: a repeated JSON key silently overwrites the first).
- Numbers and dates are formatted with `Intl`.

### Act III rules that must hold
- **Hidden files:** the scenario's secrets (`signalsHidden.ts`, `rivalsHidden.ts`, `reading_score.json`) are read only by
  `src/sim/systems/act3End.ts` (the reveal) and `readingScore.ts`, by tests and by `tools/`. A grep test enforces it.
- **The leak guard:** no screen during play shows a scenario name, trigger, decoy reason or tell, or a role tag; only
  the chapter report (`Act3Reveal.tsx`) shows the scenario (tests in `tests/ui/act3Leak.test.tsx` and friends).
- **The D15 guard:** a rival fate or card flagged `d15_review: true` shows only with `d15_cleared: true`; every shipped
  flag must be cleared (a content test). The owner cleared both s1 fates on 4 Oct 2026 (M20.1); fate texts are kept as
  authored, under the line "Rival fates are scenario illustrations, not predictions."
- **Test-build only:** the `?scenario=` forcing and its top-bar tag, and the quick-start companies ("Act III preview
  (test build)"), behind an inline `import.meta.env.MODE !== 'production'` check. Production refuses a save marked
  forced or quick-start. **The gate test** (`tests/ui/act3Gate.test.ts`) builds production and staging: production has
  the Act III chunks but neither marker, staging has both, and the main bundle stays under 500 KB.

### Act IV rules that must hold
- **Hidden files:** `reading_score_iv.json`, `lunar_truth.json` and `orbit_truth_iv.json` are each read only by their own
  sim system (`readingScoreIv.ts`, `lunarGeology.ts`, `fleetReliability.ts`); `readingScoreIv.ts` and `signalsHiddenIv.ts`
  only by `src/sim/systems/act4End.ts`; plus tests and `tools/`. The grep tests enforce it.
- **The leak guard:** no Act IV screen during play shows a future's name, trigger, decoy reason or tell, the true orbital
  reliability or the true lunar grade; views (`orbitViews.ts`, `moonViews.ts`) show estimates (prospect reports, fleet
  telemetry) only. Only the Act IV chapter report (`Act4Reveal.tsx`) and the finale reveal them.
- **No lunar output or lunar cost cut inside the act:** no production plant produces anything before the act ends, and
  lunar supply never lowers an orbital cost in 2031–2035 (the "after 2035" panel and the epilogue only). Tests assert both.
- **The common 2031 baseline:** every market value the UI can show is identical across the four futures in 2031Q1–Q2 and
  within ±3% through 2031Q4 (B14); the seam glide from the Act III 2030Q4 values ends on that baseline, never on a
  future's own path. A test asserts it.
- **Test-build only:** the `?future=` forcing and its top-bar tag, and the "Act IV preview (test build)" quick starts,
  behind the same production gate as Act III; production refuses such saves.

### Standing invariants (check them at every milestone)
- **Goldens:** Act I ×11, the prologue ×2, Act II, act3-s0…s3 and act4-f1…f4 (`tests/golden/`). A golden change must be the intended
  effect of the sub-step and be explained; accept it with `npm test -- -u tests/golden-replay.test.ts`.
- **Byte-identity:** `npm run sim -- --act2 --act3` CSVs stay byte-identical across changes that add no rule.
  Check it only when a milestone changed `src/sim/` or `src/content/`; otherwise the goldens are enough.
- Saves: `tests/fixtures/saves/v1-*.json` are real old saves: keep them, never reformat them.

### Layout
```
src/sim/        state.ts, actions.ts, advance.ts, rng.ts, selectors.ts, replay.ts, systems/*.ts
src/content/    *.json, *.csv, balance.ts, schemas.ts, index.ts (loads and validates everything as CONTENT)
src/ui/         app.tsx, screens/, components/, styles/, audio/
src/platform/   browser storage (saves, settings) and the build gate (preview.ts)
src/i18n/       en.json, content.en.json, t.ts
tools/          sim-runner.ts, bots.ts, play.ts, the Act III harnesses
tests/          sim/, ui/, golden/, fixtures/
```
Create new folders only as a task needs them.

## Working rules for Claude

1. **Small tasks.** Work on one system or one screen at a time. If a request touches several, propose splitting it
   and do the first part.
2. **Explain in plain language.** The owner is a beginner. After each change, summarise which files you changed
   and what each change does, and say *why*, without jargon (or define it briefly). Say how to see or test it
   (e.g. "run `npm run dev` and click End Quarter").
3. **Ask before adding any dependency** (npm package, CDN script, tool). Say what it's for and whether there's a
   no-dependency option.
4. **Scope guard.** The scope docs (`alpha-0.1`, `alpha-0.2` frozen v1.0, `alpha-0.3`, `act4-scope.md`), doc 27 and doc 33
   decide what gets built.
   If a request falls outside them, say so and push back politely. Offer to add it to the backlog, or to swap it for
   something of similar size per the scope doc's change rule. Don't quietly build it.
5. **Respect the architecture rules above.** If a task seems to need breaking one, stop and explain instead.
6. **Verify before saying done.** At minimum run `npm run lint`, `npm test` and `npm run build`, and report the
   result honestly, including failures. Check UI changes in a browser.
7. **Commits:** only commit when asked. One small working step = one commit.
8. Don't edit the files in `docs/` unless asked. Exception: `docs/dev-notes.md`, which rule 10 keeps current.
9. **Never touch `staging/`.** It is the owner's stable snapshot for playtesting. Don't run `npm run staging:build`
   unless the owner asks; verify work with `npm run build` (which builds into `dist/`) instead.
10. **Keep `docs/dev-notes.md` current.** At the end of each finished task, update its status, decisions and next
    step in the same commit. The project is worked on from more than one Claude account and machine, and chat
    history doesn't carry over: anything not written in the repo is lost.

## Branches

- **`main`** is the stable, deployable version (GitHub Pages publishes it). Don't commit to it.
- **Each milestone gets its own branch made from `main`** (`m21`, `m22` …; from the previous milestone's branch only if
  that one isn't merged yet). Work only there. Push the milestone branch when the owner asks. **The owner merges into
  `main` and pushes `main`** (that publishes the game). Finished milestone branches are tagged `m<n>-done` and deleted
  from the remote once merged.

## Batch mode (milestones)

While the owner's milestone prompt is running (e.g. "M21 — …"), these rules **override rules 1, 2 and 7**.
All other rules still apply.

- **Work through the whole milestone without pausing between sub-steps.** Split it into sub-steps yourself
  (M21.1, M21.2 …) and write the split into `docs/dev-notes.md` before starting.
- **Build in chunks, check once per chunk.** A chunk is one sub-step, or a group of related sub-steps the dev-notes
  split names as one chunk. Between edits inside a chunk, don't run the suite; at most run a single test file while
  fixing a specific failure.
- **After each chunk:** `npm run lint`, `npm test` and `npm run build` must pass. Then update dev-notes with **at
  most 3 lines** and commit on the milestone branch with the prefix `M<n>.<k>: `. Never force-push, never rewrite
  history, never commit to `main`, never touch `staging/`.
- **Run the sims only at the end of a milestone that changed `src/sim/` or `src/content/`,** and only for the acts it
  touched (or when a sub-step exists to check balance). A milestone that changes neither skips them (the goldens cover
  determinism); say so in dev-notes. Start long runs detached so a session's time limit doesn't kill them; a sleeping
  laptop pauses them.
- **Read `docs/dev-notes-archive.md` only when a task needs the history** (finished steps, old balance reviews,
  sub-step details); `docs/dev-notes.md` has where the build stands and the rules in force.
- **Change files only with the Edit and Write tools,** never with `python3`, `node`, `sed` or heredoc scripts (those
  need an approval every time and stop batch mode). Use the shell only for `npm`, `git` and read-only commands.
- **Decide small things yourself:** file layout, naming, extra tests, UI details within the wireframes, and values
  that are already in the scope docs or the content folders. Label each such decision **"(mine, reversible)"** in
  dev-notes.
- **STOP only for:**
  - a new dependency;
  - anything that would break an architecture rule or an Act III rule above;
  - a scope question the scope docs don't answer, or a number that isn't in the content files;
  - a golden-replay change you can't explain as the intended effect of the sub-step;
  - tests still failing after 3 honest attempts.

  When stopped on one sub-step, record it under **"STOPPED"** in dev-notes and carry on with any sub-step that
  doesn't depend on it.
- **End of milestone:** one plain-language report covering:
  - what was built and the commit list;
  - how to see it (e.g. "npm run dev, continue past the Merge, open Projects");
  - the "(mine, reversible)" decisions;
  - the STOPPED items and open questions;
  - test and sim numbers.
