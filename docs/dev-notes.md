# Dev notes: where the build stands

The running record of what's built, what was decided and what's next. It exists so any Claude account
or machine can pick up the work with no chat history. **Read `CLAUDE.md` first, then this file.**
Update it at the end of every finished task (status, new decisions, next step).

Last updated: 26 Sep 2026, with investor pitches (step 1 of 3: the sim rules; no screen yet).

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
   Rivals are in too (`rivals.json`), and Heat's rules (`heat.json`). Other content (events, hires, Merge) is still only in `docs/act1-content/`; copy it
   over, with a schema, when its system gets built. Market CSV → JSON via `npm run content:market`.
3. **Sim core (`src/sim/`):** seeded RNG in the state; actions via `applyAction`; one week per `advance`.
   Market, sites (ladder, scouting, hidden flaws), machines (new/used, delivery, weekly failure roll,
   repair), Bandwidth, mining (auto switch-off), treasury (HODL/sell %), price-alert interrupt (max 3
   per quarter), quarter report, forced sales and bankruptcy, valuation, game log.
4. **Capital:** the equipment loan and the crypto-backed loan with margin calls (see Decisions), every funding round: friends & family, seed, Series A and IPO / SPAC (fixed offers from `capital.json`; the
   seed and Series A can also be pitched, see Decisions: sim rules and tests only so far, no screen
   or terminal command yet), founder stake (dilutions multiply: F&F then seed leaves 72%, then Series A 57.6%).
5. **Leaving a site** (lease break) with a penalty.
   **Treasury per coin:** separate keep/sell % for BTC and ETH, the price alert sells 25% of BTC or of ETH,
   and a Plan-screen "Sell treasury coins" action (1 Bandwidth).
6. **Terminal game** (`npm run play`) and **browser UI**: title screen, Plan, Live quarter (1.5 s per week,
   pause, 1×/2×/4×, skip, alerts as modals), Quarter report, end screen. Design-system tokens and
   Fontsource fonts; era themes (`garage` until 2019, `industrial` from 2020Q1). Text via `t()` + `en.json`.
7. **Sim-runner** with bots (see results below), **golden replay tests** (`tests/golden/`: steady-grower,
   early-expander, ff-expander, ff-leaver, seed-raiser, loan-taker, margin-caller, auction-bidder,
   heat-climber, negotiator) and unit tests: 274 passing + 1 to-do.
8. **Local staging** (`staging/`) and the `g2g` console testing helpers (dev and staging, not production):
   `g2g.setCash(n)`, `g2g.state()`, and `g2g.load(state)` to jump to any saved or bot-built state.
9. **Rivals and the league table:** Riot, Marathon, Core Scientific and Bitfarms follow their scripted
   end-of-quarter numbers from `rivals.json`. The quarter report (browser and terminal) ranks you against
   them by value, with your rank change and who joins later.
10. **Distressed auctions:** in the crypto-winter windows a lot of used machines may come up at the
   start of a Plan phase. One sealed bid (2 Bandwidth) against 2–3 rivals, settled at once; the Plan
   screen has the row and a bidding dialog, the terminal has `bid <amount> [site#]`.
11. **Grid curtailment:** in summer (Q3) the Texas grid may ask you to take the Texas site offline for
   a week, for credits (review A8). An interrupt card in the live quarter (and in the terminal); the
   credits count toward EBITDA and show on the quarter report.
12. **Community Heat** (design thread decisions, 26 Sep 2026; rules in `src/content/heat.json` and
   `sites.json` heat_load_max): Heat per site = base + load + grievance + era, recalculated weekly. A
   Heat meter per site (marks at 30/50/70/90), Heat of the hottest site in the top bar and as the 6th
   report tile (replacing the stand-in Valuation tile, as in the mockup). Neighbour complaints (a
   card), "Talk to the neighbours" and noise mitigation (a Plan dialog, and `talk` / `mitigate` in the
   terminal), the rate hike at 50, moratorium at 70, shutdown at 90, and curtailment's "keep mining"
   (+5 grievance at the Texas site).

13. **Power contracts and negotiation** (design thread decisions, 26 Sep 2026; rules in
   `interrupts.json` › negotiation, `sites.json` Texas power_options, `shocks.json`): every non-garage
   site has a contract from when it's powered; renewals in the Plan phase (a to-do row and a dialog:
   accept the opening, or negotiate over 3 rounds with a walk-away warning); Texas fixed or index;
   Winter Storm Uri in 2021Q1; index contracts earn 1.5× curtailment credits. Terminal: `renew`,
   `negotiate`, `counter`, `accept`, `walk`.

### Not built yet (shown as locked "not built yet" rows or missing)

The investor pitch screen (the sim rules are in), hires, Read the market, the 20 event cards (Heat's event-card
effects wait for them), the failure-wave interrupt, the Merge decision screen, saves, sound, settings, the
left-nav sections other than Dashboard. Site flaws that need missing systems have no effect yet (landlord
eviction, transformer upgrade); noise ordinance and hostile council now work through Heat. The UI has no automated tests (would need e.g. jsdom:
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
- Series A: 2 Bandwidth, +$8M for 20% ($32M pre-money), open 2019Q1–2021Q2, once, needs a powered site of
  at least 1 MW usable capacity. IPO / SPAC: 3 Bandwidth, +$150M for 15%, open 2021Q1–2021Q4, once, needs
  a powered 20 MW site and at least $5M EBITDA in the last quarter report. Both from `capital.json`, taken
  as fixed offers like the seed round. **Not yet confirmed by the owner.**
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

## Balance findings (from `npm run sim`, 50 seeds per bot)

| Bot | What it does | Bust rate | Median end value |
|---|---|---|---|
| cautious | garage only, keeps half its cash | 0% | $41.5K |
| reinvest | garage only, spends everything | 0% | $28.8K |
| raise-climb | reinvest + every round as soon as allowed, climbs the ladder; takes every renewal's opening | 0% | $16.4M (peak $310M, 2021Q1) |
| raise-negotiate | raise-climb + negotiates every renewal (counters at 92%, 97%, 102% of normal) | 0% | $18.2M (peak $334M, 2021Q1) |
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
- Series A and the IPO taken as fixed offers from `capital.json`: fine until negotiation exists? The IPO's
  $5M EBITDA bar is just out of reach for a bot that fills one 20 MW site. Intended, or lower it?
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

## Next

Week 3, the Heat system and the power side of week 4 (contracts, negotiation, Uri as firm load) are
done. Investor pitches, step 1 of 3 (sim rules + tests) is done. Next: step 2, the screen (the Raise
row gets Take offer / Pitch; a panel showing dilution and stake per counter, the walk-away risk, the
"ends this round for good" warning, a result view) and the terminal commands; then step 3, a pitching
bot, a sim table and golden replay, checked against the design thread's targets (pitcher 1.10 / 1.05 /
accept vs taker, 50 seeds: +1.5 to +4 points of founder stake; walk-aways 10–20% of pitches;
bankruptcy within ±2 runs; median seed close no more than 1 quarter later; tuning order: limit_range
upper bound, then walkaway_chance, then walkaway_penalty, never lowball_margin). Backlog (design
thread): the pitch opening reacts to company performance (era EV/EBITDA × trailing EBITDA, clamped to
±30% of the capital.json terms). Also open: the LTV gauge on a Capital screen, and the League
left-nav section (the table is only on the report now).
