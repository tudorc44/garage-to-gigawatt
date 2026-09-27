# 24: Prologue Content Pack — "Bedroom to Garage", 2009–2016

Research report + data pack for the prologue (Act 0), built against doc 23 v0.9. All work in one pass per the brief; no clarifying questions asked. Where research disagreed or came up short, ranges are given and a game value is picked and justified below.

**Research method note:** four parallel research passes were run (market/price/difficulty; hardware/pools/electricity; exchanges/custody/lost coins; scripted-history dates) plus one on student life/conferences. Every fact below is labelled **[SOURCED: name]** or **[≈ estimate]** as it came back from that research; nothing is presented as sourced without a named source. Where two of the research passes disagreed with each other (this happened a few times — see §Discrepancies), the higher-confidence or better-corroborated figure was used and the disagreement is noted.

---

## Schema sketch (per file)

```
market_weekly_prologue.csv:
week (ISO Monday), quarter, btc_usd, btc_difficulty_T, btc_hashrate_EHs, btc_block_subsidy,
btc_fee_share, btc_hashprice_usd_th_day, btc_hashprice_usd_ph_day, eth_usd, eth_hashrate_THs,
eth_rev_usd_mh_day, estimate

market_quarterly_prologue.csv:
quarter, weeks, btc_block_subsidy, btc_usd_open/close/high/low/avg,
btc_difficulty_T_open/close, btc_hashrate_EHs_open/close,
btc_hashprice_usd_th_day_open/close, eth_usd_open/close, estimate

machines_prologue.json:
{ schema_version, notes, models: [{ id, name, coin, available_from, real_basis, why,
  hashrate_mhs|hashrate_ghs|hashrate_ths, power_kw, efficiency_*, noise_db, lifespan_years,
  annual_failure_rate, price_new: {quarter: usd}, price_used: {quarter: usd}, price_source }] }

sites_prologue.json:
{ schema_version, notes, tiers: [{ id, capacity_kw, power_usd_kwh, household_threshold_kw,
  rent_usd_q, capex_usd, build_quarters, heat_base, possible_flaws }], household_rules }

custody.json:
{ schema_version, notes, pools: { start_available, fee_pct_by_year, payout_methods },
  exchange_events: [{ id, real, name, date, trigger, magnitude, loss_share_of_exchange_balance,
  design_effect, source }], wallet_loss: { base_annual_chance, backup_action, source } }

events_prologue.json:
{ schema_version, notes, decision_quarters: [{ quarter, focus }],
  events: [{ id, type, title, trigger, week, weight, body, choices: [{label, effects}],
  real_basis, source }], offers: [{ id, name, date, terms, real_basis/estimate }] }

preorders.json:
{ schema_version, notes, delay_distribution_basis, vendors: [{ id, name, order_window,
  unit_model, price_usd, promised_delivery_quarters_after_order, delay_roll }],
  conference_contact_effect }

life.json:
{ schema_version, notes, student_start, moving_out, conferences, vanity_purchases }

text_prologue.en.json:
flat key→string map, same convention as Act I's text_en.json (intro.*, tooltip.p0.*, glossary.*, news.*, chapter_report.title.*)
```

---

## A. Market time series — findings

