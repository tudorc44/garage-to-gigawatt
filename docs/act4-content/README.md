# Act IV content (source files)

Source of truth for Act IV's content (doc 33 §16; `docs/act4-scope.md`). The game reads byte-identical copies in
`src/content/` (a test checks every file listed here). Every column or field is flagged **sourced** (doc 31's
evidence), **derived** (computed from sourced or carried values) or **designed** (invented for the game, to tune; ⚙ in
doc 33). "Research gap" marks a designed placeholder for something doc 31 §3 lists as not yet researched (owner
default 14: no new research in this run).

## Files

| File | What | Since |
|---|---|---|
| `market_iv_f1.csv` … `market_iv_f4.csv` | The four futures' quarterly markets, 2031Q1–2035Q4 (20 rows) | M27.3 |
| `market_weekly_iv_f1.csv` … `market_weekly_iv_f4.csv` | Their weekly markets (13 weeks a quarter, 260 rows) | M27.3 |
| `signals_iv_f1.json` … `signals_iv_f4.json` | The four futures' Signals: six indicators, 20 quarters, one decoy, the trigger (hidden fields included) | M28.1 |
| `lunar_truth.json` (**hidden**) | The lunar grade's weights and per-grade truth, per-site variance, prospect noise | M28.3 |
| `orbit_truth_iv.json` (**hidden**) | Each future's true orbital GPU failure rate and useful life; telemetry noise | M28.3 |
| `reading_score_iv.json` (**hidden**) | The reading score's ideal stances per future and quarter, weights, decoy windows | M28.3 |
| `events_iv.json`, `text_iv.en.json` | 40 event cards (8 per future, 8 shared) and their text keyed by opaque engine id | M28.4 |
| `wildcards_iv.json` | The six wildcards (2 drawn at entry): windows, effects, the milestone that wires each | M28.5 |
| `launch_providers.json` | The four launch providers: price multipliers, failure rates by year, slips, bumps, limits | M29.1 |
| `satellites_iv.json`, `shells_iv.json` | Block sizes, generations, GPUs, build time, opex, life; the three shells, their multipliers and debris rules | M29.1 |
| `insurance_iv.json`, `licences_iv.json` | The hard market, the lender cover rule, the exposure line; filings, registries, milestones, the clampdown | M29.1 |
| `tenants_iv.json` | The four orbital tenant types (fictional names), terms, workloads; link units and optical ground stations | M29.1 |
| `lunar_iv.json` | The 8 polar sites and the lunar chain's rules: claims, disputes, missions, power, pilot, production, offtake, valuation, alerts | M30.1 |
| `lunar_claims_iv.json` | The rivals' and blocs' scripted lunar claims per future (identical through 2032Q2) | M30.1 |

## The market files (M27.3)

**Generated, never hand-edited:** `npm run content:act4` (`tools/act4/market.ts`) writes both copies, then
`npm run content:market` writes the JSON the game imports. To change a value, change the script and re-run both.

**What the files are:** each future's own path. The seam glide (doc 33 §3.3) from the player's own Act III scenario to
this path happens when the game loads (`src/content/index.ts`, 16 glided markets, one per Act III scenario × future),
so the files don't depend on how the player's Act III went.

**The common 2031 baseline (B14):** every column is identical in all four futures through 2031Q4 (act quarters 0–3);
the futures diverge from 2032Q1. Doc 33 allows up to 3% apart in 2031Q3–Q4; the build keeps them identical, so the glide
ends exactly on the common baseline (act4-scope.md §6).

**The futures' trigger quarters (designed, inside doc 33's 2032Q2–2033Q3):** F1 On Schedule 2032Q3, F2 The Wall 2033Q1,
F3 Closed Shell 2032Q4, F4 Cheap Ground 2033Q2 (`TRIGGER` in the script). The market paths bend at them; the Signals
files (M28) are authored around the same quarters.

**Never in the files:** the true orbital failure rate and useful life, the lunar grade (hidden files, doc 33 §6.8), the
future's name, phase, trigger or decoy.

### Columns carried from Act II–III (derived)

Every Act III quarterly column (`docs/act3-content/market_s*.csv`) continues to 2035Q4, because the carried systems read
them (renewals, density, nuclear PPAs, the covenant, hosting, valuation …):

