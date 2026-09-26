# 09: Player Actions and Pacing (draft for decisions)

*Status: **decided 26 Sep 2026** (see §7). The rest of the document lists the options that were considered.*

## 1. The problem
Act I has 23 quarterly turns in ~40 minutes, so **each turn needs ~2 minutes of real decisions**. Right now the loop is "buy machines → End Turn". That leads to *End-Turn syndrome*: the player clicks through while the numbers play out. Target: **3–6 meaningful decisions per turn, with at least one trade-off you can feel.**

---

## 2. Three pacing models

| | A. Pure turn-based | **B. Plan → Live Quarter → Report (recommended)** | C. Real-time with pause |
|---|---|---|---|
| How it feels | Chess. Plan, End Turn, read the report | Plan your moves, then watch a ~20-second "live quarter" (13 weeks ticking) where prices move and 1–3 **interrupts** pop up that need a response | Game Dev Tycoon / Offworld: time flows, you pause to act |
| "Action between turns" | Low | **Medium–high**: things happen *during* the quarter | High |
| Fits 30–60 min sessions | Yes | Yes | Hard to control |
| Build effort (beginner + AI) | Lowest | Low–medium: the sim still resolves per week/quarter, and the "live" part is presentation plus interrupt cards | Highest (timing, balance, UI) |
| Reference games | VC Tycoon, Reigns | Football Manager match-day, Frostpunk storms | Offworld, Game Dev Tycoon |

**Recommendation: B.** The simulation runs in **weekly sub-steps** (13 per quarter), so prices wiggle, machines break and alerts fire mid-quarter. Decisions stay quarterly and turn-based. The player can pause, speed up or skip the live quarter, and interrupts always pause it. The tech stack supports this (06: "fixed-timestep loop driving `advance()`").

---

## 3. Action economy: what limits the player each turn

| Option | How it works | Pros | Cons |
|---|---|---|---|
| Money only | Do anything you can afford | Simplest | No prioritization when you're rich. Spam clicking |
| **Bandwidth points (recommended)** | Each quarter you have N **Bandwidth** (founder time). Actions cost 1–3. Starts at 3 in the garage and grows with hires and a management team | Forces "what matters this quarter?". Hires become valuable. It scales naturally from garage to empire | One more number to explain |
| Action cards | Draw a hand of 5 possible actions each quarter | Variety, surprise | Randomness can frustrate a finance player |

**Recommendation: Bandwidth + money.** Money pays for things. Bandwidth pays for *attention*. Routine actions (buy machines at list price, pay bills) are free. **Anything strategic costs Bandwidth:** scouting, negotiating, fundraising, hiring, dealing with the community.

---

## 4. Action catalogue (Act I first, with how each carries into later acts)

| Category | Action (Bandwidth cost) | Trade-off / why it's interesting | Real-world basis | Later acts |
|---|---|---|---|---|
| **Operations** | Buy/sell machines, new or used (0) | Used is cheap but less efficient and fails more | Used-rig markets in 2018 and 2022 | GPU fleet purchases |
| | Pre-order next-gen machines (1) | Pay now, delivered in 2–3 quarters, when the price may have crashed | Bitmain pre-orders in 2021 | GPU allocation queues |
| | Overclock / underclock (0) | More hash vs. more power and failures | Standard miner tuning | Power capping |
| | Switch coin (GPU fleet) (0) | ETH vs. other coins by profitability | ETH/ETC/RVN switching | — |
| | Maintenance sprint (1) | Cuts failures next quarter | Fleet uptime | SLA management |
| **Treasury** | **HODL or sell mined coins (0, set per quarter)** | Holding = extra price exposure. The big swing decision | Marathon held most mined BTC; others sold everything | Crypto treasury → balance sheet |
| | Hedge (sell futures) (1) | Locks in a price, gives up upside | Miner hedging desks | Interest-rate hedging |
| | **Crypto-backed loan (1)** | Cheap money in the boom, margin calls in the crash | Miners borrowing from Celsius etc. before 2022; Core Scientific's Chapter 11 | Debt financing in Act II |
| **Sites & power** | Scout a region (1) | Reveals 2–3 site offers with hidden flaws | Site hunting | Act II site sourcing |
| | Due diligence on a site (1 per check) | Pick 2 of 5 checks (grid, zoning, noise, water, landlord) | VC Tycoon's DD mechanic | Same, in Act II deals |
| | **Negotiate a power contract (2)** | Fixed price (safe) vs. index price + curtailment rights (cheap, volatile) | Texas miners' power contracts | PPAs, nuclear deals |
| | Build or upgrade a site (1) | Capex + build time | — | Construction pipeline |
| **Capital** | Pitch investors (2) | Mini-game. Sets valuation and dilution | Crypto VC in 2018, 2021 | JV / lender pitches |
| | Equipment loan (1) | Machines as collateral | Equipment financing | GPU-backed DDTLs |
| | IPO / SPAC roadshow (3, 2021 window only) | Huge raise, but board targets appear | Core Scientific SPAC, IREN IPO | Bond issues |
| | **Bid on distressed assets (2)** | Auction vs. rival companies in crypto winters | 2018 fire sales, 2022–23 bankruptcy auctions | Buying failed campuses (Act III bust) |
| **People** | Hire (1) | Traits: an ops manager cuts downtime, a trader improves hedges, a BD lead finds sites, an ex-utility exec speeds grid connection | VC Tycoon hires | Same system |
| **Community** | Neighbour/town outreach (1) | Lowers Heat. Costs money | Noise complaints at mining sites | Protest system |
| | Noise mitigation (0, capex) | Immersion cooling or walls | Real mining noise disputes | Closed-loop cooling |
| **Intel** | Read the market (1) | Shows a hint about next quarter (a price trend or an event rumor) | — | The Signals panel |
| | Attend a conference (1) | Unlocks a deal, hire or investor | Mining conferences | Industry events |
| **Side business** | Host other people's machines (1) | Stable contract income, the seed of Act II's take-or-pay | Core Scientific, Compute North hosting | Shell leasing |
| | Rent GPUs as cloud (2, from 2019) | Low income, unlocks the AI skill tree | CoreWeave's 2019 pivot | The Neocloud path |

