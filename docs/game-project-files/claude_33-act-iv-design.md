# 33: Act IV design, "The Race to Orbit" (2031 → 2035). v0.1 draft for approval, 5 Oct 2026

*Design thread. The recommended concept from doc 32 (Concept A), designed in the shape of doc 27. Built on the research dossier (doc 31, evidence to 5 Oct 2026, with its cost model `act4-research/orbit_cost_model.py`) and on the game as built: CLAUDE.md, dev-notes through M26 (done on branch m26, not yet merged), doc 27 v1.2 (especially D1-D17 and §17), doc 28, the Act III content README, `src/sim/state.ts` and the content files. Nothing is decided until the owner approves the decisions in §21. The content pack, scope doc and wireframe prompt come after approval, as they did for Act III. Before hand-back, an independent check compared this doc with doc 31 and the build; its corrections are applied.*

**How to read this doc.**
- Evidence tiers (doc 31): **[A]** demonstrated or contracted, **[B]** announced and funded, **[C]** credible expert projection, **[D]** speculation or hype. Every future in Act IV is a scenario, not a forecast; each says which tier it rests on.
- **⚙** marks a number or rule expected to change after playtests or the sim. The owner's playtests do not block the build (owner decision, Oct 2026), so ⚙ values are first-pass and the bots tune them.
- Numbers come in three kinds, labelled where it matters: **sourced** (doc 31), **derived** (computed from sourced values, mostly by the cost model) and **designed** (invented for the game, to tune).
- Plain-language definitions of the jargon are in doc 31's glossary table; the terms this doc adds are below.
- Decisions are numbered **IV-D1 to IV-D33** so they never clash with Act III's D-numbers or CLAUDE.md's "D15 guard". "Act quarter" counts from 0 (2031Q1 = act quarter 0, 2035Q4 = 19).
- Fictional names (companies, blocs) are placeholders; the content pack runs a name-clash check before any of them ships.

| Term | Meaning |
|---|---|
| kWe, MWe | Kilowatts or megawatts of electrical power (as opposed to heat). |
| bp | Basis point: 0.01 percentage points (SOFR + 450 bp = SOFR + 4.5%). |
| Nameplate | A plant's design output when running at full capacity. |
| Offtake | A contract to buy a plant's future output at an agreed price. |
| Cislunar | The space between Earth and the Moon, including lunar orbit. |
| SSO | Sun-synchronous orbit; a "dawn-dusk" SSO keeps a satellite over the day-night line, in near-constant sunlight. |
| PSR | Permanently shadowed region: a crater floor near a lunar pole that never sees the sun, where ice can survive. |
| ITU | The UN's International Telecommunication Union, which coordinates radio frequencies and geostationary orbital slots. |
| ECA | Export credit agency: a government body that lends or guarantees loans so foreign buyers can purchase a country's exports. |
| Resource categories | Mining's confidence levels for a deposit, lowest to highest: inferred, indicated, measured (from the JORC and NI 43-101 reporting codes). |
| Selenian | Of the Moon (from Selene); used only as a title name. |

---

## 1. What Act IV has to prove

**One question:** *Can a player who built and defended an AI-capacity business on the ground decide when, how far and how fast to bet it on orbit and on the Moon, with real money at stake every quarter, and survive or exploit a future nobody told them about, in which launch prices, physics, debris, politics or cheap ground power can each break the bet?*

Act II asked "how do I build", Act III "what do I do when the world turns". Act IV asks **"how far do I reach, and on whose rockets"**: the same Deal Desk and the same reading skill, applied to a frontier where the ground is cheaper but slow, orbit is fast but dear, and the Moon is a land race whose prize mostly arrives after the act ends.

It is also the campaign's last act, so it must land the whole arc: a student mining bitcoin on a bedroom PC in 2009, a garage miner in 2017, an AI landlord in 2026, and in 2035 perhaps a company mining the Moon.

## 2. Shape

