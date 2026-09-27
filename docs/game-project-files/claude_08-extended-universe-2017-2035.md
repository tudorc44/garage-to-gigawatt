# 08: The Expanded Universe, from a Garage Miner (2017) to 2035

*Research date: 25 Sep 2026. Everything after Sep 2026 is **speculative fiction for game design**, built on published forecasts and plans. Numbers marked (≈) are estimates to use for balancing, not facts.*

---

## 1. Why the crypto-miner opening works, and what ties the game together

The real history supports this arc almost exactly. **CoreWeave began in 2017 as "Atlantic Crypto"**, three commodity traders mining Ethereum with GPUs in New Jersey. After the 2018 crash they didn't sell their GPUs. They rebranded (2019) and rented them out as cloud compute, then bought ~$100M of H100s in 2022, raised $2.3B of GPU-backed debt in 2023, and IPO'd in March 2025. Other miners (IREN, Cipher, TeraWulf, Core Scientific, Hut 8) followed from 2024 onward, turning their sites into AI leases.

**The thread through all eras is "energized megawatts".** A miner's real asset was never the machines. It was the power contract and the site. In 2026, AI pays roughly **3–25x more revenue per MW** than bitcoin mining, and bitcoin ASICs can't be repurposed for AI, so miners scrap them and install GPU servers. In the game, the player's powered MW carry from act to act: they are what you start with, what you convert, and what you fight over.

A second link: **the 5-year contracts signed in Act II mature in Act III/IV.** The 2030 "renewal wall" is built into the game, not added on top of it.

---

## 2. Campaign structure: 4 acts, quarterly turns

The original brief had 36 monthly turns (2024–26). Running 2017–2035 monthly would be ~228 turns, or 4–6 hours. **That breaks the 30–60 minute session goal**, so the structure has to change:

| Act | Years | Turns (quarterly) | Session | Player is… |
|---|---|---|---|---|
| **I: Garage to Hashrate** | 2017 → Q3 2022 | 23 | ~40 min | A crypto miner scaling from a garage to an industrial site |
| **II: The Pivot and the Boom** | Q4 2022 → 2026 | 17 | ~50 min | A neocloud/developer pre-selling compute (the existing Deal Desk design) |
| **III: Reckoning** | 2027 → 2030 | 16 | ~45 min | Survive or exploit the first major scenario. Renewal wall in 2030 |
| **IV: The Long Game** | 2031 → 2035 | 20 | ~50 min | Nuclear, orbital compute, the second scenario, the endgame |

- **A full career takes 3–4 sessions (~3 hours).** Each act ends with a chapter report and an autosave, so each act is a natural 30–60 minute session.
- **Every act can be started on its own** with a preset company ("Start in 2024 as a 200 MW neocloud"). This keeps Act II playable as the quick, core experience.
- **One turn = one quarter** everywhere. Delays still hurt: 6 months = 2 turns, and an 18-month build = 6 turns. It also halves the number of clicks per year.

---

## 3. Act I: Garage to Hashrate (2017–2022)

### 3a. Real timeline → scripted events
| When | Event | Game effect |
|---|---|---|
| 2017 | ETH/BTC boom. GPU shortage. BTC nearly $20k in Dec | GPU prices spike. Mining is very profitable |
| 2018 | Crypto winter: BTC below $4k | Revenue −80%. Chance to buy distressed rigs and sites cheaply |
| 2019 | CoreWeave-style pivot option | Unlock "Rent GPUs as cloud (rendering/ML)": low revenue, but a new skill tree |
| Mar 2020 | COVID crash, then recovery | A price shock with a quick rebound |
| May 2020 | 3rd halving: 12.5 → 6.25 BTC | BTC mining revenue halves overnight (then price compensates) |
| Feb 2021 | Winter Storm Uri (Texas) | Choice: curtail and sell power back (big payout) or keep mining (reputation hit) |
| Mid-2021 | **China bans mining** | ~half of global hashrate goes offline or moves. US becomes #1. Hashprice jumps. Hosting demand surges |
| 2021 | **SPAC/IPO mania.** BTC ATH ~$69k (Nov) | **Capital-raising window:** go public to jump from millions to hundreds of millions |
| May–Jun 2022 | Luna/Celsius collapse | Crypto lenders fail. Credit dries up |
| **15 Sep 2022** | **Ethereum "Merge": GPU mining ends** | **Act I finale.** Your GPU fleet earns ~nothing from mining. Decide what to do with it |
| Nov 2022 | FTX collapses. **ChatGPT launches (30 Nov)** | Market panic + the first signal of AI demand |
| Dec 2022 | Core Scientific files Chapter 11 | Distressed energized sites go to auction (the bridge into Act II) |

