# 26: Alpha 0.3 scope — the Prologue (Act 0), "Bedroom to Garage", 2009–2016

*v1.0, 28 Sep 2026. Scope freeze for the build. Design: doc 23 v1.0 (decisions P0-1…P0-19). Content: `docs/prologue-content/` (doc 24 pack, Revisions 1–2, plus the Etherscan-based ETH file). Where this doc and doc 23 disagree, this doc wins; where this doc is silent, doc 23 applies; where both are silent, pick the simplest option consistent with Act I, log it in dev-notes under "Prologue choices", and continue.*

---

## 1. What it has to prove
A 10–15 minute optional prologue that teaches difficulty, halvings, solo vs pool and custody risk, makes Act I feel like your own company, and survives handing Act I a player who may already be rich (doc 23 §1).

## 2. Scope (in)

### 2.1 Act 0 boundary
- `act: 0` in the state; a save version step with a migration test.
- Market prepended with 2009-01-05 → 2016-12-26 weekly rows from `market_weekly_prologue.csv`, **with the ETH columns replaced** from `eth_network_weekly_prologue.csv`: `eth_hashrate_THs` as given, `eth_rev_usd_mh_day = eth_rev_usd_mh_day_per_usd × eth_usd` (doc 23 §15.2). ETH price stays from the pack. BTC price is $0 before 2010-03-01.
- Title: "New career" → "Start in 2009 (prologue)" / "Start in 2017" (today's start) / "Start at Act II" (exists).
- **Invariant:** "Start in 2017" is byte-identical to today's Act I start; all existing Act I, Act II and Act I → II goldens pass unchanged.

### 2.2 Turn loop and pacing
- Span 2009Q1 → 2016Q4 (32 quarters). Same engine (Plan → 13 weekly ticks → report).
- **13 decision quarters** from `events_prologue.json › decision_quarters` get a Plan phase and a full report. The other 19 auto-play as one summary card each ("Q3 2012 · mined 41 BTC · BTC $11 ▲ · difficulty +39%"), no input wait beyond a Continue button, with a "Stop here" option that turns that quarter into a Plan phase.
- An event or interrupt with `pauses_autoplay: true` (or any scripted card in an auto-played quarter) pauses auto-play and shows its card.
- The decision-quarter list is content, not code.

### 2.3 The player
- Start: `pc_cpu` owned, site `bedroom`, cash $2,000, income $1,200/quarter until moving out (`life.json`).
- **Bandwidth:** base 2; +1 after moving out. No hires.
- **Household patience:** starts 100. −15 at each quarter end while load > the site's `household_threshold_kw`; household cards change it by their effects. At 0: a forced card: move out now (if affordable) or cut load to the threshold for the next quarter (default).

### 2.4 Sites (`sites_prologue.json` + Act I tiers)
| Tier | Capacity | Power | Unlock |
|---|---|---|---|
| bedroom | 0.15 kW | free (household) | start |
| home_rig | 1.5 kW | free (household) | $300 |
| garage (Act I) | as Act I | as Act I | after moving out |
| small_unit (Act I) | as Act I | as Act I | from 2014Q1, after moving out, Act I cost |
- A gaming GPU (0.35 kW) doesn't fit the bedroom next to the PC: the home rig is the first real purchase. Intended.

### 2.5 Machines (`machines_prologue.json`)
- The full ladder as in the file: pc_cpu, gpu_gaming_2010, fpga_board, asic_preorder_early (pre-order only), antminer_s1/s3/s5/s7, antminer_s9_early, gpu_eth_2015.
- Buy at `price_new` for the current quarter (use the latest listed quarter if the current one is missing; not buyable after its last listed quarter + 4). Sell at `price_used` the same way.
- Earn from the quarter after purchase or delivery; switch off when unprofitable; failure rates as listed. Same systems as Act I.
- `gpu_eth_2015` stays available from 2015Q3 (design flag #8 was withdrawn after the Etherscan fix).

### 2.6 Solo vs pool (doc 23 §5.1, P0-13 literal)
- **Solo:** weekly blocks found ~ Poisson(λ), λ = player_hashrate ÷ (player_hashrate + network_hashrate) × 1,008; each block pays the subsidy (+ fee share). Seeded RNG.
- **Pool:** available from 2010Q4; pays the expected share every week minus the pool fee (`custody.json › pools.fee_pct_by_year`).
- The Plan screen shows solo odds in words ("about 1 block every 3 weeks").
- **CPU-era mining is literal** (P0-13): a player mining nonstop from 2009 can end with a Satoshi-scale stash. Custody risk and selling limits are the brakes. Do not cap it.

### 2.7 Custody (`custody.json`)
- Every coin balance is either **on an exchange** or **in your wallet**. Moving coins costs 0 BW and takes one week. Selling needs coins on an exchange. Mined coins land in the wallet by default; a toggle sends them to the exchange.
- Exchange events:
  - **2011Q2 Mt Gox hack:** no coin loss; no selling for the rest of that week; household patience −5.
  - **2014Q1 Mt Gox collapse:** 80% of coins on the exchange at the collapse week are lost permanently. "Try to withdraw" on the card: 20% chance to save 50% of the balance before the loss applies (seeded).
  - **2016Q3 Bitfinex:** 12% chance, if coins are on an exchange, to lose 36% of that balance.
- Before 2014Q1 the exchange is Mt Gox; after it, "an exchange" (no name) until the Bitfinex card.
- **Wallet loss:** 0.75% chance per quarter (3%/year) of losing the whole wallet balance, via the `dead_hard_drive` card; × 0.15 with a backup. **Backup action:** 1 BW, $0, lasts until the player buys a new PC-class machine or moves out, then the Plan screen prompts again. Lost coins are gone and are listed in the chapter report.

### 2.8 Selling limits (P0-16) — designed values, tune in P4
- The pack has no volume series, so the cap is a designed weekly USD cap on sales: 2010 $500 · 2011 $20K · 2012 $20K · 2013 $500K · 2014 $500K · 2015 $500K · 2016 $1M.
- Realised price on a sale = market price × (1 − 0.2 × sale_usd ÷ weekly_cap). Unfilled sell orders carry to the next week automatically.
- Forum offers (§2.9) are outside the cap.
- Label the cap values "designed" in the content file.

### 2.9 Offers, keep/sell, pre-orders
- **"Sell for almost nothing" offers:** the 6 offers in `events_prologue.json › offers`, shown in an offers tray in their quarter; accept or ignore.
- **Keep/sell %** per coin as in Act I (BTC; ETH from 2015Q3), subject to §2.8.
- **Pre-orders** (`preorders.json`): 3 vendors including the group buy; pay up front; delay rolled at order time with the seeded RNG; conference contact effect applies. Outcome labels on the card: on time / late / very late / never. **Any delivery 2+ quarters late is expected to lose money** (owner decision: late = loss).

### 2.10 Events (`events_prologue.json`)
- All 24 cards, the Act I card format and vocabulary, plus the new effect keys `household_patience`, `wallet_backup`, `wallet_loss_pct`, `success_p`/`on_failure`, `flag`, `open_buy_menu:*`, `preorder:*`, `open_offers_tray`, `open_preorder_menu`. Max 1 random card per quarter; defaults on skip.
- News ticker from `text_prologue.en.json › news.*`.

### 2.11 Money sinks (`life.json`)
- **Move out:** deposit + rent each quarter (by year); ends household power, patience and income; unlocks the garage; +1 BW.
- **Conference** (2013Q2, 2014Q2): the travel cost; +10 pp pre-order on-time odds (from severe/never) and one used-machine offer at −15%.
- **Vanity purchases:** the 5 items; a chapter-report line and a news mention only.

### 2.12 Handover to Act I (P0-1, P0-9)
- At the end of 2016Q4: the prologue chapter report, then Act I 2017Q1 with everything carried: cash, BTC and ETH (with their custody state), machines (antminer_s9_early → Act I `s9`; other prologue machines carry as themselves and keep running under Act I rules), sites.
- If the player hasn't moved out, the handover moves them into the garage automatically (deposit paid from cash; if cash is short, it's waived). Income stops.
- Act I custody after the handover: coins keep their exchange/wallet state for display; Act I's rules otherwise apply unchanged (no new Act I risks).
- **Act I scoring for prologue starts (P0-17):** the chapter report shows the absolute result and the growth multiple (end wealth ÷ starting wealth at 2017Q1); rank and title use the multiple.

### 2.13 Screens (functional now; wireframes later)
1. Title opt-in. 2. Prologue intro (`intro.prologue`). 3. Prologue Plan screen: machines, solo/pool with odds, custody panel (exchange/wallet, move coins, backup), offers tray, move-out and sinks. 4. Auto-play summary card. 5. Pre-order card. 6. Prologue chapter report (net worth, coins mined, coins lost to exchanges and to keys, "what your 2010 coins would be worth in 2021" using Act I's 2021 peak price), then Act I.
- **Design system (delivered 28 Sep 2026, doc 25 Prompt A; in `docs/design-system/`):** port the `bedroom` theme (the `[data-theme="bedroom"]` block in `tokens.css`, plus the three bedroom treatments and the MachineCard styles in `components/bundle.css`) into `src/ui/styles/`; add the 17 Prologue icons (pc-tower … auto-play) to the game's Icon component from `components/bundle.js`; port `MachineCard` with its 10 drawings and use it on the buy dialog, pre-order/group-buy cards and failure pop-ups (Prologue machines map: pc_cpu → pc-tower-2009, gpu_gaming_2010 → gpu-card-2010, fpga_board → fpga-board-2011, asic_preorder_early → asic-preorder-2013, antminer_s1/s3 → asic-box-2014, antminer_s5/s7/s9_early → asic-box-2016, gpu_eth_2015 → gpu-rig-open-frame). `heat-3` must be set per era (bedroom #9A4E1C), not inherited as the garage accent. Prologue nav: Dashboard, Rig, Wallet, Life, Log (as in the PlanEras proof screen). The PlanEras screen is a visual reference only: its sample state (a Heat meter on the bedroom site, an FPGA pre-order, "Read the forum") is not scope; household patience replaces Heat in the prologue.
- The wireframes (doc 25 Prompt B) come later; build with the system's components so the wireframe pass is a restyle, not a rebuild.

## 3. Out of scope (backlog)
Rivals and league; loans and investors; Heat beyond household patience; other coins (Litecoin); lobbying; the cross-act money-sink system; rig illustrations; wireframe-exact visuals; the Act I market-data swap to real data.

## 4. Build milestones (branch `prologue`, from `act2` after M6)
- **P1 Act 0 boundary:** state, save version + migration test, merged market with the ETH replacement, title opt-in, intro, handover skeleton, opt-out invariance.
- **P2 Economy:** sites and household patience, machines, solo/pool, custody, selling limits, offers, pre-orders, sinks, decision quarters and auto-play.
- **P3 Events and screens:** the 24 cards, news, the prologue Plan screen, auto-play card, pre-order card, chapter report, `bedroom` theme tokens, Act I scoring by growth multiple.
- **P4 Bots and balance:** the bots in §5 and the report.

## 5. Done when (exit checklist)

**Playable**
- [ ] A full prologue run from 2009Q1 to the Act I handover with no crash or stuck state; 5 prologue → Act I → Act II runs likewise
- [ ] 13 decision quarters; ≤ 19 auto-play cards; a bot-measured interaction count consistent with 10–15 minutes (proxy: ≤ 13 Plan phases, ≤ 25 cards needing a choice)
- [ ] Save/reload/export/import in Act 0 and across the Act 0 → I boundary

**Balance (bots, 50 seeds each)**
- [ ] `sell-as-mined` (pool from 2010Q4, sells 100%): ends 2016Q4 with $10K–$100K net worth
- [ ] `gox-hodler` (keeps coins on the exchange): loses ≥ 70% of its coin stack in 2014Q1
- [ ] `careful-hodler` (wallet + backup, mines from 2009): ≥ $1M net worth at 2016Q4 (paper); report the median and the Satoshi-scale tail honestly
- [ ] `no-backup` (wallet, never backs up): in ≥ 18% of runs loses its wallet before 2016Q4, judged on 1,000 seeds (§7, P3; was ≥ 20% on 50)
- [ ] Solo fades by itself: for one gaming GPU, the chance of finding ≥ 1 block in a quarter is ≥ 90% in 2010Q4 and ≤ 50% by 2012Q2 (report the quarter it crosses 50%)
- [ ] Pre-orders: on-time ≥ 2.5× cost by 2016Q4; 2+ quarters late < 1× cost; average across the odds ≈ 1.2–1.8×
- [ ] Every prologue bot reaches 2026Q4 through Act I and Act II without a crash; report Act I growth multiples

**Quality**
- [ ] Act I, Act II and Act I → II goldens unchanged; a new Act 0 golden and an Act 0 → I golden
- [ ] Content files pass schema validation; the migration test passes
- [ ] 1,000 prologue runs in the sim-runner in reasonable time, CSV out

## 6. Decisions recorded here (not in doc 23)
- Selling-cap values and the price-impact formula (§2.8): designed.
- Household patience drain (−15/quarter over threshold) and the forced card at 0.
- Mt Gox collapse "try to withdraw" odds (20% to save half); Bitfinex hack chance 12%.
- Wallet loss per quarter 0.75% (from 3%/year); backup lifetime.
- Handover auto-move to the garage if still at home.
- Solo share formula uses player ÷ (player + network).

## 7. Owner answers after the first build (28 Sep 2026, P5.0)
- **P1 Literal CPU mining stays** (owner choice): a careful 2009 player reaches Act I with ≈ 1.2M BTC. **Act I liquidity brake** (designed): a weekly BTC/ETH sell cap of $20M (2017), $50M (2018–19), $100M (2020), $250M (2021–22), with the §2.8 price impact; unfilled orders carry over; a crypto-backed loan's principal is capped at 4 weeks of that year's cap. The caps never bind for a $10K start and every existing Act I, Act II and Act I → II golden stays unchanged (as built, the sale cap and impact apply to prologue starts only, since the impact term alone would move every $10K-start sale slightly; the loan cap applies to all; the quarter-end forced sale isn't capped).
- **P2** Save format 3, with the goldens compared at format 2: accepted.
- **P3** `no-backup` is judged on 1,000 seeds with the target ≥ 18% (§5); the 0.75% a quarter stays.
- **P4** Pre-orders: an on-time unit ships in 2013Q3 and mines from 2013Q4, whatever its order quarter (kept).
- **P5** The conference card pauses auto-play (`pauses_autoplay: true`, like Cyprus); no new decision quarters.
- **P6** **Move back home** (1 BW, after moving out): rent stops, household power returns, patience resets to 50, the income doesn't return; the sites go back to the bedroom + home rig and machines over that capacity are sold at the used price. A bust happens only if cash is still < 0 after that (at quarter end a moved-out player short of cash moves back home automatically).
- **P7** Act I's $10K-specific onboarding tips are hidden for prologue starts; the first-quarter tip uses the real start ("You have $X, N machines, B BTC…").
- **Backup:** it lapses only on buying a new PC or moving out (§2.7), not on buying a GPU.
