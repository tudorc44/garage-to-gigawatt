# 53: Prologue expansion research: own pool, mining club, altcoins for old GPUs

*Saved by the research thread as doc 52; renumbered 53 by the design thread (doc 52 is the research prompt). Reviewed and reconciled in doc 51 v1.0.*

Research dossier and draft content pack for doc 51 (`claude/51-prologue-expansion-design.md`). Produced by a deep research run on 2026-10-13.

**Caveat:** the research run could not open the project files (doc 51, custody.json, the market files). It matched placeholders by topic and guessed the file formats. Before merging, reconcile its shapes with `claude/prologue-content/`, and don't duplicate the existing custody.json fee rows or the GHash.IO June 2014 event.

## Summary

Scrypt coins gave GPUs pushed off bitcoin about 18 profitable months, 2013Q2 to 2014Q1. In 2013Q4 a 2010-class GPU earned about 16x more per day on Litecoin than on bitcoin ($3.14 against $0.20). After scrypt ASICs shipped, that income fell about 97.5% from 2014Q1 to 2014Q4.

Running a small pool was cheap and technically easy. Its real risks were variance, theft and DDoS, and the game can model them with sourced numbers.

Almost no sourced history exists for students mining together, so the mining club is designed. It sits on a sourced backdrop.

### Decisions needed
1. **X-B6.** Proposed rule: GPU scrypt income in 2013Q4 is at least 10x the same GPU on BTC, and falls at least 95% from 2014Q1 to 2014Q4. The derived values are 16x and -97.5%.
2. **Litecoin before 2013Q2.** Should LTC mining be allowed in that period, when bitcoin still pays a GPU more?
3. **Exchange collapses.** Should they hit player balances directly, or only act through price and trust?
4. **Price data.** Can the team license a daily OHLC export to replace the estimated weeks?

### What to trust
| Area | Status |
|---|---|
| Protocol facts (rewards, block times, forks, merged mining) | Solid, graded A/B |
| GPU scrypt rates, ASIC timeline, pool fees 2011-2013, DDoS and theft data, backdrop events | Solid, graded B |
| All network hashrates; the BTC earnings column; LTC prices before Apr 2013; most weekly prices | Placeholder, graded C/D. Replace with the existing Prologue BTC series and chart-read difficulty before shipping |
| Pool operating costs and probabilities, selling caps, mining-club cast and events | Designed [D]. Review these, don't just accept them |

## Conventions
Every value carries an evidence grade:
- [A] primary or official: chain or protocol rules, project docs, court or SEC filings, peer-reviewed measurement.
- [B] reputable reporting.
- [C] estimate or secondary aggregate: CoinLore, CoinMarketCap summaries, forums, blogs.
- [D] designed, with the reasoning shown.

**Price dataset:** CoinLore historical data [C]. LTC coverage starts 28 Apr 2013 and DOGE coverage starts Dec 2013. Anything before 28 Apr 2013 for LTC is estimated.

## Part A: Altcoins for old GPUs

### A1. Protocol facts
| Item | Value | Grade |
|---|---|---|
| LTC client 0.1.0 release | 7 Oct 2011 | B |
| LTC network live | 13 Oct 2011 | C |
| LTC block time and reward | 150 s, 50 LTC, halves every 840,000 blocks, 84M cap | A |
| LTC difficulty retarget | every 2,016 blocks (about 3.5 days) | A |
| LTC halving 1 | block 840,000, 25 Aug 2015 UTC, 50 to 25 LTC | A/B |
| DOGE launch | 6 Dec 2013 | B |
| DOGE block time | 60 s | A |
| DOGE difficulty retarget | every 4 h; per block (DigiShield) from block 145,000 | A |
| DOGE blocks 1-99,999 | random reward 0-1,000,000 (expected 500k) | A |
| DOGE blocks 100,000-144,999 | random reward 0-500,000 (expected 250k); block 100,000 on 14 Feb 2014 | A/B |
| DOGE blocks 145,000-199,999 | fixed 250,000; hard fork on 17 Mar 2014 | A/B |
| DOGE block 200,000 | 125,000; 28 Apr 2014 | A/B |
| DOGE block 300,000 | 62,500; 15 Jul 2014 | A/B |
| DOGE block 400,000 | 31,250; 2 Oct 2014 | A/B |
| DOGE block 500,000 | 15,625; 14 Dec 2014 | A/B |
| DOGE block 600,000+ | 10,000 permanent; about 25 Feb 2015 | A/C |
| Reason for the fixed reward | stop pools hopping onto high-reward blocks | A |
| DOGE merged mining | AuxPoW active after block 371,337 on 11 Sep 2014; mandatory Dogecoin Core 1.8 upgrade | A/B |

