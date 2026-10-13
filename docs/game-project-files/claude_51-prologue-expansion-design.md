# 51: Prologue expansion design: your own pool, the mining club, altcoins for old GPUs. v0.1 draft, 13 Oct 2026

*Design thread. The owner chose three ideas from the 13 Oct brainstorm (the rest are parked in doc 50). This is a first draft for research to check: every ⚙ value is a placeholder, every "to verify" is a fact the research pass (doc 52) must source or correct. Built on the Prologue as built: `docs/alpha-0.3-scope.md` (wins over doc 26), doc 23, `docs/prologue-content/` (custody.json already has the pool fee table and the GHash.IO event).*

**How to read this doc.** Evidence grades as doc 36: [A] primary, [B] reputable reporting, [C] estimate, [D] designed. ⚙ = expected to change after research or the sim. Decisions marked (O) need the owner; (DT) are the design thread's.

## 1. What the expansion has to prove
- The Prologue gets more **decisions and story**, not more coins: a careful 2009 player already ends with about 1.2M BTC (scope §7 P1). None of the three may become the dominant way to get rich.
- The auto-played years (19 of 32 quarters) get something to happen in, without breaking the 10-15 minute target by much.
- **Opt-out invariance (non-negotiable):** a Prologue game that never touches the three features is byte-identical to today. Every new random draw uses its own `substream(seed, label)`; the existing Prologue goldens, Act I, Act II and Act I → II goldens stay unchanged. Only new goldens are added.
- Nothing new carries into Act I as a system. Each feature resolves at the handover into things Act I already has (cash, coins, machines) plus chapter-report lines. Act I's rules are untouched.

## 2. Shared rules
- **Bandwidth:** unchanged (base 2, +1 after moving out). Each feature costs Bandwidth to start and to change; running costs nothing. The squeeze is the point: in a 2 BW quarter, opening a pool means not buying a machine.
- **Pacing (DT ⚙):** at most 2 new decision quarters (the Prologue goes from 13 to at most 15); everything else rides the existing decision quarters, cards that pause auto-play (as Cyprus does), and the "Stop here" option. Target stays 10-15 minutes; the build reports it.
- **Screens:** one new Prologue nav item, **Ventures** (the pool and the club), and a coin selector on the Rig screen for GPUs. Wireframes come after approval, as for the Prologue.
- **Tone:** grounded, lightly wry. Real names only for sourced events and real coins (Litecoin, Dogecoin are real, public facts); the player's pool, friends, rival small pools and counterparties are invented. No real people.

## 3. Feature 1: run your own pool
### 3.1 Shape
- **Unlocks** ⚙ 2011Q2 (pools exist from 2010Q4, custody.json; pool software was open source by then: to verify), once the player has a home rig or better.
- **Open a pool** (1 BW): a setup cost ⚙ and a server bill each quarter ⚙ (to verify: what renting a server cost a hobbyist in 2011-2016).
- **Settings** (1 BW to change): fee 0-3% ⚙, payout method **PPS** (the operator pays every share and carries the luck) or **PPLNS** (miners carry the luck; lower fee needed to attract them). custody.json already explains both.
- **Your own rigs** can mine in your pool (no fee to yourself) or elsewhere.

### 3.2 How big it gets (designed model, [D] ⚙)
- Outside miners' hashrate in your pool = the small-pool market (a share of network hashrate not in the big pools: to verify by year) × your pull. Pull rises with a lower fee, uptime, your reputation and your pool's size last quarter (momentum), and falls each quarter by a base churn ⚙.
- **Fee wars:** from 2013 the big pools run 0-1% fees (to verify; custody.json notes GHash.IO at 0%), which squeezes a small pool's pull.
- Blocks found are drawn weekly from the pool's total hashrate (Poisson, seeded, as solo mining already does). Under PPS the operator pays out expected value and keeps the variance: a run of bad luck can drain the operator's cash ⚙.

