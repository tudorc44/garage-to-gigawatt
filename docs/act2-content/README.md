# Act II content (fixed copies)

The originals are in `docs/game-project-files/claude_act2-content_*` (the design thread's snapshot, left untouched).
Files here are the corrected versions that the Act II build should read: the two market files, and the JSON files
changed by the Alpha 0.2 scope's content fixes (§7, below), copied under short names (e.g. `claude_act2-content_tenants.json`
→ `tenants.json`). Any Act II file not here (regions, sites, rivals, Merge head starts) is used as it is in
`docs/game-project-files/`.

**Note for the future market loader:** 2024Q3 has 14 weeks. If the loader trims it to 13 (as Act I does), drop one of
the earlier weeks and **keep the last week**: it carries the real quarter close (BTC and ETH), which
`market_quarterly.csv` repeats.

## Owner decisions of 27 Sep 2026 (after milestone M2)

- **B6: `market_quarterly.csv` has no multiple columns any more.** `mining_ev_ebitda_mult` and `ai_infra_ev_ebitda_mult`
  were deleted (they still had the pack's old 2026 AI values, 24 and 20). **`capital_act2.json` is the only source for
  multiples.** Every other column and value is unchanged.
- **B5: `capital_act2.json` › `era_multiple_ev_ebitda.mining`** has explicit 2026 anchors: Q1 6, Q2 6, Q3 6, Q4 5 (doc 18
  §8's table), so the file and the design doc agree.
- The game's copies in `src/content/` (`market_quarterly_act2.csv`, `capital_act2.json`, `conversions.json`,
  `tenants.json`) are byte-for-byte these files; a test checks it.

## Owner decisions of 27 Sep 2026 (after milestone M3)

- **H200 rental = H100 × 1.20.** `gpu_h200_hyperscaler_usd_hr` and `gpu_h200_neocloud_usd_hr` (2024Q3–2026Q4) are now
  the same quarter's H100 column × 1.20 (e.g. 2024Q3 neocloud $3.50 → H200 $4.20, was $6.00). The pack's H200 rents
  were 1.4–1.9× the H100's; the owner set the H200 premium at 20%. Purchase prices unchanged.

## Owner decisions of 28 Sep 2026 (the M5 answers)

- **`capital_act2.json` › `backlog_weight_pct_of_remaining_revenue`:** A/AA 15 → 20 (25 was tried and cut back, because
  announced AI went above the $3–12M/MW band), BBB 10 → 15, AI lab 5 → 8. The backstopped weight (20%) is in
  `src/content/balance.ts`.
- **`tenants.json` › `tc_realname_coreweave_style` › `capex_credit_cap_usd_mw`:** 1,500,000 → 2,000,000.

## market_weekly.csv / market_quarterly.csv: fixes of 27 Sep 2026

The six BTC columns changed and an `eth_usd` column was added (see the ETH section below) (`btc_usd`, `btc_difficulty_T`, `btc_hashrate_EHs`, `btc_block_subsidy`,
`btc_hashprice_usd_th_day`, `btc_hashprice_usd_ph_day`). ASIC, GPU, financing, power and demand columns are as in the pack.

1. **Hashprice now follows from its inputs, the same way as Act I.** The sim pays miners straight from
   `btc_hashprice_usd_th_day`, and in the pack that column was a separate hand-drawn curve that ignored price,
   difficulty and the halving (e.g. $66.65/PH/day the week before the halving, $65.72 after). Now:
   - hashrate (EH/s) = difficulty (T) × 2^32 / 600 / 10^6
   - hashprice ($/TH/day) = BTC × 144 × block subsidy / (1 − fee share) / hashrate (TH/s)
2. **Hashrate is derived from difficulty.** The pack's 2026 hashrate used a one-day spike reading (1.43 ZH/s),
   which doesn't match its own 152T difficulty (≈ 1.09 ZH/s).
3. **The halving moves to 20 Apr 2024.** Subsidy 6.25 through the week of 15 Apr, 3.125 from the week of 22 Apr
   (the first mostly post-halving week). The pack switched on 1 Apr.
4. **Oct–Dec 2022 is rebuilt** (≈ estimates of real weekly levels, marked estimate). The pack filled the whole quarter with the
   post-FTX price, so Act II opened $3k below Act I's last week and the FTX crash (8–9 Nov) was missing. Difficulty
   follows the real Q4 2022 adjustments (35.61T 10 Oct, 36.84T 24 Oct, 34.09T 21 Nov, 35.4T by year end).
5. **Each quarter's last week equals the sourced quarter close** in `market_quarterly.csv`. The weekly path was
   off by 1–3%; the gap is closed by a correction that ramps linearly across the quarter, so there are no jumps.
6. **market_quarterly.csv BTC columns** (difficulty, hashrate, subsidy, hashprice) now equal the quarter's last week.

## market_quarterly.csv: real SOFR and high-yield spread (M22, 5 Oct 2026, design thread)

`sofr_pct` (FRED `SOFR`, 2022Q4–2026Q3) and `hy_spread_bps` (FRED `BAMLH0A0HYM2`, 2023Q4–2026Q3) are now quarterly
averages of FRED's daily data, written by `tools/data/real-market.ts` from the raw downloads in `tools/data/raw/` (no
hand edits; both copies byte-identical). New columns `sofr_estimate` and `hy_spread_estimate` flag, per row, which values
are still estimates (SOFR 2026Q4; HY 2022Q4–2023Q3 and 2026Q4). The DDTL spread and the ASIC tiers stay estimates.
Sources, transform and the refresh commands: `tools/data/README.md`; doc 18 §15 items 1 and 3.