**Merged-mining conflict:** some sources say "317,337" in Jul/Aug 2014. That is a digit transposition. The August date is the 1.8 release announcement, not activation.

**Merged mining background (doc 50 only):**
- From Sep 2014, LTC pools paid DOGE for the same work.
- DOGE hashrate rose more than 1,500% in Sep 2014 [C].
- In Apr 2014, one miner held 51% of DOGE hashrate (Courtois, arXiv:1405.0534) [A].

### A2. Network hashrate
**Sourced points:**
- LTC passed 1 TH/s and difficulty 30,000 on 15 Sep 2014, then sat around 740 GH/s on about 22 Sep [B].
- DOGE was below 50 GH/s on 28 Apr 2014 [C].
- DOGE hashrate exceeded LTC's in late Jan 2014 [B].
- LTC hashrate more than doubled from Nov 2013 to early 2014 [B].

Quarter-end values were not found, so the quarter averages in the tables are designed [D] and flagged estimate:true.

**Check formula:** H = D x 2^32 / T. For LTC at difficulty 30,000 and T = 150 s, this gives 0.86 TH/s, which fits the sourced 1 TH/s.

### A3. GPU scrypt performance
| Class | Card | kH/s | Watts | Grade |
|---|---|---|---|---|
| 2010 gaming GPU | HD 5870 | 400-442 | 153 (card) | B (Litecoin wiki hardware comparison) |
| 2010 gaming GPU | HD 5850 | 325-420 | n/a | B |
| 2015 rig, per card | R9 290X | 860-900 (about 1,000 tuned) | up to 250 (card) | B/C (CoinDesk Dec 2013) |
| 2015 rig, per card | R9 280X | better price/performance; kH/s not sourced | n/a | B |

**Designed values [D]:**
- 2010 GPU: 400 kH/s at 200 W at the wall.
- 2015 rig: 4 cards at 850 kH/s each, 3.4 MH/s at 1,150 W at the wall.

### A4. Scrypt ASIC arrival
**Gridseed GC3355 "Orb" (5 chips)** [C]
- About 350 kH/s at 7-8 W.
- Arrived around late 2013 to early 2014. A hobbyist called it obsolete after about 3 months.

**Gridseed Blade** [C]
- 5.2-6 MH/s at about 100 W.

**Alpha Technology** [B]
- Pre-orders opened 3 Jan 2014.
- Tape-out at GlobalFoundries in Apr 2014; the 90 MH/s unit was priced at $9,000.

**KnCMiner Titan** [B]
- Pre-orders opened 19 Mar 2014 at $9,995 for 100 MH/s, and took about $2M in 4 hours.
- Spec raised to 250 MH/s (28 Mar), then 300 MH/s at 800 W (20 Apr), then about 400 MH/s at tape-out (4 Jun).
- Shipping began in early Sep 2014.

**Zeus Thunder X3** [C]
- About 28 MH/s at 800 W.

**GPU demand** [B]
- GPU demand fell in early 2014, and R9 prices were back to normal by mid-2014.

### A5. Derived earnings per GPU (400 kH/s, 2010 class)
**Formula:**
- coins/day = blocks_per_day x R_expected x h / H_avg
- USD/day = coins/day x P_avg

