# Dev notes: where the build stands

The running record of what's built, what was decided and what's next. It exists so any Claude account
or machine can pick up the work with no chat history. **Read `CLAUDE.md` first, then this file.**
Update it at the end of every finished task (status, new decisions, next step).

Last updated: 27 Sep 2026: **Act II is coming into scope** (owner); readiness check below ("Act II
readiness"). The Act I balance pass is DONE (every scope §5 balance anchor passes in the sim).

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
  `g2g.setCash(500000)` and `g2g.state()`. So do the staging build and, at the owner's request, the
  production build (`npm run build`, which GitHub Pages publishes).
- `npm run staging:build` then `npm run staging`: the owner's frozen snapshot at http://localhost:4173.
  Claude never runs `staging:build` unless asked; verify with `npm run build` (into `dist/`).
- `npm test`, `npm run lint`, `npm run build`: run all three before calling anything done.
- `npm run play`: the terminal version. `npm run sim`: bots × 50 seeds → `sim-output/` (git-ignored).

## What's built (Alpha 0.1, Act I)

1. **Tooling:** Vite + Preact + TypeScript strict, Vitest, Zod, ESLint + Prettier. ESLint enforces the
   pure-sim rules (no `Math.random`, `Date.now`, timers, DOM or UI imports in `src/sim`).
2. **Content:** machines, sites, interrupts, capital ladder and weekly market prices in `src/content/`,
   validated by Zod schemas plus a loader that lists every problem and refuses to start on bad data.
   Rivals are in too (`rivals.json`), and Heat's rules (`heat.json`). Other content (events, hires, Merge) is still only in `docs/act1-content/`; copy it
   over, with a schema, when its system gets built. Market CSV → JSON via `npm run content:market`.
3. **Sim core (`src/sim/`):** seeded RNG in the state; actions via `applyAction`; one week per `advance`.
   Market, sites (ladder, scouting, hidden flaws), machines (new/used, delivery, weekly failure roll,
   repair), Bandwidth, mining (auto switch-off), treasury (HODL/sell %), price-alert interrupt (max 3
   per quarter), quarter report, forced sales and bankruptcy, valuation, game log.
4. **Capital:** the equipment loan and the crypto-backed loan with margin calls (see Decisions), every funding round: friends & family, seed, Series A and IPO / SPAC (fixed offers from `capital.json`; the
   seed and Series A rows open a pitch dialog: take the offer, or pitch for a higher valuation, see
   Decisions; terminal: `pitch seed|a`, then `counter <$M>`, `accept`, `walk`), founder stake (dilutions multiply: F&F then seed leaves 72%, then Series A 57.6%).
5. **Hires** (`hires.json`, `src/sim/systems/hires.ts`): the five people on the People dialog (Plan ›
   "Hire staff"), terminal `hire <1-5>` / `fire <1-5>`. **Read the market** (Plan › Intel row, the
   Signals card, a line on the Live screen; terminal `read`). **The Merge decision and the chapter
   report** (`merge.json`, `src/ui/screens/End.tsx`, `src/ui/chapter.ts`): after the 2022Q3 report, and
   the chapter report on a bust too. **Save / load** (`src/sim/save.ts`, `src/platform/saves.ts`,
   `src/ui/components/saves.tsx`): autosave, one slot, export/import text, from the title screen and the
   left nav's "Save / load". See Decisions.
   **Leaving a site** (lease break) with a penalty.
   **Treasury per coin:** separate keep/sell % for BTC and ETH, the price alert sells 25% of BTC or of ETH,
   and a Plan-screen "Sell treasury coins" action (1 Bandwidth).
6. **Terminal game** (`npm run play`) and **browser UI**: title screen, Plan, Live quarter (1.5 s per week,
   pause, 1×/2×/4×, skip, alerts as modals), Quarter report, end screen. Design-system tokens and
   Fontsource fonts; era themes (`garage` until 2019, `industrial` from 2020Q1). Text via `t()` + `en.json`.
7. **Sim-runner** with bots (see results below), **golden replay tests** (`tests/golden/`: steady-grower,
   early-expander, ff-expander, ff-leaver, seed-raiser, loan-taker, margin-caller, auction-bidder,
   heat-climber, negotiator, pitcher) and unit tests: 346 passing.
8. **GitHub Pages** (https://tudorc44.github.io/garage-to-gigawatt/): `.github/workflows/deploy-pages.yml`
   runs the tests, builds, and publishes `dist/` on every push to `main` (or by hand from the Actions
   tab). Needs the repository's Settings → Pages → Source set to "GitHub Actions" (once). Vite's
   `base: './'` makes the build work from that sub-folder. Before this, Pages served the raw source
   `index.html` (which points at `src/main.tsx`), so the page stayed blank.
9. **Local staging** (`staging/`) and the `g2g` console testing helpers (every build, GitHub Pages included):
   `g2g.setCash(n)`, `g2g.state()`, and `g2g.load(state)` to jump to any saved or bot-built state.
10. **Rivals and the league table:** Riot, Marathon, Core Scientific and Bitfarms follow their scripted
   end-of-quarter numbers from `rivals.json`. The quarter report (browser and terminal) ranks you against
   them by value, with your rank change and who joins later.
11. **Distressed auctions:** in the crypto-winter windows a lot of used machines may come up at the
   start of a Plan phase. One sealed bid (2 Bandwidth) against 2–3 rivals, settled at once; the Plan
   screen has the row and a bidding dialog, the terminal has `bid <amount> [site#]`.
12. **Grid curtailment:** in summer (Q3) the Texas grid may ask you to take the Texas site offline for
   a week, for credits (review A8). An interrupt card in the live quarter (and in the terminal); the
   credits count toward EBITDA and show on the quarter report.
13. **Community Heat** (design thread decisions, 26 Sep 2026; rules in `src/content/heat.json` and
   `sites.json` heat_load_max): Heat per site = base + load + grievance + era, recalculated weekly. A
   Heat meter per site (marks at 30/50/70/90), Heat of the hottest site in the top bar and as the 6th
   report tile (replacing the stand-in Valuation tile, as in the mockup). Neighbour complaints (a
   card), "Talk to the neighbours" and noise mitigation (a Plan dialog, and `talk` / `mitigate` in the
   terminal), the rate hike at 50, moratorium at 70, shutdown at 90, and curtailment's "keep mining"
   (+5 grievance at the Texas site).

14. **Power contracts and negotiation** (design thread decisions, 26 Sep 2026; rules in
   `interrupts.json` › negotiation, `sites.json` Texas power_options, `shocks.json`): every non-garage
   site has a contract from when it's powered; renewals in the Plan phase (a to-do row and a dialog:
   accept the opening, or negotiate over 3 rounds with a walk-away warning); Texas fixed or index;
   Winter Storm Uri in 2021Q1; index contracts earn 1.5× curtailment credits. Terminal: `renew`,
   `negotiate`, `counter`, `accept`, `walk`.

### Not built yet (shown as locked "not built yet" rows or missing)

Nothing in the scope's build list, and the balance pass is done; what's left is playtesting (see Next). The
undersized-transformer flaw is fixed by the "Upgrade transformer" action (landlord_sale works through its
event card; noise ordinance and hostile council through Heat). The UI has no automated tests (would need e.g. jsdom:
ask first).

## Decisions

### Confirmed by the owner

- Start with $10k and no rigs. Machines earn from the quarter after purchase (Q1 2017 earns nothing).
- 13-week quarters (real ones trimmed or padded); the Merge lands in week 11 of 2022Q3 (partial week),
  no ETH revenue from week 12.
- Prices exactly as in the market CSV (no random wobble).
- Weekly failure roll; used machines fail 1.5× as often; repairs happen in the Plan phase.
- The small unit can be built without scouting; warehouse and up need scouting first.
- **Power contracts** (the design thread's answers, 26 Sep 2026):
  - A negotiation is a contract renewal. Every non-garage site has a contract; the first starts when it's
    powered, at the normal price (tier path × scouting multiplier), for 4 quarters. The garage stays on
    household prices. At the end of a term the renewal comes up in that Plan phase: negotiate (2 BW) or do
    nothing, and the opening applies (0 BW).
  - Opening = normal price × 1.10. Hidden limit = normal × U(0.85, 1.05) (from the normal price, not the
    opening); × 1.03 for an 8-quarter term; a hires hook (−5%) waits for hires.
  - Rounds: counter ≥ limit → signed at your price; within 10% below → the utility comes back halfway
    between its last offer and its limit; lowball → 25% walk-away, else it comes back halfway. After round
    3: take its last offer or walk away. A walk-away (either side) = the opening for 4 quarters. BW is
    spent either way.
  - The price is locked for the term (it ignores the price path); the next renewal opens at the then-normal
    price × 1.10. The contract replaces the scouting multiplier; rate_class ×1.4 and the Heat 50 ×1.2
    apply on top.
  - Texas: pick fixed (3.5¢) or index (2.8¢, the paid price = base × U(0.75, 1.25) each quarter).
    Curtailment credits × 1.5 on index, × 1 on fixed.
  - **Winter Storm Uri** (design thread, option A "firm load", `shocks.json` v2): 2021Q1, the week of
    15 Feb 2021. The grid asks the week before; always asked, exempt from the 3-interrupt cap, default
    curtail. Index + keep mining: the site pays $3.00/kWh ($3,000/MWh) on its contracted load (the full
    power draw of every delivered machine there, broken ones included, undelivered ones not) for 168 hours,
    whether or not the machines switch themselves off; machines that switch off earn nothing (at the storm
    price they do). Index + curtail: no storm charge, credits × 1.5. Fixed: unaffected either way. Keep
    mining adds grievance +5 at Texas. The quarter report has its own "storm power charge" line (the charge
    is also counted in power).
- Coins are sold **weekly** at that week's price (not at quarter end).
- **Per coin:** the keep/sell % is set separately for BTC and ETH (two sliders). The price alert offers
  "Sell 25% of your BTC", "Sell 25% of your ETH" or "Hold".
- **Sell treasury coins from the Plan screen**, 1 Bandwidth per sale, choosing the coin and the share.
  This goes **beyond the scope doc's action list (§2.6)**: the owner chose to add it without a swap.
- Fonts self-hosted with Fontsource (no Google Fonts CDN).
- Friends & family: 2 Bandwidth, +$40K for 10%, open 2017Q1–2018Q2, once per game (from `capital.json`).
- Seed: 2 Bandwidth, +$1.5M for 20% ($6M pre-money), open 2017Q4–2019Q4, once, needs a powered site of
  at least 100 kW usable capacity (from `capital.json`). Taken as a fixed offer: the scope's fallback
  while the negotiation mini-game isn't built.
- Series A: 2 Bandwidth, +$8M for 20% ($32M pre-money), open 2019Q1–2021Q2, once, needs 1 MW of usable
  capacity powered across all your sites (`requires.min_total_mw`; balance review, was one 1 MW site). IPO / SPAC: 3 Bandwidth, +$150M for 15%, open 2021Q1–2021Q4, once, needs
  a powered 20 MW site and at least $3M EBITDA in the last quarter report (was $5M; balance pass). Both from `capital.json`, taken
  as fixed offers like the seed round. **Not yet confirmed by the owner.**
- **Sound** (scope §2.13, docs/audio; the owner approved installing `zzfx`, MIT, 1.3.2):
  `docs/audio/sounds.ts` and `sfx.ts` moved to `src/ui/audio/` (as CLAUDE.md said; `audio-notes.md`
  stays in docs). `src/ui/audio/director.ts` picks sounds by comparing the game state before and after
  each action or week, so the sim knows nothing about sound: End plan, the report, alerts (price up /
  down, margin call, failure wave, complaint, other cards: a bell), buying, selling, hiring, deals and
  walk-aways, auctions won/lost, a site powering up, curtailing, liquidation, the IPO bell, the Merge,
  the chapter report, game over — at most 3 at once. Audio starts after the first click (browser rule);
  the Settings sound switch mutes everything. The week tick stays off (as the audio notes say).
  Not done: the 4 sample fallbacks the audio notes suggest (paper, stamp, coins, door) if the synth
  versions sound wrong — needs an ear test; the separate UI / alerts volume sliders.
  `g2g.load` and saves now go through `restoreSave`, which fills any missing fields (event state too).
- **Left-nav screens and Settings** (wireframes §3, §4, §12; built by Claude Code):
  - Fleet & Sites (the fleet panel, the site ladder, a machines table, the machine market, and
    buttons for the Buy / Repair-sell / Site-offers dialogs), Capital (funding ladder, cap table bar,
    the valuation broken down from the last report, both loans with the LTV gauge marked at 50/70/80%),
    People (the hires table), League (the last report's table and rivals still to come), Log (every
    log line, newest quarter first).
  - The sections open in the Plan phase only; during the live quarter and the report the nav shows
    them greyed ("Open it in the Plan phase"), so alerts and the timeline can't be missed. Ending the
    Plan phase goes back to the Dashboard.
  - Settings (the top bar's gear): sound on/off, the live quarter's starting speed (1×/2×/4×), the
    save panel, and the glossary (the content pack's 29 terms). Stored in the browser
    (`src/platform/settings.ts`), failing softly like saves.
- **Failure wave** (design thread F1–F4, 26 Sep 2026; `interrupts.json` › failure_wave,
  `src/sim/systems/failureWave.ts`): one roll per site per quarter (weeks 2–12, own stream), only for
  sites with 10+ working units (so never the garage). Chance = 6% × (1 + 0.5 × the site's used share)
  × 2 if "Run hot" (heat_wave card) was chosen that quarter × 0.5 with the Ops Manager; the chance is
  worked out in the wave's week, from what's there then. It breaks 5–10% of the site's working units
  at once (used first), on top of weekly failures, and counts toward the 3-interrupt cap: Rush repair
  (1.5× the repair price, back next week) or Run degraded (default: off until a Plan-phase repair).
  With the cap full, or another alert on screen that week, the units break silently (a log line).
  Sim: a warehouse of 90% used machines gets 1.51 waves per game (2018Q3–2022Q3, median 1); a
  new-only fleet with the Ops Manager 0.53; no bust in a wave quarter; the raise bots (3–4 sites)
  see ~3.3 per game. No tuning needed.
- **Event cards** (scope §2.10; design thread 26 Sep 2026; `src/content/events.json`,
  `src/sim/systems/events.ts` + `eventEffects.ts`, card text in `src/i18n/content.en.json`):
  - 9 scripted + 10 random cards, plus Uri (the existing Uri alert now shows the card's title and
    story above its rules). Effects are structured keys implemented in events.ts (no string
    expressions); the loader rejects unknown keys and conditions.
  - Scripted: pause the live quarter in their historical week when `requires` holds (halving needs S9s;
    SPAC mania needs IPO eligibility, otherwise it's just the news line); not counted toward the 3
    interrupts.
  - Random: from 2017Q3, one roll per quarter (35%), a random week 2–12, picked by weight among the
    cards whose trigger holds, each at most once per game, counted toward the cap (a full cap means no
    random card that quarter). The Heat 70 moratorium and the rate_class rate hike skip the roll when
    their condition is first met and take the quarter's slot; the rate hike, if the cap is full, comes
    in week 1 of next quarter. Own random streams (`events:<q>`, `event_roll:<q>:<card>`).
  - Defaults = the passive option (A4), with winter_bottom → keep running and farm_fire → patch.
  - Overlaps (B): Uri keeps the built firm-load rules; SPAC mania makes the IPO cost 2 Bandwidth for
    the rest of 2021; "go shopping" (2018 winter) guarantees an auction lot in 2019Q1; the rate_class
    flaw's silent hike is gone — its card fires in the quarter the flaw kicks in (accept ×1.3, or fight
    ×1.1 and −2 Bandwidth next quarter, both until the site's next contract renewal; `rate_class` is
    1.3 in sites.json now); the moratorium card announces Heat 70 (lawyer up $80K: 40% it lifts for 4
    quarters); landlord_eviction fires only at landlord_sale sites from their 3rd quarter; "heat ±x" =
    grievance ±x at the card's site.
  - Live cards with Plan-phase effects (C): price changes (btc_peak +10%, covid −30% used, China −25%
    used, scam −50% used) apply in the next Plan phase, which also opens on the Buy dialog when the
    card says so. The markup rig and S9 sales happen at once.
  - Rules (D): mothball = machines off and rent ×0.3 until the end of next quarter ("until spring");
    luna "ride it out" = margin call 60% / liquidation 70% for the rest of 2022Q2; spare MW = energized
    capacity not used by machines; rebuild = max($20K, 5% of the fleet's used value) and the site at
    85% for 13 weeks; tax = 20% of the last 4 quarters' EBITDA (min 0), or 6% now + 6% for 3 quarters;
    the gpu_cloud note adds a line on the Merge screen; event multipliers stack with hires and flaws.
  - Chosen by Claude Code: "for a quarter" = the next 13 weeks, "for the quarter" = to the quarter's end;
    choice previews on the card are a dry run (cash and machine count now) plus a one-line hint;
    `buyPriceNow` is the one price function for buying (the Buy action, the market view and the bots),
    so card price changes and the GPU lock apply everywhere; hand-written golden bots skip actions the
    game refuses (a card may have changed their cash); the rig-theft cost was changed (see below).
- **Save / load** (scope §2.13, built by Claude Code to the scope's spec):
  - Autosave at the start of every quarter's Plan phase; one manual slot; export/import as a text
    string (`G2G1.` + base64 of the GameState JSON). Stored in the browser's localStorage; every read
    and write is wrapped, so a private window or blocked storage just says "use Export instead".
  - The title screen offers Continue (the autosave), Load saved game (the slot) and Import a save; the
    left nav's "Save / load" opens the dialog any time, including mid-live-quarter (a loaded
    mid-quarter game carries on from that week, exactly as it would have: tested).
  - Loading checks the data (version 1, the basic fields) and fills in any field added to the game
    since the save was made with its new-game value (`restoreSave`), so older saves keep loading.
    A save from a future format version is refused with a message.
  - `src/platform/` now exists (storage only); the sim never imports it.
- **The Merge and the chapter report** (design thread, 26 Sep 2026; `merge.json`):
  - After the 2022Q3 report, Next opens the Merge screen (new phase `merge`): the 4 choices, all
    always available, with a note when one doesn't fit ("You own no GPUs." for the GPU choices, "You
    have no site beyond the garage." for hosting and hold-and-wait: `applies_if` in merge.json), and
    your position: GPUs and their resale value at the game's 2022Q3 used prices (which match the
    Oct-2022 resale data: RX 580 ×6 ≈ $480–550, 3060 Ti ×6 = $1,800), BTC hashrate, energized kW
    used vs idle. Picking one (`MERGE_CHOOSE`) ends Act I (`ended`); it has no mechanical effect and
    is shown in the chapter report with its Act II preview.
  - Chapter report: net worth = founder stake × the last valuation (never below 0), a title from the
    bands (under $1M Hobbyist, $1M Operator, $10M Contender, $100M+ Titan; a bust is "Bust"), the peak
    valuation and its quarter, the league rank, the valuation curve with the peak marked, the Merge
    choice, key moments (rounds raised, sites powered, best and worst EBITDA quarter, forced sales,
    margin calls and defaults, the Uri choice, and "Rivals: who went bust and who reached the Merge"),
    the league table, and New career / Try again / Export run (the run as text, copied to the
    clipboard when allowed and shown in a box). A bust shows the same report, "Chapter ends early",
    without the Merge.
  - Chosen by Claude Code: sim bots pick `bot_default` (hold_and_wait) at the Merge; the choice names
    are short labels in `en.json`, the long texts come from merge.json; all 4 rivals reach the Merge
    in the data (Core Scientific's bankruptcy is Dec 2022, after Act I); the terminal game asks the
    Merge question and prints the same text summary.
- **Read the market** (design thread, 26 Sep 2026; `interrupts.json` › read_market,
  `src/sim/systems/readMarket.ts`): once per quarter in the Plan phase, 1 Bandwidth (0 with the
  Trader). For BTC and ETH: ▲ up (more than +15%), ▼ down (more than −15%) or ≈ flat, from the Plan-phase
  price (the quarter's first week) to its last week. Each read is right 75% of the time (seeded, own
  stream `read_market:<quarter>:<coin>`); a wrong read is one step off, never up ↔ down (a wrong "flat"
  truth becomes up or down 50/50). Chosen by Claude Code: the flavour line follows the BTC read (3
  lines in `en.json`); the read stays on the Signals card and on the Live screen for that quarter.
- **Hires** (design thread, 26 Sep 2026; `hires.json`):
  - Hire any quarter: 1 Bandwidth and a quarter's salary in cash (no signing cost). Salary = yearly ÷ 4,
    straight line from the 2017 to the 2021 value by year, 2021 × 1.08 in 2022; paid weekly, counted in
    EBITDA (the report has a "Salaries" line). Let go: 0 Bandwidth, a quarter's salary as severance, and
    no rehiring the same person in that quarter. Unpaid salaries just drain cash (the normal bust rules).
  - Effects start at once, except the Chief of Staff's +1 Bandwidth (from the next quarter; cap 6).
    Ops Manager: failure chance × 0.5 everywhere. Trader: Read the market free; the LTV 65% warning
    becomes an alert that pauses the live quarter (`margin_warning`: repay now or carry on; not counted
    toward the 3 interrupts). BD Lead: +1 scouting offer, offers show their flaw, and the investor
    pitch limit × 1.05 (`capital.json` pitch hire_shift 0.05, hire_shift_source bd_lead). Ex-Utility
    Exec: build time −1 quarter but never below 1 (small unit and warehouse stay 1, own site 2 → 1,
    Texas 3 → 2), and the utility's limit × 0.95 in power negotiations.
  - Chosen by Claude Code: the negotiation and pitch store the hire shift when they start (hiring
    mid-negotiation doesn't move a limit already drawn); role names and effect text are in `en.json`,
    the people's names and bios come from `hires.json`; the loader checks the Ex-Utility bonus equals
    `interrupts.json` negotiation hire_shift.
- **Investor pitches** (design thread, 26 Sep 2026; `capital.json` › pitch, `src/sim/systems/pitch.ts`):
  - Only the seed and Series A can be pitched; friends & family and the IPO / SPAC stay fixed offers.
    "Take the offer" stays as the one-click option.
  - You haggle over the pre-money valuation; the amount raised is fixed, so dilution = amount ÷
    (valuation + amount). The investor opens at `pre_money_usd` (seed $6M, Series A $32M). Its hidden
    limit (the highest valuation it will sign) = opening × U(0.95, 1.25), above the opening ~83% of the
    time; when it is below, the investor holds at the opening (accepting stays safe).
  - 2 Bandwidth at the start, lost if there's no deal. 3 counters: at or under the limit → signed at
    your valuation; within 10% above it → they come back halfway toward their limit; more than 10%
    above → 25% chance they walk, else halfway. After 3 counters their offer is final.
  - A walk-away by either side closes the round for 1 quarter and reopens it with the opening 10%
    lower, stacking to 20%. Taking the offer after that takes the lowered opening. A deal resets it.
    If the lockout runs past the round's window, the round is gone for good (the screen will warn
    first: "Walking away ends this round for good.").
  - The numbers mirror the power negotiation's but live in `capital.json` › pitch so they can be
    tuned separately. The loader checks each pitched round's dilution = amount ÷ (pre-money + amount).
  - Screen (chosen by Claude Code): the seed / Series A row opens a dialog (the offer explained, Take
    the offer, Pitch); the pitch panel shows their valuation, your counter on a slider (their offer up to
    1.5× the opening, $10K steps for the seed, $50K for Series A, starting 10% above their offer), the
    share you'd give up and your stake after (1 decimal), the walk-away risk, and the "Walking away ends
    this round for good." warning when it applies; then a result view. While a pitch is open the row
    reads "Pitching the seed round · their offer …" and End plan is refused. A walked-away round's row
    shows "investors walked away · reopens <quarter>" (or just "investors walked away" if gone).
  - Sim targets (design thread, re-judged after the first check; its first target was a math error):
    pitcher 1.10 / 1.05 → stake +0.8 to +1.5 points vs the terms, walk-aways ≤ 10%; bold 1.20 / 1.10 →
    at least +0.2 points above the pitcher, walk-aways 12–25%. Both pass with the numbers as they are
    (pitcher +1.0 / 5%, bold +1.3 / 17%). If bold ever beats the pitcher by more than 1 point with
    walk-aways under 12%, raise walkaway_chance to 0.30.
  - Chosen by Claude Code: the limit is drawn from the opening in effect (after any penalty); the
    rolls use their own stream (`pitch:<quarter>:<round>`), so each quarter's pitch has a fresh limit;
    a pitch and a power negotiation can't be open at the same time; a pitch can only start in the
    Plan phase and blocks End plan until it's settled.
- **Community Heat** (the design thread's answers, 26 Sep 2026):
  - Heat = heat_base + load + grievance + era, clamped to 0–100. load = heat_load_max × running MW ÷ site
    capacity (garage: heat_per_unit_garage per running unit); only machines that mined count. Grievance:
    ignored complaint +10, curtailment "keep mining" +5, pay −10, outreach −15; fades 5 per quarter
    toward 0; goodwill floor −10. Era: +5 from 2021Q3 at sites of 1 MW or more. hostile_council × 1.5 on
    every increase. noise_ordinance +15 base.
  - Complaints: one per quarter at most, for the hottest site at Heat ≥ 30, rolled once at a random week
    with chance (Heat − 20)%, counting toward the 3 interrupts; if the cap is used up it waits for next
    quarter (never auto-answered). Answers: pay $5K (grievance −10) · sound walls (= noise mitigation)
    · ignore (grievance +10, the default).
  - Outreach: 1 Bandwidth, $10K × MW (min $10K, max $250K), grievance −15, once per site per quarter.
    Noise mitigation: 0 Bandwidth, $30K × MW (min $30K, max $1M), base −10 for good, once per site,
    shared with the complaint's sound walls.
  - 50: +20% power price the quarter after, until a quarter ends below 50; its own report line.
    70: moratorium (no new machines there). 90: shutdown (machines stop mining) for at least one full
    quarter, then lifted at a quarter's end once Heat < 60.
- **Leaving a site:** penalty = 1 month of that site's own rent (⅓ of quarterly rent), no Bandwidth.
  Machines on the site are sold automatically at the used price. Allowed while the site is still being
  built (build money is lost). The garage can't be left. The tier can be built again later at full cost.
  Rent stops for the whole quarter you leave in.

### Chosen by Claude Code, reported, not objected to (change freely if the owner asks)

- **Distressed auctions** (interrupts.json › distressed_auction, with structured fields added to the live
  copy: windows, models, ranges, Bandwidth). **Not yet confirmed by the owner:**
  - It's a **Plan-phase action, not a mid-quarter interrupt**: the lot is announced at the start of the
    Plan phase and you bid there. Reasons: bidding costs 2 Bandwidth (scope §2.6), which is spent in the
    Plan phase, and you need a chance to make room (sell machines) for the lot. It doesn't count toward
    the 3 interrupts per quarter.
  - Windows 2018Q4–2019Q2 (S9s or GPU Gen 1 rigs), 2020Q2 (S9s), 2022Q2–Q3 (S19 Pros); 50% chance per
    window quarter. Lots of 50–500 units in tens, list = that quarter's used price. Minimum bid 40–60% of
    list; 2–3 rivals (in the game that quarter) bid 50–90% of list each.
  - One sealed bid, for the whole lot, settled at once. The highest bid wins and pays what it bid (a tie
    goes to the rival). Win or lose, the 2 Bandwidth is spent; losing costs no money and shows who won
    with what. The lot must fit at one site. The machines arrive used, at once, and earn next quarter.
  - No bid: when the quarter starts, the best rival takes the lot (a log line says who and for how much).
  - Its rolls use a separate random stream per quarter (`substream` in `rng.ts`), so adding auctions
    didn't change the failures or site offers of any existing game (the golden files only gained lines).
- **Grid curtailment** (interrupts.json › curtailment, with structured fields added: tier, Q3, 35%,
  $15K/MW, 1.25×, alert weeks). **Not yet confirmed by the owner:**
  - Once per Q3 at most, 35% chance (own random stream), only if machines on a Texas site would be
    mining. The alert comes at the end of a week (2–12) and is about the **next** week, so the game can
    pause and you choose before it happens. It counts toward the 3 interrupts per quarter.
  - Curtail (default): the Texas machines mine nothing and use no power that week; the credit is
    max($15K × MW, 1.25 × that week's forgone revenue), worked out when the grid asks and paid in the
    curtailed week. MW = working Texas machines that would be running. In 2021 the 1.25× rule always wins.
  - Keep mining: grievance +5 at the Texas site (Heat system, 26 Sep 2026).
  - Credits count toward EBITDA (so valuation), are included in the report's cash line, and get their own
    report line. Uri (2021Q1) is left to its event card, as the content review says.

- **Power contract details chosen by Claude Code** (within the design thread's rules). **Not yet confirmed:**
  - Doing nothing on a due renewal keeps the same contract type and takes the opening for 4 quarters.
    Accepting the opening from the dialog costs no Bandwidth and lets Texas switch type.
  - A negotiation must be finished (deal or walk away) before the quarter can start; only one at a time.
    Countering above the utility's current offer just takes that offer. The walk-away warning uses only the
    public rules (the lowest and highest the limit could be), never the hidden limit.
  - The first Texas contract is fixed (index only from its first renewal). Index moves are rolled at each
    quarter start (and when a contract is signed), on their own random stream.
  - Uri: the grid asks after the week before the storm (week 7 of 2021Q1) when Texas machines would mine
    or an index contract has a storm charge at stake (e.g. every machine broken). The curtailment credit is
    priced at normal power, not the storm price. The storm charge is paid in the storm week and counts as
    power (so in EBITDA and the report's cash line).
  - Curtailment credits are now worked out per Texas site (then × its contract's multiplier) and added up.
- **Heat details chosen by Claude Code** (within the design thread's rules). **Not yet confirmed:**
  - Heat is worked out after each week's mining and stored per site; the Plan screen shows the value from
    the last week played. "Site MW" for costs = the site's usable capacity (a 5 kW garage pays the minimum).
  - Rate hike: decided from Heat at each quarter's end (≥ 50 → next quarter hiked; < 50 → the hike ends).
    The shutdown starts the week Heat reaches 90. The moratorium uses Heat at the moment you buy.
  - The complaint check comes after margin calls and curtailment in a week, before price alerts. A
    complaint that can't show because another card is up tries again the following week.
  - Complaint chance offset (20) and threshold (30) moved into `heat.json` (complaint_at,
    complaint_chance_offset). In interrupts.json the complaint's pay/ignore effects now change grievance.
  - The report's 6th tile shows the hottest site's Heat and its change vs the previous report; valuation
    stays in the top bar and the league table.
- **League table:** ranked by value: the rival's market cap (`mcap_musd`) against your company valuation.
  A rival joins the table in the first quarter it has any number (Bitfarms 2017Q3, Riot and Marathon
  2017Q4, Core Scientific 2018Q2). A rival with no market cap yet shows "private" and sits at the bottom,
  unranked (Bitfarms until 2019Q3). Scale shows the rival's MW and hashrate. **Not yet confirmed.**

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
- Price alert: bigger of the BTC/ETH weekly move, threshold 15%; only fires if you hold coins. A "sell"
  choice is only offered for a coin the treasury holds. HODL starts at 0% for both coins (sell everything).
- Plan-screen treasury sale: shares of 25/50/75/100%, at the quarter's first-week price (the price the
  Plan screen shows). Bots answer alerts on a drop by selling the coin that fell.
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
- **Crypto-backed loan** (`capital.json` game_crypto_loan: up to 50% LTV at 9% a year, margin call at 70%,
  liquidation at 80%, open 2018Q1–2022Q2). **Not yet confirmed by the owner:**
  - One at a time, 1 Bandwidth. You pick BTC or ETH and an amount; exactly enough coins to make LTV 50%
    move from the treasury to the lender (at the Plan-screen price). Interest is paid weekly in cash;
    there's no fixed term, you repay the whole loan whenever you like and get the coins back.
  - Pledged coins still count in the valuation (and the loan counts as debt); they can't be sold.
  - Checked every week after money moves, before the price alert: LTV ≥ 80% → the lender sells enough
    pledged coins to repay the loan and returns the rest (a shortfall comes out of cash). LTV ≥ 70% →
    a margin call pauses the quarter. A warning is logged the week LTV first reaches 65%.
  - Margin calls don't count toward the 3-alerts-per-quarter cap (they can't be skipped).
  - Answers, each offered only if affordable: post more of the same coin from the treasury, **pay the
    loan down with cash (an addition to the content pack's three choices)**, sell machines (oldest
    first, used price), or default. Each brings LTV back to 50%. Default: the lender keeps the pledged
    coins, the debt is written off, and no loan of either kind for 4 quarters.
  - The pre-selected answer is the first one possible of: post → pay cash → sell machines → default.
  - Loans taken before 2022Q2 carry on after the window closes; only new ones stop.

## Balance pass (design thread, 27 Sep 2026)

**Changes** (only these; the price paths, machines, site ladder, scripted dates and the Heat /
negotiation / Uri rules were not touched, per F2):
- `capital.json` › era_multiple_ev_ebitda, 2021 only: Q1 25→35, Q2 16→22, Q3 15→22, Q4 14→25, then
  **→30 by the thread's fallback rule** (the great path stayed under $1.5B). 2017–2020 and 2022 unchanged.
  The formula is unchanged (EBITDA × 4, floored at 0, × multiple + cash + coins − debt).
- IPO bar: $5M → **$3M** quarterly EBITDA.
- rig_theft: from 2018Q1, sites with 6+ units (`min_units`), weight × 0.5 at the garage
  (`garage_weight_mult`), via a new random-card `window`.
- section301_tariff: 2018Q3–2019Q4, any quarter whose Plan phase bought new ASICs (trigger
  `bought_new_asics`). Pay = 25% of that quarter's new-ASIC spend; wait = undelivered new ASICs arrive a
  quarter later.
- spac_mania_2021 always fires in 2021Q1: the roadshow offer if IPO-eligible, else a news-only card
  (`news_unless`, text `body_news`, one "Keep building" answer).
- Bots: the raise-* bots are the **good path** (F&F, seed, Series A; they climb no higher than the 20 MW own
  site; no IPO). New: **texas-ipo** (the great path: + IPO, then Texas; scouts ahead; fills with the most
  profit per kW once it has the cash; equipment loans up to 50% of the machines' value), **stop-2022** (no
  buying, repairs or building from 2022Q1), and the measurement bot **texas-ipo-upgrade** (texas-ipo that
  also sells old machines for ones making 2× the profit per kW). Bots skip sites under a moratorium.
- Sim report: the valuation split (ops / cash / coins / debt) at the peak and at the Merge, drawdown, idle
  share at the Merge, IPO/Texas runs, the seed cash floor.
- Tests: the reinvest-bust anchor (ff-climb, 20 seeds: 16+ bust, all in 2018Q2–2019Q2), the seed cash
  floor, rig_theft/tariff/SPAC triggers, and controlled tests that force the landlord-sale flaw, the
  rate-class flaw and Heat 70. Scope §5 updated with the new anchors.

**Report** (50 seeds per bot, default answers):

| Check | Target | Result |
|---|---|---|
| ff-climb bust | ≥ 80%, 2018Q2–2019Q2 | ✓ 100%: 2018Q4 ×7, 2019Q1 ×43 |
| Seed cash floor (raise-climb) | < 50% of the seed in 2018–19, no bust | ✓ median 38%, 50/50 runs under 50%, 0 busts |
| Garage $/day (Gen 1, Q4 2017) | $7–8 | ✓ unchanged ($7–8.5 test; loses money in Q4 2018) |
| Good peak (raise-*) | $400–700M | ✓ $485–515M median, but in **2021Q4**, not 2021Q1 |
| Great peak (texas-ipo) | $1.5–2.5B | ✗ **$669M** (2021Q4), even after the 30× fallback |
| Drawdown (good path) | −85% to −95% | ✗ **−97%** (was −96% before the fallback) |
| Idle share at the Merge | 30%+ of good runs with 10%+ idle | ✓ 50/50 runs, median **100%** idle |
| Cautious card impact | within ±15% | ✓ $41.3K vs $41.5K without cards (−0.5%); no 0.25 garage weight needed |
| Card frequencies | 15–70% of runs (theft 30–60%) | rig_theft 61% (target 30–60%, 1 point over), farm_fire 59%, used_rig_scam 54%, heat_wave 46%, friend 59%, tax 58%; flaw-bound landlord 10%, moratorium 11%, rate hike 17% (accepted as rare, controlled tests pass); **section301_tariff 0%** (no bot buys new ASICs in 2018Q3–2019Q4; the controlled test passes); spac_mania 88% (= every run alive in 2021) |

**What the numbers say:**
- **Where the value is.** The good path's peak is almost all operations ($481M ops + $13M cash + no
  coins, raise-climb). At the Merge its operations are worth $0 and its value is its ~$15M of cash: that
  is the −97%. Per F4-amended, this is reported, not tuned.
- **Why the great path misses.** The first quarter with $3M+ EBITDA is 2021Q1, so the IPO comes in 2021Q2
  at the earliest (43/50 runs take it). Texas takes a quarter to scout (texas-ipo scouts ahead) and 3 to
  build, so it is ready in 2022, after the 2021 peak and when multiples are 9× → 4×. At the peak, texas-ipo
  is $538M of operations plus ~$131M of unspent IPO cash.
- **The fleet is the real lever.** The raise bots fill the 20 MW site with S9s in 2019–20 and never
  replace them (S19 Pro: 3.3× the hashrate per kW). texas-ipo-upgrade, which swaps old machines for the
  most profit per kW once the IPO money arrives, turns the 20 MW site into GPU Gen 2 rigs in 2021Q2–Q3
  (ETH mining paid ~3× an ASIC per kW in 2021) and peaks at **$6.2B** (2021Q4, EBITDA ~$50M a quarter), then
  −96% by the Merge (the Merge ends GPU mining). So the $1.5–2.5B band sits between "never upgrade" and
  "upgrade everything".
- **Idle MW is 100%, not "some".** In the last week of 2022Q3 the hashprice is $0.079/TH/day, below an
  S9's power cost at every site, so every S9 switches itself off; ETH revenue is 0 after the Merge. The
  target passes, but "some runs" became "every run".
- **Other:** the raise bots now peak in 2021Q4, not 2021Q1: their EBITDA keeps growing through 2021, and
  25–30× on ~$4M/quarter beats 35× on ~$3M. The seed-2017 golden for raise-climb/-negotiate/-pitch changed
  path (rig theft now shifts the random numbers): it scouts a warehouse with the undersized-transformer
  flaw, stays under 1 MW and never qualifies for Series A (end value $16.8M → $0.76M). A legitimate outcome.

### Balance review (design thread, 27 Sep 2026, second round)

**Decisions:** the great-path target stays $1.5–2.5B; fix the timing. Good-path drawdown band −85% to −98%
(the EBITDA floor at 0 makes near-total drawdown correct when every machine is off); 100% idle at the Merge
is the intended setup; the 2021Q4 good-path peak matches the real Nov-2021 top; rig_theft 61% and a
player-only tariff card are accepted. A flaw must be fixable.

**Built:**
- **Texas construction loan** (`capital.json` › loans.construction, `src/sim/systems/construction.ts`): when
  you build a Texas offer you can finance 60% of its cost (11% a year, 8 quarters, weekly payments like the
  equipment loan; counts as debt). From 2020Q3, needs Series A closed and a signed power contract at one of
  your sites (read as "any site you own has a contract"), one at a time, no extra Bandwidth. Offers dialog:
  "Build with a loan · $X cash"; Plan: "Repay the construction loan"; terminal: `build <offer#> loan`,
  `repay construction`.
- **GPU shortage cap** (`machines.json` › new_gpu_cap): 2020Q4–2022Q1, at most 250 kW of NEW GPU rigs bought
  per quarter across all sites; used rigs uncapped. The Buy dialog's Max respects it.
- **Upgrade transformer** (sites.json undersized_transformer: `upgrade_cost_usd` 250,000 → **150,000**,
  `upgrade_quarters` 1, `upgrade_bw` 1): Plan row "Upgrade the <site>'s transformer"; the flaw clears when
  the next quarter starts. Terminal: `upgrade <site#>`.
- **Series A** counts total powered MW across sites; the Capital screen shows what an open round still
  needs, e.g. "Series A needs 1 MW powered across your sites (you have 605 kW)."
- **texas-ipo bot:** builds Texas on the construction loan as soon as it's allowed and affordable; buys
  machines for a site that powers on next quarter (so they earn from its first quarter); after the IPO it
  replaces S9s with S19s wherever they make more per kW (ASICs only, no GPU swap). The bots' fill takes a
  second machine type when the GPU cap stops the first.

**Report** (50 seeds):

| Check | Target | Result |
|---|---|---|
| texas-ipo peak | $1.5–2.5B | ✓ **$2.3B, 2021Q4** (IPO in 43/50 runs); the Texas 3→2 fallback was not needed |
| texas-ipo drawdown | −85% to −95% | ✓ **−87%** (Merge: $268M of operations, S19s still running) |
| texas-ipo idle at the Merge | — | 37/50 runs ≥ 10% idle, median 16% |
| texas-ipo-upgrade after the GPU cap | ≤ texas-ipo + 50% (≈ $3.45B) | ✗ **$6.2B**, unchanged |
| ff-climb | unchanged | ✓ 100% bust (2018Q4 ×7, 2019Q1 ×43) |
| good path | unchanged | ✓ $485–515M, 2021Q4, −97%; every golden replay ends exactly as before |

- **Where texas-ipo's value comes from:** not Texas. After the 2021Q2 IPO it swaps the 20 MW site's S9s for
  ~6,150 used S19 Pros (no lead time for used), and EBITDA goes from ~$3–4M to ~$18.5M a quarter from
  2021Q3. Texas is ready in 2022Q2 in 33/50 runs. The construction loan is never used: the 40% cash part
  (~$16M of a $40M site) is far beyond what the bot has before the IPO (~$1–5M).
- **Why the GPU cap doesn't bite:** texas-ipo-upgrade buys ~23,500 **used** GPU Gen 2 rigs in 2021Q2–Q3,
  which the cap leaves alone by design. EBITDA ~$50M a quarter → $6.2B.

### Balance review 2 (design thread, 27 Sep 2026, third round)

**Decisions:** cap used GPUs too; keep the construction loan and build Texas in phases; the great path =
S9→S19 upgrade **and** Texas online in 2021 (Texas ≥ 25% of peak EBITDA, median peak $1.5–3.0B); the
Texas loan is secured on Texas's own contract, chosen (fixed or index) when phase 1 starts.

**Built:**
- **GPU cap on all GPU rigs** (`machines.json` › `gpu_cap`, was `new_gpu_cap`): 2020Q4–2022Q1, 250 kW a
  quarter across all sites, new + used + auction lots; in that window a used GPU rig costs at least the
  new price (`used_price_min_new_mult` 1.0).
- **Phased Texas** (`sites.json` › texas_site.phases): 5 phases of 20 MW, each 20% of the offer's cost;
  phase 1 from 2020Q3 with Series A closed; later phases any time after phase 1. The site's capacity for
  placing machines = phases started; only powered phases run (`poweredKw`): delivered machines beyond the
  powered kW wait (mining scales them by powered ÷ placed kW). Phase 1 (BUILD_SITE on the Texas offer)
  signs Texas's power contract, fixed or index, with a term ending that quarter, so it is negotiated (or
  auto-accepted at the opening) like a renewal. Later phases: BUILD_PHASE. **Phase build time: 3
  quarters** — the decision said 2, and its fallback rule ("over $3.0B → 3") fired: see the report.
- **Construction loans:** one per financed phase (`constructionLoans`, a list; older saves migrate), 60% of
  the phase cost, 11%, 8 quarters; needs Series A and the Texas site's own contract. Repay-all action.
- **UI/terminal:** the offers dialog picks the contract and builds phase 1 (cash or loan); Plan rows
  "Build Texas site phase N of 5 (20 MW)" and "… with a construction loan"; the fleet shows "k of 5
  phases powered"; terminal `build <offer#> [loan] [fixed|index]`, `phase <site#> [loan]`.
- **Sim:** quarter reports carry `marginByTier` (mining revenue − power by site tier) and the report
  shows Texas's share of EBITDA in the peak quarter.
- **texas-ipo bot:** phase 1 on the loan as soon as it can (it keeps 1 Bandwidth free for it before the
  IPO and saves cash for it); phases 2–5 after the IPO (cash, or the loan if short); fills only powered
  phases (next quarter's, buying ahead); S9→S19 after the IPO.

**Report** (50 seeds; phases at 3 quarters, 2021Q4 multiple 30):

| Check | Target | Result |
|---|---|---|
| texas-ipo peak | $1.5–3.0B | ✓ **$2.2B, 2021Q4** |
| Texas share of peak EBITDA | ≥ 25% | ✗ **median 0%** (≥ 25% in 3/42 runs): phase 1 (2021Q2) powers on in 2022Q1 |
| texas-ipo drawdown / idle | −85% to −95% | ✓ −88%; idle ≥ 10% in 49/50 runs, median 25% |
| texas-ipo-upgrade (GPU swap) | ≤ texas-ipo × 1.5 | ✓ **$606M** (was $6.2B) |
| ff-climb | unchanged | ✓ 100% bust (2018Q4 ×7, 2019Q1 ×43) |
| good path | unchanged | ≈ $490.4M (was $490.8M; the used-GPU price floor touches its few GPU buys) |
| golden replays | unchanged | 8/11 identical; heat-climber, negotiator, pitcher end +0.5% (same GPU cause) |

- **The two great-path checks conflict.** With **2-quarter** phases (the decision): peak **$4.3B** ✗,
  Texas **49%** of peak EBITDA ✓ (≥ 25% in 34/42 runs), drawdown −95%. With **3-quarter** phases (the
  fallback): $2.2B ✓ but Texas 0% ✗. The bot starts phase 1 in 2021Q2 in most runs (before that its cash
  is ~$2–3M, just under phase 1's $3.2M cash part), so a 3-quarter build lands in 2022.
- **Measured alternative (not applied):** 2-quarter phases + 2021Q4 multiple 20 → texas-ipo **$2.9B** ✓,
  Texas **49%** ✓, drawdown −93% ✓; the good path then peaks **$406M in 2021Q1** (in its $400–700M band,
  barely).

### Balance review 3 (design thread, 27 Sep 2026): the balance pass is DONE

**Applied:** Texas phase build 3 → **2 quarters**; era_multiple_ev_ebitda **2021Q4 30 → 20** (2021Q1 stays 35,
Q2–Q3 22). Guard rails (good path < $400M → 2021Q1 38; texas-ipo > $3.0B → 2021Q4 18) did not fire. The
0.1% / 0.5% shifts from the used-GPU price floor were accepted. Golden replays re-baselined: 9 files change
by one line each (their 2021Q4 valuation, from the new multiple); every ending is identical. (The three
replays that moved +0.5% in review 2, heat-climber, negotiator and pitcher, did so because of the used-GPU
price floor on their 2021 GPU buys.)

**Final report** (50 seeds per bot):

| Anchor (scope §5) | Band | Result |
|---|---|---|
| Garage Gen 1 rig | ~$7–8/day in 2017Q4, loss in 2018Q4 | ✓ (content test) |
| Reinvest-all bust (ff-climb) | ≥ 80%, 2018Q2–2019Q2 | ✓ 100%: 2018Q4 ×7, 2019Q1 ×43 |
| Seed cash floor (raise-climb) | < 50% of the seed, no bust | ✓ median 38%, 0 busts |
| Good path peak (raise-* bots) | $400–700M | ✓ $405.8M (raise-climb) to $434.5M, 2021Q1 |
| Great path peak (texas-ipo) | $1.5–3.0B | ✓ $2.87B, 2021Q4 |
| Texas share of peak EBITDA | ≥ 25% | ✓ median 49% (≥ 25% in 34/42 runs with Texas) |
| Drawdown to the Merge | −85% to −98% | ✓ good −96%, great −93% |
| Cautious | survives, clearly below good | ✓ 0% bust, ends $41.3K |
| Empty MW at the Merge | 30%+ of good runs with 10%+ idle | ✓ 50/50 (great path: 46/50, median 40%) |
| GPU-swap bot (texas-ipo-upgrade) | ≤ texas-ipo × 1.5 | ✓ $606M |
| Card frequencies | as reviewed | rig_theft 60%, tariff 0% (player-only, accepted), flaw-bound 10–18% (accepted) |

## Balance findings (from `npm run sim`, 50 seeds per bot)

*(Before the balance pass; kept for history. The table's numbers are from 26 Sep 2026.)*

| Bot | What it does | Bust rate | Median end value |
|---|---|---|---|
| cautious | garage only, keeps half its cash | 0% | $41.5K |
| reinvest | garage only, spends everything | 0% | $28.8K |
| raise-climb | reinvest + every round as soon as allowed, climbs the ladder; takes every renewal's opening | 0% | $16.4M (peak $310M, 2021Q1) |
| raise-negotiate | raise-climb + negotiates every renewal (counters at 92%, 97%, 102% of normal) | 0% | $18.2M (peak $334M, 2021Q1) |
| raise-pitch | raise-climb + pitches the seed and Series A (asks 1.10×, then 1.05× the opening, then accepts) | 0% | $16.7M (peak $318M, 2021Q1) |
| raise-pitch-bold | raise-pitch, asking 1.20× then 1.10× | 0% | $16.3M (peak $318M, 2021Q1) |
| raise-outreach | raise-climb + talks to the neighbours at any site with Heat 50+ | 0% | $16.6M (peak $305M, 2021Q1) |
| raise-borrow | raise-climb + the biggest equipment loan whenever it has none | 0% | $16.5M (peak $313M, 2021Q1) |
| raise-auction | raise-climb + bids 85% of list on every lot it has room and cash for | 0% | $16.4M (wins 0.3 lots per game) |
| hodl | garage only, keeps every coin | 0% | $104K |
| hodl-borrow | hodl + the biggest crypto-backed loan whenever it has none | 0% | $65.9K |
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
  Series A or loans).
- **With Series A (2019Q1, $8M) the raising bot reaches the 20 MW own site (powered about 2020Q3)** and
  peaks at about $335M in 2021Q1, still far below the scope's ~$2B target (which needs ~35–40 MW). It
  never takes the IPO: its best quarterly EBITDA is about $4.4M (2021Q4), just under the $5M the IPO
  needs, and it stops adding machines once the 20 MW site is full, piling up ~$20M of cash by the end.
  Founder stake ends at 57.6%.
- The scope's anchor "reinvesting 100% goes bust 2018Q2–2019Q2" is still a to-do test: even with raises,
  reinvesting doesn't over-extend. It probably needs loans (borrowed money that must be repaid).
- A cautious bot (keeps half its cash) with raises builds the small unit only at the very end and never
  takes the seed round.
- **Crypto loans hurt a HODLer in the 2018 crash:** hodl-borrow averages 2 loans, about 2 margin calls and
  1 liquidation per game, and ends at $65.9K against plain hodl's $104K. Nobody goes bust from it alone.
  With F&F (and no seed) the HODLer goes bust in all runs either way; the loan moves the bust from
  2018Q4–2019Q1 to 2018Q3–Q4.
- **Equipment loans barely matter so far.** Half the value of a garage of used rigs is only $2–4K, and
  even raise-borrow's loans (up to about $90K on the warehouse fleet) change little next to $1.5M of
  seed money.
- **Reinvest + F&F (no seed, with or without loans) goes bust in all 50 runs, in 2018Q3.** That is the
  scope's "reinvesting 100% goes bust 2018Q2–2019Q2" anchor; the to-do test could now be written with
  that bot, if the owner agrees that "reinvest" includes taking the F&F money.
- **Auctions barely matter for the bots so far:** the raise-auction bot wins only 0.3 lots per game,
  because it fills every site with new machines each quarter, so there's rarely room for a lot. A player
  who keeps space free (or sells old rigs) can buy 2019 S9s at a deep discount before the 2019 rally.
- **Power contracts (sim checks asked for by the design thread):**
  - Passive vs negotiator: over 50 runs (about 9.6 renewals each), the passive bot signs at 110% of the
    normal price; the negotiating bot averages 97.9% (92–110%, the utility walked away 15 times in 473
    renewals). The passive player pays about 12% more (target: about 10%). Negotiating is worth about
    +$1.8M of median end value ($18.2M vs $16.4M).
  - Texas index vs fixed, with Uri as firm load (no bot reaches Texas, so a controlled test: 3,000 S19
    Pros ≈ 9.75 MW on a Texas site from 2020Q1, 20 seeds, renewals take the opening). Texas margin 2020–22:
    fixed + curtail $54.7M, fixed + keep mining $54.5M, **index + curtail $56.9M** (ahead of fixed ✓),
    **index + keep mining $50.8M** (≈ $50M ✓, below fixed either way ✓; its 2021Q1 margin is $2.2M). Keeping
    on mining costs an index player 0.95 of a typical quarter ($6.4M), inside the 0.7–1.3 band, so the
    storm price stays at $3,000/MWh. (With the first version, index power ×10, it cost only ~16% of a
    quarter.)
  - Adding contracts made every renewal +10% for players who don't negotiate: the fundraising bots' median
    end value fell about $0.5M (from $16.9M to $16.4M).
- **Heat (sim check asked for by the design thread):** the fundraising bot that never talks to the
  neighbours (raise-climb) reaches Heat 50 at a quarter end in 40/50 runs: 19/50 before 2021, 37/50 by
  the end of 2021 (median first time 2021Q1). It gets about 3.3 complaints per game (all ignored), 1.3
  rate hikes, and a shutdown in 3/50 runs. The same bot talking to the neighbours whenever Heat ≥ 50
  (raise-outreach) never reaches 90 (0/50) and gets fewer complaints (2.7), but slightly more rate hikes
  (1.7): outreach at 50 comes after the quarter-end check that starts the hike. Heat costs the
  fundraising bots about $1M of end value. Garage-only bots get 0.4 complaints per game (e.g. 3 S9s and
  a GPU rig in the garage = Heat 30).
- Price alerts cluster (2 per quarter in 2017Q2–2018Q1 and 2022Q2, almost none 2018–2020) because the
  weekly prices are reconstructed from monthly data. Real CoinMetrics data should fix it.

## Open questions for the design thread

- Leaving the 100 kW site also locks you out of the seed round (it needs a powered 100 kW site). Intended?
- Confirm the `min_mw` = usable capacity rule.
- Is the seed round too generous? $1.5M in 2017Q4 makes the 2018 crash harmless for anyone who takes it.
- Confirm the equipment loan rules above (one at a time, weekly payments, no covenant).
- Confirm the crypto loan rules above, especially the extra "pay down with cash" margin-call answer.
- Series A and the IPO taken as fixed offers from `capital.json`: fine until negotiation exists?
- Auctions as a Plan-phase action (not a mid-quarter interrupt): OK? And the lot sizes (50–500 units)
  mostly need a warehouse, so small-unit players rarely have room.
- Curtailment: "keep mining" now costs grievance +5 at Texas (Heat). Curtailing still always pays more
  than it gives up (1.25×), so the choice is Heat vs a small extra profit. Enough?
- Heat check 1 ("reaches Heat 50 at least once by 2021"): 19/50 runs before 2021, 37/50 by the end of
  2021. Which reading was meant, and is that enough pressure?
- Should the outreach bot's threshold (or the player's hint) be lower than 50, since the rate hike is
  decided at the quarter end before the next Plan phase's outreach?
- Confirm the power contract details above (auto-renew keeps the type; Uri doesn't count as an interrupt).
- Replace the reconstructed market data with real CoinMetrics weekly data before final balancing.

## Act II readiness (27 Sep 2026)

The owner brought Act II (Alpha 0.2, 2022Q4 → 2026Q4, 17 quarters) into scope. Sources, all in
`docs/game-project-files/`: the design (`claude_18`, locked decisions + §16 content-pack decisions), the
**draft** scope (`claude_20`, v0.9), the Claude Design wireframe prompt (`claude_21`, v0.9) and the content
pack (`claude_act2-content_*`: report + 15 data files, all complete). CLAUDE.md now says so.

**Blocking the build (decisions, for the owner / design thread), in doc 18 §17's order:**
1. Confirm or override pushbacks **[P1]–[P5]** (doc 18 §16.5: take-or-pay 3%/quarter + walk chance by
   tenant type; mining→hosting $0.1M/MW; pilot cluster 0.5–2 MW; corporate rating CCC− to BBB; construction
   delay 15% a quarter).
2. **Freeze the scope** v0.9 → v1.0 (doc 20 §7 checklist), then copy it to `docs/alpha-0.2-scope.md`.
3. **Wireframes:** update the doc 21 prompt's example data, run it in Claude Design, and bring the result
   (plus, ideally, an Act II mockup like `docs/mockups/q4-2017.html`) into the repo. None exists yet. The
   `campus` era theme already exists in the design-system tokens.

**Content gaps found by Claude Code (not in doc 18 §16.6's fix list):**
- **No ETH price after 2022Q3.** The Act II market files have no ETH column, but the coin treasury carries
  over "as is" (doc 18 §2.1), and an ETH crypto-backed loan can be open. Needs an ETH series (or a rule: sell /
  convert ETH at the act boundary).
- ~~A price seam at the act boundary~~ **fixed** in `docs/act2-content/` (see "Next"): Act I's last week
  $19,480 / 31.5T → Act II's first week $19,700 / 31.5T (+1.1%).
- 2024Q3 has 14 weeks (the loader trims to 13, as in Act I: fine, just noted).
- **Beyond the draft scope:** `hires_act2.json` has 3 new hires (Head of Development, Capital Markets Lead,
  **Government Affairs Lead**); the scope allows the Head of Development + "up to 1 more", and government /
  lobbying is Act III backlog. `gpus.json` has 6 generations (A100, H100, H200, B200, GB200, GB300); the scope
  says Hopper → Blackwell.
- `gb200_nvl72` / `gb300_nvl72` have no `gpus_per_mw_it_load` (rack-based); H100/H200 still at 1,000/MW (§16.6
  fix → 750).
- The ASIC price index and SOFR / spread series are estimates (doc 18 §15; pull before final balance).

**Code: what assumes Act I (audit, 27 Sep 2026).** No `act` field or Act II code yet. The game's end is
`CONTENT.quarters.length − 1` (the market data), so it isn't a hard-coded 2022Q3, but:
- Phases: last quarter → `merge` → `MERGE_CHOOSE` → `ended` (`quarter.ts` startNextQuarter, `actions.ts`),
  and `replay.ts`, `tools/play.ts`, the UI router and the audio director stop at `ended`.
- One market array indexed by `state.quarter`; `marketWeek` has no bounds check (past the end it throws).
- `GameState.version` is the literal 1; `save.ts` rejects other versions; migration is "fill missing fields
  from `newGame`", not versioned. The Act I → II save migration (scope §2.15) needs a real version step.
- The content loader validates everything against the market's quarter range (prices, power paths, era
  multiples, loan eras by year, rival series "outside Act I", auction windows). Year-specific schemas: the
  equipment-loan era regex, hire salaries anchored 2017 / 2021 (+2022 multiplier, flat after), the era theme
  (`app.tsx`: garage / industrial only).
- Tests: every golden file ends `"phase":"ended","quarter":22`, so extending the timeline changes them all.
  The sim-runner's Merge metrics use the last quarter.
- Text: `ui.title.act`, `ui.chapter.act_done` ("Act I · …").

**First build step once unblocked (proposal, not decided):** a small "act boundary" task with no new
gameplay: an `act` field and save version 2 with the Act I → II migration test; the market extended to
2026Q4 (with the ETH answer) while Act I still ends at 2022Q3; the phase flow Merge → Act I chapter report →
Act II intro → 2022Q4 Plan; the "Start of Act II" autosave slot; goldens unchanged for Act I. Then systems one
at a time (MW by use → projects → credit rating → tenants → capital → regions → events), as with Act I.

## Next

Act II market data fixed (27 Sep 2026): corrected copies of the Act II market files are in `docs/act2-content/`
(`market_weekly.csv`, `market_quarterly.csv`; the originals in `docs/game-project-files/` are untouched). Hashprice is now
calculated from price, difficulty, block subsidy and fees as in Act I (the pack's hand-drawn curve ignored the halving), hashrate
comes from difficulty, the halving is on 20 Apr 2024 (was 1 Apr), Oct–Dec 2022 is rebuilt with the FTX crash (Act II no longer
opens $3k below Act I's last week), and each quarter's last week equals the sourced close. What changed and why, the checks and
what's still open: `docs/act2-content/README.md`. Balance effect for Act II: miners earn about 2× the pack's figure just before the
halving (~$113/PH/day in 2024Q1) and about 20% less in 2026 (~$38–41). Not yet read by the game (Act II isn't built).

Reference copy (27 Sep 2026): `docs/game-project-files/` holds the design thread's project files as the
owner exported them (numbered design docs 01–21, Act I and Act II content, audio code). It's a snapshot for
reference only: the game reads `src/content/`, and the Act II files (design, alpha 0.2 scope, content) are
outside the Alpha 0.1 scope.

Built on 26 Sep 2026: investor pitches, hires, Read the market, the Merge decision and chapter report,
save/load, the 20 event cards, the failure wave, the left-nav screens + Settings, and sound. Every item
in the scope's build list now exists. 27 Sep 2026: the balance pass and three reviews (see "Balance pass"
and "Balance review" 1–3 above): **the Act I balance pass is DONE**, every §5 balance anchor passes in the
sim. Next: playtests (scope §5 "Playable" and "People": a first-time run in 35–50 minutes, 3+ real
decisions per quarter, 5 crash-free runs, 3 outside testers). Small follow-ups: an ear test of the sounds; the build's main
JS chunk is just over Vite's 500 KB warning (card text; split it later).
**Act II** (27 Sep 2026): in scope, blocked on the decisions in "Act II readiness" (P1–P5, the scope freeze,
wireframes, the ETH answer; the price seam is fixed). Note: the Alpha 0.1 go/no-go gate (scope §5: playtests, 3 outside
testers) hasn't run yet; the owner chose to start Act II anyway, so the playtests can run alongside.
Backlog (design thread): the pitch opening reacts to company performance (era EV/EBITDA × trailing
EBITDA, clamped to ±30% of the capital.json terms).
