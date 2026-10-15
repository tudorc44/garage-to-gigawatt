# 55: Prologue expansion research, pass 2

This is the second research pass for doc 51, run on 2026-10-14. It replaces some of the designed values from pass 1 (doc 53) and adds three data files:
- `ltc_doge_weekly.csv`
- `pool_and_volume_inputs.csv`
- `later_prices.csv`

In the project these files are in `claude/prologue-expansion-content/research-2/`.

## Headline caveat
The weekly LTC and DOGE difficulty and price series is a reconstruction, not real data. The free daily source, Coin Metrics `csv/ltc.csv` and `csv/doge.csv` on github.com/coinmetrics/data, could not be fetched during research.

The 273 weekly rows run from 2011-10-10 to 2016-12-26. They are anchored to every dated, sourced point found, and the weeks in between are interpolated. Every row is flagged estimate=true.

Before shipping:
- Run the regeneration script at the end of this doc.
- Check the licence. The Coin Metrics data is CC BY-NC 4.0, which may not allow use in a commercial game. A licence-free alternative is to rebuild difficulty from the nBits field in Litecoin and Dogecoin node block headers, which is primary data [A].

Grades: [A] primary, [B] reputable reporting, [C] estimate, aggregate or chart-read, [D] designed.

## 1. LTC and DOGE difficulty (weekly)
Conversions use H = D x 2^32 / T, with T = 150 s for LTC and 60 s for DOGE:
- LTC: GH/s = D x 0.0286331
- DOGE: GH/s = D x 0.0715828

All four check points hold:
- **LTC, 15 Sep 2014:** passed 1 TH/s and difficulty 30,000 [B] (CoinDesk Mining Roundup, 22 Sep 2014). By 22 Sep it was about 740 GH/s (liteshack).
- **DOGE vs LTC, late Jan 2014:** DOGE hashrate passed LTC's [B] (BitMEX Research via Farside).
- **DOGE, 28 Apr 2014:** under 50 GH/s after the halving [C]. On 25 May 2014 the networks were about 200 GH/s for LTC and about 50 GH/s for DOGE [B] (CoinDesk, Tim Swanson).
- **LTC, to 16 Dec 2013:** hashrate doubled in a month to about 90 GH/s, up from about 20 GH/s in June 2013 [B] (CoinDesk / litecoinblog). It was "practically flat" in Sep and Oct 2013.

**LTC anchors:**
- launch at D 0.000244 [C]
- 28 Apr 2012: D about 1.1, derived from a Bitcointalk yield post [C]

There are no anchors from Oct 2014 to Dec 2016. For that stretch the series is a designed slow climb from 30,000 to 110,000 [D].

**Formula gap:** at D 30,000 the formula gives 859 GH/s, but CoinDesk reported over 1 TH/s. Explorers measure hashrate from actual block times, which run faster than the target while hashrate is rising. The CSV uses D 31,000 for the week of 15 Sep 2014.

**DOGE after merged mining** (block 371,337, 11 Sep 2014): DOGE difficulty is not independent of LTC.
- Rule used: DOGE D = f x 0.4 x LTC D, where f is the share of LTC hashrate that also merge-mines DOGE.
- f was set to 0.65-0.75 in Q4 2014, 0.78-0.85 in 2015 and 0.875-0.9 in 2016 [D]. These values were reasoned back from Binance Research's 2019 figure (DOGE at 91% of LTC hashrate, difficulty ratio 0.39).
- The CSV ramps DOGE hashrate from about 28 to about 500 GH/s over four weeks. This matches Binance Research's "+1500% within one month".

**DOGE protocol events used** (BitMEX/Farside):

| Date | Block | Change |
|---|---|---|
| 14 Feb 2014 | 100k | max reward 500k |
| 17 Mar 2014 | 145k | fixed reward, per-block retarget |
| 28 Apr 2014 | 200k | 125k |
| 15 Jul 2014 | 300k | 62.5k |
| 11 Sep 2014 | 371,337 | merged mining |
| 2 Oct 2014 | 400k | 31.25k |
| 14 Dec 2014 | 500k | 15.625k |

## 2. LTC prices before 28 Apr 2013
No weekly exchange history was found. These are the sourced points:

| Date | Point | Grade | Source |
|---|---|---|---|
| 2011 | $0.30 at listing | C | CoinMarketCap |
| 28 Apr 2012 | 0.000758 BTC, about $0.004 | C | Bitcointalk |
| 1 Jan 2013 | 7 cents | B | Forbes |
| before Apr 2013 | never above 10 cents | B | Cointelegraph |
| 2-3 Mar 2013 | $0.07-0.09 | - | from the brief |
| 10 Apr 2013 | $4.49 peak | - | from the brief |
| 28 Apr 2013 | $4.31, first CoinLore price | C | CoinLore |

The weekly path between these points is designed [D]:
- 2011: from about $0.30 at listing down to $0.02-0.03 by Dec.
- 2012: about $0.004 in late Apr, recovering to $0.07 by year end.
- Feb 2013: flat.
- Mar-Apr 2013: a parabolic run. The week of 8 Apr closes at about $2.30, after the crash.