**Inputs:**
- Blocks per day: LTC 576, DOGE 1,440, BTC 144.
- DOGE R_expected is time-weighted across the reward changes. For example, 2014Q1 = (45 days x 500k + 45 days x 250k) / 90 = 375k.
- For the 2015 class, multiply by 2.125.
- Electricity reference [D]: 200 W at $0.12/kWh = $0.58/day.

| Q | LTC P_avg | LTC H GH/s [D] | LTC $/day | DOGE R_exp | DOGE H [D] | DOGE $/day | BTC $/day [C] |
|---|---|---|---|---|---|---|---|
| 2011Q4 | 0.08 [D] | 0.3 | 3.07 | - | - | - | 1.19 |
| 2012Q1 | 0.06 [D] | 0.5 | 1.38 | - | - | - | 1.53 |
| 2012Q2 | 0.04 [D] | 0.8 | 0.58 | - | - | - | 1.32 |
| 2012Q3 | 0.05 [D] | 1.2 | 0.48 | - | - | - | 1.68 |
| 2012Q4 | 0.06 [D] | 2.0 | 0.35 | - | - | - | 1.23 |
| 2013Q1 | 0.15 [D] | 4 | 0.43 | - | - | - | 1.44 |
| 2013Q2 | 3.0 | 10 | 3.46 | - | - | - | 1.76 |
| 2013Q3 | 2.7 | 20 | 1.56 | - | - | - | 0.32 |
| 2013Q4 | 15 | 55 | 3.14 | 500,000 | 20 | 7.20 | 0.20 |
| 2014Q1 | 18 | 110 | 1.88 | 375,000 | 80 | 2.97 | 0.040 |
| 2014Q2 | 10.8 | 200 | 0.62 | 163,500 | 50 | 0.85 | 0.011 |
| 2014Q3 | 6.6 | 500 | 0.15 | 72,700 | 150 | 0.061 | 0.0040 |
| 2014Q4 | 3.7 | 900 | 0.047 | 29,000 | 750 | 0.0047 | 0.0018 |
| 2015Q1 | 2.0 | 1,200 | 0.019 | 13,500 | 1,080 | 0.0012 | 0.0011 |
| 2015Q2 | 2.0 | 1,400 | 0.016 | 10,000 | 1,260 | 0.00055 | 0.00094 |
| 2015Q3 | 3.9 | 1,400 | 0.026 | 10,000 | 1,260 | 0.00064 | 0.00089 |
| 2015Q4 | 3.5 | 1,450 | 0.014 | 10,000 | 1,305 | 0.00066 | 0.0008 |
| 2016Q1 | 3.3 | 1,700 | 0.011 | 10,000 | 1,530 | 0.00079 | 0.00054 |
| 2016Q2 | 4.2 | 1,900 | 0.013 | 10,000 | 1,710 | 0.00094 | 0.00055 |
| 2016Q3 | 3.8 | 2,100 | 0.010 | 10,000 | 1,890 | 0.00070 | 0.0003 |
| 2016Q4 | 3.8 | 2,400 | 0.009 | 10,000 | 2,160 | 0.00059 | 0.00025 |

**Reading the table:**
- BTC beats LTC for a GPU through 2012.
- LTC wins from 2013Q2 to 2014Q1. This is the GPU's "second life".
- After merged mining starts, DOGE adds roughly 10% on top of LTC income. It is not an alternative.

### A6. Liquidity
Average daily volume, CoinLore [C]:

| Year | LTC avg | LTC max day | DOGE avg | DOGE max day |
|---|---|---|---|---|
| 2013 | $295.9K (Apr-Dec) | $31.1M | $101.8K (Dec) | $477.4K |
| 2014 | $5.8M | $55.3M | $1.1M | $18.8M |
| 2015 | $3.4M | $62.6M | $168.5K | $1.5M |
| 2016 | $3.1M | $19.8M | $256.5K | $5.3M |

