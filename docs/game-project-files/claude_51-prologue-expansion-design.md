# 51: Prologue expansion design: your own pool, the mining club, altcoins for old GPUs. v1.4, 14 Oct 2026 (v1.0 13 Oct; §12 after M68; §13 after M69; §14 research pass 2; §15 research pass 3 and M70)

*Design thread. v0.1 (13 Oct) was the draft; v1.0 takes in the research dossier (doc 53, saved by the research thread as doc 52) and the owner's answers. The content pack is in `claude/prologue-expansion-content/` with its generators. Built on the Prologue as built: `docs/alpha-0.3-scope.md` (wins over doc 26 and doc 23), `docs/prologue-content/`.*

**How to read this doc.** Evidence grades as doc 36: [A] primary, [B] reputable reporting, [C] estimate, [D] designed. ⚙ = expected to change after the sim or the second research pass. (O) = owner decision, (DT) = design thread.

## 0. What changed from v0.1
- **Altcoins:** protocol facts locked [A/B] (§5.1). Merged mining comes into scope as an automatic bonus (owner, §8). Exchange collapses act through price and trust only; altcoins are always in the player's wallet.
- **X-B6** takes the research's form: at least 10× in 2013Q4, at least a 95% fall from 2014Q1 to 2014Q4. On the game's own BTC series the pack gives **20.8×** and **-97.5%**.
- **Pool:** costs, risks and the outside-miners model filled in (all designed except the sourced risks). PPS sits behind a cash reserve. A cold-storage action added. X-B3 corrected: PPS fees start at 2%, not 1%.
- **Club:** doc 53 invented a GPU club in a dorm; v1.0 keeps v0.1's shape (the group buy, keys, hosting, endings), takes three of doc 53's four friends and four of its nine cards (reworked), and adds two trap cards on a sourced backdrop (the scrypt box, the cloud contract). The dorm is gone: the player lives at home.
- **Pacing:** one new decision quarter (2014Q3), not two; the second stays in reserve.

## 1. What the expansion has to prove
- The Prologue gets more **decisions and story**, not more coins (a careful 2009 player already ends with about 1.2M BTC). None of the three may become the way to get rich (X-B7).
- The auto-played years get things to happen in, within the 10-15 minute target.
- **Opt-out invariance (non-negotiable):** a Prologue game that never touches the three features is byte-identical to today. New random draws use their own `substream(seed, label)`. The existing Prologue goldens, and the Act I, Act II and Act I → II goldens, stay unchanged. News headlines are display-only and draw nothing.
- Nothing new carries into Act I as a system. At the handover everything resolves into cash, coins and machines Act I already has, plus chapter-report lines.

## 2. Shared rules
- **Bandwidth:** unchanged (base 2, +1 after moving out). Starting or changing a feature costs 1; running costs nothing.
- **Decision quarters (O: up to 2 more accepted):** add **2014Q3** ("The Boxes Ship": scrypt ASICs arrive; sell the GPUs or not). 13 → 14. Every other new moment rides an existing decision quarter (2011Q2 pool unlock, 2011Q4 Litecoin, 2013Q1 the club, 2013Q4 the peak) or a card that pauses auto-play. The 15th stays in reserve for the balance pass.
- **Screens:** one new Prologue nav item, **Ventures** (pool and club panels); a coin selector per GPU lot on the Rig screen; a news line for the 15 headlines. Wireframes after approval.
- **Cards:** 14 new cards need a choice; most are conditional (pool open, club member). X-B8 checks the total per run.
- **Names:** real names for sourced events, coins and big pools only; the player's pool (Halfblock Pool), rivals (OreLoop, CopperHash), the vendor (ScryptBox Ltd), the friends and the cloud seller are invented. Name-clash check before shipping.

