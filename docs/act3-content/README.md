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
