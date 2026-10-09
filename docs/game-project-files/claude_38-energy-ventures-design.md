# 38: Energy options and ventures: design decisions from doc 37 (design thread, 9 Oct 2026)

*Turns the research dossier (doc 37, with `act5-research/cost_curves.csv`) into rule sets for three planned features: cheaper power in the early eras (Prologue to Act II), energy ventures (Acts III-IV, paying off in Act V), and the Act V go/no-go. Nothing here is decided until the owner approves §9. Grades follow doc 36 ([A] primary, [B] reputable reporting or company statement, [C] analyst or forecast, [D] inference or designed). ⚙ marks a value the bots tune. "Kept" means a number taken from doc 37 as is; "rounded" means a game-friendly rounding of a sourced range; "designed" means invented here with the reason given.*

**Two caveats before anything else.** Doc 37 was written without sight of docs 36 and 31. §1 lists what it therefore missed against the brief; §2 lists where it overlaps doc 31. The short version: Parts A-C are usable now with the gaps in §8 filled by designed values; Part D is too thin to author Act V's futures, and that is the pivot of §6.

---

## 1. Doc 37 against doc 36's brief

What the brief asked for, and whether doc 37 delivered it. "Partial" means some of the item, usually without the by-year or by-region detail asked for.

| Brief item | Delivered? | What is missing |
|---|---|---|
| A1 Rooftop solar $/W by year, US and one European market | Partial | European market absent; 2009-2013 and 2018-2023 US years are proxies; share of a 24/7 rig covered given only as "one rooftop ≈ one ASIC" |
| A2 Small wind cost, real CFs, why it underperforms | Partial | Costs sourced [A]; realised capacity factors and the reasons for underperformance not sourced (CF is a 15-20% proxy) |
| A3 Batteries by year, residential and utility; RTE, cycles, degradation; solar+storage worked examples (home rig 2015, 1 MW site 2022) | Partial | Residential only 2022 and 2024; utility turnkey only 2024-25; no primary RTE or degradation; **both worked examples absent** |
| A4 "Utilities included" mining anecdotes | **Missing** | Nothing |
| A5 Hydro regions: Washington PUDs, upstate NY, Quebec; rates, allocations, backlash timeline | **Missing** (Sichuan given instead) | Nothing on the three regions asked for; Sichuan's wet/dry pattern is useful for network-hashrate seasonality but not for a US-based player |
| A6 Iceland | **Missing** | Declared a gap; proxy only |
| A7 Flare and stranded gas | Partial | Economics are [C/D] aggregator figures; one operator's history (Crusoe) only; regulation one line |
| A8 On-site solar and wind for miners and AI sites by region; behind-the-meter rules | Partial | Capex sourced; capacity factors by region (Texas, Georgia, Nordics) and behind-the-meter rules absent |
| A9 Texas: PPAs, negative-price hours by year, miner use of DR and curtailment | Partial | DR and curtailment well sourced [A]; **negative-price-hour share by year absent**; only one company's PPA, price not given |
| B1 Utility batteries: $/kWh, $/kW, durations, what they earn, capacity-market treatment | Partial | Costs [B]; earnings only as LCOS; **capacity-market treatment (PJM, ERCOT) absent** |
| B2 Pumped hydro: global share, capex, build, siting, overruns, closed-loop and former-mine projects, ownership | Partial | Capex, build and Snowy 2.0 well covered; global share, closed-loop projects and third-party stakes absent |
| B3 Long-duration storage | Mostly | CAES costs and iron-air RTE declared gaps |
| C per technology: milestones, slip record, FOAK and scale $/MWh, **offtake and pre-purchase structures**, base rates | Partial | Milestones and base rates good; **offtake structures absent** (only two PPAs named, no terms); Kairos, X-energy and NuScale Romania not covered; "others" (gas with CCS, hydrogen, space solar) **absent** |
| C summary table | Delivered | Probabilities labelled [D] as the owner asked |
| D1 Data-centre demand to 2040 | Delivered | 2040 is a stated extrapolation [D] |
| D2 AI compute and chips to 2040 | **Missing** | |
| D3 Orbit after 2035 | **Missing** | |
| D4 Moon after 2035 | **Missing** | |
| D5 Bitcoin halvings and 2030s hashprice | **Missing** | |
| D6 Quantum and Q-Day | **Missing** | |
| D7 Grid and policy to 2040 | Partial | Queues [A]; policy "unverified in this run" |
| D8 **4-6 candidate Act V scenarios with indicators and a decoy** | **Missing** | The item Act V depends on most |
| CSV of cost curves | Delivered | Thin: no residential battery before 2022, no utility turnkey before 2024, no European solar, pumped hydro only 2020-21 |
| Sources list, open questions | Delivered | |

**Reading:** Parts A-C give the early-era options and the ventures enough to design against, with §8's gaps filled by designed values flagged as such. Part D delivers one of eight items. §8 turns the misses into a second brief.

## 2. Cross-check with doc 31

Where both dossiers speak to the same fact, and which to use.