## ETH price series (added 27 Sep 2026, owner decision)

The pack had no ETH price after 2022Q3, but the ETH treasury and ETH-backed loans carry into Act II "as is" (doc 18 §2.1).
`eth_usd` is now in `market_weekly.csv` (after `btc_usd`, same position as Act I) and `eth_usd_close` in `market_quarterly.csv`.

- **Source:** month-end closes Oct 2022 → Aug 2026 from Yahoo Finance ETH-USD monthly history, each cross-checked against
  CoinLore (all within 0.3%, except Aug 2024: Yahoo $2,513 vs CoinLore $2,494; Yahoo used). Sep 2026 = 26 Sep close $2,690
  (Investing.com).
- **Dated extremes** shape the big weeks: pre-FTX high (5 Nov 2022, date approximate), FTX low (9 Nov 2022), yen-carry crash
  (5 Aug 2024), tariff low (9 Apr 2025), all-time high (24 Aug 2025), the 10/10 crash (11 Oct 2025), the Feb 2026 low
  (5 Feb) and the Jun 2026 low (6 Jun), plus the 21 Sep 2026 high. Intraday extremes enter at half weight (log-midpoint with
  the path drawn from month-end closes) to approximate a daily close.
- **Weekly value** = the average of the daily path over the week (Mon–Sun, log scale). Each quarter's last week = the real
  quarter-end close, as for BTC.
- **Act boundary:** Act I's last week $1,366 → Act II's first week $1,393 (+2%).
- **After 26 Sep 2026** (the 2026Q3 label week and all of 2026Q4): estimate, following the BTC path (same weekly % moves).
- Largest weekly moves: −17% (FTX week), −15% (Aug 2024), −16% (Feb 2026).

## Checks
- Every weekly row satisfies the hashprice formula; Act I (2022-09-26) → Act II (2022-10-03): $19.5k → $19.7k,
  hashprice $78.9 → $80.2.
- Halving: $108/PH/day (week of 15 Apr 2024) → $53.7 (week of 22 Apr). Post-halving low $48 (Jun 2024), matching the
  pack's sourced "< $50".
- Late-2025 low $37.4 against the pack's sourced $38.20 (Nov 2025).
- Largest weekly move: −17% in the FTX week, as intended.

## Still open
- **Dec 2023 hashprice is low** ($82 at quarter end vs roughly $100 in reality): `btc_fee_share` peaks at 10%, while real
  Ordinals-era fees were higher. Raising it needs a sourced weekly fee series.
