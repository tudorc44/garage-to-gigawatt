# 45: Third research pass - Act V content pack (research session, 10 Oct 2026)

Answers doc 44's nine questions for doc 43 (Act V, "Firm"). Rules from doc 36/44: every claim graded [A] primary/official, [B] reputable reporting or company statement, [C] analyst/forecast/industry estimate, [D] inference or designed; inference labelled; ranges with basis; never invent a figure. All sources accessed 10 October 2026. Real companies are reference points only. Doc 40 is cited, not redone (PJM 4-h storage ELCC, Fervo capex, nuclear fleet cost, offtake structures).

Each answer ends with a correction table: **doc 43's designed value | what the sources say | grade | recommended game value**, in game units, with working shown.

## Headline: the five corrections most likely to change doc 43

1. **The contracted plant multiple is too high and the contracted premium too wide (§11.3).** Doc 43 uses 12x contracted vs 7x merchant (a 5-turn premium). Deals for merchant or mostly-merchant firm fleets cleared at 7.5-7.9x forward EBITDA (Calpine 7.9x 2026E; NRG-LS Power 7.5x) [B/A], and operating nuclear at about 6.7-7.8x (Energy Harbor) [C]. Contracted renewable assets traded at about 6.6-10x (UK wind 6.6x, Spanish wind ~8x, Italian solar 10x) [B], with listed contracted platforms near 12x [C]. **Recommend 10x contracted / 7.5x merchant.** This narrows the "sell to a fund" edge in V3 and moves the M43.0 gate (V-B2/V-B4).
2. **Fixed O&M would double-count running cost (§7.1).** EIA puts SMR fixed O&M at $106.92/kW-yr and large LWR at $136.91/kW-yr, with variable O&M of only $3.38 and $2.67/MWh [A]. Doc 40's $30-40/MWh is NEI's *all-in* generating cost (fuel + capital + operations) [B]. Adding a separate fixed $/kW-yr on top would roughly double nuclear opex. **Recommend: fixed $/kW-yr + variable + fuel, and drop the all-in $/MWh** (or keep the all-in and set fixed to 0).
3. **Paying network upgrades does not buy speed in the sources; it is the price of staying in (§8.2).** LBNL's PJM data: completed projects paid a mean $84/kW (network $71/kW); withdrawn projects faced a mean $599/kW, likely a key factor in withdrawing [A]. Nothing found shows that paying more shortens a wait; speed comes from energy-only service, flexible/provisional service, or co-location. **Recommend: the study result names the upgrade bill ($50-600/kW by region and draw); pay or withdraw. Speed is bought by flexibility, not money.** The "−⅓ wait for $150/kW" rule has no basis; keep it only as a labelled [D] mechanic if wanted.
4. **The fast lane's curtailment is smaller in energy than doc 43 assumes (§8.2).** Duke's study: curtailing new load 0.25% / 0.5% / 1% of its energy means curtailment in about 85 / 177 / 366 hours a year, with average events of 1.7-2.5 hours and most hours keeping at least half the load [C]. Doc 43's "200 h = −2.3% output" treats every hour as a full stop. **Recommend: up to ~180 h a year = −0.5% output; 24-hour notice** (Texas SB6's large-load demand-reduction service uses 24-hour notice [B]).
5. **Plant debt terms and the default sequence need reshaping (§11.1, §11.4).** Contracted operating term debt prices at SOFR + 150-350 bp over 5-20 years [C]; merchant gas fleets borrow through term loan Bs at SOFR + 200-250 bp (Calpine, Alpha Generation, 2025) [A] - tighter than doc 43's +400, but on short (≈7-year) loans sized to much higher coverage (merchant renewables need DSCR 1.5-1.7x for investment grade, merchant thermal far more [C]; banks lend against merchant tails at 2-2.5x [B]). Lenders lock up distributions before default; project-finance recoveries average 77% [C], so taking the plant is rare. **Recommend: contracted 15-18 y sculpted at SOFR + 200 bp up to 65% of value; merchant 7 y at SOFR + 275 bp up to 40% with a cash sweep; lock-up below DSCR 1.15; lenders take the plant only after 8 quarters below 1.0 (4 quarters triggers a restructuring that halves the stake).**

---

## Q1. What operating power plants sell for (blocks §11.3)

**Sourced facts**
- **Merchant/firm thermal fleets.** Constellation-Calpine: net price $26.6B, 7.9x 2026E EV/EBITDA (announced Jan 2025, closed 2025) [B, company]. NRG-LS Power: ~$12.0B EV for 13 GW gas plus a C&I VPP platform, 7.5x 2026E EV/EBITDA, "50% of estimated new-build replacement cost" [A, SEC 8-K]. NRG-Rockland: 738 MW Texas peakers at $760/kW [B]. Vistra-Lotus: 2.6 GW gas for $1.9B, ~$743/kW [C].
- **Operating nuclear.** Vistra-Energy Harbor (2023): $3.0B cash + 15% of Vistra Vision + $430M debt; estimated 6.7-7.8x targeted EBITDA, below Constellation's ~9x [C, VIC analysis]. Nuclear EBITDA there includes the 45U PTC floor through at least 2032 [B].
- **Contracted renewables, asset level.** Acea-Equitix (Italy, solar, 2021): EV/EBITDA 2022 of 10x [B]. Naturgy-Ardian (Spain, 422 MW wind, 2023): ~8x 2023E [B]. Atlantica (UK, 32 MW wind with ROCs to 2033, no debt, 2024): ~6.6x [B]. Ares-EDPR (US, 1,632 MW solar/wind/storage, 18-yr average PPA left, 2025): EV $2.9B, i.e. ~$1,780/kW; EBITDA not disclosed [B].
- **Contracted platforms (listed).** Atlantica traded at ~11.95x TTM EV/EBITDA when ECP agreed to take it private at an 18.9% premium to the undisturbed price (May 2024) [C/B].
- **Storage.** UK BESS deals 2024-25 at £605-1,674/kW (EV per operating capacity); EBITDA multiples not disclosed [C].
- **Interest rates.** Yieldcos fell as much as 50% in 2023 as rates rose [C]; analysts re-rated NEP toward a no-growth "runoff" value because fixed-price PPAs signed in a low-rate world were worth less [B]. A numeric 2021 vs 2023-26 multiple series was **not found**.
- **Fund bid vs listed peers.** Atlantica's take-private was at a premium to its undisturbed price but 6% below its last close [C]. No systematic fund-vs-listed premium data found.

