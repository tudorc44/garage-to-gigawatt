# Energy content (M35-M36, doc 38)

The game reads two files in `src/content/` (there is no second copy here):

- `market_energy.csv` → `market_energy.json` (`npm run content:market`): prices by year, 2009-2040, the same in every
  Act III scenario and Act IV future.
- `energy.json`: the rules (doc 38 §4), validated by `src/content/energyContent.ts`.
- `ventures.json` (M36): the venture set (doc 38 §5).

Grades follow doc 36: [A] primary, [B] reputable reporting, [C] analyst or forecast, [D] inference or designed.
"Kept" = doc 37's number; "rounded" = a game rounding of a sourced range; "designed" = doc 38's own value;
"mine" = a value the build had to choose because doc 38 has none (each one is listed in dev-notes as "(mine, reversible)").
**verify** = doc 38 asks for it to be checked by the second research pass (doc 39, §8).

## market_energy.csv

| Column | Values | Source |
|---|---|---|
| `res_solar_usd_w` | 8.0 (2009-12), 6.0 (2013), 4.3 (2014), 4.0 (2015-16), 3.8 (2017-23), 3.5 (2024-30), then linear to 2.8 (2040) | doc 38 §4.1: 2014, 2017, 2024 kept [A]; 2009-13, 2018-23 proxies [D]. §7 lists 3.6 for 2030; not used, since it would rise above 2024's cash price of 3.5 (mine) |
| `small_wind_usd_kw` | 10,000 (2009-16), 7,500 (2017+) | doc 38 §4.2, rounded from PNNL [A] |
| `home_battery_usd_kwh` | blank before 2015, 1,200 (2015-17), 900 (2018+), flat | doc 38 §4.3, §7: decoupled from pack prices [A]; pre-2018 proxy [D] |
| `bess_usd_kwh_us` | 600 (2016), 400 (2020), 300 (2024), 219 (2025), 150 (2030), 110 (2035), 75 (2040) | doc 38 §4.8: 2025 kept [B]; the rest designed or CSV [D]. Years between: straight lines (mine) |
| `utility_solar_usd_kw` | 1,900 (2019), 1,600 (2024), 1,300 (2030), 1,000 (2040) | doc 38 §4.9: 2024 kept [A]; others [D]. Straight lines between (mine) |
| `utility_wind_usd_kw` | 1,600 (2016), 1,700 (2023), 1,400 (2040) | doc 38 §4.9 [A]/[D]. Straight lines between (mine) |
| `iron_air_usd_kwh` | 70 (2031) falling to 30 (2038), flat after | doc 38 §5.7 [D/C] ⚙. Straight line (mine) |
| `texas_summer` | 2020 normal, 2021 mild, 2022 normal, 2023 hot, 2024 normal, 2025 mild; 2026-2040 designed | 2021-23 from Riot's credits as doc 38 §4.7 maps them [A/D]; 2020 and 2024-2040 mine |

## energy.json

### Owned generation (doc 38 §4.1-4.3)

