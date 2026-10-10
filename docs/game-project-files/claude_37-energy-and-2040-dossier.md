# Doc 37 - Energy and 2040 Research Dossier

Answers the brief in doc 36 (`claude/claude_36-energy-and-2040-research-brief.md`). Companion data: `claude/act5-research/cost_curves.csv`.

Grading: [A] primary/official, [B] reputable reporting or company statement, [C] analyst/forecast/industry estimate, [D] speculative or unsourced inference. All sources accessed 9 October 2026. Dollar figures are in the dollar-year of their source.

Scope note: the research run could not open docs 36 and 31 directly and worked from a summary of doc 36's brief. Topics doc 31 may already cover (hyperscaler capex, PJM capacity, regional prices, space compute) need a cross-check against doc 31; where they conflict, prefer the better-graded source.

## Headline

Cheap power in the early eras comes from contracts and location (Texas curtailment and demand-response credits, seasonal hydro, stranded gas), not from owning small generators. At real installed prices, residential solar costs about $180-260/MWh and small wind about $400-500/MWh, against about $55-75/MWh for utility-scale solar and wind. Firm clean power arrives later and costs more than announcements imply, so Act IV-V ventures should be modeled as high-variance bets with nuclear-style overrun tails.

## Key findings

1. Owned small generation is uneconomic as a cost cutter in every early era [D from [A] inputs]. US residential PV fell 70-80% in real terms over two decades to $4.0/W (2024$), mostly before 2014, and only $0.1-0.2/W per year since [A]. Small wind installed in 2023 averaged $7,370/kW [A].
2. Texas flexibility is the biggest real early-era lever. Riot's demand-response credits are received whether or not it is called on to power down [A]. Credits: $6.5M (2021), $27.3M (2022), $71.2M (2023); the FY2024 10-K splits 2023 into $52.6M manual curtailment (power resale) and $18.6M demand response [A]. August 2023 alone: $31.7M, worth about 1,232 BTC against 333 BTC mined that month (Blockworks) [B].
3. Storage is the fastest-falling cost, but location matters: 2025 turnkey BESS $73/kWh China, $177 Europe, $219 US [B].
4. Grid access, not generation cost, is the binding constraint in the 2030s. End-2025 US queues: 2,061 GW. Median request-to-operation 5.1 years for 2025 projects (1.5 years in 2005). Only 13% of capacity requested 2000-2020 reached operation by end-2025; 75% withdrew [A/C] (LBNL Queued Up 2026).
5. First-of-a-kind firm power costs 2-10x its early pitch. Darlington BWRX-300 unit 1: C$6.1B reactor plus C$1.6B shared infrastructure, C$7.7B for 300 MW, against GE Hitachi's early US$700M target [B]. NuScale CFPP rose $5.3B to $9.3B before cancellation [C]. Natrium is 3 years behind its original DOE target [B].

## Part A - Early-era power options (2009-2026)

### A1. Residential and small-commercial solar

Sourced facts
- US residential median installed price $4.0/W-DC for 2024 installs (20th-80th percentile $3.0-5.2, 2024$, pre-incentive); cash median $3.5/W, loan-financed $4.7/W [A] (LBNL Distributed Solar & Storage 2025 Data Update).
- Prices fell $9-11/W over two decades (70-80% real), steepest through 2014, about $0.1-0.2/W per year since [A]. Soft and balance-of-system costs are about 80% of price [A].
- Historical medians: 2014 $4.3/W (2014$) [A]; 2017 $3.2-4.5/W by size, third-party-owned $3.3 vs host-owned $3.8 [A].
- 2025 modeled/marketplace prices run lower [C]: Wood Mackenzie $3.39/W (Q4 2025), EnergySage $2.49/W (H2 2025), NREL benchmark $2.95/W (Q1 2025). Prefer LBNL transaction medians; use the modeled figures as a "savvy buyer" discount.
- Utility-scale PV: $1.61/W-AC ($1.22/W-DC) for 2024 [A]. Lazard 2026 unsubsidized utility PV LCOE $40-98/MWh vs $38-78 in 2025 [B].
- US residential installs 4,647 MWdc in 2025 (-2%), 19% contraction forecast for 2026 [C].

Inference [D]
- Capacity factor not sourced; proxy 14-20% AC by region.
- Conversion: $4.0/W = $4,000/kW; CRF at 7%/25 yr = 0.0858, so $343/kW-yr. At 15% CF (1.31 MWh/kW-yr): about $262/MWh. At 18% CF: about $217/MWh. With the 30% residential credit: about $150-185/MWh.
- No evidence of solar-only miners at scale. A 7 kW rooftop averages about 1.1 kW, roughly one ASIC.

What the game needs
- Capex: 2009-13 about $7,000-9,000/kW [D]; 2014 $4,300 [A]; 2017 $3,300-3,800 [A]; 2024 $4,000 median, $3,500 cash [A]. Utility option from Act I: $1,600/kW-AC [A].
- Running cost: $15-30/kW-yr O&M [D], no fuel.
- Capacity factor 14-20% [D]; daylight only, about 6-8 of 24 hours.
- Effective cost about $260/MWh without credit, about $180 with [D].
- Build: 1 quarter residential [D]; utility see Part D (interconnection).
- Lifetime 25-30 years, about 0.5%/yr degradation [D].
- Overrun: solar mean 1% (n=41), 0% over +50% [A].
- Constraints: roof area, net-metering rules by region, credit availability by year.
- Side effects: green reputation; lowers daytime bill only.

### A2. Small and distributed wind