## 3. Weekly closes from 2013
- **LTC:** CoinLore monthly closes [C] from May 2013 to Dec 2016, plus CoinDesk intramonth points: $9.7 on 25 Nov 2013 and $48 on 28 Nov 2013 [B]. The weeks between month-ends are interpolated.
- **DOGE:** only year-level CoinLore data was available [C]:
  - first price $0.000513
  - year closes: $0.000422 (2013), $0.000187 (2014), $0.000151 (2015), $0.000223 (2016)
  - 2014 high $0.00234; all-time low $0.000085 (May 2015)

  DOGE weekly values are designed [D].

## 4. Small-pool share of bitcoin hashrate
Top-5 pool share and number of pools, from Cong, He and Li (2018), Table 1, using Bitcoinity and BTC.com data [B]:

| Year | Top-5 share | Pools |
|---|---|---|
| 2011 | 6.77% | 8 |
| 2012 | 33.2% | 15 |
| 2013 | 60.22% | 23 |
| 2014 | 66.03% | 33 |
| 2015 | 66.29% | 43 |
| 2016 | 74.05% | 36 |

The 2011 figure likely understates concentration, because Deepbit held a majority at times that year.

Small-pool share, defined as pools outside the top 5 and excluding solo mining:

| Year | Share | Grade |
|---|---|---|
| 2011 | 10% | D |
| 2012 | 15% | D |
| 2013 | 25% | C |
| 2014 | 26% | C |
| 2015 | 30% | C |
| 2016 | 24% | C |

The same paper gives the size-weighted average pool fee: 3.87% (2011), 3.48% (2012), 3.03% (2013), 1.61% (2014), 2.24% (2015), 1.12% (2016) [B].

## 5. Cost to run a small pool
No price lists from 2011-2016 were found. Evidence found:
- **DDoS was common [A]:** Vasek et al. record 142 DDoS attacks on 40 services, and pools were among the most attacked and the most likely to buy protection.
- **Ransom demands [B]:** 2 BTC in Oct 2014, rising to 5-10 BTC in Mar 2015.
- **Protection prices [C]:** a 2021 forum post quotes about $20/month plus traffic. This is outside the period.

Designed costs, $ per month [D]:

| Item | 2011 | 2012 | 2013 | 2014 | 2015 | 2016 |
|---|---|---|---|---|---|---|
| VPS | 20 | 20 | 20 | 15 | 10 | 10 |
| Dedicated server | 100 | 90 | 80 | 75 | 60 | 50 |
| DDoS protection | 50 | 50 | 100 | 100 | 75 | 50 |

Reasoning: stratum runs over raw TCP, so cheap web-only CDN plans didn't cover it. DDoS demand peaked in the 2013-14 attack wave, while plain hosting got steadily cheaper.

## 6. June 2014 GHash.io episode
- **The peak:** GHash.io held 55% of bitcoin hashrate from 2014-06-12 11:53 to 2014-06-13 09:45 GMT, almost 24 hours [B] (Jon Matonis, CoinDesk, 17 Jul 2014). Earlier that week it had moved between 40% and 50%.
- **The fall:** by 20 Jun it was "just over 30%" after one 1 PH/s miner left [B]. It was 31% on 16 Jul [B] (TechCrunch).
- **The pledge:** on 16 Jul 2014, after a round table on 9 Jul, GHash.io pledged to stay under 39.99% [B].
- **Precedent:** in Jan 2014 its share dropped from 42% to 38% in one day [B].
- **Not found:** where the departing hashrate went.

Designed [D]: about 4 percentage points went to small pools, then decayed over about 8 weeks, leaving a lasting gain of about +1 pp. Model the episode as a short spike, not a lasting shift.

## 7. Later prices
CoinLore year closes [C]:

| Coin | 2017-12-31 | 2021-12-31 | 2025-12-31 |
|---|---|---|---|
| LTC | $232.10 | $146.41 | $76.87 |
| DOGE | $0.00897 | $0.1708 | $0.1174 |

For the LTC 2017 close, Yahoo gives $225 instead.

## 8. Small-pool sales; LTC volume 2011-12
- **Slush to Braiins, Apr 2013:** a majority stake, terms undisclosed [A]. Slush's pool was not small.
- **ScryptBox, Jun 2014:** raised equity on Cryptostocks with 50,000 shares, 20,000 at 0.0015 BTC and 15,000 at 0.0025 BTC. Terms changed mid-offer [C].
- **Closures:** BTC Guild closed in Jun 2015 with under 3% share, and GHash.io stopped by end-2015 [C].
- **Not found:** any small-pool sale with stated terms from 2011-2016.
- **LTC daily volume, 2011 and 2012:** not found. Designed at about $2,000/day (2011) and about $1,000/day (2012) [D], scaled by market cap from CoinLore's 2013 average of $295.9K/day.

