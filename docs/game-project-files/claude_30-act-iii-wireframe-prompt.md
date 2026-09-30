# 30: Act III wireframe prompt ("Reckoning", 2027–2030)

*v1.0, 30 Sep 2026. For a Claude Design canvas, like doc 21 (Act II) and doc 25 prompt B (Prologue). Built on doc 27 v1.1 (frozen) and doc 28's content pack. Part A (design system additions) is optional and runs in the design system; Part B is the wireframe canvas. Doc 29 stays reserved for the Alpha 0.4 scope.*

---

## Part A (optional, run in the "Garage to Gigawatt" design system first)

Extend the design system for Act III, "Reckoning" (2027Q1–2030Q4). Keep everything inside the existing system: same fonts, spacing, radii, components, number formats and colour-blind rules (gain teal-blue, loss brick red, every delta also carries ▲▼ or +/−, hatching for danger).

1. **An Act III era theme, `grid`:** a control-room ledger. Cooler paper and panel than `campus`, and one muted accent that doesn't collide with gain, loss, warn, heat or the rival series colours. It overrides colour tokens only (like `bedroom`). Deliver the `[data-theme="grid"]` block in `tokens.css` / `tokens.json`, a contrast table, and the Plan dashboard in `grid` next to `campus`.
2. **Ten icons** matching the existing set (20×20, 1.5px stroke, `currentColor`, no text, no logos): `signals` (six small bars), `read-market` (already exists: reuse it), `calendar-wall` (a calendar with a stacked bar), `renewal` (a circular arrow around a document), `walk` (a figure leaving a door), `reopener` (an unlocked padlock over a document), `retrofit` (a rack with an up arrow), `density` (three stacked rack tiers), `nuclear-ppa` (a cooling tower, no radiation symbol), `political-capital` (a column building with a small meter), `wildcard` (a card with a star), `reveal` (an eye over a curtain).

---

## Part B: the Act III wireframes (Claude Design canvas "G2G Act III – Wireframes")

### Task
Draw the Act III screens for a turn-based finance game about building AI-capacity businesses. Act III continues from Act II (2022–2026) or starts from a preset, runs 16 quarters (2027Q1–2030Q4), and asks one question: can the player read weak signals and survive a hidden scenario nobody told them about, and do their Act II contracts come back as decisions at the renewal wall?

### Style rules (same as Acts I–II and the Prologue, strict)
- Greyscale layout wireframes at 1280×720, real copy and real numbers (the example data below), no lorem ipsum. The look comes later from the design system (`grid` era theme); primary action = ink.
- Reuse the existing Act II screens and components wherever a screen already exists (top bar, left nav, Plan dashboard layout, Deal builder, event card, league table, quarter report, negotiation modal). Mark reused parts as reused.
- Numbers in DM Mono-style tabular figures, right-aligned. Deltas always carry ▲▼ or +/−.

### The hard rule: nothing reveals the scenario before the chapter report
The game secretly draws one of four scenarios at the start of Act III. The player must work it out from the Signals. So, on every screen except the chapter report:
- never show a scenario name, id, phase ("signal window", "trigger", "aftermath") or any "role" tag (signature, decoy);
- never label an indicator as the decoy or as "important this campaign";
- never show a future quarter's value or a renewal offer before it arrives.
The chapter report (A3-11) is where all of this is revealed.

### Persistent layout changes (Act III)
- Top bar adds: **Signals** (a compact strip of the six indicators with arrows) and **Contracts due** (the count in the next 4 quarters).
- Left nav: Dashboard · Sites & Fleet · Projects · **Contracts** (new) · Capital · **Government** (new, from 2027Q3 or once political capital is active) · League · Log.

### Screens to draw (12 artboards)

**A3-01 Act III intro (2027Q1).** A short story line ("2027. The build-out is priced for perfection."). What carried over (the act3Entry record: valuation, founder net worth, cash, debt, energized and contracted MW, rating) next to Act II's end. What's new in one line each: the Signals panel, the contract calendar and renewals, rack density, nuclear PPAs, political capital. "Enter 2027 →". No scenario information at all.

