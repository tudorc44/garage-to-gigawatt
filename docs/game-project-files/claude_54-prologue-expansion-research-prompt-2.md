# Deep research task: second pass for the Prologue expansion data (Garage to Gigawatt)

*(Paste everything below this line into a new research thread. It is self-contained: you don't need any project file. Save your answer as files in this thread only, never into a code repository.)*

---

## Context
Garage to Gigawatt is a grounded, finance-first browser business sim. Its Prologue (2009-2016) now lets a player point old GPUs at Litecoin (LTC) and Dogecoin (DOGE), run a small bitcoin mining pool, and join a mining club with friends. A first research pass sourced the protocol facts. The market data behind the game is still partly designed, and this pass replaces it with sourced data.

Work through everything in one go. Don't ask questions; where something is ambiguous, choose the sensible option, state it as an assumption, and carry on.

## Rules
- Grade every value: [A] primary or official (chain data, protocol rules, filings), [B] reputable reporting, [C] estimate, secondary aggregate or a value read off a chart ("chart-read"), [D] designed by you with the reasoning shown.
- Name the dataset or page behind every series, with its coverage. If you can't find something, say "not found" and propose a [D] value. Never invent a fact.
- Use free sources only (block explorers, published historical tables, archived pages, papers). Don't assume a paid data license.
- Plain text, hyphens not em dashes.

## What to find
1. **LTC and DOGE network difficulty, weekly, from launch to the end of 2016** (LTC live 13 Oct 2011; DOGE launched 6 Dec 2013). One value per ISO week (Monday date), from a block explorer's difficulty history or a published chart, read as carefully as you can. Convert to hashrate with H = D × 2^32 ÷ T (T = 150 s for LTC, 60 s for DOGE) and give both. Check against these sourced points: LTC passed 1 TH/s and difficulty 30,000 on 15 Sep 2014; DOGE was below 50 GH/s on 28 Apr 2014; DOGE hashrate exceeded LTC's in late Jan 2014; LTC hashrate more than doubled from Nov 2013 to early 2014. This is the most important item.
2. **LTC USD prices from 13 Oct 2011 to 27 Apr 2013** (before the common free datasets start): weekly closes, from exchange histories of the time (for example BTC-e or Vircurex, priced in BTC and converted at that week's BTC/USD) or any archive. Known points: about $0.07-0.09 on 2-3 Mar 2013; a peak of $4.49 on 10 Apr 2013.
3. **Weekly closes for LTC from 28 Apr 2013 and DOGE from Dec 2013, to 31 Dec 2016**, from a free daily source, so the game stops interpolating between quarterly anchors.
4. **The share of bitcoin network hashrate in "small" pools, by year 2011-2016.** Define small (for example: outside the top five, or under 2% each), from archived pool-share charts or papers.
5. **What a hobbyist paid to run a small pool, 2011-2016:** a VPS or dedicated server per month, and DDoS protection per month, by year.
6. **June 2014:** after one pool briefly passed 50% of bitcoin hashrate (12-13 Jun 2014), how much hashrate moved to smaller pools, and for how long.
7. **Later prices for a chapter-report line:** LTC and DOGE closing prices at the end of 2017, the end of 2021, and the latest full year you can source, each with its date.
8. **Small-pool sales or mergers, 2011-2016:** any documented case, with terms. And **LTC's average daily trading volume in 2011 and 2012**.
9. **Name-clash check** for these invented names, in crypto, mining, energy and games: Halfblock Pool, OreLoop, CopperHash, ScryptBox Ltd, Mara Ilves, Teo Brandt, Jun Okafor. Say whether any is a real company, product or public person.

## Deliverables (save each as a file in this thread)
1. `55-prologue-expansion-research-2.md`: findings for items 1-9, sources, conflicts between sources and which you chose, and assumptions.
2. `ltc_doge_weekly.csv` with exactly these columns: `week,ltc_difficulty,ltc_hashrate_GHs,ltc_usd_close,doge_difficulty,doge_hashrate_GHs,doge_usd_close,grade,source,estimate`. One row per ISO week (Monday date, YYYY-MM-DD) from 2011-10-10 to 2016-12-26; leave DOGE columns empty before 2013-12-02; `estimate` is true when a value is interpolated or chart-read.
3. `pool_and_volume_inputs.csv` with columns `item,year,value,unit,grade,source`, covering items 4, 5, 6 and 8.
4. `later_prices.csv` with columns `coin,date,usd_close,grade,source` for item 7.
5. A short summary at the end of your reply: what was found, what wasn't, and which of the game's designed assumptions look wrong.