**Selling caps [D]:**
- Up to 0.5% of the year's average daily volume per day sells without slippage.
- Above that, the price drops 1% for each additional 0.5%.
- Hard cap: 2% of average daily volume per day.

**Exchanges (backdrop names only):** BTC-e, Cryptsy, Bter, Vircurex, Bittrex, Poloniex, MintPal, Moolah.

## Part B: Running your own pool

### B1. Fee table extension (append to custody.json, don't duplicate existing rows)
| Year | Pool | Scheme | Fee | Grade |
|---|---|---|---|---|
| 2010-11 | Slush | Score | 2% (current value; period value not confirmed) | C |
| 2011 | DeepBit | Proportional / PPS | 3% / 10% | B |
| 2011 | BTC Guild | Proportional, then PPS | 0%, then 5% | B |
| 2011-04 | Eligius | CPPSRB | 0% | C |
| 2013 | BTC Guild | PPLNS / PPS | 3% / 7.5% | C |
| 2013-07 | GHash.IO | PPLNS | 0% | C |
| 2013-14 | Middlecoin (scrypt profit-switching pool) | auto-exchange to BTC | 3% | C |
| 2013-16 | 50BTC, F2Pool, AntPool, BTCC | n/a | 0-2% PPLNS, 2-4% PPS bands | D |

**PPLNS timing [D]:** PPLNS becomes a common option in 2012 and the default for new pools from 2013.

**Scheme ranking:** PPS costs the miner the most, PPLNS less, and proportional the least. Only PPS exposes the pool operator to insolvency.

### B2. Small-pool risks (sourced)
**DDoS** [A] (Vasek, Thornton and Moore, FC 2014)
- 142 attacks on 40 services from May 2011 to Oct 2013: 38% on pools, 40% on exchanges.
- Pools were the main target in the second half of 2011.
- 5 of 8 big pools were hit (62.5%), against 7 of 41 small pools (17.1%).
- BTC Guild and 50BTC were under DDoS on 1 Oct 2013 [C].

**Hot-wallet theft** [B]
- 1 Mar 2012: the Linode breach took 3,094 BTC from Slush's pool. The operator covered the loss himself. Total Linode theft was 46,703 BTC.
- 19 Apr 2013: Ozcoin's payout script was hijacked and 922.99 BTC sent out. StrongCoin seized and returned 568.94 BTC.

**Chain fork** [C]
- 11 Mar 2013: the 0.8/0.7 split hit several pools.

**Orphan rates** [A]
- Feb 2016: 0.41% for BTC and 0.273% for LTC. No 2011-2013 rates were found.

**Not found:** server and bandwidth costs, and pool software specifics (pushpool, eloipool, stratum-mining, MPOS, NOMP, p2pool). Use these names only as flavour text.

### B3. Designed pool parameters [D]
```json
{"pool_params_prologue":{
 "setup":{"server_usd_month":{"2011":60,"2013":40,"2015":30},"ddos_protection_usd_month":{"2011":0,"2013":80,"2015":50},"setup_hours":20},
 "fees_allowed":{"PROP":[0,0.05],"PPS":[0.02,0.10],"PPLNS":[0,0.03],"SCORE":[0,0.03]},
 "variance":{"model":"poisson","blocks_expected":"pool_hash/network_hash*blocks_per_period","p_zero_blocks":"exp(-lambda)"},
 "pps_reserve_rule":{"min_reserve_blocks":"3*sqrt(lambda_week)","insolvency_trigger":"reserve<0 -> miners leave 50%/week, reputation -30"},
 "orphan_rate":{"BTC":{"2011":0.02,"2013":0.01,"2016":0.0041},"LTC":{"2012":0.01,"2016":0.00273}},
 "ddos_quarterly_probability":{"small":0.03,"medium":0.08,"large":0.15,"outage_hours":[2,48],"hashrate_churn":0.2},
 "hot_wallet_theft_quarterly_probability":{"base":0.01,"with_cold_storage":0.002},
 "miner_attraction":{"fee_elasticity":"-8% hashrate per +1pp fee vs median","luck_memory_weeks":4,"forum_ad_usd":50},
 "death_spiral":"3 unlucky weeks under PPLNS/PROP -> -15% hashrate each week; below 0.1% network share exit likely"}}
```
**Recommendation:** gate PPS behind a cash reserve. Make DDoS and theft the main ways a pool fails, not fees.