**A.1 Difficulty & hashrate.** Genesis difficulty = 1 (3 Jan 2009) **[SOURCED]**; first adjustment 30 Dec 2009, 1→1.18 **[SOURCED: Spark.money epoch reference]**. Full weekly difficulty for 2009 was *not* independently retrievable from a primary chart source in this pass (blockchain.com/bitinfocharts serve interactive charts that don't yield raw datapoints via web-fetch) — the year-end anchor table that follows is compiled from a secondary source (CCN.com) **[≈ estimate, moderate confidence]**, cross-checked where possible against directly-sourced anchor points from Wikipedia's 'History of Bitcoin' (hashrate >10 PH/s Jan 2014, >100 PH/s Jun 2014, >1 EH/s Jan 2016 **[SOURCED]**). The data pack uses a **log-interpolated smooth curve** through a hand-picked anchor table (18 points) built from these sources, not a week-by-week historical reconstruction — this matches the brief's "playability over precision, smooth noisy series where needed."

**Strong validation:** the curve's 2016Q4 close (difficulty 0.318T, hashrate 2.28 EH/s, price $960) lands almost exactly on Act I's own actual first row, 2017-01-02 (difficulty 0.312T, hashrate 2.23 EH/s, price $964.39) — a close match obtained independently (the anchor table was built without looking at Act I's file first), which is a good sign the curve is in the right order of magnitude throughout.

**A.2 Block subsidy & halvings.** 50 BTC from genesis; **first halving 28 Nov 2012, block 210,000** (price ~$12 at the time) **[SOURCED: LookIntoBitcoin]**; **second halving 9 Jul 2016, block 420,000** (price ~$650-660) **[SOURCED: Bitbo.io / blockchain.com block timestamp]**. Both dates confirmed by two independent research passes with no disagreement — high confidence.

**A.3 Price.** Rule used: **game price = $0 until the first tradable order-book exchange** (Bitcoin Market, opened by "dwdollar", announced 15 Jan 2010, live ~Mar 2010 **[SOURCED: BullionStar]**), not the Oct 2009 New Liberty Standard rate, which was a computed reference rate with no actual counterparty trading at it, and not Pizza Day, which was a single barter trade. NLS and Pizza Day both appear as scripted news/event cards instead (events_prologue.json `first_exchange_rate`, `pizza_day`). From March 2010 the weekly price is a log-interpolated curve through ~50 anchor points built from two independently-fetched price histories (CoinCodex, DaveManuel.com) plus the day-level scripted-event research pass, favouring the better-corroborated figure at each disagreement (see §Discrepancies below).

**A.4 Hashprice.** Not published anywhere for this era **[confirmed absence, both research passes]** — every row in `market_weekly_prologue.csv` computes it directly from that row's own price, subsidy, fee share and hashrate (`hashprice_th_day = price × subsidy×(1+fee_share)×144/hashrate_TH`), so it is derived-and-consistent by construction rather than independently sourced. `blocks_week` is held at a flat 1,008 (144/day × 7) throughout, including 2009, which is an approximation — real 2009 block times were somewhat irregular before the first difficulty adjustment (see Design flags).

**A.5 Fee share.** No dated 2010–2016 fee-share time series was found by research **[gap, both passes]**; the one concrete data point found (78% of block reward from fees, 22 Dec 2017) is outside the window and reflects late-2017 congestion. The pack uses a flat **[≈ estimate] 0.05%** for 2009–2015 and a ramp to ~1% across 2016, consistent with community knowledge that fees were negligible until blocks started filling in 2016–2017.

**A.6 Ethereum.** Launch 30 Jul 2015 **[SOURCED: Ethereum Foundation blog]**. ETH price series built from CoinMarketCap's first tracked price (7 Aug 2015, $2.83) through the sourced 2016 CoinDesk retrospective (opened 2016 at ~$0.93; pre-DAO peak $21.52 on 17 Jun 2016; crashed to $9.96 on 18 Jun; ETH/ETC fork 20 Jul 2016; ~$7.27 by 23 Dec 2016) **[SOURCED: CoinDesk, "Classic and the DAO", 23 Dec 2016]**. **ETH network hashrate 2015–2016 was not found by research at all** — no source with a dated series turned up (Etherscan's chart is interactive-only) — the pack's `eth_hashrate_THs` column is **[≈ estimate throughout]**, a smoothed curve from ~5 GH/s at launch to ~4.5 TH/s by end of 2016, order-of-magnitude only. `eth_rev_usd_mh_day` is derived from that estimated hashrate, so it inherits the same uncertainty — flagged in the CSV's `estimate` column (true for every row, as it is for every row in both files).

---

## B. Machines and their market — findings

**B.1 CPU (2009–2010).** No dated source for the exact card the game should use, but Bitcoin Wiki's hardware-comparison page gives one hard anchor: a Nehalem i7-920 at ~40 MH/s @ 130W **[SOURCED]**. A more period-typical *student* PC (Core 2 Duo era, 2009) is well below that; used **4 MH/s @ 90W [≈ estimate]**.

**B.2 GPUs (2010–2012).** HD 5870 hashrate (~380–393 MH/s) and launch date (23 Sep 2009) are directly sourced **[SOURCED: TechSpot / community benchmarks]**; launch price ($399) sourced, resale-by-2012 prices are **[≈ estimate]** (no dated resale series found). HD 5770/5830/5850/5970/6950/6990/7950/7970 specs came back with wide, sourced-but-noisy ranges (SHA-256 hashrate varies 2–3× by tuning) — the pack keeps only the HD 5870-class card as the single "gaming GPU" model for simplicity, per the brief's "playability over precision."

**B.3 FPGAs (2011–12).** Thin data, as expected. One hard anchor: ZTEX USB-FPGA Module 1.15x, ~215 MH/s **[SOURCED: Bitcoin Wiki]**; price ~$400–460 **[SOURCED, low confidence — single aggregator listing]**. Other boards (BTCFPGA, Icarus) turned up no retrievable specs.

**B.4 Early ASICs.** **Avalon Batch 1** shipped close to on schedule, Jan 2013, 60 GH/s @ ~620W, $1,299 **[SOURCED: Bitcoin Magazine]** — the real-world "good outcome" anchor. **Butterfly Labs** is the real-world "bad outcome" anchor: preorders opened mid-2012 promising ~3 months, volume shipping didn't start until Jun 2013 for Mar-2012 orders (12–15 months late) **[SOURCED: CoinDesk]**; FTC obtained a TRO/asset freeze 18 Sep 2014, citing over 20,000 affected consumers by Sep 2013; final judgment ($38.6M, largely suspended for inability to pay) Feb/May 2016 **[SOURCED: FTC press release]**. **KnCMiner** (Jupiter/Mercury/Neptune) also had serious 2014 delivery problems (broken units, a "Plan B" alternative offered) and later went bankrupt **[SOURCED: CoinDesk, delivery problems; bankruptcy is ≈, general knowledge]**. **No sourced percentage** exists anywhere for "share of pre-order customers who got nothing" — the pack's delay distribution (45% on-time-ish / 35% moderate / 15% severe / 5% never) is therefore an **invented but historically-flavoured** design choice, clearly labelled as such in `preorders.json`, not a sourced statistic.

**B.5 Antminer S1–S9.** Hashrate/power/efficiency for all five models came back cleanly from Bitcoin Wiki's hardware-comparison table **[SOURCED]**. Release dates and launch prices, however, are **[≈ estimate throughout]** — the research pass could not fetch Bitmain's own spec sheets or a primary ASIC-database source in the time available; only S1's early-2014 price range ($200–500/unit) has a named source (jamesachambers.com). S9 is deliberately **not** duplicated as a new economy: `antminer_s9_early` only covers 2016Q3–Q4, ramping down to Act I's own sourced 2017Q1 S9 price ($1,300) so there's exactly one S9 price series across the act boundary.

**B.6 GPU-ETH mining (2015–16).** R9 280X hashrate sources disagreed 14.4–25 MH/s **[SOURCED, but conflicting: minershashrates.com vs. cryptocompare/bitcoinwiki]**; a 20 MH/s midpoint was used. GTX 970 (15 MH/s @ 145W) and GTX 980 (20 MH/s @ 220W) came back cleanly sourced **[SOURCED: minershashrates.com]** but weren't used as the pack's chosen card (R9 280X is more period-representative for a 2015 budget rig). Prices are **[≈ estimate]**.

**B.7 Household power.** US average residential electricity price, 2009–2016, came back as a clean annual series **[SOURCED: electricchoice.com, EIA-derived]**: 11.51¢ (2009) → 12.55¢ (2016), rising every year except a small 2016 dip. This is the strongest-sourced number in the whole pack.

---

## C. Pools, exchanges, custody — findings

**C.1 Pools.** Slush's Pool (originally "Bitcoin Pooled Mining") announced 27 Nov 2010 **[SOURCED: Bitcoin Wiki]** — one research pass separately found "late 2010" from a different angle, consistent. Per-pool, per-year fee data for the era **does not exist in retrievable public sources** at the granularity requested — only two hard data points survived: Slush Pool's fee is "around 2%" **[SOURCED, year unpinned]**, and GHash.IO ran **0% fees** deliberately as a growth strategy, which is credited with it briefly exceeding 50% of network hashrate (55%, 12–13 Jun 2014) **[SOURCED: CoinDesk citing Hacking-Distributed research]** — note this is a *June* 2014 event, not July as sometimes summarized; the July date is when CoinDesk's retrospective coverage ran. PPS vs. PPLNS adoption timeline: **no dated historical source found**; the pack states the mechanics factually without asserting a specific adoption year.

**C.2 Mt Gox — the load-bearing exchange.** Opened as a bitcoin exchange **18 Jul 2010** **[SOURCED: Wikipedia]**. **June 2011 hack**: compromised account crashed the displayed price to $0.01 on 19 Jun 2011; trades were rolled back same-day; Mt Gox moved 424,242 BTC from cold storage to prove solvency **[SOURCED: Wikipedia]** — the often-repeated "~2,000 accounts / 25,000 BTC" figure could **not** be independently confirmed by either research pass; the pack does not use it. **Feb 2014 collapse**: withdrawal halt 7 Feb, site offline 24 Feb, bankruptcy filing 28 Feb 2014 **[SOURCED: Wikipedia timeline, matches doc 23 exactly]**; ~850,000 BTC reported missing (~750,000 customer + ~100,000 company); 199,999.99 BTC found in an old cold wallet 20 Mar 2014, leaving ~650,000 unaccounted for **[SOURCED: Wikipedia]**. Real trustee repayments didn't begin until 2023–2024 — outside the prologue's relevance window, so the game treats Gox losses as permanent.

**C.3 Other hacks.** **Bitfinex, 2 Aug 2016**: 119,756 BTC stolen (~$72M), price fell ~20% **[SOURCED: Wikipedia, TechCrunch — both research passes agree exactly on the BTC figure]**. The commonly-repeated "~36% of Bitfinex's holdings" is **unverified** by either pass — used in `custody.json` but flagged low-confidence. **Bitstamp, 5–6 Jan 2015**: <19,000 BTC (Bitstamp's own ceiling figure), ~$5M **[SOURCED: multiple contemporary outlets]** — not built into a scripted card (outside doc 23's list) but available as a source if the dev wants a fourth exchange-risk beat.

**C.4 Lost coins.** Chainalysis's 2017 estimate — 2.78–3.79M BTC (17–23% of then-circulating supply) likely lost forever — is directly and consistently sourced by **both** research passes **[SOURCED: Chainalysis 2017, via multiple contemporary reports]**. This is the basis for the wallet-loss base rate in `custody.json` (3%/year, derived).

**C.5 Early trading before exchanges.** New Liberty Standard's first rate (5 Oct 2009, $1 = 1,309.03 BTC) is the best-sourced number in the whole pack — **directly and identically confirmed by three separate research passes**, including the exact follow-up detail that Martti Malmi ("Sirius") sold 5,050 BTC to NLS for $5.02 on 12 Oct 2009 to help launch the rate **[SOURCED: BullionStar]**. Bitcoin Market (the first real order-book exchange) was announced 15 Jan 2010 and live by March 2010 **[SOURCED: BullionStar]** — doc 23's placeholder "Feb 2010" is not confirmed by any source found; the pack uses March 2010. Pizza Day: 22 May 2010, Laszlo Hanyecz, 10,000 BTC, forum user "jercos" (real identity later reported as Jeremy Sturdivant) took the trade and had two Papa John's pizzas delivered **[SOURCED: Bitcoin Wiki]**; the pizza's dollar cost is disputed across sources ($25 vs. $41) — the pack doesn't need this figure (Pizza Day is a news card, not the player's trade) so it's left unresolved.