---

## 5. Live-quarter interrupts and mini-games (the "action between turns")

| Moment | When | What the player does | Length |
|---|---|---|---|
| **Price spike / crash alert** | Any week | Sell treasury now, hold, or hedge | 1 click |
| **Grid emergency (curtailment)** | Heat waves, Winter Storm Uri (2021) | Curtail and get paid, or keep mining. A time window, pausable | 1–2 clicks. Basis: Riot earned ~$31.7M in power credits in Aug 2023 |
| **Machine failure wave** | Heat, overclocking | Repair now (cash) or run degraded | 1 click |
| **Neighbour complaint / council letter** | Heat above threshold | Pay, mitigate, or ignore (escalates) | Reigns-style card |
| **Distressed auction** | Crypto winters | Sealed bid against 2–3 named rivals | ~30 seconds |
| **Negotiation** | Power contract, investor, hosting client | 3 rounds of offer/counter-offer. The other side has a hidden limit. Your reputation and hires shift it | ~45 seconds |
| **Margin call** | If you took a crypto-backed loan and the price falls | Post collateral, sell machines, or default | 1 decision, high stakes |

**Rule of thumb:** at most **1–3 interrupts per quarter**, all skippable with a sensible default, so a 20-second live quarter never becomes a chore.

---

## 6. Structure that gives each turn direction
- **Board and investor goals:** after each raise, 2–3 quarterly targets ("Reach 50 PH/s by Q4 2021"). Hitting them improves the next valuation, missing them hurts it.
- **Rivals:** 3–4 AI companies (real names: e.g. Riot, Marathon, Core Scientific, Bitfarms). They bid for sites and auctions, show up on a league table, and can be bought in a later act.
- **Quarter report:** the one screen that answers "did my decisions work?" (hashrate, cost per coin, treasury, Heat, ranking against rivals).

### Example turn: Q3 2018 (early crypto winter)
1. **Plan (3 Bandwidth):** read the market (1) → it hints the price keeps falling. Negotiate the warehouse's power contract (2) → switch to index price with curtailment. Set treasury to "sell 100%". Pause machine purchases.
2. **Live quarter (20 s):** week 6, a price crash alert: sell your remaining ETH now? → yes. Week 10, a rival goes under and puts 400 rigs up for auction → you bid 40% of list and win.
3. **Report:** revenue −45%, but your cost per coin is the lowest of the rivals, Heat is steady, 3 new hires are available next quarter.

---

## 7. Decisions (26 Sep 2026)
1. **Pacing: B.** Plan → live quarter (13 weekly sub-steps, ~20 s, pausable/skippable) → report.
2. **Action limit: Bandwidth + money.**
3. **Act I alpha interrupts and mini-games: all four groups.** Treasury HODL/sell + price alerts, distressed auctions, grid curtailment, negotiation + margin calls.
4. **Rivals: light.** 3–4 named rivals that bid in auctions, plus a league table.

**Scope impact:** the alpha grows from 2–3 weeks to **~4–5 weeks**, because negotiation and margin calls are the two heaviest mini-games. Suggested build order, so something playable exists early:
- Weeks 1–2: core sim, sites, machines, treasury, Bandwidth, live quarter with price alerts.
- Week 3: distressed auctions + light rivals + league table, then grid curtailment.
- Week 4: crypto-backed loans + margin calls, negotiation (power contracts first, then investors).
- Week 5: balancing against the Mining_* tabs, the Merge decision, deploy.

If time runs short, cut **negotiation**: it can default to "accept the offer" until it's built.