## Part C: Mining club (backdrop sourced, mechanics designed)
**GPU shortage** [B]
- Dec 2013 street prices: R9 290X $725+, R9 290 $499+ (MSRP $399).
- The R9 290X peaked at $900 on 4 Mar 2014, against a $550 launch price.

**GAW Miners** [A]
- Sold "Hashlets" from Aug 2014, raising about $19-20M from more than 10,000 investors.
- Payouts fell below fees by Nov 2014, and the scheme shut in Jan 2015.
- The SEC charged it as a Ponzi scheme on 1 Dec 2015.

**Dogecoin community** [B]
- Jamaican bobsled team, Jan 2014: about 26M DOGE (about $30K).
- Doge4Water, Mar 2014: about $30K.
- NASCAR at Talladega, 4 May 2014: 67.8M DOGE (about $55K).

**Moolah/MintPal** [B]
- Oct 2014: Moolah went bankrupt and about 3,700 BTC went missing.

**Cryptsy** [A/B]
- Withdrawals stalled from Nov 2015, and a class action was filed on 13 Jan 2016.
- Loss figures conflict.

**Mt. Gox**
- No altcoin custody loss was found. Model it as a price shock and a hit to trust in exchanges.

## Content pack

### market_quarterly (LTC, DOGE)
```csv
coin,quarter,open_usd,close_usd,high_usd,low_usd,avg_usd,estimate,grade,note
LTC,2011Q4,0.30,0.05,0.30,0.03,0.08,true,D,anchor $0.30 initial listing
LTC,2012Q1,0.05,0.05,0.08,0.03,0.06,true,D,no dataset found
LTC,2012Q2,0.05,0.04,0.06,0.03,0.04,true,D,
LTC,2012Q3,0.04,0.05,0.07,0.03,0.05,true,D,
LTC,2012Q4,0.05,0.06,0.08,0.04,0.06,true,D,
LTC,2013Q1,0.06,1.00,1.20,0.05,0.15,true,D,$0.07-0.09 on 2-3 Mar 2013 (B)
LTC,2013Q2,1.00,2.98,4.49,1.00,3.00,true,C,peak 4.49 on 10 Apr
LTC,2013Q3,3.01,2.35,3.10,2.30,2.70,false,C,H/L estimated
LTC,2013Q4,2.34,24.35,53.15,2.30,15.00,false,C,CoinLore max 53.15 vs CMC 44.73
LTC,2014Q1,24.35,12.75,32.06,12.00,18.00,false,C,
LTC,2014Q2,12.77,8.95,13.50,8.46,10.80,false,C,
LTC,2014Q3,8.96,4.47,9.00,4.30,6.60,false,C,
LTC,2014Q4,4.47,2.72,4.60,2.67,3.70,false,C,
LTC,2015Q1,2.72,1.65,2.80,1.11,2.00,false,C,ATL 1.11 on 14 Jan 2015
LTC,2015Q2,1.65,4.09,4.20,1.30,2.00,true,C,
LTC,2015Q3,4.09,3.01,8.73,2.70,3.90,true,C,halving 25 Aug
LTC,2015Q4,3.01,3.48,4.50,2.90,3.50,true,C,
LTC,2016Q1,3.48,3.20,3.70,2.92,3.30,true,C,
LTC,2016Q2,3.20,4.20,5.95,3.10,4.20,true,C,
LTC,2016Q3,4.20,3.80,4.30,3.40,3.80,true,D,
LTC,2016Q4,3.80,4.33,4.40,3.50,3.80,true,C,
DOGE,2013Q4,0.000231,0.000422,0.00152,0.000116,0.000512,false,C,open derived
DOGE,2014Q1,0.000423,0.00060,0.00234,0.00040,0.00110,true,C,
DOGE,2014Q2,0.00060,0.00028,0.00065,0.00025,0.00045,true,D,
DOGE,2014Q3,0.00028,0.00022,0.00030,0.000103,0.00022,true,C,
DOGE,2014Q4,0.00022,0.000187,0.00026,0.00018,0.00021,true,C,
DOGE,2015Q1,0.000186,0.00015,0.000247,0.00013,0.00017,true,C,
DOGE,2015Q2,0.00015,0.00012,0.00016,0.0000850,0.00012,true,C,ATL 7 May 2015
DOGE,2015Q3,0.00012,0.00014,0.00018,0.00011,0.00014,true,D,
DOGE,2015Q4,0.00014,0.000151,0.00018,0.00013,0.00015,true,C,
DOGE,2016Q1,0.000151,0.00021,0.00025,0.000134,0.00021,true,C,
DOGE,2016Q2,0.00021,0.00030,0.000500,0.00020,0.00028,true,C,
DOGE,2016Q3,0.00030,0.00023,0.00031,0.00021,0.00023,true,D,
DOGE,2016Q4,0.00023,0.000223,0.00025,0.00020,0.00022,true,C,
```

