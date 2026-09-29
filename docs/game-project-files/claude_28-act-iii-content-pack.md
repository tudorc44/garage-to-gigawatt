# Act III Content Pack — "Reckoning" (2027Q1–2030Q4)

Companion to doc 27 (frozen). All files are in `claude/act3-content/`. Every data value carries `grounded: true|false` (source or one-line reasoning). Quarter = `2027Q1`; weeks = ISO Mondays; nominal USD.

## 0. Executive summary

- **Delivered:** 4 scenario market files (quarterly + weekly), 4 Signals files with sharp ranges, decoy and trigger, 37 event cards (8 per scenario + 5 shared), 5 rivals × 4 scenarios, renewal examples, GPU/nuclear/political-capital/wildcard/preset/text files, a stylized balance check.
- **Honest grounding level:** only the 2026Q4 hand-off (from Act II), the April 2028 halving, and public announcements (NVIDIA roadmap, Constellation/Meta/Microsoft nuclear PPAs) are grounded. Everything 2027+ is designed scenario content. **No new web research was run in this pass; external facts are from public announcements I know of and were not re-fetched (flag F-9).**
- **Balance anchors:** 6 of 7 pass in the stylized model; the decoy anchor passes only thinly (§L). Three anchors need mechanics beyond doc 27 (flags F-1, F-2, F-3).
- **Continuity:** hashprice formula calibrated to Act II's last week (48.64); first-week BTC seam-checked (<3% step).

## A. Market files
`market_s0..s3.csv` (16 quarters) and `market_weekly_s0..s3.csv` (208 weeks). Columns = Act II columns plus scenario/phase, Rubin & Rubin Ultra rents and rack prices, newest-gen lead time, mid→top retrofit cost, nuclear PPA $/MWh, renewal shell/GPU indices, new-RFP index, offered terms, tenant default and walk probabilities. Provenance in `market_provenance.json`.

| Scenario | Trigger | Shape (quarterly) |
|---|---|---|
| S0 Muddle Through (25%) | 2028Q2 | H100 1yr 2.28→1.47; cap 6.15→5.50; hashprice 54.5→30.2 at halving |
| S1 Great Repricing (30%) | 2028Q1 | Cap 6.2→8.5; DDTL 480→1050bp; H100 spot 1.90→0.56; BTC →43k |
| S2 Lift-Off (25%) | 2028Q3 | Cap→4.75; H100 spot →3.38; PJM capacity 333→850; BTC →176k |
| S3 Efficiency Shock (20%) | 2027Q4 | H100 1yr −31%; AI demand 96→68 then rebound |

## B. Signals
`signals_s*.json`: `indicators` with authored displayed value, arrow, role tag and a sharp range per quarter, plus `decoy` and `trigger` blocks. Latent-vs-displayed noise is ~2 points. The file is authored; the "read the market" action must read only `sharp`, never the market CSV.

| Scenario | Leading signals | Decoy (indicator, window, peak) | Trigger card |
|---|---|---|---|
| S0 | mild Revenue Gap, softer lead times | Lender Spreads, 2027Q3–2028Q1, peak 2027Q4 | The Digestion Quarter |
| S1 | Revenue Gap →88, Lender Spreads →94 | Chip Lead Times, 2027Q2–Q4 | The Round That Didn't Close |
| S2 | Grid Margin →14, Lead Times →89, Revenue Gap →20 | Efficiency Index, 2027Q3–2028Q2, peak 2028Q1 | Compute Is Strategic |
| S3 | Efficiency →96, Lead Times →23 | Grid Reserve Margin, 2027Q2–2028Q1, peak 2027Q3 | Open-Weights Week |

