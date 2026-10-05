# Act IV scope: "The Race to Orbit" (2031Q1 → 2035Q4)

Source of truth for building Act IV, the way `docs/alpha-0.3-scope.md` is for the Prologue and doc 27 for Act III.
Written in M27.1 (5 Oct 2026) from the owner's unattended-run prompt (`docs/game-project-files/claude_34-act-iv-build-prompt.md`).

## 1. What is approved

- **Doc 33** (`docs/game-project-files/claude_33-act-iv-design.md`, v0.1) is approved as written: **Concept A** with the
  recommendations **IV-D1 to IV-D33**, except where §2 below sets a different default. Doc 33 wins over doc 32 (the
  concepts); doc 31 (the research dossier) and the cost model (`docs/act4-research/`) are the evidence behind it.
- Where the build has to differ from doc 33, the difference is recorded in §6 "Changes from doc 33" (as doc 27 §17 does
  for Act III). Nothing else may differ silently.

## 2. The owner's defaults for doc 33 §22's open questions

| # | Question | Default |
|---|---|---|
| 1 | The Moon | As designed: land, local sales and valuation inside the act; the orbital payoff only in the "after 2035" panel and the epilogue. No acceleration, no longer act. |
| 2 | Pallas bumping your payloads | On, at doc 33's rates; no difficulty setting. |
| 3 | Lunar prices and value per tonne | Designed values, flagged [D] in the data. |
| 4 | Lunar grade | A separate hidden draw, as designed. |
| 5 | "Start at Act IV" | The same unlock rule as "Start at Act III". |
| 6 | Epilogue | Text only, no projected numbers. |
| 7 | High orbit | A generic "high orbit" with doc 33's designed multipliers; no ITU slot mechanic. |
| 8 | Insurance rates | Doc 33's designed values. |
| 9 | Orbital GPU life and failures | Doc 33 §6.2's values. |
| 10 | Marketing page | Out of scope for this run. |
| 11 | Scenario Mode carry-over | Allowed; the finale labels the campaign "scenario known". |
| 12 | Number of futures | Four. |
| 13 | Era theme | A light `orbit` theme in the paper-ledger family of the other eras (not doc 33 §2's dark theme). |
| 14 | Research gaps (doc 31 §3) | No new research in this run; designed placeholder values, labelled "research gap" in `docs/act4-content/README.md`. |
| 15 | Training across satellites | Left out of Act IV entirely (doc 33 §7.4's late F1 unlock is dropped). |
| 16 | Rival names | Orrery Compute, Jade Arc Constellation and doc 33's other names are working names, listed for the owner's name check in the run's final report. |

## 3. Rules for building Act IV

- **Content values, in this order:** (1) doc 33, including its ⚙ first-pass values; (2) doc 31 and the cost model's
  results; (3) the existing Act II–III content files, for every column the carried systems read; (4) if still missing, a
  value designed inside the ranges doc 33 or doc 31 give, labelled *designed* in `docs/act4-content/README.md` and
  "(mine, reversible)" in dev-notes. A missing number is never a reason to stop.
- **Content files:** every Act IV file has a Zod schema, lives in `docs/act4-content/` with a byte-identical copy in
  `src/content/` (a test checks it), and every column or field is flagged *sourced*, *derived* or *designed* in the README.
- **Game text:** all through `t()`; fictional companies and blocs only; no new real company, agency or country names in
  game text (IV-D28); real lunar place names are allowed; a real-world fact appears in game text only where doc 31
  supports it.
- **Honesty invariants, each with a test:** no production-plant output inside the act; no in-act cut to orbital costs
  from lunar supply; every market value the UI can show is identical across the four futures in 2031Q1–Q2 and within 3%
  through 2031Q4 (B14); the seam glide ends on the common 2031 baseline.
- **Hidden files** (doc 33 §6.8): `reading_score_iv.json`, `lunar_truth.json` and `orbit_truth_iv.json`, each read only
  by its own sim system and `act4End.ts` (plus tests and tools). The grep test and the leak-guard tests cover them: no
  Act IV screen shows a future's name, trigger, decoy, the true orbital reliability or the true lunar grade before the
  chapter report.
- **Earlier acts don't change:** Act I–III goldens unchanged; `npm run sim -- --act2 --act3` CSVs byte-identical; new
  Act IV randomness only on new substreams of `act4Seed`.
- **Test builds only** (the Act III production gate): a `?future=` forcing with its top-bar tag, and "Act IV preview (test
  build)" quick-start companies (doc 33's three presets). The gate test covers them; production refuses such saves.
- **UI:** no Act IV wireframes exist. Each doc 33 §17 screen extends the nearest built screen (Deal builder, Signals
  panel, Government screen, Act III chapter report) with the design-system tokens and components; a short layout note per
  screen goes in `docs/wireframes/act4/README.md`. 1024 px and up, no sideways scroll, nothing cut off; Act IV screens in
  their own lazy chunk; the main bundle under 500 KB.

## 4. The milestone plan (doc 33 §19's build order)

Each milestone is a branch made from the previous one (`m27` from `main`, `m28` from `m27`, …), since the owner doesn't
merge during the run. The sub-steps are written into `docs/dev-notes.md` before each milestone starts; the list below is
the plan.

- **M27, setup and walking skeleton.** M27.0 the design docs committed; M27.1 this scope doc and the CLAUDE.md updates;
  M27.2 the act-aware refactor (`act: 4`, `inActIV`, `inAct2Rules` and `covenantBreached` extended, save version 5 with its
  migration, the timeline to 2035Q4 = quarter 75, `act4Seed`, `act4Entry`); M27.3 `docs/act4-content/` with its README and
  the four quarterly and four weekly market files (the common 2031 baseline, the Act II–III columns continued), their
  schemas, loader and copy test, and the B14 test; M27.4 the Act III → IV boundary (carry-over and boundary rules, doc 33
  §3.1–3.2), the future draw and the seam glide; M27.5 the 20 playable quarters with the ground systems running and a stub
  chapter report; M27.6 the screens: the light `orbit` theme, "Continue to Act IV", A4-01, the test-build quick starts and
  `?future=`; M27.7 the byte-identity check and the M27 report.
- **M28, the hidden future.** The futures draw; `signals_iv_f1..f4` (six indicators, one decoy each, triggers in
  2032Q2–2033Q3); `events_iv` (about 45 cards); `wildcards_iv` (2 of 6 drawn); the lunar-grade draw; the three hidden
  files and their guards; A4-02 Plan dashboard additions (three MW columns, Signals, exposure warnings).
- **M29, orbit.** Orbital blocks on the Deal Desk (Launch / Tenant / Capital slots; shell and cloud kinds; sizes;
  satellite generations); the three shells and congestion; launch providers and manifests (bookings, slips, bumps,
  failures, rebooking); insurance and the hard market; licences and registries with political capital; workloads and link
  units with optical ground stations (no cross-satellite training); orbital tenants; fleet telemetry from
  `orbit_truth_iv`; the solar storm and launch grounding wildcards; the orbit interrupts; screens A4-03, A4-04, A4-05 and
  A4-08.
- **M30, the Moon.** About 8 sites, claims, disputes, prospect missions and landings, resource categories (measured only
  after a pilot has run two quarters), lunar power (no reactor before 2034), pilot plant output per doc 33 §9.4, the
  production decision with output only after 2035, offtake, dust and night, the Flag on the Pole and Reactor Delay
  wildcards; screens A4-06 (with the "after 2035" panel) and A4-07.
- **M31, money and rivals.** ECA loans, orbital project debt with the insurance covenant, sovereign co-funding, the
  space-equity window, the lunar funding rules, valuation with the three unit types (doc 33 §11.3), fire-sale haircuts,
  the five fictional rivals and the league, the two blocs, the four new hires and Bandwidth; screens A4-09 and A4-10.
- **M32, scoring, finale and balance.** The reading score (`reading_score_iv`), `act4End` and the chapter report A4-11
  (future and lunar grade revealed); the campaign finale A4-12, built only from records the game already keeps (doc 33
  §15.2); the three presets generated by the sim, and A4-13; Scenario Mode for Act IV; the seven bot archetypes,
  `npm run sim -- --act4` and a B1–B14 table; goldens `act4-f1..f4`; then the balance pass (⚙ values tuned inside doc
  33's ranges, at most 3 rounds, each recorded; a target that can't be met is reported as MISS with the reason).

## 5. Acceptance targets (doc 33 §18) and the cut order (doc 33 §19)

Founder net worth multiple, 2035Q4 ÷ Act IV entry, medians, over the seven archetypes × three presets × four futures ×
three lunar grades:

| # | Target |
|---|---|
| B1 | Per (future × lunar grade) cell, 12 cells: no archetype best in every cell; Ground Holder, an orbit archetype and Lunar Bettor each best, or within 10% of best, in at least one cell |
| B2 | F1: Orbit Sprinter ≥ 1.3 × Ground Holder |
| B3 | F2: Ground Holder ≥ 1.2 × Orbit Sprinter |
| B4 | F3: Orbit Diversified ≥ 1.25 × Orbit Sprinter; Lunar Bettor ≥ Orbit Sprinter |
| B5 | F4: Ground Holder best; Orbit Sprinter's game-over rate ≤ 40% |
| B6 | Rich: Lunar Bettor ≥ 1.2 × Balanced; Dry: Lunar Bettor ≥ 0.7 × Balanced, game overs ≤ 25% |
| B7 | The Ground Fortress preset, played passively, never goes bust in any future |
| B8 | A perfect reader ≥ 1.15 × passive in at least 3 of 4 futures; the over-reactor ≤ 0.97 × passive in every future |
| B9 | In every future the ideal stance and the economics agree (the perfect reader is never below passive) |
| B10 | Orbital cost ratios match the model: every future 1.5–1.65x in 2031; 2033 base 1.2–1.5x; F1 2035 0.85–1.0x; F2 2035 1.6–1.9x; F3 and F4 2035 1.1–1.25x (SSO) |
| B11 | Pilot water by 2035Q4 at a first-opportunity schedule: Rich 15–60 t/yr, Patchy 5–30, Dry 0–8; no production output in the act; no in-act lunar cut to orbital costs |
| B12 | No single launch failure forces a sale or breaks the covenant of a company inside the 15% uninsured line and the Plan screen's cash and headroom warning |
| B13 | ≤ 20 Plan phases, 3–6 decisions each; about 55–60 min |
| B14 | Every market value the UI can show is identical across the four futures in 2031Q1–Q2 and within ±3% through 2031Q4 |

**Cut order if Act IV runs long:** 1. wildcards → 2. optical ground stations and link units (a flat orbital opex) →
3. licence detail (a fee and a wait) → 4. sovereign co-funding variants → 5. the production decision (keep the pilot) →
6. the decoy → 7. high LEO. **Never cut:** the hidden future and Signals, orbital blocks with the launch manifest, the
lunar claim → prospect → pilot chain, carry-over from Act III, the chapter report with the reveal, the campaign finale.

## 6. Changes from doc 33

Every place the build differs from doc 33, with the reason. (Added to as the build goes.)

1. **Era theme (§2):** a light `orbit` theme in the paper-ledger family, not a dark "mission control" theme (owner default 13).
2. **Training across satellites (§7.4, IV-D18):** not offered at all; the late F1 unlock is dropped (owner default 15).
3. **High orbit (§7.2):** a generic "high orbit" with the designed delivery and shielding multipliers; no ITU slot
   coordination (owner default 7).
4. **Research gaps (§16's closing list, doc 31 §3):** filled with designed placeholders labelled "research gap" in the
   content README, not researched (owner default 14).
5. **Scenario Mode carry-over (§2, open question 11):** an Act III Scenario Mode run may continue into Act IV; the finale
   labels that campaign "scenario known" (owner default 11).
6. **The common baseline (§3.3, B14):** the four futures' market files are identical through all of 2031 (doc 33 allows
   up to 3% apart in 2031Q3–Q4) and diverge from 2032Q1, so the seam glide ends exactly on the common baseline. The Signals
   still start moving from 2031Q3 (M28). Reason: one target for the glide, and B14 holds with no margin to tune. (M27.3)
7. **The seam glide's length (§3.3):** doc 33 says the gap closes "in equal steps over 4 quarters (2031Q1–2031Q4)" with
   2031Q1 equal to the Act III value; the build reads that as the four quarters 0–3 with three equal steps, so 2031Q4 is
   the baseline (`BALANCE.act4.seamGlideQuarters` = 3). (M27.3)
8. **The glide is computed when the game loads, not stored:** the market files hold each future's own path; the game
   builds the 16 glided markets (Act III scenario × future) at load, so no file depends on how the player's Act III went.
   (M27.3)
9. **Stored log text in Acts I–III:** a log line in an Act I–III game that names a quarter past 2030Q4 still shows "—"
   (it did before Act IV's quarters existed), so no earlier act's golden or sim output changes; Act IV games label every
   quarter. (M27.3)
