# 10: Alpha 0.1 Scope Freeze (Act I: Garage to Hashrate)

*Phase 0, step 1 of the build plan. Frozen 26 Sep 2026. Version: scope v1.0.*
*From now on, this document is the single source of truth for what Alpha 0.1 contains. It replaces the scope lists in 07 §10 and 09 §7 (those stay as background).*

---

## 1. What the alpha has to prove

**One question:** *Is Act I (2017 → the Merge, Sep 2022) a fun 40-minute run where your decisions, not luck, decide whether you survive?*

Anything that doesn't help answer that question is out of scope.

**Target:** 23 quarterly turns (Q1 2017 → Q3 2022), about 40 minutes, 3–6 meaningful decisions per turn. Played in a desktop browser.

---

## 2. In scope: what gets built

### 2.1 Turn structure
- **Plan phase:** the player spends Bandwidth and money, then clicks End Quarter.
- **Live quarter:** 13 weekly sub-steps over about 20 seconds. Pause, 2× speed and skip are available. Interrupts always pause it.
- **Quarter report:** one screen showing hashrate, revenue, cost per coin, cash, treasury, Heat, and rank against rivals.
- Seeded RNG, so the same seed plus the same actions always gives the same game.

### 2.2 Resources
| Resource | Alpha rule |
|---|---|
| Cash | Start with $10k of savings. Running out triggers the lose flow (§2.11) |
| Bandwidth | Starts at 3 per quarter, +1 per Chief of Staff hire, +1 when you reach the 20 MW site. Maximum 6. Unused Bandwidth is lost |
| Treasury | Mined BTC and ETH held. The HODL % is set per quarter |
| Company valuation | EBITDA × era multiple + cash + treasury − debt. The founder's stake is the score |
| Community Heat | 0–100 per site, with the thresholds from 05 §3 scaled down to Act I |

### 2.3 Market (scripted plus seeded noise)
- **BTC and ETH** follow a scripted quarterly price path (the real 2017–2022 shape), with weekly noise inside each live quarter.
- **Network difficulty → hashprice** for BTC. ETH gets the equivalent: revenue per MH.
- **Machine prices** follow the market: GPUs are scarce in 2017 and 2021, and used rigs are cheap in the winters.
- Scripted shocks: the 2018 winter, the COVID crash (Mar 2020), the May 2020 halving, the China ban (mid-2021), the Nov 2021 ATH, Luna/Celsius (May–Jun 2022), and the Merge (week 11 of Q3 2022).

### 2.4 Machines (4 models, dated availability)
| Model | Available | Mines | Role |
|---|---|---|---|
| GPU Rig Gen 1 (6 GPUs, ~180 MH, ~1 kW) | 2017 | ETH | Starter. Flexible, resellable |
| GPU Rig Gen 2 | 2020 | ETH | Better efficiency |
| Antminer S9 (~13.5 TH, ~1.3 kW) | 2017 | BTC | Efficient, becomes obsolete |
| Antminer S19 Pro (~110 TH, ~3.25 kW) | 2020 | BTC | The 2020–22 workhorse |

- Buy new or used (used costs less but fails more). Sell anytime at the market's used price.
- Machines earn from the quarter **after** delivery. A fleet switches off automatically in any week when revenue is below its power cost. *(Both rules come from the 08 §3e model.)*

### 2.5 Sites: the ladder (no map in Act I)
| Tier | Capacity | Power | Unlock |
|---|---|---|---|
| Garage | ~5 kW | $0.12/kWh, household | Start |
| Small unit | 100 kW | ~$0.08/kWh | Cash |
| Warehouse | 1 MW | ~$0.06/kWh | Cash + scouting |
| Own site | 20 MW | ~$0.04/kWh (contract) | Cash/capital + scouting + build time |
| Texas site | 100 MW | Fixed or index + curtailment | 2020+, capital + build time |

- **Scouting (1 Bandwidth)** reveals 2–3 offers for the next tier. Each has one hidden flaw (noise, landlord, grid delay), which is revealed after you buy.
- Building or upgrading a site takes 1–3 quarters.

