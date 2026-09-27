# Tech Stack Recommendation — AI Data Center Deal-Maker (working title)

**Status:** Draft v0.1, written before the concept is locked. We'll stress-test it against the game mechanics once Phases 5 and 7 of the research plan produce them.
**Covers:** Phase 6 of `research-plan.md` ("Technical feasibility")
**Reference point:** Venture Capital Tycoon (VCT), a shipped Steam game in a similar genre that we took apart earlier.

---

## 1. Recommendation in one paragraph

Build a **web-first game in TypeScript with Vite**, laid out as three separate parts:

- **Simulation core:** a pure TypeScript game engine with no UI code, deterministic and testable, that can also run in Node for balance testing.
- **UI:** built with **Preact**, using DOM, CSS and SVG. There's no game engine and no canvas unless the concept needs a live map.
- **Platform layer:** a thin set of adapters for saves, achievements and ads.

The same build then ships to three places: the open web (own domain / itch.io), browser game portals (CrazyGames / Poki), and later **Steam via Electron** with `steamworks.js`. This keeps VCT's strengths (web tech, light UI-driven sim, cheap to build with Claude) and fixes its weaknesses: a single 16k-line file, no tests, randomness that can't be replayed, `localStorage`-only saves, and Steam support that failed silently.

---

## 2. What we keep from VCT and what we change

| Area | VCT (shipped) | Our choice | Why |
|---|---|---|---|
| Language | Plain JS, hand-written | **TypeScript** | Type errors get caught before runtime, which matters when Claude Code writes most of the code and the game state is large |
| Code structure | One 1.5 MB `index.html`, 16.5k lines | **Vite project with modules**; can still output one file if needed | One file is fine up to a prototype, then painful. VCT's dated patch comments show the strain |
| UI | HTML strings put on the page with `innerHTML` / `insertAdjacentHTML` | **Preact components** | The same speed of iteration, but no hand-managed re-renders, lost event handlers or stale DOM |
| Game logic | Mixed into UI code, using `Math.random` (52 calls) | **Separate sim core, seeded random numbers** | Needed for automated balance runs, bug reproduction, daily-challenge seeds and replays |
| Graphics | CSS plus inline SVG, base64 PNG icons | **Same**: CSS plus SVG, icons as SVG sprites or small PNGs | It works, it's light, and it looks sharp at any resolution |
| Audio | Web Audio, sound generated in code | **Same idea**, via ZzFX (a ~1 KB procedural sound library) | Nothing to license and nothing heavy to download |
| Saves | `JSON.stringify(S)` into `localStorage` | **Versioned JSON behind a storage adapter** (IndexedDB on web, a file on desktop) | Supports migrations between versions, Steam Cloud, portal cloud saves and export/import |
| Desktop wrapper | NW.js (Chromium 150, Node 26) | **Electron**, added later | Better documented, `steamworks.js` targets it directly, and Claude knows it very well. NW.js stays a valid fallback |
| Steam | `steamworks.js`, but the module wasn't shipped, so achievements likely don't work | **Same library, plus a build check that fails if it's missing** | Keeps the VCT approach without the silent failure |
| Content | Hard-coded in JS | **Data files (JSON/TS) checked against a schema** | Lets you write events, actors and eras without touching engine code, and makes modding possible later |

---

## 3. The stack, layer by layer

### 3.1 Language and tooling

- **TypeScript**, in strict mode
- **Vite**: dev server with instant reload; production build. `vite-plugin-singlefile` is available if a portal or an artifact demo needs one HTML file.
- **pnpm** (or npm) for packages
- **ESLint and Prettier**, so style is consistent no matter who (or which Claude session) wrote the code
- **Git and GitHub** from day one, so each Claude Code task becomes a small, reviewable commit

### 3.2 Simulation core (`src/sim/`), the most important decision

A pure TypeScript module with **no DOM, no timers and no `Math.random`**.

