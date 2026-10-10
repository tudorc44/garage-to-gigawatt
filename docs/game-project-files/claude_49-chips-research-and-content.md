# 49: New chips: research and content (the accelerator venture and Gen 2037). Task of doc 48, 11 Oct 2026

*Research session plus content add-on. Read in doc 48's order: doc 43 §0.10 (with the rest of §0), doc 38 §5, the
format samples `act4-formats/ventures.json` and `gpus_act3.json`, doc 47's market files and doc 47 for tone. Grades
follow doc 36: [A] primary or official, [B] reputable reporting or company statement, [C] analyst or forecast, [D]
inference or designed. Every source was accessed on 11 Oct 2026. Real companies are reference points only; game text
uses fictional names and generic generations. The data files are in `claude/act5-content/chips/`; the generator is
`chips/generators/chips.py`.*

## Headline: the corrections most likely to change the feature

1. **The chip ships earlier than doc 43 assumes, so most successes land in Act IV (Q1).** A new team needs 18-30 months
   from design start to tape-out, about a quarter from tape-out to first silicon, and 9-18 months from first silicon to
   volume. AI-chip startups founded in 2016-17 shipped 3.5-5 years after founding. That places first silicon in 2033Q2
   (doc 43 says 2034) and the pitched volume in 2034Q3 (doc 43 says 2036). In the calibrated draw, the median success
   reaches volume in **2035Q2**, and only 30% of successes fall in Act V. **Recommended:** keep the 2031Q1 start and
   the sourced dates. The chip then enters the market at max(volume + 1, 2036Q1). The other option is to move the
   developer's start to 2032Q1 if the owner wants most launches inside Act V (open question 1).
2. **A respin costs 1-2 quarters, not 3-4, but it is the common case (Q1).** Only 14% of ASIC projects achieved
   first-silicon success in 2024 [A/B]. A usable first pass with workarounds is about 40-50% [D]. **Recommended:** respin
   chance 0.5 (a second one 0.2), each costing 1-2 quarters plus a cash call of 5% of the pitch.