Sourced facts
- Small wind (100 kW or less): averaged $11,410/kW over 2014-2023 and $7,370/kW in 2023 (5 projects, 131.2 kW); midsize/large distributed $4,160/kW [A] (PNNL 2024).
- NREL Cost of Wind Energy Review 2024 references: residential 20 kW $8,665/kW; commercial 100 kW $6,800/kW; 1.5 MW distributed $3,362/kW; utility 3.3 MW $1,968/kW, OpEx $43/kW-yr, LCOE $42/MWh [A].
- Utility land-based project cost: peak about $2,370/kW in 2009-10 (2016$); $1,630 (2013), $1,590 (2016), $1,500 (2021); about $1,700/kW (2023$) since 2018. Turbines over $2,000/kW in 2008, about $1,000/kW in 2023 [A].
- NREL ATB net capacity factor about 28% (class 10) to 48% (class 4) [A]. Wind mean overrun 13% (n=82) [A].

Inference [D]
- Small wind at $7,370/kW and 15-20% CF: about $385-515/MWh. Utility wind at $1,700/kW, 40% CF: about $54/MWh.
- No miner used owned small wind at scale; miners accessed wind via ERCOT prices and curtailment.

What the game needs
- Capex: small $7,000-11,000/kW; distributed $3,400-4,200/kW; utility $2,400/kW (2009-10) to $1,500-1,700 (2016-25) [A].
- Running cost $20-43/kW-yr [A].
- Capacity factor: small 15-20% [D], utility 28-48% by wind class [A]; intermittent.
- Effective cost: small about $400-500/MWh, utility about $50-60 [D].
- Build: small 1-2 quarters; utility 4-8 quarters plus interconnection [D].
- Lifetime 20-25 years [D]. Overrun mean 13%, 7% over +50% [A].
- Constraints: wind class by region, zoning, FAA height rules. Side effects: noise-complaint events.

### A3. Batteries for a small operation

Sourced facts
- LBNL, 2022 installs: a battery adds about $2,100/kW or about $900/kWh [A]. In 2024, paired PV+storage cost $1.7/W more than standalone (median battery 13.5 kWh), implying about $900/kWh (2024$) [D from A]. Residential battery costs flat or rising in real terms [A].
- Lazard 2025 unsubsidized LCOS: residential $547-860/MWh, C&I $319-506, utility 2-4 hour $115-277 [C].

Inference [D]: $900/kWh, 10-yr CRF 0.142, 300 cycles/yr gives about $425/MWh shifted. Arbitrage never pays; value is 4CP/peak avoidance and backup.

What the game needs
- Capex about $900/kWh, flat in real terms 2018-2025 [A]; pre-2018 series not found.
- Running cost about $0; about $400+/MWh shifted [D].
- 13.5 kWh covers about 4 hours for one 3.3 kW ASIC [D].
- Build 1 quarter; lifetime 10 years [D].
- Side effects: outage-immunity buff; fire/insurance events.

### A4. Hydro-rich regions

Sourced facts
- Cambridge CCAF: in 2020 Sichuan's share of China's hashrate went from 14.9% to 61.1% over the wet season (May-October), while Xinjiang (coal) fell from 55.1% to 9.6% [B]. Series ended with the June 2021 crackdown [B].
- Sichuan wet-season hydro reported about 0.065-0.08 yuan/kWh (about $0.01), dry season about 3x [C, low reliability]. An academic paper used $0.04/kWh plus 15% overhead [C].
- Sichuan fined hydro stations powering unauthorized mining and squeezed miners in dry seasons; in 2021 miners were told to leave by September [B].
- Since 2021, summer hashrate growth slows as Texas miners curtail for 4CP [C].
- Washington (Chelan/Grant PUD) and Quebec tariffs and moratoria not found [gap]. Nordics already in game data.

What the game needs
- Capex: none for power; site/hosting only.
- Running cost: wet season $10-40/MWh; dry season 3x or unavailable [C].
- Available 5-6 months per year [B].
- Build 1 quarter; each relocation costs downtime plus equipment wear [B].
- Constraint: crackdown event with real precedent (China June 2021) [B].
- Side effects: seasonal migration mechanic. Quebec/Washington is a designed call.

### A5. Iceland

No sources obtained [gap]. Proxy, all [D]: Nordic industrial price minus 10-30%, 100% renewable, free-air cooling; possible caps on new crypto allocations (unverified); build 2-4 quarters. Designed call; verify before shipping.

### A6. Flare and stranded gas

Sourced facts
- Crusoe's flare-mitigation pilot with ExxonMobil in the Bakken began January 2021 [B]. Crusoe said its systems kept over 10 million cubic feet/day from being flared [B] and claimed about 63% lower CO2e than continued flaring [B, company claim].
- About 40 flare-powered sites in four states; $350M Series C in April 2022 [B]. Partners included Equinor, Enerplus, Devon [B].
- North Dakota and Wyoming passed tax breaks for this use [B]. Bakken flaring at points reached almost a fifth of produced gas [B, company statement].
- Flare-gas power commonly quoted at $0.02-0.05/kWh [C/D, low-quality aggregator]. No primary gas price found [gap].

Inference [D]: cost dominated by gensets, mobilization and well decline; sites relocate every 1-3 years.

What the game needs
- Capex $500-1,000/kW genset plus container [D].
- Running cost $20-50/MWh [C/D].
- Capacity factor 80-95%, declining with well output [D].
- Build 1-2 quarters; relocation every 4-12 quarters [D].
- Constraints: oil basins only (ND, Permian, WY), remote, poor latency for GPU work.
- Side effects: emissions PR (+); genset failure and site accident events.

### A7. Texas power contracts