### market_weekly anchors
**Rule [D]:** generate every ISO week by log-linear interpolation between these anchors and the quarterly opens and closes. Mark all generated weeks estimate:true.
```csv
coin,week,open_usd,close_usd,high_usd,low_usd,avg_usd,estimate,grade,note
LTC,2013-W15,,,4.49,,,true,B,peak 10 Apr 2013
LTC,2013-W48,,,~50,,,true,B,nearly doubled 28 Nov 2013
LTC,2014-W15,,8.46,,,,true,C,
LTC,2014-W50,,3.40,,,,true,B,
LTC,2015-W03,,,,1.11,,false,C,ATL
LTC,2015-W17,,,,1.30,,true,B,
LTC,2015-W35,,3.25,,,,true,C,halving week
DOGE,2013-W51,,0.001162,,,,true,C,
DOGE,2014-W04,,,,,0.00115,true,C,derived from bobsled drive
DOGE,2014-W12,,,,,0.00079,true,C,derived
DOGE,2014-W13,,,,,0.00081,true,C,derived
DOGE,2014-W34,,,,0.000108,,true,C,
DOGE,2015-W19,,,,0.0000850,,false,C,ATL
```

### machines additions
```json
[{"id":"gpu_2010_scrypt","class":"gpu_2010","algo":"scrypt","khs":400,"watts_wall":200,"grade":"B/D"},
 {"id":"gpu_rig_2015_scrypt","class":"gpu_rig_2015","algo":"scrypt","cards":4,"khs":3400,"watts_wall":1150,"grade":"B/D"},
 {"id":"scrypt_usb_orb_2014","algo":"scrypt","khs":350,"watts_wall":8,"price_usd":null,"available":"2014Q1","grade":"C"},
 {"id":"scrypt_box_2014","algo":"scrypt","khs":250000,"watts_wall":1000,"price_usd":9995,"preorder":"2014-03-19","ships":"2014-09","grade":"B","note":"invented vendor name"}]
```