- **State:** one plain, serializable `GameState` object (deals, sites, contracts, loans, GPUs, cash, reputation, era, calendar, event log).
- **Actions:** every player decision is an action object (`{type:'SIGN_OFFTAKE', dealId, termYears}`). A reducer applies it and validates it.
- **Tick:** `advance(state, rng) → state` runs one time step (week or month). Each system — power, construction, financing, operations, events, market — is its own function called in a fixed order.
- **Randomness:** a small seeded random number generator (e.g. sfc32 or mulberry32, about 20 lines) is stored in the state. The same seed plus the same actions gives the same game.
- **Money:** plain JS numbers in dollars, rounded once per tick. They're exact up to about $9 quadrillion, which is plenty. Formatting like "$1.24B" or "$380M" lives in the UI, using `Intl.NumberFormat`.

**What this gets us**

- Balance testing: `tools/sim-runner.ts` can play 10,000 automated 5-year campaigns in Node, using simple scripted strategies (cautious, heavily borrowed, spot-market only). It writes CSV files you can check against `economy-model.xlsx` from Phase 5.
- Unit tests for each system with Vitest.
- Bug reports that come with a seed and an action log, so any bug can be replayed exactly.
- Undo, "what-if" previews ("if you sign this, next quarter's cash is…") and daily seeded challenges come almost for free.

### 3.3 Content (`src/content/`)

- **Events, actors, eras, deal templates and balance constants** live in data files, not in code.
- Each file is checked against a **Zod schema** at build time, so a typo in an event fails the build instead of crashing mid-game.
- Events use a condition-and-effects format, for example: `when: era >= 2025 && powerQueueMonths > 18`, `choices: [...]`, `effects: {...}`.
- If the story side grows (negotiations, multi-step storylines), we'd add **inkjs**, a well-established scripting language for branching narrative, with the text written in `.ink` files.

### 3.4 UI (`src/ui/`)

- **Preact** (about 4 KB) with **@preact/signals** for state updates that only re-render what changed. It uses the React API, which Claude writes most fluently, but at a fraction of React's size, which matters for portal download limits.
- **CSS** with custom properties for the colour and spacing system, like VCT's `:root` variables. No CSS framework is needed.
- **Charts:** hand-written SVG for sparklines, gauges and the deal pipeline board. Add **uPlot** (about 45 KB, very fast) only if we need interactive time-series charts, such as GPU prices across eras.
- **Layout:** a responsive grid that works at 1280×720 or larger on desktop and adapts to tablets. Phones in portrait stay an open question (see §6).
- **Animation:** CSS transitions and keyframes, as in VCT. Respect `prefers-reduced-motion`.

### 3.5 Optional map layer (only if the concept needs one)

If Phase 7 picks the map-based variant ("Powered Land Tycoon"), add **PixiJS** for a single canvas map view (sites, grid lines, power plants). Menus and panels stay in Preact. We'd **not** switch the whole game to Phaser or a full game engine: this genre is 90% panels and numbers.

### 3.6 Audio

- **ZzFX** for UI sounds (clicks, deal signed, alarm, cash register), generated in code with no files.
- **Howler.js** only if we add music tracks. Music is optional for the MVP.

### 3.7 Saves (`src/platform/storage`)

- Save format: `{version, seed, savedAt, state}`, optionally compressed with LZ-string for export strings.
- **Migration functions** between save versions, so updates never break existing saves.
- Storage adapters:
  - Web: **IndexedDB** via `idb-keyval`. It's more robust than `localStorage` and holds more data.
  - Desktop: a JSON file in the user's app-data folder via Node `fs`, which is easy to point Steam Cloud at.
  - Portals: the portal's SDK cloud-save, where it offers one.
- Autosave each tick or turn, plus manual save slots and export/import of a save string (as VCT has).

### 3.8 Platform services (`src/platform/`)

One interface, one implementation per place the game ships:

```ts
interface Platform {
  storage: Storage;                       // save/load
  achievements: { unlock(id: string): void };
  ads?: { rewarded(): Promise<boolean>; midgame(): Promise<void> };
  analytics?: { event(name: string, data?: object): void };
}
```

Implementations: `web` (the default; ads/analytics do nothing), `crazygames`, `poki`, `steam` (Electron plus `steamworks.js`). The game code never checks where it's running.

### 3.9 Language support (i18n)

- All player-facing text goes through `t('key')` from the start, stored in a simple string table (`en.json`, and `ro.json` later if wanted).
- Numbers, currencies and dates are formatted with `Intl`.
- Cost now is close to zero; adding it to an existing game later is expensive.