**A3-02 Plan dashboard with the Signals panel.** Act II's Plan dashboard plus a Signals panel: six indicators, each a 0–100 value with a trend arrow and a small history sparkline (past quarters only), and a one-line tooltip from its "higher means" text. One action on the panel: **Read the market · 1 BW**, which opens A3-03. If the player read an indicator this quarter, that indicator shows its revealed range as a band on its gauge, with the note. A "Contracts due" strip below it (the next 4 quarters: tenant, MW, end quarter).

**A3-03 Read the market (modal).** Choose one of the six indicators (radio list with current value and arrow). Result state: the revealed range (e.g. "60–66") drawn on a 0–100 scale around the displayed value, plus the authored note. A log of past reads (quarter, indicator, range). Rule line: "Once a quarter, 1 Bandwidth. The panel's values are noisy readings; a read shows the true range."

**A3-04 Contracts: the calendar.** A table of every tenant contract sorted by end quarter: tenant (card and type), kind (shell lease / GPU contract), MW or GPUs, current rent ($/MW-yr or $/GPU-hr), the comparable new-contract rate today, quarters left, flags (tenant in distress; reopener available from year 3). Above it, the "renewal wall": a bar chart of MW coming due per quarter, 2027Q1–2030Q4, from contract end dates only (known facts, not forecasts). A total row: annual rent coming due in the next 4 and the next 8 quarters.

**A3-05 Renewal due (modal), two states.**
- *Offer:* tenant, contract, current rent, the tenant's offer (rent and term; show the change vs their own rent, e.g. "−46%"), the walk chance it just survived, and three choices: **Accept** (0 BW, default, marked), **Counter** (2 BW, opens Act II's negotiation modal; warn that pushing past the tenant's limit can make it walk), **Re-let** (1 BW: "2 quarters empty, then a new tenant at today's new-lease rate", with the estimate).
- *Walked:* "Your tenant is not renewing." What happens at term end, and the re-let option.