### 2.6 Actions in the alpha (from the 09 §4 catalogue)
| Action | BW | Notes |
|---|---|---|
| Buy / sell machines (new or used) | 0 | |
| Set the HODL / sell % | 0 | The big swing decision |
| Crypto-backed loan | 1 | Enables margin calls |
| Equipment loan | 1 | Secured on machines |
| Scout the next site tier | 1 | |
| Build or upgrade a site | 1 | |
| Negotiate a power contract | 2 | Negotiation mini-game (**first to cut**, falls back to "accept offer") |
| Pitch investors (F&F → seed → Series A) | 2 | Negotiation mini-game, same fallback |
| IPO / SPAC roadshow | 3 | Only in the 2021 window (Q1–Q4 2021) |
| Bid on distressed assets | 2 | Auction mini-game |
| Hire | 1 | See §2.8 |
| Community outreach | 1 | Costs cash, lowers Heat |
| Noise mitigation (capex) | 0 | Lowers Heat permanently on that site |
| Read the market | 1 | Hints at next quarter's trend or a rumour |

Heat = base + load + grievance + era. Grievance decays 5 per quarter. Outreach and mitigation values live in heat.json. The Heat 50 effect is a temporary power surcharge until event cards are built.

### 2.7 Interrupts and mini-games (all four groups from the 09 §7 decision)
| Interrupt | Trigger | Choices |
|---|---|---|
| Price spike / crash alert | Price move above a threshold in a week | Sell treasury now / hold |
| Grid curtailment | Heat waves; Winter Storm Uri (Q1 2021) | Curtail and get paid / keep mining (reputation hit) |
| Machine failure wave | Heat, used machines | Repair (cash) / run degraded |
| Neighbour complaint | Heat ≥ 30 | Pay / mitigate / ignore (escalates) |
| Distressed auction | Crypto winters (2018–19, 2022) | Sealed bid against 2–3 rivals |
| Margin call | Price drop with a crypto-backed loan | Post collateral / sell machines / default |
| Negotiation | Power contract, investors | 3 rounds of offer and counter-offer against a hidden limit |

At most 3 interrupts per quarter. Each has a sensible default, so skipping is always possible.

### 2.8 People: 5 hire types
| Hire | Effect |
|---|---|
| Ops Manager | −50% machine failures |
| Trader | Read the market costs 0 BW. Margin-call warning 1 week earlier |
| BD Lead | Scouting reveals +1 offer, and hidden flaws are shown |
| Ex-Utility Exec | Site builds take −1 quarter, and power negotiations start from better terms |
| Chief of Staff | +1 Bandwidth |

Each hire has a quarterly salary. Maximum one of each.

### 2.9 Rivals (light)
- 4 named rivals (e.g. Riot, Marathon, Core Scientific, Bitfarms) with **scripted growth curves**, not AI.
- They bid in auctions and appear on a **league table** (hashrate and valuation).

### 2.10 Events: 20 cards
- **10 scripted historical** (§2.3 shocks plus the 2017 GPU shortage, the 2019 "rent your GPUs as cloud" rumour as flavour, and the 2021 SPAC mania).
- **10 random** (neighbour disputes, landlord trouble, a fire, a customs delay on machines, a tax audit, a friend wanting their money back, and so on).
- All written as data files (`src/content/events/*.json`), checked against a schema.

### 2.11 Lose, end and score
- **Cash below zero at the end of a quarter →** machines are force-sold at used prices. **Still negative →** game over screen, showing what went wrong.
- **Margin-call default →** the collateral is seized. If that makes cash negative, the rule above applies.
- **End: the Merge decision screen** (4 choices from 08 §3c). The alpha shows the choice and a text preview of its Act II consequence, then the **chapter report**. Act II itself is not built.
- **Score:** founder net worth at the Merge, plus the peak valuation reached, plus rank against rivals.

### 2.12 Screens (the brief for Claude Design)
1. Title / new game (seed field optional)
2. **Plan dashboard:** cash, BW, treasury, prices, hashprice, Heat, date, action menu
3. **Fleet and sites:** machines by site, buy/sell, capacity used vs. available
4. **Capital:** loans, investors, cap table, the IPO window
5. **Live quarter overlay:** week ticker, price sparkline, speed controls
6. **Interrupt / event card** (Reigns-style)
7. **Negotiation modal**
8. **Auction modal**
9. **Quarter report**, with the league table
10. **Merge decision** and chapter report
11. **Game over**
12. Settings (sound on/off, speed default, save/load)

### 2.13 Other must-haves
- **Save:** autosave every quarter, 1 manual slot, export/import as a string.
- **Onboarding (minimal):** Q1 2017 is guided by 5–6 contextual tooltips. There's no full tutorial.
- **Tech:** per 06 (TypeScript, Vite, Preact, pure sim core). All text goes through `t()`, English only.
- **Platform:** desktop browser, Chrome/Edge/Firefox, 1280×720 and larger.
- **Deploy:** a private link (Cloudflare Pages or GitHub Pages).
- **Sound:** 5–8 ZzFX sounds. *(Nice to have: first thing dropped from polish.)*

