# 46: Content task: Act V content and data pack for "Garage to Gigawatt" (design thread, 10 Oct 2026)

*(Paste everything below the line into a new chat in the "G2G" project. It's written to run in one go. The result is doc 47.)*

---

## Your role and the goal

You are the content designer and research lead for **Garage to Gigawatt**, a grounded, finance-first business simulation built by one developer with Claude Code. Five acts run from a bedroom bitcoin miner in 2009 to an energy and compute company in 2040. The Prologue and Acts I-IV (to 2035) are built, balanced and public. You are writing the **content and data pack for Act V, "Firm" (2036Q1 → 2040Q4, 20 quarters)**.

Act V's premise: the plants a player backed in 2027-35 switch on (or fail), the grid queue is years long, and the player decides what kind of megawatt the late 2030s will pay for (firm, flexible, orbital or none), then decides what the company is worth in a final exit. At the start of the act the game secretly draws **one of four futures**; the player reads six authored **Signals**, one of which is a decoy, and positions the company before the trigger.

Everything after 2035 is speculative. **This pack is labelled fiction built on real evidence:** four internally consistent futures grounded in the research already done (docs 37, 40, 45), with every invented number marked as designed. Your output is data and text that Claude Code turns into game files, so precision and consistency matter more than prose.

Work through the whole task in one go. Don't stop to ask questions. Where something is ambiguous, pick the option most consistent with doc 43, record it as an assumption, and carry on.

## Step 0: Read first, in this order

1. **`claude/claude_43-act-v-design.md` (doc 43, v1.1), the single source of truth.** Its **§0 (v1.1 amendments, §0.1-0.8) overrides the later sections** wherever they disagree. Decisions V-D1 to V-D30 are approved; don't reopen them.
2. **`claude/claude_45-act-v-research.md` (doc 45):** the sourced values behind §0.4. Use its recommended values; cite it.
3. **`claude/claude_40-second-research-pass.md` (doc 40), Part D:** the five candidate futures (four are used), the decoys, and their evidence.
4. **`claude/claude_37-energy-and-2040-dossier.md` (doc 37)** and **`claude/claude_38-energy-ventures-design.md` (doc 38):** the venture classes, their schedules and the energy assets that carry into Act V.
5. **`claude/claude_33-act-iv-design.md` (doc 33):** Act IV's design, for tone, the futures-and-Signals pattern (§6), the file list (§16) and the four Act IV futures F1-F4 a player arrives from.
6. **Formats:** copies of Act IV's formats are in this project under `claude/act4-formats/`: the content README (provenance style), `market_iv_f1.csv` (the exact column set to continue) and `signals_iv_f1.json` (the Signals structure). Follow them. For files without a sample (events, wildcards, rivals, text), follow doc 33 §16; Claude Code will adapt the shape. Match Act IV's conventions where you know them: one row per quarter, `quarter` as "2036Q1", a `future` column, numbers without units in cells, units in column names.

## What's fixed (don't change these)

- **Span:** 2036Q1-2040Q4, 20 quarters (act quarters 0-19). **Futures and weights:** V1 Queue is King 30%, V2 Flexible Lane 25%, V3 Demand Plateau 25%, V4 Up and Out 20%. **Triggers** land 2037Q2-2038Q3; Signals move 2-4 quarters before, never before 2036Q3.
- **Common baseline:** every value the UI can show is identical across the four futures in 2036Q1-Q2 and within ±3% of each other through 2036Q4 (doc 43 V-B14). The game glides each player's Act IV values to this baseline over 4 quarters, so the baseline must not depend on the Act IV future. Where doc 43 or doc 45 gives a 2036 value, use it; otherwise set the baseline at the median of the four Act IV futures' 2035Q4 values (doc 33 §6.2 and the Act IV market files) and say so.
- **2036 anchors from doc 43 §0:** AI demand index 100; `scarcity_index` 1.0; powered value $300K/MW; queue premium $100/kW; grid waits PJM 20, ERCOT 12, other regions 16 quarters; launch $300/kg (LEO); plant multiples 10x contracted / 7.5x merchant; fund bid index 1.0.
- **The futures' directions (doc 43 §6.2 as amended by §0.2 and §0.4):**
  - V1: demand 100 → 145; waits rise (PJM 20 → 24, others up ~20%); `scarcity_index` 1.0 → 1.1 at the trigger, then → 1.5 by 2040Q4; powered value → $500K/MW; queue premium → $300/kW; PJM capacity at the cap, the cap lifted 30% after the trigger; merchant power +25%; merchant multiple 8.5x after the trigger; 10-hour spread $45/MWh.
  - V2: demand → 135; a fast lane for curtailable load from the trigger (4-8 quarters, up to 180 h a year, −0.5% output, 24-hour notice); firm waits ease ~15%; scarcity → ~1.1; powered value → $150K/MW; queue premium → $25/kW; capacity prices −20% after the trigger.
  - V3: demand 100 → 105 then flat (the plateau is [D]); waits shorten as speculative projects withdraw (withdrawals 30%/yr); scarcity 1.0 to the trigger, → 0.8 by 2039Q4; powered value → $100K/MW; queue premium → $25/kW; capacity prices −50% and merchant power −30% after the trigger; merchant multiple 6x; fund bid 0.85-1.00 after the trigger; 10-hour spread $20/MWh.
  - V4: demand → 125 with a growing share in orbit; launch $300 → $100/kg by 2040; orbit-vs-ground cost ~0.9x by 2040; ground softens late (scarcity ~1.0 then 0.9 from 2039; powered value → $200K/MW).
- **Known timeline (every future):** bitcoin halvings 2036Q1 (subsidy 0.390625) and 2040Q1 (0.1953125); no federal clean credit for projects starting construction after 2035 (plants started by 2033 keep theirs); NIST's post-quantum deadlines passed (2035); fusion: no output before 2038 in any future; no announced chip generation after ~2038; a "licensing clock" card (−2 quarters on SMR licences) in every future.
- **Names:** fictional companies only; no real company, agency or country names in game text; real names only in provenance notes. Run a name-clash check on every new name (search the web for the exact name plus the industry; reject it if a real company in energy, data centres, space or finance uses it, as "Meridian Arc" was rejected for clashing with a real constellation).

## Per future (V1-V4): what to write

### A. `market_v_v1..v4.csv` (20 quarterly rows each)
Two groups of columns:
1. **Every column the carried Act II-IV systems read, continued to 2040Q4.** These are Act IV's market columns (as in `market_iv_f*.csv`): BTC close, difficulty, hashrate, block subsidy, hashprice; GPU rates by class and tenant type (H100 … Rubin Ultra, plus any later generic generations Act IV added); GPU and rack purchase prices; capex per MW (hosting, retrofit, greenfield shell, full stack, density retrofit); SOFR, HY spread, DDTL spread, hyperscale cap rate; mining and AI EV/EBITDA and EV per MW; regional power prices (ERCOT, PJM, Ohio, Georgia, Arizona, Nordics); PJM capacity price; hyperscaler capex; nuclear PPA price; renewal and RFP indices and offer terms; tenant default and walk probabilities; launch $/kg and slots; satellite build cost; insurance capacity and rates; congestion per shell; orbital shell rent and orbital GPU rate; sovereign premium; `grid_wait_q`, `gas_wait_q`; space EV/EBITDA; lunar transport and offtake columns; satellite generation masses. If a carried column has no meaning after 2035 (for example a retired GPU class), continue it flat and say so.
2. **New Act V columns (doc 43 §0, §16):** `ai_demand_index_v` (2036 = 100), `scarcity_index`, `powered_value_usd_mw`, `queue_premium_usd_kw`, `grid_wait_q_pjm`, `grid_wait_q_ercot`, `grid_wait_q_other`, `fast_lane_q` (blank when none), `fast_lane_curtail_h_yr`, `upgrade_usd_kw_median_pjm`, `upgrade_usd_kw_median_ercot` (doc 45: $150 PJM/MISO, $100 ERCOT/SPP, with a 20% chance of a $400-600 tail drawn in play), `queue_withdrawal_pct_yr`, `plant_mult_contracted`, `plant_mult_merchant`, `infra_bid_index`, `peak_spread_10h_usd_mwh`, `capacity_rating_nuclear`, `capacity_rating_cc`, `capacity_rating_ct`, `capacity_rating_storage_8h`, `capacity_rating_storage_10h` (doc 45 §Q5), `lunar_value_index`, `btc_fee_share_pct`, `exit_bid_low`, `exit_bid_high` (doc 45 §Q7: 1.05-1.25; V1 1.15-1.30; V3 0.95-1.10).
- **Never** put a hidden value in a market file: the exit's post-2040 outlook factors and the reading score's ideal stances go in hidden files (below).
- **Weekly files** (`market_weekly_v_v1..v4.csv`): weekly BTC, hashprice and regional power for the live quarter, derived from the quarterly path with plausible noise, ending each quarter on the quarterly value (the game's loader checks this).

### B. `signals_v_v1..v4.json`
The six indicators from doc 43 §6.3 (Grid Queue, Capacity Market, AI Demand, Reform Docket, Launch Cadence, Firm Build-out), each 0-100 with a trend arrow per quarter, plus a sharp range shown by "Read the market". Each future moves 2-3 indicators meaningfully; the rest drift near neutral. The decoy (doc 43 §6.4): **the SMR wave** in V1, V2 and V4 (Firm Build-out jumps on announced orderbooks, telling the player firm power is about to be abundant), and in V3 **a record capacity auction** that tempts the V1 reading, then relief. Give each signal series a one-line news headline per quarter in which it moves (fictional names), and the decoy's tell (what a careful reader could have noticed).

### C. Scripted cards (~8 per future, in `events_v.json`)
Each card: id, future, quarter window, headline, body (2-3 sentences), the choice(s) with their default, the effects in game terms (which column, Heat, Anger, political capital, a plant event), and a one-line basis (the real precedent or "designed"). Mix: grid and queue news, reform steps, demand surprises, a plant milestone or trip, a fund approaching to buy a plant, an orbital block's end of life, a rival's move.

### D. Rivals' fates (`rivals_v.json`)
Act IV's fictional rivals carry (Pallas Compute, Northgate, Cratermark, Lantern Arc; Orrery Compute only if it survived Act IV), plus **one new firm-power developer** (doc 43 §12, working name "Basalt Power": run the clash check and replace if needed) whose fate tells the SMR-wave story. Per future: each rival's valuation and MW path by quarter (scaled like Act IV's), and a fate line for the chapter report.

### E. The reading score's ideal stances (hidden: `reading_score_v.json`)
Per future and quarter, the ideal stance on doc 43's "scarcity exposure" axis (+1 adds exposure, −1 sells or hedges, 0 calm), with weights, following §6.7 as amended by §0.2 (long lease = −1, short = +1): V1 offensive throughout; V2 offensive before the trigger, defensive after; V3 calm before the trigger, defensive after; V4 calm, defensive from 2039. Include the move-kind table (each Act V move and its sign, from doc 43 §14.1 and §0.2) so the code can check it.

## Written once (shared across the futures)

### F. `plants_v.json` (operating rules per class)
For SMR, advanced fission, EGS, fusion pilot, pumped storage, gas CC and CT, batteries and iron-air: fixed $/kW-yr, variable $/MWh (doc 45 §Q6: SMR $107/kW-yr ×1.3 for a single unit + $9/MWh; EGS $20/MWh all-in; gas CC $15 + $2.5, CT $10 + $5, plus fuel from the market file; pumped $18/kW-yr + $0.5/MWh), CF rules (doc 43 §7.1), contracted share at COD (90% SMR/advanced/EGS/fusion, 80% storage, 50% pumped hydro), capacity rating column used, debt terms (doc 43 §0.4: contracted ≤ 65% at SOFR + 200 over 15-18 years; merchant ≤ 40% at SOFR + 275 over 7 years with a 50% sweep; lock-up below DSCR 1.15; restructure after 4 quarters below 1.0, lenders take it after 8), follow-on unit terms (§7.4: EGS NOAK $4,000/kW and 7 quarters; SMR unit 2 at ×0.85 of unit 1's realised cost).

### G. `exit_v.json` (hidden part marked)
The bid range per future (public part, also in the market file) and the **hidden post-2040 outlook factors** (V1 1.15, V2 1.00, V3 0.85, V4 0.95, labelled [D]), plus the finale's one-line disclaimer that the outlook is the game's assumption, not a forecast.

### H. Wildcards (`wildcards_v.json`, 5; 2 are drawn per campaign)
Q-Day scare, fusion "net electric" headline, dry year, large-load moratorium (2-8 quarters, loads over 50 MW), transformer shortage (+2 quarters on new grid-connected assets and upgrades, 40% of draws +4). Each with its window, effects, and basis (doc 45 §Q8 for the last two; doc 40 §D6 for Q-Day; designed magnitudes labelled).

### I. Shared events (~8, in `events_v.json`)
The known-timeline cards (the two halvings, the licensing clock, the credit cliff, the chip roadmap's end) and a few future-neutral cards (a plant trip, a cash call, a transformer delay).

### J. Hires (`hires_v.json`)
Head of Grid Strategy (upgrade bills −25%, the $400-600 tail halved) and Head of Power Trading (+5% on merchant sales; contract output at market − 5% instead of − 10%), with cost and Bandwidth like Act IV's hires.

### K. Text (`text_v.en.json`) and the epilogue (`epilogue_v.json`)
- The Act V intro (A5-01), including **the exposure line** (doc 43 §0.8: the share of the company the futures can move: leases, free MW, plants) and the sentence that these futures are scenarios, not forecasts.
- Glossary entries for every new term (doc 43's term table: firm MW, flexible load, queue position, network upgrades, merchant, COD, infrastructure fund, capacity factor), plain language, one or two sentences each.
- Screen strings for A5-01 to A5-11 (doc 43 §17), chapter report texts (the reveal per future, the decoy's tell), the megawatt titles (Firm, Flexible, Orbital, Landlord: check they read well), the exit dialog.
- **Epilogue pools** (3-5 short lines chosen by end state): one per future, per exit choice (sold, sold the plants, held), per venture fate (built, slipped, cancelled, folded), the lunar production plant's fate (first tonnes 2039-43 or not), the bitcoin coda (the 2040 halving), and the arc line ("from 0.15 kW in a bedroom to …"). Text only, no number after 2040, hyphens rather than em dashes.

## Balance anchors to respect (the bots will test them)

From doc 43 §18 as amended by §0.8. The gate (M43.0d) is still running, so the archetype targets may move; your data should make these **plausible**, not force them:
- No archetype is best in every future.
- V1: the Holder beats the Seller by ≥ 1.2 and the Locker (ground-heavy companies).
- V2: a flexible operator beats the Holder by ≥ 1.15.
- V3: the Locker beats the Holder by ≥ 1.05.
- V4: an orbit replacer beats the Holder by ≥ 1.15.
- Perfect reader ≥ 1.15 × passive in 3 of 4 futures; the over-reactor ≤ 0.97 × passive in every future.
- Honesty: no fusion output before 2038; grid waits within each future's band; day one identical across futures.
If a value you'd choose for realism would plainly break one of these, keep the realistic value, flag it, and suggest the smallest change that would fix it.

## Output format (doc 47)

One markdown file, `claude/claude_47-act-v-content-pack.md`, plus the data files under `claude/act5-content/`:
1. **Summary:** the four futures in a table (one line, trigger, decoy, who wins, who loses, evidence grade).
2. **The data files** listed above, each complete.
3. **A provenance README** (`claude/act5-content/README.md`): for every column and rule, its value, grade ([A]/[B]/[C]/[D]) and source (doc 37/40/45 section, or "designed"), in the style of `docs/energy-content/README.md`.
4. **Assumptions:** every choice you made where the docs were silent ("mine, reversible").
5. **Name-clash check results:** each new name, what you searched, and the verdict.
6. **Open questions** for the design thread, numbered.

## Quality bar

- Every number traceable: a source, a derivation, or "designed".
- The four futures differ in what they reward, and the Signals give a careful reader a fair chance before each trigger; the decoys are fair (they have a tell).
- The baseline is identical across futures in 2036Q1-Q2 (check it before you finish).
- Fictional names only in game text; plain, short sentences; no em dashes in game text.
- Consistent with doc 43 §0 on every value it fixes. Where you disagree with doc 43, say so in the open questions; don't silently change it.