### 3b. Mechanics (simple, as a tutorial for the whole game)
- **Machines:** GPU rigs (flexible, resellable, can become cloud) vs. ASICs (bitcoin only, efficient, obsolete within ~2–3 years).
- **Sites, as the ladder:** Garage (~3–5 kW, household power, a "neighbour complaint" event) → Rented warehouse (~1 MW) → Own site with a utility contract (10–100 MW, ~$30–50/MWh) → Texas site with curtailment revenue.
- **Market:** coin price (scripted path + noise), network difficulty, and **hashprice** (revenue per unit of hashrate). Hashprice is the one number miners live by.
- **Capital ladder:** savings → friends and family → equipment financing (collateralized by machines) → venture round → SPAC/IPO (2021 window only) → bonds.
- **Protest system, first version:** noise complaints and local power worries. The same Community Heat system as Act II, at a smaller scale.

### 3c. The Merge decision (Act I → Act II)
| Choice | Real analog | Effect entering Act II |
|---|---|---|
| Sell the GPUs, keep a bitcoin ASIC business | Most GPU miners | Cash now, but you enter the AI era late |
| **Rent GPUs as cloud, buy data-center GPUs** | CoreWeave | Hard 2023, huge upside. Unlocks the neocloud path |
| Convert sites to hosting for others | Core Scientific → CoreWeave hosting deals | Stable income. Unlocks the powered-shell path |
| Hold everything and wait for crypto to recover | — | A risky 2023. Bitcoin's 2024 recovery helps, but the AI window narrows |

### 3d. Economic anchors (≈)
| Item | Value |
|---|---|
| 6-GPU rig (2017) | ~$2.5–3k, ~1 kW, ~$5–15/day at the late-2017 peak, ~$1–2/day by late 2018 |
| Garage power | ~$0.12/kWh ≈ $3/day per rig |
| ASIC generations | S9 (2016–19): ~13.5 TH/s at ~1.3 kW. S19 Pro (2020): ~110 TH/s at ~3.25 kW. S21 (2023+): ~15–17.5 J/TH |
| Hashprice ($/PH/day) | ~$400 peak (late 2021, ≈) → ~$60 (end 2022, ≈) → ~$50 after the Apr 2024 halving (≈) → **$31.70 (Aug 2026)** |
| Mining revenue per MW (2024, ≈) | ~$1M/yr gross at a hashprice of ~$50 with S21s. Compare: shell lease ~$1.8M/MW/yr, GPU compute ~$12M/MW/yr |

### 3e. Act I balancing results (economy-model.xlsx, Mining_* tabs)
A scripted "good player" path. Start with $10k savings in a garage. Raise $40k from friends and family (2017), a $1.5M crypto-VC seed (2018), an $8M Series A (2019) and a $150M IPO (2021 Q2). Grow the sites garage → 100 kW unit → 1 MW warehouse → 20 MW site → 100 MW Texas site. Keep cash in reserve during the winters.