3. **P(volume by 2038Q4) should be 0.30, not 0.35, and "acquired at a gain" is a real fourth outcome (Q2).** About 75%
   of today's ~146 AI-chip startups are expected to be gone by 2030 [C]. In a sample of 27 named companies, about 20-25%
   were bought at a gain before volume (Nervana, Habana and Groq's licence, at 10-17× money raised) and about 20% at a
   loss (Graphcore ~0.86×, Wave ~0.33×). **Recommended shares by 2038Q4:** built 0.30, acquired at a gain 0.15, acquired
   at a loss 0.25, cancelled 0.30.
4. **The demand trim is too big and in the wrong futures (Q7).** The IEA's High Efficiency case is 15-20% below Base by
   2035, but that is the whole fleet over a decade with service demand held fixed. Rebound evidence (2010-18; the
   DeepSeek episode) suggests near-zero net effect in growing markets. One chip with roughly 10% share and a 1.3×
   efficiency edge saves at most about 2%. **Recommended:** a trim of up to 2% in V3 only (the saturated-demand future),
   and 0 in V1, V2 and V4.
5. **Add a foundry-allocation risk, and make the reservation the hedge (Q4).** In 2025 the top four buyers took more than
   90% of advanced packaging and HBM [C], and small makers buy on purchase orders [A]. **Recommended:** a 35% chance at
   volume that the first four quarters ship at half the requested units. Reservation holders are served first.

---

## Part A: research

### Q1. How long does a new AI accelerator take, and how often does it slip?

**Sourced facts**

- **Google TPU v1** went from start to deployment in 15 months (a simple 28 nm design) [A, Jouppi et al., ISCA 2017].
- **OpenAI's first chip** (TSMC 3 nm) was in tape-out in Feb 2025, with mass production targeted for 2026; the team was
  about 40 people [B, DCD citing Reuters, 10 Feb 2025]. A tape-out costs "tens of millions of dollars" and takes "about
  six months" to become a production-ready chip [B, Silicon UK citing Reuters, 11 Feb 2025].
- **Microsoft Maia 200** slipped at least 6 months, from 2025 to 2026. Design changes made the chip unstable in
  simulation, and up to one-fifth of some teams left [B, DCD citing The Information, 30 Jun 2025]. It debuted in Jan
  2026 [B].
- **Meta MTIA:** custom work began in 2020; v1 launched May 2023, about 3 years later [B, The Next Platform, 2 Oct
  2025].
- **Google Ironwood:** about 7 months from announcement to general availability (Apr → Nov 2025) [B].
- **Tesla Dojo:** D1 was unveiled in 2021 and in production around mid-2023; the team was disbanded in Aug 2025 [B,
  TechCrunch].
- **Intel Falcon Shores** was cut to an internal test chip in Jan 2025 [B, TechCrunch].
- **Etched:** its chip was made on 4 nm in early 2026 and was still being validated in Jul 2026, with no paying
  shipments [B/C].
- **Esperanto:** founded 2014, chip in bring-up in 2021, wound down in Jul 2025 [B].
- **Tenstorrent Grayskull** shipped on its first tape-out with no respin [C, SemiAnalysis, 2021].
- **First-silicon success:**
  - 14% of ASIC/SoC projects achieved it in 2024, the lowest in more than 20 years of the study [A/B, Siemens
    EDA/Wilson Research, 3 Sep 2025].
  - 2022 study: 13% success for large designs, 76% needed respins, 66% were behind schedule [B, SemiEngineering].
- **Mask sets:** over $10M at 7 nm and approaching $40M at 3 nm; a respin takes "a few months"; a startup's 7 nm chip
  cost $50-75M all-in [C, SemiAnalysis, 2022].
- **Not found:** a sourced tape-out-to-silicon cycle at N3; a distribution of respin counts.

**Inference [D]**

| Phase | Typical duration | Basis |
|---|---|---|
| Design to tape-out | 18-30 months (new team); about 12 months is the floor | Sources above |
| Tape-out to first silicon | About 1 quarter | Backed out of Reuters' ~6 months to production-ready, minus bring-up |
| First silicon to volume | 9-18 months for startups; 6-12 months for hyperscalers | Sources above |
| Founding to first volume | 3.5-5 years | Cerebras, Groq, Graphcore, Tenstorrent, SambaNova, from Q2's table |

**Correction table: Q1**

| Doc 43 §0.10 value | What the sources say | Grade | Recommended game value |
|---|---|---|---|
| Design sent 2033 | 18-30 months from start for a new team | A/B | **Pitched 2033Q1** (8 quarters from 2031Q1) |
| First silicon 2034 | About 1 quarter after tape-out | B | **Pitched 2033Q2** |
| Qualification (no date) | Bring-up and customer qualification take 2-4 quarters | B/D | **Pitched 2034Q1** |
| Volume 2036 | 9-18 months after first silicon; 3.5-5 years after founding | A/B | **Pitched 2034Q3**. Realised: a slip draw, median ×1.30 (σ 0.30, floor 0.9, cap 2.5) on every phase, giving a median volume of 2035Q2 (p10 2034Q2, p90 2037Q1) |
| Respin +3-4 q and a cash call | 86% lack clean first silicon; a respin takes "a few months" and a $20-40M mask set at 3 nm | A/B/C | **Respin chance 0.5, a second one 0.2; 1-2 quarters each; a call of 5% of the pitch; counts as a slip in the mark** |

### Q2. What share of AI-chip startups reach volume, and what happens to the rest?

**Sourced facts**

- **JPR's count:** 146 standalone AI-processor startups at end-2025 with $28B invested. 21 have failed or been acquired;
  about 7 acquisitions a year since 2022; 17 public listings since 2020 [C, Electronic Design/JPR, 28 Jan 2026]. JPR
  expects about 25 independents to remain by 2030 [C, heise, 2026].
- **Acquired at a gain before volume:**
  - Nervana: about $25M raised, sold to Intel for $408M (2016) [B].
  - Habana: about $120M raised, sold to Intel for $2B (2019) [B].
  - Groq: at least $1.75B raised; Nvidia licence-and-hire reported at $20B (Dec 2025) [B]. The remaining company was
    later valued at $3.5B, half its 2025 mark [B].
  - Kinara: bought by NXP for $307M (2025) [A].
- **Acquired at a loss or distressed:**
  - Graphcore: about $700M raised; SoftBank paid about $600M (2024); 2022 revenue was $2.7M [B].
  - Wave Computing: $203M raised; went bankrupt, and its assets were sold for $67M (2020) [B].
  - Untether: team hired by AMD (2025), products discontinued [B].
  - Rain AI: patents sold (2026) [B].
  - Esperanto: wound down (2025) [B].
- **Reached volume:**
  - Cerebras: 2025 revenue $510M, 86% from two related Abu Dhabi customers; IPO in May 2026 [A/B].
  - Cambricon (China): 2025 revenue ¥6.5B [B].
  - Groq: about $500M of 2025 revenue reported [B].
- **Still independent and unresolved:** SambaNova ($11B mark, Jul 2026), Tenstorrent, d-Matrix, Etched (pre-volume at
  $10.3B), MatX and others [B].

**Inference [D]:** in the best-funded sample, 10-20% reached volume (the true rate across all 146 is likely under 10%),
20-25% were acquired at a gain, about 20% at a loss, 10-15% failed outright, and 35-40% are unresolved. A credible,
well-funded team over 8 years (2031 → 2038Q4) sits at the top of that range.

**Correction table: Q2**

| Doc 43 §0.10 value | What the sources say | Grade | Recommended game value |
|---|---|---|---|
| P(volume by 2038Q4) ≈ 0.35 | 10-20% of funded startups reach volume; about 75% gone by 2030 | C/D | **0.30** (calibrated draw: 0.293 over 20,000 games) |
| Cancelled share (none) | Failure or wind-down 10-15% so far, consolidation ahead | C/D | **0.30** (hazard 10.5% a year before volume) |
| Acquired at a loss (none) | About 20% (0.3-0.9× money raised) | B/D | **0.25** (hazard 9% a year); stake paid at paid-in × U(0.3, 0.9) |
| Built (none) | See P(volume) | | **0.30** |
| (Not in doc 43) acquired at a gain | 20-25% of the sample; 10-17× money raised, before volume | B/D | **0.15** (hazard 5.5% a year); stake paid at its mark × U(1.5, 3.0); a card (chips_c4) |

### Q3. Performance per watt between generations

**Sourced facts**

- **Datasheet ratios at the same precision (FP16 TF/W):** V100→A100 1.9×; A100→H100 1.8×; H100→B200 1.6× [A, NVIDIA
  datasheets]. Including precision drops (FP8, then FP4), the ratios are 3-4× per generation; about half of the headline
  gain since 2022 is format change [D].
- **MLPerf, Blackwell vs Hopper per GPU:** training 2.2-2.6× [B, NVIDIA on MLPerf v5.0, 4 Jun 2025]; inference 2.8-3.4×
  [B, 2 Apr 2025]. Power-normalised, that is about 1.3-1.8× perf/W for training and about 2× for inference [D].
- **Epoch AI:** ML-GPU FLOP/s per watt doubles every 3.0 years (2.7-3.3) [A/B, 9 Nov 2023]. Peak FLOP/s per watt grows
  about 1.28× a year; 4× hardware efficiency is expected by 2030 [C, 20 Aug 2024].
- **Koomey's law:** efficiency doubled every 1.57 years before 2000 and every 2.6 years after [B].
- **imec (2025)** says scaling is slowing [B]. No quantified post-2030 figure, and no authoritative statement that gains
  slow in the mid-2030s, was found. Doc 40 §D2's slowing stays an inference.
- **Specialised accelerators, measured or peer-reviewed:**
  - Google TPU v4 vs A100: 1.3-1.9× less power at similar size (against the previous-generation GPU) [A, ISCA 2023].
  - Ironwood vs Trillium: about 2× [B].
  - Trainium3 vs Trainium2: +40% perf/W [B].
  - Independent tokens per MW: B200 beats MI355X by 1.9-4.1× [B, SemiAnalysis InferenceX], so a challenger can trail
    the leader.
- **Startup claims:** Groq up to 10×, Etched 20× [B, claims]. Neither has MLPerf submissions or independent energy
  measurements.

**Inference [D]:** a mainstream step today is 1.6-1.9× per about 2 years on datasheets and 1.3-2× measured. After 2030,
plan on 1.3-1.5× per 2 years. A specialised accelerator's measured edge over the contemporary mainstream GPU is 1.0-1.9×,
often below 1× against the next mainstream generation.

**Correction table: Q3**

| Doc 43 §0.10 value | What the sources say | Grade | Recommended game value |
|---|---|---|---|
| Gen 2037 "better performance per watt" ⚙ | 1.3-2× per step measured today; slowing after 2030 [D] | A/B/D | **1.4× perf/W over the game's 2036 newest class.** GPUs per MW 1,050 → 1,150 (+10%). Revenue per MW at launch 1.25× (part of the gain goes to buyers). Rent $26.70/GPU-hr hyperscaler (neocloud, spot and 1-year at doc 47's ratios) |
| Accelerator better than mainstream ⚙ | Measured 1.0-1.9×; claims of 10-20× unmeasured | A/B | **1.3× perf/W over Gen 2037**; rent and list price 1.2× Gen 2037's |

