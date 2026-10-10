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

## ventures.json (doc 38 §5)

| Rule | Value | Source |
|---|---|---|
| Diligence | 1 Bandwidth and a $2M fee; shows pitch × the class median, the class's share over +50%, and doc 38's P(power by 2035) | §5.1; the fee mine |
| Roles | stake 10/20/30/49%, paid in now (its share of the budget); offtake 25/50/100% of output at the pitched PPA, delivered to one of your sites in the type's regions; prepay 10% (price −10%) or 20% (−15%) of the PPA's notional 15-year value | §5.1; the menus and "prepay = a share of the notional contract" mine |
| Cash calls | the overrun (m − 1) × budget × your stake, in thirds at 33/66/100% of the build; pay, dilute (stake × paid ÷ (paid + call)) or walk; unanswered: dilute | §5.1; the default mine |
| Partner | Act IV only: covers 30-50% of a call; its string: a third of that share comes off your delivered MW | §5.1 ("strings: offtake priority"); the size of the string mine |
| Debt | none before first power, for every type | §5.1 point 5 |
| Value | marked to milestones (M36.8, M36.10): buy-in (scaled by dilution) × 1.25 per milestone hit × 0.8 per slip, calls at par, prepayments at cost; at first power an offtake adds its power savings to the act's end; 0 if cancelled, folded or walked | design thread, answers 11a (10 Oct: × 1.25, was 1.5); the milestones and slips counted are mine (below) |
| Delivery | firm MW at your site from first power, with no grid wait; you pay the PPA instead of the grid price (the saving is energy revenue) | §5.1 point 6; the settlement mine |
| EGS | 100 MW block; $7,500/kW; PPA $80 (FOAK range $80-110, low end as the pitch); thermal class; 12 q × slip (median 1.15, σ 1.14: fitted, M36.10); weak field 15% (CF 60% until $1,500/kW); seismicity 2%/yr (a quarter, Heat +5 at your campus); Act III political capital +2 at first power; delivers to Arizona | §5.2; size, σ and the region mine. Later blocks, the rig limit, NOAK costs and project debt after block 1 are not modelled (one block per venture) |
| SMR | 300 MW; pitch $4,000/kW, first power 2032, PPA $90; nuclear class floored ×3; licence 10 q + build 20 q, × slip (median 1.06, σ 0.3: fitted, M36.10; doc 38's 1.6 gives ~4% power by 2035); undersubscribed (others 20-70% + your offtake < 30%: fitted, M36.10, was 80%) while licensing: 40%/yr cancelled; a call has a 50% chance of a 30-50% government cost-share, else the PPA reopens at cost (60 years at 7%); one nuclear venture per 8 quarters; delivers to nuclear-eligible regions | §5.3; size, σ, others' share, the cost-share's chance mine. Units 2-4 not modelled. Public-opinion events and political capital for the licence slot not modelled |
| Advanced fission | 345 MW; pitch $4,800/kW (+20%), first power 2033, build 24 q (+4), HALEU 20%: +2-4 q; slip median 1.07, cancellation below 30% (fitted, M36.10) | §5.4 |
| Fusion | 50 MW pilot; capex $20,000/kW (its round); gates 0.90/0.70/0.60/0.80 at 4-8, 4-12, 8-12, 4-8 quarters; a fail: 50% pivot (8-12 q, a raise at half the valuation: pay half what you paid in to keep the stake, or it halves), else it folds; reservation 10% of a notional 15-year PPA for 50 MW at $40, refunded only on a fold; hype +1x on your multiples between first plasma and Q > 1, −2x for 4 quarters after a failed gate; the last gate never before 2038 | §5.5; size, the pivot's price mine |
| Pumped storage | 1,000 MW, 10 h; pitch $1,000/kW over 4 years; real $4,000/kW × the dam class; 36 q × slip (median 1.27, σ 0.25: fitted, M36.10; was 1.45); government funds 40-60% (the buy-in uses 50%); boring-machine event 25% over the build (+4 q, +10% budget); equity only; capacity revenue $110/kW-yr; Nordics and Arizona | §5.6; the event's chance, the capacity revenue and the regions mine; government loans with PIK interest not modelled |
| Control | 100 MW utility solar + 4 h battery at that year's prices; 6 q + 1 q; then the grid wait, 16-24 q drawn from its 2027 start; PPA $55; delivers 30% of its MW as firm power | §5.8; the PPA and the firm share (the battery's 30%) mine |
| On-site gas, Act IV | 6-10 quarters to power (the turbine backlog) and a thermal-class overrun on the plant's cost | design thread, answer 9 (10 Oct); doc 33 §5 |
| Grid upgrades, Act IV | the future's `grid_wait_q` × 0.8-1.2 (16-24 q at 20; F4 8-12 at 10), shifted by policies and hires | design thread, answer 9; the 0.8-1.2 spread mine |
| Pitched dates | calendar dates (M36.10): EGS 2030, SMR 2032, advanced fission 2033, pumped 2031, fusion "by 2031", the control 2028 | design thread, answer 4 (10 Oct): the developer's date, not years from joining |

### Calendar ventures (M36.10, design thread answer 4)

Each type has one developer project per game, starting on its doc 38 date (2027Q1; fusion 2028Q1) whether or not the
player joins. Its hidden draws are keyed by type, and its history is replayed quietly from the start, so the offer shows
where it stands (licensing, building, waiting for the grid, research, cancelled, folded, built). Joining takes the
project over as it stands: calls already past aren't yours, and only milestones and slips after joining count toward
your mark (mine). A cancelled, folded or finished project takes no new money (mine). Slips and the nuclear cancellation
threshold are fitted so P(first power by 2035Q4) lands within ±10 points of doc 38's targets (2,000 games): EGS 80.4%
(0.80), SMR 56.1% (0.55), advanced fission 38.8% (0.40), pumped 13.6% (0.15), the control 100% (0.95), fusion 0% (0.10:
the 2038 honesty rule).

**Milestones and slips counted in the mark (mine):** milestones are a licence granted, each third of the build, first
power and each fusion gate passed; slips are each full year past the pitched first power, a seismic pause and a fusion
pivot.
| Names | generic developers ("Small modular reactor"); the content pack names them with doc 33's clash check | doc 38 §9 |

### Overrun classes (doc 38 §5.1)

Lognormal multipliers (median, σ, cap): thermal 1.03/0.35/3.0, wind 1.02/0.30/2.5, transmission 0.98/0.20/2.0, solar
1.00/0.10/1.5, as written.

Nuclear and pumped hydro are refitted (M36.7, design thread answer 6, 9 Oct 2026): with chance p_under m is uniform in
0.85-1.00, else m = 1 + X, X lognormal; capped at 6. Nuclear: p_under 0.03, X median 0.6, σ 1.0 (the design thread's).
Pumped hydro: p_under 0.10, X median 0.58, σ 1.02 (mine, fitted to the table's ≥ 3× ≈ 10% and median 1.5). Realised
over 1,000 draws: nuclear 2.4% at or under budget, 57.2% over 1.5×, mean 1.93; pumped hydro 10.4%, 48.8%, 9.7% at ≥ 3×.
The class medians (1.6, 1.5) stay as the figures diligence quotes. (Doc 38's original σ 0.70 for nuclear put ~25% at or
under budget, against its table's ~3%.)