| Check | Result | Design meaning |
|---|---|---|
| 180 MH garage rig profit/day, Q4 2017 | **+$4.97** | The garage is fun in 2017 |
| Same rig, Q4 2018 | **−$0.61** | At $0.12/kWh, garage mining dies in the crypto winter. **Cheap power is the lesson of Act I** |
| Reinvest ~70–90% but keep reserves in winters | Never runs out of cash | The intended path works |
| **Reinvest 100% every quarter** | **Out of cash in 2018 Q2 → 2019 Q2** | Going all in at the top gets punished (the game should force-sell machines or end the run) |
| Peak company valuation (2021 Q3, 15x EBITDA) | **~$2.0B** (founder stake ~$800M) | Close to real 2021 miner IPOs (IREN ~$1.6B, Core Scientific ~$4.3B) |
| Valuation at the Merge (2022 Q3) | **~$166M (−92% from peak)** | Matches 2022 miner crashes of 80–90%. Act II starts humbled |
| Site capacity vs. used at the Merge | 121 MW owned, ~57 MW used | In 2021 machines, not sites, were the bottleneck (~$3–4M per MW of machines at the peak). **Empty energized MW are the bridge to AI** |
| GPU fleet resale at the Merge | ~$15M (2.6M MH at ~$6/MH) | The Merge decision: sell for ~$15M, or turn it into a cloud business |

Rough edges to fix in the game build: new machines only earn from the next quarter; each fleet simply switches off when revenue is below its power cost; and valuation is simplified to EBITDA × multiple + cash, with no debt in Act I.

---

## 4. The world 2027–2035: what's scheduled (the "known future")

These are real plans with dates, so they work as default events on the timeline:

| When | Scheduled event | Game effect |
|---|---|---|
| Early 2027 | Google Suncatcher prototype satellites. Starcloud-2 GPU cluster in orbit | Orbital-compute rumors start. A long-term research track |
| H2 2027 | **Nvidia Rubin Ultra, ~600 kW racks** | **"Density cliff":** older halls (40–130 kW/rack) can't host new chips without costly retrofits |
| H2 2027 | Crane (Three Mile Island) nuclear restart for Microsoft, 835 MW | Nuclear PPAs unlock as a power source |
| 2028 | Nvidia Feynman generation | Another round of obsolescence |
| ~Apr 2028 | 5th bitcoin halving: 3.125 → 1.5625 BTC | Any leftover mining unit's revenue halves |
| ~2030 | **Renewal wall:** 5-year contracts from 2025 expire. Google/Kairos SMRs (~500 MW) | Re-sign at the new market price or go to spot |
| 2030 | IEA base case: data centers use ~945 TWh (vs ~415 TWh in 2024) | Global power demand index |
| ~2032 | 6th bitcoin halving. Meta/TerraPower Natrium fleet (4 GW, phased 2032–35) | Late-game power options |
| 2035 | IEA range: **700–1,700 TWh** depending on the scenario | The end-state target varies by scenario |

Macro context for the scenarios: roughly **$750B of AI capex in 2026 and ~$1.1T projected for 2027**, against **~$150–200B of AI revenue**. One analysis (Van Nieuwerburgh, via MIT Technology Review) says ~$3.7T of annual revenue would be needed by 2032 to justify the planned build. That gap is the central question of Acts III–IV.

---

## 5. Major scenarios, 2027–2035

**Design:** each campaign secretly draws **one major scenario for Act III** and **one for Act IV** (they can repeat or chain), plus **2–4 wildcards**. The player never sees the draw directly but reads **leading indicators** on a "Signals" panel. Reading signals and hedging is the late-game skill. "Scenario Mode" lets players choose a scenario for replays.

### S0: Muddle Through (baseline / tutorial)
- **Basis:** IEA base case (~945 TWh by 2030). Steady growth with local cycles.
- **Effects:** normal cycles, one price reset, renewals at −20–30% versus 2025 prices.
- **Counterplay:** efficient operations, renewal timing.

### S1: The Great Repricing (AI capex bust)
- **Trigger window:** 2027–2029. **Leading indicators:** AI-revenue-vs-capex gap widening, tenant CDS spreads, lender spreads (DDTL 5.0 → 5.5 was an early sign), a tenant declaring force majeure (the Oracle/Jupiter pattern), a rising Bubble meter.
- **What happens:** 1–2 big tenants soft-default or renegotiate. GPU spot −50–70%. Exit cap rates +150–250 bps. Lenders stop lending to neoclouds. Half-built campuses stall.
- **Winners:** players with cash, low leverage, AAA tenants and hyperscaler backstops. They buy distressed campuses for 30–50 cents on the dollar (the 2001 dark-fiber pattern: it was overbuilt and later all used).
- **Losers:** highly leveraged full-stack GPU players with AI-lab tenants and no backstop.
- **Real basis:** revenue gap analyses, private credit concerns, the depreciation debate.