### 3.3 What can go wrong (each a card, a chance per quarter ⚙, to verify against real incident frequency)
- **Outage or DDoS:** a share of outside miners leaves; buying better hosting (1 BW, a higher bill) cuts the chance.
- **Hot-wallet hack:** the pool's payout buffer is stolen; under PPS the operator owes the miners anyway. Real small-pool hacks happened (to verify, with dates).
- **Pool hoppers:** under PPLNS, hoppers join in good stretches; a modest drag on luck ⚙.
- **The 2014 boycott (sourced backdrop):** when a big pool neared 51% in June 2014 (custody.json `ghash_51pct`), miners spread to smaller pools. A pool with good reputation and uptime gains outside miners for 2 quarters ⚙. This is the feature's best decision: drop your fee to catch the wave, or keep margins.
- **Growing too big** (> 25% of network ⚙): almost unreachable for a bedroom pool; if it happens, the boycott hits *you*. Kept for honesty, not expected.

### 3.4 Ending
- **Sell the pool** any decision quarter from 2013 ⚙: price = trailing four quarters' fee income × a multiple ⚙ (to verify: were small pools ever bought, at what terms; if no source, designed [D] and labelled).
- **Close it:** free; the miners leave.
- **At the handover (O, answered in §8):** an open pool is sold automatically at the formula price, so Act I needs no pool system.

