# 39: The P&L and cash flow ("Finances") — build spec (design thread, 10 Oct 2026)

M37 — Finances: where the money goes and where the profit comes from (owner request). Presentation plus bookkeeping: no game-rule changes. Run in one go, one commit per step, one report at the end. (DT) = design thread's call, the owner can overrule.

WHY: the quarter report shows revenue, power, rent and EBITDA, but salaries, interest, repairs, insurance, Heat spending, fees, one-offs and investments move cash without their own lines, so the player can't see where money goes or which business or site earns it.

INVARIANTS: no rule changes. All `npm run sim` CSVs and tables byte-identical. Goldens change only by the new ledger fields in state (list the diff as "ledger only"). Main bundle under 500 KB (lazy-load the Finances screen if needed). Tests green.

## M37.1 — The ledger (the real work)
- One helper for every cash movement: `book(state, category, amountUsd, ref?)` (ref = site id, project id, block id, venture id, or none). Replace every direct change to state.cash in the sim with it, across all acts. Cash changes only through book().
- Categories (DT; one enum, each with its P&L or cash-flow section):
  - REVENUE: mining_btc, mining_eth, mining_other (value of coins mined, at the week's price), hosting_fees, ai_shell_rent, ai_cloud, orbit_revenue, grid_credits (curtailment, demand response), energy_income (resold power, PPA savings, storage income), other_income (card cash, grants, fees received). (Amended M37.7: prepayments are not income; see "Amendments".)
  - OPERATING COSTS: power (including reservation, capacity charge, take-or-pay, PPA), rent, salaries, repairs (machines and GPUs), insurance, ai_opex, orbit_opex, community (outreach, mitigation, Community Deal, lobbying, political capital spends), other_opex (fees not listed).
  - BELOW EBITDA: interest (all loans and facilities), finance_fees (arrangement, commitment, standby fees), one_offs (penalties, legal costs, damages, leave penalties, write-offs), taxes (event cards levy them). (Amended M37.7: no gain or loss on asset sales; see "Amendments".)
  - INVESTING (cash flow only): machines, site_builds, project_capex, gpus, retrofits, orbit_capex (builds, launches, deposits), lunar_capex, venture_calls, energy_assets, asset_sales (+, proceeds).
  - FINANCING (cash flow only): debt_drawn (+), debt_repaid (−), equity_raised (+), founder_payouts (− if any).
  - TREASURY (cash flow only): coins_sold (+), coins_bought (−).
- Mined coins: the P&L counts the coins mined at their value when mined (revenue). Cash only moves when coins are sold. So the cash flow shows "Coins kept (not sold)" as a non-cash adjustment in operating cash, and "Coins sold" in Treasury.
- Storage in state (compact): per quarter, totals by category, and per ref (site, project, block, venture) totals by category group; plus 13 weekly end-of-week cash values for each quarter. Kept for the whole career.
- Reconciliation (a test, and an assertion in the sim self-check): for every quarter of every golden and sim run, start cash + the sum of the quarter's cash-moving lines = end cash, exactly; the "untagged" bucket must be 0. This is the test that proves every cash movement is labelled.
- Old saves: the ledger starts at load. Where past quarter reports are stored, backfill their known lines (revenue, power, rent, EBITDA) marked "partial"; the Finances screen shows "Full detail from {quarter}".
- No depreciation (the game has none): investments appear in the cash flow, not the P&L. Say so in a one-line note on the P&L.

## M37.2 — Attribution: by business and by site
- Business columns: Mining, Hosting, AI, Orbit, Energy, Corporate (salaries, interest, fees, community and anything without a business).
- Site rows: each site's revenue, direct costs (power, rent, repairs, ai_opex at that site) and contribution (revenue − direct costs). Shared costs (salaries, interest, corporate fees) in one "Not allocated to a site" row, not spread.
- Projects and orbital blocks are rows under their site or under Orbit, with their own contribution.

## M37.3 — The Finances screen, P&L tab (new left-nav section "Finances", every act)
- Period selector: Quarter (default: the last completed quarter; also "this quarter so far"), Year (calendar year: 4 quarters), Act, Career. A quarter picker for any past quarter.
- Columns: the chosen period, the previous period of the same length, and the change (▲▼ with gain/loss colours plus the sign).
- Rows:
  - Revenue (per category, then the total);
  - Operating costs (per category, then the total);
  - EBITDA and EBITDA margin;
  - Interest, finance fees, one-offs (and taxes, if any);
  - Net profit.
- Category rows with 0 in both periods are hidden.
- View toggle: "By line" (default) / "By business" (business columns) / "By site" (site rows from M37.2).
- Three lines under the table, "Biggest changes vs the previous period": the three lines with the largest absolute change, each with its main source ("Power +$1.2M, mostly Texas site 1").
- There are no months: the game's unit is the 13-week quarter. Don't invent months.

## M37.4 — Cash flow tab
- Same period selector.
- Rows:
  - Starting cash;
  - Operating cash: net profit, less coins kept, plus non-cash items if any;
  - Investing (per category, with asset sales as +);
  - Financing (per category);
  - Treasury (coins sold and bought);
  - Ending cash.
- Ending cash must equal the game's cash (the reconciliation).
- A weekly cash chart for the chosen quarter: a line of the 13 end-of-week values, with the quarter's lowest point marked. For a year or longer, one point per quarter. Use the existing chart style (design system tokens).
- One line under it: "Why cash fell this period: {top two outflows}" (or "rose").

## M37.5 — Summaries elsewhere
- Quarter report: a compact block (revenue, operating costs, EBITDA, net profit, cash change) with "Open Finances ›".
- Chapter reports (each act): the act's P&L summary (revenue, EBITDA, net profit, total invested, total raised) and the best and worst site by contribution.
- Strings in en.json; the design system's table, tabs and chart components only.

## M37.6 — Tests and checks
- Reconciliation over every golden and a sample of sim runs (every act); untagged = 0.
- Category totals for a fixture quarter in each act (Prologue, I, II, III, IV) against hand-checked values.
- Coins kept versus sold (a mined-and-held quarter shows revenue in the P&L and no cash in).
- The by-site view sums, with the unallocated row, to the by-line totals.
- Period sums: a year = its four quarters; an act = its quarters.
- An old save loads with "Full detail from {quarter}".
- Browser check at 1024 and 1440 px: P&L in each view, cash flow with the weekly chart, in Act I, Act II and Act IV saves.

REPORT: files touched, tests before/after, the number of cash-changing call sites converted to book(), the reconciliation result, the golden diff ("ledger only"), bundle size, the browser check, and numbered questions.

## Amendments (design thread, 10 Oct 2026, after the M37 build; built in M37.7)
- **A1 Prepayments are deferred revenue, not income.** A tenant's or buyer's prepayment is cash outside the P&L: the cash
  flow's operating section shows "Prepayments received, less those used" (category `prepayments`). The revenue it covers
  counts in full when earned (rent, orbital revenue, lunar sales). Counting it as other_income made income negative later.
- **A2 No gain or loss on asset sales.** The game has no depreciation, so a gain or loss against cost would mislead (every
  old machine would show a large loss). Sales show as proceeds in Investing (asset_sales) only.
- **A3 Extra categories:** lunar_revenue, lunar_opex (the Moon's sales and running costs), energy_opex (energy-asset upkeep),
  taxes (event cards levy them); the Moon is its own business column.
- **A4 Event cards:** a card's plain cash is other_income when it pays, a one-off when it costs.
- **A5 Attribution:** rent and power go to the business the site serves (mining while it has machines, else AI with a
  project there, else hosting with a contract, else Corporate).
- **A6 By site:** a site, project or block with nothing in the P&L for the period (only an investment) isn't listed.
- **A7 Start rules:** an old save's ledger starts at the quarter it's loaded in (the next one if saved mid-quarter); its
  earlier quarters keep their report's summary. A preset company's ledger starts at its opening balance.
- **A8 Storage (M37.7):** the open quarter is copied with the game each week; closed quarters are kept in a history that is
  shared between copies and never changed (closing a quarter appends to a new list). Saves hold the full history.
- **A9 Mined coins in the cash flow:** "Less coins mined (cash only when sold)" takes out their full value; coin sales come in
  under Treasury (coins_sold).
- **A10 The quarter report's Revenue tile** shows total revenue (the P&L block's figure), with "of which mining $x" when
  mining is some but not all of it. The prologue's report gets a Revenue row with the same figure.