**Inference [D]**
- Thermal/merchant and nuclear cluster at 6.7-7.9x; contracted asset deals at 6.6-10x depending on contract tail; contracted platforms ~12x include a growth/platform premium a single plant would not get. **Contracted premium ≈ +2 to +3 turns, not +5.**
- A contracted plant with a long remaining tail (Ares-EDPR's 18 years) sits at the top of the band; one with ≤ 8 years left (Atlantica UK, ROCs to 2033) at the bottom.

### Correction table - Q1

| Doc 43 designed value | What the sources say | Grade | Recommended game value |
|---|---|---|---|
| `plant_mult_contracted` 12x | Asset deals 6.6-10x; listed contracted platform ~12x | B/C | **10x (range 8-11x by remaining contract tail: ≥15 y → 11x, ≤8 y → 8x)** |
| `plant_mult_merchant` 7x | Calpine 7.9x, NRG-LS Power 7.5x, Energy Harbor 6.7-7.8x | A/B/C | **7.5x (V1 8.5x after the trigger, V3 6x)** |
| Contracted share blend (contracted × 12 + merchant × 7) | Premium ~+2.5 turns | D | **Keep the blend with 10/7.5** |
| `infra_bid_index` 0.90-1.15 | Atlantica: +18.9% to undisturbed, −6% to last close | B/C | **0.95-1.15; V3 0.85-1.00 after the trigger (rate/demand repricing precedent, 2023)** |
| Rate sensitivity (none) | Yieldcos −50% in 2023 on rates | C | **Optional: multiples −1x in any future with a "rates up" event card** |
| Storage multiple (none) | £605-1,674/kW; EBITDA multiples not public | C | **Use merchant 7.5x for storage without a toll; contracted 10x with a toll** |

---

## Q2. Project finance for operating plants (blocks §11.1)

**Sourced facts**
- **Contracted renewables (2025).** Term debt for fully contracted, high-quality projects: SOFR + 150-350 bp, maturities 5-20 years; only 25% of lenders would lend to partially contracted or merchant projects [C, Crux]. Merchant/emerging-tech spreads 300-1,000 bp [C].
- **Coverage.** Contracted DSCR ~1.4x wind, 1.3x utility solar, 1.30-1.35x gas; banks lend against merchant tails at ~2-2.5x [B, Norton Rose Fulbright 2019]. Contracted solar commonly sized at 1.25-1.30x on P50 with an ~18-year tenor; merchant/hedged at ~1.75x over ~7 years [C]. Investment-grade merchant renewables need DSCR ~1.5-1.7x; merchant thermal "in theory" about three times that [C, Morningstar DBRS].
- **Merchant thermal (corporate/TLB).** 2025 term loan Bs: Calpine repriced at SOFR + 250 bp (2031 maturity); Alpha Generation SOFR + 200 bp; another power credit SOFR + 225 bp [A, SEC N-PORT holdings].
- **Breach mechanics.** Lock-up suspends distributions when DSCR falls below a threshold set under the sizing target; default is a lower threshold; lenders hold step-in rights and may run and sell the project [C]. Illustrative lock-up 1.15x [C].
- **How often lenders take plants.** Project-finance loan recoveries average 77% [C, S&P study 1980-2014]; renewable project 10-year cumulative default rate 2.9-4.9% depending on definition [C, Moody's 2020]. Foreclosure frequency itself not found.
- Nuclear and geothermal operating refinancings: **not found** (doc 40: EGS got $421M non-recourse debt for Phase I [B]).

**Inference [D]**
- Debt-to-value implied by DSCR 1.30 on a 15-18-year sculpted contracted loan at ~6% all-in: roughly 60-70% of a plant valued at 10x EBITDA. At DSCR 2.0 over 7 years, merchant debt is ~35-45% of value.
- Merchant TLB spreads are tight because they sit on large diversified fleets with hedges; a single merchant plant in the game is riskier. Keep +275 bp, not +400.

### Correction table - Q2

| Doc 43 designed value | What the sources say | Grade | Recommended game value |
|---|---|---|---|
| Up to 60% of plant value | Contracted DSCR 1.25-1.40 → ~60-70%; merchant DSCR 2.0+ → ~35-45% | B/C (derived D) | **Contracted ≥70%: up to 65%; merchant: up to 40%** |
| SOFR + 250 bp (≥70% contracted) | SOFR + 150-350 bp | C | **SOFR + 200 bp** |
| SOFR + 400 bp (merchant) | TLB SOFR + 200-250 bp (fleets); merchant PF 300-1,000 bp | A/C | **SOFR + 275 bp, 7-year, 1%/yr amortisation + 50% cash sweep** |
| 15-year amortising | Contracted 5-20 y (solar ~18 y) | C | **Contracted 15-18 y sculpted to DSCR 1.30; merchant 7 y** |
| Lenders take plant after 2 quarters below DSCR 1.0 | Lock-up first, default lower; step-in rare; 77% recovery | C | **Lock-up < 1.15 (no distributions); < 1.0 for 4 q → restructure (stake ×0.5); < 1.0 for 8 q → lenders take the plant** |

---

## Q3. The interconnection queue (blocks §8)

**Sourced facts - upgrade costs**
- **Multi-region (LBNL).** Recent gas $150/kW; solar $509/kW (all) vs $216/kW (complete); wind $504 vs $103; storage $437 vs $151. Firmer service (NRIS) $467/$133 vs energy-only (ERIS) $353/$50. Network upgrades explain most cost; costs fall with project size ($763/kW small vs $243/kW very large) [A].
- **PJM.** Completed projects: mean $84/kW (2020-22), median $30; active mean $240, median $85; withdrawn mean $599, median $156; network upgrades $71 / $227 / $563 [A].
- **SPP.** Completed solar $99/kW, gas $53/kW; withdrawn network costs $230/kW (2020s); active $58/kW; withdrawn solar $394/kW (25% of installed cost) [A].
- Large-load-specific upgrade costs: **not found.** DOE's ANOPR proposed charging 100% of network upgrades to the large load [B]. Texas now requires $50,000/MW of financial security to hold a large-load position [B].

**Sourced facts - waits and withdrawals**
- Average wait 25 months nationally, 20 in ERCOT, 40 in PJM; PJM data-centre zones 36-48 months; 65-80% of PJM 2018-20 capacity withdrew before an agreement [C, Carbon Direct, May 2026]. LBNL median 5.1 years and 13% completion (doc 40 [A]).
- **Large loads.** ERCOT's large-load queue reached ~474 GW (July-Aug 2026); only 7% have planning studies approved for 2030 [A, ERCOT]. 198 GW of requests arrived in Q1 2026 alone [A]. ERCOT moved to batch studies ("Batch Zero") in mid-2026, with audits delaying batch timelines [A].

**Sourced facts - transfers**
- Standard tariff language: a queue position may be transferred only if the buyer acquires the specific facility in the request and the point of interconnection does not change; some tariffs add a site-control showing or allow only one transfer [C, tariff clause compilation]. PJM files assignments of service agreements with consent-to-assignment agreements when projects change hands [A]. No RTO found that sells positions on their own.

**Sourced facts - reform since doc 40**
- FERC did not issue a generic rule; on 18 June 2026 it issued show-cause orders to all six RTOs (PJM EL26-67 … ISO-NE EL26-72) covering five reform categories, including new transmission services for flexible large loads; 60 days to justify or file [A/B]. FERC suggested >50 MW as a reasonable large-load definition [B]. PJM's co-location compliance continues (filing due Aug 2026) [B]. **No approved flexible-load tariff with numeric curtailment hours found.**
- Texas SB6: all non-critical transmission-level loads connected after 2025 are curtailable in firm load shed; a competitively procured large-load demand-reduction service with 24-hour notice [B]; ERCOT is building a Large Load Curtailment Manager [A].
- Duke flexibility study: 76 / 98 / 126 GW of headroom at 0.25 / 0.5 / 1% curtailment, i.e. ~85 / 177 / 366 hours a year; average events 1.7-2.5 h [C].

**Sourced facts - powered land**
- One analysis puts defensible powered capacity at roughly $300,000 per MW [C]. Data-centre land sales $3.3B in Q1 2026 (+141% y/y) with fewer sites sold [B, Bisnow/Avison Young]. Land prices track committed utility load; sites near substations trade at ~2x per acre [C].

**Inference [D]**
- Upgrade bill per region (completed-project means, 2020s): PJM ~$85, SPP ~$55-100, multi-region ~$150-220; the withdrawn tail ($230-600) is what drives exits.
- $300K/MW powered value is a land-plus-position premium, not the position alone; the position itself is not separately priced in any source.

### Correction table - Q3

| Doc 43 designed value | What the sources say | Grade | Recommended game value |
|---|---|---|---|
| `upgrade_usd_kw` (designed $150) | PJM completed $84, active $240, withdrawn $599; SPP completed $53-99, withdrawn $230-394; multi-region $150-509 | A | **Drawn per position at study: median $100 (ERCOT/SPP) / $150 (PJM/MISO), 20% chance of a $400-600 tail** |
| Paying upgrades cuts remaining wait by ⅓ | No source shows payment buys speed; high bills drive withdrawals | A | **Pay = keep the position; refuse = withdraw. Speed comes only from flexible service or co-location. (Keep −⅓ only as a labelled [D] option.)** |
| Waits 24 → 14-28 q by future | 20 mo ERCOT, 40 mo PJM average; 5.1 y median generation; ERCOT large loads 7% study-approved | A/C | **Start: PJM 20 q, ERCOT 12 q, other 16 q; keep the futures' directions** |
| Withdrawal (none) | 65-80% PJM; 75% LBNL | A/C | **Rivals' positions withdraw at 15%/yr (V3 30%), opening slots** |
| Position moves only with its site | Transfer only with the facility, same POI, site control | A/C | **Keep (now sourced)** |
| Fast lane 4-8 q, 200 h/yr, −2.3% output | Duke 85-366 h at 0.25-1% energy; SB6 24 h notice; no approved tariff hours | B/C | **4-8 q; up to 180 h/yr; −0.5% output; 24-h notice** |
| `queue_premium_usd_kw` (designed) | Powered land ~$300/kW; Texas security $50/kW | B/C | **Premium $100 (2036) rising to $300 (V1) / falling to $25 (V2, V3); holding a position costs $50/kW security** |

---

## Q4. Demand beyond 2035 (blocks §6.2)

**Sourced facts**
- BNEF (Dec 2025): global data centres 1,200 TWh by 2035 and 3,700 TWh by 2050; US data-centre demand 106 GW by 2035 (+36% vs its April 2025 forecast) [C].
- California Energy Commission (2025 IEPR): data-centre peak for six utilities ~1.19 GW (2025) to 3.64 / 4.51 / 5.16 GW in 2040 (low / mid / high); growth 7.3-10%/yr 2024-2040 [A].
- EPRI (2026): US data centres 9-17% of electricity by 2030 (380-790 TWh), 60% above its 2024 scenarios [C]. Grid Strategies: ~65 GW added by 2030, utility forecasts "likely overstated" [C].
- NERC 2025 LTRA: summer peak +224 GW over 2026-35 (69% above the prior year's forecast); PJM to 210 GW in 2035 (net energy +4.8%/yr); ERCOT 94.7 → 154.1 GW (5.6%/yr) [A].
- IEA cases (doc 40, [C]): 700-1,700 TWh in 2035.

**Inference [D]** (index 2036 = 100, four years to 2040)
- BNEF's 1,200 → 3,700 TWh (2035-2050) is ~7.8%/yr → 2040 ≈ 1,750 TWh; +35% over 2036-40.
- CEC's 10%/yr (mid) → +46%; 7.3%/yr (low) → +33%.
- IEA low case (700 TWh 2035) implies ~4.9%/yr from 2024; no published case shows a plateau after 2035.

### Correction table - Q4

| Doc 43 designed value | What the sources say | Grade | Recommended game value |
|---|---|---|---|
| V1 100 → 145 | CEC mid 10%/yr → +46% | A/C | **Keep 145 (anchor: CEC mid)** |
| V2 100 → 130 | BNEF ~7.8%/yr → +35%; CEC low +33% | A/C | **135 (anchor: BNEF path)** |
| V3 100 → 95 | No published plateau; IEA low ~+21% (4.9%/yr) | C/D | **100 → 105 rising then flat to 2040; label the plateau [D]** |
| V4 100 → 125 (share to orbit) | Between BNEF and IEA low | C/D | **Keep 125; orbit share [D]** |
| 2040 global anchor (none) | ~1,750 TWh (BNEF interpolation) | C/D | **Show 1,600-1,900 TWh range in the AI Demand Signal text** |

---

## Q5. Capacity accreditation for firm plants (blocks §7.1)

**Sourced facts (PJM ELCC class ratings)**
- 2026/27 BRA: nuclear 95%, gas CC 74%, gas CT 60%, CT dual fuel 78% [A].
- 2027/28 BRA: nuclear 95%, CC 74%, CT 61%, oil CT 80%; storage 4 h 58%, 6 h 67%, 8 h 70%, 10 h 78% [A].
- 2028/29 BRA: nuclear 96%, CC 78%, CT 67% [A].
- Preliminary, non-binding (2027/28-2035/36): nuclear 95-96%; CC 74 → 78%; CT 61 → 70%; CT dual fuel 77-80% [A]. Earlier preliminary set: 8 h 67 → 60%, 10 h 76 → 70% through 2034/35 [A].
- MISO / ERCOT equivalents: **not researched** (gap).

### Correction table - Q5

| Doc 43 designed value | What the sources say | Grade | Recommended game value |
|---|---|---|---|
| Firm-class rating ⚙ (unset) | Nuclear 95-96% flat | A | **Nuclear 0.95** |
| (gas) | CC 74 → 78%; CT 61 → 70% (rising) | A | **CC 0.76 → 0.78; CT 0.62 → 0.70 by 2036** |
| Long storage (8-10 h) | 8 h 70% (27/28) → ~60%; 10 h 78% → ~70% | A | **8 h 0.62; 10 h 0.72 in 2036-40** |
| Pumped storage capacity $110/kW-yr | $325/MW-day × 0.72 × 365 = $85K/MW-yr = $85/kW-yr | A/D | **Capacity × 10-h ELCC; ≈ $85/kW-yr at the 2028/29 cap** |

---

## Q6. Operating-plant economics (blocks §7.1, §7.3)

**Sourced facts**
- **EIA AEO2023 (2022$).** CC single-shaft fixed O&M $15.87/kW-yr, variable $2.87/MWh; CC multi-shaft $13.73 / $2.10; LWR $136.91 / $2.67; SMR $106.92 / $3.38 [A]. CT industrial frame fixed $7.88/kW-yr, variable $5.06/MWh; aeroderivative $16.35 / $5.29 [A].
- **NEI.** Fleet total generating cost $31.76/MWh (2023); 2019 split: operations $18.55, capital $5.72, fuel $6.15/MWh [B]. These are all-in, not variable.
- **Pumped storage.** ATB $18/kW-yr + $0.51/MWh (doc 37 [A]).
- **Geothermal, iron-air fixed O&M:** not found in this pass (proxy: ATB/doc 37 $15-30/MWh for EGS [D]).
- **Contracted share at COD.** New firm builds in the sources were fully placed before COD: Hermes 2 via a TVA PPA [B], Orion via the Microsoft PPA [B], Fervo 658 MW binding PPAs ($7.2B) [B, doc 40]; Ares-EDPR storage under a 20-yr capacity toll [B]. Pumped hydro: not found.
- **Spreads.** ERCOT real-time top-bottom one-hour spread averaged $98/MWh in 2024, 61% below 2023 [C] (≈ $250 in 2023, derived). PJM: TB1 rose ~$43/MWh y/y in Nov 2025 [C]. A 10-hour peak/off-peak spread series: **not found.**

**Inference [D]**
- EIA SMR at 92% CF: $106.92 ÷ 8.06 MWh/kW-yr ≈ $13.3/MWh fixed + $3.38 variable + ~$6 fuel ≈ **$23/MWh**; LWR ≈ $17 + 2.7 + 6 ≈ $26/MWh. NEI's $31.76 all-in includes sustaining capex. So doc 40's $30-40/MWh already contains the fixed cost.
- A 10-hour block spread is far below TB1; proxy $25-40/MWh.

### Correction table - Q6

| Doc 43 designed value | What the sources say | Grade | Recommended game value |
|---|---|---|---|
| Reactor running $40 (unit 1) / $30 (unit 3) per MWh **plus** fixed $/kW-yr ⚙ | NEI $31.76 all-in; EIA fixed $107-137/kW-yr + variable $2.7-3.4 | A/B | **SMR: fixed $107/kW-yr + $9/MWh (variable + fuel); single unit ×1.3 fixed (NEI single-unit $41.62 vs multi $29.53). Drop the separate $30-40 all-in** |
| EGS $20/MWh + fixed ⚙ | Not found (proxy $15-30 all-in) | D | **$20/MWh all-in, fixed 0** |
| Gas CC / CT | CC $14-16/kW-yr + $2-3/MWh; CT $8-16 + $5 | A | **CC $15 + $2.5; CT $10 + $5 (plus fuel from the market file)** |
| Pumped storage | $18/kW-yr + $0.5/MWh | A | **Keep** |
| Contracted share at COD ⚙ | New firm builds fully placed before COD | B | **SMR/advanced/EGS/fusion 90%; storage 80%; pumped hydro 50% [D]** |
| Peak-off-peak spread × 10 h × 0.80 | TB1 ERCOT $98 (2024), ~$250 (2023); no 10-h series | C | **10-h spread $30/MWh (2036), V1 $45, V3 $20 [D]** |

---

## Q7. Exit benchmarks (blocks §15.2)

**Sourced facts**
- Data centres: DigitalBridge/IFM took Switch private at $34.25/share, ~$11B EV, a 15-19% premium to the undisturbed price; Switch's 2022E EV/EBITDA at the price was ~27.6x vs CyrusOne's 23.5x [A, SEC proxy; B]. Aligned sold to a BlackRock/GIP/MGX consortium for $40B (2025) [B]; multiple not found.
- Power: Atlantica 18.9% premium [B]; Calpine 7.9x, NRG-LS Power 7.5x (Q1).
- Utilities: average premium ~26% in six major deals since 2016 [C, S&P RRA].
- General: Mergerstat median equity premium ~30% (2015); on an enterprise-value basis the median is ~21% [C, Mercer Capital].
- Post-2040 outlook factor: nothing published bounds it.

**Inference [D]:** if the game's valuation is a "market" (undisturbed) value, strategic bids land at ×1.10-1.30 equity, ×1.05-1.25 on EV. Doc 43's 0.95-1.15 sits low; bids below 1.0 happen (Atlantica vs its last close) but in distress or after a run-up.

### Correction table - Q7

| Doc 43 designed value | What the sources say | Grade | Recommended game value |
|---|---|---|---|
| Bid factor 0.95-1.15 | Premiums 15-26% (deals), median EV premium ~21% | A/B/C | **1.05-1.25 (V1 1.15-1.30; V3 0.95-1.10)** |
| Post-2040 outlook factor [D] | Nothing published | - | **Keep [D]; finale says so** |
| Data-centre platform multiple (reference) | Switch ~27.6x 2022E | A | **Use only as the orbit/AI-platform multiple ceiling** |

---

## Q8. Policy and opposition after 2035 (blocks §6, wildcards)

**Sourced facts**
- **Federal credits (OBBB, July 2025).** Wind and solar lose 45Y/48E if placed in service after 2027, unless construction began by 4 July 2026 [A/B]. Storage, geothermal, hydro, nuclear and other non-wind/solar: full credit for construction starting through 2033, 75% in 2034, 50% in 2035, none after [B].
- **Federal nuclear.** May 2025 executive orders: 400 GW by 2050 (from ~100 GW), 10 large reactors under construction by 2030, 5 GW of uprates, NRC decisions within 18 months [A, DOE]. NRC's Part 53 took effect 29 April 2026 [B].
- **States (relevant to the game).** New Jersey 100% clean by 2035 (executive order, not statute) [B]; New York 100% zero-emission by 2040 [B]; Virginia: Dominion 100% by 2045, Appalachian Power 2050 [B]; Maryland 50% renewable by 2030 [B]; Illinois 100% clean by 2050 (40% by 2030, 50% by 2040) [B]; Ohio 12.5% by 2026; Pennsylvania 18% (2021); Texas <10% (met); Arizona 15% by 2025 [B]. Georgia: no standard found. Nordics: not researched.
- **Opposition.** Q1 2026: at least 75 data-centre projects (~$130B) blocked or delayed, opposition groups up from 396 to 833, statewide moratorium bills in 14 states; Maine's statewide pause was vetoed [B, Data Center Watch]. Q2 2026: 45 projects (~$68B) [B]. At least 69 local governments had enacted bans by May 2026; Seattle passed a one-year pause [B]. A majority of Americans would "strongly" oppose a nearby data centre (Heatmap poll) [C].
- **Transformers.** Large power transformers averaged 128 weeks, GSUs 144 weeks (Wood Mackenzie, Q2 2025), with a 30% supply deficit in 2025 [C]; reports of up to four years for high-capacity units (May 2026) [B]; Wood Mackenzie expects marginal shortage in most specifications through 2030 [C]; ~80% of large units imported [C].

**Inference [D]:** in 2036-40 no new federal clean credit exists for any project starting construction after 2035, in every future. A large-load moratorium wildcard at 4 quarters sits inside observed proposals (3 months to 4 years). Transformer delays of +2 quarters are conservative against 128-160-week lead times.

### Correction table - Q8

| Doc 43 designed value | What the sources say | Grade | Recommended game value |
|---|---|---|---|
| Clean credits after 2035 (not set) | None for construction starting after 2035; 75%/50% for 2034/35 starts | A/B | **Known timeline: credit 0 for any Act V start; plants that started ≤2033 carry full credit** |
| Nuclear policy (not set) | 400 GW by 2050 target; 18-month licensing target; Part 53 | A/B | **Event card "licensing clock" (−2 q on SMR licence) in every future; the 400 GW goal feeds the SMR-wave decoy** |
| Large-load moratorium wildcard: 4 q, >20 MW | Proposals 3 months-4 years; 69+ local bans; no statewide law yet | B | **Keep 4 q (range 2-8 q); threshold 50 MW** |
| Transformer shortage: +2 q for a year | 128-160 weeks; shortage through ~2030 | B/C | **+2 q on new grid-connected assets and upgrades (keep); 40% of draws +4 q** |
| State targets (not set) | NJ 2035 (EO), NY 2040, VA 2045, IL 2050; TX/OH/PA/AZ none binding post-2035 | B | **PJM east states: clean-premium +5% on firm clean PPAs; Texas/Ohio/Arizona/Georgia none** |

---

## Q9. Quick verifications

- **Bitcoin halvings.** Protocol: every 210,000 blocks [A]. 2036 halving at block 1,470,000 (subsidy 0.390625 BTC); 2040 at block 1,680,000 (0.1953125 BTC) [A, arithmetic]. Timing [D]: from the April 2024 halving, 3 or 4 more epochs at 10.0 min per block → ~April 2036 / ~April 2040; at a 9.8-min average (recent hashrate growth) → ~Jan-Feb 2036 / ~Q4 2039. **Recommend 2036Q1 and 2040Q1 (range Q4 2039-Q2 2040).**
- **NIST.** IR 8547 remains an initial public draft as of mid-2026; dates unchanged (deprecate after 2030, disallow after 2035) [B]. OMB M-26-15 directs agencies to plan to it with 2035 full migration [B]; a June 2026 executive order treats 2030 as a compliance deadline for federal high-value assets [C]. **No change to doc 43.**
- **Fusion net electricity.** None announced by October 2026. Helion has reframed Polaris's goal from "net electricity" to "demonstrating electricity from fusion" and removed the Orion-by-2028 electricity claim from its site [B, Helion; Axios Sep 2026]; no published Polaris net-power result [B]. SPARC targets first plasma and Q>1 in 2027, ~75-80% assembled [B]. **The "nothing before 2038" rule holds.**
- **SMR orderbook.** Under construction: Darlington BWRX-300 unit 1 (since May 2025; operating licence applied for 2026) [B]; Natrium (NRC permit March 2026) [B]; Linglong One (IAEA PRIS still "under construction" at its May 2026 update despite reports of operation) [B]; demonstration units (e.g. two DOE pilot criticalities in mid-2026) [C]. Announced but unfunded or unbuilt: Doicești (FID without funding), Meta's eight Natrium units (no amounts disclosed), Google-Kairos 500 MW (doc 40). **The SMR-wave decoy basis holds: GW announced, a handful of units building.**

| Doc 43 designed value | What the sources say | Grade | Recommended game value |
|---|---|---|---|
| 2036 halving ~2036Q2 | Block 1,470,000; Q1-Q2 2036 depending on block time | A/D | **2036Q1** |
| 2040 halving ~2040Q2 | Block 1,680,000; Q4 2039-Q2 2040 | A/D | **2040Q1** |
| NIST disallow after 2035 | Unchanged; still draft | B | **Keep** |
| Fusion: nothing before 2038 | No net electricity; goals walked back | B | **Keep** |
| SMR-wave decoy | Few units building vs GW announced | B | **Keep** |

---

## Open questions (figures not found, proxies used)

- Plant multiple series by year (2021 vs 2023-26) - proxy: yieldco −50% in 2023 [C].
- Operating nuclear and geothermal refinancing terms - proxy: contracted renewables term debt.
- Foreclosure frequency on project loans - proxy: 77% recovery, low default rates.
- Large-load-specific network upgrade $/kW; MISO, CAISO, NYISO, ISO-NE per-region figures beyond the LBNL summary.
- Price of a queue position alone (separate from land) - proxy: $300/kW powered land, $50/kW Texas security.
- Approved flexible-load tariff curtailment hours - proxy: Duke 85-180 h.
- MISO/ERCOT capacity accreditation for firm classes.
- Geothermal and iron-air fixed O&M; pumped-hydro contracted share at COD.
- A 10-hour peak/off-peak spread series by region - proxy $25-40/MWh.
- Post-2035 demand: only interpolations of BNEF (to 2050) and CEC (to 2040); a plateau case is [D].
- Nordic clean-power targets; Georgia/Arizona post-2035 policy.

## Sources

| Title | Publisher | URL | Published | Accessed | Grade |
|---|---|---|---|---|---|
| Constellation to acquire Calpine | BIC Magazine (company release) | https://www.bicmagazine.com/industry/investment-banking/constellation-to-acquire-calpine-for-26b/ | Jan 2025 | 2026-10-10 | B |
| Constellation shares soar on Calpine deal | S&P Global Market Intelligence | https://www.spglobal.com/market-intelligence/en/news-insights/articles/2025/1/constellation-shares-soar-on-26-6b-calpine-acquisition-87073565 | Jan 2025 | 2026-10-10 | B |
| NRG to acquire portfolio from LS Power (Ex. 99.1) | SEC EDGAR | https://www.sec.gov/Archives/edgar/data/1013871/000110465925047007/tm2514561d1_ex99-1.htm | 12 May 2025 | 2026-10-10 | A |
| NRG Q1 2025 results (Rockland $760/kW) | Business Wire | https://www.businesswire.com/news/home/20250512224629/en | 12 May 2025 | 2026-10-10 | B |
| Constellation-Calpine and power M&A supercycle | IB Interview Questions | https://ibinterviewquestions.com/guides/energy-investment-banking/constellation-calpine-power-ma-supercycle | 2026 | 2026-10-10 | C |
| Energy Harbor idea | Value Investors Club | https://valueinvestorsclub.com/idea/Energy_Harbor_Corp/2430663025 | 2023 | 2026-10-10 | C |
| Vistra to create Vistra Vision | Vistra | https://investor.vistracorp.com/2023-03-06-Vistra-to-Create-Vistra-Vision,-a-Leading-Zero-Carbon-Generation-and-Retail-Platform,-Through-the-Acquisition-of-Energy-Harbor | 6 Mar 2023 | 2026-10-10 | B |
| Acea agreement with Equitix | Acea | https://www.gruppo.acea.it/en/media/press-releases-and-news/press-releases/2021/12/acea-signs-agreement-with-equitix-for-the-sale-of-a-majority-stake-in-newco-set-to-manage-photovoltaic-assets | Dec 2021 | 2026-10-10 | B |
| Naturgy buys Ardian's renewable assets | The Corner | https://thecorner.eu/news-spain/spain-economy/naturgy-buys-ardians-renewable-assets-in-spain-for-536-million-euros/105874/ | 2023 | 2026-10-10 | B |
| Atlantica acquires two UK wind assets | TipRanks (The Fly) | https://www.tipranks.com/news/the-fly/atlantica-sustainable-infrastructure-acquires-two-wind-assets-in-the-uk | Mar 2024 | 2026-10-10 | B |
| Ares acquires 49% stake in EDPR portfolio | TipRanks (The Fly) | https://www.tipranks.com/news/the-fly/ares-management-acquires-49-stake-in-portfolio-of-assets-from-edp-renovaveis-thefly | Oct 2025 | 2026-10-10 | B |
| ECP to acquire Atlantica | Inside Arbitrage | https://www.insidearbitrage.com/2024/05/the-acquisition-of-atlantica-by-energy-capital-partners-for-2-55-billion-in-cash/ | 28 May 2024 | 2026-10-10 | C |
| ECP leads $2.56bn consortium deal for Atlantica | Financier Worldwide | https://financierworldwide.com/energy-capital-partners-leads-256bn-consortium-deal-for-atlantica | 2024 | 2026-10-10 | B |
| Drax equity research (BESS £/kW) | Longspur (Drax) | https://www.drax.com/wp-content/uploads/2026/01/Longspur_-_12_January_2026.pdf | 12 Jan 2026 | 2026-10-10 | C |
| Yieldco valuations look attractive | AltEnergyStocks | https://www.altenergystocks.com/?p=11223 | Jan 2024 | 2026-10-10 | C |
| Why NextEra Partners sank | Motley Fool | https://www.fool.com/investing/2023/10/09/why-nextera-partners-sank-yet-again-today | 9 Oct 2023 | 2026-10-10 | B |
| How is the clean energy lending market evolving in 2025 | Crux | https://www.cruxclimate.com/insights/how-is-the-clean-energy-lending-market-evolving-in-2025 | 2025 | 2026-10-10 | C |
| Podcast round-up: Cost of Capital 2019 | Norton Rose Fulbright | https://www.projectfinance.law/blog/podcast-round-up?hsLang=en | Feb 2019 | 2026-10-10 | B |
| Utility-scale solar PV model: P50 bias and debt sizing | eFinancialModels | https://www.efinancialmodels.com/?p=653882 | Aug 2026 | 2026-10-10 | C |
| Takeaways from the evolution of project finance | Morningstar DBRS | https://dbrs.morningstar.com/research/447217/morningstar-dbrs-takeaways-from-the-evolution-of-project-finance-event-our-methodologies-keep-pace-with-technologies | 4 Feb 2025 | 2026-10-10 | C |
| JNL Series Trust N-PORT (term loan pricing) | SEC EDGAR | https://www.sec.gov/Archives/edgar/data/933691/000119312525297453/jnlseriestrustpartf2025q3.htm | 2025 | 2026-10-10 | A |
| DSCR in project finance | Forvis Mazars | https://financialmodelling.forvismazars.com/resources/debt-service-coverage-ratio-dscr/ | 2025 | 2026-10-10 | C |
| Project finance glossary (lock-up example) | Altss | https://altss.com/glossary/project-finance | Oct 2026 | 2026-10-10 | C |
| Annual Global Project Finance Default and Recovery Study 1980-2014 | S&P Global | https://www.spglobal.com/content/dam/spglobal/mi/en/documents/general/Annual-Global-Project-Finance-Default-And-Recovery-Study--1980-2014.pdf | 2015 | 2026-10-10 | C |
| Default and recovery rates for project finance bank loans 1983-2018 | Moody's | https://ma.moodys.com/rs/961-KCJ-308/images/Default Reports - Default-research-Global - 17Aug20.pdf | 17 Aug 2020 | 2026-10-10 | C |
| Generator interconnection costs (multi-region) | LBNL (eScholarship) | https://escholarship.org/content/qt7kd1x4nn/qt7kd1x4nn.pdf | 2024 | 2026-10-10 | A |
| PJM data show substantial increases in interconnection costs | LBNL | https://emp.lbl.gov/news/pjm-data-show-substantial-increases | Jan 2023 | 2026-10-10 | A |
| SPP data show rising network upgrade costs | LBNL | https://emp.lbl.gov/news/spp-data-show-rising-network-upgrade-costs | 2023 | 2026-10-10 | A |
| AI meets the grid: interconnection analysis in PJM and ERCOT | Carbon Direct | https://www.carbon-direct.com/press/carbon-direct-releases-new-analysis-of-power-grid-interconnection-queues-pjm-ercot | 14 May 2026 | 2026-10-10 | C |
| Curtailment mitigation for PCLRs (LLWG) | ERCOT | https://www.ercot.com/files/docs/2026/09/10/Curtailment-Mitigation-for-PCLRs-Modeling-the-Effects-of-Front-of-Meter-Netting_LLWG.pdf | Sep 2026 | 2026-10-10 | A |
| Interconnection and grid analysis update (Apr 2026) | ERCOT | https://www.ercot.com/files/docs/2026/04/13/9-Interconnection-and-Grid-Analysis-Update.pdf | Apr 2026 | 2026-10-10 | A |
| ERCOT operations: leveraging load flexibility | ERCOT (ESIG) | https://www.esig.energy/attachment/serve/ercot-operations-leveraging-load-flexibility-for-grid-reliability_update-06-18-2026 | 17 Jun 2026 | 2026-10-10 | A |
| US power shortage and powered land in Texas | The Next Web | https://thenextweb.com/news/us-power-shortage-grid-interconnection-powered-land-texas | 2026 | 2026-10-10 | B |
| Transferability of queue position clauses | Law Insider | https://www.lawinsider.com/clause/transferability-of-queue-position | n.d. | 2026-10-10 | C |
| Assignment of ISA, queue U4-028 | PJM | https://www.pjm.com/pub/planning/project-queues/isa/u4_028_isa.pdf | n.d. | 2026-10-10 | A |
| FERC rulemakings on large loads and co-location | Brattle | https://www.brattle.com/wp-content/uploads/2026/07/FERC-Rulemakings-on-Large-Loads-and-Co-Location.pdf | 15 Jul 2026 | 2026-10-10 | B |
| FERC challenges RTOs and large loads | Clark Hill | https://www.clarkhill.com/news-events/news/ferc-challenges-rtos-and-large-loads-to-improve-speed-and-flexibility-of-grid-interconnection/ | 22 Jun 2026 | 2026-10-10 | B |
| FERC ANOPR: RTO compliance and the consumer response | NASUCA | https://www.nasuca.org/wp-content/uploads/2026/03/NASUCA.Summer-2026.FERC-ANOPRv.2-Final.pdf | 21 Jul 2026 | 2026-10-10 | B |
| Texas legislature adopts new law on large loads (SB6) | Butler Snow | https://www.butlersnow.com/news-and-events/texas-legislature-adopts-new-law-regarding-large-load-interconnection-and-operation | 2025 | 2026-10-10 | B |
| US grid headroom for flexible load (Duke) | Utility Dive | https://www.utilitydive.com/news/us-grid-headroom-flexible-load-data-center-ai-ev-duke-report/739767/ | Feb 2025 | 2026-10-10 | C |
| Duke researchers: grid flexibility | Power Magazine | https://www.powermag.com/duke-researchers-grid-flexibility-key-to-accommodate-load-growth | Feb 2025 | 2026-10-10 | C |
| Powered land is replacing traditional site selection | Dirt to Data | https://dirttodata.substack.com/p/powered-land-is-replacing-traditional | 2026 | 2026-10-10 | C |
| Data center land deals surged 141% in Q1 | Bisnow | https://www.bisnow.com/national/news/data-center-development/data-center-sites-are-warping-the-market-for-developable-land-134771 | 2026 | 2026-10-10 | B |
| BloombergNEF raises data center forecast to 106 GW | Introl | https://introl.com/blog/bloombergnef-106-gw-data-center-power-forecast-december-2025 | Dec 2025 | 2026-10-10 | C |
| 2024 IEPR data center forecast | California Energy Commission | https://www.energy.ca.gov/sites/default/files/2025-03/Data_Center_Forecast_Final_ada.pdf | Mar 2025 | 2026-10-10 | A |
| Powering Intelligence 2026 | EPRI | https://esca.epri.com/products/3002034696/ | 2026 | 2026-10-10 | C |
| NERC LTRA 2025 coverage | Power Magazine | https://www.powermag.com/nerc-warns-long-term-grid-reliability-risks-mounting-from-surging-demand-lagging-resources | Jan 2026 | 2026-10-10 | A |
| NERC identifies resource adequacy risks to 2030 | GridBeyond | https://gridbeyond.com/nerc-identifies-resource-adequacy-risks-to-2030/ | 2026 | 2026-10-10 | B |
| 2027/2028 BRA FPR, IRM and ELCC | PJM | https://www.pjm.com/-/media/DotCom/committees-groups/committees/mc/2025/20250723/20250723-item-02---2027-2028-bra-fpr-and-irm---presentation.pdf | 23 Jul 2025 | 2026-10-10 | A |
| 2026/27 BRA IRM, FPR and ELCC | PJM | https://www.pjm.com/-/media/DotCom/committees-groups/committees/mc/2025/20250319/20250319-item-03---irm-fpr-and-elcc-for-26-27-bra---presentation.pdf | 19 Mar 2025 | 2026-10-10 | A |
| 2028/2029 BRA FPR, IRM and ELCC | PJM | https://www.pjm.com/-/media/DotCom/committees-groups/committees/mrc/2026/20260213-special/item-01---2028-2029-bra-fpr--irm---presentation.pdf | 13 Feb 2026 | 2026-10-10 | A |
| Preliminary ELCC class ratings 2027/28-2035/36 | PJM | https://www.pjm.com/-/media/DotCom/planning/res-adeq/elcc/preliminary-elcc-class-ratings.pdf | 2025 | 2026-10-10 | A |
| Preliminary ELCC class ratings 2026/27-2034/35 | PJM | https://ftp.pjm.com/-/media/planning/res-adeq/elcc/preliminary-elcc-class-ratings-for-period-2026-2027-through-2034-2035.ashx | 2024 | 2026-10-10 | A |
| Cost and performance of new generating technologies (AEO2023) | EIA | https://www.eia.gov/aeo/assumptions/pdf/elec_cost_perf.pdf | 2023 | 2026-10-10 | A |
| Avoided cost of capacity 2024 (EIA CT table) | PUCT Interchange | https://interchange.puc.texas.gov/Documents/38578_111_1343187.PDF | 2023 | 2026-10-10 | A |
| Nuclear costs in context 2024 | NEI | https://www.nei.org/getContentAsset/47fa8caa-9b0d-4029-932c-07f902e82f4f/8d8ff8d6-b2ae-401b-a63c-f6b108e809d2/2024-Costs-in-Context-final.pdf | 2024 | 2026-10-10 | B |
| US nuclear industry shaved generating costs | Power Magazine | https://www.powermag.com/u-s-nuclear-industry-shaved-generating-costs-by-7-6-compared-to-2018 | 2020 | 2026-10-10 | B |
| Ares acquires 80% of EDPR California solar and battery | OneStopESG | https://onestopesg.com/esg-news/ares-edpr-california-solar-battery-acquisition | 2026 | 2026-10-10 | B |
| ERCOT: how did power prices evolve in 2024 | Modo Energy | https://modoenergy.com/research/ercot-power-prices-2024-energy-arbitrage-ancillary-services-hub-load-zone-west-north-south-houston-panhandle | 21 Feb 2025 | 2026-10-10 | C |
| PJM battery revenues, November 2025 | Modo Energy | https://modoenergy.com/research/pt/pjm-battery-revenues-benchmark-november-2025 | 16 Dec 2025 | 2026-10-10 | C |
| Switch definitive proxy (DEFM14A) | SEC EDGAR | https://www.sec.gov/Archives/edgar/data/1710583/000119312522182816/d347765ddefm14a.htm | 2022 | 2026-10-10 | A |
| Switch additional proxy materials (DEFA14A) | SEC EDGAR | https://www.sec.gov/Archives/edgar/data/1710583/000119312522200502/d387598ddefa14a.htm | 2022 | 2026-10-10 | A |
| DigitalBridge to buy Switch for $8.4 billion | Data Center Knowledge (Bloomberg) | https://www.datacenterknowledge.com/colocation/digitalbridge-buy-data-center-firm-switch-84-billion | 11 May 2022 | 2026-10-10 | B |
| Biggest data center acquisitions | DatacenterDynamics | https://www.datacenterdynamics.com/en/analysis/biggest-data-center-acquisitions-10-billion-dollar-data-center-deals/ | 2026 | 2026-10-10 | B |
| Valuation premiums in utility M&A | S&P Global Market Intelligence (RRA) | https://www.spglobal.com/market-intelligence/en/news-insights/research/valuation-premiums-for-smaller-gas-utilities-suggest-takeout-speculation | 2017 | 2026-10-10 | C |
| Analyzing transaction premium data | Mercer Capital | https://mercercapital.com/five-variations-theme-analyzing-transaction-premium-data-part-1 | 2016 | 2026-10-10 | C |
| Effects of "One Big Beautiful Bill" on projects | Norton Rose Fulbright | https://www.projectfinance.law/publications/2025/july/effects-of-one-big-beautiful-bill-on-projects/ | Jul 2025 | 2026-10-10 | B |
| The One Big Beautiful Bill Act: navigating the new energy landscape | Sidley | https://www.sidley.com/en/insights/newsupdates/2025/07/the-one-big-beautiful-bill-act-navigating-the-new-energy-landscape | Jul 2025 | 2026-10-10 | B |
| 9 key takeaways from the nuclear executive orders | US DOE | https://www.energy.gov/node/4851460 | 10 Jun 2025 | 2026-10-10 | A |
| Recent developments in nuclear power | ScottMadden | https://publications.scottmadden.com/energy-industry-update-v26-i1/recent-developments-in-nuclear-power | 2026 | 2026-10-10 | B |
| Table of 100% clean energy states | CESA | https://www.cesa.org/projects/100-clean-energy-collaborative/guide/table-of-100-clean-energy-states/ | 2025 | 2026-10-10 | B |
| How and when states plan to reduce carbon emissions | APPA | https://www.publicpower.org/periodical/article/how-and-when-states-plan-reduce-carbon-emissions | 2025 | 2026-10-10 | B |
| Q1 2026 Data Center Watch report | Data Center Watch | https://datacenterwatch.org/q1-2026 | 2026 | 2026-10-10 | B |
| Data center opposition delays $68 billion (Q2 2026) | Let's Data Science (Bloomberg) | https://letsdatascience.com/news/us-data-center-opposition-delays-68-billion-projects-16c6814d | Sep 2026 | 2026-10-10 | B |
| More than 75 data center build-outs blocked | Tom's Hardware | https://www.tomshardware.com/tech-industry/artificial-intelligence/more-than-75-data-center-build-outs-worth-usd130-billion-have-been-successfully-blocked-in-the-first-four-months-of-2026-bipartisan-opposition-mounts-nationwide-over-fears-of-soaring-power-and-water-costs | 2026 | 2026-10-10 | B |
| Grassroots opposition blocked $130 billion | The Next Web | https://thenextweb.com/news/data-center-opposition-75-projects-blocked-q1-2026 | 2026 | 2026-10-10 | B |
| Transformers in 2026: shortage, scramble or self-inflicted crisis? | Power Magazine | https://www.powermag.com/transformers-in-2026-shortage-scramble-or-self-inflicted-crisis | 2026 | 2026-10-10 | C |
| US transformer market faces severe supply constraints | pv magazine USA | https://pv-magazine-usa.com/2026/05/11/u-s-transformer-market-faces-severe-supply-constraints-as-lead-times-extend-to-four-years/ | 11 May 2026 | 2026-10-10 | B |
| Transformer supply chain woes persist | EEPower (Wood Mackenzie) | https://eepower.com/market-insights/transformer-supply-chain-woes-persist-as-energy-demand-grows/ | 2025 | 2026-10-10 | C |
| NIST IR 8547 and SP 800-131A | Encryption Consulting | https://www.encryptionconsulting.com/education-center/nist-ir-8547-sp-800-131a-algorithm-transitions/ | 2026 | 2026-10-10 | B |
| NIST IR 8547: a roadmap (June 2026 update) | PostQuantum.com | https://postquantum.com/security-pqc/nist-ir-8547-ipd/ | 2026 | 2026-10-10 | C |
| Polaris: converting fusion energy into electricity | Helion | https://www.helionenergy.com/polaris | 2026 | 2026-10-10 | B |
| Helion fusion net electricity date | Axios Pro | https://www.axios.com/pro/climate-deals/2026/09/08/helion-energy-fusion-net-electricity-date-year | 8 Sep 2026 | 2026-10-10 | B |
| Helion is building a fusion power plant | Scientific American | https://www.scientificamerican.com/article/helion-energy-is-building-a-fusion-power-plant-can-its-technology-deliver/ | 2026 | 2026-10-10 | B |
| Linglong One status | Vozpópuli | https://www.vozpopuli.com/indux/en/chinas-mini-reactor-does-not-look-like-a-giant-plant-but-it-can-power-homes-desalinate-water-and-change-remote-energy/5511/ | Jun 2026 | 2026-10-10 | B |
| SMR deployment milestones | SMR Intel | https://smrintel.com/deployments | 2026 | 2026-10-10 | C |