## 3. Feature 1: run your own pool (`pools_player.json`)
### 3.1 Shape
- **Unlocks 2011Q2** once the player has a home rig or better. **Open a pool** (1 BW, $300 setup [D]); server bill $180 a quarter in 2011 falling to $90 by 2015 [D].
- **Payout methods:** **PPLNS** (fee 0-3%; miners carry the luck) or **PPS** (fee 2-10%; the operator carries the luck). PPS can be chosen only while cash covers 3 × √(expected pool blocks a week) block rewards [D]. Changing settings costs 1 BW.
- **Your own rigs** can mine in your pool (no fee to yourself).
- **Protection:** DDoS protection from 2013Q1 (1 BW, $240 then $150 a quarter [D]) halves the DDoS chance; cold storage (1 BW, free, permanent) cuts theft from 1% to 0.2% a quarter [D].

### 3.2 How big it gets (designed [D] ⚙)
- Outside hashrate = network hashrate × the small-pool share of that year (30% in 2011 falling to 5% in 2016, placeholder) × your pull.
- Pull starts at 0.5% of the small-pool market and moves with fee (-8% per point above the median fee, doc 53), luck (4-week memory), reputation (0-100, starts 50; × (0.5 + reputation/100)) and a 5% a quarter churn. Three unlucky PPLNS weeks in a row start a -15% a week slide.
- Blocks are drawn weekly (Poisson, seeded, as solo mining already does). Orphans 2% in 2011, 1% in 2013, 0.41% in 2016 ([A] for 2016).

### 3.3 What can go wrong
- **DDoS:** 3% a quarter [D, from Vasek et al.: small pools hit far less than big ones, A]; 2-48 hours down, 20% of outside miners leave, reputation -15. Card `pool_ddos`.
- **Hot-wallet theft:** 1% a quarter, 0.2% with cold storage [D; real cases 3,094 BTC in 2012 and 923 BTC in 2013, B]; one week of payouts stolen; the operator repays from cash or loses 30 reputation. Card `pool_theft`.
- **PPS crunch:** cash below the reserve under PPS: switch to PPLNS or keep paying; below zero, 50% of outside miners leave each week. Card `pool_pps_crunch`.
- **The 2014 boycott:** card `pool_boycott_2014` (2014Q2, pool open). Cut the fee to 0% for two quarters, or keep it; a pool at or below the median fee with reputation ≥ 50 gets outside hashrate ×1.3 for two quarters [D ⚙]. Backdrop: one pool above 50% of hashrate on 12-13 Jun 2014 (custody.json note) [B].
- News headlines cover the sourced pool history (2011 DDoS wave, 2012 host breach, 2013 chain split, 2013 payout theft).

