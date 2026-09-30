# Act III content (source files)

Source of truth for the Act III content pack (doc 28). The game reads byte-identical copies in `src/content/`
(a test checks it) for the files listed below; the rest are not loaded yet.

## Files copied into `src/content/`

- M11.1: `market_s0–s3.csv`, `market_weekly_s0–s3.csv` (the four scenario markets).
- M11.2: `signals_s0–s3.json` (the authored Signals). The game reads only each indicator's id, label, higher_means and
  series (displayed, arrow, sharp). Their hidden fields (authoring_latent, role_in_scenario, role_tag, trigger, decoy,
  reasoning, scenario_name) are for tests and `tools/signals-oracle.ts` only.

## Removed

- M11.3: `docs/act3-content-stub/` (the M10 placeholder `act3-stub.json`) was deleted, with its copy in
  `src/content/`. Act III's 16 quarters (2027Q1–2030Q4) now come from the scenario market files.

## Data changes (every change to a delivered file is listed here)

### M11.5c, 30 Sep 2026 (the scenario event cards)

- **`events_act3.json`:** every card gained a machine-readable `"quarter"` field, right after its prose `trigger` (kept as
  it was): the first quarter written in the trigger text (`"2028Q2-Q3"` → `2028Q2`; decoy cards → the peak quarter,
  written first). Nothing else changed. The copy in `src/content/` is byte-identical.
- The game turns each card into a scripted card of Act II's engine (`src/content/act3Cards.ts`): week 2 of its quarter,
  choice ids `c1…`, an opaque engine id (the authored id names the scenario), text in `src/i18n/en.json` under that id.
- **Effect keys → engine** (`EFFECT_MAP`). A choice with any deferred key is deferred whole (it logs and does nothing):

  | key | now | note |
  | --- | --- | --- |
  | `cash` | mapped: `cash` | plain amounts only; formulas ("+revenue_this_quarter*0.02", "+backstop_amount", "+ev_stabilized*0.8", "+ppa_savings", "-project_capex*0.06", "-1500000*mw") deferred: question |
  | `legal_cost` | mapped: cash cost | |
  | `delay_quarters` | mapped: `delay_marginal_project` (positive) | negative (a speed-up) deferred: step 5 |
  | `debt_spread_bps` | mapped: `debt_spread_add` | new equipment loans and DDTLs, from then on |
  | `credit_notch` | mapped: `credit_notch` | for 2 quarters, as Act II's cards |
  | `bandwidth` | mapped: `bandwidth_next` | cards play in the live quarter |
  | `rent_index`, `term`, `term_years`, `term_add_years`, `walk_prob`, `tenant_walk_chance`, `tenant_revenue_mult`, `tenant_slots`, `rfp_weeks`, `recovery` | deferred | step 4 |
  | `retrofit`, `gpu_rack`, `capex_mw`, `capex_mult`, `gpu_resale_mult`, `mw` | deferred | step 5 |
  | `power_option`, `pc_cost`, `hire`, `ratepayer_anger` | deferred | step 6 (the engine has no Anger nudge) |
  | `idle_mw`, `mining_revenue_mult`, `debt`, `debt_reduce`, `debt_maturity_years`, `reveals` | deferred | question (see dev-notes) |

### M11.5a, 29 Sep 2026 (design thread's answer to the M11.4c question on the BTC hashprice seam)

- **`market_weekly_s0–s3.csv` › `btc_hashprice_usd_ph_day` and `btc_hashprice_usd_th_day`, and `market_s0–s3.csv` ›
  `btc_hashprice_usd_ph_day`** were rebased with one constant per scenario, `k = Act II's last weekly hashprice ÷ that
  scenario's first weekly hashprice`, applied to all 16 quarters and 208 weeks (ph rounded to 2 decimals in the weekly files
  and 1 in the quarterly ones, th to 4). Act II's last week is $43.68/PH/day ($0.0437/TH/day); doc 28 assumed it ended near
  $48.6 (the known F-10 Act II data quirk: Act II's data is not changed). Every scenario now opens on $43.68.

  | scenario | first weekly ph before | k |
  | --- | --- | --- |
  | s0 | 49.85 | 0.87623 |
  | s1 | 48.99 | 0.89161 |
  | s2 | 50.35 | 0.86753 |
  | s3 | 47.87 | 0.91247 |

- **`signals_s0–s3.json` › `bitcoin_hashprice`:** the dollar figures in the 16 sharp notes ("about $N/PH/day") were scaled by
  the same k, rounded to whole dollars (e.g. s0 2027Q1 $50 → $44), and the `higher_means` text now reads "50 = 2026Q4
  $44/PH/day pre-halving, $21.9 post-halving" in all four files (one common rounded figure: Act II's $43.7 and half of it).
  Displayed values and sharp low/high are relative (0–100) and did not change.
- The game's copies in `src/content/` (CSV, JSON and the signals files) are byte-identical.
- Not rebased, as the design thread decided: `gpu_h200_hyperscaler_usd_hr` (+18% to +26% across the seam) and
  `hyperscaler_capex_usd_bn_q` (+11% to +15%). The game never reads either for a price it pays or earns (a test checks it).

### M11.4a, 29 Sep 2026 (design thread's decision DT 1: rebase the valuation multiples at the boundary)

- **`market_s0–s3.csv` › `ai_infra_ev_ebitda_mult` and `mining_ev_ebitda_mult`** started at 20.5–21× (AI) and 4.8–5.3× (mining),
  marked "designed", not anchored to Act II's 2026Q4 anchors (AI 15×, mining 5×; `capital_act2.json › era_multiple_ev_ebitda`). Left as
  they were, every AI company would re-rate by about +37% at the boundary with no event. Each scenario's whole column is rescaled,
  keeping its shape: `new = old × anchor / (that scenario's 2027Q1 value)`, rounded to 1 decimal. Anchors: AI 15, mining 5. No other
  column was changed. The copies in `src/content/` (CSV and JSON) match.
- 2027Q1 is now AI 15.0 and mining 5.0 in all four scenarios. Before → after (AI / mining):

  | scenario | 2027Q1 | trigger quarter | 2030Q4 |
  | --- | --- | --- | --- |
  | s0 | 20.5/5.0 → 15.0/5.0 | 2028Q2: 19.5/4.6 → 14.3/4.6 | 21.0/4.8 → 15.4/4.8 |
  | s1 | 20.5/4.8 → 15.0/5.0 | 2028Q1: 13.0/3.0 → 9.5/3.1 | 15.0/3.7 → 11.0/3.9 |
  | s2 | 21.0/5.3 → 15.0/5.0 | 2028Q3: 33.0/7.8 → 23.6/7.4 | 36.0/8.5 → 25.7/8.0 |
  | s3 | 21.0/5.0 → 15.0/5.0 | 2027Q4: 19.0/4.8 → 13.6/4.8 | 24.0/5.2 → 17.1/5.2 |

### M11.2, 29 Sep 2026

- **`signals_s0–s3.json` › `trigger.card_id`** named cards that do not exist in `events_act3.json`. Corrected to the
  trigger card of the same scenario:
  - s0: `s0_04_digestion_quarter` → `s0_c3`
  - s1: `s1_04_round_didnt_close` → `s1_c3`
  - s2: `s2_04_compute_is_strategic` → `s2_c3`
  - s3: `s3_03_open_weights_week` → `s3_c3`

  Nothing else in these files was changed.
