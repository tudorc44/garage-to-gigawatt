# Dev notes: where the build stands

The running record of where the build stands, the rules in force, open questions and what's next. It exists so
any Claude account or machine can pick up the work with no chat history. **Read `CLAUDE.md` first, then this
file.** The full history (every finished step, balance review and milestone, with the decisions in detail) is in
`docs/dev-notes-archive.md`: read it only when a task needs the history.

Last updated: 27 Sep 2026, after milestone M4 (merged into `main` and pushed by the owner).

## How the owner works

- The owner is a beginner programmer. Explain every change in plain language, say how to see or test it.
- Plans and design decisions come from a separate Claude chat (the "design thread", on the owner's personal
  Claude account, with the design docs as project files). The owner pastes tasks from there. When a task
  raises a design question, stop and give the owner a short report they can paste back into that thread.
- One small working step = one commit. **Never push:** `git push` is denied in `.claude/settings.json`; the owner
  pushes (Terminal panel: `git push origin act2`, and `main` after a merge).
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
  `npm run sim -- --act2` also plays the Act II bots to 2026Q4 and prints the scope 0.2 §5 checks (~2.5 min).
- `npm run content:market`: regenerate the market JSON files after editing a market CSV.
- Golden replays: accept intended changes with `npm test -- -u tests/golden-replay.test.ts`, and explain every one.

## Where the build stands

