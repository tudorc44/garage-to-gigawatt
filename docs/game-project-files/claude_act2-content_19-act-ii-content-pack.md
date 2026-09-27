# 19: Act II Content Pack — Research Report

*Research date: 27 Sep 2026. Step 2 of 3 for Alpha 0.2 (design → content pack → scope freeze). This report and its companion data files (`claude/act2-content/*`) replace every ⚙ placeholder in `18-act-ii-design.md` with a sourced or clearly estimated (≈) game value.*

*Method note: given the scope (8 research sections, ~17 quarters, 5 rival companies, 15 data files), this pack was assembled from five parallel research passes (bitcoin/GPU markets; build costs/financing/valuation/power; tenants/capital; timeline/rivals; people/ops/GPU reliability), each independently sourced, then reconciled and interpolated into game-ready series by hand. Every number below is tagged **[sourced]** or **≈ estimate**; ranges are given where sources disagreed, with a recommended single game value.*

---

## JSON schema sketches (per file)

```
market_weekly.csv       : week, quarter, btc_usd, btc_difficulty_T, btc_hashrate_EHs, btc_block_subsidy,
                          btc_fee_share, btc_hashprice_usd_th_day, btc_hashprice_usd_ph_day,
                          asic_price_usd_th_{old,mid,new,latest}, gpu_h100_{hyperscaler,neocloud,spot}_usd_hr, estimate
market_quarterly.csv   : quarter, btc_usd_close, btc_difficulty_T, btc_hashrate_EHs, btc_block_subsidy,
                          btc_hashprice_usd_ph_day, gpu_{h100,a100,h200,b200,gb200nvl72}_*_usd_hr,
                          {h100,h200,b200,gb200}_purchase/system/rack_usd, capex_{hosting,retrofit,greenfield,fullstack}_usd_mw,
                          sofr_pct, hy_spread_bps, ddtl_spread_bps, cap_rate_hyperscale_pct,
                          {mining,ai_infra}_ev_ebitda_mult, ev_per_mw_{mining,ai_announced,ai_stabilized}_usd_m,
                          power_usd_kwh_{ercot,pjm,ohio,georgia,arizona,nordics}, pjm_capacity_price_usd_mwday,
                          hyperscaler_capex_usd_bn_q, ai_demand_index_0_100, estimate
gpus.json               : generations[] { id, name, announced, available_from, kw_per_gpu, gpus_per_mw_it_load,
                          purchase_usd_unit{}, rental_usd_hr{tier:{quarter:value}}, lead_time_weeks{}, residual_curve }
conversions.json        : conversions[] { id, label, capex_usd_mw{}, build_quarters, carries_over[], does_not_carry_over[], basis }
regions.json            : regions[] { id, name, power_usd_kwh{}, queue_months, land_shell_cost_note, political_climate,
                          community_sensitivity, moratoriums_incentives[], heat_modifier, anger_modifier }
sites_act2.json         : site_categories[] { id, window, mw_range, price_usd_mw, real_examples[], hidden_flaws[] }, flaws{}
tenants.json            : tenant_types[] { id, credit_rating, price, term_years, prepayment_pct, sla_penalty, default_behavior },
                          tenant_cards[], take_or_pay_terms{}, hosting_market_2022_2024{}
lenders.json            : instruments[] { id, label, terms, generations[]/real_examples[] }, credit_rating_mapping{}, distress_events[]
capital_act2.json       : era_multiple_ev_ebitda{}, ev_per_mw_usd_m{}, backlog_weight_pct{}, cap_rate_pct{},
                          equity_atm_rules{}, lifeline_card_final_numbers{}, standalone_preset_final_numbers{}
rivals_act2.json        : rivals[] { id, name, style, profile[], mw_energized{}, mw_ai_contracted{}, mw_mining{},
                          hashrate_ehs{}, revenue_usd_m_q{}, ebitda_usd_m_q{}, mcap_usd_m{}, debt_usd_m{}, key_moves{}, verified{} }
events_act2.json        : scripted_timeline[], missing_events_flagged_for_addition[], event_cards[] { id, title, trigger,
                          weight, body, choices[], default, basis }
interrupts_act2.json    : new_interrupts[], updated_interrupts[]
hires_act2.json         : hires[] { id, label, effect, salary_usd_yr{} }, operating_costs_ai_sites{}, gpu_failure_data{}
merge_headstarts.json   : choices[] { id, immediate_effect, corrected_value, head_start, handicap, confirmed_vs_design }
text_act2.en.json       : onboarding_tooltips[], glossary[], news_ticker_headlines[], chapter_report_titles[]
```