### events additions (sourced, real names kept out of card text)
```json
[{"id":"ev_ltc_launch","date":"2011-10-13","grade":"C","text":"A new coin called Litecoin goes live. It uses scrypt, meant to suit CPUs and GPUs."},
 {"id":"ev_pool_ddos_wave_2011","date":"2011-07","grade":"A","text":"Mining pools across the forums report DDoS floods. Big pools are hit most often."},
 {"id":"ev_host_breach_2012","date":"2012-03-01","grade":"B","text":"A hosting provider is breached and a famous pool loses 3,094 BTC from a hot wallet. Its operator covers the loss himself."},
 {"id":"ev_fork_2013","date":"2013-03-11","grade":"C","text":"A software upgrade splits the bitcoin chain for hours. Several pools lose block rewards."},
 {"id":"ev_pool_theft_2013","date":"2013-04-19","grade":"B","text":"A mid-size pool's payout script is hijacked and 923 BTC goes out. A web wallet freezes 569 BTC and returns it."},
 {"id":"ev_ltc_boom_2013","date":"2013-11-28","grade":"B","text":"Litecoin nearly doubles in a day. Every forum asks which Radeon to buy."},
 {"id":"ev_doge_launch","date":"2013-12-06","grade":"B","text":"A joke coin with a Shiba Inu logo launches. Block rewards are random, up to 1,000,000 coins."},
 {"id":"ev_gpu_shortage","date":"2013-12","grade":"B","text":"High-end Radeons sell out. Some go for over $700, well above list price."},
 {"id":"ev_scrypt_asic_preorders","date":"2014-01-03","grade":"B","text":"The first scrypt ASIC pre-orders open. Pay now, ship later."},
 {"id":"ev_doge_bobsled","date":"2014-01-20","grade":"B","text":"The Dogecoin community tips about $30K to send a bobsled team to the Winter Olympics."},
 {"id":"ev_doge_100k","date":"2014-02-14","grade":"A","text":"Dogecoin block 100,000: the maximum random reward halves to 500,000."},
 {"id":"ev_gpu_peak_price","date":"2014-03-04","grade":"B","text":"A top Radeon peaks at $900, against a $550 launch price."},
 {"id":"ev_doge_fixed_reward","date":"2014-03-17","grade":"A","text":"Dogecoin hard fork at block 145,000: fixed 250,000 reward and per-block difficulty. Pool hopping stops paying."},
 {"id":"ev_scrypt_box_preorder","date":"2014-03-19","grade":"B","text":"A known ASIC maker opens $9,995 scrypt box pre-orders and books $2M in a day."},
 {"id":"ev_doge_51pct","date":"2014-04","grade":"A","text":"One miner briefly holds over half of Dogecoin's hashrate."},
 {"id":"ev_doge_nascar","date":"2014-05-04","grade":"B","text":"A Dogecoin-wrapped car races at Talladega, paid for by 67.8M tipped coins."},
 {"id":"ev_merged_mining","date":"2014-09-11","grade":"A","text":"Dogecoin passes block 371,337. Litecoin pools can now pay both coins for the same work."},
 {"id":"ev_ltc_1ths","date":"2014-09-15","grade":"B","text":"The Litecoin network passes 1 TH/s as scrypt ASIC boxes ship. GPU income collapses."},
 {"id":"ev_moolah_collapse","date":"2014-10","grade":"B","text":"A Dogecoin exchange declares bankruptcy and its sister exchange goes dark. About 3,700 BTC is missing."},
 {"id":"ev_cloud_ponzi_end","date":"2015-01","grade":"A","text":"A cloud-mining seller shuts its virtual miners. Payouts had already fallen below maintenance fees."},
 {"id":"ev_doge_10k","date":"2015-02-25","grade":"C","text":"Dogecoin reaches block 600,000. The reward is now a permanent 10,000 per block."},
 {"id":"ev_ltc_halving","date":"2015-08-25","grade":"A","text":"Litecoin block 840,000: the reward halves from 50 to 25."},
 {"id":"ev_cloud_sec","date":"2015-12-01","grade":"A","text":"Regulators charge a cloud-mining seller with running a Ponzi scheme."},
 {"id":"ev_cryptsy","date":"2016-01-13","grade":"A","text":"A big altcoin exchange stops operating after months of stuck withdrawals. A class action follows."}]
```

### Mining club events [D] (invented names)
**Cast:**
- Mara Ilves: electrical engineering, owns the dorm power strip.
- Teo Brandt: gamer, owns two Radeons.
- Jun Okafor: economics, keeps the spreadsheet.
- Priya Sandoval: night-shift barista, buys a cloud contract.

