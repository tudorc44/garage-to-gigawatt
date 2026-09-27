# 11 · Act I Content & Data Pack (Alpha 0.1)

*Garage to Gigawatt · Act I (2017Q1 → 2022Q3) · pack v0.1 · 26 Sep 2026*
*Fits scope doc 10 (v1.0). Nothing here changes the design; conflicts are listed under **Design flags**.*

---

## 0. Read this first: how reliable is this pack?

**Important caveat.** The sandbox that built this pack could not reach any market-data source. CoinMetrics, Blockchain.com and GitHub raw were all blocked by the network policy. So:

- **Market series (A)** are **reconstructed**. I took month-end values of BTC and ETH price, BTC difficulty, ETH network hashrate, fee share and ETH block cadence from my knowledge of the published history, added about 25 known extreme days (peaks, crash lows, difficulty drops), and log-interpolated to weekly Mondays. The shape, turning points and levels are right to within roughly ±5–10% for prices and ±5% for difficulty. **Individual weekly values are not exchange closes.** Every row is `estimate: true`.
- **Everything else** (machine prices, rival curves, loan terms, site costs) is also from knowledge, not freshly retrieved. It is anchored on filings and well-known figures, but it is not re-verified. Specs, dates, halving/fork block data and loan-term tables marked `estimate: false` are the ones I'm confident about.
- **Before final balancing**, replace `market_weekly.csv` with a CoinMetrics community export (`btc.csv`/`eth.csv`: `PriceUSD`, `DiffLast`, `HashRate`, `RevUSD`, `FeeTotUSD`). The generator (`market.py`, kept in the session) derives the other columns the same way. The game-side consequence is small, because the sim already smooths weekly noise, but the pack should not be quoted as data.

---

## 1. Schema sketch (for Zod)

```
market_weekly.csv   week:ISODate(Mon) quarter:"YYYYQn" btc_usd eth_usd btc_difficulty_T btc_hashrate_EHs
                    btc_block_subsidy btc_fee_share(0-1) btc_hashprice_usd_th_day btc_hashprice_usd_ph_day
                    eth_hashrate_THs eth_blocks_day eth_block_reward eth_rev_usd_mh_day   (all number)
market_quarterly.csv quarter weeks btc_block_subsidy + for each of [btc_usd, eth_usd, btc_difficulty_T,
                    btc_hashrate_EHs, btc_fee_share, btc_hashprice_usd_ph_day, eth_hashrate_THs,
                    eth_rev_usd_mh_day] → {_open,_close,_high,_low,_avg}:number
Sourced value      SV = { value:number, source:string, estimate:boolean }
machines.json  { schema_version, notes, models:[{ id, name, coin:"ETH"|"BTC", available_from:Quarter, real_basis, why?,
                 hashrate_mhs?|hashrate_ths?:SV, power_kw:SV, efficiency_*:SV, noise_db:SV, lifespan_years:SV,
                 annual_failure_rate:SV, price_new:Record<Quarter,number>, price_used:Record<Quarter,number>,
                 usd_per_th_index?:Record<Quarter,number>, price_source, retail_new_ends?, lead_time_quarters:{default:number,[Quarter]:number},
                 lhr_note? }], infrastructure_per_mw:{...SV}, machine_cost_per_mw_2021_peak:SV }
sites.json     { tiers:[{ id, capacity_kw, available_from?, power_usd_kwh?:SV, power_path?:Record<Year,number>,
                 power_options?:{fixed:SV,index:SV}, curtailment?, rent_usd_q:number|SV, capex_usd?|capex_per_mw_usd?:SV,
                 build_quarters, heat_base, possible_flaws:string[] }], flaws:Record<id,{label,effect:Record<string,number>,basis}>,
                 power_upgrade, community_disputes:[{id,place,date,trigger,outcome,source,heat_mapping}], heat_thresholds }
capital.json   { ladder:[{id, amount_usd:number|SV, pre_money_usd?, dilution, window:[Q,Q], requires?, type?, bandwidth?}],
                 loans:{ equipment:[{era,lenders,ltv:SV,apr:SV,tenor_quarters,collateral,available_until?}],
                 crypto_backed:[{lender,ltv_max,apr:[min,max],margin_call_ltv,liquidation_ltv,cure_hours,source,estimate}],
                 game_crypto_loan:{...}, miner_outcomes_2022:string[] }, ipo_window:{open,close,deals:[...]},
                 era_multiple_ev_ebitda:Record<Quarter,number>, price_per_ths_listed, distressed:[...] }
rivals.json    { rivals:[{ id, name, style, profile:[string,string], hashrate_ehs, mw, btc_mined_q, btc_held, mcap_musd
                 (each Record<Quarter,number>), key_moves:Record<Quarter,string> }] }
events.json    { events:[{ id, type:"scripted"|"random", title, trigger:string, weight:number|null, week:ISODate|null,
                 body(≤60 words), choices:[{label, effects:Record<string, number|string|boolean|object>}],
                 real_basis, source }] }
interrupts.json { max_per_quarter, interrupts:[{ id, trigger:string, choices:[{id,label,effects?}], default, source, estimate, ...extra }] }
hires.json     { hires:[{ id, name(fictional), bio, salary_usd_year:{"2017":n,"2021":n}, effect, real_role, estimate }] }
merge.json     { date, week, data:{...SV}, choices:[{ id, text(≤50 words), act2_preview }] }
text.en.json   Record<string,string>  keys: tooltip.q1.*, glossary.*, news.<Quarter>.<i>
```

