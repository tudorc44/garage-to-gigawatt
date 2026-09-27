# 05: From Real Mechanics to Game Systems

Companion file: **economy-model.xlsx** (Inputs / Neocloud_Deal / Shell_Deal / Scenarios). Change the blue cells to test how the game balances.

## 1. What the model says (and why it matters for design)

**Base neocloud deal (100 MW, 5-year pre-sale at $2.20/GPU-hr, 75% debt at 9.5%):**
- Capex $4.2B. Equity $1.05B. Revenue ~$1.2B/yr (~$12M per MW per year).
- **Equity doubles (2.0x) over 5 years. IRR ~18%. GPUs pay back in ~3 years.**

**Shell developer deal (100 MW, lease at $1.8M/MW/yr, sold at a 6.25% cap rate):**
- Cost ~$1.38B → exit value ~$2.36B → **~$0.98B development profit, 3.85x equity.**
- An 11% yield on cost against a 6.25% cap rate is the whole "package and sell" business.

**The same neocloud deal under events:**

| Scenario | Equity profit | MOIC |
|---|---|---|
| Base | +$1,056M | 2.01x |
| 6-month delay (+5% cost) | +$143M | 1.13x |
| Protest: 1-year delay +10% cost | **−$786M** | 0.32x |
| Tenant defaults after year 3 (rest sold at spot) | −$433M | 0.59x |
| Rate shock +3 points | +$772M | 1.74x |
| Contract signed 30% cheaper | −$547M | 0.48x |

### Design takeaways
1. **Time is the main enemy.** A 6-month delay destroys 85% of the profit, because interest runs while revenue does not. Delays (power queues, protests, turbines) should be the central threat. They are also the most realistic one.
2. **The price you lock in decides the deal.** Signing at the peak (2024) versus after the price reset (Jun 2025) is the difference between winning and losing. This rewards reading the market, which fits the eras.
3. **Tenant quality is the second axis.** An AI lab paying more but defaulting in year 3 loses more money than a hyperscaler paying less. That makes the backstop mechanic (a big-tech guarantee in exchange for equity) a meaningful choice.
4. **Interest rates matter less than delays for each individual deal.** In the game, rates should instead drive **exit valuations** (cap rates) and **refinancing**. That is where a credit squeeze really hurts.
5. **Shell development is too profitable if left unchecked.** The game needs friction: competition for sites with power, lease rates that compress over time, pre-development money at risk (land options, queue deposits) and projects that die before financing.

## 2. Mapping real mechanics to game systems

| Real mechanic | Game treatment |
|---|---|
| Site selection | **Core.** A map with ~6–8 regions, each with Power availability, Land cost, Political climate and Community sensitivity |
| Grid interconnection queue | **Core, as a timer.** Region-based wait (6–36 months) that you can speed up by paying for upgrades |
| Behind-the-meter gas | **Core choice.** Fast (−50% wait) but +Community Heat, + air-permit lawsuit risk (the xAI pattern) |
| Turbines and transformers | **Simplified.** A global "Equipment backlog" index sets lead times. You can pay a premium for priority slots |
| Zoning and permits | **Core, tied to protests.** Hearing events with a chance of approval |
| Offtake contract | **Core.** Tenant cards: credit rating, $/GPU-hr or $/MW lease, term (3/5/10 years), prepayment % |
| Backstop / guarantee | **Mid-game unlock.** Attach a hyperscaler guarantee to a weak tenant in exchange for equity (warrants) |
| Financing | **Core.** Lender cards: rate, maximum leverage (depends on the tenant's rating and contract length), covenants (DSCR) |
| JV equity partner | **Mid-game.** A partner funds X% of equity for X% of profits and may walk away (the PW Gateway cascade) |
| SPV / off-balance-sheet | **Late game, satire.** Keeps debt off your credit rating but adds a "Bubble" risk event |
| GPU generations | **Core, time-driven.** Hopper → Blackwell → Rubin. A new generation lowers the spot price and residual value of the old one |
| Spot market | **Core.** Uncontracted capacity sells at a global spot index that falls as the world's capacity grows |
| Construction | **Timer + risk rolls.** Overrun and delay events each month |
| Operations | **Automatic.** Monthly cash flow. Occasional outage/SLA events |
| Exit / refinance | **Core.** Sell a stabilized asset at the market cap rate, or refinance to pull cash out |
| Local protest | **Core system** (see §3) |
| Lobbying | **Late-game system** (see §3) |
| Power bills backlash | **Regional meter.** Each MW built in a region raises its "Ratepayer Anger", which feeds protests and moratorium chances |
| Circular financing / bubble | **Global "Bubble" meter.** Rises with industry leverage. In Era 3 it can trigger a "Repricing" (cap rates +150 bps, credit tightens) |
| Depreciation debate | **Flavour + mechanic.** You pick a depreciation policy. A longer one flatters your reported profit and credit rating, a shorter one is safer. Auditor/short-seller events can punish the aggressive choice |

## 3. The protest and lobbying systems

**Community Heat (0–100) per project**, which rises with:
- MW size, gas turbines (+ a lot), water-cooling choice, the number of other data centers in the region, and power-bill events
- Rushing (skipping the community consultation step)

Heat falls with: a community benefits package ($), local hiring pledges, closed-loop cooling (more capex), and smaller phased builds.

| Heat | Effect |
|---|---|
| 0–30 | Smooth. Hearings pass |
| 30–60 | Organized opposition: hearings delayed 1–3 months, press events |
| 60–80 | Lawsuit filed: chance zoning is voided (a technicality event, as with PW Gateway). Partner may walk away |
| 80+ | Regional moratorium risk: blocks every new project in that region for X months |

**Lobbying** unlocks in Era 2 (a "Government Affairs" hire) and matters most in Era 3. You spend money and "Political Capital" at the state level to:
- Pass tax exemptions (lower opex)
- Pre-empt counties (as in West Virginia): new projects skip local hearings, but regional Heat goes up
- Fast-track the interconnection queue (as with Texas SB6-style rules)
- Block a proposed moratorium

Risk: a "Lobbying exposed" event hurts reputation and adds Heat everywhere. Federal policy is an era modifier the player cannot control. In 2025–26 it favours the buildout.

## 4. Core resources
- **Cash** (lose if it runs out and you can't make debt payments)
- **Net Worth / Equity Value**, the score
- **Credit Rating** (AAA to CCC). Sets your interest rate and maximum leverage
- **Pipeline MW** by stage
- **Stakeholder meters** (Reigns-style, 0–100): Community, Government, Lenders, Tenants
- **Political Capital** (from Era 2)
- **Global indices** (read-only): GPU Spot Price, Interest Rate, Equipment Backlog, Bubble Meter

## 5. Time and eras
- 1 turn = 1 month. The campaign runs Jan 2024 → Dec 2026 = **36 turns**, about 1–1.5 minutes per turn, **so one campaign fits in 30–60 minutes**.
- **Era 1: Scarcity (2024).** High spot prices, cheap-ish credit, easy approvals. Teaches the loop.
- **Era 2: Megadeals (2025).** Megacontracts, backstops, JVs and SPVs unlock. Price reset in June 2025. Bubble meter starts to rise.
- **Era 3: Backlash (2026).** Protests spike, moratoriums, a tenant soft-defaults (force majeure), credit tightens. Tests your leverage.
- Later: "Endless" mode and fictional 2027+ scenarios.