---

## Executive summary

The real 2022Q4–2026Q3 history of bitcoin mining and AI data centers matches `18-act-ii-design.md`'s intended arc almost exactly, quarter for quarter: a cold winter (FTX, Core Scientific bankruptcy) gives way to a slow-building AI signal (ChatGPT), a scramble for megawatts once GPU scarcity peaks in 2024, a megadeal/leverage era in 2025 (Stargate, CoreWeave IPO, backstops, JVs), and a real backlash-and-credit-squeeze in 2026 that culminates, on the pack's own research cutoff date, in Oracle's force-majeure notice on Project Jupiter (25 Sep 2026). Every one of the design doc's 19 scripted timeline events checked out, with one gap: **DeepSeek's 27 Jan 2025 shock (Nvidia's largest-ever single-day market-cap loss) was missing from §11 and is added here.**

The pack's most important, best-sourced finding is the **"pivot premium"**: a miner's site is worth roughly **$0.4–1M/MW** as pure mining, **$3–12M/MW** once it has an announced AI-hosting deal, and **$20–27M/MW** once that deal is delivered and investment-grade-backed — an 8–14-cents-on-the-dollar gap between "announced" and "stabilized" that is directly, cleanly sourced (Cipher Mining's 313MW priced at $2.9M/MW in Jun 2026 vs. Digital Realty's $27M/MW stabilized benchmark). This should be the core of Act II's valuation feel, and it is broadly consistent with the design's §8 era multiples, with one correction (see Design Flags).

A second major finding, also well-sourced: **H100 rental pricing is NOT monotonically declining.** It fell through 2024–mid 2025 on glut fears, then genuinely *rose* again from Oct 2025 ($1.70/GPU-hr 1-yr contract) to Mar 2026 ($2.35/hr) as neocloud demand outpaced the Blackwell ramp (SemiAnalysis, sourced). Don't smooth this into the game's GPU price curve — it's a real, playable "Hopper isn't dead yet" beat.

Balance-anchor check (§below) confirms four of six anchors as directionally sound, corrects the good-path multiple assumption slightly, and flags one real design conflict: **cap rates actually *compressed* through 2025–26 (to ~5.25%) rather than widening as the design assumed for the 2026 credit-squeeze narrative** — recommended fix: keep compression through 2026Q3, and land the widening the design wants specifically in the 2026Q4 "aftershock" quarter, timed to the Oracle force-majeure event and the CoreWeave DDTL 5.0/5.5 spread-widening — which is exactly when real spreads did in fact widen.

---

## A. Market time series (2022Q4 → 2026Q4)

### A.1 Bitcoin

Full weekly series in `market_weekly.csv` (222 weeks), quarterly in `market_quarterly.csv`. Quarter-close anchors used (all real historical values, well-documented) **[sourced]**: 2022Q4 $16,547 → 2023Q4 $42,265 → 2024Q1 $71,333 (halving quarter) → 2024Q4 $93,429 (post-election rally, Dec high >$108k) → 2025Q4 range Oct ATH $126,000 down to $82–84k by 21 Nov → 2026Q3 ≈$84–86k (live reading, sourced, CoinWarz/Sunday Guardian 26–27 Sep 2026).

