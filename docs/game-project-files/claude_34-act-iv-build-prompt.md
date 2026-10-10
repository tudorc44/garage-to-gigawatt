# 34: Act IV build prompt for Claude Code (unattended batch run, M27-M32). 5 Oct 2026

*Design thread. A copy-paste prompt for Claude Code that builds Act IV from doc 33 in one unattended run. Pasting it approves doc 33's recommendations IV-D1 to IV-D33 and sets a default for each of doc 33 §22's open questions (section 1 of the prompt). Edit those defaults before pasting if any is wrong. Start the Claude Code session from the G2G project so it can read docs 31-33 and the cost model.*

---

```text
Act IV build: "The Race to Orbit" (M27 to M32), unattended batch run

I'm away for the evening and can't answer anything. Run in batch mode (CLAUDE.md) from start to finish: never ask me a question, never wait for input, never pause between sub-steps or milestones. Where you would normally ask, decide by the rules below, label the decision "(mine, reversible)" in dev-notes and keep going. Keep going until every milestone below is done or the session is about to end. Whenever you stop, the branch must be green, committed and pushed, and dev-notes must say exactly where to pick up.

## 0. Start
- `git pull`, read CLAUDE.md, then docs/dev-notes.md.
- Branch: if `m26` is merged into main, make `m27` from main; if `m26` exists (locally or on origin) and isn't merged, make `m27` from `m26`; if `m26` can't be found, make `m27` from main and note it in dev-notes. Each later milestone branch (m28, m29 ...) is made from the previous one, since I won't merge during this run.
- `npm install`, then `npm run lint`, `npm test` and `npm run build` for a baseline. If the baseline isn't green, record what fails under STOPPED and don't fix anything outside Act IV.
- Get the design docs. They are in the claude.ai Project "G2G": `claude/claude_31-act-iv-research-dossier.md` (the evidence), `claude/claude_32-act-iv-concepts.md` (the concepts), `claude/claude_33-act-iv-design.md` (the design: build this), `claude/act4-research/orbit_cost_model.py` and `claude/act4-research/results.md` (the cost model). If you have the Projects tool, read them with project_read; otherwise look for them in docs/game-project-files/ and docs/act4-research/. Copy them into the repo with Read and Write: the three docs into docs/game-project-files/ under the same file names (read-only references, like docs 27-30), the model and its results into docs/act4-research/. If you can't get doc 33 at all, STOP the whole run and say so in your final message: it is the one thing you can't work without.

## 1. What I approve (this replaces the design thread's approval step)
- Doc 33 is approved as written, with the defaults below where they differ: build Concept A with recommendations IV-D1 to IV-D33. Doc 33 wins over doc 32; doc 31 and the cost model are the evidence behind it.
- Defaults for doc 33 §22's open questions:
  1. The Moon: as designed (land, local sales and valuation inside the act; the orbital payoff only in the "after 2035" panel and the epilogue). No acceleration, no longer act.
  2. Pallas bumping your payloads: on, at doc 33's rates; no difficulty setting.
  3. Lunar prices and value per tonne: designed values, flagged [D] in the data.
  4. Lunar grade: a separate hidden draw, as designed.
  5. "Start at Act IV": the same unlock rule as "Start at Act III".
  6. Epilogue: text only, no projected numbers.
  7. High orbit: a generic "high orbit" with doc 33's designed multipliers; no ITU slot mechanic.
  8. Insurance rates: doc 33's designed values.
  9. Orbital GPU life and failures: doc 33 §6.2's values.
  10. Marketing page: out of scope for this run.
  11. Scenario Mode carry-over: allowed; the finale labels the campaign "scenario known".
  12. Four futures.
  13. Era theme: a light `orbit` theme in the same paper-ledger family as the other eras (not the dark theme in doc 33 §2).
  14. Research gaps (doc 31 §3): no new research in this run; designed placeholder values labelled "research gap" in the content README.
  15. Training across satellites: left out of Act IV entirely (drop the late F1 unlock in doc 33 §7.4).
  16. Rival names: keep Orrery Compute, Jade Arc Constellation and the other doc 33 names as working names; list them for my name check in the final report.

## 2. Rules for this run (they override CLAUDE.md where they differ; everything else in CLAUDE.md still holds)
- Write `docs/act4-scope.md` first (M27.1): that this run approves doc 33, the defaults above, the milestone plan below with its sub-steps, the acceptance targets B1-B14 (doc 33 §18) and the cut order (doc 33 §19). It plays the role alpha-0.3-scope.md plays for the prologue and doc 27 plays for Act III. Add it and doc 33 to CLAUDE.md's scope guard and key-docs list, update CLAUDE.md's status line ("Act IV is not designed"), and add an "Act IV rules that must hold" block (hidden files, leak guard, no lunar output or lunar cost cut inside the act, the common 2031 baseline). Every place the build has to differ from doc 33 goes in a "Changes from doc 33" section of act4-scope.md, the way doc 27 §17 records Act III's changes.
- Content values, in this order: (1) doc 33, including its ⚙ first-pass values; (2) doc 31 and the cost model's results; (3) the existing Act II-III content files, for every column the carried systems read; (4) if still missing, design a value inside the ranges doc 33 or doc 31 give, label it designed in docs/act4-content/README.md and "(mine, reversible)" in dev-notes. A missing number is never a reason to stop.
- Every Act IV content file gets a Zod schema, lives in docs/act4-content/ with a byte-identical copy in src/content/ (extend the copy test), and each column or field is flagged sourced, derived or designed in the README, as in docs/act3-content/.
- Game text: all through t(); fictional companies and blocs only; Act IV adds no new real company, agency or country names to game text (IV-D28); real lunar place names are allowed; a real-world fact appears in game text only where doc 31 supports it.
- Honesty invariants, each with a test: no production-plant output inside the act; no in-act cut to orbital costs from lunar supply; every market value the UI can show is identical across the four futures in 2031Q1-Q2 and within 3% through 2031Q4 (B14); the seam glide ends on the common 2031 baseline.
- Hidden files (doc 33 §6.8): `reading_score_iv.json`, `lunar_truth.json` and `orbit_truth_iv.json`, each read only by its own sim system and `act4End.ts` (plus tests and tools). Extend the grep test and the leak-guard tests so no Act IV screen shows a future's name, trigger, decoy, true orbital reliability or true lunar grade before the chapter report.
- Earlier acts must not change: Act I-III goldens unchanged, and the `npm run sim -- --act2 --act3` CSVs byte-identical (run that check detached at the end of M27 and again at the end of the run). New Act IV randomness only on new substreams of act4Seed.
- Test builds only, behind the same production gate as Act III: a `?future=` forcing with its top-bar tag, and "Act IV preview (test build)" quick-start companies (doc 33's three presets), so Act IV can be played without three acts first. Extend the gate test; production refuses such saves.
- UI: no Act IV wireframes exist. Build each screen in doc 33 §17 by extending the nearest built screen (Deal builder, Signals panel, Government screen, Act III chapter report), with docs/design-system/ tokens and components, and write a short layout note per screen in docs/wireframes/act4/README.md. 1024 px and up, no sideways scroll, nothing cut off; Act IV screens in their own lazy chunk; the main bundle under 500 KB. Check each screen in a browser the way earlier milestones did.
- STOP only for: a new dependency; breaking an architecture rule or an Act III rule; a change to an Act I-III golden or to the byte-identity check; tests still failing after 3 honest attempts. Record it under STOPPED and carry on with any sub-step that doesn't depend on it. Everything else: decide, log, continue.
- Push: I'm asking for it now. After every sub-step commit, `git push -u origin <milestone branch>`. Never push main, never force-push, never rewrite history, never touch staging/.
- Sims: the Act IV sim runs only at the end of M32 (unless a sub-step exists to check balance), started detached as before.

## 3. Milestones (doc 33 §19's build order; split each into sub-steps M<n>.<k> yourself and write the split into dev-notes before starting it)
- M27 (branch m27), setup and walking skeleton: act4-scope.md and the CLAUDE.md updates; the act-aware refactor (act: 4, inActIV, inAct2Rules and covenantBreached extended to act 4, save version 5 with its migration and the save test's new-field list, the timeline to 2035Q4 = quarter 75, act4Seed, act4Entry); carry-over and boundary rules exactly as doc 33 §3.1-3.2, re-checked against state.ts; docs/act4-content/ with its README and the four quarterly market files (common 2031 baseline, seam glide, the Act II-III columns continued to 2035Q4) plus the weekly files; the light `orbit` era theme; "Continue to Act IV" from the Act III chapter report, then A4-01 intro, then 20 playable quarters with the ground systems running, then a stub chapter report; the test-build quick-starts.
- M28 (m28), the hidden future: the futures draw; signals_iv_f1..f4 (six indicators, one decoy each, triggers in 2032Q2-2033Q3); events_iv (about 45 cards); wildcards_iv (2 of 6 drawn); the lunar-grade draw; the three hidden files and their guards; A4-02 Plan dashboard additions (three MW columns, Signals, exposure warnings).
- M29 (m29), orbit: orbital blocks on the Deal Desk (Launch / Tenant / Capital slots; shell and cloud kinds; sizes; satellite generations); the three shells and congestion; launch providers and manifests (bookings, slips, bumps, failures, rebooking); insurance and the hard market; licences and registries with political capital; workloads and link units with optical ground stations (no cross-satellite training); orbital tenants; fleet telemetry from orbit_truth_iv; the solar storm and launch grounding wildcards; the orbit interrupts; screens A4-03, A4-04, A4-05 and A4-08.
- M30 (m30), the Moon: about 8 sites, claims, disputes, prospect missions and landings, resource categories (measured only after a pilot has run two quarters), lunar power (no reactor before 2034), pilot plant output per doc 33 §9.4, the production decision with output only after 2035, offtake, dust and night, the Flag on the Pole and Reactor Delay wildcards; screens A4-06 (with the "after 2035" panel) and A4-07.
- M31 (m31), money and rivals: ECA loans, orbital project debt with the insurance covenant, sovereign co-funding, the space-equity window, the lunar funding rules, valuation with the three unit types (doc 33 §11.3), fire-sale haircuts, the five fictional rivals and the league, the two blocs, the four new hires and Bandwidth; screens A4-09 and A4-10.
- M32 (m32), scoring, finale and balance: the reading score (reading_score_iv), act4End and the chapter report A4-11 (future and lunar grade revealed); the campaign finale A4-12, built only from records the game already keeps (doc 33 §15.2); the three presets generated by the sim, and A4-13; Scenario Mode for Act IV; the seven bot archetypes, `npm run sim -- --act4` and a B1-B14 table; goldens act4-f1..f4. Then the balance pass: tune ⚙ values inside doc 33's ranges, at most 3 rounds, each round recorded; a target you can't meet is reported as MISS with the reason.

## 4. When you stop (end of the run, or the session is about to end)
- Leave the branch green, committed and pushed; dev-notes' "Next" names the exact sub-step that comes next, so a new session can continue with "continue the Act IV run from dev-notes".
- Final message, in plain language and short: what was built per milestone, with the commit list; how I can see it (the test-build quick-start and the clicks); test, golden and byte-identity results; the B1-B14 table if M32 ran; every STOPPED item; and a separate "Report for the design thread" block listing the "(mine, reversible)" decisions that change gameplay or numbers, every change from doc 33, and the rival names for my check.
```