### Q4. Factory capacity and access

**Sourced facts**

- **TSMC takes prepayments to hold capacity:** "payments made by customers… to retain the Company's capacity",
  NT$276bn at end-2022, up from NT$186bn at end-2021 [A, TSMC 2022 Annual Report]. US$3.8B at 30 Sep 2021 [B, Tom's
  Hardware].
- **Advanced packaging and HBM, not logic, limited AI-chip output in 2025** [C, Epoch AI, 12 Mar 2026]:
  - CoWoS capacity rose from about 13-16k wafers a month (end-2023) to about 65-75k (end-2025).
  - Nvidia took 60% of CoWoS and 69% of HBM; the top four designers took more than 90% of both.
- **Nvidia's share of AI-processor wafers** went from 51% (2024) to 77% (2025) [C, Morgan Stanley via Tom's Hardware].
- **CoWoS projected at 120-130k wafers a month by end-2026,** with lead times of 52-78 weeks; Nvidia, Broadcom and AMD
  hold more than 85% [C, Silicon Analysts, Jun 2026, internally inconsistent dates].
- **SK hynix's 2026 HBM** is reported sold out [B/C].
- **Cerebras procures "on a purchase order basis"**, including from sole sources [A, S-1].
- **Not found:** TSMC's minimum volumes or prepayment terms for startups; a startup publicly blaming a delay on packaging.

**Inference [D]:** in tight years, the chance of an allocation shortfall is 30-50% a year for a startup, with a cap at
25-60% of requested units or a 1-3 quarter slip. Prepaying about 10-15% of wafer spend and booking 12-18 months ahead
mitigates it.

**Correction table: Q4**

| Doc 43 §0.10 value | What the sources say | Grade | Recommended game value |
|---|---|---|---|
| (No foundry risk) | Top four buyers took >90% of packaging and HBM; startups buy on purchase orders; lead times of a year or more | A/C | **Add it:** 35% chance at volume that the first 4 quarters ship at 50% of units; reservation holders are delivered first. Slips stay in the general draw (no separate foundry slip, to avoid double counting) |

### Q5. Money: development cost, funding rounds, customer prepayments

**Sourced facts**

- **Design cost per chip** (IBS): 5 nm $449M, 3 nm $581M, 2 nm $725M [C]. SemiEngineering calls these inflated; its own
  5 nm estimate is about $280M [C].
- **Raised before material revenue:** Graphcore about $700M (never reached volume), SambaNova more than $1B, Tenstorrent
  about $1B, Etched $800M, Groq at least $1.75B, MatX $625M [B].
- **Rounds and valuations:**

| Stage | Company | Round | Post-money valuation | Date |
|---|---|---|---|---|
| Before first silicon | d-Matrix | $275M Series C | $2B | Nov 2025 |
| Before first silicon | Etched | $500M | $5B | Dec 2025 |
| After first silicon, before shipping | Etched | $300M | $10.3B | Jul 2026 |
| Series D | Groq | $640M | $2.8B | Aug 2024 |
| Series D | Tenstorrent | $693M | $2.6B | Dec 2024 |
| Late | Groq | $750M | $6.9B | 2025 |
| Late | Cerebras | $1B | $23B | Feb 2026 |
| Down round | Groq | $350M | $3.5B | Aug 2026 |

  All [B].
- **Reservations and prepayments:**
  - G42 agreed to prepay $1.43B to Cerebras, against Cerebras's 2023 revenue of $78.7M [A via S-1 reporting].
  - OpenAI-Cerebras: over $10B for 750 MW (Jan 2026), with a $1B loan repayable in capacity and a warrant for about
    10% of Cerebras [B].
  - AMD-OpenAI: 6 GW of GPUs with a warrant for up to 160M AMD shares (6 Oct 2025) [A].
  - Nvidia prepays its own suppliers $3-5B [A, 10-Q].
  - **No published discount percentage for committed buyers was found.** Buyers are compensated through
    deposits or loans of about 5-10% of contract value, or warrants of about 10% of equity [D].

**Correction table: Q5**

| Doc 43 §0.10 value | What the sources say | Grade | Recommended game value |
|---|---|---|---|
| Budget ⚙ | $0.5-1.5B to volume; design cost $0.3-0.7B | B/C | **Pitch $800M**; realised × a "semiconductor" overrun class (median 1.25, σ 0.35, cap 3.0) [D] |
| Stake prices | Rounds price well above paid-in capital ($2-10B before volume) | B | **Stake × pitched budget, as ventures.json** (10% = $80M). Doc 38's mechanic is kept; real rounds would charge 2-5× (open question 4) |
| Deposit 10% of the reserved GPUs' price | Deposits or loans 5-10% of contract value | B/D | **10%**, with a second step at 20% |
| Discount 10-15% | No published discounts; warrants of about 10% equity as the equivalent | A/B/D | **10% for a 10% deposit; 15% for a 20% deposit** (mirrors the energy prepay menu) |

### Q6. Chip-company economics after volume

**Sourced facts**

- **Mature gross margins:**

