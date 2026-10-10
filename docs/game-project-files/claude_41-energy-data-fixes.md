# 41: Energy data fixes from doc 40 (design thread, 10 Oct 2026)

M38 - Energy data fixes from doc 40 (the second research pass). Mostly values, with a few small rule changes where the old shape was wrong. Run in one go after the items already queued, one commit per step, one report at the end. (DT) = design thread's call, the owner can overrule. Source for every number: docs/game-project-files/claude_40-second-research-pass.md (doc 40; it calls doc 38's gap list "§8").

WHY: doc 38's energy values were designed before the research came back. Doc 40 checked them. Five matter for play: the Texas credit, the hydro tariffs, 4CP, Iceland's 2018 freeze, and the PJM battery credit.

INVARIANTS: any golden or `npm run sim` output that never touches an energy option stays byte-identical (if one changes, explain why before going on). Energy goldens (act4-energy-f2/f4 and any others) and the `--energy` CSVs change: list their diffs. Tests green. Main bundle under 500 KB. If M37's book() is in place, new money lines use the categories given below.

## M38.1 - Texas (texasPower.ts, energy.json `texas`)
- Finding: the live game has no resale line. Doc 40 assumed the game already paid "spot − PPA" on curtailed power, so cutting the credit alone would under-pay Texas. Fix (DT): split the one credit into two.
  - Demand response (DR): $8K / $18K / $30K per MW-yr (mild / normal / hot), on curtailable MW, as now. Book it as grid_credits.
  - Power resale, for sites on a fixed-price contract only: $10K / $30K / $75K per MW-yr (mild / normal / hot), paid at the same time. Book it as energy_income. Hot is from Riot's 2023 resale ($52.6M ÷ 700 MW, [A] → [D]); mild and normal are designed.
  - The totals (18 / 48 / 105K) stay close to the old 15 / 40 / 100K. The change is mostly the labelling, plus the rule that only fixed-price sites earn the resale.
- 4CP: replace "next year's power × 0.9" with a flat saving on enrolled MW: $50K per MW-yr for 2020-25 and $60K from 2026 [B/C]. Take it off the next year's power cost, a quarter of it each quarter (book it as a negative power cost). Keep the −1.5% Q3 output.
- Backlash: trigger when DR + resale exceeds $30M in one payment (was $50M a year). Keep Heat +5 and Anger +5.
- The AI-hall battery rule and the refusal forfeit stay as they are.

