# Real market data (M22, 5 Oct 2026)

Act II's quarterly market (`src/content/market_quarterly_act2.csv` and its byte-identical copy
`docs/act2-content/market_quarterly.csv`) takes SOFR and the high-yield spread from FRED instead of estimates. The
transform is a script over the committed raw downloads, so anyone can reproduce it; nobody edits the CSV by hand.

## Re-run

```bash
npm run data:real        # tools/data/real-market.ts: raw/ → both CSV copies
npm run content:market   # CSV → market_quarterly_act2.json (what the game imports)
```

## Refresh the raw downloads (only when updating the data)

```bash
curl -sS -o tools/data/raw/fred_SOFR.csv "https://fred.stlouisfed.org/graph/fredgraph.csv?id=SOFR"
curl -sS -o tools/data/raw/fred_BAMLH0A0HYM2.csv "https://fred.stlouisfed.org/graph/fredgraph.csv?id=BAMLH0A0HYM2"
```

## Sources and transforms

| Column | Source | Series ID | Retrieved | Transform | Real for |
|---|---|---|---|---|---|
| `sofr_pct` | FRED (NY Fed SOFR) | `SOFR` | 5 Oct 2026 (last obs. 2026-10-01) | quarterly average of the daily %, 2 dp | 2022Q4–2026Q3 |
| `hy_spread_bps` | FRED (ICE BofA US High Yield OAS) | `BAMLH0A0HYM2` | 5 Oct 2026 (last obs. 2026-10-01) | quarterly average × 100, whole bps | 2023Q4–2026Q3 |

- A quarter is real only if the download covers all of it: an observation within its first 7 days and one within
  its last 7 days. FRED shows only the last 3 years of `BAMLH0A0HYM2` (a licensed ICE series), so its history starts at
  2023-10-03. Days FRED leaves empty (holidays) are skipped.
- Each row's `sofr_estimate` / `hy_spread_estimate` is `False` where the value is real, `True` where it is still the
  estimate. The row's `estimate` stays `True` while any column in the row is an estimate.
- **Carry-forward (M23.1, SOFR only):** a quarter the download doesn't fully cover, but in which it has an observation,
  takes the last observed value: SOFR 2026Q4 = 3.87% (2026-10-01). It stays flagged `sofr_estimate = True`. The HY spread's
  uncovered quarters keep their original estimates.

## Still estimated

- **The DDTL spread** (`ddtl_spread_bps`): no public series.
- **The ASIC $/TH tiers** (`asic_price_usd_th_old/mid/new/latest`, weekly file): Luxor's Hashrate Index ASIC Price Index is
  behind its Premium tier and paid data API (checked 5 Oct 2026), so no free download exists; no workaround was tried.
  The mapping, if a licence is obtained: its efficiency bands > 38 J/TH, 25–38, 19–25, < 19 → old / mid / new / latest.
- **Any quarter after the last complete real quarter** (2026Q4 for both series: SOFR as the carried-forward last
  observation, the HY spread as the original estimate), and every Act III scenario series (2027 and later: forecasts by design).