Sourced facts (Riot SEC filings and releases [A])
- Strategy: long-term fixed-price Rockdale PPA, ERCOT Demand Response Service, 4CP avoidance, and resale of power at spot prices.
- 4CP is the highest-load interval in each of June-September; curtailing then lowers transmission charges [A].
- Credits $6.5M (2021), $27.3M (2022), $71.2M (2023; $52.6M manual curtailment + $18.6M demand response) [A]. August 2023: $31.7M [B].
- Riot curtailed over 95% at peaks and still grew production 19% to 6,626 BTC [B]; cost to mine net of credits $7,539/BTC in 2023 vs $11,225 in 2022 [A].
- Marathon told Blockworks (Sept 2023) that demand-response credits were not a material part of its revenues [B].

Inference [D]: the fixed PPA works as a call option on ERCOT scarcity; value is lumpy and weather-driven (Uri Feb 2021, summer 2023).

What the game needs
- Capex none; requires a long PPA (about 10 years) and flexible load [D].
- Running cost: PPA price (game data) minus credits.
- Credit yield proxy: order of $50-100k per MW-year in a hot year, much lower in mild years; model as a weather event [D; Riot's MW base not sourced].
- 4CP: curtail in 4 summer months; each missed peak raises next-year transmission cost.
- Constraints: ERCOT only. GPU/AI loads with SLAs cannot curtail cheaply - a key Act II-III tension.
- Side effects: "paid to switch off" backlash events.

## Part B - Storage at scale

### B1. Utility Li-ion (LFP) BESS

Sourced facts (BNEF [B])
- Average pack price: 2010 about $1,474/kWh (2025$); 2022 $151; 2023 $139; 2024 $115; 2025 $108.
- 2025: stationary $70/kWh (-45%), LFP $81, NMC $128.
- Turnkey BESS: 2024 $165/kWh (revised $169 in 2025$); 2025 $117/kWh (2-hour $124, 4-hour $110). 2025 by region: China $73, Europe $177, US $219.
- US operating storage 37.4 GW by October 2025 [C].
- Round-trip efficiency and degradation: no primary source obtained [gap]; proxy 85-90% RTE, 6,000+ cycles, 15-20 years [D].

Inference [D]: US 4-hour at $219/kWh = $876/kW. CRF 15 yr/7% = 0.1098, so $24/kWh-yr over 330 cycles is about $73/MWh shifted plus charging and about 12% losses, consistent with Lazard's low end.

What the game needs
- Capex: 2015-17 about $400-600/kWh [D proxy]; 2024 $165-169 [B]; 2025 $117 global / $219 US [B]. Regional multipliers China 0.6x, Europe 1.5x, US 1.9x [B].
- Running cost $5-10/kW-yr [D] plus 12-15% RTE losses.
- Hours 2-4 standard, up to 8.
- Build 2-4 quarters; storage is quickest from interconnection agreement to operation [A].
- Lifetime 15 years, about 2%/yr fade [D]. Overrun low (1-5%, solar/transmission proxy) [A proxy].
- Side effects: fire event; 4CP shaving.

### B2. Residential batteries

See A3. Flat at about $900/kWh while pack prices collapsed, because install and soft costs dominate [A]. Do not tie residential battery prices to the BNEF pack curve.

### B3. Pumped hydro

Sourced facts
- NREL ATB 2022: capex $1,999-5,505/kW, fixed O&M $18/kW-yr, variable $0.51/MWh, 10-hour sizing; class 10 average $3,755/kW (2020$) [A]. ATB 2024 class 10 average $4,234/kW (2021$) [A].
- Pumped storage was nearly 95% of US storage capacity (2022) [B].
- Snowy 2.0 (about 2 GW): announced 2017 at A$2B with operation in 2021; reset to A$12B in 2023; A$11.1B spent by 31 March 2026; ANAO June 2026 audit rated management "partly effective" and a further increase likely; first power targeted end-2028 [B].
- ANU modelers claim a 150-year life [C]. Flyvbjerg: dams average about 45% schedule delay [A].

What the game needs
- Capex $2,000-5,500/kW (10 hours), i.e. $200-550/kWh [A].
- Running cost $18/kW-yr plus $0.5/MWh [A]. RTE about 75-80% [D, not sourced].
- Hours 8-12 [A]. Build 32-48 quarters [D; Snowy 11+ years]. Lifetime 50-100+ years [C/D].
- Overrun: median +50%, 10% chance of 3x or more [D, anchored on Flyvbjerg and Snowy].
- Constraints: mountain topography, water rights.
- Side effects: government co-funding; tunnel-boring-machine-stuck events [B].

### B4. Long-duration: iron-air and compressed air

Sourced facts
- Form Energy and Great River Energy (Cambridge, MN; 1.5 MW / 150 MWh, 100 hours) broke ground August 2024 targeting late 2025 [A]; slipped, co-op's May 2026 plan reportedly targets end-2026 [C].
- Google/Xcel 300 MW / 30 GWh agreement, February 2026 [C].
- Cost target under $20/kWh [C, target only]. Form claims up to 20 GWh/yr factory capacity by 2027 [B].
- Iron-air RTE and CAES costs not obtained [gap].

What the game needs
- Capex FOAK $40-100/kWh, target $20 [D/C]. Hours 100 [A]. RTE about 40-50% [D, unverified].
- Build 6-10 quarters, high chance of 4+ quarter slip (Form's first project slipped about 4 quarters) [B/C].
- Use: covering multi-day lulls for renewable-powered compute.

## Part C - Energy ventures 2026-2040

### C0. Base rates (apply to all fictional ventures)

| Reference class | n | Mean cost overrun (real) | % on/under budget | % with >50% overrun | Grade |
|---|---|---|---|---|---|
| Nuclear power | 196 | 120% | 3% | 55% | [A] |
| Nuclear waste storage | 23 | 238% | 9% | 48% | [A] |
| Thermal power | 189 | 18% | 44% | 13% | [A] |
| Wind | 82 | 13% | 45% | 7% | [A] |
| Energy transmission | 54 | 5% | 63% | 4% | [A] |
| Solar | 41 | 1% | 61% | 0% | [A] |

Source: Budzier & Flyvbjerg, Oxford Olympics Study 2024 (arXiv 2406.01714). Flyvbjerg (2014): nine in ten megaprojects overrun [A].

Case anchors
- Vogtle 3-4 (2,234 MW): certified at $14B; total spending by all partners passed $35B per the AJC ($36.8B per consumer groups); finished roughly seven years late; Unit 4 in service April 2024; about $15,700/kW [B/C]. V.C. Summer abandoned 2017 after at least $9B [B].
- NuScale/UAMPS CFPP (462 MW): price rose $58 to $89/MWh (January 2023); estimate $5.3B to $9.3B, about $20,100/kW [D]; subscription about 25% against 80% required; terminated 8 November 2023 despite a $1.4B DOE award [B/C].
- Interconnection: only 13% of capacity requested 2000-2020 reached operation by end-2025, 75% withdrew; over 40% withdrew even after signing an interconnection agreement [A/C].

### C1. Enhanced/next-gen geothermal (EGS)

Real reference points (announced/achieved; not predictions) [B]
- Fervo Cape Station (Beaver County, Utah): First Power 24 September 2026; first 33 MW GeoBlock commercial operation 1 October 2026 at 33 MW net. Phase I about 100 MW, remaining blocks due by 1 January 2027. Phase II about 400 MW targeted 2028. Site permitted for 2 GW. About 900 MW offtake contracted, including a 396 MW, 15-year Google PPA from Q3 2028.
- $421M non-recourse debt (March 2026). Groundbreaking September 2023, about 3 years before first power. Drilling rates up 143% since first Cape well [B].
- Q2 2026 net loss $55.9M [C]. Lazard 2026 geothermal LCOE about $67-111/MWh [C; verify column mapping]. Realized capex/kW not found [gap].

What the game needs
- Capex FOAK $6,000-9,000/kW, NOAK $3,500-5,000/kW [D; $421M debt for about 100 MW implies at least $4,200/kW].
- Running cost $15-30/MWh [D]. Capacity factor 85-95%, firm [D].
- Build: first block 10-14 quarters (real about 12) [B]; later blocks 6-8 quarters [D].
- Lifetime 30 years with redrilling cost [D].
- Overrun: thermal class (mean 18%, 13% chance of >50%) [A], plus 10-20% chance of a weak well field [D].
- Constraints: western hot rock, rig availability. Side effects: induced-seismicity events.

### C2. Small modular reactors (light-water, BWRX-300-type)

Real reference points [B]
- OPG Darlington: CNSC construction licence April 2025; Ontario approval May 2025, C$20.9B for 4 x 300 MW (2024$, incl. interest and contingency); unit 1 C$6.1B reactor + C$1.6B shared infrastructure = C$7.7B (Globe and Mail); grid target end-2030 (originally 2028); operating licence application April 2026.
- GE Hitachi early target US$700M per unit ($2,250/kW).
- TVA Clinch River: NRC staff recommended a construction permit June 2026 [C].
- Announced plans only: Blue Energy targets 2032; Elementl plans 1.5 GW in Ohio, construction 2030-34 [C].

What the game needs
- Capex FOAK $15,000-20,000/kW (Darlington unit 1 about US$18,500/kW at 0.72 USD/CAD [D]); units 2-4 $10,000-13,000/kW. Show the pitch ($2,250-6,000/kW), then reveal the real number.
- Running cost $25-40/MWh [D]. Capacity factor 90% [D].
- Build: licence 8-12 quarters plus construction 16-24 quarters [B]. Lifetime 60 years [D].
- Base rates: nuclear class [A]. FOAK cancellation before construction 30-50% if offtake is weak (CFPP) [D].
- Constraints: existing nuclear sites favored, regulator queue. Side effects: public-opinion events, government cost-share.

### C3. Advanced non-light-water fission

Real reference points [B]: TerraPower Natrium, Kemmerer, Wyoming (345 MW): NRC construction permit 4 March 2026 (about 3 months after NRC's target); nuclear construction began April 2026; completion targeted 2030, 3 years after original DOE target; cost up to $4B with about $2B DOE share [C], about $11,600/kW.

What the game needs: as C2 with capex +20%, build +4 quarters, plus a HALEU fuel-supply risk event [D].

### C4. Fusion

Real reference points [B]
- CFS SPARC: about 80% complete August 2026, operations targeted 2027 (originally first plasma 2025); no plasma yet. CFS applied to PJM for ARC (about 400 MWe, early 2030s) in April 2026.
- Helion: Polaris reported 150 million degrees C with D-T in February 2026, no published gain. Orion (50 MW) has a Microsoft PPA from 2028, received fusion plant licences June 2026; Helion valued at $15.5B. Reporting suggests full 50 MW not before 2029-2030 [C].

What the game needs
- Capex: designed FOAK range $10,000-30,000/kW [D].
- Timeline as science gates (first plasma, Q>1, net electric, 90% availability), each with a probability and a 4-12 quarter slip distribution [D]. Precedent: SPARC slipped about 2 years [B].
- Side effects: hype-cycle equity raises.

### C5. Pumped storage as a venture

Use B3. Fits Act III-IV for a mountain campus, 10-12 year build, fat overrun tail.

### C6. Summary table (probabilities are designed priors [D], grounded in the listed basis)

| Technology | Earliest credible first power (real-world class) | Likely first power, fictional venture started 2027 | P(commercial power by 2035) | P(by 2040) | Basis |
|---|---|---|---|---|---|
| EGS geothermal | Achieved 2026 (Fervo) [B] | 2030-31 | 80% [D] | 92% [D] | Real COD achieved; ~3 yr groundbreaking-to-power; thermal-class overruns |
| LWR SMR (BWRX-type) | End-2030 (Darlington) [B] | 2033-35 | 55% [D] | 85% [D] | Licence plus construction ~6-9 yr; CFPP cancellation; nuclear class [A] |
| Advanced fission (sodium/HTGR) | 2030 target (Natrium) [B] | 2034-36 | 40% [D] | 75% [D] | 3-yr slip already; first-of-kind fuel; nuclear class |
| Fusion (grid electricity) | 2028 claim (Helion) [B] | 2036+ | 10% [D] | 30% [D] | No net-gain device yet; SPARC ~2 yr slip |
| Pumped hydro | Mature [A] | 2037-39 | 15% [D] | 70% [D] | 10-12 yr builds; Snowy 2.0 [B] |
| Iron-air LDES | 2026 target (Form, slipped) [C] | 2029-30 | 75% [D] | 90% [D] | Factory-built; 1-yr FOAK slip |
| Utility solar + 4h BESS (control) | Mature [A] | 2029-30 (queue bound) | 95% [D] | 98% [D] | 1% solar overrun [A]; 5-yr queue [A] |

## Part D - The world 2036-2040

Sourced facts
- IEA Base Case: global data-centre use 415 TWh (2024), about 945 TWh (2030), about 1,200 TWh (2035); 2035 range across cases 700-1,700 TWh. US data centres nearly half of US demand growth to 2030. Global data-centre capacity close to 100 GW in 2024 [A].
- IEA 2026 update: 485 TWh in 2025, about 950 TWh in 2030; AI-focused data centres more than triple to about 465 TWh [A].
- Six leading hyperscalers projected at 239-295 TWh by 2030 [C].
- No credible 2040 projection found [gap].
- US queues end-2025: 2,061 GW (1,312 GW generation + 749 GW storage), down 10%, with over 750 GW withdrawn in 2025. Gas in queues up 86% to 253 GW; solar down 19% to 773 GW. Median request-to-COD 5.1 years (IQR 3.5-7.2). Queues count generation, not new data-centre load [A/C].
- Costs: storage falling (B1); utility PV LCOE rose in 2026 [B]; residential PV stalled [A/C].

Inference [D]
- Extending the IEA 2030-35 slope (about 50 TWh/yr) gives about 1,450 TWh in 2040, range 800-2,300 TWh. Grid connection, not chips, sets the pace.
- A new GW-scale site in the late 2030s waits 4-8 years unless self-supplied, which makes energy ventures the natural Act V engine.
- Policy: US federal wind/solar credit phase-outs (2025 legislation, unverified in this run) tilt toward gas plus storage, consistent with the gas surge in queues.

What the game needs
- Demand: 1,200 TWh in 2035; designed 2040 range 800-2,300 TWh; bust/base/boom scenarios.
- Prices: existing regional data plus a scarcity premium tied to the queue backlog [D].
- Interconnection 16-32 quarters; self-supply skips the queue but takes venture risk.
- 2040 costs (designed [D]): BESS $60-90/kWh (US), utility PV $0.9-1.2/W-AC, SMR NOAK $7,000-10,000/kW if the venture succeeds.
- Events: AI-demand bust, queue reform, carbon policy swing, fusion breakthrough (low probability).

## Open questions

Not found, proxy used
- Tracking the Sun medians 2009-2022 (proxy: decline envelope).
- Wind installed cost for 2015, 2020, 2024.
- Residential battery cost before 2022; BESS cost before 2024.
- Li-ion RTE and degradation; pumped-hydro RTE; iron-air RTE; CAES costs.
- Fervo capex/kW; SMR O&M; nuclear capacity factor.
- Iceland, Quebec and Washington tariffs.
- Flare-gas prices and genset capex.
- 2040 demand; space-compute economics.

Designed calls
- All Part C probabilities; fusion capex; 2030-2040 CSV projections; Texas credit yield per MW; seasonal-hydro relocation mechanics; keeping residential batteries decoupled from pack prices (evidence says yes).

Conflicts
- Vogtle total $35B vs $36.8B: prefer $35B, show $36.8B as upper bound.
- CFPP $9.2B vs $9.3B: immaterial.
- Residential solar 2025 $2.49-4.0/W by source type: prefer the LBNL median.

## Five findings most likely to change the design

1. Small owned solar, wind and batteries should not cut costs; make them reputation, resilience or hedge tools.
2. Texas flexibility (credits paid whether called or not, plus 4CP) is the real early-era money engine, and it conflicts structurally with GPU/AI loads that cannot curtail.
3. Utility storage capex should fall steeply with regional multipliers (US about 1.9x global); residential storage should not follow it.
4. Firm-power ventures need a reveal-the-real-cost mechanic and fat-tailed overruns: nuclear mean +120%, pumped hydro up to 6x.
5. In Acts IV-V, interconnection time is the binding constraint, making self-supplied firm power the core strategic lever.

## Biggest data gaps

Iceland and North American hydro tariffs; flare-gas economics; EGS and SMR realized capex/O&M; storage efficiency and degradation from primary sources; any credible 2040 demand or space-compute projections.

## Sources

| Title | Publisher | URL | Published | Accessed | Grade |
|---|---|---|---|---|---|
| Distributed Solar & Storage 2025 Data Update | LBNL | https://emp.lbl.gov/sites/default/files/2025-10/Distributed%20Solar%20&%20Storage-2025%20Data%20Update.pdf | Oct 2025 | 2026-10-09 | A |
| Tracking the Sun 2024 Report | LBNL | https://emp.lbl.gov/sites/default/files/2024-10/Tracking%20the%20Sun%202024_Report.pdf | Oct 2024 | 2026-10-09 | A |
| Tracking the Sun 2023 Report | LBNL | https://emp.lbl.gov/sites/default/files/5_tracking_the_sun_2023_report.pdf | Sep 2023 | 2026-10-09 | A |
| Tracking the Sun 2018 Edition | LBNL | https://eta.lbl.gov/publications/tracking-sun-installed-price-trends | 2018 | 2026-10-09 | A |
| Tracking the Sun VIII | LBNL (novoco copy) | https://www.novoco.com/public-media/documents/nrel_tracking_the_sun_081215.pdf | Aug 2015 | 2026-10-09 | A |
| Utility-Scale Solar 2025 Data Update | LBNL | https://emp.lbl.gov/sites/default/files/2025-10/Utility%20Scale%20Solar%202025%20Edition%20Slides.pdf | Oct 2025 | 2026-10-09 | A |
| Solar Industry Statistics 2026 | leads4build | https://leads4build.com/insights/solar-industry-statistics-trends | 2026 | 2026-10-09 | C |
| Solar Panel Cost 2026 | solarpoweredtech | https://www.solarpoweredtech.com/solar-panel-cost-2026/ | 2026 | 2026-10-09 | C |
| U.S. solar LCOE on the rise, says Lazard | pv magazine | https://www.pv-magazine.com/2026/07/13/u-s-solar-lcoe-on-the-rise-lazard-says/ | 13 Jul 2026 | 2026-10-09 | B |
| Lazard's LCOE+ 2026 | Lazard | https://www.lazard.com/media/kcfconhf/lazards-lcoeplus_vf.pdf | Jun 2026 | 2026-10-09 | C |
| Lazard's LCOE+ June 2025 | Lazard | https://www.lazard.com/media/uounhon4/lazards-lcoeplus-june-2025.pdf | Jun 2025 | 2026-10-09 | C |
| Li-ion pack prices fall to $108/kWh | BloombergNEF | https://about.bnef.com/insights/clean-transport/lithium-ion-battery-pack-prices-fall-to-108-per-kilowatt-hour-despite-rising-metal-prices-bloombergnef/ | 9 Dec 2025 | 2026-10-09 | B |
| Pack prices see largest drop since 2017 ($115) | BloombergNEF | https://about.bnef.com/insights/commodities/lithium-ion-battery-pack-prices-see-largest-drop-since-2017-falling-to-115-per-kilowatt-hour-bloombergnef/ | 10 Dec 2024 | 2026-10-09 | B |
| Pack prices hit record low of $139/kWh | BloombergNEF | https://about.bnef.com/insights/clean-energy/lithium-ion-battery-pack-prices-hit-record-low-of-139-kwh/ | 27 Nov 2023 | 2026-10-09 | B |
| Battery storage system prices continue to fall | Energy-Storage.news | https://www.energy-storage.news/battery-storage-system-prices-continue-to-fall-sharply-bnef-and-ember-reports-find/ | Dec 2025 | 2026-10-09 | B |
| Distributed Wind Market Report 2024 | PNNL | https://www.pnnl.gov/main/publications/external/technical_reports/PNNL-36057.pdf | 2024 | 2026-10-09 | A |
| Cost of Wind Energy Review 2024 | NREL/NLR | https://docs.nlr.gov/docs/fy25osti/91775.pdf | 2025 | 2026-10-09 | A |
| Land-Based Wind Market Report 2024 | LBNL | https://escholarship.org/content/qt5697p8s6/qt5697p8s6.pdf | 20 Aug 2024 | 2026-10-09 | A |
| Annual wind power report (2016 data) | LBNL | https://newscenter.lbl.gov/2017/08/08/annual-wind-power-report-confirms-technology-advancements-improved-project-performance-low-wind-energy-prices/ | 8 Aug 2017 | 2026-10-09 | A |
| Wind report (2021 data) | LBNL | https://newscenter.lbl.gov/2022/08/16/report-highlights-technology-advancement-and-value-of-wind-energy/ | 16 Aug 2022 | 2026-10-09 | A |
| ATB Land-Based Wind 2025 | NREL/NLR | https://atb.nlr.gov/electricity/2025/land-based_wind | 2025 | 2026-10-09 | A |
| ATB Pumped Storage 2022 | NREL | https://atb.nrel.gov/electricity/2022/pumped_storage_hydropower | 2022 | 2026-10-09 | A |
| ATB Pumped Storage 2024 | NREL | https://atb.nrel.gov/electricity/2024/pumped_storage_hydropower | 2024 | 2026-10-09 | A |
| NREL includes pumped storage in 2022 ATB | Renewable Energy World | https://www.renewableenergyworld.com/energy-storage/pumped-storage/nrel-includes-pumped-storage-in-2022-electricity-technology-baseline-report/ | 2022 | 2026-10-09 | B |
| Snowy Hydro 2.0 cost blowout lessons | PASA | https://procurementandsupply.com/snowy-hydro-2-0-cost-blowout-highlights-procurement-lessons-for-future-megaprojects/ | 6 Jul 2026 | 2026-10-09 | B |
| Snowy 2.0 defends timeline | ABC News | https://www.abc.net.au/news/2026-02-02/snowy-hydro-project-timeline-defend-machine-cost-blowout/106231224 | 2 Feb 2026 | 2026-10-09 | B |
| Not an apologist for Snowy 2.0 | The Conversation | https://theconversation.com/im-not-an-apologist-for-the-snowy-2-0-hydro-scheme-but-lets-not-obsess-over-the-delays-and-cost-blowouts-204915 | 2023 | 2026-10-09 | B |
| Snowy 2.0 will last 150 years | ANU RE100 | https://re100.eng.anu.edu.au/2025/10/22/Snowy-2-conversation/ | 22 Oct 2025 | 2026-10-09 | C |
| Oxford Olympics Study 2024 (overrun table) | Budzier & Flyvbjerg, arXiv | https://arxiv.org/pdf/2406.01714 | Jul 2024 | 2026-10-09 | A |
| What You Should Know About Megaprojects | Flyvbjerg, arXiv | https://arxiv.org/pdf/1409.0003 | 2014 | 2026-10-09 | A |
| Wait nearly over for Vogtle | WRDW/AP | https://www.wrdw.com/2023/05/25/with-unit-3-poised-full-power-wait-is-nearly-over-vogtle/ | 25 May 2023 | 2026-10-09 | B |
| New Vogtle reactor now online | AJC | https://www.ajc.com/news/breaking-new-vogtle-nuclear-reactor-now-online-completing-expansion/TX5IKFCXZ5EQ3AWY6SQRBOXQW4/ | Apr 2024 | 2026-10-09 | B |
| New nuclear reactors to cost Georgia ratepayers | Georgia Conservation Voters | https://gcvoters.org/blog/2024/05/29/report-new-nuclear-reactors-to-cost-georgia-ratepayers-extra-420-annually-on-average/ | 29 May 2024 | 2026-10-09 | C |
| NuScale, UAMPS terminate SMR project | Utility Dive | https://www.utilitydive.com/news/nuscale-uamps-terminate-small-modular-nuclear-reactor-smr-project-idaho/699281/ | Nov 2023 | 2026-10-09 | B |
| Plug pulled on first US SMR project | NRUCFC | https://www.nrucfc.coop/content/solutions/en/stories/energy-tech/plug-pulled-on-first-us-small-modular-reactor-project.html | 2023 | 2026-10-09 | B |
| Big costs sink flagship nuclear project | Beyond Nuclear International | https://beyondnuclearinternational.org/2024/01/21/big-costs-sink-flagship-nuclear-project/ | 21 Jan 2024 | 2026-10-09 | C |
| Darlington SMR to cost nearly $21-billion | WNISR (Globe and Mail) | https://www.worldnuclearreport.org/Ontario-s-Darlington-SMR-project-to-cost-nearly-21-billion-significantly-higher | May 2025 | 2026-10-09 | B |
| BWRX-300 approved at Darlington | Neutron Bytes | https://neutronbytes.com/2025/05/17/geh-bwrx-300-smr-approved-for-construction-at-opgs-darlingtion-site/ | 17 May 2025 | 2026-10-09 | B |
| OPG applies for BWRX-300 operating licence | Foro Nuclear | https://www.foronuclear.org/en/updates/news/ontario-power-generation-applies-for-operating-licence-for-a-bwrx-300-small-modular-reactor-at-darlington/ | 17 Apr 2026 | 2026-10-09 | B |
| NRC approves TerraPower construction permit | ANS | https://www.ans.org/news/article-7818/nrc-approves-terrapower-construction-permit/ | 4 Mar 2026 | 2026-10-09 | B |
| SMR Construction Cost per kW 2026 | iRecruit.co | https://www.irecruit.co/guides/smr-construction-cost-per-kw | Aug 2026 | 2026-10-09 | C |
| Fervo Achieves First Power at Cape Station | GlobeNewswire (Fervo) | https://www.globenewswire.com/news-release/2026/09/24/3368115/0/en/fervo-energy-achieves-first-power-at-cape-station-a-landmark-moment-for-the-future-of-enhanced-geothermal-systems.html | 24 Sep 2026 | 2026-10-09 | B |
| Fervo Declares Commercial Operation | GlobeNewswire (Fervo) | https://www.globenewswire.com/news-release/2026/10/01/3372717/0/en/fervo-energy-declares-commercial-operation-at-cape-station-ahead-of-schedule-leading-the-race-for-next-generation-geothermal-energy.html | 1 Oct 2026 | 2026-10-09 | B |
| Fervo Secures $421M Project Financing | Fervo Energy | https://fervoenergy.com/fervo-energy-secures-421-million-in-non-recourse-project-financing-for-cape-station/ | 19 Mar 2026 | 2026-10-09 | B |
| Fervo Hits First Power | Yahoo Finance | https://finance.yahoo.com/energy/articles/fervo-hits-first-power-cape-120500060.html | Sep 2026 | 2026-10-09 | B |
| CFS and Helion at Disrupt 2026 | TechCrunch | https://techcrunch.com/2026/09/28/commonwealth-fusion-systems-brandon-sorbom-and-helions-david-kirtley-on-bringing-fusion-to-the-grid-at-techcrunch-disrupt-2026/ | 28 Sep 2026 | 2026-10-09 | B |
| CFS SPARC full guide | Inside Deep Tech | https://www.insidedeeptech.com/commonwealth-fusion-systems-sparc-full-guide/ | Oct 2026 | 2026-10-09 | C |
| The Helion Polaris Fusion Reactor | The Innovation Attorney | https://theinnovationattorney.substack.com/p/the-helion-polaris-fusion-reactor | 2026 | 2026-10-09 | C |
| GRE and Form Energy break ground | Form Energy | https://formenergy.com/great-river-energy-and-form-energy-break-ground-on-first-of-its-kind-multi-day-energy-storage-project/ | 15 Aug 2024 | 2026-10-09 | A |
| Form Energy profile | Venture Atlas | https://www.ventureatlas.org/company/form-energy | 2026 | 2026-10-09 | C |
| Form Energy secures $405M | Renewable Energy World | https://www.renewableenergyworld.com/energy-storage/long-duration/the-missing-piece-of-the-storage-puzzle-multi-day-iron-air-battery-company-secures-405m-investment/ | 2024 | 2026-10-09 | B |
| Riot FY2023 results (Ex. 99.1) | SEC EDGAR | https://www.sec.gov/Archives/edgar/data/1167419/000116741924000001/riot-20240222xex99d1.htm | 22 Feb 2024 | 2026-10-09 | A |
| Riot 10-Q Q1 2026 | SEC EDGAR | https://www.sec.gov/Archives/edgar/data/1167419/000110465926053120/riot-20260331x10q.htm | 2026 | 2026-10-09 | A |
| Riot FY2023 results release | Riot Platforms | https://www.riotplatforms.com/riot-platforms-reports-full-year-2023-financial-results-current-operational-and-financial-highlights/ | Feb 2024 | 2026-10-09 | A |
| Texas paid Riot $31.7M | CNBC | https://www.cnbc.com/2023/09/06/texas-paid-bitcoin-miner-riot-31point7-million-to-shut-down-in-august.html | 6 Sep 2023 | 2026-10-09 | B |
| Riot racks up $31M in credits | Blockworks | https://blockworks.co/news/riot-platforms-texas-mining | Sep 2023 | 2026-10-09 | B |
| Exxon mining bitcoin with Crusoe | CNBC | https://www.cnbc.com/2022/03/26/exxon-mining-bitcoin-with-crusoe-energy-in-north-dakota-bakken-region.html | 26 Mar 2022 | 2026-10-09 | B |
| Oil producers turn to crypto to reduce flaring | Oil & Gas IQ | https://www.oilandgasiq.com/decarbonization/articles/us-oil-producers-turn-to-crypto-mining-to-reduce-flaring | 2022 | 2026-10-09 | B |
| Mining Bitcoin a solution to flaring? | Oil and Gas Lawyer Blog | https://www.oilandgaslawyerblog.com/mining-bitcoin-a-solution-to-gas-flaring/ | 2021 | 2026-10-09 | B |
| Bitcoin mining with flared gas | Apextomining | https://apextomining.com/2025/11/14/how-bitcoin-mining-uses-flared-and-stranded-natural-gas-to-cut-waste-and-costs/ | 14 Nov 2025 | 2026-10-09 | D |
| China's bitcoin mining exodus | Cambridge Judge Business School | https://www.jbs.cam.ac.uk/2021/new-data-reveals-timeline-of-chinas-bitcoin-mining-exodus/ | 2021 | 2026-10-09 | B |
| Bitcoin Mining Map | Cambridge CCAF | https://ccaf.io/cbnsi/cbeci/mining_map | 2021 | 2026-10-09 | B |
| The Summer Slowdown | Hashrate Index | https://hashrateindex.com/blog/the-summer-slowdown-how-seasons-shape-hashrate-markets/ | 2025 | 2026-10-09 | C |
| Miners flock to Sichuan | Bitcoin.com News | https://news.bitcoin.com/chinese-miners-flock-to-sichuan-for-cheap-electricity-during-the-wet-season/ | 2019 | 2026-10-09 | C |
| BDoS: Blockchain Denial of Service | arXiv | https://arxiv.org/pdf/1912.07497 | 2019/2020 | 2026-10-09 | C |
| Sichuan lenient on bitcoin mining | SCMP | https://www.scmp.com/tech/tech-trends/article/3136357/sichuan-takes-lenient-stance-bitcoin-mining-amid-national | 2021 | 2026-10-09 | B |
| China's underground crypto mining | CNBC | https://www.cnbc.com/amp/2021/12/18/chinas-underground-bitcoin-miners-.html | 18 Dec 2021 | 2026-10-09 | B |
| Queue backlog eased in 2025 | APPA | https://www.publicpower.org/periodical/article/backlog-power-plants-seeking-transmission-grid-connection-eased-somewhat-2025-lbnl | Jun 2026 | 2026-10-09 | B |
| Interconnection queue statistics | GridVision AI | https://gridvisionai.com/interconnection-queue/statistics | 2026 | 2026-10-09 | C |
| The Interconnection Queue | IAMT Policy | https://iamtpolicy.org/learn/energy-and-power/the-interconnection-queue/ | 2026 | 2026-10-09 | C |
| Energy and AI - Executive summary | IEA | https://www.iea.org/reports/energy-and-ai/executive-summary | 10 Apr 2025 | 2026-10-09 | A |
| Key Questions on Energy and AI | IEA | https://iea.blob.core.windows.net/assets/3179f7f8-01f6-4dd6-bffa-c9f7b73f1dc9/KeyQuestionsonEnergyandAI.pdf | 2026 | 2026-10-09 | A |
| AI data centers could reach 1% of global electricity | Nature | https://www.nature.com/articles/s44458-026-00152-5 | 2026 | 2026-10-09 | C |