| Topic | Doc 31 | Doc 37 | Verdict |
|---|---|---|---|
| Interconnection | Median request-to-operation "over 5 years" for 2025 builds; 13% of 2000-2020 requests reached operation; 2,061 GW queued end-2025 (LBNL [A]) | Median 5.1 years (IQR 3.5-7.2), 13%, 75% withdrew, 2,061 GW (LBNL Queued Up 2026 [A]) | Consistent; same source. Use 37's more precise figures. Doc 33's 16-24 quarters for a grid connection stands |
| Data-centre demand | IEA: 415 TWh (2024), ~945 (2030), ~1,200 (2035), range 700-1,700; graded [C] | Same, plus IEA 2026 update 485 TWh (2025), ~950 (2030); graded [A] | Consistent. **Grading conflict:** 37 grades IEA projections [A]; they are forecasts and should be [C] (measured history [A]). Use [C] for every IEA forward figure |
| Hyperscaler capex | Top five >$400B in 2025, +75% in 2026 (IEA [A]); Moody's ~$785B 2026, ~$1T 2027 [C] | Not covered (gives six hyperscalers' TWh only) | No conflict; doc 31 is the source |
| PJM capacity | $333.44/MW-day cap 2027/28, $325 2028/29, region short of its reliability target [A] | Not covered | No conflict; doc 31 is the source. Used in §4.8 for battery capacity revenue |
| Regional power prices | US industrial 8.62 ¢/kWh 2025 [A]; 2031-35 band 8-12 ¢ [inference] | None (Iceland, Quebec, Washington are gaps) | No conflict; §7 supplies designed regional values |
| Space compute | The authority (cost model, parity ~2040 base per SemiAnalysis [C]) | Lists it as a gap | No conflict |
| NuScale CFPP cost | $3.6B to $9.3B (Wikipedia [A/B]) | $5.3B to $9.3B [C] | **Different baselines, not a contradiction.** $5.3B is the 2021 estimate for the downsized 462 MW plant and the step reported in the January 2023 price revision; $3.6B is an earlier estimate. For the pitch-versus-real reveal use **$5.3B → $9.3B** (the documented 2021-2023 step, better graded in 37's sources); cite the earlier figure only as "the original pitch was lower still" |
| Fervo Cape Station | "Starts in 2026, up to 500 MW" (Wikipedia [B]) | First power 24 Sep 2026, 33 MW commercial 1 Oct 2026, Phase I ~100 MW, Phase II ~400 MW by 2028, 2 GW permitted (company releases [B]) | 37 is more recent and primary-adjacent; use 37 |
| TerraPower Natrium | Construction began April 2026; Meta funding two reactors by 2032 [A/B] | NRC permit 4 Mar 2026; completion 2030, three years late; up to $4B with ~$2B DOE [C] | Consistent; use both |
| SMRs online | "Around 2030 at the earliest" (IEA [C]) | Darlington grid target end-2030, originally 2028 [B] | Consistent |
| Fusion | ARC "early 2030s" [B]; Helion 2028 doubted [B/C] | SPARC ~80% complete, no plasma; Orion 50 MW not before 2029-30 [C]; P(grid power by 2035) 10% [D] | Consistent. Doc 33's "fusion is not in F4" stands |
| Community opposition and moratoria | 75% oppose (Aug 2026); NY 50 MW+ pause [A] | Not covered | No conflict; doc 31 is the source |
| Nuclear PPA pricing in Act III (doc 27/28 market files) | n/a | FOAK SMR capex $15-20k/kW implies ~$170-200/MWh unsubsidised at 90% CF and 7% (derived); CFPP's $89/MWh needed a $1.4B DOE award and municipal financing [B/C] | **Check for the build thread:** if Act III's nuclear PPA prices sit below ~$90/MWh before 2031, they assume a subsidy the game doesn't show. Not a rule change in this doc; a consistency check |

No figure in doc 37 contradicts doc 31 outright. The one grading error (IEA forecasts as [A]) and the one baseline difference (CFPP) are noted above.

## 3. Design stance: what the five findings change

1. **Owned small generation is a badge, not a cost cutter.** Rooftop solar, small wind and home batteries are offered in the Prologue and Act I with their real economics visible on the card (payback in years), so a player who buys them does so for the reason real people did: reputation, resilience, a hedge against a bill. The game never pretends they cut the cost per coin. Small wind is the deliberate trap doc 36 proposed; doc 37 confirms it is fair even at the salesman's capacity factor ($385-515/MWh).
2. **Texas flexibility is the early money engine, and it is structurally hostile to AI load.** Demand-response credits paid whether or not called, 4CP avoidance and power resale are Act I-II mechanics for curtailable miners only. GPU projects with SLAs are excluded from every one of them. The way out is a battery: a 4-hour BESS sized to the AI load makes the *battery* the curtailable asset. That resolves finding 2 into a decision rather than a dead end, and it is how the real operators are doing it.
3. **Utility storage falls on BNEF's curve with regional multipliers; residential storage does not.** Two separate price series in the market files.
4. **Firm-power ventures are pitch-versus-real bets with fat tails.** One mechanic (§5.1) serves every venture type: the card shows the developer's pitch; due diligence buys the reference-class estimate; the real number arrives in tranches as cash calls.
5. **From Act IV, interconnection is the binding constraint, so self-supplied firm MW is the strategic lever.** Doc 33 already has this (16-24 quarters, FERC's curtailable-load fast lane in F4). The ventures feature gives it a payoff: a venture that delivers skips the queue.

## 4. Rule sets: early-era power options (Prologue to Act II)

Format follows doc 37's "What the game needs". Build time in quarters; lifetimes in years; money in dollars of the era (the market file carries the year series).

### 4.1 Rooftop solar (Prologue from 2010, Act I garage and own sites)

| Field | Rule | Source and change |
|---|---|---|
| Capex $/kW by year | 2009-12: 8,000 · 2013: 6,000 · 2014: 4,300 · 2015-16: 4,000 · 2017-23: 3,800 · 2024+: 3,500 (cash) | 2014, 2017, 2024 kept [A]; 2009-13 and 2018-23 are the CSV's proxies [D]; 2024 uses the cash median because the player pays cash |
| Investment tax credit (US) | 30% to 2019 · 26% 2020-21 · 30% from 2022Q3 | **Designed from the ITC schedule as the design thread recalls it; verify (§8, Q12)** |
| Running cost | $20/kW-yr | Rounded from $15-30 [D] |
| Capacity factor | 15% (1.31 MWh/kW-yr); daylight only | Kept, low end of 14-20% [D]; Texas and Georgia sites 17% |
| Effect | With net metering (default yes, 2009-2022): offsets kW × 1.31 MWh × retail price per year from the site's bill. Without it: offsets daytime load only, surplus wasted | Designed; the brief's "share of a 24/7 load" is answered by the bill offset, which is how the money really flowed |
| Roof limit | Bedroom 5 kW · garage 7 kW · own site: 100 kW per site (warehouse roof) | Designed; 7 kW ≈ 1.1 kW average ≈ one ASIC [D] |
| Build | 1 quarter | Kept |
| Lifetime | 25 years, no failure in the sim | Kept; 0.5%/yr degradation dropped as noise |
| Overrun | None | Kept (solar class: mean 1%, 0% over +50% [A]) |
| Side effects | Card shows payback in years (24-50 at $0.12/kWh); one tape note in the Prologue ("the roof pays for itself in 2041"); in the garage era a one-off Heat −3 at the site | Designed. The payback line is the honesty device |

Effective cost shown on the card: $524/MWh (2009), $262/MWh (2014, pre-credit), $183/MWh (2024 with credit) (derived, CRF 7%/25 yr = 0.0858).

### 4.2 Small wind (Prologue and Act I; the trap)

| Field | Rule | Source and change |
|---|---|---|
| Capex $/kW | 2009-16: 10,000 · 2017-23: 7,500 (20-100 kW class) | Rounded from PNNL's $11,410 (2014-23 average) and $7,370 (2023) [A] |
| Running cost | $40/kW-yr | Kept (NREL $43) [A] |
| Capacity factor | **Pitched 20%, realised 8-15% drawn at install (hidden until the first quarter report)** | Pitched figure from doc 37's proxy; realised band **designed**: the brief asked why small wind underperforms and doc 37 could not source it (§8, Q11). The hidden draw is the trap mechanic |
| Build | 2 quarters | Kept |
| Lifetime | 20 years; 5%/yr breakdown chance, repair = 10% of capex | Lifetime kept; breakdown designed |
| Overrun | Wind class: median ×1.02, σ 0.30, P(>1.5) ≈ 7% | From Budzier & Flyvbjerg wind row [A] |
| Constraints | Not in the bedroom (zoning); own sites only in rural regions | Designed from "zoning, FAA height" [D] |
| Side effects | Noise complaint event (Heat +4) with 30%/yr chance | Kept as an event; number designed |

### 4.3 Home battery (Prologue from 2015, Act I)

| Field | Rule | Source and change |
|---|---|---|
| Capex $/kWh | 2015-17: 1,200 · 2018-25: 900 (flat) | 2018-25 kept [A]; pre-2018 proxy [D] (doc 37 found no series) |
| Unit | 13.5 kWh blocks; 1 block = 4 hours for one 3.3 kW ASIC | Kept [D] |
| Running cost | $0 | Kept |
| Effect | Outage immunity: during a power-outage interrupt, machines up to blocks × 1 keep running for the outage's first 4 hours; no arbitrage value shown or earned ($425/MWh shifted) | Kept; the no-arbitrage rule is the finding |
| Build | 1 quarter; lifetime 10 years | Kept |
| Side effects | Fire event 0.5%/yr: lose the battery, $5K damage, insurance premium +10% for a year | Designed from "fire/insurance events" |
| Price series | **Never tied to the BNEF pack curve** | Kept (doc 37 B2) |

### 4.4 Hydro-region sites (Act I, 2014-2022): Pacific Northwest PUD, upstate New York, Quebec

Doc 37 did not research these. The rules below are **designed** from the design thread's own recollection of the public record and must be verified before the content pack (§8, Q1). The shape matters more than the numbers: cheap allocations, an application flood, a moratorium, then a crypto tariff.

| Field | Rule |
|---|---|
| Site types | "PUD county" (Washington): power 2.5-3.5 ¢/kWh 2014-17 · "Upstate muni" (New York): 4.5 ¢/kWh · "Quebec hosting": 4-5 ¢/kWh [all D] |
| Capex | None for power; site and hosting only (kept) |
| Constraint | New allocations capped per quarter (a queue); 2017Q4 application-flood event triggers a **moratorium 2018Q1 for 4-6 quarters** on new load, then a **crypto tariff**: new load at +60-100% of the old rate; existing contracts step up +30% at renewal [D] |
| Build | 1 quarter (kept) |
| Side effects | Cooling bonus: free-air months cut cooling overhead 5% in PNW and Quebec [D]; "town hall" events (Heat) in the muni |
| Seasonal relocation | **Not a player mechanic.** The Sichuan wet/dry migration is Chinese and ended in June 2021 [B]; the player is US-based. It enters the game only as network-hashrate seasonality in the Act I market file (hashrate dips in the dry season, 2017-2020) and the June 2021 crackdown event, which Act I already has |

### 4.5 Iceland (Act I from 2014)

**Designed; no sources obtained (§8, Q2).** Price 4.0-4.5 ¢/kWh 2014-17 rising to 5-6 ¢ by 2021 [D]; 100% renewable (green badge, Heat never rises at the site); free-air cooling cuts cooling overhead 10% [D]; shipping adds 1 quarter to every machine delivery; build 3 quarters; two scripted events: a 2018Q1 "power shortage warning" (new allocations frozen 2 quarters) and a 2021Q4 "no new crypto load" rule (no new allocations for the rest of Act I) [D, from the thread's recollection of utility statements; verify].

### 4.6 Flare and stranded gas (Act I from 2018; Act II as mining only)

| Field | Rule | Source and change |
|---|---|---|
| Capex | $750/kW genset and container | Rounded from $500-1,000 [D] |
| Running cost | $30/MWh all-in (gas, genset O&M, mobilisation amortised) | Designed inside doc 37's $20-50 [C/D]; no primary gas price exists (§8, Q3) |
| Capacity factor | 85% in quarters 1-4; then output falls 8% per quarter (well decline) | 80-95% kept; decline curve designed from "relocation every 1-3 years" [D] |
| Build | 2 quarters; relocation (new well): 1 quarter downtime, 10% equipment wear, mobilisation fee $100/kW | Kept and designed |
| Lifetime | Gensets 10 years | Designed |
| Constraints | Oil-basin regions only (ND, Permian, WY); **no AI or hosting projects** (remote, poor connectivity) | Kept; the AI exclusion is doc 37's "poor latency for GPU work" made a rule |
| Failure | Genset failure interrupt 3%/quarter (1 week offline) | Designed |
| Side effects | Emissions PR: Heat −5 at acquisition; a 2021 ND/WY tax-break event (−10% running cost) [B]; site accident event 1%/yr | Kept as events |

### 4.7 Texas power contracts (Act I from 2020, Act II, Act III)

The money engine. Sourced where Riot's filings allow; the per-MW yield is derived from an unsourced MW base and is designed.

| Field | Rule | Source and change |
|---|---|---|
| Requirement | A fixed-price PPA of 8+ years at an ERCOT site; **curtailable load only** | Kept [A/D] |
| Demand-response credit | Paid every year on enrolled curtailable MW, whether or not called: **$15K (mild) · $40K (normal) · $100K (hot) per MW-year** ⚙, the summer type drawn per year from the market file's weather column | Riot's $6.5M / $27.3M / $71.2M (2021-23) [A] over an assumed ~400 / ~700 / ~700 MW base [D] gives ~$16K / $39K / $102K per MW-yr. The MW base is the research gap (§8, Q3) |
| When called | The enrolled MW go offline for the event week; the player receives spot − PPA on the curtailed MWh (power resale) | Kept: Riot's $52.6M manual curtailment is this [A] |
| 4CP avoidance | Opt in per site: lose 1.5% of Q3 output; next year's delivered power cost −10% ⚙ | **Designed**; 4CP is sourced as a mechanism [A], its dollar value is not (§8, Q3) |
| Exclusion | GPU and hosting MW never earn credits; a mixed site earns on its miner MW only. Enrolling AI MW is not offered | Kept: the structural conflict (finding 2) |
| The battery exit | From Act II, a 4-hour BESS at the site (§4.8) adds min(battery MW, AI MW) to curtailable MW for events ≤ 4 hours, so AI load can earn credits without being cut | Designed; mirrors real practice |
| Side effects | "Paid to switch off" backlash event when credits exceed $50M in a year: Heat +5 statewide, and in Act III Ratepayer Anger +5 [B for the backlash, numbers designed] | Kept as an event |
| Not modelled | Negative-price hours (doc 37 did not find the by-year series); they appear as flavour in the quarter report only | §8, Q3 |

### 4.8 Utility battery (BESS) at a site (Act II from 2020, Acts III-IV)

| Field | Rule | Source and change |
|---|---|---|
| Capex $/kWh, US turnkey | 2016: 600 · 2020: 400 · 2024: 300 · 2025: 219 · 2030: 150 · 2035: 110 · 2040: 75 | 2025 kept [B]; 2024 derived (global $165-169 × a 1.8 US multiplier) [D]; 2016 and 2020 proxies [D]; 2030-40 designed (CSV has 2035 at 110) |
| Regional multipliers | US 1.0 (the base above) · Europe/Nordics 0.8 · (China 0.33, rivals' data only) | Kept from BNEF's $219 / $177 / $73 [B], re-based to US = 1 |
| Durations | 2 or 4 hours (4 is the default); 8 in Act IV | Kept |
| Running cost | $7/kW-yr; 13% round-trip loss | Rounded from $5-10 and 12-15% [D] |
| Build | 3 quarters; no interconnection wait when behind the meter | Kept |
| Lifetime | 15 years; capacity −2%/yr | Kept [D] |
| Overrun | Solar class (median ×1.00, σ 0.10) | Kept as the proxy [A] |
| What it earns | (1) 4CP shaving with no output loss; (2) demand-response credits on AI load (§4.7); (3) outage ride-through for AI SLAs (no SLA penalty for outages ≤ 4 h); (4) **PJM capacity payment in Act III**: capacity price (market file, $325-333/MW-day in 2027-29 [A, doc 31]) × 0.6 derating for 4-hour storage ⚙ [D] × battery MW. No energy arbitrage is modelled | (1)-(3) designed to make the battery the answer to finding 2; (4) uses doc 31's auction results; the derating is designed (§8, Q6) |
| Side effects | Fire event 0.2%/yr (site offline 1 week, Heat +8) | Designed |

### 4.9 Behind-the-meter utility solar and wind at a site (Act II-IV)

| Field | Solar | Wind |
|---|---|---|
| Capex $/kW | 2019: 1,900 · 2024: 1,600 (/kW-AC) · 2030: 1,300 · 2040: 1,000 | 2016: 1,600 · 2023: 1,700 · 2040: 1,400 |
| Source | 2024 kept [A]; others CSV and designed [D] | 2016, 2023 kept [A]; 2040 CSV [D] |
| Capacity factor by region | Texas 24% · Georgia 20% · Nevada/Arizona 28% · Nordics 11% [D] | Texas 38% · Georgia 15% · Nordics 35% · PNW 30% [D, inside NREL's 28-48% class range [A]] |
| Running cost | $20/kW-yr | $43/kW-yr [A] |
| Effect | Self-consumption only: cuts purchased MWh by CF × capacity, capped at site load that hour-class; surplus wasted unless exporting (which needs a grid connection, 16-24 quarters) | Same |
| Land | 6 acres per MW-AC; a site's land cap limits it [D] | Rural sites only |
| Build | 4 quarters | 6 quarters |
| Overrun | Solar class | Wind class (median ×1.02, σ 0.30) |
| Side effects | Heat −3 | Heat +3 (noise), complaint events |

**Firmness rule (all acts):** no renewable asset counts toward *energized firm MW* unless paired with storage covering the site's longest expected lull: 4-hour BESS gives 30% of its MW as firm; 100-hour iron-air (§5.7) gives 90% [D]. Energized MW stays the campaign's spine (doc 33 §5), so this rule is what keeps "I built solar" from inflating it.

## 5. Rule sets: energy ventures (Acts III-IV, paying off in Act V)

### 5.1 The common mechanic: pitch, diligence, cash calls

Every venture is a project card with the Deal Desk's three slots re-labelled: **Site** (region constraints), **Offtake** (who buys the power; the player's own campus can be the offtaker) and **Capital** (the player's role). One mechanic carries finding 4:

1. **The pitch.** The card shows the developer's $/kW, first-power date and $/MWh. These are the real pitches of the reference class, rounded (SMR $2,250-6,000/kW; fusion "$40/MWh"; pumped hydro at Snowy's A$2B).
2. **Diligence** (1 Bandwidth, a fee): reveals the **reference-class estimate** = pitch × the class's median overrun multiplier, with its tail ("55% of nuclear projects overrun by more than half"). Skipping diligence is allowed; the game then shows only the pitch.
3. **Two roles.** *Offtaker*: sign a PPA at the pitch price, optionally prepaying 10-20% for a 10-15% price cut; risk = delay or cancellation leaves a power gap you must fill at market, and the prepayment is lost on cancellation. *Equity*: 10-49% of the venture; risk = cash calls. A player can be both.
4. **Tranches.** Realised cost is drawn once at financial close (hidden) and arrives as three cash calls at 33 / 66 / 100% of construction, each the overrun share of that tranche. At each call: **pay**, **dilute** (stake falls pro rata), or **walk** (write off). A sovereign or bloc partner may cover 30-50% of an overrun with strings (registry, offtake priority), as doc 33's co-funding does.
5. **Debt.** None for FOAK fission or fusion before commercial operation (lenders don't lend against unproven hardware: doc 31 §2.8, doc 37 C2). EGS gets non-recourse project debt after its first block runs (the $421M precedent [B]). Pumped hydro gets government loans with interest paid in kind.
6. **Payoff.** A venture at commercial operation delivers firm MW to the offtaker's campus **without an interconnection wait** when co-located or via a private wire (the finding-5 lever), and its equity revalues at the ground AI multiple. A cancelled venture is a write-off plus a log line the chapter report quotes.

**Overrun multipliers by reference class** (realised = budget × m; lognormal, parameters set so the mean and the two tail shares match Budzier & Flyvbjerg [A]):

| Class | Median m | σ | P(m ≤ 1) | P(m > 1.5) | Cap | Used by |
|---|---|---|---|---|---|---|
| Nuclear | 1.6 | 0.70 | ~3% | ~55% | 6.0 | SMR, advanced fission |
| Pumped hydro (dam-like) | 1.5 | 0.80 | ~10% | ~50%; P(m ≥ 3) ≈ 10% | 6.0 | Pumped storage (Snowy 2.0 is ×6) |
| Thermal | 1.03 | 0.35 | ~44% | ~13% | 3.0 | EGS, on-site gas |
| Wind | 1.02 | 0.30 | ~45% | ~7% | 2.5 | Wind |
| Transmission | 0.98 | 0.20 | ~63% | ~4% | 2.0 | Private wires, substations |
| Solar | 1.00 | 0.10 | ~61% | ~0% | 1.5 | Solar, BESS, iron-air (proxy) |

Nuclear's mean under these parameters is about 2.0, slightly under the sourced 2.2; the cap keeps a single draw from ending a game. Schedule slip is drawn separately: nuclear median +60% [D from the Vogtle and Darlington records], pumped hydro +45% [A, Flyvbjerg dams], EGS +15% [D], LDES FOAK +4 quarters flat with 50% chance [B/C], solar +1 quarter.

### 5.2 Enhanced geothermal (EGS) venture: Act III from 2027

| Field | Rule | Source and change |
|---|---|---|
| Capex $/kW | FOAK 7,500 (first block); NOAK 4,500 (later blocks) | Rounded from 6,000-9,000 and 3,500-5,000 [D]; the $421M debt on ~100 MW floors it above $4,200 [B] |
| Running cost | $20/MWh | Rounded from 15-30 [D] |
| Capacity factor | 90%, firm | Kept |
| Build | First block 12 quarters; later blocks 7 quarters | Kept (real ~12) [B] |
| Lifetime | 30 years; redrill at year 10 costs 15% of capex | Kept; redrill cost designed |
| Overrun | Thermal class; plus **weak well field 15%**: CF 60% until a $1,500/kW remediation | Class kept [A]; weak-field designed inside 10-20% [D] |
| Constraints | Western hot-rock regions only (NV, UT, CA, OR); rig availability limits one block per 4 quarters ⚙ | Kept |
| Offtake | 15-year PPA at $80-110/MWh FOAK ⚙ falling to $60-75 NOAK | Designed from Lazard's $67-111 [C] |
| Side effects | Induced-seismicity event (2%/yr: 1 quarter pause, Heat +5 local); political capital +2 on commercial operation (a firm clean MW the state wants) | Designed |
| Milestone probabilities (bots assert) | P(commercial power by 2035 for a 2027 start) ≈ 80%; by 2040 ≈ 92% | Doc 37's priors [D], kept as targets |

### 5.3 Light-water SMR venture: Act III from 2027

| Field | Rule | Source and change |
|---|---|---|
| Pitch shown | $4,000/kW, first power 2032 | Rounded from GE Hitachi's $2,250 and the $2,250-6,000 pitch band [B/D] |
| Reference-class estimate (diligence) | Pitch × 1.6 ≈ $6,400/kW; tail shown | Nuclear class [A] |
| Realised FOAK (hidden draw) | Pitch × m, m ~ nuclear class, **floored at ×3** for the first unit (so $12,000-24,000/kW); units 2-4 at ×2.5 with no floor | The floor is designed so that a FOAK SMR cannot come in at its pitch: Darlington unit 1 ≈ US$18,500/kW against a $2,250 pitch (×8) [B/D]; CFPP $20,100/kW [D] |
| Running cost | $30/MWh | Rounded from 25-40 [D] |
| Capacity factor | 90% | Kept [D] |
| Build | Licence 10 quarters + construction 20 quarters, then schedule slip (median +60%) | Kept (8-12 + 16-24) [B] |
| Lifetime | 60 years | Kept |
| Cancellation | Before construction, if subscribed offtake < 80% of output: 40% chance per year the venture is cancelled; prepayments lost | Designed from the CFPP (25% subscribed vs 80% required; cancelled) [B/C]; doc 37's 30-50% [D] |
| Constraints | Existing nuclear sites or pro-nuclear states; one regulator slot per 8 quarters | Kept |
| Offtake | PPA $90-130/MWh FOAK ⚙ (with a government cost-share event covering 30-50% of overruns, else the PPA reopens at cost) | Derived: $18,500/kW at 90% CF and 7% over 60 years ≈ $170/MWh unsubsidised + O&M; CFPP's $89 needed a $1.4B award [B/C] |
| Side effects | Public-opinion events (Heat ±), government cost-share with strings, political capital spend to hold the licence slot | Kept as events |
| Milestone probabilities | P(power by 2035) ≈ 55%; by 2040 ≈ 85% | Doc 37 [D], kept as targets |

### 5.4 Advanced fission (sodium or HTGR): Act III from 2027

As §5.3 with capex +20%, build +4 quarters, and a **HALEU fuel event** (20% chance: first fuel load slips 2-4 quarters). P(2035) ≈ 40%, P(2040) ≈ 75% [D]. Kept from doc 37 C3.

### 5.5 Fusion venture: Act III-IV from 2028

| Field | Rule | Source and change |
|---|---|---|
| Pitch | "$40/MWh by 2031"; capex not disclosed | The real pitches' shape [B] |
| Capex (hidden) | FOAK $20,000/kW (range 10,000-30,000) | Doc 37's designed range [D], midpoint |
| Science gates (each: probability, slip if passed) | First plasma 0.90, slip 4-8 q · Q > 1: 0.70, slip 4-12 q · Net electric 0.60, slip 8-12 q · 90% availability 0.80, slip 4-8 q | **Designed** so the cumulative chance of commercial power is 0.90 × 0.70 × 0.60 × 0.80 ≈ **30%**, matching doc 37's P(2040) [D]; the slips push most successes past 2036, matching P(2035) ≈ 10% |
| Failed gate | 50% of the time the venture pivots (another 8-12 quarters, a new equity raise at half the prior valuation); otherwise it folds (stake → 0) | Designed |
| Lifetime | 30 years | Designed |
| Offtake | Only a prepayment-style "capacity reservation" (10% of a notional 15-year PPA) that is refundable only on fold; no take-or-pay until net electric | Shape from the Microsoft-Helion precedent [B]; terms designed |
| Side effects | **Hype-cycle equity**: while the venture is between first plasma and Q > 1, the player's own equity multiple gains +1x ⚙ ("fusion-adjacent"); a failed gate takes −2x for 4 quarters | Designed from the valuation pattern (doc 31 §2.8) |
| Honesty rule | In Acts III-IV fusion never delivers power; in Act V it delivers in at most one future and never before 2038 | Consistent with doc 33 ("not in F4") and doc 37 C4 |

### 5.6 Pumped-storage venture: Act III-IV for a mountain campus

| Field | Rule | Source and change |
|---|---|---|
| Pitch | $1,000/kW, 4 years | Snowy 2.0's 2017 pitch (A$2B / ~2 GW) [D] |
| Realised capex | $4,000/kW at 10 hours ($400/kWh), then × m from the dam-like class | NREL ATB class-10 average $3,755-4,234 [A]; multiplier class designed from Flyvbjerg and Snowy [A/B] |
| Running cost | $18/kW-yr + $0.5/MWh; round-trip 78% | Kept [A]; RTE designed (not sourced) |
| Hours | 10 | Kept |
| Build | 36 quarters base, slip median +45% | Doc 37's 32-48 [D] and Flyvbjerg's dam delay [A] |
| Lifetime | 80 years (no end inside the game) | Rounded from 50-150 [C/D] |
| Constraints | Mountain region with water rights (one or two map regions) | Kept |
| Capital | Government co-funding 40-60% of budget (not of overruns) with a state offtake share; government loans with interest paid in kind | Designed from the Snowy and Telesat shapes [B/A] |
| Side effects | Tunnel-boring-machine-stuck event (12-month slip, 10% of budget) [B] | Kept |
| Milestone probabilities | P(2035) ≈ 15%; P(2040) ≈ 70% for a 2027 start | Doc 37 [D], kept |

### 5.7 Iron-air long-duration storage (Act IV from 2031)

Capex FOAK $70/kWh (2031) falling to $30 by 2038 ⚙ [D/C: target $20]; 100 hours [A]; round-trip 45% [D, unverified]; build 8 quarters with a 50% chance of a 4-quarter slip [B/C]; lifetime 20 years [D]. Use: paired with behind-the-meter solar and wind it makes 90% of their MW count as firm (§4.9). Overrun: solar class as a proxy.

### 5.8 The control option: utility solar + 4-hour BESS, grid-connected

Capex: solar as §4.9, BESS as §4.8; build 6 quarters **plus the interconnection wait** (16-24 quarters in Acts III-IV, 16-32 in Act V, 8-12 in doc 33's F4) unless behind the meter; P(2035) ≈ 95% [D]. This is the option the bots use to check that every venture's expected value is a real trade-off against the boring choice (balance target E-B2 below).

### 5.9 On-site gas (already in doc 33)

Doc 33's 6-10 quarters with extra Heat stands; add the thermal-class overrun (median ×1.03) and a turbine-delivery slip of 2-4 quarters while the backlog lasts (116 GW against 20-24 GW/yr output, doc 31 [A/B]). Gas with carbon capture and hydrogen are **out** (doc 37 did not research them; §8, Q8).

### 5.10 Balance targets for the ventures (bots assert, like doc 33 §18)

| # | Target |
|---|---|
| E-B1 | A player who skips all ventures and buys grid power is never bust because of it; the venture-free path finishes within 15% of the best path in at least one Act IV future |
| E-B2 | No venture's expected net-worth contribution beats the §5.8 control by more than 1.5x in expectation; at least one venture beats it in its best case by 3x (the bet must be real) |
| E-B3 | Nuclear-class overruns reproduce the sourced base rates within ±5 points over 1,000 draws |
| E-B4 | Across 30 seeds, at least one SMR venture is cancelled and at least one fusion venture folds |
| E-B5 | Finding 2 holds: a Texas site that converts all miner MW to AI MW loses its credits unless a battery is built; the battery pays back within 12 quarters in a "normal" summer sequence ⚙ |

## 6. Act V (2036-2040): decision

**Decision: go on the premise, hold on the authoring.** Specifically:

1. **The case for Act V is now stronger than when doc 33 left it as "design notes only".** Every venture in §5 has its likely first power inside 2036-2040 (SMR 2035-37, advanced fission 2036+, pumped hydro 2037-39, fusion 2038+ in its one future), and the evidence that interconnection, not generation, is the 2030s constraint ([A], §2) gives the act a mechanic that is distinct from Acts II-IV: *who has firm MW when the queue is 6-8 years long*. Without Act V, the ventures feature repeats the Moon problem of doc 33 (a bet whose payoff is an epilogue line). That is the only defensible reason to build Act V, and it is sufficient.
2. **Act V cannot be authored on doc 37.** Its futures need Part D items 2-8, of which doc 37 delivered one (demand, and that is a [D] extrapolation to 2040). There is no sourced basis today for the chip roadmap, orbit after 2035, the Moon after 2035, bitcoin in the late 2030s, Q-Day, or the candidate scenarios and their indicators. Authoring four futures without that would be invention dressed as research, which doc 36's rules forbid.
3. **Sequencing.** (a) Build the ventures feature into Acts III-IV first (§5); it stands alone, with the epilogue carrying its payoff until Act V exists. (b) Run the second research pass (§8). (c) Then a doc-33-shaped design for Act V. Working title **"Firm"**; 20 quarters, 2036Q1-2040Q4; the hidden variable candidates, to be tested by the research: AI demand (IEA's three cases map to bust ~700 TWh, base ~1,200-1,450, scarcity ~1,700-2,300 [C/D]), a queue-reform switch, and whether the player's own firm power arrives. A decoy candidate: a fusion "net electric" headline that never reaches 90% availability.
4. **Scope guard.** Act V is only worth building if Act IV ships and its balance holds (the M27-M32 pass closed with 7 misses; the fixes of 9 Oct are pending). If Act IV's second balance run still misses B3 or B5, Act V waits.

## 7. Designed calls (doc 37's open questions)

| Call | Proposed value | Rationale |
|---|---|---|
| Iceland pricing | 4.0-4.5 ¢/kWh (2014-17) → 5-6 ¢ (2021); 2018Q1 shortage freeze (2 q); 2021Q4 no new crypto load | Thread's recollection of utility statements; **verify (§8, Q2)** |
| Quebec pricing | 4-5 ¢/kWh hosting; 2018 moratorium then a crypto tariff at +60-100% for new load | Shape from the public record as recalled; **verify (Q1)** |
| Washington PUD pricing | 2.5-3.5 ¢/kWh (2014-17); 2018Q1 moratorium 4-6 q; then +60-100% tariff for new load; existing +30% at renewal | As above (Q1) |
| Flare-gas cost | $30/MWh all-in; $750/kW genset; 8%/quarter decline after a year; relocation downtime 1 q | Inside doc 37's [C/D] band; the decline curve is the gameplay |
| Texas credit yield per MW | $15K / $40K / $100K per MW-year by summer type (mild / normal / hot); 4CP: −1.5% Q3 output, −10% next year's power cost | Riot's credits over an assumed MW base [A/D]; 4CP value designed (Q3) |
| Seasonal hydro relocation | Not a player mechanic; network-hashrate seasonality in the Act I market file only | The migration was Chinese and ended in 2021; the player is US-based |
| Fusion capex and gates | $20,000/kW; gates 0.90 / 0.70 / 0.60 / 0.80 with 4-12 q slips → ~30% by 2040, ~10% by 2035 | Matches doc 37's priors; gates make the probability legible to the player |
| 2030-2040 cost projections | Residential solar $3.6/W (2030), $2.8/W (2040); utility PV $1,300/kW-AC (2030), $1,000 (2040); US BESS $150/kWh (2030), $110 (2035), $75 (2040); utility wind $1,400/kW (2040); pumped hydro flat $4,000-4,500/kW real; SMR NOAK $8,500/kW by 2040 if a venture succeeds; EGS NOAK $4,000 by 2035; iron-air $30/kWh by 2038 | CSV values kept where present; the rest designed by extending each sourced trend, all [D] |
| Residential batteries vs pack prices | Decoupled: flat $900/kWh | Evidence says yes [A] |
| ITC schedule | 30% / 26% / 30% as §4.1 | Recalled; verify (Q12) |

## 8. Gaps that block a decision: the second research brief (doc 39)

Ordered by what they block. Each is a question a research session can answer with web access; the grading rules of doc 36 apply.

1. **Hydro-region record (blocks §4.4).** For Chelan, Douglas and Grant County PUDs, Plattsburgh and Massena, and Hydro-Québec, 2014-2022: the industrial or crypto rate in ¢/kWh by year; the date and length of each moratorium; the terms of each special crypto tariff; how allocations were queued.
2. **Iceland (blocks §4.5).** Landsvirkjun and HS Orka data-centre tariffs 2014-2022; the 2018 "power shortage" statement and what it changed; the 2021-22 refusal of new crypto load; typical shipping and setup lead times.
3. **Texas calibration (blocks §4.7's numbers).** Riot's Rockdale PPA price and its developed MW by year 2021-2024 (to turn credits into $/MW-yr); the dollar value of 4CP avoidance per MW for a large load; the share of negative-price hours in ERCOT by year 2015-2025; any other miner's reported credits.
4. **Batteries (blocks §4.3 and §4.8's early years).** Residential installed $/kWh 2013-2021 (list prices of the leading home battery as a proxy); utility turnkey $/kWh 2015-2023; primary round-trip efficiency, cycle life and degradation (NREL ATB storage pages).
5. **Solar+storage worked examples (asked in doc 36, not delivered).** Oversizing ratio and hours of storage to cover a 24/7 load for a 2 kW rig in 2015 and a 1 MW site in 2022, with the resulting $/MWh.
6. **Capacity markets (blocks §4.8's PJM revenue).** PJM's ELCC derating for 4-hour storage by auction year; what ERCOT pays for ancillary services from batteries.
7. **Pumped hydro (B2 remainder).** Global share of grid storage historically and now; closed-loop and former-mine projects in the US; how a third party takes a stake (ownership models).
8. **Venture offtake structures (blocks §5.1's terms).** The public terms of the Google-Fervo, Google-Kairos, Meta-TerraPower and Microsoft-Helion agreements (tenor, prepayment, price, what happens on delay); NuScale's Romania status; X-energy; whether gas with CCS or hydrogen deserve a venture card.
9. **Venture costs (blocks §5.2-5.3).** Fervo's realised capex per kW; SMR O&M from a primary; nuclear fleet capacity factor from a primary.
10. **Part D, items 2-8 (blocks Act V).** AI compute and chip roadmap to 2040; orbit cost and launch trajectories after 2035 (beyond doc 31's SemiAnalysis ~2040 parity); lunar production after 2035; bitcoin's 2032, 2036 and 2040 halvings and any 2030s hashprice or security-budget analysis; cryptographically relevant quantum computer estimates and post-quantum migration timelines; grid and policy to 2040; **4-6 candidate 2036-2040 futures with leading indicators and a decoy**, as doc 31 did for Act IV.
11. **Small wind (blocks §4.2's realised CF).** Documented realised capacity factors of small turbines against their rated figures, and the reasons.
12. **Quick verifications.** The US residential ITC schedule by year; the European residential solar $/W series doc 36 asked for; closing the IEA grading ([C] for forecasts) in doc 37.

## 9. Decisions for the owner

| # | Decision | Recommendation |
|---|---|---|
| E-D1 | Early-era owned generation | **Offer rooftop solar, small wind and home batteries as badges, resilience and hedges, with payback shown on the card; never as cost cutters** (§4.1-4.3) |
| E-D2 | Small wind | **Keep as the trap, with a hidden realised capacity factor** (§4.2) |
| E-D3 | Hydro regions and Iceland | **Build the site types with designed values now; verify before the content pack** (§4.4-4.5, §8 Q1-2) |
| E-D4 | Seasonal hydro relocation | **Not a player mechanic**; market-data seasonality only |
| E-D5 | Flare gas | **Mining-only site type from 2018 with a decline curve and relocations** (§4.6) |
| E-D6 | Texas flexibility | **Demand-response credits, 4CP and power resale for curtailable MW only; AI MW excluded; the battery is the bridge** (§4.7-4.8) |
| E-D7 | Storage price series | **Two series: utility on BNEF's curve with regional multipliers; residential flat** |
| E-D8 | Firmness | **Renewables count toward energized MW only with storage** (§4.9) |
| E-D9 | Ventures mechanic | **Pitch, diligence, cash-call tranches; offtaker and equity roles; no FOAK debt before operation** (§5.1) |
| E-D10 | Venture set | **EGS, LWR SMR, advanced fission, fusion, pumped storage, iron-air, and the solar+BESS control; gas with CCS and hydrogen out** (§5.2-5.9) |
| E-D11 | Overrun model | **Reference-class lognormal multipliers with the sourced tail shares; FOAK SMR floored at ×3** (§5.1, §5.3) |
| E-D12 | Fusion | **Gate probabilities summing to ~30% by 2040; never power before 2038; at most one Act V future** (§5.5) |
| E-D13 | Act V | **Go on the premise; hold authoring until doc 39 delivers Part D; build the ventures feature first** (§6) |
| E-D14 | Second research pass | **Commission doc 39 with §8's twelve questions**, Part D first |
| E-D15 | Doc 31 consistency | **Re-grade IEA forecasts [C]; use $5.3B → $9.3B for the CFPP step; check Act III's nuclear PPA prices against the FOAK cost** (§2) |

Fictional ventures stay fictional: the content pack names them (the clash check of doc 33 applies), and the real companies above are reference points only, as doc 36 requires.
