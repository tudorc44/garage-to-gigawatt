# Research Plan: AI Data Center Deal-Maker (working title)

**Status:** Plan only. Not started.
**Goal:** Collect enough grounded knowledge about the 2024–2026 AI data center buildout, and how the "plan → package → pre-sell → finance → build" model works, to write a **Game Design Brief** for a light business-sim web game.
**End deliverable:** A Game Design Brief with the core loop, systems, economy model, content list (events, actors, eras), tone, scope, and tech stack, plus 2–3 concept variants scored against each other.

---

## Guiding questions

1. How does the real deal lifecycle work, step by step, and where do the tension, risk, and decisions sit? (Those are the gameplay.)
2. Which numbers matter (capex/MW, $/GPU-hr, contract length, rates, power cost, build times), and what ranges are realistic enough to feel right when simplified?
3. What happened in 2024–2026 that can become an event or era arc (booms, shortages, bubble fears, big deals)?
4. Which existing games solve "light but satisfying business sim" well, and what can we borrow?
5. Who is the audience, where do they play, and what session length and tone fit them?
6. What is the smallest version that is fun?

---

## Phase 1: Industry mechanics (the real business model)
**Output:** `01-industry-mechanics.md`, which includes an annotated deal-lifecycle diagram and an actor map.

**1.1 Actors and their incentives**
- Developers / "neoclouds" (CoreWeave, Crusoe, Nebius, Lambda, Fluidstack), powered-land and shell developers, crypto miners pivoting to AI (IREN, Cipher, TeraWulf, Core Scientific)
- Offtakers: hyperscalers (Microsoft, Oracle, Google, AWS, Meta) and AI labs (OpenAI, Anthropic, xAI)
- Capital: private credit (Blue Owl, Apollo, Blackstone), infra funds (Brookfield), banks, GPU-backed debt/ABS, vendor financing (Nvidia investments/backstops), sovereign funds
- Supply chain: Nvidia/AMD, power equipment (transformers, gas turbines, switchgear), cooling, EPC contractors
- Gatekeepers: utilities, grid operators and interconnection queues, local governments, communities, regulators

**1.2 The deal lifecycle.** For each stage: duration, cost, key risks, and what can go wrong.
Site sourcing → power secured (grid, behind-the-meter gas, PPAs) → permitting and zoning → anchor tenant and offtake contract (take-or-pay, 5+ years, creditworthiness) → financing structure (SPV/JV, project finance, delayed-draw term loans, GPU-collateralized debt, equity) → long-lead procurement → construction → GPU delivery and install → energization and ramp → operations (utilization, SLAs, uptime) → refinancing, sale, or recycling capital.

**1.3 Unit economics.** Collect ranges, not single values.
- Capex per MW (powered shell vs. full fit-out incl. GPUs); GPU cost per MW
- Pricing: $/GPU-hr on long-term contracts vs. spot, and how prices trended 2024→2026
- Contract length, prepayments, take-or-pay terms, termination clauses
- Cost of debt, leverage ratios, DSCR, equity returns
- Power cost ($/MWh), PUE, opex
- GPU depreciation and useful life (the 4 vs. 6 year debate) and residual value
- Build timelines per phase