## M38.2 - Hydro sites (special_sites, queues.hydro)
Give each kind its own timeline. Replace the shared draw.
- PUD county (modelled on Grant): 2.6¢ for 2017-2019Q1 [A]. Moratorium on new PUD sites 2018Q1-2019Q1, fixed (was a 4-6 quarter draw). Crypto tariff from 2019Q2: the rate rises in a straight line to × U(2.5, 3.0), over U{8..12} quarters (seeded draws). It applies to existing PUD load too, with no wait for a renewal [A]. Remove tariff_new_load_mult and tariff_existing_mult.
- Upstate muni: 2.0¢ industrial until 2017Q4 (4.5¢ was the residential rate) [B]. No new muni sites for 6 quarters from 2018Q1. From 2018Q1, every muni site pays max(2.0¢, the price a normal warehouse pays that quarter), i.e. the overage at market price [B].
- Québec: sites taken before 2018Q2 keep 4.5¢ for good (grandfathered; still a proxy, since Rate LG wasn't found). No new Québec sites 2018Q2-2019Q3: the 15¢ deterrent rate closed the door in practice [A]. From 2019Q4, new Québec sites at 4.5¢, with 300 hours a year of curtailment (−3.4% output) [A]. Nothing new after 2022Q3 (already the case).
- The queue's one allocation a quarter and the 2017Q4 flood stay.

## M38.3 - Iceland (special_sites.iceland, queues.iceland)
- The price is locked when the site is taken (DT; a proxy for the real 12-year contracts): 4.3¢ for 2017 [C]; for 2018-22, drawn U(5.1, 7.1)¢ at signing (seeded) [C].
- 2018: replace the 2-quarter freeze with a warning event ("Iceland's power company warns it can't supply every project"). For 2018Q1-Q4 an allocation is offered only every other quarter [B].
- 2021Q4: keep the permanent stop on new sites [B]. Add a dry-winter curtailment: existing Iceland sites lose one week of that quarter's output [B; one week is designed].

## M38.4 - Owned generation and batteries (market_energy.csv, energy.json)
- `home_battery_usd_kwh`: 1,000 (2015-16), 750 (2017-20), 900 (2021+) [B → D].
- `bess_usd_kwh_us`: 1,500 (2015), 1,200 (2016), 900 (2017), 625 (2018) [A, short-duration-weighted, flag D], then 400 (2020) and later as now.
- ITC: steps 30% from 2009Q1, 26% from 2020Q1, 30% from 2022Q1 (was 2022Q3), 0% from 2026Q1 [A/B]. Rooftop solar ends 2022Q3 anyway; this is for correctness.
- Small wind realised CF: 0.20 × U(0.3, 1.0), i.e. 6-20%, was U(0.08, 0.15) [A/B]. The trap is confirmed as fair.
- Utility battery: round_trip_loss 0.15 (85% efficiency) [A]; fade_per_year 0.025 [A].
- PJM capacity derate for 4-hour batteries, by year instead of a flat 0.6 [A, then PJM's non-binding path]: 2027 0.58, 2028 0.59, 2029 0.52, 2030 0.45, a straight line to 0.30 in 2033, 0.27 in 2034, then 0.25 from 2035. 2-hour = 4-hour × 0.58 (the old ratio, DT); 8-hour = 4-hour + 0.10 [A].
- ERCOT battery income (new, small): ERCOT utility batteries earn ancillary-services income per MW of battery power: $140K per MW-yr (2022), $190K (2023), $55K (2024), $50K (2025 on) [C]. Paid quarterly (a quarter of the year's figure), booked as energy_income. It stacks with the AI-curtailment and 4CP uses (DT; real batteries do both). Report a 4-hour battery's payback if built in 2022Q4, 2024Q1 and 2027Q1.

## M38.5 - Ventures (ventures.json)
- EGS: pitch $7,000/kW (was 7,500) [A]; PPA $90 (was 80) [B → D].
- EGS block 2: pitch $5,500/kW (was 4,500) [B]; PPA $90.
- SMR and advanced fission: running cost $40/MWh (a single unit at a site; was 30) [B]. CF 0.80 for the first 8 quarters after first power, then 0.92 (was 0.90 flat) [A/B].
- No schedule changes, so the P(first power by 2035Q4) calibration should be unchanged. Re-run the 2,000-game table and confirm it.

## M38.6 - Card text (strings only)
- Rooftop solar and home battery info line: "Running a rig around the clock on sun and batteries cost about $540/MWh in 2015: you need six times the panels and a night's worth of storage."
- Utility solar and battery at an own site (2022+): "A 1 MW site on solar and batteries alone works out near $185/MWh - several times the grid price." (doc 40 §Q5, [D] from sourced inputs.)

## M38.7 - Provenance and checks
- energy.json: replace each `verify: true` that doc 40 answered with `source: "doc 40 §Qn [grade]"`. Keep `verify` where it's still a gap.
- docs/energy-content/README.md: update every changed row (value, grade, "doc 40"), and add a "Still gaps" list: Riot's PPA price, Hydro-Québec LG by year, ERCOT negative-price hours, US 4-hour battery turnkey 2019-23, offtake prepay and penalty sizes, gas with CCS and hydrogen.
- Tests: the Texas split (a fixed-price site gets both lines, a floating one only DR); 4CP as a flat saving; each hydro kind's timeline (PUD tariff ramp hits existing load; muni overage; Québec grandfathering and the 2019Q4 block); Iceland's locked price and the 2021Q4 week; the PJM derate path; ERCOT battery income; ITC steps.
- Rerun the energy balance anchors (E-B list) and the energy bot runs: before/after for each anchor, and any status that flips.

## Not in this milestone (for later design)
An unauthorised-miner raid event in PUD counties; a PUD per-kW connection fee; Québec's bid-scored block; the three real offtake structures (development funding + energy rights, an orderbook via a utility, a penalty PPA); an EPC fixed-price option; "FID without funding" drift; a roof turbine; a Nordics/EU rooftop price series; negative-price hours. Also pumped storage's real licensing (24-32 quarters, then 18 to build). With a 2027 start it can't deliver before 2036, against doc 38's 0.15 by 2035, so it belongs to the Act V design.

REPORT: files touched; tests before/after; the golden and sim diffs (non-energy: identical); the anchor table before/after; the battery paybacks; the venture P(power) table; numbered questions.