- **Span:** 20 quarterly turns, 2031Q1 → 2035Q4 (quarter indices 56-75 on the game's one timeline). All 20 are decision quarters: no auto-play. About 55-60 minutes ⚙, 3-6 meaningful decisions a turn (as Acts II-III).
- **Loop:** unchanged. Plan phase (spend Bandwidth and money) → live quarter of 13 weekly ticks with up to 3 interrupts → quarter report. Seeded RNG; Act IV randomness on its own substreams so earlier acts never change.
- **Entry:** "Continue to Act IV" on a finished Act III chapter report (after the reveal), or "Start at Act IV" with one of three preset companies (§3.4). *Proposal, not settled (open question 11):* a Scenario Mode run of Act III may continue into Act IV, with the finale labelling the campaign "scenario known".
- **Screens:** desktop at 1024 px and up, as every act; Act IV's screens load as their own lazy chunk, so the main bundle stays under 500 KB.
- **Exit:** the Act IV chapter report with the reveal, then the **campaign finale** (§15), then the title screen.
- **Era theme:** a sixth theme, working name `orbit` (design-system work, after approval): a dark-paper "mission control" ledger, the only era whose paper is dark, with the brand's existing gain/loss/warn rules unchanged ⚙.

## 3. Carry-over from Act III, and the Act III → IV boundary

### 3.1 What carries, unchanged (checked against `GameState` in `src/sim/state.ts`, read 5 Oct 2026)
- **Money and ownership:** `cash`, the treasury (BTC and ETH), `founderStake`, `raisesDone`.
- **Ground assets:** `sites` (energized MW, power contracts), `machines`, `hosting`, and `projects` with their tenants and terms, including each project's `tier`, `downtime` and `lenderCure`.
- **Debt:** `equipmentLoan`, `constructionLoans`, `bridgeLoan`, `cryptoLoan` and `facilities` (project debt, DDTLs and standby-facility draws); `creditRating`; `act3Standby` while inside its window; `covenantBreach` if one is open.
- **Act III systems:** `ppas` (nuclear PPAs, 15-year terms to 2042+), `politicalCapital` (and its decay), `angerAdj`, `act3Gov` (lobbying under way, cooldowns, one-offs), `communityDeal`, `siteHeat`, `staff` and `firedQuarter`, the lasting effects held in `events`, and any `act3Payouts` scheduled after 2030Q4 (paid as scheduled ⚙).
- **Identity and records:** `seed`, `act3Seed`, `preset`, `scenarioId` and `scenarioMode` (kept for the finale; nothing in Act IV play reads them), `act2Entry`, `act3Entry`, `act3End` (the Act III reveal, titles and reading score, read-only), and `reports` (every quarter's report, which the finale reads, §15.2).
- **New at the boundary:** `act: 4`, save `version: 5`, `act4Entry` (shaped like `act3Entry`, for the growth multiple), `act4Seed` (the salt for Act IV's own random streams, like `act3Seed`), and the future and lunar-grade draws in hidden-state form (§6.8).
- **Gates:** `inAct2Rules` extends to act 4 (Act II's business rules run on in Act IV) and `covenantBreached` extends to act 4 (it now checks Act III only). Every other Act III-only gate is reviewed one by one and its answer written in dev-notes, as M11.4c did for Act III.
The build re-checks this list against `state.ts` at its first milestone; fields added on m26 or later are added then.

### 3.2 Boundary rules (like doc 27 D17)
- **Heat and Anger carry** (ground politics doesn't reset).
- **An open covenant breach carries** with its cure deadline; the leverage covenant continues (§11.4).
- **The standby liquidity facility** carries while inside its 8-quarter window, then lapses as in Act III.
- **Open Act III renewals and blend-and-extend offers** (`act3Renewals`, `act3BlendOffers`) resolve by their defaults at the boundary. Contracts that come due in 2031-2035 renew through Act III's renewal system, priced off Act IV's market indices.
- **Act III-only state is dropped:** `act3Wildcards`, `act3WildcardOpen`, `act3ExportRule`, `act3SignalReads` and `act3Moves` (both kept inside `act3End`), and the last `marketRead`.
- **Act III's scenario does not continue.** Act IV draws its own future (§6).

### 3.3 The market seam and the common 2031 baseline
Act III ends in one of four very different worlds (a bust, a boom, a muddle, an efficiency shock). Act IV's four futures must not be readable on day one, so they start from **one shared 2031 baseline**:
- **Common baseline:** every Act IV market series (launch prices, satellite mass and build cost, the generations announced, rents, multiples, ground power) is identical across the four futures in 2031Q1-Q2 and within ±3% of each other through 2031Q4 ⚙. Act III kept every live price within 3% across scenarios at entry; Act IV keeps the same rule, and a test asserts it (B14). The futures diverge gradually from 2031Q3; the clear differences come with the Signals and the trigger (§6.1).
- **Seam glide:** quarter 0 of every Act IV market series = the player's Act III scenario value at 2030Q4; the series then closes the gap to the **common baseline** (not to the future's own path) in equal steps over 4 quarters (2031Q1-2031Q4) ⚙. Because every future's glide ends in the same place, the glide can't reveal the future. This is Act III's seam fix (doc 27 §17.2), made general.
- Era multiples and rents glide the same way, so a company valued in an Act III boom doesn't lose half its value on the first report of Act IV for no reason.
- **Columns the carried systems read:** the Act IV market files continue every column that Act II-III systems read, to 2035Q4: renewal bands and the RFP index, ASIC tiers, GPU prices and rents, nuclear PPA prices, PJM capacity prices and retrofit costs (§16).

### 3.4 Presets (as doc 27 D13, learning from its F-6 correction)
Three 2030Q4 companies, each a real bot + seed + Act III scenario played from 2017 (or from the Act II preset), never hand-made. Their values are **set by the sim, not targeted in advance** (Act III's presets had to be corrected downward when targets were set first).
- **Ground Fortress:** a leased-shell landlord with plenty of energized ground MW, low debt, a good rating, no GPUs.
- **Orbit-Ready Neocloud:** a GPU-heavy company with clouds under contract, some debt, cash flow to fund an orbital cloud.
- **Last Ridge:** a small survivor with one site and little debt: the cheap seat, for whom a lunar claim is the long shot.

## 4. New in Act IV

1. **Three theatres, one balance sheet:** Ground (the existing systems), Orbit and Moon (§5).
2. **Orbital compute blocks** through the Deal Desk, with a Launch slot (§7).
3. **A launch market** with manifests, a dominant vertically integrated provider, failures and a tiny insurance market (§8).
4. **The lunar supply chain:** claim, prospect, power, pilot plant, the production decision, and sales on and around the Moon (§9).
5. **A new hidden-future draw** reusing Act III's engine, six new Signals, one decoy, a new reading score (§6).
6. **A second hidden variable, the lunar grade,** read through your own prospect reports (§6.4).
7. **Fleet telemetry:** your own orbital failure rates as a private signal of orbital reliability (§6.5).
8. **Licences and registries** worked with political capital, and three orbital shells with congestion (§7).
9. **New finance instruments:** export-credit satellite loans, orbital project debt with an insurance covenant, sovereign co-funding, a space-equity window, lunar grants and offtake (§11).
10. **Fictional space rivals and two sovereign blocs**, and a race for a handful of lunar polar sites (§12).
11. **The campaign finale and epilogue** (§15).

## 5. The three theatres and the megawatt line

The thread through every act is **energized megawatts**. In Act IV the top bar's MW figure splits into three columns, and the finale draws the line from the first act:

| Theatre | What a megawatt is | Why it's scarce |
|---|---|---|
| **Ground** | Grid- or PPA-powered MW at your sites (Acts I-III) | Time to power: a new grid connection takes 16-24 quarters ⚙ in most futures (LBNL: median over 5 years [A]); moratoria, Heat, Anger |
| **Orbit** | MW of IT load on your satellites, powered by their own solar arrays | Launch slots, money (about 1.6x ground cost in 2031 in every future, then 0.9-1.8x by 2035 depending on the future; derived, §6.2), licences, congestion, reliability |
| **Moon** | kWe of electrical power on a lunar site (solar ridge arrays, a leased fission unit) | A few hundred metres of good ridge per site [C]; a 100 kWe reactor is NASA's target for launch in FY2030 [B], which the research rates unlikely, so the game offers one from 2034 at the earliest; MW-scale lunar power before 2035 is [D]; landings fail |

The Moon is where the line comes full circle: a garage once fought for 5 kW at 12¢; in 2035 the scarcest power in the solar system is a few hundred kW on a crater rim.

## 6. The hidden future: futures, Signals, lunar grade, telemetry, wildcards, reading score

### 6.1 The draw (reuses Act III's engine, IV-D10)
At the Act III → IV boundary, a secret draw from `act4Seed` on its own substream picks **one of four futures**. Each future is **data**: one quarterly market file (§16), authored Signals with a decoy and a trigger, its event cards, its rivals' scripted curves and fates, and a hidden reliability record (§6.8). All four share the 2031 baseline (§3.3). The trigger lands in **2032Q2-2033Q3** (act quarters 5-10) ⚙; Signals start moving 2-4 quarters before it, never before 2031Q3. Scenario Mode (pick the future openly) unlocks after one Act IV finish, as in Act III.

### 6.2 The four futures

| | F1 **On Schedule** | F2 **The Wall** | F3 **Closed Shell** | F4 **Cheap Ground** |
|---|---|---|---|---|
| Weight ⚙ | 25% | 30% | 20% | 25% |
| One line | Reusable heavy lift delivers; orbit nears parity, and then everyone floods it | Orbit stays dear: launch prices stall, satellites stay heavy, regulators cap constellations | A debris cascade closes the busiest shell; insurance hardens; high orbit and the Moon become strategic | The ground unblocks: faster connections, new firm power, an efficiency jump; orbit's speed premium evaporates |
| Third-party launch, LEO $/kg (2031 → 2035) ⚙ | 600 → 150 | 600 → 600 (a promotional dip that doesn't stick) | 600 → 350 (spike after the event) | 600 → 350 |
| Satellite mass, t per MW IT (2031 → best available by 2035) ⚙ | 18 → ~10 | 18 → 16 | 18 → 11 | 18 → 11 |
| True orbital GPU failures / useful life (hidden, §6.5 and §6.8) ⚙ | 6%/yr, 6 years | 10%/yr, 4 years | 7%/yr, 5 years | 8%/yr, 5 years |
| Orbit vs ground cost, 2031 → 2035 (derived, model §4b) | 1.6x → ~0.9-1.0x | 1.6x → ~1.7-1.8x | 1.6x → ~1.2x (SSO, high LEO), ~1.4x (high orbit) | 1.6x → ~1.2x, but ground rents fall |
| Ground squeeze | High early, eased late as orbital supply floods | High throughout | Medium, spike after the event | Falls from the trigger |
| Who it rewards | Early, fast orbit builders who don't overbuild into 2034-35 | Ground holders; orbital shells with tenants carrying the GPUs; patience | Diversified shells, insurance bought early, high orbit; then bold rebuilders. Lunar sites are re-rated as strategic (valuation, not cheaper launches) | Ground holders and anyone who sold orbit early or presold it on long contracts |
| Who it punishes | Late overbuilders (rents fall 2034-35) | Heavy orbit bets, especially orbital clouds | Concentration in the busy shell, uninsured blocks | Orbital clouds without long contracts |
| Evidence | [C] Google's "≲$200/kg by the mid-2030s"; Altman Solon; BCG's aggressive case. Enablers [A/B]: Starship V3 reached orbit 28 Sep 2026. ~10 t/MW sits between the credible 12-20 and proponents' 5-8 [C/D]: F1 combines the optimistic end of each [C] input | [C] SemiAnalysis base case (parity ~2040); Wood Mackenzie (>3x); radiator mass; AAS and operator petitions [A]; the dominant launcher pricing to the next-best alternative (inference from Falcon 9's price history [A]) | Risk [A/C]: ESA 2026 report, 207,152 Starlink avoidance manoeuvres in six months [A], 2007/2021 test debris [A], the "CRASH clock" preprint [C]. A shell-closing cascade by 2033 is **[D]**, designed magnitude | [C] IEA high-efficiency case; GE Vernova turbine ramp [A/B]; FERC's June 2026 large-load order [A]; first SMRs ~2030 [C]. Fusion is **not** in this future [D] |

Notes:
- **Day one looks the same in every future** (§3.3): launch at ~$600/kg, Gen 31 at 18 t per MW, Gen 33 announced, and everyone (rivals, lenders, the player) planning on a 5-year life and ~8% a year of failures (designed from the published 5-year design life and 5-10% failure assumptions, doc 31 §2.2). The future shows itself through the Signals, your fleet telemetry and the trigger.
- F1 is deliberately not a free win: by 2034 the rivals' orbital supply floods and rents fall, so its ideal stance turns cautious late. This keeps the reading score and the economics pointing the same way (the lesson of Act III's S3 tension, doc 27 §17.9).
- **Every future is a scenario, not a forecast.** Each rests on published cases ([C]) with designed magnitudes on top; F3's cascade is [D] by design, and the market-mood paths (space multiple, rents) are designed; both are labelled so.
- Lunar transport costs follow the future (cheapest in F1, dearest in F2); sovereign lunar spending rises most in F3 (high orbit and the Moon become strategic, so lunar sites and resources are valued higher, §11.3).

### 6.3 Signals (six new indicators, same panel and rules as Act III)
Each 0-100 with a trend arrow, authored per future and quarter, never derived from the market files ("Read the market" reveals the authored sharp range only, as in Act III):
1. **Launch Quotes**: third-party $/kg quotes and reuse news.
2. **Fleet Reliability**: industry-reported failure rates of orbital compute (rivals, regulators' reports).
3. **Orbital Congestion**: conjunction alerts and avoidance manoeuvres in the busy shells.
4. **Ground Power Squeeze**: capacity prices, queue lengths, moratoria.
5. **Compute Demand Gap**: AI revenue against capex (Act III's Revenue Gap, continued).
6. **Regulatory Climate**: licensing backlog, brightness and debris rule-making.

**One decoy per campaign** (picks to confirm in the content pack ⚙): F1 a congestion scare (tempts the F3 reading); F2 a promotional price cut that doesn't stick (tempts F1); F3 a rule proposal that dies (tempts F2); F4 a record capacity auction followed by relief (tempts F1). The hidden-file and leak guards extend to every Act IV file (CLAUDE.md's Act III rules, IV-D10; §6.8).

### 6.4 The lunar grade (a second, private hidden variable, IV-D9)
Drawn at the boundary on its own substream, independent of the future: **Rich 20% · Patchy 50% · Dry 30%** ⚙.
- **Rich** ≈ LCROSS-like grades (about 5-6% water by weight) in reachable, shallow deposits at good sites [C/D].
- **Patchy** ≈ ice in small cold traps with grades that vary from metre to metre [C, the reading most consistent with the micro-cold-trap and radar-ambiguity evidence].
- **Dry** ≈ mostly low-grade or deeply buried ice; extraction uneconomic before 2035 [C].
Each polar site adds its own variance around the grade. You learn it only through **prospect reports** (§9.2): each successful prospect returns a noisy grade estimate with an error band; a second prospect narrows it, and a running pilot plant narrows it most. The true grade sits in a hidden file that only the lunar geology system and the chapter report read (§6.8). It is revealed in full at the end ("The ice was: patchy"). It is **not** part of the reading score: lunar judgement is scored by the money it made or lost.

### 6.5 Fleet telemetry (a private signal of reliability, IV-D16)
Doc 31's sharpest finding is that orbit's case hinges on how long GPUs survive in orbit, and nobody has flight data yet. In Act IV that is part of each future (§6.2) and the player sees it **through their own fleet**: each live orbital block reports its quarter's failures, drawn from the future's true rate (a hidden file, §6.8) with seeded noise. One block over two quarters says little; several blocks over a year say a lot. The Space Operations hire narrows the noise (§14.3). This turns "is orbit really working?" into a reading decision the player pays to learn, and it can disagree with the public Fleet Reliability signal early on, as real operators' data would.

### 6.6 Wildcards (2 of 6 drawn at entry, IV-D11)
Each fires once in a random quarter of its window ⚙:
1. **Severe solar storm** (G5-class, like May 2024 [A]): the storm swells the upper atmosphere and raises drag. Satellites still low after launch are the ones at risk: in Feb 2022 a minor storm cost up to 40 of 49 freshly launched Starlinks [A], and in May 2024 12 Starlinks at 300-400 km re-entered while those above 500 km were unaffected [A]. At 500+ km the exposure is radiation hits on electronics and fleet-wide manoeuvre outages (inference, doc 31 §2.7). In game: blocks still climbing from their deployment orbit that quarter lose a share of satellites; operating blocks face a safe-mode choice (lose a few weeks' revenue, or ride it and risk a few % of GPUs to radiation) ⚙ (designed magnitudes). Not a Carrington-class event (about 1.5-5% in 2031-35 [C]), which stays out.
2. **Flag on the Pole:** a bloc standoff over south-polar sites freezes extraction for non-aligned operators for 2-4 quarters ⚙; political capital and bloc alignment decide who keeps working.
3. **Launch grounding:** the dominant launcher is grounded for 2-6 weeks after an accident [A, Falcon 2026 and New Glenn precedents]; manifests slip a quarter.
4. **Chip export clampdown:** new rules on space-qualified compute; the registry state you chose matters.
5. **Reactor delay:** the bloc fission programme slips again; the first leased lunar reactor moves from 2034 (§9.3) to beyond 2035.
6. **Bitcoin supercycle:** any leftover miners print money for 3 quarters; a nod to the garage.

### 6.7 The reading score (reuses `readingScore.ts`, new hidden file)
Same mechanics as Act III (doc 27 §17.1): an ideal stance per future and quarter, the sign of the player's logged big moves, decoy penalties, five title bands. The stance in Act IV measures **orbital exposure**:
- **+1** (adds exposure): committing a block in any shell (a quiet shell diversifies, but it still adds orbital exposure) ⚙, a non-refundable launch booking, drawing orbital debt.
- **−1** (reduces exposure): insurance bought, selling or deorbiting a block early, presales on long take-or-pay contracts, cancelling bookings, and an equity raise (−1 whatever it funds, as in Act III).
- **0** (logged for the reveal timeline, not scored): ground moves, which the money already judges, and lunar moves (IV-D9).
Ideal stances, to author in the content pack: F1 offensive early, calm then cautious from 2034; F2 cautious throughout; F3 hedged before the trigger, bold after it; F4 calm before the trigger, defensive after. The perfect and passive oracle values are computed and asserted by the sim, as in Act III.

### 6.8 Hidden files and the leak guard (IV-D33)
Act III's rule carries: a hidden file is read only by the sim system that needs it and by the chapter-report builder, never by UI code, and a test asserts it.
- **Hidden:**
  - `reading_score_iv.json` (ideal stances, weights, oracle values): read only by `readingScore.ts` and `act4End.ts`.
  - `lunar_truth.json` (the grade draw, per-site variance, prospect noise): read only by a dedicated lunar geology system, which turns it into noisy prospect estimates, and by `act4End.ts`.
  - `orbit_truth_iv.json` (each future's true orbital failure rate and useful life): read only by a dedicated fleet reliability system, which draws each block's telemetry, and by `act4End.ts`.
- **Read in play, as Act III's market and Signals files:** `market_iv_f*.csv` and the weekly files (only current and past rows reach the UI; they hold prices, rents and indices the player can see, never the true reliability or grade) and `signals_iv_f*.json` (the panel shows the current displayed range; the sharp range only after Read the market).
- **Views show estimates only:** the Moon screen shows each site's prospect estimate and its band, and the orbit board shows telemetry; no screen ever shows a true value before the reveal.
- The leak-guard and hidden-file tests add the three files above; the D15 guard is unchanged.

## 7. Orbit: compute blocks, shells and licences

### 7.1 The orbital block (reuses the Deal Desk, IV-D12)
An orbital block is a project card, like an Act II project, with three slots:
- **Launch** (replaces Power: the satellite carries its own solar power): a manifest booking (§8).
- **Tenant**: who buys the compute (§7.5).
- **Capital**: how it's paid for (§11).
Nothing launches until all three are filled; the order is the strategy, as in Act II.

**Two kinds, mirroring Act II's shell and cloud:**
- **Orbital shell** (platform as a service): you build and launch the satellites (power, cooling, links, station-keeping); the tenant buys the GPUs, which are integrated at your factory and fly on your platform. Lower capex for you, GPU failure risk on the tenant, rent per MW-year. Real-world shape: a cloud operator running its service on a startup's satellites (the Crusoe-Starcloud partnership, 2025 [A for the partnership, B for capacity]).
- **Orbital cloud** (full stack): you own the GPUs too; you sell GPU-hours or capacity contracts. Higher return and all the reliability risk.

**Sizes:** 5 / 10 / 25 / 50 / 100 MW blocks ⚙ (a block is many satellites; the game never counts satellites).

**Satellite generations:** `Gen 31` (2031: ~18 t per MW, ~$800/kg build cost) ships in every future. `Gen 33` is announced alike in every future (~13-15 t per MW) and delivered differently (heavier than announced in F2, ~16 t). `Gen 35` (~10-11 t per MW, "hot radiators") arrives in F1, F3 and F4 only ⚙. Values from the cost model's paths (doc 31 §2.5, sourced anchors plus inference); ~10 t is the optimistic end of the credible range [C].

**Build time:** satellite manufacture 2-3 quarters ⚙ in parallel with the launch booking's lead time; a block is typically live 4-6 quarters after its card is opened ⚙. This is a **designed** estimate from the research's "built and launched in about a year" framing; no orbital compute block has yet been built at this scale.

**Capex per MW, as the content pack will compute it:** mass × (build $/kg + launch $/kg × shell multiplier) for the platform, plus GPUs × 1.2 (20% spares, sourced) for clouds. Base-case anchors (derived): platform ~$25M/MW (2031) → ~$17M (2033) → ~$12M (2035); GPUs ~$33M/MW ⚙ on both ground and orbit.

**Life:** 5 years ⚙ (4-6 by future), then the block deorbits. GPU spares hold capacity until they run out; after that a block loses capacity at the future's failure rate. Storms, debris and launch failures cause step losses.

### 7.2 Shells (where the block flies, IV-D13)

| Shell | What it is | Earth delivery cost | Lunar supply (after 2035 only, §9.6) | Latency | Debris and congestion | Radiation |
|---|---|---|---|---|---|---|
| **Dawn-dusk SSO** (~600 km) | The busy band: near-constant sun; everyone's first choice | 1.0x launch price | Not competitive | Low (all workloads) | Highest congestion; debris at ~480 km decays in years [A] | Low |
| **High LEO** (~1,200-1,400 km; ASCEND's choice [C]) | Quieter, longer-lived orbits | ~1.3x ⚙ | Marginal | Low | Lower traffic; but debris there lasts decades to centuries (2007 test debris at 865 km still tracked [A]) | Medium (+10% shielding mass ⚙) |
| **High orbit** (GEO-class) | Far above the crowd, near-constant sun | ~2.5x ⚙ (LEO → GEO needs ≈ +3.9 km/s [A]; the 2.5x multiplier is designed from it, inference) | Advantaged in the model's post-2035 ceiling (inference) | ~240 ms round trip [physics]: **no interactive inference**; batch inference and fine-tuning fine | Lowest congestion | Harsh (+30% shielding mass ⚙) |

There is **no new company meter** for orbit (IV-D13 keeps doc 27's D9 rule). Congestion is a market index per shell (scripted per future, nudged by everyone's deployments, the player's included), which sets each block's quarterly debris-loss chance and the cost of avoidance manoeuvres (fuel, therefore life). A debris event (F3, or rare elsewhere) closes a shell to new launches for 4-8 quarters ⚙ and destroys a share of the blocks in it.

### 7.3 Licences and registries (IV-D17, uses political capital)
- **Filing:** a constellation licence per shell (1 Bandwidth, a fee) with an approval time of 1-4 quarters ⚙, longer in F2. Deployment milestones follow a simplified version of the FCC's 2026 Part 100 rules (a share of the filed capacity live by set dates [A]); missing one shrinks the licence ⚙.
- **Registry state** (whose flag your satellites fly): the Accords-bloc home state (permissive, the dominant launcher's home), a smaller space-law state (Luxembourg-like: slower, neutral, attractive to some sovereign tenants), or a sovereign partner (§12.2: cheap money, strings). The registry decides whose export rules apply and which tenants may buy (doc 31 §2.6: the registry state's law governs the satellite [C]; orbit is no export-control loophole, an inference from the export rules [A]).
- **Political capital** (Act III's meter, carried) fast-tracks filings, fights brightness and debris rule-making, and defends lunar claims (§9.1). The Government Affairs Director hired in Act III carries over.
- **The EU-analogue space act** applies from about 2031 [B/C] as a mid-act compliance cost for tenants serving that market ⚙.

### 7.4 Workloads and links (IV-D18)
Doc 31 §2.2 ranks the workloads that fit orbit (inference, from note 02): processing data born in orbit, then batch inference, then fine-tuning inside one satellite; frontier training spread across satellites is unproven. Bandwidth, not distance, is the binding limit. Tenant cards say which workload they bring:
- **Batch inference** (token generation that can wait: kilobytes in and out, errors fixed by retries) is orbit's best fit: any shell, including high orbit, with modest link units.
- **Interactive inference** (answering users live) needs low latency and downlink capacity: SSO and high LEO only, and only with enough **link units**. You buy link units from ground-station networks, or build an optical ground station at one of your own ground sites (capex, a little Heat ⚙); several sites spread the weather risk, since clouds block lasers. Your ground estate becomes part of your orbital business. An interactive tenant on a block with too few link units pays only for what reaches the ground.
- **Fine-tuning and small-model training inside one satellite** (shown on Starcloud-1 [A]): any shell. It is uplink-heavy: a 10 TB checkpoint takes about 53 minutes over one 25 Gbps link (inference), so it needs link units too.
- **Frontier training across satellites** is **not offered** in 2031-2033: it needs links of about 10 Tbps between satellites flying in tight formation [C, Google's design], demonstrated only on a bench at 1.6 Tbps [A]. In F1 alone, a scripted demonstration around 2034 ⚙ unlocks it for Gen 35 blocks; that unlock is **[D], designed** (open question 15).

### 7.5 Orbital tenants (reuse Act II's tenant cards and negotiation)
- **Sovereign compute** (a bloc government or defence customer): long contracts, a premium, prepayments, political strings (registry, export rules). The likeliest anchor in 2031-35 (doc 31 §2.8: defence anchors are likelier than civil ones [inference]).
- **Frontier lab, batch:** large batch-inference and fine-tuning contracts; price-sensitive, shorter terms, walk risk when the Demand Gap widens.
- **Inference platform:** interactive inference; mid-length contracts; needs link units.
- **Earth-observation processor:** small blocks that process data born in orbit; steady, modest rent ⚙.
- **Spot:** the market rent, quarter to quarter.
Rents are authored per future: an orbital shell rent per MW-year and orbital GPU-hour prices, both tied to the Ground Power Squeeze (scarce ground power lifts what tenants will pay for capacity now). Take-or-pay works both ways, as in Act II: sign early to lock the price, pay penalties if your block launches late.

## 8. Launch, manifests and insurance

### 8.1 Providers (fictional, IV-D14)
- **Pallas Heavy** (the dominant reusable super-heavy launcher, vertically integrated with its own orbital compute arm, **Pallas Compute**, the main rival): the most slots and the lowest price, but it **prices to the next-best alternative**, not to its cost (inference from Falcon 9's history: its list price rose from $54M to $74M [A]), and in a tight quarter it can **bump** third-party payloads for its own constellation ⚙. Its internal cost could be 5-20x below its price to you (inference, doc 31 §2.3), which is why Pallas Compute can undercut you in F1.
- **Northgate**: the second heavy launcher and lunar lander maker; fewer slots, frequent slips, cheaper per kg when it flies ⚙ (doc 31: New Glenn flew once in 2026 against a goal of 8-12 [A]).
- **Kestrel**: a medium launcher; reliable, dearer per kg, small blocks only.
- **A sovereign partner's launcher** (§12.2): available with that partner's strings.
Third-party slots per quarter grow with the future (tonnes per quarter, authored) and rivals compete for them.

### 8.2 Manifests
- **Booking** (1 Bandwidth): reserve tonnes on a provider for a target quarter, 2-6 quarters ahead ⚙; pay a 15% deposit ⚙, refundable only if the provider slips.
- **Slips:** each booking can slip by a quarter (rate by provider maturity ⚙); slips trigger take-or-pay lateness on the block's tenant.
- **Failures** (seeded, per launch): about 1% for a mature vehicle and 5-15% for one with fewer than ten flights ⚙ (doc 31 base rates [A/inference]). A failure destroys that launch's satellites (and, for a cloud, its GPUs).
- **Rebooking** after a bump or failure: next free slot, any provider, at that quarter's price.

### 8.3 Insurance (IV-D15)
- **Capacity per launch is capped** by the market: about $300M competitively in 2026 [A], growing to $500-800M by 2035 in good years ⚙. Above that, you self-insure (as Starlink largely does [A/C]).
- **Premiums:** launch plus first year 5-10% of insured value on young vehicles, 2-4% on mature ones; in-orbit renewal 1-3% a year ⚙. These rates are market lore, not verified (doc 31 §3); they are designed values.
- **Hard market:** after any industry loss over ~$400M (yours or a rival's; one such loss moved 2025's loss ratio by ~60 points [A]), rates rise 1.5-2x and capacity falls 30% for 4 quarters ⚙.
- **Lenders require it:** debt on a block requires insured value ≥ 50% of the drawn debt ⚙ (§11.4).
- **The rule that keeps survival about decisions, not luck:** the Plan screen shows the uninsured value riding on each launch against your equity, and warns above 15% ⚙, next to your cash buffer and covenant headroom after that loss. A company that keeps every launch's uninsured value under the line **and** keeps enough cash and covenant headroom to absorb it survives any single launch failure without a forced sale (B12).

## 9. The Moon: the lunar supply chain (IV-D5 to IV-D7)

The Moon is one of three theatres, not the spine. Its in-act value comes from **land, local sales on and around the Moon, and valuation**. Its two big prizes, cheaper orbital compute (tugs and lunar-made parts) and a production plant's output, arrive after 2035, and the epilogue shows them (§9.6, §15.2). Every step is a project card with milestones, money, time and risk: no mining minigame.

### 9.1 Claim a polar site
- **About 8 sites** with real lunar place names (geography, not companies): e.g. the Shackleton connecting ridge (best lit, ~92-96% of the year in models [C], on both blocs' lists [C]), the de Gerlache ridge (~85% [C]), Malapert, the Nobile and Haworth rims (on both lists [C]), Cabeus (the LCROSS crater, ice but poor light [A]) ⚙. Each site: **illumination** (sets solar power and dark spells), **ice access** (PSR proximity), **ridge area** (how much plant fits), **bloc interest** (how contested).
- **Claiming** (1 Bandwidth, a filing fee, political capital ⚙): files your intent under your registry. **A claim holds only once you land hardware** within 6 quarters ⚙, mirroring the Artemis Accords' safety zones, which attach to actual operations [A]. Rivals and the blocs claim sites on scripted schedules (authored per future); first to land holds.
- **Disputes:** an overlapping claim (yours, a rival's or a bloc's) raises a dispute card: spend political capital, align with a bloc (strings), share the site, or withdraw. There is no rule that settles overlaps in the real world [C], so the game resolves them by politics.

### 9.2 Prospect it
- **Commission a prospecting mission** (1 Bandwidth): a lander ride plus rover and drill, $100-250M ⚙ (NASA's CLPS orders run $47-200M [A]; cheaper later in the Starship era, inference), 3-5 quarters lead ⚙.
- **Landing:** success 55% in 2031 rising to 75% by 2035 ⚙ (all landers 2019-25: ~38% full success; commercial: 1 clean success in 7 [A]; designed improvement). The Lunar Programme Director adds 10 points ⚙. A failed landing loses the mission but keeps the claim's clock running.
- **Prospect report** (a modal, the lunar "Read the market"): the site's estimated grade and tonnage with an error band, and the **resource category** in mining terms: *inferred* (orbital data only, no landed data), *indicated* (one or two successful prospects), *measured* (a pilot plant has run on the site for at least two quarters ⚙: drilling alone never reaches measured, because no one has yet extracted lunar ice). These are the terms real mining companies report under (JORC and NI 43-101 codes, simplified); the market values each category differently (§11.3).
- A successful landing also secures the claim (§9.1).

### 9.3 Power on the Moon
- **Solar ridge array:** kWe sized by the site's illumination, with storage for dark spells of a few days at the best ridges [C]; capex scales with Earth-to-surface delivery cost ⚙. A 100 kWe array on one site by 2032-33 is at the ambitious end of what the research supports [C-D], so it is dear and slow ⚙.
- **Leased fission unit** (100 kWe class) from a bloc programme: **not before 2034 by default** ⚙. The US target is a reactor launched in FY2030 [B], which the research rates unlikely, so the game assumes the usual slip; the Reactor Delay wildcard pushes it past 2035. The bloc's strings come with it.
- **Scale:** MW-scale power on the Moon before 2035 is [D]. In the act a site can arrange a few hundred kWe at most ⚙; a megawatt can only be **contracted** for delivery after 2035 (it gates the production decision, §9.5).
- Lunar kWe is the act's third megawatt column (§5).

### 9.4 Pilot plant
- **Decision** (2 Bandwidth): needs an *indicated* resource and ≥100 kWe arranged. Capex $0.4-1.0B ⚙, 6-8 quarters ⚙ to first output.
- **Output (water processed on the surface):** about 1.2 t a year per kWe at the reference grade (Kornuta et al.'s study plant processes 2,450 t of water a year on 2 MWe [C]; derived), times a **pilot efficiency of 0.3** ⚙ (designed: a first-of-a-kind plant) and a grade factor (Rich 1.0, Patchy 0.5, Dry 0.15 ⚙). A 100 kWe pilot therefore processes about **36 t of water a year at Rich, ~18 at Patchy, ~5 at Dry** (derived), inside doc 31's credible pilot band of 1-100 t a year [C-D].
- **What reaches lunar orbit is about a fifth of that:** the same study turns 2,450 t of processed water into 450 t of delivered propellant (derived), because splitting, liquefying and transport consume most of it. So a Rich pilot delivers roughly 7 t a year to lunar orbit; most pilot output is sold or used on the surface.
- **Earliest output:** about 2033Q3 for a player who claims in 2031Q1, lands a prospect in 2031Q4 and decides at once ⚙ (a designed path inside the dossier's 2031-35 pilot window [C-D]).
- **Dust and night:** plant availability drops a few points a quarter unless you pay a maintenance crew or robotic servicing ⚙ (Apollo's dust problems were "consistently underestimated by ground tests" [A]); solar-powered plants stop in dark spells.

### 9.5 Production plant: the investment decision (the late-act bet)
- **Decision** (3 Bandwidth, like Act I's IPO): needs a *measured* resource (so a pilot that has run at least two quarters) and ≥1 MWe **contracted** for delivery after 2035 (§9.3). Capex $2-10B ⚙ (Kornuta's $4B study plus typical aerospace overrun [C/inference]), drawn over the build.
- **Time to first output: 20-32 quarters from the decision** ⚙ (doc 31: 5-8 years from investment decision to first tonnes, gated by a successful prospect, a successful pilot and megawatt power [inference]).
- **Honesty invariant:** no production plant produces anything inside the act, in any future or grade. The earliest decision is about 2034Q1 (a pilot from 2033Q3 that has run two quarters), so the earliest first tonnes are about 2039 ⚙.
- **What the decision does in the act:** it commits capital (counted in valuation at capex spent, §11.3), re-rates the site's resource as a development project (the stage factor, §11.3), and lets you sign larger offtake contracts that count as backlog. The epilogue says what it became (§15.2). If the build runs long, this decision is cut item 5 (§19).

### 9.6 What lunar output is for: inside the act and after it
**Inside the act:**
1. **Sales on and around the Moon:** water, oxygen and propellant to bloc bases and landers (offtake contracts, §11.2). Worth most here, because the alternative is delivering mass from Earth at about $1M/kg today [A, NASA planning figure] or plausibly $10-50k/kg in the Starship era (inference). Offtake prices are designed, $2-10k/kg on the surface and $1-3k/kg in lunar orbit, falling as more suppliers arrive ⚙ **[D]**: no priced lunar offtake exists yet (the only ones ever signed were NASA's 2020 regolith purchases, $25,001 in total [A]).
2. **Your own lunar operations:** life support and propellant for your next landings (a small cut to later lunar mission costs ⚙).

**After the act (the Moon screen's "after 2035" panel and the epilogue; no in-act cash):**
3. **Tugs:** lunar propellant fuelling reusable tugs that lift blocks from low orbit to high orbit, lowering the high-orbit delivery multiplier from ~2.5x toward ~1.5x. That multiplier is **designed [D]**: no costed tug architecture exists (doc 31 §2.4). The volumes don't fit inside the act: lifting one 5 MW block (~50-75 t) to high orbit needs over a hundred tonnes of propellant (derived), against a pilot's few tonnes a year delivered to lunar orbit.
4. **Passive mass for orbit:** lunar-made shielding, radiators and structure. Nothing structural or radiator-grade has yet been made from real lunar material [A, negative]; at scale by 2035 it is [D].

**The model's ceiling for 3 and 4 after 2035 (IV-D7; doc 31 §2.5 and its addendum, model §3-4):** about 0-4% off an SSO block's total cost at plausible volumes (7-10% in an aggressive case, 60% of the mass lunar at $150/kg); about 8-11% off a high-orbit block with lunar-fuelled tugs on the 2035 base inputs, and about 3% in the bull case, where Earth launch is already cheap (the 2033 base inputs give 12-17%, the highest figure the model produces). It never touches the GPU bill, and a high-orbit block still costs 4-10% more than an Earth-only SSO block: high orbit's case is safety from debris and congestion, not price.

### 9.7 Lunar risks
Failed landings; dust and night downtime; the Flag on the Pole wildcard; disputes; the Reactor Delay wildcard; Dry geology discovered after money is spent. The hedge is **staging**: claim cheaply, prospect before committing, pilot before producing, partner with a bloc or Cratermark (§12.1) to share cost.

## 10. The ground game in Act IV

The ground is the cash engine and the counterweight, and it never stops mattering (doc 31 §2.9: terrestrial campuses stay dominant through 2035 [C]):
- **Everything from Act III continues:** projects, renewals priced off Act IV's indices, Heat, Anger, moratoria, nuclear PPAs, political capital.
- **New ground power is slow:** a grid connection takes 16-24 quarters ⚙ (mostly beyond the act) in F1-F3, falling to 8-12 by 2033 in F4. On-site gas takes 6-10 quarters with extra Heat ⚙ (turbine backlogs clearing around 2030-31 [A/B, inference]).
- **Ground sites gain a space role:** optical ground stations (§7.4).
- **What happens to the ground as orbit grows:** orbit sets a ceiling on ground rents rather than replacing them (doc 31 §2.9, inference). In F1, rivals' orbital supply caps ground renewals in 2034-35; in F2 and F4, energized, permitted ground MW are the best asset in the game; in F3, ground capacity is the safe harbour after the cascade.
- **The bitcoin coda:** the sixth halving (around 2032 by the 210,000-block schedule; exact date not fixed [A for the rule]) halves any leftover miners' revenue; the Bitcoin Supercycle wildcard is the other way round.

## 11. Capital, valuation and covenants

### 11.1 Debt and equity instruments (IV-D23)

| Instrument | Terms ⚙ | Basis |
|---|---|---|
| **Export-credit satellite loan** (a sovereign partner's export credit agency backs the purchase of satellites built in that country) | ~5% fixed; interest added to the loan during the build ("paid in kind"); repayment from substantial completion; requires that partner's manufacturer (+10% build cost) and registry | Iridium NEXT's 2010 Coface facility, 4.96% fixed, repayment after the constellation was complete [A]; Telesat Lightspeed's C$2.54B government loans with interest paid in kind [A] |
| **Orbital project debt** (delayed-draw, like Act II's DDTL) | Only with a take-or-pay tenant and the insurance covenant; SOFR + 450-650 bp by tenant credit | CoreWeave's ladder, SOFR+225 to +450 bp by customer credit [A]; plus an unproven-hardware premium (designed) |
| **Sovereign co-funding** | A bloc partner pays 20-40% of a block's capex for a capacity share and strings (registry, export rules, priority in a crisis) | IRIS² (~60% EU budget) and OneWeb's government rescue as shape [A]; terms designed |
| **Space-equity window** (Act II's ATM equity, re-priced) | Raise at the space multiple of the day; the window can slam shut | 2021 space SPACs (Virgin Orbit recovered under 1% of its SPAC value [A]); SpaceX trading at ~96x trailing revenue after its June 2026 IPO [A] |
| **Lunar funding** | Equity, grants and agency task orders only; **no debt until production is demonstrated** | Lenders don't lend against non-binding lunar "offtake" [inference, doc 31 §2.8] |
| **Standby liquidity facility** | As Act III (§17.7 of doc 27); available again from 2033 if the first has lapsed ⚙ | Built |

### 11.2 Contracts and prepayments
- Orbital tenants as §7.5; prepayments from sovereign tenants (Act II's prepayment mechanics).
- **Lunar offtake:** bloc programmes and landers sign volume contracts for water and oxygen at designed prices (§9.6), with a share prepaid ⚙; agency task orders ($50-200M, CLPS-scale [A]) part-fund prospecting.
- **Presales** of orbital capacity on long take-or-pay terms are the main hedge against F1's late flood and F4.

### 11.3 Valuation (IV-D24; extends Act II's formula)
Σ(unit EBITDA × 4 × unit multiple) + cash + treasury − debt + projects under construction at capex spent + weighted backlog (as Acts II-III), with three unit types:
- **Ground units:** as Act III, with Act IV's multiple paths.
- **Orbital unit:** EBITDA × the **space multiple**, a market-mood index per future (anchors: CoreWeave ~25x EBITDA, Iridium ~16x, SES ~6x [A]; SpaceX ~375x EBITDA marks the story extreme [A]) ⚙. High in F1, compressing in F2 and F4, crashing after F3's event then recovering.
- **Lunar unit**, per site: **resource estimate (t) × value per tonne × category confidence × stage factor**, plus offtake backlog (weighted like Act II's backlog), plus a value per held site with landed presence ⚙. Lunar plants under construction count at capex spent through the formula's construction term, and a running pilot's sales flow into cash and EBITDA without a multiple (the resource term already values the deposit) ⚙. This is a simplified version of how markets value mining developers (a share of the deposit's net asset value that rises as the project is de-risked; designed).
  - *Resource estimate:* the player's current estimate from prospect reports, never the hidden truth (§6.8). Prospect noise is unbiased, so on average the estimate is honest; the truth arrives in the chapter report.
  - *Value per tonne:* a market index per future ⚙ **[D]** (no priced lunar offtake exists), highest in F3, where the Moon becomes strategic.
  - *Category confidence:* inferred 0.2, indicated 0.5, measured 0.8 ⚙.
  - *Stage factor:* claim only 0.2, pilot running 0.3, production decided 0.5 ⚙.
  So heavy prospecting at a Dry site lowers the estimate and the value honestly, and an un-prospected claim is valued low.

### 11.4 Rating and covenants
The credit rating (CCC- to BBB) and Act III's leverage covenant continue. New: the **insurance covenant** on orbital debt (insured value ≥ 50% of drawn debt ⚙); an uninsured loss that breaks it opens a 2-quarter cure, then Act III's forced-sale sequence.

### 11.5 Losing (IV-D26)
Act III's game-over rules (cash below zero after forced sales and the rescue rules). Fire-sale haircuts: orbital blocks ×0.3-0.5 ⚙ (the original Iridium sold for $25M after $4B+ of debt [A]); lunar assets ×0.2, or ×0.5 to a bloc buyer ⚙; ground as Act III. Orrery Compute's failure (§12.1) is the vulture-buyer opportunity, an echo of Act I's distressed auctions.

## 12. Rivals, sovereign programmes and the race (IV-D21, IV-D22)

### 12.1 Fictional rivals (working names)
| Rival | Real-world shape (provenance only, never in game text) | Role |
|---|---|---|
| **Pallas Heavy / Pallas Compute** | A vertically integrated launcher with an orbital-compute arm | The giant: your launcher and your main competitor; dominates F1, stalls in F2, hit hard in F3, overextended in F4 |
| **Northgate** | A second heavy launcher and lunar lander maker | Slower supplier; lunar lander partner; claims a ridge |
| **Orrery Compute** | A venture-backed orbital-compute startup | Raises at high valuations; in F2 and F4 it fails and its blocks go to auction |
| **Jade Arc Constellation** | A state-backed orbital-compute constellation tied to the Station partnership | Closed market; claims polar sites on the bloc's schedule |
| **Cratermark Resources** | A lunar-resource startup | Rival claimant, or a partner you can buy into |
The five Act III rivals (real names, cleared by the owner for Act III) **retire from the league** at the boundary; their Act III fates stay in the Act III chapter report. The Act IV league ranks you against the five above by valuation, with columns for orbital MW and lunar sites.

### 12.2 Sovereign blocs (fictionalised)
- **The Accords bloc** (shape: the US-led Artemis Accords, 76 signatories by Sep 2026 [A]): permissive licensing, the dominant launcher's home, defence demand for orbital compute, fission-reactor leases, safety zones.
- **The Station partnership** (shape: the China-Russia ILRS [B]): a closed launch market, its own constellation, a basic south-polar station targeted by 2035 [B], competing claims on the same ridges.
Some states sit in both (Serbia signed the Accords in 2026 and is an ILRS partner [A]); the game's smaller registry state plays that role. Act IV adds no new real treaty, agency or country names to game text; they appear only in the data files' provenance notes (IV-D28).

### 12.3 What winning and losing mean
- **Winning** is not a single finish line: the highest founder net worth at 2035Q4 and the titles (§15). The race shows up as **scarce things rivals can take first**: launch slots in a tight quarter, the quiet shells' licence capacity, and above all the handful of good polar ridges.
- **Losing** is going bust (§11.5), or finishing poorer than you entered while rivals took the slots and the ridges.

## 13. The stakes: failure modes and hedges

| Failure mode | How it hits | Hedges (decisions, not luck) |
|---|---|---|
| A launch fails | Satellites (and GPUs) lost; take-or-pay lateness | Insure to capacity; keep uninsured value per launch under 15% of equity ⚙; spread a block over several launches; mature vehicles |
| The dominant launcher bumps or grounds you | Slips, penalties | Book a second provider; keep schedule buffer in tenant contracts |
| Orbit is dearer than hoped (F2), or GPUs die faster than hoped | Thin or negative margins on orbital clouds | Start with orbital shells (tenant carries the GPUs); read your fleet telemetry; presell |
| A debris cascade closes your shell (F3) | Blocks lost, new launches barred, insurance hardens | Diversify across shells; insure before the trigger; high orbit |
| Cheap ground power (F4) | Rents fall; orbital blocks stranded | Long take-or-pay presales; keep ground MW; don't hold orbital clouds unhedged |
| F1's late flood | Rents fall 2034-35 | Build early, presell, slow down late |
| A space-equity crash | Can't raise; valuation falls | Raise while the window is open; keep the standby facility |
| Lunar geology is Dry | Spent capex impaired | Stage gates: prospect before the pilot, measure before production |
| A lunar standoff | Extraction frozen | Bloc alignment; political capital; a second site; partner with a bloc |
| A covenant breach | Forced sales | Act III's rules; the standby facility; the insurance covenant |
Design rule: every random loss in Act IV is insurable, diversifiable or staged, and the Plan screen shows the exposure (and the cash and covenant headroom left after it) before the player commits ⚙.

## 14. The core loop: each quarter's decisions

### 14.1 Plan actions (new in Act IV; Act II-III actions all remain)

| Action | Bandwidth | Money ⚙ | Notes |
|---|---|---|---|
| Open an orbital block card | 0 | - | Choose kind, size, shell, generation |
| Book launch tonnes (Launch slot) | 1 | 15% deposit | 2-6 quarters ahead |
| Sign an orbital tenant (Tenant slot) | 2 to negotiate, 0 to accept | - | Act II negotiation |
| Arrange capital (Capital slot) | 1 | Fees | ECA loan, project debt, co-funding, equity |
| Buy or renew insurance | 0 | Premium | Per launch and in orbit |
| File a constellation licence | 1 | Fee | Political capital to fast-track |
| Build an optical ground station at a ground site | 1 | Capex | Link units; a little Heat |
| Sell, deorbit early or sell capacity of a block | 1 | - | Fire-sale if distressed |
| Read the market (Signals) | 1 | - | As Act III |
| Claim a lunar site | 1 | Filing fee, political capital | Must land within 6 quarters |
| Commission a prospecting mission | 1 | $100-250M | 3-5 quarters lead |
| Arrange lunar power (solar array or reactor lease) | 1 | Capex or lease | |
| Decide on a pilot plant | 2 | $0.4-1.0B | Needs indicated + 100 kWe |
| Decide on a production plant | 3 | $2-10B, drawn over the build | Needs measured (a pilot run) + 1 MWe contracted; output after 2035 |
| Sign lunar offtake or a bloc partnership | 2 | - | Negotiation |
| Lobby (political capital) | as Act III | | |

### 14.2 Interrupts (live quarter, up to 3, each with a default)
Launch scrub or slip (wait, or rebook with another provider at a premium) · launch failure (the outcome, then rebuild now or pause) · conjunction alert (manoeuvre and lose life, or accept the risk) · solar storm warning (safe mode and lose a week's revenue, or ride it) · lunar landing attempt (commit, or abort and retry next window) · lunar dust or night fault (pay a repair, or accept downtime) · plus the ground interrupts of Acts II-III.

### 14.3 Bandwidth and hires (IV-D27)
Base 4 plus the bonuses that already exist (Chief of Staff, the MW thresholds, Head of Development), +1 when your first orbital block goes live, +1 with the Lunar Programme Director; maximum 9 ⚙. New hires:
- **Launch Procurement Lead**: −10% on launch prices and bump priority ⚙.
- **Space Operations Chief**: −25% orbital failures ⚙; narrower fleet-telemetry noise.
- **Lunar Programme Director**: +10 points landing success; pilot plants a quarter faster ⚙.
- **Chief Risk Officer**: −20% insurance premiums; access to 25% more capacity ⚙.

## 15. Scoring, the chapter report and the campaign finale (IV-D25)

### 15.1 The Act IV chapter report
Like Act III's: the future revealed (its name, trigger, decoy and tell), the reveal timeline of your moves, the reading score and title, the **lunar grade revealed** ("The ice was: patchy") with what your prospects told you along the way, founder net worth and the growth multiple on the Act IV entry, the valuation band (career title), the rivals' fates, and a **frontier title** for where your megawatts ended up (working names: *Earthbound*, *Orbital*, *Cislunar*, *Selenian* ⚙).

### 15.2 The campaign finale (new)
The last screen of the game:
- **The career ledger:** one row per act played: the year, net worth, energized megawatts, the act's title. A career started in the bedroom starts at $2,000 and 0.15 kW; one started in the garage at $10,000 and 5 kW; a preset start says so.
- **The career multiple:** 2035Q4 founder net worth ÷ the starting wealth (e.g. "$10,000 → $3.1B: 310,000x" ⚙ as format).
- **The megawatt line:** from the first act's kW to 2035's ground, orbital and lunar MW.
- **An epilogue** of 3-5 short lines chosen from authored pools by your end state and the revealed future (text only, deterministic, no extra simulation ⚙): e.g. "You started by mining bitcoin in a garage. You ended by mining the Moon." only if a pilot plant ran; "You never left the ground. The ground was enough." for a ground-only finish; a line for each future and for the lunar grade; and the post-2035 payoffs the act could not show (a production plant decided, what your ice could be worth to orbit, §9.6), told as possibilities, not results.
- **Where the finale's numbers come from:** records the game already keeps: `reports` (each act's last quarter: valuation and founder stake), `act2Entry` and `act3Entry` (energized MW and net worth at each entry), `act3End` (Act III's titles), and Act IV's new `act4Entry` and `act4End`. No Act I-III state, rule or golden changes. Where an earlier act's title or MW isn't stored, the finale recomputes it from stored values with that act's existing title function, or shows the row without it; the build confirms which at its first milestone ⚙.

## 16. The data Act IV needs (the content pack's job, after approval)

| File | Contents | Provenance |
|---|---|---|
| `market_iv_f1..f4.csv` (quarterly, 20 rows) | Launch $/kg by provider class; shell multipliers; satellite build $/kg; mass per MW by generation and availability; insurance capacity and rates; congestion per shell; debris and storm base rates; rents (ground shell, ground GPU-hour, orbital shell, orbital GPU-hour, sovereign premium); ground power price, capacity price, grid and gas waits; SOFR and HY; multiples (ground AI, mining, space mood); lunar transport $/kg (Earth → surface, surface → lunar orbit); landing success; lunar offtake prices and value per tonne; BTC and hashprice (with the 2032 halving); AI demand; **plus every column the carried Act II-III systems read** (renewal bands and the RFP index, ASIC tiers, GPU prices and rents, nuclear PPA prices, PJM capacity prices, retrofit costs). Never the true orbital failure rate or the lunar grade | The common 2031 baseline (§3.3) for all four files; seam from the Act III 2030Q4 values (derived); launch, mass and build cost from doc 31's model paths (sourced anchors + inference); Act III columns continued (derived); rents, multiples' moods, lunar prices **designed**, each column flagged |
| `market_weekly_iv_f*.csv` | Weekly BTC, hashprice and rent paths for the live quarter | Derived from the quarterly files |
| `signals_iv_f1..f4.json` | Six indicators, sharp ranges, decoy, trigger | Authored (designed), as Act III |
| `lunar_sites.json` | ~8 sites: illumination, ice access, ridge area, bloc interest | Illumination sourced where published [C]; the rest designed |
| `lunar_truth.json` (hidden, §6.8) | Grade draw weights, per-site variance, prospect noise | Designed, anchored to LCROSS 5.6 ± 2.9 wt% [A] |
| `orbit_truth_iv.json` (hidden, §6.8) | Each future's true orbital GPU failure rate and useful life | Designed around doc 31's ranges (5-10% hard failures a year, 5-7-year node life [inference]); F2's 4 years is deliberately below them |
| `lunar_chain.json` | Stages, capex, power, throughput, build times, landing success path; the post-2035 reference values for the "after 2035" panel (tug multiplier, lunar mass share and price) | Kornuta et al. 2019 for the production plant and throughput [C]; pilot efficiency, landing path and tug multiplier designed (the tug multiplier [D]) |
| `launch_providers.json`, `satellites_iv.json`, `shells_iv.json` | Providers, generations, shells | Fictional names; values from doc 31 (sourced/derived) and designed multipliers |
| `insurance_iv.json`, `licences_iv.json` | Capacity, rates, hard-market rule; filings, milestones, registries | Capacity and loss swings sourced [A]; rates designed; milestones from the FCC's 2026 rules, simplified [A] |
| `tenants_iv.json`, `capital_iv.json` | Orbital tenant cards; ECA, project-debt, co-funding and equity terms | Sourced shapes [A] with designed values |
| `hires_iv.json`, `events_iv.json` (~45 cards: 8 per future, ~8 shared, ~5 lunar), `wildcards_iv.json` (6) | People, cards, wildcards | Designed; each card's basis noted, as Act III's |
| `rivals_iv.json` | 5 fictional rivals × 4 futures × 20 quarters, fates | Designed, scaled to real players' figures in provenance only |
| `presets_iv.json` | 3 bot-made companies | Generated by the sim |
| `reading_score_iv.json` (hidden, §6.8) | Ideal stances, weights, oracle values | Designed; asserted by the sim |
| `text_iv.en.json`, `epilogue.json` | UI text, glossary (new terms), headlines, title bands, epilogue pools | Written |

Before the pack is written, close the gaps doc 31 §3 lists that the pack depends on: the full Kornuta paper, insurance rates, Elvis et al.'s site counts, Chang'e-7's and VIPER's dates, NASA's reactor award, high-orbit radiation and slot licensing, Starcloud-2's flight.

## 17. Screens (a list; wireframes come in a separate prompt)

- **A4-01 Act IV intro:** what you carry in, the three theatres, what's new.
- **A4-02 Plan dashboard:** the MW strip in three columns, Signals, the manifest at a glance, exposure warnings. (Extends Act III's.)
- **A4-03 Orbit board:** blocks by shell; capacity, age, health, insurance; fleet telemetry.
- **A4-04 Launch manifest:** bookings by quarter and provider; prices; slip and bump risk; insurance per launch.
- **A4-05 Deal builder, orbital block:** Launch / Tenant / Capital slots; shell and kind; projected return. (Extends Act II's.)
- **A4-06 Moon:** polar site map (claims by you, rivals and blocs), the programme pipeline (claim → prospect → power → pilot → production decision), the resource table (your estimates and their categories), and the "after 2035" panel (§9.6).
- **A4-07 Prospect report** (modal).
- **A4-08 Licences and registries** (extends the Government screen).
- **A4-09 Capital** (extends Act II's: insurance, ECA loans, co-funding, the space-equity window, lunar funding).
- **A4-10 Quarter report additions:** orbit and Moon panels.
- **A4-11 Chapter report with the reveal** (future and lunar grade).
- **A4-12 Campaign finale and epilogue.**
- **A4-13 Start at Act IV** (presets) and Scenario Mode.
Reused unchanged: Signals panel, Contracts and the renewal wall, Sites & Fleet (ground), League, Settings and glossary. Every new screen is designed for desktop at 1024 px and up, and Act IV's screens load as their own lazy chunk (CLAUDE.md UI rules).

## 18. Balance plan (what the sim-runner bots must prove)

**Archetypes** (each a bot, run on all three presets × four futures × three lunar grades, 30 seeds ⚙):
Ground Holder (no orbit, no Moon) · Orbit Sprinter (maximum orbit early, busy shell, little insurance) · Orbit Diversified (orbit across shells, insured, presold) · Lunar Bettor (claims and prospects early, pilots, modest orbit) · Balanced (ground + measured orbit + one prospect) · Over-reactor (chases the decoy) · Passive.

**Targets** (founder net worth multiple, 2035Q4 ÷ Act IV entry, medians ⚙):

| # | Target | Why |
|---|---|---|
| B1 | Judged per (future × lunar grade) cell, 12 cells: no archetype is best in every cell; Ground Holder, an orbit archetype and Lunar Bettor are each best, or within 10% of best, in at least one cell | "No single strategy wins every future" (doc 08's rule) |
| B2 | F1: Orbit Sprinter ≥ 1.3 × Ground Holder | Orbit pays when it works |
| B3 | F2: Ground Holder ≥ 1.2 × Orbit Sprinter | The wall bites |
| B4 | F3: Orbit Diversified ≥ 1.25 × Orbit Sprinter; Lunar Bettor ≥ Orbit Sprinter | Hedging and high orbit pay |
| B5 | F4: Ground Holder best; Orbit Sprinter's game-over rate ≤ 40% | Punished but survivable |
| B6 | Rich: Lunar Bettor ≥ 1.2 × Balanced; Dry: Lunar Bettor ≥ 0.7 × Balanced, game overs ≤ 25% | Staged lunar bets are a fair gamble |
| B7 | The Ground Fortress preset, played passively, never goes bust in any future | Doc 27's A7, carried |
| B8 | A perfect reader ≥ 1.15 × passive in at least 3 of 4 futures; the over-reactor ≤ 0.97 × passive in every future | Reading is a skill; the decoy costs |
| B9 | In every future, the reading score's ideal stance and the economics agree (the perfect reader is never below passive) | The Act III S3 lesson |
| B10 | Orbital cost ratios in the data match the model (§4b of its results): every future 1.5-1.65x in 2031; 2033 base 1.2-1.5x; F1 2035 0.85-1.0x; F2 2035 1.6-1.9x; F3 and F4 2035 1.1-1.25x (SSO) | The game stays honest |
| B11 | Pilot water processed by 2035Q4 at a first-opportunity schedule: Rich 15-60 t/yr, Patchy 5-30, Dry 0-8 (all inside the 1-100 t credible band); no production plant output in the act in any cell; no in-act cut to orbital costs from lunar supply | Lunar honesty invariant |
| B12 | No single launch failure forces a sale or breaks the covenant of a company that respects the 15% uninsured-exposure line and the Plan screen's cash and headroom warning | Decisions, not luck |
| B13 | Interaction proxy: ≤ 20 Plan phases, 3-6 decisions each; about 55-60 min | Pacing |
| B14 | Day one is the same in every future: every market value the UI can show is identical across the four futures in 2031Q1-Q2 and within ±3% through 2031Q4 (a test, as Act III's entry check) | The future can't be read from the first screen |

**Invariants:** Act I-III goldens and the `--act2 --act3` CSVs stay byte-identical (Act IV adds no rule to earlier acts); new goldens `act4-f1..f4`; the main bundle stays under 500 KB.

## 19. Build order, cut order and the known timeline

**Build order (IV-D31, like doc 27 D16):** (1) Act-aware refactor for act 4 (`act: 4`, `inActIV`, `inAct2Rules` and `covenantBreached` extended, save version 5, the timeline to 2035Q4, the carry-over list re-checked against `state.ts`); (2) walking skeleton (Act III → IV boundary, stub market, presets stubbed); (3) futures engine, Signals, the hidden files and their guards, the lunar-grade draw, the common baseline and seam glide; (4) orbit: blocks, shells, launch manifest, insurance, licences, links; (5) the lunar chain; (6) finance extensions, valuation units, rivals and blocs, wildcards; (7) scoring, chapter report, campaign finale, presets, bots and the balance pass.

**Cut order if Act IV runs long (IV-D32):** 1. Wildcards → 2. Optical ground stations and link units (fold into a flat orbital opex) → 3. Licence detail (a fee and a wait only) → 4. Sovereign co-funding variants → 5. The production decision (keep the pilot; the decision becomes an epilogue line) → 6. The decoy → 7. High LEO (keep SSO and high orbit). **Never cut:** the hidden future and Signals, orbital blocks with the launch manifest, the lunar claim → prospect → pilot chain, carry-over from Act III, the chapter report with the reveal, the campaign finale.

**Known-future timeline events** (in every future; fictionalised in game text): the EU-analogue space act applying (~2031 [B/C]); constellation milestone deadlines under 2026-era rules (a share of filed capacity due by ~2035 [A, rule]); the bitcoin halving (~2032 [A, schedule]); first new-build fission plants on the grid (~2032-33 [B]); the Station partnership's basic south-polar station (target 2035 [B]); the first crewed landings of this era (US about 2028 or later, China before 2030 [B/C]). No regular crewed cadence is assumed.

## 20. Deliberately out of scope

Electromagnetic mass drivers (no flight heritage; 2040s at best [D]); asteroid mining; helium-3 as fusion fuel (flavour text at most [D]); fusion power on the ground (flavour only); Mars; making chips in space; crewed operations by the player; weapons, anti-satellite action or combat; a map-based orbital-mechanics view or any assembly minigame; counting individual satellites; more than four futures; new real company, agency or country names in game text; lunar material reaching orbit inside the act (tugs and lunar-made parts are post-2035, shown only in the "after 2035" panel and the epilogue); production-plant output inside the act; Q-Day (quantum attacks on bitcoin) as a mechanic; new stakeholder meters beyond Heat, Ratepayer Anger and Political capital; achievements; music.

## 21. Decisions for the owner (IV-D1 to IV-D33)

| # | Decision | Recommendation |
|---|---|---|
| IV-D1 | Which concept | **A, "The Race to Orbit"** (doc 32) |
| IV-D2 | Span and length | 2031Q1-2035Q4, **20 decision quarters**, about 55-60 min ⚙ |
| IV-D3 | Act title | **"The Race to Orbit"** (your phrase; says what the act is). Alternative: keep "The Long Game" |
| IV-D4 | Structure | **Three theatres (Ground, Orbit, Moon) on one balance sheet and one Bandwidth pool** |
| IV-D5 | How central lunar mining is | **A major optional pillar, not the spine:** one of three theatres; a player can win without it, and with Rich geology a staged lunar bet beats a balanced company (B6) |
| IV-D6 | When the Moon unlocks | **Claims from 2031Q1; earliest landing ~2031Q4; earliest pilot output ~2033Q3; no production plant output inside the act** (honesty invariant: 5-8 years from decision, so first tonnes ~2039 at the earliest) |
| IV-D7 | How much the Moon can cut orbital compute's cost | **None inside the act.** Lunar output in 2031-35 is far too small to fuel tugs or build satellite parts (a pilot delivers a few tonnes a year to lunar orbit; one 5 MW block needs over 100 t of propellant to reach high orbit). The model's ceiling **after 2035**, shown on the Moon screen and in the epilogue: ~0-4% off an SSO block at plausible volumes (7-10% in an aggressive case); ~8-11% off a high-orbit block with lunar-fuelled tugs on 2035 base inputs (~3% in the bull case); never the GPU bill; high orbit stays 4-10% dearer than SSO. The Moon's in-act value is land, local sales and valuation |
| IV-D8 | The futures | **Four:** On Schedule 25%, The Wall 30%, Closed Shell 20%, Cheap Ground 25% ⚙; triggers 2032Q2-2033Q3; one decoy each |
| IV-D9 | The lunar grade | **A second, private hidden draw** (Rich 20 / Patchy 50 / Dry 30 ⚙), read through prospect reports, revealed at the end, **outside** the reading score |
| IV-D10 | Reuse of Act III's system | **Reuse and extend:** the scenario engine, Signals panel (six new indicators), Read the market, decoy, reading score (new hidden file; it measures orbital exposure, with equity raises −1 as in Act III and ground and lunar moves 0), leak and hidden-file guards, Scenario Mode. Nothing is replaced |
| IV-D11 | Wildcards | **2 of 6 drawn** (solar storm, Flag on the Pole, launch grounding, chip export clampdown, reactor delay, bitcoin supercycle) |
| IV-D12 | Orbital projects | **The Deal Desk with Launch / Tenant / Capital slots; orbital shell and orbital cloud kinds** |
| IV-D13 | Orbits | **Three shells** (dawn-dusk SSO, high LEO, high orbit) with a congestion index each; **no new company meter** |
| IV-D14 | Launch market | **Fictional providers; the dominant one is vertically integrated, prices to the next-best alternative and can bump you** |
| IV-D15 | Insurance | **Capped per launch by a small market; self-insure the rest; a hard market after big losses** |
| IV-D16 | Orbital reliability | **Part of each future, shown through your own fleet telemetry** |
| IV-D17 | Regulation | **Licences, registries and milestones, worked with political capital**; no new meter |
| IV-D18 | Workloads and links | **Batch inference fits orbit best (any shell); interactive inference needs SSO or high LEO plus link units; fine-tuning inside one satellite anywhere; training across satellites not offered (a late, designed F1 unlock at most)**; optical ground stations at your ground sites |
| IV-D19 | Carry-over | **As §3.1-3.2:** the named `GameState` fields carry (debt, PPAs, political capital, Heat, Anger, covenant breach, standby window, project cures and downtime, records); Act III-only state drops; `inAct2Rules` and `covenantBreached` extend to act 4 |
| IV-D20 | The market seam | **One 2031 baseline shared by all four futures (identical in 2031Q1-Q2, within ±3% through 2031Q4); a 4-quarter glide from your Act III scenario's 2030Q4 values to that baseline** |
| IV-D21 | Rivals | **Five fictional rivals; Act III's real-name rivals retire from the league at the boundary** |
| IV-D22 | The polar-site race | **About 8 real-named lunar sites; a claim holds only once you land within 6 quarters; disputes settled by political capital and bloc alignment** |
| IV-D23 | Finance | **ECA satellite loans, orbital project debt only with take-or-pay plus insurance, sovereign co-funding, a space-equity window, lunar equity and grants only (no lunar debt before production)** |
| IV-D24 | Valuation | **Orbit: EBITDA × a space multiple that moves with market mood. Moon: resource estimate × value per tonne × category confidence × stage factor, plus plants under construction at cost, offtake backlog and held sites. Ground: as Act III** |
| IV-D25 | Scoring and finale | **Net worth and growth multiple, reading title, career title, a frontier title; then the campaign finale with the career ledger, career multiple, megawatt line and a text epilogue** |
| IV-D26 | Losing | **Act III's game-over rules; fire-sale haircuts ×0.3-0.5 orbit, ×0.2 Moon (×0.5 to a bloc)** ⚙ |
| IV-D27 | Bandwidth and hires | **Base 4 + carries, +1 first orbital block live, +1 Lunar Programme Director, max 9; four new hires** ⚙ |
| IV-D28 | Names in game text | **No GPU product names after 2028 (generic generations). Act IV adds no new real company, agency or country names to game text; names already in the game (such as the ERCOT and PJM regions) stay. Real lunar geography allowed; real names only in provenance notes** |
| IV-D29 | Bitcoin coda | **The 2032 halving and hashprice continue; the Supercycle wildcard; no Q-Day mechanics** |
| IV-D30 | Presets | **Three bot-made 2030Q4 companies (Ground Fortress, Orbit-Ready Neocloud, Last Ridge), values set by the sim, not targeted** |
| IV-D31 | Build order | **As §19** |
| IV-D32 | Cut order | **As §19** |
| IV-D33 | Hidden files | **Three hidden files (reading score, lunar truth, orbital reliability truth), each read only by its own sim system and `act4End`; market and Signals files read in play as Act III's; views show estimates only (§6.8)** |

## 22. Open questions (not settled here)

1. **The evidence gap on the Moon.** The research says lunar material cannot feed orbital data centres before 2035, so in this design the Moon pays inside the act only through land, local sales and valuation, and its orbital payoff appears in the epilogue. A longer act doesn't fix this: even Concept B's 2038 end reaches first production tonnes only if the player decides on a plant before a pilot has proved the resource (on the dossier's full gate, first output lands around 2039-42), and lunar-made satellite parts are later still [D]. The only way to put lunar material into orbit inside the act is a labelled "what if" acceleration that the game presents as fiction. Which do you prefer: (a) as designed, (b) a labelled acceleration, or (c) Concept B's longer span with that caveat?
2. **Your launcher is your rival.** Is Pallas bumping your payloads fun pressure, or too punishing? It could be a difficulty setting.
3. **Lunar prices are [D]:** no priced lunar offtake exists, so offtake prices and the lunar value per tonne in the valuation (§11.3) are designed. Accept designed values for the content pack, or commission more research first?
4. **Two hidden variables.** Is the separate lunar grade too much to explain? The alternative is to tie the grade to the future (simpler, but makes the Moon a function of launch prices, which it isn't).
5. **Standalone Act IV.** Should "Start at Act IV" be open from the start, or only after an Act III finish (as Scenario Mode is)?
6. **The epilogue:** text only (recommended), or a projected 2045 figure? A number would be the game's least grounded output.
7. **High orbit realism:** GEO-class slot licensing (ITU coordination) and radiation numbers weren't researched in depth; the content pack needs them, or high orbit becomes a generic "far orbit".
8. **Insurance rates** are market lore, not verified; accept designed values?
9. **Orbit's parity hinges on GPU life in orbit,** for which there is no flight data. Revisit F1/F2's reliability values when Starcloud or Google publish in-orbit results.
10. **The marketing page** describes Act IV with doc 08's old outline; update it once this design is approved.
11. **Scenario Mode carry-over:** may a Scenario Mode Act III run continue into Act IV, and how is the finale labelled?
12. **Was this the right number of futures?** Four keeps the content cost at Act III's level; Silicon Shock and Grid Crisis (doc 08's S4/S5) are folded partly into F2 and F4 rather than kept as their own futures.
13. **The era theme:** a dark-paper "mission control" theme breaks the paper-ledger look of every other era. Keep the look consistent (a light `orbit` theme) or make the finale feel different?
14. **Research to close before the content pack:** Chang'e-7 and VIPER dates, Starcloud-2, the full Kornuta paper, Elvis et al.'s site counts, NASA's reactor award, insurance rates, high-orbit radiation (doc 31 §3).
15. **Training across satellites in F1.** The design offers it only late in F1, as a designed [D] unlock, to give F1's bold builders a prize. Keep it, or leave cross-satellite training out of Act IV entirely (the more grounded choice)?
16. **Rival names.** Orrery Compute and Jade Arc Constellation replace the first working names, which echoed real companies. Both still need the content pack's name-clash check; do you want a different naming style for the state-backed rival?

⚙ marks values expected to change after the sim and playtests.
