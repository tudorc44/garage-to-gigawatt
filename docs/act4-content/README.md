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

## Data changes

(Every change to a delivered file is listed here, newest first.)

- **M28.4, 5 Oct 2026:** first version of `events_iv.json` and `text_iv.en.json` (40 cards).
- **M28.3, 5 Oct 2026:** the three hidden files; `signals_iv_f3.json`'s decoy shortened to 2031Q4–2032Q1 (was to 2032Q2).
- **M28.1, 5 Oct 2026:** first version of the four Signals files. The market generator's trigger quarters moved into
  `tools/act4/futures.ts` (shared); the market files regenerate byte-identically.
- **M27.3, 5 Oct 2026:** first version of the eight market files.
