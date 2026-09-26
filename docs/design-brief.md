# Game Design Brief v0.2 — Garage to Gigawatt

*Source: project doc 07. Condensed copy for the repo. For Alpha 0.1 scope, `docs/alpha-0.1-scope.md` is the single source of truth.*

**Genre:** Turn-based business simulation (a light tycoon, finance-first)
**Platform:** Web (browser) → Steam later (Electron)
**Campaign:** 2017 → 2035 in 4 acts with quarterly turns. Each act ~40–50 minutes.
**Tone:** Grounded business sim with real events and real company names (names live only in data files; no logos; no real *people* in events).
**Build:** Solo, AI-assisted, very small budget.

## Player fantasy
*"I started with six graphics cards humming in my garage. I survived two crypto winters, went public in the 2021 mania, and when Ethereum stopped paying miners I bet everything on AI. Now I turn an empty field and a phone call into a $10 billion campus, and the only question is whether I saw the next crash coming."*

## Campaign structure
| Act | Years | Loop |
|---|---|---|
| I: Garage to Hashrate | 2017 → Q3 2022 | Mining sim: machines, sites, hashprice, the capital ladder. Ends at the **Merge decision** |
| II: The Pivot and the Boom | Q4 2022 → 2026 | **Deal Desk**: Power / Tenant / Capital slots per project |
| III: Reckoning | 2027 → 2030 | Deal Desk + a hidden major scenario + the renewal wall |
| IV: The Long Game | 2031 → 2035 | Nuclear, orbital compute, second scenario, endgame scoring |

The asset that carries across all acts is **energized megawatts**.

## Act I (what we are building first)
- **Pacing:** Plan phase (spend Bandwidth + money) → Live quarter (13 weekly sub-steps, ~20 s, pausable, with 1–3 interrupts) → Quarter report.
- **Action limit:** Bandwidth points (founder attention, starts at 3) + money. Routine actions are free; strategic ones cost Bandwidth.
- **Core decisions:** buy/sell machines, HODL/sell %, loans (crypto-backed → margin calls), climb the site ladder, hires, community Heat, investors/IPO.
- **Rivals:** 4 named, scripted, on a league table.
- **End:** the Merge decision (4 choices), chapter report.

## Win / lose
- **Win:** highest Net Worth at the end (founder stake in Act I).
- **Lose:** cash below zero after forced sales → game over.

## Open risks
- **Spreadsheet fatigue:** readable numbers ("+$120M/yr"), detail behind a click.
- **Scope creep:** new ideas go to the backlog; the act structure keeps it shippable.
- **Scale jump:** thousands of dollars in Act I → tens of billions in Act IV; use compact number formatting.

## Working method
- Small asks to Claude Code ("add the quarterly tick that pays power costs"), test in the browser, then commit. Use Plan mode for bigger features.
- Commit after every working step. It's your save game.
