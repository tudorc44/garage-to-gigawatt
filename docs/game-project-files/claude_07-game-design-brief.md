# 07: Game Design Brief v0.2

> **v0.2 change (25 Sep 2026):** The game now runs **2017 → 2035** in **4 acts with quarterly turns**. It starts with a garage crypto miner, pivots to AI at the Ethereum Merge (2022), and ends in scenario-driven futures. Full detail is in **08-extended-universe-2017-2035.md**. The sections below are updated where the change affects them. The Deal Desk loop (Act II) is unchanged.

**Working title options:** *Garage to Gigawatt* (new favourite) · *Take or Pay* · *Powered Land* · *Hash to Hyperscale*
**Genre:** Turn-based business simulation (a light tycoon, finance-first)
**Platform:** Web (browser) → Steam later (desktop wrapper)
**Session:** Each act takes ~40–50 minutes (16–23 quarterly turns). A full career is 4 acts, about 3 hours. Every act can also be started on its own with a preset company.
**Tone:** A grounded business sim with real events and real company names, **including in the speculative 2027–2035 acts** (decided 25 Sep 2026; whether to alter names will be reviewed before any public release)
**Tech stack:** see **06-tech-stack-recommendation.md** (TypeScript + Vite + Preact, pure simulation core, Electron for Steam later)
**Build:** Solo, AI-assisted, with a very small budget. Alpha 0.1 in 2–3 weeks.

---

## 1. Concept options, scored

| | A. **Deal Desk** (turn-based inbox + pipeline + simple map) | B. **Powered Land** (map-first strategy) | C. **Compute Empire** (idle/incremental) |
|---|---|---|---|
| Fit with the theme (structuring deals) | ★★★★★ | ★★★★ | ★★ |
| Fun in 30–60 minute sessions | ★★★★ | ★★★★ | ★★★ (idle suits check-ins better) |
| Beginner/AI buildability | ★★★★★ (menus) | ★★★ (map interaction, art) | ★★★★★ |
| Stands out vs. competitors | ★★★★★ (no finance-first data center game exists) | ★★★★ | ★★ (AI Data Center Tycoon on itch.io already does this) |
| Steam potential | ★★★★ (VC Tycoon has proven the format) | ★★★★ | ★★★ |
| **Verdict** | **✅ Recommended** | Grow into it (the map gets richer after alpha) | ❌ |

**Recommendation: A, with a light version of B's map.** Build Deal Desk first. The map starts as 6–8 clickable regions and gains depth later.

---

## 2. Player fantasy
*"I started with six graphics cards humming in my garage. I survived two crypto winters, went public in the 2021 mania, and when Ethereum stopped paying miners I bet everything on AI. Now I turn an empty field and a phone call into a $10 billion campus, and the only question is whether I saw the next crash coming."*

## 2b. Campaign structure (new in v0.2)
| Act | Years | Loop |
|---|---|---|
| I: Garage to Hashrate | 2017 → Q3 2022 | Mining sim: machines, sites, hashprice, the capital ladder. Ends at the **Merge decision** |
| II: The Pivot and the Boom | Q4 2022 → 2026 | **Deal Desk** (sections 3–7 below) |
| III: Reckoning | 2027 → 2030 | Deal Desk + a hidden major scenario + the renewal wall |
| IV: The Long Game | 2031 → 2035 | Nuclear, orbital compute, the second scenario, endgame scoring |

The asset that carries across all acts is **energized megawatts**.

## 3. Core loop (each quarter; Act II–IV)
1. **Inbox:** new opportunities arrive (a site listing, a tenant RFP, a lender offer, a crypto miner for sale) and events (protests, price moves, news).
2. **Assemble deals:** each project is a card with 3 slots: **Power**, **Tenant** and **Capital**. Fill them in any order. Choosing the order is the strategy.
3. **Decide:** answer 0–2 event cards (Reigns-style, 2–3 choices, trade-offs between stakeholder meters).
4. **End turn:** timers advance (queue, permits, construction). Cash flows. Interest is paid. Global indices move.
5. **Harvest:** stabilized projects earn money. Sell or refinance them to recycle the cash into bigger deals.

**Macro loop across the acts:** garage → industrial miner → IPO → pivot → megadeals → read the signals and survive or exploit the 2027–35 scenario. The score is Net Worth at Dec 2035 (or at the end of the act for standalone starts), plus achievements.

## 4. Project lifecycle (the pipeline board)
`Site Optioned → Power Secured → Permitted → Tenant Signed → Financed → Under Construction → Energized → Stabilized → (Sold / Refinanced / Held)`

- Order rules: financing needs a signed tenant, and construction needs financing, power and permits. Signing a tenant early locks in the price but starts **delay penalties** if you're late (a take-or-pay contract works both ways).
- Two business modes per project (the player picks one):
  - **Shell lease:** lower capex, lower revenue, easy to sell at a cap rate.
  - **Full-stack compute:** you buy the GPUs. Much higher revenue and risk, plus exposure to GPU generations.

## 5. Systems (alpha → beta)