| Company | Period | Gross margin | Grade |
|---|---|---|---|
| Nvidia | FY2026 | 71.1% GAAP | [A] |
| AMD | 2025 | 50% GAAP / 52% non-GAAP | [A] |
| Marvell | FY2026 | 51% GAAP / 59.5% non-GAAP | [A] |
| Broadcom | 2023-25 | 74-77% | [C] |
| Qualcomm | 2023-25 | 55-56% | [C] |

- **Newcomer:**
  - Cerebras gross margin 11.7% (2022) → 33.5% (2023) → 41.1% (H1 2024), with net losses of $178M, $127M and $67M
    [A, S-1]. Q2 2026 GAAP gross margin 14% [A, 8-K].
  - Groq's 2025 cloud business ran at a negative margin [C].
- **Multiples:** Damodaran (Jan 2026) semiconductors EV/EBITDA 34.75× for positive-EBITDA firms [A/C]. Cerebras listed at
  about 78-110× revenue, and above 130× after its first day [B]. A normal-cycle 15-25× was not sourced.

**Correction table: Q6**

| Doc 43 §0.10 value | What the sources say | Grade | Recommended game value |
|---|---|---|---|
| Margin per unit ⚙ | Newcomer gross margin 10-35% in year 1, about 40% by generation 2-3, with large opex; challengers 50-60% | A/B | **EBITDA as a share of the unit price: 5% in year 1, 15% in year 2, 25% from year 3** [D]. The mature level is a market column (`accel_margin_usd_unit_mature`) |
| Chip-company multiple ⚙ | ~35× sector median in the 2025-26 boom; hot IPOs 50-130× revenue | A/C | **20× EBITDA** (V1, V2 22× by 2040; V3 15× from its trigger) [D]. Post-volume value = stake × max(mark at volume, EBITDA × 4 × multiple) for 4 quarters, then on EBITDA alone |
| Units shipped | Cerebras $510M of 2025 revenue | A | **8,000 units a quarter at full ramp** (about $1.0B a year at $31K), ramping 25/50/75/100% over 4 quarters; ×1.1 (V1), ×0.6 (V3 after its trigger), ×0.85 (V4 late) [D] |

### Q7. Does better efficiency reduce how much power the world needs?

**Sourced facts**

- **IEA Energy and AI (Apr 2025):** 415 TWh (2024); Base about 945 TWh (2030) and about 1,200 TWh (2035) [A].
  - Lift-Off: above 1,700 TWh.
  - Headwinds: about 700 TWh.
  - High Efficiency: about 970 TWh in 2035, "20% lower than Base" (the detailed chapter says more than 15%). It meets
    the same service demand with less power, so it models no rebound [A].
- **Masanet et al. (Science, 2020):** data-centre energy rose only about 6% (2010-18) while compute instances rose about
  550%; energy per instance fell about 20% a year. The authors warn growth turns sharp once that efficiency is used up [A].
- **LBNL (Jan 2025):** US data centres used 176 TWh in 2023; the 2028 range is 325-580 TWh [A].
- **DeepSeek (Jan 2025):** Nvidia lost $589B of market value in a day; within days the big four reaffirmed or raised
  2025 capex ("Jevons paradox strikes again") [B].

**Inference [D]:** fleet-wide efficiency can cut MW 15-20% over a decade only if service demand is held fixed. With
rebound in a growing market, the net effect within 2-3 years is 0-10%, and possibly an increase. One chip with about 10%
share and a 1.3× edge saves at most 10% × (1 − 1/1.3) ≈ 2.3% of compute energy, before rebound.

**Correction table: Q7**

| Doc 43 §0.10 value | What the sources say | Grade | Recommended game value |
|---|---|---|---|
| Up to 5% trim in V3 and V4 | Fleet-wide −15-20% over a decade without rebound; rebound near-total in growing markets; one chip ≤ ~2% | A/B/D | **V3 only: up to 2%** of `ai_demand_index_v`, phased in over 4 quarters from volume. **V1, V2, V4: 0** (V4 is still growing). Gen 2037 has no separate trim, because doc 47's demand paths already embed efficiency |

---

## Part B: the content files (`claude/act5-content/chips/`)

All complete; written by `generators/chips.py` from doc 47's `market_v_v1.csv` (the Rubin Ultra base values).

| File | Note |
|---|---|
| `venture_accelerator.json` | The accelerator type in `ventures.json`'s shape. It covers: Halyard Silicon from 2031Q1; pitch $800M and volume 2034Q3; diligence; the semiconductor overrun class; the four milestones with pitched quarters; the slip draw; respins; hazards for cancel, gain and loss; the acquisition rules; cash calls in thirds at tape-out, first silicon and volume; no debt before volume; the allocation reservation (10%/10%, 20%/15%; 5/10/25 MW; priority; deposit rules); the foundry allocation cap; post-volume ramp, EBITDA shares and the value rule; marks; the V3-only demand trim (hidden); the targets; a `calibration_check` from 20,000 simulated games; and a `provenance` field grading every value |
| `gpus_v.json` | **Gen 2037** (every game): from 2037Q1, top tier, 600 kW racks, 1,150 GPUs/MW, unit $26,124 and rack $18.0M in 2037Q1, perf/W 1.4×. **Halyard Bowline** (success only): from max(volume + 1, 2036Q1), same rack class, unit and rent 1.2× Gen 2037, perf/W 1.3× Gen 2037 |
| `market_v_chips_v1..v4.csv` | 20 rows; columns: <br>• Gen 2037: four rents, unit price, rack price (blank before 2037Q1) <br>• Bowline: four rents, unit price, rack price <br>• `accel_units_full_ramp_q`, `accel_margin_usd_unit_mature` <br>• `chip_ev_ebitda_mult` <br>Identical across futures through 2036Q4 (checked). Only units and the multiple diverge by future. Rents stay scarcity-neutral, per doc 47's rule (the engine applies `scarcity_index`). Bowline rows are filled for every quarter because the volume quarter is drawn in play: the engine masks them before max(volume + 1, 2036Q1) |
| `events_chips.json` | 4 cards: <br>• design sent, with an option to open a reservation <br>• first silicon, with a working variant and a respin variant (pay, dilute or walk) <br>• volume, rationed volume or shutdown <br>• "A Buyer for Halyard": sell the stake at the mark × 1.5-3.0, or block the sale with a stake of 30% or more <br>Every reading sign is 0 (§0.10) |
| `text_chips.en.json` | 30 strings: <br>• venture dialog: pitch, how chips are made, three risks, both roles, the reservation in plain words ("booking a table before the restaurant opens"), value and diligence <br>• 10 quarter-report lines <br>• glossary (tape-out, first silicon, respin, foundry allocation, performance per watt) <br>• two epilogue lines <br>No em dashes; no number after 2040 |

