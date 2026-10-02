# Act III wireframes (A3-01 … A3-12)

Exported 30 Sep 2026 from the "G2G Act III – Wireframes" canvas (https://claude.ai/artifact/VVSXzu1q7MMZZiZdzSG8UF), drawn from doc 30 part B (`docs/game-project-files/claude_30-act-iii-wireframe-prompt.md`). Each `.dc.html` is one 1280×720 artboard's markup (it needs the canvas runtime `support.js`, so read it as a layout spec). `canvas.json` holds the canvas notes: grey = explanations, orange = conflicts (resolved below).

| File | Screen |
|---|---|
| Flow.dc.html | Flow: intro → Plan with Signals ×16 → live quarter → quarter report with renewals → … → chapter report (the only reveal) |
| Main.dc.html | A3-01 Act III intro: what you carry in (act3Entry), what's new |
| A3-02-Plan.dc.html | A3-02 Plan with the Signals panel (Q4 2027) and "Contracts due" |
| A3-03-Read.dc.html | A3-03 Read the market (modal): pick one indicator, the true range, your reads |
| A3-04-Contracts.dc.html | A3-04 Contracts: the renewal-wall chart and the contract table |
| A3-05-Renewal.dc.html | A3-05 Renewal due: offer state and walked state |
| A3-06-Reopener.dc.html | A3-06 Reopener: tenant-triggered and player-triggered |
| A3-07-Racks.dc.html | A3-07 Racks and retrofit (step 5) |
| A3-08-Nuclear.dc.html | A3-08 Power slot with a nuclear PPA (step 6) |
| A3-09-Government.dc.html | A3-09 Government: political capital (step 6) |
| A3-10-Events.dc.html | A3-10 Event cards: a scenario card and a wildcard |
| A3-11-Report.dc.html | A3-11 Chapter report with the scenario reveal and the reading score |
| A3-12-Title.dc.html | A3-12 Title: Start at Act III (presets) and Scenario Mode |
| Components.dc.html | New components: signal gauge, contract row, renewal wall, offer block, fee line, density badge and fit matrix, political-capital meter, reveal timeline |

## Rules
- **Layout from the wireframes, look from the design system** (`docs/design-system/`, the `grid` era theme, icons 79–89). Wireframes are greyscale.
- **Mechanics from doc 27 and the built rules** (dev-notes: M11–M12). Where a wireframe's sample figure or label disagrees with the rules, the rules win.
- **Nothing reveals the scenario before A3-11**: no scenario name, phase or role tag; no decoy marking; no future quarter's value; no renewal offer before it opens. Signal arrows are neutral ink (▲ ▶ ▼), never gain/loss colours.

## Conflicts from the canvas notes, resolved by the design thread (30 Sep 2026)
1. **act3Entry baseline (o01):** act3Entry records both the company valuation and the founder net worth. The chapter report shows both; the growth multiple, score and title use **founder net worth** (doc 27 D14: "net worth at 2030Q4"). The wireframe's "$512M vs $431M" mixes the two; build it from the two act3Entry fields.
2. **Live prices and the scenario (o04):** show the **current quarter's** new-contract rate, nuclear PPA $/MWh and mid→top retrofit cost live, like GPU rents and BTC. They're market prices the player can observe, never future values. Checked in the data: before each trigger the four scenarios' values sit within a few percent of each other (nuclear $115–118/MWh at 2027Q3; mid→top retrofit $6.58–6.66M/MW at 2027Q1) and diverge gradually, like any price. ~~Noted for balance: the new-lease index (RFPmid) opens 2027Q1 at 0.90–1.02 across scenarios, the widest early spread; revisit in step 7 if playtests show it gives the scenario away.~~ **Fixed in M15.1 (1 Oct 2026):** 2027Q1 is now 0.88–1.04 in all four scenarios (mid 0.96) and 2027Q2 halved toward it, so the opening quarter doesn't reveal the scenario.
3. **Reopener example lease (o06):** the 20 MW 2027Q1 lease is an illustration only; in the game the calendar lists every contract, including leases signed in Act III.
4. **Good preset (o12):** doc 27 v1.1 wins (~$400–450M). presets_act3.json still says ~$1B; its correction is flag F-6, done in step 7.
   **Done in M18.3 / M18.8 (2 Oct 2026):** Good ~$412.6M (shell-capital seed 9), Lifeline ~$155.7M (lifeline-shell seed 19). Great is
   "the best great-path company at 2026Q4" (design thread): **~$2.7B** (asic-retirer seed 48), not the wireframe's ~$4.5–5B, which was
   the great path's 2025 peak, not a 2026Q4 value. The A3-12 cards show each preset's real valuation with "~".
5. **Denser halls host older chips (n07):** yes. A mid or top hall can run any generation that fits a lower tier.
6. **A3-05 walked state:** the built rule (M12.2 decision 2) is that a walked shell tenant goes to the re-let path automatically, at **0 Bandwidth**. The screen should show that as the default ("Re-let · automatic · 0 BW") with the alternative "Keep the MW empty" (0 BW, e.g. to use them for your own GPUs). The 1-BW re-let applies only when the player chooses re-let instead of accepting an offer.
