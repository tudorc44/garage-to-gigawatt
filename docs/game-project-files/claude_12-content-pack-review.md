# 12: Act I Content Pack Review (v0.2)

*Review of `act1-content/` (pack v0.1) · 26 Sep 2026*
*This doc lists what was checked, what was changed, and the decisions that now **amend scope doc 10**. Where this doc and doc 10 differ, this doc wins.*

---

## 1. Verdict

The pack is usable as the alpha's content base. Structure, event writing and the balance-anchor math are good. There were three kinds of problems:

1. **Data that was never verified.** The research thread had no web access, so every number came from memory. I re-checked the rival anchors against company production updates. The rivals file had real errors (below); the machine and power numbers look plausible and stay as estimates.
2. **Game-logic bugs in the JSON.** Effects that pointed to a resource the game doesn't have (`reputation`), cards that fired for players who couldn't act on them, and a few wrong costs.
3. **Decisions the pack left open.** Now settled in §4.

**Still open:** the weekly market series is reconstructed, not real. My sandbox is also blocked from CoinMetrics, so this needs **one manual download** before balancing (§5).

---

## 2. What was verified (web, 26 Sep 2026)

| Check | Pack v0.1 | Company data | Action |
|---|---|---|---|
| Marathon BTC held before 2021 | Linear ramp 0 → 5,200 (2018–2020) | ~125 at end 2020; bought 4,813 BTC in Jan 2021; 5,134 at end Q1 2021 | **Fixed** (it was an interpolation artifact) |
| Marathon hashrate end 2020 / Q1 2021 / end 2021 / Q3 2022 | 0 / 1 / 4 / 4 (whole numbers) | 0.25 / 0.71 / 3.5 / 3.8 EH/s | **Fixed** |
| Marathon BTC held Q3 2022 | 10,100 | 10,670 | Fixed |
| Riot hashrate Q3 / Q4 2021 | 3 / 3 | 2.6 / 3.1 EH/s | Fixed |
| Riot BTC held Q1 / Q3 / Q4 2021 | 2,035 / 3,945 / 4,900 | 1,565 / 3,534 / 4,889 | Fixed |
| Riot BTC mined Q4 2021; full-year 2020 | 1,100; ~880 | 1,355; 1,033 | Fixed |
| Riot and Marathon market cap Q1–Q3 2020 | $200–900M (linear ramp) | Tens of millions until the late-2020 rally | **Fixed** (≈) |
| Core Scientific self-mining hashrate / BTC held, Q3 2022 | 10 EH/s / 1,000 | 13 EH/s / 1,051 | Fixed |
| Bitfarms hashrate / BTC held / Q3 mined / MW, Q3 2022 | 4 / 2,600 / 1,260 / 176 | 4.2 / 2,065 / 1,495 / 176 | Fixed |

Every rival now has a `verified` object listing the anchor values; everything between anchors is interpolated and marked ≈. Hashrate is no longer rounded to whole EH/s (it showed Riot at "1 EH/s" in 2019 when the real figure was 0.57).