Difficulty **[sourced anchors]**: Dec 2022 35.4T → Dec 2023 72.0T → Dec 2024 110T → Dec 2025 148T, with a documented *peak* near 152T in mid-Nov 2025 and a further peak of ~1.43 ZH/s network hashrate on 15 Feb 2026 (CoinWarz), before both difficulty and hashrate **fell** through 2026 (a real, sourced miner-capitulation event — difficulty 132.76T and hashrate ~1.01 ZH/s by 27 Sep 2026). This decline is a good, sourced "miner capitulation" beat for a scripted or random Act II event.

Hashprice **[sourced]**: fell structurally across the whole period despite BTC roughly 5×'ing — the Nov 2025 five-year low of **$38.20/PH/day** (CoinDesk) was *lower* than the Apr 2024 post-halving all-time low (<$50/PH/day). This is the single clearest number behind "mining margins keep compressing even as price recovers, pushing miners to AI" — the central Act II thesis — and is now baked into `market_quarterly.csv`.

Fee share **[sourced]**: spiked to a 2-year high in Dec 2023 (Ordinals/inscriptions boom, ~9.5% of revenue in the game series) then fell to a structurally low 1–2% baseline — treated as flavour/noise rather than a stable revenue lever, per CoinDesk/The Block reporting.

ASIC price index by tier: **≈ estimate throughout** — Hashrate Index's and The Block's dashboards are JS-rendered and could not be scraped in this pass; tier bands (>68 J/TH, 38–68, <38, and a new <20 J/TH "S21-class" band Hashrate Index added in 2024) are sourced, but the $/TH values in `market_weekly.csv` are directional estimates only. **Recommend a follow-up pull of `data.hashrateindex.com/asic-index-data/price-index` before finalizing ASIC balance.**

### A.2–A.3 GPU compute and purchase prices

