# 01–02: Industry Mechanics, Timeline and Case Studies

*Research date: 25 Sep 2026. The numbers are ranges meant to make the game feel realistic, not investment-grade data. Items marked (≈) are my estimates from mixed sources; check them before using them as in-game facts.*

---

## 1. The business model in one paragraph

A developer secures a site with power, signs a big creditworthy buyer (a hyperscaler or an AI lab) to a long, mostly non-cancellable contract, and then uses that contract as collateral to raise 70–90% of the build cost as debt. The pre-sold contract is what makes the financing possible, and the financing is what makes the build possible. Profit comes from the gap between the contracted revenue and the cost of capital, construction and power. It can be locked in early by selling or refinancing the finished, leased asset at a higher valuation. The risks sit in the gaps: delays, cost overruns, a buyer that weakens, GPUs that go obsolete, and communities that say no.

**This is the game.** Each deal is a puzzle with three matching pieces: *power + tenant + money*. It then has to survive *time* (construction) and *events* (protests, price crashes, counterparty trouble).

---

## 2. Actors (the game's cast)

| Role | Real examples | What they want | Game role |
|---|---|---|---|
| **Neocloud / GPU cloud** | CoreWeave, Nebius, Lambda, Crusoe (also a developer), Fluidstack | Grow contracted backlog, finance GPUs with debt | **Player archetype A** |
| **Powered-shell developer** | Crusoe, Primary Digital, Vantage, QTS (Blackstone), Stack, Aligned | Build → lease → refinance or sell at a low cap rate | **Player archetype B** |
| **Crypto miners pivoting** | IREN, Cipher, TeraWulf, Core Scientific, Hut 8 | Turn their energized sites into AI leases | Rivals, acquisition targets, cheap power sites |
| **Hyperscalers (buyers)** | Microsoft, Oracle, Google, AWS, Meta | Capacity fast, kept off their balance sheet | Tenants and offtakers. Also backstop providers |
| **AI labs (buyers)** | OpenAI, Anthropic, xAI, Mistral | Huge compute, often with weaker credit | Big contracts with high counterparty risk |
| **Chip vendor** | Nvidia (also an investor/backstop in neoclouds) | Sell GPUs and seed demand | Supplier. Allocation is a gating resource |
| **Private credit / infra funds** | Blue Owl, Apollo, Blackstone, Brookfield, Pimco, KKR | Yield, with protection built into the structure | Lenders and JV equity partners |
| **Banks** | JPMorgan, MUFG, a syndicate of ~20 banks for Stargate | Senior secured loans | Construction and term loans |
| **Utilities / grid operators** | Dominion, Entergy, ERCOT, PJM | Get large loads to pay their own way | Power gatekeepers with queue times |
| **Equipment suppliers** | GE Vernova, Siemens Energy, Schneider, Vertiv | Pricing power (backlog runs to 2030) | Long-lead items that cause delays |
| **Communities and activists** | Local groups, NAACP, SELC, county boards | Low bills, water, quiet, clean air | Protest and opposition system |
| **Governments** | Federal (pro-buildout), states (moratoriums, paused incentives) | Jobs and taxes vs. voter backlash | Lobbying system (late game) |

---

## 3. The deal lifecycle (gameplay stages)

