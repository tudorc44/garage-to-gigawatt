# 23: Prologue (Act 0) Design — "Bedroom to Garage", 2009–2016

*v1.0 (design frozen), 27 Sep 2026. Built from the proposal (doc 22), the owner's answers of 27 Sep 2026 and the prologue content pack (doc 24, Revision 1). Remaining ⚙ values are filled from the content pack files in `claude/prologue-content/`; §15 lists the data fixes still open. Build after Act II's M6 (owner decision).*

---

## 0. Decisions (owner, 27 Sep 2026)
| # | Question | Decision |
|---|---|---|
| P0-1 | Carry-over into Act I | **Full carry-over.** The limits live inside the prologue (exchange hacks and collapse, lost keys, pre-order delays). Act I is also scored against your starting wealth, so a rich start doesn't win automatically |
| P0-2 | Start | **Jan 2009 (genesis)** |
| P0-3 | Length | **10–15 minutes**: ~14 decision quarters with a Plan phase; the quarters between them auto-play with a summary |
| P0-4 | Custody | **A real choice:** exchange vs your own wallet |
| P0-5 | The no-price era (2009 → mid-2010) | **A short hobby chapter:** 2–3 decision quarters, coins pile up at $0, early "sell for almost nothing" offers |
| P0-6 | Who you are | **A tech student with a gaming PC, ~$2K savings and a part-time income**; the household pays the power bill until you move out |
| P0-7 | Machines | **The full ladder:** CPU → GPU → FPGA → early ASIC pre-orders (delivery risk) → Antminer S-series → GPU rigs for ETH from Aug 2015 |
| P0-8 | Solo vs pool | **A choice until pools win:** solo = a block lottery, pool = steady pay minus a fee; solo fades as difficulty grows |
| P0-9 | Handover | **Enter Act I where you got to:** the sites, machines and coins you actually built. Act I's ladder continues from there |
| P0-10 | Names | **Real names for sourced, factual events** (Mt Gox, Silk Road, halvings); invented names for the player's own counterparties |
| P0-11 | Money sinks | **A few small sinks now** (§7) |
| P0-12 | Timing | **Build after Act II's M6**; research pack and scope can be prepared earlier |
| P0-13 | CPU-era payout | **Literal simulation.** Solo mining in 2009–10 uses the real network difficulty, so a player who mines nonstop from Jan 2009 can end up with a Satoshi-scale stash (≈1.7M BTC uncapped, per doc 24 Rev 1). Custody risks and selling limits are the brakes (§5.6) |
| P0-14 | Pacing fix | Auto-played quarters are single fast cards; **2013Q2 is not a decision quarter** (Cyprus becomes an event card that can pause an auto-played quarter) |
| P0-16 | Selling limits | **Cap by real volume:** each quarter's sales are capped at a share of that quarter's real exchange volume ⚙, and large sales push the week's price down (§5.6) |
| P0-17 | Act I score for prologue starts | **Growth multiple** (end wealth ÷ starting wealth) sets rank and title; the absolute result is still shown |
| P0-18 | Pre-order odds | **Keep the designed split** 45% on time / 35% 2–3 quarters late / 15% 4+ late / 5% never (designed, not sourced); tune in the bot runs |
| P0-19 | Packaging | **Alpha 0.3, after Act II's M6**, with its own scope doc and exit checklist, on a `prologue` branch |
| P0-15 | Pre-order group buy | A **group buy** option: half a unit at half the price, shared with invented forum friends, with slightly worse delivery odds (doc 24 Rev 1; real basis: bitcointalk group buys, 2012) |

## 1. What the prologue has to prove
*Is a 10–15 minute prologue a fun, readable introduction to mining (difficulty, halvings, solo vs pool, custody risk) that makes Act I feel like your own company, and does it survive handing Act I a player who may already be rich?*