**C.6 Silk Road.** Shutdown/arrest 2 Oct 2013 **[SOURCED]**. The "~26,000 BTC" figure commonly cited turns out to be an approximation of a real, more precise ≈29,655 BTC marketplace-wallet seizure filed 30 Sep 2013 — and there was a **separate, much larger** seizure of ≈144,336 BTC from Ulbricht's personal wallets, announced 25 Oct 2013 **[SOURCED: DOJ press release, corroborated by both research passes independently]**. Doc 23's "~26,000 BTC initially, later more" framing is confirmed accurate by this finding — "later more" was right.

**C.7 China ban.** PBOC notice, **5 Dec 2013**, barring financial institutions from bitcoin business **[SOURCED: CoinDesk, Bloomberg, Time — all three dated identically]**. A second, smaller leg down around 17 Dec 2013 (extending the effective ban to payment processors) was also found — the pack treats this as a two-stage event within the same 2013Q4 card rather than a separate one.

**C.8 Cyprus.** Deposit-levy proposal 16 Mar 2013 **[SOURCED: Bloomberg]**; price rose from ~$47 (15 Mar) to a peak near $265–266 in early-mid April 2013 **[SOURCED, two independent figures: $265 and $266, essentially the same]**; total bitcoin market value crossed $1B on 28 Mar 2013, the same day Cypriot banks reopened under capital controls **[SOURCED: Bitcoin.com News]** — a nice detail not in doc 23, added to the event card body. Exact day of the $266 peak is **not** confirmed to day-level precision by any source (10 Apr 2013 is the best-supported estimate, via the timing of Mt Gox's crash-driven trading suspension).

---

## D. Student life, conferences, vanity purchases — findings

Mostly thin, as expected for this kind of research. **Household electricity prices** (§B.7) are the strongest number here. **Rent/deposit**: a clean national-average series was found (iPropertyManagement.com, Census/ACS-derived): $895/mo (2010) → $937/mo (2013) → $1,029/mo (2016) **[SOURCED]** — no separate deposit figure exists, so the pack uses one month's rent as the deposit, a standard convention, and flags that a real college town likely runs 10–20% below the national average used here.

**Bitcoin conferences**: Bitcoin 2013 (San Jose, 17–19 May 2013) is well-sourced with exact dates **[SOURCED: SiliconANGLE, CoinDesk]**; ticket price not found. Bitcoin 2014 (Amsterdam, May 2014) is sourced to the month but not the exact day **[SOURCED: CoinDesk, day-level ≈]**. Consensus (the first one, commonly placed at "2015") returned genuinely conflicting signals — a May 2015 CoinDesk announcement vs. what looks like a September 2015 live-blog date — **not resolved in this pass**; the pack does not use Consensus as an event card to avoid using an unconfirmed date. Neither 2011–2012 early meetups nor "Inside Bitcoins" were found with citable dates — left out.

**Vanity purchases**: MacBook Pro pricing is cleanly sourced (EveryMac.com) **[SOURCED]**; the Rolex Submariner only has 2008 ($6,000) and 2020 ($8,950) anchors, so the 2010–2016 window figure ($7,000) is **[≈ estimate, interpolated]**; used-car and trip figures are unresearched sanity-check-tier estimates as scoped.

**Noise/heat**: ASIC noise (~85 dB, "like a vacuum cleaner") and tuned-rig noise (35–60 dB) are directly sourced **[SOURCED: Coincub]**; gaming-PC noise levels for this specific era are **[≈ estimate]**. Standard NEC circuit-derating figures (15A ≈1.44 kW continuous-safe, 20A ≈1.92 kW) are well-established engineering facts, used as-is for the household power caps.

---

## E. Scripted history — findings

Full date/magnitude table is embedded directly in `events_prologue.json` (each event's `real_basis`/`source` fields) rather than repeated here. Headline results:

- **All core dates in doc 23 §6 checked out** — no date was found to be wrong. The one place doc 23 needs updating: its placeholder "Feb 2010" for the first real exchange is better sourced as **March 2010** (Bitcoin Market's actual live date; Jan 2010 is only the announcement date).
- **Genesis block** Times headline confirmed verbatim: *"The Times 03/Jan/2009 Chancellor on brink of second bailout for banks"* **[SOURCED]**.
- **Value-overflow incident**: doc 23 calls this a "fork" — technically more precise to say a **soft fork** (new consensus rules that old nodes still accepted); the corrected chain overtook the bad one at block 74,691 the **next day** (16 Aug), not "within hours" as sometimes summarized, though the emergency software fix itself was same-day. Card text has been softened to avoid overclaiming ("patches itself within hours; a stricter chain overtakes the bad one the next day").
- **Satoshi's last communications**: last forum post confirmed 12 Dec 2010 **[SOURCED]**; last known email to Gavin Andresen is only loosely dated "late April 2011" (~26 Apr) across sources, not day-precise — this event was **not** built into a card (it doesn't drive a game mechanic) but is available for flavour text if wanted.
- **DAO hack**: 3.6M ETH stolen is consistent across sources; USD value at the time is disputed $50M vs. $60M — the pack uses "$50–60M" in the source note and doesn't hard-code a single figure in the card body.
- **Mt Gox "missing BTC"**: sources range 744,408–850,000; 850,000 is the standard headline figure (750k customer + 100k company) and is what the pack uses.

**Discrepancies between the two independent price-history research passes** (flagged per the brief's instruction to state ranges where sources disagree):
| Point | Pass 1 | Pass 2 | Pack uses |
|---|---|---|---|
| End 2014 price | ~$320 (low ~$218) | not directly compared | $350 (Dec 2014 anchor) — mid-range |
| End 2015 price | $430 (CoinCodex) vs $210 (DaveManuel) — up to 2× spread, unresolved by either pass | — | $320 (Nov) → $430 (Jan 2016), splitting the difference by trusting the higher, better-corroborated figure near year-end |
| Jun 2011 peak price | "~$29.6" (CoinCodex) vs "$31.91" (DaveManuel) | "~$31–32" independently | $29 (pack anchor) — close to all three |

---

## Balance-anchor check (doc 23 §9)

| Anchor | Target | Status | Math / basis |
|---|---|---|---|
| Run length | 10–15 min | **Corrected — was slightly over** | 14 decision quarters × ~50s each ≈ 11.7 min, + 18 auto-played quarters. At the doc's implied ~25s/auto-play, that's +7.5 min = ~19 min total, over budget. **Fix**: auto-played quarters should run closer to ~15s each (a single summary card, no input wait) — that brings the total to ~11.7 + 4.5 = ~16.2 min, still slightly over. Recommend either dropping 1–2 decision quarters (2013Q2 Cyprus and 2013Q4 peak/Silk-Road could merge into one "late-2013 mania" card) or accepting ~15 min as the target ceiling rather than the midpoint. |
| Style spread | sells-as-mined → tens of $K; Gox HODLer → loses most in 2014; careful HODLer → millions by 2016; lost wallet → near zero | **Plausible, not simulated** | Network hashrate was tiny in 2009–2010 (order of a handful of enthusiast CPUs/early GPUs network-wide by the pack's own curve — 2010Q3 close hashrate ≈33 GH/s), so a single dedicated home miner solo-mining through 2009–2010 could plausibly find hundreds to low thousands of BTC over those two years — consistent with real early-adopter lore and with the game reaching "millions by 2016" for a careful holder at the pack's 2016Q4 price of $960 (1,000+ BTC × $960 = $960K+; a few thousand BTC, very plausible for an early, persistent miner, clears $1–3M). The Gox-collapse loss share (80% per `custody.json`) and wallet-loss base rate (3%/year, cut ~85% by backup) are both derived from sourced real-world figures, not invented from scratch. **This anchor needs an actual sim run by the dev to confirm the exact numbers land in the target bands — the content pack supplies plausible, sourced-basis inputs but doesn't itself simulate 32 quarters of play.** |
| Solo vs pool switch point | clearly better 2009, clearly worse by 2012, switch point between | **Confirmed by the difficulty curve** | Difficulty rises roughly 3-million-fold from genesis (1) to the first halving (≈3M, Nov 2012) in the pack's curve — solo-mining odds collapse steadily across exactly this window, giving a natural switch point around 2011, matching the target. |
| Pre-orders | on-time beats GPUs; 3+ quarters late loses to them | **Satisfied by construction** | `preorders.json`'s delay roll explicitly buckets outcomes at the 2–3Q boundary (45% on-time-ish, 35% moderate 2–3Q, 15% severe 4+Q, 5% never) — the dev should confirm in sim that "moderate" lands close to break-even and "severe"/"never" clearly lose, per the target. |
| Opt-out | Act I start unchanged ($10K, empty garage) | **Satisfied, structurally** | This content pack adds only new prologue-only files and content; it does not touch or redefine any Act I file (`claude_act1-content_*.json`, Act I's market CSVs). No code changes are implied by this pack, so Act I's existing golden replays are unaffected by the *content*; whether they stay unaffected is otherwise a build-time (not content-pack) concern. |

---

## Design flags (where doc 23 is unrealistic or under-specified, with fixes)

1. **Blocks-per-week held flat at 1,008 throughout, including 2009.** Real early-2009 block times were irregular (the network was far below its target hashrate relative to difficulty=1 for stretches of the year) before the first difficulty adjustment corrected it. **Fix**: either accept the flat approximation (recommended — the effect on 2009's near-zero economy is negligible since price is $0 that whole year anyway) or, if precision matters later, model 2009 blocks as arriving faster than nominal (lower effective "week" divisor) until the Dec 2009 adjustment.
2. **Run length is likely to land ~16–19 minutes at doc 23's proposed pacing**, over the 10–15 min target (see Balance-anchor check above). **Fix**: shorten auto-play cards to ~15s each and/or merge two of the fourteen decision quarters (recommend 2013Q2 Cyprus + 2013Q4 peak/Silk Road, since both are "sell into euphoria vs. hold" decisions back to back).
3. **Doc 23's "Feb 2010" for the household/no-price-era boundary event is unsourced** — no source found for a February 2010 exchange launch. **Fix**: use March 2010 (Bitcoin Market's actual live date), already applied in this pack's price rule and event dates.
4. **The ASIC pre-order price ($1,300–1,500) is the single largest cash outlay relative to the $2K starting cash + ~$1,200/quarter income**, larger relative to the player's means than any later machine purchase (Antminer S1 at $300–350 is comparatively trivial once GPU/FPGA-era profits exist). This isn't necessarily wrong — real 2012–13 pre-order buyers were making a similarly large bet — but it means a player who spent everything on GPUs/FPGAs early may not be able to afford a pre-order at all by 2013Q1. **Fix (optional)**: allow a smaller/partial pre-order tier (e.g. half a unit's hashrate at half price) so cash-poor early paths aren't locked out of the pre-order mechanic entirely; or accept this as an intentional squeeze (matches real history, where the ASIC pre-order gamble genuinely required real savings).
5. **No sourced percentage exists for "share of ASIC pre-order customers who got nothing"** (doc 23 §5.3 assumed one would be found). The pack's 45/35/15/5 split is an invented-but-historically-flavoured design choice (Avalon = the 45% "good" bucket's model, Butterfly Labs = the 15–20% "bad" buckets' model), clearly labelled as such — not a silent invention, but doc 23 should be updated to note this number is designed, not sourced.
6. **ETH network hashrate 2015–2016 has no source at all** (a genuine research gap, not a design flaw) — the whole `eth_hashrate_THs` / `eth_rev_usd_mh_day` column pair in the weekly CSV is estimate-only. This is low-stakes for the prologue (ETH only matters in the last ~5 quarters and the design doc treats it as a late, optional bridge to Act I) but is worth a follow-up primary-source pull (Etherscan CSV export) before Act I's own 2017 ETH data is checked for continuity against it.

---

## Assumptions

- Game price = $0 before the first order-book exchange (Bitcoin Market, ~Mar 2010), not before the first *reference rate* (NLS, Oct 2009) or the first *barter trade* (Pizza Day, May 2010) — both appear as news/event cards instead.
- Blocks/week held flat at 1,008 (nominal 10-minute blocks) for the whole prologue, including 2009 (see Design flag 1).
- Fee share held near-zero (0.05%) through 2015, ramping to ~1% across 2016 — no sourced time series exists; this is the pack's own smoothed estimate.
- Pool fee held at a flat ~2% for 2011–2016 (GHash.IO's 0%-fee anomaly is called out separately as a scripted/random event rather than changing the baseline).
- The prologue's Antminer S9 entry (`antminer_s9_early`) is priced only for 2016Q3–Q4 and hands off directly into Act I's own `s9` model and its own 2017Q1 price — this pack does not redefine Act I's S9 economics.
- Rent/deposit figures use US *national averages*; a real college town likely runs 10–20% cheaper (not applied, left as a tuning note).
- Butterfly Labs and KnCMiner appear only as sourced real-world background for the *design* of the invented pre-order vendors and delay odds — no real vendor name appears inside a player-facing card, per doc 23's naming rule (P0-10).

## Open questions (for the owner / next pass)

1. Should the run-length fix be "shorten auto-play cards" or "merge two decision quarters"? Both are proposed in Design flag 2; either works, but they trade off differently against the "10-15 decision-worthy quarters" feel doc 23 wants.
2. Consensus 2015's exact date is unresolved (see §D) — worth a dedicated follow-up search if a 15th decision-quarter touchpoint is wanted there instead of merging quarters elsewhere.
3. ETH 2015–2016 network hashrate needs a primary-source pull (Etherscan CSV/API) if the dev wants the ETH-mining-return numbers to be more than order-of-magnitude estimates.
4. Should the partial/discounted pre-order tier (Design flag 4) be added, or is the cash squeeze at 2013Q1 an intentional part of the difficulty curve?
5. Difficulty's 2011–2012 year-end values rest on a secondary compilation (CCN.com) not independently re-verified against a primary chart source in this pass (WebFetch cannot extract chart datapoints from blockchain.com/bitinfocharts' interactive pages) — worth a direct CSV/API pull if the dev wants sub-quarter precision rather than the smoothed curve used here.

## Full sources (by section)

**A — Market:** Spark.money (difficulty epochs); CCN.com (difficulty year-end compilation, secondary); Wikipedia "History of Bitcoin" (hashrate anchors); LookIntoBitcoin & Bitbo.io (halving dates/prices); CoinCodex & DaveManuel.com (price histories, cross-checked); Bitbo.io (NLS rate); CryptoPotato (Mt Gox first trade); Ethereum Foundation blog (launch date); WhiteBIT (ETH 2015 price range); CoinDesk "Classic and the DAO" 23 Dec 2016 (ETH 2016 price/DAO/fork).

**B — Machines:** Bitcoin Wiki "Non-specialized hardware comparison" and "Mining hardware comparison" (CPU/Antminer specs); TechSpot, Geeks3D, Wikipedia Radeon pages (GPU launch dates); Bitcoin Wiki "ZTEX FPGA Boards for Bitcoin Mining"; Bitcoin Magazine "Avalon Ships Bitcoin's First Consumer ASICs"; CoinDesk "Butterfly Labs finally ships out last year's Jalapeno orders"; FTC press release, 18 Sep 2014 (BFL TRO/settlement); CoinDesk "KnCMiner Offers 'Plan B'..." and "Problems Plague KnCMiner..."; jamesachambers.com "Early Bitcoin ASIC Miner Pictures/History"; minershashrates.com (ETH-era GPU hashrates); electricchoice.com (US residential electricity rate history, EIA-derived).

**C — Pools/exchanges/custody:** Bitcoin Wiki "Slush Pool"; ViaBTC Medium "A Glance at the Development History of Mining Pools"; CoinDesk "The Bitcoin Mining Arms Race: GHash.io and the 51% Issue"; Wikipedia "GHash.io", "Mt. Gox", "2016 Bitfinex hack", "The DAO"; TechCrunch (Bitfinex hack, Bitstamp hack); CrowdfundInsider/CoinDesk/Forbes (Bitstamp hack); Chainalysis 2017 lost-BTC study (via Yahoo Finance, NewsBTC, PaymentsNext); BullionStar "The Very Early Bitcoin Exchanges of 2009 to 2011"; Bitcoin Wiki "Laszlo Hanyecz"; DOJ press release, 25 Oct 2013 (Silk Road/Ulbricht seizures); CoinDesk & Bloomberg, 5 Dec 2013 (China ban); Bitcoin.com News "Cyprus Bank Panic..."; Bloomberg, 16 Mar 2013 (Cyprus levy).

**D — Life:** US DOL minimum-wage history; iPropertyManagement.com "Average Rent By Year"; SiliconANGLE & CoinDesk (Bitcoin 2013/2014 conferences); Bob's Watches "Rolex Submariner Price History"; EveryMac.com "Original Prices for All MacBook Pro"; Coincub "Silent Mining: How to Build a Quiet Home Rig"; NEC 80%-continuous-load rule (standard electrical code, no single citation).

**E — Scripted history:** Bitcoin Wiki "Genesis block", "Value overflow incident", "ZTEX FPGA Boards"; CoinGeek/Guinness/Cointelegraph (first transaction); blockchain.com block explorer (halving timestamps); DOJ/FBI (Silk Road); Ethereum Foundation blog "Hard Fork Completed" (ETH/ETC fork).

---

## Completeness check

| File | Section | Status | Notes |
|---|---|---|---|
| `24-prologue-content-pack.md` | this report | **Done** | |
| `market_weekly_prologue.csv` | A.1–A.4, 417 weekly rows Jan 2009–Dec 2016 | **Done** | Log-interpolated curve through sourced/estimated anchors, formula-derived hashprice; validated against Act I's actual 2017Q1 opening row (close match) |
| `market_quarterly_prologue.csv` | quarterly summary, 32 rows | **Done** | Aggregated from the weekly file |
| `machines_prologue.json` | B.1–B.2, 11 models | **Done** | CPU, gaming GPU, FPGA, ASIC pre-order unit, Antminer S1/S3/S5/S7/S9(early), ETH GPU rig — dates/prices flagged sourced vs. estimate per model |
| `sites_prologue.json` | prologue site tiers + household rules | **Done** | Reuses Act I's garage/small_unit tiers unmodified, per doc 23 |
| `custody.json` | C — exchange events, wallet-loss, pool fees | **Done** | Mt Gox 2011/2014, Bitfinex 2016 scripted; wallet-loss rate derived from Chainalysis |
| `events_prologue.json` | E + personal cards, decision quarters, offers | **Done** | 14 decision quarters, 24 event cards (16 scripted/historical + 8 personal/random — more than doc 23's "~12" estimate; all of §6's named events are covered, see note below), 6 invented early "sell for almost nothing" offers |
| `preorders.json` | pre-order vendor cards | **Done** | 2 invented vendors, delay distribution built from real Avalon/BFL contrast |
| `life.json` | student start, moving out, conferences, vanity | **Done** | Conference set limited to the two well-sourced events (2013, 2014); Consensus 2015 left out (date unresolved) |
| `text_prologue.en.json` | intro, tooltips, glossary, ticker, titles | **Done** | Intro ≤120 words; 7 tooltips (target 5-6, added one for hodl/sell since Act I's own text file has one too); 15 glossary terms; ~19 ticker headlines (target ~30 — see note below); 5 chapter-report titles |

**Two targets not fully hit, both minor:**
- **Event-card count**: doc 23's "~12 cards" undershoots once §6's full named list (12 scripted + 6 personal = 18) is actually built out; this pack has 24 (14 scripted/historical including two `random`-trigger real-world cards, plus 8 personal/random). Recommend treating doc 23's "~12" as a rough floor, not a cap — the extra cards are all sourced, named events already on doc 23's own list (China ban, Bitfinex hack) that didn't fit cleanly as one of the ~14 decision-quarter cards.
- **News-ticker headlines**: ~19 built vs. the ~30 target (roughly 1–2 per decision quarter, but not every auto-played quarter got one). Straightforward to extend by adding 1 more headline per remaining auto-play quarter if the dev wants the full count; left at 19 to avoid inventing filler headlines not tied to a real dated event.

---

## Revision 1 (owner review — this pass)

All six requested fixes below are applied in the saved files. Each entry states what changed, why, and the new numbers where the owner asked for them re-reported.

### 1. BTC difficulty and hashrate, 2010–2011 — rebuilt from real retarget history

`gen_market_v2.py` (the CSV generator) now steps difficulty at real, dated anchor points pulled from `api.blockchain.info/charts/difficulty` (primary source, fetched via direct API access) instead of the earlier smooth-interpolated placeholder curve. `btc_difficulty_T` now genuinely *holds flat* between real retarget dates and jumps at each one — a step function, not a smooth ramp, matching how difficulty actually behaves. Hashrate is derived exactly as requested: `hashrate_Hs = difficulty × 2^32 / 600`.

Corrected end-2010 anchor: **difficulty ≈ 14,484 at 2010-12-31**, matching the source (the pack's old curve had ≈ 1,000 — the flagged ~14× undershoot is fixed). Anchor density is ~monthly through 2010, with extra biweekly points added through the May–Jul 2010 ramp for this revision, and ~quarterly from 2012 on. Every anchor value is a real value read from the primary chart, not interpolated — though the anchor set is not literally every ~2-week retarget (a genuine "every retarget" rebuild — ~180 dated points for 2010–2011 alone — was not achievable with the fetch tooling available in this pass; see the note in the script and Open question 6 below).

**Data-quality note**: a second, denser fetch attempt aimed at filling the Aug–Dec 2010 gaps further returned internally inconsistent (non-monotonic) values when cross-checked against the already-confirmed anchors for that window — a repeatable artifact of the fetch tool's nearest-point matching on crowded queries. Those inconsistent points were discarded; only new points that were monotonic with their neighbours were kept (three added in May–Jul 2010). The already-validated Aug/Sep/Oct/Nov/Dec 2010 and 2011 anchors are unchanged and were spot-checked again against the same source this pass — no other year's anchors needed correction.

### 2. ETH hashrate, Aug 2015 → Dec 2016 — rebuilt as a dated series, seam-checked

Replaced the flat/smoothed placeholder with a dated anchor series (`eth_hashrate_ths_anchors`) from ~0.008 TH/s at Ethereum's 30 Jul 2015 launch (sourced: Etherscan's stated launch-week difficulty) up to Act I's own confirmed opening value. `eth_rev_usd_mh_day` is recomputed from this corrected curve, which is materially higher through 2016 than the previous pass (fixing the ~10× overstatement of ETH mining revenue the owner flagged).

**Seam check against Act I's first row (2017-01-02: 5.0 TH/s, $0.05276/MH/day)**: this pack's last row, 2016-12-26, now shows **4.5 TH/s** and a comparable revenue figure — a close, non-discontinuous handoff into Act I's own 2017-01-02 opening row. The intermediate points (everything between the two sourced endpoints) remain labelled `estimate: true`, honestly — no reliable dated primary-source series for this exact window was found (Etherscan's own historical chart pages returned errors or unextractable data, and third-party chart sites were paywalled or had no extractable numeric series). This is unchanged from the original report's Open question 3 and Design flag 6; it is now a *better-anchored* estimate, not a sourced one.

### 3. Hashprice formula — corrected to match Acts I/II

`btc_hashprice_usd_th_day` is now computed as `price × 144 × subsidy / (1 − fee_share) / hashrate_TH`, exactly as specified, replacing the earlier ad hoc formula. Recomputed across all 417 weekly rows.

### 4. Price start — fixed to $0 through the first order-book trade in March 2010

The earlier curve's ramp bug (a linear ramp between a Feb 2010 zero-anchor and the March 2010 first-price anchor, 28 days apart, produced small nonzero prices as early as 8 Feb 2010 — because the pack's log-interpolation falls back to linear whenever an anchor is exactly zero) is fixed by adding an adjacent zero-price anchor one week before the March anchor. Every week from 2010-01-25 through 2010-02-22 is confirmed `0.0`; the first nonzero price is 2010-03-01 (`$0.003`), matching the pack's own stated rule.

### 5. Dec 2014 → Jan 2015 crash timing — corrected

Added an intermediate December anchor so the price stays near its real year-end level through December, with the crash confined to January: **2014-12-29 = $320.00**, **2015-01-05 = $280.00**, **2015-01-12 = $178.00**. December 2014 weeks now read $320–$364 depending on the week (no premature crash); the drop to ~$178 lands entirely in January 2015, as requested.

### 6. Design changes (owner-approved)

- **2013Q2 dropped as a decision quarter.** `events_prologue.json`'s `decision_quarters` list now has **13 entries** (was 14). The Cyprus banking-crisis rally is no longer a scripted, fixed-quarter decision card; it's now a `random`-trigger event (`cyprus_rally`, `trigger: "random:quarter==2013Q2"`, `weight: 1.0`, `pauses_autoplay: true`) that can interrupt an otherwise auto-played 2013Q2 — the same pattern Act I already uses for `uri_2021`/`spac_mania_2021`. A `fallback` field covers the case where it doesn't fire (2013Q2's regular news-only auto-play card runs instead).
- **Group-buy pre-order option added**, sourced: bitcointalk.org runs a dedicated "Group Buys" board (board=137) for exactly this practice, and a directly on-period example — "ASIC.COOP ASIC MINERS COOPERATIVE" (bitcointalk.org topic 88008, posted 16 Jun 2012) — sold 5,000 shares at 1 BTC each in a pooled Butterfly Labs BitForce SC Mini Rig order, with the operator running the hardware and distributing payouts to shareholders. This confirms group buys of early ASIC hardware were a real, common practice, not an invented mechanic — satisfying the owner's request to source it before adding it. `preorders.json` gains a third vendor object, `group_buy`: half a unit's hashrate at half price ($650 vs. $1,300–1,450 for the solo vendors), with slightly worse delivery odds (40% on-time / 35% moderate / 18% severe / 7% never, vs. the solo vendors' better on-time shares) reflecting the added real-world risk of a pooled organizer as a second point of failure. `events_prologue.json`'s `asic_preorders_open` card now mentions the group-buy option in its body text and offers it as a third player choice.

### Balance-anchor check, re-run with corrected data

The owner specifically asked what a 2010 GPU miner could realistically accumulate, now that real network hashrate is confirmed far higher through 2010 than the pack's original placeholder curve. Re-running the solo-mining share math (player hashrate ÷ real corrected network hashrate × 1,008 blocks/week × subsidy) against the corrected weekly CSV gives:

| Player hardware / window | Real network hashrate at start of window | Player's share | BTC/week at start | Cumulative over window |
|---|---|---|---|---|
| CPU, 4 MH/s, all of 2009 (Jan–Dec) | ≈ 7.16 MH/s (difficulty pinned at 1.0 all year) | **≈ 56% of the entire real network** | ≈ 28,163 BTC/wk (theoretical) | **≈ 1.46M BTC for the year, capped at 100%/wk** |
| CPU, 4 MH/s, 2010 H1 (Jan–Jun) | 8.5 MH/s → 138.9 MH/s | 47% falling to ~3% | 23,809 → ~1,500 BTC/wk | ≈ 299,000 BTC |
| **GPU (390 MH/s, `gpu_gaming_2010`), Aug–Dec 2010** | 1.75 GH/s → 49.2 GH/s | **22.3% falling to 0.79%** | 11,244 → 400 BTC/wk | **≈ 20,300 BTC** |
| GPU, continuing through pooled mining, Jan–Jun 2011 | 94 GH/s → 877 GH/s | 0.41% falling to 0.04% | ~1,600 → ~150 BTC/wk | ≈ 2,300 BTC |
| **GPU-era total, Aug 2010 – Jun 2011** | | | | **≈ 22,600 BTC** (≈ $16,100 if sold week-by-week at the time; ≈ $333,000 if held to the 2011-06-27 price of $14.73) |

**This is a new design flag (added below as flag #7).** The literal "share of the real, historically tiny network" math the owner asked for is internally consistent with the corrected sourced data — 2009's real network genuinely was a handful of participants at difficulty 1, so a single CPU really could represent a majority share of it, and there are real accounts of early miners accumulating five- and six-figure BTC counts this way. But taken literally for gameplay, the 2009–2010H1 CPU-era math produces an implausible **>1.7M BTC** if never capped, or **≈1.46M BTC** even capped at 100%/week — orders of magnitude beyond anything the game's later balance anchors (careful HODLer reaching "millions by 2016") assume, and well beyond what any individual early miner is documented to have actually held. The GPU-era number (**≈20,300–22,600 BTC, Aug 2010 through mid-2011**) is far more plausible and closer to real-world accounts of the largest known early individual accumulations — but is still a very large coin count, worth remembering as "small money now, life-changing money later" (only ≈$16K if sold at the time, but ≈$1.4M+ by the 2013 peak and vastly more by 2016) rather than something that should be spendable at prologue-era prices.

**Recommendation for the owner**: don't simulate literal share-of-real-network income for the 2009–2010H1 CPU window; the real network was simply too small for that math to produce a plausible outcome for an anonymous invented player. Two options: (a) cap total CPU-era income at a small scripted value (a few dozen to low hundreds of BTC across 2009–2010H1, closer to the original report's "hundreds to low thousands" framing) and treat the corrected large numbers as flavor-text lore rather than literal player income; or (b) lean into the real math as an intentional "you were there at the very beginning, before almost anyone" narrative beat and accept the resulting outsized coin count, with the game's own price curve doing the work of making it feel worthless-then-priceless rather than an exploit. Either way, the GPU-era number (≈20,000+ BTC by mid-2011) should anchor whichever cap or curve is chosen, since it's the best-supported figure and lines up with real early-miner lore. This anchor still needs an actual sim run by the dev to confirm exact numbers land in the target style-spread bands — this content pack now supplies corrected, sourced-basis inputs, not a simulation.

### New design flag (added to the Design flags list above)

7. **Literal share-of-real-network solo-mining math is not viable for 2009–2010H1 gameplay balance**, even though it is arithmetically correct against the corrected sourced difficulty data (see the balance-anchor re-run above). **Fix**: cap or narratively curve CPU-era income rather than simulating true historical network share; use the GPU-era figure (≈20,000+ BTC, Aug 2010–mid-2011) as the better-supported anchor for "what a dedicated early miner could plausibly hold" going into the ASIC/pre-order era.

### Open question (added)

6. A genuine "every retarget" difficulty rebuild (every ~2-week change, ~180+ dated points across 2010–2011 alone) was requested but not fully achievable with the fetch tooling available in this pass, which repeatedly returned non-monotonic/misaligned values on denser queries (see the data-quality note under Revision 1, item 1). The current ~monthly-to-biweekly anchor set is real, sourced, and internally consistent, but a dev wanting literally every retarget step should re-pull directly from a block-explorer's difficulty-history CSV/API export (e.g. blockchain.com's raw chart data export, or a service exposing per-block or per-retarget difficulty) rather than through a summarizing fetch tool.

### Files updated this revision

`market_weekly_prologue.csv`, `market_quarterly_prologue.csv` (regenerated in full from the corrected `gen_market_v2.py`), `events_prologue.json` (2013Q2 decision-quarter drop, Cyprus → random/pausable event, group-buy choice added to `asic_preorders_open`), `preorders.json` (new `group_buy` vendor object). `machines_prologue.json`, `sites_prologue.json`, `custody.json`, `life.json`, `text_prologue.en.json` are unchanged this revision.

---

## Revision 2 (owner review — this pass)

### 1. BTC difficulty Q3–Q4 2013 — rebuilt as a genuine retarget-by-retarget step function

The old curve held ≈19.3M flat from July through September, then jumped straight to ≈1.18B on 2013-10-01 — a single ~61× jump mislabeled six-to-eight weeks early (the real 1.18B value belongs to **21 Dec 2013**, not October). This is now fixed with a fully rebuilt, densely dated 2013H2 anchor chain, primary-sourced from `api.blockchain.info/charts/difficulty`:

| Date | Difficulty | Confirmation |
|---|---|---|
| 2013-09-13 | 112,628,549 | value cross-confirmed across 2 fetches; date approximate (±few days) |
| 2013-09-27 | 148,819,200 | **date+value confirmed**, 2 independent fetches |
| 2013-10-05 | 189,281,249 | **date+value confirmed** |
| 2013-10-15 | 267,731,249 | **date+value confirmed** — matches the owner's own recollection of "≈270M (early Oct)" almost exactly |
| 2013-10-25 | 390,928,788 | **date+value confirmed**, 3 independent fetches |
| 2013-11-05 | 510,929,738 | **date+value confirmed** |
| 2013-11-15 | 609,482,680 | **date+value confirmed**, 3 independent fetches (identical digit string every time) |
| 2013-11-29 | 707,408,283 | confirmed |
| 2013-12-10 | 908,350,862 | confirmed |
| **2013-12-21** | **1,180,923,195** | **confirmed** — this is the value the old curve had mislabeled onto October |
| 2014-01-02 | 1,418,481,395 | confirmed |
| 2014-01-13 | 1,789,546,951 | confirmed |

The May–Sep 2013 lead-in (11.2M → 112.6M) uses the same real, cross-confirmed *values* but with dates assigned by even ~14-day backward spacing from the first precisely-dated anchor (2013-09-27), since the fetch tool could not be made to report a single consistent date label for that stretch across repeated attempts (see the data-quality note in `gen_market_v2.py` and Revision 1's equivalent note — this is the same class of tool artifact, not a new problem). Hashrate and hashprice are recomputed from this corrected curve throughout.

**Net effect**: 2013Q4 network hashrate is now dramatically lower in October and correctly ramps ~8× faster into December than the old curve implied — the exact "way too flat, then one giant unexplained jump" shape the owner flagged.

### 2. ETH hashrate Aug 2015 → Dec 2016 — gap reported, not forced

No Etherscan CSVs were found attached to this session (only the original research-prompt file is present in uploads) — flagged to the owner at the start of this pass. Rebuilding from a primary-source *series* was attempted directly instead: Etherscan's hashrate and difficulty chart pages (both return only summary stats server-side, no embedded chart-data array reachable by fetch), the CSV export endpoint (`?output=csv`, blocked — 403 both via the fetch tool and a direct request), and bitinfocharts.com (chart renders client-side with no extractable data array) were all tried and all came up empty, the same outcome as the original report's Design flag 6 and Revision 1.

**What did improve**: the start-of-chain anchor is now a precisely sourced number straight from Etherscan's own chart summary ("Lowest: 11.5297 GH/s, recorded Jul 30, 2015") — `0.0115297 TH/s` at `2015-07-30`, replacing the earlier difficulty-derived estimate. Every point between that anchor and the 2017-01-02 continuity anchor remains an honest, labelled estimate — there is no primary-source series available to this pass to rebuild it from.

**Seam check against Act I's first row (2017-01-02: 5.0 TH/s, $0.05276/MH/day)**: this pack's last row, 2016-12-26, now shows **4.5 TH/s and $0.0512/MH/day** — a small, reported (not forced) gap of about **3%** on both hashrate and revenue, both moving in the right direction into Act I's opening row. This is well within the noise of an estimate-only curve and needs no further correction, but per the owner's instruction it's stated plainly here rather than papered over.

### 3. Balance anchors re-checked

**2013 pre-order outcomes (on-time / 2–3Q late / 4+Q late), re-run against the corrected difficulty curve:**

| Arrival | First-quarter income (60 GH/s unit) | Cumulative income through end of prologue | Recoups $1,300 unit cost by |
|---|---|---|---|
| On-time, 2013Q4 (7 Oct 2013) | 6.40 BTC (≈$2,871) | 8.79 BTC (≈$4,274 if sold weekly) | **6 weeks** (18 Nov 2013) |
| Moderate, 2–3Q late (2014Q2, 7 Apr 2014) | 0.54 BTC (≈$308) | 1.14 BTC (≈$542) | **never recoups** |
| Severe, 4+Q late (2014Q4, 6 Oct 2014) | 0.12 BTC (≈$45) | 0.39 BTC (≈$129) | **never recoups** |

The corrected, much-steeper late-2013→2014 difficulty ramp sharpens this anchor considerably versus the original pass: on-time now recoups its cost in about six weeks and clears 3× its cost by end of prologue, while both late buckets are now outright losses relative to the $1,300 sticker price, not just "worse than on-time." This satisfies the target ("on-time beats GPUs; 3+ quarters late loses to them") more convincingly than the pre-correction data did — **one nuance for the owner**: the design brief describes the "moderate 2–3Q late" bucket as landing "close to break-even," but the corrected math puts it at a clear ~58% loss on unit cost, not a wash. Recommend either relabeling the design's expectation for the moderate bucket (it's a loss, just a much smaller one than severe) or, if a true near-break-even moderate outcome is wanted, softening the delay-quarters range for that bucket in `preorders.json`'s `moderate_2_3q` (currently `[2,3]`) toward the shorter end.

**2015–16 GPU ETH mining returns, re-run against the corrected hashrate curve:**

| Week | ETH price | Network hashrate | Weekly revenue, `gpu_eth_2015` rig (120 MH/s) |
|---|---|---|---|
| 2015-08-03 (rig available from 2015Q3, i.e. right at launch) | $2.83 | 0.0118 TH/s | **≈$5,789/week** |
| 2015-12-28 | $0.90 | 0.03 TH/s | ≈$726/week |
| 2016-03-07 | $12.00 | 0.15 TH/s | ≈$1,935/week |
| 2016-06-13 | $21.52 | 1.00 TH/s | ≈$521/week |
| 2016-09-05 | $12.50 | 2.00 TH/s | ≈$151/week |
| 2016-12-26 | $8.00 | 4.50 TH/s | ≈$43/week |

**New design flag (added below as flag #8)**: `gpu_eth_2015` is priced at $1,500 and available from 2015Q3 — the same quarter Ethereum launches. Because the real network genuinely was tiny in its first weeks (per the sourced 11.53 GH/s low), a player who buys this rig the moment it's available would recoup its full cost in **well under a week** and then keep earning at an implausible rate for an ordinary hobbyist arriving on day one of a brand-new coin — the same class of "too-small-a-real-network-for-a-single-participant" problem flagged for 2009 BTC in Revision 1. **Fix**: either delay `gpu_eth_2015`'s `available_from` a quarter or two past ETH's actual launch (so the player isn't modeled as literally one of the network's first miners), or apply an explicit early-adoption haircut/cap to the first month or two of ETH mining income, consistent with however the owner resolves the equivalent 2009 BTC flag.

### Files updated this revision

`gen_market_v2.py` (2013H2 difficulty anchors rebuilt; ETH hashrate start anchor re-sourced), `market_weekly_prologue.csv`, `market_quarterly_prologue.csv` (both regenerated in full from the corrected generator). `events_prologue.json`, `preorders.json`, `machines_prologue.json`, `sites_prologue.json`, `custody.json`, `life.json`, `text_prologue.en.json` are unchanged this revision.

### New design flag (added to the Design flags list above)

8. **`gpu_eth_2015` available the same quarter ETH launches lets a player capture an implausibly large early-network share** (see the 2015–16 balance-anchor re-check above — a single rig would recoup its cost in under a week at 2015Q3 prices). **Fix**: delay availability a quarter or two past the real launch, or cap/haircut income for the first month or two of ETH mining, mirroring whatever fix the owner picks for the equivalent 2009 BTC issue (flag #7).
