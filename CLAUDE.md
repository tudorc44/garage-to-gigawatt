# CLAUDE.md — Garage to Gigawatt

## Project summary

Garage to Gigawatt is a turn-based, finance-first business sim played in a desktop browser. We are building
**Alpha 0.1: Act I, "Garage to Hashrate"**: 23 quarterly turns (Q1 2017 → Q3 2022, about 40 minutes).
The player starts with $10k and an empty garage (no rigs), then buys machines, climbs a site ladder
(garage → 100 kW → 1 MW → 20 MW → Texas 100 MW), picks a HODL/sell %, takes loans (crypto-backed ones can
margin-call), hires staff, manages community Heat and raises money, all against scripted BTC/ETH prices and
4 scripted rivals. Each turn is Plan phase → Live quarter (13 weekly ticks, pausable, up to 3 interrupts)
→ Quarter report. The act ends at the Merge decision screen and a chapter report. The alpha must answer one
question: *is Act I a fun 40-minute run where decisions, not luck, decide whether you survive?*

## Commands

```bash
npm run dev       # start the Vite dev server (open the printed localhost URL)
npm run build     # type-check (tsc -b) and build to dist/
npm run preview   # serve the built dist/ locally
npm test          # Vitest: unit tests per system + golden-replay test
npm run lint      # ESLint (also enforces the pure-sim rules below)
npm run play      # the terminal version of Act I (options: -- --seed 42 --fast)
npm run content:market  # regenerate src/content/market_weekly.json after editing the CSV
```

## Key docs (read before bigger tasks)

- `docs/alpha-0.1-scope.md`: **source of truth for scope.** What's in, what's out, cut order, exit checklist.
- `docs/content-pack-review.md`: its §4 amendments (A1–A9) **override** the scope doc where they differ.
- `docs/player-actions-and-pacing.md` (build order in §7) and `docs/act-i-content-pack.md` (content and data notes).
- `docs/act1-content/`: the original content pack. The game's live copies are in `src/content/`.
- `docs/tech-stack.md`: architecture, repo layout, libraries.
- `docs/design-brief.md`: game vision and the 4-act campaign (background only; Acts II–IV are out of scope).
- `docs/design-system/README.md` and `docs/design-system/tokens.css`: **source of truth for UI style**
  (tokens, era themes, fonts, colours, components). `docs/design-system.md` records how those decisions were made.
- `docs/wireframes-spec.md`: **source of truth for screen layout and flow.**
- `docs/audio/`: **source of truth for sound.** Move it to `src/ui/audio/` when sound is built.

## Architecture rules (non-negotiable)

### Simulation core: `src/sim/`
- **Pure TypeScript.** No DOM, no `window`/`document`, no timers (`setTimeout`, `setInterval`,
  `requestAnimationFrame`), no `Date.now()`, no `Math.random`.
- **Never imports from `src/ui/`** (or `src/platform/`). Dependencies only point inward: ui → sim, never sim → ui.
- **All randomness comes from a seeded RNG stored in the game state** (e.g. mulberry32/sfc32 in `src/sim/rng.ts`).
  Same seed + same actions must always produce the same game.
- State is one plain, serializable `GameState` object. Player decisions are action objects applied by a reducer.
  Time advances via `advance(state) → state` (one week per call, 13 per quarter).
- Money is plain numbers in dollars. Formatting ("$1.24B") belongs in the UI, not the sim.
- Must be runnable in Node (for tests and the future sim-runner).

### Content: `src/content/`
- **All game content is data**: machines, sites, events, hires, rivals, price paths, balance constants.
  Don't hardcode numbers or event text in sim or UI logic; read them from content files.
- Content files are validated against schemas (Zod, planned; ask before adding it).

### UI: `src/ui/`
- Preact components. The UI reads state and dispatches actions; it never computes game rules itself.
- Styling uses CSS custom properties (design tokens), with no CSS framework. Era themes via `data-theme`.

### Text: `src/i18n/`
- **All player-facing text goes through `t('key')`** backed by a string table (`en.json`). No raw English
  strings in components or sim output. English only for the alpha.
- Numbers and dates are formatted with `Intl`.

### Planned layout (from `docs/tech-stack.md`)
```
src/sim/        state.ts, actions.ts, advance.ts, rng.ts, systems/*.ts
src/content/    events/*.json, machines.json, sites.json, balance.ts, schemas.ts
src/ui/         app.tsx, screens/, components/, styles/
src/platform/   storage and platform adapters
src/i18n/       en.json, t.ts
tools/          sim-runner.ts, validate-content.ts
tests/          unit, golden-replay, smoke
```
The repo is currently the fresh Vite + Preact scaffold; these folders don't exist yet. Create them only as a
task needs them.

## Working rules for Claude

1. **Small tasks.** Work on one system or one screen at a time. If a request touches several, propose splitting it
   and do the first part.
2. **Explain in plain language.** The owner is a beginner. After each change, summarise which files you changed
   and what each change does, and say *why*, without jargon (or define it briefly). Say how to see or test it
   (e.g. "run `npm run dev` and click End Quarter").
3. **Ask before adding any dependency** (npm package, CDN script, tool). Say what it's for and whether there's a
   no-dependency option.
4. **Scope guard.** `docs/alpha-0.1-scope.md` decides what gets built. If a request falls outside it
   (see its §3 "Not in the alpha"), say so and push back politely. Offer to add it to the backlog, or to swap
   it for something of similar size per the scope doc's change rule. Don't quietly build it.
5. **Respect the architecture rules above.** If a task seems to need breaking one, stop and explain instead.
6. **Verify before saying done.** At minimum run `npm run build` (and tests, once they exist) and report the
   result honestly, including failures.
7. **Commits:** only commit when asked. One small working step = one commit.
8. Don't edit the files in `docs/` unless asked.