**Act I (Alpha 0.1): complete.** Every system in its scope is built and the balance pass is DONE (every scope §5
anchor passes in the sim). The Act I playtests are **postponed until after Act II** (owner). GitHub Pages
publishes `main` (https://tudorc44.github.io/garage-to-gigawatt/), which now includes Act II up to M4.

**Act II (Alpha 0.2, scope frozen v1.0): built on `act2`, milestones M2–M4 done** (details in the archive):
- **Step 1, the act boundary:** one 40-quarter timeline (Act I = quarters 0–22, Act II = 23–39); `act` field;
  save version 2 with step-by-step migrations; Merge → Act I chapter report → Act II intro → 2022Q4; Act I values
  held after 2022Q3 until Act II content replaces them; the "Start of Act II" save slot.
- **M2, market engine + MW by use:** Act II market data and multiples; MW by use per site (mining, hosting, AI
  shell, AI cloud, building, idle); the hosting unit; Act II dashboard, top bar and hosting dialog; `campus` theme.
- **M3, projects:** regions for Act I sites, the power reservation, winter hosting defaults, Act II ASIC prices and
  the S21; projects (AI shell, AI cloud, pilot) with Power / Tenant / Capital slots, the build, delays and the GPU
  queue, take-or-pay, the sum-of-the-parts valuation, selling a shell; the Projects page and the Deal builder.
- **M4, owner answers + capital:** GPU contracts, GPU resale, the reservation on switched-off machines, the pilot's
  1-quarter wait, AI Heat at half, H200 rent; project debt, GPU-backed DDTLs, the equipment loan on GPUs, the credit
  rating, equity / ATM, the JV partner, the big-tech backstop, foreclosure; the Capital screen and the Deal
  builder's capital stack.

**Numbers:** 511 tests pass; lint and build pass. 11 golden replays (Act I only). Latest Act II sims (M4.8, 50
seeds, medians): good path with capital (`shell-capital`) ends $104.5M (peak $227M), 22/50 bust; great path
(`texas-capital`) peaks $874M; pure miner (texas-ipo) ends $314M ✓; 2023Q3 pilot 1.89× ✓, 2025Q2 pilot 1.39× ✗;
hosting ahead in 45/50 ✗ (left, per the owner).

**Not built yet in Act II** (scope 0.2 §6.4 order): the rating's corporate-debt terms (STOPPED), regions as
places to build (Ratepayer Anger, grid upgrades, on-site gas), Act II events and interrupts (spot shock, tenant
RFP, GPU failure wave), rivals, Act II hires, tenant negotiation ("Negotiate · 2 BW"), GPU know-how display
beyond the Projects header, Merge head starts, the lifeline and the standalone preset, the Act II quarter report
additions and chapter report, onboarding tooltips.

## Rules and decisions in force

### Working rules
- **Branches:** Act II is built on `act2`; `main` is the stable, deployable version. The owner merges after
  reviewing a milestone (M4 was merged by fast-forward on 27 Sep 2026).
- **Batch mode** (CLAUDE.md): sub-steps `M<n>.<k>`, each lint + test + build → a short dev-notes update → one
  commit; small decisions labelled "(mine, reversible)"; blockers under "STOPPED"; change files only with the
  Edit / Write tools.
- **Content copies:** the game reads `src/content/`; the Act II files there are byte-for-byte copies of
  `docs/act2-content/` (a test checks it). Edit both, and note data changes in `docs/act2-content/README.md`.
- **Saves:** `tests/fixtures/saves/v1-*.json` are real old saves: keep them forever, never reformat them
  (`tests/fixtures` and `.claude` are in `.prettierignore`). New state fields go in the save test's
  `ADDED_SINCE_V1` list with their new-game value.
- **Goldens** play Act I only (`playGame(seed, bot)` stops at the Act I chapter report); `{ through: 2 }` plays on.
- New Act II randomness uses its own `substream(seed, label)`, so Act I games never change.
- Every "(mine, reversible)" choice recorded in the archive stands until the owner says otherwise.

### Owner decisions: Act I (details: archive › "Decisions" and the balance reviews)
- Start: $10k, no rigs; machines earn from the quarter after purchase; 13-week quarters; the Merge in week 11 of 2022Q3.
- Prices exactly as in the market CSV; coins sold weekly; keep/sell % per coin; "Sell treasury coins" (1 BW).
- Power contracts, negotiation, Texas fixed / index and Winter Storm Uri (firm load) as specified by the design thread.
- Funding rounds (F&F, seed, Series A, IPO / SPAC) from `capital.json`; seed and Series A can be pitched.
- Hires, Read the market, Community Heat (50 rate hike / 70 moratorium / 90 shutdown), event cards, the failure
  wave, the Merge and chapter report, save / load, sound (`zzfx`), the left-nav screens and Settings.
- Balance pass: 2021 era multiples (Q1 35, Q2–Q3 22, Q4 20), IPO needs $3M quarterly EBITDA, the GPU cap on all
  GPU rigs (2020Q4–2022Q1, 250 kW a quarter), phased Texas (5 × 20 MW, 2-quarter phases, construction loans),
  the transformer upgrade ($150K).

### Owner decisions: Act II (details: archive › "Act II readiness", "Owner decisions on the M2 / M3 questions")
- Scope 0.2 v1.0 frozen; P1–P5 confirmed: take-or-pay 3% of the annual contract per late quarter and walk chance
  by tenant type; mining → hosting $0.1M/MW; pilot 0.5–2 MW; corporate ratings CCC− to BBB; delays 15% a quarter.
- Pilot: neocloud price × utilisation from 70% (+5 at know-how 2, +10 at 3), ~$31–33M/MW; spot only.
- Valuation counts projects under construction at capex spent; the top-bar backlog is unweighted.
- A1 hosting defaults in winter (15% in 2022Q4 / 2023Q1, else 5%), free re-letting. A2 power reservation: idle and
  building MW pay 25% of full-load power.
- B3 regions: Texas → ERCOT; own site, small unit, warehouse → Georgia (+ small-load premium); garage none.
- B4 hosted machines add Heat. B5 2026 mining multiples 6, 6, 6, 5. B6 no multiple columns in the market file.
- B7 ASIC prices from the $/TH tiers (S9 old, S19 Pro new); the S21 (200 TH, 3,500 W) from 2024Q1.
- GPU contracts for clouds: neocloud, AI-lab and enterprise cards (overflow at know-how 3); price = H100 1-year
  contract × term factor (1 y 100%, 2 y 85%, 3 y 70%), H200 × 1.2; take-or-pay on every GPU; back to spot after.
- Pilot waits 1 quarter in the GPU queue. GPU resale: price × (1 − 15%/year), floor 35%; "Sell GPUs" (1 BW).
- Deal builder IRR for clouds and pilots: 5 years + the year-5 residual.
- Backstopped tenant backlog weight 10%; live AI MW count half of mining's Heat load.
- H200 rent = H100 × 1.20 (market file). M4 = capital (built).

### Owner decisions on the M4 questions (27 Sep 2026)
- **Rating → corporate debt:** the equipment loan (machines + delivered GPUs) is the only corporate debt; its rate
  and max LTV come from the rating when it's taken (8-quarter tenor): BBB band SOFR + 2.5% / 60%, BB + 4.0% / 50%,
  B + 6.0% / 40%, CCC + 9.0% / 25%. No corporate term loan ("Raise debt" off the Capital screen); a "Bridge" row
  only when a lifeline bridge loan exists.
- **Equity** is priced off the valuation including contracts signed this quarter (backlog weight + pivot premium
  at once), not last quarter's report. Capex credits and LTVs untouched until the M5 re-check.
- **The reservation on switched-off machines is reverted** (idle and building MW only, as in M3.1); no "release MW".
- **Scope §5 revised:** hosting check at 2026Q4 (≤ ~60% of runs); pilot 2023Q3 ≥ 1.7× and ≥ 0.4× above the 2025Q2
  pilot. §8 records both. The M4 choices (archive › "Milestone M4 report") are all approved.

## Open questions for the design thread

Still open from Act I (never answered; details in the archive):
- Leaving the 100 kW site also locks you out of the seed round. Intended? Is the seed round too generous?
- Confirm: `min_mw` = usable capacity; the equipment and crypto loan rules; auctions as a Plan-phase action;
  the curtailment trade-off; the Heat 50 check's reading; the power contract details.
- Replace the reconstructed Act I market data with real CoinMetrics weekly data before final balancing.

## STOPPED

(none)

## Small follow-ups

- An ear test of the sounds; the 4 sample fallbacks if a synth sound is wrong.
- The main JS chunk is over Vite's 500 KB warning (card text): split it later.
- The ASIC $/TH tiers, SOFR and spread series are estimates (doc 18 §15): pull real data before final balance.
- Backlog idea (design thread): the pitch opening reacts to company performance (era EV/EBITDA × trailing EBITDA,
  clamped to ±30% of the `capital.json` terms).
- The Deal builder's projected return doesn't net out a JV partner's share yet.

## Milestone M5 (in progress): owner answers, then entry and the world

Housekeeping (dev-notes trim, archive, CLAUDE.md batch rules) was already done on the Mac (`f1abef6`).
- **M5.0a** owner decisions recorded; scope §5 / §8 edits. **M5.0b** revert the switched-off reservation.
  **M5.0c** rating → equipment-loan terms. **M5.0d** equity priced off the current valuation. **M5.0e** bots
  sign-then-raise and asic-retirer, sims.
- **M5.1** Merge head starts (doc 18 §2.3). **M5.2** lifeline card + bridge loan. **M5.3** standalone preset and
  "Start at Act II" (A2-01, A2-02). **M5.4** regions: region panel, Ratepayer Anger, regional policy events.
  **M5.5** scouting with Act II site categories and flaws. **M5.6** grid upgrades and on-site gas (Power slot).
  **M5.7** Act II hires and Bandwidth. **M5.8** the 24 event cards. **M5.9** Act II interrupts. **M5.10** bots,
  sims and the M5 report.

### M5 progress
- M5.0a: done.

## Next

Carry on with M5 (above).