Effect strings like `"-machine_price*0.6"` are small expressions for the event resolver. Either whitelist them or convert them to `{op, var, mult}` objects when you write the Zod schema.

---

## 2. Executive summary

- **The anchors mostly hold.** Hashprice (about $400/PH/day at the 2021 peaks, about $60 at end-2022), the Merge collapse (−90% or so), machine cost per MW at the peak ($3.4M), and the Q4 2018 garage loss all check out.
- **Two anchors need correcting:**
  - The Q4 2017 garage rig earns **about +$7–8/day**, not +$5.
  - A **$2B peak valuation needs about 40 MW energized in 2021Q3.** A full 100 MW at 15× would be about $5B.
- **The real history is very game-friendly.** It has three clean profit regimes (2017 boom, 2018–20 grind, 2021 super-cycle), two hard resets (the 2020 halving and the 2021 China ban, which is a *windfall* for anyone outside China) and one guillotine (the Merge).
- **Gen 2 GPUs should unlock in 2020Q4**, not "2020": the RTX 3060 Ti launched in Dec 2020.
- **Equipment loans barely existed before 2020.** NYDIG, Galaxy and the others arrived in 2020–21. Make the 2017–19 version scarce and expensive.

---

## 3. Key findings

### A. Market (see `market_weekly.csv`, 300 rows, 2017‑01‑02 → 2022‑09‑26)

**Derivations.**
- `btc_hashrate_EHs = difficulty × 2³² / 600 s`. This assumes 10-minute blocks, so it slightly understates hashrate in fast-growth quarters.
- `hashprice_$/TH/day = 144 × subsidy / (1 − fee_share) × BTC price / (hashrate in TH/s)`
- `eth_rev_$/MH/day = blocks/day × block reward × (1 + uncles + fees multiplier) / (network MH/s) × ETH price`
  - Block reward: 5 ETH → 3 ETH at Byzantium (16 Oct 2017) → 2 ETH at Constantinople (28 Feb 2019).
  - Blocks/day falls with the difficulty bombs: Sep–Oct 2017, Nov 2018–Feb 2019, and Dec 2019.
  - The fee multiplier peaks during DeFi summer 2020 and in 2021H1, then drops after EIP-1559 (5 Aug 2021).
  - The value is 0 from the Merge week.

**Cross-check against published indices (≈, from memory of published charts).**

| Point | Pack | Published | OK? |
|---|---|---|---|
| Hashprice, 12 Apr 2021 | $428/PH | Hashrate Index ATH ≈ $0.42–0.45/TH | ✓ |
| Hashprice, Nov 2021 | $330–390 | ≈ $0.35–0.40 | ✓ |
| Hashprice, Sep 2022 | $79–87 | ≈ $0.08–0.09 | ✓ |
| Halving week | −48% | ≈ −45–50% | ✓ |
| ETH $/MH, Jun 2017 | ≈ $0.27 | whattomine ≈ $0.25–0.35 | ✓ |
| ETH $/MH, May 2021 | ≈ $0.08–0.09 | ≈ $0.08–0.10 | ✓ |
| ETH $/MH, Dec 2018 | ≈ $0.010 | ≈ $0.01 | ✓ |

