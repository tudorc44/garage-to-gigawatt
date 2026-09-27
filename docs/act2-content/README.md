# Act II content (fixed copies)

The originals are in `docs/game-project-files/claude_act2-content_*` (the design thread's snapshot, left untouched).
Files here are the corrected versions that the Act II build should read. So far only the two market files are here.

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