| System | Alpha 0.1 | Later |
|---|---|---|
| Regions (6–8: Texas, Virginia, Louisiana, Ohio, Arizona, Memphis/TN, New Mexico, Nordics/Ireland later) with power, land, politics and community stats | ✅ | EU/Middle East regions |
| Power: grid queue vs. on-site gas vs. buying a miner site | ✅ grid + gas | Nuclear/SMR deals, PPAs |
| Tenants: 3 types (Hyperscaler / AI Lab / Enterprise) with credit, price and term | ✅ | Named tenants with personalities, force majeure behaviour |
| Lenders: bank / private credit / bonds; leverage depends on tenant quality | ✅ simple | DDTL, SPV, JV partners, backstops with warrants |
| Construction timer + delay/overrun rolls | ✅ | Equipment backlog index, priority slots |
| GPU spot index + generations | ✅ spot index | Full generation cycle, residual values |
| Community Heat + protests | ✅ basic (thresholds → delays) | Lawsuits, zoning voided, moratoriums |
| Lobbying / political capital | ❌ | ✅ Era 2–3 |
| Stakeholder meters (Community, Government, Lenders, Tenants) | ✅ 2 meters | ✅ 4 |
| Event cards | ✅ ~20 | 80+, with real-inspired chains |
| Hires with traits (VC Tycoon style) | ❌ | ✅ (e.g. "Ex-utility exec: −3 months queue") |
| Sell / refinance | ✅ sell | Refinance, partial JV sale |
| Bubble meter / repricing | ❌ | ✅ Era 3 |
| Save/load | ✅ | Cloud saves (Steam) |
| Act I mining sim (rigs/ASICs, sites ladder, hashprice, halvings, capital ladder) | ✅ (see §10) | Hosting for others, curtailment revenue |
| Business units (Mining / GPU Cloud / Shell / Power / Orbital) | Mining + one AI unit | All 5 |
| Signals panel + hidden scenario draw (S0–S5 + wildcards) | ❌ | ✅ Acts III–IV |
| Contract maturity wall, density generations (kW/rack retrofits) | ❌ | ✅ Acts III–IV |

## 6. Balancing anchors (from economy-model.xlsx)
- Base full-stack deal: **~2x equity in 5 years**. Base shell deal sold at a cap rate: **~3–4x**, so shell deals need friction (competition, pre-development risk, lease rates that compress over time).
- **A 6-month delay should cost ~80–90% of a deal's profit, and a 1-year delay should lose money.** This makes protests and power queues matter.
- **Locking in 30% lower prices turns a good deal into a loss.** Contract timing matters (2024 peak vs. after the June 2025 reset).
- A tenant default in year 3 turns a win into a ~40–60% equity loss unless you have a backstop.
- Rate shocks hurt more at **exit/refinance** than during operations.

## 7. Event deck: first 20 (alpha)

| # | Event | Choices / effect | Inspired by |
|---|---|---|---|
| 1 | Town hall turns hostile | Fund a community package ($) / push ahead (+Heat) / downsize the phase | Many 2025–26 hearings |
| 2 | Council members lose re-election | Region's political climate flips | Warrenton, VA 2024 |
| 3 | Zoning voided on a technicality | Refile (6-month delay) / appeal (coin flip) | PW Digital Gateway |
| 4 | Partner walks from the shared campus | Take over their share (cash) / abandon | Compass & QTS exits |
| 5 | Unpermitted turbines lawsuit | Pay to settle / fight (+Heat) / switch to grid (delay) | xAI Memphis |
| 6 | Hyperscaler cuts spot prices 30% | Global spot −30%. Uncontracted capacity hurt | AWS June 2025 |
| 7 | New GPU generation announced | Old-generation residuals fall. New orders are pricier but in demand | Blackwell/Rubin |
| 8 | Tenant invokes force majeure | Accept a delay / sue / renegotiate the price | Oracle Project Jupiter, Sep 2026 |
| 9 | Megadeal RFP from an AI lab | Huge contract at a premium price, weak credit. Attach a backstop? | Oracle–OpenAI, Stargate |
| 10 | Big tech offers a backstop | Guarantee $X of lease in exchange for Y% of your equity | Google–Cipher/TeraWulf |
| 11 | Private credit offers an 80/20 JV | Off-balance-sheet capital, share of the upside | Blue Owl–Meta Hyperion |
| 12 | Capacity auction spikes | Regional Ratepayer Anger + Heat everywhere in that grid | PJM 2025–27 |
| 13 | Turbine backlog hits 2030 | Pay a premium for a slot / wait | GE Vernova backlog |
| 14 | Short seller questions depreciation | Credit rating hit if your depreciation policy is aggressive | Burry, Nov 2025 |
| 15 | State pauses data center tax incentives | Opex + in the region | Arizona 2026 |
| 16 | Governor declares a moratorium | Region frozen for 12 months | New York 2026 |
| 17 | State pre-empts county restrictions | Faster approvals, more Heat | West Virginia |
| 18 | Crypto miner for sale | Buy an energized site (skip the power queue) at a premium | IREN/Cipher/Core Scientific pivots |
| 19 | Lender widens your spread | Refinancing costs +100 bps | CoreWeave DDTL 5.0 → 5.5 |
| 20 | Gallup: 71% oppose local data centers | Global Heat +10 | Gallup May 2026 |

