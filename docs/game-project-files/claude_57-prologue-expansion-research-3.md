# 57: Prologue expansion research, pass 3

This is the third research pass for doc 51, run on 2026-10-14. All sources were accessed on that date. Network difficulty is being rebuilt separately from block headers, so it is not covered here.

## 1. Price data (resolved)
CoinMarketCap gave permission to use its data in the game. Tudor holds this permission and owns it, so no further paperwork is needed.

The data was pulled from CoinMarketCap's daily history through the browser and turned into weekly rows. Each week runs Monday to Sunday and closes at the Sunday close.

`prologue-expansion-content/research-3/ltc_doge_prices_weekly.csv` holds 434 rows, with columns for open, high, low, close and volume.

| Rows | Coverage | Grade |
|---|---|---|
| LTC, 192 rows | 2013-04-29 to 2016-12-26 | [A] CoinMarketCap |
| DOGE, 160 rows | 2013-12-09 to 2016-12-26; the first week has only 15 Dec, CoinMarketCap's first day | [A] CoinMarketCap |
| LTC, 80 rows | 2011-10-10 to 2013-04-15 | [D] designed path from `tools/gen_missing_prices.py` |
| LTC, 1 row | 2013-04-22, the hand-off week | Designed Monday to Saturday, with CoinMarketCap's real close of $4.348 on 28 Apr |
| DOGE, 1 row | 2013-12-02, the launch week | [D] |

- **Designed path:** built in log space between dated sourced prices, using a seeded random walk pinned at both ends, with about 32% weekly volatility. It hits $0.30 at listing (Oct 2011), about $0.004 in April 2012, 7 cents on 1 Jan 2013, under 10 cents until April 2013, and a $4.49 intraweek high on 10 Apr 2013. Change the seed for a different path that still hits the same prices.
- **Volume:** CoinMarketCap has no volume before late Dec 2013, so those cells are empty.
- **Raw weekly CoinMarketCap data:** `research-3/cmc_weekly_raw.csv`.
- **Attribution:** use the credit line CoinMarketCap asks for. Suggested: "Price data courtesy of CoinMarketCap".

What the real data changes:
- **LTC, Nov 2013:** it ran from about $4 to a $53.15 intraweek high, then closed the week at $34.74.
- **LTC, mid-2013:** it drifted down to $1.93 by October, lower than the old quarterly guesses.
- **DOGE, Jan 2014:** it peaked at $0.002335 in the week of 20 Jan.
- **Files to replace:** `market_weekly_prologue_alts.csv` should be replaced by this file, and `market_quarterly_prologue_alts.csv` rebuilt from it.

## 2. Name checks
I could not run formal USPTO or EUIPO searches. These verdicts come from web, company and public-person searches only.

| Name | Verdict | Evidence |
|---|---|---|
| Kestrel Foundry | low risk | No exact match. "Kestrel" is a crowded word, but no "Kestrel Foundry" exists in crypto, mining or hardware. |
| Nell Hartigan | clear | No public person found. The nearest is Neil Hartigan, a former Illinois Attorney General. |
| OreLoop | **rename** | Oreloop Sustainable Industries AB (Sweden) sells a patented gold-mining separator, which is the same sector. Proposed replacements, not yet checked: Slagwheel, Tailrace Labs. |
| CopperHash | low risk | Only a women's jeans label. |
| Teo Brandt | low risk | Private individuals only. |
| Jun Okafor | clear | No match found. |
| Halfblock Pool | low risk | A Finnish piercing and streetwear chain, and an open-source browser voxel game. Fine as a pool name inside the game, not as a product title. |

From pass 2: ScryptBox Ltd is a rename (a real scrypt share offering from 2014). Mara Ilves carries association risk.

## 3. June 2014 GHash.io outflow
| Date | Event | Source |
|---|---|---|
| 12-13 Jun | GHash.io at 55% | Matonis, CoinDesk |
| 15 Jun | 42%, after Bitfury pulled hashrate out | Finance Magnates |
| 19 Jun | 35%, with Discus Fish up to 16% | Buterin |
| 20 Jun | blockchain.info re-labelled its "unknown" pools, which distorts any small-pool comparison | bitcoinx |
| 13 Jul | about 34.6% | Matonis |
| 16 Jul | GHash.io pledges to stay under 39.99% | statement |

The share did not return to GHash.io. Most of the outflow went to large pools.

New designed effect [D]: pools outside the top 5 gain +4 percentage points in week 1, +2 by week 4 and +1 by week 8.

## 4. Hosting costs (replaces the pass-2 designed values)
| Year | VPS | Dedicated | DDoS protection covering raw TCP |
|---|---|---|---|
| 2011 | $40 [C] | $100 [D] | enterprise only, about $7,000/month [C] |
| 2012 | $40 [C] | $60 [B] | enterprise only, $3,000+/month [C] |
| 2013 | $20 [B] | $64 [B] | $100 add-on, or free with OVH from May 2013 [B] |
| 2014 | $5 [B] | $7 budget box [B] | $0, bundled [B] |
| 2015 | $10 [D] | $96 with protection [C] | $0, bundled [B] |
| 2016 | $10 [B] | $56 [C] | $0, bundled until OVH started charging in Oct 2017 [B] |

Game implication: before mid-2013, a hobby pool simply has no DDoS protection. Protection becomes cheap or free afterwards.

Sources for these prices:
- Fast Company, 2013 (Prolexic prices)
- acmedata.in, 2013 (Linode)
- webhostingtalk threads t=1226563 and t=1250758
- hostsearch (Hetzner EX40)
- lowendtalk threads 23928, 31757, 74549 and 126143
- bitcointalk thread 1008807

## Still designed
- LTC prices from Oct 2011 to Apr 2013, and DOGE's launch week.
- The 2011 dedicated-server price.
- The fade of the GHash.io outflow.
- The OreLoop replacement names, which still need checking.