## 4. Feature 2: the mining club
### 4.1 Shape
- **Offered** by a card in 2012Q4 or 2013Q1 (with `asic_preorders_open`) ⚙: three friends (invented) want to pool money for a group order of early ASICs.
- **Join** (1 BW): put in cash ⚙; shares follow contributions. The club buys through the existing group-buy pre-order (preorders.json), so delays and late = loss already apply.
- **Who holds the keys (decision):** you (the club's coins sit in your wallet: your wallet-loss and backup rules apply, and you carry the trust) or a friend (no wallet risk for you, a small chance ⚙ per quarter that he loses the coins or disappears with them: to verify how often group buys and clubs failed by organiser loss or theft).
- **Where the machines run (decision):** your place (their load counts against household patience, and you take a hosting fee ⚙ from the club) or a friend's garage (no patience cost; he takes the fee).

### 4.2 Story cards (each pauses auto-play)
- **Late delivery:** from the pre-order rules; the friends react (one wants to pull out at a loss).
- **The 2013 peak (2013Q4):** one friend wants to cash out. Buy his share at market, let him sell his share of the coins, or refuse (a friendship cost: a chapter-report line, and he leaves at the next card).
- **A dispute** ⚙ (power bills, who did the work): split the cost or lose a member.
- **Mt Gox (2014Q1):** if the club kept coins on the exchange, the same custody rules hit the club.

### 4.3 Ending (at the handover, a choice (O))
- **Buy the friends out:** pay them their share at 2016Q4 value; the club's machines and coins become yours and enter Act I like any other. Act I's chapter report names them as the founding crew (text only).
- **Dissolve:** machines sold at the used price, everything split by shares.
- No club system in Act I.

## 5. Feature 3: altcoins for old GPUs
### 5.1 Shape
- **Litecoin** from 2011Q4 (launched October 2011: to verify) and **Dogecoin** from 2014Q1 (launched December 2013: to verify), both scrypt coins that ASICs didn't touch at first.
- **A coin selector per GPU** on the Rig screen (0 BW; a setting, applied next week): BTC, LTC or DOGE. FPGAs and BTC ASICs mine BTC only; the 2015 ETH rigs keep ETH (existing).
- **Revenue** = the GPU's scrypt hashrate ÷ the coin's network hashrate × coins issued per week × price, the same shape as BTC mining. Needs real price, difficulty or hashrate, and block reward per quarter and week, 2011-2016 (to verify), and each GPU class's scrypt hashrate and power.
- **The arc:** GPUs pushed off bitcoin by FPGAs and ASICs (2011-2013) find a second life on scrypt; when scrypt ASICs arrive (about 2014: to verify) GPU earnings there fall too. The decision is when to sell the old GPUs.
- **Selling:** keep/sell % per coin as for BTC, with tighter selling limits for thin markets ⚙ (to verify: daily volumes).
- **Merged mining** (DOGE with LTC from 2014: to verify) is not in this scope (doc 50).

### 5.2 Ending
- At the handover, altcoins convert to cash at the 2016Q4 price minus a liquidity haircut ⚙: Act I has only BTC and ETH, so its rules don't change.
- **A chapter-report line (DT):** "You sold N DOGE in 2016 for $X." The line also says what those coins would have been worth at a later sourced price (O, answered in §8).

## 6. Balance targets (bots, 50 seeds, ⚙ until the sim)
| # | Target | Why |
|---|---|---|
| X-B1 | Opt-out invariance: the existing Prologue bots' runs and goldens are byte-identical | The features are optional |
| X-B2 | A pool-operator bot (opens in 2011Q2, 1% PPLNS, sells in 2016Q4) ends with net worth between 1.2× and 3× the sell-as-mined bot's | Worth doing, not a jackpot |
| X-B3 | ≥ 10% of pool runs see a hack; under PPS at ≤ 1% fee, ≥ 5% of runs end the pool insolvent | The risks are real |
| X-B4 | The 2014 boycott adds outside miners to a fee-cutting pool in ≥ 80% of runs | The best decision has a visible payoff |
| X-B5 | A club bot (joins, holds the keys, buys out at the end) returns 0.8-1.5× what the same cash in a solo pre-order would | Friends aren't a free lunch |
| X-B6 | A GPU on scrypt in 2012-2013 earns ≥ 2× the same GPU on BTC; after scrypt ASICs, it falls ≥ 70% within 2 quarters | The real arc, shaped by the sourced data |
| X-B7 | No new bot beats careful-hodler's median net worth | None of the three becomes the way to get rich |
| X-B8 | ≤ 15 Plan phases; ≤ 30 cards needing a choice; 10-15 min (report it) | Pacing |

## 7. What the research must deliver (doc 52)
1. Litecoin and Dogecoin price, difficulty or network hashrate, and block reward schedule, weekly or quarterly, from launch to 2016Q4; scrypt hashrate and power for the game's GPU classes; when scrypt ASICs arrived and how fast GPU scrypt mining collapsed; daily volumes for selling limits.
2. Pool history 2010-2016: fee levels by year and pool size, the small-pool share of network hashrate, what running a pool took (software, server cost), pool hacks, DDoS and closures with dates, the June 2014 events and their effect on smaller pools, whether small pools were sold and on what terms.
3. Group buys and mining clubs 2012-2014: how they worked (shares, escrow, who held keys), typical sizes, how often they failed and why (vendor delays, organiser loss or theft).
4. Proposed values for every ⚙ above, each graded, with the formula behind derived ones.
5. A content pack in the Prologue's file formats: new columns for the market files, a `pools_player.json`, a `club.json`, new cards in `events_prologue.json` format, and text in `text_prologue.en.json` format.

## 8. Decisions for the owner (answered 13 Oct 2026)
1. (O) **An open pool is sold automatically at the handover**, at the §3.4 formula price. No pool system in Act I.
2. (O) **The club offers both endings** at the handover: buy the friends out, or dissolve.
3. (O) **The altcoin chapter-report line includes a later sourced price** for the coins sold in 2016 ("You sold N DOGE in 2016 for $X; at [sourced later date] they'd have been worth $Y"). The research pass sources the later price; the line names its date.
4. (O) **Up to 2 new decision quarters** are accepted (13 → at most 15).

## 9. Process from here
1. The owner answered §8 on 13 Oct 2026.
2. Research runs doc 52 and returns a dossier plus the content pack.
3. The design thread revises this doc to v1.0 with the sourced values and the owner's answers; the owner approves.
4. A scope note in `docs/alpha-0.3-scope.md` (§8, "Expansion") and a build run: one milestone per feature, then a bots-and-balance milestone, with the opt-out invariance gate on every chunk.