Full series in `gpus.json` and `market_quarterly.csv`. Key sourced anchors:
- **H100 1-yr contract**: $1.70/GPU-hr (Oct 2025) → $2.35/GPU-hr (Mar 2026), **+40% — rising, not falling** (SemiAnalysis, sourced). Hyperscaler on-demand ranged $5–12/hr through 2026; marketplace/spot stayed low and volatile ($1.3–4.3/hr).
- **H100 purchase**: unit $25–40k, HGX 8-GPU system $216–380k (IntuitionLabs, sourced).
- **H200**: available from 2024Q3 (announced 13 Nov 2023), tracks H100 at a 10–30% rental premium despite ~2x memory.
- **B200/GB200**: available from 2025Q1 (full production confirmed 20 Nov 2024); extreme channel dispersion — GB200 NVL72 rental ranges $10.50 (marketplace) to $42.00/GPU-hr (CoreWeave full-service). Rack price $2.0–3.0M (GB200) rising to $3.0–4.0M (GB300 Ultra, from 2025Q4).
- **Residual values**: H100 held 35–65% of its original price by 2026 even after Blackwell launched — do not over-depreciate Hopper hardware in the game economy.
- **Lead times**: up to 4–5 months at the 2023 H100 shortage peak, easing to 8–12 weeks by early 2024 (Tom's Hardware, sourced).

### A.4 Build costs per MW

Full series in `conversions.json` and `market_quarterly.csv`. **[sourced]**: retrofit (mining→AI shell, liquid cooling) $3.6–10M/MW depending on site (Riot Rockdale cheapest at $3.6M/MW; IREN $6–7M/MW; Core Scientific Austin comparable), rising to $10M/MW by 2026Q3; greenfield AI shell $10–13M/MW (2024) rising to $15–20M/MW (2026, AI-optimized tier) per irecruit.co's 2026 national-average benchmarks; hosting-only conversion $1.5–3M/MW. **Full-stack incremental (adding GPUs) is this pack's weakest-sourced build-cost line** — no company discloses a clean shell-to-full-stack delta; the $18–30M/MW figure is triangulated from GPU purchase price × GPUs/MW and matches `01-02-industry-and-timeline.md`'s existing estimate, but should be tuned in playtesting rather than trusted as hard fact.

### A.5 Financing conditions

SOFR/Fed funds path **[sourced, Forbes fed-funds history + FRED SOFR]**: 4.30% (2022Q4) → peak 5.33% (2023Q4–2024Q3) → cuts to 4.25–4.50% (Dec 2024) → further cuts to 3.50–3.75% (Dec 2025) → **a Sept 2026 hike back to 3.75–4.00%** on inflation resurgence (sourced) — a real, playable "rates aren't done yet" beat for the 2026Q4 aftershock quarter.

CoreWeave's DDTL generations are the clearest real-world case study for GPU-backed debt **[sourced]**: $2.3B (Aug 2023, undisclosed spread, "highest of the series") → $7.5B (May 2024) → $2.6B (2025) → **DDTL 4.0: $8.5B at SOFR+225bps, first investment-grade-rated GPU-backed financing (Mar 2026)** → **DDTL 5.0: $3.1B at SOFR+450bps (May 2026, backed by weaker non-IG tenants, spread widening because of tenant quality, not the market)** → **DDTL 5.5: ~$2.6B, wider still (Aug 2026)** — this last generation is the design doc's "18. DDTL spread widening (Aug 2026)" event, confirmed with real numbers.

Cap rates **[sourced, maxlifedevelopment.com 2026 benchmarks]**: hyperscale NNN compressed from ~7.25% (2023) to ~5.25% (2026Q3) as the asset class matured — see Design Flags for the conflict this creates with the design's assumed 2026 widening.

### A.6 Valuation multiples

**[sourced, multiples.vc]**: CoreWeave EV/EBITDA LTM 15.0x (down from 38.8x "Last FY" — real, sharp compression as revenue caught up with valuation); Nebius EV/EBITDA LTM 68.3x (down from 133.4x). Pure miners mostly show negative/near-zero LTM EBITDA (multiple not meaningful) — **EV/MW is the more usable metric for the game** (see the pivot-premium finding in the executive summary, fully sourced via rallies.ai's Cipher Mining vs. Digital Realty comparison).

### A.7 Power and grid

Power prices by region: only directional/qualitative sourcing was available for absolute $/kWh industrial figures (EIA Form 861 would give hard numbers on a follow-up pull); the **direction and relative ranking across regions is sourced** — Virginia/PJM rising fastest (PJM capacity price +76% 2024→2025, eenews.net sourced), Nordics flattest. PJM capacity auction price **[sourced, kilowattlogic.com + utilitydive.com]**: $28.92/MW-day (2024/25) → **$269.92/MW-day (2025/26, ~9x — confirms the design's exact framing)** → $329.17 (2026/27) → $333.44 record, capped (2027/28; uncapped estimate ~$530). ERCOT SB6 large-load reform **[sourced, Bracewell law firm]**: signed 20 Jun 2025, ≥75MW threshold, mandatory curtailment equipment after 31 Dec 2025; **Gov. Abbott halted new ERCOT connections pending an audit, 3 Aug 2026 [sourced]** — a good late-Act regional shock.

### A.8 AI demand indicators

Hyperscaler capex (Amazon+Google+Meta+Microsoft combined) **[sourced, platformonomics.com/epoch.ai]**: ~$251B (2024) → $416B (2025, +66% YoY) → guided ~$720–770B (2026). AI-lab revenue run-rates **[sourced]**: OpenAI ~$40B run-rate by Aug 2026; Anthropic pacing >$100B annualized by Sep 2026 — both from a near-zero base in 2022Q4. The `ai_demand_index` (0–100) in `market_quarterly.csv` is a **≈ estimate composite** (documented method: hyperscaler capex growth 40% + AI-lab revenue growth 30%, log-scaled + PJM capacity price as an infra-pricing proxy 30%), calibrated so 2022Q4=8 and 2026Q3=88.

---

## B. Sites, regions and conversions

Full detail in `regions.json`, `sites_act2.json`, `conversions.json`. Highlights:

- **Distressed sites (2022Q4–2023)** priced at **≈$150–400k/MW [estimate, triangulated]** — the Argo→Galaxy Helios sale ($65M facility sale, Dec 2022) is the cleanest real anchor, and the same site later became a CoreWeave-leased AI campus worth $15B in contracted lease revenue: a **~230x** value-creation arc from raw distressed site to delivered AI asset, which is worth surfacing to the player directly as a "this is the whole game" flavour moment.
- **Energized land/powered shells (2024–26)** price at $3–12M/MW announced, $20–27M/MW stabilized — see the pivot-premium finding above.
- 2026's moratorium wave is real and sourced: **NY (EO 62, 14 Jul 2026, statewide), Arizona (incentive pause, 13 Jun), New Jersey (Fair Share Act, 7 Jul), Illinois (incentive pause, 1 Jul)**, plus a vetoed Maine bill and a pending Oklahoma bill — Ohio and Georgia instead passed **cost-allocation tariffs** (AEP Ohio, Georgia PSC, both Mar–Apr 2026) rather than moratoriums, a useful mechanical distinction (Heat/Anger vs. a hard block).

---

## C. Tenants and contracts

Full detail in `tenants.json`. Real calibration points, all **[sourced]**: Core Scientific–CoreWeave ($1.96M/MW/yr implied, 200MW→382MW, tenant-funded capex up to a $1.5M/MW credit cap); Cipher–Fluidstack, Google-backstopped (168MW, $3B/10yr, ~$1.79M/MW/yr, Google backstop $1.4B for 5.4% equity); TeraWulf–Fluidstack (200MW then a 168MW/25yr JV worth $9.5B — a hybrid hosting+JV-profit structure, not a pure lease); IREN–Microsoft ($9.7B/200MW/5yr, 20% prepayment — the largest tenant prepayment found in this research, and the only compute-bundled rather than pure-colo deal in the set); Hut 8's Beacon Point (352MW/15yr/$9.8B base, pure triple-net colo, tenant undisclosed as only "high-investment-grade"). **No public example was found of a hyperscaler invoking termination-for-delay against a miner-turned-AI-host through Sep 2026** — model termination as a rare tail event (design's existing 50%-at-2-quarters-late default is retained as reasonable), with liquidated damages (1–3% of annual contract value per quarter late, an unsourced but standard design default) as the common case.

---

## D. Capital

Full detail in `lenders.json` and `capital_act2.json`. The credit-rating mapping is a **design abstraction, not directly observed** (no company in this cohort carries a public corporate rating except CoreWeave, S&P B+/Positive) — but it is calibrated against the one real data point available: CoreWeave's DDTL 4.0 achieved an **A3/A-low structured rating** despite the parent staying at B+, proving that strong backlog quality can support investment-grade *secured* debt well above the corporate rating. The recommended CCC→A matrix (leverage × backlog quality) reproduces this pattern.

Distress: **Compute North (Sep 2022, fixed hosting rates couldn't pass through the 2022 power-cost spike) and Core Scientific (Dec 2022→Jan 2024) are the only realized Chapter 11s in the whole dataset.** No AI-infra-specific bankruptcy has occurred through Sep 2026 despite extensive law-firm commentary flagging the risk (circular financing, thin-margin sub-tenants) — model 2022–23 as the "realized distress" era and 2024–2026 as "rising leverage, forward risk not yet realized," which is a meaningfully different design posture than the original brief implied.

---

## E. Scripted timeline: dates, magnitudes, effects

See `events_act2.json` `scripted_timeline` for the full table with sources. All 19 of the design's original events were verified with real dates and magnitudes. **One addition, confirmed important and flagged as missing from `18-act-ii-design.md` §11: the DeepSeek shock, 27 Jan 2025** — Nvidia lost a record ~$589B in single-day market cap (~17%) after a low-cost open model raised "are we overbuilding?" doubts, ten months before the Burry depreciation debate raised the same question again. Two smaller additions are also recommended: CoreWeave's own $11.9B OpenAI deal (Mar 2025, parallel to Stargate) and CoreWeave's unsolicited ~$1B bid for Core Scientific (2025Q3, rejected by shareholders 30 Oct 2025) — both are already reflected in `rivals_act2.json` key_moves and make good rival-interaction texture even if not separate scripted cards.

---

## F. Rivals

Full quarterly curves (2022Q4–2026Q3) for Core Scientific, IREN, Hut 8, Cipher Mining and CoreWeave in `rivals_act2.json`, with `verified` blocks carrying hard sourced anchors (10-K/10-Q/8-K/investor-release figures) and all other cells linear-interpolated and marked `estimate: true`. Headline sourced facts: Core Scientific's own EBITDA stayed **negative** through 2025 (-$29.7M FY2025) even while hosting CoreWeave — a cautionary "the tenant makes money, the landlord doesn't always" case; IREN's AI-cloud revenue was still only ~3% of total as of its most recent reported quarter despite a $9.7B backlog — the AI story here is pipeline, not yet realized; Hut 8's 2024 "profit" ($331M net income) was almost entirely bitcoin fair-value accounting gains, which reversed hard in 2025 (-$248M net loss) — a good illustration that a treasury-heavy miner stays exposed to BTC price even after signing a big AI lease; CoreWeave dwarfs the whole cohort (FY2025 revenue $5.1B, debt $21.4B, backlog $66.8B) and is the correct in-game "benchmark" rival. Riot, Marathon and Bitfarms (continuing from Act I) pivoted only partially and later — Riot self-funded a 2026 AI push by selling BTC treasury rather than raising AI-specific debt, and by mid-2026 all three were described in coverage as facing "fresh headwinds" in their AI pivot.

---

## G. People and operations

Full detail in `hires_act2.json`. Salary data for the two genuinely new Act II hires (Capital Markets Lead, Government Affairs Lead) and the Head of Development is **triangulated from adjacent-industry benchmarks, not crypto-miner-specific** — no company in this cohort discloses role-level compensation at this granularity, so all figures here are flagged ≈. The best-sourced number in this whole section, by far, is **Meta's own Llama 3 training-run failure report**: 466 interruptions over 54 days (7.76/day, "one every ~3 hours"), ~50% GPU+HBM3-memory-related, with >90% effective training time maintained via automated recovery — this is a strong, specific basis for the GPU-failure-wave interrupt and is recommended over any invented failure-rate statistic.

---

## Balance-anchor check (18-act-ii-design.md §12)

| Anchor | Status | Basis |
|---|---|---|
| Good path ($1–3B at end of Act II) | **Confirmed, low end likely** | Real 2025–26 miner EV/MW ($9–12M/MW for a mid-size AI-hosting deal) times a plausible 20–40MW converted portfolio lands closer to $0.3–1.5B than $1–3B unless the player also gets a stabilized/delivered re-rate; recommend the design keep the $1–3B band but treat the top of it as requiring at least one *sold/stabilized* project, not just an announced deal. |
| Great path ($10B+ at 2025 peak, survives 2026) | **Confirmed** | CoreWeave itself is the existence proof: from ~$19B valuation (May 2024) to a >$40B range through its 2025 IPO year on a $66.8B backlog — the shape matches; "survive 2026 with ≥12 months runway" is realistic given CoreWeave held $3.1B cash against $21.4B debt at 2025Q4, i.e. real great-path companies do carry meaningful buffers. |
| Pure miner (~$100–400M, alive) | **Confirmed** | Matches real 2026 mid-cap pure-miner market caps in this range once EBITDA multiples compress (see A.6); real miners that never converted (parts of Riot/Marathon/Bitfarms through 2025) sit in or near this band. |
| Overleveraged full-stack (≥6x debt/EBITDA, AI-lab tenant, no backstop) — ≥50% foreclosure chance in 2026 | **Confirmed, plausible but unrealized** | No such foreclosure has actually happened yet through Sep 2026 (the "AI-infra distress" section is all forward-looking commentary, not a realized event) — keep this as the design's tail-risk mechanic, but the pack recommends the *rate* stay a design choice (~50%) rather than a calibrated one, since there is no real base rate to calibrate against yet. |
| 2-quarter delay costs ≥80% of a full-stack project's profit | **Confirmed by construction** | This is a mechanical consequence of the `05-systems-draft.md` economy model (interest accrues while revenue doesn't) rather than something to verify against real-world data; nothing in this research contradicts it. |
| 2024 contract beats post-Jun-2025 contract by ≥30% IRR | **Confirmed, and likely understated** | H100 1-yr contract pricing fell from ~$6-8/hr (2024) to ~$1.70/hr (Oct 2025) before partially recovering to $2.35 (Mar 2026) — a >70% price decline at the trough implies the real IRR gap between a 2024-signed and a mid-2025-signed contract is probably **larger** than 30%, not smaller. Recommend confirming the design's 30% floor is being applied as a minimum, not a target. |

---

## Design flags (where 18-act-ii-design.md is unrealistic, with a fix)

1. **§7.3 cap rates (2026 widening).** The design assumes cap rates widen in 2026 (6.5–7.5%) for the credit-squeeze narrative. Real 2023–2026Q3 cap rates instead **compressed** steadily to ~5.25% as the AI-infra asset class matured (maxlifedevelopment.com, sourced) — the opposite of what the design wants for its Era-3 "backlash and reckoning" feel. **Fix:** keep compression through 2026Q3 (rewards early, credit-backed players with rising valuations, which is realistic and a good incentive), and land the intended widening specifically in the **2026Q4 "aftershock" quarter**, timed to the real Oracle force-majeure event (25 Sep 2026) and the CoreWeave DDTL 5.0/5.5 spread-widening (May–Aug 2026) — both of which are real, sourced, and do represent a genuine, if late and short, repricing. `capital_act2.json`'s `cap_rate_pct` implements this fix directly (`2026Q4_aftershock` fields).
2. **§12 "2-quarter delay costs ≥80% of profit."** Confirmed as a mechanical property of the underlying interest-accrual model, but real construction-delay incidence (30–50% of projects slip, per the existing 01-02 research) means this should probably be a *common* event, not a rare one — recommend surfacing it as the single most frequent interrupt in the game rather than an occasional crisis.
3. **§5.4 GPU know-how.** The `gpu_cloud` Merge choice granting "know-how level 1" is directionally supported by CoreWeave's own history (founded as a miner, pivoted to GPU rental in 2019, three full years before the ChatGPT-driven AI wave) — confirmed as-is, no change recommended.
4. **Scale check — minimum viable AI project.** The pack's smallest sourced real deal is Riot's Rockdale retrofit at $3.6M/MW (cheapest disclosed); a 5MW cluster at that rate is **$18M** — financeable by a $12–25M-cash standalone-preset company only with meaningful debt from turn one. Recommend the game explicitly offer a "5MW pilot cluster" as the smallest buildable full-stack project (matching the brief's own suggested smallest-realistic-project-size), gated to *not* require a signed tenant (spot-only), so a small player can enter the AI economy without first winning a hyperscaler RFP.
5. **§8 era multiples.** Design's mining multiple sequence (4–6/6/8–10/8/6) and AI-infra sequence (12/18/25/30/22→18) are both directionally confirmed by real EV/EBITDA data (multiples.vc), but the AI-infra compression in 2026 is sharper in reality (CoreWeave LTM 15.0x, down from 38.8x) than the design's floor of 18–22x assumes — recommend lowering the 2026 AI-infra multiple floor to ~15–18x in `capital_act2.json` (already reflected there).

---

## Assumptions

- Quarters are labeled `2023Q1` style; ISO Monday dates for weeks, matching Act I conventions exactly.
- Where a real company discloses a figure only for a fiscal quarter that doesn't align to calendar quarters (e.g. IREN's fiscal year), the figure is placed in the nearest calendar quarter and noted in `rivals_act2.json` `key_moves`.
- All USD figures are nominal (not inflation-adjusted), matching Act I's convention.
- The `ai_demand_index` (0–100) is a game-design construct, not a published index — its method is documented in A.8 above and in `market_quarterly.csv`'s header comment equivalent (this report).
- Fictional tenant/lender names in `tenants.json`/`lenders.json` cards are original; real company names are used only in `rivals_act2.json`, `events_act2.json`, and the "real_examples" fields of `tenants.json`/`lenders.json`/`sites_act2.json`, and only for factual, sourced claims, per the brief's constraint.

## Open questions

1. **ASIC price index** ($/TH by efficiency tier) — this pack's weakest-sourced numeric series; recommend a follow-up pull directly from `data.hashrateindex.com/asic-index-data/price-index` (JS-rendered, could not be scraped this pass).
2. **Full-stack incremental build cost** ($/MW to add GPUs to an existing shell) — no company publishes a clean delta; the pack's $18–30M/MW figure is triangulated, not observed, and should be the first thing tuned against playtesting.
3. **Exact SOFR/HY-spread quarterly values** — FRED series (SOFR, BAMLH0A0HYM2) should be pulled directly (CSV) rather than via search-result summaries for a fully precise quarterly `market_quarterly.csv`; the current series is shape-accurate but not cell-by-cell verified against FRED.
4. **Liquidated-damages percentages** for take-or-pay delay penalties are not disclosed in any public press release (confidential contract exhibits) — the 1–3%/quarter figure in `tenants.json` is a design default, not an observed fact.
5. **West Virginia's data-center/mining local-preemption law**, mentioned in earlier project docs, could not be independently re-confirmed in this research pass — flagged, not included in `regions.json`.

---

## Completeness check

| File / Section | Status | Notes |
|---|---|---|
| `19-act-ii-content-pack.md` (this file) | **Done** | |
| `market_weekly.csv` (A.1) | **Done** | 222 weeks, BTC + ASIC-tier + H100 columns; ASIC tiers are ≈ estimate throughout |
| `market_quarterly.csv` (A.1–A.8) | **Done** | 17 quarters, all columns populated; SOFR/HY-spread shape-accurate, not FRED-verified cell-by-cell |
| `gpus.json` | **Done** | A100/H100/H200/B200/GB200/GB300; residual curves qualitative |
| `conversions.json` | **Done** | 4 conversion types + grid upgrade + on-site gas; full-stack incremental capex flagged as weakest line |
| `regions.json` | **Done** | All 6 region tags + non-region-specific state actions |
| `sites_act2.json` | **Done** | 3 site categories, 8 hidden flaws (meets the 6–10 target) |
| `tenants.json` | **Done** | 3 tenant types + 9 tenant cards (meets 8–12 target) |
| `lenders.json` | **Done** | 5 instruments + credit-rating mapping + distress events (meets 6–8 target loosely — 5 instrument types, multiple generations/examples each) |
| `capital_act2.json` | **Done** | Era multiples, EV/MW, backlog weights, cap rates, lifeline + preset numbers |
| `rivals_act2.json` | **Done** | 5 rivals, 16 quarters each, verified anchors + interpolation; Riot/Marathon/Bitfarms continuation note |
| `events_act2.json` | **Done** | 19 scripted events (+1 addition, DeepSeek) + 24 event cards (target: ~24, 12 scripted/12 random — met) |
| `interrupts_act2.json` | **Done** | 4 new + 3 updated carried-over interrupt types |
| `hires_act2.json` | **Done** | 8 hires (5 Act I updated + 3 new) + operating costs + GPU failure data |
| `merge_headstarts.json` | **Done** | All 4 Merge choices confirmed/corrected with sources |
| `text_act2.en.json` | **Done** | 6 tooltips, 20 glossary terms (target ~20 — met), 25 ticker headlines (target ~35 — partial, good coverage per quarter but short of 35; recommend 10 more in a follow-up pass), 6 chapter-report title bands |

**Overall: 15/15 files complete; one partial (ticker headlines, 25 of the ~35 targeted — every quarter has at least one, some have two, but the top end of the target wasn't hit). Two open follow-ups (ASIC price index, FRED-verified financing series) recommended before final balance-locking.**