## 2. Shape of a run
- **Span:** 2009Q1 → 2016Q4 (32 quarters), handing over to Act I at 2017Q1.
- **Turn loop:** unchanged from Act I (Plan phase → live quarter of 13 weekly ticks → quarter report), but only **decision quarters** get a Plan phase and a full report. The others auto-play at speed with a one-card summary ("Q2 2012: mined 212 BTC, price $6.70, difficulty +40%"). An interrupt or event card can pause an auto-played quarter.
- **Decision quarters (13, per doc 24 Rev 1):** 2009Q1 start · 2009Q4 first exchange rate (NLS, Oct 2009) · 2010Q2 Pizza Day (22 May 2010) and forum offers · 2010Q3 Mt Gox opens, GPU mining · 2011Q2 the June 2011 bubble and Mt Gox hack · 2011Q4 crash bottom, FPGAs · 2012Q4 first halving (28 Nov 2012) · 2013Q1 first ASICs, pre-orders · 2013Q4 the Dec 2013 peak, Silk Road seizure (Oct 2013) · 2014Q1 Mt Gox collapse (Feb 2014) · 2015Q3 Ethereum launches (30 Jul 2015) · 2016Q3 second halving (9 Jul 2016), S9 · 2016Q4 handover. *(All dates: to verify.)*
- **Bandwidth:** base 2 in the prologue ⚙ (you're a student), +1 after moving out ⚙.

## 3. The player and the household
- **Start:** a gaming PC, ~$2K savings ⚙, part-time income ⚙ ~$1.5K a quarter, no machines beyond the PC.
- **Household power:** while living at home, power for the PC and a small home rig is "free", but running above a threshold ⚙ triggers **household cards** (the parents see the bill; the room gets hot; noise) that cost cash, cap your load or force a choice.
- **Moving out** (a sink, §7) ends the free power, adds rent, and unlocks the garage.

## 4. Sites and machines
### 4.1 Site ladder (prologue part)
| Tier | Capacity ⚙ | Power | Unlock |
|---|---|---|---|
| Your PC (bedroom) | the PC only | household (free, with household cards) | start |
| Home rig (spare room) | ~1.5 kW | household, capped | cash |
| Garage (Act I's tier) | 5 kW | $0.12/kWh (Act I path) | after moving out |
| Small unit (Act I's tier) | 100 kW | Act I path | from 2014 ⚙, cash |
The prologue uses Act I's garage and small-unit tiers as they are, so the handover is seamless.

### 4.2 Machine ladder (specs to verify)
| Machine | Available ⚙ | Hashrate ⚙ | Power ⚙ | Notes |
|---|---|---|---|---|
| Your PC's CPU | 2009 | ~5 MH/s | ~150 W | free, already owned |
| Gaming GPU (Radeon HD 5870-class) | Q3 2010 | ~400 MH/s | ~200 W | the big early jump |
| FPGA board | 2011–12 | ~800 MH/s | ~40 W | efficient, pricey |
| Early ASIC (pre-order) | order 2012Q3–2013Q2, deliver later | ~5–60 GH/s | small | **delivery risk** (§5.3) |
| Antminer S1 / S3 / S5 / S7 | late 2013 / 2014 / 2015 / late 2015 | ~0.18 / 0.44 / 1.15 / 4.7 TH/s | ~0.36–1.3 kW | the ASIC race |
| Antminer S9 | mid-2016 | ~13.5 TH/s | ~1.3 kW | Act I's machine; bridges the handover |
| GPU rig for ETH (Act I's Gen 1) | Aug 2015 | as Act I | as Act I | sets up Act I's GPU story |
Machines earn from the quarter after delivery and switch off when unprofitable, as in Act I.

## 5. The new mechanics
### 5.1 Solo vs pool
- **Solo:** each week, your chance of finding blocks = your share of network hashrate × blocks that week. A block pays the whole subsidy (50 BTC until Nov 2012). Resolved with the seeded RNG (Poisson draw).
- **Pool** (from late 2010, to verify): you get your expected share every week, minus a pool fee ⚙ (1–3%).
- The Plan screen shows solo odds in plain words ("about 1 block every 3 weeks" in 2009 → "about 1 block every 40 years" by 2013). As difficulty rises, solo becomes a lottery ticket and the choice fades by itself. No forced switch.

### 5.2 Custody: exchange vs your own wallet
- Each coin balance sits either **on an exchange** or **in your wallet**. Moving coins costs 0 BW; selling requires coins on an exchange (one week to move).
- **Exchange risk:** scripted hits with real history: the Jun 2011 Mt Gox hack (trading halted; small loss ⚙) and the **Feb 2014 Mt Gox collapse** (coins on Mt Gox mostly lost ⚙; the real partial repayments came years later). Later exchanges carry a small random hack chance ⚙ (e.g. the Aug 2016 Bitfinex hack, to verify).
- **Wallet risk:** a yearly chance ⚙ of losing access (a dead hard drive, a forgotten password), cut sharply by a **backup action** (1 BW, small cost, lasts until you change machines ⚙). A lost wallet's coins are gone for good; the chapter report remembers them.
- Teaching point: the safest place changes over time, and doing nothing is also a choice.

### 5.3 Early ASIC pre-orders
- Pay upfront (2012Q3–2013Q2). Delivery lands 1–4 quarters late ⚙; each quarter of delay costs you, because difficulty keeps rising. A small chance ⚙ the vendor never delivers (an invented vendor; the real Butterfly Labs case appears only as a sourced news item).
- Alternative: keep GPUs/FPGAs, or wait for off-the-shelf ASICs (late 2013).

### 5.4 Early "sell for almost nothing" offers
- In the no-price era, forum-style offers (invented counterparties) arrive: sell N BTC for a small amount of cash or goods. Taking them funds your first GPU; refusing is the HODL bet. Pizza Day (real, 22 May 2010: 10,000 BTC for two pizzas, to verify) appears as news, not as the player's trade.

### 5.5 Keep / sell
- The HODL/sell % per coin, as in Act I (BTC; ETH from Aug 2015).

### 5.6 Selling limits (owner decision, 27 Sep 2026)
- With literal CPU-era mining, a player can hold far more BTC than the early market could absorb (Mt Gox's early daily volumes were tiny). Proposal: each quarter's sales are capped at a share of that quarter's real exchange volume ⚙, and large sales push the week's price down. Wealth stays real on paper; turning it into cash takes years, as it did for real early miners.

## 6. Events (24 cards + news, per doc 24)
**Scripted (real, to verify):** the network's first transaction and early news (2009) · the Aug 2010 value-overflow bug and fork · Satoshi steps away (2010–11) · Jun 2011 bubble + Mt Gox hack · first halving (Nov 2012) · Cyprus (Mar 2013) · Silk Road seizure (Oct 2013) · China's bank ban (Dec 2013) · Mt Gox collapse (Feb 2014) · Ethereum launch (Jul 2015) · The DAO hack and the ETH/ETC split (Jun–Jul 2016) · second halving (Jul 2016).
**Personal (invented):** the power bill · the PC overheats · a friend wants to buy coins · a dead hard drive (the lost-keys roll) · a job offer that costs Bandwidth · a conference invitation.
Same data format and engine as Act I (seeded stream, 1 random card per quarter max, defaults on skip).

## 7. Money sinks (small, now)
| Sink | Cost ⚙ | Effect |
|---|---|---|
| **Move out** | deposit + rent each quarter | ends household power and household cards; unlocks the garage; +1 Bandwidth |
| **Go to a conference** (2011–15) | travel cost | a contact: better pre-order odds and a used-machine offer |
| **A vanity purchase** (car, watch, trip) | cash | no game effect except a chapter-report line and a news mention; the first "wasting money" beat, for the later cross-act sink system |

## 8. Handover to Act I (P0-1, P0-9)
- Act I starts in 2017Q1 with everything the prologue ended with: cash, BTC and ETH (on exchange or in wallet), machines, sites, the income stops ⚙ (you're now full-time on mining).
- **Opting out = today's Act I start** ($10K, empty garage). The existing Act I golden replays must pass unchanged.
- **Act I scoring for prologue starts:** the chapter report shows both the absolute result and the **growth multiple** on your starting wealth; ranks and titles for a prologue start use the multiple (P0-17).
- Act I's systems don't change for rich starts in this alpha. Known effect: early funding rounds matter little to a rich player (accepted; the cross-act money sinks come later).

## 9. Balance anchors (proposed; tune in the sim)
- A run takes **10–15 minutes**.
- **Outcome spread by style** ⚙: sells as mined → tens of thousands of dollars; HODLer who kept coins on Mt Gox → loses most in 2014; careful HODLer (own wallet + backup) → millions by 2016; unlucky wallet loss → near zero. The spread itself is the point: custody and selling decisions must matter more than luck.
- Solo mining is clearly better in 2009, clearly worse by 2012, with the switch point in between.
- **Pre-orders (revised after doc 24 Rev 2, owner):** an on-time pre-order pays well (≈3× its cost by 2016); any delivery 2+ quarters late loses money (≈−58% at 2–3 quarters), as it did for real late buyers. With the 45/35/15/5 odds the bet is worth ≈1.5× on average: a real gamble, not a sure thing.
- Opt-out Act I runs are unchanged (goldens).

## 10. Screens
1. **Title:** "New career" → "Start in 2009 (prologue)" or "Start in 2017".
2. **Prologue intro** (Jan 2009, a short story screen).
3. **Prologue Plan screen:** a retro 2009 era theme ⚙ (a new `data-theme`), machines, solo/pool toggle with odds, custody panel (exchange vs wallet, backup), offers tray.
4. **Auto-played quarter summary** card.
5. **Pre-order card** (vendor, price, promised delivery).
6. **Prologue chapter report** (net worth, coins mined, coins lost to exchanges or keys, "what your 2010 coins would be worth in 2021"), then Act I.

## 11. Architecture notes (for the build)
- Act 0 in the state's `act` field; a save version step (+ migration test). The market is prepended with 2009–2016 weekly data (BTC from genesis with $0 before the first price; ETH from Aug 2015).
- Decision quarters and auto-play come from content (a list of quarters), not code.
- Solo mining uses the seeded RNG, so golden replays hold.
- No change to Act I rules; the handover only sets Act I's starting state.

## 12. Not in the prologue (backlog)
Rivals and the league (pools and exchanges are the world instead) · loans and investors · Heat beyond household cards · other coins besides BTC and ETH (Litecoin GPU mining 2011–14 is a candidate) · lobbying · the cross-act money-sink system.

## 13. Open questions for the content pack (⚙)
1. Weekly BTC price from the first exchange rates (Oct 2009, NLS; Jul 2010, Mt Gox) to Dec 2016; difficulty, hashrate, fee share from genesis; halving dates.
2. Machine specs, prices and availability by quarter (CPU, GPU, FPGA, early ASIC pre-orders with real delivery delays, Antminer S1–S9).
3. Pool history and fees; the Mt Gox hack (2011) and collapse (2014) magnitudes; later exchange hacks.
4. Student starting cash/income; household power cost and thresholds.
5. Lost-wallet base rates (sourced estimates of lost BTC share, if any).
6. ETH from launch (Aug 2015) to Dec 2016, and GPU ETH mining returns.
7. Event dates and effects for §6.

## 15. Data fixes still open (content pack)
1. ~~**BTC difficulty Q3–Q4 2013**~~ **fixed in doc 24 Rev 2.** Was: held flat at ≈19M through Q3 (real ≈26M → ≈112M) and jumps to ≈1.18B in early October (real ≈270M; 1.18B is the December level). Rebuild from the retarget history.
2. ~~**ETH network hashrate Aug 2015 → Dec 2016**~~ **fixed (27 Sep 2026)** from Etherscan's daily hashrate and difficulty exports: `claude/prologue-content/eth_network_weekly_prologue.csv` (weekly means; blocks/day = 86,400 × hashrate ÷ difficulty; 5 ETH reward × Act I's uncle/fee factor 1.0795). **At build time it replaces** the pack's `eth_hashrate_THs` and `eth_rev_usd_mh_day` columns: `eth_rev_usd_mh_day = eth_rev_usd_mh_day_per_usd × eth_usd`. Result: a 20 MH/s rig earns ≈$19/day in launch week, ≈$1–6/day through 2016. **Design flag #8 is withdrawn** (it was an artefact of the old interpolation). Seam: the prologue now ends at ≈6.0 TH/s; Act I's reconstructed first week says 5.0 TH/s while Etherscan says 6.6, so Act I's early-2017 ETH revenue is ≈25–30% high. Same handling as item 3: accept until Act I's market data is replaced with real data.
3. Minor, **accepted for now** (owner): the prologue's last week (difficulty ≈0.337T) steps back to Act I's first week (0.312T); revisit when Act I's market data is replaced with real weekly data.

## 14. Next steps
1. Owner review of this draft (v0.9 → v1.0).
2. The prologue content research prompt (like doc 19) → a content pack.
3. After Act II's M6: an Alpha 0.3 (prologue) scope doc and wireframes, then the build in batch mode on a `prologue` branch (P1 act-0 boundary + handover, P2 economy, P3 events/theme/screens, P4 bots/balance).