- **Baseline (2031):** the mean of the four Act III scenarios' 2030Q4 values (derived).
- **Drift:** each column's own trend, the scenarios' mean change over 2030 (2029Q4 → 2030Q4), per quarter, clamped to
  −3% … +2% (derived). Levels, rates and indices (SOFR, spreads, cap rate, multiples, renewal and RFP indices, tenant
  probabilities, lead time, AI demand) hold their baseline instead.
- **The future's index (designed, doc 33 §6.2's "ground squeeze" and "who it rewards"):** multiplies a column group from
  2032Q1:

  | Group | F1 On Schedule | F2 The Wall | F3 Closed Shell | F4 Cheap Ground |
  |---|---|---|---|---|
  | Ground rents (GPU-hours, shell renewals and RFPs, EV per AI MW) | 1.08 by 2033Q1, held, then 0.85 by 2035Q4 (the flood) | 1.15 by 2033Q3, held | 1.04, 1.18 after the cascade, back to 1.05 | 1.03 to the trigger, then 0.80 |
  | Ground power prices | 1.05 by 2035 | 1.08 | 1.04 | 1.00 to the trigger, then 0.82 |
  | PJM capacity price | 1.15 by 2033Q3, 1.00 by 2035 | 1.25 | 1.10 | 1.05, then 0.60 |
  | Ground AI multiple | 1.15 by 2033Q3, then 0.95 | 0.80 | 0.75 after the cascade, back to 0.95 | 1.00, then 0.85 |
  | GPU and rack purchase prices | 0.85 | 1.00 | 0.95 | 0.95 |
  | High-yield and DDTL spreads (added, bps) | 0 | +40 from 2033Q1 | +150 at the cascade, +80 by 2034Q1, +50 by 2035Q4 | 0 |
  | Tenant default probabilities | 1.0 | 1.2 | 2.0 at the cascade, 1.5, then 1.2 | 1.0 |
  | AI demand index (added, capped 0–100) | +4 | −6 | −15 at the cascade, then −4 | +2 |
  | Hyperscaler capex | 1.2 | 0.95 | 0.85 after the cascade, back to 1.0 | 1.1 |
  | Nuclear PPA price | 1.0 | 1.05 | 1.0 | 1.0, then 0.9 |