**Quarterly averages (from `market_quarterly.csv`).**

| Q | BTC avg | Hashprice $/PH/d | ETH avg | ETH $/MH/d |
|---|---|---|---|---|
| 2017Q1 | 1,057 | 736 | 17 | 0.089 |
| 2017Q2 | 1,786 | 880 | 177 | 0.273 |
| 2017Q4 | 9,389 | 1,923 | 409 | 0.059 |
| 2018Q4 | 5,031 | 199 | 158 | 0.013 |
| 2019Q4 | 8,123 | 161 | 161 | 0.011 |
| 2020Q2 | 8,693 | 100 | 207 | 0.017 |
| 2021Q2 | 47,497 | 300 | 2,745 | 0.079 |
| 2021Q4 | 55,496 | 324 | 4,137 | 0.067 |
| 2022Q3 | 21,002 | 93 | 1,539 | 0.017 |

**Shock markers (week = Monday of the week containing the event).**

| Event | Date | Week | Magnitude |
|---|---|---|---|
| GPU shortage peak | Jun 2017 | 2017‑06‑12 | ETH ≈ $10 → $395 H1; RX 580 street +60–80% |
| BTC ATH | 17 Dec 2017 | 2017‑12‑11 | ≈ $19.5k |
| Crash low | 6 Feb 2018 | 2018‑02‑05 | BTC −65%, ETH −60% |
| Winter bottom | 15 Dec 2018 | 2018‑12‑10 | BTC ≈ $3.2k (−84% from ATH); difficulty −15% on 3 Dec |
| Cloud rumour | 2019 | 2019‑08‑05 | flavour |
| Black Thursday | 12 Mar 2020 | 2020‑03‑09 | BTC −40% in 24h; difficulty −16% on 26 Mar |
| Halving | 11 May 2020 | 2020‑05‑11 | subsidy 12.5 → 6.25; hashprice ≈ −48% |
| Uri | 15–19 Feb 2021 | 2021‑02‑15 | ERCOT at the $9,000/MWh cap for ≈ 4 days |
| China ban | 21 May → Jul 2021 | 2021‑05‑17 / 2021‑06‑21 | hashrate ≈ −50%; difficulty −27.9% on 3 Jul |
| ATH | 10 Nov 2021 | 2021‑11‑08 | BTC ≈ $69k, ETH ≈ $4.9k |
| Luna / Celsius | 9–13 May / 12 Jun 2022 | 2022‑05‑09 / 2022‑06‑13 | BTC $38k → $17.6k (18 Jun) |
| Merge | 15 Sep 2022 | 2022‑09‑12 (week 11 of Q3) | ETH mining revenue → 0 |

### B. Machines (`machines.json`)

**GPU Gen 1 = 6× RX 580 8GB.** About 180 MH/s at about 0.95 kW. This was the 2017 card of the shortage; a GTX 1070 gives similar hashrate for more money.

**GPU Gen 2 = 6× RTX 3060 Ti.** About 360 MH/s at about 0.85 kW, 2.2× the efficiency of Gen 1.
- **LHR:** from late May 2021, new cards shipped at about 50% ETH hashrate. Software unlocked about 70% in Aug 2021 and about 100% in May 2022.
- Proposed as a mechanic: Gen 2 bought in 2021Q3–2022Q1 runs at 0.7×, unless the player pays +15% for non-LHR cards.

**S9:** 13.5 TH, 1,323 W, 98 J/TH, about 85 dB. New in 2017 cost $1,300–2,300; used fell to about $100 by winter 2018. It dies at the 2020 halving outside cheap power.

**S19 Pro:** 110 TH, 3,250 W, 29.5 J/TH. About $2,600 at launch, about $11k at the 2021Q4 peak ($95–105/TH), about $3.3k by Sep 2022.
- **Lead times:** 2–3 quarters in 2021Q1–Q3. Bitmain sold futures batches 6–9 months out.
- **Infrastructure outside machines:** ≈ $180k/MW for racks, PDUs and cooling.

