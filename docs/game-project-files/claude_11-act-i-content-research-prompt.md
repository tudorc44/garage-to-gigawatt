# Deep research task: Act I content and data pack for "Garage to Gigawatt"

*(Paste everything below this line into a new thread. It's written to run in one go.)*

---

## Your role and the goal

You are the research lead and content designer for a solo-developed, AI-assisted web game called **Garage to Gigawatt** (working title). It's a grounded, finance-first business simulation. The developer is about to start building **Alpha 0.1, which covers Act I only: a crypto miner growing from a garage in Q1 2017 to the Ethereum Merge in Q3 2022.**

Your job: **research the real 2017–2022 crypto-mining world and turn it into a complete, source-backed content and data pack** that a developer (working with Claude Code) can load straight into the game. That means real numbers, real history and ready-to-use event cards.

Work through the whole task in one go. Don't stop to ask clarifying questions. Where something is ambiguous, pick the most sensible option, state it as an assumption, and carry on.

---

## Step 0: Read the project docs first (if you have access)

If this thread is attached to the "Game project" Project, read these docs before researching, in this order:

1. `claude/10-alpha-0.1-scope.md`: **the frozen alpha scope. It's the source of truth.** Everything you produce must fit it.
2. `claude/08-extended-universe-2017-2035.md` §1–3: the Act I timeline, mechanics, economic anchors and balance results.
3. `claude/09-player-actions-and-pacing.md`: turn structure, Bandwidth, the action catalogue, interrupts.
4. `claude/07-game-design-brief.md`: overall concept, tone, real-names policy.
5. `claude/06-tech-stack-recommendation.md` §3.2–3.3: how the sim and content files work (data files checked against schemas).

If you can't access them, the summary below is enough.

---

## The game in brief (for context)

- **Structure:** 23 quarterly turns (2017Q1 → 2022Q3). Each turn: **Plan** (spend Bandwidth and money) → **Live quarter** (13 weekly sub-steps shown over ~20 seconds, with prices moving and 1–3 interrupts) → **Quarter report**.
- **Bandwidth:** founder attention, 3 per quarter at the start, maximum 6. Strategic actions cost 1–3.
- **Coins:** GPUs mine **ETH only** and ASICs mine **BTC only**.
- **Machines (4):** GPU Rig Gen 1 (2017, 6 GPUs, ~180 MH/s, ~1 kW), GPU Rig Gen 2 (2020), Antminer S9 (2017), Antminer S19 Pro (2020). Bought new or used. Machines earn from the quarter after delivery, and a fleet switches off in any week when revenue is below its power cost.
- **Site ladder (no map):** Garage (~5 kW, $0.12/kWh) → Small unit (100 kW) → Warehouse (1 MW) → Own site (20 MW, utility contract) → Texas site (100 MW, fixed or index power + curtailment, 2020+). Scouting reveals 2–3 offers, each with one hidden flaw.
- **Capital ladder:** $10k savings → friends and family → equipment loan → seed → Series A → IPO/SPAC (2021 window only). Plus crypto-backed loans with margin calls.
- **Other systems:** HODL/sell % per quarter; Community Heat (0–100 per site, noise and local power worries); 5 hire types (Ops Manager, Trader, BD Lead, Ex-Utility Exec, Chief of Staff); 4 real named rivals (Riot, Marathon, Core Scientific, Bitfarms) following scripted growth curves and bidding in distressed auctions; a league table.
- **Interrupts:** price spike/crash alert, grid curtailment, machine failure wave, neighbour complaint, distressed auction, margin call, negotiation.
- **Ending:** the Merge decision screen (4 choices: sell GPUs and keep BTC mining; become a GPU cloud; convert sites to hosting; hold and wait), a chapter report, and the score (founder net worth at the Merge).
- **Tone:** a grounded business sim, lightly wry, never cartoonish. **Real company names are allowed, but no real people** in events, and no logos.

### Balance anchors the data must be checked against (from economy-model.xlsx, which you don't have)

| Check | Target |
|---|---|
| 180 MH/s garage rig at $0.12/kWh, Q4 2017 | ~+$5/day profit |
| Same rig, Q4 2018 | Slightly negative (~−$0.60/day) |
| Hashprice | ~$400/PH/day at the late-2021 peak (≈), ~$60 at end-2022 (≈) |
| "Good player" path | $10k → F&F $40k (2017) → $1.5M seed (2018) → $8M Series A (2019) → $150M IPO (2021Q2). Sites: garage → 100 kW → 1 MW → 20 MW → 100 MW |
| Peak valuation (2021Q3, 15x EBITDA) | ~$2.0B, close to real 2021 miner IPOs (IREN ~$1.6B, Core Scientific ~$4.3B) |
| Valuation at the Merge | ~−92% from the peak |
| Reinvesting 100% every quarter | Runs out of cash in 2018Q2–2019Q2 |
| Machine cost at the 2021 peak | ~$3–4M per MW of machines |

Your research should **confirm or correct** these anchors. If real data contradicts one, say so and propose the corrected value.

---

## What to research

For every number, give a **source** and say whether it's **sourced** or an **estimate (≈)**. Where sources disagree, give the range and pick a game value.

### A. Market time series, 2017Q1 → 2022Q3
1. **Weekly** (≈300 rows): BTC and ETH closing price (USD); BTC network difficulty; BTC network hashrate; BTC block subsidy; fee share of miner revenue (≈ is fine); **BTC hashprice ($/TH/day and $/PH/day)**; **ETH revenue per MH/s per day (USD)**; ETH network hashrate.
2. **Quarterly summary:** open, close, high, low and average for each of the above.
3. **Shock markers:** the exact weeks of the 10 scripted events (section D), so the live quarter can place them.
4. Note how you derived the computed series (hashprice, ETH revenue per MH) and check them against published indices (e.g. Hashrate Index, Luxor, Braiins/Slush, bitinfocharts, whattomine archives, Etherscan, Blockchain.com, CoinMetrics).

### B. Machines
1. **Specs for the 4 models:** hashrate, power draw, efficiency (J/TH or W/MH), noise (dB), typical lifespan, failure rate (≈).
   - Pick the real GPU basis for each rig (e.g. an RX 580 / GTX 1070 rig for Gen 1; an RTX 3060 Ti / 3070 rig for Gen 2) and explain the choice. Cover Nvidia's LHR (Lite Hash Rate) cards from 2021 as a possible event.
2. **Quarterly price curves, new and used,** for each model, 2017Q1–2022Q3 (or from launch). Include the 2017 and 2021 GPU shortages, used prices in the winters, and ASIC $/TH indices where they exist (e.g. Hashrate Index ASIC price index from 2020).
3. **Delivery lead times** for new ASICs by period (the pre-order backlog in 2021).
4. Hardware costs beyond the machines: racks, PDUs, cooling, per MW (≈).

### C. Sites, power and community
1. **Power prices by tier and year:** US residential average, commercial/industrial, typical hosted mining rates ($/kWh all-in), long-term utility contracts for large miners, ERCOT wholesale behaviour.
2. **Site costs:** rent for a small unit and a 1 MW warehouse (≈), **capex per MW** to build a mining site (infrastructure only), build times per tier, the cost of upgrading power (transformers, substation).
3. **Curtailment and demand response:** how Texas miners were paid (ERCOT programmes, power credits). Use real examples such as Riot during Uri (Feb 2021) and summer 2022. Give numbers you can translate into $ per MW curtailed per event.
4. **Community Heat basis:** real noise and local-power disputes in 2017–2022 (e.g. Plattsburgh NY's 2018 moratorium, Chelan County WA, Hydro-Québec rate changes, Upstate NY / Greenidge, Iceland, Norway). For each: what triggered it, what happened, how it was resolved. Map them to Heat thresholds.
5. **Hidden flaws for site offers:** 6–10 realistic ones (grid delay, landlord trouble, zoning, noise ordinance, water, flood/heat risk), each with a real-world basis.

### D. Scripted history: the 10 scripted events
For each, give the exact date or dates, the magnitude (price move %, hashrate move %, etc.), and a one-line mechanical effect in game terms:

1. The 2017 GPU shortage and ETH boom (2017Q2–Q4)
2. The Dec 2017 BTC peak and the Jan–Feb 2018 crash
3. The 2018 crypto winter bottom (Nov–Dec 2018)
4. 2019: the "rent your GPUs as cloud" rumour (flavour, based on Atlantic Crypto → CoreWeave)
5. The COVID crash ("Black Thursday", 12 Mar 2020) and rebound
6. The 3rd halving (11 May 2020)
7. Winter Storm Uri (Feb 2021)
8. China's mining ban (May–Jul 2021) and the hashrate migration
9. The 2021 SPAC/IPO mania and the Nov 2021 ATH
10. The Luna/Celsius collapse (May–Jun 2022)

The **Merge (15 Sep 2022)** is the Act I finale screen, not a card, but give its data too: what happened to ETH revenue per MH, and GPU resale prices before and after.

### E. Capital
1. **Friends-and-family, seed and Series A:** real mining-company rounds 2017–2020 (size, valuation, investor type) to calibrate the ladder.
2. **Equipment loans:** real terms (lenders such as NYDIG, Galaxy, Anchorage, Trinity; interest rates, LTV, tenor, machine collateral) by year.
3. **Crypto-backed loans:** real terms at BlockFi, Celsius, Genesis and Nexo (LTV, interest rate, margin-call and liquidation thresholds, how fast calls happened). Include what happened to miners who borrowed in 2021–22.
4. **IPO/SPAC window:** 2021 deals with dates, raise size and valuation at listing: Core Scientific (SPAC), IREN IPO, Cipher (SPAC), Greenidge (merger), TeraWulf, Bitdeer, Stronghold, Rhodium (failed). Plus what they were worth by Sep 2022.
5. **Valuation multiples:** EV/EBITDA and price-to-hashrate of listed miners by quarter or half-year (2019–2022), to set the "era multiple".
6. **Distressed assets:** real fire-sale prices in 2018–19 and 2022 (used rigs and ASICs, $/TH, bankrupt farms or sites). Include the 2022 auctions and restructurings.

### F. Rivals
For **Riot, Marathon, Core Scientific and Bitfarms**, quarterly from 2017Q1 (or first public data) to 2022Q3: deployed hashrate (EH/s), MW, BTC mined, BTC held, market cap or valuation, and key moves (acquisitions, big ASIC orders, HODL policy). Where data is missing, interpolate and mark it ≈. These become scripted growth curves.

### G. People and operations
1. **Hire salaries** (US, 2017–2022, ≈) for the 5 hire types, and what each role really did at mining companies.
2. **Operating costs** besides power: staff per MW, maintenance, insurance, hosting margin (≈).
3. **Failure modes:** heat-related failures, fan and hashboard failures, fire incidents at mining farms (real cases), typical repair costs.

---

## What to write (the content)

Using the research, write the following as game-ready content:

1. **20 event cards:** the 10 scripted ones (section D) plus **10 random ones grounded in real anecdotes**. Candidates: a farm fire, a landlord eviction, a customs delay or tariff on Chinese ASICs (Section 301), a local moratorium, rig theft, a used-rig scam, a utility rate hike for miners, an ETH "difficulty bomb" delay, a heat wave, a friend asking for their money back, a tax surprise. For each card:
   - `id`, `title`, trigger (fixed date **or** a condition such as `heat >= 30` or `era == winter`), weight/probability if random
   - Body text of **≤ 60 words**, in the game's tone
   - **2–3 choices**, each with effects written in game variables (`cash`, `heat`, `bandwidth`, `hashrate_mult`, `delay_quarters`, `reputation`, …) and plausible magnitudes
   - The real-world basis in one line, with a source
2. **Interrupt definitions** for the 7 interrupt types: trigger thresholds, choices, default choice (if skipped) and effect sizes.
3. **5 hires:** a fictional name and a 1-line bio for each (fictional people only), salary, and effect (per the scope doc).
4. **4 rival profiles:** a 2-line description and "style" (e.g. HODLer vs. seller) based on their real 2017–22 behaviour.
5. **The Merge decision:** 4 choice texts (≤ 50 words each) and an "Act II preview" text for each.
6. **Onboarding:** 5–6 tooltip texts for the guided first quarter (2017Q1).
7. **Glossary:** ~25 terms (hashrate, hashprice, difficulty, halving, HODL, ASIC, MH/s, TH/s, EH/s, J/TH, PUE, curtailment, LTV, margin call, SPAC, EBITDA, capex, opex, and so on), each ≤ 30 words, plain language.
8. **Flavour:** 30 short quarterly "news ticker" headlines (fictional wording, real events), 1–2 per quarter.

---

## Output format

Produce **one research report plus a set of data files.** If you have Project write access, save them to the Project under `claude/act1-content/`. Otherwise return them as downloadable files.

| File | Content |
|---|---|
| `11-act-i-content-pack.md` | The research report: executive summary; key findings per section A–G; **balance-anchor check** (every anchor from the table above: confirmed / corrected, with the math); assumptions; open questions; full source list |
| `market_weekly.csv` | Section A.1, one row per week; columns documented in the report |
| `market_quarterly.csv` | Section A.2 |
| `machines.json` | Specs + quarterly new/used price curves + lead times |
| `sites.json` | 5 tiers: capacity, power price, rent/capex, build time, Heat base, possible hidden flaws |
| `capital.json` | The ladder stages with amounts, dilution and availability windows; loan products with terms; IPO window; era valuation multiples by quarter |
| `rivals.json` | 4 rivals with quarterly curves and profiles |
| `events.json` | 20 event cards |
| `interrupts.json` | 7 interrupt definitions |
| `hires.json` | 5 hires |
| `merge.json` | The Merge decision |
| `text.en.json` | Tooltips, glossary, news ticker (keys ready for a `t('key')` string table) |

**Data conventions:**
- Quarters written as `2017Q1`. Weeks as ISO dates (Monday).
- USD nominal. Power in kW/MW, energy in kWh/MWh, hashrate in MH/s (ETH) and TH/s (BTC).
- Every JSON entry that holds a real number gets a `source` field (short cite or URL) and `estimate: true/false`.
- Real company names only in `rivals.json` and event text. No real people anywhere.
- At the top of the report, include a short **JSON schema sketch** for each file (field names and types), so the developer can write Zod schemas from it.

---

## Quality bar

- **Accuracy first.** Prefer primary sources: company filings (10-K, 10-Q, F-1, S-4), exchange data, on-chain data, EIA for power prices, ERCOT for grid data, regulators and local news for disputes. Use secondary sources (CoinDesk, The Block, Bloomberg, Hashrate Index, Luxor) to fill gaps.
- **Ranges, then a game value.** For contested numbers, show the range, pick one, and say why.
- **Playability over precision.** Where real data is too noisy for fun (e.g. daily volatility), propose a smoothed game value and keep the real value alongside it.
- **Flag design problems.** If the research shows a planned mechanic is unrealistic or a balance anchor doesn't hold, say so in the report's "Design flags" section with a suggested fix. Don't silently change the design.
- **Completeness check at the end:** a table listing each file and section above with its status (done / partial / missing and why).