| # | Stage | Real duration | Key costs and risks | Player decisions |
|---|---|---|---|---|
| 1 | **Site sourcing** | 1–6 months | Land option fees. Zoning status | Pick location: power availability, political climate, land cost |
| 2 | **Power** | 18 months to 7 years (grid); 12–30 months (on-site gas) | Queue position, transformer and turbine lead times (18–33 months), utility deposits | Grid (slow, cheap) vs. behind-the-meter gas (fast, more protests) vs. buying a crypto miner's site |
| 3 | **Permits and zoning** | 3–18 months | Public hearings, lawsuits, moratoriums | Community benefits package, lobbying, PR spend |
| 4 | **Anchor tenant / offtake** | 1–6 months to negotiate | Tenant credit quality, contract length, prepayment | Choose a tenant: AAA hyperscaler (low price, easy financing) vs. AI lab (high price, risky) |
| 5 | **Financing** | 2–6 months | Rate (IG ~4–5%, HY 7–9%, risky 12%+), leverage, covenants | Debt vs. JV equity vs. a backstop from a big-tech partner. Leverage level |
| 6 | **Procurement** | 6–33 months | GPU allocation, transformers, turbines, cooling | Pay for priority slots, pre-order, accept older-generation GPUs |
| 7 | **Construction** | 4 months (xAI's record) to 24+ months | Cost overruns, labor, weather, delays (30–50% of projects slip) | Speed vs. cost. EPC choice |
| 8 | **Energize and ramp** | 1–6 months | Commissioning failures | Phase the build (energize in blocks) |
| 9 | **Operate** | Contract term (3–15 years) | Uptime/SLA, power price, GPU failures | Fill capacity left open after the anchor tenant, sell spot capacity, upgrade |
| 10 | **Exit / recycle** | Any time after stabilization | Market valuation (cap rates), refinancing rates | Sell the asset, refinance and take cash out, or hold |

**Key insight for the game:** the order is flexible, and choosing it is the strategy. Signing a tenant before you have power or permits gets you money sooner but risks penalties. Getting power first is safer but costs money while it sits idle.

---

## 4. Unit economics (per MW of IT load)

### 4a. Build costs
| Item | Range | Source |
|---|---|---|
| Powered shell + electrical + cooling (AI-ready, liquid cooled) | **$10–15M/MW** | Axis Intelligence 2026. Cipher's filing: $9–11M/MW |
| Electrical/power share of shell cost | 40–48% | Axis |
| Cooling share | 29–33% | Axis |
| Full stack including GPUs (GB200-class) | **$30–45M/MW** | Axis |
| GPUs per MW of IT load (Blackwell-class, ≈) | ~700–800 GPUs | ≈ ~1.2–1.4 kW per GPU all-in |
| GB200 NVL72 rack (≈) | ~$3–4M per rack, ~120–130 kW | Industry pricing (≈) |
| Cheapest vs. most expensive region | Dublin/Madrid ~$10M/MW; Tokyo ~$15M/MW | Axis |

### 4b. Revenue
| Model | Real reference | Per MW per year (≈) |
|---|---|---|
| **Shell lease (tenant brings GPUs)** | Cipher–Fluidstack: $3.0B / 10 years / 168 MW; 80–85% NOI margin | **~$1.8M/MW/yr** revenue |
| **GPU compute contract (neocloud)** | Long-term Blackwell ~$2.5–3.5/GPU-hr; H100 long-term ~$2/hr by 2026 (≈) | **~$13–20M/MW/yr** revenue (750 GPUs × $2.5 × 8,760 h × 90%) |
| **Spot / on-demand** | H100 hyperscaler median ~$9/hr (2024) → ~$6.3/hr (late 2025). Neocloud spot $1.5–3.2 | Volatile. See timeline |

### 4c. Financing
| Instrument | Terms | Example |
|---|---|---|
| IG hyperscaler bonds | ~4–4.5% (5-year) | Alphabet, Amazon, Meta, Oracle raised $93B in 2025 |
| Project bond (SPV, leased to IG tenant) | A+ rating, fully amortizing, DSCR 1.12x | Meta Hyperion: $27.3B, Blue Owl 80% / Meta 20% |
| Delayed-draw term loan (GPU + contract collateral) | SOFR + 4.5–5.5% (~9–10%) | CoreWeave DDTL 5.0 ($3.1B) and 5.5 ($2.6B, Aug 2026) |
| High-yield data center debt | 7–9% | Various |
| Risky borrower | ~12.5% | xAI fixed-rate debt |
| JV equity from private credit | Takes 50–80% of equity for a share of returns | Blue Owl in Abilene ($15B JV) and Hyperion |
| Big-tech backstop | Guarantees part of the lease, gets warrants in return | Google: $1.4B backstop on Fluidstack/Cipher for ~5.4% of Cipher |

### 4d. Depreciation and GPU lifespan (the "time bomb" mechanic)
- Hyperscalers and CoreWeave depreciate GPUs over about **5–6 years**. Amazon cut its estimate to 5 years in 2025.
- Critics (notably Michael Burry, Nov 2025) argue the real economic life is **2–3 years** because each new Nvidia generation (Hopper → Blackwell → Rubin, about yearly) lowers the value of the old one.
- The mismatch: CoreWeave's DDTL 5.5 has a ~5-year maturity while its customer contracts average ~3 years. **Lenders now take the renewal risk.**
- **Game mechanic:** GPUs lose value on a curve, and each new generation announcement drops spot prices for older chips. A 5-year contract protects you. The spot market does not.

### 4e. Exit value
- Stabilized, leased data centers trade at a **~5–7% cap rate (≈)**. A shell earning $1.5M/MW NOI is therefore worth **~$21–30M/MW** against a **$10–13M/MW** build cost. That gap is the development profit, and it is the core reason to "package and sell".

---

## 5. Risk catalogue (becomes game events)

| Risk | Real example | Game form |
|---|---|---|
| **Local opposition** | Q1 2026: 75+ projects / $130B blocked or delayed (all of 2025: ~$64B+). 833 activist groups. Gallup (May 2026): 71% oppose a data center near their home | Protest meter per site. Hearings. Lawsuits |
| **Procedural lawsuits** | Prince William Digital Gateway (~$100B, world's largest planned campus): zoning voided over a newspaper-notice technicality. Compass left in May 2026, QTS/Blackstone in Jul 2026 | "Zoning voided" event. The partner-exit cascade |
| **Moratoriums / policy** | NY governor's executive order moratorium. Arizona 3-year incentive pause. Maine bars state incentives. 300+ state bills. 14 states proposing moratoriums | State-level policy events. Lobbying counters them |
| **Pro-buildout policy** | Federal push (Dec 2025 executive order). West Virginia bars counties from restricting data centers. Texas SB6 (large-load rules) | Friendly states. Lobbying wins |
| **Power bills backlash** | PJM capacity price $28.92 → $269.92 → $329.17/MW-day. Residential bills up ~$16–18/month in some areas | Regional "ratepayer anger" rises with the number of data centers built |
| **Grid queue** | Virginia interconnection timelines now up to ~7 years | Grid-connect timers per region |
| **Equipment shortage** | GE Vernova gas turbine backlog ~100–116 GW, slots booked into 2030 | Turbine/transformer order queue. Pay extra to jump it |
| **Air permits / pollution** | xAI Memphis: unpermitted gas turbines, NAACP/SELC legal action (2025–26) | "Fast but dirty" choice → faster build, bigger protests |
| **Counterparty risk** | Oracle's ~$300B contract with OpenAI. Oracle CDS spike. Oracle's 2055 bonds at 77 cents. Oracle declares force majeure on Project Jupiter, NM (25 Sep 2026) | Tenant credit rating can drop mid-contract. Tenant invokes force majeure |
| **Price reset** | AWS cut H100 prices ~30% (Jun 2025). The market went from scarcity to oversupply | Spot price shock event |
| **GPU generation shift** | Blackwell, then Rubin | Obsolescence event. Older GPU values fall |
| **Circular financing** | Nvidia invests in customers, who buy Nvidia chips. Big tech backs its own tenants | Late-game "bubble" meter |
| **Rate/credit market stress** | Private credit concerns in 2026. BIS warnings | Interest rate and credit spread cycles |

---

## 6. Timeline, 2024 → Sep 2026 (becomes the eras)

**Era 1: "Scarcity" (2024)**
- H100 rental prices peak (hyperscaler median ~$9.3/hr, H2 2024). Neocloud and marketplace entrants appear at $2.5–3.2.
- xAI builds Colossus in Memphis: ~150 MW from an empty building in ~122 days, powered by on-site gas turbines.
- Crypto miners start pivoting to AI hosting.
- Warrenton, VA: every council member who backed an Amazon data center loses re-election (Nov 2024).
- PJM capacity price jumps ~9x for 2025/26.

**Era 2: "Megadeals" (2025)**
- Jan: Stargate announced ($500B / 10 GW headline). Abilene (Crusoe / Oracle / OpenAI) becomes the flagship. Blue Owl + Primary Digital + Crusoe form a $15B JV. $11.6B in financing.
- Mar: CoreWeave IPO. Its debt stack is built from DDTLs backed by GPUs and contracts.
- Jun: AWS cuts H100 prices ~30%. The GPU rental market resets.
- Sep: Nebius–Microsoft deal ($17.4B over 5 years). Cipher/TeraWulf–Fluidstack leases with Google backstops. Oracle–OpenAI (~$300B over 5 years). OpenAI announces 5 new Stargate sites (~7 GW).
- Oct: Meta Hyperion SPV. $27.3B A+ bond, Blue Owl 80%. Its off-balance-sheet structure invites Enron comparisons.
- Nov: GPU depreciation debate (Burry). AI-bubble worries.
- Dec: Federal executive order pushing AI infrastructure. Record PJM capacity costs ($16.4B).
- 2025 totals: $200B+ in AI-related debt, ~$170B in data center project finance loans (+57%).

**Era 3: "Backlash and Reckoning" (2026)**
- Q1: 75+ projects / $130B blocked or delayed. The number of activist groups doubles.
- Feb: PJM 2027/28 auction comes in 6.6 GW short of its reserve margin, a first.
- Early 2026: Oracle CDS reaches record highs. A financing plan calms it for a while.
- Spring: Nebius signs further deals with Microsoft and Meta (~$46B in total contracts). Arizona pauses incentives. NY moratorium.
- May: Gallup, 71% oppose. Compass exits PW Digital Gateway.
- Jul: QTS/Blackstone abandons PW Digital Gateway.
- Aug: CoreWeave DDTL 5.5 at a wider spread (lenders price in the renewal risk). CoreWeave backlog ~$100B. Nebius Vineland Phase 2 approved.
- 25 Sep: Oracle declares force majeure on Project Jupiter (NM). Oracle stock −30% YTD. Data center debt reprices.

**Game arc:** Easy money and scarcity → megadeals and leverage → backlash and a credit squeeze. The player who over-leveraged in Era 2 gets tested in Era 3.

---

## 7. Case studies (deal anatomy)

**Abilene / Stargate (Crusoe, Oracle, OpenAI).** Crusoe develops a 1.2 GW campus on Lancium land. Oracle leases it and serves OpenAI. The JV (Crusoe + Blue Owl + Primary Digital) raises ~$15B, with Blue Owl putting in ~$5B of equity and JPMorgan-led debt. *Lesson: three layers of counterparty. The developer's credit depends on Oracle, whose credit depends on OpenAI.*

**Meta Hyperion (Louisiana).** An SPV (Beignet Investor LLC) issues a $27.3B, A+, fully amortizing bond. Blue Owl owns 80%. Meta leases the campus in 4-year renewable blocks (up to ~20 years) and gives a 16-year residual value guarantee. Meta put in about 5% of the money itself. *Lesson: a strong tenant's guarantee turns risky construction into cheap debt.*

**CoreWeave.** A neocloud financed by DDTLs secured on GPUs plus customer contracts (Microsoft, OpenAI, Meta). Spreads widened from SOFR+4.5% to +5.5% as debt started to outlast contracts. ~$100B backlog. *Lesson: the pre-sold contract is the collateral, and the contract's length caps how much you can borrow.*

**Cipher–Fluidstack–Google.** A former crypto miner signs a 168 MW, 10-year, $3B lease with Fluidstack. Google backstops $1.4B and gets warrants for ~5.4% of Cipher. Cost: $9–11M/MW. 80–85% NOI margin. *Lesson: a weak tenant plus a strong backstop makes a deal financeable. The backstop provider takes equity upside.*

**xAI Colossus (Memphis).** Speed record (~122 days), done with temporary gas turbines, followed by NAACP/SELC legal action. *Lesson: the fast-and-dirty path works and then creates a long legal tail.*

**Nebius–Microsoft (Vineland, NJ).** $17.4B over 5 years. Needed local planning approval for Phase 2 (Aug 2026). *Lesson: a clean 5-year pre-sale to a AAA tenant is still gated by local zoning.*

**Prince William Digital Gateway (Virginia), a failure.** ~$100B, 37 buildings. Zoning voided by a court over notice spacing. Compass left, then QTS. *Lesson: a partner leaving can kill a shared-infrastructure mega-project.*

**Oracle Project Jupiter (New Mexico), a live stress case.** The state land commissioner rejected parts of the plan. Oracle declared force majeure, reserving the right to delay lease payments. *Lesson: a tenant can "soft-default" on you without cancelling.*

---

## Sources
- [Axis Intelligence: AI data center cost per MW 2026](https://axis-intelligence.com/ai-data-center-cost-per-mw/)
- [Cipher Mining 8-K exhibit: Fluidstack deal terms](https://www.sec.gov/Archives/edgar/data/1819989/000095010325012168/dp234624_ex9901.htm)
- [Silicon Data: H100 rental price over time](https://www.silicondata.com/blog/h100-rental-price-over-time)
- [Converge Digest: CoreWeave $2.6B DDTL](https://convergedigest.com/coreweave-2-6b-loan-gpu-ai-infrastructure-financing/)
- [IFR: Meta/Blue Owl deal broken down](https://www.ifre.com/ifr-awards/2340435/the-metablue-owl-deal-broken-down-off-balance-sheet-gymnastics-24-years-after-enron)
- [EnergyNow: $3T build-out and debt markets](https://energynow.com/2026/02/the-3-trillion-ai-data-center-build-out-becomes-all-consuming-for-debt-markets/)
- [MLQ: $130B blocked in Q1 2026](https://mlq.ai/news/75-us-data-center-projects-worth-130b-blocked-in-q1-2026-matching-all-of-2025/)
- [Data Center Watch report](https://www.datacenterwatch.org/report)
- [CDM: PW Digital Gateway collapse](https://cdm.press/news/business/2026/07/03/worlds-largest-data-center-project-on-verge-of-collapse-after-blackstone-unexpectedly-pulls-out/)
- [Axios: Oracle force majeure, Project Jupiter (25 Sep 2026)](https://www.axios.com/2026/09/25/oracle-debt-data-centers)
- [Presenc: OpenAI compute commitments tracker](https://presenc.ai/research/openai-compute-commitments-tracker-2026)
- [mgrid: PJM capacity prices](https://mgrid.org/2026/02/27/pjm-2026-2027-capacity-prices-reach-329-mw-day-as-data-centers-drive-first-ever-system-wide-reliability-shortfall/)
- [Turbomachinery: GE Vernova backlog](https://www.turbomachinerymag.com/view/ge-vernova-gas-turbine-backlog-hits-116-gw-as-power-orders-more-than-double)
- [SELC: Memphis vs. xAI](https://www.selc.org/news/inside-memphis-fight-against-xai/)
- [Crusoe/Blue Owl/Primary Digital JV](https://www.crusoe.ai/resources/newsroom/crusoe-blue-owl-capital-and-primary-digital-infrastructure-enter-joint-venture)
- [DCD: Nebius–Microsoft $17.4B](https://www.datacenterdynamics.com/en/news/microsoft-to-use-nebius-gpu-data-centers-in-deal-worth-174bn-over-five-years/)
- [The Regulatory Review: federal vs. state](https://www.theregreview.org/2026/07/29/lonergan-jockeying-for-control-of-ai-data-centers/)
- [CNBC: GPU depreciation debate](https://www.cnbc.com/2025/11/14/ai-gpu-depreciation-coreweave-nvidia-michael-burry.html)