**Calibration of the draw** (`calibration_check`, 20,000 games):

| Measure | Result |
|---|---|
| Outcomes by 2038Q4 | Built 0.293 · acquired at a gain 0.157 · acquired at a loss 0.254 · cancelled 0.291 · still building 0.004 |
| Volume quarter | p10 2034Q2, median 2035Q2, p90 2037Q1 |
| P(volume by 2035Q4) | 0.205 |
| Share of successes inside Act V | 0.30 |
| Respins | In 51% of games |

**Balance plausibility (E-B2):**
- Best case for a 49% stake: about 5-6× its buy-in and calls, at 8,000 units, 25% EBITDA and 20×. That clears "best
  case ≥ 3×".
- Expected value: about 2.3× the buy-in (0.29 × ~5.5 + 0.16 × ~3.5 + 0.25 × ~0.6).
- Whether that stays within 1.5× of the control venture's contribution is for the bots. If it is too rich, the smallest
  fix is the multiple at 15× or full-ramp units at 6,000.

## Assumptions (mine, reversible)

1. Start 2031Q1 kept with the sourced dates. A chip that reaches volume in Act IV enters the market at Act V's start
   (2036Q1), and its stake is valued on EBITDA from volume (Act IV quarters use the 2036Q1 market values).
2. One slip draw per game scales every phase, as the M36.10 ventures do.
3. Respins count as slips in the mark (×0.8 each).
4. Hazards act only before volume; after volume the developer is a going concern.
5. A gain-acquisition can be blocked with a stake of 30% or more. A loss-acquisition can't be blocked.
6. Reservations: 5, 10 or 25 MW; delivered in the first two quarters of volume; to be taken within 4 quarters; refunded at
   par if the developer is acquired.
