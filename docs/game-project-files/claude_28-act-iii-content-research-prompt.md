# Deep research task: Act III content and data pack for "Garage to Gigawatt"

*(Paste everything below this line into a new thread attached to the "Game project" Project. It's written to run in one go.)*

---

## Your role and the goal

You are the research lead and content designer for a solo-developed, AI-assisted web game called **Garage to Gigawatt**. It's a grounded, finance-first business simulation. **Act I (crypto miner, 2017 → the 2022 Merge) and Act II (the AI pivot, 2022Q4 → 2026Q4) are both built and balanced.** The developer is now starting **Alpha 0.4: Act III, "Reckoning", 2027Q1 → 2030Q4 (16 quarters).**

Act III's premise is different from Acts I and II. **At the start of the act, the game secretly draws one of four "macro scenarios"** for how the AI-infrastructure boom resolves between 2027 and 2030. The player is never told which. They read weak, semi-reliable **Signals** and decide how to hedge: lock in contracts early, stay flexible, lever up, delist, build nuclear, and so on. Roughly 2–4 quarters before each scenario's trigger event, the world starts to tip its hand.

Because everything from 2027 onward is genuinely unknown, **this pack is explicitly speculative fiction, not history.** Your job is not to find out what happened (nobody knows yet); it's to build **four internally consistent, plausible, well-reasoned futures**, each grounded in real 2024–2026 data, real published forecasts (IEA, McKinsey, company guidance, analyst notes), and the real mechanics already established in Acts I and II — and to write them so a developer (working with Claude Code) can load them straight into the game.

Work through the whole task in one go. Don't stop to ask clarifying questions. Where something is ambiguous, pick the most sensible option consistent with the frozen design, state it as an assumption, and carry on.

---

## Step 0: Read the project docs first, in this order

1. `claude/27-act-iii-design.md`: **the frozen Act III design (v1.0). It is the single source of truth.** Every decision D1–D17 in it is final; do not revisit them. Everything you produce must fit it.
2. `claude/08-extended-universe-2017-2035.md` §4–5: the real scheduled-future timeline and the **five scenario write-ups** (S0–S5) this pack draws four of (S1–S3 plus the baseline S0; S4 Silicon Shock and S5 Grid Crisis are NOT in Act III — ignore them for this pack, they're Act IV's). §5's "scenario × asset matrix" is a useful sanity check for what each scenario should reward.
3. `claude/20-alpha-0.2-scope.md` (or `claude/act2-content/19-act-ii-content-pack.md`): **Act II's frozen mechanics and content pack.** Match its tone, its file conventions, and its balance-anchor style. The credit rating, valuation formula, projects/slots system, GPU generations and regions all carry into Act III unchanged except where doc 27 adds to them.
4. `claude/act2-content/` (`market_quarterly.csv`, `capital_act2.json`, `gpus.json`, `regions.json`, `rivals_act2.json`, `tenants.json`): **Act II's real, live 2026Q4 end-state and file formats.** Act III's four scenario market files must each start from a **continuous, unforced handoff** at 2026Q4 — read Act II's last quarter's numbers (BTC price, hashprice, GPU rental rates, cap rates, era multiples, the rivals' positions) and have every scenario's 2027Q1 opening value connect smoothly to it, before any scenario diverges.
5. `docs/act3-carryover-audit.md` (if you can reach the code repo; otherwise skip) or §13 of doc 27: what the code can and can't do cheaply. It affects nothing you write, but explains why Signals must be **authored** rather than computed from the market (§ below).

---

## The game in brief, and what's new in Act III (for context)

- **Loop (unchanged):** Plan phase (spend Bandwidth and money) → live quarter (13 weekly ticks, up to 3 interrupts) → quarter report. Bandwidth: base 4 carried from Act II, same rules for gaining more.
- **Carries from Act II:** cash, debt, credit rating, every project and its tenant, GPU fleets and know-how, hires, treasury, the rivals and league, Community Heat (does NOT reset this time) and Ratepayer Anger.
- **The hidden scenario draw (D2, D3):** one of four scenarios, weighted S0 25% / S1 30% / S2 25% / S3 20%, drawn secretly at 2027Q1. Its trigger event lands 2027Q3–2028Q4. Signals start moving 2–4 quarters before the trigger.
- **The Signals panel (D4):** six indicators, 0–100 with a trend arrow: **Revenue Gap, Lender Spreads, Chip Lead Times, Grid Reserve Margin, Efficiency Index, Bitcoin Hashprice.** Each scenario moves 2–3 of them meaningfully; the rest drift near a neutral baseline. **One decoy per campaign**: an indicator moves for a reason unrelated to the real scenario (a false alarm) — so the player can't just read the panel like an answer key. A "Read the market" action (1 Bandwidth) reveals a precise authored range for one chosen indicator that quarter, instead of just its trend arrow.
- **The renewal wall (D5, D6):** every Act II contract has a real end date. As leases and GPU contracts mature during Act III, the player renegotiates them at a price set by the scenario's repricing table, using the same tenant-negotiation mechanic as Act II.
- **Density cliff (D6):** two new GPU generations, Rubin (2026H2) and Rubin Ultra (2027H2), the latter needing a higher rack-density hall; a retrofit project upgrades a hall. Feynman (2028) is a flavour-only obsolescence event, not a new density tier.
- **Nuclear PPA (D7):** a new Power-slot option from 2027H2: higher price, no grid queue, a fixed 15-year term.
- **Political capital (D8, D9):** a new 0–100 meter, earned via a Government Affairs Lead hire and lobbying actions, spent on cards (override a moratorium, fast-track a permit). No other new stakeholder meters.
- **Wildcards (D10):** a pool of 4 (sovereign AI boom, SMR delay, water crisis, bitcoin supercycle); 2 are drawn per campaign, independent of the main scenario.
- **Rivals (D11):** the same Act II rivals (Core Scientific, IREN, Hut 8, Cipher, CoreWeave) continue; each scenario scripts a fate for at least two of them.
- **Ending:** the Act III chapter report reveals which scenario it secretly was, how many quarters ahead of the trigger the player's big moves came, net worth, survival, and title bands (extending Act II's).
- **Tone:** unchanged — grounded, lightly wry, never cartoonish. Real company names in data files only; no real people in events; no logos. **Because Act III is speculative fiction about the real world**, be careful with anything that reads as a factual prediction about a named real company's future distress or failure — flag it for review rather than stating it as fact (doc 27 D15).

---

## Why Signals must be authored, not derived (read this before writing them)

In Acts I and II, "Read the market" (and every dashboard number) reads the real underlying market file and shows it plainly or lightly blurred. **That approach cannot be reused for Act III's Signals**, because the market file the game reads to compute prices IS the scenario — reading it plainly would tell the player which scenario they're in immediately, destroying the entire hidden-scenario mechanic.

So for Act III, **you are authoring two separate outputs per scenario**: (1) the real underlying market/event data the sim uses to compute cash flows, prices, rents, etc. (this can and should differ meaningfully between scenarios, since it's what actually happens); and (2) a separate, deliberately imperfect **Signals series** — six indicators by quarter, each a number 0–100 that a player *could* plausibly read from public information (spreads, chip lead times, grid margins, and so on), calibrated so it moves believably ahead of the real event but never with total clarity, and including the one decoy per campaign that moves for an unrelated reason. Signal values and underlying market values are correlated but not identical — that gap is what makes reading a skill instead of a lookup.

---

## What to research and design, per scenario

Do this **four times**, once for each of **S0 Muddle Through, S1 Great Repricing, S2 Lift-Off, S3 Efficiency Shock** (doc 08 §5 has the seed description of each; expand it into a full, internally consistent future). For every number, say whether it's **grounded** (extrapolated from real, cited 2024–2026 data or a named published forecast) or **designed** (invented for game balance, with your reasoning). Nothing in this pack can be "sourced" in the sense of a real historical fact, since none of it has happened — the bar instead is *defensible*: could a knowledgeable person believe this future was plausible in Sep 2026?

### A. The scenario market file, 2027Q1 → 2030Q4 (16 quarters; weekly where Act II's format is weekly)
For each scenario, continuing smoothly from Act II's real 2026Q4 values:
1. Bitcoin: weekly price, difficulty, hashrate, subsidy (the ~Apr 2028 halving, 3.125 → 1.5625), hashprice. S0/S3 roughly track a continuation of recent trend; S1 crashes with crypto-adjacent credit; S2 may rally on infrastructure demand for flexible load.
2. GPU compute: H100/H200/B200/GB200 and the two new generations (Rubin 2026H2, Rubin Ultra 2027H2) hyperscaler / neocloud / spot / 1–3-year contract rental prices; purchase prices; allocation lead times. Rubin Ultra's rack-density requirement (kW/rack) vs. the prior generations'.
3. Build costs per MW by conversion type and by quarter, including a **retrofit-to-Rubin-Ultra-density** cost.
4. Financing: SOFR path, credit spreads by rating, DDTL spreads, cap rates (S0 compress slowly; S1 widen sharply at the trigger; S2 compress further; S3 drift down).
5. Era multiples: mining and AI-infrastructure series, continuing Act II's 2026Q4 values, diverging by scenario after the trigger.
6. AI demand index (0–100), continuing Act II's method, moving with the scenario.
7. Power prices by the six Act II region tags, plus one line on where nuclear PPA availability sits regionally (Virginia/PJM is the natural first market, per doc 08's Crane/Microsoft precedent).
8. **Renewal repricing table** for this scenario (the specific % ranges within doc 27's accepted bands: S0 −20/−30%, S1 −40/−60% + defaults, S2 flat/+10%, S3 −30/−40% + shorter terms), by quarter, and which tenant types default or walk in this scenario and when.

### B. The Signals series for this scenario
1. For each of the 6 indicators (Revenue Gap, Lender Spreads, Chip Lead Times, Grid Reserve Margin, Efficiency Index, Bitcoin Hashprice), a quarter-by-quarter value 2027Q1–2030Q4 (0–100) and a trend arrow, calibrated so that: 2–3 indicators clearly move in this scenario's signature direction starting 2–4 quarters before the trigger; the rest stay near a shared neutral baseline (so the same baseline works across all four scenarios, or note where it must differ and why).
2. The sharper "Read the market" range for each indicator each quarter (a tighter band around the true direction, revealed only when spent).
3. **Exactly one decoy indicator movement in this scenario**: which indicator, which quarter(s), how large, and what in-fiction reason explains it (unrelated to the real trigger).
4. The **trigger event**: exact quarter (within 2027Q3–2028Q4), a one-paragraph narrative of what happens, and its immediate mechanical effect (on cash flows, tenant behaviour, cap rates, GPU rents — cross-reference section A).

### C. Scripted cards for this scenario
6–10 event cards specific to this scenario (in Act II's `events.json` format: id, title, trigger/condition, body ≤ 60 words, 2–3 choices with effects in game variables, a default choice). Include the trigger-event card itself, at least one card that could be mistaken for a different scenario (reinforcing the decoy), and 1–2 that let a well-hedged player capitalize (the "winners" side of doc 08's scenario × asset matrix).

### D. Rivals' fates for this scenario
For at least 2 of the 5 Act II rivals (Core Scientific, IREN, Hut 8, Cipher, CoreWeave), a scripted fate this scenario (fails/is acquired distressed, doubles, stays flat, pivots again), with the quarter it happens and the mechanical effect on the league table.

### E. This scenario's renewal-wall worked examples
2–3 concrete worked examples: a real-shaped Act II contract (X MW, Y-year term, Z tenant type, signed in a specific Act II quarter) reaching its end date during this scenario, showing the renewal offer the negotiation engine should generate (price, term) and what a good vs. bad hedge looks like.

---

## What to research and write once (shared across all four scenarios)

### F. GPU generations and density
Rubin (2026H2) and Rubin Ultra (2027H2): specs, kW per GPU, GPUs per MW, rack-density requirement (kW/rack) vs. Hopper/Blackwell, purchase and rental price starting points (these then diverge per scenario in section A). Feynman (2028): a one-paragraph flavour description for its obsolescence card, no new density tier (doc 27 D6). Retrofit project: capex/MW and downtime quarters to move a hall from one density tier to the next.

### G. Nuclear PPA (D7)
Terms: $/MWh (higher than grid), availability start (2027H2), which regions first (ground it in doc 08's Crane/Microsoft restart and named SMR plans), term (fixed 15 years), any capacity limit per deal, and how it interacts with the Power slot (replaces "existing MW / grid upgrade / on-site gas" as a fourth option, no queue).

### H. Political capital (D8)
The Government Affairs Lead hire (salary, effect: capital earned per quarter). 2–4 lobbying actions and what each costs/does. 4–6 cards spendable with political capital (moratorium override, permit fast-track, and similar), with costs in the meter and effects.

### I. Wildcards (D10)
Write all 4, each as a short event-card-like structure with its own trigger window (from doc 08's wildcard table): sovereign AI boom, SMR delay, water crisis, bitcoin supercycle. Each is drawn independently of the main scenario (2 of 4 per campaign) and should make sense layered on top of any of S0–S3.

### J. Presets (D13)
Three full "2026Q4 company" fixtures a player can start Act III from directly: a good-path company (~$1B net worth, the shape Act II's good-path bots reach), a great-path company (~$5B), and a lifeline-survivor (small, weak balance sheet). For each: cash, debt, sites/MW by use, projects (with tenants and end dates), GPU fleet, rating, stake — a complete, internally consistent Act II end-state, not just a headline number. (The code thread will likely generate the exact numeric fixture from a bot run; your job is to specify the qualitative shape and sanity-check the headline net worth against Act II's own bot results, e.g. `sign-then-raise` and `asic-retirer`.)

### K. Scoring and text (D14)
Title bands for Act III's net-worth ranges (extending Act II's "Developer" / "Hyperscaler-adjacent" bands upward). The "reading score" wording for the chapter report (how it should describe "you sold 3 quarters before the trigger" in plain language). ~15 new glossary terms (Signals, decoy, renewal wall, nuclear PPA, retrofit, political capital, density cliff, and so on). ~20 news-ticker headlines, split across the four scenarios (5 each), written so a headline from one scenario would not obviously give away that it's not another.

---

## Balance anchors to hit or correct

| Check | Target |
|---|---|
| A well-hedged player (reads signals, shortens/diversifies contracts, keeps leverage low) | Meaningfully outperforms a player who ignores Signals entirely, across all 4 scenarios, but never by so much that ignoring them is an obvious loss (Act III should be forgiving of a first read) |
| S1 (Great Repricing) trigger | A leveraged, single-tenant, no-backstop player takes a real hit (drawing on Act II's already-accepted "overleveraged" weakness — this is where it should finally bite) |
| S2 (Lift-Off) trigger | Energized MW and long contracts signed pre-trigger become clearly more valuable than post-trigger spot deals |
| S3 (Efficiency Shock) | A flexible, short-contract player does no worse than a long-locked one; a long-locked one does worse |
| S0 (Muddle Through) | The "tutorial" scenario: renewals reprice down 20–30%, nothing catastrophic, teaches the calendar and Signals mechanics without punishing a first-timer |
| The decoy | In at least one scenario, a player who over-reacts to the decoy alone and under-reacts to the real signals ends up worse than one who ignored the panel completely |
| Good-path preset (~$1B) | Reaches a plausible, playable 2030Q4 outcome under all 4 scenarios without an early forced bust in any of them |

Check these against Act II's own accepted results (the good path $412M, the overleveraged 0/50 MISS, the accepted lifeline and preset MISSes) — Act III inherits Act II's balance as given; don't try to retroactively fix Act II here.

---

## Output format

Produce **one research report plus a set of data files.** Save them to the Project under `claude/act3-content/`.

| File | Content |
|---|---|
| `28-act-iii-content-pack.md` | Executive summary; findings per section A–K; the balance-anchor check; **design flags** (where doc 27 needs a fix, with a proposed change — flag, don't silently change); assumptions; a plausibility note per scenario (why it's defensible, not a prediction); full sources for every grounded number; the JSON schema sketch for each file below |
| `market_s0.csv`, `market_s1.csv`, `market_s2.csv`, `market_s3.csv` | Section A per scenario, same columns as Act II's `market_quarterly.csv` plus the renewal-repricing columns |
| `signals_s0.json` … `signals_s3.json` | Section B: the 6 indicators by quarter, the sharper ranges, the decoy, the trigger event |
| `events_act3.json` | Section C, all 4 scenarios' cards in one file, each tagged with its scenario id |
| `rivals_act3.json` | Section D, all 4 scenarios' fates, tagged by scenario id, extending `rivals_act2.json`'s format |
| `renewals_examples.md` | Section E's worked examples, all 4 scenarios |
| `gpus_act3.json` | Section F, extending `gpus.json` |
| `nuclear.json` | Section G |
| `political_capital.json` | Section H |
| `wildcards.json` | Section I |
| `presets_act3.json` | Section J |
| `text_act3.en.json` | Section K |

**Data conventions (same as Acts I and II):** quarters as `2027Q1`; weeks as ISO Monday dates; USD nominal; power in MW; every value gets a `grounded: true/false` field and, if grounded, a `source`; if designed, a one-line `reasoning`. Real company names only in rival and event data, factual-sounding claims about them flagged for review per doc 27 D15. Scenario ids: `s0`, `s1`, `s2`, `s3` throughout, matching doc 27 §5.

---

## Quality bar

- **Plausibility, not prophecy.** You are not predicting the future. You are building four futures a well-informed person in Sep 2026 would find believable, each grounded in real, cited 2024–2026 trends and named published forecasts (IEA, McKinsey, analyst notes, company guidance) where they exist, and clearly reasoned where you're extrapolating.
- **Internal consistency over correctness.** Each scenario must hang together (its market, its Signals, its cards, its rival fates all tell one coherent story) more than it must "correctly" predict 2027.
- **The decoy must feel fair in hindsight**, not like a trick — a player re-reading the chapter report should think "I see how that looked like the real thing," not "that was unknowable."
- **Continuity with Act II is non-negotiable.** Every scenario's 2027Q1 opening values must connect smoothly to Act II's real 2026Q4 numbers; a visible seam at the act boundary is a defect.
- **Flag design problems.** If doc 27's mechanics don't hold up once you try to fill them with real numbers (e.g. the renewal repricing bands don't leave room for a "good hedge" to matter), say so in "Design flags" with a fix. Don't silently change the frozen design.
- **Completeness check at the end:** a table listing each file and section above with its status (done / partial / missing and why).