### S2: Lift-Off (demand explosion)
- **Trigger window:** 2028–2032. **Indicators:** AI revenue growing faster than capex, labs raising again, spot prices rising in spite of new supply.
- **What happens:** IEA "Lift-Off" (~1,700 TWh by 2035). Power becomes the only constraint. Energized MW become the most valuable asset in the economy. Governments treat compute as strategic: federal preemption of local permits, fast-tracked nuclear, **and** protests at maximum intensity (bills, water, land).
- **Winners:** whoever holds energized MW and a nuclear/gas pipeline. Lobbying pays off most here.
- **Losers:** players who sold sites in the bust panic, and anyone stuck in a local moratorium.

### S3: Efficiency Shock (the DeepSeek pattern, repeated)
- **Trigger:** any year. **Indicators:** a cheap open model matches frontier models, and inference prices per token fall 10x.
- **What happens:** compute needed per task collapses. A **Jevons coin flip** follows: either demand grows to fill the gap (neutral or even positive after 4–6 quarters) or demand really falls (a slow version of S1). IEA "High Efficiency": −20% versus base.
- **Counterplay:** flexible, shorter contracts. Inference-optimized, smaller, distributed sites near users.
- **Real basis:** DeepSeek (Jan 2025) moved Nvidia's market value by hundreds of billions in a day.

### S4: Silicon Shock (chip supply disruption)
- **Trigger:** 2027–2033. **Indicators:** export-control escalations, tariffs, geopolitical tension in chip manufacturing, foundry lead times.
- **What happens:** new GPU deliveries stop or slow for 4–12 quarters. **Existing fleets become very valuable.** Old GPUs' useful life extends (the depreciation debate flips). New campuses sit empty with no chips.
- **Winners:** players who own installed GPUs and powered shells with tenants already in. **Losers:** developers mid-build waiting on chip deliveries.
- **Note:** show it as a supply disruption with no war depiction. It's plausible and needs no politics.

### S5: Grid Crisis and Carbon Clampdown
- **Trigger:** 2027–2031. **Indicators:** capacity auction shortfalls (PJM was already 6.6 GW short for 2027/28), heat-wave blackouts, ratepayer anger.
- **What happens:** a major blackout is blamed on data centers → national rules: mandatory curtailment, "bring your own power", carbon pricing on gas. **Flexible load becomes valuable:** a leftover bitcoin mining unit can switch off and get paid (the Texas pattern). Nuclear/SMR PPAs gain a premium.
- **Winners:** players with on-site generation, batteries, nuclear PPAs, or a curtailable mining division. **Losers:** grid-dependent campuses in constrained regions.