**Merge data.** ETH mining revenue went to 0. The best alt coin paid about $0.006 per MH-equivalent, which leaves a 3060 Ti roughly break-even at 12¢ power. Used 3060 Ti prices fell from about $800 (Jan 2022) to about $300 (Oct 2022).

### C. Sites, power, community (`sites.json`)

**EIA annual US average prices (¢/kWh).**

| Year | Residential | Commercial | Industrial |
|---|---|---|---|
| 2017 | 12.89 | 10.66 | 6.88 |
| 2020 | 13.15 | 10.59 | 6.67 |
| 2021 | 13.66 | 11.22 | 7.18 |
| 2022 | 15.04 | 12.41 | 8.32 |

- **Hosted mining rates:** $0.05–0.07 all-in (2017–21), $0.07–0.09+ (2022).
- **Large-miner contracts:** 2.5–4.5¢ (Chelan PUD, Quebec, Rockdale).

**Curtailment.** In summer 2022, Riot booked power credits of about $9.5M in July alone, on roughly 400 MW. That's about $25k per MW-month in extreme months.
- Game value: **$15k per MW per curtailment event (≈ one week)**.
- Uri: a fixed-price contract could resell power at up to ≈ $9/kWh against a cost of ≈ $0.03. Cap the game payout at about 3× a normal event so Uri isn't a lottery win.

**Community Heat.** Seven real disputes, mapped to the thresholds 30 / 50 / 70 / 90:

| Heat | Dispute(s) |
|---|---|
| 30 | Hood County TX (noise) |
| 50 | Chelan PUD and Hydro-Québec (rate class) |
| 70 | Plattsburgh (moratorium) |
| 90 | Greenidge (permit denial) |

Iceland and Norway are flavour.

**Hidden flaws.** Ten are defined, each with a real-world basis (see `flaws`).

### D. Scripted events

All 10 are in `events.json` with their dates. The Merge is data-only in `merge.json`. The **Dec 2017 peak and the Jan–Feb 2018 crash are one card** (scripted as a "peak → crash" choice about what you did with the treasury). The crash itself is a market shock marker, not a second card.

### E. Capital (`capital.json`)