**A3-06 Reopener (modal).** For Act III leases from their third year. Two variants: the tenant triggers it (they pay you the exit fee; you get the renewal choices at today's band), and you trigger it (1 BW; you pay the fee). Show the fee as "½ of one quarter's rent" with the amount.

**A3-07 Racks and retrofit.** Sites & Fleet with each hall's rack-density tier (low 40–60 kW, mid ~125 kW, top ~600 kW) as a badge. A fit matrix: GPU generation × tier (H100/H200 low; Blackwell and Rubin mid; Rubin Ultra top, from 2027Q3). A retrofit project card: low→mid $1.5M/MW over 10 weeks; mid→top priced from the market, 26 weeks; the hall earns nothing while it's retrofitted. (Built in a later step; draw it now.)

**A3-08 Power slot with a nuclear PPA.** The Deal builder's Power slot with a new option: a nuclear PPA, from 2027Q3, only in PJM, Ohio, Georgia and the Nordics: $/MWh, 15-year fixed term, take-or-pay, no grid queue. Show the take-or-pay cost if the site runs below the contracted power. Greyed out, with the reason, in other regions. (Later step; draw it now.)

**A3-09 Government: political capital.** A 0–100 meter (starts at 40, −2 a quarter without upkeep; below 15 a warning state with the penalty). The Government Affairs Director hire ($450K a quarter, +3 a quarter). Lobbying actions (cost, weeks, capital gained). Spend cards (e.g. moratorium override, permit fast-track) with their capital cost. (Later step; draw it now.)

**A3-10 Event cards.** Two examples on Act II's event card: a scenario card (e.g. "Spreads Blink": a lender-spread scare, with its choices) and a wildcard card (a grid emergency). Neither shows a role tag or which scenario it belongs to; the wildcard may carry a small "Wildcard" stamp, since wildcards are drawn independently of the scenario.

**A3-11 Act III chapter report, with the scenario reveal.** The one screen where everything is revealed:
- "The market you played was: **The Great Repricing**" and one paragraph of what happened (trigger quarter and card title).
- The false alarm: which indicator moved for another reason, when, and why ("the tell").
- **Your reading:** a timeline 2027Q1–2030Q4 with the trigger marked and the player's big moves placed on it (sold, hedged, shortened contracts, added leverage, bought distressed), each labelled "N quarters before/after".
- The reading score 0–100 with its title band and one line of wording.
- Net worth at 2030Q4 against the act3Entry value (growth multiple), survival, the title band, and the rivals' fates.
- "Continue" (Act IV isn't built: "The story continues in a future update").

**A3-12 Title: start at Act III, and Scenario Mode.** The title screen's New career adds "Start at Act III (2027)" with three preset companies (Good ~$400–450M, Great ~$4.5–5B, Lifeline ~$150M: name, valuation, MW, debt, rating, one-line summary). A separate "Scenario Mode" option (replays only, after finishing Act III once): pick the scenario openly.

Also draw a **Flow** board (intro → Plan with Signals → live quarter → quarter report with renewals and signal changes → … 2030Q4 → chapter report with reveal) and a **component sheet** for the new components: signal gauge (value, arrow, sparkline, revealed band), contract row, renewal-wall bar chart, renewal offer block, reopener fee line, density badge and fit matrix, political-capital meter, reveal timeline.

### Example data (use it; the player-visible numbers are consistent with doc 28)
- **Quarter:** Q4 2027, Plan. Company: valuation $431M, cash $38M, debt $164M, rating BB−, 120 MW energized, 90 MW contracted, Bandwidth 4 of 5.
- **Signals, Q4 2027 (displayed):** Revenue Gap 73 ▲ · Lender Spreads 64 ▲ · Chip Lead Times 77 ▶ (flat) · Grid Reserve Margin 50 ▶ · Efficiency Index 56 ▲ · Bitcoin Hashprice 41 ▼. Q3 2027 for the sparklines: 57, 54, 74, 51, 44, 50.
- **Read this quarter:** Lender Spreads, range 60–66, note "GPU-backed loans are pricing near SOFR+650 bp (2026Q4: +475)." Higher means: "wider spreads on GPU-backed and project loans (tighter credit; 50 = SOFR+475 bp, the 2026Q4 level)."
- **Contracts:**
  - Neocloud master lease, 40 MW, $2.6M/MW-yr ($104M/yr), ends 2028Q2 (signed 2023Q3, 5 years);
  - H100 GPU contract, 4,000 GPUs at $2.10/GPU-hr, ends 2028Q1;
  - AI-lab lease, 25 MW, $2.9M/MW-yr ($72.5M/yr), ends 2028Q4, flag: tenant in distress;
  - Hyperscaler lease, 25 MW, $1.8M/MW-yr, ends 2038Q4 (15 years).
- **Renewal example (A3-05, in 2028Q2):** the neocloud lease: offer $56M/yr (0.54× its own rent, −46%), 4-year term; it passed a 40% walk chance; re-let estimate: 2 quarters empty, then ~$47M/yr. (These match the chapter report's scenario, so the example tells one consistent story.)
- **Reopener example:** a 2027Q1 lease of 20 MW at $2.2M/MW-yr ($44M/yr) in 2030Q1: exit fee $5.5M.
- **Political capital:** 34 (was 36), Government Affairs Director not hired; "Join the data-center coalition" $250K, 4 weeks, +8.
- **Chapter report (A3-11):** The Great Repricing; trigger 2028Q1 "The Round That Didn't Close"; false alarm: Chip Lead Times, 2027Q2–Q4 (an HBM4 memory yield problem, supply-side, not demand); your moves: shortened GPU contracts 2027Q3 (2 quarters before), sold a 20 MW site 2027Q4 (1 quarter before), added debt 2028Q2 (1 quarter after); reading score 64, "Signal Reader" ("You read the market before it read you."); net worth $512M vs $431M at entry (1.19×), survived; rival fates: IREN "Sells BTC and pauses Sweetwater; survives on Microsoft prepay." · Hut 8 "Investment-grade tenant holds; equity −55% but cash-flow intact." · Cipher "Backstopped Fluidstack lease holds; AWS lease unaffected."
- **Title bands (Act III):** Bagholder 0–19 · Weathervane 20–39 · Steady Hand 40–59 · Signal Reader 60–79 · Cassandra with a Balance Sheet 80–100 (reading score).

### Deliverable
One canvas with the 12 artboards, the Flow board and the component sheet, plus short sticky notes where a rule needs explaining (and orange notes for any conflict you find between this brief and the numbers). Use real company names only for the rivals in the chapter report; invented names for the player's tenants. Don't draw the Core Scientific or CoreWeave fates (they need an editorial review first, doc 27 §15).