| Rule | Value | Source |
|---|---|---|
| ITC | 30% to 2019, 26% 2020-21, 30% from 2022Q3 | doc 38 §4.1, **verify** (§8 Q12) |
| Net metering | until 2022Q3 | doc 38 §4.1 ("2009-2022") |
| Daytime share without net metering | 50% of the load | mine |
| Rooftop solar | $20/kW-yr; CF 15% (17% in ERCOT and Georgia); roof bedroom 5, home rig 5, garage 7, own site 100 kW; 1 q; Heat −3 at the garage | doc 38 §4.1 (home rig's 5 kW mine) |
| Small wind | $40/kW-yr; pitched 20%, realised 8-15%; 2 q; 5%/yr breakdown, repair 10%; noise 30%/yr, Heat +4; wind overrun class | doc 38 §4.2. Sizes 10-100 kW and the garage and home rig's 10 kW limit mine |
| Home battery | 13.5 kWh blocks, one machine per block for 4 h; fire 0.5%/yr, $5K | doc 38 §4.3. Block caps per site mine |

### Special sites (doc 38 §4.4-4.6, all designed [D] and **verify**, §8 Q1-Q3)

| Kind | Size, price | Notes |
|---|---|---|
| PUD county | 5 MW at 3.0¢, free-air cooling −5% | doc 38 §4.4 (2.5-3.5¢: midpoint). Size mine |
| Upstate muni | 2 MW at 4.5¢; town hall 30%/yr, Heat +5 | doc 38 §4.4. Size and town-hall numbers mine |
| Québec hosting | 5 MW at 4.5¢, free-air cooling −5% | doc 38 §4.4 (4-5¢: midpoint). Size mine |
| Hydro queue | 1 allocation a quarter; flood 2017Q4; moratorium from 2018Q1 for 4-6 q; then new load +60-100%, existing +30% at renewal | doc 38 §4.4 |
| Iceland | 5 MW at 4.25¢ (2017) rising to 5.5¢ (2021); cooling −10%; Heat never rises; machines +1 q to arrive; 3 q to build; freezes 2018Q1 (2 q) and from 2021Q4 | doc 38 §4.5. Size mine |
| Flare pad | 2 MW; $750/kW gensets; $30/MWh; 85% for 4 q, then −8%/q; relocation: 1 q offline, $100/kW, 10% wear; genset failure 3%/q (a week); Heat −5; 2021 tax break −10%; accident 1%/yr | doc 38 §4.6. Size, and the accident's $50K and Heat +10, mine |
| All | Leased like a warehouse (rent $30K/q, $400K set-up), from a warehouse up, 1 Bandwidth | mine |

### Texas (doc 38 §4.7)

| Rule | Value | Source |
|---|---|---|
| Requirement | a fixed-price contract at an ERCOT site, from 2020 | doc 38 asks for an 8+ year PPA; the game's contracts run 4 or 8 quarters (not implemented as written) |
| Credit | $15K / $40K / $100K per MW-yr (mild / normal / hot), paid at Q3's end on curtailable MW | doc 38 §4.7 ⚙ |
| Curtailable MW | miners; plus AI MW up to the utility battery's MW | doc 38 §4.7-4.8 |
| A grid call | Act I-II's curtailment alert; refusing it while enrolled forfeits the year | the forfeit is mine |
| 4CP | −1.5% of Q3 output, −10% on next year's power; AI halls need a battery as big as their load | doc 38 §4.7 ⚙; the AI rule is mine (from §4.8 (1)) |
| Backlash | credits over $50M in a year: Heat +5 at ERCOT sites, Act III-IV Anger +5 (company-wide) | doc 38 §4.7 |

### Site assets (doc 38 §4.8-4.9, §5.7)

| Asset | Rules | Source |
|---|---|---|
| Utility battery | from 2022Q4; US price × 0.8 in the Nordics; 2 or 4 h (8 in Act IV); $7/kW-yr; 3 q; solar overrun class; fire 0.2%/yr (Heat +8, repair 10% of capex); PJM and Ohio capacity payment from 2027 at price × derate (2 h 0.35, 4 h 0.6, 8 h 0.8) × 91 days, −2%/yr | doc 38 §4.8; the 4 h derate 0.6 is designed ⚙; 2 h and 8 h derates mine. The fire's "a week offline" is not modelled (repair cost instead) |
| On-site solar | utility $/kW; CF ERCOT 24%, Georgia 20%, Arizona 28%, Nordics 11%; PJM and Ohio 18% (mine); $20/kW-yr; 4 q; Heat −3 | doc 38 §4.9 |
| On-site wind | utility $/kW; CF ERCOT 38%, Georgia 15%, Nordics 35%, PJM and Ohio 30% (doc's PNW), Arizona 30% (mine); $43/kW-yr; 6 q; Heat +3; complaints 30%/yr | doc 38 §4.9 |
| Land | on-site solar and wind together up to the site's MW (mine; doc 38's 6 acres/MW has no land cap to apply it to) | |
| Iron-air | from 2031; 100 h; 8 q, 50% chance of +4 q; makes 90% of covered renewables firm | doc 38 §5.7 |
| Firm power | renewables count only with storage: iron-air 90%, a 4 h+ battery 30% of the renewable MW covered | doc 38 §4.9 (E-D8) |

### Overrun classes (doc 38 §5.1)

Lognormal multipliers (median, σ, cap): nuclear 1.6/0.70/6.0, pumped hydro 1.5/0.80/6.0, thermal 1.03/0.35/3.0, wind
1.02/0.30/2.5, transmission 0.98/0.20/2.0, solar 1.00/0.10/1.5. Kept as written. **Note for the design thread:** these
parameters don't give all the tail shares doc 38's table states. Nuclear's σ 0.70 puts about 25% at or under budget (the
table says ~3%), though its P(m > 1.5) ≈ 54% and mean ≈ 2.0 match. Pumped hydro's P(m ≤ 1) is ~31% (table ~10%) and
P(m ≥ 3) ~19% (table ~10%). See dev-notes, M35.