Sources: [Marathon Q1 2021 update](https://www.globenewswire.com/news-release/2021/04/05/2204284/0/en/Marathon-Digital-Holdings-Announces-Bitcoin-Production-and-Mining-Operation-Updates-for-the-First-Quarter-of-2021.html) · [Marathon Dec 2021 update](https://www.globenewswire.com/news-release/2022/01/03/2360293/0/en/Marathon-Digital-Holdings-Announces-Bitcoin-Production-and-Mining-Operation-Updates-for-December-2021.html) · [Marathon Sep 2022 update](https://ir.mara.com/news-events/press-releases/detail/1294/marathon-digital-holdings-announces-bitcoin-production-and-mining-operation-updates-for-september-2022) · [Riot Mar 2021 update (SEC)](https://www.sec.gov/Archives/edgar/data/1167419/000107997321000272/ex99x1.htm) · [Riot Sep 2021 update](https://www.riotplatforms.com/riot-blockchain-announces-september-production-and-operations-updates/) · [Riot Dec 2021 update](https://www.riotplatforms.com/riot-blockchain-announces-december-production-and-operations-updates/) · [Bitfarms Sep 2022 update](https://www.globenewswire.com/news-release/2022/10/03/2526657/0/en/Bitfarms-Provides-September-2022-Production-and-Mining-Operations-Update.html) · [Core Scientific Sep 2022 update](https://businesswire.com/news/home/20221005005336/en/5299166/Core-Scientific-Announces-September-Updates)

Riot's Q1–Q3 2022 hashrate (4.5 → 7.7 EH/s) comes from memory and is still ≈.

---

## 3. Changes by file

### `events.json` (v2)
- **Removed `reputation` everywhere.** It isn't a resource in scope doc 10. Each use was replaced with a real effect: Heat for community-facing choices, `loans_locked_quarters` for lender-facing ones, or nothing.
- Added an **`effect_vocabulary`** block so the developer has one list of allowed effect keys for the Zod schema.
- Added **`requires`** so cards and choices only appear when they make sense:
  - Uri only shows for players with a Texas site (otherwise it's a news item).
  - The halving card needs S9s.
  - "Repay crypto loans" needs a loan.
  - "Rent spare racks" needs spare capacity.
- **Cost fixes:**
  - GPU shortage: paying the markup cost 0.6× the price. It now costs 1.6× (price + 60%).
  - The "buy used" choice now costs money.
  - "Outbid the buyer" was a flat $250k for any site; it now scales with rent.
  - Rented chillers now scale with MW.
- **Timing fixes:**
  - **SPAC mania moved from 2021Q4 to 2021Q1** (week of 8 Mar 2021, when BTC passed $60k and SPAC issuance peaked). It now opens the IPO window instead of arriving as it closes. The Nov 2021 ATH stays as a market shock and news item.
  - Luna/Celsius moved to the Celsius week (13 Jun 2022). The crypto-lender freeze is what hits the player.
- **Logic fixes:**
  - **Dec 2017 peak:** the "take a crypto loan" choice was removed, since loans only open in 2018Q1. It's replaced by "buy more machines at today's prices" (+10% price).
  - **Black Thursday:** "switch off loss-makers" was removed because auto-shutoff is already a core rule. It's replaced with "buy panicked sellers' machines" (−30% used price).
  - **Rig theft:** both choices lose the rigs now (the theft already happened). Security prevents a repeat.
  - **Used-rig scam:** added the 20% chance that it's real.
  - **Moratorium:** it now triggers at Heat ≥ 70 (it was 60), matching the site Heat thresholds.
  - Failure branches were added where gambles had none.
- **Text fixes:** the halving card mentioned the S17, which isn't in the game. The China ban card said "2x the hashprice share"; the real effect was about +35%.
- Added **`market_phases`** (boom / winter / normal by quarter) for triggers that say `winter`.

### `interrupts.json` (v2)
- Removed `reputation`.
- Margin call: added `default_if_unaffordable`. The previous default ("post collateral") could fail with an empty treasury.
- Distressed auctions also fire in 2020Q2, when post-halving S9s were dumped.
- Curtailment no longer handles Uri; the event card does. **Both payouts are now tied to forgone mining revenue** (see A8): the flat $15k/MW made curtailing a losing choice in 2021.
- Negotiation: the hidden limit and a "lowball" are now defined precisely.
- Price alert: added a note to check its firing rate with the sim-runner, since the reconstructed weekly series is smooth.

### `machines.json` (v2)
- S9 new prices stop at 2020Q1, when retail ended. It's used-only from 2020Q2 (this settles pack open question 4).
- Added **`heat_per_unit_garage`**: GPU rig 1, S9 8, S19 Pro 15 (flag F7).
- LHR is **news-only** in the alpha (pack open question 2).

### `rivals.json` (v2)
Rebuilt from verified anchors (§2).

### `text.en.json`
- Fixed "Ether quietly triples" (it was about 5×) and Ethereum's Jan 2017 price ($8, not $10).
- Moved the MicroStrategy-style headline to 2020Q3 and replaced 2020Q4 with the PayPal-style one.
- Added news for 2021Q1 (the SPAC card's fallback) and 2021Q4.
- Added glossary entries for **Bandwidth** and **Heat**.

### Unchanged
`sites.json`, `capital.json`, `hires.json`, `merge.json`, `market_weekly.csv`, `market_quarterly.csv`, and the pack report (doc 11).

---

## 4. Decisions: scope doc 10 amendments (v1.1)

| # | Topic | Decision |
|---|---|---|
| A1 | Machine availability | GPU Rig Gen 2 from **2020Q4**. S19 Pro from **2020Q2**. S9 new until 2020Q1, then used only |
| A2 | Texas site | Available from **2020Q1**, 3-quarter build (earliest energized 2020Q4) |
| A3 | Heat thresholds | **30** complaints · **50** rate-hike events · **70** moratorium (no new capacity at that site) · **90** shutdown order until Heat < 60 |
| A4 | Balance anchor: garage rig Q4 2017 | **+$7–8/day** (the real data). The old +$5 target is dropped |
| A5 | Valuation | **Run-rate EBITDA** (this quarter × 4) × era multiple (capital.json) + cash + treasury − debt. The $2B peak in 2021Q3 needs **~35–40 MW energized**, which matches the original model (121 MW owned, ~57 MW used at the Merge). Machines, not sites, are the 2021 bottleneck |
| A6 | Reputation | Not a resource. Community effects use Heat; lender effects use `loans_locked_quarters` |
| A7 | LHR | News only in the alpha |
| A8 | Curtailment | Paid **per event**: one week offline for **max($15k/MW, 1.25× the week's forgone mining revenue)**. A flat $15k/MW is far below what 1 MW of S19s earns in 2021 (~$60k/week), so nobody would curtail. Uri pays **2.5× forgone revenue** (real resale value was ~14×) |
| A9 | Founder-stake check | The funding ladder leaves the founder with ~49% after the IPO (90% × 0.8 × 0.8 × 0.85). The original model had ~40%, and doc 10 has no stake target, so accept ~49% |

---

## 5. What's still needed before balancing

1. **Real market data (you, ~5 minutes).** Download `btc.csv` and `eth.csv` from the CoinMetrics community data repo (github.com/coinmetrics/data → `csv/`) and drop them into the project or the repo. Claude Code can then regenerate `market_weekly.csv` with the same columns. The reconstructed series is fine for building and UI work, but not for final balance numbers.
2. **Sim-runner confirmation** of the anchors that can only be tested by playing: 100% reinvest goes bust in 2018Q2–2019Q2, and the price-alert firing rate.
3. **Riot 2022 hashrate** and the pre-2019 rival values are still ≈. They only matter for the league table, so they're low priority.