---

## 3. Not in the alpha (post-alpha backlog)

Anything not listed in §2 is out. These are named explicitly so they don't creep back in:

- Acts II–IV, the Deal Desk, AI tenants, GPU cloud renting, hosting for others (the Merge only *previews* these)
- A map or regions in Act I (the site ladder replaces it)
- Pre-ordering machines, overclocking, coin switching, maintenance sprints, hedging, due-diligence checks, conferences
- Bonds, debt beyond the two loan types, JV partners
- Stakeholder meters beyond Community Heat; lobbying; political capital
- Rival AI behaviour (they follow scripts), buying rivals
- Board / investor quarterly goals (09 §6): **first add-back** if the alpha feels aimless
- Achievements, Steam, portals, ads, cloud saves, analytics
- Mobile / portrait layout, controller support
- Romanian translation, music, animated art
- Multiple difficulty levels, scenario mode, daily seeds

**Change rule:** a new idea goes into the backlog, not the alpha. It can only enter the alpha by **replacing** something of similar size, and that swap gets written into this document.

---

## 4. Cut order if the schedule slips

Cut from the top, one item at a time:

1. Negotiation mini-game → fixed "accept or decline" offers
2. Investor pitch → fixed offers per stage (same fallback)
3. Sound
4. Grid curtailment → a single scripted Winter Storm Uri event only
5. Distressed auctions → a fixed-price "buy the distressed lot" offer
6. Hires reduced from 5 to 3 (Ops Manager, BD Lead, Chief of Staff)

**Never cut:** the HODL/sell decision, the site ladder, crypto-backed loans with margin calls, the live quarter, the Merge decision, save/load. Those are the core of Act I.

---

## 5. Done when (the alpha exit checklist)

**Playable**
- [ ] A full run from Q1 2017 to the Merge takes **35–50 minutes** for a first-time player
- [ ] Every quarter offers **at least 3 meaningful decisions** (checked by playing, not assumed)
- [ ] 5 full runs with no crash and no stuck state
- [ ] Save, reload and export/import work at any point, including mid-live-quarter

**Balance** (anchors from 08 §3e / economy-model.xlsx, Mining_* tabs)
- [ ] A Gen 1 GPU rig in the garage earns **~+$5/day in Q4 2017** and **loses money in Q4 2018**
- [ ] **Reinvesting 100% every quarter goes bust** somewhere in 2018 Q2 – 2019 Q2 (sim-runner, "all-in" bot)
- [ ] The scripted "good player" path peaks at **~$1.5–2.5B valuation in 2021** and reaches the Merge at **−80% to −95% from peak**
- [ ] A cautious bot survives but finishes clearly below the good path
- [ ] Some runs reach the Merge with **empty energized MW**, which makes the Merge choice real

**Quality**
- [ ] Golden-replay test passes (fixed seed + action log → same end state)
- [ ] The sim-runner completes 1,000 bot runs in under a minute and writes a CSV
- [ ] All content files pass schema validation on build
- [ ] The build loads in under 3 seconds on a normal connection

**People**
- [ ] 3 playtesters who haven't seen the design finish a run and fill in the feedback form
- [ ] At least 2 of 3 say they'd want to play Act II

**Go/no-go gate:** once all of the above are checked, review the feedback and decide: **go** to Act II, **fix** Act I first, or **rethink**.

---

## 6. Dependencies on the next Phase 0 steps
- **Step 2 (paper prototype):** play about 8 quarters in the spreadsheet using the §2.6 action list. If a quarter feels empty on paper, adjust §2 before coding.
- **Step 3 (content and data):** needed before week 2 of development:
  - Quarterly BTC and ETH prices and difficulty, 2017–2022
  - Specs and price curves for the 4 machines
  - The 20 event cards, the 5 hires, and 4 rival growth curves
  - Tooltip text for the guided first quarter
- **Step 4 (setup):** the repo and `CLAUDE.md`. This document goes into the repo as `docs/alpha-0.1-scope.md`.

---

## 7. Defaults I set (change any of them before development starts)
1. **GPUs mine ETH only, ASICs mine BTC only.** No other coins.
2. **No map in Act I.** Sites are a ladder; the map arrives with Act II.
3. **One manual save slot** plus autosave.
4. **Bandwidth maximum is 6** in Act I.
5. **Rivals are scripted**, not simulated.
6. **The Merge decision is shown but not played out.** Act II consequences appear as text only.
7. **Working title stays "Garage to Gigawatt"** until the naming check in Phase 4.
