# Deep research task: Prologue (Act 0) content and data pack for "Garage to Gigawatt"

*(Paste everything below this line into a new thread attached to the "G2G" Project. It's written to run in one go.)*

---

## Your role and the goal

You are the research lead and content designer for a solo-developed, AI-assisted web game called **Garage to Gigawatt** (working title). It's a grounded, finance-first business simulation. **Act I (a crypto miner growing from a garage in 2017 to the Ethereum Merge in Sep 2022) is built and balanced; Act II (2022Q4 → 2026Q4, miners pivoting to AI data centers) is being built.** The developer is now preparing an optional **Prologue (Act 0), "Bedroom to Garage", Jan 2009 → Dec 2016**: a tech student mines bitcoin on a gaming PC from the genesis block, moves up through GPUs, FPGAs and early ASICs, and ends in the garage where Act I begins.

Your job: **research the real 2009–2016 world of bitcoin (and, from 2015, Ethereum) mining and turn it into a complete, source-backed content and data pack** that a developer (working with Claude Code) can load straight into the game: real numbers, real history and ready-to-use event cards.

Work through the whole task in one go. Don't stop to ask clarifying questions. Where something is ambiguous, pick the most sensible option, state it as an assumption, and carry on.

---

## Step 0: Read the project docs first

Read these Project docs before researching, in this order:

1. `claude/claude_23-prologue-design.md`: **the prologue design (v0.9). It's the source of truth.** Everything you produce must fit it. Every value marked ⚙ is a placeholder you must confirm or replace; every fact marked "to verify" must be sourced or corrected.
2. `claude/claude_22-prologue-proposal.md`: background and the reasoning behind the design.
3. `claude_act1-content_11-act-i-content-pack.md`, `claude_act1-content_machines.json`, `claude_act1-content_sites.json`, `claude_act1-content_events.json`, `claude_act1-content_text_en.json` and the Act I `market_weekly.csv` / `market_quarterly.csv` project files: **Act I's file formats and conventions. Match them**, so the same loaders and schemas can be extended rather than rewritten.
4. `claude_10-alpha-0_1-scope.md`: how Act I's systems work (Plan phase, Bandwidth, live quarter, interrupts, Heat, HODL/sell %).
5. `claude_08-extended-universe-2017-2035.md` §3: the Act I arc the prologue hands over to.

---

## The prologue in brief (for context; details in doc 23)

- **Span and pacing:** 2009Q1 → 2016Q4 (32 quarters) in **10–15 minutes**. About **14 decision quarters** get a Plan phase, each tied to a real moment. The rest auto-play with a one-card summary.
- **Player:** a tech student with a gaming PC, ~$2K savings ⚙ and a part-time income ⚙. The household pays the power bill until the player moves out; heavy load triggers household cards.
- **The no-price era (2009 → mid-2010):** a short hobby chapter. Coins pile up at $0, and invented forum buyers make "sell for almost nothing" offers. Pizza Day is news, not the player's trade.
- **Machines:** CPU (the PC) → gaming GPU (2010) → FPGA (2011–12) → early ASIC **pre-orders with delivery delays** (2012–13) → Antminer S1/S3/S5/S7 → S9 (mid-2016) → GPU rigs for ETH (from Aug 2015).
- **Sites:** your PC (bedroom) → home rig (spare room) → garage (Act I's tier) → small unit (Act I's tier).
- **New mechanics:** solo vs pool mining (solo = a block lottery resolved by a seeded RNG); **custody** (coins on an exchange, exposed to the 2011 Mt Gox hack and the 2014 collapse, vs your own wallet, exposed to lost keys unless backed up); pre-orders.
- **Money sinks:** moving out (functional), a conference (a contact perk), a vanity purchase (no effect; the first "wasting money" beat).
- **Handover:** full carry-over into Act I (cash, coins, machines, sites). Getting rich is allowed; the limits live in the prologue's risks. Act I scores a prologue start by its growth multiple.
- **Tone:** grounded, lightly wry, never cartoonish. **Real names only for sourced, factual events** (Mt Gox, Silk Road, the halvings); **invented names for the player's own counterparties** (forum buyers, a pre-order vendor, a small exchange). **No real people in events.** No logos.

### Balance anchors to confirm or correct (doc 23 §9)

| Check | Target |
|---|---|
| Run length | 10–15 minutes |
| Style spread | Sells as mined → tens of thousands of $ by 2016 · HODLer who kept coins on Mt Gox → loses most in 2014 · careful HODLer (own wallet + backup) → millions by 2016 · lost wallet → near zero. Decisions must matter more than luck |
| Solo vs pool | Solo clearly better in 2009, clearly worse by 2012, with a switch point between |
| Pre-orders | On-time delivery beats GPUs; 3+ quarters late loses to them |
| Opt-out | Act I start unchanged ($10K, empty garage) |

Using the real history, estimate what a student with a gaming PC could realistically have mined (and bought) 2009–2016 under each style, and check the targets above. If real data contradicts a target, say so and propose a corrected value with the math.

---

## What to research

For every number, give a **source** and say whether it's **sourced** or an **estimate (≈)**. Where sources disagree, give the range and pick a game value. The window is Jan 2009 → Dec 2016.

### A. Market time series (weekly unless noted)
1. **Bitcoin network from genesis:** difficulty, network hashrate, block subsidy (**50 → 25 on the first halving, 12.5 on the second**, with exact dates), blocks per week, fee share. Difficulty stayed at 1 through 2009; capture the first adjustments exactly.
2. **Bitcoin price:** the first exchange rates (New Liberty Standard, Oct 2009), the pre-exchange reference points (Pizza Day, May 2010, and early forum trades), then weekly prices from Mt Gox (Jul 2010) and later the main exchanges to Dec 2016. Before a traded price exists, the game price is $0 plus reference points; state the rule you use.
3. **Hashprice** ($ per TH per day, and per GH per day for the early years), derived from price, subsidy, fees and hashrate: the same formula as Act I and Act II. Show that each row satisfies it.
4. **ETH from launch (30 Jul 2015):** weekly price, network hashrate and revenue per MH/s per day, matching Act I's ETH columns.
5. Match the column format of Act I's `market_weekly.csv`; add columns only where the prologue needs them.

### B. Machines and their market
1. **Specs by generation:** hashrate, power, efficiency, release date, launch price and later used price for: typical 2009 CPUs; gaming GPUs used for mining (Radeon HD 5870 / 5970 / 6990 / 7970-class); FPGA boards (e.g. the ones sold 2011–12); the early ASICs (Avalon batch 1, Butterfly Labs Jalapeño / Single SC, ASICMiner, KNC); Antminer S1, S3, S5, S7, S9; and the Act I GPU rig for ETH.
2. **Pre-orders:** real promised vs actual delivery dates for the 2012–13 ASIC pre-orders, the share that shipped late or never, and refund outcomes. This sets the delay distribution and the non-delivery chance (use an invented vendor in the game; real vendors appear only in sourced news).
3. **Home mining economics:** household power prices (US residential, by year), a student's PC and room limits (a sensible kW cap for a bedroom and a spare room), noise and heat facts useful for household cards.

### C. Pools, exchanges and custody
1. **Pools:** when pooled mining started (e.g. Slush's pool, late 2010), typical fees by year, payout methods (PPS, PPLNS) in one line each.
2. **Exchange history:** Mt Gox (opening Jul 2010, the Jun 2011 hack and its trading halt, the Feb 2014 collapse, the BTC lost, the much later repayments), plus other notable hacks (e.g. Bitfinex, Aug 2016), with dates and magnitudes. Propose game loss shares for coins held on an exchange at each event.
3. **Lost coins:** sourced estimates of the share of BTC lost to dead drives, forgotten keys and similar, to set the yearly lost-wallet chance and how much a backup cuts it.
4. **Early trading:** how early coins were bought and sold before and just after the first exchanges (forums, IRC, the pizza trade), with reference prices, to design the "sell for almost nothing" offers.

### D. The player's life
1. **A student's budget:** realistic savings and part-time income for a US or European tech student 2009–2016; moving-out costs (deposit, rent by year).
2. **Conferences:** real bitcoin conferences 2011–2015 with dates and ticket/travel costs.
3. **Vanity purchases:** 3–5 period-appropriate examples with prices.

### E. Scripted history: the prologue timeline
For each event in doc 23 §6 and §2's decision quarters (the genesis block and first transaction, the first exchange rate, Pizza Day, Mt Gox opening, the Aug 2010 value-overflow bug and fork, Satoshi stepping away, the Jun 2011 bubble and hack, the first halving, Cyprus, the Silk Road seizure, China's bank ban, the Mt Gox collapse, Ethereum's launch, The DAO hack and the ETH/ETC split, the second halving, the Bitfinex hack), give:
- the exact date(s)
- the magnitude (price moves, $, BTC, %)
- a one-line mechanical effect in game terms

Correct or add events if the research shows something important is missing, and flag any doc 23 date that's wrong.

---

## What to write (the content)

1. **~12 event cards:** the scripted history plus the personal cards in doc 23 §6 (power bill, overheating PC, a friend who wants to buy coins, a dead hard drive, a job offer, a conference invitation). Use Act I's `events.json` format. For each card:
   - `id`, `title`, trigger (date or condition), weight if random
   - body ≤ 60 words in the game's tone
   - 2–3 choices with effects in game variables (`cash`, `btc`, `bandwidth`, `household_patience`, `delay_quarters`, `exchange_loss_share`, `wallet_loss_chance`, …)
   - a default choice
   - the real basis in one line, with a source
2. **Decision quarters:** confirm or adjust doc 23 §2's list of ~14 quarters, each with what the player decides there.
3. **Machines and sites:** final `machines_prologue.json` and `sites_prologue.json` entries in Act I's formats.
4. **Offers:** 4–6 early "sell for almost nothing" offers (invented buyers) with dates and terms.
5. **Pre-order cards:** 2–3 (invented vendors) with price, promised delivery and the delay/non-delivery rolls.
6. **Money sinks:** final numbers for moving out, the conference and 3–5 vanity purchases.
7. **The student start:** final starting cash, income and household power rules.
8. **Text:**
   - the prologue intro screen (≤ 120 words, Jan 2009)
   - onboarding tooltips (5–6: difficulty, solo vs pool, custody, backup, pre-orders, HODL/sell)
   - ~15 new glossary terms (genesis block, difficulty, halving, solo mining, pool, PPS, FPGA, ASIC, pre-order, hot wallet, cold storage, private key, exchange, …)
   - ~30 news-ticker headlines (1–2 per decision quarter)
   - chapter-report titles for prologue result bands

---

## Output format

Produce **one research report plus a set of data files.** Save them to the Project under `claude/prologue-content/` (or return them as files if you can't write to the Project).

| File | Content |
|---|---|
| `24-prologue-content-pack.md` | Executive summary; findings per section A–E; **balance-anchor check** (each: confirmed/corrected, with math); **design flags** (where doc 23 is unrealistic, with a fix); assumptions; open questions; full sources |
| `market_weekly_prologue.csv` | A.1–A.4 weekly, Jan 2009 → Dec 2016, Act I's columns (+ any needed) |
| `market_quarterly_prologue.csv` | Quarterly summary, as Act I's `market_quarterly.csv` |
| `machines_prologue.json` | B.1–B.2 machines with quarterly new/used prices and availability |
| `sites_prologue.json` | The prologue site tiers and household rules |
| `custody.json` | Exchange events with loss shares; the wallet-loss chance and backup effect; pool fees by year |
| `events_prologue.json` | The event cards, decision quarters and offers |
| `preorders.json` | Pre-order cards and delay/non-delivery rolls |
| `life.json` | Student start, income, moving out, conference, vanity purchases |
| `text_prologue.en.json` | Intro, tooltips, glossary, ticker, titles |

**Data conventions (same as Act I):**
- Quarters as `2009Q1`. Weeks as ISO Monday dates.
- USD nominal. Hashrate in the unit the era used (MH/s, GH/s, TH/s), converted to one base column.
- Every real number gets `source` and `estimate: true/false`.
- Real names only for sourced, factual events. No real people in events.
- At the top of the report, a **JSON schema sketch** per file. Reuse Act I field names wherever a concept is the same.

---

## Quality bar

- **Accuracy first.** Prefer primary and near-primary sources: blockchain data (difficulty, hashrate, blocks), exchange data archives, court and bankruptcy filings (Mt Gox trustee reports), manufacturer spec sheets and contemporaneous forum records (bitcointalk) for early prices and hardware. Use reputable secondary sources to fill gaps.
- **Ranges, then a game value.** Show the range, pick one, say why.
- **Playability over precision.** Smooth noisy series where needed and keep the real value alongside.
- **Scale check.** The prologue runs from a $2K student to potentially a multi-millionaire by 2016. Check that the student can afford each step of the machine ladder at the time it appears, and flag any step that's out of reach or too easy.
- **Flag design problems.** If the research shows a doc 23 mechanic is unrealistic, say so under "Design flags" with a fix. Don't silently change the design.
- **Completeness check at the end:** a table listing each file and section with its status (done / partial / missing and why).
