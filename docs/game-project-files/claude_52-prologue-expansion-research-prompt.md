# Deep research task: the Prologue expansion (own pool, mining club, altcoins for old GPUs) for "Garage to Gigawatt"

*(Paste everything below this line into a new research thread attached to the Garage to Gigawatt Project. It's written to run in one go.)*

---

## Your role and the goal

You are the research lead and content designer for **Garage to Gigawatt**, a grounded, finance-first browser business sim. Its optional **Prologue (Act 0), 2009-2016**, is built: a tech student mines bitcoin from the genesis block on a gaming PC, through GPUs, FPGAs and early ASICs, to the garage where Act I begins. The owner wants three additions to the Prologue: **running your own mining pool**, **a mining club with friends**, and **altcoins (Litecoin, Dogecoin) for GPUs pushed off bitcoin**.

Your job: research the real 2010-2016 history behind these three, and turn it into a source-backed **dossier** and a **content pack** in the Prologue's existing file formats, so the design thread can finalise the design and the build can load the data without new loaders where avoidable.

Work through the whole task in one go. Don't stop to ask questions. Where something is ambiguous, choose the most sensible option, state it as an assumption, and carry on.

## Step 0: read first
1. `claude/51-prologue-expansion-design.md`: **the design draft. It's the source of truth for what you research.** Every ⚙ value is a placeholder to confirm or replace; every "to verify" is a fact to source or correct.
2. The Prologue's content files and their README (`claude/prologue-content/`: `custody.json`, `events_prologue.json`, `machines_prologue.json`, `preorders.json`, `market_quarterly_prologue.csv`, `market_weekly_prologue.csv`, `text_prologue.en.json`, `24-prologue-content-pack.md`): **match their formats and conventions**. custody.json already holds the pool fee table and the GHash.IO June 2014 event; extend it, don't duplicate it.
3. `claude/23-prologue-design.md` and `claude/26-alpha-0.3-scope.md` (the scope as built, which wins over doc 23 where they differ) for how the Prologue plays (decision quarters, Bandwidth, household patience, custody, selling limits, pre-orders).

## Rules
- **Evidence grades on every value:** [A] primary or official (chain data, project announcements, court filings), [B] reputable reporting, [C] estimate or secondary aggregate, [D] designed (yours, with the reasoning). Keep **sourced**, **derived** (show the formula) and **designed** values apart.
- **Never invent a fact about a real company, person or event.** If you can't find it, say "not found" and propose a designed value labelled [D].
- **Real names** only for sourced public events, real coins and the big real pools as news backdrop. **Invented names** for the player's pool, rival small pools, the friends, vendors and counterparties. No real people in cards.
- Prices and chain data: name the dataset and its coverage; mark interpolated or estimated weeks `estimate: true`, as the existing market files do.
- Hyphens, not em dashes, in all game text. Don't hard-wrap.

## Part A: altcoins for old GPUs
1. **Litecoin** (launch to 2016Q4) and **Dogecoin** (launch to 2016Q4): launch dates; USD price (open, close, high, low, average) per quarter and per week, matching the market files' columns; network difficulty and hashrate; block reward and block time, with every reward change (Dogecoin's random rewards at first and the move to a fixed reward: to verify).
2. **GPU scrypt performance** for the game's GPU classes (`machines_prologue.json`: the 2010 gaming GPU and the 2015 GPU rig): typical kH/s and watts, with sources (benchmarks of the period).
3. **Scrypt ASICs:** when the first shipped, how fast network hashrate rose, and how fast GPU scrypt earnings fell. Give a per-quarter series of "earnings per GPU on LTC / DOGE / BTC" (derived, formula shown) for 2011Q4-2016Q4. This sets target X-B6.
4. **Liquidity:** typical daily trading volume for LTC and DOGE by year (for the selling limits), and the exchanges they traded on (names as background only).
5. **Merged mining** (DOGE with LTC): when and how. Background for doc 50; no content needed.
6. **Later prices for the chapter-report line** (owner decision, doc 51 §8): LTC and DOGE closing prices at the end of 2017, 2021 and the latest full year you can source, each dated and graded, so the line can say what coins sold in 2016 would have been worth later.