### 3.10 Testing and quality

- **Vitest:** unit tests for the sim systems, plus a "golden replay" test (a fixed seed and action list must always produce the same end state).
- **The sim runner:** balance checks that fail if, say, the median 5-year return goes out of a target range.
- **Playwright:** one or two smoke tests (the game boots, a new game starts, a save/load round-trip works). Chromium is already set up for this.
- **Content validation:** runs on every build.

### 3.11 Build and release

| Target | How | When |
|---|---|---|
| Dev / playtest | `vite dev`; share builds via Cloudflare Pages or GitHub Pages | From week 1 |
| itch.io | Static web build uploaded with `butler` (itch's command-line upload tool) | First public prototype |
| CrazyGames / Poki | Static build plus their SDK adapter. Size, ads and mobile rules to check in Phase 4 | After the web version proves fun |
| Steam (Win/Mac/Linux) | **Electron** plus `steamworks.js`, `electron-builder`, SteamPipe upload | Later, if the web traction supports it |

GitHub Actions can run tests and publish to itch or Pages on each tagged release.

---

## 4. How the pieces fit

```
┌────────────────────────── UI (Preact + CSS + SVG) ──────────────────────────┐
│  Screens · Deal pipeline board · Charts · Modals · Event cards · Settings    │
│        ▲ reads state (signals)                    │ sends actions            │
└────────┼──────────────────────────────────────────┼──────────────────────────┘
         │                                          ▼
┌────────┴──────────── SIM CORE (pure TS, deterministic) ─────────────────────┐
│  GameState ← reducer(actions) ← advance(tick): power → build → finance →     │
│  operations → market → events → era checks        seeded RNG in state       │
│                  ▲ reads                                                    │
│        CONTENT (JSON/TS + Zod): events · actors · eras · balance constants  │
└──────────────────┬───────────────────────────────────────────────────────────┘
                   │ save/load, achievements, ads
┌──────────────────▼──── PLATFORM ADAPTERS ───────────────────────────────────┐
│  web (IndexedDB) · crazygames · poki · steam (Electron + steamworks.js + fs) │
└──────────────────────────────────────────────────────────────────────────────┘
      Also runs headless in Node:  tools/sim-runner.ts → CSV → economy-model.xlsx
```

### Proposed repo layout

```
/src
  /sim         state.ts · actions.ts · advance.ts · rng.ts · /systems/*.ts
  /content     events/*.json · actors.json · eras.json · balance.ts · schemas.ts
  /ui          app.tsx · /screens · /components · styles.css
  /platform    index.ts · web.ts · steam.ts · crazygames.ts · poki.ts
  /i18n        en.json · t.ts
/tools         sim-runner.ts · validate-content.ts
/desktop       electron main.ts, preload.ts   (added later)
/tests         unit + golden-replay + playwright smoke
CLAUDE.md      rules for Claude Code: architecture boundaries, commands, conventions
```

---

## 5. Alternatives considered

| Option | Verdict | Reason |
|---|---|---|
| **VCT approach**: one HTML file, vanilla JS, NW.js | Good for a **throwaway prototype only** | Fastest first week, then it slows everything down: no types, no tests, logic tangled with UI |
| **React** instead of Preact | Fine, and easy to switch to | About 40 KB more for no gameplay benefit. Preact can run most React libraries through `preact/compat` if needed |
| **Svelte 5** | Good alternative | Also small and fast. Claude is somewhat less reliable with Svelte 5's newer syntax than with React-style code |
| **Phaser** (game framework) | No, unless the game becomes map-first | Built for sprites and action. Menus and forms, which are most of this game, are awkward to build in it |
| **Godot / Unity** (web export) | No | Large web builds (tens of MB), slow loading on portals, and UI-heavy sims are more work to build there |
| **Tauri** for desktop (instead of Electron) | Maybe later | Much smaller install, but it renders with the operating system's own browser engine, so it looks and behaves differently on Windows, Mac and Linux/Steam Deck. Steam integration goes through Rust |
| **NW.js** for desktop | Acceptable fallback | Proven by VCT. Electron simply has the larger ecosystem and documentation |
| **Backend server** | Not needed for MVP | Single-player game. Leaderboards can use Steam or portal services |

---

## 6. Stress-test matrix (to run against the game mechanics)

Each row is an assumption behind this stack. When the mechanics are drafted, check each row and mark it **OK / Adjust / Breaks**.

| # | If the mechanics include… | Stack impact | Swap or add |
|---|---|---|---|
| 1 | **Turn-based** (week/month turns, "deal desk") | Ideal fit, no change | — |
| 2 | **Real-time with pause and speed controls** | Needs a fixed-timestep loop driving `advance()`; UI updates limited to a few times per second | Small addition, no stack change |
| 3 | **Idle / offline progress** | Must fast-forward N ticks on load (or compute it directly for long gaps); check performance of 10k+ ticks | Add a fast-forward mode to the sim; possibly a Web Worker |
| 4 | **Visual map** (sites, grid, power lines) | DOM/SVG copes with ~200–500 map elements; beyond that, or with smooth pan/zoom, it doesn't | Add a PixiJS map layer (§3.5) |
| 5 | **Hundreds of live deals, GPUs or contracts** in lists | Large DOM lists get slow | Virtualized lists; group GPUs into fleets rather than individual units |
| 6 | **Heavy branching narrative / negotiations** | The JSON event format gets clumsy | Add inkjs |
| 7 | **Economy must match the spreadsheet model** | The sim core runs in Node and uses the same balance constants | Keep one source for the numbers (`balance.ts` feeds both the game and the model export) |
| 8 | **Daily challenge / shareable seeds** | Already supported by the seeded random numbers | Add a seed-from-date function and a share code |
| 9 | **Leaderboards / asynchronous competition** | No backend | Steam or portal leaderboard APIs; otherwise a small serverless function (e.g. Cloudflare Worker) |
| 10 | **Phones in portrait** as a main target | Dense finance UI doesn't fit at ~390px wide | Separate mobile layout (bottom tabs, card stacks). Costs real design time |
| 11 | **Portal size limits and ads** | Preact and SVG keep the build small (well under a few MB without music) | Portal adapter; check each portal's limits in Phase 4 |
| 12 | **Steam: achievements, cloud, Deck** | Electron plus `steamworks.js` covers achievements and overlay; save files in app-data suit Steam Cloud | Deck: controller/touch navigation and a 1280×800 layout pass |
| 13 | **Modding** | Content is already data plus schemas | Load extra JSON from a mods folder (desktop only) |
| 14 | **Big numbers** (trillions in capex) | Plain numbers are exact to ~$9e15 | No change; only relevant if an idle design inflates numbers beyond that |
| 15 | **Multiplayer / co-op** | Out of scope for this stack | Would need a server and netcode — a different project |
| 16 | **Very long campaigns** (20+ years, weekly ticks) | Save size and event log growth | Cap or compress the event log; store monthly summaries |

---

## 7. Effort and cost notes

- **Software cost:** €0. Everything listed is free and open source. The only fixed cost is the Steam Direct fee ($100 per game), paid only when we go to Steam.
- **Setup:** about 1 day with Claude Code to scaffold the repo, tooling, sim-core skeleton, save system and a first screen.
- **Rough order of work:**
  1. Sim core, run in the terminal with no UI
  2. Balance runner
  3. Basic UI
  4. Content pipeline
  5. Saves and polish
  6. Web release
  7. Portals / Steam

  Proving the loop is fun before building UI is the cheapest way to fail fast.
- **Working with Claude Code:** `CLAUDE.md` holds the rules: "sim never imports from ui", "no Math.random in sim", "run tests before finishing". Tasks should be sized to one system or one screen.

---

## 8. Decisions still open

1. **Concept variant** (Phase 7): turn-based deal desk, idle, or map builder. Affects rows 1–4 of the stress-test matrix.
2. **Main platform:** web and portals first, or Steam first. This decides whether mobile layout (row 10) or Steam features (row 12) come first.
3. **Mobile:** is phone play a must-have or a nice-to-have?
4. **Languages:** English only at launch, or English and Romanian?
5. **Prototype approach:** a quick one-file prototype VCT-style (throwaway), or start straight in the structure above? My recommendation is to start in the structure. With Claude Code, the setup costs little, and throwaway prototypes tend not to get thrown away.