- **Bitcoin (one path for every future; Bitcoin isn't part of the future):** the 2031 price is the scenarios' 2030Q4
  mean, then +2% a quarter (designed); difficulty +2.5% a quarter (designed); the sixth halving in 2032Q2 by the
  210,000-block schedule (the rule sourced, the quarter designed): subsidy 1.5625 → 0.78125. Hashrate and hashprice
  are derived with Act II's formulas (fee share 2%, designed). The weekly path runs smoothly from close to close with a
  small designed wiggle that is 0 at each close.
- **ASIC $/TH tiers (weekly):** the scenarios' last 2030 week, mean, then −3% a quarter (designed).
- **ETH:** held at Act II's last week (as in Act III; nothing mines or buys ETH after 2022).

### New Act IV columns

Each future's path is designed with anchors (act quarter, value), straight lines between them; identical through 2031.

| Column | Meaning | Values (2031 → 2035Q4) | Flag |
|---|---|---|---|
| `launch_usd_kg_leo` | Third-party launch price to low orbit, $/kg (the dominant launcher's list price) | 600 → F1 150, F2 600 (a promotional dip to 480 in 2032Q4–2033Q2 that doesn't stick), F3 350 (a spike to 700 after the cascade), F4 350 | 2031 and the 2035 ends sourced/derived (doc 33 §6.2, cost model §4b); the paths designed |
| `launch_slots_t_q` | Third-party tonnes a quarter on offer | 400 → F1 2,400, F2 800, F3 1,200 (300 after the cascade), F4 1,200 | designed |
| `sat_build_usd_kg` | Satellite build cost, $/kg | 800 → F1 500, F2 800, F3–F4 600 | sourced anchors (cost model), paths designed |
| `gen33_t_mw` | Gen 33's delivered mass, t per MW IT (blank before 2033Q1) | 14 (F2 16, heavier than announced) | derived (cost model's 2033 mass), F2 designed |
| `gen35_t_mw` | Gen 35's mass (blank until it ships; never in F2) | F1 10 from 2034Q3; F3, F4 11 from 2035Q1 | derived (doc 33 §6.2), dates designed |
| `insurance_capacity_usd_m` | Insurance capacity per launch, $M | 350 → F1 800, F2 500, F3 600 (300 after the cascade), F4 600 | 2026's ~$300M sourced [A]; the rest designed |
| `insurance_rate_young_pct` / `_mature_pct` / `_inorbit_pct` | Premiums: launch + first year (young / mature vehicle), in-orbit renewal, % of insured value a year | 7.5 / 3 / 2; F3 13 / 5 / 3.5 after the cascade | designed (doc 31 §3: market lore, not verified) — **research gap** |
| `congestion_sso` / `_high_leo` / `_high_orbit` | Congestion index per shell, 0–100 | SSO 55 → F1 90, F2 65, F3 95 at the cascade then 80, F4 70; high LEO 20 → 30–55; high orbit 5 → 8–20 | designed |
| `sso_closed` | 1 while the busy shell is closed to new launches | F3: 1 for 6 quarters from its trigger | designed (doc 33 §7.2: 4–8 ⚙) |
| `orbital_shell_rent_usd_mw_yr` | Orbital shell rent, $ per MW-year | 8.5M → F1 5.0M, F2 9.0M, F3 10.5M after the cascade then 8.5M, F4 6.0M | designed (priced off the cost model's 2031 platform cost) |
| `orbital_gpu_usd_hr` | Orbital GPU-hour price | 4.2 → F1 2.6, F2 4.3, F3 4.8 then 4.0, F4 2.8 | designed (cost model: orbit $3.66/GPU-hr in 2031) |
| `sovereign_premium_pct` | Sovereign tenants' premium over market rent, % | 20 → F1 15, F2 20, F3 30 then 25, F4 15 | designed |
| `grid_wait_q` / `gas_wait_q` | Quarters to a new grid connection / on-site gas | 20 / 8; F4 falls to 8 / 6 from its trigger | grid sourced (LBNL median > 5 years [A]) into designed paths |
| `space_ev_ebitda_mult` | The space multiple (market mood) | 22 → F1 30 then 20, F2 12, F3 9 at the cascade then 16, F4 10 | anchors sourced (doc 33 §11.3: CoreWeave ~25x, Iridium ~16x, SES ~6x [A]); paths designed |
| `lunar_delivery_usd_kg` | Earth → lunar surface delivery, $/kg | 40,000 → F1 15,000, F2 35,000, F3–F4 25,000 | inference ($10–50k/kg in the reusable era, doc 33 §9.6), paths designed |
| `lunar_llo_usd_kg` | Lunar surface → lunar orbit, $/kg | 8,000 → F1 3,000, F2 7,000, F3–F4 5,000 | designed — **research gap** |
| `landing_success_pct` | Lunar landing success, % (all futures) | 55 → 75 | designed (doc 33 §9.2; 2019–25 history ~38% [A]) |
| `lunar_offtake_surface_usd_kg` / `_llo_usd_kg` | Offtake prices for water/propellant on the surface / in lunar orbit, $/kg | 8,000 → 3,500–7,000; 2,500 → 1,000–2,500 | designed **[D]** (no priced lunar offtake exists) |
| `lunar_value_usd_t` | The market's value per tonne of lunar resource, for valuation | 2,000 → F1 2,500, F2 1,500, F3 4,000, F4 1,800 | designed **[D]** |

## The Signals files (M28.1)

**Generated, never hand-edited:** `npm run content:act4-signals` (`tools/act4/signals.ts`) writes both copies. Everything
in them is **designed** (doc 33 §6.3 ⚙): Signals are authored per future, never derived from the market files.

- **Six indicators** (0–100, 50 = the 2031 level or the plan): Launch Quotes (higher = launch getting cheaper faster than
  planned), Fleet Reliability (higher = orbital GPUs failing faster than the 8%-a-year plan), Orbital Congestion, Ground
  Power Squeeze, Compute Demand Gap (Act III's Revenue Gap, continued), Regulatory Climate.
- **Per quarter:** the displayed value (the true path plus a seeded noise of −6…+6 that depends only on the indicator and
  quarter, so it is the same in every future), the arrow (a move of 3 or more), and the sharp range Read the market reveals
  (the true value ± 3, with a note).
- **Day one:** every indicator shows 50 in 2031Q1–Q2 in every future; the paths bend 2–4 quarters before each future's
  trigger (`tools/act4/futures.ts`, the same quarters as the market files).
- **Hidden fields** (`future_name`, `reasoning`, `trigger`, `decoy`, `authoring_latent`, `role_tag`): the game's runtime
  schema drops them; only tests, tools and `act4End.ts` read them, through `src/content/signalsHiddenIv.ts`.
- **The triggers** (titles fictional): F1 "The Booster Hits Its Price" (2032Q3), F2 "The Constellation Cap" (2033Q1), F3
  "The Cascade at 550" (2032Q4), F4 "The Queue Breaks" (2033Q2); each names its event card (`iv_f*_c4`, M28.4).
- **The decoys** (doc 33 §6.3): F1 an Orbital Congestion scare (2031Q4–2032Q2, tempts the F3 reading); F2 a promotional
  Launch Quotes spike (2032Q1–Q3, tempts F1); F3 a Regulatory Climate rule that dies (2031Q4–2032Q2, tempts F2); F4 a
  Ground Power Squeeze spike on a record capacity auction (2031Q4–2032Q1, tempts F1).

## The hidden files (M28.3, doc 33 §6.8)

Hand-written (small), each read only by its own sim system and `act4End.ts` (plus tests and tools; a grep test checks):

- **`lunar_truth.json`** → `src/sim/systems/lunarGeology.ts`. Grade weights Rich 20 / Patchy 50 / Dry 30 (doc 33 §6.4 ⚙,
  designed); water by weight 5.6% / 2.5% / 0.6% (Rich anchored to LCROSS 5.6 ± 2.9% [A]; the others designed); pilot grade
  factor 1.0 / 0.5 / 0.15 (doc 33 §9.4 ⚙); resource per site 2.0 Mt / 0.8 Mt / 0.15 Mt (designed — **research gap**:
  Elvis et al.'s site counts); per-site variance (log sd 0.25) and prospect noise (log sd 0.45 first, 0.25 second, 0.10
  after a pilot has run two quarters) designed.
- **`orbit_truth_iv.json`** → `src/sim/systems/fleetReliability.ts`. Failures a year / useful life: F1 6% / 6 yr, F2 10% /
  4 yr, F3 7% / 5 yr, F4 8% / 5 yr (doc 33 §6.2 ⚙, owner default 9); the planning assumption 8% / 5 yr; telemetry noise
  3 yearly points (halved by the Space Operations Chief) designed.
- **`reading_score_iv.json`** (M32 wires it). Act III's scoring rules; ideal stances per doc 33 §6.7 (designed): F1
  offensive to 2033Q2, calm, cautious from 2034Q2; F2 cautious throughout; F3 calm, hedged 2032Q2–Q3, bold from the
  cascade (2032Q4); F4 calm, defensive from its trigger (2033Q2). Decoy windows as the Signals files; F3's decoy is two
  quarters (2031Q4–2032Q1) so it ends before F3's hedging begins (mine, reversible).

## The event cards (M28.4)

**Generated:** `npm run content:act4-events` (`tools/act4/events.ts`, where the cards are written) writes `events_iv.json`
and `text_iv.en.json` (the text table `t()` merges; keys `event.a4_<hash>.title / .body / .choice.cN`). All **designed**
(doc 33 ⚙); each card's `basis` names what it rests on.

- **Per future, 8:** signal cards before the trigger, the decoy card in the decoy window, the trigger card (`iv_f*_c4`,
  the Signals file's trigger title, in the trigger quarter), aftermath, recovery and winner cards.
- **Shared, 8:** the act's opening, the known timeline (doc 33 §19: an EU-analogue space act ~2031, the sixth halving
  2032Q2, new fission plants ~2032-33, a crewed south-pole landing, a lander accident, the constellation milestone rules,
  the Station partnership's polar outpost ~2035), all fictionalised.
- **The 5 lunar cards** of doc 33 §16 come with M30's lunar systems.
- **Effects:** only keys Act III's card engine already applies (cash, legal cost, Bandwidth, credit notch, debt spread, a
  corporate facility, political capital, Anger, tenant offers, a long-lease extension, idling old miners, speeding a
  project, a new hall). Orbit- and Moon-specific effects come with M29–M30.
- **Names:** fictional only (Pallas Heavy, Orrery Compute; the Station partnership); no real company, agency or country.

## The wildcards (M28.5, doc 33 §6.6)

Hand-written. Two of six drawn at the boundary (stream `act4_wildcards`), each firing once at the start of a quarter
drawn uniformly in its window (all **designed** ⚙): solar storm 2031Q3–2035Q2 (M29: blocks still climbing lose 40%,
operating blocks choose safe mode for 3 weeks or ride it and risk 3% of GPUs; doc 31's Feb 2022 and May 2024 storms [A]);
Flag on the Pole 2033Q1–2035Q2 (M30: extraction frozen 2–4 quarters for operators outside the bloc); launch grounding
2031Q2–2035Q2 (M29: the dominant launcher grounded 2–6 weeks, manifests slip a quarter); chip export clampdown
2032Q1–2034Q4 (M29: 4 quarters, the registry state matters); reactor delay 2032Q1–2033Q4 (M30: no leased lunar reactor
before 2036Q1); Bitcoin Supercycle 2031Q2–2035Q1 (M28: mining revenue × 2 for 3 quarters).

## The orbit content (M29.1, doc 33 §7–8)

`launch_providers.json` is hand-written; the other five come from `npm run content:act4-orbit` (`tools/act4/orbit.ts`).

- **Providers** (fictional, IV-D14): Pallas Heavy ×1.0 of the market's launch price, 1% failures, 10% slips, 15% bump
  chance in a tight quarter; Northgate ×0.9, failures 8% (2031) → 4% (2033) → 2% (2035), 35% slips; Kestrel ×1.6, 1.5% →
  1%, 5% slips, at most 250 t a booking; a sovereign partner's launcher ×1.15, 3% → 2%, 15% slips (M31). Failure rates
  sourced in shape (doc 31: ~1% mature, 5–15% under ten flights [A/inference]); the rest designed. Deposit 15%, booked
  2–6 quarters ahead (doc 33 §8.2 ⚙). A quarter is "tight" (Pallas may bump) when the market's third-party slots are
  under 1,000 t (designed); one booking can't exceed its quarter's slots less your other bookings there (designed).
- **Satellites:** sizes 5/10/25/50/100 MW; Gen 31 18 t/MW from 2031, Gen 33 and Gen 35 from the market files' columns
  (derived from the cost model's paths); GPUs $33M/MW with 20% spares and 600 GPUs/MW (sourced, the cost model); build 2
  quarters, ops $0.25M/MW-yr, design life 5 years (doc 33 ⚙, the model's G values); utilisation 85% contracted, 70% spot;
  spot shell rent 80% of market (designed).
- **Shells:** SSO ×1.0, high LEO ×1.3 with +10% shielding, high orbit ×2.5 with +30% shielding and no interactive
  inference (doc 33 §7.2; derived from the delta-v table). Debris: a live block's quarterly loss chance = 0.2% ×
  (congestion / 50)³, a loss costing 25% of its capacity; the cascade costs SSO blocks 40%; manoeuvring costs a quarter
  of life; a conjunction alert's chance is 0.25% per congestion point (all designed).
- **Insurance:** rates from the market files (designed, **research gap**); a young vehicle (≥ 3% failures) pays the
  young rate; a loss over $400M hardens the market for 4 quarters (rates ×1.75, capacity ×0.7; the trigger sourced in
  shape [A]); lenders need cover ≥ 50% of drawn debt (M31); the exposure warning above 15% of equity (doc 33 §8.3, §13).
- **Licences:** a filing costs 1 Bandwidth and $1M for 200 MW in one shell, approved in 2 quarters (+2 in one future after
  its trigger; +1 under the neutral registry; −1 for 10 political capital); milestones: 25% of the filed MW live by 2035Q2
  or the licence halves (the FCC's 2026 rules, simplified [A]); the export clampdown makes orbital cloud capex ×1.15
  outside the neutral registry (designed).
- **Tenants** (fictional names, for the owner's check): Aegis Sovereign Compute (5-year, + the sovereign premium, 20%
  prepaid), Tessellate Labs (3-year, ×0.95), Kite Inference (3-year, ×1.05, interactive: needs link units), Cormorant Earth
  Imaging (4-year, ×0.9, blocks up to 10 MW); 2 offers per block; late penalty 3% of the annual contract value a quarter
  (doc 33 §7.5, Act II's take-or-pay). Links: 1 unit per 5 MW of interactive work, rented at $0.8M a unit-year or from an
  optical ground station at one of your sites ($15M, 4 units, +3 Heat, 1 quarter, 1 Bandwidth) (designed).

## The lunar content (M30.1, doc 33 §9, §11.2–11.3, §12)

Both files come from `npm run content:act4-moon` (`tools/act4/moon.ts`). All values designed inside doc 33's ⚙ ranges.

- **Sites** (real lunar place names, IV-D28): the Shackleton connecting ridge (illumination 0.94, doc 33 §9.1 [C]), the de
  Gerlache ridge (0.85 [C]), Malapert, the Nobile and Haworth rims, Cabeus (ice-rich, poor light), the Amundsen rim and
  Leibnitz Beta; each with an ice-access factor (multiplies pilot output and the resource), the most kWe its ridge
  holds, and which bloc wants it.
- **Claims:** 1 Bandwidth, $5M, 5 political capital; held only once you land within 6 quarters. **Disputes:** 15 political
  capital to hold, or share (half the resource each), or withdraw. An unprospected claim is valued on an orbital
  estimate of 800,000 t (the same at every site and in every grade: it tells nothing).
- **Missions:** 1 Bandwidth; 2 t of payload at the market's delivery $/kg plus $60M of rover and drill (≈ $140M in 2031,
  inside doc 33's $100–250M); 3–5 quarters' lead; landing success from the market files; an aborted landing waits a
  quarter and costs $10M.
- **Valuation (doc 33 §11.3):** confidence inferred 0.2, indicated 0.5, measured 0.8; stage claim 0.2, pilot 0.3,
  production 0.5; $25M per site with landed hardware; offtake backlog weighted 0.5.
- **Power:** solar arrays of 25–200 kWe (60 kg/kWe delivered plus $1M/kWe of hardware; 2 quarters), output × the site's
  illumination; a leased 100 kWe reactor from 2034Q1 (the Accords bloc's strings; $50M set-up, $15M a quarter); a 1 MWe
  contract for delivery after 2035 from 2034Q1 ($50M), which the production decision needs.
- **Pilot:** 2 Bandwidth; needs an indicated resource and 100 kWe; $300M plus 8 t delivered; 7 quarters; output 1.2 t of
  water a year per kWe × 0.3 × the grade factor × ice access (doc 33 §9.4; B11); a fifth reaches lunar orbit; dust costs
  3% availability a quarter unless a $5M crew maintains it; measured after two quarters running.
- **Production:** 3 Bandwidth; $4B drawn over 24 quarters; first output 20–32 quarters after the decision (never in the act).
- **Offtake:** 2 Bandwidth; 2–10 t a year for 8 quarters at the market's surface price × 0.9–1.1, 20% prepaid.
- **Alerts:** a dust fault hits a running pilot 15% of quarters: repair for $10M or lose 10% availability.
- **Scripted claims** (`lunar_claims_iv.json`): the Accords bloc on the Shackleton ridge (2031Q3, lands 2032Q2) and
  Northgate on the de Gerlache ridge (2032Q1) in every future; then per future, after 2032Q2, Cratermark Resources, Jade
  Arc Constellation and the blocs on other rims (most crowded in the future where the Moon turns strategic).

## Data changes

(Every change to a delivered file is listed here, newest first.)

- **M30.1, 5 Oct 2026:** first version of `lunar_iv.json` and `lunar_claims_iv.json`.
- **M29.4, 5 Oct 2026:** `shells_iv.json` gains `debris.conjunction_accept_hit_share: 0.25` (accepting a conjunction's
  risk: the chance of a hit); `satellites_iv.json` gains `sale_share_of_value: 0.8` (a quick sale's discount). Designed.
- **M29.3, 5 Oct 2026:** `launch_providers.json` gains `tight_below_slots_t_q: 1000` (when the dominant launcher can bump).
- **M29.2, 5 Oct 2026:** `licences_iv.json` gains `approval_extra_from: "2033Q1"` (from when a future's extra approval
  time applies).
- **M29.1, 5 Oct 2026:** first version of the six orbit files.
- **M28.5, 5 Oct 2026:** first version of `wildcards_iv.json`.
- **M28.4, 5 Oct 2026:** first version of `events_iv.json` and `text_iv.en.json` (40 cards).
- **M28.3, 5 Oct 2026:** the three hidden files; `signals_iv_f3.json`'s decoy shortened to 2031Q4–2032Q1 (was to 2032Q2).
- **M28.1, 5 Oct 2026:** first version of the four Signals files. The market generator's trigger quarters moved into
  `tools/act4/futures.ts` (shared); the market files regenerate byte-identically.
- **M27.3, 5 Oct 2026:** first version of the eight market files.