**Other invented names:**
- Player pool: Halfblock Pool.
- Rival pools: OreLoop and CopperHash.
- Vendors: VoltCart (GPUs) and ScryptBox Ltd (ASICs).

```json
[{"id":"club_form","window":"2013Q2-2013Q4","text":"Teo offers his two Radeons if you cover the power. Jun proposes a split by hashrate share.","choices":["split_by_hashrate","split_equal","player_buys_out"]},
 {"id":"club_breaker","window":"any","text":"The dorm breaker trips at 2 a.m. Mara says three rigs on one circuit is too many.","effect":{"downtime_hours":12,"option_cost_usd":120}},
 {"id":"club_power_bill","window":"any","text":"The shared power bill doubles. Jun wants each member metered separately.","effect":{"dispute_if_unmetered":0.3}},
 {"id":"club_gpu_flip","window":"2014Q1","text":"VoltCart offers 1.5x what Teo paid for his cards. Sell now or keep mining?","effect":{"resale_mult":1.5}},
 {"id":"club_asic_preorder","window":"2014Q1-2014Q2","text":"Jun wants the club to pool $9,995 for a ScryptBox pre-order shipping 'next quarter'.","effect":{"ship_delay_quarters":[1,3],"difficulty_at_arrival_mult":3}},
 {"id":"club_cloud_contract","window":"2014Q3-2014Q4","text":"Priya bought cloud 'hashlets' with daily payouts. Should the club buy in?","effect":{"payout_turns_negative":"2014Q4","default":"2015Q1"}},
 {"id":"club_doge_tip","window":"2014Q1","text":"The club tips 50,000 DOGE to a charity drive. Morale up, wallet down.","effect":{"morale":10}},
 {"id":"club_exchange_stuck","window":"2014Q4 or 2015Q4","text":"Jun left the club's DOGE on an exchange. Withdrawals are 'pending'.","effect":{"loss_share":[0.3,1.0]}},
 {"id":"club_breakup","window":"2015Q1+","text":"GPUs earn pennies. Mara wants to sell, Teo wants to keep, and Jun wants the spreadsheet settled.","choices":["buy_out_members","liquidate","move_to_garage"]}]
```

## Recommendations
1. **Merged mining:** pay DOGE automatically on top of LTC from 2014-09-11. Before that date, solo DOGE mining is the high-variance option.
2. **Tuning:** tune X-B6 on the derived table, then replace the [D] hashrates with chart-read difficulty, graded [C] "chart-read".
3. **Pools:** gate PPS behind a reserve, and make DDoS and theft the main ways pools fail.
4. **Names:** keep real names out of club and pool cards. They belong in news tickers only.

## Conflicts to note
- LTC all-time high: $53.15 (CoinLore) against $44.73 (CMC).
- DOGE all-time low: 0.0000850 against 0.0000855.
- Cryptsy loss: 11,000 BTC against 13,000 BTC + 300,000 LTC.
- Merged-mining block: 371,337 is correct; 317,337 is a typo.

## Key sources
- Dogecoin FAQ.md: github.com/dogecoin/dogecoin/blob/master/doc/FAQ.md
- Vasek, Thornton, Moore (FC 2014): cs.unm.edu/~vasek/papers/vasekbtc14.pdf
- Univie merged-mining paper: eprints.cs.univie.ac.at/6448/1/2018-1134.pdf
- Courtois, arXiv:1405.0534
- CoinLore LTC/DOGE historical data
- CoinDesk: KnC Titan, Alpha Technology, Mining Roundup 22 Sep 2014, Radeon demand Dec 2013
- Bitcoin Wiki: Comparison of mining pools, Multipool
- litecoinpool.org news (Nov 2011)
- Bitcoin Magazine: Ozcoin, Dogecoin NASCAR
- NPR: Doge at 'Dega'
- BitMEX Research via farside.co.uk/blockchain-history
- SEC Lit. Rel. 23415 and press release 2015-271 (GAW Miners)
- Silver Law Group: Cryptsy class action