**1.4 Risk catalogue** (becomes the game's failure modes and events)
Counterparty concentration, GPU obsolescence, power and equipment delays, cost overruns, rate shocks, community opposition, circular financing and "AI bubble" repricing, export controls and tariffs, overbuild and utilization collapse.

**Sources:** CoreWeave S-1/10-K/10-Qs and earnings calls; Nebius, Oracle, IREN, and TeraWulf filings and calls; SemiAnalysis; IEA *Energy and AI*; LBNL data center energy report; JLL/CBRE/Cushman data center market reports; Uptime Institute; FT, Bloomberg, The Information, and WSJ coverage of major financings; credit-rating agency reports (Moody's/S&P) on data center ABS and project debt.

---

## Phase 2: 2024–2026 timeline and case studies
**Output:** `02-timeline-and-cases.md`, which includes a dated event list and 5–8 case-study one-pagers.

- Build a timeline: major deals, GPU generations (Hopper → Blackwell → Rubin), price moves, power crunch milestones, policy moves, bubble/correction moments.
- Case studies to cover, each as "deal anatomy" (who, how financed, how pre-sold, what went right or wrong):
  - Stargate / Abilene (OpenAI–Oracle–Crusoe)
  - CoreWeave's Microsoft and OpenAI contracts and its debt stack
  - Meta Hyperion SPV with Blue Owl
  - xAI Colossus (speed-to-power story)
  - Nebius–Microsoft offtake
  - Google-backstopped Fluidstack deals with crypto miners
  - At least one stalled or failed project, for the downside cases
- Tag each event with a candidate game use: era shift, random event, scenario, or achievement.

---

## Phase 3: Comparable games teardown
**Output:** `03-game-references.md`, which includes a comparison table and "steal this / avoid this" notes.

- **Business/tycoon:** Capitalism Lab, Offworld Trading Company, Big Pharma, Game Dev Tycoon, Startup Company, Mad Games Tycoon
- **Light and web-native:** Universal Paperclips, Cookie Clicker, Kittens Game, A Dark Room, Reigns (swipe decisions), Papers Please (desk sim)
- **Finance/deal flavour:** Wall Street Raider, Stacklands, Mini Metro (clean systems, minimal UI)
- For each game: core loop, session length, how complexity is revealed over time, how money is shown, failure states, UI density, monetization.
- Extract 3–5 candidate core-loop patterns: idle/incremental, turn-based deal desk, card/negotiation, map-based builder.

---

## Phase 4: Audience, distribution, and positioning
**Output:** `04-audience-market.md`

- Target player hypotheses: tech/finance/LinkedIn crowd (satire and "I get this" appeal), casual tycoon fans, AI-curious general public
- Distribution: itch.io, CrazyGames/Poki (portal requirements: file size, ads SDK, mobile), own domain plus social virality, possible Steam later
- Comparable indie web-sim results (traffic and revenue where public)
- Monetization options: free/portfolio piece, ads, premium, or B2B/branded use (e.g. marketing for Wolfpack-style agencies or infra firms)
- Tone decision inputs: satirical vs. earnest-educational vs. neutral tycoon
- Legal note: use fictionalized companies and parody names, not real brands; check what that means for real people and firms

---

## Phase 5: Abstraction and economy model
**Output:** `05-systems-draft.md` plus `economy-model.xlsx` (a simple simulation spreadsheet)

- Map each real mechanic from Phase 1 to one of: **keep as a core system**, **simplify into a single stat**, **make it an event**, or **cut**.
- Pick the game's core resources (e.g. Cash, Power MW, GPUs, Contracts, Reputation/Credit Rating, Time).
- Draft the core loop and the deal pipeline as a game board (e.g. Site → Power → Tenant → Financing → Build → Operate).
- Build a spreadsheet model of one deal and of a 5-year campaign to check the math is plausible and has interesting tradeoffs (leverage vs. risk, speed vs. cost, spot vs. long-term contracts).
- Define difficulty levers and a progression arc using eras (2024 scarcity → 2025 megadeals → 2026 bubble fears).

---

## Phase 6: Technical feasibility (web)
**Output:** `06-tech-options.md`

- Stack options: React/Svelte with a state-machine sim (UI-heavy), Phaser/PixiJS (if we want a visual map), or plain TS plus Canvas
- Save systems (local, cloud), mobile layout, performance, bundle size for portals
- Art direction options on a small budget: minimalist UI, isometric map, pixel art
- Rough effort estimate for an MVP vs. a full version

---

## Phase 7: Synthesis → Game Design Brief
**Output:** `07-game-design-brief.md`

- 2–3 concept variants (e.g. idle incremental "Compute Empire", turn-based "Deal Desk", map-based "Powered Land Tycoon")
- Score each on fun potential, fidelity to the real business, scope/effort, virality, and audience fit
- Recommended concept: core loop, systems, resources, event list, eras, win/lose conditions, tone, MVP scope, and a list of open risks
- Next step: paper or spreadsheet prototype, then an MVP build plan

---

## Open decisions for Tudor (settle before or during Phase 4)
1. Tone: satire, educational, or straight tycoon?
2. Target session: 5-minute runs, 30-minute sessions, or idle/check-in?
3. Real names (with the legal risk) or fictional parodies?
4. Purpose: hobby, portfolio, commercial, or marketing asset?
5. Who builds it (solo, with AI assistance, or the agency team), and what budget and timeline?

## Execution notes
- Phases 1–2 are the heaviest research (web and filings). Phases 3–4 can run in parallel with them. Phases 5–7 depend on the earlier outputs.
- All outputs are saved to this Project so later sessions can pick up where the last one stopped.
- Suggested order across sessions: [1+2] → [3+4] → [5] → [6+7].