## C. Event cards
`events_act3.json` — same card format as Act II plus `scenario`, `role` (signal/decoy/trigger/aftermath/winner/recovery/flavour), `grounded`, `d15_review`. Every scenario has a trigger card (id matches `signals_*.json`), a decoy card, and ≥1 winner card (S1 has two; S0's is deliberately gentle). All bodies ≤60 words (max 33).

## D. Rivals
`rivals_act3.json`: CoreWeave, Core Scientific, IREN, Hut 8, Cipher × 4 scenarios × 16 quarters (MW energized, AI-contracted, revenue, EBITDA, market cap, debt) plus a scripted fate line each. Base = Act II 2026Q3 anchor + one quarter of trend (Act II rivals data ends 2026Q3, F-4). **S1 fates for Core Scientific and CoreWeave are negative and flagged `d15_review` — they are illustrative game outcomes, not forecasts, and need editorial/legal review before shipping.**

## E. Renewal worked examples
`renewals_examples.md` — 3 per scenario, computed from the CSVs (e.g. S1 anchor lease 50 MW: $75M → $39–45M/yr, 4-yr term, 10% quarterly default, 40% walk; S2 hyperscaler 100 MW: $150M → $150–165M, ~11-yr term).

## F. GPUs / density — `gpus_act3.json`
Hopper 40–60 kW low tier, Blackwell ~125 kW and Rubin NVL144 treated as mid tier, Rubin Ultra 600 kW top tier (from 2027Q3), Feynman flavour only, low→mid retrofit $1.5M/MW/10 weeks, mid→top retrofit per-quarter from the CSV, 26 weeks. Note real Rubin NVL144 density is >190 kW; compressed to mid for gameplay (F-3).

## G. Nuclear PPA — `nuclear.json`
From 2027Q3, 15-yr fixed, no queue, take-or-pay, $98–165/MWh by scenario, restricted to PJM/Ohio/Georgia/Nordics (F-8). Best in S2, a burden for leveraged players in S1, strandable if oversized in S3.

## H. Political capital — `political_capital.json`
Meter 0–100, start 40, decay −2/q. Hire (Government Affairs Director, +3/q), 4 lobbying actions, 6 spend cards, low-capital penalty below 15.

## I. Wildcards — `wildcards.json`
Grid emergency, chip export rule, local moratorium, anchor AI lab restructures (fictional lab; `d15_review`).

## J. Presets — `presets_act3.json`
Good (~$1B), Great (~$5B), Lifeline (~$150M). Good survives all four scenarios in §L (min 0.53× equity, no forced sale).

## K. Text — `text_act3.en.json`
5 title bands, reading-score wording, 16 glossary terms, 20 headlines (5 per scenario).

## L. Balance-anchor check (stylized; `balance_check_results.json`)
Stylized 100 MW portfolio; equity multiple at 2030Q4 vs 2027Q1 (designed constants, so it demonstrates direction, not calibrated magnitudes).

| Archetype | S0 | S1 | S2 | S3 |
|---|---|---|---|---|
| Ignorer (60% LTV, single tenant, all expiring at wall) | 0.93 | **−0.31** | 1.90 | 0.69 |
| Hedged (40% LTV, ladder, flex/PPA/pre-trigger MW) | 1.07 | 0.46 | **2.24** | 0.97 |
| Passive (ladder, ignores panel) | 1.07 | 0.46 | 1.70 | 0.91 |
| Decoy over-reactor | 1.05 | 0.44 | 1.69 | 0.96 |
| Long-locked | 1.07 | 0.46 | 1.70 | 0.91 |
| Flexible | 1.07 | 0.46 | 1.70 | 0.97 |
| Good preset | 1.09 | 0.53 | 1.67 | 1.00 |

Results:
1. Hedged beats ignorer in all four (S0 by 0.14, S1 by 0.77, S2 by 0.34, S3 by 0.28). ✔ — but S1 hedged still loses 54% of equity; "forgiving" is arguable (F-7).
2. S1: leveraged/single-tenant/no-backstop goes negative with forced sale. ✔
3. S2: pre-trigger MW + lock (2.24) beats passive (1.70). ✔ Requires F-2.
4. S3: flexible 0.97 ≥ long-locked 0.91. ✔ Only with a reopener clause (F-2).
5. S0: worst case 0.93, nobody punished. ✔
6. Decoy: over-reactor < passive in S0, S1, S2 but by ≤0.02 (3%); it wins in S3. ✔ thin — increase decoy-reaction costs or make the card's "act" option costlier.
7. Good preset survives all four. ✔ (at 35% LTV; Act II's accepted good path is $412M, F-6).

## M. Design flags (doc 27 not changed)
- **F-1** Frozen GPU renewal bands are anchored to 2025Q4, but Act II 2026Q4 rents are already above that; S0/S2 pre-reset indices exceed 1 (H100 1.17, B200 up to 1.38). Fix: key the band to the tenant's own contract rate.
- **F-2** S2 matrix "locked ★★" conflicts with the anchor "pre-trigger contracts more valuable". Fix: incumbent renewal cap (1.00–1.10) plus a separate new-RFP index (up to ~1.32) and/or escalators. S3 anchor needs a market-reopener clause; without it, locked wins.
- **F-3** Rubin NVL144 density compression (real >190 kW vs "mid" ~130 kW).
- **F-4** Act II rivals data ends 2026Q3; I extrapolated one quarter for the hand-off.
- **F-5** Base shell rent $1.5M/MW-yr is a designed proxy; confirm against Act II tenants.json before wiring.
- **F-6** Good preset ~$1B vs Act II accepted good path $412M.
- **F-7** S1 hedged still −54% equity; consider a stronger hedge instrument (backstop/cash reserve) so hedged is clearly forgiving.
- **F-8** Nuclear region restriction is a design choice.
- **F-9** No fresh web research this pass.
- **F-10** Act II inconsistencies: hashprice vs hashrate/price; quarterly 88,000 vs weekly 85,890 BTC.

## N. Assumptions
Ambiguities resolved without asking: 16 quarters q0=2027Q1; trigger q s0=5, s1=4, s2=6, s3=3; hashprice K=0.17249; normalized halving; ISO weeks; weekly GPU series glide linearly within quarter; scenario ids s0–s3; real company names only in rival/event data.

## O. Sources
Project docs: 27, 08, 20, and `act2-content/` market, gpus, regions, rivals, tenants, capital, events, hires, lenders, text, conversions. Public announcements (not re-fetched): NVIDIA GTC 2025 roadmap (Rubin, Rubin Ultra/Kyber 600 kW); Constellation–Microsoft Crane (2024-09-20); Constellation–Meta Clinton (2025-06); Talen–Amazon Susquehanna (2025-06); Google backstop of Fluidstack/Cipher (2025-09-25, via Act II); Oracle force majeure (2026-09-25, via Act II).

## P. JSON schema sketches
- market CSV: `quarter,...Act II cols...,scenario,phase,gpu_rubin_*,rubin_*_rack_usd,newest_gen_lead_time_weeks,capex_retrofit_density_mid_to_top_usd_mw,nuclear_ppa_usd_mwh,renewal_*,rfp_*,tenant_*`
- signals: `{scenario, baseline, neutral_tolerance, trigger{quarter,title,card_id,...}, decoy{indicator,quarters,peak_quarter,reason,...}, indicators{name:{quarters:[{displayed,arrow,role_tag,sharp{low,high,note}}]}}}`
- events: `{id, scenario, trigger, role, title, body, choices[{label,effect}], default, basis, grounded, d15_review}`
- rivals: `{scenarios:{sid:{rival_id:{mw_energized{q:v}, ..., fate, d15_review}}}}`

## Q. Completeness
| Item | Status | Note |
|---|---|---|
| A market | done | provenance coarse (per-column) |
| B signals | done | |
| C events | done | 8/scenario incl. trigger/decoy/winner |
| D rivals | done | all cells estimates; S1 fates flagged |
| E renewals | done | 3 per scenario, computed |
| F gpus | done | Feynman flavour only |
| G nuclear | done | |
| H political capital | done | 1 hire, 4 actions, 6 cards |
| I wildcards | done | 4 |
| J presets | done | balance-checked stylized |
| K text | done | |
| balance check | partial | stylized, not the real sim |
| sources | partial | no fresh web research (F-9) |