## 8. Win / lose
- **Win:** the highest Net Worth at Dec 2035 (full career) or at the end of the act (standalone). Scenario goals (e.g. "Build 1 GW without a single lawsuit", "Survive the 2026 squeeze with no default").
- **Lose:** you miss debt service for 2 months with no way to raise cash → lenders foreclose → game over (or you continue as a "restructured" company in later versions).

## 9. UI screens (alpha)
1. **Dashboard:** cash, net worth, credit rating, meters, global indices, date
2. **Map:** regions with stats, click to see sites
3. **Pipeline board:** project cards in columns by stage
4. **Deal builder:** fill the Power / Tenant / Capital slots and see a projected return (a mini version of the spreadsheet)
5. **Inbox:** opportunities and news
6. **Event modal:** card with choices
7. **Year-end report:** chart of net worth and the "anti-portfolio" (deals you passed on)

## 10. Alpha plan (revised in v0.2)

**Decided (25 Sep 2026): build Act I first.** The reasoning behind that choice:
- **Act I first (recommended):** the mining sim is the simplest system (machines × power × price), so it's the best way to learn Claude Code, Git and the tick engine. It's also what players see first, and it forces the "powered MW" asset and the quarterly tick to be designed right from day one. The downside: mining sims already exist, so Act I alone doesn't prove the game's unique idea.
- **Act II first:** proves the unique Deal Desk hook sooner, but the harder system comes first, while you're still learning the tools.

**Update 26 Sep 2026:** pacing, actions, mini-games and rivals are now decided in **09-player-actions-and-pacing.md**. They extend the alpha to **~4–5 weeks**, and the week-by-week order in doc 09 §7 replaces the plan below. The earlier plan is kept for reference.

**Alpha 0.1 (originally 2–3 weeks), Act I:**
- **Week 1:** setup (Node, Git, GitHub, Claude Code). Scaffold. `GameState` + quarterly `advance()` + seeded RNG. GPU rigs and ASICs, garage → warehouse sites, scripted coin price path, hashprice. Dashboard screen. Save/load.
- **Week 2:** site ladder up to an owned 10–100 MW site, capital ladder (savings → loan → VC → 2021 IPO window), halvings, the China ban, crypto winters, ~12 events, neighbour/Community Heat v1.
- **Week 3:** the Merge decision screen (4 choices), chapter report, lose condition, balancing, deploy (private link).
- **Done when:** you can play 2017 → Sep 2022 in ~40 minutes, go bust by over-buying at the 2017 or 2021 top, and reach the Merge with a real choice to make.

**Alpha 0.2 (+3–4 weeks), Act II:** the Deal Desk as specified in sections 3–7, starting from whatever the player brought out of Act I (or a preset company).
**Alpha 0.3+:** Acts III–IV, the Signals panel, the scenario deck, the renewal wall.

## 11. Open risks
- **Spreadsheet fatigue:** keep the numbers readable (show "+$120M/yr", not a full P&L). Put detail behind a click.
- **Real names (decision: keep real names throughout for now):** keep them only in data files (`companies.json`) so any rename is a one-file change. No logos. Keep real *people* out of events. Review before any public release, especially for speculative post-2026 events (e.g. a real company going bankrupt in 2028).
- **The news keeps moving:** events are data-driven, so new real-world events can be added as content updates. That can be a marketing hook too ("Sept 2026 update: Force Majeure").
- **Scope creep:** lobbying, SPVs, hires and a bigger map are all post-alpha. Protect the 2–3 week alpha. **The v0.2 expansion roughly triples total scope.** The act structure is what keeps it shippable: each act can be released on its own.
- **Scale jump:** Act I deals in thousands of dollars and Act IV in tens of billions. Use number formatting ($3.2K → $3.2B) and a capital ladder so the jump feels earned.

## 12. Next steps
1. Set up the tools (beginner path):
   - Install **Node.js (LTS)**, **Git**, **VS Code**, **Claude Code**, and create a **GitHub account**.
   - Learn 6 Git commands: `git status`, `git add .`, `git commit -m "..."`, `git push`, `git log --oneline`, `git checkout -- <file>` (undo). Commit after every working step. It's your save game.
   - Ask Claude Code to scaffold the project per **06-tech-stack-recommendation.md** (Vite + TypeScript + Preact + Vitest, with `src/sim`, `src/content`, `src/ui`, `src/platform`).
   - Work in small asks ("add the quarterly tick that pays power costs"), test each one in the browser, then commit. Use Plan mode for bigger features.
2. Put this brief in the repo as `docs/design-brief.md` and have Claude Code generate `CLAUDE.md` from it.
3. Build week 1.
4. (Optional) Make a paper prototype first: play 12 turns in the spreadsheet by hand to check the choices feel interesting.