### Wildcards (small, can stack)
| Wildcard | Window | Effect |
|---|---|---|
| **Orbital compute becomes viable** | 2031–35 | New asset class: launch-cost curve. Google claims possible cost parity by the mid-2030s, skeptics say ~3x more expensive. A high-risk tech bet |
| **Orbital compute flops** | 2029–33 | Players who invested lose R&D money |
| **Q-Day** (quantum breaks bitcoin's signatures) | 2030–35 (estimates vary) | Crypto crash/fork. Mining unit near-worthless. Crypto-backed assets written off |
| **Bitcoin supercycle** | Any | Mining unit becomes a cash engine again |
| **SMR delays** | 2029–33 | Nuclear PPAs slip 2–4 years (a common pattern in real nuclear projects) |
| **Sovereign AI boom** | 2027–35 | New regions open (Gulf, EU, India) with state tenants: cheap capital, political strings |
| **Water crisis** | Any | Evaporative cooling banned in drought regions. Retrofit or relocate |
| **Robots/edge inference** | 2030+ | Demand shifts to small distributed sites near cities |

### Scenario × asset matrix (what each scenario rewards)
| Asset / strategy | S1 Bust | S2 Lift-Off | S3 Efficiency | S4 Silicon | S5 Grid |
|---|---|---|---|---|---|
| Cash + low leverage | ★★★★★ | ★★ | ★★★★ | ★★★ | ★★★ |
| Energized MW (powered land) | ★★ | ★★★★★ | ★★ | ★★★ | ★★★ |
| Installed GPU fleet | ★ | ★★★★ | ★ | ★★★★★ | ★★★ |
| AAA tenant + long contract | ★★★★★ | ★★ (locked at a low price) | ★★★★ | ★★★★ | ★★★ |
| Own generation / nuclear PPA | ★★ | ★★★★★ | ★★ | ★★ | ★★★★★ |
| Curtailable mining unit | ★★ | ★ | ★★ | ★★ | ★★★★★ |
| Political capital (lobbying) | ★★ | ★★★★★ | ★★ | ★★★ | ★★★★ |

**No single strategy wins every scenario.** That is what makes the endgame replayable.

---

## 6. New or changed systems the expansion needs
1. **Powered MW as the core asset** that persists across acts (site, power contract, flexibility, density limit in kW/rack).
2. **Business units:** Mining / GPU Cloud / Powered Shell / (later) Power Generation / (optional) Orbital. The player moves capital between units.
3. **Signals panel:** 5–6 leading indicators (Revenue Gap, Lender Spreads, Chip Lead Times, Grid Reserve Margin, Efficiency Index, Crypto Hashprice).
4. **Contract maturity wall:** a visible calendar of when contracts end.
5. **Hardware density generations:** each hall has a maximum kW per rack. New GPU generations need retrofits (capex + downtime).
6. **Capital ladder** from savings to IPO/bonds, scaling the numbers from thousands to billions (the Game Dev Tycoon garage → studio feel).
7. **Real names after 2026 (decided 25 Sep 2026): keep real, realistic names** in the speculative acts as well. Names live only in data files, so they can be changed later. Before any public release, review the speculative events that make negative claims about real companies (bankruptcy, fraud, default).

---

## Sources
- [CoreWeave (Wikipedia): origins as Atlantic Crypto](https://en.wikipedia.org/wiki/CoreWeave)
- [Epic Mining: history of bitcoin mining](https://epicmining.io/history-of-bitcoin-mining/)
- [TechTimes: 2026 difficulty drop and the miners' AI exodus](https://www.techtimes.com/articles/322657/20260801/bitcoins-second-ever-negative-difficulty-reading-ai-capital-does-what-chinas-mining-ban-did.htm)
- [CNBC: Core Scientific shareholders reject CoreWeave's $9B offer](https://www.cnbc.com/2025/10/30/core-scientific-shareholders-reject-9-billion-coreweave-offer-deal-terminated.html)
- [IEA: Energy and AI, executive summary](https://www.iea.org/reports/energy-and-ai/executive-summary)
- [MIT Technology Review: what must happen for AI's bet to pay off](https://www.technologyreview.com/2026/09/15/1144028/ai-infrastructure-boom-investment-bubble-risk/)
- [SMR Intel: nuclear data center deals](https://smrintel.com/nuclear-data-center-deals/)
- [Fierce Network: space data centers explained](https://www.fierce-network.com/cloud/space-data-centers-starcloud-spacex-and-project-suncatcher-explained)
- [DCD: Rubin Ultra 600 kW rack, H2 2027](https://www.datacenterdynamics.com/en/news/nvidias-rubin-ultra-nvl576-rack-expected-to-be-600kw-coming-second-half-of-2027/)
- [Tom's Hardware: Rubin / Rubin Ultra / Feynman roadmap](https://www.tomshardware.com/pc-components/gpus/nvidia-announces-rubin-gpus-in-2026-rubin-ultra-in-2027-feynam-after)
- [Cointelegraph: bitcoin vs. the quantum threat, 2025–2035](https://cointelegraph.com/magazine/bitcoin-quantum-computer-threat-timeline-solutions-2024-2035)
- [mgrid: PJM capacity shortfall](https://mgrid.org/2026/02/27/pjm-2026-2027-capacity-prices-reach-329-mw-day-as-data-centers-drive-first-ever-system-wide-reliability-shortfall/)