- **2026 hashprice is now $38–41** (the pack's curve said $46–50, unsourced). It's consistent with the pack's own
  price and difficulty, and with its miner-capitulation story, but it's lower pay for miners.
- The pack's own follow-ups still stand: ASIC $/TH index and FRED-verified SOFR/credit spreads.

## JSON content fixes (Alpha 0.2 scope v1.0 §7, 27 Sep 2026)

Each change is also marked inside the file (a `fix`, `source`, `note` or `scope_note` field that names the scope section),
and the existing text is otherwise left as the pack wrote it.

- **`capital_act2.json`** › `era_multiple_ev_ebitda.ai_infra`: 2026 path 24 → 20 → 18 → 15 (2026Q1–Q4). The pack had 2026Q3 24,
  2026Q4 20 and no Q1/Q2 anchors.
- **`gpus.json`:**
  - `gpus_per_mw_it_load` for H100 and H200 1,000 → **750** (the all-in ~1.2–1.4 kW per GPU).
  - Every generation has `in_alpha_0_2`: true for H100, H200, B200 and GB200 NVL72; **false for the A100** (not buyable) and
    **GB300 NVL72** (Act III), each with a `scope_note`.
- **`tenants.json`** › `take_or_pay_terms` [P1]:
  - The late penalty is **3%** of annual contract value per late quarter (was a 1–3% range).
  - `termination_chance_at_2q_late` 0.50 is replaced by **`walk_chance_late_2q`** per tenant type: hyperscaler 0.05,
    neocloud 0.10, AI lab 0.20 (the same values already in `tenant_types`).
- **`conversions.json`:**
  - New **`mining_to_hosting_same_site`** [P2]: $100K/MW, 0 build quarters (ready next quarter).
  - The pack's `mining_to_hosting` is **renamed `gpu_hall_to_hosting`** (id and label; its $1.5–3M/MW is for GPU halls).
  - New **`pilot_cluster`** tier [P3], with the owner's decision of 27 Sep 2026:
    - 0.5–2 MW in 0.5 MW steps, spot-only (no tenant slot), from 2023Q1, 1 quarter build plus the GPU allocation queue.
    - 750 H100s per MW; capex = 750 × the H100 price + the shell retrofit cost of that quarter.
    - Financed by the equipment loan on the GPUs.
    - Revenue = the H100 **neocloud** price × utilisation: 70%, +5 points at know-how 2, +10 at 3.
- **`lenders.json`** › `credit_rating_mapping` [P4]:
  - The > 6× weak-backlog cell "D (foreclosure)" → **CCC−**.
  - Added `corporate_rating_range` (CCC− to BBB), `project_debt_can_rate_a`, `runway_notch` (runway under 4 quarters → −1
    notch) and `never_forecloses`.
- **`interrupts_act2.json`** › `construction_delay` [P5]:
  - **15%** per building project per quarter (was 30–50%).
  - Structured choices: accelerate = 10% of capex, no slip; accept the slip (+1 quarter, the default); change contractor =
    −1 BW next quarter, then 50% no slip.
  - `when_cap_full`: resolves silently as accept the slip, logged.
- **`events_act2.json`:**
  - `ec13_deepseek_wobble` gets a third choice, **Buy the dip** (`gpu_price_mult_next_plan` 0.9, `bandwidth` −1), and a
    scripted `market_effect` (AI demand −10, AI multiple −3, 2 quarters).
  - The `deepseek_shock` timeline entry's effect matches (it said "growth pauses for 1 quarter"), with a `game_effect` block.
- **`hires_act2.json`:** every hire has `in_alpha_0_2`. The **Government Affairs Lead is false** (Act III, kept in the file,
  not loaded); the other 7 are true.
- **`text_act2_en.json`:**
  - `tt03` now says "CCC to BBB" and "Act I had no such meter".
  - New tooltip **`tt07_pilot_cluster`**.
  - **10 more ticker headlines** (35 in all, marked `"added"`). Every quarter now has at least one, including 2026Q4.
  - The new headlines follow the pack's style (real events, no company names): Nvidia's May 2023 guidance, the Jul 2023 rate
    peak, the H200 announcement, Core Scientific leaving Chapter 11, the Aug 2024 yen unwind, the Apr 2025 tariff low,
    ETH's Aug 2025 high, the Feb 2026 hashrate peak, the Sep 2026 hike, and a speculative 2026Q4 aftershock line.

### M8.4 (GPU failure wave, 29 Sep 2026)
- **`interrupts_act2.json` › `updated_interrupts` › `gpu_failure_wave`:** `chance_pct` null → 10 (mine, from the pack's "random"),
  plus `min_gpus` 10,000, `failed_share_range` [0.005, 0.01], `replace_cost_usd_per_gpu` 30,000, `sla_credit_mult` 2 and a
  `game_note`. The game copy in `src/content/` is identical.

### Open points found while applying the fixes
- **Pilot cost:** the pack's own prices give **$30.75M/MW** in 2023Q3 (750 × $32,000 + $6.75M retrofit) and $30.25M in 2023Q4,
  just under the scope's $31–33M. Recorded in `pilot_cluster.capex_usd_mw.check_note`; not forced to match.
- **The pilot opens in 2023Q1, but `gpus.json` has no H100 price before 2023Q3** (and the neocloud rental series also starts
  in 2023Q3). The loader needs a rule (e.g. hold the 2023Q3 values earlier) or the data a 2023Q1–Q2 anchor.
- **GB200 NVL72 has no `gpus_per_mw_it_load`** (the pack prices it per rack: 72 GPUs, ~120 kW). Its per-MW figures will need
  deriving from `kw_per_rack` or adding.
- **Tooltips:** the scope lists 6 (MW uses, projects, credit rating, backlog, tenants, pilot). The file now has 7 (the pack's
  `tt06_regions` kept). `tt01` says "Nothing builds until all three are filled", which the pilot (no tenant slot) is an
  exception to.
