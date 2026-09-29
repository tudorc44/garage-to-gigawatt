# Act III content (source files)

Source of truth for the Act III content pack (doc 28). The game reads byte-identical copies in `src/content/`
(a test checks it) for the files listed below; the rest are not loaded yet.

## Files copied into `src/content/`

- M11.1: `market_s0–s3.csv`, `market_weekly_s0–s3.csv` (the four scenario markets).
- M11.2: `signals_s0–s3.json` (the authored Signals). The game reads only each indicator's id, label, higher_means and
  series (displayed, arrow, sharp). Their hidden fields (authoring_latent, role_in_scenario, role_tag, trigger, decoy,
  reasoning, scenario_name) are for tests and `tools/signals-oracle.ts` only.

## Data changes (every change to a delivered file is listed here)

### M11.2, 29 Sep 2026

- **`signals_s0–s3.json` › `trigger.card_id`** named cards that do not exist in `events_act3.json`. Corrected to the
  trigger card of the same scenario:
  - s0: `s0_04_digestion_quarter` → `s0_c3`
  - s1: `s1_04_round_didnt_close` → `s1_c3`
  - s2: `s2_04_compute_is_strategic` → `s2_c3`
  - s3: `s3_03_open_weights_week` → `s3_c3`

  Nothing else in these files was changed.
