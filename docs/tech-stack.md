# Tech Stack Recommendation — Garage to Gigawatt

*Source: project doc 06. Condensed copy for the repo; the architecture rules are kept in full.*

## 1. Summary

A **web-first game in TypeScript with Vite**, in three separate parts:

- **Simulation core** (`src/sim/`): pure TypeScript, no UI code, deterministic and testable, runs in Node for balance testing.
- **UI** (`src/ui/`): **Preact** with DOM, CSS and SVG. No game engine, no canvas.
- **Platform layer** (`src/platform/`): thin adapters for saves, achievements and ads.

Ships to the open web first, portals (CrazyGames / Poki) later, and Steam via **Electron** + `steamworks.js` later still.

## 2. Language and tooling
- **TypeScript**, strict mode
- **Vite** dev server and build (`vite-plugin-singlefile` if a single HTML file is ever needed)
- npm for packages
- **ESLint and Prettier**
- **Git and GitHub** from day one; each Claude Code task = one small commit

## 3. Simulation core (`src/sim/`) — the most important decision
A pure TypeScript module with **no DOM, no timers and no `Math.random`**.
- **State:** one plain, serializable `GameState` object.
- **Actions:** every player decision is an action object (`{type:'BUY_MACHINE', ...}`). A reducer applies and validates it.
- **Tick:** `advance(state, rng) → state` runs one time step (a week; 13 per quarter). Each system is its own function called in a fixed order.
- **Randomness:** a small seeded RNG (sfc32 or mulberry32) stored in the state. Same seed + same actions = same game.
- **Money:** plain JS numbers in dollars, rounded once per tick. Formatting ("$1.24B") lives in the UI via `Intl.NumberFormat`.

This enables: `tools/sim-runner.ts` bot campaigns in Node writing CSV, Vitest unit tests per system, golden-replay tests, replayable bug reports, undo and what-if previews.

## 4. Content (`src/content/`)
- Events, actors, eras, machines, sites, balance constants live in **data files (JSON/TS)**, not code.
- Each file is checked against a **Zod schema** at build time.
- Events use a condition-and-effects format (`when`, `choices`, `effects`).

## 5. UI (`src/ui/`)
- **Preact** + **@preact/signals**.
- **CSS** custom properties (design tokens); no CSS framework.
- Charts: hand-written SVG. uPlot only if interactive time-series are needed.
- Desktop, 1280×720 and up. Respect `prefers-reduced-motion`.

## 6. Audio
- **ZzFX** for UI sounds, generated in code.

## 7. Saves (`src/platform/storage`)
- Format `{version, seed, savedAt, state}`; migration functions between versions.
- Web: **IndexedDB** via `idb-keyval`. Autosave each quarter, manual slot, export/import string.

## 8. Platform services (`src/platform/`)
```ts
interface Platform {
  storage: Storage;
  achievements: { unlock(id: string): void };
  ads?: { rewarded(): Promise<boolean>; midgame(): Promise<void> };
  analytics?: { event(name: string, data?: object): void };
}
```
Game code never checks where it's running.

## 9. i18n
- All player-facing text via `t('key')` from a string table (`en.json`). Numbers/dates via `Intl`.

## 10. Testing
- **Vitest:** unit tests for sim systems + golden-replay test.
- **Sim runner:** balance checks.
- **Playwright:** 1–2 smoke tests (boots, new game, save/load round-trip).
- **Content validation** on every build.

## 11. Repo layout
```
/src
  /sim         state.ts · actions.ts · advance.ts · rng.ts · /systems/*.ts
  /content     events/*.json · machines.json · sites.json · balance.ts · schemas.ts
  /ui          app.tsx · /screens · /components · /styles
  /platform    index.ts · web.ts
  /i18n        en.json · t.ts
/tools         sim-runner.ts · validate-content.ts
/tests         unit + golden-replay + playwright smoke
/docs          design docs
CLAUDE.md      rules for Claude Code
```

## 12. Working with Claude Code
`CLAUDE.md` holds the rules: "sim never imports from ui", "no Math.random in sim", "run tests before finishing". Tasks sized to one system or one screen. Order of work: sim core in the terminal → balance runner → basic UI → content pipeline → saves and polish → web release.