**Ladder.** 10k → 40k F&F (10%) → $1.5M seed at $6M pre → $8M Series A at $32M pre → $150M IPO/SPAC (2021 window).
- Real calibration: Layer1 raised about $50M in 2019 (larger than the game's A). Bitfarms raised C$20–30M privately before its TSX-V listing. 2021 IPOs raised $112–232M.

**Crypto-backed loans.** BlockFi had 50% max LTV, a margin call at 70% and liquidation at 80%, with 72h to cure. Celsius and Genesis gave about 24h. The game uses 50/70/80 with **1 week to cure**. The product disappears after 2022Q2.

**2021 listings** and their fall by Sep 2022: typically −85% to −95%. Core Scientific went from $4.3B EV to about $0.45B market cap.

**Era multiple.** About 6× (2017–19) → 18–25× (2020Q4–2021Q1) → 15× (2021Q3) → 4× (2022Q3).

### F. Rivals (`rivals.json`)

Quarterly curves for hashrate, MW, BTC mined, BTC held and market cap. Fitted end-points (≈):

| Rival | Hashrate | Style |
|---|---|---|
| Riot | 0.57 EH (2019Q4) → 3.1 (2021Q4) → 5.6 (2022Q3) | expander / HODLer |
| Marathon | 3.5 EH (2021Q4), flat in 2022 (Hardin outage) | asset-light HODLer |
| Core Scientific | 10.3 EH self-mining (2022Q3); sold about 7.2k BTC in Jun 2022 | levered host |
| Bitfarms | 4.2 EH (2022Q3); sold about 3k BTC in Jun 2022 | cheap-power operator |

Pre-2019 values are thin and interpolated.

### G. People and operations

**Salaries** (≈, US; see `hires.json`):

| Role | 2017 | 2021 |
|---|---|---|
| Ops Manager | $90k | $130k |
| Trader | $120k | $180k |
| BD Lead | $100k | $150k |
| Ex-Utility Exec | $150k | $220k |
| Chief of Staff | $95k | $140k |

**Opex beyond power (≈):**
- Staff: 1 tech per 3–5 MW at scale.
- Maintenance: 2–3% of machine value per year.
- Insurance: 0.5–1% of asset value.
- Hosting margin: 1–2¢/kWh.

**Failures:**
- Annual failure rates: 5–10%, with used machines ×1.5 and heat waves ×2.
- Repairs cost $100–400 per hashboard or GPU.
- Fires: PDU and cabling overloads are the usual cause.

---

## 4. Balance-anchor check

| Anchor | Target | Pack result | Verdict |
|---|---|---|---|
| Garage rig, Q4 2017 | +$5/day | 180 × $0.0587 − 0.95 kW × 24 × $0.12 = **+$7.8/day** | **Correct to ≈ +$7–8.** Keep the real value. Or, if you want +$5, set the rig to 1.15 kW, which reflects untuned rigs and PSU losses |
| Same rig, Q4 2018 | −$0.60/day | 180 × $0.0128 − $2.74 = **−$0.44/day** (Dec alone ≈ −$1.0) | Confirmed |
| Hashprice | ~$400 late-2021 peak, ~$60 end-2022 | $428 (Apr 2021), $389 (Nov 2021), $93 avg in 2022Q3; ≈ $55–65 in Nov–Dec 2022 (outside Act I) | Confirmed. Note the 2021 *high* was April, not late 2021 |
| Good-player path | $10k → … → $150M IPO 2021Q2 | Amounts are consistent with real rounds. The real IPO wave was 2021H2; Q2 is early but inside the window | Confirmed |
| Peak valuation 2021Q3 | ≈ $2.0B at 15× | 1 MW of S19 Pro ≈ 33.8 PH × $320 = $10.8k/day revenue, minus $0.96k power at 4¢ ≈ **$3.6M/yr EBITDA per MW → $54M EV per MW at 15×**. So $2B ≈ **37 MW energized** (plus treasury) | **Holds only if the good path has about 30–40 MW running in 2021Q3.** At 100 MW it gives about $5.4B (too high). See flag F4 |
| Valuation at the Merge | −92% from peak | Hashprice −71% × multiple 15 → 4 (−73%), with power costs roughly fixed, gives EBITDA × multiple ≈ **−90 to −95%**. Real miners were −85 to −95% | Confirmed |
| 100% reinvest bust | 2018Q2–2019Q2 | ETH $/MH −86% from 2018Q1 to 2019Q1 and hashprice −85%, while machine payback periods passed 2 years | Plausible. Needs the sim-runner |
| Machine cost at peak | $3–4M/MW | 308 × S19 Pro × $11k ≈ **$3.4M/MW** | Confirmed |

---

## 5. Design flags

1. **F1 · Gen 2 date.** Unlock in **2020Q4** (3060 Ti launched 1 Dec 2020), not "2020".
2. **F2 · Q4 2017 rig profit.** It's +$7.8, not +$5 (see §4). Suggest updating the anchor rather than nerfing the rig.
3. **F3 · Equipment loans pre-2020.** They were rare in reality. Suggest a scarce, expensive 2017–19 version (50% LTV, 15%) and the full version from 2020Q3. This also helps the "reinvest-all goes bust" anchor.
4. **F4 · $2B peak needs a ramp cap.** A Texas site started in 2021Q1 energizes in 2021Q4, so the Texas site can't inflate 2021Q3. Make sure the good path reaches about 35–40 MW (20 MW own site + warehouses + partial Texas) by 2021Q3. Alternatively, value on *trailing* 4-quarter EBITDA, which lowers the peak naturally.
5. **F5 · The China ban is a windfall, not a crash, for the player.** Difficulty −28% raised everyone else's hashprice. The card should feel like an opportunity, and it's written that way.
6. **F6 · Hashprice peak timing.** It was in April 2021, before the China ban. The halving to April 2021 recovery is the biggest profit window, so the IPO decision should look strong around 2021Q1–Q2.
7. **F7 · S9 in a garage.** At 85 dB and 1.3 kW each on 240 V, even 3 of them max out ~5 kW and generate heavy noise. Suggest Heat +8 per S9 in the garage.
8. **F8 · The Merge "hold and wait" option.** Alt-coin mining kept GPUs roughly break-even at 12¢. It isn't zero, so the preview can mention it.
9. **F9 · Uri payout.** The real economics give an extreme windfall. Cap it at 3× a normal curtailment credit, or it dominates Texas site value.

---

## 6. Assumptions

- Weekly values are interpolated Monday values, not closes (see §0).
- Fee share is monthly-averaged.
- ETH uncle and fee income is a multiplier.
- Blocks/day are hand-set around the bombs.
- All USD are nominal.
- Rivals: pre-listing Core Scientific and early Marathon are interpolated.
- Rigs are priced as complete 6-GPU units.
- Event magnitudes are design estimates grounded in the real move sizes.
- Hires are fictional people.
- Crypto lender names appear only in data notes, not in events.

## 7. Open questions

1. Should the valuation use trailing or annualised-quarter EBITDA? (See F4.)
2. Should LHR become a mechanic or stay a news item?
3. Should curtailment pay per event or per quarter?
4. Should the S9 go on sale again used after 2020Q1? (It's in the data as used-only.)
5. Replacing the reconstructed market series with a CoinMetrics export needs one manual download, since the sandbox is blocked.

## 8. Sources (primary first; all as recalled, not re-fetched this session)

- **Market data:** CoinMetrics community data (price, difficulty, fees); Blockchain.com charts; BTC.com difficulty history; Etherscan (ETH hashrate, block time, uncles); whattomine (GPU benchmarks).
- **Hashprice and ASIC prices:** Hashrate Index (hashprice and ASIC Price Index); Luxor.
- **Power and grid:** EIA Electric Power Monthly Table 5.3/5.6.A; ERCOT and Texas PUC (Uri, Feb 2021).
- **Hardware:** Bitmain product specs (S9, S19 Pro); AMD/Nvidia launch MSRPs; Tom's Hardware GPU price index (2021–22); USTR Section 301 List 3 (2018).
- **Local disputes and utilities:** City of Plattsburgh moratorium (15 Mar 2018); Chelan County PUD board 2018–19; Hydro-Québec / Régie de l'énergie 2018–19; NY DEC Greenidge Title V denial (30 Jun 2022).
- **Regulation and research:** Cambridge CBECI (China migration); IRS Notice 2014-21.
- **Company filings:** Riot, Marathon, Bitfarms, Core Scientific 10-K/10-Q/40-F and monthly production updates; S-4/F-1 filings for Cipher, Greenidge, Stronghold, IREN, TeraWulf, Core Scientific, Bitdeer, Rhodium.
- **Lender terms:** BlockFi, Nexo and Celsius published loan terms; Stronghold 8-K (NYDIG settlement, Aug 2022); Core Scientific Ch.11 (21 Dec 2022); Compute North Ch.11 (22 Sep 2022).
- **Other:** CoreWeave/Atlantic Crypto company history.

---

## 9. Completeness check

| Item | Status | Note |
|---|---|---|
| A.1 weekly series (all 13 columns) | **Partial** | Complete and consistent, but reconstructed (§0) |
| A.2 quarterly summary | Done | Derived from A.1 |
| A.3 shock markers | Done | §3A |
| B specs, GPU basis, LHR | Done | |
| B price curves, lead times, infrastructure/MW | Done (≈) | |
| C power, site costs, curtailment, disputes, flaws | Done (≈) | 7 disputes, 10 flaws |
| D 10 scripted + Merge data | Done | |
| E ladder, loans, IPO deals, multiples, distressed | Done (≈) | Bitdeer and Rhodium included |
| F 4 rival curves | Done (≈) | Pre-2019 thin |
| G salaries, opex, failures | Done (≈) | |
| 20 event cards | Done | 10 scripted + 10 random |
| 7 interrupts | Done | |
| 5 hires | Done | |
| 4 rival profiles | Done | |
| Merge (4 choices + previews) | Done | |
| Onboarding tooltips | Done | 6 |
| Glossary | Done | 27 terms |
| News ticker | Done | 37 headlines, every quarter covered |
| Fresh web verification | **Missing** | Network blocked for data hosts, and no web search was run. Recommend a verification pass on the ≈ numbers before balancing |
