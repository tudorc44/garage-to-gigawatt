# Act V content (source files)

Source of truth for Act V's content (doc 43 v1.1 §16; doc 46; doc 47). Written by the content pack on 10 Oct 2026, in the
style of `docs/act4-content/README.md` and `docs/energy-content/README.md`. Every column or rule is flagged with a grade
and a source:

- **[A]** primary or official, **[B]** reputable reporting or company statement, **[C]** analyst, forecast or industry
  estimate, **[D]** inference or designed (doc 36's grades, as docs 40, 43 and 45 use them).
- **sourced** = a value taken from doc 37, 40 or 45 (their grade given); **derived** = computed from sourced or carried
  values; **designed** = invented for the game, to tune (⚙ in doc 43); **mine** = a choice the docs leave open, listed
  in doc 47's assumptions as "mine, reversible".
- "Doc 43 §0" = the v1.1 amendments, which override doc 43's later sections.

Everything after 2035 is a scenario. The four futures are labelled fiction built on real evidence: a value is [A]-[C]
only where a source gives it; every path between anchors is [D].

## Files

| File | What | Read in play? |
|---|---|---|
| `market_v_v1.csv` … `market_v_v4.csv` | The four futures' quarterly markets, 2036Q1-2040Q4 (20 rows, 120 columns) | Yes (current and past rows) |
| `market_weekly_v_v1.csv` … `market_weekly_v_v4.csv` | Weekly BTC, hashprice, ASIC tiers, GPU rents and regional power (13 weeks a quarter, 260 rows) | Yes |
| `signals_v_v1.json` … `signals_v_v4.json` | Six indicators × 20 quarters, sharp ranges, headlines, the decoy and its tell, the trigger (hidden fields marked) | Displayed and sharp ranges only |
| `events_v.json` | 43 event cards: 8 per future, 11 shared | Yes |
| `rivals_v.json` | Six fictional rivals' value, orbital MW and firm MW per future, and their fates | Values yes; fates at the reveal |
| `reading_score_v.json` (**hidden**) | Ideal stances per future and quarter, weights, decoy windows, the move-kind table | No: `readingScore.ts`, `act5End.ts` |
| `exit_v.json` (**hidden part**) | Bid ranges (public) and post-2040 outlook factors (hidden) | Bid only, from 2040Q3 |
| `plants_v.json` | Operating rules per plant class, plant finance, valuation | Yes |
| `wildcards_v.json` | The five wildcards (2 drawn at entry) | Yes, when they fire |
| `hires_v.json` | Head of Grid Strategy, Head of Power Trading | Yes |
| `text_v.en.json` | UI strings A5-01 to A5-11, glossary, reveals, megawatt titles, exit dialog | Yes |
| `epilogue_v.json` | Finale epilogue pools (text only, no number after 2040) | At the finale |
| `generators/*.py` | The Python scripts that wrote every file above (for Claude Code to port to `tools/act5/`) | No |

**Generated, never hand-edited:** `python3 -I generators/market.py <dir with the four market_iv_f*.csv and
market_weekly_iv_f1.csv> <out>`, then `signals.py`, `events.py`, `content.py`, `text.py` and `check.py <out>`. The build
should port them to `tools/act5/*.ts` as it did for Act IV (`npm run content:act5`).

## The common 2036 baseline (V-B14) and the triggers

- **Every market column is identical in all four futures through 2036Q4** (act quarters 0-3), stricter than doc 43's
  "identical in 2036Q1-Q2, within ±3% through 2036Q4" (mine, as Act IV's build did for 2031). `generators/check.py`
  asserts both rules; result at hand-back: PASS, largest 2036 spread 0.
- **Baseline values:** where doc 43 §0 or doc 45 gives a 2036 value, that value; otherwise **the median of the four Act IV
  futures' 2035Q4 values** (`market_iv_f1..f4.csv`; with four values, the mean of the middle two; a blank in one future is
  skipped). The glide from each player's own Act IV future to this baseline happens at load over 4 quarters (doc 43 §3.3),
  so the files don't depend on the Act IV future.
- **Triggers (designed, inside 2037Q2-2038Q3):** V1 **2037Q4**, V2 **2038Q1**, V3 **2037Q4**, V4 **2038Q2**. V1 and V3
  sit where the M43.0 gate's stubs put them, so the gate's results carry (mine). Signals start 2036Q4 (V1, 4 quarters of
  warning), 2037Q2 (V2, 3), 2037Q1 (V3, 3), 2037Q2 (V4, 4); never before 2036Q3.
- **Weights:** V1 30%, V2 25%, V3 25%, V4 20% (doc 43, fixed).

## market_v_*.csv

### Columns carried from Acts II-IV

The engine reads these exactly as in Act IV. "Flat" = held at the 2036 baseline in every future.

**One rule decides most of the ground columns (mine; doc 43 §0.6-0.7):** in Act V the engine prices new leases,
re-lets and renewals at *the class rate × `scarcity_index`*, and the AI (ground) multiple and spot GPU rents at *market ×
(1 + 0.5 × (`scarcity_index` − 1))*. To avoid counting scarcity twice, the columns those rules multiply are
**scarcity-neutral base values held flat**: the GPU-hour rents, the renewal and RFP indices, the offer terms, the AI
multiple and EV per AI MW, and `ai_demand_index_0_100`. The futures move them through `scarcity_index`, which the UI
shows. If the build finds a carried system that reads one of these columns without the scarcity factor, it should
apply the factor there rather than edit the file (open question 2).

| Column(s) | 2036Q1 | 2040Q4 (V1 / V2 / V3 / V4) | Grade and source |
|---|---|---|---|
| `btc_usd_close` | 168,997 | 246,196 (all) | Designed: Act IV's +2%/q continued; one path for every future (Bitcoin isn't part of the future) [D] |
| `btc_block_subsidy` | 0.390625 | 0.1953125 | Halvings 2036Q1 (block 1,470,000) and 2040Q1 (1,680,000): the schedule [A], the quarters [D] (doc 45 §Q9) |
| `btc_difficulty_T` | 228.1 | 276.9 | Designed: +0.5%/q in 2036 (after the halving), +1.5%/q 2037-39, flat in 2040 (after the next) [D] |
| `btc_hashrate_EHs` | 1,633 | 1,982 | Derived: T × 2³² / 600 (Act II's formula) |
| `btc_hashprice_usd_ph_day` | 5.94 | 3.68 | Derived: BTC × 144 × subsidy / (1 − fee share) / TH/s × 1000 (Act II's formula); halves at each halving |
| `gpu_*_usd_hr` (H100 … Rubin Ultra; 14 columns) | Medians of 2035Q4, e.g. H100 hyperscaler 3.25, Rubin Ultra hyperscaler 23.40 | Flat | Derived (median rule); flat by the scarcity rule above. No class is retired: every class keeps renting in Act V; doc 43 adds no generation after Rubin Ultra ("no announced generation after 2038"). `gpu_a100_hyperscaler_usd_hr` stays blank, as in Act IV |
| `*_purchase_usd`, `*_rack_usd`, `*_system_usd` (8 columns) | Medians | −14% to −23% | Derived: median, then each column's own 2035 trend (the futures' mean 2034Q4 → 2035Q4 change per quarter, clamped −3% … +2%, Act IV's rule); same in every future |
| `capex_hosting_usd_mw`, `capex_retrofit_shell_usd_mw`, `capex_greenfield_shell_usd_mw`, `capex_fullstack_incremental_usd_mw`, `capex_retrofit_density_mid_to_top_usd_mw` | Medians (= the shared Act IV values) | Hosting 6.85M / 6.22M / 5.91M / 6.04M | Derived: own 2035 trend (+1.4%/q for most) × a designed future factor: V1 ×1.10 by 2040 from its trigger (transformers, labour), V3 ×0.95, V4 ×0.97 from 2039, V2 ×1.0 [D] |
| `sofr_pct` | 3.5625 | Flat | Carried flat, as Act IV [D] |
| `hy_spread_bps` / `ddtl_spread_bps` | 373.8 / 447.5 | V1 −20, V3 +75 from its trigger, V4 +25 from 2039, V2 0 | Median; additions designed [D] |
| `cap_rate_hyperscale_pct` | 5.675 | 5.425 / 5.675 / 6.175 / 5.675 | Designed: V1 −0.25, V3 +0.5 after the trigger [D] |
| `mining_ev_ebitda_mult`, `ev_per_mw_mining_usd_m` | 5.475, 0.408 | Flat | Carried flat |
| `ai_infra_ev_ebitda_mult`, `ev_per_mw_ai_*` | 15.57, 9.57, 26.73 | Flat | Median; flat by the scarcity rule (the engine applies 1 + 0.5 × (scarcity − 1), doc 43 §0.7) |
| `power_usd_kwh_<region>` (ERCOT, PJM, Ohio, Georgia, Arizona, Nordics) | Medians, e.g. PJM 0.1328 | PJM 0.166 / 0.139 / 0.093 / 0.120 | Median; then doc 43 §6.2's merchant power vs 2036: V1 +25% (straight line 2037-40), V2 +5%, V3 −20% at its trigger and −30% from the next quarter (the gate's step), V4 −10% over 2039. Same factor in every region (mine). The game sells plant output merchant at this price × 1000 ($/MWh), as the gate does |
| `pjm_capacity_price_usd_mwday` | 432.7 | 562.5 / 346.2 / 216.4 / 324.5 | Median of 2035Q4 (doc 43/45 give no 2036 value); **treated as "the cap" in Act V** (mine). V1 at the cap, the cap lifted 30% over the two quarters after the trigger; V2 −20%; V3 −25% then −50%; V4 −25% over 2039 (doc 43 §6.2). Note: above PJM's real 2028/29 cap of $325 (open question 3) |
| `hyperscaler_capex_usd_bn_q` | 659.7 | 956.5 / 890.5 / 588.7 / 824.6 | Median × `ai_demand_index_v` / 100; V3 also ×0.85 over the year after its trigger (the capex pause) [D] |
| `ai_demand_index_0_100` | 89.25 | Flat | Median; frozen (Act V's demand is `ai_demand_index_v`), by the scarcity rule (mine) |
| `newest_gen_lead_time_weeks` | 14 | 20 / 14 / 8 / 14 | Designed: V1 longer, V3 shorter after the trigger [D] |
| `nuclear_ppa_usd_mwh` | 118 | 135.7 / 114.5 / 94.4 / 112.1 | Median; V1 +15% (firm scarce), V2 −3%, V3 −20% after its trigger, V4 −5% over 2039 [D] |
| `renewal_*_index_*`, `rfp_new_lease_index_*`, `renewal_offer_term_years_*` | Medians | Flat | Scarcity rule; lock-or-roll sets terms at a renewal (8-10 years long, 2 short, doc 43 §0.2) |
| `tenant_default_prob_q_*` | Medians | V1 ×0.9, V3 ×1.5, V4 ×1.1 | Designed, as Act IV's index [D] |
| `tenant_walk_prob_at_renewal_*` | 0.0825 / 0.0275 | V1 ×0.6, V3 ×1.6, V4 ×1.2 | Designed [D]; walks follow the gate's rule (§0.6) |
| `launch_usd_kg_leo` | 300 | 250 / 250 / 280 / 100 | 2036 $300 (doc 43 §0, fixed); 2040 ends doc 43 §6.2; V4 crosses $200 at its trigger, toward $100 (doc 40 §D3: Google's ~$200 conditional, Forethought's ~$100 [C]) |
| `launch_slots_t_q` | 1,200 | 2,000 / 2,000 / 1,600 / 8,000 | Median; paths designed [D] |
| `sat_build_usd_kg` | 600 | 550 / 550 / 580 / 400 | Median; paths designed [D] |
| `insurance_capacity_usd_m`, `insurance_rate_*_pct` | 600; 7.25 / 2.9 / 1.95 | Capacity 750-1,000; V4 rates ×0.8 | Medians; designed (Act IV's research gap stands) [D] |
| `congestion_*` | 75 / 42.5 / 12.5 | Small rises; V4 92 / 60 / 18 | Medians; designed [D] |
| `orbital_shell_rent_usd_mw_yr` | 3.25M | 3.6M / 3.0M / 2.6M / 3.3M | Median; designed: V1's ground squeeze lifts orbit, V3 falls [D] |
| `orbital_gpu_usd_hr` | 1.90 | 2.1 / 1.7 / 1.5 / 2.0 | Median; designed [D] |
| `sovereign_premium_pct` | 17.5 | 17.5; V4 20 | Median; designed |
| `grid_wait_q` | 16 | = `grid_wait_q_other` | The generic Act IV column now carries "other regions" (mine) |
| `gas_wait_q` | 8 | 10 / 8 / 6 / 7 | Median; designed (turbine backlog in V1) [D] |
| `space_ev_ebitda_mult` | 8.5 | 9 / 7.5 / 6 / 20 | Median; V4 rises from 2037Q2 to 20 (below Switch's ~27.6x, doc 45 §Q7, as the ceiling) [D] |
| `lunar_*`, `landing_success_pct` | Medians (25,000; 5,000; 75; 5,250; 1,750; 2,500) | Flat | The Moon is offstage (V-D4); carried flat so nothing breaks; the holding's value moves with `lunar_value_index` |
| `gen33_t_mw`, `gen35_t_mw` | 14, 11 | Flat | Medians (Gen 35: of the three futures that ship it) |
| `sso_closed` | 0 | 0 | No shell closure in Act V (mine) |
| `estimate` | True | True | As every post-2025 file |

### New Act V columns

| Column | 2036 | 2040Q4 (V1 / V2 / V3 / V4) | Grade and source |
|---|---|---|---|
| `ai_demand_index_v` | 100 (2036Q1), +1.5/q through 2036 | 145 / 135 / 105 / 125 | Doc 43 §0.4 / doc 45 §Q4: V1 CEC mid +46% [A/C]; V2 BNEF path +35% [C]; V3 105 then flat, the plateau [D]; V4 125 [C/D]. Shared 2036 path designed so V3 reaches 105 in 2037Q1 |
| `scarcity_index` | 1.00 | 1.50 / 1.10 / 0.80 / 0.90 | Doc 43 §0.2, §0.6: V1 → 1.1 at the trigger then → 1.5; V2 → 1.07 at its trigger, 1.05 as the fast lane bites, 1.10 by 2040; V3 1.0 to the trigger, → 0.8 at 2039Q4; V4 1.03 at its trigger, 1.00 in 2038Q3, 0.95 in 2038Q4, 0.90 from 2039Q1 [D]. Differs from the gate's stub: the stub rose from 2036Q1, which V-B14 forbids (open question 4) |
| `powered_value_usd_mw` | 300,000 | 500K / 150K / 100K / 200K | 2036 $300K/MW [C, doc 45 §Q3]; paths designed from doc 43 §0.2's ends: V1 straight line from 2036Q4; V2 320K at its trigger then down; V3 from its trigger; V4 from 2038Q4 [D] |
| `queue_premium_usd_kw` | 100 | 300 / 25 / 25 / 60 | Doc 45 §Q3 (2036 $100; V1 $300; V2, V3 $25) [B/C]; V4 $60 designed [D]. Holding a position costs $50/kW of security (Texas rule [B], in `plants_v.json` → `queue`; doc 43 §0.2) |
| `grid_wait_q_pjm` / `_ercot` / `_other` | 20 / 12 / 16 | PJM 24 / 17 / 12 / 19; ERCOT 14 / 10 / 8 / 11; other 19 / 14 / 10 / 15 | 2036 from doc 45 §Q3 [A/C]. Directions doc 43 §6.2: V1 PJM → 24, others +20%; V2 firm waits −15% over the year after its trigger; V3 shorten from the trigger as withdrawals run at 30%/yr (ends designed); V4 −5% late [D]. Integer quarters; the engine draws × U(0.8, 1.2) as Act IV |
| `fast_lane_q` | blank | V2 only: 7 at its trigger, falling to 4 | Doc 45 §Q3: 4-8 q [B/C]; the expected wait, tightening as the rules bed in [D]; blank in V1, V3, V4 |
| `fast_lane_curtail_h_yr` | blank | V2 only: 180 | Doc 45 §Q3: up to ~180 h/yr ≈ 0.5% of output (Duke [C]); 24-hour notice (SB6 [B]) |
| `upgrade_usd_kw_median_pjm` / `_ercot` | 150 / 100 | PJM 195 / 142.5 / 120 / 150; ERCOT 130 / 95 / 80 / 100 | Doc 45 §Q3: medians $150 PJM/MISO, $100 ERCOT/SPP [A]; 20% chance of a $400-600 tail drawn per study (`plants_v.json` → `queue`); drift designed (V1 +30% congestion, V3 −20% headroom) [D] |
| `queue_withdrawal_pct_yr` | 15 | 10 / 20 / 30 / 15 | Doc 45 §Q3: rivals' positions 15%/yr, V3 30% [A/C]; V1 10 and V2 20 designed [D] |
| `plant_mult_contracted` | 10 | 10 (all) | Doc 45 §Q1 [B/C]; 8x with ≤ 8 years of contract left, 11x with ≥ 15 (applied by the engine, `plants_v.json`) |
| `plant_mult_merchant` | 7.5 | 8.5 / 7.5 / 6 / 7.5 | Doc 45 §Q1 [A/B/C]; V1 8.5x and V3 6x from the trigger quarter (as the gate) |
| `infra_bid_index` | 1.00 | 1.15 / 1.03 / 0.88 / 0.95 | Doc 45 §Q1: band 0.95-1.15, V3 0.85-1.00 after the trigger [B/C]; paths designed |
| `peak_spread_10h_usd_mwh` | 30 | 45 / 35 / 20 / 30 | Doc 45 §Q6: $30, V1 $45, V3 $20 [D]; V2 $35 designed (flexibility paid) |
| `capacity_rating_nuclear` | 0.95 | 0.95 | PJM ELCC [A], doc 45 §Q5 |
| `capacity_rating_cc` / `_ct` | 0.76 / 0.62 | 0.78 / 0.70 | Doc 43 §0.4 read literally: a straight line over the act. PJM's preliminary set already reaches 0.78 / 0.70 by 2035/36 [A] (open question 6) |
| `capacity_rating_storage_8h` / `_10h` | 0.62 / 0.72 | Flat | Doc 45 §Q5 [A] |
| `lunar_value_index` | 1.00 | 1.00 / 0.95 / 0.90 / 1.10 | Doc 43 §9.2: ±10% across futures, designed [D] |
| `btc_fee_share_pct` | 2.0 | 5.0 (all) | Designed: fees 1-2% of miner revenue in 2025-26 (doc 40 §D5 [C]), rising as subsidies shrink [D] |
| `exit_bid_low` / `_high` | blank | 2040Q3-Q4 only: 1.15-1.30 / 1.05-1.25 / 0.95-1.10 / 1.05-1.25 | Doc 45 §Q7 [A/B/C]. Blank before 2040Q3 so the file can't reveal the future |
| `gas_usd_mmbtu` (**added**, not in doc 46's list) | 3.75 | 4.57 / 4.15 / 3.74 / 4.15 | Needed by `plants_v.json`'s gas fuel rule. AEO2025 reference Henry Hub $2.19 (2024) → $4.80 (2050, 2024$) [A, EIA Today in Energy 65824] interpolated to 2036-40 ($3.40-3.80) plus a designed $0.35 delivery basis; V1 +10% after its trigger, V3 −10% [D] |
| `gen38_t_mw` (**added**) | blank | 9 / 9 / 10 / 7 | The satellite generation that replaces 2031-35 blocks: ships V4 2038Q2, V1/V2 2038Q4, V3 2039Q2 (designed, extending doc 33's Gen 31 → 35 mass path) [D] |

Never in the market files: the post-2040 outlook factors and the ideal stances (hidden files below).

## market_weekly_v_*.csv

Act IV's weekly columns plus the six regional power prices (doc 46). Weeks are Mondays from 2036-01-07, 13 a quarter.
BTC runs smoothly from close to close with Act IV's designed wiggle (0 at the close); hashprice derived; ASIC $/TH tiers
continue Act IV's −3%/q from its last week (designed); GPU-hour columns repeat the quarter's value; power runs in a
straight line from last quarter's close with a designed ±3% wiggle that depends only on the column and week number and
is 0 at the close. **Every quarter's last week equals the quarterly value** (`check.py`), and every 2036 week is
identical across the four futures.

## signals_v_*.json

Same structure as `signals_iv_*.json` plus a `headline` on each entry where the indicator moves (|Δ| ≥ 3 in the
authoring latent), in its decoy quarters and at its trigger. Everything **designed [D]** (doc 43 §6.3-6.4).

- **Six indicators** (0-100, 50 = 2036): Grid Queue (higher = slower connections), Capacity Market (higher = auctions
  hotter against the cap), AI Demand (higher = beating the 2036 trend), Reform Docket (higher = large-load rules moving),
  Launch Cadence (higher = cheaper faster than plan), Firm Build-out (higher = more firm power coming).
- **Displayed** = the latent + a seeded noise of −6…+6 that depends only on indicator and quarter (identical in every
  future, Act IV's rule); every indicator shows 50 in 2036Q1-Q2; 2036Q3's latent is identical in every future (mine).
  **Sharp range** = latent ± 3. Arrow on a displayed move of 3 or more.
- **What moves:** V1 Grid Queue, Capacity Market, AI Demand up; V2 Reform Docket up, then Grid Queue and Capacity Market
  ease; V3 AI Demand and Grid Queue down, Capacity Market spikes (decoy) then falls; V4 Launch Cadence up, Capacity
  Market and Grid Queue soften late. The rest drift within a few points of 50.
- **Decoys:** the SMR wave on Firm Build-out in V1 (2037Q1-Q3), V2 (2037Q2-Q4) and V4 (2037Q3-2038Q1); V3's record
  capacity auction (2037Q1-Q2). V3 also shows a smaller run of reactor announcements (not a decoy: it points the same way
  as the truth), so that seeing an SMR wave doesn't by itself rule V3 out (mine). Each decoy has a `tell`.
- **Fictional names in headlines:** Ironvale Power, Carrack Heavy, Northgate; region names already in the game (PJM,
  ERCOT) stay (IV-D28).

## events_v.json

43 cards (doc 43 §16 asks ~40): 8 per future (signal, decoy, trigger `v_<future>_c4`, aftermath, a fund approach, a
rival's move or an upgrade bill, an orbital block's end of life, a winner card) and 11 shared (intro, both halvings, the
credit cliff, the licensing clock, the post-quantum deadline, the end of the chip roadmap, the exit card, and three
future-neutral interrupts: plant trip, venture cash call, transformer delay). Each card's `basis` names its source.
`window` = [from, to]: fixed-quarter cards have from = to; interrupt and orbit cards fire inside their window when their
condition holds (a plant operating, a call due, a block at end of life). `reading_sign` gives each choice's scarcity-
exposure sign, keyed by choice label (a choice not listed logs 0; `raise_rule` = the M41 raise rule); it must agree with
`reading_score_v.json`'s move table.

### Card effects (new keys for the card engine; Act IV's keys unchanged)

| Key | Meaning |
|---|---|
| `offer: {kind: "fund_bid", bid_mult}` | A fund offers stake × plant value × `infra_bid_index` × bid_mult for one plant stake the player picks |
| `offer: {kind: "site_bid" / "site_buy", premium_mult}` | A buyer (seller) for a site with its position at its value + free MW × `powered_value_usd_mw` + MW × `queue_premium_usd_kw` × 1000 × premium_mult |
| `lease_lock_offer: {years, rate, rent_index?}` | Offers every tenant renewing in the next 4 quarters a lock at today's market rent (± rent_index) |
| `contract_output: {share, years, price_vs_market}` | Sells that share of the player's plant output forward |
| `flex_enrol_mw`, `fast_lane_apply`, `flex_capacity_bid`, `flex_study` | Flexibility moves (V2's engine; `flex_study` reveals the curtailable MW per site) |
| `pay_upgrade`, `withdraw_position`, `own_positions_wait_q`, `position_delay_q` | Queue moves on the player's positions |
| `gas_wait_cut_q`, `follow_on`, `plant_debt_prepay_share`, `plant_event`, `venture_call`, `orbit`, `orbit_booking`, `equity_window` | As named; `orbit` takes replace / extend / bring_home / retire (doc 43 §9.1) |
| `smr_licence_quarters`, `clean_credit_new_starts` | Known-timeline effects (the licensing clock; the credit cliff, a label while credits are unmodelled) |
| `open: "A5-09"` | Opens the exit dialog |

**Interrupt frequencies (mine, ⚙):** plant trip 15% a quarter per operating plant, at most once per plant per 8
quarters; transformer delay 10% a quarter per open position that is due to energise within 2 quarters; venture cash
call whenever a carried draw calls (doc 38).

## rivals_v.json

Act IV's five (display names after the renames: **Carrack Compute** for `pallas_compute`, **Lantern Arc** for
`jade_arc`; Northgate, Cratermark Resources, and Orrery Compute only if it survived Act IV, i.e. the player came from F1
or F3) plus **Ironvale Power** (new, the firm-power developer of doc 43 §12; "Basalt Power" was rejected in the clash
check). Value ($B), orbital MW and firm MW at anchor quarters, interpolated at load. 2036Q1 = the median of the four Act
IV futures' 2035Q4 values (designed paths after 2036Q2) [D]. Ironvale also carries `orderbookUnits` and
`deliveredUnits`, the SMR-wave story: 24 announced, 2 delivered (V1); 20 / 1 (V2); 6 shelved / 0 (V3); 20 / 1 (V4).
Orrery fails in V3 (2038Q3) with a 120 MW auction.

## reading_score_v.json (hidden)

Act III/IV's scoring weights unchanged. Ideal stances (doc 43 §6.7 as amended by §0.2): V1 +1 throughout; V2 +1 to
2037Q4, −1 from its trigger (2038Q1); V3 0 to 2037Q3, −1 from its trigger (2037Q4); V4 0 to 2038Q4, −1 from 2039Q1. All
weights 1. Decoy windows match the Signals files; wrong stance −1 (SMR wave) or +1 (V3's auction). The move-kind table
lists every Act V move and its sign with its source; `withdraw_position` is 0 (mine) and the exit is unscored. Added
(mine, like Act IV's M36.11): `low_exposure_quiet`: a quiet quarter counts as a match when exposure (leases + free MW +
plants) is under 15% of act5Entry.

## plants_v.json

| Rule | Value | Source |
|---|---|---|
| SMR, advanced fission | Fixed $107/kW-yr (×1.3 for a single unit at a site, fixed part only) + $9/MWh variable and fuel | Doc 45 §Q6: EIA SMR $106.92/kW-yr [A]; NEI single-unit $41.62 vs multi $29.53 [B]; doc 43 §0.4, §0.6 |
| Reactor CF | 0.80 for 8 quarters after first power, then 0.92 | Doc 40 §Q9 [A/B]; doc 43 §7.1 |
| EGS | $20/MWh all-in, fixed 0; CF 0.90 (0.60 with a weak field until $1,500/kW) | Doc 45 §Q6 [D]; doc 38 §5.2 |
| Fusion pilot | Reactor costs (mine); CF 0.30; no output before 2038Q1 | Doc 43 §7.1 [D]; honesty rule |
| Pumped storage | $18/kW-yr + $0.5/MWh; 10 h; 80% round trip; revenue = capacity price × 10-h rating + 10 h × spread × 0.80 | Doc 45 §Q5-Q6 [A/D]; doc 43 §0.4 |
| Gas CC / CT | $15/kW-yr + $2.5/MWh / $10 + $5, plus fuel: heat rate 6.4 / 9.9 MMBtu/MWh × `gas_usd_mmbtu` | Doc 45 §Q6 [A]; heat rates EIA AEO cost and performance table (6,431 and 9,905 Btu/kWh) [A] |
| Contracted share at COD | SMR, advanced fission, EGS, fusion 90%; storage 80%; pumped hydro 50%; gas 0 (mine) | Doc 45 §Q6 [B]; pumped [D] |
| Capacity ratings | Nuclear, CC, CT, 8 h, 10 h from the market columns; EGS 0.90 (as the gate, mine); fusion 0.30 (its CF, mine); iron-air the 10-h rating (mine) | Doc 45 §Q5 [A] |
| Multiples | Contracted × 10 (8 / 11 by tail) + merchant × 7.5 (by future) | Doc 45 §Q1 |
| Plant debt | Contracted (≥ 70% sold forward): ≤ 65% LTV, SOFR + 200, 15-18 y sculpted to DSCR 1.30. Merchant: ≤ 40%, SOFR + 275, 7 y, 1%/yr + 50% sweep. Lock-up < 1.15; < 1.0 for 4 q → stake ×0.5; 8 q → lenders take the plant | Doc 45 §Q2 [A/C] |
| Fund sale / contract output | Stake × value × `infra_bid_index`; up to 80% for 10-15 y at market − 10% (−5% with the trader) | Doc 43 §11.1 |
| Follow-on units | EGS $4,000/kW, 7 q; SMR unit 2 at ×0.85 of unit 1's realised cost; none for advanced fission or fusion | Doc 43 §7.4; doc 40 §Q9 [D] |
| Fire sale | Plant stakes ×0.6; sites with positions ×0.7 | Doc 43 §11.5 ⚙ |
| Clean credit | Not modelled (the game never modelled it); the cliff is a card | Doc 45 §Q8 [A/B]; mine |

## exit_v.json

Public: bid factor drawn uniformly in the future's range (doc 45 §Q7 [A/B/C]) on substream `act5_exit_bid` at 2040Q3.
Hidden: outlook factors V1 1.15, V2 1.00, V3 0.85, V4 0.95 **[D]**, read only by `act5End.ts` and the exit system.
Disclaimer text in the file and in `text_v.en.json`.

## wildcards_v.json

Two of five drawn at the boundary (stream `act5_wildcards`), each firing once at the start of a quarter drawn uniformly
in its window: Q-Day scare (2036Q3-2040Q2: BTC ×0.6 for 2 quarters, then a migration) [A/B/C basis, magnitude D];
fusion "net electric" (2038Q1-2040Q2, never before 2038) [D]; dry year (−25% hydro and pumped for 4 quarters in one
region) [D]; large-load moratorium (one region, loads > 50 MW, 2-8 quarters) [B, length D]; transformer shortage (+2 q,
40% of draws +4 q, for a year) [B/C, magnitude D].

## hires_v.json

Head of Grid Strategy ($330K/yr): upgrade bills ×0.75 and the tail's chance halved (20% → 10%; mine). Head of Power
Trading ($360K/yr): merchant sales ×1.05; contract output at market − 5%. Salaries designed inside Act IV's band.
`hire_bandwidth: 1` as the existing hire action (mine).

## text_v.en.json and epilogue_v.json

Written. Plain sentences, no em dashes, fictional names only. The intro carries the exposure line (doc 43 §0.8) with
low (< 15%) and high (≥ 40%) variants, and the "scenarios, not forecasts" sentence. The epilogue has no number after
2040; its selection rule is in the file's `_meta`.

## Data changes

- **Doc 47, 10 Oct 2026:** first version of every file above.