7. The foundry cap falls on non-reserved buyers first, and does not add a slip.
8. Gen 2037 arrives in 2037Q1 in every future, top tier, with no retrofit from the 2036 newest class.
9. Gen 2037 and Bowline rents are flat after launch (doc 47's scarcity-neutral rule). Unit prices follow Rubin Ultra's
   rack trend (−1.0% a quarter).
10. Spot and 1-year rents use the H100 ratios, because Rubin Ultra has no such columns.
11. Gen 2037 revenue per MW is 1.25× the 2036 newest class at launch: perf/W 1.4×, with part passed to buyers.
12. Bowline's market rows are filled for all quarters and masked by the engine, because "blank until volume + 1" can't be
    written statically.
13. The units and margin ramps sit in the venture file; the market file carries the full-ramp and mature levels by
    calendar quarter.
14. The demand trim lives in the venture file as a hidden rule, not in the market file, which would leak V3 from 2037.
15. Stake buy-in is stake × pitched budget, unchanged from doc 38.
16. Deposits are credited against the purchase price at delivery.

## Name-clash check (searched 11 Oct 2026)

| Name | Role | Searched | Verdict |
|---|---|---|---|
| **Halyard Silicon** | The developer | "Halyard Silicon" OR "Halyard Semiconductor" chip AI; "Halyard" AI chip startup accelerator | **Accepted.** No chip, semiconductor or AI company of that name. The nearest hits were unrelated (Hailo, a real edge-AI chip company, differs in spelling and sound). Halyard Health, a medical firm, is outside the excluded industries |
| **Halyard Bowline** (the chip) | Accelerator product name | "Bowline" AI chip OR accelerator OR semiconductor | **Accepted.** Only Graphcore's "Bow" IPU came up, a different name. "H1" and "A1" were rejected unsearched: both are Apple chip names |
| **Gen 2037** | Mainstream generation | "Gen 2037" GPU OR chip OR accelerator | **Accepted.** No product uses it; it is generic, in the style of Act IV's Gen 31/33/35 |

## Open questions

1. **Timing.** Sourced timelines put most launches in 2034-35 (Act IV). Keep the 2031Q1 start and enter the chip at
   2036Q1 (pack's choice)? Or move the start to 2032Q1 so the median volume lands around 2036Q2 inside Act V? Or add
   Bowline columns to Act IV's market files (Act IV goldens would change more)?
2. **The demand trim** is cut to 2% and V3 only. Confirm, or drop it entirely: the honest reading of the rebound
   evidence is that one chip moves world demand by nothing measurable.
3. **Gen 2037's rents stay flat after launch** (scarcity-neutral). Real rents per GPU-hour fall as a generation ages. If
   the build wants ageing, apply the renewal GPU index at contract end (`gpus_v.json`) rather than editing the rents.
4. **Stake price.** Doc 38's "stake × budget" is far cheaper than real chip rounds, which value a credible team at 2-5×
   paid-in capital before silicon. A ×1.5 entry premium would bring it closer to reality and cut the expected return.
   Decide after the E-B2 run.
5. **Blocking a sale at 30%** is designed. Real minority holders rarely block a strategic sale unless they hold
   protective provisions.
6. **Groq-style licence deals** (the buyer takes the team; the shell carries on) are folded into "acquired at a gain". A
   fifth outcome is possible but adds complexity.
7. **Bowline in V4:** orbit buyers might prefer the mainstream generation (radiation qualification). The pack only
   scales units ×0.85 late.
8. **Mask set and design-cost figures** (IBS) are contested by SemiEngineering. The budget uses the broader "raised
   before volume" range instead.

## Sources

| Title | Publisher | URL | Published | Accessed | Grade |
|---|---|---|---|---|---|
| In-Datacenter Performance Analysis of a Tensor Processing Unit | Jouppi et al., ISCA / arXiv | https://arxiv.org/pdf/1704.04760 | Apr 2017 | 2026-10-11 | A |
| OpenAI finalizing custom AI chip design ahead of 2026 launch | DatacenterDynamics (Reuters) | https://www.datacenterdynamics.com/en/news/openai-finalizing-custom-ai-chip-design-ahead-of-2026-launch-report | 10 Feb 2025 | 2026-10-11 | B |
| OpenAI "Finalising Design" for in-house AI chip | Silicon UK (Reuters) | https://www.silicon.co.uk/cloud/ai/openai-ai-chip-599104 | 11 Feb 2025 | 2026-10-11 | B |
| Microsoft delays production of Maia AI chip to 2026 | DatacenterDynamics (The Information) | https://www.datacenterdynamics.com/en/news/microsoft-delays-production-of-maia-100-ai-chip-to-2026-report/ | 30 Jun 2025 | 2026-10-11 | B |
| Microsoft takes aim … with new AI chip | Yahoo Finance | https://finance.yahoo.com/news/microsoft-takes-aim-at-google-amazon-and-nvidia-with-new-ai-chip-160027494.html | 26 Jan 2026 | 2026-10-11 | B |
| Tesla Dojo: the rise and fall | TechCrunch | https://techcrunch.com/2025/09/02/tesla-dojo-the-rise-and-fall-of-elon-musks-ai-supercomputer/ | 2 Sep 2025 | 2026-10-11 | B |
| Intel won't bring its Falcon Shores AI chip to market | TechCrunch | https://techcrunch.com/2025/01/30/intel-wont-bring-its-falcon-shores-ai-chip-to-market | 30 Jan 2025 | 2026-10-11 | B |
| Meta buys Rivos to accelerate compute engine engineering | The Next Platform | https://www.nextplatform.com/2025/10/02/meta-buys-rivos-to-accelerate-compute-engine-engineering/ | 2 Oct 2025 | 2026-10-11 | B |
| Google Cloud's Ironwood ready for general availability | Constellation Research | https://www.constellationr.com/insights/news/google-clouds-ironwood-ready-general-availability | 6 Nov 2025 | 2026-10-11 | B |
| Etched valuation quadrupled; chip not shipped | Let's Data Science | https://letsdatascience.com/blog/etched-valuation-quadrupled-20-billion-chip-not-shipped | 21 Jul 2026 | 2026-10-11 | B/C |
| Ainekko acquires Esperanto IP | Jon Peddie Research | https://www.jonpeddie.com/news/ainekko-acquires-esperanto-ip/ | Oct 2025 | 2026-10-11 | B |
| Tenstorrent Wormhole analysis | SemiAnalysis | https://newsletter.semianalysis.com/p/tenstorrent-wormhole-analysis-a-scale | 25 Jun 2021 | 2026-10-11 | C |
| Why first silicon success is getting harder | Siemens EDA (Verification Horizons) | https://blogs.sw.siemens.com/verificationhorizons/2025/09/03/why-first-silicon-success-is-getting-harder-for-system-companies | 3 Sep 2025 | 2026-10-11 | A/B |
| Verification in crisis | SemiEngineering | https://semiengineering.com/verification-in-crisis | 25 Apr 2024 | 2026-10-11 | B |
| The dark side of the semiconductor | SemiAnalysis | https://newsletter.semianalysis.com/p/the-dark-side-of-the-semiconductor | 24 Jul 2022 | 2026-10-11 | C |
| How much does it cost to develop a 2nm chip (IBS) | TechBang (Nikkei/IBS) | https://www.techbang.com/posts/112044-how-much-does-it-cost-to-develop-a-2nm-chip | 18 Jan 2024 | 2026-10-11 | C |
| Chip development costs rising (IBS data) | PC Games Hardware | https://www.pcgameshardware.de/CPU-CPU-154106/News/Chip-Entwicklungskosten-steigen-Milliarde-US-Dollar-1428628/ | 9 Sep 2023 | 2026-10-11 | C |
| What will that chip cost? | SemiEngineering | https://www.semiengineering.com/what-will-that-chip-cost/ | 2023 | 2026-10-11 | C |
| TSMC 2022 Annual Report, p.237 (temporary receipts from customers) | TSMC | https://investor.tsmc.com/static/annualReports/2022/english/ebook/files/basic-html/page237.html | 2023 | 2026-10-11 | A |
| TSMC collects huge prepayments | Tom's Hardware | https://www.tomshardware.com/news/tsmc-collects-huge-prepayments | 17 Nov 2021 | 2026-10-11 | B |
| AI chip supply chain constraints | Epoch AI | https://epoch.ai/data-insights/ai-chip-supply-chain-constraints | 12 Mar 2026 | 2026-10-11 | C |
| Foundry allocation status Q1 2026 | Silicon Analysts | https://siliconanalysts.com/analysis/foundry-allocation-status-q1-2026 | 16 Jun 2026 | 2026-10-11 | C |
| Nvidia to consume 77% of wafers used for AI processors in 2025 | Tom's Hardware mirror (Morgan Stanley) | https://www.3dtested.com/tech-industry/artificial-intelligence/nvidia-to-consume-77-percent-of-wafers-used-for-ai-processors-in-2025-report | Feb 2025 | 2026-10-11 | C |
| SK hynix HBM 2026 sold out | ITdaily | https://itdaily.com/news/business/sk-hynix-hbm-2026-sold-out/ | 31 Oct 2025 | 2026-10-11 | B/C |
| Cerebras Form S-1 (2024) | SEC | https://www.sec.gov/Archives/edgar/data/2021728/000162828024041596/cerebras-sx1.htm | 30 Sep 2024 | 2026-10-11 | A |
| Cerebras Form S-1 (2026) | SEC | https://www.sec.gov/Archives/edgar/data/2021728/000162828026025762/cerebras-sx1april2026.htm | Apr 2026 | 2026-10-11 | A |
| Cerebras Q2 2026 results (8-K) | SEC | https://www.sec.gov/Archives/edgar/data/0002021728/000162828026056186/cbrsannouncesfinancialresu.htm | 12 Aug 2026 | 2026-10-11 | A |
| Is it make-or-break time for AI processor startups? | Electronic Design (JPR) | https://electronicdesign.com/technologies/embedded/article/55353724/is-it-make-or-break-time-for-ai-processor-startups | 28 Jan 2026 | 2026-10-11 | C |
| AI chip start-ups: most will disappear by 2030 | heise | https://heise.de/-11248595 | 2026 | 2026-10-11 | C |
| Intel finds Nervana in $408m deal | Global Venturing | https://globalventuring.com/blog/2016/08/10/intel-finds-nervana-in-408m-deal/ | 10 Aug 2016 | 2026-10-11 | B |
| Intel buys Habana Labs for $2b | Globes | https://en.globes.co.il/en/article-intel-buys-israeli-ai-chip-co-habana-labs-for-2b-1001311235 | 16 Dec 2019 | 2026-10-11 | B |
| Wave re-emerges from bankruptcy with MIPS IP | eeNews Europe | https://www.eenewseurope.com/en/wave-re-emerges-from-bankrupcy-with-mips-ip/ | 30 Dec 2020 | 2026-10-11 | B |
| SoftBank acquires Graphcore | TechCrunch | https://techcrunch.com/2024/07/11/softbank-acquires-uk-ai-chipmaker-graphcore | 11 Jul 2024 | 2026-10-11 | B |
| SoftBank acquires Graphcore | The Register | https://www.theregister.com/2024/07/12/softbank_acquires_graphcore/ | 12 Jul 2024 | 2026-10-11 | B |
| Graphcore 2022 accounts | The Register | https://www.theregister.com/2023/10/06/brit_ai_chip_outfit_graphcore/ | 6 Oct 2023 | 2026-10-11 | B |
| AMD acquires team behind Untether AI | CRN Asia | https://www.crnasia.com/news-network/2025/exclusive-amd-acquires-team-behind-ai-chip-startup-untether | 6 Jun 2025 | 2026-10-11 | B |
| OpenAI buys Rain AI patents | Digital Today | https://www.digitaltoday.co.kr/en/view/90637/openai-buys-rain-ai-patents-to-speed-in-house-ai-chip-strategy | 7 Aug 2026 | 2026-10-11 | B |
| NXP completes Kinara acquisition | Edge AI and Vision Alliance (NXP release) | https://www.edge-ai-vision.com/2025/10/nxp-completes-acquisitions-of-aviva-links-and-kinara-to-advance-automotive-connectivity-and-ai-at-the-intelligent-edge/ | Oct 2025 | 2026-10-11 | A |
| Nvidia's Groq deal | Constellation Research | https://www.constellationr.com/insights/news/nvidias-groq-deal-acquisition-acquihire-or-creative-licensing-deal | 24 Dec 2025 | 2026-10-11 | B |
| Groq valuation halves to $3.5B | Mobile World Live | https://www.mobileworldlive.com/ai-cloud/groq-valuation-halves-to-3-5b-in-new-funding-round/ | 18 Aug 2026 | 2026-10-11 | B |
| Groq seeks $500m to fulfil Saudi order | AGBI | https://www.agbi.com/ai/2025/07/ai-chip-startup-groq-seeks-500m-to-fulfil-saudi-order/ | Jul 2025 | 2026-10-11 | B |
| Cerebras prices its IPO at $185 | DatacenterDynamics | https://www.datacenterdynamics.com/en/news/cerebras-prices-its-ipo-at-185-a-share-expects-to-raise-55bn-from-sale/ | 14 May 2026 | 2026-10-11 | B |
| Cerebras S-1 teardown | Futurum | https://futurumgroup.com/insights/cerebras-s-1-teardown-is-the-23b-wafer-scale-ipo-the-end-of-gpu-homogeneity/ | 22 Apr 2026 | 2026-10-11 | B |
| Cerebras raises $1bn at $23bn | DatacenterDynamics | https://www.datacenterdynamics.com/en/news/cerebras-systems-raises-1bn-at-23bn-valuation/ | 5 Feb 2026 | 2026-10-11 | B |
| Cerebras IPO filing reveals Abu Dhabi dependence | eeNews Europe | https://www.eenewseurope.com/en/cerebras-ipo-filing-reveals-extent-of-abu-dhabi-dependence/ | 3 Oct 2024 | 2026-10-11 | B |
| SambaNova first close of $1B at $11B | HPCwire | https://www.hpcwire.com/off-the-wire/sambanova-completes-1st-close-of-1b-financing-at-11b-valuation/ | 8 Jul 2026 | 2026-10-11 | B |
| Tenstorrent closes Series D at $2.6B | BetaKit | https://betakit.com/ai-chipmaker-tenstorrent-closes-nearly-700-million-usd-series-d-at-2-6-billion-valuation/ | 2 Dec 2024 | 2026-10-11 | B |
| Groq raises $640M at $2.8B | Pulse 2.0 | https://pulse2.com/groq-fast-ai-inference-company-raises-640-million-series-d-at-2-8-billion-valuation/amp/ | 6 Aug 2024 | 2026-10-11 | B |
| Etched closes $300M Series C at $10.3B | AI Weekly | https://aiweekly.co/alerts/etched-closes-300m-series-c-at-103b-led-by-sequoia-books-1b-in-pre-orders-for | 23 Jul 2026 | 2026-10-11 | B |
| d-Matrix hits $2B valuation | Bloomberg Government | https://news.bgov.com/private-equity/microsoft-backed-d-matrix-hits-2-billion-value-as-qatar-invests | 12 Nov 2025 | 2026-10-11 | B |
| MatX Series B | StartupIntros | https://startupintros.com/news/2026-02-24-matx-series-b | 24 Feb 2026 | 2026-10-11 | B |
| OpenAI signs $10B deal with Cerebras | Bloomberg | https://www.bloomberg.com/news/articles/2026-01-14/openai-forges-10-billion-deal-with-cerebras-for-ai-computing | 14 Jan 2026 | 2026-10-11 | B |
| AMD and OpenAI announce strategic partnership | AMD newsroom | https://newsroom.amd.com/news/amd-and-openai-announce-strategic-partnership-to-d/ | 6 Oct 2025 | 2026-10-11 | A |
| NVIDIA Form 10-Q (quarter to 26 Oct 2025) | SEC | https://www.sec.gov/Archives/edgar/data/1045810/000104581025000230/nvda-20251026.htm | Nov 2025 | 2026-10-11 | A |
| Tesla P100 datasheet | NVIDIA | https://nvidia.com/content/dam/en-zz/Solutions/Data-Center/tesla-p100/pdf/nvidia-tesla-p100-datasheet.pdf | 2016 | 2026-10-11 | A |
| Tesla V100 datasheet | NVIDIA | https://images.nvidia.com/content/technologies/volta/pdf/tesla-volta-v100-datasheet-letter-fnl-web.pdf | 2017 | 2026-10-11 | A |
| HGX platform (B200) | NVIDIA | https://www.nvidia.com/en-us/data-center/hgx/ | current | 2026-10-11 | A |
| Rubin at CES | The Register | https://www.theregister.com/2026/01/05/ces_rubin_nvidia/ | 5 Jan 2026 | 2026-10-11 | B |
| Blackwell in MLPerf Training v5.0 | NVIDIA Technical Blog | https://developer.nvidia.com/blog/nvidia-blackwell-delivers-up-to-2-6x-higher-performance-in-mlperf-training-v5-0/ | 4 Jun 2025 | 2026-10-11 | B |
| Blackwell in MLPerf Inference v5.0 | NVIDIA Technical Blog | https://developer.nvidia.com/blog/nvidia-blackwell-delivers-massive-performance-leaps-in-mlperf-inference-v5-0 | 2 Apr 2025 | 2026-10-11 | B |
| Trends in machine learning hardware | Epoch AI | https://epoch.ai/blog/trends-in-machine-learning-hardware | 9 Nov 2023 | 2026-10-11 | A/B |
| Can AI scaling continue through 2030? | Epoch AI | https://epoch.ai/blog/can-ai-scaling-continue-through-2030 | 20 Aug 2024 | 2026-10-11 | C |
| TPU v4 (ISCA 2023) | Jouppi et al., arXiv | https://arxiv.org/abs/2304.01433 | Apr 2023 | 2026-10-11 | A |
| Google's 7th-gen Ironwood TPUs debut | The Register | https://www.theregister.com/2025/04/10/googles_7thgen_ironwood_tpus_debut/ | 10 Apr 2025 | 2026-10-11 | B |
| Trainium3 promises 4x performance boost | Data Centre Magazine | https://datacentremagazine.com/news/trainium3-new-aws-chip-promises-4x-performance-boost | 2 Dec 2025 | 2026-10-11 | B |
| Groq company profile | Sacra | https://www.sacra.com/c/groq | 2025-26 | 2026-10-11 | C |
| Sohu chip claimed 20x faster than H100 | Tom's Hardware | https://tomshardware.com/tech-industry/artificial-intelligence/sohu-ai-chip-claimed-to-run-models-20x-faster-and-cheaper-than-nvidia-h100-gpus | 26 Jun 2024 | 2026-10-11 | B (claim) |
| InferenceX: Llama 3.3 70B, B200 vs MI355X | SemiAnalysis | https://inferencex.semianalysis.com/compare/llama-3-3-70b-b200-vs-mi355x | 2026 | 2026-10-11 | B |
| Koomey's law | Wikipedia (Koomey et al. 2011; Naffziger & Koomey 2016) | https://en.wikipedia.org/wiki/Koomey%27s_law | current | 2026-10-11 | B |
| AI's energy wall, and imec's plan | IO+ | https://ioplus.nl/en/posts/ais-energy-wall---and-imecs-plan-to-break-through | 3 Oct 2025 | 2026-10-11 | B |
| AMD says AI energy efficiency rises fourfold by 2026 | DataCenter News | https://datacenter.news/story/amd-says-ai-energy-efficiency-rises-fourfold-by-2026 | 18 Aug 2026 | 2026-10-11 | B/C |
| NVIDIA Q4 FY2026 results (8-K) | SEC | https://www.sec.gov/Archives/edgar/data/1045810/000104581026000019/q4fy26pr.htm | Feb 2026 | 2026-10-11 | A |
| AMD Q4 and FY2025 results | AMD IR | https://ir.amd.com/news-events/press-releases/detail/1276/amd-reports-fourth-quarter-and-full-year-2025-financial | Feb 2026 | 2026-10-11 | A |
| Marvell Q4 FY2026 results (8-K) | SEC | https://www.sec.gov/Archives/edgar/data/1835632/000183563226000006/q426_8kx1312026ex-991.htm | Mar 2026 | 2026-10-11 | A |
| Enterprise value multiples by sector (Jan 2026) | Damodaran, NYU Stern | https://pages.stern.nyu.edu/~adamodar/New_Home_Page/datafile/vebitda.html | Jan 2026 | 2026-10-11 | A/C |
| Cerebras prices IPO at $185 | IPOScoop | https://www.iposcoop.com/the-ipo-buzz-cerebras-cbrs-prices-ipo-at-185-25-above-range-2/ | 13 May 2026 | 2026-10-11 | B |
| Cerebras stock trades on Nasdaq after IPO | CNBC | https://www.cnbc.com/2026/05/14/cerebras-cbrs-stock-trade-nasdaq-ipo.html | 14 May 2026 | 2026-10-11 | B |
| Energy and AI: executive summary | IEA | https://www.iea.org/reports/energy-and-ai/executive-summary | Apr 2025 | 2026-10-11 | A |
| Energy and AI: energy demand from AI | IEA | https://www.iea.org/reports/energy-and-ai/energy-demand-from-ai | Apr 2025 | 2026-10-11 | A |
| Recalibrating global data center energy-use estimates | Masanet et al., Science | https://www.Gwern.net/doc/cs/hardware/2020-masanet.pdf | 28 Feb 2020 | 2026-10-11 | A |
| Berkeley Lab report on data-centre electricity demand | LBNL | https://newscenter.lbl.gov/2025/01/15/berkeley-lab-report-evaluates-increase-in-electricity-demand-from-data-centers/ | 15 Jan 2025 | 2026-10-11 | A |
| DeepSeek: JM Finn view | JM Finn | https://www.jmfinn.com/our-thinking/deepseek-jm-finn-view/ | 29 Jan 2025 | 2026-10-11 | B |
| Amazon doubles down on AI with $100B spending plan | TechCrunch | https://techcrunch.com/2025/02/06/amazon-doubles-down-on-ai-with-a-massive-100b-spending-plan-for-2025/ | 6 Feb 2025 | 2026-10-11 | B |