## 9. Name clashes
| Name | Finding | Action |
|---|---|---|
| ScryptBox Ltd | A real 2014 scrypt-mining share offering (scryptbox.com, ticker SBOX) | Rename now |
| Halfblock Pool | "Halfblock" is a Finnish retailer and an open-source browser game; no pool of that name found | Low-moderate risk |
| Mara Ilves | Not checked. MARA is a major listed bitcoin miner, and Ilves is a former Estonian president's surname | Association risk; consider renaming |
| OreLoop, CopperHash, Teo Brandt, Jun Okafor | Not checked | Do trademark (EUIPO/USPTO) and press searches |

## Conflicts and choices
| Topic | Sources disagree | Chosen |
|---|---|---|
| GHash 51% date | mid-June (sources written at the time) vs "July" (Wikipedia, Cong) vs 3 Jun | 12-13 Jun 2014 |
| Merged-mining block | 371,337 on 11 Sep 2014 (Farside) vs 317,337 (Binance) | 371,337; 317,337 looks like a digit transposition |
| LTC trading start | Cointelegraph says Jul 2012, but there are BTC-e quotes from Apr 2012 | Treat 2011-12 trading as real but thin |
| LTC 2017 close | $232.10 (CoinLore) vs $225 (Yahoo) | CoinLore, for consistency |

## Designed assumptions in the game that look wrong
1. **A smooth LTC hashrate curve.** Real hashrate was flat in Sep-Oct 2013, doubled in the month to mid-Dec 2013, and grew about 5x during 2014.
2. **DOGE as an independent network after Sep 2014.** Its difficulty tracks about 0.4 x LTC's.
3. **Any LTC price above $0.10** between mid-2012 and Feb 2013.
4. **A steady share for small bitcoin pools.** The top 5 went from about a third of hashrate in 2012 to about three quarters by 2016.
5. **A lasting gain for small pools after June 2014.** The shift faded within weeks.

## CSV notes
- **Grade field** in `ltc_doge_weekly.csv`: four parts, LTC difficulty / LTC price / DOGE difficulty / DOGE price. "-" means not applicable.
- **Week convention:** each value is at the Sunday close of the ISO week, labelled with that week's Monday.

Source codes used in the CSVs:

| Code | Source |
|---|---|
| S1 | designed interpolation |
| S2 | CoinLore |
| S3 | CoinDesk 22 Sep 2014 |
| S4 | CoinDesk 25 May 2014 |
| S5 | CoinDesk/litecoinblog 16 Dec 2013 |
| S6 | Bitcointalk 28 Apr 2012 |
| S7 | Forbes 13 Jan 2014 |
| S8 | CoinDesk 28 Nov 2013 |
| S9 | Binance Research Jul 2019 |
| S10 | BitMEX Research via Farside |
| S11 | brief's known points |
| S12 | Cointelegraph |
| S13 | Cong, He and Li 2018 |
| S14 | CoinDesk 9 Jan 2014, 13 Jun 2014, 12 Mar 2015 |
| S15 | CCN 15 Jun 2014 |
| S16 | Vasek et al. 2014 |
| S17 | LowEndTalk 2021 |
| S18 | Braiins blog |
| S19 | Bitcointalk SBOX thread |
| S20 | EtherWorld |

## Regeneration script
```python
# csv/ltc.csv and csv/doge.csv from github.com/coinmetrics/data (CC BY-NC 4.0 - check licence)
import pandas as pd
def weekly(path, T):
    df = pd.read_csv(path, parse_dates=["time"]).set_index("time")
    w = df[["DiffMean","PriceUSD"]].resample("W-SUN").last()
    w.index = w.index - pd.Timedelta(days=6)  # Monday label
    w["GHs"] = w["DiffMean"] * 2**32 / T / 1e9
    return w
ltc = weekly("ltc.csv", 150); doge = weekly("doge.csv", 60)
out = ltc.join(doge, lsuffix="_ltc", rsuffix="_doge", how="left").loc["2011-10-10":"2016-12-26"]
```
After regenerating, check these weeks:
- 2014-09-15: LTC D about 30,000
- 2014-05-26: LTC D about 7,000 and DOGE D about 700
- 2013-12-16: LTC D about 3,150

## Key sources
- github.com/coinmetrics/data
- farside.co.uk/blockchain-history
- CoinDesk:
  - 2013-11-28 (LTC price surge)
  - 2014-01-09 (GHash.io 42% to 38%)
  - 2014-05-25 (What Dogecoin must do)
  - 2014-06-13 (GHash.io 51% fears)
  - 2014-09-22 (Mining Roundup)
  - 2015-03-12 (DDoS wave on pools)
- litecoinblog.org/litecoin-mining-difficulty-increases
- binance.com/en/research/analysis/merged-mining
- Cong, He and Li, SSRN 3160046
- Vasek et al., cs.unm.edu/~vasek/papers/vasekbtc14.pdf
- arXiv 1905.05999
- blog.ethereum.org/2014/06/19/mining
- Forbes 2014-01-13 (Litecoin)
- Cointelegraph "Litecoin by 2016"
- Bitcointalk topics 78395 and 659225
- Braiins blog (Slush stake)
- coinlore.com LTC/DOGE historical data
- github.com/grumdrig/halfblock