## Part B: running your own pool
1. **Fees by year and by pool size**, 2010-2016; extend custody.json's table (keep its existing rows and grades). PPS vs PPLNS: which charged what, and when PPLNS became common.
2. **The pool landscape by year:** the share of network hashrate in the top 3 pools and in "small" pools (define small); the number of pools; typical small-pool hashrate.
3. **What running a pool took:** the open-source pool software and when each became usable; server and bandwidth costs for a hobbyist by year; how operators held the payout buffer (hot wallet).
4. **Incidents 2011-2016:** pool hacks, DDoS attacks, outages and closures, each with date, pool (real name if public), what happened and what miners did. From these, propose a per-quarter chance of each risk for a small pool (derived or designed, graded).
5. **June 2014:** the GHash.IO episode (already in custody.json; add what you find), and evidence on whether miners moved to smaller pools and for how long. Sets X-B4.
6. **Were small pools ever sold or merged?** On what terms? If nothing is found, say so and propose a designed sale multiple.
7. **Luck and insolvency:** for a pool at 0.1%, 0.5% and 2% of network hashrate, the chance of a quarter with less than half the expected blocks (derived from Poisson; show the maths). This feeds the PPS insolvency rule (X-B3).

## Part C: mining clubs and group buys
1. **Group buys 2012-2014** (BitcoinTalk and similar): how they were organised (shares, escrow, who held the coins and the machines, hosting), typical sizes in members and dollars, and named outcomes where documented (deliveries, delays, refunds, organiser losses or theft). Use real vendor names only as sourced background; the game's vendors are invented.
2. **Failure rates:** from documented cases, how often group buys or shared mining set-ups failed and why. Propose the per-quarter chance of the "friend holds the keys and loses or takes the coins" risk, graded.
3. **Hosting among hobbyists:** what people charged to host a friend's machine (per kW or per machine), if documented.

## Part D: values for every ⚙ in doc 51
A table: doc 51 section, the placeholder, your proposed value, grade, source or formula, and a note where the design's assumption looks wrong. Flag any doc 51 claim the research contradicts, and say which wins (sources win over the draft).

## Deliverables (save each as a file)
1. `53-prologue-expansion-research.md`: the dossier: findings for Parts A-C, the ⚙ table (Part D), contradictions with doc 51, open questions, sources list.
2. `prologue-expansion-content/` with:
   - `market_quarterly_prologue_alts.csv` and `market_weekly_prologue_alts.csv`: the existing quarter or week key, plus LTC and DOGE columns named like the existing BTC and ETH ones (`ltc_usd_open` … `ltc_difficulty_open` … `ltc_block_reward`, the same for `doge_`), with `estimate` flags.
   - `machines_scrypt.json`: scrypt hashrate and watts per existing GPU machine id.
   - `pools_player.json`: the player-pool rules (setup cost, server bill by year, fee range, PPS/PPLNS, pull model inputs, churn, risk chances, the 2014 boycott effect, sale multiple), each value with grade and source.
   - `club.json`: the club's terms (members, contribution range, hosting fee, key-holder risk, card triggers), graded.
   - `events_prologue_expansion.json`: the new cards in `events_prologue.json`'s format (pool outage, pool hack, the 2014 boycott choice, pool sale offer, the club invitation, the late delivery reaction, the 2013 peak cash-out, the dispute, scrypt ASICs arrive, Dogecoin launch news), with choices and effects.
   - `text_prologue_expansion.en.json`: all new UI and card text, in the existing text file's key style.
   - `README.md`: what each file is, and every value's grade.
3. A short summary at the end of your reply: the five findings that most change doc 51, and any ⚙ value you couldn't ground.