### 3.4 Ending
- **Sale offer** card from 2013Q1 (CopperHash's operator): price = trailing four quarters of fee income × 2 [D; no sourced sale found].
- **At the handover (O):** an open pool is sold automatically at that price. No pool system in Act I.

## 4. Feature 2: the mining club (`club.json`)
### 4.1 Shape
- **Card `club_form`, 2013Q1:** Mara Ilves (watches the wiring), Teo Brandt (brings two 2010-class GPUs), Jun Okafor (the spreadsheet). Join for 1 BW with $500-$5,000 [D]; the friends put in $3,000 together [D]; shares follow value put in, Teo's GPUs at the used price.
- **The club buys into the existing group buy** (preorders.json `group_buy`): its delay roll and late-equals-loss rule apply. Teo's GPUs mine whatever coin the player picks for them.
- **Keys:** you (your wallet-loss and backup rules cover the club's coins) or Jun (1.5% a quarter that 30-100% is lost [D; no failure-rate source found]).
- **Hosting:** your place (counts against household patience; the club pays you $60 per kW a quarter [D]) or Mara's flat (no patience cost; you pay your share of her $60).

### 4.2 Cards (7)
`club_form` (2013Q1) · `club_power_bill` (random: split by shares, pay it yourself, or a dispute) · `club_peak_cashout` (2013Q4: Teo wants out; buy him out, let him sell, or refuse at a friendship cost) · `club_gpu_flip` (2014Q1: sell the GPUs at 1.5× their cost, sourced GPU price peak) · `club_scrypt_box` (2014Q2: a quarter share of a $9,995 box; a trap, as the real boxes shipped late into a network that had tripled) · `club_cloud_contract` (2014Q3-Q4: daily-payout cloud contracts; a trap on the sourced 2014-15 cloud-mining Ponzi) · `club_breakup` (2015Q1: buy out, sell up, or carry on).

### 4.3 Ending (O: both endings)
At the handover, or at `club_breakup`: **buy the friends out** (their share at the then value; everything becomes yours and enters Act I; the Act I chapter report names them as the crew who helped you start) or **dissolve** (machines at the used price, coins at the 2016Q4 price, split by shares).

## 5. Feature 3: altcoins for old GPUs (market files, `machines_scrypt.json`)
### 5.1 Protocol facts (locked)
- **Litecoin:** live 13 Oct 2011 [C] (client 7 Oct [B]); 150-second blocks, 50 LTC, halving at block 840,000 on 25 Aug 2015 [A/B].
- **Dogecoin:** launched 6 Dec 2013 [B]; 60-second blocks; random rewards to block 144,999 (mean 500,000, then 250,000 from block 100,000 on 14 Feb 2014); fixed 250,000 with per-block difficulty from block 145,000 (17 Mar 2014); halvings at blocks 200,000-500,000; a permanent 10,000 from block 600,000 (about 25 Feb 2015) [A/B].
- **Merged mining:** active after block 371,337 on 11 Sep 2014 [A/B].
- **GPU scrypt rates:** 400 kH/s for the 2010 GPU; 3,400 kH/s (4 × 850) for the 2015 rig [B/D]. Power stays the existing models' `power_kw`.
- **Scrypt ASICs:** small units from about 2014Q1; $9,995 box pre-orders in Mar 2014, shipping from Sep 2014 [B/C].

### 5.2 Shape
- **Coin selector per GPU lot** (0 BW, takes effect next week): BTC, LTC (from 2011Q4) or DOGE (from 2013Q4). FPGAs and BTC ASICs mine BTC only; the 2015 ETH rig can switch to LTC or DOGE.
- **Litecoin is open from launch (DT, research question 2).** No lock and no designed trap: on the pack's data LTC beats BTC for a GPU at launch (2011Q4, 2.4×), loses through 2013Q1 (0.1-0.8×), then wins from 2013Q2 (20.8× in 2013Q4). That is the real arc and a real reading choice. The pre-2013Q2 prices are designed, so the second research pass must ground them before ship.
- **Merged mining (O):** from the week of 11 Sep 2014, a GPU on LTC also earns DOGE automatically, at the DOGE revenue rate. DOGE as a separate choice stays (high variance before Mar 2014).
- **Selling:** keep/sell % per coin as for BTC, within the altcoin limits: free up to 0.5% of the year's average daily volume, then -1% price per further 0.5%, hard cap 2% [D] (`custody_additions.json`).
- **Custody (DT, research question 3):** altcoins sit in the player's wallet only, so the 2014-2016 altcoin exchange collapses are news (price and trust), not balance losses. The wallet-loss rule covers them. Only `club` keys held by Jun can lose club coins.
- **Card `scrypt_boxes_ship` (2014Q3, the new decision quarter):** sell every GPU on scrypt at the used price, or keep them.

### 5.3 Ending
- Altcoins are sold over 2016Q4 within the selling limits; any left convert at the 2016Q4 close × 0.9 [D]. No altcoin enters Act I.
- **Chapter-report line (O):** "You sold N DOGE in 2016 for $X. At [date] those coins were worth $Y." The dated later prices come from the second research pass.

## 6. Balance targets (bots, 50 seeds, ⚙)
| # | Target | Why |
|---|---|---|
| X-B1 | Opt-out invariance: existing Prologue bots and goldens byte-identical | The features are optional |
| X-B2 | Pool-operator bot (opens 2011Q2, 1% PPLNS, cold storage, sold at the handover) ends at 1.2-3× the sell-as-mined bot's net worth | Worth doing, not a jackpot |
| X-B3 | ≥ 10% of pool runs without cold storage see a theft; a PPS pool at 2% fee ends insolvent in ≥ 5% of runs | The risks are real |
| X-B4 | A pool at or below the median fee in 2014Q2 gains outside miners in ≥ 80% of runs | The boycott decision pays visibly |
| X-B5 | Club bot (joins with $2,000, holds the keys, buys out) returns 0.8-1.5× the same cash in a solo group-buy share | Friends aren't a free lunch |
| X-B6 | A 2010 GPU on scrypt earns ≥ 10× the same GPU on BTC in 2013Q4, and its scrypt income falls ≥ 95% from 2014Q1 to 2014Q4 (pack: 20.8×, -97.5%) | The real arc |
| X-B7 | Paired seeds: each feature, added to the sell-as-mined bot, lifts its 2016Q4 net worth by at most 3×, and the bot with it stays below careful-hodler's median (§12 item 1) | None becomes the way to get rich |
| X-B8 | ≤ 14 Plan phases; ≤ 30 cards needing a choice per run, measured for a bot using all three features; 10-15 minutes | Pacing |

## 7. Content files (the pack, `claude/prologue-expansion-content/`)
**New:** `market_quarterly_prologue_alts.csv`, `market_weekly_prologue_alts.csv`, `pools_player.json`, `club.json`. **Extend (merge, never replace):** `machines_prologue.json` (`scrypt_khs` from `machines_scrypt.json`), `custody.json` (`custody_additions.json`), `events_prologue.json` (29 cards from `events_prologue_expansion.json`), `text_prologue.en.json` (`text_prologue_expansion.en.json`), `preorders.json` (a `scrypt_box_share` entry for the club card: $2,499 for a quarter share, promised next quarter, delay roll 1-3 quarters [D]). **Generators:** `tools/gen_alts.py`, `tools/gen_content.py` → the repo's `tools/prologue/`. The pack's README lists what the loader must learn (type `news`, the trigger predicates, the `pool` and `club` effect keys).

## 8. Decisions
**Owner, 13 Oct 2026:** (1) an open pool is sold automatically at the handover; (2) the club offers both endings; (3) the altcoin line includes a later sourced price; (4) up to 2 new decision quarters.
**From the research (13 Oct 2026):**
1. **X-B6 (DT):** adopted as the research proposed (§6).
2. **LTC before 2013Q2 (DT):** allowed from launch, no lock and no trap (§5.2).
3. **Exchange collapses (DT):** price and trust only; altcoins are wallet-only (§5.2). BTC custody (Mt Gox) keeps its existing direct loss.
4. **Merged mining (O, confirmed by the owner):** DOGE paid automatically on LTC work from 11 Sep 2014.
5. **Licensing a daily price export (DT):** no. Use free sources (chain explorers, published historical tables); the second pass grades what it finds.

## 9. Changes to the Prologue scope (`docs/alpha-0.3-scope.md`, a new §8 "Expansion", owner approval)
- §2.2: decision quarters 13 → 14 (adds 2014Q3; one more in reserve).
- §2.5: GPU lots get a coin selector (BTC, LTC, DOGE); scrypt rates per GPU model.
- §2.6: adds your own pool (PPS, PPLNS, reserve rule, risks, sale).
- §2.7: altcoins are wallet-only; club coins follow the key-holder choice.
- §2.8: altcoin selling limits.
- §2.9: the club buys into the group buy; a club-only scrypt box pre-order.
- §2.10: 29 new cards (15 news headlines, a new non-pausing type).
- §2.12: the handover sells an open pool, resolves the club, converts altcoins; chapter-report lines.
- §2.13: the Ventures nav item and the coin selector.
- §3: the doc 50 ideas stay out of scope.
- §5: X-B1 to X-B8 join the exit checklist; existing goldens unchanged, new goldens for each feature.

## 10. Second research pass (before ship, not before build)
1. **LTC and DOGE network difficulty, weekly 2011-2016**, chart-read from a block explorer or a published difficulty history, graded [C] "chart-read". This replaces every designed hashrate and is the biggest gap.
2. **LTC prices 2011Q4-2013Q1**, from the exchanges of the time (BTC-e, Vircurex) or a published archive.
3. **Weekly LTC and DOGE closes** from a free daily source (from Apr 2013 for LTC and Dec 2013 for DOGE), replacing the interpolated weeks.
4. **The small-pool share of bitcoin hashrate by year** (from archived pool-share charts), for the outside-miners model.
5. **Hobbyist server and DDoS-protection prices 2011-2016.**
6. **The 2014 boycott's size:** how much hashrate moved to smaller pools, and for how long.
7. **Dated later prices** for the chapter-report line: LTC and DOGE closes at end 2017, end 2021 and the latest full year.
8. **Any documented small-pool sale or merger**, and LTC average daily volume for 2011-2012.
9. **Name-clash check** for the invented names in §2.

## 11. Build plan (after approval; one milestone each, opt-out invariance gate on every chunk)
1. **Altcoins:** the market files and the coin selector, merged mining, selling limits, the 2011Q4 and 2014Q3 cards, the news type and headlines.
2. **Your own pool:** the pool panel, the outside-miners model, risks, cards, sale and handover.
3. **The club:** the club panel, the group-buy share, keys and hosting, cards, endings.
4. **Bots and balance:** X-B1 to X-B8 on 50 seeds, levers only on ⚙ values, smallest step first.
The second research pass can run alongside milestones 1-3; its numbers drop into the generators before milestone 4.

## 12. After M68 (14 Oct 2026)
*Design-thread decisions (DT) on the M68 handover's five Prologue questions. M68 is accepted as built, with its eight "(mine, reversible)" decisions: P0_ action names, the opt-in 2014Q3 decision quarter, news cards display-only, continuous slippage, forced sales including altcoins, a card with no week taking its quarter's first, LF line endings, the altcoin market chunk. X-B1 and X-B6 pass (13.5×, -98.2%).*
1. **X-B7 is re-measured where it can bite (DT).** Against careful-hodler's $1B+ paper wealth nothing a GPU earns registers, so the old test said nothing. The risk the target guards against is a feature that turns a modest player into a rich one. New X-B7, per feature, on paired seeds: the sell-as-mined bot with the feature against the same bot and seed without it; the feature may lift 2016Q4 net worth by at most 3× (the same ceiling as X-B2), and the bot with it stays below careful-hodler's median. The scrypt-switcher's +$116K over careful-hodler is reported, not judged.
2. **2014Q3 stays opt-in (DT).** A player with no GPU on scrypt has nothing to decide that quarter, so making it a decision quarter for everyone would add a stop with no choice in it, and re-accept two goldens for nothing. §2's "13 → 14" reads "13, or 14 for a player with a GPU on scrypt".
3. **The later-price clause goes in when the second research pass dates the closes (O, §8 item 3).** The TODO stays until then.
4. **Continuous slippage (DT).** Accepted: smoother, and no step a player can game by splitting sales at 0.5% boundaries.
5. **The second research pass:** prompt in doc 54. Its numbers drop into tools/prologue/ before the balance milestone (§11 item 4); nothing waits on it before then.

## 13. After M69 (14 Oct 2026)
*Design-thread decisions (DT) on the M69 handover. M69 is accepted as built, with its "(mine, reversible)" decisions, which become the spec: P0_POOL_SETTINGS (P0_SET_POOL already meant joining a pool); new outside miners each quarter = start_pull × fee factor × reputation × luck (luck under PPLNS only, clamped 0.5-1.5), with 5% leaving; an unlucky week is one with under half the expected blocks when at least one was expected; the risk cards rolled by the pool system on their own streams; the sale at the last four completed quarters of fee income × 2; the default answers. X-B1, X-B4, X-B6 and X-B7 (altcoins, 0.76×) pass.*

**Findings first:**
- **The pool is too rich (X-B2 4.95×, X-B7 pool 5.14×), but the main input is a placeholder.** Outside miners scale with `small_pool_share_by_year`, a designed number the second research pass (doc 54 item 4) replaces, and the server bill is also due from that pass. Tuning before then would fit a guess.
- **PPS at 2% going bust is realistic; the game over isn't.** Real PPS pools charged 5-10% (DeepBit 10%, BTC Guild 5-7.5%, doc 53 B1) because the operator carries the luck, so a 2% PPS pool should fail often. X-B3's insolvency clause passes (68% against at least 5%). What's wrong is that 31 of 50 runs end in a game over: a side venture's failure ends the whole Prologue.
- **X-B3's theft clause is measured on cut-short runs.** Theft at 1% a quarter gives about 20% over a full 2011-2016 run; 6% comes from runs that ended early.

**Decisions:**
1. **Pool balance waits for the second research pass (DT).** No lever now. At the balance milestone (§11 item 4), in order, smallest step first ⚙: (a) drop in the sourced small-pool share and server costs; (b) if X-B2 or X-B7 still misses, `start_pull` 0.005 → 0.0025; (c) then the fee elasticity -8% → -12% per point. The 3× ceiling stays.
2. **PPS insolvency closes the pool; it doesn't end the game (DT).** When PPS cash runs out: the pool pays what it owes miners from the player's cash down to zero, closes, sells for nothing, and the chapter report says so ("Halfblock Pool ran out of money under PPS and closed"). Reputation no longer matters after that. A game over still happens only through the Prologue's existing rules (cash below zero after the automatic move back home). PPS's reserve rule and the crunch card stay as they are.
3. **X-B3 is re-measured after decision 2 (DT).** With runs no longer cut short, theft should land near 20% without cold storage. The 1% rate stays; if the full-run figure is still under 10%, report it and the balance milestone decides.
4. **The club is next** (§11 item 3), with decision 2 in the same run.

## 14. Research pass 2 (doc 55, 14 Oct 2026)
*Design-thread decisions (DT) and owner questions (O) on doc 55. The pack is regenerated: `research-2/` holds doc 55's three files as inputs, `tools/gen_alts.py` now builds the market files from the weekly series, and `tools/gen_content.py` carries the new pool inputs, names and later prices.*

**Findings first:**
- **The weekly series is a reconstruction, not data.** Every row is estimate=true; the free daily source couldn't be fetched, and its licence (CC BY-NC 4.0) likely rules it out for a commercial game anyway.
- **The reconstructed launch weeks break the game.** At the anchored launch difficulty (0.000244) one 2010 GPU is 98% of the Litecoin network and mines 11.5 million LTC in a week. That is an artefact of a designed anchor, not history.
- **From 24 Oct 2011 the early Litecoin miner is a second literal jackpot.** One 2010 GPU mines about 110,000 LTC by 2013Q1, worth about $2.7M at the 2013Q4 close. It is unsellable before 2013 (2011-12 volume is about $1,000-2,000 a day, so the 2% cap allows $20-40 a day) and worth almost nothing on paper for 18 months (LTC at $0.004-0.07). So it plays as a bad bet that pays only to a holder: the same shape as CPU-era bitcoin, which the owner chose to keep literal (scope §7 P1).
- **X-B6 still holds on the new curve:** in 2013Q4 a 2010 GPU earns 13.4× more on LTC than on BTC (16.4× on its best scrypt coin, DOGE); LTC income falls 97.9% from 2014Q1 to 2014Q4. The thresholds stay.
- **Small pools' market grew, their fee room shrank.** The top five pools went from a third of hashrate to three quarters, but the share outside the top five (excluding solo) rose from about 10% in 2011 to 25-30% in 2013-15 as solo mining vanished, then fell to 24% in 2016. The market fee fell from 3.9% to 1.1%. Both are now inputs. The bigger market makes the pool richer, so X-B2's miss (4.95×) will likely widen before the lever brings it back.
- **June 2014 was a spike.** GHash.io held 55% for about 24 hours and was just over 30% a week later. The boycott becomes a +4 point bump in the small-pool share from 16 Jun 2014, fading over 8 weeks to +1 point for the rest of 2014 [D].

**Decisions:**
1. **Data for ship: rebuild difficulty from block headers (DT).** The nBits field in Litecoin and Dogecoin block headers is primary [A] and licence-free; Coin Metrics is not used. The build thread writes a small tool in `tools/prologue/` that fetches headers from a public explorer API or a node, converts nBits to difficulty, and writes a weekly CSV in the `research-2/` format. Weekly prices need a source whose terms allow commercial use; the third research pass finds one. Until both land, the shipped values stay graded estimate.
2. **The reconstructed series is the build placeholder (DT).** The balance milestone tunes on it; every X-B target is re-checked when the header data replaces it.
3. **Litecoin opens on 24 Oct 2011 (DT).** The first two reconstructed weeks are launch artefacts, so the coin selector and the `news_ltc_launch` card move to the week of 24 Oct 2011.
4. **The early Litecoin jackpot stays literal (O, answered 14 Oct 2026: keep it; it is small next to the bitcoin stash).** Recommendation: keep it, as bitcoin's CPU era is kept. The selling limits and the price path already make it a hold-or-nothing bet, and X-B7 checks that it can't lift a sell-as-mined player beyond 3×. The alternative is a designed floor on early network hashrate. Its size depends on 2011-12 difficulty, which is mostly designed today, so the header rebuild (decision 1) settles the real number.
5. **DOGE after merged mining is derived from LTC (DT):** from the week of 6 Oct 2014, DOGE difficulty = f × 0.4 × LTC difficulty, with f = 0.70 (2014), 0.82 (2015), 0.89 (2016) [D, from Binance Research 2019]. The four ramp weeks before that keep the series values.
6. **The chapter line uses one fixed date (DT):** "At the end of 2021 those coins were worth $Y", with LTC $146.41 and DOGE $0.1708 (CoinLore [C]). A latest-year close would date the line.
7. **Pool inputs (DT):** the small-pool share and market fee by year as above; server bill $300 a quarter in 2011 falling to $150 in 2016, DDoS protection $150-300 a quarter and available from the pool's unlock (2011Q2), both [D]; the boycott as a spike. Lever order at the balance milestone unchanged (§13 decision 1): first `start_pull`, then the fee elasticity.
8. **Names (DT):** ScryptBox Ltd becomes **Kestrel Foundry** (it was a real 2014 scrypt-mining share offering); Mara Ilves becomes **Nell Hartigan** (association risk); Halfblock Pool stays (low-moderate risk). Kestrel Foundry, Nell Hartigan, OreLoop, CopperHash, Teo Brandt and Jun Okafor are checked in the third pass.
9. **The expansion goes behind the dev flag (O, answered 14 Oct 2026: yes).** M68 and M69 merged to main, so the altcoins and the pool are live on GitHub Pages with placeholder data, and M70 would add the club with the two names being replaced. Recommendation: put the three features behind the dev flag until the balance milestone and the header data are in, and merge M70 only together with the run that renames.

**Changes to the Prologue scope:** Litecoin opens 24 Oct 2011 (was 2011Q4); DDoS protection from the pool's unlock; the boycott as a spike; and, if the owner agrees, the three features behind the dev flag. No new decision quarter and no new system.

**Third research pass (before ship):**
1. LTC and DOGE difficulty from block headers (the build tool in decision 1 may cover it; the research checks it against the sourced points).
2. A weekly LTC and DOGE price source whose terms allow commercial use, 2011-2016.
3. Name checks: Kestrel Foundry, Nell Hartigan, OreLoop, CopperHash, Teo Brandt, Jun Okafor.
4. Where the June 2014 outflow went (the +4 points is designed).
5. Hobbyist server and DDoS-protection prices of the period (all designed today).

## 15. Research pass 3 (doc 57) and M70 (14 Oct 2026)
*Design-thread decisions (DT) on doc 57 and the M70 report. M70 is accepted as built, with its "(mine, reversible)" decisions: club_form as a headline with joining through P0_JOIN_CLUB in 2013Q1's Plan phase; cloud payouts 10% then 2% of principal, then nothing; an unarrived box refunds at the group-buy refund share; the panel's quarter table as the club's report row; group-solo as X-B5's comparison; the random club cards pausing auto-play. X-B5 (1.02×) and X-B7 club (1.01×) pass.*

**Findings first:**
- **Prices are real and licensed.** CoinMarketCap weekly OHLCV [A] from 29 Apr 2013 (LTC) and 15 Dec 2013 (DOGE), used with the owner's permission; before that, a designed path [D] pinned to the sourced points. Credit line: "Price data courtesy of CoinMarketCap". Difficulty stays the doc 55 reconstruction until the header rebuild.
- **X-B6 still holds on real prices:** in 2013Q4 a 2010 GPU earns 13.0× more on LTC than on BTC (77.9× on DOGE in its launch quarter); LTC income falls 97.9% from 2014Q1 to 2014Q4.
- **M70's X-B3 passes as written.** The target is a floor: theft in at least 10% of full runs without cold storage (17.0%) and PPS-at-2% insolvency in at least 5% (70%). A bedroom pool on PPS at 2% should fail often: the PPS pools that survived for years were large (low relative variance) and charged 5-10%.
- **What is wrong is the game overs.** 27 of 50 pps-operator runs end in a game over: insolvency pays miners down to zero cash, then rent can't be paid. That breaks §13 decision 2's intent (a pool's failure never ends the game by itself).

**Decisions:**
1. **Prices (DT):** the market files take price and volume from `research-3/ltc_doge_prices_weekly.csv`; difficulty from `research-2/`. The altcoin selling limits use the week's real daily volume where present, else the year's average. The credit line appears on the Prologue's coin panel and in the game's credits.
2. **Names (DT):** OreLoop becomes **Slagwheel** (a Swedish gold-mining technology company uses OreLoop). Kestrel Foundry, Nell Hartigan, CopperHash, Teo Brandt, Jun Okafor and Halfblock Pool are clear or low risk. A formal USPTO and EUIPO search on every invented name runs before ship (an owner task, not a research pass).
3. **The June 2014 effect (DT):** pools outside the top five get +4 points in week 1, +2 by week 4, +1 by week 8 (linear between), and +1 for the rest of 2014. Most of the outflow went to big pools (doc 57).
4. **Hosting (DT, doc 57 [C]):** a dedicated server about $80 a month in 2011-12, $64 in 2013, $56 from 2014. DDoS protection for raw TCP isn't available to a hobby pool before 2013Q2 (enterprise-only at $3,000-7,000 a month); from 2013Q2 it costs $100 a month; from 2014 it is bundled free (still 1 Bandwidth to set up).
5. **PPS insolvency keeps the player alive (DT).** When a PPS pool can't pay, it pays miners from cash only down to one quarter of the player's committed costs (rent, power, bills); the rest of the debt to miners is written off, the pool closes and sells for nothing, and the chapter line says the miners went unpaid. X-B3's insolvency clause stays as written; the run also reports pps-operator game overs (target 0 caused by the pool).
6. **Friendship gets one effect (DT):** it starts at 0 and falls by 1 when you refuse Teo at the 2013 peak and by 1 when the power bill becomes a dispute; each point below 0 adds 10% to the price of buying the friends out ⚙.
7. **pool_sale_offer pauses auto-play (DT),** like the club cards; the prologue-pool golden may move once.
8. **Pacing (DT):** X-B8 now reads: at most 30 choice cards per run for a bot using one feature; a bot using all three is reported, not judged (club-all's 33 is accepted). No card is cut.
9. **Housekeeping (DT):** research files never live in `docs/prologue-content/` (the Prologue's live content). Docs 55 and 57 go to `docs/game-project-files/`; the research-2 and research-3 data go to `docs/prologue-expansion-content/research-2/` and `research-3/`.
10. **The club went public with the old names (finding).** M70 merged before the renames and the dev flag. The next run renames and gates the three features first.
