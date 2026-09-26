# Dev notes: where the build stands

The running record of what's built, what was decided and what's next. It exists so any Claude account
or machine can pick up the work with no chat history. **Read `CLAUDE.md` first, then this file.**
Update it at the end of every finished task (status, new decisions, next step).

Last updated: 26 Sep 2026, with the equipment loan.

## How the owner works

- The owner is a beginner programmer. Explain every change in plain language, say how to see or test it.
- Plans and design decisions come from a separate Claude chat (the "design thread", on the owner's personal
  Claude account, with the design docs as project files). The owner pastes tasks from there. When a task
  raises a design question, stop and give the owner a short report they can paste back into that thread.
- One small working step = one commit. **Push only when the owner says "push it".**
- Ask before adding any dependency. Don't edit `docs/` unless asked (this file is the exception: keep it current).
- Never touch `staging/` (the owner's playtest snapshot, see below).
- Only one Claude account works on the repo at a time. Start with `git pull`; end with a push (when told).

## Machine setup (new computer, e.g. a Mac)

1. Install Git and **Node.js 24** (`node --version` → `v24.x`). Node 24 runs the `.ts` tools directly.
2. `git clone https://github.com/tudorc44/garage-to-gigawatt.git`, then `cd garage-to-gigawatt`.
3. `npm install`, then `npm test` (should be all green) and `npm run dev`.
4. `npm run staging:build` once to make a local staging snapshot (it isn't in git).

Line endings are pinned to LF by `.gitattributes`, so the golden files match on Windows and macOS.

## Commands

See `CLAUDE.md` for the full list. The main ones:

- `npm run dev`: play in the browser at http://localhost:5173. It includes the console testing helpers
  `g2g.setCash(500000)` and `g2g.state()`. So does the staging build (built with Vite's `staging` mode);
  `npm run build` (production mode) leaves them out.
- `npm run staging:build` then `npm run staging`: the owner's frozen snapshot at http://localhost:4173.
  Claude never runs `staging:build` unless asked; verify with `npm run build` (into `dist/`).
- `npm test`, `npm run lint`, `npm run build`: run all three before calling anything done.
- `npm run play`: the terminal version. `npm run sim`: bots × 50 seeds → `sim-output/` (git-ignored).

## What's built (Alpha 0.1, Act I)

1. **Tooling:** Vite + Preact + TypeScript strict, Vitest, Zod, ESLint + Prettier. ESLint enforces the
   pure-sim rules (no `Math.random`, `Date.now`, timers, DOM or UI imports in `src/sim`).
2. **Content:** machines, sites, interrupts, capital ladder and weekly market prices in `src/content/`,
   validated by Zod schemas plus a loader that lists every problem and refuses to start on bad data.
   Other content (events, rivals, loans, hires, Merge) is still only in `docs/act1-content/`; copy it
   over, with a schema, when its system gets built. Market CSV → JSON via `npm run content:market`.
3. **Sim core (`src/sim/`):** seeded RNG in the state; actions via `applyAction`; one week per `advance`.
   Market, sites (ladder, scouting, hidden flaws), machines (new/used, delivery, weekly failure roll,
   repair), Bandwidth, mining (auto switch-off), treasury (HODL/sell %), price-alert interrupt (max 3
   per quarter), quarter report, forced sales and bankruptcy, valuation, game log.
4. **Capital:** the equipment loan (see Decisions), friends & family and seed rounds (fixed offers from `capital.json`, no negotiation yet),
   founder stake (dilutions multiply: F&F then seed leaves 72%).
5. **Leaving a site** (lease break) with a penalty.
6. **Terminal game** (`npm run play`) and **browser UI**: title screen, Plan, Live quarter (1.5 s per week,
   pause, 1×/2×/4×, skip, alerts as modals), Quarter report, end screen. Design-system tokens and
   Fontsource fonts; era themes (`garage` until 2019, `industrial` from 2020Q1). Text via `t()` + `en.json`.
7. **Sim-runner** with bots (see results below), **golden replay tests** (`tests/golden/`: steady-grower,
   early-expander, ff-expander, ff-leaver, seed-raiser, loan-taker) and unit tests: 149 passing + 1 to-do.
8. **Local staging** (`staging/`) and the `g2g` console testing helper (dev and staging, not production).

### Not built yet (shown as locked "not built yet" rows or missing)

Series A and the IPO/SPAC round, the crypto-backed loan (and margin calls), negotiation, hires,
Heat and talking to the neighbours, Read the market, auctions, rivals and the league table, the 20 event
cards, the other 6 interrupts, the Merge decision screen, saves, sound, settings, the left-nav sections
other than Dashboard. Site flaws that need missing systems have no effect yet (noise ordinance, hostile
council, landlord eviction, transformer upgrade). The UI has no automated tests (would need e.g. jsdom:
ask first).

## Decisions

### Confirmed by the owner

- Start with $10k and no rigs. Machines earn from the quarter after purchase (Q1 2017 earns nothing).
- 13-week quarters (real ones trimmed or padded); the Merge lands in week 11 of 2022Q3 (partial week),
  no ETH revenue from week 12.
- Prices exactly as in the market CSV (no random wobble).
- Weekly failure roll; used machines fail 1.5× as often; repairs happen in the Plan phase.
- The small unit can be built without scouting; warehouse and up need scouting first.
- Texas uses its fixed power price until negotiation exists.
- Coins are sold **weekly** at that week's price (not at quarter end).
- Fonts self-hosted with Fontsource (no Google Fonts CDN).
- Friends & family: 2 Bandwidth, +$40K for 10%, open 2017Q1–2018Q2, once per game (from `capital.json`).
- Seed: 2 Bandwidth, +$1.5M for 20% ($6M pre-money), open 2017Q4–2019Q4, once, needs a powered site of
  at least 100 kW usable capacity (from `capital.json`). Taken as a fixed offer: the scope's fallback
  while the negotiation mini-game isn't built.
- **Leaving a site:** penalty = 1 month of that site's own rent (⅓ of quarterly rent), no Bandwidth.
  Machines on the site are sold automatically at the used price. Allowed while the site is still being
  built (build money is lost). The garage can't be left. The tier can be built again later at full cost.
  Rent stops for the whole quarter you leave in.

### Chosen by Claude Code, reported, not objected to (change freely if the owner asks)

- Forced sale at quarter end when cash < 0: treasury coins first, then machines one at a time, oldest
  batch first. Game over only if still negative.
- `requires.min_mw` (for raises) = a built, powered site whose **usable** capacity (after an undersized
  transformer flaw) is at least that size, machines or not. **Not yet confirmed.**
- Used machines arrive immediately; new ones use the data's delivery times. Selling pays the used price;
  broken units go first at used price minus repair cost. Identical purchases merge into one batch.
- Site capacity counts every placed machine, including broken and undelivered ones.
- Several sites allowed, even of the same tier. Scout/build at most one tier above your biggest site.
  Scouting gives 2–3 offers (±15% on build cost, rent and power price), each hiding one flaw; offers never
  expire; re-scouting replaces them. Build cost is paid up front; rent is paid weekly from signing.
- Price alert: bigger of the BTC/ETH weekly move, threshold 15%; only fires if you hold coins; "sell"
  sells 25% of both. HODL starts at 0% (sell everything).
- Valuation (amendment A5): max(0, quarterly EBITDA × 4) × era multiple + cash + treasury − debt.
- "Cost per coin" counts power only. Cash is rounded to cents weekly.
- Raises cost 2 Bandwidth unless `capital.json` says otherwise; open rounds are listed in `balance.ts`.
- The raise log line reads: Raised $1.5M in the seed round for 20% of the company. Your stake: 72%.
- **Equipment loan** (terms by era from `capital.json`: 2017–19 50% LTV at 15%, 2020–21 70% at 11%,
  2022 50% at 14% until 2022Q2; 8 quarters). **Not yet confirmed by the owner:**
  - One equipment loan at a time; 1 Bandwidth to take (scope §2.6); repaying early is free (no penalty, no
    Bandwidth). You pick the amount, up to LTV × what your machines would sell for today (used price,
    broken units less repair cost).
  - Repaid weekly like rent: an equal slice of principal (1/104 of the loan over 8 quarters) plus interest
    on what's still owed; the last week clears any rounding leftover.
  - No covenant: machines can still be sold while a loan is out, and the debt stays. Missing payments just
    lower cash; if cash is below zero at quarter end, the normal forced sale and game-over rules apply.
  - Debt is subtracted from the valuation; interest is not part of EBITDA. The report's cash line shows
    loan payments, plus a line with the debt still owed.

## Balance findings (from `npm run sim`, 50 seeds per bot)

| Bot | What it does | Bust rate | Median end value |
|---|---|---|---|
| cautious | garage only, keeps half its cash | 0% | $39.9K |
| reinvest | garage only, spends everything | 0% | $28.8K |
| raise-climb | reinvest + F&F (2017Q1) + seed (2017Q4), climbs the ladder | 0% | $974K (peak $9.2M, 2021Q1) |
| raise-borrow | raise-climb + the biggest equipment loan whenever it has none | 0% | $947K (peak $9.2M, 2021Q1) |
| hodl | garage only, keeps every coin | 0% | $104K |
| ff-climb | F&F, builds the small unit, fills it, keeps 1 quarter of rent | 100% (2019Q1) | −$2.6K |
| careful-ff | like ff-climb, keeps 4 quarters of rent, stops buying in 2018 | 100% (2019Q3) | −$1.6K |
| ff-exit | ff-climb, but leaves the small unit after its first losing quarter | 0% | $48.9K |

- **The garage (5 kW) is a ceiling.** Garage-only play never saves the $35K for a small unit
  (best case, the garage-max probe: 2018Q1).
- **The 100 kW small unit loses money from 2018Q2 to about 2020** ($6K/quarter rent, GPU rigs switched
  off). Before the lease exit, building it in 2017 meant bankruptcy however carefully you played. With
  the exit, leaving in time is the decision that decides survival, which is what the alpha wants.
- **With the seed round, the reinvesting bot climbs to the 1 MW warehouse (powered 2018Q3) and never
  goes bust.** Its cash bottoms out around $600K in 2018: $1.5M of seed money is far more than a
  warehouse (about $400K) plus rent can burn. It can't climb further yet (the 20 MW own site needs
  Series A or loans), so it peaks at about $9M, far below the scope's ~$2B target (which needs ~35–40 MW).
- The scope's anchor "reinvesting 100% goes bust 2018Q2–2019Q2" is still a to-do test: even with raises,
  reinvesting doesn't over-extend. It probably needs loans (borrowed money that must be repaid).
- A cautious bot (keeps half its cash) with raises builds the small unit only at the very end and never
  takes the seed round.
- **Equipment loans barely matter so far.** Half the value of a garage of used rigs is only $2–4K, and
  even raise-borrow's loans (up to about $90K on the warehouse fleet) change little next to $1.5M of
  seed money.
- **Reinvest + F&F (no seed, with or without loans) goes bust in all 50 runs, in 2018Q3.** That is the
  scope's "reinvesting 100% goes bust 2018Q2–2019Q2" anchor; the to-do test could now be written with
  that bot, if the owner agrees that "reinvest" includes taking the F&F money.
- Price alerts cluster (2 per quarter in 2017Q2–2018Q1 and 2022Q2, almost none 2018–2020) because the
  weekly prices are reconstructed from monthly data. Real CoinMetrics data should fix it.

## Open questions for the design thread

- Leaving the 100 kW site also locks you out of the seed round (it needs a powered 100 kW site). Intended?
- Confirm the `min_mw` = usable capacity rule.
- Is the seed round too generous? $1.5M in 2017Q4 makes the 2018 crash harmless for anyone who takes it.
- Confirm the equipment loan rules above (one at a time, weekly payments, no covenant).
- Replace the reconstructed market data with real CoinMetrics weekly data before final balancing.

## Next

The owner will give the go-ahead. Candidates from the build order (`docs/player-actions-and-pacing.md`
§7): the crypto-backed loan with margin calls (the next half of "build the loans"), Series A, negotiation.
